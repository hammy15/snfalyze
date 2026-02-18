/**
 * Deal Learning System
 *
 * Reverse-engineers Cascadia's deal evaluation methodology from completed deals.
 * Learns normalization patterns, valuation preferences, and growth assumptions.
 */

export * from './types';
export { parseCompletedProforma } from './proforma-parser';
export { reverseEngineer } from './reverse-engineer';
export { extractPreferenceDataPoints, aggregatePreferences } from './pattern-aggregator';
export { getBaseline, suggest, suggestAll } from './preference-engine';
