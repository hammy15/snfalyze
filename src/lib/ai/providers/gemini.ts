/**
 * Google Gemini Provider
 *
 * Best for: Long context (1M+ tokens), PDF/doc scrubbing, multimodal.
 * Used for: Document analysis (Phase 1), vision extraction, structure analysis.
 */

import { GoogleGenerativeAI, type GenerativeModel } from '@google/generative-ai';
import type { ProviderClient, LLMRequest, LLMResponse } from '../types';
import { ProviderError } from '../types';

export class GeminiProvider implements ProviderClient {
  readonly provider = 'gemini' as const;
  private genAI: GoogleGenerativeAI | null = null;
  private defaultModel: string;

  get isAvailable(): boolean {
    return !!process.env.GOOGLE_AI_API_KEY;
  }

  constructor(defaultModel = 'gemini-2.0-flash') {
    this.defaultModel = defaultModel;
    if (process.env.GOOGLE_AI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    }
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    if (!this.genAI) {
      throw new ProviderError('gemini', undefined, false, 'GOOGLE_AI_API_KEY not configured');
    }

    const start = Date.now();
    const modelName = (request.metadata?.model as string) || this.defaultModel;

    try {
      const model: GenerativeModel = this.genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: request.systemPrompt || undefined,
        generationConfig: {
          maxOutputTokens: request.maxTokens || 4096,
          temperature: request.temperature,
          responseMimeType: request.responseFormat === 'json' ? 'application/json' : undefined,
        },
      });

      // Build content parts
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Add user prompt
      parts.push({ text: request.userPrompt });

      // Add images if present
      if (request.images) {
        for (const img of request.images) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          });
        }
      }

      const result = await model.generateContent(parts);
      const response = result.response;
      const text = response.text();

      // Estimate token usage from response metadata
      const usage = response.usageMetadata;

      return {
        content: text,
        provider: 'gemini',
        model: modelName,
        usage: {
          inputTokens: usage?.promptTokenCount || 0,
          outputTokens: usage?.candidatesTokenCount || 0,
          totalTokens: usage?.totalTokenCount || 0,
        },
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const error = err as Error & { status?: number; code?: number };
      const statusCode = error.status || error.code;
      const retryable =
        statusCode === 429 ||
        statusCode === 500 ||
        statusCode === 503 ||
        error.message?.includes('RESOURCE_EXHAUSTED');
      throw new ProviderError('gemini', statusCode, retryable, error.message, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.genAI) return false;
    try {
      const model = this.genAI.getGenerativeModel({ model: this.defaultModel });
      await model.generateContent('ping');
      return true;
    } catch {
      return false;
    }
  }
}
