// =============================================================================
// VALUATION ENGINE - Orchestrate multiple valuation methods
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';
import type {
  ValuationInput,
  ValuationResult,
  ValuationMethod,
  FacilityProfile,
  NormalizedFinancials,
  CMSData,
  OperatingMetrics,
  MarketData,
  ComparableSale,
} from '../types';

import { CapRateCalculator, type CapRateSettings } from './cap-rate';
import { PricePerBedCalculator, type PricePerBedSettings } from './price-per-bed';
import { DCFCalculator, type DCFSettings } from './dcf';
import { NOIMultipleCalculator, type NOIMultipleSettings } from './noi-multiple';
import { ComparableSalesCalculator, type ComparableSalesSettings } from './comparable-sales';
import { ReplacementCostCalculator, type ReplacementCostSettings } from './replacement-cost';

// =============================================================================
// TYPES
// =============================================================================

export interface ValuationEngineSettings {
  // Method weights (should sum to 1.0)
  methodWeights: {
    capRate: number;
    pricePerBed: number;
    dcf: number;
    noiMultiple: number;
    comparableSales: number;
    replacementCost: number;
  };

  // Which methods to use
  enabledMethods: {
    capRate: boolean;
    pricePerBed: boolean;
    dcf: boolean;
    noiMultiple: boolean;
    comparableSales: boolean;
    replacementCost: boolean;
  };

  // Method-specific settings
  capRate?: CapRateSettings;
  pricePerBed?: PricePerBedSettings;
  dcf?: DCFSettings;
  noiMultiple?: NOIMultipleSettings;
  comparableSales?: ComparableSalesSettings;
  replacementCost?: ReplacementCostSettings;

  // Reconciliation settings
  reconciliation: {
    method: 'weighted_average' | 'median' | 'mode_adjusted';
    trimOutliers: boolean;
    outlierThreshold: number; // Standard deviations from mean
    confidenceWeighting: boolean; // Weight by confidence level
  };
}

export interface ValuationEngineOutput {
  result: ValuationResult;
  methods: {
    capRate?: ValuationMethod;
    pricePerBed?: ValuationMethod;
    dcf?: ValuationMethod;
    noiMultiple?: ValuationMethod;
    comparableSales?: ValuationMethod;
    replacementCost?: ValuationMethod;
  };
  sensitivity: {
    capRateSensitivity: { capRate: number; value: number }[];
    occupancySensitivity: { occupancy: number; value: number }[];
    noiSensitivity: { noiChange: number; value: number }[];
  };
  reconciliation: {
    method: string;
    inputValues: number[];
    inputWeights: number[];
    adjustedWeights: number[];
    reconciledValue: number;
  };
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_ENGINE_SETTINGS: ValuationEngineSettings = {
  methodWeights: {
    capRate: 0.30,
    pricePerBed: 0.20,
    dcf: 0.20,
    noiMultiple: 0.10,
    comparableSales: 0.10,
    replacementCost: 0.10,
  },
  enabledMethods: {
    capRate: true,
    pricePerBed: true,
    dcf: true,
    noiMultiple: true,
    comparableSales: true,
    replacementCost: true,
  },
  reconciliation: {
    method: 'weighted_average',
    trimOutliers: true,
    outlierThreshold: 2.0,
    confidenceWeighting: true,
  },
};

// =============================================================================
// VALUATION ENGINE CLASS
// =============================================================================

export class ValuationEngine {
  private settings: ValuationEngineSettings;
  private capRateCalculator: CapRateCalculator;
  private pricePerBedCalculator: PricePerBedCalculator;
  private dcfCalculator: DCFCalculator;
  private noiMultipleCalculator: NOIMultipleCalculator;
  private comparableSalesCalculator: ComparableSalesCalculator;
  private replacementCostCalculator: ReplacementCostCalculator;

  constructor(settings?: Partial<ValuationEngineSettings>) {
    this.settings = { ...DEFAULT_ENGINE_SETTINGS, ...settings };
    this.capRateCalculator = new CapRateCalculator();
    this.pricePerBedCalculator = new PricePerBedCalculator();
    this.dcfCalculator = new DCFCalculator();
    this.noiMultipleCalculator = new NOIMultipleCalculator();
    this.comparableSalesCalculator = new ComparableSalesCalculator();
    this.replacementCostCalculator = new ReplacementCostCalculator();
  }

  /**
   * Run all enabled valuation methods and reconcile
   */
  valuate(input: ValuationInput): ValuationEngineOutput {
    const { facility, cmsData, operatingMetrics, financials, marketData, comparableSales } = input;

    // Extract key values
    const noi = financials?.normalized.metrics.noi || 0;
    const beds = facility.beds.operational;

    // Run each enabled method
    const methods: ValuationEngineOutput['methods'] = {};

    if (this.settings.enabledMethods.capRate && noi > 0) {
      methods.capRate = this.capRateCalculator.calculate({
        noi,
        facility,
        cmsData,
        operatingMetrics,
        marketData,
        settings: this.settings.capRate,
      });
    }

    if (this.settings.enabledMethods.pricePerBed && beds > 0) {
      methods.pricePerBed = this.pricePerBedCalculator.calculate({
        beds,
        facility,
        cmsData,
        operatingMetrics,
        marketData,
        settings: this.settings.pricePerBed,
      });
    }

    if (this.settings.enabledMethods.dcf && noi > 0) {
      methods.dcf = this.dcfCalculator.calculate({
        currentNOI: noi,
        facility,
        financials,
        settings: this.settings.dcf,
      });
    }

    if (this.settings.enabledMethods.noiMultiple && noi > 0) {
      methods.noiMultiple = this.noiMultipleCalculator.calculate({
        noi,
        facility,
        cmsData,
        operatingMetrics,
        marketData,
        settings: this.settings.noiMultiple,
      });
    }

    if (this.settings.enabledMethods.comparableSales && comparableSales && comparableSales.length > 0) {
      methods.comparableSales = this.comparableSalesCalculator.calculate({
        facility,
        comparables: comparableSales,
        settings: this.settings.comparableSales,
      });
    }

    if (this.settings.enabledMethods.replacementCost) {
      methods.replacementCost = this.replacementCostCalculator.calculate({
        facility,
        marketData,
        settings: this.settings.replacementCost,
      });
    }

    // Reconcile values
    const reconciliation = this.reconcile(methods);

    // Build valuation result
    const result = this.buildResult(facility, methods, reconciliation, noi);

    // Calculate sensitivity
    const sensitivity = this.calculateSensitivity(facility, financials, operatingMetrics, cmsData, marketData);

    return {
      result,
      methods,
      sensitivity,
      reconciliation,
    };
  }

  /**
   * Reconcile multiple valuation methods into a single value
   */
  private reconcile(methods: ValuationEngineOutput['methods']): ValuationEngineOutput['reconciliation'] {
    const inputValues: number[] = [];
    const inputWeights: number[] = [];

    // Collect values and weights from each method
    const methodEntries = Object.entries(methods) as [keyof typeof methods, ValuationMethod | undefined][];

    for (const [methodName, method] of methodEntries) {
      if (method && method.value > 0) {
        inputValues.push(method.value);

        // Base weight from settings
        let weight = this.settings.methodWeights[methodName] || 0;

        // Adjust weight by confidence if enabled
        if (this.settings.reconciliation.confidenceWeighting) {
          const confidenceMultiplier =
            method.confidence === 'high' ? 1.2 :
            method.confidence === 'medium' ? 1.0 :
            0.7;
          weight *= confidenceMultiplier;
        }

        inputWeights.push(weight);
      }
    }

    if (inputValues.length === 0) {
      return {
        method: 'none',
        inputValues: [],
        inputWeights: [],
        adjustedWeights: [],
        reconciledValue: 0,
      };
    }

    // Normalize weights
    const totalWeight = inputWeights.reduce((sum, w) => sum + w, 0);
    let adjustedWeights = inputWeights.map((w) => w / totalWeight);

    // Trim outliers if enabled
    if (this.settings.reconciliation.trimOutliers && inputValues.length >= 3) {
      const { values, weights } = this.trimOutliers(inputValues, adjustedWeights);
      // Renormalize after trimming
      const newTotal = weights.reduce((sum, w) => sum + w, 0);
      adjustedWeights = weights.map((w) => w / newTotal);
    }

    // Calculate reconciled value based on method
    let reconciledValue: number;

    switch (this.settings.reconciliation.method) {
      case 'median':
        reconciledValue = this.calculateMedian(inputValues);
        break;

      case 'mode_adjusted':
        reconciledValue = this.calculateModeAdjusted(inputValues, adjustedWeights);
        break;

      case 'weighted_average':
      default:
        reconciledValue = inputValues.reduce((sum, value, i) => sum + value * adjustedWeights[i], 0);
    }

    return {
      method: this.settings.reconciliation.method,
      inputValues,
      inputWeights,
      adjustedWeights,
      reconciledValue,
    };
  }

  /**
   * Trim outlier values
   */
  private trimOutliers(
    values: number[],
    weights: number[]
  ): { values: number[]; weights: number[] } {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const threshold = this.settings.reconciliation.outlierThreshold;

    const filteredValues: number[] = [];
    const filteredWeights: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const zScore = Math.abs(values[i] - mean) / stdDev;
      if (zScore <= threshold) {
        filteredValues.push(values[i]);
        filteredWeights.push(weights[i]);
      }
    }

    // If we filtered too many, return original
    if (filteredValues.length < 2) {
      return { values, weights };
    }

    return { values: filteredValues, weights: filteredWeights };
  }

  /**
   * Calculate median value
   */
  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Calculate mode-adjusted value (closest to majority of estimates)
   */
  private calculateModeAdjusted(values: number[], weights: number[]): number {
    // Use weighted average but give extra weight to values closer to median
    const median = this.calculateMedian(values);

    const adjustedWeights = weights.map((w, i) => {
      const distanceFromMedian = Math.abs(values[i] - median) / median;
      const proximityBonus = 1 / (1 + distanceFromMedian);
      return w * proximityBonus;
    });

    const totalWeight = adjustedWeights.reduce((sum, w) => sum + w, 0);
    return values.reduce((sum, value, i) => sum + value * (adjustedWeights[i] / totalWeight), 0);
  }

  /**
   * Build final valuation result
   */
  private buildResult(
    facility: FacilityProfile,
    methods: ValuationEngineOutput['methods'],
    reconciliation: ValuationEngineOutput['reconciliation'],
    noi: number
  ): ValuationResult {
    const reconciledValue = reconciliation.reconciledValue;
    const beds = facility.beds.operational;
    const values = reconciliation.inputValues.filter((v) => v > 0);

    // Calculate range
    const stdDev = this.calculateStdDev(values);
    const valueLow = reconciledValue - stdDev;
    const valueMid = reconciledValue;
    const valueHigh = reconciledValue + stdDev;

    // Calculate implied metrics
    const valuePerBed = beds > 0 ? reconciledValue / beds : 0;
    const impliedCapRate = noi > 0 ? noi / reconciledValue : 0;

    // Determine overall confidence
    const confidences = Object.values(methods)
      .filter((m): m is ValuationMethod => m !== undefined)
      .map((m) => m.confidence);

    const overallConfidence: ValuationResult['overallConfidence'] =
      confidences.filter((c) => c === 'high').length >= 2 ? 'high' :
      confidences.filter((c) => c === 'low').length >= 2 ? 'low' :
      'medium';

    // Confidence factors
    const confidenceFactors: string[] = [];
    if (values.length >= 4) {
      confidenceFactors.push(`${values.length} valuation methods applied`);
    }
    if (this.calculateCoefficientOfVariation(values) < 0.15) {
      confidenceFactors.push('Low variance across methods');
    }
    if (methods.comparableSales?.confidence === 'high') {
      confidenceFactors.push('Strong comparable sales data');
    }

    return {
      facilityId: facility.id,
      valuationDate: new Date().toISOString(),
      assetType: facility.assetType,

      methods: {
        capRate: methods.capRate,
        pricePerBed: methods.pricePerBed,
        dcf: methods.dcf,
        noiMultiple: methods.noiMultiple,
        comparableSales: methods.comparableSales,
        replacementCost: methods.replacementCost,
      },

      reconciledValue,
      valuePerBed,
      impliedCapRate,

      valueLow: Math.max(0, valueLow),
      valueMid,
      valueHigh,

      overallConfidence,
      confidenceFactors,
    };
  }

  /**
   * Calculate standard deviation
   */
  private calculateStdDev(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * Calculate coefficient of variation
   */
  private calculateCoefficientOfVariation(values: number[]): number {
    if (values.length < 2) return 0;
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    if (mean === 0) return 0;
    return this.calculateStdDev(values) / mean;
  }

  /**
   * Calculate sensitivity analysis
   */
  private calculateSensitivity(
    facility: FacilityProfile,
    financials?: NormalizedFinancials,
    operations?: OperatingMetrics,
    cmsData?: CMSData,
    marketData?: MarketData
  ): ValuationEngineOutput['sensitivity'] {
    const noi = financials?.normalized.metrics.noi || 0;
    const baseValue = noi > 0 ? noi / 0.125 : 0; // 12.5% cap rate on EBITDAR

    // Cap rate sensitivity (10% to 15%)
    const capRateSensitivity = [0.10, 0.105, 0.11, 0.115, 0.12, 0.125, 0.13, 0.135, 0.14].map(
      (capRate) => ({
        capRate,
        value: noi > 0 ? noi / capRate : 0,
      })
    );

    // Occupancy sensitivity (70% to 95%)
    const currentOccupancy = operations?.occupancyRate || 85;
    const occupancySensitivity = [70, 75, 80, 85, 90, 95].map((occupancy) => {
      const occupancyFactor = occupancy / currentOccupancy;
      return {
        occupancy,
        value: baseValue * occupancyFactor,
      };
    });

    // NOI sensitivity (-20% to +20%)
    const noiSensitivity = [-20, -15, -10, -5, 0, 5, 10, 15, 20].map((noiChange) => ({
      noiChange,
      value: baseValue * (1 + noiChange / 100),
    }));

    return {
      capRateSensitivity,
      occupancySensitivity,
      noiSensitivity,
    };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<ValuationEngineSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings(): ValuationEngineSettings {
    return { ...this.settings };
  }

  /**
   * Get default settings
   */
  static getDefaultSettings(): ValuationEngineSettings {
    return { ...DEFAULT_ENGINE_SETTINGS };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const valuationEngine = new ValuationEngine();
