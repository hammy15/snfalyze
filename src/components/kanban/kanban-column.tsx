'use client';

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { SortableKanbanCard } from './kanban-card';
import type { DealStatus, KanbanDealData } from './types';
import { STATUS_CONFIG } from './use-kanban';

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
  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <div className="flex-shrink-0 w-72">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-medium text-[var(--color-text-primary)]">
            {config.label}
          </span>
          <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--gray-100)] px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <span className="text-xs text-[var(--color-text-tertiary)] tabular-nums">
          ${(totalValue / 1000000).toFixed(1)}M
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          'space-y-3 min-h-[200px] rounded-lg p-2 -mx-2 transition-colors',
          isOver && 'bg-[var(--accent-bg)]'
        )}
      >
        <SortableContext
          items={deals.map((d) => d.id)}
          strategy={verticalListSortingStrategy}
        >
          {deals.map((deal) => (
            <SortableKanbanCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick?.(deal)}
              isSelected={deal.id === selectedDealId}
            />
          ))}
        </SortableContext>

        {/* Add Deal Button */}
        {onAddDeal && (
          <button
            onClick={() => onAddDeal(status)}
            className="w-full py-3 border-2 border-dashed border-[var(--color-border-muted)] rounded-lg text-sm text-[var(--color-text-tertiary)] hover:border-[var(--color-border-default)] hover:text-[var(--color-text-secondary)] transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add Deal
          </button>
        )}
      </div>
    </div>
  );
}
