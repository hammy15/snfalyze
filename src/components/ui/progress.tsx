'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value, max = 100, variant = 'default', showLabel, size = 'md', ...props }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const variants = {
      default: 'bg-accent',
      success: 'bg-status-success',
      warning: 'bg-status-warning',
      error: 'bg-status-error',
    };

    const sizes = {
      sm: 'h-1.5',
      md: 'h-2',
      lg: 'h-3',
    };

    return (
      <div className={cn('w-full', className)} ref={ref} {...props}>
        {showLabel && (
          <div className="flex justify-between mb-1">
            <span className="text-sm text-surface-600">Progress</span>
            <span className="text-sm font-medium text-surface-700">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={cn('w-full rounded-full bg-surface-200 overflow-hidden', sizes[size])}>
          <div
            className={cn('h-full rounded-full transition-all duration-500 ease-out', variants[variant])}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';
