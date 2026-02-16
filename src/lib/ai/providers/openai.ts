/**
 * OpenAI Provider
 *
 * Best for: Structured JSON output (json_mode), embeddings, fast extraction.
 * Used for: Field extraction (Phase 2), embeddings across system.
 */

import OpenAI from 'openai';
import type { ProviderClient, LLMRequest, LLMResponse, LLMContentPart } from '../types';
import { ProviderError } from '../types';

export class OpenAIProvider implements ProviderClient {
  readonly provider = 'openai' as const;
  private client: OpenAI | null = null;
  private defaultModel: string;

  get isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  constructor(defaultModel = 'gpt-4o') {
    this.defaultModel = defaultModel;
    if (process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.client) {
      throw new ProviderError('openai', undefined, false, 'OPENAI_API_KEY not configured');
    }

    const start = Date.now();
    const model = (request.metadata?.model as string) || this.defaultModel;

    try {
      const messages: OpenAI.ChatCompletionMessageParam[] = [];

      // System message
      if (request.systemPrompt) {
        messages.push({ role: 'system', content: request.systemPrompt });
      }

      // Build messages
      if (request.messages) {
        for (const msg of request.messages) {
          if (msg.role === 'system') continue; // Already handled
          if (msg.role === 'user') {
            if (typeof msg.content === 'string') {
              messages.push({ role: 'user', content: msg.content });
            } else {
              messages.push({ role: 'user', content: this.convertContentParts(msg.content) });
            }
          } else if (msg.role === 'assistant') {
            const text = typeof msg.content === 'string'
              ? msg.content
              : msg.content.map((p) => p.text || '').join('\n');
            messages.push({ role: 'assistant', content: text });
          }
        }
      } else {
        // Build content parts with images if present
        if (request.images && request.images.length > 0) {
          const parts: OpenAI.ChatCompletionContentPart[] = [
            { type: 'text', text: request.userPrompt },
          ];
          for (const img of request.images) {
            parts.push({
              type: 'image_url',
              image_url: {
                url: img.isUrl ? img.data : `data:${img.mimeType};base64,${img.data}`,
              },
            });
          }
          messages.push({ role: 'user', content: parts });
        } else {
          messages.push({ role: 'user', content: request.userPrompt });
        }
      }

      const response = await this.client.chat.completions.create({
        model,
        messages,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        response_format:
          request.responseFormat === 'json' ? { type: 'json_object' } : undefined,
      });

      const choice = response.choices[0];

      return {
        content: choice?.message?.content || '',
        provider: 'openai',
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
      const retryable = statusCode === 429 || statusCode === 500 || statusCode === 502 || statusCode === 503;
      throw new ProviderError('openai', statusCode, retryable, error.message, error);
    }
  }

  /** Generate text embeddings */
  async embed(texts: string[], model = 'text-embedding-3-small'): Promise<number[][]> {
    if (!this.client) {
      throw new ProviderError('openai', undefined, false, 'OPENAI_API_KEY not configured');
    }

    const response = await this.client.embeddings.create({
      model,
      input: texts,
    });

    return response.data.map((d) => d.embedding);
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

  private convertContentParts(parts: LLMContentPart[]): OpenAI.ChatCompletionContentPart[] {
    return parts.map((part) => {
      if (part.type === 'image' && (part.imageBase64 || part.imageUrl)) {
        return {
          type: 'image_url' as const,
          image_url: {
            url: part.imageUrl || `data:${part.mimeType || 'image/png'};base64,${part.imageBase64}`,
          },
        };
      }
      return { type: 'text' as const, text: part.text || '' };
    });
  }
}
