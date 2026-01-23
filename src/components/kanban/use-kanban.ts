'use client';

import { useState, useCallback, useEffect } from 'react';
import type { DealStatus } from './types';

export interface KanbanDeal {
  id: string;
  name: string;
  status: DealStatus;
  value?: number;
  beds?: number;
  facilities: { id: string; name: string }[];
  assignee?: string;
  lastActivity?: Date;
  nextAction?: string;
  nextActionDate?: Date;
  probability?: number;
  assetType?: string;
}

interface UseKanbanOptions {
  initialDeals?: KanbanDeal[];
  onStatusChange?: (dealId: string, newStatus: DealStatus) => Promise<void>;
}

interface UseKanbanReturn {
  deals: KanbanDeal[];
  dealsByStatus: Record<DealStatus, KanbanDeal[]>;
  isUpdating: boolean;
  error: string | null;
  moveDeal: (dealId: string, newStatus: DealStatus) => Promise<void>;
  reorderDeal: (dealId: string, newIndex: number, status: DealStatus) => void;
  refreshDeals: () => Promise<void>;
}

export const DEAL_STATUSES: DealStatus[] = [
  'new',
  'analyzing',
  'reviewed',
  'under_loi',
  'due_diligence',
  'closed',
  'passed',
];

export const STATUS_CONFIG: Record<DealStatus, { label: string; color: string }> = {
  new: { label: 'New', color: 'var(--blue-500)' },
  analyzing: { label: 'Analyzing', color: 'var(--amber-500)' },
  reviewed: { label: 'Reviewed', color: 'var(--purple-500)' },
  under_loi: { label: 'Under LOI', color: 'var(--cyan-500)' },
  due_diligence: { label: 'Due Diligence', color: 'var(--orange-500)' },
  closed: { label: 'Closed', color: 'var(--green-500)' },
  passed: { label: 'Passed', color: 'var(--gray-400)' },
};

export function useKanban({ initialDeals = [], onStatusChange }: UseKanbanOptions): UseKanbanReturn {
  const [deals, setDeals] = useState<KanbanDeal[]>(initialDeals);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  const dealsByStatus = DEAL_STATUSES.reduce((acc, status) => {
    acc[status] = deals.filter((deal) => deal.status === status);
    return acc;
  }, {} as Record<DealStatus, KanbanDeal[]>);

  const moveDeal = useCallback(
    async (dealId: string, newStatus: DealStatus) => {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal || deal.status === newStatus) return;

      const previousStatus = deal.status;

      // Optimistic update
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d))
      );
      setError(null);
      setIsUpdating(true);

      try {
        if (onStatusChange) {
          await onStatusChange(dealId, newStatus);
        } else {
          // Default API call
          const response = await fetch(`/api/deals/${dealId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }),
          });

          if (!response.ok) {
            throw new Error('Failed to update deal status');
          }
        }
      } catch (err) {
        // Revert on error
        setDeals((prev) =>
          prev.map((d) => (d.id === dealId ? { ...d, status: previousStatus } : d))
        );
        setError(err instanceof Error ? err.message : 'Failed to update deal');
      } finally {
        setIsUpdating(false);
      }
    },
    [deals, onStatusChange]
  );

  const reorderDeal = useCallback((dealId: string, newIndex: number, status: DealStatus) => {
    setDeals((prev) => {
      const deal = prev.find((d) => d.id === dealId);
      if (!deal) return prev;

      const statusDeals = prev.filter((d) => d.status === status && d.id !== dealId);
      const otherDeals = prev.filter((d) => d.status !== status);

      statusDeals.splice(newIndex, 0, { ...deal, status });

      return [...otherDeals, ...statusDeals];
    });
  }, []);

  const refreshDeals = useCallback(async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/deals');
      if (!response.ok) throw new Error('Failed to fetch deals');
      const data = await response.json();
      if (data.success && data.data) {
        setDeals(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh deals');
    } finally {
      setIsUpdating(false);
    }
  }, []);

  return {
    deals,
    dealsByStatus,
    isUpdating,
    error,
    moveDeal,
    reorderDeal,
    refreshDeals,
  };
}
