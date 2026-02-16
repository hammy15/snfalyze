/**
 * Multi-LLM Orchestration — Shared Type Definitions
 *
 * Central types for provider-agnostic LLM routing across
 * Anthropic, Gemini, OpenAI, Grok, and Perplexity.
 */

// ============================================================================
// PROVIDER & TASK TYPES
// ============================================================================

export type LLMProvider = 'anthropic' | 'gemini' | 'openai' | 'grok' | 'perplexity';

export type TaskType =
  | 'document_analysis'       // Phase 1: Ingest — analyze uploaded docs
  | 'field_extraction'        // Phase 2: Extract — structured field extraction
  | 'vision_extraction'       // Phase 1/2: multimodal spreadsheet/chart analysis
  | 'deal_analysis'           // Phase 5: Analyze — Cascadia analysis engine
  | 'clarification_reasoning' // Phase 3: Clarify — resolve ambiguities
  | 'market_intelligence'     // Phase 5: real-time market context
  | 'synthesis'               // Phase 7: Synthesize — executive summary
  | 'deep_research'           // Perplexity: sourced real-time research
  | 'embeddings'              // Cross-cutting: text embeddings
  | 'structure_analysis'      // Extraction pipeline Pass 1
  | 'data_extraction';        // Extraction pipeline Pass 2

// ============================================================================
// UNIFIED REQUEST / RESPONSE
// ============================================================================

export interface LLMRequest {
  taskType: TaskType;
  systemPrompt: string;
  userPrompt: string;
  messages?: LLMMessage[];
  maxTokens?: number;
  temperature?: number;
  responseFormat?: 'text' | 'json';
  schema?: Record<string, unknown>;
  images?: LLMImageInput[];
  metadata?: {
    dealId?: string;
    documentId?: string;
    phase?: string;
    model?: string;  // Override default model for this request
    [key: string]: unknown;
  };
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentPart[];
}

export interface LLMContentPart {
  type: 'text' | 'image';
  text?: string;
  imageBase64?: string;
  imageUrl?: string;
  mimeType?: string;
}

export interface LLMImageInput {
  data: string;
  mimeType: string;
  isUrl?: boolean;
}

export interface LLMResponse {
  content: string;
  provider: LLMProvider;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
  cached?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

export interface ProviderClient {
  readonly provider: LLMProvider;
  readonly isAvailable: boolean;

  /** Send a completion request */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /** Generate embeddings (OpenAI only) */
  embed?(texts: string[], model?: string): Promise<number[][]>;

  /** Health check */
  healthCheck(): Promise<boolean>;
}

// ============================================================================
// ROUTING CONFIGURATION
// ============================================================================

export interface RoutingRule {
  taskType: TaskType;
  primary: LLMProvider;
  fallbacks: LLMProvider[];
  config?: Partial<{
    maxTokens: number;
    temperature: number;
    responseFormat: 'text' | 'json';
    model: string;
  }>;
}

export interface ProviderConfig {
  provider: LLMProvider;
  apiKey: string;
  defaultModel: string;
  maxRetries: number;
  retryDelayMs: number;
  timeoutMs: number;
  maxConcurrent: number;
  rateLimitPerMinute: number;
  enabled: boolean;
}

// ============================================================================
// TELEMETRY
// ============================================================================

export interface ProviderMetrics {
  provider: LLMProvider;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  avgLatencyMs: number;
  estimatedCostUsd: number;
  lastError?: string;
  lastErrorAt?: Date;
  circuitBreakerOpen: boolean;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ProviderError extends Error {
  constructor(
    public provider: LLMProvider,
    public statusCode: number | undefined,
    public retryable: boolean,
    message: string,
    public cause?: Error,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class AllProvidersFailedError extends Error {
  constructor(
    public taskType: TaskType,
    public errors: ProviderError[],
  ) {
    super(
      `All providers failed for ${taskType}: ${errors.map((e) => `${e.provider}: ${e.message}`).join('; ')}`,
    );
    this.name = 'AllProvidersFailedError';
  }
}

// ============================================================================
// COST TABLE
// ============================================================================

export const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gemini-2.0-flash': { input: 0.0001, output: 0.0004 },
  'gemini-2.0-pro': { input: 0.00125, output: 0.005 },
  'grok-3': { input: 0.003, output: 0.015 },
  'grok-3-mini': { input: 0.0003, output: 0.0005 },
  'sonar-pro': { input: 0.003, output: 0.015 },
  'sonar': { input: 0.001, output: 0.001 },
};
