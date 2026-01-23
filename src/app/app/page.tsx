'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatCard } from '@/components/ui/stat-card';
import { Timeline, TimelineItem } from '@/components/ui/timeline';
import { StatusPill, RiskBadge } from '@/components/ui/status-badge';
import {
  Building2,
  Target,
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Bell,
  ChevronRight,
  Filter,
  ArrowRight,
} from 'lucide-react';

// Sample data
const recentActivity: TimelineItem[] = [
  {
    id: '1',
    type: 'risk',
    title: 'Sunrise Care: Risk Score Increased',
    description: 'Risk score changed from 45 → 78. Drivers: Staffing decline, recent complaints.',
    date: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'survey',
    title: 'Valley View SNF: Survey Completed',
    description: 'Standard health inspection completed. 3 deficiencies cited (0 immediate jeopardy).',
    date: new Date(Date.now() - 4 * 60 * 60 * 1000),
    metadata: { Tags: 'F-684, F-689, F-880' },
  },
  {
    id: '3',
    type: 'ownership',
    title: 'Harbor Health: Ownership Change',
    description: 'Transferred from ABC Holdings to XYZ Capital. Sale price: $12.5M ($104k/bed).',
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'stage',
    title: 'Sunrise Portfolio: Stage Updated',
    description: 'Deal moved from LOI to Diligence by Sarah Chen.',
    date: new Date(Date.now() - 26 * 60 * 60 * 1000),
  },
  {
    id: '5',
    type: 'signal',
    title: 'New Listing: Maple Grove ALF',
    description: '85-bed ALF in Portland, OR listed at $8.2M. Broker: Marcus & Millichap.',
    date: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
];

const pipelineDeals = [
  { id: '1', name: 'Sunrise Portfolio', stage: 'diligence' as const, value: 45000000, beds: 360, assignee: 'Sarah C.' },
  { id: '2', name: 'Valley Acquisition', stage: 'loi' as const, value: 12000000, beds: 85, assignee: 'Mike R.' },
  { id: '3', name: 'Harbor Health', stage: 'target' as const, value: 18000000, beds: 150, assignee: 'You' },
  { id: '4', name: 'Maple Grove ALF', stage: 'contacted' as const, value: 8200000, beds: 85, assignee: 'Sarah C.' },
];

const riskAlerts = [
  { id: '1', facility: 'Sunrise Care Center', level: 'high' as const, score: 78, reason: 'Staffing below benchmark' },
  { id: '2', facility: 'Desert Palms SNF', level: 'high' as const, score: 72, reason: 'Survey deficiencies' },
  { id: '3', facility: 'Valley View SNF', level: 'medium' as const, score: 58, reason: 'Occupancy decline' },
];

export default function DashboardPage() {
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const filteredActivity = activityFilter === 'all'
    ? recentActivity
    : recentActivity.filter((item) => item.type === activityFilter);

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
            <select className="input input-sm w-32">
              <option>This Week</option>
              <option>This Month</option>
              <option>This Quarter</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Facilities Tracked"
          value={2847}
          delta={{ value: 12, direction: 'up', label: 'vs last month' }}
          icon={<Building2 className="w-5 h-5" />}
        />
        <StatCard
          label="Active Targets"
          value={124}
          delta={{ value: 8, direction: 'up', label: 'this week' }}
          icon={<Target className="w-5 h-5" />}
        />
        <StatCard
          label="Pipeline Value"
          value={847000000}
          format="currency"
          delta={{ value: 15, direction: 'up', label: 'vs last month' }}
          icon={<Briefcase className="w-5 h-5" />}
        />
        <StatCard
          label="Updates Today"
          value={47}
          delta={{ value: 5, direction: 'down', label: 'vs yesterday' }}
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <StatCard
          label="Risk Alerts"
          value={8}
          delta={{ value: 3, direction: 'up', label: 'high priority' }}
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
            </div>
          </div>
          <div className="card-body">
            <Timeline items={filteredActivity} />
            <button className="w-full mt-4 py-2 text-sm font-medium text-[var(--accent-solid)] hover:text-[var(--accent-hover)] transition-colors">
              View all activity
            </button>
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
                <Link
                  href="/app/alerts"
                  className="text-xs font-medium text-[var(--accent-solid)] hover:text-[var(--accent-hover)]"
                >
                  View all
                </Link>
              </div>
            </div>
            <div className="divide-y divide-[var(--color-border-muted)]">
              {riskAlerts.map((alert) => (
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
            <div className="divide-y divide-[var(--color-border-muted)]">
              {pipelineDeals.map((deal) => (
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
                        ${(deal.value / 1000000).toFixed(1)}M · {deal.beds} beds · {deal.assignee}
                      </div>
                    </div>
                    <StatusPill status={deal.stage} size="sm" />
                  </div>
                </Link>
              ))}
            </div>
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
            {[
              { stage: 'Target', count: 12, value: 180 },
              { stage: 'Contacted', count: 8, value: 95 },
              { stage: 'LOI', count: 4, value: 62 },
              { stage: 'Diligence', count: 3, value: 85 },
              { stage: 'PSA', count: 1, value: 22 },
              { stage: 'Closed', count: 2, value: 38 },
            ].map((item, index, array) => (
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
