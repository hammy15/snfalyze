// =============================================================================
// CAP RATE VALUATION - Value = NOI / Cap Rate
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';
import type { ValuationMethod, FacilityProfile, CMSData, OperatingMetrics, MarketData } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface CapRateInput {
  noi: number;
  facility: FacilityProfile;
  cmsData?: CMSData;
  operatingMetrics?: OperatingMetrics;
  marketData?: MarketData;
  settings?: CapRateSettings;
}

export interface CapRateSettings {
  baseCapRate: number;
  adjustments: CapRateAdjustments;
}

export interface CapRateAdjustments {
  quality?: QualityAdjustment;
  size?: SizeAdjustment;
  age?: AgeAdjustment;
  occupancy?: OccupancyAdjustment;
  payerMix?: PayerMixAdjustment;
  location?: LocationAdjustment;
  market?: MarketAdjustment;
}

interface QualityAdjustment {
  enabled: boolean;
  ratings: { stars: number; adjustment: number }[];
}

interface SizeAdjustment {
  enabled: boolean;
  brackets: { minBeds: number; maxBeds: number; adjustment: number }[];
}

interface AgeAdjustment {
  enabled: boolean;
  brackets: { minAge: number; maxAge: number; adjustment: number }[];
}

interface OccupancyAdjustment {
  enabled: boolean;
  brackets: { minOccupancy: number; maxOccupancy: number; adjustment: number }[];
}

interface PayerMixAdjustment {
  enabled: boolean;
  medicareWeight: number;
  medicaidWeight: number;
  privatePayWeight: number;
}

interface LocationAdjustment {
  enabled: boolean;
  urban: number;
  suburban: number;
  rural: number;
  frontier?: number;
}

interface MarketAdjustment {
  enabled: boolean;
  strongMarket: number;
  averageMarket: number;
  weakMarket: number;
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_CAP_RATE_SETTINGS: Record<AssetType, CapRateSettings> = {
  SNF: {
    baseCapRate: 0.10, // 10% base cap rate
    adjustments: {
      quality: {
        enabled: true,
        ratings: [
          { stars: 5, adjustment: -0.015 },
          { stars: 4, adjustment: -0.0075 },
          { stars: 3, adjustment: 0 },
          { stars: 2, adjustment: 0.01 },
          { stars: 1, adjustment: 0.02 },
        ],
      },
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 50, adjustment: 0.01 },
          { minBeds: 51, maxBeds: 100, adjustment: 0.005 },
          { minBeds: 101, maxBeds: 150, adjustment: 0 },
          { minBeds: 151, maxBeds: 200, adjustment: -0.005 },
          { minBeds: 201, maxBeds: Infinity, adjustment: -0.01 },
        ],
      },
      age: {
        enabled: true,
        brackets: [
          { minAge: 0, maxAge: 10, adjustment: -0.01 },
          { minAge: 11, maxAge: 20, adjustment: -0.005 },
          { minAge: 21, maxAge: 30, adjustment: 0 },
          { minAge: 31, maxAge: 40, adjustment: 0.005 },
          { minAge: 41, maxAge: Infinity, adjustment: 0.01 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, adjustment: -0.01 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, adjustment: -0.005 },
          { minOccupancy: 0.85, maxOccupancy: 0.90, adjustment: 0 },
          { minOccupancy: 0.80, maxOccupancy: 0.85, adjustment: 0.005 },
          { minOccupancy: 0.75, maxOccupancy: 0.80, adjustment: 0.01 },
          { minOccupancy: 0, maxOccupancy: 0.75, adjustment: 0.02 },
        ],
      },
      location: {
        enabled: true,
        urban: -0.005,
        suburban: 0,
        rural: 0.01,
      },
    },
  },
  ALF: {
    baseCapRate: 0.07, // 7% base cap rate
    adjustments: {
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 40, adjustment: 0.01 },
          { minBeds: 41, maxBeds: 80, adjustment: 0.005 },
          { minBeds: 81, maxBeds: 120, adjustment: 0 },
          { minBeds: 121, maxBeds: Infinity, adjustment: -0.005 },
        ],
      },
      age: {
        enabled: true,
        brackets: [
          { minAge: 0, maxAge: 10, adjustment: -0.0075 },
          { minAge: 11, maxAge: 20, adjustment: 0 },
          { minAge: 21, maxAge: 30, adjustment: 0.0075 },
          { minAge: 31, maxAge: Infinity, adjustment: 0.015 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, adjustment: -0.0075 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, adjustment: -0.005 },
          { minOccupancy: 0.85, maxOccupancy: 0.90, adjustment: 0 },
          { minOccupancy: 0.80, maxOccupancy: 0.85, adjustment: 0.005 },
          { minOccupancy: 0, maxOccupancy: 0.80, adjustment: 0.01 },
        ],
      },
      location: {
        enabled: true,
        urban: -0.0075,
        suburban: 0,
        rural: 0.0075,
      },
    },
  },
  ILF: {
    baseCapRate: 0.06, // 6% base cap rate
    adjustments: {
      age: {
        enabled: true,
        brackets: [
          { minAge: 0, maxAge: 10, adjustment: -0.005 },
          { minAge: 11, maxAge: 20, adjustment: 0 },
          { minAge: 21, maxAge: Infinity, adjustment: 0.0075 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, adjustment: -0.005 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, adjustment: 0 },
          { minOccupancy: 0, maxOccupancy: 0.90, adjustment: 0.0075 },
        ],
      },
      location: {
        enabled: true,
        urban: -0.005,
        suburban: 0,
        rural: 0.005,
      },
    },
  },
};

// =============================================================================
// CAP RATE CALCULATOR CLASS
// =============================================================================

export class CapRateCalculator {
  /**
   * Calculate value using cap rate method
   */
  calculate(input: CapRateInput): ValuationMethod {
    const settings = input.settings || DEFAULT_CAP_RATE_SETTINGS[input.facility.assetType];
    const { noi, facility, cmsData, operatingMetrics, marketData } = input;

    // Calculate adjusted cap rate
    const { capRate, adjustmentDetails } = this.calculateAdjustedCapRate(
      settings,
      facility,
      cmsData,
      operatingMetrics,
      marketData
    );

    // Calculate value
    const value = noi / capRate;

    // Determine confidence based on data quality
    const confidence = this.calculateConfidence(input);

    return {
      name: 'Cap Rate',
      value,
      confidence,
      weight: 0.30, // Default weight, can be overridden
      weightedValue: value * 0.30,
      inputs: {
        noi,
        baseCapRate: settings.baseCapRate,
        adjustedCapRate: capRate,
        beds: facility.beds.operational,
      },
      adjustments: adjustmentDetails,
    };
  }

  /**
   * Calculate the adjusted cap rate with all adjustments
   */
  calculateAdjustedCapRate(
    settings: CapRateSettings,
    facility: FacilityProfile,
    cmsData?: CMSData,
    operations?: OperatingMetrics,
    market?: MarketData
  ): { capRate: number; adjustmentDetails: ValuationMethod['adjustments'] } {
    let capRate = settings.baseCapRate;
    const adjustmentDetails: ValuationMethod['adjustments'] = [];

    // Quality adjustment (CMS stars)
    if (settings.adjustments.quality?.enabled && cmsData) {
      const qualityAdj = this.getQualityAdjustment(cmsData.overallRating, settings.adjustments.quality);
      if (qualityAdj !== 0) {
        capRate += qualityAdj;
        adjustmentDetails.push({
          description: `CMS ${cmsData.overallRating}-star rating`,
          impact: qualityAdj,
        });
      }
    }

    // Size adjustment
    if (settings.adjustments.size?.enabled) {
      const beds = facility.beds.operational;
      const sizeAdj = this.getBracketAdjustment(beds, settings.adjustments.size.brackets, 'minBeds', 'maxBeds');
      if (sizeAdj !== 0) {
        capRate += sizeAdj;
        adjustmentDetails.push({
          description: `${beds} beds size adjustment`,
          impact: sizeAdj,
        });
      }
    }

    // Age adjustment
    if (settings.adjustments.age?.enabled) {
      const age = new Date().getFullYear() - facility.yearBuilt;
      const ageAdj = this.getBracketAdjustment(age, settings.adjustments.age.brackets, 'minAge', 'maxAge');
      if (ageAdj !== 0) {
        capRate += ageAdj;
        adjustmentDetails.push({
          description: `${age} year old building`,
          impact: ageAdj,
        });
      }
    }

    // Occupancy adjustment
    if (settings.adjustments.occupancy?.enabled && operations) {
      const occupancy = operations.occupancyRate / 100;
      const occAdj = this.getBracketAdjustment(
        occupancy,
        settings.adjustments.occupancy.brackets,
        'minOccupancy',
        'maxOccupancy'
      );
      if (occAdj !== 0) {
        capRate += occAdj;
        adjustmentDetails.push({
          description: `${(occupancy * 100).toFixed(1)}% occupancy`,
          impact: occAdj,
        });
      }
    }

    // Location adjustment
    if (settings.adjustments.location?.enabled) {
      const locAdj = settings.adjustments.location[facility.locationType] || 0;
      if (locAdj !== 0) {
        capRate += locAdj;
        adjustmentDetails.push({
          description: `${facility.locationType} location`,
          impact: locAdj,
        });
      }
    }

    // Market adjustment
    if (settings.adjustments.market?.enabled && market) {
      const marketStrength = this.assessMarketStrength(market);
      const marketAdj = settings.adjustments.market[marketStrength] || 0;
      if (marketAdj !== 0) {
        capRate += marketAdj;
        adjustmentDetails.push({
          description: `${marketStrength} market conditions`,
          impact: marketAdj,
        });
      }
    }

    return { capRate, adjustmentDetails };
  }

  /**
   * Get quality (star rating) adjustment
   */
  private getQualityAdjustment(stars: number, settings: QualityAdjustment): number {
    const rating = settings.ratings.find((r) => r.stars === Math.round(stars));
    return rating?.adjustment || 0;
  }

  /**
   * Get adjustment from bracket settings
   */
  private getBracketAdjustment<T extends Record<string, number>>(
    value: number,
    brackets: T[],
    minKey: keyof T,
    maxKey: keyof T
  ): number {
    const bracket = brackets.find(
      (b) => value >= (b[minKey] as number) && value < (b[maxKey] as number)
    );
    return (bracket as Record<string, number>)?.adjustment || 0;
  }

  /**
   * Assess market strength based on market data
   */
  private assessMarketStrength(market: MarketData): 'strongMarket' | 'averageMarket' | 'weakMarket' {
    // Simple scoring based on key metrics
    let score = 0;

    if (market.marketOccupancy > 0.88) score += 2;
    else if (market.marketOccupancy > 0.82) score += 1;

    if (market.demandGrowthRate > 0.03) score += 2;
    else if (market.demandGrowthRate > 0.01) score += 1;

    if (market.supplyGrowthRate < 0.01) score += 1;
    else if (market.supplyGrowthRate > 0.03) score -= 1;

    if (score >= 4) return 'strongMarket';
    if (score >= 2) return 'averageMarket';
    return 'weakMarket';
  }

  /**
   * Calculate confidence level based on input data quality
   */
  private calculateConfidence(input: CapRateInput): 'high' | 'medium' | 'low' {
    let score = 0;

    // Base confidence from having required data
    if (input.noi > 0) score += 2;
    if (input.facility.beds.operational > 0) score += 1;

    // Higher confidence with more data
    if (input.cmsData) score += 2;
    if (input.operatingMetrics) score += 1;
    if (input.marketData) score += 1;

    // Penalize unusual situations
    if (input.noi < 0) score -= 2; // Negative NOI
    if (input.operatingMetrics && input.operatingMetrics.occupancyRate < 70) score -= 1;

    if (score >= 6) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Get default settings for asset type
   */
  static getDefaultSettings(assetType: AssetType): CapRateSettings {
    return DEFAULT_CAP_RATE_SETTINGS[assetType];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const capRateCalculator = new CapRateCalculator();
