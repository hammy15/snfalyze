'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/data-table';
import { FilterBar, facilityFilters, ActiveFilter } from '@/components/ui/filter-bar';
import { PreviewPanel, FacilityPreviewContent } from '@/components/ui/preview-panel';
import { RiskBadge, QualityRating } from '@/components/ui/status-badge';
import { StatCard } from '@/components/ui/stat-card';
import {
  Building2,
  MapPin,
  TrendingUp,
  Download,
  Plus,
  Target,
  AlertTriangle,
  LayoutGrid,
  List,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Facility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  licensedBeds: number;
  certifiedBeds?: number;
  cmsRating?: number;
  healthRating?: number;
  staffingRating?: number;
  qualityRating?: number;
  yearBuilt?: number;
  isSff?: boolean;
  isSffWatch?: boolean;
  hasImmediateJeopardy?: boolean;
  dealId?: string;
  // Computed/display fields
  type?: 'snf' | 'alf' | 'ilf';
  beds?: number;
  occupancy?: number;
  riskLevel?: 'high' | 'medium' | 'low';
  riskScore?: number;
  owner?: string;
  operator?: string;
  isTarget?: boolean;
}

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Fetch facilities from API
  useEffect(() => {
    async function fetchFacilities() {
      try {
        const response = await fetch('/api/facilities');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Transform API data to display format
            const transformedFacilities: Facility[] = data.data.map((f: Facility) => {
              // Calculate risk level based on CMS rating and other factors
              let riskLevel: 'high' | 'medium' | 'low' = 'low';
              let riskScore = 30;

              if (f.hasImmediateJeopardy || f.isSff) {
                riskLevel = 'high';
                riskScore = 85;
              } else if (f.isSffWatch || (f.cmsRating && f.cmsRating <= 2)) {
                riskLevel = 'high';
                riskScore = 70;
              } else if (f.cmsRating && f.cmsRating === 3) {
                riskLevel = 'medium';
                riskScore = 50;
              } else if (f.cmsRating && f.cmsRating >= 4) {
                riskLevel = 'low';
                riskScore = 25;
              }

              return {
                ...f,
                type: f.assetType?.toLowerCase() as 'snf' | 'alf' | 'ilf',
                beds: f.licensedBeds,
                occupancy: 85 + Math.floor(Math.random() * 10), // Simulated for now
                riskLevel,
                riskScore,
                owner: 'Cascadia Healthcare',
                operator: 'Cascadia Operations',
                isTarget: false,
              };
            });
            setFacilities(transformedFacilities);
          }
        }
      } catch (error) {
        console.error('Failed to fetch facilities:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchFacilities();
  }, []);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...facilities];

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.city.toLowerCase().includes(query) ||
          f.state.toLowerCase().includes(query) ||
          f.owner.toLowerCase().includes(query)
      );
    }

    // Apply filters
    activeFilters.forEach((filter) => {
      if (filter.id === 'state' && Array.isArray(filter.value)) {
        result = result.filter((f) => (filter.value as string[]).includes(f.state));
      }
      if (filter.id === 'type' && Array.isArray(filter.value)) {
        result = result.filter((f) => (filter.value as string[]).includes(f.type));
      }
      if (filter.id === 'risk' && Array.isArray(filter.value)) {
        result = result.filter((f) => (filter.value as string[]).includes(f.riskLevel));
      }
      if (filter.id === 'beds' && typeof filter.value === 'object' && !Array.isArray(filter.value)) {
        const range = filter.value as { min?: number; max?: number };
        if (range.min !== undefined) {
          result = result.filter((f) => f.beds >= range.min!);
        }
        if (range.max !== undefined) {
          result = result.filter((f) => f.beds <= range.max!);
        }
      }
    });

    // Apply sorting
    result.sort((a, b) => {
      let aVal = a[sortColumn as keyof Facility];
      let bVal = b[sortColumn as keyof Facility];

      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [facilities, searchQuery, activeFilters, sortColumn, sortDirection]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const highRisk = filteredData.filter((f) => f.riskLevel === 'high').length;
    const totalBeds = filteredData.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
    const avgRating = filteredData.filter(f => f.cmsRating).length > 0
      ? (filteredData.reduce((sum, f) => sum + (f.cmsRating || 0), 0) / filteredData.filter(f => f.cmsRating).length).toFixed(1)
      : 0;
    const stateCount = new Set(filteredData.map(f => f.state)).size;
    return { total: filteredData.length, highRisk, totalBeds, avgRating, stateCount };
  }, [filteredData]);

  const columns: Column<Facility>[] = [
    {
      id: 'name',
      header: 'Facility',
      accessor: 'name',
      sortable: true,
      minWidth: 200,
      cell: (value, row) => (
        <div>
          <div className="font-medium text-[var(--color-text-primary)]">{value}</div>
          <div className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mt-0.5">
            <MapPin className="w-3 h-3" />
            {row.city}, {row.state}
          </div>
        </div>
      ),
    },
    {
      id: 'assetType',
      header: 'Type',
      accessor: 'assetType',
      sortable: true,
      width: 80,
      cell: (value) => {
        const colors: Record<string, string> = {
          SNF: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
          ALF: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
          ILF: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        };
        return (
          <span className={cn('px-2 py-0.5 text-xs font-medium rounded', colors[value] || 'bg-gray-100 text-gray-600')}>
            {value}
          </span>
        );
      },
    },
    {
      id: 'licensedBeds',
      header: 'Beds',
      accessor: 'licensedBeds',
      sortable: true,
      align: 'right',
      width: 80,
      cell: (value) => <span className="tabular-nums font-medium">{value}</span>,
    },
    {
      id: 'occupancy',
      header: 'Occupancy',
      accessor: 'occupancy',
      sortable: true,
      align: 'right',
      width: 100,
      cell: (value) => (
        <div className="flex items-center justify-end gap-2">
          <div className="w-12 h-1.5 bg-[var(--gray-200)] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full',
                value && value >= 90 ? 'bg-[var(--status-success-icon)]' :
                value && value >= 75 ? 'bg-[var(--status-warning-icon)]' :
                'bg-[var(--status-error-icon)]'
              )}
              style={{ width: `${value || 0}%` }}
            />
          </div>
          <span className="tabular-nums text-xs">{value || '—'}%</span>
        </div>
      ),
    },
    {
      id: 'cmsRating',
      header: 'CMS Rating',
      accessor: 'cmsRating',
      sortable: true,
      width: 100,
      cell: (value) => value ? <QualityRating rating={value as 1|2|3|4|5} size="sm" /> : <span className="text-[var(--color-text-tertiary)]">—</span>,
    },
    {
      id: 'riskLevel',
      header: 'Risk',
      accessor: 'riskLevel',
      sortable: true,
      width: 100,
      cell: (value, row) => value ? <RiskBadge level={value} score={row.riskScore} showScore size="sm" /> : <span className="text-[var(--color-text-tertiary)]">—</span>,
    },
    {
      id: 'state',
      header: 'State',
      accessor: 'state',
      sortable: true,
      width: 80,
      cell: (value) => (
        <span className="text-sm font-medium text-[var(--color-text-secondary)]">
          {value}
        </span>
      ),
    },
  ];

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
  };

  const handleRowClick = (row: Facility) => {
    setSelectedFacility(row);
  };

  const handleAddToTargets = () => {
    if (selectedRows.length === 0) return;
    alert(`Adding ${selectedRows.length} facilities to targets`);
    setSelectedRows([]);
  };

  const handleExport = () => {
    alert('Exporting facility data...');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="page-header">
          <h1 className="page-header-title">Facility Explorer</h1>
          <p className="page-header-subtitle">Loading facilities...</p>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-solid)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Facility Explorer</h1>
            <p className="page-header-subtitle">
              Browse and analyze {stats.total.toLocaleString()} Cascadia portfolio facilities.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <button onClick={handleAddToTargets} className="btn btn-primary btn-sm">
                <Target className="w-4 h-4" />
                Add to Targets ({selectedRows.length})
              </button>
            )}
            <button onClick={handleExport} className="btn btn-secondary btn-sm">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Facilities"
          value={stats.total}
          icon={<Building2 className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Total Beds"
          value={stats.totalBeds}
          icon={<Target className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="States"
          value={stats.stateCount}
          icon={<MapPin className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Avg CMS Rating"
          value={Number(stats.avgRating)}
          suffix="/5"
          icon={<TrendingUp className="w-5 h-5" />}
          size="sm"
        />
      </div>

      {/* Filter Bar */}
      <div className="card p-4">
        <FilterBar
          filters={facilityFilters}
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
          onSearch={setSearchQuery}
          searchPlaceholder="Search facilities by name, city, or owner..."
        />
      </div>

      {/* View Toggle & Results Count */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-text-secondary)]">
          Showing <span className="font-medium text-[var(--color-text-primary)]">{filteredData.length}</span> facilities
        </div>
        <div className="flex items-center gap-1 bg-[var(--gray-100)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('table')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'table' ? 'bg-white shadow-sm' : 'hover:bg-[var(--gray-200)]'
            )}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-1.5 rounded transition-colors',
              viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-[var(--gray-200)]'
            )}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data Table */}
      {viewMode === 'table' ? (
        <DataTable
          data={filteredData}
          columns={columns}
          keyField="id"
          selectable
          selectedRows={selectedRows}
          onSelectionChange={setSelectedRows}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSort}
          onRowClick={handleRowClick}
          activeRowId={selectedFacility?.id}
          emptyMessage="No facilities match your filters"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredData.map((facility) => {
            const typeColors: Record<string, string> = {
              SNF: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
              ALF: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
              ILF: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
            };
            return (
              <div
                key={facility.id}
                onClick={() => handleRowClick(facility)}
                className={cn(
                  'card p-4 cursor-pointer transition-all hover:shadow-md border-l-4',
                  selectedFacility?.id === facility.id && 'ring-2 ring-[var(--accent-solid)]',
                  facility.assetType === 'SNF' && 'border-l-blue-500',
                  facility.assetType === 'ALF' && 'border-l-purple-500',
                  facility.assetType === 'ILF' && 'border-l-green-500'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-[var(--color-text-primary)] line-clamp-1">{facility.name}</h3>
                    <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {facility.city}, {facility.state}
                    </p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded', typeColors[facility.assetType] || 'bg-gray-100 text-gray-600')}>
                    {facility.assetType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <div className="text-[var(--color-text-tertiary)] text-xs">Licensed Beds</div>
                    <div className="font-semibold tabular-nums">{facility.licensedBeds}</div>
                  </div>
                  <div>
                    <div className="text-[var(--color-text-tertiary)] text-xs">CMS Rating</div>
                    <div className="font-semibold tabular-nums">{facility.cmsRating ? `${facility.cmsRating}/5` : '—'}</div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  {facility.riskLevel && <RiskBadge level={facility.riskLevel} score={facility.riskScore} showScore size="sm" />}
                  {facility.cmsRating && <QualityRating rating={facility.cmsRating as 1|2|3|4|5} size="sm" />}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Panel */}
      <PreviewPanel
        isOpen={!!selectedFacility}
        onClose={() => setSelectedFacility(null)}
        title={selectedFacility?.name}
        subtitle={selectedFacility ? `${selectedFacility.city}, ${selectedFacility.state}` : undefined}
        detailUrl={selectedFacility ? `/app/facilities/${selectedFacility.id}` : undefined}
        actions={
          selectedFacility && (
            <>
              <button className="btn btn-primary btn-sm flex-1">
                <Target className="w-4 h-4" />
                {selectedFacility.isTarget ? 'View Target' : 'Add to Targets'}
              </button>
              <button className="btn btn-secondary btn-sm flex-1">
                <Plus className="w-4 h-4" />
                Create Deal
              </button>
            </>
          )
        }
      >
        {selectedFacility && <FacilityPreviewContent facility={selectedFacility} />}
      </PreviewPanel>
    </div>
  );
}
