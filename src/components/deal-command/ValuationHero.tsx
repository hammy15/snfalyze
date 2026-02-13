'use client';

import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  ArrowRight,
  Info,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface ValuationHeroProps {
  askingPrice?: number;
  valuationLow?: number;
  valuationMid?: number;
  valuationHigh?: number;
  confidence?: number;
  methodology?: string;
  perBedLow?: number;
  perBedMid?: number;
  perBedHigh?: number;
  totalBeds?: number;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatPerBed(value: number): string {
  return `$${(value / 1000).toFixed(0)}K`;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function ValuationHero({
  askingPrice,
  valuationLow,
  valuationMid,
  valuationHigh,
  confidence,
  methodology = 'Blended (6 methods)',
  perBedLow,
  perBedMid,
  perBedHigh,
  totalBeds,
}: ValuationHeroProps) {
  const hasValuation = valuationLow || valuationMid || valuationHigh;

  if (!hasValuation) {
    return (
      <div className="neu-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Valuation Range
          </h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-200 dark:bg-surface-700 text-surface-500">
            Pending
          </span>
        </div>
        <div className="text-center py-8">
          <DollarSign className="w-10 h-10 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
          <p className="text-sm text-surface-500">
            Valuation will appear after financial analysis
          </p>
          <p className="text-xs text-surface-400 mt-1">
            Complete Document Understanding and Financial Reconstruction first
          </p>
        </div>
      </div>
    );
  }

  // Calculate position of asking price on the range bar
  const rangeMin = (valuationLow || 0) * 0.9;
  const rangeMax = (valuationHigh || 0) * 1.1;
  const rangeSpan = rangeMax - rangeMin;

  const askingPosition = askingPrice
    ? Math.max(0, Math.min(100, ((askingPrice - rangeMin) / rangeSpan) * 100))
    : null;

  const lowPosition = valuationLow
    ? ((valuationLow - rangeMin) / rangeSpan) * 100
    : 0;
  const midPosition = valuationMid
    ? ((valuationMid - rangeMin) / rangeSpan) * 100
    : 50;
  const highPosition = valuationHigh
    ? ((valuationHigh - rangeMin) / rangeSpan) * 100
    : 100;

  // Determine if asking price is favorable
  const askingVsMarket =
    askingPrice && valuationMid
      ? askingPrice <= valuationMid
        ? 'favorable'
        : askingPrice <= (valuationHigh || valuationMid)
          ? 'neutral'
          : 'unfavorable'
      : null;

  return (
    <div className="neu-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            Valuation Range
          </h3>
          <p className="text-xs text-surface-500 mt-0.5">{methodology}</p>
        </div>
        {confidence !== undefined && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-surface-500 uppercase tracking-wider">
              Confidence
            </span>
            <span
              className={cn(
                'text-xs font-bold px-2 py-0.5 rounded-full',
                confidence >= 70
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : confidence >= 40
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              )}
            >
              {confidence}%
            </span>
          </div>
        )}
      </div>

      {/* Main values */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Low</p>
          <p className="text-xl font-bold text-red-500">{formatCurrency(valuationLow || 0)}</p>
          {perBedLow && totalBeds && (
            <p className="text-xs text-surface-400 mt-0.5">
              {formatPerBed(perBedLow)}/bed
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">Market</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            {formatCurrency(valuationMid || 0)}
          </p>
          {perBedMid && totalBeds && (
            <p className="text-xs text-surface-400 mt-0.5">
              {formatPerBed(perBedMid)}/bed
            </p>
          )}
        </div>
        <div className="text-center">
          <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-1">High</p>
          <p className="text-xl font-bold text-emerald-500">{formatCurrency(valuationHigh || 0)}</p>
          {perBedHigh && totalBeds && (
            <p className="text-xs text-surface-400 mt-0.5">
              {formatPerBed(perBedHigh)}/bed
            </p>
          )}
        </div>
      </div>

      {/* Visual range bar */}
      <div className="relative h-3 bg-gradient-to-r from-red-200 via-amber-200 to-emerald-200 dark:from-red-900/30 dark:via-amber-900/30 dark:to-emerald-900/30 rounded-full mb-8">
        {/* Low marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-red-500 rounded-full"
          style={{ left: `${lowPosition}%` }}
        />
        {/* Mid marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-2 h-6 bg-surface-800 dark:bg-surface-200 rounded-full"
          style={{ left: `${midPosition}%` }}
        />
        {/* High marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-500 rounded-full"
          style={{ left: `${highPosition}%` }}
        />

        {/* Asking price marker */}
        {askingPosition !== null && (
          <div
            className="absolute -top-6"
            style={{ left: `${askingPosition}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap',
                askingVsMarket === 'favorable'
                  ? 'bg-emerald-500 text-white'
                  : askingVsMarket === 'neutral'
                    ? 'bg-amber-500 text-white'
                    : 'bg-red-500 text-white'
              )}
            >
              Ask: {formatCurrency(askingPrice!)}
            </div>
            <div
              className={cn(
                'w-0 h-0 mx-auto border-l-4 border-r-4 border-t-4 border-transparent',
                askingVsMarket === 'favorable'
                  ? 'border-t-emerald-500'
                  : askingVsMarket === 'neutral'
                    ? 'border-t-amber-500'
                    : 'border-t-red-500'
              )}
            />
          </div>
        )}
      </div>

      {/* Asking price comparison */}
      {askingPrice && valuationMid && (
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
            askingVsMarket === 'favorable'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400'
              : askingVsMarket === 'neutral'
                ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400'
          )}
        >
          {askingVsMarket === 'favorable' ? (
            <TrendingDown className="w-4 h-4" />
          ) : askingVsMarket === 'neutral' ? (
            <Minus className="w-4 h-4" />
          ) : (
            <TrendingUp className="w-4 h-4" />
          )}
          <span>
            Asking price is{' '}
            <strong>
              {formatCurrency(Math.abs(askingPrice - valuationMid))}
            </strong>{' '}
            {askingPrice <= valuationMid ? 'below' : 'above'} market value
            {' '}({((askingPrice / valuationMid - 1) * 100).toFixed(1)}%)
          </span>
        </div>
      )}
    </div>
  );
}
