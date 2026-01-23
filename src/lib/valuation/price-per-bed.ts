/**
 * Price Per Bed Valuation Method
 *
 * Value = Beds × Market Price Per Bed
 *
 * Common rule-of-thumb valuation for senior housing.
 */

import {
  ValuationInput,
  ValuationResult,
  ValuationAssumption,
  ValuationCalculation,
  DEFAULT_MARKET_DATA,
  AssetType,
} from './types';

// State-level PPB adjustments (multiplier from national average)
const STATE_PPB_ADJUSTMENTS: Record<string, number> = {
  CA: 1.35,
  NY: 1.25,
  NJ: 1.20,
  MA: 1.15,
  CT: 1.15,
  WA: 1.10,
  CO: 1.10,
  FL: 1.05,
  TX: 0.95,
  OH: 0.90,
  PA: 0.95,
  IL: 0.95,
  GA: 0.92,
  NC: 0.93,
  AZ: 1.00,
  MI: 0.88,
  TN: 0.90,
  IN: 0.85,
  MO: 0.85,
  WI: 0.88,
  // Default for unlisted states
};

// Age adjustment (per year over 30 years old)
const AGE_DISCOUNT_PER_YEAR = 0.005; // 0.5% per year
const MAX_AGE_DISCOUNT = 0.20; // Max 20% discount for age

// CMS rating adjustments
const RATING_ADJUSTMENTS: Record<number, number> = {
  5: 1.15,
  4: 1.05,
  3: 1.00,
  2: 0.90,
  1: 0.75,
};

export interface PricePerBedOptions {
  marketPPB?: number;
  ppbLow?: number;
  ppbHigh?: number;
  adjustForAge?: boolean;
  adjustForRating?: boolean;
  adjustForState?: boolean;
  adjustForOccupancy?: boolean;
}

/**
 * Determine market price per bed based on property characteristics
 */
export function determineMarketPPB(
  input: ValuationInput,
  options: PricePerBedOptions = {}
): { ppb: number; low: number; high: number; adjustments: string[] } {
  const adjustments: string[] = [];

  // Start with provided or default PPB
  let basePPB = options.marketPPB || input.marketPricePerBed;

  if (!basePPB) {
    const defaults = DEFAULT_MARKET_DATA[input.assetType];
    basePPB = defaults.avgPricePerBed || 85000;
    adjustments.push(`Base: National ${input.assetType} average ($${basePPB.toLocaleString()})`);
  } else {
    adjustments.push(`Base: Provided market PPB ($${basePPB.toLocaleString()})`);
  }

  let adjustedPPB = basePPB;

  // State adjustment
  if (options.adjustForState !== false) {
    const stateMultiplier = STATE_PPB_ADJUSTMENTS[input.state] || 1.0;
    if (stateMultiplier !== 1.0) {
      adjustedPPB *= stateMultiplier;
      adjustments.push(`State (${input.state}): ${stateMultiplier > 1 ? '+' : ''}${((stateMultiplier - 1) * 100).toFixed(0)}%`);
    }
  }

  // Age adjustment
  if (options.adjustForAge !== false && input.yearBuilt) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - input.yearBuilt;
    if (age > 30) {
      const ageDiscount = Math.min((age - 30) * AGE_DISCOUNT_PER_YEAR, MAX_AGE_DISCOUNT);
      adjustedPPB *= (1 - ageDiscount);
      adjustments.push(`Age (${age} years): -${(ageDiscount * 100).toFixed(1)}%`);
    }
  }

  // CMS rating adjustment
  if (options.adjustForRating !== false && input.cmsRating) {
    const ratingMultiplier = RATING_ADJUSTMENTS[input.cmsRating] || 1.0;
    if (ratingMultiplier !== 1.0) {
      adjustedPPB *= ratingMultiplier;
      adjustments.push(`CMS Rating (${input.cmsRating}-star): ${ratingMultiplier > 1 ? '+' : ''}${((ratingMultiplier - 1) * 100).toFixed(0)}%`);
    }
  }

  // Occupancy adjustment
  if (options.adjustForOccupancy !== false && input.occupancy) {
    const avgOccupancy = DEFAULT_MARKET_DATA[input.assetType].avgOccupancy || 0.85;
    const occupancyDiff = input.occupancy - avgOccupancy;
    if (Math.abs(occupancyDiff) > 0.05) {
      // Adjust by 2% for every 1% occupancy difference
      const occupancyAdjustment = occupancyDiff * 2;
      adjustedPPB *= (1 + occupancyAdjustment);
      adjustments.push(`Occupancy (${(input.occupancy * 100).toFixed(0)}%): ${occupancyAdjustment > 0 ? '+' : ''}${(occupancyAdjustment * 100).toFixed(1)}%`);
    }
  }

  // Calculate range (±15% from adjusted)
  const low = options.ppbLow || adjustedPPB * 0.85;
  const high = options.ppbHigh || adjustedPPB * 1.15;

  return {
    ppb: Math.round(adjustedPPB),
    low: Math.round(low),
    high: Math.round(high),
    adjustments,
  };
}

/**
 * Calculate value using price per bed method
 */
export function calculatePricePerBedValue(
  input: ValuationInput,
  options: PricePerBedOptions = {}
): ValuationResult {
  const assumptions: ValuationAssumption[] = [];
  const calculations: ValuationCalculation[] = [];

  // Validate beds
  if (!input.beds || input.beds <= 0) {
    throw new Error('Price per bed valuation requires valid bed count');
  }

  // Determine market PPB
  const ppbResult = determineMarketPPB(input, options);

  assumptions.push({
    field: 'pricePerBed',
    value: `$${ppbResult.ppb.toLocaleString()}`,
    source: options.marketPPB ? 'provided' : 'market',
    description: 'Adjusted price per bed',
  });

  // Log adjustments
  ppbResult.adjustments.forEach((adj, idx) => {
    calculations.push({
      label: idx === 0 ? 'PPB Calculation' : `  Adjustment ${idx}`,
      value: 0, // placeholder
      details: adj,
    });
  });

  // Calculate values
  const valueBase = input.beds * ppbResult.ppb;
  const valueLow = input.beds * ppbResult.low;
  const valueHigh = input.beds * ppbResult.high;

  calculations.push({
    label: 'Base Value',
    formula: 'Beds × Price Per Bed',
    value: valueBase,
    details: `${input.beds} × $${ppbResult.ppb.toLocaleString()} = $${valueBase.toLocaleString()}`,
  });

  calculations.push({
    label: 'Value Low',
    formula: `${input.beds} × $${ppbResult.low.toLocaleString()}`,
    value: valueLow,
  });

  calculations.push({
    label: 'Value High',
    formula: `${input.beds} × $${ppbResult.high.toLocaleString()}`,
    value: valueHigh,
  });

  // Calculate implied cap rate if NOI is available
  if (input.noi && input.noi > 0) {
    const impliedCapRate = input.noi / valueBase;
    calculations.push({
      label: 'Implied Cap Rate',
      formula: 'NOI / Value',
      value: impliedCapRate,
      details: `$${input.noi.toLocaleString()} / $${valueBase.toLocaleString()} = ${(impliedCapRate * 100).toFixed(2)}%`,
    });
  }

  // Determine confidence
  let confidence = 70;

  if (options.marketPPB) confidence += 10;
  if (input.cmsRating) confidence += 5;
  if (input.occupancy) confidence += 5;
  if (input.yearBuilt) confidence += 5;
  if (input.state && STATE_PPB_ADJUSTMENTS[input.state]) confidence += 5;

  confidence = Math.max(40, Math.min(100, confidence));

  return {
    method: 'price_per_bed',
    value: Math.round(valueBase),
    valueLow: Math.round(valueLow),
    valueHigh: Math.round(valueHigh),
    confidence,
    assumptions,
    calculations,
    notes: `Price per bed valuation using $${ppbResult.ppb.toLocaleString()}/bed with ${ppbResult.adjustments.length - 1} adjustments`,
    inputsUsed: {
      beds: input.beds,
      assetType: input.assetType,
      state: input.state,
      yearBuilt: input.yearBuilt,
      cmsRating: input.cmsRating,
      occupancy: input.occupancy,
    },
  };
}
