// =============================================================================
// CIL — Cascadia Intelligence Layer
//
// The cranium that holds Newo (left brain) and Dev (right brain) together.
// Orchestrates analysis, learning, research, and senses.
// =============================================================================

export { getCIL, CILCoordinator } from './coordinator';

// Types
export type {
  CILState,
  CILActivity,
  StatePerformanceModel,
  CILAnalysisRequest,
  CILAnalysisResult,
  CILLearningRequest,
  CILLearningResult,
  CILInsightItem,
  ResearchMission,
  KnowledgeGrowthPoint,
  Sense,
  SenseContext,
  SenseResult,
} from './types';

// State & Activity
export { getCILState, logActivity, getRecentActivity, invalidateStateCache } from './state-manager';

// Performance
export { getPerformanceMap, getStateDetail, getKnowledgeGrowth, refreshStatePerformance, US_STATES } from './performance-tracker';

// Learning
export { rerunHistoricalDeal, ingestLearningData } from './learning-engine';

// Research
export { createResearchMission, listResearchMissions, getResearchMission, importMissionToKnowledge } from './research-agent';

// Senses
export { ALL_SENSES, SENSE_MAP, getSense, getSenseList } from './senses';

// Brain Health
export { getBrainHealth, resetBrainHealth } from '../analysis/brains';
export type { BrainHealth } from '../analysis/brains';
