/**
 * Agent Memory Module Index
 *
 * Exports all memory-related functionality for the AI agent.
 */

export {
  saveDealToMemory,
  updateDealOutcome,
  getDealMemory,
  getDealMemoryHistory,
  findSimilarDeals,
  getDealsWithOutcome,
  storeDealEmbedding,
  findSimilarDealsByEmbedding,
  getDealOutcomeStats,
  getMetricsByOutcome,
} from './deal-memory-service';

export {
  recordCorrection,
  recordSuccessfulExtraction,
  getFieldAccuracy,
  getLearnedPatterns,
  applyLearnedPattern,
  learnFromDealOutcome,
  getLearningStats,
} from './learning-loop';
