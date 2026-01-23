/**
 * Extraction Stream Hook
 *
 * React hook for consuming Server-Sent Events from the extraction stream API.
 * Provides real-time extraction progress, field updates, and clarification requests.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ExtractedFieldEvent {
  fieldName: string;
  value: unknown;
  confidence: number;
  progress: number;
}

export interface ClarificationEvent {
  id?: string;
  fieldName: string;
  extractedValue: unknown;
  suggestedValue?: unknown;
  suggestedValues?: unknown[];
  benchmarkValue?: string;
  benchmarkRange?: { min: number; max: number; median: number };
  type: 'low_confidence' | 'out_of_range' | 'conflict' | 'missing' | 'validation_error';
  reason: string;
  priority?: number;
  confidence?: number;
}

export interface ProgressEvent {
  percent: number;
  stage: string;
}

export interface CompletionEvent {
  documentId: string;
  totalFields: number;
  clarificationsGenerated: number;
  autoResolved: number;
  overallConfidence: number;
  criticalClarifications: number;
}

export interface ErrorEvent {
  message: string;
  code?: string;
}

export interface StreamEvent {
  type: 'progress' | 'field_extracted' | 'clarification_needed' | 'complete' | 'error';
  data: ProgressEvent | ExtractedFieldEvent | ClarificationEvent | CompletionEvent | ErrorEvent;
  timestamp: string;
}

export interface ExtractionStreamState {
  isConnected: boolean;
  isExtracting: boolean;
  progress: number;
  stage: string;
  extractedFields: Map<string, ExtractedFieldEvent>;
  clarifications: ClarificationEvent[];
  completion: CompletionEvent | null;
  error: ErrorEvent | null;
}

export interface UseExtractionStreamOptions {
  autoConnect?: boolean;
  onFieldExtracted?: (field: ExtractedFieldEvent) => void;
  onClarificationNeeded?: (clarification: ClarificationEvent) => void;
  onComplete?: (completion: CompletionEvent) => void;
  onError?: (error: ErrorEvent) => void;
  onProgress?: (progress: ProgressEvent) => void;
}

export interface UseExtractionStreamReturn extends ExtractionStreamState {
  connect: () => void;
  disconnect: () => void;
  startExtraction: (options?: { reprocess?: boolean; facilityType?: string }) => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: ExtractionStreamState = {
  isConnected: false,
  isExtracting: false,
  progress: 0,
  stage: '',
  extractedFields: new Map(),
  clarifications: [],
  completion: null,
  error: null,
};

// ============================================================================
// Hook Implementation
// ============================================================================

export function useExtractionStream(
  documentId: string | null,
  options: UseExtractionStreamOptions = {}
): UseExtractionStreamReturn {
  const {
    autoConnect = false,
    onFieldExtracted,
    onClarificationNeeded,
    onComplete,
    onError,
    onProgress,
  } = options;

  const [state, setState] = useState<ExtractionStreamState>(initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Reset state to initial values
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Disconnect from the stream
   */
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      isExtracting: false,
    }));
  }, []);

  /**
   * Handle incoming SSE message
   */
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const streamEvent: StreamEvent = JSON.parse(event.data);

        switch (streamEvent.type) {
          case 'progress': {
            const progressData = streamEvent.data as ProgressEvent;
            setState((prev) => ({
              ...prev,
              progress: progressData.percent,
              stage: progressData.stage,
            }));
            onProgress?.(progressData);
            break;
          }

          case 'field_extracted': {
            const fieldData = streamEvent.data as ExtractedFieldEvent;
            setState((prev) => {
              const newFields = new Map(prev.extractedFields);
              newFields.set(fieldData.fieldName, fieldData);
              return {
                ...prev,
                extractedFields: newFields,
                progress: fieldData.progress,
              };
            });
            onFieldExtracted?.(fieldData);
            break;
          }

          case 'clarification_needed': {
            const clarificationData = streamEvent.data as ClarificationEvent;
            setState((prev) => ({
              ...prev,
              clarifications: [...prev.clarifications, clarificationData],
            }));
            onClarificationNeeded?.(clarificationData);
            break;
          }

          case 'complete': {
            const completionData = streamEvent.data as CompletionEvent;
            setState((prev) => ({
              ...prev,
              isExtracting: false,
              completion: completionData,
              progress: 100,
              stage: 'Complete',
            }));
            onComplete?.(completionData);
            // Disconnect after completion
            disconnect();
            break;
          }

          case 'error': {
            const errorData = streamEvent.data as ErrorEvent;
            setState((prev) => ({
              ...prev,
              isExtracting: false,
              error: errorData,
            }));
            onError?.(errorData);
            // Disconnect on error
            disconnect();
            break;
          }
        }
      } catch (err) {
        console.error('Error parsing SSE message:', err);
      }
    },
    [onFieldExtracted, onClarificationNeeded, onComplete, onError, onProgress, disconnect]
  );

  /**
   * Connect to the extraction stream
   */
  const connect = useCallback(() => {
    if (!documentId) {
      console.warn('Cannot connect: no documentId provided');
      return;
    }

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/documents/${documentId}/extract/stream`;
    const eventSource = new EventSource(url);

    eventSource.onopen = () => {
      setState((prev) => ({
        ...prev,
        isConnected: true,
        isExtracting: true,
        error: null,
      }));
    };

    eventSource.onmessage = handleMessage;

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);

      // Check if the connection was closed
      if (eventSource.readyState === EventSource.CLOSED) {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isExtracting: false,
        }));
      } else {
        // Attempt reconnection after delay
        setState((prev) => ({
          ...prev,
          isConnected: false,
        }));

        reconnectTimeoutRef.current = setTimeout(() => {
          if (eventSourceRef.current === eventSource) {
            connect();
          }
        }, 3000);
      }
    };

    eventSourceRef.current = eventSource;
  }, [documentId, handleMessage]);

  /**
   * Start extraction via POST request, then connect to stream
   */
  const startExtraction = useCallback(
    async (extractionOptions?: { reprocess?: boolean; facilityType?: string }) => {
      if (!documentId) {
        throw new Error('Cannot start extraction: no documentId provided');
      }

      // Reset state
      setState({
        ...initialState,
        isExtracting: true,
      });

      // Trigger extraction
      const response = await fetch(`/api/documents/${documentId}/extract/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(extractionOptions || {}),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || 'Failed to start extraction');
      }

      // Connect to stream
      connect();
    },
    [documentId, connect]
  );

  /**
   * Auto-connect effect
   */
  useEffect(() => {
    if (autoConnect && documentId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, documentId, connect, disconnect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
    startExtraction,
    reset,
  };
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to get clarifications that need attention
 */
export function usePendingClarifications(clarifications: ClarificationEvent[]) {
  return {
    pending: clarifications,
    count: clarifications.length,
    critical: clarifications.filter((c) => c.priority && c.priority >= 8),
    byType: {
      lowConfidence: clarifications.filter((c) => c.type === 'low_confidence'),
      outOfRange: clarifications.filter((c) => c.type === 'out_of_range'),
      conflict: clarifications.filter((c) => c.type === 'conflict'),
      missing: clarifications.filter((c) => c.type === 'missing'),
      validationError: clarifications.filter((c) => c.type === 'validation_error'),
    },
    highestPriority: clarifications.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0],
  };
}

/**
 * Hook to track extraction progress with stages
 */
export function useExtractionProgress(
  progress: number,
  stage: string,
  extractedFields: Map<string, ExtractedFieldEvent>
) {
  return {
    percent: progress,
    stage,
    fieldsExtracted: extractedFields.size,
    averageConfidence:
      extractedFields.size > 0
        ? Array.from(extractedFields.values()).reduce((sum, f) => sum + f.confidence, 0) /
          extractedFields.size
        : 0,
    lowConfidenceFields: Array.from(extractedFields.values()).filter((f) => f.confidence < 70),
  };
}

export default useExtractionStream;
