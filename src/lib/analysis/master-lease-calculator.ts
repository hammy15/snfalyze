/**
 * Master Lease Calculator
 *
 * Comprehensive portfolio-level lease and purchase analysis
 * with NPV projections, cross-collateralization, and decision support.
 */

import type { PartnerProfile, DealEconomics } from '../partners/partner-profiles';
import { calculateDealEconomics, checkUnderwritingCriteria } from '../partners/partner-profiles';
import type { FacilityRiskProfile } from '../extraction/enhanced-types';

// =============================================================================
// TYPES
// =============================================================================

export interface PortfolioFacility {
  id: string;
  name: string;
  beds: number;
  state: string;
  cmsRating?: number;
  yearBuilt?: number;

  // Financials
  ttmRevenue: number;
  ttmEbitdar: number;
  ttmNoi: number;

  // Operating metrics
  occupancyRate: number;
  medicarePercent?: number;
  medicaidPercent?: number;
  privatePayPercent?: number;
  agencyLaborPercent?: number;

  // Compliance
  surveyDeficiencies?: number;
  isSff?: boolean;
  hasImmediateJeopardy?: boolean;

  // Risk profile (from enhanced extraction)
  riskProfile?: FacilityRiskProfile;

  // Existing lease/debt (if any)
  existingAnnualRent?: number;
  existingDebtBalance?: number;
}

export interface MasterLeaseInput {
  facilities: PortfolioFacility[];
  partner: PartnerProfile;
  options?: MasterLeaseOptions;
}

export interface MasterLeaseOptions {
  // Deal structure
  isAllOrNothing: boolean;
  allowPartialExclusions: boolean;
  maxExcludedFacilities: number;

  // Custom economics (override partner defaults)
  customCapRate?: number;
  customYield?: number;
  customEscalation?: number;

  // Analysis options
  discountRate: number;
  projectionYears: number;
  includeRenewals: boolean;

  // Sensitivity parameters
  noiGrowthRate: number;
  occupancyStabilization?: number;
}

export interface MasterLeaseResult {
  summary: PortfolioSummary;
  facilityAnalysis: FacilityAnalysis[];
  leaseProjection: LeaseProjection;
  sensitivity: SensitivityAnalysis;
  decision: DealDecision;
  warnings: string[];
  recommendations: string[];
}

export interface PortfolioSummary {
  // Scale
  totalFacilities: number;
  includedFacilities: number;
  excludedFacilities: number;
  totalBeds: number;
  includedBeds: number;

  // Financials
  totalRevenue: number;
  totalEbitdar: number;
  totalNoi: number;

  // Deal metrics
  totalPurchasePrice: number;
  totalAnnualRent: number;
  totalMonthlyRent: number;

  // Weighted metrics
  weightedCapRate: number;
  weightedYield: number;
  portfolioCoverageRatio: number;
  coverageStatus: 'healthy' | 'warning' | 'critical';

  // Per-unit metrics
  avgPricePerBed: number;
  avgRentPerBed: number;
  avgNoiPerBed: number;
  avgEbitdarMargin: number;

  // Risk-adjusted metrics
  riskAdjustedCapRate: number;
  riskAdjustedPurchasePrice: number;

  // Quality metrics
  avgCmsRating: number;
  avgOccupancy: number;
  portfolioHealthScore: number;
}

export interface FacilityAnalysis {
  facility: PortfolioFacility;
  economics: DealEconomics;
  underwritingCheck: {
    passes: boolean;
    score: number;
    issues: string[];
    warnings: string[];
  };
  riskAdjustedCapRate: number;
  riskAdjustedPurchasePrice: number;
  recommendation: 'include' | 'exclude' | 'negotiate';
  notes: string[];
}

export interface LeaseProjection {
  // Initial terms
  initialTermYears: number;
  renewalOptions: number;
  renewalTermYears: number;
  totalPotentialYears: number;

  // Annual projections
  yearlyProjections: YearProjection[];

  // NPV analysis
  leaseNpv: number;
  totalLeaseObligation: number;
  avgAnnualRent: number;

  // Renewal value
  renewalOptionValue: number;

  // IRR (if purchase option exists)
  purchaseOptionIrr?: number;
}

export interface YearProjection {
  year: number;
  phase: 'initial' | 'renewal_1' | 'renewal_2' | 'renewal_3';
  annualRent: number;
  cumulativeRent: number;
  discountFactor: number;
  presentValue: number;
  projectedEbitdar: number;
  projectedCoverage: number;
}

export interface SensitivityAnalysis {
  // Cap rate sensitivity
  capRateSensitivity: {
    capRate: number;
    purchasePrice: number;
    annualRent: number;
    coverage: number;
  }[];

  // NOI sensitivity
  noiSensitivity: {
    noiChange: number;
    purchasePrice: number;
    coverage: number;
  }[];

  // Occupancy sensitivity
  occupancySensitivity: {
    occupancy: number;
    projectedNoi: number;
    coverage: number;
  }[];

  // Escalation sensitivity
  escalationSensitivity: {
    escalation: number;
    year5Rent: number;
    year10Rent: number;
    totalLeaseObligation: number;
  }[];

  // Break-even analysis
  breakEvenOccupancy: number;
  breakEvenNoiDecline: number;
  cushionToBreakeven: number;
}

export interface DealDecision {
  recommendation: 'proceed' | 'negotiate' | 'pass';
  confidence: 'high' | 'medium' | 'low';

  // Key factors
  positiveFactors: DecisionFactor[];
  negativeFactors: DecisionFactor[];
  riskMitigations: string[];

  // Negotiation guidance
  suggestedPurchasePrice: {
    low: number;
    mid: number;
    high: number;
  };
  suggestedRent: {
    low: number;
    mid: number;
    high: number;
  };

  // Comparison to alternatives
  buyVsLeaseAnalysis: BuyVsLeaseComparison;
}

export interface DecisionFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;  // 1-10
  description: string;
}

export interface BuyVsLeaseComparison {
  // Purchase scenario
  purchase: {
    totalCost: number;
    equityRequired: number;  // Assuming 30% down
    debtService: number;
    netCashFlow: number;
    yearOneReturn: number;
    fiveYearIrr: number;
  };

  // Lease scenario
  lease: {
    yearOneRent: number;
    fiveYearRent: number;
    tenYearRent: number;
    effectiveCost: number;  // NPV of lease
  };

  // Recommendation
  recommendation: 'purchase' | 'lease' | 'either';
  rationale: string;
}

// =============================================================================
// MAIN CALCULATOR
// =============================================================================

const DEFAULT_OPTIONS: MasterLeaseOptions = {
  isAllOrNothing: true,
  allowPartialExclusions: false,
  maxExcludedFacilities: 0,
  discountRate: 0.08,
  projectionYears: 20,
  includeRenewals: true,
  noiGrowthRate: 0.02,
};

export function calculateMasterLease(input: MasterLeaseInput): MasterLeaseResult {
  const { facilities, partner, options: inputOptions } = input;
  const options = { ...DEFAULT_OPTIONS, ...inputOptions };
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Analyze each facility
  const facilityAnalysis = facilities.map(facility =>
    analyzeFacility(facility, partner, options)
  );

  // Determine inclusions/exclusions
  const { included, excluded } = determineInclusions(
    facilityAnalysis,
    options,
    partner
  );

  if (excluded.length > 0) {
    warnings.push(`${excluded.length} facilities excluded from master lease`);
    excluded.forEach(f => {
      warnings.push(`  - ${f.facility.name}: ${f.notes.join(', ')}`);
    });
  }

  // Calculate portfolio summary
  const summary = calculatePortfolioSummary(included, partner, options);

  // Generate lease projections
  const leaseProjection = calculateLeaseProjection(summary, partner, options);

  // Sensitivity analysis
  const sensitivity = calculateSensitivity(summary, partner, options);

  // Generate decision recommendation
  const decision = generateDecision(
    summary,
    facilityAnalysis,
    leaseProjection,
    sensitivity,
    partner
  );

  // Generate recommendations
  if (summary.portfolioCoverageRatio < partner.economics.targetCoverageRatio) {
    recommendations.push(
      `Consider negotiating purchase price down to achieve ${(partner.economics.targetCoverageRatio * 100).toFixed(0)}% coverage`
    );
    const targetRent = summary.totalEbitdar / partner.economics.targetCoverageRatio;
    const targetPrice = targetRent / partner.economics.targetYield;
    recommendations.push(
      `Target purchase price: $${(targetPrice / 1000000).toFixed(1)}M (vs. $${(summary.totalPurchasePrice / 1000000).toFixed(1)}M)`
    );
  }

  if (summary.avgCmsRating < 3) {
    recommendations.push('Consider operational improvement plan for low-rated facilities');
  }

  if (excluded.length > 0 && options.isAllOrNothing) {
    recommendations.push('Portfolio includes substandard facilities - negotiate carve-outs or price adjustments');
  }

  return {
    summary,
    facilityAnalysis,
    leaseProjection,
    sensitivity,
    decision,
    warnings,
    recommendations,
  };
}

// =============================================================================
// FACILITY ANALYSIS
// =============================================================================

function analyzeFacility(
  facility: PortfolioFacility,
  partner: PartnerProfile,
  options: MasterLeaseOptions
): FacilityAnalysis {
  const notes: string[] = [];

  // Calculate base economics
  const economics = calculateDealEconomics(
    partner,
    facility.ttmNoi,
    facility.ttmEbitdar,
    {
      customCapRate: options.customCapRate,
      customYield: options.customYield,
      discountRate: options.discountRate,
    }
  );

  // Check underwriting criteria
  const underwritingResult = checkUnderwritingCriteria(partner, {
    cmsRating: facility.cmsRating,
    occupancyRate: facility.occupancyRate,
    ebitdarMargin: facility.ttmEbitdar / facility.ttmRevenue,
    agencyLaborPercent: facility.agencyLaborPercent,
    surveyDeficiencies: facility.surveyDeficiencies,
    isSff: facility.isSff,
    hasImmediateJeopardy: facility.hasImmediateJeopardy,
    beds: facility.beds,
    yearBuilt: facility.yearBuilt,
    state: facility.state,
  });

  // Calculate risk-adjusted cap rate
  const riskPremium = facility.riskProfile?.suggestedCapRatePremium || 0;
  let riskAdjustedCapRate = partner.economics.targetCapRate + riskPremium;

  // Additional adjustments based on specific factors
  if (facility.cmsRating && facility.cmsRating < 3) {
    riskAdjustedCapRate += 0.0075;  // 75 bps for below-average rating
    notes.push(`CMS rating ${facility.cmsRating} adds 75 bps to cap rate`);
  }

  if (facility.occupancyRate < 0.80) {
    riskAdjustedCapRate += 0.0050;  // 50 bps for low occupancy
    notes.push(`Low occupancy (${(facility.occupancyRate * 100).toFixed(1)}%) adds 50 bps to cap rate`);
  }

  if (facility.hasImmediateJeopardy) {
    riskAdjustedCapRate += 0.0150;  // 150 bps for IJ
    notes.push('Immediate jeopardy history adds 150 bps to cap rate');
  }

  const riskAdjustedPurchasePrice = facility.ttmNoi / riskAdjustedCapRate;

  // Determine recommendation
  let recommendation: 'include' | 'exclude' | 'negotiate' = 'include';

  if (!underwritingResult.passes) {
    if (underwritingResult.issues.some(i => i.severity === 'blocker')) {
      recommendation = 'exclude';
      notes.push('Does not meet partner underwriting criteria');
    } else {
      recommendation = 'negotiate';
      notes.push('Meets minimum criteria with conditions');
    }
  }

  if (economics.coverageRatio < partner.economics.minCoverageRatio) {
    recommendation = 'negotiate';
    notes.push(`Coverage ratio ${economics.coverageRatio.toFixed(2)}x below minimum`);
  }

  return {
    facility,
    economics,
    underwritingCheck: {
      passes: underwritingResult.passes,
      score: underwritingResult.score,
      issues: underwritingResult.issues.map(i => `${i.field}: ${i.requirement} (actual: ${i.actual})`),
      warnings: underwritingResult.warnings.map(w => `${w.field}: ${w.requirement} (actual: ${w.actual})`),
    },
    riskAdjustedCapRate,
    riskAdjustedPurchasePrice,
    recommendation,
    notes,
  };
}

// =============================================================================
// PORTFOLIO CALCULATIONS
// =============================================================================

function determineInclusions(
  analyses: FacilityAnalysis[],
  options: MasterLeaseOptions,
  partner: PartnerProfile
): { included: FacilityAnalysis[]; excluded: FacilityAnalysis[] } {
  if (options.isAllOrNothing && !options.allowPartialExclusions) {
    return { included: analyses, excluded: [] };
  }

  const excluded: FacilityAnalysis[] = [];
  const included: FacilityAnalysis[] = [];

  for (const analysis of analyses) {
    if (analysis.recommendation === 'exclude' && excluded.length < options.maxExcludedFacilities) {
      excluded.push(analysis);
    } else {
      included.push(analysis);
    }
  }

  return { included, excluded };
}

function calculatePortfolioSummary(
  analyses: FacilityAnalysis[],
  partner: PartnerProfile,
  options: MasterLeaseOptions
): PortfolioSummary {
  const includedFacilities = analyses.length;
  const totalBeds = analyses.reduce((sum, a) => sum + a.facility.beds, 0);
  const totalRevenue = analyses.reduce((sum, a) => sum + a.facility.ttmRevenue, 0);
  const totalEbitdar = analyses.reduce((sum, a) => sum + a.facility.ttmEbitdar, 0);
  const totalNoi = analyses.reduce((sum, a) => sum + a.facility.ttmNoi, 0);

  // Calculate totals from individual facility economics
  const totalPurchasePrice = analyses.reduce((sum, a) => sum + a.economics.purchasePrice, 0);
  const totalAnnualRent = analyses.reduce((sum, a) => sum + a.economics.annualRent, 0);
  const totalMonthlyRent = totalAnnualRent / 12;

  // Weighted metrics
  const weightedCapRate = totalNoi / totalPurchasePrice;
  const weightedYield = totalAnnualRent / totalPurchasePrice;
  const portfolioCoverageRatio = totalEbitdar / totalAnnualRent;

  const coverageStatus: 'healthy' | 'warning' | 'critical' =
    portfolioCoverageRatio >= partner.economics.targetCoverageRatio ? 'healthy' :
    portfolioCoverageRatio >= partner.economics.warningCoverageRatio ? 'warning' : 'critical';

  // Per-unit metrics
  const avgPricePerBed = totalPurchasePrice / totalBeds;
  const avgRentPerBed = totalAnnualRent / totalBeds;
  const avgNoiPerBed = totalNoi / totalBeds;
  const avgEbitdarMargin = totalEbitdar / totalRevenue;

  // Risk-adjusted metrics
  const avgRiskAdjustedCapRate = analyses.reduce((sum, a) =>
    sum + (a.riskAdjustedCapRate * a.facility.ttmNoi), 0) / totalNoi;
  const riskAdjustedPurchasePrice = totalNoi / avgRiskAdjustedCapRate;

  // Quality metrics
  const facilitiesWithRating = analyses.filter(a => a.facility.cmsRating !== undefined);
  const avgCmsRating = facilitiesWithRating.length > 0
    ? facilitiesWithRating.reduce((sum, a) => sum + (a.facility.cmsRating || 0), 0) / facilitiesWithRating.length
    : 0;

  const avgOccupancy = analyses.reduce((sum, a) =>
    sum + (a.facility.occupancyRate * a.facility.beds), 0) / totalBeds;

  const avgUnderwritingScore = analyses.reduce((sum, a) =>
    sum + a.underwritingCheck.score, 0) / analyses.length;

  return {
    totalFacilities: analyses.length,
    includedFacilities,
    excludedFacilities: 0,
    totalBeds,
    includedBeds: totalBeds,
    totalRevenue,
    totalEbitdar,
    totalNoi,
    totalPurchasePrice,
    totalAnnualRent,
    totalMonthlyRent,
    weightedCapRate,
    weightedYield,
    portfolioCoverageRatio,
    coverageStatus,
    avgPricePerBed,
    avgRentPerBed,
    avgNoiPerBed,
    avgEbitdarMargin,
    riskAdjustedCapRate: avgRiskAdjustedCapRate,
    riskAdjustedPurchasePrice,
    avgCmsRating,
    avgOccupancy,
    portfolioHealthScore: avgUnderwritingScore,
  };
}

// =============================================================================
// LEASE PROJECTIONS
// =============================================================================

function calculateLeaseProjection(
  summary: PortfolioSummary,
  partner: PartnerProfile,
  options: MasterLeaseOptions
): LeaseProjection {
  const { leaseTerms } = partner;
  const initialTermYears = leaseTerms.initialTermYears;
  const renewalOptions = options.includeRenewals ? leaseTerms.renewalOptions : 0;
  const renewalTermYears = leaseTerms.renewalTermYears;
  const totalPotentialYears = initialTermYears + (renewalOptions * renewalTermYears);

  const escalationRate = options.customEscalation ||
    (leaseTerms.escalationType === 'cpi' ? (leaseTerms.cpiFloor || 0.02) : leaseTerms.fixedEscalation);

  const yearlyProjections: YearProjection[] = [];
  let cumulativeRent = 0;
  let leaseNpv = 0;
  let currentEbitdar = summary.totalEbitdar;

  for (let year = 1; year <= totalPotentialYears; year++) {
    // Determine phase
    let phase: YearProjection['phase'] = 'initial';
    if (year > initialTermYears) {
      const renewalYear = year - initialTermYears;
      const renewalPeriod = Math.ceil(renewalYear / renewalTermYears);
      phase = `renewal_${renewalPeriod}` as YearProjection['phase'];
    }

    // Calculate rent with escalation
    const annualRent = summary.totalAnnualRent * Math.pow(1 + escalationRate, year - 1);
    cumulativeRent += annualRent;

    // Discount factor
    const discountFactor = 1 / Math.pow(1 + options.discountRate, year);
    const presentValue = annualRent * discountFactor;
    leaseNpv += presentValue;

    // Project EBITDAR growth
    currentEbitdar *= (1 + options.noiGrowthRate);
    const projectedCoverage = currentEbitdar / annualRent;

    yearlyProjections.push({
      year,
      phase,
      annualRent,
      cumulativeRent,
      discountFactor,
      presentValue,
      projectedEbitdar: currentEbitdar,
      projectedCoverage,
    });
  }

  // Calculate renewal option value (simplified)
  const renewalOptionValue = options.includeRenewals
    ? yearlyProjections
        .filter(y => y.phase !== 'initial')
        .reduce((sum, y) => sum + y.presentValue, 0)
    : 0;

  return {
    initialTermYears,
    renewalOptions,
    renewalTermYears,
    totalPotentialYears,
    yearlyProjections,
    leaseNpv,
    totalLeaseObligation: cumulativeRent,
    avgAnnualRent: cumulativeRent / totalPotentialYears,
    renewalOptionValue,
  };
}

// =============================================================================
// SENSITIVITY ANALYSIS
// =============================================================================

function calculateSensitivity(
  summary: PortfolioSummary,
  partner: PartnerProfile,
  options: MasterLeaseOptions
): SensitivityAnalysis {
  // Cap rate sensitivity
  const capRates = [0.065, 0.07, 0.075, 0.08, 0.085, 0.09, 0.095, 0.10];
  const capRateSensitivity = capRates.map(capRate => {
    const purchasePrice = summary.totalNoi / capRate;
    const annualRent = purchasePrice * partner.economics.targetYield;
    const coverage = summary.totalEbitdar / annualRent;
    return { capRate, purchasePrice, annualRent, coverage };
  });

  // NOI sensitivity
  const noiChanges = [-0.20, -0.15, -0.10, -0.05, 0, 0.05, 0.10, 0.15, 0.20];
  const noiSensitivity = noiChanges.map(noiChange => {
    const adjustedNoi = summary.totalNoi * (1 + noiChange);
    const purchasePrice = adjustedNoi / summary.weightedCapRate;
    const coverage = (summary.totalEbitdar * (1 + noiChange)) / summary.totalAnnualRent;
    return { noiChange, purchasePrice, coverage };
  });

  // Occupancy sensitivity
  const occupancies = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95];
  const occupancySensitivity = occupancies.map(occupancy => {
    const occupancyFactor = occupancy / summary.avgOccupancy;
    const projectedNoi = summary.totalNoi * occupancyFactor;
    const coverage = (summary.totalEbitdar * occupancyFactor) / summary.totalAnnualRent;
    return { occupancy, projectedNoi, coverage };
  });

  // Escalation sensitivity
  const escalations = [0.015, 0.02, 0.025, 0.03, 0.035];
  const escalationSensitivity = escalations.map(escalation => {
    const year5Rent = summary.totalAnnualRent * Math.pow(1 + escalation, 4);
    const year10Rent = summary.totalAnnualRent * Math.pow(1 + escalation, 9);
    let totalObligation = 0;
    for (let y = 0; y < 20; y++) {
      totalObligation += summary.totalAnnualRent * Math.pow(1 + escalation, y);
    }
    return { escalation, year5Rent, year10Rent, totalLeaseObligation: totalObligation };
  });

  // Break-even analysis
  const breakEvenOccupancy = summary.avgOccupancy * (partner.economics.minCoverageRatio / summary.portfolioCoverageRatio);
  const breakEvenNoiDecline = 1 - (partner.economics.minCoverageRatio / summary.portfolioCoverageRatio);
  const cushionToBreakeven = summary.portfolioCoverageRatio / partner.economics.minCoverageRatio - 1;

  return {
    capRateSensitivity,
    noiSensitivity,
    occupancySensitivity,
    escalationSensitivity,
    breakEvenOccupancy,
    breakEvenNoiDecline,
    cushionToBreakeven,
  };
}

// =============================================================================
// DECISION ENGINE
// =============================================================================

function generateDecision(
  summary: PortfolioSummary,
  analyses: FacilityAnalysis[],
  projection: LeaseProjection,
  sensitivity: SensitivityAnalysis,
  partner: PartnerProfile
): DealDecision {
  const positiveFactors: DecisionFactor[] = [];
  const negativeFactors: DecisionFactor[] = [];
  const riskMitigations: string[] = [];

  // Analyze positive factors
  if (summary.portfolioCoverageRatio >= partner.economics.targetCoverageRatio) {
    positiveFactors.push({
      factor: 'Strong Coverage',
      impact: 'positive',
      weight: 9,
      description: `Portfolio coverage of ${summary.portfolioCoverageRatio.toFixed(2)}x exceeds target of ${partner.economics.targetCoverageRatio.toFixed(2)}x`,
    });
  }

  if (summary.avgCmsRating >= 3.5) {
    positiveFactors.push({
      factor: 'Quality Portfolio',
      impact: 'positive',
      weight: 7,
      description: `Average CMS rating of ${summary.avgCmsRating.toFixed(1)} stars indicates quality operations`,
    });
  }

  if (summary.avgOccupancy >= 0.85) {
    positiveFactors.push({
      factor: 'Strong Occupancy',
      impact: 'positive',
      weight: 6,
      description: `Portfolio occupancy of ${(summary.avgOccupancy * 100).toFixed(1)}% demonstrates market demand`,
    });
  }

  if (summary.totalFacilities >= partner.underwriting.minFacilitiesInPortfolio) {
    positiveFactors.push({
      factor: 'Portfolio Scale',
      impact: 'positive',
      weight: 5,
      description: `${summary.totalFacilities} facilities provide operational diversification`,
    });
  }

  // Analyze negative factors
  if (summary.portfolioCoverageRatio < partner.economics.minCoverageRatio) {
    negativeFactors.push({
      factor: 'Insufficient Coverage',
      impact: 'negative',
      weight: 10,
      description: `Portfolio coverage of ${summary.portfolioCoverageRatio.toFixed(2)}x below minimum of ${partner.economics.minCoverageRatio.toFixed(2)}x`,
    });
    riskMitigations.push('Negotiate lower purchase price to improve coverage');
    riskMitigations.push('Request operational improvement plan from seller');
  }

  if (summary.avgCmsRating < 3) {
    negativeFactors.push({
      factor: 'Quality Concerns',
      impact: 'negative',
      weight: 8,
      description: `Average CMS rating of ${summary.avgCmsRating.toFixed(1)} stars below industry average`,
    });
    riskMitigations.push('Require quality improvement covenants');
    riskMitigations.push('Consider enhanced monitoring provisions');
  }

  const excludedCount = analyses.filter(a => a.recommendation === 'exclude').length;
  if (excludedCount > 0) {
    negativeFactors.push({
      factor: 'Substandard Facilities',
      impact: 'negative',
      weight: 7,
      description: `${excludedCount} facilities do not meet underwriting criteria`,
    });
    riskMitigations.push('Negotiate carve-outs for underperforming facilities');
    riskMitigations.push('Request price adjustment for portfolio quality');
  }

  if (sensitivity.cushionToBreakeven < 0.10) {
    negativeFactors.push({
      factor: 'Thin Cushion',
      impact: 'negative',
      weight: 8,
      description: `Only ${(sensitivity.cushionToBreakeven * 100).toFixed(1)}% cushion to break-even coverage`,
    });
    riskMitigations.push('Structure with performance guarantees');
    riskMitigations.push('Consider rent deferral provisions');
  }

  // Calculate decision
  const positiveScore = positiveFactors.reduce((sum, f) => sum + f.weight, 0);
  const negativeScore = negativeFactors.reduce((sum, f) => sum + f.weight, 0);
  const netScore = positiveScore - negativeScore;

  let recommendation: 'proceed' | 'negotiate' | 'pass';
  let confidence: 'high' | 'medium' | 'low';

  if (netScore >= 15) {
    recommendation = 'proceed';
    confidence = 'high';
  } else if (netScore >= 5) {
    recommendation = 'proceed';
    confidence = 'medium';
  } else if (netScore >= -5) {
    recommendation = 'negotiate';
    confidence = 'medium';
  } else if (netScore >= -15) {
    recommendation = 'negotiate';
    confidence = 'low';
  } else {
    recommendation = 'pass';
    confidence = negativeScore > 25 ? 'high' : 'medium';
  }

  // Price guidance
  const targetCoverageRent = summary.totalEbitdar / partner.economics.targetCoverageRatio;
  const minCoverageRent = summary.totalEbitdar / partner.economics.minCoverageRatio;

  const suggestedRent = {
    low: minCoverageRent,
    mid: (targetCoverageRent + minCoverageRent) / 2,
    high: targetCoverageRent,
  };

  const suggestedPurchasePrice = {
    low: suggestedRent.low / partner.economics.targetYield,
    mid: suggestedRent.mid / partner.economics.targetYield,
    high: suggestedRent.high / partner.economics.targetYield,
  };

  // Buy vs Lease comparison
  const buyVsLeaseAnalysis = calculateBuyVsLease(summary, projection, partner);

  return {
    recommendation,
    confidence,
    positiveFactors,
    negativeFactors,
    riskMitigations,
    suggestedPurchasePrice,
    suggestedRent,
    buyVsLeaseAnalysis,
  };
}

function calculateBuyVsLease(
  summary: PortfolioSummary,
  projection: LeaseProjection,
  partner: PartnerProfile
): BuyVsLeaseComparison {
  // Purchase scenario (assuming 70% LTV financing)
  const ltv = 0.70;
  const interestRate = 0.065;  // Assumed debt cost
  const equityRequired = summary.totalPurchasePrice * (1 - ltv);
  const debtAmount = summary.totalPurchasePrice * ltv;
  const annualDebtService = debtAmount * (interestRate + 0.02);  // Interest + principal
  const netCashFlow = summary.totalNoi - annualDebtService;
  const yearOneReturn = netCashFlow / equityRequired;

  // Simplified 5-year IRR calculation
  const exitCapRate = partner.economics.targetCapRate + 0.005;  // 50 bps expansion
  const year5Noi = summary.totalNoi * Math.pow(1.02, 5);
  const exitValue = year5Noi / exitCapRate;
  const totalReturn = (netCashFlow * 5) + exitValue - summary.totalPurchasePrice;
  const fiveYearIrr = Math.pow(1 + totalReturn / equityRequired, 0.2) - 1;

  // Lease scenario
  const year5Rent = projection.yearlyProjections.find(y => y.year === 5)?.annualRent || 0;
  const year10Rent = projection.yearlyProjections.find(y => y.year === 10)?.annualRent || 0;

  // Determine recommendation
  let recommendation: 'purchase' | 'lease' | 'either';
  let rationale: string;

  if (yearOneReturn > 0.12 && fiveYearIrr > 0.15) {
    recommendation = 'purchase';
    rationale = `Strong purchase returns (${(yearOneReturn * 100).toFixed(1)}% year 1, ${(fiveYearIrr * 100).toFixed(1)}% 5-yr IRR) favor acquisition`;
  } else if (summary.portfolioCoverageRatio < partner.economics.minCoverageRatio) {
    recommendation = 'lease';
    rationale = 'Coverage concerns make sale-leaseback structure more appropriate';
  } else {
    recommendation = 'either';
    rationale = 'Both structures viable; decision depends on capital availability and strategic goals';
  }

  return {
    purchase: {
      totalCost: summary.totalPurchasePrice,
      equityRequired,
      debtService: annualDebtService,
      netCashFlow,
      yearOneReturn,
      fiveYearIrr,
    },
    lease: {
      yearOneRent: summary.totalAnnualRent,
      fiveYearRent: year5Rent,
      tenYearRent: year10Rent,
      effectiveCost: projection.leaseNpv,
    },
    recommendation,
    rationale,
  };
}

// Module exports all types and the main calculateMasterLease function above
