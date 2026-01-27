/**
 * Progress Emitter
 *
 * Emits extraction pipeline progress events for SSE streaming.
 */

import { EventEmitter } from 'events';
import type {
  StreamEvent,
  StreamEventType,
  StreamEventDataMap,
} from './event-types';
import { createStreamEvent, formatStreamEventForSSE } from './event-types';

// ============================================================================
// PROGRESS EMITTER CLASS
// ============================================================================

export class ProgressEmitter extends EventEmitter {
  private sessionId: string;
  private eventHistory: StreamEvent[] = [];
  private maxHistorySize: number = 100;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
    this.setMaxListeners(50); // Allow many listeners for multiple subscribers
  }

  // --------------------------------------------------------------------------
  // Event Emission
  // --------------------------------------------------------------------------

  /**
   * Emit a typed event
   */
  emitEvent<T extends StreamEventType>(type: T, data: StreamEventDataMap[T]): void {
    const event = createStreamEvent(type, this.sessionId, data);

    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    // Emit to listeners
    this.emit('event', event);
    this.emit(type, event);
  }

  // --------------------------------------------------------------------------
  // Convenience Methods
  // --------------------------------------------------------------------------

  sessionStarted(dealId: string, documentIds: string[]): void {
    this.emitEvent('session_started', {
      sessionId: this.sessionId,
      dealId,
      documentCount: documentIds.length,
      documentIds,
    });
  }

  documentStarted(documentId: string, filename: string, index: number, total: number): void {
    this.emitEvent('document_started', {
      documentId,
      filename,
      index,
      total,
    });
  }

  passStarted(pass: 'structure' | 'extraction' | 'validation' | 'population', documentId: string, filename: string): void {
    this.emitEvent('pass_started', {
      pass,
      documentId,
      filename,
    });
  }

  passProgress(pass: 'structure' | 'extraction' | 'validation' | 'population', progress: number, message: string): void {
    this.emitEvent('pass_progress', {
      pass,
      progress,
      message,
    });
  }

  passCompleted(
    pass: 'structure' | 'extraction' | 'validation' | 'population',
    documentId: string,
    duration: number,
    itemsExtracted?: number
  ): void {
    this.emitEvent('pass_completed', {
      pass,
      documentId,
      duration,
      itemsExtracted,
    });
  }

  documentCompleted(
    documentId: string,
    filename: string,
    stats: {
      financialPeriodsExtracted: number;
      censusPeriodsExtracted: number;
      payerRatesExtracted: number;
      confidence: number;
    }
  ): void {
    this.emitEvent('document_completed', {
      documentId,
      filename,
      ...stats,
    });
  }

  facilityDetected(facilityId: string, facilityName: string, isNew: boolean): void {
    this.emitEvent('facility_detected', {
      facilityId,
      facilityName,
      isNew,
    });
  }

  periodExtracted(
    type: 'financial' | 'census' | 'rate',
    facilityName: string,
    periodDescription: string,
    confidence: number
  ): void {
    this.emitEvent('period_extracted', {
      type,
      facilityName,
      periodDescription,
      confidence,
    });
  }

  conflictDetected(conflict: {
    conflictId: string;
    type: 'cross_document' | 'cross_period' | 'revenue_reconciliation' | 'internal_consistency' | 'benchmark_deviation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    fieldPath: string;
    valueCount: number;
    variancePercent: number;
  }): void {
    this.emitEvent('conflict_detected', conflict);
  }

  clarificationNeeded(clarification: {
    clarificationId: string;
    fieldLabel: string;
    priority: number;
    clarificationType: 'low_confidence' | 'out_of_range' | 'conflict' | 'missing_critical' | 'revenue_mismatch' | 'validation_error';
  }): void {
    this.emitEvent('clarification_needed', clarification);
  }

  validationStarted(): void {
    this.emitEvent('validation_started', {});
  }

  validationCompleted(stats: {
    isValid: boolean;
    conflictsDetected: number;
    conflictsAutoResolved: number;
    clarificationsNeeded: number;
    validationScore: number;
  }): void {
    this.emitEvent('validation_completed', stats);
  }

  populationStarted(): void {
    this.emitEvent('population_started', {});
  }

  populationCompleted(stats: {
    financialPeriodsWritten: number;
    censusPeriodsWritten: number;
    payerRatesWritten: number;
    facilitiesUpdated: number;
  }): void {
    this.emitEvent('population_completed', stats);
  }

  sessionCompleted(stats: {
    facilitiesExtracted: number;
    periodsExtracted: number;
    conflictsDetected: number;
    conflictsResolved: number;
    clarificationsPending: number;
    overallConfidence: number;
    processingTimeMs: number;
  }): void {
    this.emitEvent('session_completed', stats);
  }

  sessionFailed(error: string, phase: string, documentId?: string): void {
    this.emitEvent('session_failed', {
      error,
      phase,
      documentId,
    });
  }

  error(message: string, code?: string, recoverable: boolean = false): void {
    this.emitEvent('error', {
      message,
      code,
      recoverable,
    });
  }

  heartbeat(): void {
    this.emitEvent('heartbeat', { time: new Date().toISOString() });
  }

  // --------------------------------------------------------------------------
  // History & Replay
  // --------------------------------------------------------------------------

  /**
   * Get all events in history
   */
  getHistory(): StreamEvent[] {
    return [...this.eventHistory];
  }

  /**
   * Get events since a timestamp
   */
  getEventsSince(timestamp: string): StreamEvent[] {
    const since = new Date(timestamp).getTime();
    return this.eventHistory.filter(
      (e) => new Date(e.timestamp).getTime() > since
    );
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }
}

// ============================================================================
// SSE RESPONSE HELPERS
// ============================================================================

/**
 * Create an SSE response from a progress emitter
 */
export function createSSEResponse(emitter: ProgressEmitter): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    start(controller) {
      // Send event history first
      for (const event of emitter.getHistory()) {
        controller.enqueue(encoder.encode(formatStreamEventForSSE(event)));
      }

      // Listen for new events
      const onEvent = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(formatStreamEventForSSE(event)));
      };

      emitter.on('event', onEvent);

      // Set up heartbeat
      const heartbeat = setInterval(() => {
        emitter.heartbeat();
      }, 15000);

      // Cleanup on close
      const cleanup = () => {
        clearInterval(heartbeat);
        emitter.off('event', onEvent);
      };

      // Close stream when session completes or fails
      emitter.once('session_completed', () => {
        setTimeout(() => {
          cleanup();
          controller.close();
        }, 100);
      });

      emitter.once('session_failed', () => {
        setTimeout(() => {
          cleanup();
          controller.close();
        }, 100);
      });
    },
  });
}

// ============================================================================
// FACTORY
// ============================================================================

export function createProgressEmitter(sessionId: string): ProgressEmitter {
  return new ProgressEmitter(sessionId);
}

export default {
  ProgressEmitter,
  createProgressEmitter,
  createSSEResponse,
};
