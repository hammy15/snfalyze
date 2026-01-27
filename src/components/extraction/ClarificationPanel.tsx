'use client';

/**
 * ClarificationPanel Component
 *
 * Displays pending clarifications and allows users to resolve them.
 */

import { useState, useEffect } from 'react';
import type { Clarification } from '@/hooks/useExtractionPipeline';

// ============================================================================
// TYPES
// ============================================================================

interface ClarificationPanelProps {
  clarifications: Clarification[];
  onResolve: (clarificationId: string, resolvedValue: number | string, note?: string) => void;
  onBulkResolve?: (
    resolutions: { clarificationId: string; resolvedValue: number | string; note?: string }[]
  ) => void;
  onContinue?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ClarificationPanel({
  clarifications,
  onResolve,
  onBulkResolve,
  onContinue,
  isLoading = false,
  className = '',
}: ClarificationPanelProps) {
  const [selectedValues, setSelectedValues] = useState<Map<string, number | string>>(new Map());
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [customValues, setCustomValues] = useState<Map<string, string>>(new Map());

  // Sort by priority (highest first)
  const sortedClarifications = [...clarifications].sort((a, b) => b.priority - a.priority);
  const highPriorityCount = clarifications.filter((c) => c.priority >= 8).length;

  const handleSelectValue = (clarificationId: string, value: number | string) => {
    setSelectedValues((prev) => new Map(prev).set(clarificationId, value));
  };

  const handleCustomValueChange = (clarificationId: string, value: string) => {
    setCustomValues((prev) => new Map(prev).set(clarificationId, value));
    // Also set as selected
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setSelectedValues((prev) => new Map(prev).set(clarificationId, numValue));
    }
  };

  const handleNoteChange = (clarificationId: string, note: string) => {
    setNotes((prev) => new Map(prev).set(clarificationId, note));
  };

  const handleResolve = (clarificationId: string) => {
    const value = selectedValues.get(clarificationId);
    if (value === undefined) return;

    const note = notes.get(clarificationId);
    onResolve(clarificationId, value, note);

    // Clear local state
    setSelectedValues((prev) => {
      const next = new Map(prev);
      next.delete(clarificationId);
      return next;
    });
    setNotes((prev) => {
      const next = new Map(prev);
      next.delete(clarificationId);
      return next;
    });
    setCustomValues((prev) => {
      const next = new Map(prev);
      next.delete(clarificationId);
      return next;
    });
  };

  const handleResolveAll = () => {
    if (!onBulkResolve) return;

    const resolutions = Array.from(selectedValues.entries()).map(([id, value]) => ({
      clarificationId: id,
      resolvedValue: value,
      note: notes.get(id),
    }));

    if (resolutions.length > 0) {
      onBulkResolve(resolutions);
    }
  };

  const getPriorityBadge = (priority: number) => {
    if (priority >= 8) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          Critical
        </span>
      );
    }
    if (priority >= 6) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
          High
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
        Normal
      </span>
    );
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      low_confidence: 'Low Confidence',
      out_of_range: 'Out of Range',
      conflict: 'Conflict',
      missing_critical: 'Missing Data',
      revenue_mismatch: 'Revenue Mismatch',
      validation_error: 'Validation Error',
    };
    return labels[type] || type;
  };

  const formatValue = (value: number | string | null): string => {
    if (value === null) return 'N/A';
    if (typeof value === 'number') {
      return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    }
    return String(value);
  };

  if (clarifications.length === 0) {
    return (
      <div className={`p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 ${className}`}>
        <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">All clarifications resolved</span>
        </div>
        {onContinue && (
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="mt-3 w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Continue Extraction'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Clarifications Needed
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {clarifications.length} items need your input
            {highPriorityCount > 0 && (
              <span className="text-red-600 dark:text-red-400 ml-2">
                ({highPriorityCount} critical)
              </span>
            )}
          </p>
        </div>

        {onBulkResolve && selectedValues.size > 0 && (
          <button
            onClick={handleResolveAll}
            disabled={isLoading}
            className="py-2 px-4 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium text-sm disabled:opacity-50"
          >
            Resolve All Selected ({selectedValues.size})
          </button>
        )}
      </div>

      {/* Clarification Cards */}
      <div className="space-y-4">
        {sortedClarifications.map((clarification) => (
          <div
            key={clarification.id}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getPriorityBadge(clarification.priority)}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {getTypeLabel(clarification.clarificationType)}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {clarification.fieldLabel}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {clarification.context.documentName}
                  {clarification.context.periodDescription && (
                    <span> • {clarification.context.periodDescription}</span>
                  )}
                </p>
              </div>
            </div>

            {/* Current Value */}
            <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-300">Extracted Value:</span>
                <span className="font-mono font-medium text-gray-900 dark:text-white">
                  {formatValue(clarification.extractedValue)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600 dark:text-gray-300">Confidence:</span>
                <span className={`font-medium ${clarification.extractedConfidence >= 70 ? 'text-green-600' : clarification.extractedConfidence >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {clarification.extractedConfidence}%
                </span>
              </div>
              {clarification.benchmarkRange && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Benchmark Range:</span>
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                    {formatValue(clarification.benchmarkRange.min)} - {formatValue(clarification.benchmarkRange.max)}
                  </span>
                </div>
              )}
            </div>

            {/* AI Explanation */}
            {clarification.context.aiExplanation && (
              <p className="mb-3 text-sm text-gray-600 dark:text-gray-400 italic">
                {clarification.context.aiExplanation}
              </p>
            )}

            {/* Suggested Values */}
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select a value:
              </label>
              <div className="space-y-2">
                {clarification.suggestedValues.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSelectValue(clarification.id, suggestion.value)}
                    className={`w-full p-2 text-left rounded border transition-colors ${
                      selectedValues.get(clarification.id) === suggestion.value
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/30'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono font-medium text-gray-900 dark:text-white">
                          {formatValue(suggestion.value)}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                          from {suggestion.source}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {suggestion.confidence}% confidence
                      </span>
                    </div>
                    {suggestion.reasoning && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {suggestion.reasoning}
                      </p>
                    )}
                  </button>
                ))}

                {/* Custom Value Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter custom value..."
                    value={customValues.get(clarification.id) || ''}
                    onChange={(e) => handleCustomValueChange(clarification.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Note Input */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Add a note (optional)..."
                value={notes.get(clarification.id) || ''}
                onChange={(e) => handleNoteChange(clarification.id, e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 text-sm"
              />
            </div>

            {/* Resolve Button */}
            <button
              onClick={() => handleResolve(clarification.id)}
              disabled={!selectedValues.has(clarification.id) || isLoading}
              className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg font-medium text-sm disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Processing...' : 'Resolve'}
            </button>
          </div>
        ))}
      </div>

      {/* Continue Button */}
      {onContinue && highPriorityCount === 0 && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            All critical clarifications resolved. You can continue with remaining items pending or resolve them first.
          </p>
          <button
            onClick={onContinue}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Continue Extraction'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ClarificationPanel;
