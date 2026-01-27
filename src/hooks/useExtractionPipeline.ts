/**
 * useExtractionPipeline Hook
 *
 * React hook for managing the AI extraction pipeline with real-time progress updates.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  PipelineStatus,
  PassType,
  PipelineProgress,
} from '@/lib/extraction/pipeline/types';
import type {
  StreamEvent,
  StreamEventDataMap,
  SessionCompletedData,
  ConflictDetectedData,
  ClarificationNeededData,
  DocumentCompletedData,
  FacilityDetectedData,
} from '@/lib/extraction/pipeline/stream/event-types';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineState {
  sessionId: string | null;
  status: PipelineStatus | 'idle';
  progress: PipelineProgress | null;
  currentDocument: {
    id: string;
    filename: string;
    index: number;
    total: number;
  } | null;
  currentPass: PassType | null;
  passProgress: number;
  passMessage: string;
  facilities: FacilityDetectedData[];
  conflicts: ConflictDetectedData[];
  clarifications: ClarificationNeededData[];
  completedDocuments: DocumentCompletedData[];
  finalStats: SessionCompletedData | null;
  error: string | null;
  isLoading: boolean;
}

export interface Clarification {
  id: string;
  fieldPath: string;
  fieldLabel: string;
  clarificationType: string;
  priority: number;
  extractedValue: number | string | null;
  extractedConfidence: number;
  suggestedValues: {
    value: number | string;
    source: string;
    confidence: number;
    reasoning?: string;
  }[];
  benchmarkRange?: { min: number; max: number; median: number };
  context: {
    documentName: string;
    periodDescription?: string;
    aiExplanation?: string;
    relatedValues?: { label: string; value: number | string }[];
  };
  status: string;
}

export interface UseExtractionPipelineReturn {
  state: PipelineState;
  startPipeline: (documentIds?: string[]) => Promise<void>;
  resolveClarification: (
    clarificationId: string,
    resolvedValue: number | string,
    note?: string
  ) => Promise<void>;
  bulkResolveClarifications: (
    resolutions: { clarificationId: string; resolvedValue: number | string; note?: string }[]
  ) => Promise<void>;
  continuePipeline: () => Promise<void>;
  fetchClarifications: () => Promise<Clarification[]>;
  reset: () => void;
}

const initialState: PipelineState = {
  sessionId: null,
  status: 'idle',
  progress: null,
  currentDocument: null,
  currentPass: null,
  passProgress: 0,
  passMessage: '',
  facilities: [],
  conflicts: [],
  clarifications: [],
  completedDocuments: [],
  finalStats: null,
  error: null,
  isLoading: false,
};

// ============================================================================
// HOOK
// ============================================================================

export function useExtractionPipeline(dealId: string): UseExtractionPipelineReturn {
  const [state, setState] = useState<PipelineState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const resolvedByRef = useRef<string>('user'); // Could be set to actual user ID

  // --------------------------------------------------------------------------
  // SSE Event Handling
  // --------------------------------------------------------------------------

  const setupEventSource = useCallback((sessionId: string) => {
    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/deals/${dealId}/extraction/pipeline/${sessionId}/stream`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Session started
    eventSource.addEventListener('session_started', (e: MessageEvent) => {
      const event: StreamEvent<'session_started'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        status: 'processing',
        progress: {
          totalDocuments: event.data.documentCount,
          processedDocuments: 0,
          phase: 'Starting',
          overallProgress: 0,
          extractedFacilities: 0,
          extractedPeriods: 0,
          detectedConflicts: 0,
          pendingClarifications: 0,
        },
      }));
    });

    // Document started
    eventSource.addEventListener('document_started', (e: MessageEvent) => {
      const event: StreamEvent<'document_started'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        currentDocument: {
          id: event.data.documentId,
          filename: event.data.filename,
          index: event.data.index,
          total: event.data.total,
        },
      }));
    });

    // Pass started
    eventSource.addEventListener('pass_started', (e: MessageEvent) => {
      const event: StreamEvent<'pass_started'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        currentPass: event.data.pass,
        passProgress: 0,
        passMessage: `Starting ${event.data.pass} pass...`,
      }));
    });

    // Pass progress
    eventSource.addEventListener('pass_progress', (e: MessageEvent) => {
      const event: StreamEvent<'pass_progress'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        passProgress: event.data.progress,
        passMessage: event.data.message,
      }));
    });

    // Document completed
    eventSource.addEventListener('document_completed', (e: MessageEvent) => {
      const event: StreamEvent<'document_completed'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        completedDocuments: [...prev.completedDocuments, event.data],
        progress: prev.progress
          ? {
              ...prev.progress,
              processedDocuments: prev.progress.processedDocuments + 1,
              overallProgress: Math.round(
                ((prev.progress.processedDocuments + 1) / prev.progress.totalDocuments) * 100
              ),
            }
          : null,
      }));
    });

    // Facility detected
    eventSource.addEventListener('facility_detected', (e: MessageEvent) => {
      const event: StreamEvent<'facility_detected'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        facilities: [...prev.facilities, event.data],
        progress: prev.progress
          ? {
              ...prev.progress,
              extractedFacilities: prev.progress.extractedFacilities + 1,
            }
          : null,
      }));
    });

    // Conflict detected
    eventSource.addEventListener('conflict_detected', (e: MessageEvent) => {
      const event: StreamEvent<'conflict_detected'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        conflicts: [...prev.conflicts, event.data],
        progress: prev.progress
          ? {
              ...prev.progress,
              detectedConflicts: prev.progress.detectedConflicts + 1,
            }
          : null,
      }));
    });

    // Clarification needed
    eventSource.addEventListener('clarification_needed', (e: MessageEvent) => {
      const event: StreamEvent<'clarification_needed'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        clarifications: [...prev.clarifications, event.data],
        progress: prev.progress
          ? {
              ...prev.progress,
              pendingClarifications: prev.progress.pendingClarifications + 1,
            }
          : null,
      }));
    });

    // Validation completed
    eventSource.addEventListener('validation_completed', (e: MessageEvent) => {
      const event: StreamEvent<'validation_completed'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        progress: prev.progress
          ? {
              ...prev.progress,
              phase: 'Validation complete',
              detectedConflicts: event.data.conflictsDetected,
              pendingClarifications: event.data.clarificationsNeeded,
            }
          : null,
      }));
    });

    // Session completed
    eventSource.addEventListener('session_completed', (e: MessageEvent) => {
      const event: StreamEvent<'session_completed'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        status: event.data.clarificationsPending > 0 ? 'awaiting_clarifications' : 'completed',
        finalStats: event.data,
        isLoading: false,
      }));
      eventSource.close();
    });

    // Session failed
    eventSource.addEventListener('session_failed', (e: MessageEvent) => {
      const event: StreamEvent<'session_failed'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: event.data.error,
        isLoading: false,
      }));
      eventSource.close();
    });

    // Error
    eventSource.addEventListener('error', (e: MessageEvent) => {
      const event: StreamEvent<'error'> = JSON.parse(e.data);
      setState((prev) => ({
        ...prev,
        error: event.data.message,
      }));
    });

    // Connection error
    eventSource.onerror = () => {
      setState((prev) => ({
        ...prev,
        error: 'Connection lost',
        isLoading: false,
      }));
      eventSource.close();
    };
  }, [dealId]);

  // --------------------------------------------------------------------------
  // Actions
  // --------------------------------------------------------------------------

  const startPipeline = useCallback(async (documentIds?: string[]) => {
    setState((prev) => ({
      ...initialState,
      isLoading: true,
    }));

    try {
      const response = await fetch(`/api/deals/${dealId}/extraction/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start pipeline');
      }

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        sessionId: data.sessionId,
        status: 'initializing',
      }));

      // Set up SSE connection
      setupEventSource(data.sessionId);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      }));
    }
  }, [dealId, setupEventSource]);

  const resolveClarification = useCallback(async (
    clarificationId: string,
    resolvedValue: number | string,
    note?: string
  ) => {
    if (!state.sessionId) return;

    try {
      const response = await fetch(
        `/api/deals/${dealId}/extraction/pipeline/${state.sessionId}/clarifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clarificationId,
            resolvedValue,
            resolvedBy: resolvedByRef.current,
            note,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve clarification');
      }

      const data = await response.json();

      // Remove from local clarifications list
      setState((prev) => ({
        ...prev,
        clarifications: prev.clarifications.filter((c) => c.clarificationId !== clarificationId),
        progress: prev.progress
          ? {
              ...prev.progress,
              pendingClarifications: data.remainingClarifications,
            }
          : null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve clarification',
      }));
    }
  }, [dealId, state.sessionId]);

  const bulkResolveClarifications = useCallback(async (
    resolutions: { clarificationId: string; resolvedValue: number | string; note?: string }[]
  ) => {
    if (!state.sessionId) return;

    try {
      const response = await fetch(
        `/api/deals/${dealId}/extraction/pipeline/${state.sessionId}/clarifications`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resolutions,
            resolvedBy: resolvedByRef.current,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resolve clarifications');
      }

      const data = await response.json();

      // Update local state
      const resolvedIds = new Set(resolutions.map((r) => r.clarificationId));
      setState((prev) => ({
        ...prev,
        clarifications: prev.clarifications.filter((c) => !resolvedIds.has(c.clarificationId)),
        progress: prev.progress
          ? {
              ...prev.progress,
              pendingClarifications: data.remainingClarifications,
            }
          : null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to resolve clarifications',
      }));
    }
  }, [dealId, state.sessionId]);

  const continuePipeline = useCallback(async () => {
    if (!state.sessionId || state.status !== 'awaiting_clarifications') return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(
        `/api/deals/${dealId}/extraction/pipeline/${state.sessionId}/clarifications`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clarificationId: '', // Dummy - will just trigger continue
            resolvedValue: 0,
            resolvedBy: resolvedByRef.current,
            continueAfterResolution: true,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to continue pipeline');
      }

      const data = await response.json();

      if (data.pipelineContinued) {
        setState((prev) => ({
          ...prev,
          status: data.pipelineStatus,
          isLoading: false,
        }));
      } else {
        setState((prev) => ({
          ...prev,
          error: 'Cannot continue - high-priority clarifications still pending',
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to continue pipeline',
        isLoading: false,
      }));
    }
  }, [dealId, state.sessionId, state.status]);

  const fetchClarifications = useCallback(async (): Promise<Clarification[]> => {
    if (!state.sessionId) return [];

    try {
      const response = await fetch(
        `/api/deals/${dealId}/extraction/pipeline/${state.sessionId}/clarifications`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch clarifications');
      }

      const data = await response.json();
      return data.clarifications || [];
    } catch (error) {
      console.error('Error fetching clarifications:', error);
      return [];
    }
  }, [dealId, state.sessionId]);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState(initialState);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    state,
    startPipeline,
    resolveClarification,
    bulkResolveClarifications,
    continuePipeline,
    fetchClarifications,
    reset,
  };
}

export default useExtractionPipeline;
