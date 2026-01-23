// =============================================================================
// FIELD EXTRACTOR - LLM-based intelligent field extraction
// =============================================================================

import type {
  DocumentType,
  ExtractionField,
  FacilityProfile,
  FinancialStatement,
  OperatingMetrics,
  CMSData,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface FieldExtractionResult {
  field: string;
  value: unknown;
  confidence: number;
  source: {
    page?: number;
    location?: string;
    rawText?: string;
  };
  validated: boolean;
  validationErrors?: string[];
}

export interface ExtractionContext {
  documentType: DocumentType;
  rawText: string;
  tables?: string[][][]; // Array of tables, each table is rows of cells
  pageTexts?: string[];
  metadata?: Record<string, unknown>;
}

export interface LLMExtractionRequest {
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
  maxTokens?: number;
}

export interface LLMExtractionResponse {
  data: Record<string, unknown>;
  confidence: number;
  reasoning?: string;
}

// =============================================================================
// EXTRACTION PROMPTS
// =============================================================================

const SYSTEM_PROMPTS: Record<DocumentType, string> = {
  offering_memorandum: `You are an expert at extracting information from commercial real estate offering memoranda,
specifically for skilled nursing facilities (SNF), assisted living facilities (ALF), and independent living facilities (ILF).

Extract the following information accurately:
- Facility name, address, and property details
- Number of beds (licensed, certified, operational)
- Year built, square footage, acreage
- Ownership type and chain affiliation
- Financial highlights (revenue, expenses, NOI)
- Operational metrics (occupancy, payer mix)
- Asking price and key terms

Be precise with numbers. If a value is not found, return null rather than guessing.`,

  rent_roll: `You are an expert at extracting rent roll data from healthcare facility documents.
Extract unit-level details including unit numbers, bed counts, rates, payer types, and move-in dates.
Calculate totals and verify they match stated totals if provided.`,

  trailing_12: `You are an expert at extracting trailing 12-month financial data from healthcare facility P&L statements.
Extract line-by-line revenue and expense items, matching them to standard healthcare accounting categories.
Pay special attention to:
- Revenue by payer source (Medicare, Medicaid, Private Pay, etc.)
- Labor costs (nursing, administrative, dietary)
- Operating expenses
- EBITDAR/EBITDA calculations`,

  historical_pnl: `You are an expert at extracting historical financial data from healthcare facility financial statements.
Extract multi-year data preserving the time series. Identify trends and anomalies.`,

  medicare_cost_report: `You are an expert at extracting data from CMS Medicare Cost Reports (Form 2540-10).
Extract worksheet data including:
- Statistical data (Worksheet S-3)
- Cost data (Worksheet A)
- Revenue data (Worksheet G)
- Settlement calculations`,

  survey_report: `You are an expert at extracting state survey and CMS inspection data.
Extract deficiency counts by scope and severity, complaint investigations, and corrective action plans.`,

  lease_abstract: `You are an expert at extracting lease terms from real estate lease documents.
Extract rent amounts, escalations, renewal options, tenant improvements, and key dates.`,

  environmental_report: `You are an expert at extracting environmental assessment data.
Extract Phase I/II findings, recognized environmental conditions, and recommendations.`,

  appraisal: `You are an expert at extracting appraisal data and valuations.
Extract comparable sales, income approach calculations, cost approach data, and reconciled values.`,

  capital_expenditure: `You are an expert at extracting capital expenditure data.
Extract project lists, budgets, timelines, and categories of improvements.`,

  census_report: `You are an expert at extracting census and occupancy data from healthcare facility reports.
Extract daily/monthly census by unit type and payer source, admission/discharge data, and occupancy calculations.`,

  staffing_report: `You are an expert at extracting staffing data from healthcare facility reports.
Extract HPPD by department, FTE counts, agency utilization, and turnover metrics.`,

  quality_report: `You are an expert at extracting quality metrics from healthcare facility reports.
Extract CMS star ratings, quality measures, deficiencies, and improvement initiatives.`,

  other: `You are an expert at extracting structured data from documents.
Identify the document type and extract relevant information systematically.`,
};

// =============================================================================
// FIELD EXTRACTOR CLASS
// =============================================================================

export class FieldExtractor {
  private llmClient: LLMClient | null = null;

  constructor(llmClient?: LLMClient) {
    this.llmClient = llmClient || null;
  }

  /**
   * Set the LLM client for extraction
   */
  setLLMClient(client: LLMClient): void {
    this.llmClient = client;
  }

  /**
   * Extract fields from a document using LLM
   */
  async extractFields(
    context: ExtractionContext,
    fields: ExtractionField[]
  ): Promise<FieldExtractionResult[]> {
    if (!this.llmClient) {
      // Fall back to rule-based extraction if no LLM
      return this.extractFieldsRuleBased(context, fields);
    }

    const results: FieldExtractionResult[] = [];

    // Group fields by extraction strategy
    const groupedFields = this.groupFieldsForExtraction(fields);

    for (const group of groupedFields) {
      const groupResults = await this.extractFieldGroup(context, group);
      results.push(...groupResults);
    }

    return results;
  }

  /**
   * Extract all available data from a document
   */
  async extractDocument(
    context: ExtractionContext
  ): Promise<Record<string, FieldExtractionResult[]>> {
    const template = await import('./extraction-templates').then(
      (m) => m.getTemplate(context.documentType)
    );

    if (!template) {
      return { unknown: [] };
    }

    const results = await this.extractFields(context, template.fields);

    // Group results by category
    const grouped: Record<string, FieldExtractionResult[]> = {};
    for (const result of results) {
      const category = this.getFieldCategory(result.field);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(result);
    }

    return grouped;
  }

  /**
   * Extract facility profile from document
   */
  async extractFacilityProfile(context: ExtractionContext): Promise<Partial<FacilityProfile>> {
    const fields: ExtractionField[] = [
      { name: 'name', type: 'string', required: true },
      { name: 'address.street', type: 'string', required: true },
      { name: 'address.city', type: 'string', required: true },
      { name: 'address.state', type: 'string', required: true },
      { name: 'address.zip', type: 'string', required: true },
      { name: 'address.county', type: 'string', required: false },
      { name: 'ccn', type: 'string', required: false, aliases: ['CMS Number', 'Medicare Number', 'Provider Number'] },
      { name: 'npi', type: 'string', required: false, aliases: ['NPI Number', 'National Provider'] },
      { name: 'beds.licensed', type: 'number', required: true, aliases: ['Licensed Beds', 'Total Licensed'] },
      { name: 'beds.certified', type: 'number', required: false, aliases: ['Certified Beds', 'Medicare Certified'] },
      { name: 'beds.operational', type: 'number', required: false, aliases: ['Operational Beds', 'Operating Beds'] },
      { name: 'squareFootage', type: 'number', required: false, aliases: ['SF', 'Square Feet', 'Building Size'] },
      { name: 'acres', type: 'number', required: false, aliases: ['Land Area', 'Lot Size'] },
      { name: 'yearBuilt', type: 'number', required: true, aliases: ['Built', 'Year Constructed'] },
      { name: 'yearRenovated', type: 'number', required: false, aliases: ['Renovated', 'Last Renovation'] },
      { name: 'stories', type: 'number', required: false, aliases: ['Floors', 'Levels'] },
      { name: 'buildingCount', type: 'number', required: false, aliases: ['Buildings', 'Number of Buildings'] },
    ];

    const results = await this.extractFields(context, fields);
    return this.buildObjectFromResults<FacilityProfile>(results);
  }

  /**
   * Extract operating metrics from document
   */
  async extractOperatingMetrics(context: ExtractionContext): Promise<Partial<OperatingMetrics>> {
    const fields: ExtractionField[] = [
      { name: 'currentCensus', type: 'number', required: true, aliases: ['Census', 'Current Residents'] },
      { name: 'occupancyRate', type: 'percentage', required: true, aliases: ['Occupancy', 'Occ Rate'] },
      { name: 'payerMix.medicareA', type: 'percentage', required: false, aliases: ['Medicare A %', 'Part A'] },
      { name: 'payerMix.medicareB', type: 'percentage', required: false },
      { name: 'payerMix.medicareAdvantage', type: 'percentage', required: false, aliases: ['MA', 'Medicare Advantage'] },
      { name: 'payerMix.medicaid', type: 'percentage', required: false },
      { name: 'payerMix.privatePay', type: 'percentage', required: false, aliases: ['Private', 'Self Pay'] },
      { name: 'payerMix.managedCare', type: 'percentage', required: false, aliases: ['Insurance', 'Commercial'] },
      { name: 'staffing.rnHPPD', type: 'number', required: false, aliases: ['RN HPPD', 'RN Hours'] },
      { name: 'staffing.lpnHPPD', type: 'number', required: false, aliases: ['LPN HPPD', 'LVN HPPD'] },
      { name: 'staffing.cnaHPPD', type: 'number', required: false, aliases: ['CNA HPPD', 'NA HPPD'] },
      { name: 'staffing.totalHPPD', type: 'number', required: false, aliases: ['Total HPPD', 'Nursing HPPD'] },
      { name: 'caseMixIndex', type: 'number', required: false, aliases: ['CMI', 'Case Mix'] },
    ];

    const results = await this.extractFields(context, fields);
    return this.buildObjectFromResults<OperatingMetrics>(results);
  }

  /**
   * Group fields for efficient extraction
   */
  private groupFieldsForExtraction(fields: ExtractionField[]): ExtractionField[][] {
    // Group by location hint if available, otherwise by type
    const groups: Map<string, ExtractionField[]> = new Map();

    for (const field of fields) {
      const key = field.location?.section || field.type;
      const existing = groups.get(key) || [];
      existing.push(field);
      groups.set(key, existing);
    }

    // Ensure no group is too large (split if > 10 fields)
    const result: ExtractionField[][] = [];
    for (const group of groups.values()) {
      if (group.length <= 10) {
        result.push(group);
      } else {
        for (let i = 0; i < group.length; i += 10) {
          result.push(group.slice(i, i + 10));
        }
      }
    }

    return result;
  }

  /**
   * Extract a group of fields using LLM
   */
  private async extractFieldGroup(
    context: ExtractionContext,
    fields: ExtractionField[]
  ): Promise<FieldExtractionResult[]> {
    if (!this.llmClient) {
      return this.extractFieldsRuleBased(context, fields);
    }

    const systemPrompt = SYSTEM_PROMPTS[context.documentType];
    const schema = this.buildExtractionSchema(fields);

    const userPrompt = this.buildUserPrompt(context, fields);

    try {
      const response = await this.llmClient.extract({
        systemPrompt,
        userPrompt,
        schema,
        maxTokens: 2000,
      });

      return this.processLLMResponse(response, fields);
    } catch (error) {
      console.error('LLM extraction failed, falling back to rule-based:', error);
      return this.extractFieldsRuleBased(context, fields);
    }
  }

  /**
   * Build JSON schema for structured extraction
   */
  private buildExtractionSchema(fields: ExtractionField[]): Record<string, unknown> {
    const properties: Record<string, unknown> = {};

    for (const field of fields) {
      properties[field.name] = {
        type: this.mapFieldTypeToJsonSchema(field.type),
        description: `Extract ${field.name}${field.aliases ? ` (also known as: ${field.aliases.join(', ')})` : ''}`,
      };
    }

    return {
      type: 'object',
      properties,
      required: fields.filter((f) => f.required).map((f) => f.name),
    };
  }

  /**
   * Map field type to JSON schema type
   */
  private mapFieldTypeToJsonSchema(type: ExtractionField['type']): string {
    switch (type) {
      case 'string':
      case 'date':
        return 'string';
      case 'number':
      case 'currency':
      case 'percentage':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'string';
    }
  }

  /**
   * Build user prompt for extraction
   */
  private buildUserPrompt(context: ExtractionContext, fields: ExtractionField[]): string {
    const fieldDescriptions = fields
      .map((f) => {
        let desc = `- ${f.name} (${f.type}${f.required ? ', required' : ''})`;
        if (f.aliases) {
          desc += `: Look for "${f.aliases.join('", "')}"`;
        }
        if (f.location?.nearText) {
          desc += `. Usually near: "${f.location.nearText.join('", "')}"`;
        }
        return desc;
      })
      .join('\n');

    // Include relevant text based on field locations
    let relevantText = context.rawText;
    if (context.pageTexts && fields.some((f) => f.location?.page)) {
      const pages = new Set(fields.filter((f) => f.location?.page).map((f) => f.location!.page!));
      relevantText = Array.from(pages)
        .map((p) => context.pageTexts![p - 1] || '')
        .join('\n\n');
    }

    // Truncate if too long
    if (relevantText.length > 15000) {
      relevantText = relevantText.substring(0, 15000) + '\n...[truncated]';
    }

    return `Extract the following fields from this ${context.documentType} document:

${fieldDescriptions}

Document text:
${relevantText}

Return a JSON object with the extracted values. Use null for fields you cannot find.`;
  }

  /**
   * Process LLM response into field results
   */
  private processLLMResponse(
    response: LLMExtractionResponse,
    fields: ExtractionField[]
  ): FieldExtractionResult[] {
    const results: FieldExtractionResult[] = [];

    for (const field of fields) {
      const value = this.getNestedValue(response.data, field.name);
      const validated = this.validateFieldValue(value, field);

      results.push({
        field: field.name,
        value,
        confidence: response.confidence * (validated.valid ? 1 : 0.5),
        source: {
          rawText: response.reasoning,
        },
        validated: validated.valid,
        validationErrors: validated.errors,
      });
    }

    return results;
  }

  /**
   * Rule-based extraction fallback
   */
  private extractFieldsRuleBased(
    context: ExtractionContext,
    fields: ExtractionField[]
  ): FieldExtractionResult[] {
    const results: FieldExtractionResult[] = [];
    const text = context.rawText.toLowerCase();

    for (const field of fields) {
      const result = this.extractFieldRuleBased(field, text, context);
      results.push(result);
    }

    return results;
  }

  /**
   * Extract a single field using rules
   */
  private extractFieldRuleBased(
    field: ExtractionField,
    text: string,
    context: ExtractionContext
  ): FieldExtractionResult {
    // Build search patterns from field name and aliases
    const searchTerms = [field.name, ...(field.aliases || [])].map((t) =>
      t.toLowerCase().replace(/[^a-z0-9\s]/g, '')
    );

    let bestMatch: { value: unknown; confidence: number; rawText: string } | null = null;

    for (const term of searchTerms) {
      const match = this.findValueNearTerm(term, text, field.type);
      if (match && (!bestMatch || match.confidence > bestMatch.confidence)) {
        bestMatch = match;
      }
    }

    if (bestMatch) {
      const validated = this.validateFieldValue(bestMatch.value, field);
      return {
        field: field.name,
        value: bestMatch.value,
        confidence: bestMatch.confidence,
        source: { rawText: bestMatch.rawText },
        validated: validated.valid,
        validationErrors: validated.errors,
      };
    }

    return {
      field: field.name,
      value: null,
      confidence: 0,
      source: {},
      validated: false,
      validationErrors: ['Field not found'],
    };
  }

  /**
   * Find a value near a search term
   */
  private findValueNearTerm(
    term: string,
    text: string,
    type: ExtractionField['type']
  ): { value: unknown; confidence: number; rawText: string } | null {
    const termIndex = text.indexOf(term);
    if (termIndex === -1) return null;

    // Extract context around the term
    const start = Math.max(0, termIndex - 20);
    const end = Math.min(text.length, termIndex + term.length + 100);
    const context = text.substring(start, end);

    // Look for values based on type
    let value: unknown = null;
    let confidence = 0.5;

    switch (type) {
      case 'number':
      case 'currency': {
        const numMatch = context.match(/[\d,]+(?:\.\d+)?/);
        if (numMatch) {
          value = parseFloat(numMatch[0].replace(/,/g, ''));
          confidence = 0.7;
        }
        break;
      }
      case 'percentage': {
        const pctMatch = context.match(/([\d.]+)\s*%/);
        if (pctMatch) {
          value = parseFloat(pctMatch[1]) / 100;
          confidence = 0.7;
        }
        break;
      }
      case 'date': {
        const dateMatch = context.match(/\d{1,2}\/\d{1,2}\/\d{2,4}|\d{4}-\d{2}-\d{2}/);
        if (dateMatch) {
          value = dateMatch[0];
          confidence = 0.7;
        }
        break;
      }
      case 'boolean': {
        if (/yes|true|✓|x/i.test(context)) {
          value = true;
          confidence = 0.6;
        } else if (/no|false/i.test(context)) {
          value = false;
          confidence = 0.6;
        }
        break;
      }
      default: {
        // Extract text value (next word or phrase)
        const textMatch = context.match(new RegExp(`${term}[:\\s]+([^\\n,;]+)`, 'i'));
        if (textMatch) {
          value = textMatch[1].trim();
          confidence = 0.5;
        }
      }
    }

    if (value !== null) {
      return { value, confidence, rawText: context };
    }

    return null;
  }

  /**
   * Validate a field value against its constraints
   */
  private validateFieldValue(
    value: unknown,
    field: ExtractionField
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (value === null || value === undefined) {
      if (field.required) {
        errors.push('Required field is missing');
      }
      return { valid: !field.required, errors };
    }

    // Type validation
    switch (field.type) {
      case 'number':
      case 'currency':
      case 'percentage':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`Expected number, got ${typeof value}`);
        }
        break;
      case 'string':
      case 'date':
        if (typeof value !== 'string') {
          errors.push(`Expected string, got ${typeof value}`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Expected boolean, got ${typeof value}`);
        }
        break;
    }

    // Range validation
    if (field.validation && typeof value === 'number') {
      if (field.validation.min !== undefined && value < field.validation.min) {
        errors.push(`Value ${value} is below minimum ${field.validation.min}`);
      }
      if (field.validation.max !== undefined && value > field.validation.max) {
        errors.push(`Value ${value} is above maximum ${field.validation.max}`);
      }
    }

    // Pattern validation
    if (field.validation?.pattern && typeof value === 'string') {
      const regex = new RegExp(field.validation.pattern);
      if (!regex.test(value)) {
        errors.push(`Value does not match pattern ${field.validation.pattern}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== 'object') return undefined;
      current = (current as Record<string, unknown>)[part];
    }

    return current;
  }

  /**
   * Set nested value in object using dot notation
   */
  private setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Build typed object from extraction results
   */
  private buildObjectFromResults<T>(results: FieldExtractionResult[]): Partial<T> {
    const obj: Record<string, unknown> = {};

    for (const result of results) {
      if (result.value !== null && result.validated) {
        this.setNestedValue(obj, result.field, result.value);
      }
    }

    return obj as Partial<T>;
  }

  /**
   * Get field category from field name
   */
  private getFieldCategory(fieldName: string): string {
    const parts = fieldName.split('.');
    return parts[0];
  }
}

// =============================================================================
// LLM CLIENT INTERFACE
// =============================================================================

export interface LLMClient {
  extract(request: LLMExtractionRequest): Promise<LLMExtractionResponse>;
}

/**
 * Create an OpenAI-compatible LLM client
 */
export function createOpenAIClient(apiKey: string, model = 'gpt-4o'): LLMClient {
  return {
    async extract(request: LLMExtractionRequest): Promise<LLMExtractionResponse> {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: request.systemPrompt },
            { role: 'user', content: request.userPrompt },
          ],
          response_format: { type: 'json_object' },
          max_tokens: request.maxTokens || 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content || '{}';

      try {
        const data = JSON.parse(content);
        return {
          data,
          confidence: 0.85, // OpenAI generally has high confidence
        };
      } catch {
        throw new Error('Failed to parse LLM response as JSON');
      }
    },
  };
}

/**
 * Create an Anthropic-compatible LLM client
 */
export function createAnthropicClient(apiKey: string, model = 'claude-3-5-sonnet-20241022'): LLMClient {
  return {
    async extract(request: LLMExtractionRequest): Promise<LLMExtractionResponse> {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: request.maxTokens || 2000,
          system: request.systemPrompt,
          messages: [
            {
              role: 'user',
              content: `${request.userPrompt}\n\nRespond with only valid JSON matching the schema provided.`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.content[0]?.text || '{}';

      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      try {
        const data = JSON.parse(jsonMatch[0]);
        return {
          data,
          confidence: 0.9, // Anthropic generally has very high accuracy
        };
      } catch {
        throw new Error('Failed to parse LLM response as JSON');
      }
    },
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const fieldExtractor = new FieldExtractor();
