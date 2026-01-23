'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ProviderCard, ProviderSearchResult } from './provider-card';
import {
  X,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  Check,
} from 'lucide-react';
import type { NormalizedProviderData, ProviderSearchResult as SearchResult } from '@/lib/cms';

interface CMSImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (provider: NormalizedProviderData) => void;
  initialCCN?: string;
}

type Step = 'search' | 'preview' | 'confirm';

export function CMSImportModal({
  open,
  onOpenChange,
  onImport,
  initialCCN,
}: CMSImportModalProps) {
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [ccnInput, setCcnInput] = useState(initialCCN || '');
  const [stateFilter, setStateFilter] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<NormalizedProviderData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (open) {
      setStep('search');
      setSearchQuery('');
      setCcnInput(initialCCN || '');
      setStateFilter('');
      setSearchResults([]);
      setSelectedProvider(null);
      setError(null);
    }
  }, [open, initialCCN]);

  // Auto-search if initialCCN provided
  useEffect(() => {
    if (open && initialCCN) {
      handleCCNLookup();
    }
  }, [open, initialCCN]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setError('Please enter at least 2 characters to search');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (stateFilter) params.set('state', stateFilter);

      const response = await fetch(`/api/cms/search?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Search failed');
      }

      setSearchResults(data.data);
      if (data.data.length === 0) {
        setError('No providers found matching your search');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search providers');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, stateFilter]);

  const handleCCNLookup = useCallback(async () => {
    const ccn = ccnInput.trim();
    if (!ccn) {
      setError('Please enter a CCN');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cms/provider/${encodeURIComponent(ccn)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Provider not found');
      }

      setSelectedProvider(data.data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to look up provider');
    } finally {
      setIsLoading(false);
    }
  }, [ccnInput]);

  const handleSelectSearchResult = useCallback(async (result: SearchResult) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/cms/provider/${encodeURIComponent(result.ccn)}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Provider not found');
      }

      setSelectedProvider(data.data);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider details');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImport = useCallback(() => {
    if (selectedProvider) {
      onImport(selectedProvider);
      onOpenChange(false);
    }
  }, [selectedProvider, onImport, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border-default)]">
          <div className="flex items-center gap-3">
            {step !== 'search' && (
              <button
                onClick={() => {
                  if (step === 'confirm') setStep('preview');
                  else setStep('search');
                }}
                className="p-1 hover:bg-[var(--gray-100)] rounded transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
              {step === 'search' && 'Import CMS Data'}
              {step === 'preview' && 'Provider Details'}
              {step === 'confirm' && 'Confirm Import'}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-[var(--gray-100)] rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'search' && (
            <div className="space-y-6">
              {/* CCN Lookup */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                  Look up by CCN (CMS Certification Number)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ccnInput}
                    onChange={(e) => setCcnInput(e.target.value)}
                    placeholder="Enter 6-digit CCN (e.g., 055001)"
                    className="input flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleCCNLookup()}
                  />
                  <button
                    onClick={handleCCNLookup}
                    disabled={isLoading || !ccnInput.trim()}
                    className="btn btn-primary"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Look Up'
                    )}
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--color-border-default)]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-sm text-[var(--color-text-tertiary)]">
                    or search by name
                  </span>
                </div>
              </div>

              {/* Search */}
              <div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-tertiary)]" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by facility name..."
                      className="input pl-10 w-full"
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="input w-24"
                  >
                    <option value="">State</option>
                    {US_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleSearch}
                    disabled={isLoading || !searchQuery.trim()}
                    className="btn btn-secondary"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-[var(--color-border-default)] rounded-lg overflow-hidden">
                  <div className="text-xs font-medium text-[var(--color-text-tertiary)] px-4 py-2 bg-[var(--gray-50)] border-b border-[var(--color-border-default)]">
                    {searchResults.length} results found
                  </div>
                  <div className="max-h-80 overflow-auto">
                    {searchResults.map((result) => (
                      <ProviderSearchResult
                        key={result.ccn}
                        {...result}
                        onSelect={() => handleSelectSearchResult(result)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'preview' && selectedProvider && (
            <div className="space-y-4">
              <ProviderCard provider={selectedProvider} variant="full" />
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'preview' && selectedProvider && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--color-border-default)] bg-[var(--gray-50)]">
            <button
              onClick={() => setStep('search')}
              className="btn btn-secondary"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              className="btn btn-primary"
            >
              <Check className="w-4 h-4" />
              Import Provider Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI',
];
