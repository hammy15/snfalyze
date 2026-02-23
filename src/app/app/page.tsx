'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Crosshair,
  Building2,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Bell,
  ArrowRight,
  Eye,
  Star,
  Zap,
  BarChart3,
  Clock,
  Activity,
  Loader2,
  ChevronRight,
  Target,
  Shield,
  Search,
  FileText,
  Wrench,
} from 'lucide-react';

interface DashboardData {
  stats: {
    facilitiesTracked: number;
    activeTargets: number;
    pipelineValue: number;
    totalBeds: number;
  };
  kanbanDeals: Array<{
    id: string;
    name: string;
    status: string;
    value: number;
    beds: number;
    primaryState: string;
    confidenceScore: number;
    facilitiesCount: number;
    updatedAt: string;
  }>;
  pipelineOverview: Array<{
    stage: string;
    label: string;
    count: number;
    value: number;
  }>;
}

interface WatchlistAlert {
  id: string;
  type: string;
  title: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
}

interface WatchlistEntry {
  id: string;
  ccn: string;
  facilityName: string | null;
  lastKnownRating: number | null;
  lastKnownSff: boolean;
  unreadAlertCount: number;
  alerts: WatchlistAlert[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: 'text-blue-600', bg: 'bg-blue-500' },
  analyzing: { label: 'Analyzing', color: 'text-amber-600', bg: 'bg-amber-500' },
  reviewed: { label: 'Reviewed', color: 'text-purple-600', bg: 'bg-purple-500' },
  under_loi: { label: 'Under LOI', color: 'text-cyan-600', bg: 'bg-cyan-500' },
  due_diligence: { label: 'Due Diligence', color: 'text-orange-600', bg: 'bg-orange-500' },
  closed: { label: 'Closed', color: 'text-emerald-600', bg: 'bg-emerald-500' },
  passed: { label: 'Passed', color: 'text-surface-400', bg: 'bg-surface-400' },
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [watchlist, setWatchlist] = useState<{ entries: WatchlistEntry[]; totalUnreadAlerts: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/watchlist').then(r => r.json()).catch(() => ({ success: false })),
    ]).then(([dashData, watchData]) => {
      if (dashData.success) setData(dashData.data);
      if (watchData.success) setWatchlist(watchData.data);
      setLoading(false);
    });
  }, []);

  const relativeTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!data) return null;

  const activeDeals = data.kanbanDeals.filter(d => !['closed', 'passed'].includes(d.status));
  const closedCount = data.kanbanDeals.filter(d => d.status === 'closed').length;
  const activePipeline = data.pipelineOverview.filter(s => !['closed', 'passed'].includes(s.stage));
  const totalActiveValue = activePipeline.reduce((s, p) => s + p.value, 0);
  const recentDeals = [...data.kanbanDeals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 6);
  const alertEntries = watchlist?.entries.filter(e => e.unreadAlertCount > 0) || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {activeDeals.length} active deal{activeDeals.length !== 1 ? 's' : ''} in pipeline &middot; ${totalActiveValue}M total value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app/deals/new/wizard"
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Zap className="w-3.5 h-3.5" />
            New Deal
          </Link>
        </div>
      </div>

      {/* Workflow guide — clear 1-2-3 */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-900 p-5">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200">How It Works</h2>
          <span className="text-[10px] text-surface-400">— your deal underwriting workflow</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            href="/app/tools/quick-screen"
            className="group flex items-start gap-3 p-3.5 rounded-xl border-2 border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-900/5 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
              <span className="text-xs font-bold text-amber-600">1</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200 group-hover:text-amber-600 transition-colors">Screen a Deal</p>
              <p className="text-[11px] text-surface-500 mt-0.5">Quick Screen gives you a GO / PASS signal in 30 seconds</p>
            </div>
          </Link>
          <Link
            href="/app/deals/new/wizard"
            className="group flex items-start gap-3 p-3.5 rounded-xl border-2 border-primary-200 dark:border-primary-800/50 bg-primary-50/50 dark:bg-primary-900/5 hover:border-primary-400 dark:hover:border-primary-600 transition-all"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex-shrink-0">
              <span className="text-xs font-bold text-primary-600">2</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200 group-hover:text-primary-600 transition-colors">Create a Deal</p>
              <p className="text-[11px] text-surface-500 mt-0.5">Upload docs or enter details — AI extracts the data</p>
            </div>
          </Link>
          <Link
            href="/app/deals"
            className="group flex items-start gap-3 p-3.5 rounded-xl border-2 border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/5 hover:border-emerald-400 dark:hover:border-emerald-600 transition-all"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex-shrink-0">
              <span className="text-xs font-bold text-emerald-600">3</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-surface-800 dark:text-surface-200 group-hover:text-emerald-600 transition-colors">Work the Pipeline</p>
              <p className="text-[11px] text-surface-500 mt-0.5">5-stage workspace: Intake → Comps → Pro Forma → Risk → Memo</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Alert banner */}
      {watchlist && watchlist.totalUnreadAlerts > 0 && (
        <Link href="/app/tools/watchlist" className="block">
          <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl hover:bg-amber-100/50 dark:hover:bg-amber-900/20 transition-colors">
            <Bell className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-800 dark:text-amber-200 font-medium">
              {watchlist.totalUnreadAlerts} unread watchlist alert{watchlist.totalUnreadAlerts !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-amber-600 dark:text-amber-400">
              — {alertEntries.length} facilit{alertEntries.length !== 1 ? 'ies' : 'y'} need review
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-500 ml-auto" />
          </div>
        </Link>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5 bg-white dark:bg-surface-900">
          <div className="flex items-center justify-between mb-3">
            <Crosshair className="w-5 h-5 text-primary-500" />
            <span className="text-[10px] text-surface-400 uppercase font-medium">Active</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 dark:text-surface-200">{activeDeals.length}</p>
          <p className="text-xs text-surface-500 mt-1">{closedCount} closed YTD</p>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5 bg-white dark:bg-surface-900">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <span className="text-[10px] text-surface-400 uppercase font-medium">Pipeline</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 dark:text-surface-200">${totalActiveValue}M</p>
          <p className="text-xs text-surface-500 mt-1">{data.stats.pipelineValue > 0 ? `$${Math.round(data.stats.pipelineValue / 1000000)}M total` : 'Including closed'}</p>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5 bg-white dark:bg-surface-900">
          <div className="flex items-center justify-between mb-3">
            <Building2 className="w-5 h-5 text-blue-500" />
            <span className="text-[10px] text-surface-400 uppercase font-medium">Facilities</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 dark:text-surface-200">{data.stats.facilitiesTracked}</p>
          <p className="text-xs text-surface-500 mt-1">{data.stats.totalBeds.toLocaleString()} total beds</p>
        </div>
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5 bg-white dark:bg-surface-900">
          <div className="flex items-center justify-between mb-3">
            <Eye className="w-5 h-5 text-purple-500" />
            <span className="text-[10px] text-surface-400 uppercase font-medium">Watchlist</span>
          </div>
          <p className="text-3xl font-bold text-surface-800 dark:text-surface-200">{watchlist?.entries.length || 0}</p>
          <p className="text-xs text-surface-500 mt-1">
            {watchlist?.entries.filter(e => e.lastKnownSff).length || 0} SFF flagged
          </p>
        </div>
      </div>

      {/* Pipeline velocity + Recent deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline bar */}
        <div className="lg:col-span-2 border border-surface-200 dark:border-surface-700 rounded-xl p-5 bg-white dark:bg-surface-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              Pipeline Distribution
            </h2>
            <Link href="/app/deals" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
              View pipeline <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Stacked bar */}
          <div className="flex h-8 rounded-lg overflow-hidden mb-4">
            {activePipeline.filter(s => s.count > 0).map(stage => {
              const cfg = STATUS_CONFIG[stage.stage] || { bg: 'bg-surface-400' };
              const pct = activeDeals.length > 0 ? (stage.count / activeDeals.length) * 100 : 0;
              return (
                <div
                  key={stage.stage}
                  className={cn('transition-all duration-500', cfg.bg)}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                  title={`${stage.label}: ${stage.count} deal${stage.count !== 1 ? 's' : ''}`}
                />
              );
            })}
            {activeDeals.length === 0 && (
              <div className="w-full bg-surface-200 dark:bg-surface-700" />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4">
            {activePipeline.filter(s => s.count > 0).map(stage => {
              const cfg = STATUS_CONFIG[stage.stage] || { label: stage.label, color: 'text-surface-500', bg: 'bg-surface-400' };
              return (
                <div key={stage.stage} className="flex items-center gap-2">
                  <div className={cn('w-2.5 h-2.5 rounded-full', cfg.bg)} />
                  <span className="text-xs text-surface-600 dark:text-surface-400">
                    {cfg.label} <span className="font-semibold">{stage.count}</span>
                    {stage.value > 0 && <span className="text-surface-400"> (${stage.value}M)</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Watchlist alerts */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5 bg-white dark:bg-surface-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Watchlist Alerts
            </h2>
            <Link href="/app/tools/watchlist" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {alertEntries.length === 0 ? (
            <div className="text-center py-6">
              <Shield className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-surface-500">All clear — no new alerts</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alertEntries.slice(0, 4).map(entry => (
                <Link
                  key={entry.id}
                  href="/app/tools/watchlist"
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/5 hover:bg-amber-100/50 dark:hover:bg-amber-900/10 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                    <Bell className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-800 dark:text-surface-200 truncate">
                      {entry.facilityName || entry.ccn}
                    </p>
                    <p className="text-[10px] text-amber-600">
                      {entry.unreadAlertCount} alert{entry.unreadAlertCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {entry.lastKnownSff && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded flex-shrink-0">SFF</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent deals */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-xl bg-white dark:bg-surface-900">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 dark:border-surface-800">
          <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-surface-400" />
            Recently Updated Deals
          </h2>
          <Link href="/app/deals" className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1">
            All deals <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-surface-100 dark:divide-surface-800">
          {recentDeals.map(deal => {
            const cfg = STATUS_CONFIG[deal.status] || { label: deal.status, color: 'text-surface-500', bg: 'bg-surface-400' };
            return (
              <Link
                key={deal.id}
                href={`/app/deals/${deal.id}`}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors group"
              >
                <div className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.bg)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                    {deal.name}
                  </p>
                  <p className="text-xs text-surface-500">
                    {deal.primaryState && <span>{deal.primaryState} &middot; </span>}
                    {deal.beds > 0 && <span>{deal.beds} beds &middot; </span>}
                    {deal.facilitiesCount} facilit{deal.facilitiesCount !== 1 ? 'ies' : 'y'}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={cn('text-[10px] font-semibold uppercase', cfg.color)}>{cfg.label}</span>
                  {deal.value > 0 && (
                    <p className="text-xs text-surface-500">${(deal.value / 1000000).toFixed(1)}M</p>
                  )}
                </div>
                <span className="text-[10px] text-surface-400 flex-shrink-0 w-14 text-right">
                  {relativeTime(deal.updatedAt)}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-surface-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
              </Link>
            );
          })}
          {recentDeals.length === 0 && (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-surface-500">No deals yet</p>
              <Link href="/app/deals/new/wizard" className="text-xs text-primary-500 hover:text-primary-600 mt-1 inline-block">
                Create your first deal
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick tools row */}
      <div>
        <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          Quick Tools
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { name: 'Quick Screen', href: '/app/tools/quick-screen', icon: Target, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
            { name: 'Bulk CCN', href: '/app/tools/bulk-ccn', icon: Building2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
            { name: 'Market Map', href: '/app/tools/market-map', icon: Activity, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/10' },
            { name: 'Watchlist', href: '/app/tools/watchlist', icon: Eye, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
            { name: 'Rate Tracker', href: '/app/tools/rates', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
            { name: 'All Tools', href: '/app/tools', icon: Star, color: 'text-surface-500', bg: 'bg-surface-100 dark:bg-surface-800' },
          ].map(tool => (
            <Link
              key={tool.name}
              href={tool.href}
              className={cn(
                'flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900',
                'hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm transition-all group'
              )}
            >
              <div className={cn('p-1.5 rounded-lg', tool.bg)}>
                <tool.icon className={cn('w-4 h-4', tool.color)} />
              </div>
              <span className="text-xs font-medium text-surface-700 dark:text-surface-300 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                {tool.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
