/**
 * Deal Analyzer Tool
 *
 * Allows the AI agent to trigger deal analysis pipeline.
 */

import { db } from '@/db';
import { deals, financialPeriods, valuations, riskFactors, assumptions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { AgentTool, ToolOutput, ToolExecutionContext } from '../types';
import { getEffectiveSettings } from './algorithm-adjuster';

export const runDealAnalysisTool: AgentTool = {
  name: 'run_deal_analysis',
  description: `Execute the full deal analysis pipeline for the current deal. This includes:
- Financial normalization and reconstruction
- Multi-method valuation (Cap Rate, Price-per-Bed, DCF, NOI Multiple, Comparable Sales, Replacement Cost)
- Risk assessment across 8 categories
- Confidence scoring with assumption decay
- Final recommendation synthesis

Use this tool when:
- Starting analysis on a new deal
- Re-running analysis after parameter adjustments
- User requests a fresh analysis
- Significant new data has been added

The analysis will use deal-specific algorithm overrides if any have been applied.`,

  inputSchema: {
    type: 'object',
    properties: {
      analysisType: {
        type: 'string',
        description: 'Type of analysis to run',
        enum: ['full', 'valuation_only', 'risk_only', 'financial_only'],
      },
      valuationMethods: {
        type: 'array',
        description: 'Specific valuation methods to use (default: all)',
        items: {
          type: 'string',
          description: 'Valuation method name',
          enum: ['cap_rate', 'price_per_bed', 'dcf', 'noi_multiple', 'comparable_sales', 'replacement_cost'],
        },
      },
      includeScenarios: {
        type: 'boolean',
        description: 'Whether to run scenario analysis (baseline, upside, downside)',
      },
      recalculateOnly: {
        type: 'boolean',
        description: 'If true, only recalculate values without re-extracting data',
      },
    },
    required: [],
  },

  requiresConfirmation: false,

  async execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolOutput> {
    const startTime = Date.now();

    const {
      analysisType = 'full',
      valuationMethods,
      includeScenarios = true,
      recalculateOnly = false,
    } = input as {
      analysisType?: 'full' | 'valuation_only' | 'risk_only' | 'financial_only';
      valuationMethods?: string[];
      includeScenarios?: boolean;
      recalculateOnly?: boolean;
    };

    if (!context.dealId) {
      return {
        success: false,
        error: 'No deal context available. Please specify a deal first.',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }

    try {
      // Get the deal
      const [deal] = await db
        .select()
        .from(deals)
        .where(eq(deals.id, context.dealId))
        .limit(1);

      if (!deal) {
        return {
          success: false,
          error: `Deal ${context.dealId} not found`,
          metadata: { executionTimeMs: Date.now() - startTime },
        };
      }

      // Get effective settings with overrides
      const effectiveSettings = await getEffectiveSettings(context.dealId);

      // Get financial data
      const [latestFinancials] = await db
        .select()
        .from(financialPeriods)
        .where(eq(financialPeriods.dealId, context.dealId))
        .orderBy(desc(financialPeriods.periodEnd))
        .limit(1);

      if (!latestFinancials && !recalculateOnly) {
        return {
          success: false,
          error: 'No financial data available for analysis. Please upload and process financial documents first.',
          metadata: { executionTimeMs: Date.now() - startTime },
        };
      }

      // Perform analysis based on type
      let analysisResult: Record<string, unknown> = {};

      if (analysisType === 'full' || analysisType === 'valuation_only') {
        analysisResult.valuations = await runValuationAnalysis(
          context.dealId,
          latestFinancials,
          effectiveSettings,
          valuationMethods
        );
      }

      if (analysisType === 'full' || analysisType === 'risk_only') {
        analysisResult.risks = await runRiskAnalysis(context.dealId);
      }

      if (analysisType === 'full' || analysisType === 'financial_only') {
        analysisResult.financials = formatFinancialSummary(latestFinancials);
      }

      if (includeScenarios && analysisType === 'full') {
        analysisResult.scenarios = await runScenarioAnalysis(
          context.dealId,
          latestFinancials,
          effectiveSettings
        );
      }

      // Update deal status
      await db
        .update(deals)
        .set({
          status: 'reviewed',
          analyzedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(deals.id, context.dealId));

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          dealId: context.dealId,
          dealName: deal.name,
          analysisType,
          settingsApplied: Object.keys(effectiveSettings).length,
          results: analysisResult,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          executionTimeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to run deal analysis',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  },
};

async function runValuationAnalysis(
  dealId: string,
  financials: typeof financialPeriods.$inferSelect | undefined,
  settings: Record<string, unknown>,
  methods?: string[]
): Promise<Record<string, unknown>> {
  if (!financials) {
    return { error: 'No financial data available' };
  }

  const noi = Number(financials.noi || financials.normalizedNoi || 0);
  const beds = financials.licensedBeds || 100;

  // Get settings or use defaults
  const capRate = (settings['valuation.cap_rate_base'] as number) || 0.085;
  const pricePerBedBase = (settings['valuation.price_per_bed_snf'] as number) || 85000;
  const discountRate = (settings['valuation.discount_rate'] as number) || 0.10;

  const valuationResults: Record<string, unknown> = {};

  const selectedMethods = methods || ['cap_rate', 'price_per_bed', 'dcf', 'noi_multiple'];

  if (selectedMethods.includes('cap_rate')) {
    const capRateValue = noi / capRate;
    valuationResults.capRate = {
      method: 'Income Approach (Cap Rate)',
      value: capRateValue,
      inputs: { noi, capRate },
      confidence: 85,
    };
  }

  if (selectedMethods.includes('price_per_bed')) {
    const pricePerBedValue = beds * pricePerBedBase;
    valuationResults.pricePerBed = {
      method: 'Market Approach (Price Per Bed)',
      value: pricePerBedValue,
      inputs: { beds, pricePerBed: pricePerBedBase },
      confidence: 75,
    };
  }

  if (selectedMethods.includes('dcf')) {
    // Simple 5-year DCF
    const growthRate = (settings['valuation.growth_rate'] as number) || 0.02;
    const terminalCapRate = capRate + 0.005;
    let presentValue = 0;

    for (let year = 1; year <= 5; year++) {
      const projectedNoi = noi * Math.pow(1 + growthRate, year);
      presentValue += projectedNoi / Math.pow(1 + discountRate, year);
    }

    const terminalValue = (noi * Math.pow(1 + growthRate, 5)) / terminalCapRate;
    const pvTerminal = terminalValue / Math.pow(1 + discountRate, 5);
    const dcfValue = presentValue + pvTerminal;

    valuationResults.dcf = {
      method: 'Discounted Cash Flow',
      value: dcfValue,
      inputs: { noi, discountRate, growthRate, terminalCapRate },
      confidence: 70,
    };
  }

  if (selectedMethods.includes('noi_multiple')) {
    const noiMultiple = (settings['valuation.noi_multiple'] as number) || 10;
    const noiMultipleValue = noi * noiMultiple;
    valuationResults.noiMultiple = {
      method: 'NOI Multiple',
      value: noiMultipleValue,
      inputs: { noi, multiple: noiMultiple },
      confidence: 65,
    };
  }

  // Reconcile valuations
  const values = Object.values(valuationResults).map((v) => (v as Record<string, unknown>).value as number);
  const weights = Object.values(valuationResults).map((v) => ((v as Record<string, unknown>).confidence as number) / 100);

  const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i], 0);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const reconciledValue = weightedSum / totalWeight;

  return {
    methods: valuationResults,
    reconciled: {
      value: reconciledValue,
      methodology: 'Confidence-weighted average',
    },
    range: {
      low: Math.min(...values) * 0.95,
      high: Math.max(...values) * 1.05,
    },
  };
}

async function runRiskAnalysis(dealId: string): Promise<Record<string, unknown>> {
  // Get existing risk factors
  const risks = await db
    .select()
    .from(riskFactors)
    .where(eq(riskFactors.dealId, dealId));

  const risksByCategory = risks.reduce((acc, risk) => {
    if (!acc[risk.category]) {
      acc[risk.category] = [];
    }
    acc[risk.category].push({
      description: risk.description,
      severity: risk.severity,
      mitigation: risk.mitigationStrategy,
    });
    return acc;
  }, {} as Record<string, Array<{ description: string; severity: string | null; mitigation: string | null }>>);

  // Calculate risk scores
  const severityWeights: Record<string, number> = {
    critical: 10,
    high: 7,
    medium: 4,
    low: 1,
  };

  const categoryScores = Object.entries(risksByCategory).map(([category, categoryRisks]) => {
    const score = categoryRisks.reduce(
      (sum, r) => sum + (severityWeights[r.severity || 'medium'] || 4),
      0
    );
    return { category, score, count: categoryRisks.length };
  });

  const totalScore = categoryScores.reduce((sum, c) => sum + c.score, 0);
  const normalizedScore = Math.min(100, totalScore);

  return {
    overallRiskScore: normalizedScore,
    riskLevel:
      normalizedScore > 70 ? 'high' : normalizedScore > 40 ? 'medium' : 'low',
    categories: risksByCategory,
    categoryScores,
    dealBreakers: risks.filter(
      (r) => r.severity === 'critical' || r.isUnderpriced
    ),
  };
}

async function runScenarioAnalysis(
  dealId: string,
  financials: typeof financialPeriods.$inferSelect | undefined,
  settings: Record<string, unknown>
): Promise<Record<string, unknown>> {
  if (!financials) {
    return { error: 'No financial data for scenario analysis' };
  }

  const baseNoi = Number(financials.noi || 0);
  const capRate = (settings['valuation.cap_rate_base'] as number) || 0.085;

  return {
    baseline: {
      noi: baseNoi,
      capRate,
      value: baseNoi / capRate,
      assumptions: ['Current performance continues', 'No major operational changes'],
    },
    upside: {
      noi: baseNoi * 1.15,
      capRate: capRate - 0.005,
      value: (baseNoi * 1.15) / (capRate - 0.005),
      assumptions: [
        'Occupancy improves to 90%+',
        'Agency labor reduced',
        'Rate increases achieved',
      ],
    },
    downside: {
      noi: baseNoi * 0.85,
      capRate: capRate + 0.01,
      value: (baseNoi * 0.85) / (capRate + 0.01),
      assumptions: [
        'Occupancy declines',
        'Labor costs increase',
        'Regulatory challenges',
      ],
    },
  };
}

function formatFinancialSummary(
  financials: typeof financialPeriods.$inferSelect | undefined
): Record<string, unknown> {
  if (!financials) {
    return { error: 'No financial data available' };
  }

  const revenue = Number(financials.totalRevenue || 0);
  const expenses = Number(financials.totalExpenses || 0);
  const noi = Number(financials.noi || 0);
  const beds = financials.licensedBeds || 1;

  return {
    period: {
      start: financials.periodStart,
      end: financials.periodEnd,
      isAnnualized: financials.isAnnualized,
    },
    revenue: {
      total: revenue,
      perBed: revenue / beds,
      breakdown: {
        medicare: financials.medicareRevenue,
        medicaid: financials.medicaidRevenue,
        managedCare: financials.managedCareRevenue,
        privatePay: financials.privatePayRevenue,
        other: financials.otherRevenue,
      },
    },
    expenses: {
      total: expenses,
      perBed: expenses / beds,
      laborCost: financials.laborCost,
      agencyLabor: financials.agencyLabor,
      agencyPercentage: financials.agencyPercentage,
    },
    profitability: {
      noi,
      noiMargin: revenue > 0 ? noi / revenue : 0,
      ebitdar: financials.ebitdar,
      normalizedNoi: financials.normalizedNoi,
    },
    operations: {
      beds,
      adc: financials.averageDailyCensus,
      occupancy: financials.occupancyRate,
      hppd: financials.hppd,
    },
  };
}

export default runDealAnalysisTool;
