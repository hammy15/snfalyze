/**
 * Multi-LLM Router — Central Orchestration Engine
 *
 * Routes AI tasks to the best provider with automatic fallback,
 * circuit breaker protection, retry logic, and metrics tracking.
 *
 * Usage:
 *   import { getRouter } from '@/lib/ai';
 *   const response = await getRouter().route({ taskType: 'deal_analysis', ... });
 */

import type {
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
import { ProviderError, AllProvidersFailedError, COST_PER_1K_TOKENS } from './types';
import { DEFAULT_ROUTING_RULES, DEFAULT_PROVIDER_CONFIGS, PROVIDER_ENV_KEYS } from './routing-config';
import { AnthropicProvider } from './providers/anthropic';
import { GeminiProvider } from './providers/gemini';
import { OpenAIProvider } from './providers/openai';
import { GrokProvider } from './providers/grok';
import { CanvaProvider } from './providers/canva';

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

interface CircuitBreaker {
  failures: number;
  lastFailure: number;
  openedAt: number;
  state: 'closed' | 'open' | 'half-open';
}

const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_FAILURE_WINDOW_MS = 60_000;  // 60s
const CIRCUIT_OPEN_DURATION_MS = 30_000;   // 30s

// ============================================================================
// LLM ROUTER
// ============================================================================

export class LLMRouter {
  private providers = new Map<LLMProvider, ProviderClient>();
  private circuitBreakers = new Map<LLMProvider, CircuitBreaker>();
  private metrics = new Map<LLMProvider, ProviderMetrics>();
  private routingRules: RoutingRule[];
  private initialized = false;

  constructor(routingRules?: RoutingRule[]) {
    this.routingRules = routingRules || DEFAULT_ROUTING_RULES;
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  private ensureInitialized(): void {
    if (this.initialized) return;
    this.initialized = true;

    // Lazily initialize providers based on available env vars
    const providerFactories: Record<LLMProvider, () => ProviderClient> = {
      anthropic: () => new AnthropicProvider(DEFAULT_PROVIDER_CONFIGS.anthropic.defaultModel),
      gemini: () => new GeminiProvider(DEFAULT_PROVIDER_CONFIGS.gemini.defaultModel),
      openai: () => new OpenAIProvider(DEFAULT_PROVIDER_CONFIGS.openai.defaultModel),
      grok: () => new GrokProvider(DEFAULT_PROVIDER_CONFIGS.grok.defaultModel),
      canva: () => new CanvaProvider(),
    };

    for (const [provider, factory] of Object.entries(providerFactories)) {
      const p = provider as LLMProvider;
      const envKey = PROVIDER_ENV_KEYS[p];
      const keyValue = process.env[envKey];

      if (keyValue && keyValue.trim() !== '') {
        try {
          const client = factory();
          if (client.isAvailable) {
            this.providers.set(p, client);
          }
        } catch {
          // Provider failed to initialize — skip it
          console.warn(`[LLM Router] Failed to initialize ${provider}, skipping`);
        }
      }

      // Initialize circuit breaker
      this.circuitBreakers.set(p, {
        failures: 0,
        lastFailure: 0,
        openedAt: 0,
        state: 'closed',
      });

      // Initialize metrics
      this.metrics.set(p, {
        provider: p,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        avgLatencyMs: 0,
        estimatedCostUsd: 0,
        circuitBreakerOpen: false,
      });
    }

    const available = [...this.providers.keys()];
    console.log(`[LLM Router] Initialized with ${available.length} providers: ${available.join(', ')}`);
  }

  // --------------------------------------------------------------------------
  // MAIN ROUTING — route()
  // --------------------------------------------------------------------------

  async route(request: LLMRequest): Promise<LLMResponse> {
    this.ensureInitialized();

    const rule = this.routingRules.find((r) => r.taskType === request.taskType);
    if (!rule) {
      throw new Error(`No routing rule for task type: ${request.taskType}`);
    }

    // Build provider chain: primary → fallbacks
    const chain = [rule.primary, ...rule.fallbacks];

    // Apply rule-level config defaults
    const enrichedRequest = this.applyRuleConfig(request, rule);

    // Filter to available + circuit-breaker-healthy providers
    const availableChain = chain.filter((p) => this.isProviderReady(p));

    if (availableChain.length === 0) {
      // Last resort: try any available provider
      const anyAvailable = [...this.providers.keys()].filter(
        (p) => p !== 'canva' && this.isProviderReady(p),
      );
      if (anyAvailable.length > 0) {
        availableChain.push(...anyAvailable);
        console.warn(
          `[LLM Router] No preferred providers for ${request.taskType}, falling back to: ${anyAvailable.join(', ')}`,
        );
      }
    }

    if (availableChain.length === 0) {
      throw new AllProvidersFailedError(request.taskType, [
        new ProviderError('anthropic', undefined, false, 'No providers available'),
      ]);
    }

    // Try each provider in order
    const errors: ProviderError[] = [];

    for (const providerName of availableChain) {
      try {
        const response = await this.tryProvider(providerName, enrichedRequest);
        this.recordSuccess(providerName, response);
        return response;
      } catch (err) {
        const providerError =
          err instanceof ProviderError
            ? err
            : new ProviderError(providerName, undefined, false, (err as Error).message, err as Error);
        errors.push(providerError);
        this.recordFailure(providerName, providerError);

        // If retryable, try retries within this provider first
        if (providerError.retryable) {
          const retryResult = await this.retryProvider(providerName, enrichedRequest);
          if (retryResult) {
            this.recordSuccess(providerName, retryResult);
            return retryResult;
          }
        }

        console.warn(
          `[LLM Router] ${providerName} failed for ${request.taskType}: ${providerError.message}. Trying next...`,
        );
      }
    }

    throw new AllProvidersFailedError(request.taskType, errors);
  }

  // --------------------------------------------------------------------------
  // PROVIDER EXECUTION
  // --------------------------------------------------------------------------

  private async tryProvider(providerName: LLMProvider, request: LLMRequest): Promise<LLMResponse> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new ProviderError(providerName, undefined, false, `Provider ${providerName} not initialized`);
    }

    const config = DEFAULT_PROVIDER_CONFIGS[providerName];
    const timeoutMs = config.timeoutMs;

    // Execute with timeout
    const result = await Promise.race([
      provider.complete(request),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new ProviderError(providerName, undefined, true, `Timeout after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);

    return result;
  }

  private async retryProvider(
    providerName: LLMProvider,
    request: LLMRequest,
  ): Promise<LLMResponse | null> {
    const config = DEFAULT_PROVIDER_CONFIGS[providerName];
    const maxRetries = config.maxRetries;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Exponential backoff
      const delay = config.retryDelayMs * Math.pow(2, attempt - 1);
      await this.sleep(delay);

      try {
        const response = await this.tryProvider(providerName, request);
        return response;
      } catch {
        // Continue to next retry
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // EMBEDDINGS — Direct OpenAI Access
  // --------------------------------------------------------------------------

  async embed(texts: string[], model?: string): Promise<number[][]> {
    this.ensureInitialized();

    const openai = this.providers.get('openai');
    if (openai?.embed) {
      return openai.embed(texts, model);
    }

    throw new ProviderError('openai', undefined, false, 'OpenAI provider not available for embeddings');
  }

  // --------------------------------------------------------------------------
  // REPORT GENERATION — Direct Canva Access
  // --------------------------------------------------------------------------

  async generateReport(params: ReportRequest): Promise<ReportResponse> {
    this.ensureInitialized();

    const canva = this.providers.get('canva');
    if (canva?.generateReport) {
      return canva.generateReport(params);
    }

    throw new ProviderError('canva', undefined, false, 'Canva provider not available for report generation');
  }

  // --------------------------------------------------------------------------
  // CIRCUIT BREAKER
  // --------------------------------------------------------------------------

  private isProviderReady(provider: LLMProvider): boolean {
    // Provider must exist
    if (!this.providers.has(provider)) return false;

    const cb = this.circuitBreakers.get(provider)!;
    const now = Date.now();

    if (cb.state === 'open') {
      // Check if open duration has elapsed → transition to half-open
      if (now - cb.openedAt > CIRCUIT_OPEN_DURATION_MS) {
        cb.state = 'half-open';
        return true; // Allow one probe request
      }
      return false;
    }

    return true;
  }

  private recordSuccess(provider: LLMProvider, response: LLMResponse): void {
    // Reset circuit breaker
    const cb = this.circuitBreakers.get(provider)!;
    cb.failures = 0;
    cb.state = 'closed';

    // Update metrics
    const m = this.metrics.get(provider)!;
    m.totalRequests++;
    m.successfulRequests++;
    m.totalInputTokens += response.usage.inputTokens;
    m.totalOutputTokens += response.usage.outputTokens;
    m.circuitBreakerOpen = false;

    // Rolling average latency
    const total = m.successfulRequests;
    m.avgLatencyMs = (m.avgLatencyMs * (total - 1) + response.latencyMs) / total;

    // Cost estimation
    const costs = COST_PER_1K_TOKENS[response.model];
    if (costs) {
      m.estimatedCostUsd +=
        (response.usage.inputTokens / 1000) * costs.input +
        (response.usage.outputTokens / 1000) * costs.output;
    }
  }

  private recordFailure(provider: LLMProvider, error: ProviderError): void {
    const cb = this.circuitBreakers.get(provider)!;
    const now = Date.now();

    // Reset failure count if outside the window
    if (now - cb.lastFailure > CIRCUIT_FAILURE_WINDOW_MS) {
      cb.failures = 0;
    }

    cb.failures++;
    cb.lastFailure = now;

    // Trip the breaker
    if (cb.failures >= CIRCUIT_FAILURE_THRESHOLD) {
      cb.state = 'open';
      cb.openedAt = now;
      console.warn(`[LLM Router] Circuit breaker OPEN for ${provider} — ${cb.failures} failures in ${CIRCUIT_FAILURE_WINDOW_MS / 1000}s`);
    }

    // Update metrics
    const m = this.metrics.get(provider)!;
    m.totalRequests++;
    m.failedRequests++;
    m.lastError = error.message;
    m.lastErrorAt = new Date();
    m.circuitBreakerOpen = cb.state === 'open';
  }

  // --------------------------------------------------------------------------
  // CONFIG MERGING
  // --------------------------------------------------------------------------

  private applyRuleConfig(request: LLMRequest, rule: RoutingRule): LLMRequest {
    if (!rule.config) return request;

    return {
      ...request,
      maxTokens: request.maxTokens ?? rule.config.maxTokens,
      temperature: request.temperature ?? rule.config.temperature,
      responseFormat: request.responseFormat ?? rule.config.responseFormat,
      metadata: {
        ...request.metadata,
        model: request.metadata?.model ?? rule.config.model,
      },
    };
  }

  // --------------------------------------------------------------------------
  // DIAGNOSTICS
  // --------------------------------------------------------------------------

  getMetrics(): ProviderMetrics[] {
    this.ensureInitialized();
    return [...this.metrics.values()];
  }

  getAvailableProviders(): LLMProvider[] {
    this.ensureInitialized();
    return [...this.providers.keys()];
  }

  async healthCheck(): Promise<Record<LLMProvider, boolean>> {
    this.ensureInitialized();
    const results: Record<string, boolean> = {};

    const checks = [...this.providers.entries()].map(async ([name, client]) => {
      try {
        results[name] = await client.healthCheck();
      } catch {
        results[name] = false;
      }
    });

    await Promise.all(checks);
    return results as Record<LLMProvider, boolean>;
  }

  getRoutingRules(): RoutingRule[] {
    return [...this.routingRules];
  }

  /** Override routing for a specific task (e.g., from admin settings) */
  overrideRoute(taskType: TaskType, primary: LLMProvider, fallbacks: LLMProvider[]): void {
    const idx = this.routingRules.findIndex((r) => r.taskType === taskType);
    if (idx >= 0) {
      this.routingRules[idx] = { ...this.routingRules[idx], primary, fallbacks };
    }
  }

  // --------------------------------------------------------------------------
  // UTILITIES
  // --------------------------------------------------------------------------

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
