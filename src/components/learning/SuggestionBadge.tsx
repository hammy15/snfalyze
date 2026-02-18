'use client';

import { useState } from 'react';
import { Lightbulb, ChevronDown, TrendingUp, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SuggestionBadgeProps {
  preferenceKey: string;
  baseline: {
    source: string;
    value: number;
    label?: string;
  };
  learned?: {
    value: number;
    confidence: number;
    sampleCount: number;
  } | null;
  recommended: number;
  formatValue?: (v: number) => string;
  className?: string;
}

export function SuggestionBadge({
  preferenceKey,
  baseline,
  learned,
  recommended,
  formatValue = (v) => `${(v * 100).toFixed(1)}%`,
  className,
}: SuggestionBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const hasLearned = learned && learned.confidence > 0;
  const isLearnedRecommended = hasLearned && learned.confidence > 0.6;

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
          isLearnedRecommended
            ? 'bg-primary-50 text-primary-700 border-primary-200 hover:bg-primary-100'
            : 'bg-surface-50 text-surface-600 border-surface-200 hover:bg-surface-100'
        )}
      >
        <Lightbulb className="w-3 h-3" />
        <span>{formatValue(recommended)}</span>
        {hasLearned && (
          <span className="text-[10px] opacity-70">
            ({learned.sampleCount} deal{learned.sampleCount !== 1 ? 's' : ''})
          </span>
        )}
        <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg border border-[#E2DFD8] shadow-xl z-50 p-3 space-y-2 animate-scale-in">
          <div className="text-[10px] uppercase tracking-wider text-surface-400 font-medium">
            {preferenceKey.replace(/_/g, ' ')}
          </div>

          {/* Baseline */}
          <div className="flex items-center justify-between py-1.5 border-b border-surface-100">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-surface-400" />
              <span className="text-xs text-surface-600">{baseline.label || baseline.source}</span>
            </div>
            <span className="text-xs font-semibold text-surface-700 tabular-nums">
              {formatValue(baseline.value)}
            </span>
          </div>

          {/* Learned */}
          {hasLearned && (
            <div className="flex items-center justify-between py-1.5 border-b border-surface-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-primary-500" />
                <span className="text-xs text-surface-600">Your Historical</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-primary-600 tabular-nums">
                  {formatValue(learned.value)}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-12 h-1 rounded-full bg-surface-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-400"
                      style={{ width: `${learned.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-surface-400">
                    {(learned.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Recommended */}
          <div className="flex items-center justify-between py-1.5">
            <span className="text-xs font-medium text-surface-700">Recommended</span>
            <span className={cn(
              'text-sm font-bold tabular-nums',
              isLearnedRecommended ? 'text-primary-600' : 'text-surface-800'
            )}>
              {formatValue(recommended)}
            </span>
          </div>

          {!hasLearned && (
            <p className="text-[10px] text-surface-400 italic">
              Upload completed deals to build learned preferences
            </p>
          )}
        </div>
      )}
    </div>
  );
}
