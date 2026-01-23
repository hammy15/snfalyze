/**
 * Context Builder
 *
 * Builds context prompts from session context for the AI agent.
 */

import type { AgentContext, ValuationContext, RiskContext, SimilarDealReference } from '../types';

/**
 * Build a context prompt from the agent context
 */
export function buildContextPrompt(context: AgentContext): string {
  const sections: string[] = [];

  // Deal Context
  if (context.dealId || context.dealName) {
    sections.push(buildDealContextSection(context));
  }

  // Analysis State
  if (context.analysisStage || context.currentValuation) {
    sections.push(buildAnalysisStateSection(context));
  }

  // Risk Factors
  if (context.riskFactors && context.riskFactors.length > 0) {
    sections.push(buildRiskSection(context.riskFactors));
  }

  // Similar Deals from Memory
  if (context.similarDeals && context.similarDeals.length > 0) {
    sections.push(buildSimilarDealsSection(context.similarDeals));
  }

  // Conversation Summary
  if (context.conversationSummary) {
    sections.push(buildConversationSummarySection(context.conversationSummary));
  }

  // Key Decisions
  if (context.keyDecisions && context.keyDecisions.length > 0) {
    sections.push(buildKeyDecisionsSection(context.keyDecisions));
  }

  // Pending Actions
  if (context.pendingActions && context.pendingActions.length > 0) {
    sections.push(buildPendingActionsSection(context.pendingActions));
  }

  // User Preferences
  if (context.userPreferences) {
    sections.push(buildUserPreferencesSection(context.userPreferences));
  }

  if (sections.length === 0) {
    return '';
  }

  return `<current_context>\n${sections.join('\n\n')}\n</current_context>`;
}

function buildDealContextSection(context: AgentContext): string {
  const lines: string[] = ['## Current Deal'];

  if (context.dealName) {
    lines.push(`- **Name**: ${context.dealName}`);
  }
  if (context.dealId) {
    lines.push(`- **ID**: ${context.dealId}`);
  }
  if (context.assetType) {
    lines.push(`- **Asset Type**: ${context.assetType}`);
  }
  if (context.dealSummary) {
    lines.push(`\n**Summary**: ${context.dealSummary}`);
  }

  return lines.join('\n');
}

function buildAnalysisStateSection(context: AgentContext): string {
  const lines: string[] = ['## Analysis State'];

  if (context.analysisStage) {
    lines.push(`- **Current Stage**: ${formatAnalysisStage(context.analysisStage)}`);
  }

  if (context.currentValuation) {
    lines.push(buildValuationSubsection(context.currentValuation));
  }

  if (context.extractedData) {
    const extractedCount = Object.keys(context.extractedData).length;
    lines.push(`- **Extracted Fields**: ${extractedCount} fields`);
  }

  return lines.join('\n');
}

function buildValuationSubsection(valuation: ValuationContext): string {
  const lines: string[] = ['\n### Current Valuation'];

  lines.push(`- **Method**: ${valuation.method}`);

  if (valuation.valueBase !== undefined) {
    lines.push(`- **Base Value**: $${formatNumber(valuation.valueBase)}`);
  }
  if (valuation.valueLow !== undefined && valuation.valueHigh !== undefined) {
    lines.push(
      `- **Range**: $${formatNumber(valuation.valueLow)} - $${formatNumber(valuation.valueHigh)}`
    );
  }
  if (valuation.capRate !== undefined) {
    lines.push(`- **Cap Rate**: ${(valuation.capRate * 100).toFixed(2)}%`);
  }
  if (valuation.noiUsed !== undefined) {
    lines.push(`- **NOI Used**: $${formatNumber(valuation.noiUsed)}`);
  }
  if (valuation.confidenceScore !== undefined) {
    lines.push(`- **Confidence**: ${valuation.confidenceScore}%`);
  }

  return lines.join('\n');
}

function buildRiskSection(riskFactors: RiskContext[]): string {
  const lines: string[] = ['## Risk Factors'];

  // Group by severity
  const bySeverity = {
    critical: riskFactors.filter((r) => r.severity === 'critical'),
    high: riskFactors.filter((r) => r.severity === 'high'),
    medium: riskFactors.filter((r) => r.severity === 'medium'),
    low: riskFactors.filter((r) => r.severity === 'low'),
  };

  if (bySeverity.critical.length > 0) {
    lines.push('\n**Critical Risks:**');
    bySeverity.critical.forEach((r) => {
      lines.push(`- [${r.category}] ${r.description}`);
    });
  }

  if (bySeverity.high.length > 0) {
    lines.push('\n**High Risks:**');
    bySeverity.high.forEach((r) => {
      lines.push(`- [${r.category}] ${r.description}`);
    });
  }

  if (bySeverity.medium.length > 0 || bySeverity.low.length > 0) {
    lines.push(
      `\n*${bySeverity.medium.length} medium and ${bySeverity.low.length} low severity risks identified*`
    );
  }

  return lines.join('\n');
}

function buildSimilarDealsSection(similarDeals: SimilarDealReference[]): string {
  const lines: string[] = ['## Similar Historical Deals'];

  similarDeals.slice(0, 5).forEach((deal, index) => {
    lines.push(
      `\n### ${index + 1}. ${deal.dealName} (${(deal.similarityScore * 100).toFixed(0)}% similar)`
    );
    if (deal.outcome) {
      lines.push(`- **Outcome**: ${deal.outcome}`);
    }
    if (deal.keyLearnings && deal.keyLearnings.length > 0) {
      lines.push(`- **Key Learnings**: ${deal.keyLearnings.join('; ')}`);
    }
  });

  return lines.join('\n');
}

function buildConversationSummarySection(summary: string): string {
  return `## Conversation Context\n\n${summary}`;
}

function buildKeyDecisionsSection(
  decisions: { timestamp: Date; decision: string; rationale?: string }[]
): string {
  const lines: string[] = ['## Key Decisions Made'];

  decisions.slice(-5).forEach((d) => {
    lines.push(`- ${d.decision}${d.rationale ? ` (${d.rationale})` : ''}`);
  });

  return lines.join('\n');
}

function buildPendingActionsSection(
  actions: { type: string; description: string; priority: number }[]
): string {
  const lines: string[] = ['## Pending Actions'];

  // Sort by priority (higher first)
  const sorted = [...actions].sort((a, b) => b.priority - a.priority);

  sorted.forEach((a) => {
    lines.push(`- [${a.type}] ${a.description} (priority: ${a.priority})`);
  });

  return lines.join('\n');
}

function buildUserPreferencesSection(prefs: {
  riskTolerance?: string;
  preferredValuationMethods?: string[];
  focusAreas?: string[];
}): string {
  const lines: string[] = ['## User Preferences'];

  if (prefs.riskTolerance) {
    lines.push(`- **Risk Tolerance**: ${prefs.riskTolerance}`);
  }
  if (prefs.preferredValuationMethods && prefs.preferredValuationMethods.length > 0) {
    lines.push(`- **Preferred Valuation Methods**: ${prefs.preferredValuationMethods.join(', ')}`);
  }
  if (prefs.focusAreas && prefs.focusAreas.length > 0) {
    lines.push(`- **Focus Areas**: ${prefs.focusAreas.join(', ')}`);
  }

  return lines.join('\n');
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatAnalysisStage(stage: string): string {
  const stageLabels: Record<string, string> = {
    document_understanding: 'Document Understanding',
    financial_reconstruction: 'Financial Reconstruction',
    operating_reality: 'Operating Reality Assessment',
    risk_constraints: 'Risk & Constraints Analysis',
    valuation: 'Valuation',
    synthesis: 'Synthesis & Recommendation',
  };

  return stageLabels[stage] || stage;
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

/**
 * Build context for a specific deal from the database
 */
export async function buildDealContext(dealId: string): Promise<Partial<AgentContext>> {
  const { db } = await import('@/db');
  const { deals, facilities, financialPeriods, valuations, riskFactors } = await import(
    '@/db/schema'
  );
  const { eq, desc } = await import('drizzle-orm');

  // Fetch deal
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId)).limit(1);

  if (!deal) {
    throw new Error(`Deal ${dealId} not found`);
  }

  // Fetch facilities
  const dealFacilities = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, dealId));

  // Fetch latest financial period
  const [latestFinancial] = await db
    .select()
    .from(financialPeriods)
    .where(eq(financialPeriods.dealId, dealId))
    .orderBy(desc(financialPeriods.periodEnd))
    .limit(1);

  // Fetch valuations
  const dealValuations = await db
    .select()
    .from(valuations)
    .where(eq(valuations.dealId, dealId));

  // Fetch risk factors
  const risks = await db
    .select()
    .from(riskFactors)
    .where(eq(riskFactors.dealId, dealId));

  // Build summary
  const facilityCount = dealFacilities.length;
  const totalBeds = dealFacilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
  const assetTypes = [...new Set(dealFacilities.map((f) => f.assetType))];

  const dealSummary = [
    `${facilityCount} ${facilityCount === 1 ? 'facility' : 'facilities'}`,
    `${totalBeds} total beds`,
    `Asset types: ${assetTypes.join(', ')}`,
    deal.askingPrice ? `Asking: $${formatNumber(Number(deal.askingPrice))}` : null,
    deal.thesis ? `Thesis: ${deal.thesis}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  // Map valuations to context
  const externalValuation = dealValuations.find((v) => v.viewType === 'external');
  const valuationContext: ValuationContext | undefined = externalValuation
    ? {
        method: externalValuation.method || 'cap_rate',
        valueLow: externalValuation.valueLow
          ? Number(externalValuation.valueLow)
          : undefined,
        valueBase: externalValuation.valueBase
          ? Number(externalValuation.valueBase)
          : undefined,
        valueHigh: externalValuation.valueHigh
          ? Number(externalValuation.valueHigh)
          : undefined,
        capRate: externalValuation.capRateBase
          ? Number(externalValuation.capRateBase)
          : undefined,
        noiUsed: externalValuation.noiUsed
          ? Number(externalValuation.noiUsed)
          : undefined,
        confidenceScore: externalValuation.confidenceScore || undefined,
      }
    : undefined;

  // Map risk factors
  const riskContext: RiskContext[] = risks.map((r) => ({
    category: r.category,
    description: r.description,
    severity: (r.severity as 'low' | 'medium' | 'high' | 'critical') || 'medium',
    mitigationStrategy: r.mitigationStrategy || undefined,
  }));

  return {
    dealId: deal.id,
    dealName: deal.name,
    assetType: deal.assetType,
    dealSummary,
    analysisStage: deal.status === 'analyzing' ? 'document_understanding' : undefined,
    currentValuation: valuationContext,
    riskFactors: riskContext,
    extractedData: latestFinancial
      ? {
          totalRevenue: latestFinancial.totalRevenue,
          totalExpenses: latestFinancial.totalExpenses,
          noi: latestFinancial.noi,
          occupancyRate: latestFinancial.occupancyRate,
        }
      : undefined,
  };
}

export default { buildContextPrompt, buildDealContext };
