/**
 * Multi-LLM Routing Configuration
 *
 * Maps task types to preferred providers with fallback chains.
 * Provider-specific defaults for retries, timeouts, and rate limits.
 */

import type { RoutingRule, ProviderConfig, LLMProvider } from './types';

// ============================================================================
// DEFAULT ROUTING RULES — Task → Provider Mapping
// ============================================================================

export const DEFAULT_ROUTING_RULES: RoutingRule[] = [
  // Phase 1: Ingest — Gemini excels at large doc processing
  {
    taskType: 'document_analysis',
    primary: 'gemini',
    fallbacks: ['anthropic', 'openai'],
    config: { temperature: 0.1, responseFormat: 'json' },
  },
  // Phase 1/2: Multimodal — Gemini's vision + long context
  {
    taskType: 'vision_extraction',
    primary: 'gemini',
    fallbacks: ['anthropic'],
    config: { maxTokens: 16384, temperature: 0.1 },
  },
  // Phase 2: Structured extraction — OpenAI json_mode
  {
    taskType: 'field_extraction',
    primary: 'openai',
    fallbacks: ['anthropic', 'gemini'],
    config: { responseFormat: 'json', temperature: 0.0 },
  },
  // Extraction pipeline Pass 1 — Gemini long context
  {
    taskType: 'structure_analysis',
    primary: 'gemini',
    fallbacks: ['anthropic'],
    config: { temperature: 0.1, responseFormat: 'json' },
  },
  // Extraction pipeline Pass 2 — Gemini long context
  {
    taskType: 'data_extraction',
    primary: 'gemini',
    fallbacks: ['anthropic', 'openai'],
    config: { temperature: 0.1, responseFormat: 'json', maxTokens: 16384 },
  },
  // Phase 5: Deal Analysis — Claude's reasoning + Cascadia knowledge
  {
    taskType: 'deal_analysis',
    primary: 'anthropic',
    fallbacks: ['openai'],
    config: { maxTokens: 8000, temperature: 0.7 },
  },
  // Phase 3: Clarification — Claude's nuanced reasoning
  {
    taskType: 'clarification_reasoning',
    primary: 'anthropic',
    fallbacks: ['openai', 'grok'],
    config: { temperature: 0.5 },
  },
  // Phase 5: Market Intelligence — Perplexity for cited real-time data, Grok fallback
  {
    taskType: 'market_intelligence',
    primary: 'perplexity',
    fallbacks: ['grok', 'openai', 'anthropic'],
    config: { temperature: 0.2, maxTokens: 2000 },
  },
  // Phase 7: Synthesis — Claude's writing quality
  {
    taskType: 'synthesis',
    primary: 'anthropic',
    fallbacks: ['openai'],
    config: { maxTokens: 4096, temperature: 0.7 },
  },
  // Deep research — Perplexity excels with sourced, cited answers
  {
    taskType: 'deep_research',
    primary: 'perplexity',
    fallbacks: ['grok', 'openai'],
    config: { temperature: 0.2, maxTokens: 4096 },
  },
  // Embeddings — OpenAI only
  {
    taskType: 'embeddings',
    primary: 'openai',
    fallbacks: [],
    config: { model: 'text-embedding-3-small' },
  },
];

// ============================================================================
// DEFAULT PROVIDER CONFIGURATIONS
// ============================================================================

export const DEFAULT_PROVIDER_CONFIGS: Record<LLMProvider, Omit<ProviderConfig, 'apiKey' | 'enabled'>> = {
  anthropic: {
    provider: 'anthropic',
    defaultModel: 'claude-sonnet-4-20250514',
    maxRetries: 2,
    retryDelayMs: 1000,
    timeoutMs: 120_000,
    maxConcurrent: 5,
    rateLimitPerMinute: 50,
  },
  gemini: {
    provider: 'gemini',
    defaultModel: 'gemini-2.0-flash',
    maxRetries: 2,
    retryDelayMs: 500,
    timeoutMs: 60_000,
    maxConcurrent: 10,
    rateLimitPerMinute: 60,
  },
  openai: {
    provider: 'openai',
    defaultModel: 'gpt-4o',
    maxRetries: 2,
    retryDelayMs: 500,
    timeoutMs: 60_000,
    maxConcurrent: 10,
    rateLimitPerMinute: 60,
  },
  grok: {
    provider: 'grok',
    defaultModel: 'grok-3-mini',
    maxRetries: 1,
    retryDelayMs: 1000,
    timeoutMs: 30_000,
    maxConcurrent: 5,
    rateLimitPerMinute: 30,
  },
  perplexity: {
    provider: 'perplexity',
    defaultModel: 'sonar-pro',
    maxRetries: 1,
    retryDelayMs: 1000,
    timeoutMs: 30_000,
    maxConcurrent: 5,
    rateLimitPerMinute: 20,
  },
};

// ============================================================================
// ENV VAR MAPPING
// ============================================================================

export const PROVIDER_ENV_KEYS: Record<LLMProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  gemini: 'GOOGLE_AI_API_KEY',
  openai: 'OPENAI_API_KEY',
  grok: 'XAI_API_KEY',
  perplexity: 'PERPLEXITY_API_KEY',
};
