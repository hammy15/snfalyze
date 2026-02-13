'use client';

import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Target,
  Shield,
  BarChart3,
} from 'lucide-react';

interface DealMetricsBarProps {
  score?: number;
  confidence?: number;
  askingPrice?: number;
  valuationLow?: number;
  valuationMid?: number;
  valuationHigh?: number;
  topRisks?: string[];
  completeness?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? 'bg-emerald-500'
      : score >= 6
        ? 'bg-amber-500'
        : 'bg-red-500';

  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg', color)}>
      {score.toFixed(1)}
    </div>
  );
}

export function DealMetricsBar({
  score,
  confidence,
  askingPrice,
  valuationLow,
  valuationMid,
  valuationHigh,
  topRisks = [],
  completeness = 0,
}: DealMetricsBarProps) {
  const hasValuation = valuationLow || valuationMid || valuationHigh;

  return (
    <div className="neu-card px-4 py-3 flex items-center gap-6 overflow-x-auto">
      {/* Deal Score */}
      {score !== undefined && (
        <div className="flex items-center gap-3 flex-shrink-0">
          <ScoreBadge score={score} />
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Score</p>
            <p className="text-xs text-surface-600 dark:text-surface-400">
              {confidence !== undefined ? `${confidence}% conf.` : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="w-px h-8 bg-surface-200 dark:bg-surface-700 flex-shrink-0" />

      {/* Valuation Range */}
      {hasValuation ? (
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Low</p>
            <p className="text-sm font-semibold text-red-500">{formatCurrency(valuationLow || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Market</p>
            <p className="text-sm font-bold text-surface-900 dark:text-surface-50">{formatCurrency(valuationMid || 0)}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">High</p>
            <p className="text-sm font-semibold text-emerald-500">{formatCurrency(valuationHigh || 0)}</p>
          </div>
          {askingPrice ? (
            <div className="text-center pl-2 border-l border-surface-200 dark:border-surface-700">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Ask</p>
              <p className="text-sm font-semibold text-blue-500">{formatCurrency(askingPrice)}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-shrink-0">
          <BarChart3 className="w-4 h-4 text-surface-400" />
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Valuation</p>
            <p className="text-xs text-surface-400">Pending analysis</p>
          </div>
        </div>
      )}

      <div className="w-px h-8 bg-surface-200 dark:bg-surface-700 flex-shrink-0" />

      {/* Top Risk */}
      <div className="flex items-center gap-2 flex-shrink-0 min-w-0">
        {topRisks.length > 0 ? (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Top Risk</p>
              <p className="text-xs text-surface-700 dark:text-surface-300 truncate max-w-[200px]">
                {topRisks[0]}
              </p>
            </div>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 text-surface-400 flex-shrink-0" />
            <div>
              <p className="text-[10px] text-surface-500 uppercase tracking-wider">Risks</p>
              <p className="text-xs text-surface-400">None identified</p>
            </div>
          </>
        )}
      </div>

      <div className="w-px h-8 bg-surface-200 dark:bg-surface-700 flex-shrink-0" />

      {/* Completeness */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 transform -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface-200 dark:text-surface-700" />
            <circle
              cx="16"
              cy="16"
              r="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray={`${completeness * 0.754} 75.4`}
              className={completeness >= 80 ? 'text-emerald-500' : completeness >= 40 ? 'text-amber-500' : 'text-red-500'}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-surface-700 dark:text-surface-300">
            {completeness}%
          </span>
        </div>
        <div>
          <p className="text-[10px] text-surface-500 uppercase tracking-wider">Data</p>
          <p className="text-xs text-surface-600 dark:text-surface-400">
            {completeness >= 80 ? 'Complete' : completeness >= 40 ? 'Partial' : 'Limited'}
          </p>
        </div>
      </div>
    </div>
  );
}
