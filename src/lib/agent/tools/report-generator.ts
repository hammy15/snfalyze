/**
 * Report Generator Tool
 *
 * Allows the AI agent to generate formatted reports and summaries.
 */

import { db } from '@/db';
import {
  deals,
  facilities,
  financialPeriods,
  valuations,
  riskFactors,
  assumptions,
  dealMemory,
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { AgentTool, ToolOutput, ToolExecutionContext } from '../types';

export const generateReportTool: AgentTool = {
  name: 'generate_report',
  description: `Generate formatted reports and summaries for deal analysis. This creates structured outputs suitable for different audiences and purposes.

Available report types:
- executive_summary: High-level overview for decision makers
- investment_memo: Detailed analysis document
- risk_assessment: Focused risk analysis report
- valuation_summary: Valuation methodology and results
- due_diligence_checklist: Checklist for due diligence process
- comparison_report: Compare current deal to benchmarks/comparable deals

Reports can be formatted as:
- markdown: For display in UI or export
- json: Structured data for programmatic use
- text: Plain text summary`,

  inputSchema: {
    type: 'object',
    properties: {
      reportType: {
        type: 'string',
        description: 'Type of report to generate',
        enum: [
          'executive_summary',
          'investment_memo',
          'risk_assessment',
          'valuation_summary',
          'due_diligence_checklist',
          'comparison_report',
        ],
      },
      format: {
        type: 'string',
        description: 'Output format',
        enum: ['markdown', 'json', 'text'],
      },
      sections: {
        type: 'array',
        description: 'Specific sections to include (optional, defaults to all)',
        items: { type: 'string', description: 'Section ID' },
      },
      includeCharts: {
        type: 'boolean',
        description: 'Whether to include chart data for visualization',
      },
      audienceLevel: {
        type: 'string',
        description: 'Target audience for appropriate detail level',
        enum: ['executive', 'analyst', 'detailed'],
      },
    },
    required: ['reportType'],
  },

  requiresConfirmation: false,

  async execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolOutput> {
    const startTime = Date.now();

    const {
      reportType,
      format = 'markdown',
      sections,
      includeCharts = false,
      audienceLevel = 'analyst',
    } = input as {
      reportType: string;
      format?: 'markdown' | 'json' | 'text';
      sections?: string[];
      includeCharts?: boolean;
      audienceLevel?: 'executive' | 'analyst' | 'detailed';
    };

    if (!context.dealId) {
      return {
        success: false,
        error: 'No deal context available. Please specify a deal first.',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }

    try {
      // Gather all deal data
      const dealData = await gatherDealData(context.dealId);

      if (!dealData.deal) {
        return {
          success: false,
          error: `Deal ${context.dealId} not found`,
          metadata: { executionTimeMs: Date.now() - startTime },
        };
      }

      // Generate report based on type
      let report: string | Record<string, unknown>;

      switch (reportType) {
        case 'executive_summary':
          report = generateExecutiveSummary(dealData, format, audienceLevel);
          break;
        case 'investment_memo':
          report = generateInvestmentMemo(dealData, format, sections);
          break;
        case 'risk_assessment':
          report = generateRiskAssessment(dealData, format);
          break;
        case 'valuation_summary':
          report = generateValuationSummary(dealData, format, includeCharts);
          break;
        case 'due_diligence_checklist':
          report = generateDueDiligenceChecklist(dealData, format);
          break;
        case 'comparison_report':
          report = generateComparisonReport(dealData, format);
          break;
        default:
          return {
            success: false,
            error: `Unknown report type: ${reportType}`,
            metadata: { executionTimeMs: Date.now() - startTime },
          };
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          reportType,
          format,
          report,
          generatedAt: new Date().toISOString(),
          dealName: dealData.deal.name,
        },
        metadata: {
          executionTimeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  },
};

interface DealData {
  deal: typeof deals.$inferSelect | null;
  facilities: (typeof facilities.$inferSelect)[];
  financials: typeof financialPeriods.$inferSelect | null;
  valuations: (typeof valuations.$inferSelect)[];
  risks: (typeof riskFactors.$inferSelect)[];
  assumptions: (typeof assumptions.$inferSelect)[];
  memory: typeof dealMemory.$inferSelect | null;
}

async function gatherDealData(dealId: string): Promise<DealData> {
  const [deal] = await db
    .select()
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  const dealFacilities = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, dealId));

  const [financials] = await db
    .select()
    .from(financialPeriods)
    .where(eq(financialPeriods.dealId, dealId))
    .orderBy(desc(financialPeriods.periodEnd))
    .limit(1);

  const dealValuations = await db
    .select()
    .from(valuations)
    .where(eq(valuations.dealId, dealId));

  const risks = await db
    .select()
    .from(riskFactors)
    .where(eq(riskFactors.dealId, dealId));

  const dealAssumptions = await db
    .select()
    .from(assumptions)
    .where(eq(assumptions.dealId, dealId));

  const [memory] = await db
    .select()
    .from(dealMemory)
    .where(eq(dealMemory.dealId, dealId))
    .orderBy(desc(dealMemory.version))
    .limit(1);

  return {
    deal: deal || null,
    facilities: dealFacilities,
    financials: financials || null,
    valuations: dealValuations,
    risks,
    assumptions: dealAssumptions,
    memory: memory || null,
  };
}

function generateExecutiveSummary(
  data: DealData,
  format: string,
  level: string
): string | Record<string, unknown> {
  const { deal, facilities: facs, financials, valuations: vals, risks } = data;

  if (!deal) return format === 'json' ? {} : 'No deal data available';

  const totalBeds = facs.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
  const externalVal = vals.find((v) => v.viewType === 'external');
  const criticalRisks = risks.filter((r) => r.severity === 'critical' || r.severity === 'high');

  if (format === 'json') {
    return {
      dealName: deal.name,
      assetType: deal.assetType,
      facilities: facs.length,
      totalBeds,
      askingPrice: deal.askingPrice,
      valuation: externalVal
        ? {
            base: externalVal.valueBase,
            low: externalVal.valueLow,
            high: externalVal.valueHigh,
            confidence: externalVal.confidenceScore,
          }
        : null,
      keyRisks: criticalRisks.length,
      recommendation: deal.thesis,
      confidenceScore: deal.confidenceScore,
    };
  }

  return `# Executive Summary: ${deal.name}

## Overview
- **Asset Type**: ${deal.assetType}
- **Facilities**: ${facs.length}
- **Total Beds**: ${totalBeds}
- **Asking Price**: $${formatNumber(Number(deal.askingPrice || 0))}

## Valuation
${
  externalVal
    ? `- **Base Value**: $${formatNumber(Number(externalVal.valueBase || 0))}
- **Range**: $${formatNumber(Number(externalVal.valueLow || 0))} - $${formatNumber(Number(externalVal.valueHigh || 0))}
- **Confidence**: ${externalVal.confidenceScore}%`
    : '- Valuation pending'
}

## Key Risks
${criticalRisks.length > 0 ? criticalRisks.map((r) => `- **${r.category}**: ${r.description}`).join('\n') : '- No critical risks identified'}

## Investment Thesis
${deal.thesis || 'No thesis documented'}

## Recommendation
Overall Confidence: ${deal.confidenceScore || 'N/A'}%
`;
}

function generateInvestmentMemo(
  data: DealData,
  format: string,
  sections?: string[]
): string | Record<string, unknown> {
  const { deal, facilities: facs, financials, valuations: vals, risks, assumptions: assumps } = data;

  if (!deal) return format === 'json' ? {} : 'No deal data available';

  const allSections = ['overview', 'market', 'financials', 'valuation', 'risks', 'assumptions', 'recommendation'];
  const includedSections = sections || allSections;

  if (format === 'json') {
    const memo: Record<string, unknown> = { dealName: deal.name };

    if (includedSections.includes('overview')) {
      memo.overview = {
        assetType: deal.assetType,
        facilities: facs.length,
        beds: facs.reduce((sum, f) => sum + (f.licensedBeds || 0), 0),
        states: [...new Set(facs.map((f) => f.state))],
        askingPrice: deal.askingPrice,
      };
    }

    if (includedSections.includes('financials') && financials) {
      memo.financials = {
        revenue: financials.totalRevenue,
        expenses: financials.totalExpenses,
        noi: financials.noi,
        occupancy: financials.occupancyRate,
        period: { start: financials.periodStart, end: financials.periodEnd },
      };
    }

    if (includedSections.includes('valuation')) {
      memo.valuations = vals.map((v) => ({
        viewType: v.viewType,
        method: v.method,
        value: v.valueBase,
        capRate: v.capRateBase,
      }));
    }

    if (includedSections.includes('risks')) {
      memo.risks = risks.map((r) => ({
        category: r.category,
        description: r.description,
        severity: r.severity,
      }));
    }

    return memo;
  }

  let memo = `# Investment Memo: ${deal.name}\n\n`;
  memo += `*Generated: ${new Date().toISOString()}*\n\n`;

  if (includedSections.includes('overview')) {
    memo += `## 1. Transaction Overview\n\n`;
    memo += `| Metric | Value |\n|--------|-------|\n`;
    memo += `| Asset Type | ${deal.assetType} |\n`;
    memo += `| Facilities | ${facs.length} |\n`;
    memo += `| Total Beds | ${facs.reduce((sum, f) => sum + (f.licensedBeds || 0), 0)} |\n`;
    memo += `| Asking Price | $${formatNumber(Number(deal.askingPrice || 0))} |\n`;
    memo += `| Markets | ${deal.markets?.join(', ') || 'N/A'} |\n\n`;
  }

  if (includedSections.includes('financials') && financials) {
    memo += `## 2. Financial Summary\n\n`;
    memo += `**Period**: ${financials.periodStart} to ${financials.periodEnd}\n\n`;
    memo += `| Metric | Value |\n|--------|-------|\n`;
    memo += `| Total Revenue | $${formatNumber(Number(financials.totalRevenue || 0))} |\n`;
    memo += `| Total Expenses | $${formatNumber(Number(financials.totalExpenses || 0))} |\n`;
    memo += `| NOI | $${formatNumber(Number(financials.noi || 0))} |\n`;
    memo += `| Occupancy | ${((Number(financials.occupancyRate) || 0) * 100).toFixed(1)}% |\n\n`;
  }

  if (includedSections.includes('valuation')) {
    memo += `## 3. Valuation Analysis\n\n`;
    vals.forEach((v) => {
      memo += `### ${v.viewType === 'external' ? 'External Market View' : 'Cascadia Internal View'}\n`;
      memo += `- **Method**: ${v.method}\n`;
      memo += `- **Value**: $${formatNumber(Number(v.valueBase || 0))}\n`;
      memo += `- **Cap Rate**: ${((Number(v.capRateBase) || 0) * 100).toFixed(2)}%\n\n`;
    });
  }

  if (includedSections.includes('risks')) {
    memo += `## 4. Risk Assessment\n\n`;
    const bySeverity = risks.reduce((acc, r) => {
      const sev = r.severity || 'medium';
      if (!acc[sev]) acc[sev] = [];
      acc[sev].push(r);
      return acc;
    }, {} as Record<string, typeof risks>);

    ['critical', 'high', 'medium', 'low'].forEach((sev) => {
      if (bySeverity[sev]?.length) {
        memo += `### ${sev.charAt(0).toUpperCase() + sev.slice(1)} Severity\n`;
        bySeverity[sev].forEach((r) => {
          memo += `- **${r.category}**: ${r.description}\n`;
        });
        memo += '\n';
      }
    });
  }

  return memo;
}

function generateRiskAssessment(data: DealData, format: string): string | Record<string, unknown> {
  const { deal, risks } = data;

  if (!deal) return format === 'json' ? {} : 'No deal data available';

  const risksByCategory = risks.reduce((acc, r) => {
    if (!acc[r.category]) acc[r.category] = [];
    acc[r.category].push(r);
    return acc;
  }, {} as Record<string, typeof risks>);

  if (format === 'json') {
    return {
      dealName: deal.name,
      totalRisks: risks.length,
      bySeverity: {
        critical: risks.filter((r) => r.severity === 'critical').length,
        high: risks.filter((r) => r.severity === 'high').length,
        medium: risks.filter((r) => r.severity === 'medium').length,
        low: risks.filter((r) => r.severity === 'low').length,
      },
      byCategory: Object.fromEntries(
        Object.entries(risksByCategory).map(([cat, catRisks]) => [
          cat,
          catRisks.map((r) => ({
            description: r.description,
            severity: r.severity,
            mitigation: r.mitigationStrategy,
          })),
        ])
      ),
    };
  }

  let report = `# Risk Assessment: ${deal.name}\n\n`;
  report += `**Total Risks Identified**: ${risks.length}\n\n`;

  Object.entries(risksByCategory).forEach(([category, catRisks]) => {
    report += `## ${category}\n\n`;
    catRisks.forEach((r) => {
      report += `### ${r.severity?.toUpperCase() || 'MEDIUM'}: ${r.description}\n`;
      if (r.mitigationStrategy) {
        report += `**Mitigation**: ${r.mitigationStrategy}\n`;
      }
      report += '\n';
    });
  });

  return report;
}

function generateValuationSummary(
  data: DealData,
  format: string,
  includeCharts: boolean
): string | Record<string, unknown> {
  const { deal, valuations: vals, financials } = data;

  if (!deal) return format === 'json' ? {} : 'No deal data available';

  if (format === 'json') {
    return {
      dealName: deal.name,
      valuations: vals.map((v) => ({
        viewType: v.viewType,
        method: v.method,
        valueLow: v.valueLow,
        valueBase: v.valueBase,
        valueHigh: v.valueHigh,
        capRate: {
          low: v.capRateLow,
          base: v.capRateBase,
          high: v.capRateHigh,
        },
        noiUsed: v.noiUsed,
        confidence: v.confidenceScore,
      })),
      inputData: financials
        ? {
            noi: financials.noi,
            normalizedNoi: financials.normalizedNoi,
            beds: financials.licensedBeds,
            occupancy: financials.occupancyRate,
          }
        : null,
      chartData: includeCharts ? generateChartData(vals) : null,
    };
  }

  let summary = `# Valuation Summary: ${deal.name}\n\n`;

  vals.forEach((v) => {
    summary += `## ${v.viewType === 'external' ? 'External Market View' : 'Internal Opportunity View'}\n\n`;
    summary += `**Method**: ${v.method}\n\n`;
    summary += `| Metric | Low | Base | High |\n`;
    summary += `|--------|-----|------|------|\n`;
    summary += `| Value | $${formatNumber(Number(v.valueLow || 0))} | $${formatNumber(Number(v.valueBase || 0))} | $${formatNumber(Number(v.valueHigh || 0))} |\n`;
    summary += `| Cap Rate | ${((Number(v.capRateLow) || 0) * 100).toFixed(2)}% | ${((Number(v.capRateBase) || 0) * 100).toFixed(2)}% | ${((Number(v.capRateHigh) || 0) * 100).toFixed(2)}% |\n\n`;
    summary += `**NOI Used**: $${formatNumber(Number(v.noiUsed || 0))}\n`;
    summary += `**Confidence**: ${v.confidenceScore || 'N/A'}%\n\n`;
  });

  return summary;
}

function generateDueDiligenceChecklist(
  data: DealData,
  format: string
): string | Record<string, unknown> {
  const categories = [
    {
      name: 'Financial Review',
      items: [
        'Verify trailing 12 month financials',
        'Reconcile NOI to rent roll',
        'Review agency labor costs and trends',
        'Analyze payer mix and rate history',
        'Confirm management fee structure',
      ],
    },
    {
      name: 'Regulatory Compliance',
      items: [
        'Review latest CMS survey results',
        'Check SFF status and history',
        'Verify licensure and certifications',
        'Review any pending enforcement actions',
        'Confirm staffing ratios compliance',
      ],
    },
    {
      name: 'Physical Plant',
      items: [
        'Property condition assessment',
        'Environmental Phase I (and II if needed)',
        'Review CapEx reserve requirements',
        'Assess deferred maintenance',
        'Verify ADA compliance',
      ],
    },
    {
      name: 'Legal Review',
      items: [
        'Title search and survey',
        'Review existing contracts',
        'Assess litigation exposure',
        'Review union agreements',
        'Verify insurance coverage',
      ],
    },
    {
      name: 'Market Analysis',
      items: [
        'Verify competitive set',
        'Confirm market rate positioning',
        'Review demographic trends',
        'Assess referral relationships',
        'Analyze managed care contracts',
      ],
    },
  ];

  if (format === 'json') {
    return {
      dealName: data.deal?.name,
      checklist: categories,
      totalItems: categories.reduce((sum, c) => sum + c.items.length, 0),
    };
  }

  let checklist = `# Due Diligence Checklist: ${data.deal?.name}\n\n`;

  categories.forEach((cat) => {
    checklist += `## ${cat.name}\n\n`;
    cat.items.forEach((item) => {
      checklist += `- [ ] ${item}\n`;
    });
    checklist += '\n';
  });

  return checklist;
}

function generateComparisonReport(
  data: DealData,
  format: string
): string | Record<string, unknown> {
  const { deal, financials, valuations: vals } = data;

  // SNF market benchmarks
  const benchmarks = {
    capRate: { market: 0.085, good: 0.08, excellent: 0.075 },
    pricePerBed: { market: 85000, good: 95000, premium: 110000 },
    occupancy: { average: 0.82, good: 0.88, excellent: 0.92 },
    laborCostPercent: { average: 0.55, good: 0.50, excellent: 0.45 },
  };

  const externalVal = vals.find((v) => v.viewType === 'external');

  if (format === 'json') {
    return {
      dealName: deal?.name,
      metrics: {
        capRate: {
          actual: externalVal?.capRateBase,
          benchmark: benchmarks.capRate,
          position: Number(externalVal?.capRateBase) < benchmarks.capRate.good ? 'above_average' : 'below_average',
        },
        occupancy: {
          actual: financials?.occupancyRate,
          benchmark: benchmarks.occupancy,
          position: Number(financials?.occupancyRate) > benchmarks.occupancy.good ? 'above_average' : 'below_average',
        },
      },
    };
  }

  let report = `# Market Comparison: ${deal?.name}\n\n`;
  report += `## Cap Rate Comparison\n`;
  report += `- **Deal**: ${((Number(externalVal?.capRateBase) || 0) * 100).toFixed(2)}%\n`;
  report += `- **Market Average**: ${(benchmarks.capRate.market * 100).toFixed(2)}%\n`;
  report += `- **Good**: ${(benchmarks.capRate.good * 100).toFixed(2)}%\n\n`;

  report += `## Occupancy Comparison\n`;
  report += `- **Deal**: ${((Number(financials?.occupancyRate) || 0) * 100).toFixed(1)}%\n`;
  report += `- **Market Average**: ${(benchmarks.occupancy.average * 100).toFixed(1)}%\n`;
  report += `- **Good**: ${(benchmarks.occupancy.good * 100).toFixed(1)}%\n`;

  return report;
}

function generateChartData(vals: (typeof valuations.$inferSelect)[]): Record<string, unknown> {
  return {
    valuationComparison: vals.map((v) => ({
      label: v.viewType,
      low: Number(v.valueLow),
      base: Number(v.valueBase),
      high: Number(v.valueHigh),
    })),
    capRateRange: vals.map((v) => ({
      label: v.viewType,
      low: Number(v.capRateLow) * 100,
      base: Number(v.capRateBase) * 100,
      high: Number(v.capRateHigh) * 100,
    })),
  };
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toFixed(0);
}

export default generateReportTool;
