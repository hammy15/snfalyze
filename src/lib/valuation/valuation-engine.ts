/**
 * Valuation Engine
 *
 * Orchestrates multiple valuation methods and provides summary analysis.
 */

import {
  ValuationInput,
  ValuationResult,
  ValuationSummary,
  ValuationMethod,
  ComparableSale,
} from './types';
import { calculateCapRateValue, capRateSensitivity } from './cap-rate';
import { calculatePricePerBedValue } from './price-per-bed';
import { calculateComparableSalesValue } from './comparable-sales';
import { calculateDCFValue } from './dcf';

export interface ValuationEngineOptions {
  methods?: ValuationMethod[];
  comparables?: ComparableSale[];
  weights?: Partial<Record<ValuationMethod, number>>;
  includeAllMethods?: boolean;
}

// Default method weights
const DEFAULT_WEIGHTS: Record<ValuationMethod, number> = {
  cap_rate: 0.35,
  price_per_bed: 0.20,
  comparable_sales: 0.25,
  dcf: 0.15,
  noi_multiple: 0.05,
  proprietary: 0.00,
};

/**
 * Run a single valuation method
 */
function runMethod(
  method: ValuationMethod,
  input: ValuationInput,
  options: ValuationEngineOptions
): ValuationResult | null {
  try {
    switch (method) {
      case 'cap_rate':
        if (!input.noi && !input.ebitdar) return null;
        return calculateCapRateValue(input);

      case 'price_per_bed':
        return calculatePricePerBedValue(input);

      case 'comparable_sales':
        if (!options.comparables || options.comparables.length < 3) return null;
        return calculateComparableSalesValue(input, {
          comparables: options.comparables,
        });

      case 'dcf':
        if (!input.noi && !input.ebitdar) return null;
        return calculateDCFValue(input);

      case 'noi_multiple':
        if (!input.noi || !input.noiMultiple) return null;
        return calculateNOIMultipleValue(input);

      case 'proprietary':
        // Placeholder for custom algorithms
        return null;

      default:
        return null;
    }
  } catch (error) {
    console.warn(`Valuation method ${method} failed:`, error);
    return null;
  }
}

/**
 * Simple NOI Multiple calculation
 */
function calculateNOIMultipleValue(input: ValuationInput): ValuationResult {
  if (!input.noi || !input.noiMultiple) {
    throw new Error('NOI multiple valuation requires NOI and multiple');
  }

  const valueBase = input.noi * input.noiMultiple;
  const valueLow = input.noi * (input.noiMultiple - 0.5);
  const valueHigh = input.noi * (input.noiMultiple + 0.5);

  return {
    method: 'noi_multiple',
    value: Math.round(valueBase),
    valueLow: Math.round(valueLow),
    valueHigh: Math.round(valueHigh),
    confidence: 65,
    assumptions: [
      {
        field: 'noiMultiple',
        value: input.noiMultiple,
        source: 'provided',
        description: 'NOI multiplier',
      },
    ],
    calculations: [
      {
        label: 'Value',
        formula: 'NOI × Multiple',
        value: valueBase,
        details: `$${input.noi.toLocaleString()} × ${input.noiMultiple} = $${valueBase.toLocaleString()}`,
      },
    ],
    notes: `NOI multiple valuation using ${input.noiMultiple}x multiple`,
    inputsUsed: {
      noi: input.noi,
      beds: input.beds,
    },
  };
}

/**
 * Run all applicable valuation methods
 */
export function runValuation(
  input: ValuationInput,
  options: ValuationEngineOptions = {}
): ValuationSummary {
  const methodsToRun = options.methods || (
    options.includeAllMethods
      ? ['cap_rate', 'price_per_bed', 'comparable_sales', 'dcf', 'noi_multiple'] as ValuationMethod[]
      : ['cap_rate', 'price_per_bed', 'dcf'] as ValuationMethod[]
  );

  const results: ValuationResult[] = [];

  // Run each method
  for (const method of methodsToRun) {
    const result = runMethod(method, input, options);
    if (result) {
      results.push(result);
    }
  }

  if (results.length === 0) {
    throw new Error('No valuation methods could be applied with the provided inputs');
  }

  // Calculate weighted average
  const weights = { ...DEFAULT_WEIGHTS, ...options.weights };

  let weightedSum = 0;
  let totalWeight = 0;
  let minValue = Infinity;
  let maxValue = -Infinity;
  let confidenceSum = 0;

  for (const result of results) {
    const methodWeight = weights[result.method] || 0.1;
    const adjustedWeight = methodWeight * (result.confidence / 100);

    weightedSum += result.value * adjustedWeight;
    totalWeight += adjustedWeight;
    confidenceSum += result.confidence * adjustedWeight;

    minValue = Math.min(minValue, result.valueLow || result.value);
    maxValue = Math.max(maxValue, result.valueHigh || result.value);
  }

  const weightedAverage = totalWeight > 0 ? weightedSum / totalWeight : results[0].value;
  const avgConfidence = totalWeight > 0 ? confidenceSum / totalWeight : results[0].confidence;

  // Determine recommended value (weighted average rounded to nearest $100K)
  const recommendedValue = Math.round(weightedAverage / 100000) * 100000;

  // Generate sensitivity analysis for cap rate if available
  const capRateResult = results.find((r) => r.method === 'cap_rate');
  let sensitivityAnalysis;

  if (capRateResult && input.noi) {
    const capRateInputs = capRateResult.inputsUsed;
    const baseCapRate = 0.10; // Default or extract from result
    const sensitivity = capRateSensitivity(input.noi, baseCapRate);

    sensitivityAnalysis = {
      capRate: {
        baseValue: capRateResult.value,
        variations: sensitivity.map((s) => ({
          label: `${(s.capRate * 100).toFixed(2)}%`,
          value: s.value,
          percentChange: ((s.value - capRateResult.value) / capRateResult.value) * 100,
        })),
      },
    };
  }

  return {
    methods: results,
    recommendedValue,
    valueRange: {
      low: Math.round(minValue),
      high: Math.round(maxValue),
    },
    weightedAverage: Math.round(weightedAverage),
    confidence: Math.round(avgConfidence),
    sensitivityAnalysis,
  };
}

/**
 * Compare valuation results side by side
 */
export function compareValuations(results: ValuationResult[]): {
  method: ValuationMethod;
  value: number;
  pricePerBed: number;
  impliedCapRate?: number;
  confidence: number;
}[] {
  return results.map((r) => {
    const beds = r.inputsUsed.beds || 100;
    const noi = r.inputsUsed.noi;

    return {
      method: r.method,
      value: r.value,
      pricePerBed: r.value / beds,
      impliedCapRate: noi && noi > 0 ? noi / r.value : undefined,
      confidence: r.confidence,
    };
  });
}

/**
 * Get valuation method description
 */
export function getMethodDescription(method: ValuationMethod): string {
  const descriptions: Record<ValuationMethod, string> = {
    cap_rate: 'Income approach using NOI divided by market capitalization rate',
    price_per_bed: 'Market approach using price per bed benchmarks adjusted for property characteristics',
    comparable_sales: 'Market approach using recent sales of similar properties',
    dcf: 'Income approach projecting future cash flows and discounting to present value',
    noi_multiple: 'Simple multiple applied to net operating income',
    proprietary: 'Custom valuation algorithm specific to the organization',
  };

  return descriptions[method] || 'Valuation method';
}

/**
 * Validate inputs for valuation
 */
export function validateValuationInput(input: Partial<ValuationInput>): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!input.beds || input.beds <= 0) {
    errors.push('Bed count is required and must be positive');
  }

  if (!input.assetType) {
    errors.push('Asset type (SNF, ALF, ILF) is required');
  }

  if (!input.state) {
    errors.push('State is required');
  }

  // Warnings for better accuracy
  if (!input.noi && !input.ebitdar) {
    warnings.push('NOI or EBITDAR is recommended for income-based valuations');
  }

  if (!input.cmsRating && input.assetType === 'SNF') {
    warnings.push('CMS rating improves valuation accuracy for SNF');
  }

  if (!input.occupancy) {
    warnings.push('Current occupancy improves valuation accuracy');
  }

  if (!input.yearBuilt) {
    warnings.push('Year built helps adjust price per bed valuations');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
