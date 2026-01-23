'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Edit2,
  RotateCcw,
  AlertTriangle,
  HelpCircle,
  Info,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBadge, ClarificationTypeBadge } from './confidence-badge';

// ============================================================================
// Types
// ============================================================================

export interface FieldValue {
  value: unknown;
  confidence?: number;
  source?: string;
  extractedAt?: Date;
}

export interface FieldHistory {
  value: unknown;
  changedAt: Date;
  changedBy?: string;
  reason?: string;
}

export interface FieldBenchmark {
  min: number;
  max: number;
  median: number;
  unit?: 'currency' | 'percent' | 'ratio' | 'count' | 'hours';
  description?: string;
}

export interface FieldEditorProps {
  fieldName: string;
  fieldLabel?: string;
  value: FieldValue;
  benchmark?: FieldBenchmark;
  suggestedValues?: unknown[];
  clarificationReason?: string;
  clarificationType?: 'low_confidence' | 'out_of_range' | 'conflict' | 'missing' | 'validation_error';
  history?: FieldHistory[];
  editable?: boolean;
  showBenchmark?: boolean;
  showHistory?: boolean;
  showConfidence?: boolean;
  onSave?: (newValue: unknown, reason?: string) => void;
  onRevert?: () => void;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatValue(value: unknown, benchmark?: FieldBenchmark): string {
  if (value === null || value === undefined || value === '') return '—';

  if (typeof value === 'number') {
    if (benchmark?.unit === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    if (benchmark?.unit === 'percent') {
      return `${(value * 100).toFixed(1)}%`;
    }
    if (benchmark?.unit === 'hours') {
      return `${value.toFixed(2)} hrs`;
    }
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  return String(value);
}

function parseInputValue(input: string, benchmark?: FieldBenchmark): unknown {
  // Try parsing as number
  const cleaned = input.replace(/[$,%\s]/g, '');
  const numValue = parseFloat(cleaned);

  if (!isNaN(numValue)) {
    // Convert percentage back to decimal if needed
    if (benchmark?.unit === 'percent' && input.includes('%')) {
      return numValue / 100;
    }
    return numValue;
  }

  return input;
}

function validateAgainstBenchmark(
  value: unknown,
  benchmark: FieldBenchmark
): { isValid: boolean; position: 'below' | 'within' | 'above'; variance: number } {
  if (typeof value !== 'number') {
    const numValue = parseFloat(String(value));
    if (isNaN(numValue)) return { isValid: true, position: 'within', variance: 0 };
    value = numValue;
  }

  const numValue = value as number;

  if (numValue < benchmark.min) {
    return {
      isValid: false,
      position: 'below',
      variance: (benchmark.min - numValue) / benchmark.min,
    };
  }

  if (numValue > benchmark.max) {
    return {
      isValid: false,
      position: 'above',
      variance: (numValue - benchmark.max) / benchmark.max,
    };
  }

  return { isValid: true, position: 'within', variance: 0 };
}

// ============================================================================
// Main Component
// ============================================================================

export function FieldEditor({
  fieldName,
  fieldLabel,
  value,
  benchmark,
  suggestedValues,
  clarificationReason,
  clarificationType,
  history = [],
  editable = true,
  showBenchmark = true,
  showHistory = false,
  showConfidence = true,
  onSave,
  onRevert,
  className,
}: FieldEditorProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const [editReason, setEditReason] = React.useState('');
  const [showHistoryPanel, setShowHistoryPanel] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Check benchmark validation
  const benchmarkValidation = benchmark
    ? validateAgainstBenchmark(value.value, benchmark)
    : null;

  const hasClarification = !!clarificationType;
  const needsAttention = hasClarification || (benchmarkValidation && !benchmarkValidation.isValid);

  // Start editing
  const handleEdit = () => {
    setEditValue(formatValue(value.value, benchmark));
    setEditReason('');
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // Save edit
  const handleSave = () => {
    const parsedValue = parseInputValue(editValue, benchmark);
    onSave?.(parsedValue, editReason || undefined);
    setIsEditing(false);
    setEditValue('');
    setEditReason('');
  };

  // Cancel edit
  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
    setEditReason('');
  };

  // Apply suggested value
  const handleApplySuggestion = (suggestedValue: unknown) => {
    onSave?.(suggestedValue, 'Applied suggested value');
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        needsAttention && 'border-amber-500/50 bg-amber-500/5',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {fieldLabel || fieldName}
            </span>
            {clarificationType && (
              <ClarificationTypeBadge type={clarificationType} size="sm" />
            )}
          </div>
          {clarificationReason && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              {clarificationReason}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showConfidence && value.confidence !== undefined && (
            <ConfidenceBadge confidence={value.confidence} size="sm" />
          )}
          {showHistory && history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowHistoryPanel(!showHistoryPanel)}
            >
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Value display / edit */}
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm font-mono"
              placeholder="Enter value..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Check className="h-4 w-4" />
            </Button>
          </div>
          <input
            type="text"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            className="w-full px-3 py-1.5 border rounded-md text-xs"
            placeholder="Reason for change (optional)..."
          />
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'text-xl font-bold tabular-nums',
                benchmarkValidation &&
                  !benchmarkValidation.isValid &&
                  'text-amber-600 dark:text-amber-400'
              )}
            >
              {formatValue(value.value, benchmark)}
            </span>

            {benchmarkValidation && !benchmarkValidation.isValid && (
              <Badge
                variant={benchmarkValidation.position === 'above' ? 'warning' : 'info'}
                className="text-xs"
              >
                {benchmarkValidation.position === 'above' ? 'Above' : 'Below'} range
              </Badge>
            )}
          </div>

          {editable && (
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Benchmark range */}
      {showBenchmark && benchmark && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Info className="h-3 w-3" />
            <span>Benchmark Range</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">Min:</span>{' '}
              <span className="font-medium">{formatValue(benchmark.min, benchmark)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Median:</span>{' '}
              <span className="font-medium">{formatValue(benchmark.median, benchmark)}</span>
            </span>
            <span>
              <span className="text-muted-foreground">Max:</span>{' '}
              <span className="font-medium">{formatValue(benchmark.max, benchmark)}</span>
            </span>
          </div>
          {benchmark.description && (
            <p className="text-xs text-muted-foreground mt-1">{benchmark.description}</p>
          )}
        </div>
      )}

      {/* Suggested values */}
      {suggestedValues && suggestedValues.length > 0 && !isEditing && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <HelpCircle className="h-3 w-3" />
            <span>Suggested Values</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedValues.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleApplySuggestion(suggestion)}
                className="px-2 py-1 text-sm bg-slate-100 dark:bg-slate-800 rounded hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {formatValue(suggestion, benchmark)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* History panel */}
      {showHistoryPanel && history.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>Change History</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={onRevert}
              disabled={history.length === 0}
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Revert
            </Button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-2 bg-slate-50 dark:bg-slate-800/50 rounded"
              >
                <div>
                  <span className="font-medium">{formatValue(entry.value, benchmark)}</span>
                  {entry.reason && (
                    <span className="text-muted-foreground ml-2">({entry.reason})</span>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {entry.changedBy && <span>{entry.changedBy} • </span>}
                  {new Date(entry.changedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Source info */}
      {value.source && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            Source: {value.source}
            {value.extractedAt && (
              <> • Extracted {new Date(value.extractedAt).toLocaleDateString()}</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Inline Field Editor
// ============================================================================

export interface InlineFieldEditorProps {
  value: unknown;
  benchmark?: FieldBenchmark;
  confidence?: number;
  editable?: boolean;
  onSave?: (newValue: unknown) => void;
  className?: string;
}

export function InlineFieldEditor({
  value,
  benchmark,
  confidence,
  editable = true,
  onSave,
  className,
}: InlineFieldEditorProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    setEditValue(formatValue(value, benchmark));
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleSave = () => {
    const parsedValue = parseInputValue(editValue, benchmark);
    onSave?.(parsedValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue('');
  };

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="w-24 px-2 py-1 border rounded text-sm font-mono"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
        />
        <button
          onClick={handleSave}
          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
        >
          <Check className="h-3 w-3" />
        </button>
        <button
          onClick={handleCancel}
          className="p-1 text-slate-400 hover:bg-slate-50 rounded"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="font-medium tabular-nums">{formatValue(value, benchmark)}</span>
      {confidence !== undefined && confidence < 70 && (
        <AlertTriangle className="h-3 w-3 text-amber-500" />
      )}
      {editable && (
        <button
          onClick={handleEdit}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export default FieldEditor;
