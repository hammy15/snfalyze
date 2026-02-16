/**
 * Smart Intake Pipeline — "Drop and Go" Orchestrator
 *
 * Chains 7 phases: Ingest → Extract → Clarify → Assemble → Analyze → Tools → Synthesize
 * Streams progress via SSE events. Pauses for clarifications when needed.
 */

import { nanoid } from 'nanoid';
import { EventEmitter } from 'events';
import { db, deals, facilities, documents, analysisStages, pipelineSessions } from '@/db';
import { eq } from 'drizzle-orm';
import { classifyDocument } from '@/lib/documents/processor';
import { analyzeDocument } from '@/lib/documents/ai-analyzer';
import { analyzeDeal, type AnalysisInput } from '@/lib/analysis/engine';
import { matchExtractedFacilityToCMS } from '@/lib/cms/provider-lookup';
import { autoRunTools } from './tool-runner';
import { getRouter } from '@/lib/ai';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import type {
  SmartPipelineSession,
  PipelinePhase,
  PipelineStatus,
  PhaseResult,
  ParsedFile,
  ExtractedFacility,
  ExtractedDealData,
  ClarificationRequest,
  ClarificationAnswer,
  AnalysisSummary,
  DealSynthesis,
  RedFlag,
  PipelineSSEEvent,
  PipelineEventType,
  REQUIRED_DOCUMENT_TYPES,
} from './types';
import { createPipelineEvent, formatPipelineEventForSSE } from './types';

// ============================================================================
// PIPELINE EMITTER
// ============================================================================

export class PipelineEmitter extends EventEmitter {
  private sessionId: string;
  private history: PipelineSSEEvent[] = [];

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
    this.setMaxListeners(50);
  }

  emit(type: string, ...args: unknown[]): boolean {
    return super.emit(type, ...args);
  }

  emitPipelineEvent(type: PipelineEventType, data: Record<string, unknown>): void {
    const event = createPipelineEvent(type, this.sessionId, data);
    this.history.push(event);
    if (this.history.length > 200) this.history.shift();
    super.emit('event', event);
    super.emit(type, event);
  }

  getHistory(): PipelineSSEEvent[] {
    return [...this.history];
  }

  heartbeat(): void {
    this.emitPipelineEvent('heartbeat', { time: new Date().toISOString() });
  }
}

// ============================================================================
// IN-MEMORY SESSION STORE
// ============================================================================

const pipelineStore = new Map<string, SmartIntakePipeline>();

export function getPipelineSession(sessionId: string): SmartIntakePipeline | undefined {
  return pipelineStore.get(sessionId);
}

// ============================================================================
// SSE RESPONSE HELPER
// ============================================================================

export function createPipelineSSEResponse(emitter: PipelineEmitter): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      for (const event of emitter.getHistory()) {
        controller.enqueue(encoder.encode(formatPipelineEventForSSE(event)));
      }

      const onEvent = (event: PipelineSSEEvent) => {
        try {
          controller.enqueue(encoder.encode(formatPipelineEventForSSE(event)));
        } catch {
          // Stream closed
        }
      };

      emitter.on('event', onEvent);

      const heartbeat = setInterval(() => emitter.heartbeat(), 15000);

      const cleanup = () => {
        clearInterval(heartbeat);
        emitter.off('event', onEvent);
      };

      emitter.once('pipeline_complete', () => {
        setTimeout(() => { cleanup(); controller.close(); }, 200);
      });

      emitter.once('pipeline_error', () => {
        setTimeout(() => { cleanup(); controller.close(); }, 200);
      });
    },
  });
}

// ============================================================================
// MAIN PIPELINE CLASS
// ============================================================================

export class SmartIntakePipeline {
  private session: SmartPipelineSession;
  private emitter: PipelineEmitter;
  private clarificationResolver: ((answers: ClarificationAnswer[]) => void) | null = null;

  constructor() {
    const sessionId = nanoid();
    this.emitter = new PipelineEmitter(sessionId);

    this.session = {
      id: sessionId,
      status: 'idle',
      currentPhase: 'ingest',
      phases: {},
      files: [],
      extractedData: {
        suggestedDealName: 'New Deal',
        suggestedAssetType: 'SNF',
        facilities: [],
        financials: { periods: [] },
        operatingMetrics: {},
      },
      clarifications: [],
      clarificationAnswers: [],
      toolResults: [],
      redFlags: [],
      completenessScore: 0,
      missingDocuments: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    pipelineStore.set(sessionId, this);
  }

  getSessionId(): string {
    return this.session.id;
  }

  getSession(): SmartPipelineSession {
    return this.session;
  }

  getEmitter(): PipelineEmitter {
    return this.emitter;
  }

  // --------------------------------------------------------------------------
  // MAIN EXECUTION
  // --------------------------------------------------------------------------

  async execute(fileBuffers: Array<{ name: string; buffer: Buffer; type: string }>): Promise<void> {
    const startTime = Date.now();
    this.session.status = 'running';

    this.emitter.emitPipelineEvent('pipeline_started', {
      sessionId: this.session.id,
      fileCount: fileBuffers.length,
    });

    try {
      // Persist session to DB
      await this.persistSession();

      // Phase 1: Ingest
      await this.phaseIngest(fileBuffers);

      // Phase 2: Extract
      await this.phaseExtract();

      // Phase 3: Clarify (may pause)
      await this.phaseClarify();

      // Phase 4: Assemble
      await this.phaseAssemble();

      // Phase 5: Analyze
      await this.phaseAnalyze();

      // Phase 6: Tools
      await this.phaseTools();

      // Phase 7: Synthesize
      await this.phaseSynthesize();

      // Complete
      this.session.status = 'completed';
      this.session.completedAt = new Date();
      await this.persistSession();

      this.emitter.emitPipelineEvent('pipeline_complete', {
        dealId: this.session.dealId,
        summary: this.session.synthesis,
        durationMs: Date.now() - startTime,
      });
    } catch (error) {
      this.session.status = 'failed';
      this.session.error = error instanceof Error ? error.message : 'Pipeline failed';
      await this.persistSession();

      this.emitter.emitPipelineEvent('pipeline_error', {
        phase: this.session.currentPhase,
        error: this.session.error,
      });
    } finally {
      pipelineStore.delete(this.session.id);
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 1: INGEST — Parse all files
  // --------------------------------------------------------------------------

  private async phaseIngest(
    fileBuffers: Array<{ name: string; buffer: Buffer; type: string }>
  ): Promise<void> {
    this.startPhase('ingest');

    const parsedFiles: ParsedFile[] = [];

    for (let i = 0; i < fileBuffers.length; i++) {
      const file = fileBuffers[i];
      const progress = Math.round(((i + 1) / fileBuffers.length) * 100);

      this.emitter.emitPipelineEvent('phase_progress', {
        phase: 'ingest',
        percent: progress,
        message: `Parsing ${file.name}...`,
      });

      try {
        const parsed = await this.parseFile(file.name, file.buffer);
        parsedFiles.push(parsed);

        this.emitter.emitPipelineEvent('file_parsed', {
          filename: parsed.filename,
          docType: parsed.documentType,
          pageCount: parsed.pageCount || 0,
          confidence: parsed.confidence,
        });
      } catch (err) {
        console.error(`[Pipeline] Failed to parse ${file.name}:`, err);
        parsedFiles.push({
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.buffer.length,
          documentType: 'unknown',
          rawText: '',
          summary: `Failed to parse: ${err instanceof Error ? err.message : 'Unknown error'}`,
          keyFindings: [],
          confidence: 0,
        });
      }
    }

    this.session.files = parsedFiles;

    // Run completeness check
    this.runCompletenessCheck(parsedFiles);

    this.completePhase('ingest', `Parsed ${parsedFiles.length} files`);
  }

  private async parseFile(filename: string, buffer: Buffer): Promise<ParsedFile> {
    const ext = filename.split('.').pop()?.toLowerCase();
    let rawText = '';
    let spreadsheetData: Record<string, unknown[][]> | undefined;
    let pageCount: number | undefined;

    if (ext === 'pdf') {
      const pdfData = await pdfParse(buffer);
      rawText = pdfData.text;
      pageCount = pdfData.numpages;
    } else if (ext === 'xlsx' || ext === 'xls') {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      spreadsheetData = {};
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        spreadsheetData[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
        rawText += `\n--- Sheet: ${sheetName} ---\n`;
        rawText += XLSX.utils.sheet_to_csv(sheet);
      }
      pageCount = workbook.SheetNames.length;
    } else if (ext === 'csv') {
      const csvText = buffer.toString('utf-8');
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      rawText = csvText;
      if (parsed.data && parsed.data.length > 0) {
        spreadsheetData = { 'Sheet1': [parsed.meta.fields || [], ...parsed.data.map((row: any) => Object.values(row))] as unknown[][] };
      }
    } else {
      rawText = buffer.toString('utf-8').slice(0, 50000);
    }

    const documentType = classifyDocument(rawText, filename);

    // AI analysis
    let summary = '';
    let keyFindings: string[] = [];
    let confidence = 0;

    try {
      const aiResult = await analyzeDocument({
        documentId: `pipeline-${this.session.id}`,
        filename,
        documentType,
        rawText: rawText.slice(0, 30000),
        spreadsheetData,
      });
      summary = aiResult.summary;
      keyFindings = aiResult.keyFindings;
      confidence = aiResult.confidence;
    } catch {
      summary = `${documentType.replace(/_/g, ' ')} document`;
      confidence = 30;
    }

    return {
      filename,
      mimeType: ext === 'pdf' ? 'application/pdf' : ext === 'csv' ? 'text/csv' : 'application/octet-stream',
      sizeBytes: buffer.length,
      documentType,
      pageCount,
      rawText,
      summary,
      keyFindings,
      confidence,
      spreadsheetData,
    };
  }

  private runCompletenessCheck(files: ParsedFile[]): void {
    const requiredTypes = [
      { type: 'income_statement', label: 'P&L / Income Statement', critical: true },
      { type: 'census_report', label: 'Census / Occupancy Report', critical: true },
      { type: 'broker_package', label: 'Broker Package / OM', critical: false },
      { type: 'survey_history', label: 'Survey History', critical: false },
      { type: 'rent_roll', label: 'Rent Roll / Payer Detail', critical: false },
      { type: 'capex_history', label: 'Capital Expenditure History', critical: false },
      { type: 'staffing_report', label: 'Staffing / Payroll Report', critical: false },
    ];

    const foundTypes = new Set(files.map((f) => f.documentType));
    const missing: string[] = [];
    let foundCount = 0;

    for (const req of requiredTypes) {
      if (foundTypes.has(req.type)) {
        foundCount++;
      } else {
        missing.push(req.label);
      }
    }

    this.session.completenessScore = Math.round((foundCount / requiredTypes.length) * 100);
    this.session.missingDocuments = missing;

    this.emitter.emitPipelineEvent('completeness_check', {
      score: this.session.completenessScore,
      missing,
      foundCount,
      totalRequired: requiredTypes.length,
    });
  }

  // --------------------------------------------------------------------------
  // PHASE 2: EXTRACT — Pull structured data from parsed files
  // --------------------------------------------------------------------------

  private async phaseExtract(): Promise<void> {
    this.startPhase('extract');

    const allFacilities: ExtractedFacility[] = [];

    for (let i = 0; i < this.session.files.length; i++) {
      const file = this.session.files[i];
      const progress = Math.round(((i + 1) / this.session.files.length) * 100);

      this.emitter.emitPipelineEvent('phase_progress', {
        phase: 'extract',
        percent: progress,
        message: `Extracting from ${file.filename}...`,
      });

      // Extract facilities from text
      const facilities = this.extractFacilitiesFromText(file.rawText, file.filename);
      allFacilities.push(...facilities);

      // Extract financial metrics
      this.extractFinancialMetrics(file);
    }

    // Deduplicate facilities
    const dedupedFacilities = this.deduplicateFacilities(allFacilities);
    this.session.extractedData.facilities = dedupedFacilities;
    this.session.extractedData.suggestedDealName = this.inferDealName(dedupedFacilities);
    this.session.extractedData.suggestedAssetType = this.inferAssetType(dedupedFacilities);

    // Emit facility detections
    for (const f of dedupedFacilities) {
      this.emitter.emitPipelineEvent('facility_detected', {
        name: f.name,
        beds: f.licensedBeds,
        state: f.state,
        assetType: f.assetType,
        confidence: f.confidence,
      });
    }

    // Run red flag detection
    this.detectRedFlags();

    this.completePhase('extract', `Found ${dedupedFacilities.length} facilities`);
  }

  private extractFacilitiesFromText(text: string, filename: string): ExtractedFacility[] {
    const facilities: ExtractedFacility[] = [];
    const lowerText = text.toLowerCase();

    const ccnMatches = text.match(/\b(\d{2}-?\d{4}[A-Z]?)\b/g) || [];
    const bedMatches = text.match(/(\d+)\s*(?:licensed\s*)?beds?/gi) || [];

    const namePatterns = [
      /(?:facility|center|home|healthcare|nursing|rehabilitation|care)[\s:]+([A-Z][A-Za-z\s&'-]+)/g,
      /([A-Z][A-Za-z\s&'-]+(?:Healthcare|Nursing|Rehabilitation|Care|Center|Home|Living|Lodge|Manor|Village|Estates|Gardens))/g,
    ];

    const foundNames = new Set<string>();
    for (const pattern of namePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const name = match[1]?.trim();
        if (name && name.length > 3 && name.length < 100) {
          foundNames.add(name);
        }
      }
    }

    let assetType: ExtractedFacility['assetType'] = 'SNF';
    if (lowerText.includes('assisted living') || lowerText.includes(' alf ')) assetType = 'ALF';
    if (lowerText.includes('independent living') || lowerText.includes(' ilf ')) assetType = 'ILF';
    if (lowerText.includes('hospice')) assetType = 'HOSPICE';

    const US_STATES = new Set([
      'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
      'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
      'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
      'VA','WA','WV','WI','WY','DC',
    ]);

    const stateMatches = (text.match(/\b([A-Z]{2})\b/g) || []).filter((s) => US_STATES.has(s));
    const firstState = stateMatches[0] || undefined;
    const firstBeds = bedMatches[0] ? parseInt(bedMatches[0].replace(/\D/g, '')) : undefined;

    if (foundNames.size > 0) {
      let idx = 0;
      for (const name of foundNames) {
        facilities.push({
          name,
          ccn: ccnMatches[idx] || undefined,
          state: stateMatches[idx] || firstState,
          assetType,
          licensedBeds: firstBeds,
          confidence: 60,
        });
        idx++;
        if (idx >= 10) break;
      }
    } else if (ccnMatches.length > 0) {
      ccnMatches.forEach((ccn, i) => {
        facilities.push({
          name: `Facility ${i + 1} (${ccn})`,
          ccn,
          state: firstState,
          assetType,
          confidence: 40,
        });
      });
    }

    if (facilities.length === 0) {
      const cleanName = filename
        .replace(/\.(pdf|xlsx?|csv|jpe?g|png)$/i, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\b(financials?|p&?l|income|statement|report|census|om|offering)\b/gi, '')
        .trim();

      if (cleanName.length > 2) {
        facilities.push({
          name: cleanName,
          state: firstState,
          assetType,
          licensedBeds: firstBeds,
          confidence: 20,
        });
      }
    }

    return facilities;
  }

  private extractFinancialMetrics(file: ParsedFile): void {
    const text = file.rawText;
    const fin = this.session.extractedData.financials;

    // Revenue patterns
    const revenueMatch = text.match(/total\s+revenue[:\s]*\$?([\d,]+)/i);
    if (revenueMatch) {
      fin.totalRevenue = parseFloat(revenueMatch[1].replace(/,/g, ''));
    }

    // NOI patterns
    const noiMatch = text.match(/(?:net\s+operating\s+income|noi)[:\s]*\$?([\d,]+)/i);
    if (noiMatch) {
      fin.noi = parseFloat(noiMatch[1].replace(/,/g, ''));
    }

    // Asking price
    const priceMatch = text.match(/(?:asking\s+price|purchase\s+price|list\s+price)[:\s]*\$?([\d,.]+)\s*(?:M|million)?/i);
    if (priceMatch) {
      let price = parseFloat(priceMatch[1].replace(/,/g, ''));
      if (text.match(/million/i) || priceMatch[0].includes('M')) price *= 1_000_000;
      fin.askingPrice = price;
    }

    // Occupancy
    const occMatch = text.match(/occupancy[:\s]*([\d.]+)\s*%/i);
    if (occMatch) {
      this.session.extractedData.operatingMetrics.occupancyRate = parseFloat(occMatch[1]) / 100;
    }

    // Labor cost
    const laborMatch = text.match(/(?:labor|salary|wages)[:\s]*\$?([\d,]+)/i);
    if (laborMatch) {
      fin.laborCost = parseFloat(laborMatch[1].replace(/,/g, ''));
    }
  }

  private deduplicateFacilities(facilities: ExtractedFacility[]): ExtractedFacility[] {
    const seen = new Map<string, ExtractedFacility>();
    for (const f of facilities) {
      const key = f.ccn || f.name.toLowerCase().replace(/\s+/g, ' ').trim();
      const existing = seen.get(key);
      if (!existing || f.confidence > existing.confidence) {
        if (existing) {
          seen.set(key, {
            ...existing,
            ...f,
            licensedBeds: f.licensedBeds || existing.licensedBeds,
            certifiedBeds: f.certifiedBeds || existing.certifiedBeds,
            state: f.state || existing.state,
            confidence: Math.max(f.confidence, existing.confidence),
          });
        } else {
          seen.set(key, f);
        }
      }
    }
    return Array.from(seen.values());
  }

  private inferDealName(facilities: ExtractedFacility[]): string {
    if (facilities.length === 1) return facilities[0].name;
    if (facilities.length > 1) {
      const words = facilities.map((f) => f.name.split(/\s+/));
      const common = words[0]?.filter((w) =>
        words.every((ws) => ws.some((ww) => ww.toLowerCase() === w.toLowerCase()))
      );
      if (common && common.length > 0) return `${common.join(' ')} Portfolio`;
      return `${facilities.length}-Facility Portfolio`;
    }
    if (this.session.files.length > 0) {
      return this.session.files[0].filename.replace(/\.(pdf|xlsx?|csv)$/i, '').replace(/[_-]/g, ' ');
    }
    return 'New Deal';
  }

  private inferAssetType(facilities: ExtractedFacility[]): 'SNF' | 'ALF' | 'ILF' | 'HOSPICE' {
    const counts: Record<string, number> = {};
    facilities.forEach((f) => (counts[f.assetType] = (counts[f.assetType] || 0) + 1));
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return (sorted[0]?.[0] as 'SNF' | 'ALF' | 'ILF' | 'HOSPICE') || 'SNF';
  }

  // --------------------------------------------------------------------------
  // RED FLAG DETECTION
  // --------------------------------------------------------------------------

  private detectRedFlags(): void {
    const fin = this.session.extractedData.financials;
    const ops = this.session.extractedData.operatingMetrics;
    const flags: RedFlag[] = [];

    // Financial red flags
    if (fin.noi && fin.totalRevenue) {
      const noiMargin = fin.noi / fin.totalRevenue;
      if (noiMargin > 0.25) {
        flags.push({
          id: nanoid(),
          severity: 'warning',
          category: 'seller_manipulation',
          message: `NOI margin of ${(noiMargin * 100).toFixed(1)}% is unusually high — possible seller add-backs`,
          phase: 'extract',
        });
      }
      if (noiMargin < 0.05) {
        flags.push({
          id: nanoid(),
          severity: 'critical',
          category: 'financial',
          message: `NOI margin of ${(noiMargin * 100).toFixed(1)}% is critically low`,
          phase: 'extract',
        });
      }
    }

    if (fin.laborCost && fin.totalRevenue) {
      const laborRatio = fin.laborCost / fin.totalRevenue;
      if (laborRatio < 0.45) {
        flags.push({
          id: nanoid(),
          severity: 'warning',
          category: 'operational',
          message: `Labor cost ratio of ${(laborRatio * 100).toFixed(1)}% is low — possible understaffing`,
          phase: 'extract',
        });
      }
    }

    if (ops.agencyPercent && ops.agencyPercent > 0.15) {
      flags.push({
        id: nanoid(),
        severity: 'warning',
        category: 'operational',
        message: `Agency labor at ${(ops.agencyPercent * 100).toFixed(1)}% — staffing instability risk`,
        phase: 'extract',
      });
    }

    if (ops.occupancyRate && ops.occupancyRate < 0.75) {
      flags.push({
        id: nanoid(),
        severity: 'warning',
        category: 'operational',
        message: `Occupancy at ${(ops.occupancyRate * 100).toFixed(1)}% — below 75% threshold`,
        phase: 'extract',
      });
    }

    if (ops.payerMix?.medicaid && ops.payerMix.medicaid > 0.60) {
      flags.push({
        id: nanoid(),
        severity: 'warning',
        category: 'financial',
        message: `Medicaid payer mix at ${(ops.payerMix.medicaid * 100).toFixed(0)}% — reimbursement risk`,
        phase: 'extract',
      });
    }

    this.session.redFlags.push(...flags);

    for (const flag of flags) {
      this.emitter.emitPipelineEvent('red_flag', {
        id: flag.id,
        severity: flag.severity,
        category: flag.category,
        message: flag.message,
      });
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 3: CLARIFY — Pause for user questions if needed
  // --------------------------------------------------------------------------

  private async phaseClarify(): Promise<void> {
    this.startPhase('clarify');

    // Generate clarifications for low-confidence or missing critical data
    const clarifications = this.generateClarifications();
    this.session.clarifications = clarifications;

    if (clarifications.length === 0) {
      this.completePhase('clarify', 'No clarifications needed');
      return;
    }

    // Emit clarifications needed
    this.emitter.emitPipelineEvent('clarification_needed', {
      clarifications: clarifications.map((c) => ({
        id: c.id,
        field: c.field,
        fieldLabel: c.fieldLabel,
        extractedValue: c.extractedValue,
        suggestedValue: c.suggestedValue,
        type: c.type,
        reason: c.reason,
        priority: c.priority,
      })),
      count: clarifications.length,
    });

    // Pause pipeline
    this.session.status = 'paused_for_clarification';
    await this.persistSession();

    // Wait for user response
    const answers = await new Promise<ClarificationAnswer[]>((resolve) => {
      this.clarificationResolver = resolve;
    });

    // Resume
    this.session.status = 'running';
    this.session.clarificationAnswers = answers;
    this.applyClarificationAnswers(answers);

    this.emitter.emitPipelineEvent('clarifications_resolved', {
      count: answers.length,
    });

    this.completePhase('clarify', `Resolved ${answers.length} clarifications`);
  }

  async resumeAfterClarifications(answers: ClarificationAnswer[]): Promise<void> {
    if (this.clarificationResolver) {
      this.clarificationResolver(answers);
      this.clarificationResolver = null;
    }
  }

  private generateClarifications(): ClarificationRequest[] {
    const clarifications: ClarificationRequest[] = [];
    const data = this.session.extractedData;

    // Check if deal name confidence is low
    if (data.facilities.length === 0) {
      clarifications.push({
        id: nanoid(),
        field: 'dealName',
        fieldLabel: 'Deal Name',
        extractedValue: data.suggestedDealName,
        type: 'missing',
        reason: 'No facilities could be extracted from uploaded documents',
        priority: 10,
      });
    }

    // Check for missing critical financial data
    if (!data.financials.noi && !data.financials.totalRevenue) {
      clarifications.push({
        id: nanoid(),
        field: 'noi',
        fieldLabel: 'Net Operating Income',
        extractedValue: null,
        type: 'missing',
        reason: 'No financial data found in uploaded documents',
        priority: 9,
      });
    }

    // Check for low-confidence facilities
    for (const f of data.facilities) {
      if (f.confidence < 50) {
        clarifications.push({
          id: nanoid(),
          field: `facility.${f.name}`,
          fieldLabel: `Facility: ${f.name}`,
          extractedValue: { name: f.name, beds: f.licensedBeds, state: f.state },
          type: 'low_confidence',
          reason: `Low confidence (${f.confidence}%) in facility extraction`,
          priority: 7,
          confidence: f.confidence,
        });
      }
    }

    // Check for out-of-range values
    if (data.financials.noi && data.financials.totalRevenue) {
      const margin = data.financials.noi / data.financials.totalRevenue;
      if (margin > 0.30 || margin < 0.02) {
        clarifications.push({
          id: nanoid(),
          field: 'noi',
          fieldLabel: 'NOI',
          extractedValue: data.financials.noi,
          benchmarkRange: { min: 0.05, max: 0.25, median: 0.15 },
          type: 'out_of_range',
          reason: `NOI margin of ${(margin * 100).toFixed(1)}% is outside typical SNF range (5-25%)`,
          priority: 8,
        });
      }
    }

    return clarifications.sort((a, b) => b.priority - a.priority);
  }

  private applyClarificationAnswers(answers: ClarificationAnswer[]): void {
    for (const answer of answers) {
      if (answer.action === 'skip') continue;

      const clarification = this.session.clarifications.find((c) => c.id === answer.clarificationId);
      if (!clarification) continue;

      if (answer.action === 'override' && answer.value !== undefined) {
        // Apply override
        if (clarification.field === 'dealName') {
          this.session.extractedData.suggestedDealName = String(answer.value);
        } else if (clarification.field === 'noi') {
          this.session.extractedData.financials.noi = Number(answer.value);
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 4: ASSEMBLE — Create deal in database
  // --------------------------------------------------------------------------

  private async phaseAssemble(): Promise<void> {
    this.startPhase('assemble');

    const data = this.session.extractedData;
    const totalBeds = data.facilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
    const primaryState = data.facilities[0]?.state || null;

    this.emitter.emitPipelineEvent('phase_progress', {
      phase: 'assemble',
      percent: 20,
      message: 'Creating deal record...',
    });

    // Create deal
    const [newDeal] = await db
      .insert(deals)
      .values({
        name: data.suggestedDealName,
        assetType: data.suggestedAssetType,
        dealStructure: 'purchase',
        isAllOrNothing: true,
        status: 'new',
        beds: totalBeds,
        primaryState,
        askingPrice: data.financials.askingPrice ? String(data.financials.askingPrice) : null,
      })
      .returning();

    this.session.dealId = newDeal.id;

    this.emitter.emitPipelineEvent('deal_created', {
      dealId: newDeal.id,
      dealName: data.suggestedDealName,
      beds: totalBeds,
      state: primaryState,
    });

    // Create facilities
    this.emitter.emitPipelineEvent('phase_progress', {
      phase: 'assemble',
      percent: 40,
      message: 'Creating facility records...',
    });

    const createdFacilities = await Promise.all(
      data.facilities.map(async (f) => {
        const [facility] = await db
          .insert(facilities)
          .values({
            dealId: newDeal.id,
            name: f.name,
            ccn: f.ccn || null,
            address: f.address || null,
            city: f.city || null,
            state: f.state || null,
            zipCode: f.zipCode || null,
            assetType: f.assetType || data.suggestedAssetType,
            licensedBeds: f.licensedBeds || null,
            certifiedBeds: f.certifiedBeds || null,
            yearBuilt: f.yearBuilt || null,
          })
          .returning();
        return facility;
      })
    );

    // CMS auto-match
    this.emitter.emitPipelineEvent('phase_progress', {
      phase: 'assemble',
      percent: 60,
      message: 'Matching facilities to CMS database...',
    });

    for (const extractedFacility of data.facilities) {
      try {
        const matchResult = await matchExtractedFacilityToCMS({
          name: extractedFacility.name,
          city: extractedFacility.city,
          state: extractedFacility.state,
          licensedBeds: extractedFacility.licensedBeds,
        });

        if (matchResult.provider) {
          const provider = matchResult.provider;
          extractedFacility.cmsData = {
            providerNumber: provider.ccn,
            overallRating: provider.overallRating || undefined,
            healthInspectionRating: provider.healthInspectionRating || undefined,
            staffingRating: provider.staffingRating || undefined,
            qualityRating: provider.qualityMeasureRating || undefined,
            isSff: provider.isSff,
            totalBeds: provider.numberOfBeds || undefined,
          };

          this.emitter.emitPipelineEvent('cms_matched', {
            facilityName: extractedFacility.name,
            providerNumber: provider.ccn,
            stars: provider.overallRating || 0,
            beds: provider.numberOfBeds,
            confidence: matchResult.matchConfidence,
          });

          // Check CMS red flags
          if (provider.overallRating && provider.overallRating <= 2) {
            this.session.redFlags.push({
              id: nanoid(),
              severity: 'critical',
              category: 'regulatory',
              message: `${extractedFacility.name} has CMS ${provider.overallRating}-star rating`,
              phase: 'assemble',
            });
            this.emitter.emitPipelineEvent('red_flag', {
              severity: 'critical',
              category: 'regulatory',
              message: `${extractedFacility.name} has CMS ${provider.overallRating}-star rating`,
            });
          }

          if (provider.isSff) {
            this.session.redFlags.push({
              id: nanoid(),
              severity: 'critical',
              category: 'regulatory',
              message: `${extractedFacility.name} is on CMS Special Focus Facility list`,
              phase: 'assemble',
            });
            this.emitter.emitPipelineEvent('red_flag', {
              severity: 'critical',
              category: 'regulatory',
              message: `${extractedFacility.name} is on CMS Special Focus Facility list`,
            });
          }

          // Check bed count discrepancy
          if (
            extractedFacility.licensedBeds &&
            provider.numberOfBeds &&
            Math.abs(extractedFacility.licensedBeds - provider.numberOfBeds) > 5
          ) {
            this.session.redFlags.push({
              id: nanoid(),
              severity: 'warning',
              category: 'operational',
              message: `Bed count mismatch: Broker says ${extractedFacility.licensedBeds}, CMS says ${provider.numberOfBeds}`,
              phase: 'assemble',
            });
          }
        }
      } catch (err) {
        console.error(`[Pipeline] CMS match failed for ${extractedFacility.name}:`, err);
      }
    }

    // Create analysis stages
    this.emitter.emitPipelineEvent('phase_progress', {
      phase: 'assemble',
      percent: 80,
      message: 'Setting up analysis stages...',
    });

    const stageTypes = [
      'document_upload',
      'census_validation',
      'revenue_analysis',
      'expense_analysis',
      'cms_integration',
      'valuation_coverage',
    ] as const;

    await Promise.all(
      stageTypes.map((stage, index) =>
        db.insert(analysisStages).values({
          dealId: newDeal.id,
          stage,
          status: 'in_progress',
          order: index + 1,
        })
      )
    );

    // Store documents
    const validDocTypes = [
      'financial_statement', 'rent_roll', 'census_report', 'staffing_report',
      'survey_report', 'cost_report', 'om_package', 'lease_agreement',
      'appraisal', 'environmental', 'other',
    ] as const;
    type DocType = typeof validDocTypes[number];
    const toDocType = (t: string): DocType =>
      validDocTypes.includes(t as DocType) ? (t as DocType) : 'other';

    await Promise.all(
      this.session.files.map(async (file) => {
        await db.insert(documents).values({
          dealId: newDeal.id,
          filename: file.filename,
          type: toDocType(file.documentType),
          status: 'complete',
          rawText: file.rawText?.slice(0, 50000) || null,
          extractedData: {
            aiAnalysis: {
              summary: file.summary,
              keyFindings: file.keyFindings,
              confidence: file.confidence,
            },
          },
        });
      })
    );

    this.completePhase('assemble', `Created deal with ${createdFacilities.length} facilities`);
  }

  // --------------------------------------------------------------------------
  // PHASE 5: ANALYZE — Run analysis engine
  // --------------------------------------------------------------------------

  private async phaseAnalyze(): Promise<void> {
    this.startPhase('analyze');

    if (!this.session.dealId) {
      this.completePhase('analyze', 'Skipped — no deal created');
      return;
    }

    this.emitter.emitPipelineEvent('phase_progress', {
      phase: 'analyze',
      percent: 10,
      message: 'Preparing analysis input...',
    });

    // Build analysis input from extracted data
    const data = this.session.extractedData;
    const analysisInput: AnalysisInput = {
      id: this.session.dealId,
      name: data.suggestedDealName,
      assetType: data.suggestedAssetType,
      beds: data.facilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0),
      primaryState: data.facilities[0]?.state || null,
      askingPrice: data.financials.askingPrice || null,
      facilities: data.facilities.map((f) => ({
        name: f.name,
        licensedBeds: f.licensedBeds,
        state: f.state,
        assetType: f.assetType,
        cmsRating: f.cmsData?.overallRating,
      })),
      documents: this.session.files.map((f) => ({
        filename: f.filename,
        type: f.documentType,
        status: 'complete',
      })),
      financialPeriods: data.financials.periods.map((p) => ({
        periodStart: p.startDate,
        periodEnd: p.endDate,
        totalRevenue: p.revenue,
        laborCost: undefined,
        noi: p.noi,
        occupancyRate: p.occupancy,
      })),
    };

    // Market intelligence enrichment (Grok) — non-blocking, best-effort
    let marketContext = '';
    try {
      this.emitter.emitPipelineEvent('phase_progress', {
        phase: 'analyze',
        percent: 20,
        message: 'Fetching real-time market intelligence...',
      });

      const router = getRouter();
      if (router.getAvailableProviders().includes('grok') || router.getAvailableProviders().includes('openai')) {
        const state = data.facilities[0]?.state || 'US';
        const assetType = data.suggestedAssetType || 'SNF';
        const marketResponse = await router.route({
          taskType: 'market_intelligence',
          systemPrompt: 'You are a healthcare real estate market analyst. Provide a concise market context briefing.',
          userPrompt: `Provide current market conditions for ${assetType} facilities in ${state}. Include: recent transaction activity, cap rate trends, occupancy trends, regulatory changes, and notable market events. Keep to 300 words max.`,
        });
        marketContext = marketResponse.content;
        console.log(`[Pipeline] Market intelligence enrichment complete (${marketResponse.provider})`);
      }
    } catch (err) {
      console.log('[Pipeline] Market intelligence unavailable, continuing without it');
    }

    this.emitter.emitPipelineEvent('phase_progress', {
      phase: 'analyze',
      percent: 30,
      message: 'Running Cascadia analysis engine...',
    });

    try {
      // If we got market context, append it to the analysis input
      if (marketContext) {
        (analysisInput as any).marketContext = marketContext;
      }
      const result = await analyzeDeal(analysisInput);

      this.session.analysisResult = {
        confidenceScore: result.confidenceScore,
        thesis: result.thesis,
        narrative: result.narrative,
        valuationRange: result.valuations?.[0]
          ? {
              low: result.valuations[0].valueLow,
              mid: result.valuations[0].valueBase,
              high: result.valuations[0].valueHigh,
            }
          : undefined,
        riskFactors: (result.riskFactors || []).map((r: any) => ({
          category: r.category || 'general',
          severity: r.severity || 'medium',
          description: r.description || r.factor || '',
        })),
        partnerMatches: (result.partnerMatches || []).map((p: any) => ({
          name: p.name || p.partnerName || '',
          score: p.score || p.matchScore || 0,
          type: p.type || p.partnerType || '',
        })),
      };

      // Save analysis results to deal
      await db
        .update(deals)
        .set({
          confidenceScore: result.confidenceScore,
          analysisNarrative: result.narrative?.slice(0, 5000),
          thesis: result.thesis?.slice(0, 5000),
          status: 'reviewed',
        })
        .where(eq(deals.id, this.session.dealId));

      this.emitter.emitPipelineEvent('analysis_complete', {
        score: result.confidenceScore,
        thesis: result.thesis,
        riskCount: result.riskFactors?.length || 0,
        partnerCount: result.partnerMatches?.length || 0,
      });
    } catch (err) {
      console.error('[Pipeline] Analysis failed:', err);
      this.emitter.emitPipelineEvent('phase_progress', {
        phase: 'analyze',
        percent: 100,
        message: 'Analysis engine unavailable — continuing with extracted data',
      });
    }

    this.completePhase('analyze', 'Analysis complete');
  }

  // --------------------------------------------------------------------------
  // PHASE 6: TOOLS — Auto-execute relevant tools
  // --------------------------------------------------------------------------

  private async phaseTools(): Promise<void> {
    this.startPhase('tools');

    const data = this.session.extractedData;
    const dealData = {
      noi: data.financials.noi,
      askingPrice: data.financials.askingPrice,
      totalRevenue: data.financials.totalRevenue,
      totalExpenses: data.financials.totalExpenses,
      occupancy: data.operatingMetrics.occupancyRate,
      beds: data.facilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0),
      assetType: data.suggestedAssetType,
      financialPeriods: data.financials.periods,
    };

    this.emitter.emitPipelineEvent('phase_progress', {
      phase: 'tools',
      percent: 10,
      message: 'Determining which tools to run...',
    });

    const results = await autoRunTools(dealData, (toolName, result) => {
      this.emitter.emitPipelineEvent('tool_executed', {
        toolName,
        ...result,
      });
    });

    this.session.toolResults = results;

    this.completePhase('tools', `Executed ${results.filter((r) => r.status === 'success').length} tools`);
  }

  // --------------------------------------------------------------------------
  // PHASE 7: SYNTHESIZE — Generate final summary
  // --------------------------------------------------------------------------

  private async phaseSynthesize(): Promise<void> {
    this.startPhase('synthesize');

    const data = this.session.extractedData;
    const analysis = this.session.analysisResult;
    const tools = this.session.toolResults;
    const redFlags = this.session.redFlags;

    // Determine recommendation
    let recommendation: 'pursue' | 'conditional' | 'pass' = 'conditional';
    const criticalFlags = redFlags.filter((f) => f.severity === 'critical');
    if (criticalFlags.length >= 3) recommendation = 'pass';
    else if (criticalFlags.length === 0 && (analysis?.confidenceScore || 0) > 70) recommendation = 'pursue';

    // Build synthesis
    const synthesis: DealSynthesis = {
      dealScore: analysis?.confidenceScore || 50,
      recommendation,
      investmentThesis: analysis?.thesis || 'Insufficient data for complete thesis.',
      keyStrengths: [],
      keyRisks: redFlags.map((f) => f.message),
      suggestedNextSteps: [
        'Review extracted data in Deal Workbench',
        'Upload any missing documents',
        ...(this.session.missingDocuments.length > 0
          ? [`Obtain missing: ${this.session.missingDocuments.slice(0, 3).join(', ')}`]
          : []),
        'Validate financial assumptions',
      ],
      valuationSummary: {
        askingPrice: data.financials.askingPrice,
        estimatedValue: analysis?.valuationRange,
        capRate: tools.find((t) => t.toolName === 'cap_rate')?.result?.capRate as number | undefined,
        pricePerBed: data.financials.askingPrice && data.facilities.length > 0
          ? data.financials.askingPrice / data.facilities.reduce((s, f) => s + (f.licensedBeds || 0), 0)
          : undefined,
      },
      toolSummary: tools
        .filter((t) => t.status === 'success')
        .map((t) => ({
          tool: t.toolLabel,
          headline: typeof t.result?.headline === 'string' ? t.result.headline : `${t.toolLabel} complete`,
        })),
    };

    // AI-powered executive summary enhancement (Claude primary)
    try {
      const router = getRouter();
      const summaryResponse = await router.route({
        taskType: 'synthesis',
        systemPrompt: 'You are an executive deal analyst at Cascadia Healthcare. Write a concise, actionable executive summary.',
        userPrompt: `Generate a 3-paragraph executive summary for this deal:

Deal: ${data.suggestedDealName}
Asset Type: ${data.suggestedAssetType}
Score: ${synthesis.dealScore}/100
Recommendation: ${synthesis.recommendation}
Thesis: ${synthesis.investmentThesis}
Key Risks: ${synthesis.keyRisks.slice(0, 5).join('; ')}
Asking Price: ${synthesis.valuationSummary.askingPrice ? '$' + synthesis.valuationSummary.askingPrice.toLocaleString() : 'Undisclosed'}
Facilities: ${data.facilities.length} (${data.facilities.reduce((s, f) => s + (f.licensedBeds || 0), 0)} beds)

Format: Paragraph 1 = opportunity overview. Paragraph 2 = key risks and mitigants. Paragraph 3 = recommended action.`,
      });
      synthesis.executiveSummary = summaryResponse.content;
    } catch {
      // Non-blocking — synthesis works fine without AI summary
      console.log('[Pipeline] AI executive summary unavailable, using rule-based synthesis');
    }

    this.session.synthesis = synthesis;
    await this.persistSession();

    this.completePhase('synthesize', `Score: ${synthesis.dealScore}, Recommendation: ${synthesis.recommendation}`);
  }

  // --------------------------------------------------------------------------
  // PHASE HELPERS
  // --------------------------------------------------------------------------

  private startPhase(phase: PipelinePhase): void {
    this.session.currentPhase = phase;
    this.session.phases[phase] = {
      phase,
      status: 'running',
      startedAt: new Date(),
    };

    this.emitter.emitPipelineEvent('phase_started', {
      phase,
      label: phase.charAt(0).toUpperCase() + phase.slice(1),
    });
  }

  private completePhase(phase: PipelinePhase, summary: string): void {
    const phaseResult = this.session.phases[phase];
    if (phaseResult) {
      phaseResult.status = 'completed';
      phaseResult.completedAt = new Date();
      phaseResult.durationMs = phaseResult.startedAt
        ? Date.now() - phaseResult.startedAt.getTime()
        : 0;
      phaseResult.summary = summary;
    }

    this.emitter.emitPipelineEvent('phase_completed', {
      phase,
      summary,
      durationMs: phaseResult?.durationMs || 0,
    });
  }

  private async persistSession(): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(pipelineSessions)
        .where(eq(pipelineSessions.id, this.session.id))
        .limit(1);

      const data = {
        status: this.session.status as any,
        currentPhase: this.session.currentPhase,
        phaseResults: this.session.phases as any,
        filesMetadata: this.session.files.map((f) => ({
          filename: f.filename,
          documentType: f.documentType,
          confidence: f.confidence,
          summary: f.summary,
        })) as any,
        extractedData: {
          suggestedDealName: this.session.extractedData.suggestedDealName,
          suggestedAssetType: this.session.extractedData.suggestedAssetType,
          facilityCount: this.session.extractedData.facilities.length,
          facilities: this.session.extractedData.facilities,
          financials: {
            noi: this.session.extractedData.financials.noi,
            totalRevenue: this.session.extractedData.financials.totalRevenue,
            askingPrice: this.session.extractedData.financials.askingPrice,
          },
          analysisResult: this.session.analysisResult || null,
        } as any,
        clarifications: this.session.clarifications as any,
        clarificationAnswers: this.session.clarificationAnswers as any,
        toolResults: this.session.toolResults as any,
        redFlags: this.session.redFlags as any,
        synthesis: this.session.synthesis as any,
        completenessScore: this.session.completenessScore,
        missingDocuments: this.session.missingDocuments as any,
        dealId: this.session.dealId || null,
        error: this.session.error || null,
        updatedAt: new Date(),
        completedAt: this.session.completedAt || null,
      };

      if (existing.length > 0) {
        await db
          .update(pipelineSessions)
          .set(data)
          .where(eq(pipelineSessions.id, this.session.id));
      } else {
        await db.insert(pipelineSessions).values({
          id: this.session.id,
          ...data,
        });
      }
    } catch (err) {
      console.error('[Pipeline] Failed to persist session:', err);
    }
  }
}
