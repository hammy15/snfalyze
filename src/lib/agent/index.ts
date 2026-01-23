/**
 * SNFalyze AI Agent Module
 *
 * Main exports for the intelligent AI agent system.
 */

// Core Agent
export {
  SNFalyzeAgent,
  createAgent,
  startAgentForDeal,
  resumeAgentSession,
} from './agent-core';

// Types
export type {
  // Session types
  AgentSession,
  AgentSessionStatus,
  AgentContext,
  AgentConfig,

  // Message types
  AgentMessage,
  MessageRole,
  AgentResponse,

  // Tool types
  AgentTool,
  ToolCall,
  ToolResult,
  ToolExecution,
  ToolStatus,
  ToolOutput,
  ToolInputSchema,
  ToolPropertySchema,
  ToolExecutionContext,

  // Memory types
  DealMemoryEntry,
  SimilarDealReference,
  DealKeyMetrics,
  PayerMix,
  ValuationSummary,
  RiskProfile,

  // Learning types
  LearnedPattern,
  CorrectionFeedback,

  // Clarification types
  Clarification,
  ClarificationType,
  ClarificationStatus,
  ConflictResolution,

  // Algorithm types
  AlgorithmOverride,
  AlgorithmPreset,
  AISuggestion,
  SettingsCategory,

  // Context types
  ValuationContext,
  RiskContext,
  UserPreferences,
  KeyDecision,
  PendingAction,
  PatternReference,

  // Streaming types
  StreamEvent,
  StreamEventType,

  // Action types
  SuggestedAction,
  MemoryConfig,
} from './types';

// State Management
export {
  createSession,
  getSession,
  getActiveSessionForDeal,
  updateSessionStatus,
  updateSessionContext,
  updateSessionTokens,
  endSession,
  addMessage,
  getSessionMessages,
  getRecentMessages,
  createToolExecution,
  getToolExecution,
  getPendingToolExecutions,
  updateToolExecution,
  approveToolExecution,
  rejectToolExecution,
  getSessionHistory,
} from './agent-state';

// Conversation Management
export { ConversationManager } from './conversation/conversation-manager';
export { buildContextPrompt, buildDealContext } from './conversation/context-builder';

// Tools
export {
  agentTools,
  getToolByName,
  getConfirmationRequiredTools,
  toolCategories,
  adjustAlgorithmSettingsTool,
  queryCmsDataTool,
  runDealAnalysisTool,
  requestClarificationTool,
  findComparableDealsTool,
  generateReportTool,
  queryMarketDataTool,
  getEffectiveSettings,
  getDealOverrides,
  removeOverride,
  getCmsBenchmarks,
  getPendingClarifications,
  getDocumentClarifications,
  resolveClarification,
  bulkResolveClarifications,
  findSimilarByEmbedding,
} from './tools';

// Memory & Learning
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
  recordCorrection,
  recordSuccessfulExtraction,
  getFieldAccuracy,
  getLearnedPatterns,
  applyLearnedPattern,
  learnFromDealOutcome,
  getLearningStats,
} from './memory';
