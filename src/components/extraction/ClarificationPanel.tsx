/**
 * Pipeline Clarification Panel
 *
 * Panel for reviewing and resolving extraction clarifications
 * during the AI extraction pipeline process.
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ConfidenceBadge, ClarificationTypeBadge, PriorityBadge } from './confidence-badge';
import type { ClarificationType } from './confidence-badge';

// ============================================================================
// TYPES
// ============================================================================

export interface SuggestedValue {
  value: number | string;
  source: string;
  confidence: number;
  reasoning?: string;
}

export interface ClarificationContext {
  documentName: string;
  periodDescription?: string;
  aiExplanation?: string;
  relatedValues?: { label: string; value: number | string }[];
}

export interface Clarification {
  id: string;
  fieldPath: string;
  fieldLabel: string;
  clarificationType: ClarificationType;
  priority: number;
  extractedValue: number | string | null;
  extractedConfidence: number;
  suggestedValues: SuggestedValue[];
  benchmarkRange?: { min: number; max: number; median: number };
  context: ClarificationContext;
  status: 'pending' | 'resolved' | 'skipped';
}

export interface ClarificationPanelProps {
  clarifications: Clarification[];
  onResolve: (
    clarificationId: string,
    resolvedValue: number | string,
    note?: string
  ) => Promise<void>;
  onSkip?: (clarificationId: string) => void;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// CLARIFICATION PANEL
// ============================================================================

export function ClarificationPanel({
  clarifications,
  onResolve,
  onSkip,
  isLoading = false,
  className,
}: ClarificationPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    clarifications[0]?.id || null
  );
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleResolve = useCallback(
    async (clarificationId: string, value: number | string) => {
      setResolvingId(clarificationId);
      try {
        await onResolve(clarificationId, value, notes[clarificationId]);
      } finally {
        setResolvingId(null);
      }
    },
    [onResolve, notes]
  );

  const handleCustomSubmit = useCallback(
    async (clarificationId: string) => {
      const customValue = customValues[clarificationId];
      if (!customValue) return;

      const numValue = parseFloat(customValue);
      await handleResolve(
        clarificationId,
        isNaN(numValue) ? customValue : numValue
      );
    },
    [customValues, handleResolve]
  );

  const pendingClarifications = clarifications.filter(
    (c) => c.status === 'pending'
  );

  if (pendingClarifications.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-green-200 bg-green-50 p-6 text-center dark:border-green-800 dark:bg-green-900/20',
          className
        )}
      >
        <div className="text-green-600 dark:text-green-400">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="mt-2 text-sm font-medium text-green-800 dark:text-green-300">
          All Clarifications Resolved
        </h3>
        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
          No pending items require your attention.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Clarifications Needed ({pendingClarifications.length})
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {pendingClarifications.filter((c) => c.priority >= 8).length} high
          priority
        </span>
      </div>

      {/* Clarification Cards */}
      <div className="space-y-3">
        {pendingClarifications
          .sort((a, b) => b.priority - a.priority)
          .map((clarification) => (
            <ClarificationCard
              key={clarification.id}
              clarification={clarification}
              isExpanded={expandedId === clarification.id}
              isResolving={resolvingId === clarification.id}
              customValue={customValues[clarification.id] || ''}
              note={notes[clarification.id] || ''}
              onToggle={() =>
                setExpandedId(
                  expandedId === clarification.id ? null : clarification.id
                )
              }
              onSelectValue={(value) =>
                handleResolve(clarification.id, value)
              }
              onCustomValueChange={(value) =>
                setCustomValues((prev) => ({
                  ...prev,
                  [clarification.id]: value,
                }))
              }
              onNoteChange={(note) =>
                setNotes((prev) => ({
                  ...prev,
                  [clarification.id]: note,
                }))
              }
              onCustomSubmit={() => handleCustomSubmit(clarification.id)}
              onSkip={onSkip ? () => onSkip(clarification.id) : undefined}
            />
          ))}
      </div>
    </div>
  );
}

// ============================================================================
// CLARIFICATION CARD
// ============================================================================

interface ClarificationCardProps {
  clarification: Clarification;
  isExpanded: boolean;
  isResolving: boolean;
  customValue: string;
  note: string;
  onToggle: () => void;
  onSelectValue: (value: number | string) => void;
  onCustomValueChange: (value: string) => void;
  onNoteChange: (note: string) => void;
  onCustomSubmit: () => void;
  onSkip?: () => void;
}

function ClarificationCard({
  clarification,
  isExpanded,
  isResolving,
  customValue,
  note,
  onToggle,
  onSelectValue,
  onCustomValueChange,
  onNoteChange,
  onCustomSubmit,
  onSkip,
}: ClarificationCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white shadow-sm transition-all dark:bg-gray-800',
        isExpanded
          ? 'border-blue-300 ring-2 ring-blue-100 dark:border-blue-600 dark:ring-blue-900/30'
          : 'border-gray-200 dark:border-gray-700'
      )}
    >
      {/* Header - Always visible */}
      <button
        type="button"
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3">
          <PriorityBadge priority={clarification.priority} />
          <div>
            <span className="font-medium text-gray-900 dark:text-white">
              {clarification.fieldLabel}
            </span>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              {clarification.context.documentName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ClarificationTypeBadge type={clarification.clarificationType} />
          <svg
            className={cn(
              'h-5 w-5 text-gray-400 transition-transform',
              isExpanded && 'rotate-180'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 dark:border-gray-700">
          {/* AI Explanation */}
          {clarification.context.aiExplanation && (
            <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
              <span className="font-medium">AI Analysis:</span>{' '}
              {clarification.context.aiExplanation}
            </div>
          )}

          {/* Current Extracted Value */}
          <div className="mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Extracted Value:
            </span>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatValue(clarification.extractedValue)}
              </span>
              <ConfidenceBadge
                confidence={clarification.extractedConfidence}
                size="sm"
              />
            </div>
          </div>

          {/* Benchmark Range */}
          {clarification.benchmarkRange && (
            <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Industry Benchmark
              </span>
              <div className="mt-1 flex items-center gap-4 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  Min: {formatValue(clarification.benchmarkRange.min)}
                </span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Median: {formatValue(clarification.benchmarkRange.median)}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  Max: {formatValue(clarification.benchmarkRange.max)}
                </span>
              </div>
            </div>
          )}

          {/* Related Values */}
          {clarification.context.relatedValues &&
            clarification.context.relatedValues.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Related Values
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                  {clarification.context.relatedValues.map((rv, idx) => (
                    <div
                      key={idx}
                      className="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700"
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {rv.label}:
                      </span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatValue(rv.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Suggested Values */}
          <div className="mb-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Suggested Values
            </span>
            <div className="mt-2 space-y-2">
              {clarification.suggestedValues.map((sv, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isResolving}
                  onClick={() => onSelectValue(sv.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-3 text-left transition-colors',
                    'border-gray-200 hover:border-blue-300 hover:bg-blue-50',
                    'dark:border-gray-600 dark:hover:border-blue-600 dark:hover:bg-blue-900/30',
                    isResolving && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatValue(sv.value)}
                    </span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                      from {sv.source}
                    </span>
                    {sv.reasoning && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {sv.reasoning}
                      </p>
                    )}
                  </div>
                  <ConfidenceBadge confidence={sv.confidence} size="sm" />
                </button>
              ))}
            </div>
          </div>

          {/* Custom Value Input */}
          <div className="mb-4">
            <label
              htmlFor={`custom-${clarification.id}`}
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Enter Custom Value
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id={`custom-${clarification.id}`}
                type="text"
                value={customValue}
                onChange={(e) => onCustomValueChange(e.target.value)}
                placeholder="Enter value..."
                className={cn(
                  'flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm',
                  'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                  'dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                )}
              />
              <button
                type="button"
                onClick={onCustomSubmit}
                disabled={!customValue || isResolving}
                className={cn(
                  'rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white',
                  'hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50'
                )}
              >
                Use
              </button>
            </div>
          </div>

          {/* Note Input */}
          <div className="mb-4">
            <label
              htmlFor={`note-${clarification.id}`}
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Note (optional)
            </label>
            <textarea
              id={`note-${clarification.id}`}
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Add a note about this resolution..."
              rows={2}
              className={cn(
                'mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm',
                'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
                'dark:border-gray-600 dark:bg-gray-700 dark:text-white'
              )}
            />
          </div>

          {/* Skip Button */}
          {onSkip && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onSkip}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function formatValue(value: number | string | null): string {
  if (value === null || value === undefined) return 'N/A';
  if (typeof value === 'number') {
    // Format as currency if large enough
    if (Math.abs(value) >= 1000) {
      return `$${value.toLocaleString()}`;
    }
    // Format as percentage if between 0 and 1
    if (value >= 0 && value <= 1) {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toLocaleString();
  }
  return String(value);
}

export default ClarificationPanel;
