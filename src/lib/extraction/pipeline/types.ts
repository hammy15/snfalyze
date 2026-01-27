/**
 * Sequential AI Extraction Pipeline Types
 *
 * Types and interfaces for the multi-pass AI extraction system
 * that processes documents sequentially with context accumulation.
 */

// ============================================================================
// PIPELINE SESSION TYPES
// ============================================================================

export interface PipelineSession {
  id: string;
  dealId: string;
  status: PipelineStatus;
  documentIds: string[];
  currentDocumentIndex: number;
  currentPass: PassType;
  progress: PipelineProgress;
  context: ExtractionContext;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

export type PipelineStatus =
  | 'initializing'
  | 'processing'
  | 'awaiting_clarifications'
  | 'completed'
  | 'failed';

export type PassType = 'structure' | 'extraction' | 'validation' | 'population';

export interface PipelineProgress {
  totalDocuments: number;
  processedDocuments: number;
  currentDocument?: {
    id: string;
    filename: string;
    pass: PassType;
    passProgress: number;
  };
  phase: string;
  overallProgress: number;
  extractedFacilities: number;
  extractedPeriods: number;
  detectedConflicts: number;
  pendingClarifications: number;
}

// ============================================================================
// EXTRACTION CONTEXT TYPES
// ============================================================================

export interface ExtractionContext {
  sessionId: string;
  dealId: string;

  // Accumulated data
  facilityProfiles: Map<string, FacilityFinancialProfile>;
  extractedPeriods: NormalizedFinancialPeriod[];
  extractedCensus: NormalizedCensusPeriod[];
  extractedRates: NormalizedPayerRate[];

  // Cross-reference data
  crossReferenceIndex: CrossReferenceIndex;

  // Quality tracking
  detectedConflicts: DataConflict[];
  pendingClarifications: PipelineClarification[];
  resolvedClarifications: PipelineClarification[];

  // Metrics
  overallConfidence: number;
  processingStats: ProcessingStats;
}

export interface ProcessingStats {
  totalProcessingTimeMs: number;
  aiCallCount: number;
  aiTokensUsed: number;
  documentsProcessed: number;
  sheetsAnalyzed: number;
  dataPointsExtracted: number;
}

// ============================================================================
// FACILITY FINANCIAL PROFILE
// ============================================================================

export interface FacilityFinancialProfile {
  id: string;
  name: string;
  aliases: string[];
  ccn?: string;
  npi?: string;
  address?: FacilityAddress;

  // Structural information
  licensedBeds?: number;
  certifiedBeds?: number;
  facilityType: 'SNF' | 'ALF' | 'ILF' | 'CCRC' | 'mixed';

  // Financial periods (sorted by date)
  financialPeriods: NormalizedFinancialPeriod[];

  // Census data (sorted by date)
  censusPeriods: NormalizedCensusPeriod[];

  // Rate schedules
  payerRates: NormalizedPayerRate[];

  // Calculated metrics
  ttmRevenue?: number;
  ttmExpenses?: number;
  ttmEbitdar?: number;
  ttmNoi?: number;
  avgOccupancy?: number;
  avgPayerMix?: PayerMixBreakdown;

  // Quality scores
  dataCompleteness: number;
  dataConfidence: number;
  lastUpdated: Date;
}

export interface FacilityAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface PayerMixBreakdown {
  medicarePartA: number;
  medicareAdvantage: number;
  managedCare: number;
  medicaid: number;
  managedMedicaid: number;
  private: number;
  va: number;
  hospice: number;
  other: number;
}

// ============================================================================
// NORMALIZED DATA TYPES
// ============================================================================

export interface NormalizedFinancialPeriod {
  id: string;
  facilityId: string;
  facilityName: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'monthly' | 'quarterly' | 'annual' | 'ttm';
  isAnnualized: boolean;

  // Revenue
  revenue: {
    total: number;
    byPayer: {
      medicarePartA: number;
      medicareAdvantage: number;
      managedCare: number;
      medicaid: number;
      managedMedicaid: number;
      private: number;
      va: number;
      hospice: number;
      other: number;
    };
    byType: {
      roomAndBoard: number;
      ancillary: number;
      therapy: number;
      pharmacy: number;
      other: number;
    };
  };

  // Expenses
  expenses: {
    total: number;
    labor: {
      total: number;
      core: number;
      agency: number;
      benefits: number;
    };
    operating: {
      dietary: number;
      housekeeping: number;
      utilities: number;
      maintenance: number;
      supplies: number;
      other: number;
    };
    fixed: {
      insurance: number;
      propertyTax: number;
      managementFee: number;
      rent: number;
      other: number;
    };
  };

  // Metrics
  metrics: {
    ebitdar: number;
    ebitda: number;
    noi: number;
    netIncome: number;
    ebitdarMargin: number;
    noiMargin: number;
    laborPercentage: number;
    agencyPercentage: number;
  };

  // Census (if available in same period)
  census?: {
    totalPatientDays: number;
    avgDailyCensus: number;
    occupancyRate: number;
    totalBeds: number;
  };

  // Source tracking
  sources: DataSource[];
  confidence: number;
  normalizedAt: Date;
}

export interface NormalizedCensusPeriod {
  id: string;
  facilityId: string;
  facilityName: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'monthly' | 'quarterly' | 'annual';

  // Days by payer
  patientDays: {
    medicarePartA: number;
    medicareAdvantage: number;
    managedCare: number;
    medicaid: number;
    managedMedicaid: number;
    private: number;
    va: number;
    hospice: number;
    other: number;
    total: number;
  };

  // Calculated metrics
  avgDailyCensus: number;
  totalBeds: number;
  occupancyRate: number;
  payerMixPercentages: PayerMixBreakdown;

  // Skilled vs non-skilled breakdown
  skilledDays: number;
  nonSkilledDays: number;
  skilledMix: number;

  // Source tracking
  sources: DataSource[];
  confidence: number;
  normalizedAt: Date;
}

export interface NormalizedPayerRate {
  id: string;
  facilityId: string;
  facilityName: string;
  effectiveDate: Date;
  expirationDate?: Date;

  // PPD rates by payer
  rates: {
    medicarePartA: number | null;
    medicareAdvantage: number | null;
    managedCare: number | null;
    medicaid: number | null;
    managedMedicaid: number | null;
    private: number | null;
    va: number | null;
    hospice: number | null;
  };

  // Additional revenue PPD
  ancillaryPpd: number | null;
  therapyPpd: number | null;

  // Calculated weighted average
  weightedAvgPpd?: number;
  blendedSkilledPpd?: number;

  // Source tracking
  sources: DataSource[];
  confidence: number;
  normalizedAt: Date;
}

export interface DataSource {
  documentId: string;
  filename: string;
  sheetName?: string;
  rowRange?: { start: number; end: number };
  extractedAt: Date;
  aiModel?: string;
}

// ============================================================================
// CROSS-REFERENCE & VALIDATION TYPES
// ============================================================================

export interface CrossReferenceIndex {
  // Maps period keys to all extracted values for that period
  revenueByPeriod: Map<string, CrossReferenceEntry[]>;
  expensesByPeriod: Map<string, CrossReferenceEntry[]>;
  censusByPeriod: Map<string, CrossReferenceEntry[]>;
  ratesByDate: Map<string, CrossReferenceEntry[]>;

  // Calculated revenue from census × rates (for validation)
  calculatedRevenue: Map<string, CalculatedRevenueEntry>;
}

export interface CrossReferenceEntry {
  value: number;
  source: DataSource;
  confidence: number;
  fieldPath: string;
}

export interface CalculatedRevenueEntry {
  periodKey: string;
  calculatedTotal: number;
  reportedTotal: number;
  variance: number;
  variancePercent: number;
  byPayer: {
    payer: string;
    days: number;
    rate: number;
    calculated: number;
    reported: number;
    variance: number;
  }[];
}

// ============================================================================
// CONFLICT & CLARIFICATION TYPES
// ============================================================================

export interface DataConflict {
  id: string;
  type: ConflictType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fieldPath: string;
  facilityId?: string;
  periodKey?: string;

  // Conflicting values
  values: ConflictingValue[];

  // Calculated variance
  variancePercent: number;
  varianceAbsolute: number;

  // Resolution
  status: 'detected' | 'auto_resolved' | 'pending_clarification' | 'user_resolved';
  resolvedValue?: number;
  resolutionMethod?: 'auto_average' | 'auto_highest_confidence' | 'user_input';
  resolutionNote?: string;

  detectedAt: Date;
  resolvedAt?: Date;
}

export type ConflictType =
  | 'cross_document' // Same field, different values across documents
  | 'cross_period' // Implausible change between periods
  | 'revenue_reconciliation' // Census × Rates ≠ Reported Revenue
  | 'internal_consistency' // e.g., sum of parts ≠ total
  | 'benchmark_deviation'; // Value significantly outside industry norms

export interface ConflictingValue {
  value: number;
  source: DataSource;
  confidence: number;
}

export interface PipelineClarification {
  id: string;
  sessionId: string;
  dealId: string;
  documentId?: string;
  facilityId?: string;

  // What needs clarification
  fieldPath: string;
  fieldLabel: string;
  clarificationType: ClarificationType;
  priority: number; // 1-10

  // Current state
  extractedValue: number | string | null;
  extractedConfidence: number;
  suggestedValues: SuggestedValue[];

  // Context
  context: ClarificationContext;
  benchmarkRange?: { min: number; max: number; median: number };
  conflictDetails?: DataConflict;

  // Resolution
  status: 'pending' | 'resolved' | 'skipped' | 'auto_resolved';
  resolvedValue?: number | string;
  resolvedBy?: string;
  resolvedAt?: Date;
  resolutionNote?: string;

  createdAt: Date;
}

export type ClarificationType =
  | 'low_confidence'
  | 'out_of_range'
  | 'conflict'
  | 'missing_critical'
  | 'revenue_mismatch'
  | 'validation_error';

export interface SuggestedValue {
  value: number | string;
  source: string;
  confidence: number;
  reasoning?: string;
}

export interface ClarificationContext {
  documentName: string;
  periodDescription?: string;
  relatedValues?: { label: string; value: number | string }[];
  aiExplanation?: string;
}

// ============================================================================
// DOCUMENT STRUCTURE TYPES
// ============================================================================

export interface DocumentStructure {
  documentId: string;
  filename: string;
  fileType: 'excel' | 'pdf' | 'csv';
  sheets: SheetStructure[];
  detectedFacilities: string[];
  detectedPeriods: DetectedPeriod[];
  suggestedProcessingOrder: number[];
  overallQuality: 'high' | 'medium' | 'low';
  analysisNotes: string[];
  analyzedAt: Date;
}

export interface SheetStructure {
  sheetIndex: number;
  sheetName: string;
  sheetType: SheetType;
  confidence: number;

  // Layout detection
  headerRow?: number;
  dataStartRow?: number;
  dataEndRow?: number;
  facilityColumn?: number;
  periodColumns?: number[];

  // Detected content
  detectedFacilities: string[];
  detectedPeriods: DetectedPeriod[];
  detectedFields: DetectedField[];

  // Quality indicators
  hasFormulas: boolean;
  hasMergedCells: boolean;
  dataQuality: 'high' | 'medium' | 'low';
  qualityNotes: string[];
}

export type SheetType =
  | 'pl_statement'
  | 'census_report'
  | 'rate_schedule'
  | 'summary_dashboard'
  | 'rent_roll'
  | 'ar_aging'
  | 'chart_of_accounts'
  | 'unknown';

export interface DetectedPeriod {
  label: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'ttm' | 'ytd';
  startDate?: Date;
  endDate?: Date;
  columnIndex?: number;
  confidence: number;
}

export interface DetectedField {
  name: string;
  normalizedName: string;
  category: 'revenue' | 'expense' | 'metric' | 'census' | 'rate' | 'other';
  rowIndex: number;
  confidence: number;
  suggestedMapping?: string;
}

// ============================================================================
// AI EXTRACTION TYPES
// ============================================================================

export interface AIExtractionRequest {
  sessionId: string;
  documentId: string;
  documentContent: DocumentContent;
  structure: DocumentStructure;
  priorContext: ContextSummary;
  extractionFocus: ExtractionFocus[];
}

export interface DocumentContent {
  type: 'excel' | 'pdf' | 'csv';
  sheets?: SheetContent[];
  text?: string;
  tables?: TableContent[];
}

export interface SheetContent {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
  rowCount: number;
  columnCount: number;
}

export interface TableContent {
  pageNumber?: number;
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ContextSummary {
  knownFacilities: { id: string; name: string; aliases: string[] }[];
  knownPeriods: { start: Date; end: Date; type: string }[];
  extractedMetrics: { field: string; value: number; period: string }[];
  pendingQuestions: string[];
}

export type ExtractionFocus = 'financial' | 'census' | 'rates' | 'all';

export interface AIExtractionResponse {
  extractedData: ExtractedDataSet;
  observations: AIObservation[];
  confidence: number;
  suggestedClarifications: AIRaisedQuestion[];
  processingNotes: string[];
  tokensUsed: number;
}

export interface ExtractedDataSet {
  financialPeriods: PartialFinancialPeriod[];
  censusPeriods: PartialCensusPeriod[];
  payerRates: PartialPayerRate[];
  facilityInfo: PartialFacilityInfo[];
}

export interface PartialFinancialPeriod {
  facilityName: string;
  periodStart?: string;
  periodEnd?: string;
  periodType?: string;
  revenue?: Partial<NormalizedFinancialPeriod['revenue']>;
  expenses?: Partial<NormalizedFinancialPeriod['expenses']>;
  metrics?: Partial<NormalizedFinancialPeriod['metrics']>;
  confidence: number;
  sourceSheet: string;
  sourceRows: number[];
}

export interface PartialCensusPeriod {
  facilityName: string;
  periodStart?: string;
  periodEnd?: string;
  patientDays?: Partial<NormalizedCensusPeriod['patientDays']>;
  avgDailyCensus?: number;
  totalBeds?: number;
  occupancyRate?: number;
  confidence: number;
  sourceSheet: string;
  sourceRows: number[];
}

export interface PartialPayerRate {
  facilityName: string;
  effectiveDate?: string;
  rates?: Partial<NormalizedPayerRate['rates']>;
  ancillaryPpd?: number;
  therapyPpd?: number;
  confidence: number;
  sourceSheet: string;
  sourceRows: number[];
}

export interface PartialFacilityInfo {
  name: string;
  aliases?: string[];
  ccn?: string;
  npi?: string;
  address?: FacilityAddress;
  licensedBeds?: number;
  certifiedBeds?: number;
  confidence: number;
}

export interface AIObservation {
  type: 'info' | 'warning' | 'anomaly' | 'suggestion';
  message: string;
  relevantField?: string;
  relevantPeriod?: string;
}

export interface AIRaisedQuestion {
  question: string;
  field: string;
  suggestedAnswers?: string[];
  priority: number;
}

// ============================================================================
// VALIDATION THRESHOLDS
// ============================================================================

export const VALIDATION_THRESHOLDS = {
  // Auto-resolve only if variance < 3%
  autoResolveVariance: 0.03,

  // Flag for clarification if variance > 5%
  clarificationThreshold: 0.05,

  // Critical error if variance > 15%
  errorThreshold: 0.15,

  // Minimum confidence to auto-accept
  minAutoAcceptConfidence: 90,

  // Fields that ALWAYS require high confidence
  criticalFields: [
    'revenue.total',
    'expenses.total',
    'metrics.noi',
    'metrics.ebitdar',
    'census.occupancyRate',
    'facilityInfo.licensedBeds',
  ],

  // Revenue reconciliation tolerance
  revenueReconciliationTolerance: 0.05,

  // Period-over-period change thresholds (flag if change > threshold)
  periodChangeThresholds: {
    revenue: 0.20,
    expenses: 0.25,
    occupancy: 0.15,
    rates: 0.10,
  },
} as const;

// ============================================================================
// STREAM EVENT TYPES
// ============================================================================

export interface PipelineEvent {
  type: PipelineEventType;
  sessionId: string;
  timestamp: Date;
  data: unknown;
}

export type PipelineEventType =
  | 'session_started'
  | 'document_started'
  | 'pass_started'
  | 'pass_progress'
  | 'pass_completed'
  | 'document_completed'
  | 'facility_detected'
  | 'period_extracted'
  | 'conflict_detected'
  | 'clarification_needed'
  | 'clarification_resolved'
  | 'validation_started'
  | 'validation_completed'
  | 'population_started'
  | 'population_completed'
  | 'session_completed'
  | 'session_failed'
  | 'error';

export interface SessionStartedEvent extends PipelineEvent {
  type: 'session_started';
  data: {
    dealId: string;
    documentCount: number;
    documentIds: string[];
  };
}

export interface DocumentStartedEvent extends PipelineEvent {
  type: 'document_started';
  data: {
    documentId: string;
    filename: string;
    index: number;
    total: number;
  };
}

export interface PassProgressEvent extends PipelineEvent {
  type: 'pass_progress';
  data: {
    pass: PassType;
    progress: number;
    message: string;
  };
}

export interface ConflictDetectedEvent extends PipelineEvent {
  type: 'conflict_detected';
  data: {
    conflict: DataConflict;
  };
}

export interface ClarificationNeededEvent extends PipelineEvent {
  type: 'clarification_needed';
  data: {
    clarification: PipelineClarification;
  };
}

export interface SessionCompletedEvent extends PipelineEvent {
  type: 'session_completed';
  data: {
    facilitiesExtracted: number;
    periodsExtracted: number;
    conflictsResolved: number;
    clarificationsPending: number;
    overallConfidence: number;
    processingTimeMs: number;
  };
}
