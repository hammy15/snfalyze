'use client';

import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Calendar, MoreHorizontal, Building2, GripVertical } from 'lucide-react';
import type { KanbanDealData } from './types';

interface KanbanCardProps {
  deal: KanbanDealData;
  onClick?: () => void;
  isSelected?: boolean;
  isDragging?: boolean;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value}`;
}

export const KanbanCard = forwardRef<HTMLDivElement, KanbanCardProps>(
  function KanbanCard({ deal, onClick, isSelected, isDragging }, ref) {
    // Determine asset type color
    const assetTypeColors: Record<string, string> = {
      SNF: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      ALF: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      ILF: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    };

    const probabilityColor = deal.probability !== undefined
      ? deal.probability >= 60
        ? 'text-green-600 dark:text-green-400'
        : deal.probability >= 30
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-500 dark:text-red-400'
      : '';

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'card p-4 cursor-pointer transition-all hover:shadow-md border-l-4',
          isSelected && 'ring-2 ring-[var(--accent-solid)]',
          isDragging && 'opacity-90 shadow-xl scale-[1.02] rotate-2',
          deal.assetType === 'SNF' && 'border-l-blue-500',
          deal.assetType === 'ALF' && 'border-l-purple-500',
          deal.assetType === 'ILF' && 'border-l-green-500',
          !deal.assetType && 'border-l-gray-300'
        )}
      >
        {/* Header with name and asset type */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-[var(--color-text-primary)] truncate text-sm">
              {deal.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {deal.assetType && (
                <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded', assetTypeColors[deal.assetType] || 'bg-gray-100 text-gray-600')}>
                  {deal.assetType}
                </span>
              )}
              <span className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {deal.facilities?.length || 0} {(deal.facilities?.length || 0) === 1 ? 'facility' : 'facilities'}
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="btn btn-ghost btn-sm p-1 -mr-1 -mt-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Value and probability row */}
        <div className="flex items-center justify-between py-2 border-y border-[var(--color-border-muted)] my-2">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">Value</div>
            <div className="font-bold text-[var(--color-text-primary)] tabular-nums">
              {deal.value ? formatCurrency(deal.value) : '—'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">Beds</div>
            <div className="font-semibold text-[var(--color-text-primary)] tabular-nums">
              {deal.beds || '—'}
            </div>
          </div>
          {deal.probability !== undefined && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-tertiary)]">Prob</div>
              <div className={cn('font-semibold tabular-nums', probabilityColor)}>
                {deal.probability}%
              </div>
            </div>
          )}
        </div>

        {/* Next action if present */}
        {deal.nextAction && (
          <div className="text-xs text-[var(--color-text-secondary)] bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded px-2 py-1.5 mb-3">
            <div className="flex items-center gap-1 font-medium text-amber-700 dark:text-amber-300">
              <Calendar className="w-3 h-3" />
              {deal.nextAction}
            </div>
            {deal.nextActionDate && (
              <div className="text-amber-600 dark:text-amber-400 mt-0.5">
                Due {deal.nextActionDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer with assignee and activity */}
        <div className="flex items-center justify-between">
          {deal.assignee && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-white text-[10px] font-bold">
                  {deal.assignee.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)] truncate max-w-[80px]">
                {deal.assignee}
              </span>
            </div>
          )}
          {deal.lastActivity && (
            <span className="text-[10px] text-[var(--color-text-tertiary)]">
              {formatRelativeDate(deal.lastActivity)}
            </span>
          )}
        </div>
      </div>
    );
  }
);

export function SortableKanbanCard({
  deal,
  onClick,
  isSelected,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-[var(--color-text-tertiary)]" />
      </div>
      <KanbanCard
        deal={deal}
        onClick={onClick}
        isSelected={isSelected}
        isDragging={isDragging}
      />
    </div>
  );
}
