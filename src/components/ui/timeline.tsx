'use client';

import { cn } from '@/lib/utils';
import {
  FileText,
  Building2,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';

export type TimelineEventType =
  | 'survey'
  | 'ownership'
  | 'operator'
  | 'signal'
  | 'note'
  | 'stage'
  | 'risk';

export interface TimelineItem {
  id: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: Date;
  metadata?: Record<string, string>;
}

interface TimelineProps {
  items: TimelineItem[];
  loading?: boolean;
  className?: string;
}

const typeIcons: Record<TimelineEventType, typeof FileText> = {
  survey: FileText,
  ownership: Building2,
  operator: Users,
  signal: TrendingUp,
  note: MessageSquare,
  stage: Calendar,
  risk: AlertTriangle,
};

function formatDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) {
    const mins = Math.floor(diffMs / (1000 * 60));
    return `${mins} min ago`;
  }
  if (diffHours < 24) {
    return `${Math.floor(diffHours)} hours ago`;
  }
  if (diffDays < 2) {
    return 'Yesterday';
  }
  if (diffDays < 7) {
    return `${Math.floor(diffDays)} days ago`;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function Timeline({ items, loading = false, className }: TimelineProps) {
  if (loading) {
    return (
      <div className={cn('timeline', className)}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="timeline-item">
            <div className="flex justify-between mb-2">
              <div className="skeleton skeleton-text w-40" />
              <div className="skeleton skeleton-text w-20" />
            </div>
            <div className="skeleton skeleton-text w-full" />
            <div className="skeleton skeleton-text w-3/4 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8', className)}>
        <p className="text-[var(--color-text-tertiary)] text-sm">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn('timeline', className)}>
      {items.map((item) => {
        const Icon = typeIcons[item.type];

        return (
          <div key={item.id} className={cn('timeline-item', item.type)}>
            <div className="timeline-item-header">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-[var(--color-text-tertiary)]" />
                <span className="timeline-item-title">{item.title}</span>
              </div>
              <span className="timeline-item-date">{formatDate(item.date)}</span>
            </div>

            {item.description && (
              <p className="timeline-item-content">{item.description}</p>
            )}

            {item.metadata && Object.keys(item.metadata).length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(item.metadata).map(([key, value]) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1 text-xs text-[var(--color-text-tertiary)] bg-[var(--gray-100)] px-2 py-0.5 rounded"
                  >
                    <span className="font-medium">{key}:</span>
                    <span>{value}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ActivityFeedProps {
  items: TimelineItem[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
}

export function ActivityFeed({
  items,
  loading = false,
  onLoadMore,
  hasMore = false,
  className
}: ActivityFeedProps) {
  return (
    <div className={className}>
      <Timeline items={items} loading={loading} />

      {hasMore && !loading && (
        <button
          onClick={onLoadMore}
          className="w-full mt-4 py-2 text-sm font-medium text-[var(--accent-solid)] hover:text-[var(--accent-hover)] transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  );
}
