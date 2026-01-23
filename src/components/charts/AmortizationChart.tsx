'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface AmortizationDataPoint {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationChartProps {
  data: AmortizationDataPoint[];
  height?: number;
  showTable?: boolean;
  maxTableRows?: number;
  className?: string;
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

export function AmortizationChart({
  data,
  height = 200,
  showTable = true,
  maxTableRows = 12,
  className,
}: AmortizationChartProps) {
  const [selectedPeriod, setSelectedPeriod] = React.useState<number | null>(null);

  // Calculate totals
  const totalPrincipal = data.reduce((sum, d) => sum + d.principal, 0);
  const totalInterest = data.reduce((sum, d) => sum + d.interest, 0);
  const initialBalance = data[0]?.balance + data[0]?.principal || 0;

  // Calculate max values for scaling
  const maxPayment = Math.max(...data.map((d) => d.payment));
  const maxBalance = Math.max(...data.map((d) => d.balance));

  // Sample data for table display
  const tableData = React.useMemo(() => {
    if (data.length <= maxTableRows) return data;
    const step = Math.ceil(data.length / maxTableRows);
    const sampled: AmortizationDataPoint[] = [];
    for (let i = 0; i < data.length; i += step) {
      sampled.push(data[i]);
    }
    // Always include last row
    if (sampled[sampled.length - 1]?.period !== data[data.length - 1]?.period) {
      sampled.push(data[data.length - 1]);
    }
    return sampled;
  }, [data, maxTableRows]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary metrics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-xs text-muted-foreground">Original Loan</div>
          <div className="text-lg font-semibold">{formatCurrency(initialBalance)}</div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-xs text-muted-foreground">Total Principal</div>
          <div className="text-lg font-semibold text-emerald-600">{formatCurrency(totalPrincipal)}</div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-xs text-muted-foreground">Total Interest</div>
          <div className="text-lg font-semibold text-amber-600">{formatCurrency(totalInterest)}</div>
        </div>
        <div className="text-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <div className="text-xs text-muted-foreground">Interest %</div>
          <div className="text-lg font-semibold">
            {((totalInterest / (totalPrincipal + totalInterest)) * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height }}>
        {/* Y-axis (left - payments) */}
        <div className="absolute left-0 top-0 bottom-6 w-14 flex flex-col justify-between text-xs text-muted-foreground">
          <span className="text-right pr-2">{formatCurrency(maxPayment)}</span>
          <span className="text-right pr-2">{formatCurrency(maxPayment / 2)}</span>
          <span className="text-right pr-2">$0</span>
        </div>

        {/* Chart area */}
        <div className="absolute left-14 right-14 top-0 bottom-6">
          {/* Stacked bars for principal/interest */}
          <div className="relative h-full flex items-end">
            {data.map((d, i) => {
              const principalHeight = (d.principal / maxPayment) * 100;
              const interestHeight = (d.interest / maxPayment) * 100;
              const barWidth = 100 / data.length;

              return (
                <div
                  key={i}
                  className="relative cursor-pointer group"
                  style={{ width: `${barWidth}%`, height: '100%' }}
                  onMouseEnter={() => setSelectedPeriod(d.period)}
                  onMouseLeave={() => setSelectedPeriod(null)}
                >
                  <div className="absolute bottom-0 left-[10%] right-[10%] flex flex-col">
                    {/* Interest portion */}
                    <div
                      className="bg-amber-500/70 group-hover:bg-amber-500"
                      style={{ height: `${interestHeight}%` }}
                    />
                    {/* Principal portion */}
                    <div
                      className="bg-emerald-500/70 group-hover:bg-emerald-500"
                      style={{ height: `${principalHeight}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Balance line overlay */}
          <svg
            className="absolute inset-0 pointer-events-none"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polyline
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
              points={data
                .map((d, i) => {
                  const x = (i / data.length) * 100 + 50 / data.length;
                  const y = 100 - (d.balance / maxBalance) * 100;
                  return `${x},${y}`;
                })
                .join(' ')}
            />
          </svg>
        </div>

        {/* Y-axis (right - balance) */}
        <div className="absolute right-0 top-0 bottom-6 w-14 flex flex-col justify-between text-xs text-muted-foreground">
          <span className="pl-2">{formatCurrency(maxBalance)}</span>
          <span className="pl-2">{formatCurrency(maxBalance / 2)}</span>
          <span className="pl-2">$0</span>
        </div>

        {/* X-axis */}
        <div className="absolute left-14 right-14 bottom-0 h-6 flex justify-between text-xs text-muted-foreground">
          <span>Year 1</span>
          <span>Year {Math.ceil(data.length / 12)}</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500/70" />
          <span>Principal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-amber-500/70" />
          <span>Interest</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-500" />
          <span>Balance</span>
        </div>
      </div>

      {/* Tooltip */}
      {selectedPeriod !== null && (
        <div className="fixed z-50 bg-white dark:bg-slate-800 shadow-lg rounded-lg p-3 border text-sm">
          {(() => {
            const d = data.find((item) => item.period === selectedPeriod);
            if (!d) return null;
            return (
              <div className="space-y-1">
                <div className="font-medium">Period {d.period}</div>
                <div>Payment: {formatCurrency(d.payment)}</div>
                <div className="text-emerald-600">Principal: {formatCurrency(d.principal)}</div>
                <div className="text-amber-600">Interest: {formatCurrency(d.interest)}</div>
                <div className="text-blue-600">Balance: {formatCurrency(d.balance)}</div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Table */}
      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-2 px-3">Period</th>
                <th className="text-right py-2 px-3">Payment</th>
                <th className="text-right py-2 px-3">Principal</th>
                <th className="text-right py-2 px-3">Interest</th>
                <th className="text-right py-2 px-3">Balance</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((d) => (
                <tr key={d.period} className="border-b border-slate-100 dark:border-slate-800">
                  <td className="py-2 px-3">{d.period}</td>
                  <td className="text-right py-2 px-3">{formatCurrency(d.payment)}</td>
                  <td className="text-right py-2 px-3 text-emerald-600">{formatCurrency(d.principal)}</td>
                  <td className="text-right py-2 px-3 text-amber-600">{formatCurrency(d.interest)}</td>
                  <td className="text-right py-2 px-3 text-blue-600">{formatCurrency(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AmortizationChart;
