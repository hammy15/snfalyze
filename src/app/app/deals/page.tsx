'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/ui/data-table';
import { FilterBar, dealFilters, ActiveFilter } from '@/components/ui/filter-bar';
import { PreviewPanel, DealPreviewContent } from '@/components/ui/preview-panel';
import { StatusPill } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
import { CreateDealModal } from '@/components/deals';
import { KanbanBoard, type KanbanDeal, type DealStatus } from '@/components/kanban';
import { type Deal as DealFramework } from '@/lib/deals/types';
import { cn } from '@/lib/utils';
import {
  Briefcase,
  DollarSign,
  TrendingUp,
  Plus,
  Download,
  LayoutGrid,
  List,
  Building2,
  Target,
  BookOpen,
  FileText,
} from 'lucide-react';

type DealStage = 'target' | 'contacted' | 'loi' | 'diligence' | 'psa' | 'closed' | 'dead';

// Map legacy stage to database status
const stageToStatusMap: Record<DealStage, DealStatus> = {
  target: 'new',
  contacted: 'analyzing',
  loi: 'under_loi',
  diligence: 'due_diligence',
  psa: 'reviewed',
  closed: 'closed',
  dead: 'passed',
};

interface Deal {
  id: string;
  name: string;
  stage: DealStage;
  value: number;
  beds: number;
  facilities: { id: string; name: string }[];
  assignee: string;
  assigneeAvatar?: string;
  createdAt: Date;
  lastActivity: Date;
  nextAction?: string;
  nextActionDate?: Date;
  probability?: number;
  notes?: string;
}

const stageConfig: { stage: DealStage; label: string; color: string }[] = [
  { stage: 'target', label: 'Target', color: 'var(--stage-target)' },
  { stage: 'contacted', label: 'Contacted', color: 'var(--stage-contacted)' },
  { stage: 'loi', label: 'LOI', color: 'var(--stage-loi)' },
  { stage: 'diligence', label: 'Diligence', color: 'var(--stage-diligence)' },
  { stage: 'psa', label: 'PSA', color: 'var(--stage-psa)' },
  { stage: 'closed', label: 'Closed', color: 'var(--stage-closed)' },
];

export default function DealsPage() {
  const router = useRouter();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('kanban');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('lastActivity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch deals from API
  useEffect(() => {
    async function fetchDeals() {
      try {
        const response = await fetch('/api/deals');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Transform API data to Deal format
            const transformedDeals: Deal[] = data.data.map((deal: Record<string, unknown>) => ({
              id: deal.id as string,
              name: deal.name as string,
              stage: mapStatusToStage(deal.status as string),
              value: 0,
              beds: 0,
              facilities: [],
              assignee: 'Unassigned',
              createdAt: new Date(deal.createdAt as string),
              lastActivity: new Date(deal.updatedAt as string || deal.createdAt as string),
              probability: 50,
            }));
            setDeals(transformedDeals);
          }
        }
      } catch (error) {
        console.error('Failed to fetch deals:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, []);

  // Map database status to legacy stage
  function mapStatusToStage(status: string): DealStage {
    const statusToStageMap: Record<string, DealStage> = {
      new: 'target',
      analyzing: 'contacted',
      under_loi: 'loi',
      due_diligence: 'diligence',
      reviewed: 'psa',
      closed: 'closed',
      passed: 'dead',
    };
    return statusToStageMap[status] || 'target';
  }

  const handleCreateDeal = (newDeal: Partial<DealFramework>) => {
    console.log('Creating deal:', newDeal);
    // In production, this would call your API to create the deal
    // Then navigate to the new deal's analysis page
    router.push(`/app/deals/${newDeal.deal_id || 'new'}`);
  };

  // Filter and sort data
  const filteredDeals = useMemo(() => {
    let result = [...deals];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.assignee.toLowerCase().includes(query)
      );
    }

    // Apply filters
    activeFilters.forEach((filter) => {
      if (filter.id === 'stage' && Array.isArray(filter.value)) {
        result = result.filter((d) => (filter.value as string[]).includes(d.stage));
      }
      if (filter.id === 'assignee' && Array.isArray(filter.value)) {
        const assigneeMap: Record<string, string> = {
          sarah: 'Sarah Chen',
          mike: 'Mike Rodriguez',
          you: 'You',
        };
        result = result.filter((d) =>
          (filter.value as string[]).some((v) => assigneeMap[v] === d.assignee)
        );
      }
      if (filter.id === 'value' && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
        const range = filter.value as { min?: number; max?: number };
        if (range.min !== undefined) {
          result = result.filter((d) => d.value >= range.min!);
        }
        if (range.max !== undefined) {
          result = result.filter((d) => d.value <= range.max!);
        }
      }
    });

    // Apply sorting (for table view)
    result.sort((a, b) => {
      let aVal: string | number | Date | undefined = a[sortColumn as keyof Deal] as string | number | Date | undefined;
      let bVal: string | number | Date | undefined = b[sortColumn as keyof Deal] as string | number | Date | undefined;

      if (aVal === undefined && bVal === undefined) return 0;
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;

      if (aVal instanceof Date) aVal = aVal.getTime();
      if (bVal instanceof Date) bVal = bVal.getTime();
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [deals, searchQuery, activeFilters, sortColumn, sortDirection]);

  // Group deals by stage for kanban
  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {
      target: [],
      contacted: [],
      loi: [],
      diligence: [],
      psa: [],
      closed: [],
      dead: [],
    };

    filteredDeals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    return grouped;
  }, [filteredDeals]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const activeDeals = filteredDeals.filter((d) => d.stage !== 'closed' && d.stage !== 'dead');
    const totalValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
    const weightedValue = activeDeals.reduce((sum, d) => sum + d.value * (d.probability || 50) / 100, 0);
    return {
      total: activeDeals.length,
      totalValue,
      weightedValue,
      closedThisYear: filteredDeals.filter((d) => d.stage === 'closed').length,
    };
  }, [filteredDeals]);

  // Transform deals for kanban board
  const kanbanDeals: KanbanDeal[] = useMemo(() => {
    return filteredDeals.map((deal) => ({
      id: deal.id,
      name: deal.name,
      status: stageToStatusMap[deal.stage],
      value: deal.value,
      beds: deal.beds,
      facilities: deal.facilities,
      assignee: deal.assignee,
      lastActivity: deal.lastActivity,
      nextAction: deal.nextAction,
      nextActionDate: deal.nextActionDate,
      probability: deal.probability,
    }));
  }, [filteredDeals]);

  // Handler for kanban deal click - find original deal data
  const handleKanbanDealClick = useCallback((kanbanDeal: KanbanDeal) => {
    const originalDeal = deals.find((d) => d.id === kanbanDeal.id);
    if (originalDeal) {
      setSelectedDeal(originalDeal);
    }
  }, [deals]);

  // Handler for adding a deal from kanban column
  const handleAddDeal = useCallback((status: DealStatus) => {
    setIsCreateModalOpen(true);
    // Could pre-set the status in the modal if needed
  }, []);

  const columns: Column<Deal>[] = [
    {
      id: 'name',
      header: 'Deal',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      cell: (value, row) => (
        <div>
          <div className="font-medium text-[var(--color-text-primary)]">{value}</div>
          <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mt-0.5">
            <Building2 className="w-3 h-3" />
            {row.facilities.length} {row.facilities.length === 1 ? 'facility' : 'facilities'}
          </div>
        </div>
      ),
    },
    {
      id: 'stage',
      header: 'Stage',
      accessor: 'stage',
      sortable: true,
      width: 120,
      cell: (value) => <StatusPill status={value} size="sm" />,
    },
    {
      id: 'value',
      header: 'Value',
      accessor: 'value',
      sortable: true,
      align: 'right',
      width: 120,
      cell: (value) => (
        <span className="font-medium tabular-nums">${(value / 1000000).toFixed(1)}M</span>
      ),
    },
    {
      id: 'beds',
      header: 'Beds',
      accessor: 'beds',
      sortable: true,
      align: 'right',
      width: 80,
      cell: (value) => <span className="tabular-nums">{value}</span>,
    },
    {
      id: 'assignee',
      header: 'Owner',
      accessor: 'assignee',
      sortable: true,
      width: 140,
      cell: (value) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
            <span className="text-white text-xs font-medium">{value.charAt(0)}</span>
          </div>
          <span className="text-sm">{value}</span>
        </div>
      ),
    },
    {
      id: 'probability',
      header: 'Prob.',
      accessor: 'probability',
      sortable: true,
      align: 'right',
      width: 80,
      cell: (value) => (
        <span className="tabular-nums text-[var(--color-text-secondary)]">
          {value || 50}%
        </span>
      ),
    },
    {
      id: 'lastActivity',
      header: 'Last Activity',
      accessor: 'lastActivity',
      sortable: true,
      width: 130,
      cell: (value) => (
        <span className="text-sm text-[var(--color-text-secondary)]">
          {formatRelativeDate(value)}
        </span>
      ),
    },
  ];

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

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleRowClick = (row: Deal) => {
    setSelectedDeal(row);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Deal Pipeline</h1>
            <p className="page-header-subtitle">
              Track and manage your acquisition pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/deals/memory">
              <button className="btn btn-secondary btn-sm">
                <BookOpen className="w-4 h-4" />
                Deal Memory
              </button>
            </Link>
            <button className="btn btn-secondary btn-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus className="w-4 h-4" />
              New Deal
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Active Deals"
          value={stats.total}
          icon={<Briefcase className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Total Pipeline"
          value={stats.totalValue}
          format="currency"
          icon={<DollarSign className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Weighted Pipeline"
          value={stats.weightedValue}
          format="currency"
          icon={<TrendingUp className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Closed This Year"
          value={stats.closedThisYear}
          icon={<Target className="w-5 h-5" />}
          size="sm"
        />
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <FilterBar
          filters={dealFilters}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onSearch={setSearchQuery}
          searchPlaceholder="Search deals..."
        />
      </div>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-text-secondary)]">
          Showing <span className="font-medium text-[var(--color-text-primary)]">{filteredDeals.length}</span> deals
        </div>
        <div className="flex items-center gap-1 bg-[var(--gray-100)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'kanban' ? 'bg-white shadow-sm' : 'hover:bg-[var(--gray-200)]'
            )}
            title="Kanban view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-[var(--gray-200)]'
            )}
            title="Table view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card p-12 text-center">
          <div className="animate-pulse text-[var(--color-text-secondary)]">Loading deals...</div>
        </div>
      ) : deals.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-[var(--gray-100)] flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-[var(--color-text-tertiary)]" />
          </div>
          <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">No deals yet</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mb-4">
            Upload your first deal to start tracking your pipeline
          </p>
          <Link href="/upload">
            <button className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              Upload Deal
            </button>
          </Link>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          deals={kanbanDeals}
          onDealClick={handleKanbanDealClick}
          onAddDeal={handleAddDeal}
          selectedDealId={selectedDeal?.id}
        />
      ) : (
        <DataTable
          data={filteredDeals}
          columns={columns}
          keyField="id"
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={handleRowClick}
          activeRowId={selectedDeal?.id}
          emptyMessage="No deals match your filters"
        />
      )}

      {/* Preview Panel */}
      <PreviewPanel
        isOpen={!!selectedDeal}
        onClose={() => setSelectedDeal(null)}
        title={selectedDeal?.name}
        subtitle={selectedDeal ? `${selectedDeal.facilities.length} facilities · ${selectedDeal.beds} beds` : undefined}
        detailUrl={selectedDeal ? `/app/deals/${selectedDeal.id}` : undefined}
        actions={
          selectedDeal && (
            <>
              <button className="btn btn-primary btn-sm flex-1">
                Update Stage
              </button>
              <button className="btn btn-secondary btn-sm flex-1">
                <Plus className="w-4 h-4" />
                Add Note
              </button>
            </>
          )
        }
      >
        {selectedDeal && <DealPreviewContent deal={selectedDeal} />}
      </PreviewPanel>

      {/* Create Deal Modal */}
      <CreateDealModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onCreateDeal={handleCreateDeal}
      />
    </div>
  );
}
