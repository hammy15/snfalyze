/**
 * Recalculation Engine
 *
 * Provides fast, real-time recalculation of valuations when parameters change.
 * Optimized for interactive use with debouncing and caching.
 */

import {
  ValuationEngine,
  type ValuationEngineSettings,
  type ValuationEngineOutput,
} from '../valuation/valuation-engine';
import { ParameterResolver, type OverrideInput, type ResolvedParameters } from './parameter-resolver';
import type { ValuationInput, ValuationResult } from '../types';

// ============================================================================
// Types
// ============================================================================

export interface RecalculationResult {
  valuation: ValuationEngineOutput;
  resolvedParameters: ResolvedParameters;
  calculatedAt: Date;
  calculationTime: number; // milliseconds
  fromCache: boolean;
}

export interface SensitivityPoint {
  parameter: string;
  value: number;
  valuationValue: number;
  changePercent: number;
}

export interface SensitivityAnalysis {
  parameter: string;
  baseline: number;
  baselineValuation: number;
  points: SensitivityPoint[];
  elasticity: number; // % change in valuation per 1% change in parameter
}

export interface ScenarioComparison {
  scenarios: Array<{
    name: string;
    parameters: OverrideInput[];
    valuation: ValuationEngineOutput;
    diffFromBaseline: {
      absolute: number;
      percent: number;
    };
  }>;
  baseline: ValuationEngineOutput;
}

export interface MonteCarloResult {
  iterations: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentiles: {
    p5: number;
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    p95: number;
  };
  distribution: Array<{ bucket: number; count: number; percentage: number }>;
  calculationTime: number;
}

// ============================================================================
// Cache
// ============================================================================

interface CacheEntry {
  result: RecalculationResult;
  expiresAt: number;
}

class RecalculationCache {
  private cache = new Map<string, CacheEntry>();
  private readonly ttl: number;

  constructor(ttlMs = 30000) {
    this.ttl = ttlMs;
  }

  private generateKey(dealId: string, overrides: OverrideInput[]): string {
    const overrideStr = JSON.stringify(
      overrides.sort((a, b) => a.parameter.localeCompare(b.parameter))
    );
    return `${dealId}:${overrideStr}`;
  }

  get(dealId: string, overrides: OverrideInput[]): RecalculationResult | null {
    const key = this.generateKey(dealId, overrides);
    const entry = this.cache.get(key);

    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return { ...entry.result, fromCache: true };
  }

  set(dealId: string, overrides: OverrideInput[], result: RecalculationResult): void {
    const key = this.generateKey(dealId, overrides);
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.ttl,
    });
  }

  invalidate(dealId: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${dealId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// ============================================================================
// Recalculation Engine Class
// ============================================================================

export class RecalculationEngine {
  private parameterResolver: ParameterResolver;
  private valuationEngine: ValuationEngine;
  private cache: RecalculationCache;

  constructor(options?: { cacheEnabled?: boolean; cacheTtlMs?: number }) {
    this.parameterResolver = new ParameterResolver();
    this.valuationEngine = new ValuationEngine();
    this.cache = new RecalculationCache(options?.cacheTtlMs);
  }

  /**
   * Recalculate valuation with optional parameter overrides
   */
  async recalculate(
    dealId: string,
    input: ValuationInput,
    overrides: OverrideInput[] = []
  ): Promise<RecalculationResult> {
    const startTime = performance.now();

    // Check cache
    const cached = this.cache.get(dealId, overrides);
    if (cached) {
      return cached;
    }

    // Resolve parameters with overrides
    const resolvedParameters = await this.parameterResolver.resolveWithInputs(dealId, overrides);

    // Update valuation engine settings
    this.valuationEngine.updateSettings(resolvedParameters.settings);

    // Run valuation
    const valuation = this.valuationEngine.valuate(input);

    const calculationTime = performance.now() - startTime;

    const result: RecalculationResult = {
      valuation,
      resolvedParameters,
      calculatedAt: new Date(),
      calculationTime,
      fromCache: false,
    };

    // Cache result
    this.cache.set(dealId, overrides, result);

    return result;
  }

  /**
   * Run sensitivity analysis on a single parameter
   */
  async analyzeSensitivity(
    dealId: string,
    input: ValuationInput,
    parameter: string,
    range: { min: number; max: number; steps?: number }
  ): Promise<SensitivityAnalysis> {
    const steps = range.steps || 10;
    const stepSize = (range.max - range.min) / steps;

    // Get baseline
    const baseline = await this.recalculate(dealId, input);
    const baselineValue = this.getParameterValue(baseline.resolvedParameters.settings, parameter);
    const baselineValuation = baseline.valuation.result.reconciledValue;

    const points: SensitivityPoint[] = [];

    for (let i = 0; i <= steps; i++) {
      const value = range.min + i * stepSize;
      const result = await this.recalculate(dealId, input, [{ parameter, value }]);
      const valuationValue = result.valuation.result.reconciledValue;

      points.push({
        parameter,
        value,
        valuationValue,
        changePercent:
          baselineValuation > 0
            ? ((valuationValue - baselineValuation) / baselineValuation) * 100
            : 0,
      });
    }

    // Calculate elasticity (average % change in valuation per 1% change in parameter)
    let totalElasticity = 0;
    let count = 0;

    for (const point of points) {
      if (point.value !== baselineValue && baselineValue !== 0) {
        const paramChangePercent = ((point.value - baselineValue) / baselineValue) * 100;
        if (paramChangePercent !== 0) {
          totalElasticity += point.changePercent / paramChangePercent;
          count++;
        }
      }
    }

    return {
      parameter,
      baseline: baselineValue,
      baselineValuation,
      points,
      elasticity: count > 0 ? totalElasticity / count : 0,
    };
  }

  /**
   * Run tornado sensitivity analysis on multiple parameters
   */
  async tornadoAnalysis(
    dealId: string,
    input: ValuationInput,
    parameters: Array<{ parameter: string; low: number; high: number }>
  ): Promise<Array<{ parameter: string; lowValue: number; highValue: number; range: number }>> {
    // Get baseline
    const baseline = await this.recalculate(dealId, input);
    const baselineValuation = baseline.valuation.result.reconciledValue;

    const results: Array<{
      parameter: string;
      lowValue: number;
      highValue: number;
      range: number;
    }> = [];

    for (const { parameter, low, high } of parameters) {
      const lowResult = await this.recalculate(dealId, input, [{ parameter, value: low }]);
      const highResult = await this.recalculate(dealId, input, [{ parameter, value: high }]);

      const lowValuation = lowResult.valuation.result.reconciledValue;
      const highValuation = highResult.valuation.result.reconciledValue;

      results.push({
        parameter,
        lowValue: lowValuation,
        highValue: highValuation,
        range: Math.abs(highValuation - lowValuation),
      });
    }

    // Sort by range (most impactful first)
    return results.sort((a, b) => b.range - a.range);
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(
    dealId: string,
    input: ValuationInput,
    scenarios: Array<{ name: string; parameters: OverrideInput[] }>
  ): Promise<ScenarioComparison> {
    // Get baseline
    const baseline = await this.recalculate(dealId, input);
    const baselineValue = baseline.valuation.result.reconciledValue;

    const scenarioResults = await Promise.all(
      scenarios.map(async (scenario) => {
        const result = await this.recalculate(dealId, input, scenario.parameters);
        const scenarioValue = result.valuation.result.reconciledValue;

        return {
          name: scenario.name,
          parameters: scenario.parameters,
          valuation: result.valuation,
          diffFromBaseline: {
            absolute: scenarioValue - baselineValue,
            percent: baselineValue > 0 ? ((scenarioValue - baselineValue) / baselineValue) * 100 : 0,
          },
        };
      })
    );

    return {
      scenarios: scenarioResults,
      baseline: baseline.valuation,
    };
  }

  /**
   * Run Monte Carlo simulation
   */
  async runMonteCarlo(
    dealId: string,
    input: ValuationInput,
    distributions: Array<{
      parameter: string;
      distribution: 'uniform' | 'normal' | 'triangular';
      params: { min?: number; max?: number; mean?: number; stdDev?: number; mode?: number };
    }>,
    iterations = 1000
  ): Promise<MonteCarloResult> {
    const startTime = performance.now();
    const results: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const overrides: OverrideInput[] = distributions.map((dist) => ({
        parameter: dist.parameter,
        value: this.sampleFromDistribution(dist.distribution, dist.params),
      }));

      const result = await this.recalculate(dealId, input, overrides);
      results.push(result.valuation.result.reconciledValue);
    }

    // Calculate statistics
    const sorted = [...results].sort((a, b) => a - b);
    const sum = results.reduce((a, b) => a + b, 0);
    const mean = sum / iterations;
    const median = sorted[Math.floor(iterations / 2)];
    const variance = results.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / iterations;
    const stdDev = Math.sqrt(variance);

    // Calculate percentiles
    const percentile = (p: number) => sorted[Math.floor((p / 100) * iterations)];

    // Build distribution buckets
    const bucketCount = 20;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const bucketSize = (max - min) / bucketCount;

    const buckets = new Array(bucketCount).fill(0);
    for (const value of results) {
      const bucketIndex = Math.min(Math.floor((value - min) / bucketSize), bucketCount - 1);
      buckets[bucketIndex]++;
    }

    const distribution = buckets.map((count, i) => ({
      bucket: min + (i + 0.5) * bucketSize,
      count,
      percentage: (count / iterations) * 100,
    }));

    return {
      iterations,
      mean,
      median,
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentiles: {
        p5: percentile(5),
        p10: percentile(10),
        p25: percentile(25),
        p50: percentile(50),
        p75: percentile(75),
        p90: percentile(90),
        p95: percentile(95),
      },
      distribution,
      calculationTime: performance.now() - startTime,
    };
  }

  /**
   * Save current overrides to database
   */
  async saveOverrides(dealId: string, overrides: OverrideInput[], userId?: string): Promise<void> {
    for (const override of overrides) {
      await this.parameterResolver.saveOverride(
        dealId,
        override.parameter,
        override.value,
        userId,
        override.reason
      );
    }

    // Invalidate cache
    this.cache.invalidate(dealId);
  }

  /**
   * Reset all overrides for a deal
   */
  async resetOverrides(dealId: string): Promise<void> {
    // This would need to be implemented to remove all overrides
    this.cache.invalidate(dealId);
  }

  /**
   * Invalidate cache for a deal
   */
  invalidateCache(dealId: string): void {
    this.cache.invalidate(dealId);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private getParameterValue(settings: ValuationEngineSettings, parameter: string): number {
    const path = parameter.split('.');
    let current: unknown = settings;

    for (const key of path) {
      if (current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[key];
      } else {
        return 0;
      }
    }

    return typeof current === 'number' ? current : 0;
  }

  private sampleFromDistribution(
    distribution: 'uniform' | 'normal' | 'triangular',
    params: { min?: number; max?: number; mean?: number; stdDev?: number; mode?: number }
  ): number {
    switch (distribution) {
      case 'uniform':
        return this.uniformRandom(params.min ?? 0, params.max ?? 1);

      case 'normal':
        return this.normalRandom(params.mean ?? 0, params.stdDev ?? 1);

      case 'triangular':
        return this.triangularRandom(
          params.min ?? 0,
          params.max ?? 1,
          params.mode ?? ((params.min ?? 0) + (params.max ?? 1)) / 2
        );

      default:
        return this.uniformRandom(params.min ?? 0, params.max ?? 1);
    }
  }

  private uniformRandom(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private normalRandom(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
  }

  private triangularRandom(min: number, max: number, mode: number): number {
    const u = Math.random();
    const f = (mode - min) / (max - min);

    if (u < f) {
      return min + Math.sqrt(u * (max - min) * (mode - min));
    } else {
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createRecalculationEngine(options?: {
  cacheEnabled?: boolean;
  cacheTtlMs?: number;
}): RecalculationEngine {
  return new RecalculationEngine(options);
}

export default RecalculationEngine;
