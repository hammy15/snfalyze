// =============================================================================
// CMS SENSE — Eyes: Star ratings, deficiencies, SFF status
// =============================================================================

import type { Sense, SenseContext, SenseResult } from '../types';

export const cmsSense: Sense = {
  id: 'cms',
  name: 'CMS Data',
  icon: '👁',
  description: 'Star ratings, deficiencies, SFF status, penalties',

  async activate(context: SenseContext): Promise<SenseResult> {
    const start = Date.now();

    try {
      const { getProviderByCCN, searchProviders, getProviderPenalties, getProviderDeficiencies } =
        await import('../../cms/cms-client');

      let providerData = null;
      let penalties = null;
      let deficiencies = null;

      if (context.ccn) {
        [providerData, penalties, deficiencies] = await Promise.all([
          getProviderByCCN(context.ccn).catch(() => null),
          getProviderPenalties(context.ccn).catch(() => null),
          getProviderDeficiencies(context.ccn).catch(() => null),
        ]);
      } else if (context.facilityName && context.state) {
        const results = await searchProviders(context.facilityName, context.state, 3).catch(() => []);
        if (results.length > 0) {
          providerData = results[0];
        }
      }

      if (!providerData) {
        return {
          senseId: 'cms',
          senseName: 'CMS Data',
          data: {},
          confidence: 0,
          summary: 'No CMS data found for this facility',
          latencyMs: Date.now() - start,
        };
      }

      const data: Record<string, unknown> = {
        provider: providerData,
        penalties: penalties ?? [],
        deficiencies: deficiencies ?? [],
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = providerData as any;
      const overallRating = p.overall_rating ?? p.overallRating;
      const isSFF = !!(p.sff_status ?? p.isSFF);

      return {
        senseId: 'cms',
        senseName: 'CMS Data',
        data,
        confidence: 85,
        summary: `CMS Rating: ${overallRating ?? 'N/A'}/5${isSFF ? ' (SFF)' : ''}, ${(penalties as unknown[])?.length ?? 0} penalties, ${(deficiencies as unknown[])?.length ?? 0} deficiencies`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        senseId: 'cms',
        senseName: 'CMS Data',
        data: { error: err instanceof Error ? err.message : String(err) },
        confidence: 0,
        summary: 'CMS sense activation failed',
        latencyMs: Date.now() - start,
      };
    }
  },
};
