'use client';

import { cn } from '@/lib/utils';
import { capRateSensitivity } from '@/lib/valuation/cap-rate';

interface SensitivityTableProps {
  noi: number;
  baseCapRate: number;
  baseValue: number;
  capRateSpread?: number;
  steps?: number;
  noiSpread?: number;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  return `$${(value / 1000).toFixed(0)}K`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

export function SensitivityTable({
  noi,
  baseCapRate,
  baseValue,
  capRateSpread = 0.02,
  steps = 5,
  noiSpread = 0.10,
  className,
}: SensitivityTableProps) {
  // Generate cap rate variations
  const capRateStep = capRateSpread / Math.floor(steps / 2);
  const capRates: number[] = [];
  for (let i = -Math.floor(steps / 2); i <= Math.floor(steps / 2); i++) {
    const rate = baseCapRate + i * capRateStep;
    if (rate > 0.04 && rate < 0.20) {
      capRates.push(rate);
    }
  }

  // Generate NOI variations
  const noiStep = noiSpread / Math.floor(steps / 2);
  const noiVariations: number[] = [];
  for (let i = -Math.floor(steps / 2); i <= Math.floor(steps / 2); i++) {
    const variation = 1 + i * noiStep;
    noiVariations.push(variation);
  }

  // Generate value matrix
  const matrix: { noi: number; noiLabel: string; values: { capRate: number; value: number; isBase: boolean }[] }[] = [];

  for (const noiMult of noiVariations) {
    const adjustedNOI = noi * noiMult;
    const noiLabel = noiMult === 1 ? 'Base' : `${noiMult > 1 ? '+' : ''}${((noiMult - 1) * 100).toFixed(0)}%`;

    const values = capRates.map((capRate) => ({
      capRate,
      value: adjustedNOI / capRate,
      isBase: noiMult === 1 && Math.abs(capRate - baseCapRate) < 0.001,
    }));

    matrix.push({ noi: adjustedNOI, noiLabel, values });
  }

  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="px-3 py-2 text-left text-[var(--color-text-tertiary)] font-medium bg-[var(--gray-50)] border border-[var(--color-border-default)]">
              NOI / Cap Rate
            </th>
            {capRates.map((rate) => (
              <th
                key={rate}
                className={cn(
                  'px-3 py-2 text-center font-medium border border-[var(--color-border-default)]',
                  Math.abs(rate - baseCapRate) < 0.001
                    ? 'bg-[var(--accent-bg)] text-[var(--accent-solid)]'
                    : 'bg-[var(--gray-50)] text-[var(--color-text-tertiary)]'
                )}
              >
                {formatPercent(rate)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td
                className={cn(
                  'px-3 py-2 font-medium border border-[var(--color-border-default)]',
                  row.noiLabel === 'Base'
                    ? 'bg-[var(--accent-bg)] text-[var(--accent-solid)]'
                    : 'bg-[var(--gray-50)] text-[var(--color-text-secondary)]'
                )}
              >
                <div>{row.noiLabel}</div>
                <div className="text-xs font-normal text-[var(--color-text-tertiary)]">
                  {formatCurrency(row.noi)}
                </div>
              </td>
              {row.values.map((cell, cellIdx) => {
                const diff = cell.value - baseValue;
                const diffPct = (diff / baseValue) * 100;

                return (
                  <td
                    key={cellIdx}
                    className={cn(
                      'px-3 py-2 text-center border border-[var(--color-border-default)] tabular-nums',
                      cell.isBase
                        ? 'bg-[var(--accent-solid)] text-white font-semibold'
                        : diffPct > 0
                          ? 'bg-green-50 text-green-700'
                          : diffPct < 0
                            ? 'bg-red-50 text-red-700'
                            : ''
                    )}
                  >
                    <div className="font-medium">{formatCurrency(cell.value)}</div>
                    {!cell.isBase && (
                      <div className="text-xs opacity-75">
                        {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-xs text-[var(--color-text-tertiary)]">
        Base NOI: {formatCurrency(noi)} | Base Cap Rate: {formatPercent(baseCapRate)} | Base Value: {formatCurrency(baseValue)}
      </div>
    </div>
  );
}

interface SimpleSensitivityListProps {
  baseValue: number;
  variations: { label: string; value: number }[];
  className?: string;
}

export function SimpleSensitivityList({
  baseValue,
  variations,
  className,
}: SimpleSensitivityListProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {variations.map((v, idx) => {
        const diff = v.value - baseValue;
        const diffPct = (diff / baseValue) * 100;
        const isBase = Math.abs(diffPct) < 0.01;

        return (
          <div
            key={idx}
            className={cn(
              'flex items-center justify-between px-3 py-2 rounded',
              isBase
                ? 'bg-[var(--accent-bg)] border border-[var(--accent-solid)]'
                : 'bg-[var(--gray-50)]'
            )}
          >
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">
              {v.label}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-[var(--color-text-primary)] tabular-nums">
                {formatCurrency(v.value)}
              </span>
              {!isBase && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    diffPct > 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {diffPct > 0 ? '+' : ''}{diffPct.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
