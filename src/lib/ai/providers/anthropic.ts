/**
 * Anthropic (Claude) Provider
 *
 * Best for: Complex reasoning, institutional knowledge, nuanced analysis.
 * Used for: Deal analysis (Cascadia prompt), synthesis, clarification reasoning.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ProviderClient, LLMRequest, LLMResponse, LLMContentPart } from '../types';
import { ProviderError } from '../types';

export class AnthropicProvider implements ProviderClient {
  readonly provider = 'anthropic' as const;
  private client: Anthropic;
  private defaultModel: string;

  get isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  constructor(defaultModel = 'claude-sonnet-4-20250514') {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    this.defaultModel = defaultModel;
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const start = Date.now();
    const model = request.metadata?.model as string || this.defaultModel;

    try {
      const messages: Anthropic.MessageParam[] = request.messages
        ? request.messages
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: typeof m.content === 'string'
                ? m.content
                : this.convertContentParts(m.content),
            }))
        : this.buildUserMessage(request);

      // If responseFormat is json, append instruction to user message
      if (request.responseFormat === 'json' && messages.length > 0) {
        const lastMsg = messages[messages.length - 1];
        if (typeof lastMsg.content === 'string') {
          lastMsg.content += '\n\nRespond with only valid JSON.';
        }
      }

      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        system: request.systemPrompt,
        messages,
      });

      const textContent = response.content.find((c) => c.type === 'text');

      return {
        content: textContent?.type === 'text' ? textContent.text : '',
        provider: 'anthropic',
        model: response.model,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const error = err as Error & { status?: number };
      const statusCode = error.status;
      const retryable = statusCode === 429 || statusCode === 500 || statusCode === 502 || statusCode === 503
        || !statusCode; // Connection/network errors (no status code) are transient — retry
      throw new ProviderError('anthropic', statusCode, retryable, error.message, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  /** Build user message from userPrompt + optional images */
  private buildUserMessage(request: LLMRequest): Anthropic.MessageParam[] {
    if (request.images && request.images.length > 0) {
      const content: Anthropic.MessageCreateParams['messages'][0]['content'] = [];
      // Add images first
      for (const img of request.images) {
        content.push({
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: (img.mimeType || 'image/png') as 'image/png',
            data: img.data,
          },
        });
      }
      // Then text prompt
      content.push({ type: 'text' as const, text: request.userPrompt });
      return [{ role: 'user' as const, content }];
    }
    return [{ role: 'user' as const, content: request.userPrompt }];
  }

  private convertContentParts(parts: LLMContentPart[]): Anthropic.MessageCreateParams['messages'][0]['content'] {
    return parts.map((part) => {
      if (part.type === 'image' && part.imageBase64) {
        return {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: (part.mimeType || 'image/png') as 'image/png',
            data: part.imageBase64,
          },
        };
      }
      return { type: 'text' as const, text: part.text || '' };
    });
  }
}
