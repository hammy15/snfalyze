'use client';

/**
 * ExtractionPipelineProgress Component
 *
 * Displays real-time progress of the AI extraction pipeline.
 */

import { useMemo } from 'react';
import type { PipelineState } from '@/hooks/useExtractionPipeline';

// ============================================================================
// TYPES
// ============================================================================

interface ExtractionPipelineProgressProps {
  state: PipelineState;
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ExtractionPipelineProgress({
  state,
  className = '',
}: ExtractionPipelineProgressProps) {
  const {
    status,
    progress,
    currentDocument,
    currentPass,
    passProgress,
    passMessage,
    facilities,
    conflicts,
    clarifications,
    completedDocuments,
    finalStats,
    error,
    isLoading,
  } = state;

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'idle':
        return 'Ready to start';
      case 'initializing':
        return 'Initializing...';
      case 'processing':
        return 'Processing documents...';
      case 'awaiting_clarifications':
        return 'Awaiting clarifications';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return status;
    }
  }, [status]);

  const passLabel = useMemo(() => {
    switch (currentPass) {
      case 'structure':
        return 'Analyzing structure';
      case 'extraction':
        return 'Extracting data';
      case 'validation':
        return 'Validating data';
      case 'population':
        return 'Writing to database';
      default:
        return currentPass || '';
    }
  }, [currentPass]);

  const statusColor = useMemo(() => {
    switch (status) {
      case 'idle':
        return 'text-gray-500';
      case 'initializing':
      case 'processing':
        return 'text-cyan-600 dark:text-cyan-400';
      case 'awaiting_clarifications':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-500';
    }
  }, [status]);

  if (status === 'idle') {
    return (
      <div className={`p-6 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <svg className="mx-auto w-12 h-12 mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>Ready to start AI extraction pipeline</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {(status === 'processing' || status === 'initializing') && (
              <div className="w-5 h-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
            )}
            {status === 'completed' && (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {status === 'failed' && (
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            {status === 'awaiting_clarifications' && (
              <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          {progress && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {progress.processedDocuments} / {progress.totalDocuments} documents
            </span>
          )}
        </div>
      </div>

      {/* Progress Content */}
      <div className="p-4">
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Current Document */}
        {currentDocument && status === 'processing' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Processing: {currentDocument.filename}
              </span>
              <span className="text-xs text-gray-500">
                Document {currentDocument.index + 1} of {currentDocument.total}
              </span>
            </div>

            {/* Current Pass */}
            {currentPass && (
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{passLabel}</span>
                  <span className="text-xs text-gray-500">{passProgress}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full transition-all duration-300"
                    style={{ width: `${passProgress}%` }}
                  />
                </div>
                {passMessage && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{passMessage}</p>
                )}
              </div>
            )}

            {/* Overall Progress */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500 dark:text-gray-400">Overall Progress</span>
                <span className="text-xs text-gray-500">{progress?.overallProgress || 0}%</span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-600 rounded-full transition-all duration-300"
                  style={{ width: `${progress?.overallProgress || 0}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <div className="p-3 rounded bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Facilities</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {facilities.length}
            </p>
          </div>
          <div className="p-3 rounded bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Periods Extracted</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {progress?.extractedPeriods || 0}
            </p>
          </div>
          <div className="p-3 rounded bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Conflicts</p>
            <p className={`text-lg font-semibold ${conflicts.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-white'}`}>
              {conflicts.length}
            </p>
          </div>
          <div className="p-3 rounded bg-gray-50 dark:bg-gray-700/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Clarifications</p>
            <p className={`text-lg font-semibold ${clarifications.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
              {clarifications.length}
            </p>
          </div>
        </div>

        {/* Completed Documents List */}
        {completedDocuments.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Completed Documents
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {completedDocuments.map((doc) => (
                <div
                  key={doc.documentId}
                  className="flex items-center justify-between p-2 rounded bg-green-50 dark:bg-green-900/20 text-sm"
                >
                  <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                    {doc.filename}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{doc.financialPeriodsExtracted} financial</span>
                    <span>{doc.censusPeriodsExtracted} census</span>
                    <span className={doc.confidence >= 70 ? 'text-green-600' : doc.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'}>
                      {doc.confidence}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Stats */}
        {finalStats && (
          <div className="mt-4 p-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-800 dark:text-green-400 mb-3">
              Extraction Complete
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-gray-600 dark:text-gray-400">Facilities:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {finalStats.facilitiesExtracted}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Periods:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {finalStats.periodsExtracted}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {finalStats.overallConfidence}%
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Conflicts:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {finalStats.conflictsDetected} ({finalStats.conflictsResolved} resolved)
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">Processing Time:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {(finalStats.processingTimeMs / 1000).toFixed(1)}s
                </span>
              </div>
              {finalStats.clarificationsPending > 0 && (
                <div>
                  <span className="text-yellow-600 dark:text-yellow-400">Pending Clarifications:</span>
                  <span className="ml-2 font-medium text-yellow-700 dark:text-yellow-300">
                    {finalStats.clarificationsPending}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExtractionPipelineProgress;
