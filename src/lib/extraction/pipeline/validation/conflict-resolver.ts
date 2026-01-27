/**
 * Conflict Resolver
 *
 * Strategies for resolving data conflicts detected during extraction.
 */

import { nanoid } from 'nanoid';
import type {
  DataConflict,
  ConflictingValue,
  PipelineClarification,
} from '../types';

// ============================================================================
// RESOLUTION STRATEGIES
// ============================================================================

export type ResolutionStrategy =
  | 'highest_confidence'
  | 'average'
  | 'weighted_average'
  | 'most_recent'
  | 'benchmark_aligned'
  | 'user_input';

export interface ResolutionResult {
  resolvedValue: number;
  strategy: ResolutionStrategy;
  confidence: number;
  explanation: string;
}

/**
 * Attempt to resolve a conflict using automated strategies
 */
export function resolveConflict(
  conflict: DataConflict,
  options?: {
    strategy?: ResolutionStrategy;
    benchmark?: { min: number; max: number; median: number };
    preferredSource?: string;
  }
): ResolutionResult | null {
  const { strategy, benchmark, preferredSource } = options || {};

  // If strategy specified, use it
  if (strategy && strategy !== 'user_input') {
    return applyStrategy(conflict.values, strategy, benchmark, preferredSource);
  }

  // Determine best automatic strategy based on conflict type
  switch (conflict.type) {
    case 'cross_document':
      return resolveByHighestConfidence(conflict.values);

    case 'cross_period':
      // For period changes, prefer no resolution (needs user input)
      return null;

    case 'revenue_reconciliation':
      // For revenue reconciliation, use weighted average
      return resolveByWeightedAverage(conflict.values);

    case 'internal_consistency':
      // For internal consistency, prefer the sum of components
      return resolveByCalculatedSum(conflict.values);

    case 'benchmark_deviation':
      if (benchmark) {
        return resolveByBenchmark(conflict.values, benchmark);
      }
      return null;

    default:
      return resolveByHighestConfidence(conflict.values);
  }
}

function applyStrategy(
  values: ConflictingValue[],
  strategy: ResolutionStrategy,
  benchmark?: { min: number; max: number; median: number },
  preferredSource?: string
): ResolutionResult | null {
  switch (strategy) {
    case 'highest_confidence':
      return resolveByHighestConfidence(values);
    case 'average':
      return resolveByAverage(values);
    case 'weighted_average':
      return resolveByWeightedAverage(values);
    case 'most_recent':
      return resolveByMostRecent(values);
    case 'benchmark_aligned':
      return benchmark ? resolveByBenchmark(values, benchmark) : null;
    default:
      return null;
  }
}

// ============================================================================
// RESOLUTION METHODS
// ============================================================================

function resolveByHighestConfidence(values: ConflictingValue[]): ResolutionResult {
  const sorted = [...values].sort((a, b) => b.confidence - a.confidence);
  const best = sorted[0];

  return {
    resolvedValue: best.value,
    strategy: 'highest_confidence',
    confidence: best.confidence,
    explanation: `Used value from ${best.source.filename} with highest confidence (${best.confidence}%)`,
  };
}

function resolveByAverage(values: ConflictingValue[]): ResolutionResult {
  const sum = values.reduce((acc, v) => acc + v.value, 0);
  const avg = sum / values.length;
  const avgConfidence = values.reduce((acc, v) => acc + v.confidence, 0) / values.length;

  return {
    resolvedValue: Math.round(avg * 100) / 100,
    strategy: 'average',
    confidence: avgConfidence * 0.8, // Reduce confidence for averaged values
    explanation: `Calculated average of ${values.length} values`,
  };
}

function resolveByWeightedAverage(values: ConflictingValue[]): ResolutionResult {
  const totalWeight = values.reduce((acc, v) => acc + v.confidence, 0);
  const weightedSum = values.reduce((acc, v) => acc + v.value * v.confidence, 0);
  const weightedAvg = weightedSum / totalWeight;

  return {
    resolvedValue: Math.round(weightedAvg * 100) / 100,
    strategy: 'weighted_average',
    confidence: totalWeight / values.length * 0.9,
    explanation: `Calculated confidence-weighted average of ${values.length} values`,
  };
}

function resolveByMostRecent(values: ConflictingValue[]): ResolutionResult {
  const sorted = [...values].sort(
    (a, b) => b.source.extractedAt.getTime() - a.source.extractedAt.getTime()
  );
  const mostRecent = sorted[0];

  return {
    resolvedValue: mostRecent.value,
    strategy: 'most_recent',
    confidence: mostRecent.confidence,
    explanation: `Used most recently extracted value from ${mostRecent.source.filename}`,
  };
}

function resolveByBenchmark(
  values: ConflictingValue[],
  benchmark: { min: number; max: number; median: number }
): ResolutionResult {
  // Find value closest to benchmark median that's within range
  const inRange = values.filter((v) => v.value >= benchmark.min && v.value <= benchmark.max);

  if (inRange.length > 0) {
    const closest = inRange.reduce((prev, curr) =>
      Math.abs(curr.value - benchmark.median) < Math.abs(prev.value - benchmark.median) ? curr : prev
    );
    return {
      resolvedValue: closest.value,
      strategy: 'benchmark_aligned',
      confidence: closest.confidence,
      explanation: `Used value from ${closest.source.filename} closest to benchmark median`,
    };
  }

  // No values in range, use the one closest to range
  const closestToRange = values.reduce((prev, curr) => {
    const prevDist = curr.value < benchmark.min ? benchmark.min - curr.value : curr.value - benchmark.max;
    const currDist = prev.value < benchmark.min ? benchmark.min - prev.value : prev.value - benchmark.max;
    return currDist < prevDist ? prev : curr;
  });

  return {
    resolvedValue: closestToRange.value,
    strategy: 'benchmark_aligned',
    confidence: closestToRange.confidence * 0.7, // Lower confidence if outside range
    explanation: `Used value from ${closestToRange.source.filename} (closest to benchmark range, though outside it)`,
  };
}

function resolveByCalculatedSum(values: ConflictingValue[]): ResolutionResult {
  // For internal consistency, find the "calculated" value if present
  const calculatedValue = values.find((v) =>
    v.source.filename.toLowerCase().includes('calculated') ||
    v.source.filename.toLowerCase().includes('sum')
  );

  if (calculatedValue) {
    return {
      resolvedValue: calculatedValue.value,
      strategy: 'highest_confidence',
      confidence: calculatedValue.confidence,
      explanation: 'Used calculated/sum value for internal consistency',
    };
  }

  // Fall back to highest confidence
  return resolveByHighestConfidence(values);
}

// ============================================================================
// BATCH RESOLUTION
// ============================================================================

export interface BatchResolutionOptions {
  autoResolveThreshold: number; // Max variance % to auto-resolve
  minConfidenceThreshold: number; // Min confidence to auto-resolve
  preferredStrategy: ResolutionStrategy;
  benchmark?: { min: number; max: number; median: number };
}

const DEFAULT_OPTIONS: BatchResolutionOptions = {
  autoResolveThreshold: 0.03, // 3%
  minConfidenceThreshold: 85,
  preferredStrategy: 'highest_confidence',
};

/**
 * Attempt to resolve multiple conflicts with automated rules
 */
export function resolveConflictsBatch(
  conflicts: DataConflict[],
  options?: Partial<BatchResolutionOptions>
): {
  resolved: { conflict: DataConflict; result: ResolutionResult }[];
  needsClarification: DataConflict[];
} {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const resolved: { conflict: DataConflict; result: ResolutionResult }[] = [];
  const needsClarification: DataConflict[] = [];

  for (const conflict of conflicts) {
    // Skip already resolved
    if (conflict.status === 'auto_resolved' || conflict.status === 'user_resolved') {
      continue;
    }

    // Check if auto-resolvable
    const canAutoResolve =
      conflict.variancePercent <= opts.autoResolveThreshold &&
      conflict.values.some((v) => v.confidence >= opts.minConfidenceThreshold) &&
      conflict.severity !== 'critical' &&
      conflict.type !== 'cross_period';

    if (canAutoResolve) {
      const result = resolveConflict(conflict, {
        strategy: opts.preferredStrategy,
        benchmark: opts.benchmark,
      });

      if (result && result.confidence >= opts.minConfidenceThreshold) {
        resolved.push({ conflict, result });
        conflict.status = 'auto_resolved';
        conflict.resolvedValue = result.resolvedValue;
        conflict.resolutionMethod = result.strategy === 'average' ? 'auto_average' : 'auto_highest_confidence';
        conflict.resolutionNote = result.explanation;
        conflict.resolvedAt = new Date();
      } else {
        needsClarification.push(conflict);
        conflict.status = 'pending_clarification';
      }
    } else {
      needsClarification.push(conflict);
      conflict.status = 'pending_clarification';
    }
  }

  return { resolved, needsClarification };
}

// ============================================================================
// CLARIFICATION HELPERS
// ============================================================================

/**
 * Generate suggested values for a clarification
 */
export function generateSuggestedValues(
  conflict: DataConflict,
  benchmark?: { min: number; max: number; median: number }
): PipelineClarification['suggestedValues'] {
  const suggestions: PipelineClarification['suggestedValues'] = [];

  // Add each conflicting value as a suggestion
  for (const value of conflict.values) {
    suggestions.push({
      value: value.value,
      source: value.source.filename,
      confidence: value.confidence,
      reasoning: `Extracted from ${value.source.filename}`,
    });
  }

  // Add average as suggestion
  const avg = conflict.values.reduce((acc, v) => acc + v.value, 0) / conflict.values.length;
  suggestions.push({
    value: Math.round(avg * 100) / 100,
    source: 'Calculated',
    confidence: 60,
    reasoning: 'Average of all extracted values',
  });

  // Add benchmark median if available
  if (benchmark) {
    suggestions.push({
      value: benchmark.median,
      source: 'Industry Benchmark',
      confidence: 50,
      reasoning: `Industry median (range: ${benchmark.min.toLocaleString()} - ${benchmark.max.toLocaleString()})`,
    });
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

export default {
  resolveConflict,
  resolveConflictsBatch,
  generateSuggestedValues,
};
