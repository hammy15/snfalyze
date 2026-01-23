'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  FileText,
  ArrowRight,
  Check,
  X,
  Calculator,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfidenceBadge } from './confidence-badge';

// ============================================================================
// Types
// ============================================================================

export interface DocumentConflict {
  id: string;
  dealId: string;
  document1Id: string;
  document1Name: string;
  document2Id: string;
  document2Name: string;
  fieldName: string;
  fieldPath?: string;
  value1: string | number;
  value2: string | number;
  confidence1?: number;
  confidence2?: number;
  variancePercent: number;
  resolution: 'pending' | 'value1' | 'value2' | 'average' | 'custom' | 'dismissed';
  resolvedValue?: unknown;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface ConflictResolutionModalProps {
  conflicts: DocumentConflict[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (conflictId: string, resolution: DocumentConflict['resolution'], value?: unknown) => Promise<void>;
  onBulkResolve?: (resolutions: Array<{ conflictId: string; resolution: DocumentConflict['resolution']; value?: unknown }>) => Promise<void>;
}

// ============================================================================
// Main Component
// ============================================================================

export function ConflictResolutionModal({
  conflicts,
  open,
  onOpenChange,
  onResolve,
  onBulkResolve,
}: ConflictResolutionModalProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [customValue, setCustomValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [resolutions, setResolutions] = React.useState<
    Map<string, { resolution: DocumentConflict['resolution']; value?: unknown }>
  >(new Map());

  const pendingConflicts = conflicts.filter((c) => c.resolution === 'pending');
  const currentConflict = pendingConflicts[currentIndex];

  const handleResolve = async (
    resolution: DocumentConflict['resolution'],
    value?: unknown
  ) => {
    if (!currentConflict) return;

    setIsSubmitting(true);
    try {
      await onResolve(currentConflict.id, resolution, value);

      // Move to next conflict
      if (currentIndex < pendingConflicts.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
      setCustomValue('');
    }
  };

  const handleSaveForLater = () => {
    if (!currentConflict || !customValue) return;

    const numValue = parseFloat(customValue);
    const resolvedValue = isNaN(numValue) ? customValue : numValue;

    setResolutions((prev) => {
      const next = new Map(prev);
      next.set(currentConflict.id, { resolution: 'custom', value: resolvedValue });
      return next;
    });

    setCustomValue('');

    if (currentIndex < pendingConflicts.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleBulkResolve = async () => {
    if (!onBulkResolve || resolutions.size === 0) return;

    setIsSubmitting(true);
    try {
      const bulkData = Array.from(resolutions.entries()).map(([conflictId, data]) => ({
        conflictId,
        resolution: data.resolution,
        value: data.value,
      }));
      await onBulkResolve(bulkData);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatValue = (value: string | number): string => {
    if (typeof value === 'number') {
      return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      return numValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
    }
    return value;
  };

  const calculateAverage = (v1: string | number, v2: string | number): number => {
    const num1 = typeof v1 === 'number' ? v1 : parseFloat(v1);
    const num2 = typeof v2 === 'number' ? v2 : parseFloat(v2);
    return (num1 + num2) / 2;
  };

  if (!currentConflict) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <DialogTitle>Resolve Document Conflicts</DialogTitle>
            </div>
            <Badge variant="secondary">
              {currentIndex + 1} of {pendingConflicts.length}
            </Badge>
          </div>
          <DialogDescription>
            Different documents report different values for the same field. Please choose
            which value to use or enter a custom value.
          </DialogDescription>
        </DialogHeader>

        {/* Conflict details */}
        <div className="space-y-6 py-4">
          {/* Field name */}
          <div className="text-center">
            <span className="text-sm text-muted-foreground">Field</span>
            <h3 className="text-xl font-semibold">{currentConflict.fieldName}</h3>
            <Badge variant="warning" className="mt-2">
              {currentConflict.variancePercent.toFixed(1)}% variance
            </Badge>
          </div>

          {/* Document comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Document 1 */}
            <button
              onClick={() => handleResolve('value1', currentConflict.value1)}
              disabled={isSubmitting}
              className={cn(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:border-primary hover:bg-primary/5',
                resolutions.get(currentConflict.id)?.resolution === 'value1' &&
                  'border-primary bg-primary/5'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {currentConflict.document1Name}
                </span>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {formatValue(currentConflict.value1)}
              </div>
              {currentConflict.confidence1 !== undefined && (
                <ConfidenceBadge
                  confidence={currentConflict.confidence1}
                  size="sm"
                  className="mt-2"
                />
              )}
            </button>

            {/* Document 2 */}
            <button
              onClick={() => handleResolve('value2', currentConflict.value2)}
              disabled={isSubmitting}
              className={cn(
                'flex flex-col items-center p-4 rounded-lg border-2 transition-all hover:border-primary hover:bg-primary/5',
                resolutions.get(currentConflict.id)?.resolution === 'value2' &&
                  'border-primary bg-primary/5'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate max-w-[150px]">
                  {currentConflict.document2Name}
                </span>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {formatValue(currentConflict.value2)}
              </div>
              {currentConflict.confidence2 !== undefined && (
                <ConfidenceBadge
                  confidence={currentConflict.confidence2}
                  size="sm"
                  className="mt-2"
                />
              )}
            </button>
          </div>

          {/* Average option */}
          <button
            onClick={() =>
              handleResolve(
                'average',
                calculateAverage(currentConflict.value1, currentConflict.value2)
              )
            }
            disabled={isSubmitting}
            className={cn(
              'w-full flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all hover:border-primary hover:bg-primary/5',
              resolutions.get(currentConflict.id)?.resolution === 'average' &&
                'border-primary bg-primary/5'
            )}
          >
            <Calculator className="h-4 w-4" />
            <span>Use Average:</span>
            <span className="font-bold tabular-nums">
              {formatValue(
                calculateAverage(currentConflict.value1, currentConflict.value2)
              )}
            </span>
          </button>

          {/* Custom value */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              Or enter a custom value:
            </label>
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder="Enter custom value..."
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <Button
                variant="outline"
                onClick={() => {
                  const numValue = parseFloat(customValue);
                  handleResolve('custom', isNaN(numValue) ? customValue : numValue);
                }}
                disabled={!customValue || isSubmitting}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 mr-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() =>
                setCurrentIndex((prev) => Math.min(pendingConflicts.length - 1, prev + 1))
              }
              disabled={currentIndex === pendingConflicts.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => handleResolve('dismissed')}
            disabled={isSubmitting}
          >
            Skip / Dismiss
          </Button>

          {resolutions.size > 0 && onBulkResolve && (
            <Button onClick={handleBulkResolve} disabled={isSubmitting}>
              Apply All ({resolutions.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Conflict List Component
// ============================================================================

export interface ConflictListProps {
  conflicts: DocumentConflict[];
  onResolveClick?: (conflict: DocumentConflict) => void;
  className?: string;
}

export function ConflictList({ conflicts, onResolveClick, className }: ConflictListProps) {
  const pendingConflicts = conflicts.filter((c) => c.resolution === 'pending');
  const resolvedConflicts = conflicts.filter((c) => c.resolution !== 'pending');

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        return numValue.toLocaleString();
      }
      return value;
    }
    return JSON.stringify(value);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {pendingConflicts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Pending Conflicts ({pendingConflicts.length})
          </h4>
          <div className="space-y-2">
            {pendingConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-amber-500/5 border-amber-500/20 cursor-pointer hover:bg-amber-500/10"
                onClick={() => onResolveClick?.(conflict)}
              >
                <div>
                  <span className="font-medium">{conflict.fieldName}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{formatValue(conflict.value1)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{formatValue(conflict.value2)}</span>
                    <Badge variant="warning" className="ml-2">
                      {conflict.variancePercent.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}

      {resolvedConflicts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            Resolved Conflicts ({resolvedConflicts.length})
          </h4>
          <div className="space-y-2">
            {resolvedConflicts.map((conflict) => (
              <div
                key={conflict.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50"
              >
                <div>
                  <span className="font-medium">{conflict.fieldName}</span>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="line-through">{formatValue(conflict.value1)}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-emerald-600 font-medium">
                      {formatValue(conflict.resolvedValue ?? conflict.value2)}
                    </span>
                  </div>
                </div>
                <Check className="h-4 w-4 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ConflictResolutionModal;
