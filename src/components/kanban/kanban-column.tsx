'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { Plus, ChevronRight, Target, Search, FileCheck, Handshake, ClipboardCheck, CheckCircle2, XCircle } from 'lucide-react';
import { SortableKanbanCard } from './kanban-card';
import type { DealStatus, KanbanDealData } from './types';
import { STATUS_CONFIG } from './use-kanban';

// Enhanced column config with icons and descriptions
const COLUMN_CONFIG: Record<DealStatus, {
  icon: React.ElementType;
  description: string;
  bgColor: string;
  headerBg: string;
}> = {
  new: {
    icon: Target,
    description: 'New opportunities',
    bgColor: 'bg-blue-50/50 dark:bg-blue-950/20',
    headerBg: 'bg-gradient-to-r from-blue-500 to-blue-600',
  },
  analyzing: {
    icon: Search,
    description: 'Under review',
    bgColor: 'bg-amber-50/50 dark:bg-amber-950/20',
    headerBg: 'bg-gradient-to-r from-amber-500 to-amber-600',
  },
  reviewed: {
    icon: FileCheck,
    description: 'Analysis complete',
    bgColor: 'bg-purple-50/50 dark:bg-purple-950/20',
    headerBg: 'bg-gradient-to-r from-purple-500 to-purple-600',
  },
  under_loi: {
    icon: Handshake,
    description: 'LOI submitted',
    bgColor: 'bg-cyan-50/50 dark:bg-cyan-950/20',
    headerBg: 'bg-gradient-to-r from-cyan-500 to-cyan-600',
  },
  due_diligence: {
    icon: ClipboardCheck,
    description: 'In due diligence',
    bgColor: 'bg-orange-50/50 dark:bg-orange-950/20',
    headerBg: 'bg-gradient-to-r from-orange-500 to-orange-600',
  },
  closed: {
    icon: CheckCircle2,
    description: 'Successfully closed',
    bgColor: 'bg-green-50/50 dark:bg-green-950/20',
    headerBg: 'bg-gradient-to-r from-green-500 to-green-600',
  },
  passed: {
    icon: XCircle,
    description: 'Passed on deal',
    bgColor: 'bg-gray-50/50 dark:bg-gray-900/20',
    headerBg: 'bg-gradient-to-r from-gray-400 to-gray-500',
  },
};

interface KanbanColumnProps {
  status: DealStatus;
  deals: KanbanDealData[];
  selectedDealId?: string;
  onDealClick?: (deal: KanbanDealData) => void;
  onAddDeal?: (status: DealStatus) => void;
}

export function KanbanColumn({
  status,
  deals,
  selectedDealId,
  onDealClick,
  onAddDeal,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const config = STATUS_CONFIG[status];
  const columnConfig = COLUMN_CONFIG[status];
  const Icon = columnConfig.icon;
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const totalBeds = deals.reduce((sum, d) => sum + (d.beds || 0), 0);

  return (
    <div className="flex-shrink-0 w-80">
      {/* Column Header */}
      <div className={cn('rounded-t-xl p-3 mb-0', columnConfig.headerBg)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-white/90" />
            <span className="text-sm font-semibold text-white">
              {config.label}
            </span>
            <span className="text-xs font-medium text-white/80 bg-white/20 px-2 py-0.5 rounded-full">
              {deals.length}
            </span>
          </div>
          {status !== 'passed' && (
            <ChevronRight className="w-4 h-4 text-white/50" />
          )}
        </div>
        <div className="text-[11px] text-white/70 mt-1">{columnConfig.description}</div>
      </div>

      {/* Column Stats */}
      <div className={cn('flex items-center justify-between px-3 py-2 border-x border-[var(--color-border-muted)]', columnConfig.bgColor)}>
        <div className="text-xs">
          <span className="text-[var(--color-text-tertiary)]">Value: </span>
          <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
            ${totalValue >= 1000000 ? (totalValue / 1000000).toFixed(1) + 'M' : (totalValue / 1000).toFixed(0) + 'K'}
          </span>
        </div>
        <div className="text-xs">
          <span className="text-[var(--color-text-tertiary)]">Beds: </span>
          <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
            {totalBeds.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-3 min-h-[300px] rounded-b-xl p-3 border border-t-0 border-[var(--color-border-muted)] transition-all duration-200',
          columnConfig.bgColor,
          isOver && 'ring-2 ring-[var(--accent-solid)] ring-inset bg-[var(--accent-bg)]'
        )}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Icon className="w-8 h-8 text-[var(--color-text-disabled)] mb-2" />
              <p className="text-sm text-[var(--color-text-tertiary)]">No deals</p>
              <p className="text-xs text-[var(--color-text-disabled)]">Drag deals here</p>
            </div>
          ) : (
            deals.map((deal) => (
              <SortableKanbanCard
                key={deal.id}
                deal={deal}
                onClick={() => onDealClick?.(deal)}
                isSelected={deal.id === selectedDealId}
              />
            ))
          )}
        </SortableContext>

        {/* Add Deal Button */}
        {onAddDeal && status !== 'closed' && status !== 'passed' && (
          <button
            onClick={() => onAddDeal(status)}
            className="w-full py-2.5 border-2 border-dashed border-[var(--color-border-muted)] rounded-lg text-sm text-[var(--color-text-tertiary)] hover:border-[var(--accent-solid)] hover:text-[var(--accent-solid)] hover:bg-[var(--accent-bg)] transition-all group"
          >
            <Plus className="w-4 h-4 inline mr-1 group-hover:scale-110 transition-transform" />
            Add Deal
          </button>
        )}
      </div>
    </div>
  );
}
