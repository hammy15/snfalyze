'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, Eye, Activity, Globe, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalyticsData {
  totalViews: number;
  todayViews: number;
  weekViews: number;
  activeNow: number;
  uniqueVisitors: number;
  topPages: Array<{ path: string; views: number; uniqueVisitors: number }>;
  recentSessions: Array<{
    sessionId: string;
    visitorId: string;
    ip: string;
    country: string | null;
    firstSeen: string;
    lastSeen: string;
    pageCount: number;
    paths: string;
  }>;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analytics/stats')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary-500" />
          Site Analytics
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Who is using SNFalyze and how
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Active Now', value: data.activeNow, icon: Activity, color: 'text-emerald-500', pulse: data.activeNow > 0 },
          { label: 'Today', value: data.todayViews, icon: Eye, color: 'text-blue-500' },
          { label: 'This Week', value: data.weekViews, icon: BarChart3, color: 'text-primary-500' },
          { label: 'All Time', value: data.totalViews, icon: BarChart3, color: 'text-purple-500' },
          { label: 'Unique Visitors', value: data.uniqueVisitors, icon: Users, color: 'text-orange-500' },
        ].map(stat => (
          <div key={stat.label} className="neu-card-warm p-3 text-center">
            <stat.icon className={cn('w-4 h-4 mx-auto mb-1', stat.color, stat.pulse && 'animate-pulse')} />
            <div className="text-2xl font-bold text-surface-800 dark:text-surface-100">{stat.value}</div>
            <div className="text-[10px] text-surface-400 mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="neu-card-warm p-4">
          <h2 className="text-sm font-bold text-surface-700 dark:text-surface-200 mb-3 flex items-center gap-2">
            <Eye className="w-4 h-4 text-primary-500" />
            Top Pages (7 days)
          </h2>
          {data.topPages.length === 0 ? (
            <p className="text-xs text-surface-400 py-4 text-center">No page views yet</p>
          ) : (
            <div className="space-y-1.5">
              {data.topPages.map((page, i) => {
                const maxViews = data.topPages[0]?.views || 1;
                const pct = (page.views / maxViews) * 100;
                return (
                  <div key={page.path} className="relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-primary-100 dark:bg-primary-500/10 rounded"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[9px] font-bold text-surface-400 w-4">{i + 1}</span>
                        <span className="text-xs text-surface-700 dark:text-surface-200 truncate">
                          {page.path}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-bold text-surface-700 dark:text-surface-200">{page.views}</span>
                        <span className="text-[9px] text-surface-400">{page.uniqueVisitors} unique</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Sessions */}
        <div className="neu-card-warm p-4">
          <h2 className="text-sm font-bold text-surface-700 dark:text-surface-200 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-orange-500" />
            Recent Visitors (7 days)
          </h2>
          {data.recentSessions.length === 0 ? (
            <p className="text-xs text-surface-400 py-4 text-center">No sessions yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {data.recentSessions.map(session => {
                const isActive = Date.now() - new Date(session.lastSeen).getTime() < 30 * 60 * 1000;
                return (
                  <div
                    key={session.sessionId}
                    className={cn(
                      'p-3 rounded-lg border transition-colors',
                      isActive
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-500/5'
                        : 'border-surface-200/50 dark:border-surface-700/50'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {isActive && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                        <span className="text-xs font-medium text-surface-700 dark:text-surface-200">
                          {session.ip === 'unknown' ? 'Unknown' : session.ip}
                        </span>
                        {session.country && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-500">
                            {session.country}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-surface-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(session.lastSeen)}
                      </span>
                    </div>
                    <div className="text-[10px] text-surface-400">
                      {session.pageCount} pages — <span className="text-surface-500">{session.paths}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
