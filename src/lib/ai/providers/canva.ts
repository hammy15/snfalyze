/**
 * Canva Provider
 *
 * Best for: Report/presentation generation from deal data.
 * Used for: Post-pipeline polished deal summaries and investor presentations.
 *
 * Note: Canva is NOT a chat completion API. It only implements generateReport().
 * The complete() method throws — routing config ensures it's only used for report_generation.
 */

import type { ProviderClient, LLMRequest, LLMResponse, ReportRequest, ReportResponse } from '../types';
import { ProviderError } from '../types';

export class CanvaProvider implements ProviderClient {
  readonly provider = 'canva' as const;
  private apiKey: string | undefined;

  get isAvailable(): boolean {
    return !!process.env.CANVA_API_KEY;
  }

  constructor() {
    this.apiKey = process.env.CANVA_API_KEY;
  }

  async complete(_request: LLMRequest): Promise<LLMResponse> {
    throw new ProviderError(
      'canva',
      undefined,
      false,
      'Canva does not support chat completions. Use generateReport() instead.',
    );
  }

  /** Generate a designed report/presentation from deal data */
  async generateReport(params: ReportRequest): Promise<ReportResponse> {
    if (!this.apiKey) {
      throw new ProviderError('canva', undefined, false, 'CANVA_API_KEY not configured');
    }

    try {
      // Canva Connect API — Create a design from data
      const response = await fetch('https://api.canva.com/rest/v1/autofills', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand_template_id: this.getTemplateId(params.templateType),
          data: this.mapDataToCanvaFields(params),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new ProviderError('canva', response.status, response.status === 429, `Canva API error: ${errorText}`);
      }

      const result = await response.json();

      // Poll for completion if needed
      const designUrl = result.job?.result?.url || result.design?.export_url;

      return {
        url: designUrl || '',
        format: params.format,
        pageCount: 1,
        generatedAt: new Date(),
      };
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const error = err as Error;
      throw new ProviderError('canva', undefined, false, error.message, error);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const response = await fetch('https://api.canva.com/rest/v1/users/me', {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private getTemplateId(templateType: ReportRequest['templateType']): string {
    // Template IDs would be configured per-account in Canva
    // These are placeholders — user needs to set up brand templates in Canva
    const templates: Record<string, string> = {
      deal_summary: process.env.CANVA_TEMPLATE_DEAL_SUMMARY || 'default',
      investor_presentation: process.env.CANVA_TEMPLATE_INVESTOR_DECK || 'default',
      executive_brief: process.env.CANVA_TEMPLATE_EXEC_BRIEF || 'default',
    };
    return templates[templateType] || 'default';
  }

  private mapDataToCanvaFields(params: ReportRequest): Record<string, unknown> {
    const data = params.data;
    return {
      deal_name: data.dealName || 'Untitled Deal',
      deal_score: data.dealScore || 'N/A',
      recommendation: data.recommendation || 'Pending',
      investment_thesis: data.investmentThesis || '',
      asking_price: data.askingPrice || '',
      estimated_value: data.estimatedValue || '',
      cap_rate: data.capRate || '',
      price_per_bed: data.pricePerBed || '',
      risk_count: data.riskCount || 0,
      key_risks: data.keyRisks || '',
      next_steps: data.nextSteps || '',
      company_name: params.branding?.companyName || 'Cascadia Healthcare',
    };
  }
}
