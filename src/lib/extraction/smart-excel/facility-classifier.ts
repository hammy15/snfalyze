/**
 * Facility Classifier
 *
 * Determines property type and valuation method for each facility based on
 * Cascadia's three-method valuation methodology:
 *
 * 1. SNF-Owned: EBITDAR / Cap Rate (12.5%)
 * 2. Leased: EBIT × Multiplier (2.0–3.0x, midpoint 2.5x)
 * 3. ALF/SNC-Owned: EBITDAR / Cap Rate (8%, 9%, or 12% based on SNC%)
 */

import type {
  FacilityClassification,
  CascadiaPropertyType,
  ValuationMethodType,
  T13FacilitySection,
  AssetValuationEntry,
} from './types';

// ============================================================================
// MAIN CLASSIFIER
// ============================================================================

export function classifyFacilities(
  t13Facilities: T13FacilitySection[],
  assetValuationEntries: AssetValuationEntry[],
): FacilityClassification[] {
  const classifications: FacilityClassification[] = [];

  // Build a lookup from asset valuation data
  const avLookup = new Map<string, AssetValuationEntry>();
  for (const entry of assetValuationEntries) {
    avLookup.set(entry.facilityName.toLowerCase().trim(), entry);
    // Also store a shortened key for fuzzy matching
    const shortKey = entry.facilityName.toLowerCase().trim().substring(0, 10);
    if (!avLookup.has(shortKey)) {
      avLookup.set(shortKey, entry);
    }
  }

  for (const facility of t13Facilities) {
    const classification = classifySingleFacility(facility, avLookup);
    classifications.push(classification);
  }

  // Also classify facilities that are in asset valuation but not in T13
  for (const entry of assetValuationEntries) {
    const alreadyClassified = classifications.some(c =>
      c.facilityName.toLowerCase().trim() === entry.facilityName.toLowerCase().trim()
    );
    if (!alreadyClassified) {
      classifications.push(classifyFromAssetValuation(entry));
    }
  }

  return classifications;
}

// ============================================================================
// SINGLE FACILITY CLASSIFICATION
// ============================================================================

function classifySingleFacility(
  facility: T13FacilitySection,
  avLookup: Map<string, AssetValuationEntry>,
): FacilityClassification {
  const indicators: string[] = [];
  const facilityKey = facility.facilityName.toLowerCase().trim();
  const shortKey = facilityKey.substring(0, 10);

  // Priority 1: Check asset valuation data for explicit property type
  const avEntry = avLookup.get(facilityKey) || avLookup.get(shortKey) ||
    findFuzzyMatch(facility.facilityName, avLookup);

  if (avEntry) {
    indicators.push(`Asset valuation: ${avEntry.propertyType}`);
    const sncPercent = avEntry.sncPercent;
    const beds = avEntry.beds || extractBedCount(facility);
    const capRate = determineCapRate(avEntry.propertyType, sncPercent);
    const method = determineValuationMethod(avEntry.propertyType);

    return {
      facilityName: facility.facilityName,
      propertyType: avEntry.propertyType,
      valuationMethod: method,
      sncPercent,
      applicableRate: avEntry.propertyType === 'Leased'
        ? (avEntry.multiplier || 2.5)
        : capRate,
      beds,
      confidence: 0.95,
      indicators,
    };
  }

  // Priority 2: Detect from T13 P&L data
  const { propertyType, method: valMethod, sncPercent, detectionIndicators } =
    detectFromPL(facility);

  indicators.push(...detectionIndicators);

  const beds = extractBedCount(facility);
  const capRate = determineCapRate(propertyType, sncPercent);

  return {
    facilityName: facility.facilityName,
    propertyType,
    valuationMethod: valMethod,
    sncPercent,
    applicableRate: propertyType === 'Leased' ? 2.5 : capRate,
    beds,
    confidence: detectionIndicators.length > 1 ? 0.8 : 0.6,
    indicators,
  };
}

function classifyFromAssetValuation(entry: AssetValuationEntry): FacilityClassification {
  const method = determineValuationMethod(entry.propertyType);
  const capRate = determineCapRate(entry.propertyType, entry.sncPercent);

  return {
    facilityName: entry.facilityName,
    propertyType: entry.propertyType,
    valuationMethod: method,
    sncPercent: entry.sncPercent,
    applicableRate: entry.propertyType === 'Leased'
      ? (entry.multiplier || 2.5)
      : capRate,
    beds: entry.beds,
    confidence: 0.9,
    indicators: [`From asset valuation: ${entry.propertyType}`],
  };
}

// ============================================================================
// P&L-BASED DETECTION
// ============================================================================

interface PLDetectionResult {
  propertyType: CascadiaPropertyType;
  method: ValuationMethodType;
  sncPercent?: number;
  detectionIndicators: string[];
}

function detectFromPL(facility: T13FacilitySection): PLDetectionResult {
  const indicators: string[] = [];
  const { summaryMetrics, lineItems, facilityType } = facility;

  // Check facility type annotation (from sheet name)
  if (facilityType) {
    if (/ALF|AL_IL|MC|IL|SNC/i.test(facilityType)) {
      indicators.push(`Facility type annotation: ${facilityType}`);

      // Determine SNC% from line items if possible
      const sncPercent = detectSNCPercent(lineItems);

      return {
        propertyType: 'ALF/SNC-Owned',
        method: 'ebitdar_cap_rate',
        sncPercent,
        detectionIndicators: indicators,
      };
    }
    if (/SNF/i.test(facilityType)) {
      indicators.push(`Facility type annotation: ${facilityType}`);
    }
  }

  // Check for lease/rent expense (indicates Leased property)
  const hasLeaseExpense = lineItems.some(li =>
    /lease|rent\s*expense|occupancy\s*cost/i.test(li.label)
    && li.annualValue !== 0
  );

  // Check for property tax (indicates Owned property)
  const hasPropertyTax = lineItems.some(li =>
    /property\s*tax|real\s*estate\s*tax/i.test(li.label)
    && li.annualValue > 0
  );

  if (hasLeaseExpense && !hasPropertyTax) {
    indicators.push('Has lease expense, no property tax → Leased');
    return {
      propertyType: 'Leased',
      method: 'ebit_multiplier',
      detectionIndicators: indicators,
    };
  }

  // Check for ALF/MC/IL revenue codes
  const hasALFRevenue = lineItems.some(li =>
    li.glCode && /^4(2[0-9]|23)/.test(li.glCode) && li.annualValue > 0
  );
  const hasSNCRevenue = lineItems.some(li =>
    /specific\s*need|snc/i.test(li.label) && li.annualValue > 0
  );

  if (hasALFRevenue || hasSNCRevenue) {
    indicators.push('Has ALF/SNC revenue codes');
    const sncPercent = detectSNCPercent(lineItems);
    return {
      propertyType: 'ALF/SNC-Owned',
      method: 'ebitdar_cap_rate',
      sncPercent,
      detectionIndicators: indicators,
    };
  }

  // Check for SNF revenue codes (400xxx)
  const hasSNFRevenue = lineItems.some(li =>
    li.glCode && /^400/.test(li.glCode) && li.annualValue > 0
  );

  if (hasSNFRevenue) {
    indicators.push('Has SNF revenue codes (400xxx)');
  }

  // Default: SNF-Owned
  indicators.push('Default classification: SNF-Owned');
  return {
    propertyType: 'SNF-Owned',
    method: 'ebitdar_cap_rate',
    detectionIndicators: indicators,
  };
}

// ============================================================================
// SNC% DETECTION
// ============================================================================

function detectSNCPercent(lineItems: { label: string; annualValue: number; glCode: string; category?: string; isTotal?: boolean }[]): number | undefined {
  // Look for explicit SNC percentage in line items
  for (const li of lineItems) {
    if (/snc\s*%|specific\s*need.*%|snc\s*percent/i.test(li.label)) {
      const pct = li.annualValue;
      if (pct >= 0 && pct <= 100) return pct / 100;
      if (pct >= 0 && pct <= 1) return pct;
    }
  }

  // Try to calculate from revenue mix
  const sncRevenue = lineItems
    .filter(li => /snc|specific\s*need/i.test(li.label) && li.category === 'revenue')
    .reduce((sum, li) => sum + Math.abs(li.annualValue), 0);

  const totalRevenue = lineItems
    .filter(li => li.category === 'revenue' && li.isTotal)
    .reduce((sum, li) => sum + Math.abs(li.annualValue), 0);

  if (sncRevenue > 0 && totalRevenue > 0) {
    return sncRevenue / totalRevenue;
  }

  return undefined;
}

// ============================================================================
// HELPERS
// ============================================================================

function determineValuationMethod(propertyType: CascadiaPropertyType): ValuationMethodType {
  return propertyType === 'Leased' ? 'ebit_multiplier' : 'ebitdar_cap_rate';
}

/**
 * Cascadia cap rate schedule:
 * - SNF-Owned: 12.5% (on EBITDAR)
 * - Leased: N/A (uses 2.0–3.0x multiplier on EBIT instead)
 * - ALF/SNC-Owned 0% SNC: 8%
 * - ALF/SNC-Owned >0% to ≤33% SNC: 9%
 * - ALF/SNC-Owned >33% SNC: 12%
 */
function determineCapRate(propertyType: CascadiaPropertyType, sncPercent?: number): number {
  if (propertyType === 'SNF-Owned') return 0.125;
  if (propertyType === 'Leased') return 0; // Not used (multiplier instead)

  // ALF/SNC-Owned
  if (sncPercent === undefined || sncPercent === 0) return 0.08;
  if (sncPercent <= 0.33) return 0.09;
  return 0.12;
}

function extractBedCount(facility: T13FacilitySection): number {
  // Try census data
  if (facility.censusData?.beds) return facility.censusData.beds;

  // Try to infer from patient days and occupancy
  if (facility.censusData?.totalPatientDays && facility.censusData?.occupancy) {
    return Math.round(
      facility.censusData.totalPatientDays / (365 * facility.censusData.occupancy)
    );
  }

  // Try to find beds in line items
  for (const li of facility.lineItems) {
    if (/beds|licensed/i.test(li.label) && li.annualValue > 0 && li.annualValue < 500) {
      return li.annualValue;
    }
  }

  return 0;
}

function findFuzzyMatch(
  name: string,
  lookup: Map<string, AssetValuationEntry>
): AssetValuationEntry | undefined {
  const normalized = name.toLowerCase().trim();

  for (const [key, entry] of lookup) {
    // Check if one contains the other (for partial matches)
    if (normalized.includes(key.substring(0, 8)) || key.includes(normalized.substring(0, 8))) {
      return entry;
    }
  }

  return undefined;
}

// ============================================================================
// EXPORTS FOR CAP RATE ACCESS
// ============================================================================

export { determineCapRate, determineValuationMethod };
