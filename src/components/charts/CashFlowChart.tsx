'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface CashFlowDataPoint {
  period: string | number;
  revenue?: number;
  expenses?: number;
  noi?: number;
  debtService?: number;
  cashFlow?: number;
  cumulativeCashFlow?: number;
}

export interface CashFlowChartProps {
  data: CashFlowDataPoint[];
  height?: number;
  showCumulative?: boolean;
  showGrid?: boolean;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  const absValue = Math.abs(value);
  if (absValue >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// ============================================================================
// Component
// ============================================================================

export function CashFlowChart({
  data,
  height = 250,
  showCumulative = true,
  showGrid = true,
  className,
}: CashFlowChartProps) {
  const chartRef = React.useRef<HTMLDivElement>(null);

  // Calculate scales
  const { minValue, maxValue, range } = React.useMemo(() => {
    const values = data.flatMap((d) => [
      d.revenue,
      d.noi,
      d.cashFlow,
      showCumulative ? d.cumulativeCashFlow : undefined,
    ]).filter((v): v is number => v !== undefined);

    const min = Math.min(0, ...values);
    const max = Math.max(...values);
    return {
      minValue: min,
      maxValue: max,
      range: max - min || 1,
    };
  }, [data, showCumulative]);

  const getY = (value: number) => ((maxValue - value) / range) * 100;
  const barWidth = 100 / data.length;

  // Calculate total metrics
  const totalCashFlow = data.reduce((sum, d) => sum + (d.cashFlow ?? 0), 0);
  const averageCashFlow = totalCashFlow / data.length;
  const isPositive = totalCashFlow >= 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="h-5 w-5 text-emerald-500" />
          ) : (
            <TrendingDown className="h-5 w-5 text-rose-500" />
          )}
          <span className="text-sm text-muted-foreground">
            Total: <span className={cn('font-semibold', isPositive ? 'text-emerald-600' : 'text-rose-600')}>
              {formatCurrency(totalCashFlow)}
            </span>
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          Avg: {formatCurrency(averageCashFlow)}/period
        </span>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="relative" style={{ height }}>
        {/* Y-axis */}
        <div className="absolute left-0 top-0 bottom-8 w-14 flex flex-col justify-between text-xs text-muted-foreground">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const value = maxValue - ratio * range;
            return (
              <span key={ratio} className="text-right pr-2">
                {formatCurrency(value)}
              </span>
            );
          })}
        </div>

        {/* Chart area */}
        <div className="absolute left-14 right-0 top-0 bottom-8">
          {/* Grid lines */}
          {showGrid && (
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-t border-slate-100 dark:border-slate-800" />
              ))}
            </div>
          )}

          {/* Zero line */}
          {minValue < 0 && (
            <div
              className="absolute left-0 right-0 border-t-2 border-slate-300 dark:border-slate-600"
              style={{ top: `${getY(0)}%` }}
            />
          )}

          {/* Bars and line */}
          <div className="relative h-full">
            {/* Cash flow bars */}
            {data.map((d, i) => {
              const cf = d.cashFlow ?? 0;
              const barHeight = Math.abs(cf) / range * 100;
              const barTop = cf >= 0 ? getY(cf) : getY(0);

              return (
                <div
                  key={i}
                  className="absolute bottom-0"
                  style={{
                    left: `${i * barWidth + barWidth * 0.1}%`,
                    width: `${barWidth * 0.8}%`,
                  }}
                >
                  <div
                    className={cn(
                      'absolute rounded-sm transition-all',
                      cf >= 0 ? 'bg-emerald-500/70' : 'bg-rose-500/70'
                    )}
                    style={{
                      top: `${barTop}%`,
                      height: `${barHeight}%`,
                      width: '100%',
                    }}
                  />
                </div>
              );
            })}

            {/* Cumulative line */}
            {showCumulative && (
              <svg
                className="absolute inset-0 pointer-events-none"
                viewBox={`0 0 100 100`}
                preserveAspectRatio="none"
              >
                <polyline
                  fill="none"
                  stroke="rgb(59, 130, 246)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  points={data
                    .map((d, i) => {
                      const x = i * barWidth + barWidth / 2;
                      const y = getY(d.cumulativeCashFlow ?? 0);
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                {data.map((d, i) => {
                  const x = i * barWidth + barWidth / 2;
                  const y = getY(d.cumulativeCashFlow ?? 0);
                  return (
                    <circle
                      key={i}
                      cx={x}
                      cy={y}
                      r="3"
                      fill="rgb(59, 130, 246)"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                })}
              </svg>
            )}
          </div>
        </div>

        {/* X-axis labels */}
        <div className="absolute left-14 right-0 bottom-0 h-8 flex">
          {data.map((d, i) => (
            <div
              key={i}
              className="flex-1 text-center text-xs text-muted-foreground"
              style={{ width: `${barWidth}%` }}
            >
              {d.period}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />
          <span>Cash Flow (+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-rose-500/70" />
          <span>Cash Flow (-)</span>
        </div>
        {showCumulative && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500" />
            <span>Cumulative</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CashFlowChart;
