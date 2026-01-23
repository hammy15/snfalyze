'use client';

import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface StarRatingDisplayProps {
  rating: number | null | undefined;
  maxRating?: number;
  label?: string;
  showEmpty?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export function StarRatingDisplay({
  rating,
  maxRating = 5,
  label,
  showEmpty = true,
  size = 'md',
  className,
}: StarRatingDisplayProps) {
  const displayRating = rating ?? 0;
  const iconSize = sizeClasses[size];

  if (rating === null || rating === undefined) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        {label && (
          <span className="text-sm text-[var(--color-text-secondary)]">{label}:</span>
        )}
        <span className="text-sm text-[var(--color-text-tertiary)]">N/A</span>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {label && (
        <span className="text-sm text-[var(--color-text-secondary)] mr-1">{label}:</span>
      )}
      <div className="flex items-center">
        {Array.from({ length: maxRating }).map((_, index) => {
          const isFilled = index < displayRating;
          return (
            <Star
              key={index}
              className={cn(
                iconSize,
                isFilled
                  ? 'text-amber-400 fill-amber-400'
                  : showEmpty
                    ? 'text-[var(--gray-300)]'
                    : 'hidden'
              )}
            />
          );
        })}
      </div>
      <span className="text-sm font-medium text-[var(--color-text-primary)] ml-1 tabular-nums">
        {displayRating}
      </span>
    </div>
  );
}

interface RatingBadgeProps {
  rating: number | null | undefined;
  label?: string;
  variant?: 'default' | 'compact';
  className?: string;
}

const ratingColors: Record<number, string> = {
  1: 'bg-red-100 text-red-700 border-red-200',
  2: 'bg-orange-100 text-orange-700 border-orange-200',
  3: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  4: 'bg-lime-100 text-lime-700 border-lime-200',
  5: 'bg-green-100 text-green-700 border-green-200',
};

export function RatingBadge({
  rating,
  label,
  variant = 'default',
  className,
}: RatingBadgeProps) {
  if (rating === null || rating === undefined) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
          'bg-[var(--gray-100)] text-[var(--color-text-tertiary)] border border-[var(--gray-200)]',
          className
        )}
      >
        {label && <span>{label}:</span>}
        <span>N/A</span>
      </div>
    );
  }

  const colorClass = ratingColors[rating] || ratingColors[3];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
        colorClass,
        className
      )}
    >
      {label && <span className="font-medium">{label}:</span>}
      {variant === 'default' ? (
        <>
          <Star className="w-3 h-3 fill-current" />
          <span className="font-semibold">{rating}</span>
        </>
      ) : (
        <span className="font-semibold">{rating}/5</span>
      )}
    </div>
  );
}
