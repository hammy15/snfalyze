/**
 * Stage Data Adapter
 *
 * Converts SmartExtractionResult into WizardStageData format for backward
 * compatibility with the existing 7-stage wizard pipeline.
 *
 * Maps:
 * - T13FacilitySection[] → PLFacility[] (visionExtraction.facilities)
 * - CascadiaValuationResult → analysisResult.valuations[]
 * - T13 summary metrics → analysisResult.financialSummary
 * - Facility classifications → facilityIdentification.facilities
 */

import type {
  SmartExtractionResult,
  T13FacilitySection,
  T13LineItem,
  CascadiaValuationResult,
  FacilityClassification,
  AssetValuationResult,
} from './types';

// ============================================================================
// TYPES (matching existing PLFacility/PLLineItem from PLVerificationTable)
// ============================================================================

export interface PLLineItem {
  id: string;
  category: 'revenue' | 'expense' | 'metric';
  subcategory: string;
  label: string;
  values: { period: string; value: number }[];
  annual?: number;
  ppd?: number;
  percentRevenue?: number;
  confidence: number;
  isEdited?: boolean;
}

export interface PLFacility {
  id: string;
  name: string;
  ccn?: string;
  state?: string;
  city?: string;
  beds?: number;
  periods: string[];
  lineItems: PLLineItem[];
  census?: {
    periods: string[];
    totalDays: number[];
    avgDailyCensus: number[];
    occupancy: number[];
  };
  confidence: number;
}

// The subset of WizardStageData we produce
export interface SmartExtractionStageData {
  visionExtraction: {
    facilities: PLFacility[];
    verified: boolean;
    extractedAt: string;
  };
  analysisResult: {
    completed: boolean;
    valuations: {
      method: string;
      label?: string;
      value: number;
      confidence: number;
      notes?: string;
    }[];
    financialSummary: {
      totalRevenue: number;
      totalExpenses: number;
      noi: number;
      noiMargin: number;
      totalBeds: number;
      facilityCount: number;
    };
    riskAssessment?: {
      overallScore: number;
      rating: string;
      recommendation: 'pursue' | 'conditional' | 'pass';
      topRisks: string[];
      strengths: string[];
    };
    purchaseRecommendation?: {
      recommended: number;
      low: number;
      high: number;
      perBed: number;
      method: string;
    };
  };
  facilityIdentification?: {
    facilities: {
      slot: number;
      name: string;
      state?: string;
      city?: string;
      licensedBeds?: number;
      assetType?: 'SNF' | 'ALF' | 'ILF';
      isVerified: boolean;
    }[];
  };
  smartExtraction: SmartExtractionResult;
}

// ============================================================================
// MAIN CONVERTER
// ============================================================================

export function smartResultToStageData(result: SmartExtractionResult): SmartExtractionStageData {
  const plFacilities = convertT13ToPLFacilities(
    result.t13Data?.facilities || [],
    result.facilityClassifications,
    result.assetValuation,
  );

  const valuations = buildValuations(result.cascadiaValuation);
  const financialSummary = buildFinancialSummary(result);
  const purchaseRecommendation = buildPurchaseRecommendation(result.cascadiaValuation);

  return {
    visionExtraction: {
      facilities: plFacilities,
      verified: false,
      extractedAt: new Date().toISOString(),
    },
    analysisResult: {
      completed: true,
      valuations,
      financialSummary,
      purchaseRecommendation,
    },
    facilityIdentification: {
      facilities: buildFacilityIdentifications(result.facilityClassifications),
    },
    smartExtraction: result,
  };
}

// ============================================================================
// T13 → PLFacility CONVERSION
// ============================================================================

function convertT13ToPLFacilities(
  t13Facilities: T13FacilitySection[],
  classifications: FacilityClassification[],
  assetValuation?: AssetValuationResult,
): PLFacility[] {
  return t13Facilities.map((fac, idx) => {
    const classification = classifications.find(c =>
      c.facilityName.toLowerCase().trim() === fac.facilityName.toLowerCase().trim()
    );

    const avEntry = assetValuation?.entries.find(e =>
      e.facilityName.toLowerCase().trim() === fac.facilityName.toLowerCase().trim()
    );

    const beds = classification?.beds || avEntry?.beds || fac.censusData?.beds || 0;
    const totalRevenue = fac.summaryMetrics.totalRevenue;

    // Convert T13 line items to PLLineItem format
    const lineItems: PLLineItem[] = fac.lineItems
      .filter(li => !li.isTotal && !li.isSubtotal && li.annualValue !== 0)
      .map((li, liIdx) => convertLineItem(li, liIdx, fac.facilityName, totalRevenue));

    // Add summary metric rows
    const metricItems = buildMetricItems(fac, lineItems.length);
    lineItems.push(...metricItems);

    // Build census data
    const census = buildCensusData(fac, beds);

    return {
      id: `smart-${idx}-${fac.facilityName.replace(/\s+/g, '-').toLowerCase()}`,
      name: fac.facilityName,
      state: avEntry?.state,
      city: avEntry?.city,
      beds,
      periods: ['Annual'],
      lineItems,
      census,
      confidence: 0.9,
    };
  });
}

function convertLineItem(
  li: T13LineItem,
  index: number,
  facilityName: string,
  totalRevenue: number,
): PLLineItem {
  const category: PLLineItem['category'] = li.category === 'census' ? 'metric' : li.category;

  const percentRevenue = totalRevenue > 0 && li.annualValue !== 0
    ? (li.annualValue / totalRevenue) * 100
    : undefined;

  return {
    id: `li-${facilityName.substring(0, 8)}-${index}`,
    category,
    subcategory: li.subcategory || li.coaCode || mapCategoryToSubcategory(li),
    label: li.label,
    values: [{ period: 'Annual', value: li.annualValue }],
    annual: li.annualValue,
    ppd: li.ppdValue,
    percentRevenue,
    confidence: li.glCode ? 0.95 : 0.8,
  };
}

function mapCategoryToSubcategory(li: T13LineItem): string {
  if (li.category === 'revenue') {
    if (/medicare/i.test(li.label)) return 'medicare_revenue';
    if (/medicaid/i.test(li.label)) return 'medicaid_revenue';
    if (/managed\s*care/i.test(li.label)) return 'managed_care_revenue';
    if (/private/i.test(li.label)) return 'private_revenue';
    return 'other_revenue';
  }
  if (li.category === 'expense') {
    if (/salary|wage|payroll|nursing|staff/i.test(li.label)) return 'labor_nursing';
    if (/dietary|food/i.test(li.label)) return 'dietary';
    if (/plant|maintenance|repair/i.test(li.label)) return 'plant_operations';
    if (/admin|general/i.test(li.label)) return 'administrative';
    if (/therapy/i.test(li.label)) return 'therapy';
    if (/insurance/i.test(li.label)) return 'insurance';
    if (/depreciation/i.test(li.label)) return 'depreciation';
    return 'other_expense';
  }
  return 'metric';
}

function buildMetricItems(fac: T13FacilitySection, startIndex: number): PLLineItem[] {
  const { summaryMetrics, facilityName } = fac;
  const metrics: PLLineItem[] = [];
  const prefix = facilityName.substring(0, 8);

  const addMetric = (label: string, value: number, subcategory: string) => {
    if (value !== 0) {
      metrics.push({
        id: `li-${prefix}-metric-${metrics.length + startIndex}`,
        category: 'metric',
        subcategory,
        label,
        values: [{ period: 'Annual', value }],
        annual: value,
        confidence: 0.95,
      });
    }
  };

  addMetric('Total Revenue', summaryMetrics.totalRevenue, 'total_revenue');
  addMetric('Total Expenses', summaryMetrics.totalExpenses, 'total_expenses');
  addMetric('EBITDAR', summaryMetrics.ebitdar, 'ebitdar');
  addMetric('EBITDA', summaryMetrics.ebitda, 'ebitda');
  addMetric('Net Income', summaryMetrics.netIncome, 'net_income');

  if (summaryMetrics.managementFee) {
    addMetric('Management Fee', summaryMetrics.managementFee, 'management_fee');
  }
  if (summaryMetrics.leaseExpense) {
    addMetric('Lease Expense', summaryMetrics.leaseExpense, 'lease_expense');
  }

  return metrics;
}

function buildCensusData(
  fac: T13FacilitySection,
  beds: number,
): PLFacility['census'] | undefined {
  const { censusData } = fac;
  if (!censusData && beds <= 0) return undefined;

  const totalDays = censusData?.totalPatientDays || (beds > 0 ? beds * 365 * 0.85 : 0);
  const adc = censusData?.avgDailyCensus || (totalDays > 0 ? totalDays / 365 : beds * 0.85);
  const occupancy = censusData?.occupancy || (beds > 0 ? adc / beds : 0.85);

  return {
    periods: ['Annual'],
    totalDays: [Math.round(totalDays)],
    avgDailyCensus: [Math.round(adc * 10) / 10],
    occupancy: [Math.round(occupancy * 1000) / 1000],
  };
}

// ============================================================================
// VALUATION DATA
// ============================================================================

function buildValuations(cascadia?: CascadiaValuationResult): SmartExtractionStageData['analysisResult']['valuations'] {
  if (!cascadia) return [];

  const valuations: SmartExtractionStageData['analysisResult']['valuations'] = [];

  // Cascadia method - portfolio total
  valuations.push({
    method: 'cascadia',
    label: 'Cascadia Three-Method Valuation',
    value: cascadia.portfolioTotal.totalValue,
    confidence: 90,
    notes: `${cascadia.portfolioTotal.facilityCount} facilities, ${cascadia.portfolioTotal.totalBeds} beds, $${Math.round(cascadia.portfolioTotal.avgValuePerBed).toLocaleString()}/bed`,
  });

  // Category breakdowns
  for (const cat of cascadia.categories) {
    valuations.push({
      method: `cascadia_${cat.propertyType.toLowerCase().replace(/[/\s]/g, '_')}`,
      label: `${cat.category} (${cat.valuationMethod})`,
      value: cat.totalValue,
      confidence: 85,
      notes: `${cat.facilityCount} facilities, ${cat.totalBeds} beds`,
    });
  }

  // Dual view
  if (cascadia.dualView) {
    valuations.push({
      method: 'external_conservative',
      label: 'External/Lender View (Conservative)',
      value: cascadia.dualView.externalValue,
      confidence: 75,
      notes: 'Higher cap rates, lower multipliers',
    });
  }

  // Sensitivity midpoint
  if (cascadia.sensitivity.capRateVariations.length > 0) {
    const lowest = cascadia.sensitivity.capRateVariations[cascadia.sensitivity.capRateVariations.length - 1];
    const highest = cascadia.sensitivity.capRateVariations[0];
    if (lowest && highest) {
      valuations.push({
        method: 'sensitivity_range',
        label: 'Sensitivity Range',
        value: cascadia.sensitivity.baseValue,
        confidence: 70,
        notes: `Range: $${(highest.value / 1e6).toFixed(1)}M - $${(lowest.value / 1e6).toFixed(1)}M`,
      });
    }
  }

  return valuations;
}

function buildPurchaseRecommendation(
  cascadia?: CascadiaValuationResult,
): SmartExtractionStageData['analysisResult']['purchaseRecommendation'] | undefined {
  if (!cascadia) return undefined;

  const { portfolioTotal, dualView } = cascadia;

  const recommended = portfolioTotal.totalValue;
  const low = dualView?.externalValue || Math.round(recommended * 0.85);
  const high = Math.round(recommended * 1.05);

  return {
    recommended,
    low,
    high,
    perBed: portfolioTotal.avgValuePerBed,
    method: 'Cascadia Three-Method',
  };
}

// ============================================================================
// FINANCIAL SUMMARY
// ============================================================================

function buildFinancialSummary(result: SmartExtractionResult): SmartExtractionStageData['analysisResult']['financialSummary'] {
  const facilities = result.t13Data?.facilities || [];

  const totalRevenue = facilities.reduce((s, f) => s + f.summaryMetrics.totalRevenue, 0);
  const totalExpenses = facilities.reduce((s, f) => s + f.summaryMetrics.totalExpenses, 0);
  const noi = facilities.reduce((s, f) => s + f.summaryMetrics.ebitda, 0);
  const totalBeds = result.facilityClassifications.reduce((s, c) => s + c.beds, 0);

  return {
    totalRevenue,
    totalExpenses,
    noi,
    noiMargin: totalRevenue > 0 ? noi / totalRevenue : 0,
    totalBeds,
    facilityCount: facilities.length,
  };
}

// ============================================================================
// FACILITY IDENTIFICATIONS
// ============================================================================

function buildFacilityIdentifications(
  classifications: FacilityClassification[],
): NonNullable<SmartExtractionStageData['facilityIdentification']>['facilities'] {
  return classifications.map((c, idx) => ({
    slot: idx + 1,
    name: c.facilityName,
    licensedBeds: c.beds || undefined,
    assetType: mapPropertyTypeToAsset(c.propertyType),
    isVerified: false,
  }));
}

function mapPropertyTypeToAsset(
  propertyType: string,
): 'SNF' | 'ALF' | 'ILF' {
  if (/ALF|SNC|assisted|memory/i.test(propertyType)) return 'ALF';
  if (/IL|independent/i.test(propertyType)) return 'ILF';
  return 'SNF';
}
