'use client';

import { forwardRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { GripVertical, Clock } from 'lucide-react';
import type { KanbanDealData } from './types';

interface CompactKanbanCardProps {
  deal: KanbanDealData;
  onClick?: () => void;
  isSelected?: boolean;
  isDragging?: boolean;
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

function getDaysInStage(date: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

// Stage colors for left border
const stageColors: Record<string, string> = {
  new: '#6B7280',
  analyzing: '#3B82F6',
  reviewed: '#8B5CF6',
  under_loi: '#F59E0B',
  due_diligence: '#10B981',
  closed: '#14B8A6',
  passed: '#EF4444',
};

// Asset type colors
const assetTypeColors: Record<string, { bg: string; text: string }> = {
  SNF: { bg: '#DBEAFE', text: '#1E40AF' },
  ALF: { bg: '#D1FAE5', text: '#059669' },
  ILF: { bg: '#EDE9FE', text: '#7C3AED' },
  HOSPICE: { bg: '#FEF3C7', text: '#D97706' },
};

export const CompactKanbanCard = forwardRef<HTMLDivElement, CompactKanbanCardProps>(
  function CompactKanbanCard({ deal, onClick, isSelected, isDragging }, ref) {
    const daysInStage = deal.lastActivity ? getDaysInStage(deal.lastActivity) : 0;
    const assetColors = deal.assetType
      ? assetTypeColors[deal.assetType] || { bg: '#F3F4F6', text: '#6B7280' }
      : { bg: '#F3F4F6', text: '#6B7280' };
    const stageColor = deal.status ? stageColors[deal.status] || '#6B7280' : '#6B7280';

    const probabilityColor =
      deal.probability !== undefined
        ? deal.probability >= 60
          ? 'text-green-600'
          : deal.probability >= 30
            ? 'text-amber-600'
            : 'text-red-500'
        : 'text-surface-400';

    return (
      <div
        ref={ref}
        onClick={onClick}
        className={cn(
          'group p-2 bg-white dark:bg-surface-800 rounded-md border border-surface-200 dark:border-surface-700 cursor-pointer transition-all hover:shadow-sm border-l-[3px]',
          isSelected && 'ring-2 ring-primary-500',
          isDragging && 'opacity-90 shadow-lg scale-[1.02] rotate-1'
        )}
        style={{ borderLeftColor: stageColor }}
      >
        {/* Single line: Name + Key metrics */}
        <div className="flex items-center gap-2">
          {/* Name truncated */}
          <h4 className="font-medium text-xs text-surface-900 dark:text-white truncate flex-1 min-w-0">
            {deal.name}
          </h4>

          {/* Asset type badge */}
          {deal.assetType && (
            <span
              className="shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded"
              style={{ backgroundColor: assetColors.bg, color: assetColors.text }}
            >
              {deal.assetType}
            </span>
          )}
        </div>

        {/* Compact metrics row */}
        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-surface-500 dark:text-surface-400">
          {/* Value */}
          <span className="font-semibold text-surface-700 dark:text-surface-300 tabular-nums">
            {deal.value ? formatCurrency(deal.value) : '-'}
          </span>
          <span className="text-surface-300 dark:text-surface-600">|</span>

          {/* Beds */}
          <span className="tabular-nums">{deal.beds || '-'} beds</span>
          <span className="text-surface-300 dark:text-surface-600">|</span>

          {/* State if available */}
          {deal.primaryState && (
            <>
              <span className="font-medium">{deal.primaryState}</span>
              <span className="text-surface-300 dark:text-surface-600">|</span>
            </>
          )}

          {/* Probability */}
          <span className={cn('font-medium tabular-nums', probabilityColor)}>
            {deal.probability !== undefined ? `${deal.probability}%` : '-'}
          </span>

          {/* Days in stage indicator */}
          <div className="ml-auto flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            <span
              className={cn(
                'tabular-nums',
                daysInStage > 14 ? 'text-red-500' : daysInStage > 7 ? 'text-amber-500' : ''
              )}
            >
              {daysInStage}d
            </span>
          </div>
        </div>

        {/* Assignee avatar (very compact) */}
        {deal.assignee && (
          <div className="flex items-center gap-1 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-4 h-4 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">
                {deal.assignee.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-[9px] text-surface-400 truncate max-w-[60px]">
              {deal.assignee}
            </span>
          </div>
        )}
      </div>
    );
  }
);

export function SortableCompactKanbanCard({
  deal,
  onClick,
  isSelected,
}: CompactKanbanCardProps) {
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
    <div ref={setNodeRef} style={style} className="relative group/drag">
      <div
        {...attributes}
        {...listeners}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-0.5 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-3 h-3 text-surface-300" />
      </div>
      <CompactKanbanCard
        deal={deal}
        onClick={onClick}
        isSelected={isSelected}
        isDragging={isDragging}
      />
    </div>
  );
}
