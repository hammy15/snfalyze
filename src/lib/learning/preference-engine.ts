/**
 * Preference Engine
 *
 * Queries learned preferences and generates suggestions for new deals.
 * Handles the SNF vs ALF/IL/MC split:
 * - SNF: Cascadia baseline (12.5% EBITDAR cap, 2.5x EBIT multiple)
 * - ALF/IL/MC: Industry/state benchmarks, refined by learned patterns
 */

import type {
  PreferenceKey,
  PreferenceLookupQuery,
  PreferenceSuggestion,
  AggregatedPreference,
} from './types';

// ============================================================================
// Geographic Cap Rate Benchmarks (from benchmarks.ts)
// ============================================================================

const GEOGRAPHIC_CAP_RATES: Record<string, { SNF: { low: number; high: number }; ALF: { low: number; high: number } }> = {
  northeast:  { SNF: { low: 0.085, high: 0.115 }, ALF: { low: 0.055, high: 0.075 } },
  southeast:  { SNF: { low: 0.075, high: 0.090 }, ALF: { low: 0.055, high: 0.070 } },
  midwest:    { SNF: { low: 0.075, high: 0.095 }, ALF: { low: 0.060, high: 0.075 } },
  southwest:  { SNF: { low: 0.070, high: 0.090 }, ALF: { low: 0.055, high: 0.070 } },
  west_coast: { SNF: { low: 0.055, high: 0.075 }, ALF: { low: 0.040, high: 0.060 } },
  northwest:  { SNF: { low: 0.070, high: 0.090 }, ALF: { low: 0.055, high: 0.070 } },
};

const STATE_TO_REGION: Record<string, string> = {
  OR: 'northwest', WA: 'northwest', ID: 'northwest', MT: 'northwest',
  CA: 'west_coast', HI: 'west_coast',
  AZ: 'southwest', NV: 'southwest', NM: 'southwest', UT: 'southwest', CO: 'southwest',
  IL: 'midwest', IN: 'midwest', IA: 'midwest', KS: 'midwest', MI: 'midwest',
  MN: 'midwest', MO: 'midwest', NE: 'midwest', ND: 'midwest', OH: 'midwest',
  SD: 'midwest', WI: 'midwest',
  AL: 'southeast', AR: 'southeast', FL: 'southeast', GA: 'southeast', KY: 'southeast',
  LA: 'southeast', MS: 'southeast', NC: 'southeast', SC: 'southeast', TN: 'southeast',
  VA: 'southeast', WV: 'southeast',
  CT: 'northeast', DE: 'northeast', DC: 'northeast', ME: 'northeast', MD: 'northeast',
  MA: 'northeast', NH: 'northeast', NJ: 'northeast', NY: 'northeast', PA: 'northeast',
  RI: 'northeast', VT: 'northeast',
  TX: 'southwest', OK: 'southwest',
};

// Cascadia internal defaults
const CASCADIA_DEFAULTS = {
  SNF: {
    cap_rate: 0.125,
    leased_multiplier: 2.5,
    mgmt_fee_pct: 0.05,
    agency_pct: 0.03,
    capex_reserve_pct: 0.03,
    revenue_growth: 0.025,
    expense_growth: 0.03,
    occupancy_target: 0.85,
  },
  ALF: {
    cap_rate: 0.08, // Base ALF rate
    leased_multiplier: 2.5,
    mgmt_fee_pct: 0.05,
    agency_pct: 0.03,
    capex_reserve_pct: 0.03,
    revenue_growth: 0.03,
    expense_growth: 0.025,
    occupancy_target: 0.88,
  },
  ILF: {
    cap_rate: 0.065,
    leased_multiplier: 2.5,
    mgmt_fee_pct: 0.05,
    agency_pct: 0.02,
    capex_reserve_pct: 0.02,
    revenue_growth: 0.03,
    expense_growth: 0.025,
    occupancy_target: 0.90,
  },
} as const;

// ============================================================================
// Core Preference Engine
// ============================================================================

/**
 * Get baseline for an asset type — determines whether to use
 * Cascadia internal rates or industry benchmarks
 */
export function getBaseline(
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
  state?: string,
  preferenceKey: PreferenceKey = 'cap_rate'
): { value: number; source: 'cascadia' | 'industry_benchmark'; label: string } {
  const region = state ? STATE_TO_REGION[state.toUpperCase()] : undefined;

  if (assetType === 'SNF') {
    // SNF always uses Cascadia's internal methodology
    const defaults = CASCADIA_DEFAULTS.SNF;
    const value = defaults[preferenceKey as keyof typeof defaults] ?? 0.125;
    return {
      value: value as number,
      source: 'cascadia',
      label: `Cascadia Standard: ${formatPref(preferenceKey, value as number)}`,
    };
  }

  // ALF/IL/MC: Use industry/state-specific benchmarks
  if (preferenceKey === 'cap_rate' && region) {
    const geoRates = GEOGRAPHIC_CAP_RATES[region];
    if (geoRates) {
      const rates = assetType === 'ALF' ? geoRates.ALF : geoRates.ALF; // ILF uses ALF rates as baseline
      const midpoint = (rates.low + rates.high) / 2;
      return {
        value: midpoint,
        source: 'industry_benchmark',
        label: `Industry (${state || region}): ${(rates.low * 100).toFixed(1)}-${(rates.high * 100).toFixed(1)}%`,
      };
    }
  }

  // Fallback to defaults for non-cap-rate preferences
  const defaults = assetType === 'ILF'
    ? CASCADIA_DEFAULTS.ILF
    : CASCADIA_DEFAULTS.ALF;
  const value = defaults[preferenceKey as keyof typeof defaults] ?? 0;
  return {
    value: value as number,
    source: 'industry_benchmark',
    label: `Default: ${formatPref(preferenceKey, value as number)}`,
  };
}

/**
 * Generate a suggestion combining baseline + learned preferences
 */
export function suggest(
  query: PreferenceLookupQuery,
  aggregatedPreferences: AggregatedPreference[]
): PreferenceSuggestion {
  const key = query.preferenceKey || 'cap_rate';

  // 1. Get baseline
  const baseline = getBaseline(query.assetType, query.state, key);

  // 2. Find best learned match (most specific first)
  const learned = findBestLearnedMatch(query, aggregatedPreferences, key);

  // 3. Determine recommendation
  let recommended = baseline.value;
  let recommendedSource: 'cascadia' | 'industry_benchmark' | 'learned' = baseline.source;

  if (learned && learned.confidence > 0.6) {
    // Use learned value when confidence is high enough
    recommended = learned.medianValue;
    recommendedSource = 'learned';
  }

  // Build display label
  let displayLabel = baseline.label;
  if (learned) {
    displayLabel += ` | Your Historical: ${formatPref(key, learned.medianValue)} (${learned.sampleCount} deals)`;
  }

  return {
    key,
    baseline,
    learned: learned
      ? {
          value: learned.medianValue,
          confidence: learned.confidence,
          sampleCount: learned.sampleCount,
          sourceDealIds: learned.sourceDealIds,
        }
      : undefined,
    recommended,
    recommendedSource,
    displayLabel,
  };
}

/**
 * Get all suggestions for a deal context
 */
export function suggestAll(
  query: PreferenceLookupQuery,
  aggregatedPreferences: AggregatedPreference[]
): PreferenceSuggestion[] {
  const keys: PreferenceKey[] = [
    'cap_rate',
    'leased_multiplier',
    'mgmt_fee_pct',
    'agency_pct',
    'capex_reserve_pct',
    'revenue_growth',
    'expense_growth',
    'occupancy_target',
  ];

  return keys.map((key) =>
    suggest({ ...query, preferenceKey: key }, aggregatedPreferences)
  );
}

// ============================================================================
// Lookup Logic
// ============================================================================

/**
 * Find the best matching learned preference
 * Priority: exact (assetType + state) > regional (assetType + region) > broad (assetType only)
 */
function findBestLearnedMatch(
  query: PreferenceLookupQuery,
  preferences: AggregatedPreference[],
  key: PreferenceKey
): AggregatedPreference | null {
  const matches = preferences.filter(p => p.preferenceKey === key);

  // Priority 1: Exact match (assetType + state)
  if (query.state) {
    const exact = matches.find(
      p => p.assetType === query.assetType && p.state === query.state && !p.region
    );
    if (exact && exact.sampleCount >= 1) return exact;
  }

  // Priority 2: Regional match (assetType + region)
  const region = query.state ? STATE_TO_REGION[query.state.toUpperCase()] : undefined;
  if (region) {
    const regional = matches.find(
      p => p.assetType === query.assetType && p.region === region && !p.state
    );
    if (regional && regional.sampleCount >= 2) return regional;
  }

  // Priority 3: Broad match (assetType only)
  const broad = matches.find(
    p => p.assetType === query.assetType && !p.state && !p.region
  );
  if (broad && broad.sampleCount >= 3) return broad;

  return null;
}

// ============================================================================
// Formatting
// ============================================================================

function formatPref(key: PreferenceKey, value: number): string {
  switch (key) {
    case 'cap_rate':
      return `${(value * 100).toFixed(1)}%`;
    case 'leased_multiplier':
      return `${value.toFixed(1)}x`;
    case 'mgmt_fee_pct':
    case 'agency_pct':
    case 'capex_reserve_pct':
    case 'revenue_growth':
    case 'expense_growth':
    case 'occupancy_target':
      return `${(value * 100).toFixed(1)}%`;
    default:
      return value.toFixed(3);
  }
}
