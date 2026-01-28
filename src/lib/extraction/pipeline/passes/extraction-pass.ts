/**
 * Data Extraction Pass
 *
 * Pass 2 of the extraction pipeline - uses AI to extract actual financial,
 * census, and rate data from documents based on the structure analysis.
 */

import { nanoid } from 'nanoid';
import type {
  DocumentStructure,
  DocumentContent,
  AIExtractionResponse,
  NormalizedFinancialPeriod,
  NormalizedCensusPeriod,
  NormalizedPayerRate,
  DataSource,
  PipelineClarification,
  VALIDATION_THRESHOLDS,
} from '../types';
import { AIDocumentReader } from '../ai/document-reader';
import { ExtractionContextManager } from '../context/extraction-context';
import {
  parseFinancialPeriod,
  parseCensusPeriod,
  parsePayerRate,
} from '../ai/response-parser';

// ============================================================================
// EXTRACTION PASS EXECUTOR
// ============================================================================

export interface ExtractionPassResult {
  financialPeriods: NormalizedFinancialPeriod[];
  censusPeriods: NormalizedCensusPeriod[];
  payerRates: NormalizedPayerRate[];
  clarifications: PipelineClarification[];
  observations: string[];
  confidence: number;
  tokensUsed: number;
  processingTimeMs: number;
}

export async function executeExtractionPass(params: {
  documentId: string;
  filename: string;
  structure: DocumentStructure;
  content: DocumentContent;
  contextManager: ExtractionContextManager;
  aiReader: AIDocumentReader;
  extractionFocus?: ('financial' | 'census' | 'rates')[];
  onProgress?: (progress: number, message: string) => void;
}): Promise<ExtractionPassResult> {
  const {
    documentId,
    filename,
    structure,
    content,
    contextManager,
    aiReader,
    extractionFocus = ['financial', 'census', 'rates'],
    onProgress,
  } = params;

  const startTime = Date.now();
  onProgress?.(0, 'Starting data extraction...');

  // Get prior context for AI
  const priorContext = contextManager.getContextSummary();

  // Execute AI extraction
  onProgress?.(10, 'Analyzing document with AI...');

  const aiResponse = await aiReader.extractData({
    documentId,
    structure,
    content,
    priorContext,
    extractionFocus,
  });

  onProgress?.(60, 'Processing extracted data...');

  // Process extracted data
  console.log(`[Extraction] Processing AI response. Financial periods: ${aiResponse.extractedData.financialPeriods.length}, Census: ${aiResponse.extractedData.censusPeriods.length}`);

  let results;
  try {
    results = processExtractionResults(
      documentId,
      filename,
      aiResponse,
      contextManager
    );
    console.log(`[Extraction] Processed results. Financial periods: ${results.financialPeriods.length}, Census: ${results.censusPeriods.length}`);
  } catch (error) {
    console.error(`[Extraction] Error processing results:`, error);
    throw error;
  }

  onProgress?.(80, 'Generating clarification requests...');

  // Generate clarifications for low-confidence or problematic extractions
  const clarifications = generateClarifications(
    documentId,
    filename,
    results,
    aiResponse,
    contextManager
  );

  onProgress?.(90, 'Adding data to context...');

  // Add extracted data to context
  for (const period of results.financialPeriods) {
    contextManager.addFinancialPeriod(period);
  }
  for (const census of results.censusPeriods) {
    contextManager.addCensusPeriod(census);
  }
  for (const rate of results.payerRates) {
    contextManager.addPayerRate(rate);
  }

  // Add clarifications to context
  for (const clarification of clarifications) {
    contextManager.addClarification(clarification);
  }

  // Update stats
  contextManager.incrementStats('aiCallCount', aiReader.getCallCount());
  contextManager.incrementStats('aiTokensUsed', aiResponse.tokensUsed);
  contextManager.incrementStats('dataPointsExtracted',
    results.financialPeriods.length + results.censusPeriods.length + results.payerRates.length
  );

  onProgress?.(100, 'Extraction pass complete');

  return {
    financialPeriods: results.financialPeriods,
    censusPeriods: results.censusPeriods,
    payerRates: results.payerRates,
    clarifications,
    observations: aiResponse.observations.map((o) => `[${o.type}] ${o.message}`),
    confidence: aiResponse.confidence,
    tokensUsed: aiResponse.tokensUsed,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// RESULT PROCESSING
// ============================================================================

function processExtractionResults(
  documentId: string,
  filename: string,
  aiResponse: AIExtractionResponse,
  contextManager: ExtractionContextManager
): {
  financialPeriods: NormalizedFinancialPeriod[];
  censusPeriods: NormalizedCensusPeriod[];
  payerRates: NormalizedPayerRate[];
} {
  const financialPeriods: NormalizedFinancialPeriod[] = [];
  const censusPeriods: NormalizedCensusPeriod[] = [];
  const payerRates: NormalizedPayerRate[] = [];

  // Process financial periods
  for (const partial of aiResponse.extractedData.financialPeriods) {
    // Find or create facility
    const { profile } = contextManager.findOrCreateFacility(partial.facilityName);

    const normalized = parseFinancialPeriod(partial, profile.id, documentId, filename);
    if (normalized) {
      financialPeriods.push(normalized);
    }
  }

  // Process census periods
  for (const partial of aiResponse.extractedData.censusPeriods) {
    const { profile } = contextManager.findOrCreateFacility(partial.facilityName);

    const normalized = parseCensusPeriod(partial, profile.id, documentId, filename);
    if (normalized) {
      censusPeriods.push(normalized);
    }
  }

  // Process payer rates
  for (const partial of aiResponse.extractedData.payerRates) {
    const { profile } = contextManager.findOrCreateFacility(partial.facilityName);

    const normalized = parsePayerRate(partial, profile.id, documentId, filename);
    if (normalized) {
      payerRates.push(normalized);
    }
  }

  // Process facility info
  for (const info of aiResponse.extractedData.facilityInfo) {
    const { profile, isNew } = contextManager.findOrCreateFacility(info.name);
    const builder = contextManager.getFacilityBuilder(profile.id);

    if (builder) {
      if (info.aliases) {
        for (const alias of info.aliases) {
          builder.addAlias(alias);
        }
      }
      if (info.ccn) builder.setCcn(info.ccn);
      if (info.npi) builder.setNpi(info.npi);
      if (info.address) builder.setAddress(info.address);
      if (info.licensedBeds) builder.setLicensedBeds(info.licensedBeds);
      if (info.certifiedBeds) builder.setCertifiedBeds(info.certifiedBeds);
    }
  }

  return { financialPeriods, censusPeriods, payerRates };
}

// ============================================================================
// CLARIFICATION GENERATION
// ============================================================================

function generateClarifications(
  documentId: string,
  filename: string,
  results: {
    financialPeriods: NormalizedFinancialPeriod[];
    censusPeriods: NormalizedCensusPeriod[];
    payerRates: NormalizedPayerRate[];
  },
  aiResponse: AIExtractionResponse,
  contextManager: ExtractionContextManager
): PipelineClarification[] {
  const clarifications: PipelineClarification[] = [];
  const sessionId = contextManager.getSessionId();
  const dealId = contextManager.getDealId();

  // Check financial periods for issues
  for (const period of results.financialPeriods) {
    // Low confidence on critical fields
    if (period.confidence < 70) {
      clarifications.push(createClarification({
        sessionId,
        dealId,
        facilityId: period.facilityId,
        fieldPath: 'financial.overall',
        fieldLabel: `${period.facilityName} Financial Data`,
        clarificationType: 'low_confidence',
        extractedValue: period.revenue.total,
        extractedConfidence: period.confidence,
        context: {
          documentName: filename,
          periodDescription: formatPeriodDescription(period.periodStart, period.periodEnd),
          relatedValues: [
            { label: 'Revenue', value: period.revenue.total },
            { label: 'Expenses', value: period.expenses.total },
            { label: 'NOI', value: period.metrics.noi },
          ],
        },
        priority: 7,
      }));
    }

    // Check for suspiciously high agency labor
    const agencyPercent = period.expenses.labor.total > 0
      ? period.expenses.labor.agency / period.expenses.labor.total
      : 0;
    if (agencyPercent > 0.25) { // More than 25% agency
      clarifications.push(createClarification({
        sessionId,
        dealId,
        facilityId: period.facilityId,
        fieldPath: 'expenses.labor.agency',
        fieldLabel: 'Agency Labor Percentage',
        clarificationType: 'out_of_range',
        extractedValue: agencyPercent,
        extractedConfidence: period.confidence,
        benchmarkRange: { min: 0, max: 0.15, median: 0.08 },
        context: {
          documentName: filename,
          periodDescription: formatPeriodDescription(period.periodStart, period.periodEnd),
          relatedValues: [
            { label: 'Agency Labor $', value: period.expenses.labor.agency },
            { label: 'Total Labor $', value: period.expenses.labor.total },
          ],
          aiExplanation: `Agency labor at ${(agencyPercent * 100).toFixed(1)}% is above typical benchmark of <15%`,
        },
        priority: 6,
      }));
    }

    // Check for missing revenue breakdown
    const payerTotal = Object.values(period.revenue.byPayer).reduce((a, b) => a + b, 0);
    if (period.revenue.total > 0 && payerTotal < period.revenue.total * 0.5) {
      clarifications.push(createClarification({
        sessionId,
        dealId,
        facilityId: period.facilityId,
        fieldPath: 'revenue.byPayer',
        fieldLabel: 'Revenue by Payer Breakdown',
        clarificationType: 'missing_critical',
        extractedValue: payerTotal,
        extractedConfidence: 40,
        context: {
          documentName: filename,
          periodDescription: formatPeriodDescription(period.periodStart, period.periodEnd),
          aiExplanation: 'Revenue breakdown by payer is incomplete - less than 50% of total revenue is categorized',
        },
        priority: 5,
      }));
    }
  }

  // Check census periods
  for (const census of results.censusPeriods) {
    // Check occupancy rate
    if (census.occupancyRate > 0 && (census.occupancyRate < 0.50 || census.occupancyRate > 1.0)) {
      clarifications.push(createClarification({
        sessionId,
        dealId,
        facilityId: census.facilityId,
        fieldPath: 'census.occupancyRate',
        fieldLabel: 'Occupancy Rate',
        clarificationType: 'out_of_range',
        extractedValue: census.occupancyRate,
        extractedConfidence: census.confidence,
        benchmarkRange: { min: 0.70, max: 0.95, median: 0.82 },
        context: {
          documentName: filename,
          periodDescription: formatPeriodDescription(census.periodStart, census.periodEnd),
          relatedValues: [
            { label: 'Total Beds', value: census.totalBeds },
            { label: 'ADC', value: census.avgDailyCensus },
          ],
        },
        priority: 7,
      }));
    }
  }

  // Add AI-suggested clarifications
  for (const aiQuestion of aiResponse.suggestedClarifications) {
    clarifications.push(createClarification({
      sessionId,
      dealId,
      fieldPath: aiQuestion.field,
      fieldLabel: aiQuestion.field.split('.').pop() || aiQuestion.field,
      clarificationType: 'validation_error',
      extractedValue: null,
      extractedConfidence: 50,
      suggestedValues: aiQuestion.suggestedAnswers?.map((a) => ({
        value: a,
        source: 'AI suggestion',
        confidence: 60,
      })),
      context: {
        documentName: filename,
        aiExplanation: aiQuestion.question,
      },
      priority: aiQuestion.priority,
    }));
  }

  return clarifications;
}

function createClarification(params: {
  sessionId: string;
  dealId: string;
  facilityId?: string;
  fieldPath: string;
  fieldLabel: string;
  clarificationType: PipelineClarification['clarificationType'];
  extractedValue: number | string | null;
  extractedConfidence: number;
  suggestedValues?: PipelineClarification['suggestedValues'];
  benchmarkRange?: PipelineClarification['benchmarkRange'];
  context: PipelineClarification['context'];
  priority: number;
}): PipelineClarification {
  return {
    id: nanoid(),
    sessionId: params.sessionId,
    dealId: params.dealId,
    facilityId: params.facilityId,
    fieldPath: params.fieldPath,
    fieldLabel: params.fieldLabel,
    clarificationType: params.clarificationType,
    priority: params.priority,
    extractedValue: params.extractedValue,
    extractedConfidence: params.extractedConfidence,
    suggestedValues: params.suggestedValues || [],
    context: params.context,
    benchmarkRange: params.benchmarkRange,
    status: 'pending',
    createdAt: new Date(),
  };
}

function formatPeriodDescription(start: Date, end: Date): string {
  const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr} - ${endStr}`;
}

export default { executeExtractionPass };
