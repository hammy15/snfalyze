/**
 * AI Document Reader
 *
 * Uses Claude to intelligently analyze and extract data from SNF financial documents.
 * Handles structure analysis (Pass 1) and data extraction (Pass 2).
 */

import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import type {
  DocumentStructure,
  SheetStructure,
  DocumentContent,
  SheetContent,
  AIExtractionResponse,
  ExtractedDataSet,
  PartialFinancialPeriod,
  PartialCensusPeriod,
  PartialPayerRate,
  PartialFacilityInfo,
  AIObservation,
  AIRaisedQuestion,
  ContextSummary,
  DetectedPeriod,
  DetectedField,
  SheetType,
} from '../types';
import {
  SYSTEM_PROMPT_STRUCTURE_ANALYSIS,
  SYSTEM_PROMPT_DATA_EXTRACTION,
  buildStructureAnalysisPrompt,
  buildExtractionPrompt,
} from './prompt-templates';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 16384; // Increased for complex documents
const TEMPERATURE = 0.1; // Low temperature for extraction accuracy

// ============================================================================
// AI DOCUMENT READER CLASS
// ============================================================================

export class AIDocumentReader {
  private client: Anthropic;
  private model: string;
  private totalTokensUsed: number = 0;
  private callCount: number = 0;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = model || DEFAULT_MODEL;
  }

  // --------------------------------------------------------------------------
  // Statistics
  // --------------------------------------------------------------------------

  getTokensUsed(): number {
    return this.totalTokensUsed;
  }

  getCallCount(): number {
    return this.callCount;
  }

  resetStats(): void {
    this.totalTokensUsed = 0;
    this.callCount = 0;
  }

  // --------------------------------------------------------------------------
  // Pass 1: Structure Analysis
  // --------------------------------------------------------------------------

  async analyzeStructure(params: {
    documentId: string;
    filename: string;
    content: DocumentContent;
    priorContext?: ContextSummary;
  }): Promise<DocumentStructure> {
    const { documentId, filename, content, priorContext } = params;

    // Prepare sample data for analysis
    const sampleData = this.prepareSampleData(content);
    const sheetNames = content.sheets?.map((s) => s.name);

    // Build prompt
    const prompt = buildStructureAnalysisPrompt({
      filename,
      fileType: content.type,
      sheetNames,
      sampleData,
      priorContext,
    });

    // Call Claude
    const response = await this.callClaude(SYSTEM_PROMPT_STRUCTURE_ANALYSIS, prompt);

    // Parse response
    const analysis = this.parseStructureResponse(response);

    return {
      documentId,
      filename,
      fileType: content.type,
      sheets: analysis.sheets || [],
      detectedFacilities: analysis.detectedFacilities || [],
      detectedPeriods: this.normalizeDetectedPeriods(analysis.sheets || []),
      suggestedProcessingOrder: analysis.suggestedProcessingOrder || [],
      overallQuality: analysis.overallQuality || 'medium',
      analysisNotes: analysis.analysisNotes || [],
      analyzedAt: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // Pass 2: Data Extraction
  // --------------------------------------------------------------------------

  async extractData(params: {
    documentId: string;
    structure: DocumentStructure;
    content: DocumentContent;
    priorContext: ContextSummary;
    extractionFocus?: ('financial' | 'census' | 'rates')[];
  }): Promise<AIExtractionResponse> {
    const { documentId, structure, content, priorContext, extractionFocus = ['financial', 'census', 'rates'] } = params;

    const allExtracted: ExtractedDataSet = {
      financialPeriods: [],
      censusPeriods: [],
      payerRates: [],
      facilityInfo: [],
    };
    const allObservations: AIObservation[] = [];
    const allQuestions: AIRaisedQuestion[] = [];
    let totalConfidence = 0;
    let sheetCount = 0;

    // Process each sheet according to suggested order
    const processingOrder =
      structure.suggestedProcessingOrder.length > 0
        ? structure.suggestedProcessingOrder
        : structure.sheets.map((_, i) => i);

    console.log(`[AI] Processing ${processingOrder.length} sheets for extraction`);

    for (const sheetIndex of processingOrder) {
      const sheetStructure = structure.sheets[sheetIndex];
      if (!sheetStructure || sheetStructure.sheetType === 'unknown') {
        console.log(`[AI] Skipping sheet ${sheetIndex}: ${sheetStructure?.sheetName || 'unknown'} (type: ${sheetStructure?.sheetType || 'none'})`);
        continue;
      }

      const sheetContent = content.sheets?.[sheetIndex];
      if (!sheetContent) {
        console.log(`[AI] Skipping sheet ${sheetIndex}: no content`);
        continue;
      }

      // Determine extraction focus based on sheet type
      const sheetFocus = this.getExtractionFocusForSheetType(sheetStructure.sheetType, extractionFocus);
      if (sheetFocus.length === 0) {
        console.log(`[AI] Skipping sheet ${sheetIndex}: ${sheetStructure.sheetName} (no focus)`);
        continue;
      }

      console.log(`[AI] Extracting from sheet ${sheetIndex}: ${sheetStructure.sheetName} (type: ${sheetStructure.sheetType})`);

      // Prepare sheet data for extraction
      const sheetData = this.prepareSheetData(sheetContent, sheetStructure);

      // Build extraction prompt
      const prompt = buildExtractionPrompt({
        sheetStructure,
        sheetData,
        priorContext,
        extractionFocus: sheetFocus,
      });

      // Call Claude for extraction
      console.log(`[AI] Calling Claude for sheet ${sheetStructure.sheetName}...`);
      const response = await this.callClaude(SYSTEM_PROMPT_DATA_EXTRACTION, prompt);
      console.log(`[AI] Claude responded for sheet ${sheetStructure.sheetName}, response length: ${response.length}`);

      // Parse extraction response
      const extracted = this.parseExtractionResponse(response, sheetStructure.sheetName);

      // Merge results
      allExtracted.financialPeriods.push(...(extracted.financialPeriods || []));
      allExtracted.censusPeriods.push(...(extracted.censusPeriods || []));
      allExtracted.payerRates.push(...(extracted.payerRates || []));
      allExtracted.facilityInfo.push(...(extracted.facilityInfo || []));
      allObservations.push(...(extracted.observations || []));
      allQuestions.push(...(extracted.suggestedClarifications || []));

      // Track confidence
      const sheetConfidence = this.calculateSheetConfidence(extracted);
      totalConfidence += sheetConfidence;
      sheetCount++;
    }

    return {
      extractedData: allExtracted,
      observations: allObservations,
      confidence: sheetCount > 0 ? Math.round(totalConfidence / sheetCount) : 0,
      suggestedClarifications: allQuestions,
      processingNotes: [`Processed ${sheetCount} sheets from ${structure.filename}`],
      tokensUsed: this.totalTokensUsed,
    };
  }

  // --------------------------------------------------------------------------
  // Claude API Interaction
  // --------------------------------------------------------------------------

  private async callClaude(systemPrompt: string, userPrompt: string): Promise<string> {
    this.callCount++;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Track token usage
      this.totalTokensUsed += response.usage.input_tokens + response.usage.output_tokens;

      // Extract text content
      const textContent = response.content.find((c) => c.type === 'text');
      return textContent?.text || '';
    } catch (error) {
      console.error('Claude API error:', error);
      throw new Error(`AI extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // --------------------------------------------------------------------------
  // Data Preparation
  // --------------------------------------------------------------------------

  private prepareSampleData(content: DocumentContent): string {
    if (content.type === 'excel' && content.sheets) {
      // For Excel, show first 30 rows of each sheet
      return content.sheets
        .map((sheet) => {
          const rows = sheet.rows.slice(0, 30);
          const formatted = rows
            .map((row, i) => `${i}: ${row.map((cell) => this.formatCell(cell)).join('\t')}`)
            .join('\n');
          return `=== Sheet: ${sheet.name} ===\nHeaders: ${sheet.headers.join(', ')}\n\n${formatted}`;
        })
        .join('\n\n');
    }

    if (content.type === 'pdf' && content.text) {
      // For PDF, show first 3000 characters
      return content.text.slice(0, 3000);
    }

    if (content.type === 'csv' && content.sheets?.[0]) {
      // For CSV, show first 30 rows
      const sheet = content.sheets[0];
      const rows = sheet.rows.slice(0, 30);
      return rows.map((row, i) => `${i}: ${row.join('\t')}`).join('\n');
    }

    return 'No sample data available';
  }

  private prepareSheetData(sheet: SheetContent, structure: SheetStructure): string {
    const startRow = structure.dataStartRow || 0;
    const endRow = structure.dataEndRow || sheet.rowCount;

    // Include headers and relevant data rows
    const headerRow = structure.headerRow !== undefined ? structure.headerRow : 0;
    const headers = sheet.rows[headerRow] || sheet.headers;

    const dataRows = sheet.rows.slice(startRow, Math.min(endRow + 1, sheet.rowCount));

    let formatted = `Headers (Row ${headerRow}): ${headers.map((h) => this.formatCell(h)).join('\t')}\n\n`;
    formatted += dataRows
      .map((row, i) => `${startRow + i}: ${row.map((cell) => this.formatCell(cell)).join('\t')}`)
      .join('\n');

    return formatted;
  }

  private formatCell(cell: string | number | null): string {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'number') {
      // Format numbers with commas for readability
      return cell.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    return String(cell).trim();
  }

  // --------------------------------------------------------------------------
  // Response Parsing
  // --------------------------------------------------------------------------

  private parseStructureResponse(response: string): {
    sheets: SheetStructure[];
    detectedFacilities: string[];
    suggestedProcessingOrder: number[];
    overallQuality: 'high' | 'medium' | 'low';
    analysisNotes: string[];
  } {
    try {
      // Try multiple patterns to extract JSON
      let jsonString = response;

      // Try ```json block
      const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonString = jsonBlockMatch[1];
      } else {
        // Try ``` block without json tag
        const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
        } else {
          // Try to find JSON object in response
          const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            jsonString = jsonObjectMatch[0];
          }
        }
      }

      return JSON.parse(jsonString.trim());
    } catch (error) {
      console.error('Failed to parse structure response:', error);
      console.error('Raw response:', response.slice(0, 500));
      return {
        sheets: [],
        detectedFacilities: [],
        suggestedProcessingOrder: [],
        overallQuality: 'low',
        analysisNotes: ['Failed to parse AI response'],
      };
    }
  }

  private parseExtractionResponse(
    response: string,
    sourceSheet: string
  ): {
    financialPeriods: PartialFinancialPeriod[];
    censusPeriods: PartialCensusPeriod[];
    payerRates: PartialPayerRate[];
    facilityInfo: PartialFacilityInfo[];
    observations: AIObservation[];
    suggestedClarifications: AIRaisedQuestion[];
  } {
    try {
      // Extract JSON from response with multiple fallback strategies
      let jsonString = response;

      const jsonBlockMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonBlockMatch) {
        jsonString = jsonBlockMatch[1];
      } else {
        const codeBlockMatch = response.match(/```\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
          jsonString = codeBlockMatch[1];
        } else {
          const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
          if (jsonObjectMatch) {
            jsonString = jsonObjectMatch[0];
          }
        }
      }

      const parsed = JSON.parse(jsonString.trim());

      // Ensure source sheet is set on all items
      const financialPeriods = (parsed.financialPeriods || []).map((p: PartialFinancialPeriod) => ({
        ...p,
        sourceSheet: p.sourceSheet || sourceSheet,
      }));

      const censusPeriods = (parsed.censusPeriods || []).map((c: PartialCensusPeriod) => ({
        ...c,
        sourceSheet: c.sourceSheet || sourceSheet,
      }));

      const payerRates = (parsed.payerRates || []).map((r: PartialPayerRate) => ({
        ...r,
        sourceSheet: r.sourceSheet || sourceSheet,
      }));

      return {
        financialPeriods,
        censusPeriods,
        payerRates,
        facilityInfo: parsed.facilityInfo || [],
        observations: parsed.observations || [],
        suggestedClarifications: parsed.suggestedClarifications || [],
      };
    } catch (error) {
      console.error('Failed to parse extraction response:', error);
      return {
        financialPeriods: [],
        censusPeriods: [],
        payerRates: [],
        facilityInfo: [],
        observations: [
          {
            type: 'warning',
            message: `Failed to parse AI extraction response for sheet: ${sourceSheet}`,
          },
        ],
        suggestedClarifications: [],
      };
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private getExtractionFocusForSheetType(
    sheetType: SheetType,
    requestedFocus: ('financial' | 'census' | 'rates')[]
  ): ('financial' | 'census' | 'rates')[] {
    const sheetTypeFocus: Record<SheetType, ('financial' | 'census' | 'rates')[]> = {
      pl_statement: ['financial'],
      census_report: ['census'],
      rate_schedule: ['rates'],
      summary_dashboard: ['financial', 'census'],
      rent_roll: ['financial'],
      ar_aging: ['financial'],
      chart_of_accounts: [],
      unknown: ['financial', 'census', 'rates'],
    };

    const typeFocus = sheetTypeFocus[sheetType] || [];
    return typeFocus.filter((f) => requestedFocus.includes(f));
  }

  private normalizeDetectedPeriods(sheets: SheetStructure[]): DetectedPeriod[] {
    const allPeriods: DetectedPeriod[] = [];

    for (const sheet of sheets) {
      if (sheet.detectedPeriods) {
        allPeriods.push(...sheet.detectedPeriods);
      }
    }

    // Deduplicate by label
    const seen = new Set<string>();
    return allPeriods.filter((p) => {
      if (seen.has(p.label)) return false;
      seen.add(p.label);
      return true;
    });
  }

  private calculateSheetConfidence(extracted: {
    financialPeriods?: { confidence: number }[];
    censusPeriods?: { confidence: number }[];
    payerRates?: { confidence: number }[];
  }): number {
    const confidences: number[] = [];

    for (const period of extracted.financialPeriods || []) {
      if (period.confidence) confidences.push(period.confidence);
    }
    for (const census of extracted.censusPeriods || []) {
      if (census.confidence) confidences.push(census.confidence);
    }
    for (const rate of extracted.payerRates || []) {
      if (rate.confidence) confidences.push(rate.confidence);
    }

    if (confidences.length === 0) return 50; // Default confidence
    return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

export function createAIDocumentReader(apiKey?: string, model?: string): AIDocumentReader {
  return new AIDocumentReader(apiKey, model);
}

export default AIDocumentReader;
