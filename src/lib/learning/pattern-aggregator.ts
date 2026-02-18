/**
 * Pattern Aggregator
 *
 * Aggregates normalization patterns and valuation preferences across
 * historical deals into the aggregated_preferences table.
 */

import type {
  ComparisonResult,
  FacilityComparison,
  PreferenceKey,
  AggregatedPreference,
} from './types';

interface PreferenceDataPoint {
  key: PreferenceKey;
  value: number;
  assetType?: string;
  state?: string;
  region?: string;
  dealId: string;
}

/**
 * Extract preference data points from a comparison result
 */
export function extractPreferenceDataPoints(
  comparison: ComparisonResult
): PreferenceDataPoint[] {
  const points: PreferenceDataPoint[] = [];

  for (const facility of comparison.facilities) {
    const prefs = facility.detectedPreferences;
    const base = {
      assetType: facility.assetType,
      state: facility.state,
      region: getRegionForState(facility.state),
      dealId: comparison.historicalDealId,
    };

    if (prefs.capRateUsed && prefs.capRateUsed > 0.03 && prefs.capRateUsed < 0.25) {
      points.push({ ...base, key: 'cap_rate', value: prefs.capRateUsed });
    }

    if (prefs.multiplierUsed && prefs.multiplierUsed > 0.5 && prefs.multiplierUsed < 20) {
      points.push({ ...base, key: 'leased_multiplier', value: prefs.multiplierUsed });
    }

    if (prefs.managementFeePercent && prefs.managementFeePercent > 0.01 && prefs.managementFeePercent < 0.15) {
      points.push({ ...base, key: 'mgmt_fee_pct', value: prefs.managementFeePercent });
    }

    if (prefs.agencyTargetPercent && prefs.agencyTargetPercent >= 0 && prefs.agencyTargetPercent < 0.20) {
      points.push({ ...base, key: 'agency_pct', value: prefs.agencyTargetPercent });
    }

    if (prefs.capexReservePercent && prefs.capexReservePercent > 0 && prefs.capexReservePercent < 0.10) {
      points.push({ ...base, key: 'capex_reserve_pct', value: prefs.capexReservePercent });
    }

    if (prefs.revenueGrowthRate && Math.abs(prefs.revenueGrowthRate) < 0.20) {
      points.push({ ...base, key: 'revenue_growth', value: prefs.revenueGrowthRate });
    }

    if (prefs.expenseGrowthRate && Math.abs(prefs.expenseGrowthRate) < 0.20) {
      points.push({ ...base, key: 'expense_growth', value: prefs.expenseGrowthRate });
    }

    if (prefs.occupancyAssumption && prefs.occupancyAssumption > 0.5 && prefs.occupancyAssumption < 1.0) {
      points.push({ ...base, key: 'occupancy_target', value: prefs.occupancyAssumption });
    }
  }

  return points;
}

/**
 * Aggregate data points into preference summaries
 *
 * Groups by (assetType, state, preferenceKey) and (assetType, region, preferenceKey)
 * to build dimension slices.
 */
export function aggregatePreferences(
  allDataPoints: PreferenceDataPoint[]
): AggregatedPreference[] {
  const results: AggregatedPreference[] = [];

  // Group by different dimension combinations
  const slices: Array<{
    groupBy: (p: PreferenceDataPoint) => string;
    extract: (p: PreferenceDataPoint) => Partial<AggregatedPreference>;
  }> = [
    // Slice 1: assetType + state + key
    {
      groupBy: (p) => `${p.assetType}|${p.state}|${p.key}`,
      extract: (p) => ({ assetType: p.assetType as 'SNF' | 'ALF', state: p.state, preferenceKey: p.key }),
    },
    // Slice 2: assetType + region + key
    {
      groupBy: (p) => `${p.assetType}|${p.region}|${p.key}`,
      extract: (p) => ({ assetType: p.assetType as 'SNF' | 'ALF', region: p.region, preferenceKey: p.key }),
    },
    // Slice 3: assetType + key (broadest)
    {
      groupBy: (p) => `${p.assetType}|${p.key}`,
      extract: (p) => ({ assetType: p.assetType as 'SNF' | 'ALF', preferenceKey: p.key }),
    },
  ];

  for (const slice of slices) {
    const groups = new Map<string, PreferenceDataPoint[]>();

    for (const point of allDataPoints) {
      const groupKey = slice.groupBy(point);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey)!.push(point);
    }

    for (const [, points] of groups) {
      if (points.length === 0) continue;

      const values = points.map(p => p.value).sort((a, b) => a - b);
      const dims = slice.extract(points[0]);

      results.push({
        preferenceKey: dims.preferenceKey as PreferenceKey,
        assetType: dims.assetType,
        state: dims.state,
        region: dims.region,
        avgValue: mean(values),
        medianValue: median(values),
        minValue: Math.min(...values),
        maxValue: Math.max(...values),
        stdDev: stdDev(values),
        sampleCount: values.length,
        confidence: calculateConfidence(values.length),
        sourceDealIds: [...new Set(points.map(p => p.dealId))],
      });
    }
  }

  return results;
}

// ============================================================================
// Statistics
// ============================================================================

function mean(values: number[]): number {
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((s, v) => s + v, 0) / (values.length - 1));
}

/**
 * Confidence increases with sample count
 * 1 deal = 0.3, 3 deals = 0.6, 5 deals = 0.8, 10+ deals = 0.95
 */
function calculateConfidence(sampleCount: number): number {
  return Math.min(0.95, 0.2 + sampleCount * 0.1);
}

// ============================================================================
// Geography
// ============================================================================

const STATE_TO_REGION: Record<string, string> = {
  // Northwest
  OR: 'northwest', WA: 'northwest', ID: 'northwest', MT: 'northwest',
  // West Coast
  CA: 'west_coast', HI: 'west_coast',
  // Southwest
  AZ: 'southwest', NV: 'southwest', NM: 'southwest', UT: 'southwest', CO: 'southwest',
  // Midwest
  IL: 'midwest', IN: 'midwest', IA: 'midwest', KS: 'midwest', MI: 'midwest',
  MN: 'midwest', MO: 'midwest', NE: 'midwest', ND: 'midwest', OH: 'midwest',
  SD: 'midwest', WI: 'midwest',
  // Southeast
  AL: 'southeast', AR: 'southeast', FL: 'southeast', GA: 'southeast', KY: 'southeast',
  LA: 'southeast', MS: 'southeast', NC: 'southeast', SC: 'southeast', TN: 'southeast',
  VA: 'southeast', WV: 'southeast',
  // Northeast
  CT: 'northeast', DE: 'northeast', DC: 'northeast', ME: 'northeast', MD: 'northeast',
  MA: 'northeast', NH: 'northeast', NJ: 'northeast', NY: 'northeast', PA: 'northeast',
  RI: 'northeast', VT: 'northeast',
  // South
  TX: 'southwest', OK: 'southwest',
};

function getRegionForState(state?: string): string | undefined {
  if (!state) return undefined;
  return STATE_TO_REGION[state.toUpperCase()];
}
