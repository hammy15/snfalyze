'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, Award, DollarSign, Shield, AlertTriangle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface DealStructureMetrics {
  name: string;
  irr: number;
  equityMultiple: number;
  cashOnCash: number;
  equityRequired: number;
  npv: number;
  riskScore: number;
  isRecommended?: boolean;
}

export interface DealComparisonChartProps {
  structures: DealStructureMetrics[];
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (absValue >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatMultiple(value: number): string {
  return `${value.toFixed(2)}x`;
}

function getRiskLabel(score: number): string {
  if (score <= 3) return 'Low';
  if (score <= 6) return 'Medium';
  return 'High';
}

function getRiskColor(score: number): string {
  if (score <= 3) return 'text-emerald-600';
  if (score <= 6) return 'text-amber-600';
  return 'text-rose-600';
}

// ============================================================================
// Bar Component
// ============================================================================

interface MetricBarProps {
  label: string;
  values: { name: string; value: number; isRecommended?: boolean }[];
  formatFn: (value: number) => string;
  maxValue?: number;
  higherIsBetter?: boolean;
}

function MetricBar({ label, values, formatFn, maxValue, higherIsBetter = true }: MetricBarProps) {
  const max = maxValue ?? Math.max(...values.map((v) => Math.abs(v.value)));
  const sortedByBest = [...values].sort((a, b) =>
    higherIsBetter ? b.value - a.value : a.value - b.value
  );
  const bestValue = sortedByBest[0]?.value;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="space-y-1">
        {values.map((item, i) => {
          const width = max > 0 ? (Math.abs(item.value) / max) * 100 : 0;
          const isBest = item.value === bestValue;

          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-32 text-xs text-muted-foreground truncate">{item.name}</div>
              <div className="flex-1 relative h-6 bg-slate-100 dark:bg-slate-800 rounded">
                <div
                  className={cn(
                    'absolute left-0 top-0 bottom-0 rounded transition-all',
                    item.isRecommended
                      ? 'bg-primary'
                      : isBest
                      ? 'bg-emerald-500'
                      : 'bg-slate-400'
                  )}
                  style={{ width: `${width}%` }}
                />
                <span
                  className={cn(
                    'absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium',
                    width > 70 ? 'text-white' : ''
                  )}
                >
                  {formatFn(item.value)}
                </span>
              </div>
              {isBest && (
                <Award className="h-4 w-4 text-emerald-500 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Component
// ============================================================================

export function DealComparisonChart({
  structures,
  className,
}: DealComparisonChartProps) {
  const recommended = structures.find((s) => s.isRecommended);

  // Calculate max values
  const maxIrr = Math.max(...structures.map((s) => s.irr));
  const maxEquityMultiple = Math.max(...structures.map((s) => s.equityMultiple));
  const maxCashOnCash = Math.max(...structures.map((s) => s.cashOnCash));
  const maxEquity = Math.max(...structures.map((s) => s.equityRequired));
  const maxNpv = Math.max(...structures.map((s) => s.npv));

  return (
    <div className={cn('space-y-6', className)}>
      {/* Recommended banner */}
      {recommended && (
        <div className="flex items-center gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <Award className="h-5 w-5 text-primary" />
          <div>
            <div className="font-medium">Recommended: {recommended.name}</div>
            <div className="text-sm text-muted-foreground">
              Best balance of returns ({formatPercent(recommended.irr)} IRR) and risk profile
            </div>
          </div>
        </div>
      )}

      {/* Structure cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {structures.map((s, i) => (
          <div
            key={i}
            className={cn(
              'p-4 border rounded-lg',
              s.isRecommended && 'border-primary ring-1 ring-primary'
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{s.name}</h4>
              {s.isRecommended && (
                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">
                  Recommended
                </span>
              )}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3.5 w-3.5" />
                  IRR
                </span>
                <span className="font-medium">{formatPercent(s.irr)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Equity Multiple</span>
                <span className="font-medium">{formatMultiple(s.equityMultiple)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Cash-on-Cash</span>
                <span className="font-medium">{formatPercent(s.cashOnCash)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Equity Required
                </span>
                <span className="font-medium">{formatCurrency(s.equityRequired)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">NPV</span>
                <span className={cn('font-medium', s.npv >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {formatCurrency(s.npv)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  {s.riskScore <= 3 ? (
                    <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  ) : s.riskScore <= 6 ? (
                    <Shield className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                  )}
                  Risk
                </span>
                <span className={cn('font-medium', getRiskColor(s.riskScore))}>
                  {getRiskLabel(s.riskScore)} ({s.riskScore}/10)
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison bars */}
      <div className="space-y-6">
        <MetricBar
          label="IRR (Internal Rate of Return)"
          values={structures.map((s) => ({ name: s.name, value: s.irr, isRecommended: s.isRecommended }))}
          formatFn={formatPercent}
          maxValue={maxIrr}
          higherIsBetter={true}
        />

        <MetricBar
          label="Equity Multiple"
          values={structures.map((s) => ({ name: s.name, value: s.equityMultiple, isRecommended: s.isRecommended }))}
          formatFn={formatMultiple}
          maxValue={maxEquityMultiple}
          higherIsBetter={true}
        />

        <MetricBar
          label="Cash-on-Cash Return"
          values={structures.map((s) => ({ name: s.name, value: s.cashOnCash, isRecommended: s.isRecommended }))}
          formatFn={formatPercent}
          maxValue={maxCashOnCash}
          higherIsBetter={true}
        />

        <MetricBar
          label="Equity Required"
          values={structures.map((s) => ({ name: s.name, value: s.equityRequired, isRecommended: s.isRecommended }))}
          formatFn={formatCurrency}
          maxValue={maxEquity}
          higherIsBetter={false}
        />

        <MetricBar
          label="Net Present Value"
          values={structures.map((s) => ({ name: s.name, value: s.npv, isRecommended: s.isRecommended }))}
          formatFn={formatCurrency}
          maxValue={maxNpv}
          higherIsBetter={true}
        />
      </div>
    </div>
  );
}

export default DealComparisonChart;
