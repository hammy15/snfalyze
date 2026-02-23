'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  BarChart3,
  Building2,
  DollarSign,
  Clock,
  Loader2,
} from 'lucide-react';

interface PricePerBedStats {
  min: number;
  max: number;
  median: number;
  p25: number;
  p75: number;
}

interface SalePriceStats {
  min: number;
  max: number;
  median: number;
}

interface DateRange {
  earliest: string;
  latest: string;
}

interface RecentTransaction {
  propertyName: string;
  state: string | null;
  beds: number | null;
  salePrice: number | null;
  pricePerBed: number | null;
  saleDate: string | null;
  buyer: string | null;
  seller: string | null;
}

interface StateBreakdownEntry {
  state: string;
  count: number;
  avgPricePerBed: number | null;
}

interface PatternData {
  transactionCount: number;
  pricePerBed: PricePerBedStats | null;
  salePrice: SalePriceStats | null;
  dateRange: DateRange | null;
  recentTransactions: RecentTransaction[];
  stateBreakdown: StateBreakdownEntry[];
}

interface DealPatternsProps {
  state?: string;
  assetType?: string;
  beds?: number;
}

function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

export function DealPatterns({ state, assetType, beds }: DealPatternsProps) {
  const [data, setData] = useState<PatternData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatterns = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (state) params.set('state', state);
      if (assetType) params.set('assetType', assetType);
      if (beds) {
        // Search +/- 30% of bed count for comparable range
        const minBeds = Math.max(1, Math.floor(beds * 0.7));
        const maxBeds = Math.ceil(beds * 1.3);
        params.set('minBeds', String(minBeds));
        params.set('maxBeds', String(maxBeds));
      }

      const res = await fetch(`/api/deals/patterns?${params.toString()}`);
      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Failed to load patterns');
      }

      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [state, assetType, beds]);

  useEffect(() => {
    fetchPatterns();
  }, [fetchPatterns]);

  // --- Loading State ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-surface-400 dark:text-surface-500">
        <Loader2 className="h-8 w-8 animate-spin mb-3" />
        <p className="text-sm font-medium">Loading deal patterns...</p>
      </div>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchPatterns}
          className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline dark:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  // --- Empty State ---
  if (!data || data.transactionCount === 0) {
    return (
      <div className="rounded-xl border border-surface-200 bg-surface-50 p-8 text-center dark:border-surface-700 dark:bg-surface-800/50">
        <Building2 className="mx-auto h-10 w-10 text-surface-300 dark:text-surface-600 mb-3" />
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
          No comparable transactions found
        </p>
        <p className="mt-1 text-xs text-surface-400 dark:text-surface-500">
          {state || assetType
            ? 'Try broadening your search criteria'
            : 'No transaction data available yet'}
        </p>
      </div>
    );
  }

  const { pricePerBed, salePrice, dateRange, recentTransactions, stateBreakdown } = data;
  const assetLabel = assetType ?? 'facility';

  return (
    <div className="space-y-5">
      {/* --- Summary Callout --- */}
      {pricePerBed && (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 p-5 text-white shadow-lg dark:from-primary-600 dark:to-primary-900">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-6 h-16 w-16 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-primary-200" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary-200">
                Market Signal
              </span>
            </div>
            <p className="text-lg font-bold leading-snug">
              Similar {state ? `${state} ` : ''}
              {assetLabel}s traded at{' '}
              {formatCurrency(pricePerBed.p25, true)}&ndash;
              {formatCurrency(pricePerBed.p75, true)}/bed
            </p>
            <p className="mt-1 text-xs text-primary-200">
              Based on {data.transactionCount} comparable transaction
              {data.transactionCount !== 1 ? 's' : ''}
              {dateRange
                ? ` from ${formatDate(dateRange.earliest)} to ${formatDate(dateRange.latest)}`
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* --- Stats Grid --- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={BarChart3}
          label="Transactions"
          value={String(data.transactionCount)}
        />
        <StatCard
          icon={DollarSign}
          label="Median $/Bed"
          value={pricePerBed ? formatCurrency(pricePerBed.median, true) : '--'}
        />
        <StatCard
          icon={Building2}
          label="Median Sale Price"
          value={salePrice ? formatCurrency(salePrice.median, true) : '--'}
        />
        <StatCard
          icon={Clock}
          label="Date Range"
          value={
            dateRange
              ? `${formatDate(dateRange.earliest)} - ${formatDate(dateRange.latest)}`
              : '--'
          }
          small
        />
      </div>

      {/* --- Price/Bed Distribution Bar --- */}
      {pricePerBed && <DistributionBar stats={pricePerBed} currentBeds={beds} />}

      {/* --- Recent Transactions Table --- */}
      {recentTransactions.length > 0 && (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <div className="bg-surface-50 dark:bg-surface-800/60 px-4 py-3 border-b border-surface-200 dark:border-surface-700">
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
              Recent Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-surface-100 dark:border-surface-700 bg-surface-50/50 dark:bg-surface-800/30">
                  <th className="px-4 py-2.5 font-semibold text-surface-500 dark:text-surface-400">
                    Property
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-surface-500 dark:text-surface-400">
                    Location
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-surface-500 dark:text-surface-400 text-right">
                    Beds
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-surface-500 dark:text-surface-400 text-right">
                    Price
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-surface-500 dark:text-surface-400 text-right">
                    $/Bed
                  </th>
                  <th className="px-4 py-2.5 font-semibold text-surface-500 dark:text-surface-400">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx, i) => (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-surface-100 dark:border-surface-700/50 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/40',
                      i === recentTransactions.length - 1 && 'border-b-0'
                    )}
                  >
                    <td className="px-4 py-2.5 font-medium text-surface-800 dark:text-surface-100 max-w-[180px] truncate">
                      {tx.propertyName}
                    </td>
                    <td className="px-4 py-2.5 text-surface-500 dark:text-surface-400">
                      {tx.state ?? '--'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-surface-700 dark:text-surface-300">
                      {tx.beds ?? '--'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-surface-700 dark:text-surface-300">
                      {tx.salePrice ? formatCurrency(tx.salePrice, true) : '--'}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-medium text-surface-800 dark:text-surface-100">
                      {tx.pricePerBed ? formatCurrency(tx.pricePerBed, true) : '--'}
                    </td>
                    <td className="px-4 py-2.5 text-surface-500 dark:text-surface-400">
                      {formatDate(tx.saleDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- State Breakdown --- */}
      {stateBreakdown.length > 1 && (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 p-4">
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200 mb-3">
            By State
          </h3>
          <div className="space-y-2">
            {stateBreakdown.map((entry) => {
              const pct = Math.round((entry.count / data.transactionCount) * 100);
              return (
                <div key={entry.state} className="flex items-center gap-3 text-xs">
                  <span className="w-8 font-bold text-surface-700 dark:text-surface-200">
                    {entry.state}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-surface-100 dark:bg-surface-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-500 dark:bg-primary-400 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-right tabular-nums text-surface-500 dark:text-surface-400">
                    {entry.count} ({pct}%)
                  </span>
                  <span className="w-20 text-right tabular-nums font-medium text-surface-700 dark:text-surface-200">
                    {entry.avgPricePerBed
                      ? formatCurrency(entry.avgPricePerBed, true) + '/bed'
                      : '--'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Subcomponents ───────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  small = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-3.5 dark:border-surface-700 dark:bg-surface-800/60">
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-3.5 w-3.5 text-surface-400 dark:text-surface-500" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-surface-400 dark:text-surface-500">
          {label}
        </span>
      </div>
      <p
        className={cn(
          'font-bold text-surface-800 dark:text-surface-100 leading-tight',
          small ? 'text-xs' : 'text-base'
        )}
      >
        {value}
      </p>
    </div>
  );
}

function DistributionBar({
  stats,
  currentBeds,
}: {
  stats: PricePerBedStats;
  currentBeds?: number;
}) {
  // Compute p10 and p90 approximations from min/p25 and p75/max
  const p10 = stats.min + (stats.p25 - stats.min) * 0.4;
  const p90 = stats.p75 + (stats.max - stats.p75) * 0.6;

  const rangeMin = Math.min(p10, stats.min);
  const rangeMax = Math.max(p90, stats.max);
  const totalRange = rangeMax - rangeMin || 1;

  function toPercent(value: number): number {
    return ((value - rangeMin) / totalRange) * 100;
  }

  const leftWhisker = toPercent(p10);
  const boxLeft = toPercent(stats.p25);
  const medianPos = toPercent(stats.median);
  const boxRight = toPercent(stats.p75);
  const rightWhisker = toPercent(p90);

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4 dark:border-surface-700 dark:bg-surface-800/60">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-200">
          Price/Bed Distribution
        </h3>
        <span className="text-[10px] font-medium text-surface-400 dark:text-surface-500">
          P10 &mdash; P25 &mdash; Median &mdash; P75 &mdash; P90
        </span>
      </div>

      {/* Box-and-whisker visualization */}
      <div className="relative h-10 mt-1">
        {/* Whisker line (p10 to p90) */}
        <div
          className="absolute top-1/2 h-px bg-surface-300 dark:bg-surface-600 -translate-y-1/2"
          style={{ left: `${leftWhisker}%`, width: `${rightWhisker - leftWhisker}%` }}
        />

        {/* Left whisker cap */}
        <div
          className="absolute top-1/2 w-px h-3 bg-surface-400 dark:bg-surface-500 -translate-y-1/2"
          style={{ left: `${leftWhisker}%` }}
        />

        {/* Right whisker cap */}
        <div
          className="absolute top-1/2 w-px h-3 bg-surface-400 dark:bg-surface-500 -translate-y-1/2"
          style={{ left: `${rightWhisker}%` }}
        />

        {/* IQR Box (p25 to p75) */}
        <div
          className="absolute top-1/2 h-6 rounded bg-primary-100 border border-primary-300 dark:bg-primary-900/40 dark:border-primary-600 -translate-y-1/2"
          style={{ left: `${boxLeft}%`, width: `${boxRight - boxLeft}%` }}
        />

        {/* Median line */}
        <div
          className="absolute top-1/2 w-0.5 h-6 bg-primary-600 dark:bg-primary-400 -translate-y-1/2 z-10"
          style={{ left: `${medianPos}%` }}
        />

        {/* Current deal marker (if beds prop provided and we can estimate a position) */}
        {currentBeds && (
          <div
            className="absolute top-1/2 -translate-y-1/2 z-20"
            style={{
              left: `${Math.min(100, Math.max(0, toPercent(stats.median)))}%`,
            }}
            title="Current deal position (by median comparison)"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-surface-800 shadow" />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-1.5 text-[10px] text-surface-400 dark:text-surface-500 tabular-nums">
        <span>{formatCurrency(p10, true)}</span>
        <span>{formatCurrency(stats.p25, true)}</span>
        <span className="font-bold text-surface-600 dark:text-surface-300">
          {formatCurrency(stats.median, true)}
        </span>
        <span>{formatCurrency(stats.p75, true)}</span>
        <span>{formatCurrency(p90, true)}</span>
      </div>
    </div>
  );
}
