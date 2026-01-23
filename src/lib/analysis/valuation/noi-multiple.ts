// =============================================================================
// NOI MULTIPLE VALUATION - Value = NOI × Multiple
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';
import type { ValuationMethod, FacilityProfile, CMSData, OperatingMetrics, MarketData } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface NOIMultipleInput {
  noi: number;
  facility: FacilityProfile;
  cmsData?: CMSData;
  operatingMetrics?: OperatingMetrics;
  marketData?: MarketData;
  settings?: NOIMultipleSettings;
}

export interface NOIMultipleSettings {
  baseMultiple: number;
  adjustments: {
    quality?: { enabled: boolean; ratings: { stars: number; adjustment: number }[] };
    size?: { enabled: boolean; brackets: { minBeds: number; maxBeds: number; adjustment: number }[] };
    occupancy?: { enabled: boolean; brackets: { minOccupancy: number; maxOccupancy: number; adjustment: number }[] };
    noiStability?: { enabled: boolean; stableThreshold: number; bonus: number; penalty: number };
    market?: { enabled: boolean; strongMarket: number; averageMarket: number; weakMarket: number };
  };
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_SETTINGS: Record<AssetType, NOIMultipleSettings> = {
  SNF: {
    baseMultiple: 10.0, // 10x NOI (equivalent to 10% cap rate)
    adjustments: {
      quality: {
        enabled: true,
        ratings: [
          { stars: 5, adjustment: 2.0 },
          { stars: 4, adjustment: 1.0 },
          { stars: 3, adjustment: 0 },
          { stars: 2, adjustment: -1.0 },
          { stars: 1, adjustment: -2.0 },
        ],
      },
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 60, adjustment: -1.0 },
          { minBeds: 61, maxBeds: 100, adjustment: -0.5 },
          { minBeds: 101, maxBeds: 150, adjustment: 0 },
          { minBeds: 151, maxBeds: 200, adjustment: 0.5 },
          { minBeds: 201, maxBeds: Infinity, adjustment: 1.0 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, adjustment: 1.0 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, adjustment: 0.5 },
          { minOccupancy: 0.85, maxOccupancy: 0.90, adjustment: 0 },
          { minOccupancy: 0.80, maxOccupancy: 0.85, adjustment: -0.5 },
          { minOccupancy: 0.75, maxOccupancy: 0.80, adjustment: -1.0 },
          { minOccupancy: 0, maxOccupancy: 0.75, adjustment: -2.0 },
        ],
      },
      noiStability: {
        enabled: true,
        stableThreshold: 0.05, // Less than 5% variance is considered stable
        bonus: 0.5,
        penalty: -1.0,
      },
      market: {
        enabled: true,
        strongMarket: 1.0,
        averageMarket: 0,
        weakMarket: -1.0,
      },
    },
  },
  ALF: {
    baseMultiple: 14.0, // Higher multiple for ALF
    adjustments: {
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 40, adjustment: -1.5 },
          { minBeds: 41, maxBeds: 80, adjustment: -0.5 },
          { minBeds: 81, maxBeds: 120, adjustment: 0 },
          { minBeds: 121, maxBeds: Infinity, adjustment: 0.5 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, adjustment: 1.0 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, adjustment: 0.5 },
          { minOccupancy: 0.85, maxOccupancy: 0.90, adjustment: 0 },
          { minOccupancy: 0, maxOccupancy: 0.85, adjustment: -1.0 },
        ],
      },
      market: {
        enabled: true,
        strongMarket: 1.5,
        averageMarket: 0,
        weakMarket: -1.5,
      },
    },
  },
  ILF: {
    baseMultiple: 16.0, // Highest multiple for ILF
    adjustments: {
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 75, adjustment: -1.0 },
          { minBeds: 76, maxBeds: 150, adjustment: 0 },
          { minBeds: 151, maxBeds: Infinity, adjustment: 0.5 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, adjustment: 0.5 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, adjustment: 0 },
          { minOccupancy: 0, maxOccupancy: 0.90, adjustment: -0.5 },
        ],
      },
      market: {
        enabled: true,
        strongMarket: 1.0,
        averageMarket: 0,
        weakMarket: -1.0,
      },
    },
  },
};

// =============================================================================
// NOI MULTIPLE CALCULATOR CLASS
// =============================================================================

export class NOIMultipleCalculator {
  /**
   * Calculate value using NOI multiple method
   */
  calculate(input: NOIMultipleInput): ValuationMethod {
    const settings = input.settings || DEFAULT_SETTINGS[input.facility.assetType];
    const { noi, facility, cmsData, operatingMetrics, marketData } = input;

    // Calculate adjusted multiple
    const { multiple, adjustmentDetails } = this.calculateAdjustedMultiple(
      settings,
      facility,
      cmsData,
      operatingMetrics,
      marketData
    );

    // Calculate value
    const value = noi * multiple;

    // Implied cap rate (for reference)
    const impliedCapRate = noi > 0 ? noi / value : 0;

    // Determine confidence
    const confidence = this.calculateConfidence(input);

    return {
      name: 'NOI Multiple',
      value,
      confidence,
      weight: 0.15,
      weightedValue: value * 0.15,
      inputs: {
        noi,
        baseMultiple: settings.baseMultiple,
        adjustedMultiple: multiple,
        impliedCapRate,
      },
      adjustments: adjustmentDetails,
    };
  }

  /**
   * Calculate adjusted NOI multiple with all adjustments
   */
  calculateAdjustedMultiple(
    settings: NOIMultipleSettings,
    facility: FacilityProfile,
    cmsData?: CMSData,
    operations?: OperatingMetrics,
    market?: MarketData
  ): { multiple: number; adjustmentDetails: ValuationMethod['adjustments'] } {
    let multiple = settings.baseMultiple;
    const adjustmentDetails: ValuationMethod['adjustments'] = [];

    // Quality adjustment (CMS stars)
    if (settings.adjustments.quality?.enabled && cmsData) {
      const rating = settings.adjustments.quality.ratings.find(
        (r) => r.stars === Math.round(cmsData.overallRating)
      );
      if (rating && rating.adjustment !== 0) {
        multiple += rating.adjustment;
        adjustmentDetails.push({
          description: `CMS ${cmsData.overallRating}-star rating`,
          impact: rating.adjustment,
        });
      }
    }

    // Size adjustment
    if (settings.adjustments.size?.enabled) {
      const beds = facility.beds.operational;
      const bracket = settings.adjustments.size.brackets.find(
        (b) => beds >= b.minBeds && beds < b.maxBeds
      );
      if (bracket && bracket.adjustment !== 0) {
        multiple += bracket.adjustment;
        adjustmentDetails.push({
          description: `${beds} beds (size factor)`,
          impact: bracket.adjustment,
        });
      }
    }

    // Occupancy adjustment
    if (settings.adjustments.occupancy?.enabled && operations) {
      const occ = operations.occupancyRate / 100;
      const bracket = settings.adjustments.occupancy.brackets.find(
        (b) => occ >= b.minOccupancy && occ < b.maxOccupancy
      );
      if (bracket && bracket.adjustment !== 0) {
        multiple += bracket.adjustment;
        adjustmentDetails.push({
          description: `${(occ * 100).toFixed(1)}% occupancy`,
          impact: bracket.adjustment,
        });
      }
    }

    // Market adjustment
    if (settings.adjustments.market?.enabled && market) {
      const marketStrength = this.assessMarketStrength(market);
      const marketAdj = settings.adjustments.market[marketStrength] || 0;
      if (marketAdj !== 0) {
        multiple += marketAdj;
        adjustmentDetails.push({
          description: `${marketStrength.replace('Market', '')} market conditions`,
          impact: marketAdj,
        });
      }
    }

    // Ensure multiple doesn't go below reasonable floor
    multiple = Math.max(multiple, 5.0);

    return { multiple, adjustmentDetails };
  }

  /**
   * Assess market strength
   */
  private assessMarketStrength(market: MarketData): 'strongMarket' | 'averageMarket' | 'weakMarket' {
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
   * Calculate confidence level
   */
  private calculateConfidence(input: NOIMultipleInput): 'high' | 'medium' | 'low' {
    let score = 0;

    if (input.noi > 0) score += 2;
    if (input.cmsData) score += 2;
    if (input.operatingMetrics) score += 1;
    if (input.marketData) score += 1;

    if (input.noi < 0) score -= 2;

    if (score >= 4) return 'high';
    if (score >= 2) return 'medium';
    return 'low';
  }

  /**
   * Convert between cap rate and NOI multiple
   */
  static capRateToMultiple(capRate: number): number {
    return 1 / capRate;
  }

  static multipleToCapRate(multiple: number): number {
    return 1 / multiple;
  }

  /**
   * Get default settings for asset type
   */
  static getDefaultSettings(assetType: AssetType): NOIMultipleSettings {
    return DEFAULT_SETTINGS[assetType];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const noiMultipleCalculator = new NOIMultipleCalculator();
