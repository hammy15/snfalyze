'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  format?: 'number' | 'currency' | 'percent';
  delta?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  timestamp?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({
  label,
  value,
  format = 'number',
  delta,
  timestamp,
  loading = false,
  size = 'md',
  icon,
  className,
}: StatCardProps) {
  const formatValue = (val: string | number) => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case 'percent':
        return `${val}%`;
      default:
        return new Intl.NumberFormat('en-US').format(val);
    }
  };

  if (loading) {
    return (
      <div className={cn('stat-card', className)}>
        <div className="skeleton skeleton-text w-24 mb-2" />
        <div className="skeleton skeleton-heading w-32 mb-2" />
        <div className="skeleton skeleton-text w-20" />
      </div>
    );
  }

  return (
    <div className={cn('stat-card', className)}>
      <div className="flex items-start justify-between">
        <div className="stat-card-label">{label}</div>
        {icon && (
          <div className="text-[var(--color-text-tertiary)]">
            {icon}
          </div>
        )}
      </div>

      <div className={cn(
        'stat-card-value tabular-nums',
        size === 'sm' && 'text-lg',
        size === 'lg' && 'text-3xl'
      )}>
        {formatValue(value)}
      </div>

      {delta && (
        <div className={cn(
          'stat-card-delta',
          delta.direction === 'up' && 'stat-card-delta-up',
          delta.direction === 'down' && 'stat-card-delta-down',
          delta.direction === 'neutral' && 'text-[var(--color-text-tertiary)]'
        )}>
          {delta.direction === 'up' && <ArrowUp className="w-3 h-3" />}
          {delta.direction === 'down' && <ArrowDown className="w-3 h-3" />}
          {delta.direction === 'neutral' && <Minus className="w-3 h-3" />}
          <span>{delta.value > 0 ? '+' : ''}{delta.value}%</span>
          {delta.label && <span className="text-[var(--color-text-tertiary)]">{delta.label}</span>}
        </div>
      )}

      {timestamp && (
        <div className="stat-card-timestamp">{timestamp}</div>
      )}
    </div>
  );
}
