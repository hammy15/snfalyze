/**
 * Debounced Calculator
 *
 * Provides debounced calculation for UI interactions like slider changes.
 * Ensures responsive UI while preventing excessive recalculations.
 */

import {
  RecalculationEngine,
  type RecalculationResult,
  type SensitivityAnalysis,
} from './recalculation-engine';
import type { ValuationInput } from '../types';
import type { OverrideInput } from './parameter-resolver';

// ============================================================================
// Types
// ============================================================================

export interface CalculatorState {
  isCalculating: boolean;
  lastResult: RecalculationResult | null;
  pendingOverrides: OverrideInput[];
  error: Error | null;
}

export interface CalculatorCallbacks {
  onStart?: () => void;
  onProgress?: (progress: number) => void;
  onComplete?: (result: RecalculationResult) => void;
  onError?: (error: Error) => void;
}

export interface DebouncedCalculatorOptions {
  debounceMs?: number;
  maxWaitMs?: number;
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
}

// ============================================================================
// Debounced Calculator Class
// ============================================================================

export class DebouncedCalculator {
  private engine: RecalculationEngine;
  private debounceMs: number;
  private maxWaitMs: number;

  private state: CalculatorState = {
    isCalculating: false,
    lastResult: null,
    pendingOverrides: [],
    error: null,
  };

  private debounceTimer: NodeJS.Timeout | null = null;
  private maxWaitTimer: NodeJS.Timeout | null = null;
  private firstCallTime: number = 0;
  private callbacks: CalculatorCallbacks = {};

  constructor(options: DebouncedCalculatorOptions = {}) {
    this.engine = new RecalculationEngine({
      cacheEnabled: options.cacheEnabled ?? true,
      cacheTtlMs: options.cacheTtlMs,
    });
    this.debounceMs = options.debounceMs ?? 150;
    this.maxWaitMs = options.maxWaitMs ?? 500;
  }

  /**
   * Set callbacks for calculation events
   */
  setCallbacks(callbacks: CalculatorCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Queue a recalculation with debouncing
   */
  calculate(
    dealId: string,
    input: ValuationInput,
    overrides: OverrideInput[]
  ): void {
    // Store pending overrides
    this.state.pendingOverrides = overrides;

    // Clear existing debounce timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Track first call time for max wait
    if (!this.firstCallTime) {
      this.firstCallTime = Date.now();

      // Set max wait timer
      this.maxWaitTimer = setTimeout(() => {
        this.executeCalculation(dealId, input, overrides);
      }, this.maxWaitMs);
    }

    // Set debounce timer
    this.debounceTimer = setTimeout(() => {
      this.executeCalculation(dealId, input, overrides);
    }, this.debounceMs);
  }

  /**
   * Execute the calculation immediately
   */
  async calculateImmediate(
    dealId: string,
    input: ValuationInput,
    overrides: OverrideInput[]
  ): Promise<RecalculationResult> {
    this.clearTimers();
    return this.executeCalculation(dealId, input, overrides);
  }

  /**
   * Cancel any pending calculation
   */
  cancel(): void {
    this.clearTimers();
    this.state.pendingOverrides = [];
  }

  /**
   * Get current state
   */
  getState(): Readonly<CalculatorState> {
    return { ...this.state };
  }

  /**
   * Check if a calculation is pending or in progress
   */
  isPending(): boolean {
    return this.debounceTimer !== null || this.state.isCalculating;
  }

  /**
   * Get last result
   */
  getLastResult(): RecalculationResult | null {
    return this.state.lastResult;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.maxWaitTimer) {
      clearTimeout(this.maxWaitTimer);
      this.maxWaitTimer = null;
    }
    this.firstCallTime = 0;
  }

  private async executeCalculation(
    dealId: string,
    input: ValuationInput,
    overrides: OverrideInput[]
  ): Promise<RecalculationResult> {
    this.clearTimers();

    this.state.isCalculating = true;
    this.state.error = null;
    this.callbacks.onStart?.();

    try {
      const result = await this.engine.recalculate(dealId, input, overrides);

      this.state.lastResult = result;
      this.state.isCalculating = false;
      this.state.pendingOverrides = [];

      this.callbacks.onComplete?.(result);

      return result;
    } catch (error) {
      this.state.isCalculating = false;
      this.state.error = error instanceof Error ? error : new Error(String(error));

      this.callbacks.onError?.(this.state.error);

      throw this.state.error;
    }
  }
}

// ============================================================================
// Slider Calculator Helper
// ============================================================================

export interface SliderConfig {
  parameter: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: (value: number) => string;
  parse?: (formatted: string) => number;
}

export interface SliderState {
  value: number;
  displayValue: string;
  isAtDefault: boolean;
  percentOfRange: number;
}

/**
 * Helper class for managing slider-based parameter controls
 */
export class SliderCalculator {
  private calculator: DebouncedCalculator;
  private sliders: Map<string, SliderConfig> = new Map();
  private values: Map<string, number> = new Map();
  private dealId: string | null = null;
  private input: ValuationInput | null = null;

  constructor(options?: DebouncedCalculatorOptions) {
    this.calculator = new DebouncedCalculator(options);
  }

  /**
   * Initialize with deal and input
   */
  initialize(dealId: string, input: ValuationInput): void {
    this.dealId = dealId;
    this.input = input;
  }

  /**
   * Register a slider configuration
   */
  registerSlider(config: SliderConfig): void {
    this.sliders.set(config.parameter, config);
    this.values.set(config.parameter, config.defaultValue);
  }

  /**
   * Update slider value and trigger recalculation
   */
  updateSlider(parameter: string, value: number): void {
    const config = this.sliders.get(parameter);
    if (!config) return;

    // Clamp value to range
    const clampedValue = Math.max(config.min, Math.min(config.max, value));
    this.values.set(parameter, clampedValue);

    this.triggerRecalculation();
  }

  /**
   * Reset a slider to default
   */
  resetSlider(parameter: string): void {
    const config = this.sliders.get(parameter);
    if (!config) return;

    this.values.set(parameter, config.defaultValue);
    this.triggerRecalculation();
  }

  /**
   * Reset all sliders to defaults
   */
  resetAll(): void {
    for (const [parameter, config] of this.sliders) {
      this.values.set(parameter, config.defaultValue);
    }
    this.triggerRecalculation();
  }

  /**
   * Get state for a slider
   */
  getSliderState(parameter: string): SliderState | null {
    const config = this.sliders.get(parameter);
    const value = this.values.get(parameter);

    if (!config || value === undefined) return null;

    const format = config.format || ((v) => v.toString());
    const range = config.max - config.min;

    return {
      value,
      displayValue: format(value),
      isAtDefault: Math.abs(value - config.defaultValue) < config.step / 2,
      percentOfRange: range > 0 ? ((value - config.min) / range) * 100 : 0,
    };
  }

  /**
   * Get all current overrides
   */
  getOverrides(): OverrideInput[] {
    const overrides: OverrideInput[] = [];

    for (const [parameter, value] of this.values) {
      const config = this.sliders.get(parameter);
      if (config && Math.abs(value - config.defaultValue) >= config.step / 2) {
        overrides.push({ parameter, value });
      }
    }

    return overrides;
  }

  /**
   * Set calculation callbacks
   */
  setCallbacks(callbacks: CalculatorCallbacks): void {
    this.calculator.setCallbacks(callbacks);
  }

  /**
   * Get calculation state
   */
  getState(): CalculatorState {
    return this.calculator.getState();
  }

  /**
   * Get last result
   */
  getLastResult(): RecalculationResult | null {
    return this.calculator.getLastResult();
  }

  private triggerRecalculation(): void {
    if (!this.dealId || !this.input) return;

    const overrides = this.getOverrides();
    this.calculator.calculate(this.dealId, this.input, overrides);
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

export function createDebouncedCalculator(
  options?: DebouncedCalculatorOptions
): DebouncedCalculator {
  return new DebouncedCalculator(options);
}

export function createSliderCalculator(
  options?: DebouncedCalculatorOptions
): SliderCalculator {
  return new SliderCalculator(options);
}

export default DebouncedCalculator;
