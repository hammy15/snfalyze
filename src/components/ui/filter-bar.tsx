'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Check,
  Calendar,
  MapPin,
  Building2,
  Users,
  TrendingUp,
  Star,
  Bookmark,
  Plus,
} from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: 'select' | 'multiselect' | 'range' | 'date' | 'search';
  options?: FilterOption[];
  icon?: React.ReactNode;
  placeholder?: string;
  min?: number;
  max?: number;
}

export interface ActiveFilter {
  id: string;
  value: string | string[] | { min?: number; max?: number } | { start?: Date; end?: Date };
  label: string;
}

interface FilterBarProps {
  filters: FilterConfig[];
  activeFilters: ActiveFilter[];
  onFilterChange: (filters: ActiveFilter[]) => void;
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  savedViews?: { id: string; name: string; filters: ActiveFilter[] }[];
  onSaveView?: (name: string) => void;
  onLoadView?: (viewId: string) => void;
  className?: string;
}

export function FilterBar({
  filters,
  activeFilters,
  onFilterChange,
  onSearch,
  searchPlaceholder = 'Search...',
  savedViews = [],
  onSaveView,
  onLoadView,
  className,
}: FilterBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showSavedViews, setShowSavedViews] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
        setShowSavedViews(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleFilterSelect = (filterId: string, value: string, label: string) => {
    const filter = filters.find((f) => f.id === filterId);
    if (!filter) return;

    if (filter.type === 'multiselect') {
      const existingFilter = activeFilters.find((f) => f.id === filterId);
      if (existingFilter && Array.isArray(existingFilter.value)) {
        const values = existingFilter.value as string[];
        if (values.includes(value)) {
          const newValues = values.filter((v) => v !== value);
          if (newValues.length === 0) {
            onFilterChange(activeFilters.filter((f) => f.id !== filterId));
          } else {
            onFilterChange(
              activeFilters.map((f) =>
                f.id === filterId ? { ...f, value: newValues, label: `${newValues.length} selected` } : f
              )
            );
          }
        } else {
          const newValues = [...values, value];
          onFilterChange(
            activeFilters.map((f) =>
              f.id === filterId ? { ...f, value: newValues, label: `${newValues.length} selected` } : f
            )
          );
        }
      } else {
        onFilterChange([...activeFilters, { id: filterId, value: [value], label: '1 selected' }]);
      }
    } else {
      const existingIndex = activeFilters.findIndex((f) => f.id === filterId);
      if (existingIndex >= 0) {
        onFilterChange(
          activeFilters.map((f, i) => (i === existingIndex ? { id: filterId, value, label } : f))
        );
      } else {
        onFilterChange([...activeFilters, { id: filterId, value, label }]);
      }
      setOpenDropdown(null);
    }
  };

  const handleRangeChange = (filterId: string, type: 'min' | 'max', value: number) => {
    const existingFilter = activeFilters.find((f) => f.id === filterId);
    const currentRange = (existingFilter?.value as { min?: number; max?: number }) || {};
    const newRange = { ...currentRange, [type]: value };

    if (existingFilter) {
      onFilterChange(
        activeFilters.map((f) =>
          f.id === filterId
            ? { ...f, value: newRange, label: `${newRange.min || '0'} - ${newRange.max || '∞'}` }
            : f
        )
      );
    } else {
      onFilterChange([
        ...activeFilters,
        { id: filterId, value: newRange, label: `${newRange.min || '0'} - ${newRange.max || '∞'}` },
      ]);
    }
  };

  const removeFilter = (filterId: string) => {
    onFilterChange(activeFilters.filter((f) => f.id !== filterId));
  };

  const clearAllFilters = () => {
    onFilterChange([]);
    setSearchQuery('');
    onSearch?.('');
  };

  const getFilterValue = (filterId: string) => {
    return activeFilters.find((f) => f.id === filterId)?.value;
  };

  const isValueSelected = (filterId: string, value: string) => {
    const filterValue = getFilterValue(filterId);
    if (Array.isArray(filterValue)) {
      return filterValue.includes(value);
    }
    return filterValue === value;
  };

  return (
    <div className={cn('space-y-3', className)} ref={dropdownRef}>
      {/* Main Filter Row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search Input */}
        {onSearch && (
          <div className="relative flex-1 min-w-[280px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-disabled)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="input pl-10 pr-4 py-2.5 w-full text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--gray-100)] rounded"
              >
                <X className="w-3.5 h-3.5 text-[var(--color-text-tertiary)]" />
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        {onSearch && filters.length > 0 && (
          <div className="h-6 w-px bg-surface-200 dark:bg-surface-700 hidden sm:block" />
        )}

        {/* Filter Dropdowns */}
        {filters.map((filter) => (
          <div key={filter.id} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === filter.id ? null : filter.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors',
                getFilterValue(filter.id)
                  ? 'bg-[var(--accent-light)] border-[var(--accent-solid)] text-[var(--accent-solid)]'
                  : 'bg-white dark:bg-surface-800 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700'
              )}
            >
              {filter.icon}
              <span>{filter.label}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {openDropdown === filter.id && (
              <div className="dropdown-menu z-30 w-56 mt-1">
                {filter.type === 'range' ? (
                  <div className="p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        min={filter.min}
                        max={filter.max}
                        value={(getFilterValue(filter.id) as { min?: number })?.min || ''}
                        onChange={(e) => handleRangeChange(filter.id, 'min', Number(e.target.value))}
                        className="input input-sm flex-1"
                      />
                      <span className="text-[var(--color-text-tertiary)]">–</span>
                      <input
                        type="number"
                        placeholder="Max"
                        min={filter.min}
                        max={filter.max}
                        value={(getFilterValue(filter.id) as { max?: number })?.max || ''}
                        onChange={(e) => handleRangeChange(filter.id, 'max', Number(e.target.value))}
                        className="input input-sm flex-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {filter.options?.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleFilterSelect(filter.id, option.value, option.label)}
                        className="dropdown-item w-full text-left"
                      >
                        {filter.type === 'multiselect' && (
                          <span
                            className={cn(
                              'w-4 h-4 rounded border flex items-center justify-center mr-2',
                              isValueSelected(filter.id, option.value)
                                ? 'bg-[var(--accent-solid)] border-[var(--accent-solid)]'
                                : 'border-[var(--color-border-default)]'
                            )}
                          >
                            {isValueSelected(filter.id, option.value) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </span>
                        )}
                        <span className="flex-1">{option.label}</span>
                        {option.count !== undefined && (
                          <span className="text-xs text-[var(--color-text-tertiary)]">{option.count}</span>
                        )}
                        {filter.type === 'select' && isValueSelected(filter.id, option.value) && (
                          <Check className="w-4 h-4 text-[var(--accent-solid)]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Saved Views */}
        {(savedViews.length > 0 || onSaveView) && (
          <div className="relative ml-auto">
            <button
              onClick={() => setShowSavedViews(!showSavedViews)}
              className="btn btn-ghost btn-sm"
            >
              <Bookmark className="w-4 h-4" />
              Views
              <ChevronDown className="w-3 h-3" />
            </button>

            {showSavedViews && (
              <div className="dropdown-menu right-0 left-auto z-30 w-48 mt-1">
                {savedViews.length > 0 && (
                  <div className="py-1">
                    {savedViews.map((view) => (
                      <button
                        key={view.id}
                        onClick={() => {
                          onLoadView?.(view.id);
                          setShowSavedViews(false);
                        }}
                        className="dropdown-item w-full text-left"
                      >
                        <Star className="w-4 h-4" />
                        {view.name}
                      </button>
                    ))}
                  </div>
                )}
                {onSaveView && (
                  <>
                    {savedViews.length > 0 && (
                      <div className="border-t border-[var(--color-border-muted)]" />
                    )}
                    <div className="py-1">
                      <button
                        onClick={() => {
                          const name = prompt('Enter view name:');
                          if (name) {
                            onSaveView(name);
                            setShowSavedViews(false);
                          }
                        }}
                        className="dropdown-item w-full text-left text-[var(--accent-solid)]"
                      >
                        <Plus className="w-4 h-4" />
                        Save current view
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Filters Pills */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[var(--color-text-tertiary)]">Active filters:</span>
          {activeFilters.map((filter) => {
            const filterConfig = filters.find((f) => f.id === filter.id);
            return (
              <span
                key={filter.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--accent-light)] text-[var(--accent-solid)] text-xs font-medium rounded-full"
              >
                {filterConfig?.label}: {filter.label}
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="hover:bg-[var(--accent-solid)] hover:text-white rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
          <button
            onClick={clearAllFilters}
            className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

// Pre-built filter configurations for common use cases
export const facilityFilters: FilterConfig[] = [
  {
    id: 'state',
    label: 'State',
    type: 'multiselect',
    icon: <MapPin className="w-4 h-4" />,
    options: [
      { value: 'CA', label: 'California', count: 847 },
      { value: 'TX', label: 'Texas', count: 623 },
      { value: 'FL', label: 'Florida', count: 512 },
      { value: 'NY', label: 'New York', count: 398 },
      { value: 'PA', label: 'Pennsylvania', count: 287 },
      { value: 'OH', label: 'Ohio', count: 245 },
      { value: 'IL', label: 'Illinois', count: 198 },
      { value: 'WA', label: 'Washington', count: 156 },
      { value: 'OR', label: 'Oregon', count: 89 },
    ],
  },
  {
    id: 'type',
    label: 'Type',
    type: 'multiselect',
    icon: <Building2 className="w-4 h-4" />,
    options: [
      { value: 'snf', label: 'SNF', count: 1847 },
      { value: 'alf', label: 'ALF', count: 623 },
      { value: 'ilf', label: 'ILF', count: 312 },
      { value: 'hospice', label: 'Hospice', count: 124 },
      { value: 'ccrc', label: 'CCRC', count: 65 },
    ],
  },
  {
    id: 'beds',
    label: 'Beds',
    type: 'range',
    icon: <Users className="w-4 h-4" />,
    min: 0,
    max: 500,
  },
  {
    id: 'risk',
    label: 'Risk Level',
    type: 'multiselect',
    icon: <TrendingUp className="w-4 h-4" />,
    options: [
      { value: 'low', label: 'Low Risk', count: 1245 },
      { value: 'medium', label: 'Medium Risk', count: 987 },
      { value: 'high', label: 'High Risk', count: 615 },
    ],
  },
];

export const dealFilters: FilterConfig[] = [
  {
    id: 'stage',
    label: 'Stage',
    type: 'multiselect',
    options: [
      { value: 'target', label: 'Target', count: 45 },
      { value: 'contacted', label: 'Contacted', count: 23 },
      { value: 'loi', label: 'LOI', count: 12 },
      { value: 'diligence', label: 'Diligence', count: 8 },
      { value: 'psa', label: 'PSA', count: 4 },
      { value: 'closed', label: 'Closed', count: 15 },
    ],
  },
  {
    id: 'assetType',
    label: 'Asset Type',
    type: 'multiselect',
    icon: <Building2 className="w-4 h-4" />,
    options: [
      { value: 'SNF', label: 'SNF' },
      { value: 'ALF', label: 'ALF' },
      { value: 'ILF', label: 'ILF' },
      { value: 'HOSPICE', label: 'Hospice' },
    ],
  },
  {
    id: 'assignee',
    label: 'Assignee',
    type: 'multiselect',
    options: [
      { value: 'sarah', label: 'Sarah Chen', count: 23 },
      { value: 'mike', label: 'Mike Rodriguez', count: 18 },
      { value: 'you', label: 'Me', count: 12 },
    ],
  },
  {
    id: 'value',
    label: 'Deal Value',
    type: 'range',
    min: 0,
    max: 100000000,
  },
];
