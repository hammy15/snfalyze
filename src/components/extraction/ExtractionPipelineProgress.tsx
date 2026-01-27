/**
 * Extraction Pipeline Progress Component
 *
 * Real-time progress display for the AI extraction pipeline.
 */

'use client';

import { cn } from '@/lib/utils';
import type { PipelineStatus, PassType } from '@/lib/extraction/pipeline/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PipelineProgress {
  totalDocuments: number;
  processedDocuments: number;
  phase: string;
  overallProgress: number;
  extractedFacilities: number;
  extractedPeriods: number;
  detectedConflicts: number;
  pendingClarifications: number;
}

export interface CurrentDocument {
  id: string;
  filename: string;
  index: number;
  total: number;
}

export interface FacilityInfo {
  facilityId: string;
  facilityName: string;
  isNew: boolean;
}

export interface ExtractionPipelineProgressProps {
  status: PipelineStatus | 'idle';
  progress: PipelineProgress | null;
  currentDocument: CurrentDocument | null;
  currentPass: PassType | null;
  passProgress: number;
  passMessage: string;
  facilities: FacilityInfo[];
  error: string | null;
  onContinue?: () => void;
  onCancel?: () => void;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExtractionPipelineProgress({
  status,
  progress,
  currentDocument,
  currentPass,
  passProgress,
  passMessage,
  facilities,
  error,
  onContinue,
  onCancel,
  className,
}: ExtractionPipelineProgressProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'rounded-lg border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <StatusIcon status={status} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              AI Extraction Pipeline
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getStatusLabel(status)}
            </p>
          </div>
        </div>
        {status === 'processing' && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Content */}
      <div className="p-4">
        {error ? (
          <ErrorDisplay error={error} />
        ) : (
          <>
            {/* Overall Progress */}
            {progress && (
              <div className="mb-4">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Overall Progress
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {progress.processedDocuments} / {progress.totalDocuments}{' '}
                    documents
                  </span>
                </div>
                <ProgressBar progress={progress.overallProgress} />
              </div>
            )}

            {/* Current Document */}
            {currentDocument && status === 'processing' && (
              <div className="mb-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Processing: {currentDocument.filename}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Document {currentDocument.index + 1} of{' '}
                    {currentDocument.total}
                  </span>
                </div>
                {currentPass && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <PassIcon pass={currentPass} isActive />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {getPassLabel(currentPass)}
                      </span>
                    </div>
                    <ProgressBar progress={passProgress} size="sm" />
                    {passMessage && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {passMessage}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pass Pipeline Visual */}
            {status === 'processing' && (
              <PassPipeline currentPass={currentPass} />
            )}

            {/* Statistics */}
            {progress && (
              <div className="mt-4 grid grid-cols-4 gap-3">
                <StatCard
                  label="Facilities"
                  value={progress.extractedFacilities}
                  icon="building"
                />
                <StatCard
                  label="Periods"
                  value={progress.extractedPeriods}
                  icon="calendar"
                />
                <StatCard
                  label="Conflicts"
                  value={progress.detectedConflicts}
                  icon="warning"
                  variant={progress.detectedConflicts > 0 ? 'warning' : 'default'}
                />
                <StatCard
                  label="Clarifications"
                  value={progress.pendingClarifications}
                  icon="question"
                  variant={
                    progress.pendingClarifications > 0 ? 'info' : 'default'
                  }
                />
              </div>
            )}

            {/* Detected Facilities */}
            {facilities.length > 0 && (
              <div className="mt-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Detected Facilities
                </span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {facilities.map((f) => (
                    <span
                      key={f.facilityId}
                      className={cn(
                        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                        f.isNew
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      )}
                    >
                      {f.facilityName}
                      {f.isNew && (
                        <span className="ml-1 text-green-600">new</span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Clarifications State */}
            {status === 'awaiting_clarifications' && onContinue && (
              <div className="mt-4 rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
                <div className="flex items-start gap-3">
                  <svg
                    className="h-5 w-5 text-yellow-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-300">
                      Clarifications Needed
                    </h4>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
                      Some extracted values need your review before continuing.
                    </p>
                    <button
                      type="button"
                      onClick={onContinue}
                      className="mt-3 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
                    >
                      Continue Without Resolving
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Completed State */}
            {status === 'completed' && (
              <div className="mt-4 rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/20">
                <svg
                  className="mx-auto h-10 w-10 text-green-500"
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
                <h4 className="mt-2 font-medium text-green-800 dark:text-green-300">
                  Extraction Complete
                </h4>
                <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                  All documents have been processed and data has been saved.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StatusIcon({ status }: { status: PipelineStatus | 'idle' }) {
  switch (status) {
    case 'processing':
    case 'initializing':
      return (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      );
    case 'completed':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <svg
            className="h-5 w-5 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      );
    case 'failed':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <svg
            className="h-5 w-5 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>
      );
    case 'awaiting_clarifications':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <svg
            className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      );
    default:
      return null;
  }
}

function getStatusLabel(status: PipelineStatus | 'idle'): string {
  switch (status) {
    case 'idle':
      return 'Ready to start';
    case 'initializing':
      return 'Initializing...';
    case 'processing':
      return 'Extracting data...';
    case 'awaiting_clarifications':
      return 'Waiting for clarifications';
    case 'completed':
      return 'Completed successfully';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown status';
  }
}

function ProgressBar({
  progress,
  size = 'md',
}: {
  progress: number;
  size?: 'sm' | 'md';
}) {
  return (
    <div
      className={cn(
        'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
        size === 'sm' ? 'h-1.5' : 'h-2.5'
      )}
    >
      <div
        className="h-full rounded-full bg-blue-600 transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
      />
    </div>
  );
}

function PassIcon({ pass, isActive }: { pass: PassType; isActive: boolean }) {
  const iconClass = cn(
    'h-4 w-4',
    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
  );

  switch (pass) {
    case 'structure':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      );
    case 'extraction':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
      );
    case 'validation':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'population':
      return (
        <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
        </svg>
      );
    default:
      return null;
  }
}

function getPassLabel(pass: PassType): string {
  switch (pass) {
    case 'structure':
      return 'Analyzing Structure';
    case 'extraction':
      return 'Extracting Data';
    case 'validation':
      return 'Validating Data';
    case 'population':
      return 'Saving to Database';
    default:
      return pass;
  }
}

function PassPipeline({ currentPass }: { currentPass: PassType | null }) {
  const passes: PassType[] = ['structure', 'extraction', 'validation', 'population'];
  const currentIndex = currentPass ? passes.indexOf(currentPass) : -1;

  return (
    <div className="flex items-center justify-between px-2">
      {passes.map((pass, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div key={pass} className="flex items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium',
                isActive
                  ? 'bg-blue-600 text-white'
                  : isCompleted
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
              )}
            >
              {isCompleted ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            {index < passes.length - 1 && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-8',
                  index < currentIndex
                    ? 'bg-green-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: number;
  icon: 'building' | 'calendar' | 'warning' | 'question';
  variant?: 'default' | 'warning' | 'info';
}) {
  const bgClass =
    variant === 'warning'
      ? 'bg-yellow-50 dark:bg-yellow-900/20'
      : variant === 'info'
      ? 'bg-blue-50 dark:bg-blue-900/20'
      : 'bg-gray-50 dark:bg-gray-700/50';

  const textClass =
    variant === 'warning'
      ? 'text-yellow-600 dark:text-yellow-400'
      : variant === 'info'
      ? 'text-blue-600 dark:text-blue-400'
      : 'text-gray-600 dark:text-gray-400';

  return (
    <div className={cn('rounded-lg p-3 text-center', bgClass)}>
      <div className={cn('text-2xl font-bold', textClass)}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
      <div className="flex items-start gap-3">
        <svg
          className="h-5 w-5 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        <div>
          <h4 className="font-medium text-red-800 dark:text-red-300">
            Extraction Failed
          </h4>
          <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    </div>
  );
}

export default ExtractionPipelineProgress;
