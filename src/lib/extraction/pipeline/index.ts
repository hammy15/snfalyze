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
export { ExtractionContextManager } from './context/extraction-context';
export { FacilityProfileBuilder } from './context/facility-profile';
export { AIDocumentReader, createAIDocumentReader } from './ai/document-reader';
export { ProgressEmitter, createProgressEmitter, createSSEResponse } from './stream/progress-emitter';

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

  private async loadDocuments(): Promise<{
    id: string;
    filename: string;
    rawText: string | null;
    extractedData: unknown;
    type: string | null;
  }[]> {
    const docs = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        rawText: documents.rawText,
        extractedData: documents.extractedData,
        type: documents.type,
      })
      .from(documents)
      .where(inArray(documents.id, this.documentIds));

    return docs;
  }

  private async processDocument(
    doc: {
      id: string;
      filename: string;
      rawText: string | null;
      extractedData: unknown;
      type: string | null;
    },
    index: number,
    total: number
  ): Promise<void> {
    this.emitter.documentStarted(doc.id, doc.filename, index, total);

    // Load document content from database fields
    const content = this.parseDocumentContent(doc);
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

  /**
   * Parse document content from database fields (rawText and extractedData).
   * The content is already extracted during upload and stored in the database.
   */
  private parseDocumentContent(doc: {
    id: string;
    filename: string;
    rawText: string | null;
    extractedData: unknown;
    type: string | null;
  }): DocumentContent | null {
    try {
      const filename = doc.filename.toLowerCase();
      const extractedData = doc.extractedData as Record<string, unknown> | null;

      // Excel files - sheets are stored in extractedData
      if (
        filename.endsWith('.xlsx') ||
        filename.endsWith('.xls') ||
        (extractedData && 'sheets' in extractedData)
      ) {
        const sheets = this.parseExcelFromExtractedData(extractedData);
        if (sheets.length > 0) {
          return { type: 'excel', sheets };
        }
      }

      // CSV files - csvData is stored in extractedData
      if (filename.endsWith('.csv') || (extractedData && 'csvData' in extractedData)) {
        const sheets = this.parseCSVFromExtractedData(extractedData);
        if (sheets.length > 0) {
          return { type: 'csv', sheets };
        }
      }

      // PDF files - rawText contains the extracted text
      if (filename.endsWith('.pdf') && doc.rawText) {
        return { type: 'pdf', text: doc.rawText };
      }

      // Fallback: if we have rawText, treat as text document
      if (doc.rawText && doc.rawText.length > 0) {
        return { type: 'pdf', text: doc.rawText };
      }

      return null;
    } catch (error) {
      console.error(`Error parsing document content for ${doc.filename}:`, error);
      return null;
    }
  }

  /**
   * Parse Excel sheet data from extractedData JSONB field.
   * Format: { sheets: { sheetName: [[row1], [row2], ...] }, sheetNames: [...] }
   */
  private parseExcelFromExtractedData(extractedData: Record<string, unknown> | null): SheetContent[] {
    if (!extractedData || !('sheets' in extractedData)) {
      return [];
    }

    const sheets: SheetContent[] = [];
    const sheetsData = extractedData.sheets as Record<string, (string | number | null)[][]>;
    const sheetNames = (extractedData.sheetNames as string[]) || Object.keys(sheetsData);

    for (const sheetName of sheetNames) {
      const data = sheetsData[sheetName];
      if (!data || data.length === 0) continue;

      const headers = (data[0] || []).map((h) => String(h ?? ''));
      const rows = data.slice(1);

      sheets.push({
        name: sheetName,
        headers,
        rows,
        rowCount: rows.length,
        columnCount: headers.length,
      });
    }

    return sheets;
  }

  /**
   * Parse CSV data from extractedData JSONB field.
   * Format: { csvData: [[row1], [row2], ...], rowCount: number }
   */
  private parseCSVFromExtractedData(extractedData: Record<string, unknown> | null): SheetContent[] {
    if (!extractedData || !('csvData' in extractedData)) {
      return [];
    }

    const data = extractedData.csvData as (string | number | null)[][];
    if (!data || data.length === 0) {
      return [];
    }

    const headers = (data[0] || []).map((h) => String(h ?? ''));
    const rows = data.slice(1);

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
