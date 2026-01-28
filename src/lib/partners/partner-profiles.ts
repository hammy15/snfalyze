/**
 * Partner Profiles - Buyer/Lender Deal Economics
 *
 * Configurable assumptions by partner type (REIT, PE, Regional)
 * with specific yield, cap rate, coverage, and term requirements.
 */

import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

export type PartnerType = 'reit' | 'private_equity' | 'regional_operator' | 'custom';
export type RiskTolerance = 'conservative' | 'moderate' | 'aggressive';
export type LeaseStructure = 'triple_net' | 'modified_gross' | 'absolute_net';

export interface PartnerProfile {
  id: string;
  name: string;
  type: PartnerType;
  riskTolerance: RiskTolerance;

  // Deal economics
  economics: PartnerEconomics;

  // Lease terms
  leaseTerms: PartnerLeaseTerms;

  // Underwriting requirements
  underwriting: PartnerUnderwriting;

  // Asset preferences
  assetPreferences: AssetPreferences;

  // Contact info (optional)
  contact?: PartnerContact;

  createdAt: string;
  updatedAt: string;
}

export interface PartnerEconomics {
  // Cap rate range (for purchase price calculation)
  minCapRate: number;      // e.g., 0.065 (6.5%)
  targetCapRate: number;   // e.g., 0.075 (7.5%)
  maxCapRate: number;      // e.g., 0.09 (9%)

  // Yield requirements (rent as % of purchase price)
  minYield: number;        // e.g., 0.075 (7.5%)
  targetYield: number;     // e.g., 0.085 (8.5%)
  maxYield: number;        // e.g., 0.10 (10%)

  // Spread over cap rate (yield - cap rate)
  targetSpread: number;    // e.g., 0.01 (100 bps)

  // Coverage requirements
  minCoverageRatio: number;    // e.g., 1.25x
  targetCoverageRatio: number; // e.g., 1.40x
  warningCoverageRatio: number; // e.g., 1.30x
}

export interface PartnerLeaseTerms {
  structure: LeaseStructure;

  // Initial term
  initialTermYears: number;        // e.g., 10

  // Renewal options
  renewalOptions: number;          // e.g., 2
  renewalTermYears: number;        // e.g., 5 each

  // Escalation
  escalationType: 'fixed' | 'cpi' | 'greater_of';
  fixedEscalation: number;         // e.g., 0.02 (2%)
  cpiFloor?: number;               // e.g., 0.01 (1%)
  cpiCap?: number;                 // e.g., 0.03 (3%)

  // Special provisions
  requiresPersonalGuarantee: boolean;
  requiresCorporateGuarantee: boolean;
  requiresSecurityDeposit: boolean;
  securityDepositMonths?: number;

  // ROFO/ROFR
  hasRightOfFirstOffer: boolean;
  hasRightOfFirstRefusal: boolean;

  // Purchase option
  hasPurchaseOption: boolean;
  purchaseOptionYears?: number[];  // e.g., [5, 10]
  purchaseOptionFormula?: string;  // e.g., "FMV" or "Initial + CPI"
}

export interface PartnerUnderwriting {
  // Financial requirements
  minEbitdarMargin: number;      // e.g., 0.10 (10%)
  maxAgencyLaborPercent: number; // e.g., 0.15 (15%)
  minOccupancyRate: number;      // e.g., 0.75 (75%)

  // Quality requirements
  minCmsRating: number;          // e.g., 2 (out of 5)
  maxSurveyDeficiencies: number; // e.g., 15
  allowsSff: boolean;            // Special Focus Facility
  allowsImmediateJeopardy: boolean;

  // Portfolio requirements
  minFacilitiesInPortfolio: number;  // e.g., 3
  maxConcentrationPercent: number;   // e.g., 0.25 (25% max single facility)
  requiresGeographicDiversification: boolean;

  // Financial documentation
  requiresAuditedFinancials: boolean;
  minHistoricalPeriods: number;      // e.g., 24 months
}

export interface AssetPreferences {
  // Asset types
  preferredAssetTypes: ('SNF' | 'ALF' | 'ILF' | 'HOSPICE')[];

  // Size preferences
  minBeds: number;
  maxBeds: number;
  preferredBedRange: [number, number];

  // Geographic preferences
  preferredStates: string[];
  excludedStates: string[];
  preferredMarketTypes: ('urban' | 'suburban' | 'rural')[];

  // Age/condition preferences
  maxBuildingAge: number;         // e.g., 40 years
  requiresRecentRenovation: boolean;
  maxYearsSinceRenovation?: number;

  // Payer mix preferences
  minMedicarePercent: number;     // e.g., 0.15 (15%)
  maxMedicaidPercent: number;     // e.g., 0.70 (70%)
  minPrivatePayPercent: number;   // e.g., 0.05 (5%)
}

export interface PartnerContact {
  primaryContact: string;
  email: string;
  phone?: string;
  notes?: string;
}

// =============================================================================
// PRESET PARTNER PROFILES
// =============================================================================

export const REIT_PROFILES: Record<string, PartnerProfile> = {
  sabra: {
    id: 'sabra',
    name: 'Sabra Health Care REIT',
    type: 'reit',
    riskTolerance: 'moderate',
    economics: {
      minCapRate: 0.065,
      targetCapRate: 0.0725,
      maxCapRate: 0.085,
      minYield: 0.075,
      targetYield: 0.08,
      maxYield: 0.09,
      targetSpread: 0.0075,
      minCoverageRatio: 1.30,
      targetCoverageRatio: 1.40,
      warningCoverageRatio: 1.35,
    },
    leaseTerms: {
      structure: 'triple_net',
      initialTermYears: 10,
      renewalOptions: 2,
      renewalTermYears: 5,
      escalationType: 'greater_of',
      fixedEscalation: 0.025,
      cpiFloor: 0.02,
      cpiCap: 0.03,
      requiresPersonalGuarantee: false,
      requiresCorporateGuarantee: true,
      requiresSecurityDeposit: true,
      securityDepositMonths: 6,
      hasRightOfFirstOffer: true,
      hasRightOfFirstRefusal: false,
      hasPurchaseOption: false,
    },
    underwriting: {
      minEbitdarMargin: 0.10,
      maxAgencyLaborPercent: 0.12,
      minOccupancyRate: 0.78,
      minCmsRating: 3,
      maxSurveyDeficiencies: 10,
      allowsSff: false,
      allowsImmediateJeopardy: false,
      minFacilitiesInPortfolio: 3,
      maxConcentrationPercent: 0.30,
      requiresGeographicDiversification: true,
      requiresAuditedFinancials: true,
      minHistoricalPeriods: 24,
    },
    assetPreferences: {
      preferredAssetTypes: ['SNF', 'ALF'],
      minBeds: 60,
      maxBeds: 250,
      preferredBedRange: [80, 150],
      preferredStates: [],
      excludedStates: [],
      preferredMarketTypes: ['suburban', 'urban'],
      maxBuildingAge: 35,
      requiresRecentRenovation: false,
      minMedicarePercent: 0.15,
      maxMedicaidPercent: 0.65,
      minPrivatePayPercent: 0.05,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  caretrust: {
    id: 'caretrust',
    name: 'CareTrust REIT',
    type: 'reit',
    riskTolerance: 'moderate',
    economics: {
      minCapRate: 0.07,
      targetCapRate: 0.075,
      maxCapRate: 0.09,
      minYield: 0.08,
      targetYield: 0.085,
      maxYield: 0.095,
      targetSpread: 0.01,
      minCoverageRatio: 1.35,
      targetCoverageRatio: 1.45,
      warningCoverageRatio: 1.40,
    },
    leaseTerms: {
      structure: 'triple_net',
      initialTermYears: 15,
      renewalOptions: 2,
      renewalTermYears: 5,
      escalationType: 'fixed',
      fixedEscalation: 0.025,
      requiresPersonalGuarantee: false,
      requiresCorporateGuarantee: true,
      requiresSecurityDeposit: true,
      securityDepositMonths: 3,
      hasRightOfFirstOffer: true,
      hasRightOfFirstRefusal: true,
      hasPurchaseOption: false,
    },
    underwriting: {
      minEbitdarMargin: 0.12,
      maxAgencyLaborPercent: 0.10,
      minOccupancyRate: 0.80,
      minCmsRating: 3,
      maxSurveyDeficiencies: 8,
      allowsSff: false,
      allowsImmediateJeopardy: false,
      minFacilitiesInPortfolio: 5,
      maxConcentrationPercent: 0.20,
      requiresGeographicDiversification: true,
      requiresAuditedFinancials: true,
      minHistoricalPeriods: 36,
    },
    assetPreferences: {
      preferredAssetTypes: ['SNF'],
      minBeds: 80,
      maxBeds: 200,
      preferredBedRange: [100, 150],
      preferredStates: [],
      excludedStates: ['NY', 'NJ'],
      preferredMarketTypes: ['suburban'],
      maxBuildingAge: 30,
      requiresRecentRenovation: true,
      maxYearsSinceRenovation: 10,
      minMedicarePercent: 0.20,
      maxMedicaidPercent: 0.55,
      minPrivatePayPercent: 0.10,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },

  ltc_properties: {
    id: 'ltc_properties',
    name: 'LTC Properties',
    type: 'reit',
    riskTolerance: 'conservative',
    economics: {
      minCapRate: 0.065,
      targetCapRate: 0.07,
      maxCapRate: 0.08,
      minYield: 0.07,
      targetYield: 0.0775,
      maxYield: 0.085,
      targetSpread: 0.0075,
      minCoverageRatio: 1.40,
      targetCoverageRatio: 1.50,
      warningCoverageRatio: 1.45,
    },
    leaseTerms: {
      structure: 'triple_net',
      initialTermYears: 10,
      renewalOptions: 3,
      renewalTermYears: 5,
      escalationType: 'cpi',
      fixedEscalation: 0.02,
      cpiFloor: 0.015,
      cpiCap: 0.025,
      requiresPersonalGuarantee: true,
      requiresCorporateGuarantee: true,
      requiresSecurityDeposit: true,
      securityDepositMonths: 6,
      hasRightOfFirstOffer: false,
      hasRightOfFirstRefusal: true,
      hasPurchaseOption: false,
    },
    underwriting: {
      minEbitdarMargin: 0.15,
      maxAgencyLaborPercent: 0.08,
      minOccupancyRate: 0.85,
      minCmsRating: 4,
      maxSurveyDeficiencies: 5,
      allowsSff: false,
      allowsImmediateJeopardy: false,
      minFacilitiesInPortfolio: 3,
      maxConcentrationPercent: 0.25,
      requiresGeographicDiversification: false,
      requiresAuditedFinancials: true,
      minHistoricalPeriods: 36,
    },
    assetPreferences: {
      preferredAssetTypes: ['SNF', 'ALF', 'ILF'],
      minBeds: 50,
      maxBeds: 180,
      preferredBedRange: [70, 120],
      preferredStates: ['TX', 'FL', 'OH', 'PA'],
      excludedStates: ['CA', 'NY'],
      preferredMarketTypes: ['suburban', 'rural'],
      maxBuildingAge: 25,
      requiresRecentRenovation: true,
      maxYearsSinceRenovation: 7,
      minMedicarePercent: 0.25,
      maxMedicaidPercent: 0.50,
      minPrivatePayPercent: 0.15,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export const PE_PROFILES: Record<string, PartnerProfile> = {
  generic_pe: {
    id: 'generic_pe',
    name: 'Private Equity (Standard)',
    type: 'private_equity',
    riskTolerance: 'aggressive',
    economics: {
      minCapRate: 0.08,
      targetCapRate: 0.09,
      maxCapRate: 0.12,
      minYield: 0.09,
      targetYield: 0.10,
      maxYield: 0.12,
      targetSpread: 0.01,
      minCoverageRatio: 1.20,
      targetCoverageRatio: 1.30,
      warningCoverageRatio: 1.25,
    },
    leaseTerms: {
      structure: 'triple_net',
      initialTermYears: 10,
      renewalOptions: 2,
      renewalTermYears: 5,
      escalationType: 'fixed',
      fixedEscalation: 0.03,
      requiresPersonalGuarantee: true,
      requiresCorporateGuarantee: true,
      requiresSecurityDeposit: true,
      securityDepositMonths: 12,
      hasRightOfFirstOffer: false,
      hasRightOfFirstRefusal: false,
      hasPurchaseOption: true,
      purchaseOptionYears: [5, 7],
      purchaseOptionFormula: 'FMV',
    },
    underwriting: {
      minEbitdarMargin: 0.08,
      maxAgencyLaborPercent: 0.20,
      minOccupancyRate: 0.70,
      minCmsRating: 2,
      maxSurveyDeficiencies: 20,
      allowsSff: true,
      allowsImmediateJeopardy: false,
      minFacilitiesInPortfolio: 1,
      maxConcentrationPercent: 0.50,
      requiresGeographicDiversification: false,
      requiresAuditedFinancials: false,
      minHistoricalPeriods: 12,
    },
    assetPreferences: {
      preferredAssetTypes: ['SNF', 'ALF', 'ILF', 'HOSPICE'],
      minBeds: 40,
      maxBeds: 300,
      preferredBedRange: [60, 200],
      preferredStates: [],
      excludedStates: [],
      preferredMarketTypes: ['urban', 'suburban', 'rural'],
      maxBuildingAge: 50,
      requiresRecentRenovation: false,
      minMedicarePercent: 0.10,
      maxMedicaidPercent: 0.80,
      minPrivatePayPercent: 0.02,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

export const REGIONAL_PROFILES: Record<string, PartnerProfile> = {
  regional_operator: {
    id: 'regional_operator',
    name: 'Regional Operator (Acquisition)',
    type: 'regional_operator',
    riskTolerance: 'moderate',
    economics: {
      minCapRate: 0.07,
      targetCapRate: 0.08,
      maxCapRate: 0.10,
      minYield: 0.08,
      targetYield: 0.09,
      maxYield: 0.10,
      targetSpread: 0.01,
      minCoverageRatio: 1.25,
      targetCoverageRatio: 1.35,
      warningCoverageRatio: 1.30,
    },
    leaseTerms: {
      structure: 'modified_gross',
      initialTermYears: 10,
      renewalOptions: 2,
      renewalTermYears: 5,
      escalationType: 'fixed',
      fixedEscalation: 0.025,
      requiresPersonalGuarantee: true,
      requiresCorporateGuarantee: false,
      requiresSecurityDeposit: false,
      hasRightOfFirstOffer: false,
      hasRightOfFirstRefusal: false,
      hasPurchaseOption: true,
      purchaseOptionYears: [10],
      purchaseOptionFormula: 'Initial + CPI',
    },
    underwriting: {
      minEbitdarMargin: 0.08,
      maxAgencyLaborPercent: 0.18,
      minOccupancyRate: 0.72,
      minCmsRating: 2,
      maxSurveyDeficiencies: 15,
      allowsSff: true,
      allowsImmediateJeopardy: false,
      minFacilitiesInPortfolio: 1,
      maxConcentrationPercent: 1.0,
      requiresGeographicDiversification: false,
      requiresAuditedFinancials: false,
      minHistoricalPeriods: 12,
    },
    assetPreferences: {
      preferredAssetTypes: ['SNF', 'ALF'],
      minBeds: 30,
      maxBeds: 200,
      preferredBedRange: [50, 120],
      preferredStates: [],
      excludedStates: [],
      preferredMarketTypes: ['suburban', 'rural'],
      maxBuildingAge: 45,
      requiresRecentRenovation: false,
      minMedicarePercent: 0.10,
      maxMedicaidPercent: 0.75,
      minPrivatePayPercent: 0.03,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all preset partner profiles
 */
export function getAllPartnerProfiles(): PartnerProfile[] {
  return [
    ...Object.values(REIT_PROFILES),
    ...Object.values(PE_PROFILES),
    ...Object.values(REGIONAL_PROFILES),
  ];
}

/**
 * Get partner profile by ID
 */
export function getPartnerProfile(id: string): PartnerProfile | undefined {
  return (
    REIT_PROFILES[id] ||
    PE_PROFILES[id] ||
    REGIONAL_PROFILES[id]
  );
}

/**
 * Create custom partner profile
 */
export function createCustomProfile(
  name: string,
  baseProfile: PartnerProfile,
  overrides: Partial<PartnerProfile>
): PartnerProfile {
  return {
    ...baseProfile,
    ...overrides,
    id: `custom_${Date.now()}`,
    name,
    type: 'custom',
    economics: { ...baseProfile.economics, ...overrides.economics },
    leaseTerms: { ...baseProfile.leaseTerms, ...overrides.leaseTerms },
    underwriting: { ...baseProfile.underwriting, ...overrides.underwriting },
    assetPreferences: { ...baseProfile.assetPreferences, ...overrides.assetPreferences },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Check if facility meets partner underwriting criteria
 */
export interface UnderwritingCheckResult {
  passes: boolean;
  score: number;  // 0-100
  issues: UnderwritingIssue[];
  warnings: UnderwritingIssue[];
}

export interface UnderwritingIssue {
  field: string;
  requirement: string;
  actual: string | number;
  severity: 'blocker' | 'warning';
}

export function checkUnderwritingCriteria(
  partner: PartnerProfile,
  facility: {
    cmsRating?: number;
    occupancyRate?: number;
    ebitdarMargin?: number;
    agencyLaborPercent?: number;
    surveyDeficiencies?: number;
    isSff?: boolean;
    hasImmediateJeopardy?: boolean;
    beds?: number;
    yearBuilt?: number;
    lastRenovation?: number;
    state?: string;
    locationType?: 'urban' | 'suburban' | 'rural';
    medicarePercent?: number;
    medicaidPercent?: number;
    privatePayPercent?: number;
  }
): UnderwritingCheckResult {
  const issues: UnderwritingIssue[] = [];
  const warnings: UnderwritingIssue[] = [];
  const { underwriting, assetPreferences } = partner;

  // CMS Rating
  if (facility.cmsRating !== undefined && facility.cmsRating < underwriting.minCmsRating) {
    issues.push({
      field: 'cmsRating',
      requirement: `Min ${underwriting.minCmsRating} stars`,
      actual: facility.cmsRating,
      severity: 'blocker',
    });
  }

  // Occupancy
  if (facility.occupancyRate !== undefined && facility.occupancyRate < underwriting.minOccupancyRate) {
    issues.push({
      field: 'occupancyRate',
      requirement: `Min ${(underwriting.minOccupancyRate * 100).toFixed(0)}%`,
      actual: `${(facility.occupancyRate * 100).toFixed(1)}%`,
      severity: 'blocker',
    });
  }

  // EBITDAR Margin
  if (facility.ebitdarMargin !== undefined && facility.ebitdarMargin < underwriting.minEbitdarMargin) {
    issues.push({
      field: 'ebitdarMargin',
      requirement: `Min ${(underwriting.minEbitdarMargin * 100).toFixed(0)}%`,
      actual: `${(facility.ebitdarMargin * 100).toFixed(1)}%`,
      severity: 'blocker',
    });
  }

  // Agency Labor
  if (facility.agencyLaborPercent !== undefined && facility.agencyLaborPercent > underwriting.maxAgencyLaborPercent) {
    warnings.push({
      field: 'agencyLaborPercent',
      requirement: `Max ${(underwriting.maxAgencyLaborPercent * 100).toFixed(0)}%`,
      actual: `${(facility.agencyLaborPercent * 100).toFixed(1)}%`,
      severity: 'warning',
    });
  }

  // Survey Deficiencies
  if (facility.surveyDeficiencies !== undefined && facility.surveyDeficiencies > underwriting.maxSurveyDeficiencies) {
    issues.push({
      field: 'surveyDeficiencies',
      requirement: `Max ${underwriting.maxSurveyDeficiencies}`,
      actual: facility.surveyDeficiencies,
      severity: 'blocker',
    });
  }

  // SFF Status
  if (facility.isSff && !underwriting.allowsSff) {
    issues.push({
      field: 'isSff',
      requirement: 'No SFF facilities',
      actual: 'Is SFF',
      severity: 'blocker',
    });
  }

  // Immediate Jeopardy
  if (facility.hasImmediateJeopardy && !underwriting.allowsImmediateJeopardy) {
    issues.push({
      field: 'hasImmediateJeopardy',
      requirement: 'No IJ history',
      actual: 'Has IJ',
      severity: 'blocker',
    });
  }

  // Bed count
  if (facility.beds !== undefined) {
    if (facility.beds < assetPreferences.minBeds) {
      issues.push({
        field: 'beds',
        requirement: `Min ${assetPreferences.minBeds} beds`,
        actual: facility.beds,
        severity: 'blocker',
      });
    }
    if (facility.beds > assetPreferences.maxBeds) {
      warnings.push({
        field: 'beds',
        requirement: `Max ${assetPreferences.maxBeds} beds`,
        actual: facility.beds,
        severity: 'warning',
      });
    }
  }

  // Building age
  if (facility.yearBuilt !== undefined) {
    const age = new Date().getFullYear() - facility.yearBuilt;
    if (age > assetPreferences.maxBuildingAge) {
      warnings.push({
        field: 'buildingAge',
        requirement: `Max ${assetPreferences.maxBuildingAge} years`,
        actual: `${age} years`,
        severity: 'warning',
      });
    }
  }

  // State exclusions
  if (facility.state && assetPreferences.excludedStates.includes(facility.state)) {
    issues.push({
      field: 'state',
      requirement: `Not in ${assetPreferences.excludedStates.join(', ')}`,
      actual: facility.state,
      severity: 'blocker',
    });
  }

  // Payer mix
  if (facility.medicaidPercent !== undefined && facility.medicaidPercent > assetPreferences.maxMedicaidPercent) {
    warnings.push({
      field: 'medicaidPercent',
      requirement: `Max ${(assetPreferences.maxMedicaidPercent * 100).toFixed(0)}%`,
      actual: `${(facility.medicaidPercent * 100).toFixed(1)}%`,
      severity: 'warning',
    });
  }

  // Calculate score
  const totalChecks = 12;
  const failedBlockers = issues.length;
  const failedWarnings = warnings.length;
  const score = Math.max(0, 100 - (failedBlockers * 15) - (failedWarnings * 5));

  return {
    passes: issues.length === 0,
    score,
    issues,
    warnings,
  };
}

/**
 * Calculate deal economics for a partner
 */
export interface DealEconomics {
  purchasePrice: number;
  annualRent: number;
  monthlyRent: number;
  impliedCapRate: number;
  impliedYield: number;
  coverageRatio: number;
  coverageStatus: 'healthy' | 'warning' | 'critical';
  meetsPartnerCriteria: boolean;

  // Lease NPV
  leaseNpv: number;
  totalLeaseObligation: number;

  // Sensitivity
  maxRentAtTargetCoverage: number;
  minPurchasePriceAtTargetYield: number;
}

export function calculateDealEconomics(
  partner: PartnerProfile,
  noi: number,
  ebitdar: number,
  options?: {
    customCapRate?: number;
    customYield?: number;
    discountRate?: number;
  }
): DealEconomics {
  const capRate = options?.customCapRate || partner.economics.targetCapRate;
  const yieldRate = options?.customYield || partner.economics.targetYield;
  const discountRate = options?.discountRate || 0.08;

  // Basic calculations
  const purchasePrice = noi / capRate;
  const annualRent = purchasePrice * yieldRate;
  const monthlyRent = annualRent / 12;
  const coverageRatio = ebitdar / annualRent;

  // Coverage status
  const coverageStatus: 'healthy' | 'warning' | 'critical' =
    coverageRatio >= partner.economics.targetCoverageRatio ? 'healthy' :
    coverageRatio >= partner.economics.warningCoverageRatio ? 'warning' : 'critical';

  // Check if meets partner criteria
  const meetsPartnerCriteria = coverageRatio >= partner.economics.minCoverageRatio;

  // Calculate lease NPV
  const { leaseNpv, totalLeaseObligation } = calculateLeaseNpv(
    annualRent,
    partner.leaseTerms,
    discountRate
  );

  // Sensitivity calculations
  const maxRentAtTargetCoverage = ebitdar / partner.economics.targetCoverageRatio;
  const minPurchasePriceAtTargetYield = maxRentAtTargetCoverage / partner.economics.targetYield;

  return {
    purchasePrice,
    annualRent,
    monthlyRent,
    impliedCapRate: capRate,
    impliedYield: yieldRate,
    coverageRatio,
    coverageStatus,
    meetsPartnerCriteria,
    leaseNpv,
    totalLeaseObligation,
    maxRentAtTargetCoverage,
    minPurchasePriceAtTargetYield,
  };
}

/**
 * Calculate lease NPV with escalations
 */
function calculateLeaseNpv(
  baseRent: number,
  terms: PartnerLeaseTerms,
  discountRate: number
): { leaseNpv: number; totalLeaseObligation: number } {
  const totalYears = terms.initialTermYears + (terms.renewalOptions * terms.renewalTermYears);
  let npv = 0;
  let totalObligation = 0;

  const escalationRate = terms.escalationType === 'cpi'
    ? (terms.cpiFloor || 0.02)
    : terms.fixedEscalation;

  for (let year = 1; year <= totalYears; year++) {
    const yearRent = baseRent * Math.pow(1 + escalationRate, year - 1);
    const discountFactor = 1 / Math.pow(1 + discountRate, year);

    npv += yearRent * discountFactor;
    totalObligation += yearRent;
  }

  return { leaseNpv: npv, totalLeaseObligation: totalObligation };
}

// =============================================================================
// VALIDATION
// =============================================================================

export const partnerProfileSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: z.enum(['reit', 'private_equity', 'regional_operator', 'custom']),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']),
  economics: z.object({
    minCapRate: z.number().min(0).max(0.20),
    targetCapRate: z.number().min(0).max(0.20),
    maxCapRate: z.number().min(0).max(0.20),
    minYield: z.number().min(0).max(0.20),
    targetYield: z.number().min(0).max(0.20),
    maxYield: z.number().min(0).max(0.20),
    targetSpread: z.number().min(0).max(0.05),
    minCoverageRatio: z.number().min(1.0).max(2.0),
    targetCoverageRatio: z.number().min(1.0).max(2.0),
    warningCoverageRatio: z.number().min(1.0).max(2.0),
  }),
  // ... rest of schema
});
