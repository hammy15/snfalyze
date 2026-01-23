// =============================================================================
// REPLACEMENT COST VALUATION - Value based on cost to rebuild
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';
import type { ValuationMethod, FacilityProfile, MarketData } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ReplacementCostInput {
  facility: FacilityProfile;
  marketData?: MarketData;
  landValue?: number; // If known
  settings?: ReplacementCostSettings;
}

export interface ReplacementCostSettings {
  // Construction costs per square foot by asset type
  constructionCostPerSF: number;

  // Regional construction multipliers
  regionalMultipliers: Record<string, number>;

  // Depreciation settings
  usefulLife: number; // Years
  deprecationMethod: 'straight_line' | 'declining_balance';
  residualValuePercent: number;

  // Additional cost factors
  softCostPercent: number; // Architectural, engineering, permits
  ffeCostPerBed: number; // Furniture, fixtures, equipment
  entrepreneurialIncentive: number; // Developer profit margin

  // Land value estimation
  landValuePerAcre?: Record<string, number>; // By region/location type
  defaultAcresPerBed: number;

  // Functional/external obsolescence
  functionalObsolescencePercent?: number;
  externalObsolescencePercent?: number;
}

export interface ReplacementCostBreakdown {
  landValue: number;
  buildingCost: number;
  softCosts: number;
  ffeCost: number;
  entrepreneurialIncentive: number;
  grossReplacementCost: number;
  physicalDepreciation: number;
  functionalObsolescence: number;
  externalObsolescence: number;
  totalDepreciation: number;
  deprecatedReplacementCost: number;
  finalValue: number;
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_SETTINGS: Record<AssetType, ReplacementCostSettings> = {
  SNF: {
    constructionCostPerSF: 350, // $350/SF
    regionalMultipliers: {
      west: 1.20,
      northeast: 1.15,
      southeast: 0.90,
      midwest: 0.95,
      southwest: 0.95,
    },
    usefulLife: 40,
    deprecationMethod: 'straight_line',
    residualValuePercent: 0.20,
    softCostPercent: 0.15,
    ffeCostPerBed: 15000,
    entrepreneurialIncentive: 0.10,
    landValuePerAcre: {
      urban: 500000,
      suburban: 250000,
      rural: 75000,
      frontier: 25000,
    },
    defaultAcresPerBed: 0.03, // Typical 3 acres for 100-bed facility
  },
  ALF: {
    constructionCostPerSF: 300,
    regionalMultipliers: {
      west: 1.20,
      northeast: 1.15,
      southeast: 0.90,
      midwest: 0.95,
      southwest: 0.95,
    },
    usefulLife: 40,
    deprecationMethod: 'straight_line',
    residualValuePercent: 0.20,
    softCostPercent: 0.12,
    ffeCostPerBed: 12000,
    entrepreneurialIncentive: 0.12,
    landValuePerAcre: {
      urban: 600000,
      suburban: 300000,
      rural: 100000,
      frontier: 35000,
    },
    defaultAcresPerBed: 0.025,
  },
  ILF: {
    constructionCostPerSF: 250,
    regionalMultipliers: {
      west: 1.25,
      northeast: 1.15,
      southeast: 0.88,
      midwest: 0.92,
      southwest: 0.90,
    },
    usefulLife: 45,
    deprecationMethod: 'straight_line',
    residualValuePercent: 0.25,
    softCostPercent: 0.10,
    ffeCostPerBed: 8000,
    entrepreneurialIncentive: 0.15,
    landValuePerAcre: {
      urban: 750000,
      suburban: 400000,
      rural: 125000,
      frontier: 50000,
    },
    defaultAcresPerBed: 0.02,
  },
};

// =============================================================================
// REPLACEMENT COST CALCULATOR CLASS
// =============================================================================

export class ReplacementCostCalculator {
  /**
   * Calculate value using replacement cost method
   */
  calculate(input: ReplacementCostInput): ValuationMethod {
    const settings = input.settings || DEFAULT_SETTINGS[input.facility.assetType];
    const { facility, landValue } = input;

    // Calculate full breakdown
    const breakdown = this.calculateBreakdown(facility, settings, landValue);

    // Determine confidence
    const confidence = this.calculateConfidence(input, breakdown);

    return {
      name: 'Replacement Cost',
      value: breakdown.finalValue,
      confidence,
      weight: 0.10,
      weightedValue: breakdown.finalValue * 0.10,
      inputs: {
        landValue: breakdown.landValue,
        buildingCost: breakdown.buildingCost,
        softCosts: breakdown.softCosts,
        ffeCost: breakdown.ffeCost,
        grossReplacementCost: breakdown.grossReplacementCost,
        totalDepreciation: breakdown.totalDepreciation,
        beds: facility.beds.operational,
        squareFootage: facility.squareFootage || 0,
      },
      adjustments: [
        {
          description: `Land value`,
          impact: breakdown.landValue,
        },
        {
          description: `Building cost (${(settings.constructionCostPerSF).toFixed(0)}/SF × ${facility.squareFootage?.toLocaleString() || 'est'} SF)`,
          impact: breakdown.buildingCost,
        },
        {
          description: `Soft costs (${(settings.softCostPercent * 100).toFixed(0)}%)`,
          impact: breakdown.softCosts,
        },
        {
          description: `FF&E ($${settings.ffeCostPerBed.toLocaleString()}/bed)`,
          impact: breakdown.ffeCost,
        },
        {
          description: `Entrepreneurial incentive (${(settings.entrepreneurialIncentive * 100).toFixed(0)}%)`,
          impact: breakdown.entrepreneurialIncentive,
        },
        {
          description: `Physical depreciation (${this.calculateAge(facility)} years)`,
          impact: -breakdown.physicalDepreciation,
        },
      ],
    };
  }

  /**
   * Calculate full cost breakdown
   */
  calculateBreakdown(
    facility: FacilityProfile,
    settings: ReplacementCostSettings,
    providedLandValue?: number
  ): ReplacementCostBreakdown {
    const beds = facility.beds.operational;
    const age = this.calculateAge(facility);

    // Calculate land value
    let landValue = providedLandValue || 0;
    if (!landValue && settings.landValuePerAcre) {
      const acres = facility.acres || beds * settings.defaultAcresPerBed;
      const landValuePerAcre = settings.landValuePerAcre[facility.locationType] || 200000;
      landValue = acres * landValuePerAcre;
    }

    // Calculate building cost
    let squareFootage = facility.squareFootage;
    if (!squareFootage) {
      // Estimate based on beds and asset type
      const sfPerBed = facility.assetType === 'SNF' ? 450 : facility.assetType === 'ALF' ? 550 : 700;
      squareFootage = beds * sfPerBed;
    }

    // Apply regional multiplier
    const regionalMultiplier = settings.regionalMultipliers[facility.region] || 1.0;
    const adjustedCostPerSF = settings.constructionCostPerSF * regionalMultiplier;
    const buildingCost = squareFootage * adjustedCostPerSF;

    // Soft costs
    const softCosts = buildingCost * settings.softCostPercent;

    // FF&E
    const ffeCost = beds * settings.ffeCostPerBed;

    // Subtotal before entrepreneurial incentive
    const subtotal = landValue + buildingCost + softCosts + ffeCost;

    // Entrepreneurial incentive
    const entrepreneurialIncentive = subtotal * settings.entrepreneurialIncentive;

    // Gross replacement cost
    const grossReplacementCost = subtotal + entrepreneurialIncentive;

    // Physical depreciation
    const depreciableBase = grossReplacementCost - landValue;
    const effectiveAge = Math.min(age, settings.usefulLife);
    const depreciationRate =
      (1 - settings.residualValuePercent) * (effectiveAge / settings.usefulLife);
    const physicalDepreciation = depreciableBase * depreciationRate;

    // Functional obsolescence (default to 0 if not specified)
    const functionalObsolescence = settings.functionalObsolescencePercent
      ? depreciableBase * settings.functionalObsolescencePercent
      : 0;

    // External obsolescence (default to 0 if not specified)
    const externalObsolescence = settings.externalObsolescencePercent
      ? depreciableBase * settings.externalObsolescencePercent
      : 0;

    // Total depreciation
    const totalDepreciation = physicalDepreciation + functionalObsolescence + externalObsolescence;

    // Depreciated replacement cost
    const deprecatedReplacementCost = grossReplacementCost - totalDepreciation;

    // Final value is depreciated cost
    const finalValue = deprecatedReplacementCost;

    return {
      landValue,
      buildingCost,
      softCosts,
      ffeCost,
      entrepreneurialIncentive,
      grossReplacementCost,
      physicalDepreciation,
      functionalObsolescence,
      externalObsolescence,
      totalDepreciation,
      deprecatedReplacementCost,
      finalValue,
    };
  }

  /**
   * Calculate effective age of facility
   */
  private calculateAge(facility: FacilityProfile): number {
    const currentYear = new Date().getFullYear();
    const baseAge = currentYear - facility.yearBuilt;

    // Reduce effective age if renovated
    if (facility.yearRenovated) {
      const yearsSinceRenovation = currentYear - facility.yearRenovated;
      // Major renovation can reduce effective age by up to 50%
      const ageReduction = Math.min(baseAge * 0.5, baseAge - yearsSinceRenovation);
      return Math.max(0, baseAge - ageReduction);
    }

    return baseAge;
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(
    input: ReplacementCostInput,
    breakdown: ReplacementCostBreakdown
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // Quality of input data
    if (input.facility.squareFootage) score += 2;
    if (input.facility.acres) score += 1;
    if (input.landValue) score += 2;
    if (input.facility.yearBuilt > 0) score += 1;

    // Reasonable results
    const valuePerBed = breakdown.finalValue / input.facility.beds.operational;
    if (valuePerBed > 50000 && valuePerBed < 300000) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Estimate square footage if not provided
   */
  estimateSquareFootage(beds: number, assetType: AssetType): number {
    const sfPerBed: Record<AssetType, number> = {
      SNF: 450,
      ALF: 550,
      ILF: 700,
    };
    return beds * sfPerBed[assetType];
  }

  /**
   * Get current construction cost per SF for region
   */
  getConstructionCost(assetType: AssetType, region: string): number {
    const settings = DEFAULT_SETTINGS[assetType];
    const multiplier = settings.regionalMultipliers[region] || 1.0;
    return settings.constructionCostPerSF * multiplier;
  }

  /**
   * Get default settings for asset type
   */
  static getDefaultSettings(assetType: AssetType): ReplacementCostSettings {
    return DEFAULT_SETTINGS[assetType];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const replacementCostCalculator = new ReplacementCostCalculator();
