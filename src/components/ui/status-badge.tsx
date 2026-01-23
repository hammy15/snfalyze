'use client';

import { cn } from '@/lib/utils';

type DealStage = 'target' | 'contacted' | 'loi' | 'diligence' | 'psa' | 'closed' | 'dead';
type RiskLevel = 'low' | 'medium' | 'high';
type StatusType = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusPillProps {
  status: DealStage;
  size?: 'sm' | 'md';
  className?: string;
}

const stageLabels: Record<DealStage, string> = {
  target: 'Target',
  contacted: 'Contacted',
  loi: 'LOI',
  diligence: 'Diligence',
  psa: 'PSA',
  closed: 'Closed',
  dead: 'Dead',
};

export function StatusPill({ status, size = 'md', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'badge',
        `badge-stage-${status}`,
        size === 'sm' && 'badge-sm',
        className
      )}
    >
      {stageLabels[status]}
    </span>
  );
}

interface RiskBadgeProps {
  level: RiskLevel;
  score?: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function RiskBadge({ level, score, showScore = false, size = 'md', className }: RiskBadgeProps) {
  const labels: Record<RiskLevel, string> = {
    low: 'Low',
    medium: 'Medium',
    high: 'High',
  };

  return (
    <span
      className={cn(
        'badge inline-flex items-center gap-1.5',
        `badge-risk-${level}`,
        size === 'sm' && 'badge-sm',
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          level === 'low' && 'bg-[var(--status-success-icon)]',
          level === 'medium' && 'bg-[var(--status-warning-icon)]',
          level === 'high' && 'bg-[var(--status-error-icon)]'
        )}
      />
      {labels[level]}
      {showScore && score !== undefined && (
        <span className="font-semibold">{score}</span>
      )}
    </span>
  );
}

interface StatusBadgeProps {
  type: StatusType;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ type, children, size = 'md', className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        `badge-${type}`,
        size === 'sm' && 'badge-sm',
        className
      )}
    >
      {children}
    </span>
  );
}

interface QualityRatingProps {
  rating: 1 | 2 | 3 | 4 | 5;
  showLabel?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function QualityRating({ rating, showLabel = false, size = 'md', className }: QualityRatingProps) {
  const stars = Array.from({ length: 5 }, (_, i) => i < rating);

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <div className="flex">
        {stars.map((filled, i) => (
          <svg
            key={i}
            className={cn(
              size === 'sm' ? 'w-3 h-3' : 'w-4 h-4',
              filled ? 'text-[var(--status-warning-icon)]' : 'text-[var(--gray-300)]'
            )}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      {showLabel && (
        <span className={cn(
          'text-[var(--color-text-secondary)]',
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        )}>
          {rating}/5
        </span>
      )}
    </div>
  );
}
