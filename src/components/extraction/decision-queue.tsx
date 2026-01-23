'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  ChevronRight,
  Inbox,
  Filter,
  ListFilter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  ConfidenceBadge,
  ClarificationTypeBadge,
  PriorityBadge,
  type ClarificationType,
} from './confidence-badge';
import type { Clarification } from './clarification-panel';
import type { DocumentConflict } from './conflict-resolution-modal';

// ============================================================================
// Types
// ============================================================================

export interface DecisionQueueItem {
  id: string;
  type: 'clarification' | 'conflict';
  documentId: string;
  documentName?: string;
  dealId?: string;
  dealName?: string;
  fieldName: string;
  priority: number;
  createdAt: Date;
  clarification?: Clarification;
  conflict?: DocumentConflict;
}

export interface DecisionQueueProps {
  clarifications: Clarification[];
  conflicts: DocumentConflict[];
  documents: Array<{ id: string; name: string; dealId?: string }>;
  deals?: Array<{ id: string; name: string }>;
  onResolveClarification?: (clarification: Clarification, value: unknown) => void;
  onResolveConflict?: (conflict: DocumentConflict) => void;
  onViewDocument?: (documentId: string) => void;
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

export function DecisionQueue({
  clarifications,
  conflicts,
  documents,
  deals = [],
  onResolveClarification,
  onResolveConflict,
  onViewDocument,
  className,
}: DecisionQueueProps) {
  const [filterDeal, setFilterDeal] = React.useState<string | 'all'>('all');
  const [filterType, setFilterType] = React.useState<'all' | 'clarification' | 'conflict'>('all');
  const [showResolved, setShowResolved] = React.useState(false);

  // Build document lookup
  const documentLookup = React.useMemo(
    () => new Map(documents.map((d) => [d.id, d])),
    [documents]
  );

  // Build deal lookup
  const dealLookup = React.useMemo(
    () => new Map(deals.map((d) => [d.id, d])),
    [deals]
  );

  // Convert clarifications and conflicts to queue items
  const queueItems: DecisionQueueItem[] = React.useMemo(() => {
    const items: DecisionQueueItem[] = [];

    // Add clarifications
    for (const clarification of clarifications) {
      if (clarification.status !== 'pending' && !showResolved) continue;

      const doc = documentLookup.get(clarification.documentId);
      const deal = clarification.dealId ? dealLookup.get(clarification.dealId) : undefined;

      items.push({
        id: `clarification-${clarification.id}`,
        type: 'clarification',
        documentId: clarification.documentId,
        documentName: doc?.name,
        dealId: clarification.dealId,
        dealName: deal?.name,
        fieldName: clarification.fieldName,
        priority: clarification.priority,
        createdAt: clarification.createdAt,
        clarification,
      });
    }

    // Add conflicts
    for (const conflict of conflicts) {
      if (conflict.resolution !== 'pending' && !showResolved) continue;

      const doc1 = documentLookup.get(conflict.document1Id);
      const deal = dealLookup.get(conflict.dealId);

      items.push({
        id: `conflict-${conflict.id}`,
        type: 'conflict',
        documentId: conflict.document1Id,
        documentName: doc1?.name,
        dealId: conflict.dealId,
        dealName: deal?.name,
        fieldName: conflict.fieldName,
        priority: 8, // Conflicts are high priority
        createdAt: conflict.createdAt,
        conflict,
      });
    }

    return items;
  }, [clarifications, conflicts, documentLookup, dealLookup, showResolved]);

  // Apply filters
  const filteredItems = queueItems.filter((item) => {
    if (filterDeal !== 'all' && item.dealId !== filterDeal) return false;
    if (filterType !== 'all' && item.type !== filterType) return false;
    return true;
  });

  // Sort by priority (desc) and date (desc)
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.priority !== b.priority) return b.priority - a.priority;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // Group by deal
  const groupedByDeal = sortedItems.reduce(
    (acc, item) => {
      const key = item.dealId || 'no-deal';
      if (!acc[key]) {
        acc[key] = {
          dealId: item.dealId,
          dealName: item.dealName || 'No Deal',
          items: [],
        };
      }
      acc[key].items.push(item);
      return acc;
    },
    {} as Record<string, { dealId?: string; dealName: string; items: DecisionQueueItem[] }>
  );

  // Stats
  const totalPending = queueItems.filter(
    (i) =>
      (i.clarification && i.clarification.status === 'pending') ||
      (i.conflict && i.conflict.resolution === 'pending')
  ).length;
  const criticalCount = queueItems.filter((i) => i.priority >= 8).length;
  const clarificationCount = queueItems.filter((i) => i.type === 'clarification').length;
  const conflictCount = queueItems.filter((i) => i.type === 'conflict').length;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg font-semibold">Decision Queue</CardTitle>
            <Badge variant={criticalCount > 0 ? 'danger' : 'secondary'}>
              {totalPending} pending
            </Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span>{clarificationCount} clarifications</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-purple-500" />
            <span>{conflictCount} conflicts</span>
          </div>
          {criticalCount > 0 && (
            <Badge variant="danger" className="animate-pulse">
              {criticalCount} critical
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <div className="flex items-center gap-1 mr-2">
            <ListFilter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>

          {/* Type filter */}
          <div className="flex gap-1">
            {(['all', 'clarification', 'conflict'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={cn(
                  'px-2 py-1 text-xs rounded-full border transition-colors',
                  filterType === type
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          {/* Deal filter */}
          {deals.length > 0 && (
            <select
              value={filterDeal}
              onChange={(e) => setFilterDeal(e.target.value)}
              className="text-xs px-2 py-1 border rounded-md bg-white dark:bg-slate-900"
            >
              <option value="all">All Deals</option>
              {deals.map((deal) => (
                <option key={deal.id} value={deal.id}>
                  {deal.name}
                </option>
              ))}
            </select>
          )}

          {/* Show resolved toggle */}
          <label className="flex items-center gap-1 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-xs text-muted-foreground">Show resolved</span>
          </label>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-500/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              {totalPending === 0
                ? 'All decisions have been made'
                : 'No items match the current filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDeal).map(([key, group]) => (
              <div key={key}>
                {/* Deal header */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {group.dealName}
                  </span>
                  <Badge variant="secondary">{group.items.length}</Badge>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <DecisionQueueItemComponent
                      key={item.id}
                      item={item}
                      onResolve={() => {
                        if (item.clarification && onResolveClarification) {
                          // Open inline editor or call resolve
                          onResolveClarification(item.clarification, item.clarification.extractedValue);
                        } else if (item.conflict && onResolveConflict) {
                          onResolveConflict(item.conflict);
                        }
                      }}
                      onViewDocument={onViewDocument}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Queue Item Component
// ============================================================================

interface DecisionQueueItemComponentProps {
  item: DecisionQueueItem;
  onResolve: () => void;
  onViewDocument?: (documentId: string) => void;
}

function DecisionQueueItemComponent({
  item,
  onResolve,
  onViewDocument,
}: DecisionQueueItemComponentProps) {
  const isResolved = item.clarification
    ? item.clarification.status !== 'pending'
    : item.conflict
      ? item.conflict.resolution !== 'pending'
      : false;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-colors',
        isResolved
          ? 'bg-slate-50/50 dark:bg-slate-800/30 opacity-60'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer',
        item.priority >= 8 && !isResolved && 'border-rose-500/50 bg-rose-500/5'
      )}
      onClick={() => !isResolved && onResolve()}
    >
      {/* Type icon */}
      <div className="flex-shrink-0">
        {item.type === 'conflict' ? (
          <FileText className="h-5 w-5 text-purple-500" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{item.fieldName}</span>
          {item.clarification && (
            <ClarificationTypeBadge
              type={item.clarification.clarificationType}
              size="sm"
            />
          )}
          {item.conflict && <Badge variant="warning">Conflict</Badge>}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {item.documentName && (
            <>
              <span className="truncate max-w-[150px]">{item.documentName}</span>
              {onViewDocument && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDocument(item.documentId);
                  }}
                  className="text-primary hover:underline"
                >
                  View
                </button>
              )}
            </>
          )}
          {item.clarification?.reason && (
            <span className="truncate max-w-[200px]">{item.clarification.reason}</span>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {isResolved ? (
          <Badge variant="success">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Resolved
          </Badge>
        ) : (
          <>
            <PriorityBadge priority={item.priority} size="sm" />
            {item.clarification?.confidenceScore !== undefined && (
              <ConfidenceBadge confidence={item.clarification.confidenceScore} size="sm" />
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Progress Component
// ============================================================================

export interface DecisionProgressProps {
  total: number;
  resolved: number;
  className?: string;
}

export function DecisionProgress({ total, resolved, className }: DecisionProgressProps) {
  const percent = total > 0 ? Math.round((resolved / total) * 100) : 100;
  const remaining = total - resolved;

  return (
    <div className={cn('', className)}>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="text-muted-foreground">Decision Progress</span>
        <span className="font-medium">
          {resolved} / {total} resolved
        </span>
      </div>
      <Progress value={percent} className="h-2" />
      {remaining > 0 && (
        <p className="text-xs text-muted-foreground mt-1">
          {remaining} decision{remaining !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  );
}

export default DecisionQueue;
