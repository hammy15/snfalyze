// =============================================================================
// MARKET SENSE — Ears: Medicaid rates, comps, economic data
// =============================================================================

import type { Sense, SenseContext, SenseResult } from '../types';

export const marketSense: Sense = {
  id: 'market',
  name: 'Market Intelligence',
  icon: '👂',
  description: 'Medicaid rates, market comps, economic indicators',

  async activate(context: SenseContext): Promise<SenseResult> {
    const start = Date.now();

    try {
      const [marketMod, ratesMod] = await Promise.all([
        import('../../market'),
        import('../../market-data/medicaid-rates'),
      ]);

      const results: Record<string, unknown> = {};

      // State Medicaid data
      if (context.state) {
        const medicaidData = ratesMod.getStateMedicaidData(context.state);
        results.medicaid = medicaidData;

        const trendAnalysis = ratesMod.getRateTrendAnalysis(context.state);
        results.rateTrend = trendAnalysis;
      }

      // Economic indicators (treasury rates, etc.)
      const [indicators, debtContext, marketSummary] = await Promise.all([
        marketMod.getEconomicIndicators().catch(() => null),
        marketMod.getDebtServiceContext().catch(() => null),
        marketMod.getMarketConditionsSummary().catch(() => ''),
      ]);

      results.economic = indicators;
      results.debtService = debtContext;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rate = (results.medicaid as any)?.currentDailyRate;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rateEnv = (debtContext as any)?.rateEnvironment ?? 'unknown';

      return {
        senseId: 'market',
        senseName: 'Market Intelligence',
        data: results,
        confidence: context.state ? 80 : 50,
        summary: `${context.state ?? 'National'} Medicaid: $${rate ?? 'N/A'}/day, Rate env: ${rateEnv}, ${marketSummary.slice(0, 100)}`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        senseId: 'market',
        senseName: 'Market Intelligence',
        data: { error: err instanceof Error ? err.message : String(err) },
        confidence: 0,
        summary: 'Market sense activation failed',
        latencyMs: Date.now() - start,
      };
    }
  },
};
