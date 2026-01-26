'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  X,
  ChevronDown,
  Check,
  Star,
  Clock,
  Zap,
  FileCheck,
  Building2,
  MapPin,
  DollarSign,
  TrendingUp,
  Home,
  Stethoscope,
} from 'lucide-react';

type DealStage = 'target' | 'contacted' | 'loi' | 'diligence' | 'psa' | 'closed' | 'dead';
type AssetType = 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';

interface QuickFilter {
  id: string;
  label: string;
  icon: React.ReactNode;
  filter: () => void;
  isActive: boolean;
}

interface DealsFilterBarProps {
  onSearch: (query: string) => void;
  onStageFilter: (stages: DealStage[]) => void;
  onAssetTypeFilter: (types: AssetType[]) => void;
  onStateFilter: (states: string[]) => void;
  onValueFilter: (range: { min?: number; max?: number }) => void;
  selectedStages: DealStage[];
  selectedAssetTypes: AssetType[];
  selectedStates: string[];
  valueRange: { min?: number; max?: number };
  quickFilterActive: string | null;
  onQuickFilter: (filterId: string | null) => void;
  className?: string;
}

const stageConfig: { stage: DealStage; label: string; color: string }[] = [
  { stage: 'target', label: 'Target', color: '#6B7280' },
  { stage: 'contacted', label: 'Contacted', color: '#3B82F6' },
  { stage: 'loi', label: 'LOI', color: '#8B5CF6' },
  { stage: 'diligence', label: 'Diligence', color: '#F59E0B' },
  { stage: 'psa', label: 'PSA', color: '#10B981' },
  { stage: 'closed', label: 'Closed', color: '#14B8A6' },
];

const assetTypeConfig: { type: AssetType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: 'SNF', label: 'SNF', icon: <Building2 className="w-3 h-3" />, color: '#1E40AF' },
  { type: 'ALF', label: 'ALF', icon: <Home className="w-3 h-3" />, color: '#059669' },
  { type: 'ILF', label: 'ILF', icon: <Building2 className="w-3 h-3" />, color: '#7C3AED' },
  { type: 'HOSPICE', label: 'Hospice', icon: <Stethoscope className="w-3 h-3" />, color: '#F59E0B' },
];

const stateAbbreviations = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function DealsFilterBar({
  onSearch,
  onStageFilter,
  onAssetTypeFilter,
  onStateFilter,
  onValueFilter,
  selectedStages,
  selectedAssetTypes,
  selectedStates,
  valueRange,
  quickFilterActive,
  onQuickFilter,
  className,
}: DealsFilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const toggleStage = (stage: DealStage) => {
    if (selectedStages.includes(stage)) {
      onStageFilter(selectedStages.filter((s) => s !== stage));
    } else {
      onStageFilter([...selectedStages, stage]);
    }
  };

  const toggleAssetType = (type: AssetType) => {
    if (selectedAssetTypes.includes(type)) {
      onAssetTypeFilter(selectedAssetTypes.filter((t) => t !== type));
    } else {
      onAssetTypeFilter([...selectedAssetTypes, type]);
    }
  };

  const toggleState = (state: string) => {
    if (selectedStates.includes(state)) {
      onStateFilter(selectedStates.filter((s) => s !== state));
    } else {
      onStateFilter([...selectedStates, state]);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    onSearch('');
    onStageFilter([]);
    onAssetTypeFilter([]);
    onStateFilter([]);
    onValueFilter({});
    onQuickFilter(null);
  };

  const hasActiveFilters =
    searchQuery ||
    selectedStages.length > 0 ||
    selectedAssetTypes.length > 0 ||
    selectedStates.length > 0 ||
    valueRange.min !== undefined ||
    valueRange.max !== undefined ||
    quickFilterActive;

  const quickFilters: QuickFilter[] = [
    {
      id: 'my-deals',
      label: 'My Deals',
      icon: <Star className="w-3.5 h-3.5" />,
      filter: () => onQuickFilter('my-deals'),
      isActive: quickFilterActive === 'my-deals',
    },
    {
      id: 'hot-leads',
      label: 'Hot Leads',
      icon: <Zap className="w-3.5 h-3.5" />,
      filter: () => onQuickFilter('hot-leads'),
      isActive: quickFilterActive === 'hot-leads',
    },
    {
      id: 'due-diligence',
      label: 'Due Diligence',
      icon: <FileCheck className="w-3.5 h-3.5" />,
      filter: () => onQuickFilter('due-diligence'),
      isActive: quickFilterActive === 'due-diligence',
    },
    {
      id: 'closing-soon',
      label: 'Closing Soon',
      icon: <Clock className="w-3.5 h-3.5" />,
      filter: () => onQuickFilter('closing-soon'),
      isActive: quickFilterActive === 'closing-soon',
    },
  ];

  return (
    <div className={cn('space-y-3', className)} ref={dropdownRef}>
      {/* Quick Filter Presets */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
        <span className="text-xs text-surface-500 shrink-0">Quick:</span>
        {quickFilters.map((qf) => (
          <button
            key={qf.id}
            onClick={qf.filter}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all shrink-0',
              qf.isActive
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
          >
            {qf.icon}
            {qf.label}
          </button>
        ))}
      </div>

      {/* Main Filter Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search deals..."
            className="w-full pl-8 pr-8 py-1.5 text-sm bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded"
            >
              <X className="w-3 h-3 text-surface-400" />
            </button>
          )}
        </div>

        {/* Stage Pills - Visual colored pills */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'stage' ? null : 'stage')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              selectedStages.length > 0
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            )}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Stage
            {selectedStages.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary-500 text-white rounded-full text-[10px]">
                {selectedStages.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {openDropdown === 'stage' && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 p-2 min-w-[200px]">
              <div className="space-y-1">
                {stageConfig.map((config) => (
                  <button
                    key={config.stage}
                    onClick={() => toggleStage(config.stage)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                      selectedStages.includes(config.stage)
                        ? 'bg-surface-100 dark:bg-surface-700'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                    )}
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: config.color }}
                    />
                    <span className="flex-1">{config.label}</span>
                    {selectedStages.includes(config.stage) && (
                      <Check className="w-3.5 h-3.5 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Asset Type Filter with Icons */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'assetType' ? null : 'assetType')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              selectedAssetTypes.length > 0
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            Type
            {selectedAssetTypes.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary-500 text-white rounded-full text-[10px]">
                {selectedAssetTypes.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {openDropdown === 'assetType' && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 p-2 min-w-[160px]">
              <div className="space-y-1">
                {assetTypeConfig.map((config) => (
                  <button
                    key={config.type}
                    onClick={() => toggleAssetType(config.type)}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors',
                      selectedAssetTypes.includes(config.type)
                        ? 'bg-surface-100 dark:bg-surface-700'
                        : 'hover:bg-surface-50 dark:hover:bg-surface-700/50'
                    )}
                  >
                    <span style={{ color: config.color }}>{config.icon}</span>
                    <span className="flex-1">{config.label}</span>
                    {selectedAssetTypes.includes(config.type) && (
                      <Check className="w-3.5 h-3.5 text-primary-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* State Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'state' ? null : 'state')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              selectedStates.length > 0
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            )}
          >
            <MapPin className="w-3.5 h-3.5" />
            State
            {selectedStates.length > 0 && (
              <span className="px-1.5 py-0.5 bg-primary-500 text-white rounded-full text-[10px]">
                {selectedStates.length}
              </span>
            )}
            <ChevronDown className="w-3 h-3" />
          </button>

          {openDropdown === 'state' && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 p-2 w-64 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-5 gap-1">
                {stateAbbreviations.map((state) => (
                  <button
                    key={state}
                    onClick={() => toggleState(state)}
                    className={cn(
                      'p-1.5 text-xs font-medium rounded transition-colors',
                      selectedStates.includes(state)
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600'
                    )}
                  >
                    {state}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Value Range Filter */}
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === 'value' ? null : 'value')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors',
              valueRange.min !== undefined || valueRange.max !== undefined
                ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300'
                : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            )}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Value
            <ChevronDown className="w-3 h-3" />
          </button>

          {openDropdown === 'value' && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-surface-800 rounded-lg shadow-lg border border-surface-200 dark:border-surface-700 p-3 w-56">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Min ($M)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={valueRange.min ? valueRange.min / 1000000 : ''}
                    onChange={(e) =>
                      onValueFilter({
                        ...valueRange,
                        min: e.target.value ? Number(e.target.value) * 1000000 : undefined,
                      })
                    }
                    className="w-full px-2 py-1.5 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-md"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 mb-1 block">Max ($M)</label>
                  <input
                    type="number"
                    placeholder="100"
                    value={valueRange.max ? valueRange.max / 1000000 : ''}
                    onChange={(e) =>
                      onValueFilter({
                        ...valueRange,
                        max: e.target.value ? Number(e.target.value) * 1000000 : undefined,
                      })
                    }
                    className="w-full px-2 py-1.5 text-sm bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-md"
                  />
                </div>
                {/* Quick value presets */}
                <div className="flex flex-wrap gap-1 pt-2 border-t border-surface-200 dark:border-surface-700">
                  {[
                    { label: '<$5M', min: undefined, max: 5000000 },
                    { label: '$5-10M', min: 5000000, max: 10000000 },
                    { label: '$10-25M', min: 10000000, max: 25000000 },
                    { label: '>$25M', min: 25000000, max: undefined },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => onValueFilter({ min: preset.min, max: preset.max })}
                      className="px-2 py-0.5 text-[10px] font-medium bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 rounded hover:bg-surface-200 dark:hover:bg-surface-600"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-2 py-1.5 text-xs text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {selectedStages.map((stage) => {
            const config = stageConfig.find((c) => c.stage === stage);
            return (
              <span
                key={stage}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: `${config?.color}20`,
                  color: config?.color,
                }}
              >
                {config?.label}
                <button
                  onClick={() => toggleStage(stage)}
                  className="hover:opacity-70"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
          {selectedAssetTypes.map((type) => {
            const config = assetTypeConfig.find((c) => c.type === type);
            return (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                style={{
                  backgroundColor: `${config?.color}20`,
                  color: config?.color,
                }}
              >
                {config?.icon}
                {config?.label}
                <button
                  onClick={() => toggleAssetType(type)}
                  className="hover:opacity-70"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
          {selectedStates.map((state) => (
            <span
              key={state}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-100 dark:bg-surface-700 rounded-full text-[10px] font-medium text-surface-600 dark:text-surface-400"
            >
              <MapPin className="w-2.5 h-2.5" />
              {state}
              <button
                onClick={() => toggleState(state)}
                className="hover:opacity-70"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {(valueRange.min !== undefined || valueRange.max !== undefined) && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-100 dark:bg-surface-700 rounded-full text-[10px] font-medium text-surface-600 dark:text-surface-400">
              <DollarSign className="w-2.5 h-2.5" />
              {valueRange.min ? `$${valueRange.min / 1000000}M` : '$0'}
              {' - '}
              {valueRange.max ? `$${valueRange.max / 1000000}M` : 'Any'}
              <button
                onClick={() => onValueFilter({})}
                className="hover:opacity-70"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
