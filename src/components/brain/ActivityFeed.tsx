'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Brain, Search, BookOpen, Eye, Database, RefreshCw, Sparkles } from 'lucide-react';

interface Activity {
  id: string;
  activityType: string;
  brainId: string | null;
  senseId: string | null;
  summary: string;
  createdAt: string;
}

const TYPE_CONFIG: Record<string, { icon: typeof Brain; color: string; label: string }> = {
  analysis: { icon: Brain, color: 'text-primary-500', label: 'Analysis' },
  learning: { icon: BookOpen, color: 'text-purple-500', label: 'Learning' },
  research: { icon: Search, color: 'text-blue-500', label: 'Research' },
  sense_activation: { icon: Eye, color: 'text-amber-500', label: 'Sense' },
  knowledge_import: { icon: Database, color: 'text-emerald-500', label: 'Import' },
  rerun: { icon: RefreshCw, color: 'text-indigo-500', label: 'Re-run' },
  insight: { icon: Sparkles, color: 'text-pink-500', label: 'Insight' },
};

function getBrainBadge(brainId: string | null) {
  if (brainId === 'newo') return <span className="text-[10px] font-bold text-teal-600 bg-teal-50 dark:bg-teal-500/10 px-1.5 py-0.5 rounded">NEWO</span>;
  if (brainId === 'dev') return <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/10 px-1.5 py-0.5 rounded">DEV</span>;
  return null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function ActivityFeed({ className }: { className?: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cil/activity?limit=15')
      .then((r) => r.json())
      .then((data) => {
        setActivities(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 shimmer-warm rounded-lg" />
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-surface-400', className)}>
        <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">No CIL activity yet</p>
        <p className="text-xs mt-1">Analyze a deal to see brain activity here</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      {activities.map((activity) => {
        const config = TYPE_CONFIG[activity.activityType] ?? TYPE_CONFIG.insight!;
        const Icon = config.icon;
        return (
          <div
            key={activity.id}
            className="flex items-start gap-3 px-3 py-2 rounded-lg hover:bg-[#EFEDE8] dark:hover:bg-surface-800/50 transition-colors"
          >
            <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', config.color)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {getBrainBadge(activity.brainId)}
                <span className="text-xs text-surface-400">{timeAgo(activity.createdAt)}</span>
              </div>
              <p className="text-sm text-surface-700 dark:text-surface-300 mt-0.5 line-clamp-2">
                {activity.summary}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
