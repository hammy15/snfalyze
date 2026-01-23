/**
 * SNFalyze AI Agent Type Definitions
 *
 * This module defines the core types for the AI Agent system including
 * sessions, messages, tools, and memory structures.
 */

// ============================================================================
// Agent Session Types
// ============================================================================

export type AgentSessionStatus = 'active' | 'paused' | 'completed' | 'error';

export interface AgentSession {
  id: string;
  dealId?: string;
  userId?: string;
  status: AgentSessionStatus;
  context: AgentContext;
  systemPrompt?: string;
  model: string;
  totalTokensUsed: number;
  messageCount: number;
  startedAt: Date;
  lastActiveAt: Date;
  endedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentContext {
  // Deal context
  dealId?: string;
  dealName?: string;
  dealSummary?: string;
  assetType?: 'SNF' | 'ALF' | 'ILF';

  // Analysis state
  analysisStage?: string;
  extractedData?: Record<string, unknown>;
  currentValuation?: ValuationContext;
  riskFactors?: RiskContext[];

  // User preferences
  userPreferences?: UserPreferences;

  // Conversation context
  conversationSummary?: string;
  keyDecisions?: KeyDecision[];
  pendingActions?: PendingAction[];

  // Memory references
  similarDeals?: SimilarDealReference[];
  learnedPatterns?: PatternReference[];
}

export interface ValuationContext {
  method: string;
  valueLow?: number;
  valueBase?: number;
  valueHigh?: number;
  capRate?: number;
  noiUsed?: number;
  confidenceScore?: number;
}

export interface RiskContext {
  category: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationStrategy?: string;
}

export interface UserPreferences {
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive';
  preferredValuationMethods?: string[];
  focusAreas?: string[];
}

export interface KeyDecision {
  timestamp: Date;
  decision: string;
  rationale?: string;
  affectedFields?: string[];
}

export interface PendingAction {
  id: string;
  type: 'clarification' | 'approval' | 'review';
  description: string;
  priority: number;
  createdAt: Date;
}

export interface SimilarDealReference {
  dealId: string;
  dealName: string;
  similarityScore: number;
  outcome?: string;
  keyLearnings?: string[];
}

export interface PatternReference {
  patternId: string;
  patternType: string;
  confidence: number;
  appliedTo?: string;
}

// ============================================================================
// Message Types
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface AgentMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  tokensUsed?: number;
  latencyMs?: number;
  createdAt: Date;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolCallId: string;
  output: unknown;
  error?: string;
  executionTimeMs?: number;
}

// ============================================================================
// Tool Types
// ============================================================================

export type ToolStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  requiresConfirmation: boolean;
  execute: (input: Record<string, unknown>, context: ToolExecutionContext) => Promise<ToolOutput>;
}

export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolPropertySchema>;
  required?: string[];
}

export interface ToolPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  items?: ToolPropertySchema;
  properties?: Record<string, ToolPropertySchema>;
}

export interface ToolExecutionContext {
  sessionId: string;
  dealId?: string;
  userId?: string;
  agentContext: AgentContext;
}

export interface ToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    executionTimeMs: number;
    tokensUsed?: number;
    affectedRecords?: number;
  };
}

export interface ToolExecution {
  id: string;
  sessionId: string;
  messageId?: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: unknown;
  status: ToolStatus;
  requiresConfirmation: boolean;
  confirmedBy?: string;
  confirmedAt?: Date;
  errorMessage?: string;
  executionTimeMs?: number;
  createdAt: Date;
  completedAt?: Date;
}

// ============================================================================
// Memory Types
// ============================================================================

export interface DealMemoryEntry {
  dealId: string;
  dealName: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  state?: string;
  beds?: number;
  askingPrice?: number;
  finalPrice?: number;
  outcome?: 'closed' | 'passed' | 'lost' | 'withdrawn';
  outcomeDate?: Date;
  keyMetrics: DealKeyMetrics;
  valuationSummary?: ValuationSummary;
  riskProfile?: RiskProfile;
  lessonsLearned?: string[];
  tags?: string[];
}

export interface DealKeyMetrics {
  noi?: number;
  capRate?: number;
  pricePerBed?: number;
  occupancyRate?: number;
  payerMix?: PayerMix;
  qualityRating?: number;
}

export interface PayerMix {
  medicare?: number;
  medicaid?: number;
  managedCare?: number;
  privatePay?: number;
  other?: number;
}

export interface ValuationSummary {
  methods: {
    method: string;
    value: number;
    weight: number;
  }[];
  reconciledValue: number;
  confidenceScore: number;
}

export interface RiskProfile {
  overallScore: number;
  categories: {
    category: string;
    score: number;
    factors: string[];
  }[];
  dealBreakers?: string[];
}

// ============================================================================
// Learning Types
// ============================================================================

export interface LearnedPattern {
  id: string;
  patternType: 'extraction' | 'normalization' | 'validation' | 'classification';
  documentType?: string;
  fieldName?: string;
  pattern: string;
  confidence: number;
  occurrenceCount: number;
  successCount: number;
  failureCount: number;
  exampleInputs?: unknown[];
  exampleOutputs?: unknown[];
  isActive: boolean;
}

export interface CorrectionFeedback {
  documentId?: string;
  dealId?: string;
  documentType?: string;
  fieldName: string;
  originalValue: unknown;
  correctedValue: unknown;
  correctionSource: 'user' | 'benchmark' | 'cross_doc';
  contextSnippet?: string;
}

// ============================================================================
// Clarification Types
// ============================================================================

export type ClarificationType = 'low_confidence' | 'out_of_range' | 'conflict' | 'missing' | 'validation_error';
export type ClarificationStatus = 'pending' | 'resolved' | 'skipped' | 'auto_resolved';

export interface Clarification {
  id: string;
  documentId: string;
  dealId?: string;
  fieldName: string;
  fieldPath?: string;
  extractedValue?: unknown;
  suggestedValues?: unknown[];
  benchmarkValue?: unknown;
  benchmarkRange?: {
    min: number;
    max: number;
    median: number;
  };
  clarificationType: ClarificationType;
  status: ClarificationStatus;
  confidenceScore?: number;
  reason: string;
  resolvedValue?: unknown;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNotes?: string;
  priority: number;
}

export interface ConflictResolution {
  id: string;
  dealId: string;
  document1Id: string;
  document2Id: string;
  fieldName: string;
  value1: unknown;
  value2: unknown;
  variancePercent: number;
  resolution: 'pending' | 'use_first' | 'use_second' | 'use_average' | 'manual_value' | 'ignored';
  resolvedValue?: unknown;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionRationale?: string;
}

// ============================================================================
// Algorithm Override Types
// ============================================================================

export type SettingsCategory = 'valuation' | 'financial' | 'risk' | 'market' | 'proforma' | 'display';

export interface AlgorithmOverride {
  id: string;
  dealId: string;
  category: SettingsCategory;
  key: string;
  overrideValue: unknown;
  originalValue?: unknown;
  reason?: string;
  source: 'manual' | 'ai_suggestion' | 'preset';
  suggestedBy?: string;
  appliedBy?: string;
  appliedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export interface AlgorithmPreset {
  id: string;
  name: string;
  description?: string;
  presetType: 'market' | 'risk_profile' | 'asset_type' | 'custom';
  applicableAssetTypes?: ('SNF' | 'ALF' | 'ILF')[];
  applicableStates?: string[];
  settings: Record<string, unknown>;
  usageCount: number;
  lastUsedAt?: Date;
  createdBy?: string;
  isPublic: boolean;
  isActive: boolean;
}

export interface AISuggestion {
  id: string;
  dealId: string;
  sessionId?: string;
  suggestionType: string;
  currentValue?: unknown;
  suggestedValue: unknown;
  reasoning: string;
  confidenceScore?: number;
  basedOnDeals?: string[];
  marketFactors?: Record<string, unknown>;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;
  impactEstimate?: {
    valuationChangePercent?: number;
    confidenceChange?: number;
  };
  createdAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// Agent Configuration Types
// ============================================================================

export interface AgentConfig {
  model: string;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
  tools: AgentTool[];
  memoryConfig: MemoryConfig;
  learningEnabled: boolean;
}

export interface MemoryConfig {
  maxSimilarDeals: number;
  similarityThreshold: number;
  patternConfidenceThreshold: number;
  embeddingModel?: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AgentResponse {
  sessionId: string;
  message: AgentMessage;
  toolExecutions?: ToolExecution[];
  suggestedActions?: SuggestedAction[];
  clarificationsNeeded?: Clarification[];
  contextUpdates?: Partial<AgentContext>;
}

export interface SuggestedAction {
  type: 'adjust_parameter' | 'request_clarification' | 'run_analysis' | 'review_document';
  description: string;
  parameters?: Record<string, unknown>;
  priority: 'low' | 'medium' | 'high';
  reason: string;
}

// ============================================================================
// Streaming Types
// ============================================================================

export type StreamEventType =
  | 'message_start'
  | 'content_delta'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_result'
  | 'message_complete'
  | 'error';

export interface StreamEvent {
  type: StreamEventType;
  data: unknown;
  timestamp: Date;
}
