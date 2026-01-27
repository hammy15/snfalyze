/**
 * Sequential AI Extraction Pipeline
 *
 * Main orchestrator for the multi-pass AI extraction system.
 * Processes documents sequentially with context accumulation.
 */

import { nanoid } from 'nanoid';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';
import { ExtractionContextManager } from './context/extraction-context';
import { AIDocumentReader, createAIDocumentReader } from './ai/document-reader';
import { executeStructurePass } from './passes/structure-pass';
import { executeExtractionPass } from './passes/extraction-pass';
import { executeValidationPass } from './passes/validation-pass';
import { writeToDatabase } from './population/db-writer';
import { ProgressEmitter, createProgressEmitter, createSSEResponse } from './stream/progress-emitter';
import type {
  PipelineSession,
  PipelineStatus,
  PipelineProgress,
  DocumentContent,
  SheetContent,
  DocumentStructure,
} from './types';

// Re-export types and utilities
export * from './types';
export * from './stream/event-types';
export { ExtractionContextManager } from './context/extraction-context';
export { FacilityProfileBuilder } from './context/facility-profile';
export { AIDocumentReader, createAIDocumentReader } from './ai/document-reader';
export { ProgressEmitter, createProgressEmitter, createSSEResponse } from './stream/progress-emitter';
export { resolveConflict, resolveConflictsBatch, generateSuggestedValues } from './validation/conflict-resolver';
export { normalizeFinancialPeriod, normalizeCensusPeriod, normalizePayerRate } from './normalization/normalizer';

// ============================================================================
// PIPELINE SESSION STORE (In-memory for now)
// ============================================================================

const sessionStore = new Map<string, {
  session: PipelineSession;
  emitter: ProgressEmitter;
  contextManager: ExtractionContextManager;
}>();

// ============================================================================
// MAIN PIPELINE CLASS
// ============================================================================

export class ExtractionPipeline {
  private sessionId: string;
  private dealId: string;
  private documentIds: string[];
  private contextManager: ExtractionContextManager;
  private aiReader: AIDocumentReader;
  private emitter: ProgressEmitter;
  private session: PipelineSession;

  constructor(params: {
    dealId: string;
    documentIds: string[];
    apiKey?: string;
    model?: string;
  }) {
    this.sessionId = nanoid();
    this.dealId = params.dealId;
    this.documentIds = params.documentIds;

    // Initialize components
    this.contextManager = new ExtractionContextManager(this.sessionId, this.dealId);
    this.aiReader = createAIDocumentReader(params.apiKey, params.model);
    this.emitter = createProgressEmitter(this.sessionId);

    // Initialize session
    this.session = {
      id: this.sessionId,
      dealId: this.dealId,
      status: 'initializing',
      documentIds: this.documentIds,
      currentDocumentIndex: 0,
      currentPass: 'structure',
      progress: {
        totalDocuments: this.documentIds.length,
        processedDocuments: 0,
        phase: 'Initializing',
        overallProgress: 0,
        extractedFacilities: 0,
        extractedPeriods: 0,
        detectedConflicts: 0,
        pendingClarifications: 0,
      },
      context: this.contextManager.getContext(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Store session
    sessionStore.set(this.sessionId, {
      session: this.session,
      emitter: this.emitter,
      contextManager: this.contextManager,
    });
  }

  // --------------------------------------------------------------------------
  // Getters
  // --------------------------------------------------------------------------

  getSessionId(): string {
    return this.sessionId;
  }

  getSession(): PipelineSession {
    return this.session;
  }

  getEmitter(): ProgressEmitter {
    return this.emitter;
  }

  getContextManager(): ExtractionContextManager {
    return this.contextManager;
  }

  // --------------------------------------------------------------------------
  // Main Execution
  // --------------------------------------------------------------------------

  /**
   * Execute the full extraction pipeline
   */
  async execute(): Promise<PipelineSession> {
    const startTime = Date.now();

    try {
      // Emit session started
      this.updateStatus('processing');
      this.emitter.sessionStarted(this.dealId, this.documentIds);

      // Load documents from database
      const docs = await this.loadDocuments();
      if (docs.length === 0) {
        throw new Error('No documents found');
      }

      // Process each document sequentially
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];
        this.session.currentDocumentIndex = i;

        await this.processDocument(doc, i, docs.length);
      }

      // Run validation pass on all accumulated data
      this.session.currentPass = 'validation';
      this.emitter.validationStarted();

      const validationResult = await executeValidationPass({
        contextManager: this.contextManager,
        onProgress: (progress, message) => {
          this.emitter.passProgress('validation', progress, message);
        },
      });

      this.emitter.validationCompleted({
        isValid: validationResult.isValid,
        conflictsDetected: validationResult.conflicts.length,
        conflictsAutoResolved: validationResult.autoResolved.length,
        clarificationsNeeded: validationResult.clarifications.length,
        validationScore: validationResult.validationScore,
      });

      // Emit conflicts
      for (const conflict of validationResult.conflicts) {
        this.emitter.conflictDetected({
          conflictId: conflict.id,
          type: conflict.type,
          severity: conflict.severity,
          fieldPath: conflict.fieldPath,
          valueCount: conflict.values.length,
          variancePercent: conflict.variancePercent,
        });
      }

      // Emit clarifications
      for (const clarification of validationResult.clarifications) {
        this.emitter.clarificationNeeded({
          clarificationId: clarification.id,
          fieldLabel: clarification.fieldLabel,
          priority: clarification.priority,
          clarificationType: clarification.clarificationType,
        });
      }

      // Check if we need clarifications before population
      const pendingClarifications = this.contextManager.getPendingClarifications();
      if (pendingClarifications.some((c) => c.priority >= 8)) {
        // High-priority clarifications need resolution first
        this.updateStatus('awaiting_clarifications');
        this.updateProgress();

        this.emitter.sessionCompleted({
          facilitiesExtracted: this.contextManager.getFacilityProfiles().length,
          periodsExtracted: this.contextManager.getExtractedPeriods().length,
          conflictsDetected: this.contextManager.getDetectedConflicts().length,
          conflictsResolved: validationResult.autoResolved.length,
          clarificationsPending: pendingClarifications.length,
          overallConfidence: this.contextManager.getOverallConfidence(),
          processingTimeMs: Date.now() - startTime,
        });

        return this.session;
      }

      // Write to database
      this.session.currentPass = 'population';
      this.emitter.populationStarted();

      const populationResult = await writeToDatabase({
        contextManager: this.contextManager,
        onProgress: (progress, message) => {
          this.emitter.passProgress('population', progress, message);
        },
      });

      this.emitter.populationCompleted({
        financialPeriodsWritten: populationResult.financialPeriodsWritten,
        censusPeriodsWritten: populationResult.censusPeriodsWritten,
        payerRatesWritten: populationResult.payerRatesWritten,
        facilitiesUpdated: populationResult.facilitiesUpdated,
      });

      // Complete session
      this.updateStatus('completed');
      this.session.completedAt = new Date();

      const stats = this.contextManager.getStats();
      this.emitter.sessionCompleted({
        facilitiesExtracted: this.contextManager.getFacilityProfiles().length,
        periodsExtracted: this.contextManager.getExtractedPeriods().length,
        conflictsDetected: this.contextManager.getDetectedConflicts().length,
        conflictsResolved: validationResult.autoResolved.length,
        clarificationsPending: pendingClarifications.length,
        overallConfidence: this.contextManager.getOverallConfidence(),
        processingTimeMs: Date.now() - startTime,
      });

      return this.session;
    } catch (error) {
      this.updateStatus('failed');
      this.session.error = error instanceof Error ? error.message : 'Unknown error';

      this.emitter.sessionFailed(
        this.session.error,
        this.session.currentPass,
        this.documentIds[this.session.currentDocumentIndex]
      );

      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Document Processing
  // --------------------------------------------------------------------------

  private async loadDocuments(): Promise<{ id: string; filename: string; rawText: string | null; extractedData: unknown }[]> {
    const docs = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        rawText: documents.rawText,
        extractedData: documents.extractedData,
      })
      .from(documents)
      .where(inArray(documents.id, this.documentIds));

    return docs;
  }

  private async processDocument(
    doc: { id: string; filename: string; rawText: string | null; extractedData: unknown },
    index: number,
    total: number
  ): Promise<void> {
    this.emitter.documentStarted(doc.id, doc.filename, index, total);

    // Load document content from stored data
    const content = await this.loadDocumentContent(doc);
    if (!content) {
      this.emitter.error(`Failed to load content for ${doc.filename}`, 'LOAD_ERROR', true);
      return;
    }

    // Pass 1: Structure Analysis
    this.session.currentPass = 'structure';
    this.emitter.passStarted('structure', doc.id, doc.filename);

    const structureResult = await executeStructurePass({
      documentId: doc.id,
      filename: doc.filename,
      content,
      contextManager: this.contextManager,
      aiReader: this.aiReader,
      onProgress: (progress, message) => {
        this.emitter.passProgress('structure', progress, message);
      },
    });

    this.emitter.passCompleted('structure', doc.id, structureResult.processingTimeMs);
    this.contextManager.incrementStats('sheetsAnalyzed', structureResult.structure.sheets.length);

    // Emit detected facilities
    for (const facilityName of structureResult.structure.detectedFacilities) {
      const { profile, isNew } = this.contextManager.findOrCreateFacility(facilityName);
      this.emitter.facilityDetected(profile.id, profile.name, isNew);
    }

    // Pass 2: Data Extraction
    this.session.currentPass = 'extraction';
    this.emitter.passStarted('extraction', doc.id, doc.filename);

    const extractionResult = await executeExtractionPass({
      documentId: doc.id,
      filename: doc.filename,
      structure: structureResult.structure,
      content,
      contextManager: this.contextManager,
      aiReader: this.aiReader,
      onProgress: (progress, message) => {
        this.emitter.passProgress('extraction', progress, message);
      },
    });

    this.emitter.passCompleted(
      'extraction',
      doc.id,
      extractionResult.processingTimeMs,
      extractionResult.financialPeriods.length +
        extractionResult.censusPeriods.length +
        extractionResult.payerRates.length
    );

    // Emit extracted periods
    for (const period of extractionResult.financialPeriods) {
      this.emitter.periodExtracted(
        'financial',
        period.facilityName,
        `${period.periodStart.toISOString().split('T')[0]} to ${period.periodEnd.toISOString().split('T')[0]}`,
        period.confidence
      );
    }

    for (const census of extractionResult.censusPeriods) {
      this.emitter.periodExtracted(
        'census',
        census.facilityName,
        `${census.periodStart.toISOString().split('T')[0]} to ${census.periodEnd.toISOString().split('T')[0]}`,
        census.confidence
      );
    }

    for (const rate of extractionResult.payerRates) {
      this.emitter.periodExtracted(
        'rate',
        rate.facilityName,
        rate.effectiveDate.toISOString().split('T')[0],
        rate.confidence
      );
    }

    // Document complete
    this.emitter.documentCompleted(doc.id, doc.filename, {
      financialPeriodsExtracted: extractionResult.financialPeriods.length,
      censusPeriodsExtracted: extractionResult.censusPeriods.length,
      payerRatesExtracted: extractionResult.payerRates.length,
      confidence: extractionResult.confidence,
    });

    this.session.progress.processedDocuments++;
    this.contextManager.incrementStats('documentsProcessed');
    this.updateProgress();
  }

  private async loadDocumentContent(
    doc: { id: string; filename: string; rawText: string | null; extractedData: unknown }
  ): Promise<DocumentContent | null> {
    try {
      const fileType = this.getFileType(doc.filename);

      // If we have extractedData with sheets, use that
      if (doc.extractedData && typeof doc.extractedData === 'object') {
        const data = doc.extractedData as Record<string, unknown>;

        // Check if it contains sheet data
        if (data.sheets && Array.isArray(data.sheets)) {
          return {
            type: fileType === 'csv' ? 'csv' : 'excel',
            sheets: data.sheets as SheetContent[],
          };
        }

        // Try to convert extractedData to sheet format
        if (Object.keys(data).length > 0) {
          const sheets = this.convertExtractedDataToSheets(data);
          if (sheets.length > 0) {
            return {
              type: 'excel',
              sheets,
            };
          }
        }
      }

      // If we have raw text, use that
      if (doc.rawText) {
        if (fileType === 'pdf') {
          return {
            type: 'pdf',
            text: doc.rawText,
          };
        }

        // Try to parse raw text as CSV
        if (fileType === 'csv') {
          const sheets = this.parseCSVText(doc.rawText);
          return {
            type: 'csv',
            sheets,
          };
        }
      }

      // If neither, the document may not be ready for extraction
      console.warn(`Document ${doc.filename} has no usable content`);
      return null;
    } catch (error) {
      console.error(`Error loading document ${doc.filename}:`, error);
      return null;
    }
  }

  private getFileType(filename: string): 'excel' | 'pdf' | 'csv' | 'unknown' {
    const lower = filename.toLowerCase();
    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      return 'excel';
    }
    if (lower.endsWith('.csv')) {
      return 'csv';
    }
    if (lower.endsWith('.pdf')) {
      return 'pdf';
    }
    return 'unknown';
  }

  private convertExtractedDataToSheets(data: Record<string, unknown>): SheetContent[] {
    // Convert various extractedData formats into sheet format
    const sheets: SheetContent[] = [];

    // If data has named sections that look like sheets
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        // Array of objects - convert to sheet
        const firstRow = value[0] as Record<string, unknown>;
        const headers = Object.keys(firstRow);
        const rows = value.map((row) => {
          const rowObj = row as Record<string, unknown>;
          return headers.map((h) => {
            const val = rowObj[h];
            if (val === null || val === undefined) return null;
            if (typeof val === 'number') return val;
            return String(val);
          });
        });

        sheets.push({
          name: key,
          headers,
          rows,
          rowCount: rows.length,
          columnCount: headers.length,
        });
      }
    }

    return sheets;
  }

  private parseCSVText(text: string): SheetContent[] {
    // Simple CSV parsing
    const lines = text.split('\n').filter((l) => l.trim());
    if (lines.length === 0) return [];

    const headers = lines[0]?.split(',').map((h) => h.trim()) || [];
    const rows = lines.slice(1).map((line) =>
      line.split(',').map((cell) => {
        const trimmed = cell.trim();
        const num = parseFloat(trimmed);
        return isNaN(num) ? trimmed : num;
      })
    );

    return [
      {
        name: 'Sheet1',
        headers,
        rows,
        rowCount: rows.length,
        columnCount: headers.length,
      },
    ];
  }

  // --------------------------------------------------------------------------
  // Status & Progress
  // --------------------------------------------------------------------------

  private updateStatus(status: PipelineStatus): void {
    this.session.status = status;
    this.session.updatedAt = new Date();
  }

  private updateProgress(): void {
    const ctx = this.contextManager;
    this.session.progress = {
      totalDocuments: this.documentIds.length,
      processedDocuments: this.session.progress.processedDocuments,
      currentDocument: this.session.progress.currentDocument,
      phase: this.session.currentPass,
      overallProgress: Math.round(
        (this.session.progress.processedDocuments / this.documentIds.length) * 100
      ),
      extractedFacilities: ctx.getFacilityProfiles().length,
      extractedPeriods: ctx.getExtractedPeriods().length + ctx.getExtractedCensus().length + ctx.getExtractedRates().length,
      detectedConflicts: ctx.getDetectedConflicts().length,
      pendingClarifications: ctx.getPendingClarifications().length,
    };
    this.session.context = ctx.getContext();
  }
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Get a pipeline session by ID
 */
export function getSession(sessionId: string): PipelineSession | null {
  const stored = sessionStore.get(sessionId);
  return stored?.session || null;
}

/**
 * Get the progress emitter for a session
 */
export function getSessionEmitter(sessionId: string): ProgressEmitter | null {
  const stored = sessionStore.get(sessionId);
  return stored?.emitter || null;
}

/**
 * Get the context manager for a session
 */
export function getSessionContext(sessionId: string): ExtractionContextManager | null {
  const stored = sessionStore.get(sessionId);
  return stored?.contextManager || null;
}

/**
 * Resolve a clarification for a session
 */
export function resolveClarification(
  sessionId: string,
  clarificationId: string,
  resolvedValue: number | string,
  resolvedBy: string,
  note?: string
): boolean {
  const stored = sessionStore.get(sessionId);
  if (!stored) return false;

  stored.contextManager.resolveClarification(clarificationId, resolvedValue, resolvedBy, note);
  return true;
}

/**
 * Continue pipeline after clarifications are resolved
 */
export async function continuePipelineAfterClarifications(sessionId: string): Promise<PipelineSession | null> {
  const stored = sessionStore.get(sessionId);
  if (!stored) return null;

  const { session, contextManager, emitter } = stored;

  // Check if all high-priority clarifications are resolved
  const pending = contextManager.getPendingClarifications();
  if (pending.some((c) => c.priority >= 8)) {
    return session; // Still has high-priority clarifications
  }

  // Continue with population
  session.status = 'processing';
  session.currentPass = 'population';
  emitter.populationStarted();

  try {
    const populationResult = await writeToDatabase({
      contextManager,
      onProgress: (progress, message) => {
        emitter.passProgress('population', progress, message);
      },
    });

    emitter.populationCompleted({
      financialPeriodsWritten: populationResult.financialPeriodsWritten,
      censusPeriodsWritten: populationResult.censusPeriodsWritten,
      payerRatesWritten: populationResult.payerRatesWritten,
      facilitiesUpdated: populationResult.facilitiesUpdated,
    });

    session.status = 'completed';
    session.completedAt = new Date();

    emitter.sessionCompleted({
      facilitiesExtracted: contextManager.getFacilityProfiles().length,
      periodsExtracted: contextManager.getExtractedPeriods().length,
      conflictsDetected: contextManager.getDetectedConflicts().length,
      conflictsResolved: contextManager.getDetectedConflicts().filter((c) => c.status !== 'detected').length,
      clarificationsPending: pending.length,
      overallConfidence: contextManager.getOverallConfidence(),
      processingTimeMs: 0, // Could track this
    });

    return session;
  } catch (error) {
    session.status = 'failed';
    session.error = error instanceof Error ? error.message : 'Unknown error';
    emitter.sessionFailed(session.error, 'population');
    throw error;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create and start an extraction pipeline
 */
export async function startExtractionPipeline(params: {
  dealId: string;
  documentIds: string[];
  apiKey?: string;
  model?: string;
}): Promise<{
  sessionId: string;
  pipeline: ExtractionPipeline;
  executePromise: Promise<PipelineSession>;
}> {
  const pipeline = new ExtractionPipeline(params);

  // Start execution asynchronously
  const executePromise = pipeline.execute();

  return {
    sessionId: pipeline.getSessionId(),
    pipeline,
    executePromise,
  };
}

export default {
  ExtractionPipeline,
  startExtractionPipeline,
  getSession,
  getSessionEmitter,
  getSessionContext,
  resolveClarification,
  continuePipelineAfterClarifications,
};
