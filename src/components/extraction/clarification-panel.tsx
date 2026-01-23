'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  ExternalLink,
  Filter,
  SortAsc,
  SortDesc,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ConfidenceBadge,
  ClarificationTypeBadge,
  PriorityBadge,
  type ClarificationType,
} from './confidence-badge';

// ============================================================================
// Types
// ============================================================================

export interface Clarification {
  id: string;
  documentId: string;
  dealId?: string;
  fieldName: string;
  fieldPath?: string;
  extractedValue: unknown;
  suggestedValues?: unknown[];
  benchmarkValue?: string;
  benchmarkRange?: { min: number; max: number; median: number };
  clarificationType: ClarificationType;
  status: 'pending' | 'resolved' | 'dismissed' | 'auto_resolved';
  confidenceScore?: number;
  reason: string;
  priority: number;
  resolvedValue?: unknown;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface ClarificationPanelProps {
  clarifications: Clarification[];
  documentId?: string;
  dealId?: string;
  onResolve?: (clarification: Clarification, value: unknown) => void;
  onDismiss?: (clarification: Clarification) => void;
  onBulkResolve?: (clarifications: Clarification[], values: Map<string, unknown>) => void;
  className?: string;
  showFilters?: boolean;
  showBulkActions?: boolean;
}

type SortField = 'priority' | 'fieldName' | 'type' | 'confidence';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Main Component
// ============================================================================

export function ClarificationPanel({
  clarifications,
  documentId,
  dealId,
  onResolve,
  onDismiss,
  onBulkResolve,
  className,
  showFilters = true,
  showBulkActions = true,
}: ClarificationPanelProps) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [sortField, setSortField] = React.useState<SortField>('priority');
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
  const [filterType, setFilterType] = React.useState<ClarificationType | 'all'>('all');
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  // Filter pending clarifications
  const pendingClarifications = clarifications.filter((c) => c.status === 'pending');

  // Apply filters
  const filteredClarifications = pendingClarifications.filter((c) => {
    if (filterType !== 'all' && c.clarificationType !== filterType) return false;
    if (documentId && c.documentId !== documentId) return false;
    if (dealId && c.dealId !== dealId) return false;
    return true;
  });

  // Sort clarifications
  const sortedClarifications = [...filteredClarifications].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'priority':
        comparison = a.priority - b.priority;
        break;
      case 'fieldName':
        comparison = a.fieldName.localeCompare(b.fieldName);
        break;
      case 'type':
        comparison = a.clarificationType.localeCompare(b.clarificationType);
        break;
      case 'confidence':
        comparison = (a.confidenceScore || 0) - (b.confidenceScore || 0);
        break;
    }
    return sortDirection === 'desc' ? -comparison : comparison;
  });

  // Group by type for summary
  const groupedByType = pendingClarifications.reduce(
    (acc, c) => {
      acc[c.clarificationType] = (acc[c.clarificationType] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const criticalCount = pendingClarifications.filter((c) => c.priority >= 8).length;

  // Selection handlers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(sortedClarifications.map((c) => c.id)));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Sort handler
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">Clarifications Needed</CardTitle>
            <Badge variant={criticalCount > 0 ? 'danger' : 'secondary'}>
              {pendingClarifications.length}
            </Badge>
          </div>
          {criticalCount > 0 && (
            <Badge variant="danger" className="animate-pulse">
              {criticalCount} Critical
            </Badge>
          )}
        </div>

        {/* Summary badges */}
        {showFilters && pendingClarifications.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => setFilterType('all')}
              className={cn(
                'text-xs px-2 py-1 rounded-full border transition-colors',
                filterType === 'all'
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'border-slate-200 hover:border-slate-300'
              )}
            >
              All ({pendingClarifications.length})
            </button>
            {Object.entries(groupedByType).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setFilterType(type as ClarificationType)}
                className={cn(
                  'text-xs px-2 py-1 rounded-full border transition-colors',
                  filterType === type
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                {type.replace('_', ' ')} ({count})
              </button>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        {sortedClarifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-500/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {pendingClarifications.length === 0
                ? 'No clarifications needed'
                : 'No clarifications match the current filter'}
            </p>
          </div>
        ) : (
          <>
            {/* Bulk actions bar */}
            {showBulkActions && selectedIds.size > 0 && (
              <div className="flex items-center justify-between p-2 mb-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    Clear
                  </Button>
                  {onBulkResolve && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const selected = sortedClarifications.filter((c) =>
                          selectedIds.has(c.id)
                        );
                        // Auto-resolve with extracted values
                        const values = new Map(
                          selected.map((c) => [c.id, c.extractedValue])
                        );
                        onBulkResolve(selected, values);
                        clearSelection();
                      }}
                    >
                      Accept All Selected
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Sort controls */}
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <span>Sort by:</span>
              {(['priority', 'fieldName', 'type', 'confidence'] as SortField[]).map((field) => (
                <button
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800',
                    sortField === field && 'text-primary font-medium'
                  )}
                >
                  {field === 'fieldName' ? 'Field' : field.charAt(0).toUpperCase() + field.slice(1)}
                  {sortField === field &&
                    (sortDirection === 'desc' ? (
                      <SortDesc className="h-3 w-3" />
                    ) : (
                      <SortAsc className="h-3 w-3" />
                    ))}
                </button>
              ))}
              {showBulkActions && sortedClarifications.length > 1 && (
                <button
                  onClick={selectAll}
                  className="ml-auto text-primary hover:underline"
                >
                  Select all
                </button>
              )}
            </div>

            {/* Clarification list */}
            <div className="space-y-2">
              {sortedClarifications.map((clarification) => (
                <ClarificationItem
                  key={clarification.id}
                  clarification={clarification}
                  isSelected={selectedIds.has(clarification.id)}
                  isExpanded={expandedId === clarification.id}
                  onSelect={() => toggleSelection(clarification.id)}
                  onExpand={() =>
                    setExpandedId(expandedId === clarification.id ? null : clarification.id)
                  }
                  onResolve={onResolve}
                  onDismiss={onDismiss}
                  showSelect={showBulkActions}
                />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Clarification Item Component
// ============================================================================

interface ClarificationItemProps {
  clarification: Clarification;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onExpand: () => void;
  onResolve?: (clarification: Clarification, value: unknown) => void;
  onDismiss?: (clarification: Clarification) => void;
  showSelect?: boolean;
}

function ClarificationItem({
  clarification,
  isSelected,
  isExpanded,
  onSelect,
  onExpand,
  onResolve,
  onDismiss,
  showSelect = true,
}: ClarificationItemProps) {
  const [customValue, setCustomValue] = React.useState('');

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        isSelected && 'ring-2 ring-primary',
        clarification.priority >= 8 && 'border-rose-500/50'
      )}
    >
      {/* Header row */}
      <div
        className={cn(
          'flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50',
          clarification.priority >= 8 && 'bg-rose-500/5'
        )}
        onClick={onExpand}
      >
        {showSelect && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            onClick={(e) => e.stopPropagation()}
            className="h-4 w-4 rounded border-slate-300"
          />
        )}

        <ChevronRight
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-90'
          )}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{clarification.fieldName}</span>
            <ClarificationTypeBadge type={clarification.clarificationType} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground truncate">{clarification.reason}</p>
        </div>

        <div className="flex items-center gap-2">
          {clarification.confidenceScore !== undefined && (
            <ConfidenceBadge confidence={clarification.confidenceScore} size="sm" />
          )}
          <PriorityBadge priority={clarification.priority} size="sm" />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t bg-slate-50/50 dark:bg-slate-800/20 p-4 space-y-4">
          {/* Current value */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Extracted Value
              </label>
              <div className="mt-1 p-2 bg-white dark:bg-slate-900 rounded border font-mono text-sm">
                {formatValue(clarification.extractedValue)}
              </div>
            </div>

            {clarification.benchmarkRange && (
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Benchmark Range
                </label>
                <div className="mt-1 p-2 bg-white dark:bg-slate-900 rounded border text-sm">
                  {formatValue(clarification.benchmarkRange.min)} -{' '}
                  {formatValue(clarification.benchmarkRange.max)}
                  <span className="text-muted-foreground ml-2">
                    (median: {formatValue(clarification.benchmarkRange.median)})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Suggested values */}
          {clarification.suggestedValues && clarification.suggestedValues.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Suggested Values
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {clarification.suggestedValues.map((value, idx) => (
                  <button
                    key={idx}
                    onClick={() => onResolve?.(clarification, value)}
                    className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded border hover:border-primary hover:bg-primary/5 text-sm transition-colors"
                  >
                    {formatValue(value)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom value input */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Enter Custom Value
            </label>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter value..."
                className="flex-1 px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-900"
              />
              <Button
                size="sm"
                onClick={() => {
                  if (customValue) {
                    const numValue = parseFloat(customValue);
                    onResolve?.(clarification, isNaN(numValue) ? customValue : numValue);
                    setCustomValue('');
                  }
                }}
                disabled={!customValue}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDismiss?.(clarification)}
            >
              Dismiss
            </Button>
            <Button
              size="sm"
              onClick={() => onResolve?.(clarification, clarification.extractedValue)}
            >
              Accept Extracted Value
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClarificationPanel;
