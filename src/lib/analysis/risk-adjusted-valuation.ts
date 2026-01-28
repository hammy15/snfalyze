/**
 * Risk-Adjusted Valuation Engine
 *
 * Calculates risk-adjusted cap rates and valuations based on:
 * - CMS quality data (ratings, surveys, staffing)
 * - Operational metrics (occupancy, agency usage, payer mix)
 * - Compliance status (deficiencies, SFF, immediate jeopardy)
 * - Capital needs (CapEx requirements)
 * - Market conditions (Medicaid rates, competition)
 */

import type { FacilityRiskProfile, ExtractedSurveyData, ExtractedStaffingData } from '../extraction/enhanced-types';
import type { PartnerProfile } from '../partners/partner-profiles';

// =============================================================================
// TYPES
// =============================================================================

export interface RiskAdjustedValuationInput {
  // Basic facility info
  facilityId: string;
  facilityName: string;
  beds: number;
  yearBuilt: number;
  state: string;
  locationType: 'urban' | 'suburban' | 'rural';

  // Financial data
  ttmNoi: number;
  ttmEbitdar: number;
  ttmRevenue: number;

  // CMS data
  cmsRating?: number;
  healthRating?: number;
  staffingRating?: number;
  qualityRating?: number;

  // Operational metrics
  occupancyRate: number;
  medicarePercent?: number;
  medicaidPercent?: number;
  privatePayPercent?: number;
  managedCarePercent?: number;

  // Staffing data
  staffing?: {
    totalHppd: number;
    rnHppd: number;
    agencyPercent: number;
  };

  // Survey/compliance
  survey?: {
    totalDeficiencies: number;
    hasImmediateJeopardy: boolean;
    isSff: boolean;
    lastSurveyDate: string;
  };

  // Capital needs
  capex?: {
    immediateNeeds: number;
    totalNeeds: number;
  };

  // Market data
  market?: {
    medicaidRate: number;
    competitorOccupancy: number;
    supplyGrowthRate: number;
  };

  // Partner for underwriting context
  partner?: PartnerProfile;
}

export interface RiskAdjustedValuationOutput {
  // Base valuation
  baseCapRate: number;
  baseValue: number;

  // Risk adjustments
  riskAdjustments: CapRateAdjustment[];
  totalRiskPremium: number;

  // Final risk-adjusted values
  riskAdjustedCapRate: number;
  riskAdjustedValue: number;
  valueImpact: number;  // Difference from base value

  // Implied metrics
  riskAdjustedPricePerBed: number;
  riskAdjustedNOIYield: number;

  // Confidence and quality
  confidence: 'high' | 'medium' | 'low';
  dataQualityScore: number;

  // Risk summary
  riskProfile: {
    overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    keyRisks: string[];
    mitigatingFactors: string[];
  };
}

export interface CapRateAdjustment {
  category: 'quality' | 'operations' | 'compliance' | 'capital' | 'market' | 'other';
  factor: string;
  description: string;
  basisPoints: number;  // Positive = higher cap rate (lower value)
  confidence: 'high' | 'medium' | 'low';
}

// =============================================================================
// BASE CAP RATES BY ASSET TYPE AND MARKET
// =============================================================================

const BASE_CAP_RATES = {
  SNF: {
    default: 0.085,       // 8.5% base
    premium: 0.075,       // Top-tier facilities
    distressed: 0.11,     // Troubled facilities
  },
  ALF: {
    default: 0.065,
    premium: 0.055,
    distressed: 0.085,
  },
  ILF: {
    default: 0.055,
    premium: 0.045,
    distressed: 0.075,
  },
};

// =============================================================================
// RISK ADJUSTMENT MATRICES
// =============================================================================

// CMS Overall Rating adjustments (1-5 stars)
const CMS_RATING_ADJUSTMENTS: Record<number, number> = {
  5: -75,    // 75 bps discount for 5-star
  4: -35,    // 35 bps discount
  3: 0,      // Baseline
  2: 50,     // 50 bps premium
  1: 100,    // 100 bps premium for 1-star
};

// Survey deficiency count adjustments
const DEFICIENCY_ADJUSTMENTS = [
  { maxDeficiencies: 3, bps: -25 },    // Excellent
  { maxDeficiencies: 6, bps: 0 },      // Good
  { maxDeficiencies: 10, bps: 25 },    // Average
  { maxDeficiencies: 15, bps: 50 },    // Below average
  { maxDeficiencies: 25, bps: 100 },   // Poor
  { maxDeficiencies: Infinity, bps: 150 }, // Critical
];

// Occupancy rate adjustments
const OCCUPANCY_ADJUSTMENTS = [
  { minOccupancy: 0.95, bps: -50 },    // Exceptional
  { minOccupancy: 0.90, bps: -25 },    // Strong
  { minOccupancy: 0.85, bps: 0 },      // Good
  { minOccupancy: 0.80, bps: 25 },     // Average
  { minOccupancy: 0.75, bps: 50 },     // Below average
  { minOccupancy: 0.70, bps: 100 },    // Weak
  { minOccupancy: 0, bps: 150 },       // Critical
];

// Agency labor adjustments
const AGENCY_LABOR_ADJUSTMENTS = [
  { maxPercent: 0.05, bps: -25 },      // Minimal agency
  { maxPercent: 0.10, bps: 0 },        // Normal
  { maxPercent: 0.15, bps: 25 },       // Elevated
  { maxPercent: 0.20, bps: 50 },       // High
  { maxPercent: 0.30, bps: 100 },      // Very high
  { maxPercent: Infinity, bps: 150 },  // Critical
];

// Building age adjustments
const BUILDING_AGE_ADJUSTMENTS = [
  { maxAge: 10, bps: -35 },            // New
  { maxAge: 20, bps: -15 },            // Modern
  { maxAge: 30, bps: 0 },              // Average
  { maxAge: 40, bps: 25 },             // Older
  { maxAge: 50, bps: 50 },             // Aging
  { maxAge: Infinity, bps: 75 },       // Very old
];

// Payer mix adjustments (based on Medicare %)
const MEDICARE_MIX_ADJUSTMENTS = [
  { minPercent: 0.35, bps: -50 },      // High Medicare
  { minPercent: 0.25, bps: -25 },      // Good Medicare
  { minPercent: 0.15, bps: 0 },        // Average
  { minPercent: 0.10, bps: 25 },       // Low Medicare
  { minPercent: 0, bps: 50 },          // Minimal Medicare
];

// State-level adjustments (regulatory environment)
const STATE_ADJUSTMENTS: Record<string, number> = {
  // More challenging regulatory environments
  NY: 50,
  NJ: 40,
  CA: 35,
  CT: 30,
  MA: 25,
  PA: 15,
  IL: 10,

  // Operator-friendly environments
  TX: -15,
  FL: -10,
  GA: -10,
  AZ: -10,
  TN: -5,
  NC: -5,

  // Default for unlisted states
  DEFAULT: 0,
};

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

export function calculateRiskAdjustedValuation(
  input: RiskAdjustedValuationInput
): RiskAdjustedValuationOutput {
  const adjustments: CapRateAdjustment[] = [];
  let dataPoints = 0;
  let totalDataPoints = 12;  // Maximum possible data inputs

  // Determine base cap rate
  const baseCapRate = BASE_CAP_RATES.SNF.default;
  const baseValue = input.ttmNoi / baseCapRate;

  // ==========================================================================
  // CMS Quality Adjustments
  // ==========================================================================

  // Overall CMS rating
  if (input.cmsRating !== undefined) {
    const ratingBps = CMS_RATING_ADJUSTMENTS[input.cmsRating] || 0;
    if (ratingBps !== 0) {
      adjustments.push({
        category: 'quality',
        factor: 'CMS Overall Rating',
        description: `${input.cmsRating}-star CMS rating`,
        basisPoints: ratingBps,
        confidence: 'high',
      });
    }
    dataPoints++;
  }

  // Staffing rating component
  if (input.staffingRating !== undefined) {
    const staffingBps = Math.round((3 - input.staffingRating) * 20);
    if (staffingBps !== 0) {
      adjustments.push({
        category: 'quality',
        factor: 'CMS Staffing Rating',
        description: `${input.staffingRating}-star staffing rating`,
        basisPoints: staffingBps,
        confidence: 'high',
      });
    }
    dataPoints++;
  }

  // Quality measure rating
  if (input.qualityRating !== undefined) {
    const qualityBps = Math.round((3 - input.qualityRating) * 15);
    if (qualityBps !== 0) {
      adjustments.push({
        category: 'quality',
        factor: 'CMS Quality Rating',
        description: `${input.qualityRating}-star quality measures`,
        basisPoints: qualityBps,
        confidence: 'high',
      });
    }
    dataPoints++;
  }

  // ==========================================================================
  // Operational Adjustments
  // ==========================================================================

  // Occupancy
  const occupancyAdj = OCCUPANCY_ADJUSTMENTS.find(a => input.occupancyRate >= a.minOccupancy);
  if (occupancyAdj && occupancyAdj.bps !== 0) {
    adjustments.push({
      category: 'operations',
      factor: 'Occupancy Rate',
      description: `${(input.occupancyRate * 100).toFixed(1)}% occupancy`,
      basisPoints: occupancyAdj.bps,
      confidence: 'high',
    });
  }
  dataPoints++;

  // Agency labor
  if (input.staffing?.agencyPercent !== undefined) {
    const agencyAdj = AGENCY_LABOR_ADJUSTMENTS.find(a => input.staffing!.agencyPercent <= a.maxPercent);
    if (agencyAdj && agencyAdj.bps !== 0) {
      adjustments.push({
        category: 'operations',
        factor: 'Agency Labor',
        description: `${(input.staffing.agencyPercent * 100).toFixed(1)}% agency staffing`,
        basisPoints: agencyAdj.bps,
        confidence: 'high',
      });
    }
    dataPoints++;
  }

  // HPPD compliance
  if (input.staffing?.totalHppd !== undefined) {
    const minHppd = 3.5;  // Simplified - should be state-specific
    if (input.staffing.totalHppd < minHppd) {
      adjustments.push({
        category: 'operations',
        factor: 'Staffing HPPD',
        description: `${input.staffing.totalHppd.toFixed(2)} HPPD below ${minHppd} minimum`,
        basisPoints: 50,
        confidence: 'medium',
      });
    } else if (input.staffing.totalHppd >= minHppd + 1) {
      adjustments.push({
        category: 'operations',
        factor: 'Staffing HPPD',
        description: `Strong staffing at ${input.staffing.totalHppd.toFixed(2)} HPPD`,
        basisPoints: -25,
        confidence: 'medium',
      });
    }
    dataPoints++;
  }

  // Medicare mix
  if (input.medicarePercent !== undefined) {
    const medicareAdj = MEDICARE_MIX_ADJUSTMENTS.find(a => input.medicarePercent! >= a.minPercent);
    if (medicareAdj && medicareAdj.bps !== 0) {
      adjustments.push({
        category: 'operations',
        factor: 'Medicare Mix',
        description: `${(input.medicarePercent * 100).toFixed(1)}% Medicare payer mix`,
        basisPoints: medicareAdj.bps,
        confidence: 'high',
      });
    }
    dataPoints++;
  }

  // ==========================================================================
  // Compliance Adjustments
  // ==========================================================================

  if (input.survey) {
    // Immediate jeopardy - severe penalty
    if (input.survey.hasImmediateJeopardy) {
      adjustments.push({
        category: 'compliance',
        factor: 'Immediate Jeopardy',
        description: 'History of immediate jeopardy citation',
        basisPoints: 150,
        confidence: 'high',
      });
    }

    // SFF status - significant concern
    if (input.survey.isSff) {
      adjustments.push({
        category: 'compliance',
        factor: 'Special Focus Facility',
        description: 'Designated as Special Focus Facility',
        basisPoints: 200,
        confidence: 'high',
      });
    }

    // Total deficiencies
    const defAdj = DEFICIENCY_ADJUSTMENTS.find(a => input.survey!.totalDeficiencies <= a.maxDeficiencies);
    if (defAdj && defAdj.bps !== 0) {
      adjustments.push({
        category: 'compliance',
        factor: 'Survey Deficiencies',
        description: `${input.survey.totalDeficiencies} total deficiencies`,
        basisPoints: defAdj.bps,
        confidence: 'high',
      });
    }
    dataPoints++;
  }

  // ==========================================================================
  // Capital/Physical Adjustments
  // ==========================================================================

  // Building age
  const buildingAge = new Date().getFullYear() - input.yearBuilt;
  const ageAdj = BUILDING_AGE_ADJUSTMENTS.find(a => buildingAge <= a.maxAge);
  if (ageAdj && ageAdj.bps !== 0) {
    adjustments.push({
      category: 'capital',
      factor: 'Building Age',
      description: `${buildingAge} year old building`,
      basisPoints: ageAdj.bps,
      confidence: 'high',
    });
  }
  dataPoints++;

  // Immediate CapEx needs
  if (input.capex?.immediateNeeds) {
    const capexPerBed = input.capex.immediateNeeds / input.beds;
    let capexBps = 0;

    if (capexPerBed > 20000) capexBps = 100;
    else if (capexPerBed > 15000) capexBps = 75;
    else if (capexPerBed > 10000) capexBps = 50;
    else if (capexPerBed > 5000) capexBps = 25;

    if (capexBps > 0) {
      adjustments.push({
        category: 'capital',
        factor: 'CapEx Requirements',
        description: `$${capexPerBed.toLocaleString()} per bed in immediate CapEx`,
        basisPoints: capexBps,
        confidence: 'medium',
      });
    }
    dataPoints++;
  }

  // ==========================================================================
  // Market/Location Adjustments
  // ==========================================================================

  // State regulatory environment
  const stateBps = STATE_ADJUSTMENTS[input.state] ?? STATE_ADJUSTMENTS.DEFAULT;
  if (stateBps !== 0) {
    adjustments.push({
      category: 'market',
      factor: 'State Environment',
      description: `${input.state} regulatory/reimbursement environment`,
      basisPoints: stateBps,
      confidence: 'high',
    });
  }
  dataPoints++;

  // Location type
  const locationBps = input.locationType === 'urban' ? -15 :
                      input.locationType === 'rural' ? 25 : 0;
  if (locationBps !== 0) {
    adjustments.push({
      category: 'market',
      factor: 'Location Type',
      description: `${input.locationType} market location`,
      basisPoints: locationBps,
      confidence: 'medium',
    });
  }

  // Market supply/demand
  if (input.market?.supplyGrowthRate !== undefined) {
    if (input.market.supplyGrowthRate > 0.03) {
      adjustments.push({
        category: 'market',
        factor: 'Supply Growth',
        description: `High supply growth (${(input.market.supplyGrowthRate * 100).toFixed(1)}%)`,
        basisPoints: 35,
        confidence: 'medium',
      });
    } else if (input.market.supplyGrowthRate < 0.01 && input.market.competitorOccupancy > 0.85) {
      adjustments.push({
        category: 'market',
        factor: 'Supply Constrained',
        description: 'Limited supply with strong competitor occupancy',
        basisPoints: -25,
        confidence: 'medium',
      });
    }
    dataPoints++;
  }

  // ==========================================================================
  // Calculate Final Risk-Adjusted Values
  // ==========================================================================

  const totalRiskPremium = adjustments.reduce((sum, a) => sum + a.basisPoints, 0) / 10000;
  const riskAdjustedCapRate = baseCapRate + totalRiskPremium;
  const riskAdjustedValue = input.ttmNoi / riskAdjustedCapRate;
  const valueImpact = riskAdjustedValue - baseValue;

  // Calculate implied metrics
  const riskAdjustedPricePerBed = riskAdjustedValue / input.beds;
  const riskAdjustedNOIYield = input.ttmNoi / riskAdjustedValue;

  // Data quality and confidence
  const dataQualityScore = Math.round((dataPoints / totalDataPoints) * 100);
  const confidence: 'high' | 'medium' | 'low' =
    dataQualityScore >= 80 ? 'high' :
    dataQualityScore >= 50 ? 'medium' : 'low';

  // Risk summary
  const keyRisks: string[] = [];
  const mitigatingFactors: string[] = [];

  adjustments
    .filter(a => a.basisPoints > 0)
    .sort((a, b) => b.basisPoints - a.basisPoints)
    .slice(0, 3)
    .forEach(a => keyRisks.push(a.description));

  adjustments
    .filter(a => a.basisPoints < 0)
    .sort((a, b) => a.basisPoints - b.basisPoints)
    .slice(0, 3)
    .forEach(a => mitigatingFactors.push(a.description));

  const overallRisk: 'low' | 'moderate' | 'high' | 'critical' =
    totalRiskPremium >= 0.03 ? 'critical' :
    totalRiskPremium >= 0.015 ? 'high' :
    totalRiskPremium >= 0.005 ? 'moderate' : 'low';

  return {
    baseCapRate,
    baseValue,
    riskAdjustments: adjustments,
    totalRiskPremium,
    riskAdjustedCapRate,
    riskAdjustedValue,
    valueImpact,
    riskAdjustedPricePerBed,
    riskAdjustedNOIYield,
    confidence,
    dataQualityScore,
    riskProfile: {
      overallRisk,
      keyRisks,
      mitigatingFactors,
    },
  };
}

// =============================================================================
// PORTFOLIO RISK-ADJUSTED VALUATION
// =============================================================================

export interface PortfolioRiskValuation {
  facilities: {
    id: string;
    name: string;
    valuation: RiskAdjustedValuationOutput;
  }[];

  // Aggregates
  totalBaseValue: number;
  totalRiskAdjustedValue: number;
  portfolioRiskPremium: number;
  weightedCapRate: number;
  weightedRiskAdjustedCapRate: number;

  // Diversification benefit
  diversificationBenefit: number;  // bps reduction for portfolio effect

  // Portfolio-level risk
  portfolioRiskProfile: {
    overallRisk: 'low' | 'moderate' | 'high' | 'critical';
    concentrationRisk: number;  // Max single facility as % of total
    geographicDiversification: number;  // Number of states
    qualityDistribution: { rating: number; count: number; percent: number }[];
  };
}

export function calculatePortfolioRiskValuation(
  facilities: RiskAdjustedValuationInput[]
): PortfolioRiskValuation {
  // Calculate individual valuations
  const facilityValuations = facilities.map(f => ({
    id: f.facilityId,
    name: f.facilityName,
    valuation: calculateRiskAdjustedValuation(f),
  }));

  // Calculate totals
  const totalNoi = facilities.reduce((sum, f) => sum + f.ttmNoi, 0);
  const totalBaseValue = facilityValuations.reduce((sum, f) => sum + f.valuation.baseValue, 0);
  const totalRiskAdjustedValue = facilityValuations.reduce((sum, f) => sum + f.valuation.riskAdjustedValue, 0);

  // Weighted cap rates
  const weightedCapRate = totalNoi / totalBaseValue;
  const weightedRiskAdjustedCapRate = totalNoi / totalRiskAdjustedValue;
  const portfolioRiskPremium = weightedRiskAdjustedCapRate - weightedCapRate;

  // Diversification benefit (simplified - based on number of facilities and geographic spread)
  const uniqueStates = new Set(facilities.map(f => f.state)).size;
  const facilityCount = facilities.length;
  const diversificationBenefit = Math.min(
    50,  // Max 50 bps benefit
    (uniqueStates - 1) * 5 + (facilityCount - 1) * 3
  );

  // Concentration risk
  const maxFacilityValue = Math.max(...facilityValuations.map(f => f.valuation.riskAdjustedValue));
  const concentrationRisk = maxFacilityValue / totalRiskAdjustedValue;

  // Quality distribution
  const ratingCounts = new Map<number, number>();
  facilities.forEach(f => {
    if (f.cmsRating !== undefined) {
      ratingCounts.set(f.cmsRating, (ratingCounts.get(f.cmsRating) || 0) + 1);
    }
  });
  const qualityDistribution = Array.from(ratingCounts.entries()).map(([rating, count]) => ({
    rating,
    count,
    percent: count / facilities.length,
  })).sort((a, b) => b.rating - a.rating);

  // Overall portfolio risk
  const avgRisk = facilityValuations.reduce((sum, f) =>
    sum + (['low', 'moderate', 'high', 'critical'].indexOf(f.valuation.riskProfile.overallRisk)), 0
  ) / facilityValuations.length;

  const overallRisk: 'low' | 'moderate' | 'high' | 'critical' =
    avgRisk >= 2.5 ? 'critical' :
    avgRisk >= 1.5 ? 'high' :
    avgRisk >= 0.5 ? 'moderate' : 'low';

  return {
    facilities: facilityValuations,
    totalBaseValue,
    totalRiskAdjustedValue,
    portfolioRiskPremium,
    weightedCapRate,
    weightedRiskAdjustedCapRate,
    diversificationBenefit,
    portfolioRiskProfile: {
      overallRisk,
      concentrationRisk,
      geographicDiversification: uniqueStates,
      qualityDistribution,
    },
  };
}
