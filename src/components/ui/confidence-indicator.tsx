'use client';

import * as React from 'react';
import { cn, getConfidenceColor, getConfidenceLabel } from '@/lib/utils';

export interface ConfidenceIndicatorProps {
  score: number;
  narrative?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConfidenceIndicator({
  score,
  narrative,
  showLabel = true,
  size = 'md',
  className,
}: ConfidenceIndicatorProps) {
  const colorClass = getConfidenceColor(score);
  const label = getConfidenceLabel(score);

  const sizes = {
    sm: { bar: 'h-1.5', text: 'text-xs', score: 'text-sm' },
    md: { bar: 'h-2', text: 'text-sm', score: 'text-base' },
    lg: { bar: 'h-3', text: 'text-base', score: 'text-lg' },
  };

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={cn('font-semibold tabular-nums', sizes[size].score)}>
            {score}
          </span>
          {showLabel && (
            <span className={cn('text-cascadia-500', sizes[size].text)}>{label}</span>
          )}
        </div>
        <span className={cn('text-cascadia-400', sizes[size].text)}>/100</span>
      </div>

      <div className={cn('w-full rounded-full bg-cascadia-200 overflow-hidden', sizes[size].bar)}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', colorClass)}
          style={{ width: `${score}%` }}
        />
      </div>

      {narrative && (
        <p className={cn('mt-2 text-cascadia-600', sizes[size].text)}>{narrative}</p>
      )}
    </div>
  );
}

export interface ConfidenceBreakdownProps {
  assumptions: Array<{
    field: string;
    category: string;
    impact: number;
    reason: string;
  }>;
  baseScore?: number;
  className?: string;
}

export function ConfidenceBreakdown({
  assumptions,
  baseScore = 100,
  className,
}: ConfidenceBreakdownProps) {
  const totalDecay = assumptions.reduce((acc, a) => acc + a.impact, 0);
  const finalScore = Math.max(baseScore - totalDecay, 10);

  const categoryColors: Record<string, string> = {
    minor: 'bg-cascadia-300',
    census: 'bg-status-warning',
    labor: 'bg-status-warning',
    regulatory: 'bg-status-error',
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-cascadia-600">Base Confidence</span>
        <span className="font-medium">{baseScore}</span>
      </div>

      {assumptions.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-medium text-cascadia-500 uppercase tracking-wide">
            Assumptions Applied
          </span>
          {assumptions.map((assumption, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-2 border-b border-cascadia-100 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    categoryColors[assumption.category] || 'bg-cascadia-300'
                  )}
                />
                <span className="text-sm text-cascadia-700">{assumption.field}</span>
              </div>
              <span className="text-sm font-medium text-status-error">
                −{assumption.impact}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-cascadia-200">
        <span className="font-medium text-cascadia-700">Final Confidence</span>
        <span className="text-lg font-semibold">{finalScore}</span>
      </div>
    </div>
  );
}
