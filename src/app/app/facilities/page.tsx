'use client';

import { useState, useMemo } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock facility data
const mockFacilities = [
  {
    id: '1',
    name: 'Sunrise Care Center',
    address: '1234 Healthcare Ave',
    city: 'Los Angeles',
    state: 'CA',
    zip: '90210',
    type: 'snf' as const,
    beds: 120,
    occupancy: 87,
    riskLevel: 'high' as const,
    riskScore: 78,
    qualityRating: 3 as const,
    owner: 'ABC Healthcare Holdings',
    operator: 'Sunrise Operations LLC',
    phone: '(310) 555-1234',
    website: 'https://sunrisecare.example.com',
    lastSurvey: new Date('2024-01-15'),
    deficiencies: 8,
    isTarget: true,
  },
  {
    id: '2',
    name: 'Valley View SNF',
    address: '567 Valley Rd',
    city: 'San Diego',
    state: 'CA',
    zip: '92101',
    type: 'snf' as const,
    beds: 85,
    occupancy: 92,
    riskLevel: 'medium' as const,
    riskScore: 58,
    qualityRating: 4 as const,
    owner: 'Valley Health Partners',
    operator: 'Valley View Operations',
    phone: '(619) 555-5678',
    website: 'https://valleyview.example.com',
    lastSurvey: new Date('2024-02-20'),
    deficiencies: 3,
    isTarget: false,
  },
  {
    id: '3',
    name: 'Harbor Health Facility',
    address: '890 Harbor Blvd',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    type: 'snf' as const,
    beds: 150,
    occupancy: 78,
    riskLevel: 'low' as const,
    riskScore: 32,
    qualityRating: 5 as const,
    owner: 'XYZ Capital',
    operator: 'Harbor Health Management',
    phone: '(415) 555-9012',
    website: 'https://harborhealth.example.com',
    lastSurvey: new Date('2024-03-10'),
    deficiencies: 1,
    isTarget: true,
  },
  {
    id: '4',
    name: 'Desert Palms SNF',
    address: '234 Palm Desert Way',
    city: 'Phoenix',
    state: 'AZ',
    zip: '85001',
    type: 'snf' as const,
    beds: 95,
    occupancy: 81,
    riskLevel: 'high' as const,
    riskScore: 72,
    qualityRating: 2 as const,
    owner: 'Desert Healthcare Inc',
    operator: 'Desert Palms Management',
    phone: '(602) 555-3456',
    website: 'https://desertpalms.example.com',
    lastSurvey: new Date('2024-01-28'),
    deficiencies: 12,
    isTarget: false,
  },
  {
    id: '5',
    name: 'Mountain View ALF',
    address: '456 Mountain View Dr',
    city: 'Denver',
    state: 'CO',
    zip: '80202',
    type: 'alf' as const,
    beds: 65,
    occupancy: 95,
    riskLevel: 'low' as const,
    riskScore: 28,
    qualityRating: 5 as const,
    owner: 'Mountain Healthcare Group',
    operator: 'Mountain View Senior Living',
    phone: '(303) 555-7890',
    website: 'https://mountainview.example.com',
    lastSurvey: new Date('2024-02-05'),
    deficiencies: 0,
    isTarget: true,
  },
  {
    id: '6',
    name: 'Lakeside Senior Living',
    address: '789 Lake Shore Dr',
    city: 'Seattle',
    state: 'WA',
    zip: '98101',
    type: 'ilf' as const,
    beds: 110,
    occupancy: 89,
    riskLevel: 'medium' as const,
    riskScore: 45,
    qualityRating: 4 as const,
    owner: 'Lakeside Holdings LLC',
    operator: 'Lakeside Senior Management',
    phone: '(206) 555-2345',
    website: 'https://lakeside.example.com',
    lastSurvey: new Date('2024-03-01'),
    deficiencies: 4,
    isTarget: false,
  },
  {
    id: '7',
    name: 'Evergreen Care Home',
    address: '321 Evergreen Terrace',
    city: 'Portland',
    state: 'OR',
    zip: '97201',
    type: 'snf' as const,
    beds: 75,
    occupancy: 84,
    riskLevel: 'low' as const,
    riskScore: 35,
    qualityRating: 4 as const,
    owner: 'Evergreen Healthcare',
    operator: 'Evergreen Operations',
    phone: '(503) 555-6789',
    website: 'https://evergreencare.example.com',
    lastSurvey: new Date('2024-02-15'),
    deficiencies: 2,
    isTarget: false,
  },
  {
    id: '8',
    name: 'Golden State SNF',
    address: '654 Golden Gate Ave',
    city: 'Oakland',
    state: 'CA',
    zip: '94612',
    type: 'snf' as const,
    beds: 130,
    occupancy: 76,
    riskLevel: 'medium' as const,
    riskScore: 52,
    qualityRating: 3 as const,
    owner: 'Golden State Healthcare',
    operator: 'Golden State Operations',
    phone: '(510) 555-0123',
    website: 'https://goldenstatesnf.example.com',
    lastSurvey: new Date('2024-01-20'),
    deficiencies: 6,
    isTarget: true,
  },
];

type Facility = typeof mockFacilities[0];

export default function FacilitiesPage() {
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...mockFacilities];

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
  }, [mockFacilities, searchQuery, activeFilters, sortColumn, sortDirection]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const highRisk = filteredData.filter((f) => f.riskLevel === 'high').length;
    const targets = filteredData.filter((f) => f.isTarget).length;
    const avgOccupancy = Math.round(
      filteredData.reduce((sum, f) => sum + f.occupancy, 0) / filteredData.length
    );
    return { total: filteredData.length, highRisk, targets, avgOccupancy };
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
      id: 'type',
      header: 'Type',
      accessor: 'type',
      sortable: true,
      width: 80,
      cell: (value) => (
        <span className="uppercase text-xs font-medium text-[var(--color-text-secondary)]">
          {value}
        </span>
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
                value >= 90 ? 'bg-[var(--status-success-icon)]' :
                value >= 75 ? 'bg-[var(--status-warning-icon)]' :
                'bg-[var(--status-error-icon)]'
              )}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="tabular-nums text-xs">{value}%</span>
        </div>
      ),
    },
    {
      id: 'riskLevel',
      header: 'Risk',
      accessor: 'riskLevel',
      sortable: true,
      width: 100,
      cell: (value, row) => <RiskBadge level={value} score={row.riskScore} showScore size="sm" />,
    },
    {
      id: 'qualityRating',
      header: 'Quality',
      accessor: 'qualityRating',
      sortable: true,
      width: 120,
      cell: (value) => <QualityRating rating={value} size="sm" />,
    },
    {
      id: 'owner',
      header: 'Owner',
      accessor: 'owner',
      sortable: true,
      minWidth: 150,
      cell: (value) => (
        <span className="text-sm text-[var(--color-text-secondary)] truncate block max-w-[200px]">
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Facility Explorer</h1>
            <p className="page-header-subtitle">
              Browse and analyze {stats.total.toLocaleString()} facilities across your tracked markets.
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
          label="Active Targets"
          value={stats.targets}
          icon={<Target className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="High Risk"
          value={stats.highRisk}
          icon={<AlertTriangle className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Avg Occupancy"
          value={stats.avgOccupancy}
          format="percent"
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
          {filteredData.map((facility) => (
            <div
              key={facility.id}
              onClick={() => handleRowClick(facility)}
              className={cn(
                'card p-4 cursor-pointer transition-all hover:shadow-md',
                selectedFacility?.id === facility.id && 'ring-2 ring-[var(--accent-solid)]'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-medium text-[var(--color-text-primary)]">{facility.name}</h3>
                  <p className="text-xs text-[var(--color-text-tertiary)] flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {facility.city}, {facility.state}
                  </p>
                </div>
                <span className="uppercase text-xs font-medium text-[var(--color-text-disabled)] bg-[var(--gray-100)] px-2 py-0.5 rounded">
                  {facility.type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <div className="text-[var(--color-text-tertiary)] text-xs">Beds</div>
                  <div className="font-medium tabular-nums">{facility.beds}</div>
                </div>
                <div>
                  <div className="text-[var(--color-text-tertiary)] text-xs">Occupancy</div>
                  <div className="font-medium tabular-nums">{facility.occupancy}%</div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <RiskBadge level={facility.riskLevel} score={facility.riskScore} showScore size="sm" />
                <QualityRating rating={facility.qualityRating} size="sm" />
              </div>
            </div>
          ))}
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
