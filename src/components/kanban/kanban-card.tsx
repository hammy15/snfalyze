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
    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'card p-4 cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-[var(--accent-solid)]',
          isDragging && 'opacity-50 shadow-lg scale-[1.02]'
        )}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-[var(--color-text-primary)] truncate">
              {deal.name}
            </h3>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              {deal.facilities.length} {deal.facilities.length === 1 ? 'facility' : 'facilities'}
              {deal.beds && ` · ${deal.beds} beds`}
            </p>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="btn btn-ghost btn-sm p-1 -mr-1 -mt-1 shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-sm mb-3">
          {deal.value !== undefined && (
            <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
              {formatCurrency(deal.value)}
            </span>
          )}
          {deal.probability !== undefined && (
            <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
              {deal.probability}% prob
            </span>
          )}
        </div>

        {deal.nextAction && (
          <div className="text-xs text-[var(--color-text-secondary)] bg-[var(--gray-50)] rounded px-2 py-1.5 mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {deal.nextAction}
            </div>
            {deal.nextActionDate && (
              <div className="text-[var(--color-text-tertiary)] mt-0.5">
                {deal.nextActionDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          {deal.assignee && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <span className="text-white text-xs font-medium">
                  {deal.assignee.charAt(0)}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">
                {deal.assignee}
              </span>
            </div>
          )}
          {deal.lastActivity && (
            <span className="text-xs text-[var(--color-text-tertiary)]">
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
