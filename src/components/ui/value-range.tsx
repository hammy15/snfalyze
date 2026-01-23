'use client';

import * as React from 'react';
import { cn, formatCurrency } from '@/lib/utils';

export interface ValueRangeProps {
  low: number;
  base: number;
  high: number;
  label?: string;
  compact?: boolean;
  className?: string;
}

export function ValueRange({
  low,
  base,
  high,
  label,
  compact = false,
  className,
}: ValueRangeProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <h4 className="text-sm font-medium text-cascadia-600 mb-3">{label}</h4>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-cascadia-100 text-center">
          <span className="block text-xs font-medium text-cascadia-500 uppercase tracking-wide mb-1">
            Low
          </span>
          <span className="block text-lg font-semibold text-cascadia-700 tabular-nums">
            {formatCurrency(low, compact)}
          </span>
        </div>
        <div className="p-4 rounded-lg bg-accent/10 text-center border-2 border-accent/20">
          <span className="block text-xs font-medium text-accent uppercase tracking-wide mb-1">
            Base
          </span>
          <span className="block text-xl font-bold text-accent-dark tabular-nums">
            {formatCurrency(base, compact)}
          </span>
        </div>
        <div className="p-4 rounded-lg bg-status-success/10 text-center">
          <span className="block text-xs font-medium text-status-success uppercase tracking-wide mb-1">
            High
          </span>
          <span className="block text-lg font-semibold text-status-success tabular-nums">
            {formatCurrency(high, compact)}
          </span>
        </div>
      </div>
    </div>
  );
}

export interface OfferGuidanceProps {
  suggestedOffer: number;
  walkAway: number;
  upside?: number;
  className?: string;
}

export function OfferGuidance({
  suggestedOffer,
  walkAway,
  upside,
  className,
}: OfferGuidanceProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between py-3 border-b border-cascadia-200">
        <div>
          <span className="block text-sm font-medium text-cascadia-700">
            Suggested Starting Offer
          </span>
          <span className="block text-xs text-cascadia-500">
            Conservative entry point
          </span>
        </div>
        <span className="text-2xl font-bold text-accent tabular-nums">
          {formatCurrency(suggestedOffer, true)}
        </span>
      </div>

      <div className="flex items-center justify-between py-3 border-b border-cascadia-200">
        <div>
          <span className="block text-sm font-medium text-cascadia-700">
            Walk-Away Threshold
          </span>
          <span className="block text-xs text-cascadia-500">
            Maximum defensible price
          </span>
        </div>
        <span className="text-xl font-semibold text-status-warning tabular-nums">
          {formatCurrency(walkAway, true)}
        </span>
      </div>

      {upside && (
        <div className="flex items-center justify-between py-3">
          <div>
            <span className="block text-sm font-medium text-cascadia-700">
              Upside Capture
            </span>
            <span className="block text-xs text-cascadia-500">
              With Cascadia execution
            </span>
          </div>
          <span className="text-xl font-semibold text-status-success tabular-nums">
            {formatCurrency(upside, true)}
          </span>
        </div>
      )}
    </div>
  );
}
