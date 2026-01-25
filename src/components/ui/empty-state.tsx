'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-10 h-10 mb-3',
      title: 'text-base',
      description: 'text-sm',
      button: 'px-3 py-1.5 text-sm',
    },
    md: {
      container: 'py-12',
      icon: 'w-12 h-12 mb-4',
      title: 'text-lg',
      description: 'text-sm',
      button: 'px-4 py-2 text-sm',
    },
    lg: {
      container: 'py-16',
      icon: 'w-16 h-16 mb-6',
      title: 'text-xl',
      description: 'text-base',
      button: 'px-5 py-2.5 text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500',
          sizes.icon,
          'p-3'
        )}
      >
        {icon}
      </div>
      <h3
        className={cn(
          'font-semibold text-surface-900 dark:text-surface-100',
          sizes.title
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'mt-1 max-w-sm text-surface-500 dark:text-surface-400',
          sizes.description
        )}
      >
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex items-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'rounded-lg bg-primary-500 text-white font-medium',
                'hover:bg-primary-600 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                'dark:focus:ring-offset-surface-900',
                sizes.button
              )}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={cn(
                'rounded-lg border border-surface-300 dark:border-surface-600',
                'text-surface-700 dark:text-surface-300 font-medium',
                'hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors',
                'focus:outline-none focus:ring-2 focus:ring-surface-400 focus:ring-offset-2',
                'dark:focus:ring-offset-surface-900',
                sizes.button
              )}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Pre-built empty states for common scenarios
interface PresetEmptyStateProps {
  onAction?: () => void;
  className?: string;
}

export function EmptyStateNoDeals({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      }
      title="No deals yet"
      description="Get started by creating your first deal or importing from a spreadsheet."
      action={onAction ? { label: 'Create Deal', onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function EmptyStateNoFacilities({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      }
      title="No facilities found"
      description="Try adjusting your filters or add a new facility to your portfolio."
      action={onAction ? { label: 'Add Facility', onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function EmptyStateNoPartners({ onAction, className }: PresetEmptyStateProps) {
  return (
    <EmptyState
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      }
      title="No partners yet"
      description="Connect with operators and investors to grow your network."
      action={onAction ? { label: 'Add Partner', onClick: onAction } : undefined}
      className={className}
    />
  );
}

export function EmptyStateNoResults({ onReset, className }: { onReset?: () => void; className?: string }) {
  return (
    <EmptyState
      icon={
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      }
      title="No results found"
      description="We couldn't find anything matching your search. Try adjusting your filters."
      action={onReset ? { label: 'Clear Filters', onClick: onReset } : undefined}
      className={className}
    />
  );
}

export function EmptyStateError({ onRetry, className }: { onRetry?: () => void; className?: string }) {
  return (
    <EmptyState
      icon={
        <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      }
      title="Something went wrong"
      description="We encountered an error while loading the data. Please try again."
      action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
      className={className}
    />
  );
}
