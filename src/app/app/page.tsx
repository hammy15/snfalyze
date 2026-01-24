'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/stat-card';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { StatusPill, RiskBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Target,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Bell,
  ChevronRight,
  ArrowRight,
  Plus,
  Sparkles,
  FileText,
  Loader2,
} from 'lucide-react';

interface DashboardData {
  stats: {
    facilitiesTracked: number;
    activeTargets: number;
    pipelineValue: number;
    updatesToday: number;
    riskAlerts: number;
  };
  recentActivity: TimelineItem[];
  pipelineDeals: Array<{
    id: string;
    name: string;
    stage: 'target' | 'contacted' | 'loi' | 'diligence' | 'psa' | 'closed';
    value: number;
    beds: number;
    assignee: string;
  }>;
  riskAlerts: Array<{
    id: string;
    facility: string;
    level: 'low' | 'medium' | 'high';
    score: number;
    reason: string;
  }>;
  pipelineOverview: Array<{
    stage: string;
    count: number;
    value: number;
  }>;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [activityFilter, setActivityFilter] = useState<string>('all');

  // Fetch real dashboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          // Set empty state
          setData({
            stats: {
              facilitiesTracked: 0,
              activeTargets: 0,
              pipelineValue: 0,
              updatesToday: 0,
              riskAlerts: 0,
            },
            recentActivity: [],
            pipelineDeals: [],
            riskAlerts: [],
            pipelineOverview: [
              { stage: 'Target', count: 0, value: 0 },
              { stage: 'Contacted', count: 0, value: 0 },
              { stage: 'LOI', count: 0, value: 0 },
              { stage: 'Diligence', count: 0, value: 0 },
              { stage: 'PSA', count: 0, value: 0 },
              { stage: 'Closed', count: 0, value: 0 },
            ],
          });
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        // Set empty state on error
        setData({
          stats: {
            facilitiesTracked: 0,
            activeTargets: 0,
            pipelineValue: 0,
            updatesToday: 0,
            riskAlerts: 0,
          },
          recentActivity: [],
          pipelineDeals: [],
          riskAlerts: [],
          pipelineOverview: [
            { stage: 'Target', count: 0, value: 0 },
            { stage: 'Contacted', count: 0, value: 0 },
            { stage: 'LOI', count: 0, value: 0 },
            { stage: 'Diligence', count: 0, value: 0 },
            { stage: 'PSA', count: 0, value: 0 },
            { stage: 'Closed', count: 0, value: 0 },
          ],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const filteredActivity = activityFilter === 'all'
    ? data?.recentActivity || []
    : (data?.recentActivity || []).filter((item) => item.type === activityFilter);

  // Check if dashboard is empty (no real data)
  const isEmpty = !data || (
    data.stats.facilitiesTracked === 0 &&
    data.stats.activeTargets === 0 &&
    data.pipelineDeals.length === 0
  );

  if (isEmpty) {
    return (
      <div className="space-y-6">
        {/* Page Header */}
        <div className="page-header">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-header-title">Dashboard</h1>
              <p className="page-header-subtitle">
                Welcome to SNFalyze. Get started by creating your first deal.
              </p>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="card">
          <div className="card-body py-16 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-2">
              No deals yet
            </h2>
            <p className="text-surface-600 dark:text-surface-400 max-w-md mx-auto mb-8">
              Upload your first deal documents to get started. Our AI will analyze them
              and help you build financial models automatically.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/app/deals/new/wizard">
                <Button size="lg">
                  <Sparkles className="w-5 h-5 mr-2" />
                  Start Guided Wizard
                </Button>
              </Link>
              <Link href="/upload">
                <Button variant="outline" size="lg">
                  <FileText className="w-5 h-5 mr-2" />
                  Quick Upload
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/app/deals/new/wizard" className="card hover:border-primary-500 transition-colors">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <h3 className="font-medium text-surface-900 dark:text-surface-100">Guided Wizard</h3>
                  <p className="text-sm text-surface-500">Step-by-step deal setup</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/upload" className="card hover:border-primary-500 transition-colors">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-surface-900 dark:text-surface-100">Upload Documents</h3>
                  <p className="text-sm text-surface-500">Drag & drop P&L, census</p>
                </div>
              </div>
            </div>
          </Link>
          <Link href="/app/map" className="card hover:border-primary-500 transition-colors">
            <div className="card-body">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Target className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-medium text-surface-900 dark:text-surface-100">Find Facilities</h3>
                  <p className="text-sm text-surface-500">Search CMS database</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Dashboard</h1>
            <p className="page-header-subtitle">
              Welcome back. Here&apos;s what&apos;s happening with your pipeline.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app/deals/new/wizard">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Deal
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Facilities Tracked"
          value={data.stats.facilitiesTracked}
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          label="Active Targets"
          value={data.stats.activeTargets}
          icon={<Target className="w-5 h-5" />}
        />
        <StatCard
          label="Pipeline Value"
          value={data.stats.pipelineValue}
          format="currency"
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          label="Updates Today"
          value={data.stats.updatesToday}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Risk Alerts"
          value={data.stats.riskAlerts}
          icon={<AlertTriangle className="w-5 h-5" />}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Activity Feed - Takes 2 columns */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                What Changed
              </h2>
              {filteredActivity.length > 0 && (
                <div className="flex items-center gap-1">
                  {['all', 'risk', 'survey', 'ownership', 'stage'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActivityFilter(filter)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        activityFilter === filter
                          ? 'bg-[var(--accent-light)] text-[var(--accent-solid)]'
                          : 'text-[var(--color-text-secondary)] hover:bg-[var(--gray-100)]'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="card-body">
            {filteredActivity.length > 0 ? (
              <>
                <Timeline items={filteredActivity} />
                <button className="w-full mt-4 py-2 text-sm font-medium text-[var(--accent-solid)] hover:text-[var(--accent-hover)] transition-colors">
                  View all activity
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-surface-500">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Risk Alerts */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[var(--status-error-icon)]" />
                  Risk Alerts
                </h2>
                {data.riskAlerts.length > 0 && (
                  <Link
                    href="/app/alerts"
                    className="text-xs font-medium text-[var(--accent-solid)] hover:text-[var(--accent-hover)]"
                  >
                    View all
                  </Link>
                )}
              </div>
            </div>
            {data.riskAlerts.length > 0 ? (
              <div className="divide-y divide-[var(--color-border-muted)]">
                {data.riskAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={`/app/facilities/${alert.id}`}
                    className="block px-5 py-3 hover:bg-[var(--gray-50)] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {alert.facility}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                          {alert.reason}
                        </div>
                      </div>
                      <RiskBadge level={alert.level} score={alert.score} showScore size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card-body text-center py-6 text-surface-500">
                <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No risk alerts</p>
              </div>
            )}
          </div>

          {/* Pipeline Summary */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
                  Pipeline
                </h2>
                <Link
                  href="/app/deals"
                  className="text-xs font-medium text-[var(--accent-solid)] hover:text-[var(--accent-hover)]"
                >
                  View all
                </Link>
              </div>
            </div>
            {data.pipelineDeals.length > 0 ? (
              <div className="divide-y divide-[var(--color-border-muted)]">
                {data.pipelineDeals.map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/app/deals/${deal.id}`}
                    className="block px-5 py-3 hover:bg-[var(--gray-50)] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {deal.name}
                        </div>
                        <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                          ${(deal.value / 1000000).toFixed(1)}M · {deal.beds} beds
                        </div>
                      </div>
                      <StatusPill status={deal.stage} size="sm" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card-body text-center py-6">
                <Link href="/app/deals/new/wizard">
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Deal
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Stages Overview */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--color-text-primary)]">
              Pipeline Overview
            </h2>
            <Link
              href="/app/deals"
              className="btn btn-secondary btn-sm"
            >
              View Pipeline
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        <div className="card-body">
          <div className="flex items-center gap-2">
            {(data.pipelineOverview || [
              { stage: 'Target', count: 0, value: 0 },
              { stage: 'Contacted', count: 0, value: 0 },
              { stage: 'LOI', count: 0, value: 0 },
              { stage: 'Diligence', count: 0, value: 0 },
              { stage: 'PSA', count: 0, value: 0 },
              { stage: 'Closed', count: 0, value: 0 },
            ]).map((item, index, array) => (
              <div key={item.stage} className="flex items-center flex-1">
                <div className="flex-1 text-center px-4 py-4 bg-[var(--gray-50)] rounded-lg">
                  <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
                    {item.count}
                  </div>
                  <div className="text-xs font-medium text-[var(--color-text-secondary)] mt-1">
                    {item.stage}
                  </div>
                  <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5 tabular-nums">
                    ${item.value}M
                  </div>
                </div>
                {index < array.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)] mx-1 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
