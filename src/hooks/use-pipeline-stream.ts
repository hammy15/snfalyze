'use client';

/**
 * Pipeline Stream Hook
 *
 * React hook for consuming SSE events from the Smart Intake Pipeline.
 * Manages pipeline lifecycle: start → stream → clarify → complete.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  PipelinePhase,
  PipelineStatus,
  PipelineSSEEvent,
  ClarificationRequest,
  ClarificationAnswer,
  DealSynthesis,
  RedFlag,
  ToolResult,
} from '@/lib/pipeline/types';

// ============================================================================
// Types
// ============================================================================

export interface PipelineStreamState {
  status: PipelineStatus;
  phase: PipelinePhase;
  phaseProgress: number;
  phaseMessage: string;
  events: PipelineSSEEvent[];
  // Phase 1: Ingest
  parsedFiles: Array<{
    filename: string;
    docType: string;
    pageCount: number;
    confidence: number;
  }>;
  completenessScore: number;
  missingDocuments: string[];
  // Phase 2: Extract
  detectedFacilities: Array<{
    name: string;
    beds?: number;
    state?: string;
    assetType?: string;
    confidence?: number;
  }>;
  cmsMatches: Array<{
    facilityName: string;
    providerNumber: string;
    stars: number;
  }>;
  // Phase 3: Clarify
  clarifications: ClarificationRequest[];
  isPaused: boolean;
  // Phase 4: Assemble
  dealId: string | null;
  dealName: string | null;
  // Phase 5: Analyze
  analysisScore: number | null;
  analysisThesis: string | null;
  // Phase 6: Tools
  toolResults: Array<{ toolName: string; headline?: string; [key: string]: unknown }>;
  // Phase 7: Synthesize
  synthesis: DealSynthesis | null;
  // Red flags (across phases)
  redFlags: RedFlag[];
  // Errors
  error: string | null;
  // Session
  sessionId: string | null;
  // Completed phases
  completedPhases: Set<PipelinePhase>;
}

export interface UsePipelineStreamOptions {
  onPhaseCompleted?: (phase: PipelinePhase) => void;
  onClarificationNeeded?: (clarifications: ClarificationRequest[]) => void;
  onRedFlag?: (flag: { severity: string; message: string }) => void;
  onComplete?: (dealId: string, synthesis: DealSynthesis) => void;
  onError?: (error: string) => void;
}

export interface UsePipelineStreamReturn extends PipelineStreamState {
  startPipeline: (files: File[]) => Promise<void>;
  submitClarifications: (answers: ClarificationAnswer[]) => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: PipelineStreamState = {
  status: 'idle',
  phase: 'ingest',
  phaseProgress: 0,
  phaseMessage: '',
  events: [],
  parsedFiles: [],
  completenessScore: 0,
  missingDocuments: [],
  detectedFacilities: [],
  cmsMatches: [],
  clarifications: [],
  isPaused: false,
  dealId: null,
  dealName: null,
  analysisScore: null,
  analysisThesis: null,
  toolResults: [],
  synthesis: null,
  redFlags: [],
  error: null,
  sessionId: null,
  completedPhases: new Set(),
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePipelineStream(
  options: UsePipelineStreamOptions = {}
): UsePipelineStreamReturn {
  const { onPhaseCompleted, onClarificationNeeded, onRedFlag, onComplete, onError } = options;

  const [state, setState] = useState<PipelineStreamState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    sessionIdRef.current = null;
    setState({ ...initialState, completedPhases: new Set() });
  }, []);

  const handleSSEEvent = useCallback(
    (raw: MessageEvent) => {
      try {
        const event: PipelineSSEEvent = JSON.parse(raw.data);

        setState((prev) => {
          const next = { ...prev, events: [...prev.events, event] };

          switch (event.type) {
            case 'pipeline_started':
              next.status = 'running';
              break;

            case 'phase_started':
              next.phase = event.data.phase as PipelinePhase;
              next.phaseProgress = 0;
              next.phaseMessage = '';
              break;

            case 'phase_progress':
              next.phaseProgress = (event.data.percent as number) || 0;
              next.phaseMessage = (event.data.message as string) || '';
              break;

            case 'phase_completed': {
              const completedPhase = event.data.phase as PipelinePhase;
              next.completedPhases = new Set([...prev.completedPhases, completedPhase]);
              next.phaseProgress = 100;
              onPhaseCompleted?.(completedPhase);
              break;
            }

            case 'file_parsed':
              next.parsedFiles = [
                ...prev.parsedFiles,
                {
                  filename: event.data.filename as string,
                  docType: event.data.docType as string,
                  pageCount: (event.data.pageCount as number) || 0,
                  confidence: (event.data.confidence as number) || 0,
                },
              ];
              break;

            case 'completeness_check':
              next.completenessScore = (event.data.score as number) || 0;
              next.missingDocuments = (event.data.missing as string[]) || [];
              break;

            case 'facility_detected':
              next.detectedFacilities = [
                ...prev.detectedFacilities,
                {
                  name: event.data.name as string,
                  beds: event.data.beds as number | undefined,
                  state: event.data.state as string | undefined,
                  assetType: event.data.assetType as string | undefined,
                  confidence: event.data.confidence as number | undefined,
                },
              ];
              break;

            case 'cms_matched':
              next.cmsMatches = [
                ...prev.cmsMatches,
                {
                  facilityName: event.data.facilityName as string,
                  providerNumber: event.data.providerNumber as string,
                  stars: (event.data.stars as number) || 0,
                },
              ];
              break;

            case 'red_flag': {
              const flag: RedFlag = {
                id: (event.data.id as string) || Date.now().toString(),
                severity: event.data.severity as 'critical' | 'warning',
                category: (event.data.category as RedFlag['category']) || 'financial',
                message: event.data.message as string,
                phase: next.phase,
              };
              next.redFlags = [...prev.redFlags, flag];
              onRedFlag?.({ severity: flag.severity, message: flag.message });
              break;
            }

            case 'clarification_needed': {
              const clarifications = (event.data.clarifications as ClarificationRequest[]) || [];
              next.clarifications = clarifications;
              next.isPaused = true;
              next.status = 'paused_for_clarification';
              onClarificationNeeded?.(clarifications);
              break;
            }

            case 'clarifications_resolved':
              next.isPaused = false;
              next.status = 'running';
              break;

            case 'deal_created':
              next.dealId = event.data.dealId as string;
              next.dealName = event.data.dealName as string;
              break;

            case 'analysis_complete':
              next.analysisScore = (event.data.score as number) || null;
              next.analysisThesis = (event.data.thesis as string) || null;
              break;

            case 'tool_executed':
              next.toolResults = [
                ...prev.toolResults,
                event.data as { toolName: string; headline?: string; [key: string]: unknown },
              ];
              break;

            case 'pipeline_complete':
              next.status = 'completed';
              next.synthesis = (event.data.summary as DealSynthesis) || null;
              if (event.data.dealId && event.data.summary) {
                onComplete?.(event.data.dealId as string, event.data.summary as DealSynthesis);
              }
              break;

            case 'pipeline_error':
              next.status = 'failed';
              next.error = (event.data.error as string) || 'Pipeline failed';
              onError?.(next.error);
              break;
          }

          return next;
        });
      } catch (err) {
        console.error('[usePipelineStream] Error parsing event:', err);
      }
    },
    [onPhaseCompleted, onClarificationNeeded, onRedFlag, onComplete, onError]
  );

  const startPipeline = useCallback(
    async (files: File[]) => {
      reset();

      setState((prev) => ({
        ...prev,
        status: 'running',
        phase: 'ingest',
      }));

      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));

      try {
        const response = await fetch('/api/pipeline/stream', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to start pipeline');
        }

        // Get session ID from header
        const sessionId = response.headers.get('X-Pipeline-Session-Id');
        sessionIdRef.current = sessionId;
        setState((prev) => ({ ...prev, sessionId }));

        // Read SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        const processStream = async () => {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Process complete SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep incomplete line

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data) {
                  handleSSEEvent({ data } as MessageEvent);
                }
              }
            }
          }
        };

        processStream().catch((err) => {
          console.error('[usePipelineStream] Stream error:', err);
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: err.message,
          }));
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start pipeline';
        setState((prev) => ({
          ...prev,
          status: 'failed',
          error: errorMessage,
        }));
        onError?.(errorMessage);
      }
    },
    [reset, handleSSEEvent, onError]
  );

  const submitClarifications = useCallback(
    async (answers: ClarificationAnswer[]) => {
      if (!sessionIdRef.current) {
        console.error('[usePipelineStream] No session ID for clarification submission');
        return;
      }

      try {
        const response = await fetch('/api/pipeline/clarify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionIdRef.current,
            answers,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(error.error || 'Failed to submit clarifications');
        }
      } catch (err) {
        console.error('[usePipelineStream] Clarification submission error:', err);
      }
    },
    []
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    startPipeline,
    submitClarifications,
    reset,
  };
}

export default usePipelineStream;
