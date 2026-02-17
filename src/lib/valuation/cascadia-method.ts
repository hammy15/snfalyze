/**
 * Cascadia Valuation Method
 *
 * Implements Cascadia Healthcare's three-method valuation:
 *
 * 1. SNF-Owned: EBITDA / Cap Rate (10%)
 *    - Standard cap rate for owned skilled nursing facilities
 *
 * 2. Leased: Net Income × Multiplier (5.0x)
 *    - Income multiple for leased facilities
 *
 * 3. ALF/SNC-Owned: EBITDA / Cap Rate (variable)
 *    - 0% SNC → 8% cap rate
 *    - >0% to ≤33% SNC → 9% cap rate
 *    - >33% SNC → 12% cap rate
 *
 * Reference: Cascadia Sapphire Portfolio ($400M, 22 facilities, 1,300 beds)
 */

import type {
  CascadiaFacilityValuation,
  CascadiaCategoryTotal,
  CascadiaValuationResult,
  CascadiaSensitivityTable,
  FacilityClassification,
  T13FacilitySection,
  AssetValuationEntry,
  CascadiaPropertyType,
} from '../extraction/smart-excel/types';

// ============================================================================
// MAIN VALUATION
// ============================================================================

export interface CascadiaValuationInput {
  classifications: FacilityClassification[];
  t13Facilities: T13FacilitySection[];
  assetValuationEntries?: AssetValuationEntry[];
  overrides?: CascadiaOverrides;
}

export interface CascadiaOverrides {
  snfCapRate?: number;
  leasedMultiplier?: number;
  alfCapRates?: {
    noSNC?: number;
    lowSNC?: number;
    highSNC?: number;
  };
  facilityOverrides?: Map<string, {
    capRate?: number;
    multiplier?: number;
    ebitda?: number;
    netIncome?: number;
  }>;
}

export function runCascadiaValuation(input: CascadiaValuationInput): CascadiaValuationResult {
  const { classifications, t13Facilities, assetValuationEntries, overrides } = input;

  // Build lookup maps
  const t13Lookup = new Map<string, T13FacilitySection>();
  for (const fac of t13Facilities) {
    t13Lookup.set(fac.facilityName.toLowerCase().trim(), fac);
  }

  const avLookup = new Map<string, AssetValuationEntry>();
  if (assetValuationEntries) {
    for (const entry of assetValuationEntries) {
      avLookup.set(entry.facilityName.toLowerCase().trim(), entry);
    }
  }

  // Value each facility
  const facilities: CascadiaFacilityValuation[] = [];

  for (const classification of classifications) {
    const key = classification.facilityName.toLowerCase().trim();
    const t13 = t13Lookup.get(key) || findFuzzy(classification.facilityName, t13Lookup);
    const av = avLookup.get(key) || findFuzzy(classification.facilityName, avLookup);
    const facilityOverride = overrides?.facilityOverrides?.get(key);

    const valuation = valueSingleFacility(classification, t13, av, overrides, facilityOverride);
    if (valuation) {
      facilities.push(valuation);
    }
  }

  // Build category totals
  const categories = buildCategoryTotals(facilities);

  // Portfolio total
  const portfolioTotal = {
    facilityCount: facilities.length,
    totalBeds: facilities.reduce((s, f) => s + f.beds, 0),
    totalValue: facilities.reduce((s, f) => s + f.facilityValue, 0),
    avgValuePerBed: 0,
  };
  portfolioTotal.avgValuePerBed = portfolioTotal.totalBeds > 0
    ? portfolioTotal.totalValue / portfolioTotal.totalBeds
    : 0;

  // Sensitivity table
  const sensitivity = buildSensitivityTable(facilities, overrides);

  // Dual view
  const dualView = buildDualView(facilities, portfolioTotal.totalValue);

  return {
    facilities,
    categories,
    portfolioTotal,
    sensitivity,
    dualView,
  };
}

// ============================================================================
// SINGLE FACILITY VALUATION
// ============================================================================

function valueSingleFacility(
  classification: FacilityClassification,
  t13: T13FacilitySection | undefined,
  av: AssetValuationEntry | undefined,
  overrides?: CascadiaOverrides,
  facilityOverride?: { capRate?: number; multiplier?: number; ebitda?: number; netIncome?: number },
): CascadiaFacilityValuation | null {
  const { propertyType, beds, sncPercent } = classification;

  // Get the financial metrics
  let ebitda = facilityOverride?.ebitda ?? 0;
  let netIncome = facilityOverride?.netIncome ?? 0;

  // From T13 data
  if (t13) {
    if (!ebitda) ebitda = t13.summaryMetrics.ebitda;
    if (!netIncome) netIncome = t13.summaryMetrics.netIncome;
  }

  // From asset valuation data (2026 preferred, then 2025)
  if (av) {
    if (!ebitda) ebitda = av.ebitda2026 || av.ebitda2025 || 0;
    if (!netIncome) netIncome = av.netIncome2026 || av.netIncome2025 || 0;
  }

  // Apply valuation method
  let metricUsed: 'EBITDA' | 'Net Income';
  let metricValue: number;
  let rateOrMultiplier: number;
  let rateLabel: string;
  let facilityValue: number;

  switch (propertyType) {
    case 'SNF-Owned': {
      const capRate = facilityOverride?.capRate ?? overrides?.snfCapRate ?? 0.10;
      metricUsed = 'EBITDA';
      metricValue = ebitda;
      rateOrMultiplier = capRate;
      rateLabel = `${(capRate * 100).toFixed(1)}% Cap Rate`;
      facilityValue = capRate > 0 ? ebitda / capRate : 0;
      break;
    }

    case 'Leased': {
      const multiplier = facilityOverride?.multiplier ?? overrides?.leasedMultiplier ?? 5.0;
      metricUsed = 'Net Income';
      metricValue = netIncome;
      rateOrMultiplier = multiplier;
      rateLabel = `${multiplier.toFixed(1)}x Multiplier`;
      facilityValue = netIncome * multiplier;
      break;
    }

    case 'ALF/SNC-Owned': {
      const capRate = facilityOverride?.capRate ?? getALFCapRate(sncPercent, overrides);
      metricUsed = 'EBITDA';
      metricValue = ebitda;
      rateOrMultiplier = capRate;
      const sncLabel = sncPercent != null
        ? ` (${Math.round(sncPercent * 100)}% SNC)`
        : '';
      rateLabel = `${(capRate * 100).toFixed(1)}% Cap Rate${sncLabel}`;
      facilityValue = capRate > 0 ? ebitda / capRate : 0;
      break;
    }

    default:
      return null;
  }

  // Skip facilities with zero metrics
  if (metricValue === 0 && facilityValue === 0) {
    // Still include with zero if we have bed count (might be empty in T13)
    if (beds === 0) return null;
  }

  const valuePerBed = beds > 0 ? facilityValue / beds : 0;

  // Build cap rate basis label
  let capRateBasis: string | undefined;
  if (propertyType === 'ALF/SNC-Owned') {
    const pct = sncPercent != null ? Math.round(sncPercent * 100) : 0;
    capRateBasis = `${(rateOrMultiplier * 100).toFixed(0)}% (${pct}% SNC)`;
  }

  return {
    facilityName: classification.facilityName,
    propertyType,
    beds,
    metricUsed,
    metricValue,
    rateOrMultiplier,
    rateLabel,
    facilityValue: Math.round(facilityValue),
    valuePerBed: Math.round(valuePerBed),
    sncPercent,
    capRateBasis,
  };
}

function getALFCapRate(sncPercent?: number, overrides?: CascadiaOverrides): number {
  const rates = overrides?.alfCapRates;

  if (sncPercent === undefined || sncPercent === 0) {
    return rates?.noSNC ?? 0.08;
  }
  if (sncPercent <= 0.33) {
    return rates?.lowSNC ?? 0.09;
  }
  return rates?.highSNC ?? 0.12;
}

// ============================================================================
// CATEGORY TOTALS
// ============================================================================

function buildCategoryTotals(facilities: CascadiaFacilityValuation[]): CascadiaCategoryTotal[] {
  const groups = new Map<CascadiaPropertyType, CascadiaFacilityValuation[]>();

  for (const fac of facilities) {
    const list = groups.get(fac.propertyType) || [];
    list.push(fac);
    groups.set(fac.propertyType, list);
  }

  const totals: CascadiaCategoryTotal[] = [];

  // Order: SNF-Owned, Leased, ALF/SNC-Owned
  const order: CascadiaPropertyType[] = ['SNF-Owned', 'Leased', 'ALF/SNC-Owned'];

  for (const type of order) {
    const list = groups.get(type);
    if (!list || list.length === 0) continue;

    const totalBeds = list.reduce((s, f) => s + f.beds, 0);
    const totalValue = list.reduce((s, f) => s + f.facilityValue, 0);

    totals.push({
      category: type,
      propertyType: type,
      facilityCount: list.length,
      totalBeds,
      totalValue,
      avgValuePerBed: totalBeds > 0 ? Math.round(totalValue / totalBeds) : 0,
      valuationMethod: type === 'Leased' ? 'NI × Multiplier' : 'EBITDA / Cap Rate',
    });
  }

  return totals;
}

// ============================================================================
// SENSITIVITY TABLE
// ============================================================================

function buildSensitivityTable(
  facilities: CascadiaFacilityValuation[],
  overrides?: CascadiaOverrides,
): CascadiaSensitivityTable {
  const baseValue = facilities.reduce((s, f) => s + f.facilityValue, 0);

  // Cap rate variations: ±200bps in 50bps steps
  const baseCapRate = overrides?.snfCapRate ?? 0.10;
  const variations: CascadiaSensitivityTable['capRateVariations'] = [];

  for (let delta = -200; delta <= 200; delta += 50) {
    if (delta === 0) continue;
    const adjustedRate = baseCapRate + (delta / 10000);
    if (adjustedRate <= 0.02) continue; // Skip unrealistic rates

    // Revalue all EBITDA-based facilities at new rate
    let adjustedTotal = 0;
    for (const fac of facilities) {
      if (fac.metricUsed === 'EBITDA' && fac.propertyType === 'SNF-Owned') {
        adjustedTotal += adjustedRate > 0 ? fac.metricValue / adjustedRate : 0;
      } else {
        adjustedTotal += fac.facilityValue;
      }
    }

    const valueDelta = adjustedTotal - baseValue;

    variations.push({
      capRate: adjustedRate,
      label: `${(adjustedRate * 100).toFixed(1)}%`,
      value: Math.round(adjustedTotal),
      delta: Math.round(valueDelta),
      deltaPercent: baseValue > 0 ? (valueDelta / baseValue) * 100 : 0,
    });
  }

  return { baseValue: Math.round(baseValue), capRateVariations: variations };
}

// ============================================================================
// DUAL VIEW
// ============================================================================

function buildDualView(
  facilities: CascadiaFacilityValuation[],
  cascadiaValue: number,
): CascadiaValuationResult['dualView'] {
  // External/lender view: more conservative rates
  let externalValue = 0;

  for (const fac of facilities) {
    switch (fac.propertyType) {
      case 'SNF-Owned':
        // External uses 12% cap (vs Cascadia 10%)
        externalValue += fac.metricValue > 0 ? fac.metricValue / 0.12 : 0;
        break;
      case 'Leased':
        // External uses 4.0x multiplier (vs Cascadia 5.0x)
        externalValue += fac.metricValue * 4.0;
        break;
      case 'ALF/SNC-Owned':
        // External uses cap rate + 200bps
        const externalRate = fac.rateOrMultiplier + 0.02;
        externalValue += externalRate > 0 ? fac.metricValue / externalRate : 0;
        break;
    }
  }

  const low = Math.round(externalValue);
  const high = Math.round(cascadiaValue);
  const mid = Math.round((low + high) / 2);

  return {
    cascadiaValue: Math.round(cascadiaValue),
    externalValue: Math.round(externalValue),
    valueRange: { low, mid, high },
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function findFuzzy<T>(name: string, lookup: Map<string, T>): T | undefined {
  const normalized = name.toLowerCase().trim();
  for (const [key, val] of lookup) {
    if (normalized.includes(key.substring(0, 8)) || key.includes(normalized.substring(0, 8))) {
      return val;
    }
  }
  return undefined;
}
