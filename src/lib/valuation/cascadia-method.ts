/**
 * Cascadia Valuation Method
 *
 * Implements Cascadia Healthcare's three-method valuation,
 * wired into Newo's institutional knowledge base for
 * geographic cap rates, operational benchmarks, and
 * reimbursement optimization data.
 *
 * 1. SNF-Owned: EBITDAR / 12.5% Cap Rate
 *    - Uses EBITDAR (before rent) since facility is owned
 *    - Geographic adjustment via knowledge base
 *
 * 2. Leased: EBIT × 2.5x (range: 2.0–3.0x)
 *    - EBIT proxy: EBITDA (leased buildings have minimal property D&A)
 *    - Lower multiple reflects lease obligation risk
 *
 * 3. ALF/SNC-Owned: EBITDAR / Cap Rate (variable by SNC%)
 *    - 0% SNC → 8% cap rate
 *    - >0% to ≤33% SNC → 9% cap rate
 *    - >33% SNC → 12% cap rate
 *
 * Reference: Cascadia Sapphire Portfolio (22 facilities, 1,300 beds)
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

import {
  getGeographicCapRate,
  getRegion,
  REIMBURSEMENT_OPTIMIZATION,
  QUALITY_REVENUE_IMPACT,
  SNF_OPERATIONAL_TIERS,
  type OperationalTier,
} from '../analysis/knowledge/benchmarks';

// ============================================================================
// CASCADIA DEFAULT RATES (from institutional knowledge)
// ============================================================================

/** SNF-Owned: 12.5% cap rate on EBITDAR */
const DEFAULT_SNF_CAP_RATE = 0.125;

/** Leased: 2.5x multiplier on EBIT (range: 2.0–3.0x) */
const DEFAULT_LEASED_MULTIPLIER = 2.5;
const LEASED_MULTIPLIER_RANGE = { low: 2.0, high: 3.0 };

/** ALF/SNC-Owned: variable cap rate by SNC percentage */
const ALF_CAP_RATES = {
  noSNC: 0.08,      // 0% SNC → 8%
  lowSNC: 0.09,     // >0% to ≤33% SNC → 9%
  highSNC: 0.12,    // >33% SNC → 12%
};

/** External/lender view uses more conservative assumptions */
const EXTERNAL_SNF_CAP_RATE = 0.14;       // Lenders use 14% (vs Cascadia 12.5%)
const EXTERNAL_LEASED_MULTIPLIER = 2.0;   // Lenders use 2.0x (vs Cascadia 2.5x)
const EXTERNAL_ALF_CAP_RATE_SPREAD = 0.02; // +200bps over Cascadia rate

// ============================================================================
// MAIN VALUATION
// ============================================================================

export interface CascadiaValuationInput {
  classifications: FacilityClassification[];
  t13Facilities: T13FacilitySection[];
  assetValuationEntries?: AssetValuationEntry[];
  overrides?: CascadiaOverrides;
  /** State for geographic cap rate adjustment (e.g., 'OR', 'WA') */
  state?: string;
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
    ebitdar?: number;
    ebitda?: number;
    ebit?: number;
    netIncome?: number;
  }>;
}

export function runCascadiaValuation(input: CascadiaValuationInput): CascadiaValuationResult {
  const { classifications, t13Facilities, assetValuationEntries, overrides, state } = input;

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

  // Geographic cap rate adjustment from knowledge base
  const geoCapRate = state ? getGeographicCapRate(state, 'SNF') : null;
  const region = state ? getRegion(state) : undefined;

  // Value each facility
  const facilities: CascadiaFacilityValuation[] = [];

  for (const classification of classifications) {
    const key = classification.facilityName.toLowerCase().trim();
    const t13 = t13Lookup.get(key) || findFuzzy(classification.facilityName, t13Lookup);
    const av = avLookup.get(key) || findFuzzy(classification.facilityName, avLookup);
    const facilityOverride = overrides?.facilityOverrides?.get(key);

    const valuation = valueSingleFacility(classification, t13, av, overrides, facilityOverride, geoCapRate);
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

  // Dual view (Cascadia vs External/Lender)
  const dualView = buildDualView(facilities, portfolioTotal.totalValue);

  // Reimbursement upside from knowledge base
  const reimbursementUpside = calculateReimbursementUpside(facilities, portfolioTotal.totalBeds);

  return {
    facilities,
    categories,
    portfolioTotal,
    sensitivity,
    dualView,
    reimbursementUpside,
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
  facilityOverride?: { capRate?: number; multiplier?: number; ebitdar?: number; ebitda?: number; ebit?: number; netIncome?: number },
  geoCapRate?: { low: number; high: number; notes: string } | null,
): CascadiaFacilityValuation | null {
  const { propertyType, beds, sncPercent } = classification;

  // Get the financial metrics
  // Priority: override > AV (authoritative) > T13 (operational P&L)
  let ebitdar = facilityOverride?.ebitdar ?? 0;
  let ebitda = facilityOverride?.ebitda ?? 0;
  let ebit = facilityOverride?.ebit ?? 0;
  let netIncome = facilityOverride?.netIncome ?? 0;

  // From asset valuation data (AUTHORITATIVE — 2026 projected preferred)
  if (av) {
    if (!ebitdar) ebitdar = av.ebitdar2026 || av.ebitdar2025 || 0;
    if (!ebitda) ebitda = av.ebitda2026 || av.ebitda2025 || 0;
    if (!ebit) ebit = av.ebit2025 || av.ebit2026 || 0;
    if (!netIncome) netIncome = av.netIncome2026 || av.netIncome2025 || 0;
  }

  // From T13 data (operational P&L — fallback)
  if (t13) {
    if (!ebitdar) ebitdar = t13.summaryMetrics.ebitdar;
    if (!ebitda) ebitda = t13.summaryMetrics.ebitda;
    if (!ebit) ebit = ebitda; // EBIT ≈ EBITDA for leased (minimal property D&A)
    if (!netIncome) netIncome = t13.summaryMetrics.netIncome;
  }

  // For owned facilities: EBITDAR ≈ EBITDA if no rent (owned = no rent expense)
  if (propertyType === 'SNF-Owned' || propertyType === 'ALF/SNC-Owned') {
    if (!ebitdar && ebitda) {
      const rent = t13?.summaryMetrics.leaseExpense ?? 0;
      ebitdar = ebitda + Math.abs(rent); // Add rent back to get EBITDAR
    }
  }

  // For leased: EBIT ≈ EBITDA (leased buildings have minimal property depreciation)
  if (propertyType === 'Leased' && !ebit && ebitda) {
    ebit = ebitda;
  }

  // Apply valuation method
  let metricUsed: 'EBITDAR' | 'EBITDA' | 'EBIT' | 'Net Income';
  let metricValue: number;
  let rateOrMultiplier: number;
  let rateLabel: string;
  let facilityValue: number;

  switch (propertyType) {
    case 'SNF-Owned': {
      const capRate = facilityOverride?.capRate ?? overrides?.snfCapRate ?? DEFAULT_SNF_CAP_RATE;
      metricUsed = 'EBITDAR';
      metricValue = ebitdar;
      rateOrMultiplier = capRate;
      rateLabel = `${(capRate * 100).toFixed(1)}% Cap Rate on EBITDAR`;
      facilityValue = capRate > 0 ? ebitdar / capRate : 0;
      break;
    }

    case 'Leased': {
      const multiplier = facilityOverride?.multiplier ?? overrides?.leasedMultiplier ?? DEFAULT_LEASED_MULTIPLIER;
      metricUsed = 'EBIT';
      metricValue = ebit;
      rateOrMultiplier = multiplier;
      rateLabel = `${multiplier.toFixed(1)}x Multiple on EBIT`;
      facilityValue = ebit * multiplier;
      break;
    }

    case 'ALF/SNC-Owned': {
      const capRate = facilityOverride?.capRate ?? getALFCapRate(sncPercent, overrides);
      metricUsed = 'EBITDAR';
      metricValue = ebitdar;
      rateOrMultiplier = capRate;
      const sncLabel = sncPercent != null
        ? ` (${Math.round(sncPercent * 100)}% SNC)`
        : '';
      rateLabel = `${(capRate * 100).toFixed(1)}% Cap Rate on EBITDAR${sncLabel}`;
      facilityValue = capRate > 0 ? ebitdar / capRate : 0;
      break;
    }

    default:
      return null;
  }

  // Skip facilities with zero metrics
  if (metricValue === 0 && facilityValue === 0) {
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
    return rates?.noSNC ?? ALF_CAP_RATES.noSNC;
  }
  if (sncPercent <= 0.33) {
    return rates?.lowSNC ?? ALF_CAP_RATES.lowSNC;
  }
  return rates?.highSNC ?? ALF_CAP_RATES.highSNC;
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
      valuationMethod: type === 'Leased'
        ? 'EBIT × Multiplier'
        : 'EBITDAR / Cap Rate',
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

  // Cap rate variations: ±200bps in 50bps steps around 12.5% base
  const baseCapRate = overrides?.snfCapRate ?? DEFAULT_SNF_CAP_RATE;
  const variations: CascadiaSensitivityTable['capRateVariations'] = [];

  for (let delta = -200; delta <= 200; delta += 50) {
    if (delta === 0) continue;
    const adjustedRate = baseCapRate + (delta / 10000);
    if (adjustedRate <= 0.04) continue; // Skip unrealistic rates

    // Revalue all EBITDAR-based SNF facilities at new rate
    let adjustedTotal = 0;
    for (const fac of facilities) {
      if (fac.metricUsed === 'EBITDAR' && fac.propertyType === 'SNF-Owned') {
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
// DUAL VIEW (Cascadia Execution vs External/Lender)
// ============================================================================

function buildDualView(
  facilities: CascadiaFacilityValuation[],
  cascadiaValue: number,
): CascadiaValuationResult['dualView'] {
  let externalValue = 0;

  for (const fac of facilities) {
    switch (fac.propertyType) {
      case 'SNF-Owned':
        // External uses 14% cap on EBITDAR (vs Cascadia 12.5%)
        externalValue += fac.metricValue > 0 ? fac.metricValue / EXTERNAL_SNF_CAP_RATE : 0;
        break;
      case 'Leased':
        // External uses 2.0x on EBIT (vs Cascadia 2.5x)
        externalValue += fac.metricValue * EXTERNAL_LEASED_MULTIPLIER;
        break;
      case 'ALF/SNC-Owned':
        // External uses cap rate + 200bps
        const externalRate = fac.rateOrMultiplier + EXTERNAL_ALF_CAP_RATE_SPREAD;
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
// REIMBURSEMENT UPSIDE (from Newo knowledge base)
// ============================================================================

interface ReimbursementUpsideResult {
  pdpmUpside: { low: number; high: number };
  qualityBonusUpside: { low: number; high: number };
  totalUpside: { low: number; high: number };
  totalUpsidePercent: { low: number; high: number };
}

function calculateReimbursementUpside(
  facilities: CascadiaFacilityValuation[],
  totalBeds: number,
): ReimbursementUpsideResult {
  const totalRevenue = facilities.reduce((s, f) => s + f.metricValue, 0);

  // PDPM optimization: 10-15% revenue increase (from knowledge base)
  const pdpmLow = totalRevenue * REIMBURSEMENT_OPTIMIZATION.pdpmPotential.low;
  const pdpmHigh = totalRevenue * REIMBURSEMENT_OPTIMIZATION.pdpmPotential.high;

  // Quality bonus: per-bed revenue impact (assume moving from 3→4 star)
  const qualityImpact = QUALITY_REVENUE_IMPACT.find(q => q.starRating === 4);
  const qualityLow = totalBeds * (qualityImpact?.revenuePerBed.low ?? 1500);
  const qualityHigh = totalBeds * (qualityImpact?.revenuePerBed.high ?? 3000);

  const totalLow = pdpmLow + qualityLow;
  const totalHigh = pdpmHigh + qualityHigh;

  return {
    pdpmUpside: { low: Math.round(pdpmLow), high: Math.round(pdpmHigh) },
    qualityBonusUpside: { low: Math.round(qualityLow), high: Math.round(qualityHigh) },
    totalUpside: { low: Math.round(totalLow), high: Math.round(totalHigh) },
    totalUpsidePercent: {
      low: totalRevenue > 0 ? (totalLow / totalRevenue) * 100 : 0,
      high: totalRevenue > 0 ? (totalHigh / totalRevenue) * 100 : 0,
    },
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
