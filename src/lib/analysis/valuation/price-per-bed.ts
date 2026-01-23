// =============================================================================
// PRICE PER BED VALUATION - Value = Beds × Price Per Bed
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';
import type { ValuationMethod, FacilityProfile, CMSData, OperatingMetrics, MarketData } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface PricePerBedInput {
  beds: number;
  facility: FacilityProfile;
  cmsData?: CMSData;
  operatingMetrics?: OperatingMetrics;
  marketData?: MarketData;
  settings?: PricePerBedSettings;
}

export interface PricePerBedSettings {
  basePricePerBed: number;
  adjustments: {
    quality?: { enabled: boolean; ratings: { stars: number; multiplier: number }[] };
    size?: { enabled: boolean; brackets: { minBeds: number; maxBeds: number; multiplier: number }[] };
    age?: { enabled: boolean; brackets: { minAge: number; maxAge: number; multiplier: number }[] };
    occupancy?: { enabled: boolean; brackets: { minOccupancy: number; maxOccupancy: number; multiplier: number }[] };
    location?: { enabled: boolean; urban: number; suburban: number; rural: number; frontier?: number };
    region?: { enabled: boolean; regions: Record<string, number> };
  };
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_SETTINGS: Record<AssetType, PricePerBedSettings> = {
  SNF: {
    basePricePerBed: 95000,
    adjustments: {
      quality: {
        enabled: true,
        ratings: [
          { stars: 5, multiplier: 1.25 },
          { stars: 4, multiplier: 1.10 },
          { stars: 3, multiplier: 1.00 },
          { stars: 2, multiplier: 0.90 },
          { stars: 1, multiplier: 0.75 },
        ],
      },
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 50, multiplier: 0.90 },
          { minBeds: 51, maxBeds: 80, multiplier: 0.95 },
          { minBeds: 81, maxBeds: 120, multiplier: 1.00 },
          { minBeds: 121, maxBeds: 180, multiplier: 1.05 },
          { minBeds: 181, maxBeds: Infinity, multiplier: 1.10 },
        ],
      },
      age: {
        enabled: true,
        brackets: [
          { minAge: 0, maxAge: 5, multiplier: 1.20 },
          { minAge: 6, maxAge: 15, multiplier: 1.10 },
          { minAge: 16, maxAge: 25, multiplier: 1.00 },
          { minAge: 26, maxAge: 35, multiplier: 0.90 },
          { minAge: 36, maxAge: Infinity, multiplier: 0.80 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, multiplier: 1.10 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, multiplier: 1.05 },
          { minOccupancy: 0.85, maxOccupancy: 0.90, multiplier: 1.00 },
          { minOccupancy: 0.80, maxOccupancy: 0.85, multiplier: 0.95 },
          { minOccupancy: 0.70, maxOccupancy: 0.80, multiplier: 0.85 },
          { minOccupancy: 0, maxOccupancy: 0.70, multiplier: 0.70 },
        ],
      },
      location: {
        enabled: true,
        urban: 1.15,
        suburban: 1.00,
        rural: 0.85,
      },
      region: {
        enabled: true,
        regions: {
          west: 1.15,
          northeast: 1.10,
          southeast: 0.95,
          midwest: 0.90,
          southwest: 0.95,
        },
      },
    },
  },
  ALF: {
    basePricePerBed: 150000,
    adjustments: {
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 30, multiplier: 0.85 },
          { minBeds: 31, maxBeds: 60, multiplier: 0.95 },
          { minBeds: 61, maxBeds: 100, multiplier: 1.00 },
          { minBeds: 101, maxBeds: Infinity, multiplier: 1.08 },
        ],
      },
      age: {
        enabled: true,
        brackets: [
          { minAge: 0, maxAge: 10, multiplier: 1.15 },
          { minAge: 11, maxAge: 20, multiplier: 1.00 },
          { minAge: 21, maxAge: 30, multiplier: 0.90 },
          { minAge: 31, maxAge: Infinity, multiplier: 0.75 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.93, maxOccupancy: 1.0, multiplier: 1.10 },
          { minOccupancy: 0.88, maxOccupancy: 0.93, multiplier: 1.05 },
          { minOccupancy: 0.82, maxOccupancy: 0.88, multiplier: 1.00 },
          { minOccupancy: 0.75, maxOccupancy: 0.82, multiplier: 0.90 },
          { minOccupancy: 0, maxOccupancy: 0.75, multiplier: 0.75 },
        ],
      },
      location: {
        enabled: true,
        urban: 1.20,
        suburban: 1.05,
        rural: 0.80,
      },
      region: {
        enabled: true,
        regions: {
          west: 1.20,
          northeast: 1.15,
          southeast: 0.90,
          midwest: 0.85,
          southwest: 0.90,
        },
      },
    },
  },
  ILF: {
    basePricePerBed: 200000,
    adjustments: {
      size: {
        enabled: true,
        brackets: [
          { minBeds: 0, maxBeds: 50, multiplier: 0.90 },
          { minBeds: 51, maxBeds: 100, multiplier: 0.95 },
          { minBeds: 101, maxBeds: 200, multiplier: 1.00 },
          { minBeds: 201, maxBeds: Infinity, multiplier: 1.05 },
        ],
      },
      age: {
        enabled: true,
        brackets: [
          { minAge: 0, maxAge: 10, multiplier: 1.15 },
          { minAge: 11, maxAge: 20, multiplier: 1.00 },
          { minAge: 21, maxAge: Infinity, multiplier: 0.85 },
        ],
      },
      occupancy: {
        enabled: true,
        brackets: [
          { minOccupancy: 0.95, maxOccupancy: 1.0, multiplier: 1.08 },
          { minOccupancy: 0.90, maxOccupancy: 0.95, multiplier: 1.03 },
          { minOccupancy: 0.85, maxOccupancy: 0.90, multiplier: 1.00 },
          { minOccupancy: 0, maxOccupancy: 0.85, multiplier: 0.92 },
        ],
      },
      location: {
        enabled: true,
        urban: 1.25,
        suburban: 1.05,
        rural: 0.75,
      },
      region: {
        enabled: true,
        regions: {
          west: 1.25,
          northeast: 1.15,
          southeast: 0.85,
          midwest: 0.80,
          southwest: 0.85,
        },
      },
    },
  },
};

// =============================================================================
// PRICE PER BED CALCULATOR CLASS
// =============================================================================

export class PricePerBedCalculator {
  /**
   * Calculate value using price per bed method
   */
  calculate(input: PricePerBedInput): ValuationMethod {
    const settings = input.settings || DEFAULT_SETTINGS[input.facility.assetType];
    const { beds, facility, cmsData, operatingMetrics } = input;

    // Calculate adjusted price per bed
    const { pricePerBed, adjustmentDetails } = this.calculateAdjustedPPB(
      settings,
      facility,
      cmsData,
      operatingMetrics
    );

    // Calculate value
    const value = beds * pricePerBed;

    // Determine confidence
    const confidence = this.calculateConfidence(input);

    return {
      name: 'Price Per Bed',
      value,
      confidence,
      weight: 0.20,
      weightedValue: value * 0.20,
      inputs: {
        beds,
        basePricePerBed: settings.basePricePerBed,
        adjustedPricePerBed: pricePerBed,
      },
      adjustments: adjustmentDetails,
    };
  }

  /**
   * Calculate adjusted price per bed with all multipliers
   */
  calculateAdjustedPPB(
    settings: PricePerBedSettings,
    facility: FacilityProfile,
    cmsData?: CMSData,
    operations?: OperatingMetrics
  ): { pricePerBed: number; adjustmentDetails: ValuationMethod['adjustments'] } {
    let pricePerBed = settings.basePricePerBed;
    let combinedMultiplier = 1.0;
    const adjustmentDetails: ValuationMethod['adjustments'] = [];

    // Quality adjustment (CMS stars)
    if (settings.adjustments.quality?.enabled && cmsData) {
      const rating = settings.adjustments.quality.ratings.find(
        (r) => r.stars === Math.round(cmsData.overallRating)
      );
      if (rating && rating.multiplier !== 1.0) {
        combinedMultiplier *= rating.multiplier;
        adjustmentDetails.push({
          description: `CMS ${cmsData.overallRating}-star quality`,
          impact: (rating.multiplier - 1) * settings.basePricePerBed,
        });
      }
    }

    // Size adjustment
    if (settings.adjustments.size?.enabled) {
      const beds = facility.beds.operational;
      const bracket = settings.adjustments.size.brackets.find(
        (b) => beds >= b.minBeds && beds < b.maxBeds
      );
      if (bracket && bracket.multiplier !== 1.0) {
        combinedMultiplier *= bracket.multiplier;
        adjustmentDetails.push({
          description: `${beds} beds (size factor)`,
          impact: (bracket.multiplier - 1) * settings.basePricePerBed,
        });
      }
    }

    // Age adjustment
    if (settings.adjustments.age?.enabled) {
      const age = new Date().getFullYear() - facility.yearBuilt;
      const bracket = settings.adjustments.age.brackets.find(
        (b) => age >= b.minAge && age < b.maxAge
      );
      if (bracket && bracket.multiplier !== 1.0) {
        combinedMultiplier *= bracket.multiplier;
        adjustmentDetails.push({
          description: `${age} years old`,
          impact: (bracket.multiplier - 1) * settings.basePricePerBed,
        });
      }
    }

    // Occupancy adjustment
    if (settings.adjustments.occupancy?.enabled && operations) {
      const occ = operations.occupancyRate / 100;
      const bracket = settings.adjustments.occupancy.brackets.find(
        (b) => occ >= b.minOccupancy && occ < b.maxOccupancy
      );
      if (bracket && bracket.multiplier !== 1.0) {
        combinedMultiplier *= bracket.multiplier;
        adjustmentDetails.push({
          description: `${(occ * 100).toFixed(1)}% occupancy`,
          impact: (bracket.multiplier - 1) * settings.basePricePerBed,
        });
      }
    }

    // Location adjustment
    if (settings.adjustments.location?.enabled) {
      const locMultiplier = settings.adjustments.location[facility.locationType] || 1.0;
      if (locMultiplier !== 1.0) {
        combinedMultiplier *= locMultiplier;
        adjustmentDetails.push({
          description: `${facility.locationType} location`,
          impact: (locMultiplier - 1) * settings.basePricePerBed,
        });
      }
    }

    // Region adjustment
    if (settings.adjustments.region?.enabled) {
      const regionMultiplier = settings.adjustments.region.regions[facility.region] || 1.0;
      if (regionMultiplier !== 1.0) {
        combinedMultiplier *= regionMultiplier;
        adjustmentDetails.push({
          description: `${facility.region} region`,
          impact: (regionMultiplier - 1) * settings.basePricePerBed,
        });
      }
    }

    pricePerBed = settings.basePricePerBed * combinedMultiplier;

    return { pricePerBed, adjustmentDetails };
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(input: PricePerBedInput): 'high' | 'medium' | 'low' {
    let score = 0;

    if (input.beds > 0) score += 2;
    if (input.facility.yearBuilt > 0) score += 1;
    if (input.cmsData) score += 2;
    if (input.operatingMetrics) score += 1;
    if (input.marketData) score += 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Get market price per bed for comparison
   */
  static getMarketPPB(assetType: AssetType): { low: number; mid: number; high: number } {
    const ranges: Record<AssetType, { low: number; mid: number; high: number }> = {
      SNF: { low: 60000, mid: 95000, high: 150000 },
      ALF: { low: 100000, mid: 150000, high: 250000 },
      ILF: { low: 150000, mid: 200000, high: 350000 },
    };
    return ranges[assetType];
  }

  /**
   * Get default settings for asset type
   */
  static getDefaultSettings(assetType: AssetType): PricePerBedSettings {
    return DEFAULT_SETTINGS[assetType];
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const pricePerBedCalculator = new PricePerBedCalculator();
