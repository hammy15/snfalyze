'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { MethodSelector } from './method-selector';
import { ValuationComparison, ValuationDetailPanel } from './valuation-comparison';
import { SensitivityTable } from './sensitivity-table';
import { ComparableSelector } from './comparable-selector';
import { runValuation } from '@/lib/valuation/valuation-engine';
import type {
  ValuationMethod,
  ValuationInput,
  ValuationSummary,
  ComparableSale,
} from '@/lib/valuation/types';
import { Calculator, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface ValuationPanelProps {
  facility: {
    id: string;
    name: string;
    beds: number;
    state: string;
    assetType: 'SNF' | 'ALF' | 'ILF';
    yearBuilt?: number;
    cmsRating?: number;
    occupancy?: number;
  };
  financials?: {
    noi?: number;
    ebitdar?: number;
    revenue?: number;
    expenses?: number;
  };
  marketData?: {
    marketCapRate?: number;
    marketPricePerBed?: number;
    noiMultiple?: number;
  };
  comparables?: ComparableSale[];
  onValuationComplete?: (summary: ValuationSummary) => void;
  className?: string;
}

export function ValuationPanel({
  facility,
  financials,
  marketData,
  comparables = [],
  onValuationComplete,
  className,
}: ValuationPanelProps) {
  const [selectedMethods, setSelectedMethods] = useState<ValuationMethod[]>([
    'cap_rate',
    'price_per_bed',
    'dcf',
  ]);
  const [selectedComparableIds, setSelectedComparableIds] = useState<string[]>([]);
  const [selectedResultMethod, setSelectedResultMethod] = useState<string | null>(null);
  const [showSensitivity, setShowSensitivity] = useState(false);
  const [showComparables, setShowComparables] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [valuationResult, setValuationResult] = useState<ValuationSummary | null>(null);

  // Determine which methods are available based on inputs
  const availableMethods = useMemo(() => {
    const methods: ValuationMethod[] = ['price_per_bed'];

    if (financials?.noi || financials?.ebitdar) {
      methods.push('cap_rate', 'dcf', 'noi_multiple');
    }

    if (comparables.length >= 3) {
      methods.push('comparable_sales');
    }

    return methods;
  }, [financials, comparables]);

  const disabledMethods = useMemo(() => {
    const all: ValuationMethod[] = [
      'cap_rate',
      'price_per_bed',
      'comparable_sales',
      'dcf',
      'noi_multiple',
      'proprietary',
    ];
    return all.filter((m) => !availableMethods.includes(m));
  }, [availableMethods]);

  // Build valuation input
  const buildInput = useCallback((): ValuationInput => {
    return {
      beds: facility.beds,
      assetType: facility.assetType,
      state: facility.state,
      yearBuilt: facility.yearBuilt,
      cmsRating: facility.cmsRating as 1 | 2 | 3 | 4 | 5 | undefined,
      occupancy: facility.occupancy,
      noi: financials?.noi,
      ebitdar: financials?.ebitdar,
      revenue: financials?.revenue,
      marketCapRate: marketData?.marketCapRate,
      marketPricePerBed: marketData?.marketPricePerBed,
      noiMultiple: marketData?.noiMultiple,
    };
  }, [facility, financials, marketData]);

  // Run valuation
  const runValuationAnalysis = useCallback(async () => {
    setIsRunning(true);
    setError(null);

    try {
      const input = buildInput();
      const selectedComparables = comparables.filter((c) =>
        selectedComparableIds.includes(c.id)
      );

      const result = runValuation(input, {
        methods: selectedMethods,
        comparables: selectedComparables.length >= 3 ? selectedComparables : undefined,
      });

      setValuationResult(result);
      onValuationComplete?.(result);

      // Auto-select first method for detail view
      if (result.methods.length > 0 && !selectedResultMethod) {
        setSelectedResultMethod(result.methods[0].method);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Valuation failed');
    } finally {
      setIsRunning(false);
    }
  }, [
    buildInput,
    selectedMethods,
    comparables,
    selectedComparableIds,
    onValuationComplete,
    selectedResultMethod,
  ]);

  // Get selected result details
  const selectedResult = useMemo(() => {
    if (!valuationResult || !selectedResultMethod) return null;
    return valuationResult.methods.find((m) => m.method === selectedResultMethod);
  }, [valuationResult, selectedResultMethod]);

  // Get base cap rate result for sensitivity
  const capRateResult = useMemo(() => {
    return valuationResult?.methods.find((m) => m.method === 'cap_rate');
  }, [valuationResult]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Method Selection */}
      <div className="card p-6">
        <MethodSelector
          selectedMethods={selectedMethods}
          onMethodsChange={setSelectedMethods}
          availableMethods={availableMethods}
          disabledMethods={disabledMethods}
        />

        {/* Comparable sales section */}
        {availableMethods.includes('comparable_sales') && (
          <div className="mt-4 pt-4 border-t border-[var(--color-border-default)]">
            <button
              type="button"
              onClick={() => setShowComparables(!showComparables)}
              className="flex items-center justify-between w-full text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            >
              <span>Select Comparable Sales ({selectedComparableIds.length} selected)</span>
              {showComparables ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showComparables && (
              <div className="mt-4">
                <ComparableSelector
                  comparables={comparables}
                  selectedIds={selectedComparableIds}
                  onSelectionChange={setSelectedComparableIds}
                  subjectProperty={{
                    beds: facility.beds,
                    state: facility.state,
                    assetType: facility.assetType,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Run button */}
        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            onClick={runValuationAnalysis}
            disabled={selectedMethods.length === 0 || isRunning}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
              'bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)]',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isRunning ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Calculator className="w-4 h-4" />
            )}
            {isRunning ? 'Running...' : 'Run Valuation'}
          </button>

          {selectedMethods.length === 0 && (
            <span className="text-sm text-[var(--color-text-tertiary)]">
              Select at least one method
            </span>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
      </div>

      {/* Results */}
      {valuationResult && (
        <>
          {/* Summary comparison */}
          <ValuationComparison
            summary={valuationResult}
            selectedMethod={selectedResultMethod || undefined}
            onSelectMethod={setSelectedResultMethod}
          />

          {/* Selected method details */}
          {selectedResult && (
            <ValuationDetailPanel result={selectedResult} />
          )}

          {/* Sensitivity Analysis */}
          {capRateResult && financials?.noi && (
            <div className="card p-6">
              <button
                type="button"
                onClick={() => setShowSensitivity(!showSensitivity)}
                className="flex items-center justify-between w-full text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-4"
              >
                <span>Cap Rate Sensitivity Analysis</span>
                {showSensitivity ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showSensitivity && (
                <SensitivityTable
                  noi={financials.noi}
                  baseCapRate={capRateResult.inputsUsed.marketCapRate || 0.10}
                  baseValue={capRateResult.value}
                />
              )}
            </div>
          )}
        </>
      )}

      {/* Input summary */}
      <div className="card p-6">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
          Valuation Inputs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-[var(--color-text-tertiary)]">Beds</div>
            <div className="font-medium text-[var(--color-text-primary)]">{facility.beds}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-tertiary)]">Asset Type</div>
            <div className="font-medium text-[var(--color-text-primary)]">{facility.assetType}</div>
          </div>
          <div>
            <div className="text-[var(--color-text-tertiary)]">State</div>
            <div className="font-medium text-[var(--color-text-primary)]">{facility.state}</div>
          </div>
          {facility.cmsRating && (
            <div>
              <div className="text-[var(--color-text-tertiary)]">CMS Rating</div>
              <div className="font-medium text-[var(--color-text-primary)]">
                {facility.cmsRating} Star
              </div>
            </div>
          )}
          {facility.occupancy && (
            <div>
              <div className="text-[var(--color-text-tertiary)]">Occupancy</div>
              <div className="font-medium text-[var(--color-text-primary)]">
                {(facility.occupancy * 100).toFixed(1)}%
              </div>
            </div>
          )}
          {financials?.noi && (
            <div>
              <div className="text-[var(--color-text-tertiary)]">NOI</div>
              <div className="font-medium text-[var(--color-text-primary)]">
                ${financials.noi.toLocaleString()}
              </div>
            </div>
          )}
          {financials?.revenue && (
            <div>
              <div className="text-[var(--color-text-tertiary)]">Revenue</div>
              <div className="font-medium text-[var(--color-text-primary)]">
                ${financials.revenue.toLocaleString()}
              </div>
            </div>
          )}
          {marketData?.marketCapRate && (
            <div>
              <div className="text-[var(--color-text-tertiary)]">Market Cap Rate</div>
              <div className="font-medium text-[var(--color-text-primary)]">
                {(marketData.marketCapRate * 100).toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
