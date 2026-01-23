'use client';

import { cn } from '@/lib/utils';
import { MethodBadge } from './method-selector';
import type { ValuationResult, ValuationSummary } from '@/lib/valuation/types';
import { TrendingUp, TrendingDown, Minus, Star, Info } from 'lucide-react';

interface ValuationComparisonProps {
  summary: ValuationSummary;
  showDetails?: boolean;
  onSelectMethod?: (method: string) => void;
  selectedMethod?: string;
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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? 'bg-green-100 text-green-700'
      : confidence >= 60
        ? 'bg-yellow-100 text-yellow-700'
        : 'bg-red-100 text-red-700';

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs', color)}>
      {confidence}% confidence
    </span>
  );
}

export function ValuationComparison({
  summary,
  showDetails = true,
  onSelectMethod,
  selectedMethod,
}: ValuationComparisonProps) {
  const avgValue = summary.weightedAverage;

  return (
    <div className="space-y-6">
      {/* Recommended Value */}
      <div className="card p-6 bg-gradient-to-br from-[var(--accent-bg)] to-white border-[var(--accent-solid)]">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-[var(--accent-solid)]" />
              <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                Recommended Value
              </span>
            </div>
            <div className="text-3xl font-bold text-[var(--color-text-primary)]">
              {formatCurrency(summary.recommendedValue)}
            </div>
            <div className="text-sm text-[var(--color-text-tertiary)] mt-1">
              Range: {formatCurrency(summary.valueRange.low)} - {formatCurrency(summary.valueRange.high)}
            </div>
          </div>
          <ConfidenceBadge confidence={summary.confidence} />
        </div>
      </div>

      {/* Method Comparison */}
      <div>
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-3">
          Valuation Methods
        </h3>
        <div className="space-y-2">
          {summary.methods.map((result) => {
            const diff = result.value - avgValue;
            const diffPct = (diff / avgValue) * 100;
            const isSelected = selectedMethod === result.method;

            return (
              <button
                key={result.method}
                type="button"
                onClick={() => onSelectMethod?.(result.method)}
                className={cn(
                  'w-full card p-4 text-left transition-all hover:shadow-md',
                  isSelected && 'ring-2 ring-[var(--accent-solid)]'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <MethodBadge method={result.method} size="md" />
                  <ConfidenceBadge confidence={result.confidence} />
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-xl font-semibold text-[var(--color-text-primary)]">
                      {formatCurrency(result.value)}
                    </div>
                    {result.valueLow && result.valueHigh && (
                      <div className="text-xs text-[var(--color-text-tertiary)]">
                        {formatCurrency(result.valueLow)} - {formatCurrency(result.valueHigh)}
                      </div>
                    )}
                  </div>

                  <div
                    className={cn(
                      'flex items-center gap-1 text-sm',
                      diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                    )}
                  >
                    {diff > 0 ? (
                      <TrendingUp className="w-4 h-4" />
                    ) : diff < 0 ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <Minus className="w-4 h-4" />
                    )}
                    <span>{diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%</span>
                  </div>
                </div>

                {showDetails && result.notes && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border-default)] text-xs text-[var(--color-text-tertiary)]">
                    {result.notes}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface ValuationDetailPanelProps {
  result: ValuationResult;
  className?: string;
}

export function ValuationDetailPanel({ result, className }: ValuationDetailPanelProps) {
  return (
    <div className={cn('card p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MethodBadge method={result.method} size="md" />
          <ConfidenceBadge confidence={result.confidence} />
        </div>
        <div className="text-2xl font-bold text-[var(--color-text-primary)]">
          {formatCurrency(result.value)}
        </div>
      </div>

      {/* Assumptions */}
      {result.assumptions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2 flex items-center gap-1">
            <Info className="w-4 h-4" />
            Key Assumptions
          </h4>
          <div className="space-y-1">
            {result.assumptions.map((assumption, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-tertiary)]">{assumption.field}</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {typeof assumption.value === 'number'
                    ? assumption.value.toLocaleString()
                    : assumption.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calculations */}
      {result.calculations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
            Calculation Steps
          </h4>
          <div className="space-y-2 text-sm">
            {result.calculations.map((calc, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between py-2 border-b border-[var(--color-border-default)] last:border-0"
              >
                <div>
                  <div className="font-medium text-[var(--color-text-primary)]">{calc.label}</div>
                  {calc.formula && (
                    <div className="text-xs text-[var(--color-text-tertiary)] font-mono">
                      {calc.formula}
                    </div>
                  )}
                  {calc.details && (
                    <div className="text-xs text-[var(--color-text-tertiary)]">{calc.details}</div>
                  )}
                </div>
                {calc.value !== 0 && (
                  <span className="font-medium text-[var(--color-text-primary)] tabular-nums">
                    {calc.value >= 1
                      ? formatCurrency(calc.value)
                      : formatPercent(calc.value)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
