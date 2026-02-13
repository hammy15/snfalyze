/**
 * Smart Intake Pipeline Types
 *
 * Type definitions for the 7-phase pipeline orchestrator that chains:
 * Ingest → Extract → Clarify → Assemble → Analyze → Tools → Synthesize
 */

// ============================================================================
// PIPELINE PHASES & STATUS
// ============================================================================

export type PipelinePhase =
  | 'ingest'
  | 'extract'
  | 'clarify'
  | 'assemble'
  | 'analyze'
  | 'tools'
  | 'synthesize';

export type PipelineStatus =
  | 'idle'
  | 'running'
  | 'paused_for_clarification'
  | 'completed'
  | 'failed';

export const PIPELINE_PHASES: { key: PipelinePhase; label: string; description: string }[] = [
  { key: 'ingest', label: 'Ingest', description: 'Parsing documents' },
  { key: 'extract', label: 'Extract', description: 'AI data extraction' },
  { key: 'clarify', label: 'Clarify', description: 'Resolving questions' },
  { key: 'assemble', label: 'Assemble', description: 'Building deal record' },
  { key: 'analyze', label: 'Analyze', description: 'Running analysis engine' },
  { key: 'tools', label: 'Tools', description: 'Executing financial tools' },
  { key: 'synthesize', label: 'Synthesize', description: 'Generating synthesis' },
];

// ============================================================================
// PIPELINE SESSION
// ============================================================================

export interface SmartPipelineSession {
  id: string;
  status: PipelineStatus;
  currentPhase: PipelinePhase;
  phases: Partial<Record<PipelinePhase, PhaseResult>>;
  files: ParsedFile[];
  extractedData: ExtractedDealData;
  clarifications: ClarificationRequest[];
  clarificationAnswers: ClarificationAnswer[];
  dealId?: string;
  analysisResult?: AnalysisSummary;
  toolResults: ToolResult[];
  synthesis?: DealSynthesis;
  redFlags: RedFlag[];
  completenessScore: number;
  missingDocuments: string[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface PhaseResult {
  phase: PipelinePhase;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startedAt?: Date;
  completedAt?: Date;
  durationMs?: number;
  summary?: string;
  data?: unknown;
}

// ============================================================================
// INGEST PHASE TYPES
// ============================================================================

export interface ParsedFile {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string;
  pageCount?: number;
  rawText: string;
  summary: string;
  keyFindings: string[];
  confidence: number;
  spreadsheetData?: Record<string, unknown[][]>;
}

export interface ExtractedFacility {
  name: string;
  ccn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  licensedBeds?: number;
  certifiedBeds?: number;
  yearBuilt?: number;
  confidence: number;
  cmsData?: CMSMatchData;
}

export interface CMSMatchData {
  providerNumber: string;
  overallRating?: number;
  healthInspectionRating?: number;
  staffingRating?: number;
  qualityRating?: number;
  isSff?: boolean;
  totalBeds?: number;
  occupiedBeds?: number;
}

// ============================================================================
// EXTRACT PHASE TYPES
// ============================================================================

export interface ExtractedDealData {
  suggestedDealName: string;
  suggestedAssetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  suggestedState?: string;
  facilities: ExtractedFacility[];
  financials: ExtractedFinancials;
  operatingMetrics: ExtractedOperatingMetrics;
}

export interface ExtractedFinancials {
  totalRevenue?: number;
  totalExpenses?: number;
  noi?: number;
  ebitda?: number;
  ebitdar?: number;
  laborCost?: number;
  agencyLabor?: number;
  managementFee?: number;
  askingPrice?: number;
  periods: ExtractedFinancialPeriod[];
}

export interface ExtractedFinancialPeriod {
  label: string;
  startDate?: string;
  endDate?: string;
  revenue: number;
  expenses: number;
  noi: number;
  occupancy?: number;
  confidence: number;
}

export interface ExtractedOperatingMetrics {
  occupancyRate?: number;
  payerMix?: { medicare?: number; medicaid?: number; private?: number; other?: number };
  avgDailyRate?: number;
  hppd?: number;
  agencyPercent?: number;
  laborCostRatio?: number;
}

// ============================================================================
// CLARIFY PHASE TYPES
// ============================================================================

export interface ClarificationRequest {
  id: string;
  field: string;
  fieldLabel: string;
  extractedValue: unknown;
  suggestedValue?: unknown;
  suggestedValues?: unknown[];
  benchmarkRange?: { min: number; max: number; median: number };
  type: 'low_confidence' | 'out_of_range' | 'conflict' | 'missing' | 'validation_error';
  reason: string;
  priority: number;
  confidence?: number;
  source?: string;
}

export interface ClarificationAnswer {
  clarificationId: string;
  action: 'accept' | 'override' | 'skip';
  value?: unknown;
}

// ============================================================================
// ANALYZE PHASE TYPES
// ============================================================================

export interface AnalysisSummary {
  confidenceScore: number;
  thesis: string;
  narrative: string;
  valuationRange?: { low: number; mid: number; high: number };
  riskFactors: Array<{ category: string; severity: string; description: string }>;
  partnerMatches: Array<{ name: string; score: number; type: string }>;
}

// ============================================================================
// TOOLS PHASE TYPES
// ============================================================================

export interface ToolResult {
  toolName: string;
  toolLabel: string;
  status: 'success' | 'skipped' | 'failed';
  result?: Record<string, unknown>;
  reason?: string;
}

// ============================================================================
// SYNTHESIZE PHASE TYPES
// ============================================================================

export interface DealSynthesis {
  dealScore: number;
  recommendation: 'pursue' | 'conditional' | 'pass';
  investmentThesis: string;
  keyStrengths: string[];
  keyRisks: string[];
  suggestedNextSteps: string[];
  valuationSummary: {
    askingPrice?: number;
    estimatedValue?: { low: number; mid: number; high: number };
    capRate?: number;
    pricePerBed?: number;
  };
  toolSummary: Array<{ tool: string; headline: string }>;
}

// ============================================================================
// RED FLAGS & COMPLETENESS
// ============================================================================

export interface RedFlag {
  id: string;
  severity: 'critical' | 'warning';
  category: 'financial' | 'regulatory' | 'operational' | 'seller_manipulation';
  message: string;
  detail?: string;
  phase: PipelinePhase;
}

export const REQUIRED_DOCUMENT_TYPES = [
  { type: 'income_statement', label: 'P&L / Income Statement', critical: true },
  { type: 'census_report', label: 'Census / Occupancy Report', critical: true },
  { type: 'broker_package', label: 'Broker Package / OM', critical: false },
  { type: 'survey_history', label: 'Survey History', critical: false },
  { type: 'rent_roll', label: 'Rent Roll / Payer Detail', critical: false },
  { type: 'capex_history', label: 'Capital Expenditure History', critical: false },
  { type: 'staffing_report', label: 'Staffing / Payroll Report', critical: false },
];

// ============================================================================
// SSE EVENTS
// ============================================================================

export type PipelineEventType =
  | 'pipeline_started'
  | 'phase_started'
  | 'phase_progress'
  | 'phase_completed'
  | 'file_parsed'
  | 'field_extracted'
  | 'facility_detected'
  | 'cms_matched'
  | 'completeness_check'
  | 'red_flag'
  | 'clarification_needed'
  | 'clarifications_resolved'
  | 'deal_created'
  | 'analysis_complete'
  | 'tool_executed'
  | 'pipeline_complete'
  | 'pipeline_error'
  | 'heartbeat';

export interface PipelineSSEEvent {
  type: PipelineEventType;
  sessionId: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export function createPipelineEvent(
  type: PipelineEventType,
  sessionId: string,
  data: Record<string, unknown>
): PipelineSSEEvent {
  return { type, sessionId, timestamp: new Date().toISOString(), data };
}

export function formatPipelineEventForSSE(event: PipelineSSEEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}
