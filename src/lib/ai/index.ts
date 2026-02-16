/**
 * Multi-LLM Orchestration — Public API
 *
 * Usage:
 *   import { getRouter } from '@/lib/ai';
 *   const response = await getRouter().route({
 *     taskType: 'deal_analysis',
 *     systemPrompt: '...',
 *     userPrompt: '...',
 *   });
 */

export { LLMRouter } from './llm-router';
export { getRouter } from './singleton';

// Re-export types for convenience
export type {
  LLMProvider,
  TaskType,
  LLMRequest,
  LLMResponse,
  ProviderClient,
  ProviderMetrics,
  RoutingRule,
  ReportRequest,
  ReportResponse,
} from './types';

export { ProviderError, AllProvidersFailedError } from './types';
export { DEFAULT_ROUTING_RULES, DEFAULT_PROVIDER_CONFIGS } from './routing-config';
