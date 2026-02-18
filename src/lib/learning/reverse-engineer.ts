/**
 * Reverse Engineering Engine
 *
 * Compares raw extracted data vs completed proforma vs value assessment
 * to detect how Cascadia normalized and valued each facility.
 */

import type {
  ComparisonResult,
  FacilityComparison,
  NormalizationDiff,
  DetectedPreferences,
  LineItemDiff,
  ProformaParseResult,
  ValuationParseResult,
} from './types';
import type { SmartExtractionResult } from '../extraction/smart-excel/types';

/**
 * Compare raw extraction against completed proforma and valuation
 */
export function reverseEngineer(
  rawExtraction: SmartExtractionResult,
  proformaData: ProformaParseResult,
  valuationData: ValuationParseResult | null,
  historicalDealId: string
): ComparisonResult {
  const warnings: string[] = [];
  const facilityComparisons: FacilityComparison[] = [];

  // Get raw facilities from T13 data
  const rawFacilities = rawExtraction.t13Data?.facilities || [];

  // Match raw facilities to proforma facilities by name
  for (const proformaFacility of proformaData.facilities) {
    const rawMatch = findBestMatch(proformaFacility.facilityName, rawFacilities.map(f => f.facilityName));
    const rawFacility = rawMatch
      ? rawFacilities.find(f => f.facilityName === rawMatch)
      : null;

    // Find valuation data for this facility
    const valMatch = valuationData
      ? findBestMatch(proformaFacility.facilityName, valuationData.facilities.map(f => f.facilityName))
      : null;
    const valFacility = valMatch
      ? valuationData!.facilities.find(f => f.facilityName === valMatch)
      : null;

    // Get classification if available
    const classification = rawExtraction.facilityClassifications?.find(
      c => findBestMatch(proformaFacility.facilityName, [c.facilityName]) !== null
    );

    // Build raw financial data
    const rawRevenue = rawFacility?.summaryMetrics?.totalRevenue || 0;
    const rawExpenses = rawFacility?.summaryMetrics?.totalExpenses || 0;
    const rawEbitdar = rawFacility?.summaryMetrics?.ebitdar || 0;
    const rawEbitda = rawFacility?.summaryMetrics?.ebitda || 0;
    const rawNi = rawFacility?.summaryMetrics?.netIncome || 0;

    // Build proforma financial data
    const proRevenue = proformaFacility.revenue;
    const proExpenses = proformaFacility.expenses;
    const proEbitdar = proformaFacility.ebitdar;
    const proEbitda = proformaFacility.ebitda;
    const proNi = proformaFacility.netIncome;

    // Detect normalization adjustments
    const adjustments = detectNormalizationDiffs(
      { revenue: rawRevenue, expenses: rawExpenses, ebitdar: rawEbitdar },
      { revenue: proRevenue, expenses: proExpenses, ebitdar: proEbitdar },
      rawFacility?.lineItems || [],
      proformaFacility.lineItems || []
    );

    // Calculate valuation comparison
    const userValue = valFacility?.valuation || 0;
    const systemCapRate = classification?.applicableRate || 0.125;
    const systemValue = classification?.valuationMethod === 'ebit_multiplier'
      ? proEbitda * (classification?.applicableRate || 2.5)
      : proEbitdar / (systemCapRate || 0.125);

    // Back-calculate implied cap rate
    const impliedCapRate = userValue > 0 && proEbitdar > 0
      ? proEbitdar / userValue
      : undefined;
    const impliedMultiplier = userValue > 0 && proEbitda > 0 && classification?.valuationMethod === 'ebit_multiplier'
      ? userValue / proEbitda
      : undefined;

    // Detect preferences
    const detectedPreferences = detectPreferences(
      rawFacility,
      proformaFacility,
      valFacility,
      impliedCapRate,
      impliedMultiplier
    );

    facilityComparisons.push({
      facilityName: proformaFacility.facilityName,
      propertyType: classification?.propertyType || valFacility?.propertyType,
      assetType: valFacility?.propertyType?.includes('ALF') ? 'ALF' : valFacility?.propertyType?.includes('IL') ? 'ILF' : 'SNF',
      state: valFacility?.state,
      beds: valFacility?.beds || classification?.beds,
      raw: {
        revenue: rawRevenue,
        expenses: rawExpenses,
        ebitdar: rawEbitdar,
        ebitda: rawEbitda,
        netIncome: rawNi,
        occupancy: rawFacility?.censusData?.occupancy,
        lineItems: [],
      },
      proforma: {
        revenue: proRevenue,
        expenses: proExpenses,
        ebitdar: proEbitdar,
        ebitda: proEbitda,
        netIncome: proNi,
        occupancy: proformaFacility.occupancy,
        lineItems: [],
      },
      adjustments,
      valuation: {
        userValue,
        systemValue,
        userCapRate: valFacility?.capRate,
        impliedCapRate,
        userMultiplier: valFacility?.multiplier,
        impliedMultiplier,
        delta: userValue - systemValue,
        deltaPercent: systemValue !== 0 ? (userValue - systemValue) / systemValue : 0,
      },
      detectedPreferences,
    });

    if (!rawMatch) {
      warnings.push(`No raw data match found for proforma facility: ${proformaFacility.facilityName}`);
    }
  }

  // Portfolio summary
  const portfolioSummary = {
    totalRawRevenue: facilityComparisons.reduce((s, f) => s + f.raw.revenue, 0),
    totalProformaRevenue: facilityComparisons.reduce((s, f) => s + f.proforma.revenue, 0),
    totalRawEbitdar: facilityComparisons.reduce((s, f) => s + f.raw.ebitdar, 0),
    totalProformaEbitdar: facilityComparisons.reduce((s, f) => s + f.proforma.ebitdar, 0),
    totalUserValuation: facilityComparisons.reduce((s, f) => s + f.valuation.userValue, 0),
    totalSystemValuation: facilityComparisons.reduce((s, f) => s + f.valuation.systemValue, 0),
    avgCapRate: calculateAvg(facilityComparisons.map(f => f.valuation.impliedCapRate).filter(Boolean) as number[]),
    avgMultiplier: calculateAvg(facilityComparisons.map(f => f.valuation.impliedMultiplier).filter(Boolean) as number[]),
    totalBeds: facilityComparisons.reduce((s, f) => s + (f.beds || 0), 0),
    facilityCount: facilityComparisons.length,
  };

  return {
    historicalDealId,
    facilities: facilityComparisons,
    portfolioSummary,
    confidence: facilityComparisons.length > 0 ? Math.min(0.9, 0.4 + facilityComparisons.length * 0.03) : 0.1,
    warnings,
  };
}

// ============================================================================
// Detection Logic
// ============================================================================

function detectNormalizationDiffs(
  raw: { revenue: number; expenses: number; ebitdar: number },
  proforma: { revenue: number; expenses: number; ebitdar: number },
  _rawLineItems: unknown[],
  _proformaLineItems: unknown[]
): NormalizationDiff[] {
  const diffs: NormalizationDiff[] = [];

  // Revenue adjustment
  if (raw.revenue > 0 && proforma.revenue > 0 && raw.revenue !== proforma.revenue) {
    diffs.push({
      field: 'total_revenue',
      rawValue: raw.revenue,
      proformaValue: proforma.revenue,
      changeAmount: proforma.revenue - raw.revenue,
      changePercent: (proforma.revenue - raw.revenue) / raw.revenue,
      changeType: proforma.revenue > raw.revenue ? 'increase' : 'decrease',
      description: `Revenue adjusted from $${fmt(raw.revenue)} to $${fmt(proforma.revenue)}`,
    });
  }

  // Expense adjustment
  if (raw.expenses > 0 && proforma.expenses > 0 && raw.expenses !== proforma.expenses) {
    diffs.push({
      field: 'total_expenses',
      rawValue: raw.expenses,
      proformaValue: proforma.expenses,
      changeAmount: proforma.expenses - raw.expenses,
      changePercent: (proforma.expenses - raw.expenses) / raw.expenses,
      changeType: proforma.expenses > raw.expenses ? 'increase' : 'decrease',
      description: `Expenses adjusted from $${fmt(raw.expenses)} to $${fmt(proforma.expenses)}`,
    });
  }

  // EBITDAR adjustment
  if (raw.ebitdar !== 0 && proforma.ebitdar !== 0 && raw.ebitdar !== proforma.ebitdar) {
    diffs.push({
      field: 'ebitdar',
      rawValue: raw.ebitdar,
      proformaValue: proforma.ebitdar,
      changeAmount: proforma.ebitdar - raw.ebitdar,
      changePercent: raw.ebitdar !== 0 ? (proforma.ebitdar - raw.ebitdar) / Math.abs(raw.ebitdar) : 0,
      changeType: proforma.ebitdar > raw.ebitdar ? 'increase' : 'decrease',
      description: `EBITDAR adjusted from $${fmt(raw.ebitdar)} to $${fmt(proforma.ebitdar)}`,
    });
  }

  return diffs;
}

function detectPreferences(
  rawFacility: { summaryMetrics?: { managementFee?: number; totalRevenue?: number; occupancy?: number } } | null | undefined,
  proformaFacility: { revenue: number; occupancy?: number; assumptions?: { managementFeePercent?: number; agencyTargetPercent?: number; capexReservePercent?: number; revenueGrowthRate?: number; expenseGrowthRate?: number; targetOccupancy?: number } },
  valFacility: { capRate?: number; multiplier?: number } | null | undefined,
  impliedCapRate: number | undefined,
  impliedMultiplier: number | undefined
): DetectedPreferences {
  const prefs: DetectedPreferences = {};

  // Management fee detection
  if (proformaFacility.assumptions?.managementFeePercent) {
    prefs.managementFeePercent = proformaFacility.assumptions.managementFeePercent;
  } else if (rawFacility?.summaryMetrics?.managementFee && proformaFacility.revenue > 0) {
    // Try to detect from raw data
    prefs.managementFeePercent = Math.abs(rawFacility.summaryMetrics.managementFee) / proformaFacility.revenue;
  }

  // Agency target
  if (proformaFacility.assumptions?.agencyTargetPercent) {
    prefs.agencyTargetPercent = proformaFacility.assumptions.agencyTargetPercent;
  }

  // CapEx reserve
  if (proformaFacility.assumptions?.capexReservePercent) {
    prefs.capexReservePercent = proformaFacility.assumptions.capexReservePercent;
  }

  // Growth rates
  if (proformaFacility.assumptions?.revenueGrowthRate) {
    prefs.revenueGrowthRate = proformaFacility.assumptions.revenueGrowthRate;
  }
  if (proformaFacility.assumptions?.expenseGrowthRate) {
    prefs.expenseGrowthRate = proformaFacility.assumptions.expenseGrowthRate;
  }

  // Occupancy assumption
  if (proformaFacility.occupancy) {
    prefs.occupancyAssumption = proformaFacility.occupancy;
  } else if (proformaFacility.assumptions?.targetOccupancy) {
    prefs.occupancyAssumption = proformaFacility.assumptions.targetOccupancy;
  }

  // Cap rate / multiplier
  if (valFacility?.capRate) {
    prefs.capRateUsed = valFacility.capRate;
  } else if (impliedCapRate && impliedCapRate > 0.03 && impliedCapRate < 0.25) {
    prefs.capRateUsed = impliedCapRate;
  }

  if (valFacility?.multiplier) {
    prefs.multiplierUsed = valFacility.multiplier;
  } else if (impliedMultiplier && impliedMultiplier > 0.5 && impliedMultiplier < 20) {
    prefs.multiplierUsed = impliedMultiplier;
  }

  return prefs;
}

// ============================================================================
// Matching Utilities
// ============================================================================

/**
 * Fuzzy name matching — finds best match from candidates
 * Reuses the pattern from cascadia-method.ts
 */
function findBestMatch(target: string, candidates: string[]): string | null {
  const normalize = (s: string) =>
    s.toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();

  const targetNorm = normalize(target);
  if (!targetNorm) return null;

  let bestMatch: string | null = null;
  let bestScore = 0;

  for (const candidate of candidates) {
    const candidateNorm = normalize(candidate);
    if (!candidateNorm) continue;

    // Exact match
    if (targetNorm === candidateNorm) return candidate;

    // Substring match
    if (targetNorm.includes(candidateNorm) || candidateNorm.includes(targetNorm)) {
      const score = Math.min(targetNorm.length, candidateNorm.length) / Math.max(targetNorm.length, candidateNorm.length);
      if (score > bestScore && score > 0.5) {
        bestScore = score;
        bestMatch = candidate;
      }
    }

    // Word overlap
    const targetWords = new Set(targetNorm.match(/[a-z]+/g) || []);
    const candidateWords = new Set(candidateNorm.match(/[a-z]+/g) || []);
    const overlap = [...targetWords].filter(w => candidateWords.has(w)).length;
    const totalWords = Math.max(targetWords.size, candidateWords.size);
    const wordScore = totalWords > 0 ? overlap / totalWords : 0;
    if (wordScore > bestScore && wordScore > 0.5) {
      bestScore = wordScore;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

function calculateAvg(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function fmt(n: number): string {
  return Math.round(n).toLocaleString();
}
