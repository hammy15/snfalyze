'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface WaterfallBar {
  label: string;
  value: number;
  type: 'positive' | 'negative' | 'total';
  color?: string;
}

export interface WaterfallDistributionChartProps {
  data: WaterfallBar[];
  height?: number;
  className?: string;
  formatValue?: (value: number) => string;
}

// ============================================================================
// Helper Functions
// ============================================================================

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

// ============================================================================
// Component
// ============================================================================

export function WaterfallDistributionChart({
  data,
  height = 300,
  className,
  formatValue = formatCurrency,
}: WaterfallDistributionChartProps) {
  // Calculate running totals and positions
  const processedData = React.useMemo(() => {
    let runningTotal = 0;
    const maxValue = Math.max(
      ...data.map((d) => {
        if (d.type === 'total') return d.value;
        runningTotal += d.value;
        return Math.max(runningTotal, runningTotal - d.value);
      })
    );

    runningTotal = 0;
    const minValue = Math.min(
      0,
      ...data.map((d) => {
        if (d.type === 'total') return d.value;
        runningTotal += d.value;
        return Math.min(runningTotal, runningTotal - d.value);
      })
    );

    const range = maxValue - minValue || 1;
    runningTotal = 0;

    return data.map((d, i) => {
      let start: number;
      let end: number;

      if (d.type === 'total') {
        start = 0;
        end = d.value;
      } else {
        start = runningTotal;
        end = runningTotal + d.value;
        runningTotal = end;
      }

      return {
        ...d,
        start,
        end,
        barTop: ((maxValue - Math.max(start, end)) / range) * 100,
        barHeight: (Math.abs(d.value) / range) * 100,
        connectorTop: i > 0 ? ((maxValue - Math.min(start, end)) / range) * 100 : 0,
      };
    });
  }, [data]);

  const barWidth = 100 / data.length;

  return (
    <div className={cn('relative', className)} style={{ height }}>
      {/* Y-axis */}
      <div className="absolute left-0 top-0 bottom-8 w-16 flex flex-col justify-between text-xs text-muted-foreground">
        {[...Array(5)].map((_, i) => {
          const range = processedData.length > 0
            ? Math.max(...processedData.map(d => Math.max(d.start, d.end))) -
              Math.min(0, ...processedData.map(d => Math.min(d.start, d.end)))
            : 100;
          const maxVal = processedData.length > 0
            ? Math.max(...processedData.map(d => Math.max(d.start, d.end)))
            : 100;
          const value = maxVal - (i / 4) * range;
          return (
            <span key={i} className="text-right pr-2">
              {formatValue(value)}
            </span>
          );
        })}
      </div>

      {/* Chart area */}
      <div className="absolute left-16 right-0 top-0 bottom-8">
        {/* Grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="border-t border-slate-200 dark:border-slate-700" />
          ))}
        </div>

        {/* Bars */}
        <div className="relative h-full flex">
          {processedData.map((d, i) => (
            <div
              key={i}
              className="relative flex-1 flex flex-col items-center"
              style={{ width: `${barWidth}%` }}
            >
              {/* Connector line from previous bar */}
              {i > 0 && d.type !== 'total' && (
                <div
                  className="absolute left-0 w-px bg-slate-300 dark:bg-slate-600"
                  style={{
                    top: `${d.connectorTop}%`,
                    height: '2px',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}

              {/* Bar */}
              <div
                className={cn(
                  'absolute w-3/4 rounded-sm transition-all',
                  d.type === 'total'
                    ? 'bg-slate-600 dark:bg-slate-400'
                    : d.value >= 0
                    ? 'bg-emerald-500'
                    : 'bg-rose-500',
                  d.color && ''
                )}
                style={{
                  top: `${d.barTop}%`,
                  height: `${Math.max(d.barHeight, 0.5)}%`,
                  backgroundColor: d.color,
                }}
              >
                {/* Value label */}
                <div
                  className={cn(
                    'absolute left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap',
                    d.barTop < 15 ? 'bottom-full mb-1' : 'top-full mt-1'
                  )}
                >
                  {formatValue(d.value)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* X-axis labels */}
      <div className="absolute left-16 right-0 bottom-0 h-8 flex">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 text-center text-xs text-muted-foreground truncate px-1"
            title={d.label}
          >
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default WaterfallDistributionChart;
