/**
 * Grok (xAI) Provider
 *
 * Best for: Real-time market intelligence, news analysis, rapid fact-checking.
 * Used for: Market context enrichment before deal analysis.
 *
 * xAI's API is OpenAI-compatible — uses the openai SDK with a custom baseURL.
 */

import OpenAI from 'openai';
import type { ProviderClient, LLMRequest, LLMResponse } from '../types';
import { ProviderError } from '../types';

export class GrokProvider implements ProviderClient {
  readonly provider = 'grok' as const;
  private client: OpenAI | null = null;
  private defaultModel: string;

  get isAvailable(): boolean {
    return !!process.env.XAI_API_KEY;
  }

  constructor(defaultModel = 'grok-3-mini') {
    this.defaultModel = defaultModel;
    if (process.env.XAI_API_KEY) {
      this.client = new OpenAI({
        apiKey: process.env.XAI_API_KEY,
        baseURL: 'https://api.x.ai/v1',
      });
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new ProviderError('grok', undefined, false, 'XAI_API_KEY not configured');
    }

    const start = Date.now();
    const model = (request.metadata?.model as string) || this.defaultModel;

    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }

      if (request.messages) {
        for (const msg of request.messages) {
          if (msg.role === 'system') continue;
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: typeof msg.content === 'string'
              ? msg.content
              : msg.content.map((p) => p.text || '').join('\n'),
          });
        }
      } else {
        messages.push({ role: 'user', content: request.userPrompt });
      }

      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: request.maxTokens || 2000,
        temperature: request.temperature,
      });

      const choice = response.choices[0];

      return {
        content: choice?.message?.content || '',
        provider: 'grok',
        model: response.model,
        usage: {
          inputTokens: response.usage?.prompt_tokens || 0,
          outputTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const error = err as Error & { status?: number };
      const statusCode = error.status;
      const retryable = statusCode === 429 || statusCode === 500 || statusCode === 503;
      throw new ProviderError('grok', statusCode, retryable, error.message, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.client) return false;
    try {
      await this.client.chat.completions.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }
}
