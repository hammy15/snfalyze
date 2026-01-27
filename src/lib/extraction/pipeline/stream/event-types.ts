/**
 * Stream Event Types
 *
 * Type-safe event definitions for the SSE progress stream.
 */

import type {
  PipelineStatus,
  PassType,
  DataConflict,
  PipelineClarification,
} from '../types';

// ============================================================================
// EVENT TYPES
// ============================================================================

export type StreamEventType =
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
  | 'error'
  | 'heartbeat';

// ============================================================================
// EVENT DATA INTERFACES
// ============================================================================

export interface SessionStartedData {
  sessionId: string;
  dealId: string;
  documentCount: number;
  documentIds: string[];
}

export interface DocumentStartedData {
  documentId: string;
  filename: string;
  index: number;
  total: number;
}

export interface PassStartedData {
  pass: PassType;
  documentId: string;
  filename: string;
}

export interface PassProgressData {
  pass: PassType;
  progress: number;
  message: string;
}

export interface PassCompletedData {
  pass: PassType;
  documentId: string;
  duration: number;
  itemsExtracted?: number;
}

export interface DocumentCompletedData {
  documentId: string;
  filename: string;
  financialPeriodsExtracted: number;
  censusPeriodsExtracted: number;
  payerRatesExtracted: number;
  confidence: number;
}

export interface FacilityDetectedData {
  facilityId: string;
  facilityName: string;
  isNew: boolean;
}

export interface PeriodExtractedData {
  type: 'financial' | 'census' | 'rate';
  facilityName: string;
  periodDescription: string;
  confidence: number;
}

export interface ConflictDetectedData {
  conflictId: string;
  type: DataConflict['type'];
  severity: DataConflict['severity'];
  fieldPath: string;
  valueCount: number;
  variancePercent: number;
}

export interface ClarificationNeededData {
  clarificationId: string;
  fieldLabel: string;
  priority: number;
  clarificationType: PipelineClarification['clarificationType'];
}

export interface ValidationCompletedData {
  isValid: boolean;
  conflictsDetected: number;
  conflictsAutoResolved: number;
  clarificationsNeeded: number;
  validationScore: number;
}

export interface PopulationCompletedData {
  financialPeriodsWritten: number;
  censusPeriodsWritten: number;
  payerRatesWritten: number;
  facilitiesUpdated: number;
}

export interface SessionCompletedData {
  facilitiesExtracted: number;
  periodsExtracted: number;
  conflictsDetected: number;
  conflictsResolved: number;
  clarificationsPending: number;
  overallConfidence: number;
  processingTimeMs: number;
}

export interface SessionFailedData {
  error: string;
  phase: string;
  documentId?: string;
}

export interface ErrorData {
  message: string;
  code?: string;
  recoverable: boolean;
}

// ============================================================================
// STREAM EVENT INTERFACE
// ============================================================================

export interface StreamEvent<T extends StreamEventType = StreamEventType> {
  type: T;
  sessionId: string;
  timestamp: string;
  data: StreamEventDataMap[T];
}

export type StreamEventDataMap = {
  session_started: SessionStartedData;
  document_started: DocumentStartedData;
  pass_started: PassStartedData;
  pass_progress: PassProgressData;
  pass_completed: PassCompletedData;
  document_completed: DocumentCompletedData;
  facility_detected: FacilityDetectedData;
  period_extracted: PeriodExtractedData;
  conflict_detected: ConflictDetectedData;
  clarification_needed: ClarificationNeededData;
  clarification_resolved: { clarificationId: string };
  validation_started: Record<string, never>;
  validation_completed: ValidationCompletedData;
  population_started: Record<string, never>;
  population_completed: PopulationCompletedData;
  session_completed: SessionCompletedData;
  session_failed: SessionFailedData;
  error: ErrorData;
  heartbeat: { time: string };
};

// ============================================================================
// TYPE HELPERS
// ============================================================================

export function createStreamEvent<T extends StreamEventType>(
  type: T,
  sessionId: string,
  data: StreamEventDataMap[T]
): StreamEvent<T> {
  return {
    type,
    sessionId,
    timestamp: new Date().toISOString(),
    data,
  };
}

export function formatStreamEventForSSE(event: StreamEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export default {
  createStreamEvent,
  formatStreamEventForSSE,
};
