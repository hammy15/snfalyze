'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowLeftRight,
  Plus,
  X,
  TrendingUp,
  Building2,
  DollarSign,
  Star,
  Shield,
  Loader2,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface DealSummary {
  id: string;
  name: string;
  dealId: string;
  assetTypes: string[];
  facilityCount: number;
  totalBeds: number;
  askingPrice: number;
  states: string[];
  status: string;
  score?: number;
  confidence?: number;
  valuationLow?: number;
  valuationMid?: number;
  valuationHigh?: number;
  pricePerBed?: number;
  coverage?: number;
}

interface DealComparisonProps {
  initialDealIds?: string[];
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  if (!value) return '—';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DealComparison({ initialDealIds = [] }: DealComparisonProps) {
  const [deals, setDeals] = useState<DealSummary[]>([]);
  const [availableDeals, setAvailableDeals] = useState<DealSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);

  // Fetch all deals for the picker
  useEffect(() => {
    async function fetchDeals() {
      try {
        const response = await fetch('/api/deals');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const summaries: DealSummary[] = data.data.map((d: any) => ({
              id: d.id,
              name: d.name,
              dealId: d.dealId || `CAS-${d.id.slice(0, 4).toUpperCase()}`,
              assetTypes: d.assetTypes || [],
              facilityCount: d.facilities?.length || d.facilityCount || 1,
              totalBeds: d.beds || d.totalBeds || 0,
              askingPrice: d.askingPrice || 0,
              states: d.primaryState ? [d.primaryState] : [],
              status: d.status || 'active',
            }));
            setAvailableDeals(summaries);

            // Auto-add initial deals
            if (initialDealIds.length > 0) {
              const initial = summaries.filter((d) => initialDealIds.includes(d.id));
              setDeals(initial);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch deals:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDeals();
  }, [initialDealIds]);

  // Fetch deal details (score, valuation) for selected deals
  useEffect(() => {
    async function fetchDealDetails() {
      const updatedDeals = await Promise.all(
        deals.map(async (deal) => {
          if (deal.score !== undefined) return deal; // Already fetched

          try {
            // Fetch score
            const scoreRes = await fetch(`/api/deals/${deal.id}/score`);
            let score, confidence;
            if (scoreRes.ok) {
              const scoreData = await scoreRes.json();
              if (scoreData.success) {
                score = scoreData.data.portfolioScore;
                confidence = scoreData.data.confidenceScore;
              }
            }

            // Fetch rent suggestions for valuation
            const rentRes = await fetch(`/api/deals/${deal.id}/rent-suggestions`);
            let valuationLow, valuationMid, valuationHigh, pricePerBed, coverage;
            if (rentRes.ok) {
              const rentData = await rentRes.json();
              if (rentData.success && rentData.data?.portfolio) {
                const p = rentData.data.portfolio;
                valuationLow = p.purchasePriceRange?.low;
                valuationMid = p.purchasePriceRange?.mid;
                valuationHigh = p.purchasePriceRange?.high;
                pricePerBed = p.blendedPricePerBed;
                coverage = p.weightedCoverage;
              }
            }

            return { ...deal, score, confidence, valuationLow, valuationMid, valuationHigh, pricePerBed, coverage };
          } catch {
            return deal;
          }
        })
      );
      setDeals(updatedDeals);
    }
    if (deals.length > 0) {
      fetchDealDetails();
    }
  }, [deals.length]);

  const addDeal = (deal: DealSummary) => {
    if (deals.length < 4 && !deals.find((d) => d.id === deal.id)) {
      setDeals((prev) => [...prev, deal]);
    }
    setShowPicker(false);
  };

  const removeDeal = (id: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== id));
  };

  const metrics = [
    { key: 'askingPrice', label: 'Asking Price', format: formatCurrency, higherBetter: false },
    { key: 'totalBeds', label: 'Total Beds', format: (v: number) => v?.toString() || '—', higherBetter: true },
    { key: 'facilityCount', label: 'Facilities', format: (v: number) => v?.toString() || '—', higherBetter: true },
    { key: 'score', label: 'Deal Score', format: (v: number) => v?.toFixed(1) || '—', higherBetter: true },
    { key: 'confidence', label: 'Confidence', format: (v: number) => v ? `${v}%` : '—', higherBetter: true },
    { key: 'valuationLow', label: 'Valuation Low', format: formatCurrency, higherBetter: false },
    { key: 'valuationMid', label: 'Valuation Market', format: formatCurrency, higherBetter: false },
    { key: 'valuationHigh', label: 'Valuation High', format: formatCurrency, higherBetter: false },
    { key: 'pricePerBed', label: 'Price/Bed', format: formatCurrency, higherBetter: false },
    { key: 'coverage', label: 'Coverage Ratio', format: (v: number) => v ? `${v.toFixed(2)}x` : '—', higherBetter: true },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">
            Deal Comparison
          </h2>
          <p className="text-sm text-surface-500 mt-1">
            Compare up to 4 deals side-by-side
          </p>
        </div>
        {deals.length < 4 && (
          <Button onClick={() => setShowPicker(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Deal
          </Button>
        )}
      </div>

      {/* Deal picker modal */}
      {showPicker && (
        <div className="neu-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Select a Deal</h3>
            <button onClick={() => setShowPicker(false)}>
              <X className="w-4 h-4 text-surface-400" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableDeals
              .filter((d) => !deals.find((sel) => sel.id === d.id))
              .map((deal) => (
                <button
                  key={deal.id}
                  onClick={() => addDeal(deal)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{deal.name}</p>
                    <p className="text-xs text-surface-500">
                      {deal.assetTypes.map((t) => t.toUpperCase()).join(', ')} · {deal.totalBeds} beds · {deal.states.join(', ')}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-surface-400" />
                </button>
              ))}
            {availableDeals.filter((d) => !deals.find((sel) => sel.id === d.id)).length === 0 && (
              <p className="text-sm text-surface-500 text-center py-4">No more deals available</p>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {deals.length === 0 && (
        <div className="neu-card p-12 text-center">
          <ArrowLeftRight className="w-12 h-12 mx-auto text-surface-300 dark:text-surface-600 mb-4" />
          <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">
            No deals selected
          </h3>
          <p className="text-sm text-surface-500 mb-4">
            Add deals to compare their metrics, valuations, and risk profiles side-by-side
          </p>
          <Button onClick={() => setShowPicker(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add First Deal
          </Button>
        </div>
      )}

      {/* Comparison table */}
      {deals.length > 0 && (
        <div className="neu-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-surface-500 uppercase tracking-wider w-40">
                    Metric
                  </th>
                  {deals.map((deal) => (
                    <th key={deal.id} className="px-4 py-3 text-center min-w-[180px]">
                      <div className="flex items-center justify-center gap-2">
                        <div>
                          <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">{deal.name}</p>
                          <p className="text-[10px] text-surface-500 font-normal">{deal.dealId}</p>
                        </div>
                        <button
                          onClick={() => removeDeal(deal.id)}
                          className="p-0.5 hover:bg-surface-200 dark:hover:bg-surface-700 rounded transition-colors"
                        >
                          <X className="w-3 h-3 text-surface-400" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {/* Basic info row */}
                <tr className="bg-surface-50/50 dark:bg-surface-800/30">
                  <td className="px-4 py-2 text-xs font-medium text-surface-500">Asset Type</td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="px-4 py-2 text-center text-sm text-surface-900 dark:text-surface-50">
                      {deal.assetTypes.map((t) => t.toUpperCase()).join(', ') || '—'}
                    </td>
                  ))}
                </tr>
                <tr className="bg-surface-50/50 dark:bg-surface-800/30">
                  <td className="px-4 py-2 text-xs font-medium text-surface-500">States</td>
                  {deals.map((deal) => (
                    <td key={deal.id} className="px-4 py-2 text-center text-sm text-surface-900 dark:text-surface-50">
                      {deal.states.join(', ') || '—'}
                    </td>
                  ))}
                </tr>

                {/* Metric rows */}
                {metrics.map((metric) => {
                  const values = deals.map((d) => (d as any)[metric.key] as number);
                  const validValues = values.filter((v) => v !== undefined && v !== null && v > 0);
                  const bestValue = metric.higherBetter
                    ? Math.max(...validValues)
                    : Math.min(...validValues);

                  return (
                    <tr key={metric.key}>
                      <td className="px-4 py-2.5 text-xs font-medium text-surface-500">
                        {metric.label}
                      </td>
                      {deals.map((deal, i) => {
                        const value = (deal as any)[metric.key] as number;
                        const isBest = value === bestValue && validValues.length > 1;

                        return (
                          <td
                            key={deal.id}
                            className={cn(
                              'px-4 py-2.5 text-center text-sm font-medium',
                              isBest
                                ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10'
                                : 'text-surface-900 dark:text-surface-50'
                            )}
                          >
                            {metric.format(value)}
                            {isBest && <Star className="w-3 h-3 inline-block ml-1 text-emerald-500" />}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
