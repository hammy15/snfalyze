// =============================================================================
// FINANCIAL SENSE — Touch: P&L extraction, EBITDAR, occupancy
// =============================================================================

import type { Sense, SenseContext, SenseResult } from '../types';

export const financialSense: Sense = {
  id: 'financial',
  name: 'Financial Extraction',
  icon: '✋',
  description: 'Structured P&L, EBITDAR, occupancy from documents',

  async activate(context: SenseContext): Promise<SenseResult> {
    const start = Date.now();

    // Financial sense operates on already-extracted data in the context
    // It does NOT trigger new extraction — that's done by the pipeline
    const financials = context.financials;

    if (!financials) {
      return {
        senseId: 'financial',
        senseName: 'Financial Extraction',
        data: {},
        confidence: 0,
        summary: 'No financial data available in context',
        latencyMs: Date.now() - start,
      };
    }

    const revenue = (financials.totalRevenue as number) || 0;
    const expenses = (financials.totalExpenses as number) || 0;
    const ebitdar = (financials.ebitdar as number) || revenue - expenses;
    const occupancy = (financials.occupancy as number) || 0;
    const margin = revenue > 0 ? (ebitdar / revenue) * 100 : 0;

    const data: Record<string, unknown> = {
      revenue,
      expenses,
      ebitdar,
      occupancy,
      margin,
      perBedRevenue: context.financials?.beds ? revenue / (context.financials.beds as number) : null,
    };

    // Assess quality
    let confidence = 70;
    if (revenue > 0 && expenses > 0) confidence = 85;
    if (ebitdar > 0 && occupancy > 0) confidence = 92;

    const formatM = (n: number) => `$${(n / 1_000_000).toFixed(1)}M`;

    return {
      senseId: 'financial',
      senseName: 'Financial Extraction',
      data,
      confidence,
      summary: `Revenue: ${formatM(revenue)}, EBITDAR: ${formatM(ebitdar)} (${margin.toFixed(1)}% margin), Occupancy: ${(occupancy * 100).toFixed(0)}%`,
      latencyMs: Date.now() - start,
    };
  },
};
