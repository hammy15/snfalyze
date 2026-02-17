/**
 * Benchmark Integration
 *
 * Connects extracted facility data to Newo institutional knowledge base.
 * Validates cap rates, operational performance, and identifies deal breakers.
 */

import type {
  FacilityBenchmark,
  T13FacilitySection,
  FacilityClassification,
  CascadiaFacilityValuation,
} from './types';

import {
  getGeographicCapRate,
  getMarketTier,
  SNF_OPERATIONAL_TIERS,
  SNF_VALUATION_MULTIPLES,
  ALF_VALUATION_MULTIPLES,
  REIMBURSEMENT_OPTIMIZATION,
  type OperationalTier,
} from '../../analysis/knowledge/benchmarks';

// ============================================================================
// MAIN BENCHMARK FUNCTION
// ============================================================================

export function benchmarkFacilities(
  t13Facilities: T13FacilitySection[],
  classifications: FacilityClassification[],
  valuations: CascadiaFacilityValuation[],
): FacilityBenchmark[] {
  const benchmarks: FacilityBenchmark[] = [];

  for (const facility of t13Facilities) {
    const classification = classifications.find(c =>
      c.facilityName.toLowerCase().trim() === facility.facilityName.toLowerCase().trim()
    );
    const valuation = valuations.find(v =>
      v.facilityName.toLowerCase().trim() === facility.facilityName.toLowerCase().trim()
    );

    if (!classification) continue;

    const benchmark = benchmarkSingleFacility(facility, classification, valuation);
    benchmarks.push(benchmark);
  }

  return benchmarks;
}

// ============================================================================
// SINGLE FACILITY BENCHMARK
// ============================================================================

function benchmarkSingleFacility(
  facility: T13FacilitySection,
  classification: FacilityClassification,
  valuation?: CascadiaFacilityValuation,
): FacilityBenchmark {
  const { summaryMetrics, censusData, lineItems } = facility;
  const beds = classification.beds;
  const state = 'OR'; // Default to OR for Cascadia/Sapphire portfolio

  // Determine operational tier
  const tier = determineOperationalTier(facility, beds);

  // Build comparisons
  const comparisons: FacilityBenchmark['comparisons'] = [];

  // Revenue per bed day
  if (beds > 0 && censusData?.totalPatientDays) {
    const rpbd = summaryMetrics.totalRevenue / censusData.totalPatientDays;
    const benchmarkTier = SNF_OPERATIONAL_TIERS[tier];
    comparisons.push({
      metric: 'Revenue Per Bed Day',
      actual: Math.round(rpbd),
      benchmark: {
        low: benchmarkTier.revenuePerBedDay.min,
        median: (benchmarkTier.revenuePerBedDay.min + benchmarkTier.revenuePerBedDay.max) / 2,
        high: benchmarkTier.revenuePerBedDay.max,
      },
      rating: rpbd >= benchmarkTier.revenuePerBedDay.min ? 'above' : 'below',
      unit: '$/day',
    });
  }

  // EBITDAR margin
  if (summaryMetrics.totalRevenue > 0) {
    const ebitdarMargin = (summaryMetrics.ebitdar / summaryMetrics.totalRevenue) * 100;
    const benchmarkTier = SNF_OPERATIONAL_TIERS[tier];
    comparisons.push({
      metric: 'EBITDAR Margin',
      actual: Math.round(ebitdarMargin * 10) / 10,
      benchmark: {
        low: benchmarkTier.ebitdarMargin.min,
        median: (benchmarkTier.ebitdarMargin.min + benchmarkTier.ebitdarMargin.max) / 2,
        high: benchmarkTier.ebitdarMargin.max,
      },
      rating: ebitdarMargin >= benchmarkTier.ebitdarMargin.min ? (
        ebitdarMargin >= benchmarkTier.ebitdarMargin.max ? 'above' : 'at'
      ) : 'below',
      unit: '%',
    });
  }

  // Value per bed
  if (valuation && beds > 0) {
    const vpb = valuation.valuePerBed;
    const assetType = classification.propertyType.includes('ALF') ? 'ALF' : 'SNF';
    const marketTier = getMarketTier(state);
    const multiples = assetType === 'ALF'
      ? ALF_VALUATION_MULTIPLES[marketTier]
      : SNF_VALUATION_MULTIPLES[marketTier];

    comparisons.push({
      metric: 'Value Per Bed',
      actual: vpb,
      benchmark: {
        low: multiples.pricePerBed.low,
        median: (multiples.pricePerBed.low + multiples.pricePerBed.high) / 2,
        high: multiples.pricePerBed.high,
      },
      rating: vpb >= multiples.pricePerBed.low ? (
        vpb >= multiples.pricePerBed.high ? 'above' : 'at'
      ) : 'below',
      unit: '$/bed',
    });
  }

  // Labor cost percentage
  const laborExpense = lineItems
    .filter(li => /salary|wage|payroll|labor|nursing|staff/i.test(li.label) && !li.isTotal)
    .reduce((sum, li) => sum + Math.abs(li.annualValue), 0);

  if (laborExpense > 0 && summaryMetrics.totalRevenue > 0) {
    const laborPct = (laborExpense / summaryMetrics.totalRevenue) * 100;
    const benchmarkTier = SNF_OPERATIONAL_TIERS[tier];
    comparisons.push({
      metric: 'Labor Cost %',
      actual: Math.round(laborPct * 10) / 10,
      benchmark: {
        low: benchmarkTier.laborCostPercent.min,
        median: (benchmarkTier.laborCostPercent.min + benchmarkTier.laborCostPercent.max) / 2,
        high: benchmarkTier.laborCostPercent.max,
      },
      rating: laborPct <= benchmarkTier.laborCostPercent.max ? (
        laborPct <= benchmarkTier.laborCostPercent.min ? 'above' : 'at'
      ) : 'below',
      unit: '%',
    });
  }

  // Deal breakers
  const dealBreakers = checkDealBreakers(facility, classification, beds);

  // Cap rate validation
  const capRateValidation = validateCapRate(classification, state);

  return {
    facilityName: facility.facilityName,
    operationalTier: tier,
    comparisons,
    dealBreakers,
    capRateValidation,
  };
}

// ============================================================================
// OPERATIONAL TIER
// ============================================================================

function determineOperationalTier(
  facility: T13FacilitySection,
  beds: number,
): OperationalTier {
  const { summaryMetrics, censusData } = facility;

  // Score based on available metrics
  let score = 0;
  let factors = 0;

  // EBITDAR margin
  if (summaryMetrics.totalRevenue > 0) {
    const margin = (summaryMetrics.ebitdar / summaryMetrics.totalRevenue) * 100;
    if (margin >= 20) score += 3;
    else if (margin >= 10) score += 2;
    else score += 1;
    factors++;
  }

  // Revenue intensity (per bed)
  if (beds > 0 && summaryMetrics.totalRevenue > 0) {
    const revenuePerBed = summaryMetrics.totalRevenue / beds;
    if (revenuePerBed >= 100000) score += 3; // ~$274/day
    else if (revenuePerBed >= 60000) score += 2;
    else score += 1;
    factors++;
  }

  // Occupancy proxy
  if (censusData?.occupancy) {
    if (censusData.occupancy >= 0.95) score += 3;
    else if (censusData.occupancy >= 0.80) score += 2;
    else score += 1;
    factors++;
  }

  // Net income positive
  if (summaryMetrics.netIncome > 0) {
    score += 2;
    factors++;
  } else {
    score += 0;
    factors++;
  }

  const avgScore = factors > 0 ? score / factors : 1.5;

  if (avgScore >= 2.5) return 'strong';
  if (avgScore >= 1.5) return 'average';
  return 'weak';
}

// ============================================================================
// DEAL BREAKERS
// ============================================================================

function checkDealBreakers(
  facility: T13FacilitySection,
  classification: FacilityClassification,
  beds: number,
): FacilityBenchmark['dealBreakers'] {
  const { summaryMetrics, lineItems } = facility;
  const dealBreakers: FacilityBenchmark['dealBreakers'] = [];

  // Negative NOI
  dealBreakers.push({
    rule: 'Negative Net Operating Income',
    triggered: summaryMetrics.netIncome < 0,
    value: summaryMetrics.netIncome,
    threshold: 0,
  });

  // Negative EBITDA
  dealBreakers.push({
    rule: 'Negative EBITDA',
    triggered: summaryMetrics.ebitda < 0,
    value: summaryMetrics.ebitda,
    threshold: 0,
  });

  // Revenue per bed too low (< $30K/year = ~$82/day)
  if (beds > 0) {
    const revenuePerBed = summaryMetrics.totalRevenue / beds;
    dealBreakers.push({
      rule: 'Revenue Per Bed < $30K/year',
      triggered: revenuePerBed < 30000 && revenuePerBed > 0,
      value: Math.round(revenuePerBed),
      threshold: 30000,
    });
  }

  // Medicaid concentration > 85%
  const medicaidRevenue = lineItems
    .filter(li => /medicaid/i.test(li.label) && li.category === 'revenue' && !li.isTotal)
    .reduce((sum, li) => sum + Math.abs(li.annualValue), 0);

  if (summaryMetrics.totalRevenue > 0) {
    const medicaidPct = medicaidRevenue / summaryMetrics.totalRevenue;
    dealBreakers.push({
      rule: 'Medicaid Concentration > 85%',
      triggered: medicaidPct > 0.85,
      value: Math.round(medicaidPct * 100),
      threshold: 85,
    });
  }

  // EBITDAR margin < 5%
  if (summaryMetrics.totalRevenue > 0) {
    const ebitdarMargin = (summaryMetrics.ebitdar / summaryMetrics.totalRevenue) * 100;
    dealBreakers.push({
      rule: 'EBITDAR Margin < 5%',
      triggered: ebitdarMargin < 5 && ebitdarMargin > -100,
      value: Math.round(ebitdarMargin * 10) / 10,
      threshold: 5,
    });
  }

  return dealBreakers;
}

// ============================================================================
// CAP RATE VALIDATION
// ============================================================================

function validateCapRate(
  classification: FacilityClassification,
  state: string,
): FacilityBenchmark['capRateValidation'] {
  const usedRate = classification.applicableRate;
  const assetType = classification.propertyType.includes('ALF') ? 'ALF' : 'SNF';

  const geoRange = getGeographicCapRate(state, assetType);

  // Fallback ranges if geographic data unavailable
  const range = geoRange
    ? { low: geoRange.low, high: geoRange.high }
    : assetType === 'SNF'
      ? { low: 0.07, high: 0.12 }
      : { low: 0.05, high: 0.08 };

  return {
    usedRate,
    benchmarkRange: range,
    isWithinRange: usedRate >= range.low && usedRate <= range.high,
  };
}
