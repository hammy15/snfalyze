/**
 * Cap Rate Valuation Method
 *
 * Value = NOI / Cap Rate
 *
 * Most common valuation method for income-producing properties.
 */

import {
  ValuationInput,
  ValuationResult,
  ValuationAssumption,
  ValuationCalculation,
  DEFAULT_MARKET_DATA,
  CAP_RATE_BY_RATING,
} from './types';

export interface CapRateOptions {
  targetCapRate?: number;
  capRateLow?: number;
  capRateHigh?: number;
  useMarketData?: boolean;
}

/**
 * Determine appropriate cap rate based on property characteristics
 */
export function determineCapRate(
  input: ValuationInput,
  options: CapRateOptions = {}
): { rate: number; low: number; high: number; source: string } {
  // If explicit cap rate provided, use it
  if (options.targetCapRate) {
    const spread = 0.01; // 100 bps spread
    return {
      rate: options.targetCapRate,
      low: options.capRateLow ?? options.targetCapRate - spread,
      high: options.capRateHigh ?? options.targetCapRate + spread,
      source: 'provided',
    };
  }

  // If market cap rate provided in input
  if (input.marketCapRate) {
    const spread = 0.01;
    return {
      rate: input.marketCapRate,
      low: input.marketCapRate - spread,
      high: input.marketCapRate + spread,
      source: 'market',
    };
  }

  // Use CMS rating if available
  if (input.cmsRating && CAP_RATE_BY_RATING[input.cmsRating]) {
    const { low, high } = CAP_RATE_BY_RATING[input.cmsRating];
    const rate = (low + high) / 2;
    return { rate, low, high, source: 'cms_rating' };
  }

  // Fall back to asset type defaults
  const defaults = DEFAULT_MARKET_DATA[input.assetType];
  const rate = defaults.avgCapRate || 0.125;
  return {
    rate,
    low: rate - 0.015,
    high: rate + 0.015,
    source: 'asset_type_default',
  };
}

/**
 * Calculate value using cap rate method
 */
export function calculateCapRateValue(
  input: ValuationInput,
  options: CapRateOptions = {}
): ValuationResult {
  const assumptions: ValuationAssumption[] = [];
  const calculations: ValuationCalculation[] = [];

  // Validate NOI
  if (!input.noi && !input.ebitdar && !input.revenue) {
    throw new Error('Cap rate valuation requires NOI, EBITDAR, or Revenue');
  }

  // Determine NOI to use
  let noi = input.noi;
  let noiSource: 'provided' | 'derived' = 'provided';

  if (!noi && input.ebitdar) {
    // Assume rent is 6% of revenue or use a fixed estimate
    const estimatedRent = input.revenue ? input.revenue * 0.06 : 0;
    noi = input.ebitdar - estimatedRent;
    noiSource = 'derived';
    assumptions.push({
      field: 'noi',
      value: noi,
      source: 'derived',
      description: 'NOI derived from EBITDAR less estimated rent',
    });
    calculations.push({
      label: 'NOI from EBITDAR',
      formula: 'EBITDAR - Estimated Rent (6% of Revenue)',
      value: noi,
      details: `${input.ebitdar.toLocaleString()} - ${estimatedRent.toLocaleString()} = ${noi.toLocaleString()}`,
    });
  } else if (noi) {
    assumptions.push({
      field: 'noi',
      value: noi,
      source: 'provided',
      description: 'NOI provided directly',
    });
  }

  if (!noi || noi <= 0) {
    throw new Error('Valid NOI is required for cap rate valuation');
  }

  // Determine cap rate
  const capRateResult = determineCapRate(input, options);
  assumptions.push({
    field: 'capRate',
    value: (capRateResult.rate * 100).toFixed(2) + '%',
    source: capRateResult.source as 'provided' | 'market' | 'derived' | 'assumed',
    description: `Cap rate determined from ${capRateResult.source.replace(/_/g, ' ')}`,
  });

  // Calculate values
  const valueBase = noi / capRateResult.rate;
  const valueLow = noi / capRateResult.high; // Higher cap = lower value
  const valueHigh = noi / capRateResult.low; // Lower cap = higher value

  calculations.push({
    label: 'Base Value',
    formula: 'NOI / Cap Rate',
    value: valueBase,
    details: `${noi.toLocaleString()} / ${(capRateResult.rate * 100).toFixed(2)}% = $${valueBase.toLocaleString()}`,
  });

  calculations.push({
    label: 'Value Low (High Cap)',
    formula: `NOI / ${(capRateResult.high * 100).toFixed(2)}%`,
    value: valueLow,
  });

  calculations.push({
    label: 'Value High (Low Cap)',
    formula: `NOI / ${(capRateResult.low * 100).toFixed(2)}%`,
    value: valueHigh,
  });

  // Calculate per-bed metrics
  const pricePerBed = valueBase / input.beds;
  calculations.push({
    label: 'Price Per Bed',
    formula: 'Value / Beds',
    value: pricePerBed,
    details: `$${valueBase.toLocaleString()} / ${input.beds} = $${pricePerBed.toLocaleString()}`,
  });

  // Determine confidence based on data quality
  let confidence = 80;

  // Adjust confidence based on data quality
  if (noiSource === 'derived') confidence -= 10;
  if (capRateResult.source === 'provided') confidence += 10;
  if (capRateResult.source === 'asset_type_default') confidence -= 10;
  if (input.cmsRating && input.cmsRating >= 4) confidence += 5;
  if (input.occupancy && input.occupancy >= 0.85) confidence += 5;

  // Clamp confidence
  confidence = Math.max(40, Math.min(100, confidence));

  return {
    method: 'cap_rate',
    value: Math.round(valueBase),
    valueLow: Math.round(valueLow),
    valueHigh: Math.round(valueHigh),
    confidence,
    assumptions,
    calculations,
    notes: `Cap rate valuation using ${(capRateResult.rate * 100).toFixed(2)}% cap rate based on ${capRateResult.source.replace(/_/g, ' ')}`,
    inputsUsed: {
      noi,
      beds: input.beds,
      assetType: input.assetType,
      state: input.state,
      cmsRating: input.cmsRating,
    },
  };
}

/**
 * Generate cap rate sensitivity analysis
 */
export function capRateSensitivity(
  noi: number,
  baseCap: number,
  spread: number = 0.01,
  steps: number = 5
): { capRate: number; value: number }[] {
  const results: { capRate: number; value: number }[] = [];
  const stepSize = spread / Math.floor(steps / 2);

  for (let i = -Math.floor(steps / 2); i <= Math.floor(steps / 2); i++) {
    const capRate = baseCap + i * stepSize;
    if (capRate > 0) {
      results.push({
        capRate,
        value: Math.round(noi / capRate),
      });
    }
  }

  return results;
}
