// =============================================================================
// DEAL SENSE — Mouth: Valuations, risk scores, deal structuring
// =============================================================================

import type { Sense, SenseContext, SenseResult } from '../types';

export const dealSense: Sense = {
  id: 'deal',
  name: 'Deal Structuring',
  icon: '👄',
  description: 'Valuations, risk scoring, deal structure recommendations',

  async activate(context: SenseContext): Promise<SenseResult> {
    const start = Date.now();

    try {
      const { valuationEngine } = await import('../../analysis/valuation/valuation-engine');
      const { riskEngine } = await import('../../analysis/risk/risk-engine');

      const results: Record<string, unknown> = {};
      const summaryParts: string[] = [];

      const beds = (context.financials?.beds as number) || 0;
      const occupancy = (context.financials?.occupancy as number) || 0;
      const ebitdar = (context.financials?.ebitdar as number) || 0;

      // Run valuation if we have financials
      if (context.financials && ebitdar > 0) {
        try {
          // Build a minimal FacilityProfile for the valuation engine
          const facility = {
            name: context.facilityName || 'Unknown',
            state: context.state || '',
            assetType: (context.assetType || 'SNF') as 'SNF' | 'ALF',
            beds,
            squareFootage: 0,
            yearBuilt: 2000,
            ownership: 'purchase' as const,
          };

          const financials = {
            revenue: (context.financials.totalRevenue as number) || 0,
            expenses: (context.financials.totalExpenses as number) || 0,
            noi: (context.financials.noi as number) || ebitdar,
            ebitdar,
            ebitdarMargin: 0,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const valOutput = valuationEngine.valuate({ facility, financials } as any);
          results.valuation = valOutput;

          if (valOutput.reconciliation) {
            const reconciledValue = valOutput.reconciliation.reconciledValue;
            summaryParts.push(`Value: $${(reconciledValue / 1e6).toFixed(1)}M`);
          }
        } catch {
          results.valuationError = 'Insufficient data for valuation';
        }
      }

      // Run risk assessment if we have context
      if (context.state || context.financials) {
        try {
          const facility = {
            name: context.facilityName || 'Unknown',
            state: context.state || '',
            assetType: (context.assetType || 'SNF') as 'SNF' | 'ALF',
            beds,
            squareFootage: 0,
            yearBuilt: 2000,
            ownership: 'purchase' as const,
          };

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const riskOutput = riskEngine.assess({ facility } as any);
          results.risk = riskOutput;

          summaryParts.push(`Risk: ${riskOutput.summary.overallRating} (${riskOutput.summary.overallScore}/100)`);
          summaryParts.push(`Rec: ${riskOutput.summary.recommendation}`);
        } catch {
          results.riskError = 'Insufficient data for risk assessment';
        }
      }

      return {
        senseId: 'deal',
        senseName: 'Deal Structuring',
        data: results,
        confidence: context.financials ? 75 : 30,
        summary: summaryParts.length > 0 ? summaryParts.join(' | ') : 'Insufficient data for deal analysis',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        senseId: 'deal',
        senseName: 'Deal Structuring',
        data: { error: err instanceof Error ? err.message : String(err) },
        confidence: 0,
        summary: 'Deal sense activation failed',
        latencyMs: Date.now() - start,
      };
    }
  },
};
