// =============================================================================
// COMPARABLE SALES VALUATION - Value based on similar property transactions
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';
import type { ValuationMethod, FacilityProfile, ComparableSale } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ComparableSalesInput {
  facility: FacilityProfile;
  comparables: ComparableSale[];
  settings?: ComparableSalesSettings;
}

export interface ComparableSalesSettings {
  // Selection criteria
  maxAgeDays: number; // Maximum age of comparable sale
  maxDistanceMiles: number; // Maximum distance
  minComparables: number; // Minimum required
  maxComparables: number; // Maximum to use

  // Weighting factors
  distanceWeight: number;
  recencyWeight: number;
  sizeWeight: number;
  qualityWeight: number;

  // Adjustment factors
  adjustments: {
    sizePerPercent: number; // Adjustment per 1% size difference
    agePerYear: number; // Adjustment per year of age difference
    qualityPerStar: number; // Adjustment per star rating difference
    occupancyPerPercent: number; // Adjustment per 1% occupancy difference
    conditionGood: number; // Premium for good condition
    conditionPoor: number; // Discount for poor condition
  };
}

export interface AdjustedComparable {
  original: ComparableSale;
  adjustments: {
    type: string;
    description: string;
    amount: number;
  }[];
  adjustedPricePerBed: number;
  weight: number;
  contribution: number;
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_SETTINGS: ComparableSalesSettings = {
  maxAgeDays: 730, // 2 years
  maxDistanceMiles: 250, // 250 miles
  minComparables: 3,
  maxComparables: 10,

  distanceWeight: 0.25,
  recencyWeight: 0.25,
  sizeWeight: 0.25,
  qualityWeight: 0.25,

  adjustments: {
    sizePerPercent: 0.002, // 0.2% adjustment per 1% size difference
    agePerYear: 0.01, // 1% per year
    qualityPerStar: 0.05, // 5% per star
    occupancyPerPercent: 0.003, // 0.3% per occupancy point
    conditionGood: 0.05, // 5% premium
    conditionPoor: -0.10, // 10% discount
  },
};

// =============================================================================
// COMPARABLE SALES CALCULATOR CLASS
// =============================================================================

export class ComparableSalesCalculator {
  /**
   * Calculate value using comparable sales method
   */
  calculate(input: ComparableSalesInput): ValuationMethod {
    const settings = input.settings || DEFAULT_SETTINGS;
    const { facility, comparables } = input;

    // Filter and validate comparables
    const validComparables = this.filterComparables(comparables, facility, settings);

    if (validComparables.length < settings.minComparables) {
      return {
        name: 'Comparable Sales',
        value: 0,
        confidence: 'low',
        weight: 0.10,
        weightedValue: 0,
        inputs: {
          comparablesFound: validComparables.length,
          minRequired: settings.minComparables,
        },
        adjustments: [
          {
            description: `Insufficient comparables (${validComparables.length}/${settings.minComparables})`,
            impact: 0,
          },
        ],
      };
    }

    // Calculate similarity scores and select top comparables
    const scoredComparables = this.scoreComparables(validComparables, facility, settings);
    const selectedComparables = scoredComparables.slice(0, settings.maxComparables);

    // Apply adjustments to each comparable
    const adjustedComparables = selectedComparables.map((comp) =>
      this.adjustComparable(comp, facility, settings)
    );

    // Calculate weighted average
    const totalWeight = adjustedComparables.reduce((sum, c) => sum + c.weight, 0);
    const weightedPPB = adjustedComparables.reduce((sum, c) => sum + c.contribution, 0) / totalWeight;

    // Calculate final value
    const value = weightedPPB * facility.beds.operational;

    // Determine confidence
    const confidence = this.calculateConfidence(adjustedComparables, settings);

    // Build adjustment details
    const adjustmentDetails: ValuationMethod['adjustments'] = adjustedComparables.map((ac) => ({
      description: `${ac.original.propertyName} (${ac.original.address.city}, ${ac.original.address.state}) - $${ac.adjustedPricePerBed.toLocaleString()}/bed @ ${(ac.weight * 100).toFixed(1)}% weight`,
      impact: ac.contribution,
    }));

    return {
      name: 'Comparable Sales',
      value,
      confidence,
      weight: 0.10,
      weightedValue: value * 0.10,
      inputs: {
        comparablesUsed: adjustedComparables.length,
        weightedPricePerBed: weightedPPB,
        beds: facility.beds.operational,
        minPPB: Math.min(...adjustedComparables.map((c) => c.adjustedPricePerBed)),
        maxPPB: Math.max(...adjustedComparables.map((c) => c.adjustedPricePerBed)),
      },
      adjustments: adjustmentDetails,
    };
  }

  /**
   * Filter comparables based on criteria
   */
  filterComparables(
    comparables: ComparableSale[],
    facility: FacilityProfile,
    settings: ComparableSalesSettings
  ): ComparableSale[] {
    const now = new Date();
    const maxAge = settings.maxAgeDays * 24 * 60 * 60 * 1000;

    return comparables.filter((comp) => {
      // Must be same asset type
      if (comp.assetType !== facility.assetType) return false;

      // Check age
      const saleDate = new Date(comp.saleDate);
      if (now.getTime() - saleDate.getTime() > maxAge) return false;

      // Check distance (if available)
      if (comp.distanceMiles && comp.distanceMiles > settings.maxDistanceMiles) return false;

      // Must have price per bed
      if (!comp.pricePerBed || comp.pricePerBed <= 0) return false;

      return true;
    });
  }

  /**
   * Score and rank comparables by similarity
   */
  scoreComparables(
    comparables: ComparableSale[],
    facility: FacilityProfile,
    settings: ComparableSalesSettings
  ): (ComparableSale & { similarityScore: number })[] {
    const now = new Date();

    return comparables
      .map((comp) => {
        let score = 0;

        // Distance score (closer is better)
        if (comp.distanceMiles !== undefined) {
          const distanceScore = 1 - comp.distanceMiles / settings.maxDistanceMiles;
          score += distanceScore * settings.distanceWeight;
        } else {
          score += 0.5 * settings.distanceWeight; // Default if no distance
        }

        // Recency score (newer is better)
        const saleDate = new Date(comp.saleDate);
        const daysSinceSale = (now.getTime() - saleDate.getTime()) / (24 * 60 * 60 * 1000);
        const recencyScore = 1 - daysSinceSale / settings.maxAgeDays;
        score += recencyScore * settings.recencyWeight;

        // Size score (similar size is better)
        const sizeDiff = Math.abs(comp.beds - facility.beds.operational) / facility.beds.operational;
        const sizeScore = Math.max(0, 1 - sizeDiff);
        score += sizeScore * settings.sizeWeight;

        // Quality score (similar rating is better)
        if (comp.cmsRating !== undefined) {
          // Would compare to facility's CMS rating if available
          const qualityScore = 0.8; // Default good match
          score += qualityScore * settings.qualityWeight;
        } else {
          score += 0.5 * settings.qualityWeight;
        }

        return { ...comp, similarityScore: score };
      })
      .sort((a, b) => b.similarityScore - a.similarityScore);
  }

  /**
   * Adjust a comparable sale for differences with subject
   */
  adjustComparable(
    comp: ComparableSale & { similarityScore: number },
    facility: FacilityProfile,
    settings: ComparableSalesSettings
  ): AdjustedComparable {
    const adjustments: AdjustedComparable['adjustments'] = [];
    let adjustedPPB = comp.pricePerBed;

    // Size adjustment
    const sizeDiffPercent = (facility.beds.operational - comp.beds) / comp.beds;
    if (Math.abs(sizeDiffPercent) > 0.05) {
      // Only adjust if > 5% different
      const sizeAdj = sizeDiffPercent * settings.adjustments.sizePerPercent * comp.pricePerBed;
      adjustedPPB += sizeAdj;
      adjustments.push({
        type: 'size',
        description: `Size adjustment (${Math.abs(sizeDiffPercent * 100).toFixed(0)}% ${sizeDiffPercent > 0 ? 'larger' : 'smaller'})`,
        amount: sizeAdj,
      });
    }

    // Age adjustment
    const compAge = new Date().getFullYear() - comp.yearBuilt;
    const subjectAge = new Date().getFullYear() - facility.yearBuilt;
    const ageDiff = subjectAge - compAge;
    if (Math.abs(ageDiff) > 2) {
      // Only adjust if > 2 years different
      const ageAdj = -ageDiff * settings.adjustments.agePerYear * comp.pricePerBed;
      adjustedPPB += ageAdj;
      adjustments.push({
        type: 'age',
        description: `Age adjustment (${Math.abs(ageDiff)} years ${ageDiff > 0 ? 'older' : 'newer'})`,
        amount: ageAdj,
      });
    }

    // Quality/CMS rating adjustment
    // Would need subject's CMS rating for proper comparison
    // For now, use a default based on comp's rating

    // Occupancy adjustment
    // Would need current occupancy data for both

    // Calculate weight based on similarity score
    const weight = comp.similarityScore;
    const contribution = adjustedPPB * weight;

    return {
      original: comp,
      adjustments,
      adjustedPricePerBed: adjustedPPB,
      weight,
      contribution,
    };
  }

  /**
   * Calculate confidence level
   */
  calculateConfidence(
    adjustedComparables: AdjustedComparable[],
    settings: ComparableSalesSettings
  ): 'high' | 'medium' | 'low' {
    const count = adjustedComparables.length;

    // Check count
    if (count < settings.minComparables) return 'low';

    // Calculate coefficient of variation
    const ppbValues = adjustedComparables.map((c) => c.adjustedPricePerBed);
    const mean = ppbValues.reduce((a, b) => a + b, 0) / ppbValues.length;
    const variance = ppbValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / ppbValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    // High confidence if many comps with low variance
    if (count >= 5 && cv < 0.15) return 'high';
    if (count >= 3 && cv < 0.25) return 'medium';
    return 'low';
  }

  /**
   * Get statistical summary of comparables
   */
  getSummary(comparables: ComparableSale[]): {
    count: number;
    avgPPB: number;
    medianPPB: number;
    minPPB: number;
    maxPPB: number;
    avgCapRate?: number;
  } {
    if (comparables.length === 0) {
      return { count: 0, avgPPB: 0, medianPPB: 0, minPPB: 0, maxPPB: 0 };
    }

    const ppbValues = comparables.map((c) => c.pricePerBed).sort((a, b) => a - b);
    const capRates = comparables.filter((c) => c.capRate).map((c) => c.capRate!);

    return {
      count: comparables.length,
      avgPPB: ppbValues.reduce((a, b) => a + b, 0) / ppbValues.length,
      medianPPB: ppbValues[Math.floor(ppbValues.length / 2)],
      minPPB: ppbValues[0],
      maxPPB: ppbValues[ppbValues.length - 1],
      avgCapRate: capRates.length > 0 ? capRates.reduce((a, b) => a + b, 0) / capRates.length : undefined,
    };
  }

  /**
   * Get default settings
   */
  static getDefaultSettings(): ComparableSalesSettings {
    return { ...DEFAULT_SETTINGS };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const comparableSalesCalculator = new ComparableSalesCalculator();
