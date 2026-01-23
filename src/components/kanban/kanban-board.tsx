'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { KanbanColumn } from './kanban-column';
import { KanbanCard } from './kanban-card';
import { useKanban, DEAL_STATUSES, type KanbanDeal } from './use-kanban';
import type { DealStatus, KanbanDealData } from './types';

interface KanbanBoardProps {
  deals: KanbanDeal[];
  onDealClick?: (deal: KanbanDealData) => void;
  onStatusChange?: (dealId: string, newStatus: DealStatus) => Promise<void>;
  onAddDeal?: (status: DealStatus) => void;
  selectedDealId?: string;
  visibleStatuses?: DealStatus[];
}

export function KanbanBoard({
  deals: initialDeals,
  onDealClick,
  onStatusChange,
  onAddDeal,
  selectedDealId,
  visibleStatuses = ['new', 'analyzing', 'reviewed', 'under_loi', 'due_diligence', 'closed'],
}: KanbanBoardProps) {
  const [activeDeal, setActiveDeal] = useState<KanbanDealData | null>(null);

  const { dealsByStatus, moveDeal, isUpdating, error } = useKanban({
    initialDeals,
    onStatusChange,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const deal = Object.values(dealsByStatus)
      .flat()
      .find((d) => d.id === active.id);
    if (deal) {
      setActiveDeal(deal);
    }
  }, [dealsByStatus]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveDeal(null);

      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      // Check if dropped on a column
      if (DEAL_STATUSES.includes(overId as DealStatus)) {
        await moveDeal(activeId, overId as DealStatus);
        return;
      }

      // Check if dropped on another card
      const overDeal = Object.values(dealsByStatus)
        .flat()
        .find((d) => d.id === overId);

      if (overDeal && overDeal.status) {
        await moveDeal(activeId, overDeal.status);
      }
    },
    [dealsByStatus, moveDeal]
  );

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) return;

    // Visual feedback is handled by the droppable
  }, []);

  const filteredStatuses = DEAL_STATUSES.filter((status) =>
    visibleStatuses.includes(status)
  );

  return (
    <div className="relative">
      {error && (
        <div className="absolute top-0 left-0 right-0 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 px-6">
          {filteredStatuses.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              deals={dealsByStatus[status] || []}
              selectedDealId={selectedDealId}
              onDealClick={onDealClick}
              onAddDeal={onAddDeal}
            />
          ))}
        </div>

        <DragOverlay>
          {activeDeal && (
            <div className="w-72">
              <KanbanCard deal={activeDeal} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {isUpdating && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center pointer-events-none">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-solid)]" />
        </div>
      )}
    </div>
  );
}
