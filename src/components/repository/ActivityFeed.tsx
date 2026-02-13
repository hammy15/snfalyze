'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Upload,
  FileText,
  Sparkles,
  UserCheck,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  dealId?: string;
  documentId?: string;
  userName?: string;
  action: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface ActivityFeedProps {
  dealId?: string;
  limit?: number;
  className?: string;
}

const actionIcons: Record<string, typeof Upload> = {
  upload: Upload,
  analyze: Sparkles,
  complete: CheckCircle,
  error: AlertTriangle,
  assign: UserCheck,
  delete: Trash2,
  process: RefreshCw,
};

const actionColors: Record<string, string> = {
  upload: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  analyze: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  complete: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
  error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  assign: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  delete: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  process: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
};

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function ActivityFeed({ dealId, limit = 20, className }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (dealId) params.set('dealId', dealId);
        const res = await fetch(`/api/repository/activity?${params}`);
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, [dealId, limit]);

  if (loading) {
    return (
      <div className={cn('neu-card p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Activity</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-full bg-surface-200 dark:bg-surface-700" />
              <div className="flex-1 space-y-1">
                <div className="h-3 bg-surface-200 dark:bg-surface-700 rounded w-3/4" />
                <div className="h-2 bg-surface-200 dark:bg-surface-700 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('neu-card p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-surface-400" />
          <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Activity</h3>
        </div>
        <p className="text-xs text-surface-500 text-center py-4">No activity yet</p>
      </div>
    );
  }

  return (
    <div className={cn('neu-card p-5', className)}>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-surface-400" />
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">Recent Activity</h3>
        <span className="text-[10px] text-surface-400 ml-auto">{activities.length} events</span>
      </div>

      <div className="space-y-0">
        {activities.map((activity, idx) => {
          const Icon = actionIcons[activity.action] || FileText;
          const colorClass = actionColors[activity.action] || 'bg-surface-100 text-surface-600';
          const isLast = idx === activities.length - 1;

          return (
            <div key={activity.id} className="flex items-start gap-3 relative">
              {/* Timeline line */}
              {!isLast && (
                <div className="absolute left-4 top-8 bottom-0 w-px bg-surface-200 dark:bg-surface-700" />
              )}

              {/* Icon */}
              <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10', colorClass)}>
                <Icon className="w-3.5 h-3.5" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pb-4">
                <p className="text-xs text-surface-700 dark:text-surface-300">
                  {activity.description || `${activity.userName || 'System'} ${activity.action}`}
                </p>
                <p className="text-[10px] text-surface-400 mt-0.5">
                  {timeAgo(activity.createdAt)}
                  {activity.userName && ` · ${activity.userName}`}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
