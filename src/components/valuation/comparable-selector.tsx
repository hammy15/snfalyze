'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import type { ComparableSale } from '@/lib/valuation/types';
import { Check, X, Search, Building2, MapPin, Calendar, DollarSign } from 'lucide-react';

interface ComparableSelectorProps {
  comparables: ComparableSale[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  subjectProperty?: {
    beds: number;
    state: string;
    assetType: 'SNF' | 'ALF' | 'ILF';
  };
  maxSelections?: number;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function calculateSimilarity(
  comp: ComparableSale,
  subject?: { beds: number; state: string; assetType: 'SNF' | 'ALF' | 'ILF' }
): number {
  if (!subject) return 50;

  let score = 50;

  // Bed count similarity (up to 25 points)
  const bedDiff = Math.abs(comp.beds - subject.beds) / subject.beds;
  score += Math.max(0, 25 - bedDiff * 50);

  // Same state (15 points)
  if (comp.state === subject.state) score += 15;

  // Same asset type (10 points)
  if (comp.assetType === subject.assetType) score += 10;

  return Math.round(Math.min(100, score));
}

function SimilarityBadge({ score }: { score: number }) {
  const color =
    score >= 80
      ? 'bg-green-100 text-green-700'
      : score >= 60
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700';

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {score}% match
    </span>
  );
}

export function ComparableSelector({
  comparables,
  selectedIds,
  onSelectionChange,
  subjectProperty,
  maxSelections = 10,
  className,
}: ComparableSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('');
  const [assetTypeFilter, setAssetTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'similarity' | 'date' | 'price'>('similarity');

  // Get unique states and asset types for filters
  const states = useMemo(
    () => [...new Set(comparables.map((c) => c.state))].sort(),
    [comparables]
  );
  const assetTypes = useMemo(
    () => [...new Set(comparables.map((c) => c.assetType))],
    [comparables]
  );

  // Filter and sort comparables
  const filteredComparables = useMemo(() => {
    let filtered = comparables.filter((comp) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !comp.propertyName.toLowerCase().includes(query) &&
          !comp.state.toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (stateFilter && comp.state !== stateFilter) return false;
      if (assetTypeFilter && comp.assetType !== assetTypeFilter) return false;
      return true;
    });

    // Add similarity scores
    const withSimilarity = filtered.map((comp) => ({
      ...comp,
      similarity: calculateSimilarity(comp, subjectProperty),
    }));

    // Sort
    switch (sortBy) {
      case 'similarity':
        withSimilarity.sort((a, b) => b.similarity - a.similarity);
        break;
      case 'date':
        withSimilarity.sort(
          (a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()
        );
        break;
      case 'price':
        withSimilarity.sort((a, b) => b.salePrice - a.salePrice);
        break;
    }

    return withSimilarity;
  }, [comparables, searchQuery, stateFilter, assetTypeFilter, sortBy, subjectProperty]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < maxSelections) {
      onSelectionChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    const ids = filteredComparables.slice(0, maxSelections).map((c) => c.id);
    onSelectionChange(ids);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--color-text-secondary)]">
          {selectedIds.length} of {maxSelections} comparables selected
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={selectAll}
            className="text-xs text-[var(--accent-solid)] hover:underline"
          >
            Select top {maxSelections}
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-red-600 hover:underline"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)] focus:border-transparent"
          />
        </div>

        {/* State filter */}
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
        >
          <option value="">All States</option>
          {states.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </select>

        {/* Asset type filter */}
        <select
          value={assetTypeFilter}
          onChange={(e) => setAssetTypeFilter(e.target.value)}
          className="px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
        >
          <option value="">All Types</option>
          {assetTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'similarity' | 'date' | 'price')}
          className="px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
        >
          <option value="similarity">Sort by Similarity</option>
          <option value="date">Sort by Date</option>
          <option value="price">Sort by Price</option>
        </select>
      </div>

      {/* Comparables list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredComparables.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-tertiary)]">
            No comparables match your filters
          </div>
        ) : (
          filteredComparables.map((comp) => {
            const isSelected = selectedIds.includes(comp.id);

            return (
              <button
                key={comp.id}
                type="button"
                onClick={() => toggleSelection(comp.id)}
                className={cn(
                  'w-full card p-4 text-left transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-[var(--accent-solid)] bg-[var(--accent-bg)]'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-[var(--color-text-primary)] truncate">
                        {comp.propertyName}
                      </span>
                      <span className="px-2 py-0.5 rounded text-xs bg-[var(--gray-100)] text-[var(--color-text-secondary)]">
                        {comp.assetType}
                      </span>
                      <SimilarityBadge score={comp.similarity} />
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--color-text-tertiary)]">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {comp.state}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {comp.beds} beds
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(comp.saleDate)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(comp.salePrice)}
                    </div>
                    <div className="text-xs text-[var(--color-text-tertiary)]">
                      {formatCurrency(comp.pricePerBed)}/bed
                    </div>
                    {comp.capRate && (
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {(comp.capRate * 100).toFixed(2)}% cap
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                      isSelected
                        ? 'border-[var(--accent-solid)] bg-[var(--accent-solid)]'
                        : 'border-[var(--color-border-default)]'
                    )}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Selected summary */}
      {selectedIds.length > 0 && (
        <div className="border-t border-[var(--color-border-default)] pt-4">
          <div className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Selected Comparables
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedIds.map((id) => {
              const comp = comparables.find((c) => c.id === id);
              if (!comp) return null;

              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--accent-bg)] text-sm text-[var(--accent-solid)]"
                >
                  {comp.propertyName}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelection(id);
                    }}
                    className="hover:bg-[var(--accent-solid)] hover:text-white rounded-full p-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
