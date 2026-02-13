'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Building2,
  Target,
  Briefcase,
  DollarSign,
  BedDouble,
  Plus,
  Sparkles,
  FileText,
  Search,
  FileCheck,
  Handshake,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  ArrowRight,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

// Kanban stages with Hammy Design System colors
const KANBAN_STAGES = [
  { id: 'new', label: 'New', icon: Target, color: 'primary' },
  { id: 'analyzing', label: 'Analyzing', icon: Search, color: 'accent' },
  { id: 'reviewed', label: 'Reviewed', icon: FileCheck, color: 'primary' },
  { id: 'under_loi', label: 'Under LOI', icon: Handshake, color: 'accent' },
  { id: 'due_diligence', label: 'Due Diligence', icon: ClipboardCheck, color: 'primary' },
  { id: 'closed', label: 'Closed', icon: CheckCircle2, color: 'emerald' },
  { id: 'passed', label: 'Passed', icon: XCircle, color: 'surface' },
];

interface KanbanDeal {
  id: string;
  name: string;
  status: string;
  assetType?: string;
  value: number;
  beds: number;
  primaryState?: string;
  confidenceScore?: number;
  facilitiesCount: number;
  updatedAt: string;
}

interface DashboardData {
  stats: {
    facilitiesTracked: number;
    activeTargets: number;
    pipelineValue: number;
    totalBeds: number;
  };
  kanbanDeals: KanbanDeal[];
  pipelineOverview: Array<{
    stage: string;
    label: string;
    count: number;
    value: number;
  }>;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Mini Kanban Card using Hammy Design - Compact
function MiniKanbanCard({ deal }: { deal: KanbanDeal }) {
  return (
    <Link href={`/app/deals/${deal.id}`}>
      <div className="neu-card p-3 hover-lift cursor-pointer group">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="font-semibold text-sm text-surface-900 dark:text-surface-50 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
            {deal.name}
          </h4>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {deal.assetType && (
            <span className={cn(
              'neu-badge text-xs px-1.5 py-0.5',
              deal.assetType === 'SNF' && 'neu-badge-primary',
              deal.assetType === 'ALF' && 'bg-accent-500/20 text-accent-700 dark:text-accent-300',
            )}>
              {deal.assetType}
            </span>
          )}
          {deal.primaryState && (
            <span className="text-xs text-surface-500 dark:text-surface-400 flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {deal.primaryState}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs border-t border-surface-200 dark:border-surface-700 pt-2">
          <span className="font-bold text-surface-900 dark:text-surface-50">
            {formatCurrency(deal.value)}
          </span>
          <span className="text-surface-500 dark:text-surface-400">
            {deal.beds} beds
          </span>
        </div>
      </div>
    </Link>
  );
}

// Kanban Column using Hammy Design - Compact
function KanbanColumn({ stage, deals }: { stage: typeof KANBAN_STAGES[0]; deals: KanbanDeal[] }) {
  const Icon = stage.icon;
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  const headerColors = {
    primary: 'bg-primary-500 text-white',
    accent: 'bg-accent-500 text-white',
    emerald: 'bg-emerald-500 text-white',
    surface: 'bg-surface-400 dark:bg-surface-600 text-white',
  };

  const bgColors = {
    primary: 'bg-primary-50 dark:bg-primary-950/20',
    accent: 'bg-accent-50 dark:bg-accent-950/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/20',
    surface: 'bg-surface-100 dark:bg-surface-800/50',
  };

  return (
    <div className="flex-shrink-0 w-56">
      {/* Column Header */}
      <div className={cn('rounded-t-xl p-3', headerColors[stage.color as keyof typeof headerColors])}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">{stage.label}</span>
          </div>
          <span className="text-xs font-medium bg-white/20 px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        {deals.length > 0 && (
          <div className="text-xs opacity-80 mt-0.5">
            {formatCurrency(totalValue)}
          </div>
        )}
      </div>

      {/* Column Content */}
      <div className={cn(
        'space-y-2 p-2 rounded-b-xl border border-t-0 border-surface-200 dark:border-surface-700 min-h-[120px]',
        bgColors[stage.color as keyof typeof bgColors]
      )}>
        {deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <Icon className="w-5 h-5 text-surface-300 mb-1" />
            <p className="text-xs text-surface-400">No deals</p>
          </div>
        ) : (
          deals.map((deal) => (
            <MiniKanbanCard key={deal.id} deal={deal} />
          ))
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/dashboard');
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group deals by status for Kanban
  const dealsByStatus = useMemo(() => {
    if (!data?.kanbanDeals) return {};
    return data.kanbanDeals.reduce((acc, deal) => {
      const status = deal.status || 'new';
      if (!acc[status]) acc[status] = [];
      acc[status].push(deal);
      return acc;
    }, {} as Record<string, KanbanDeal[]>);
  }, [data?.kanbanDeals]);

  // Get recent deals
  const recentDeals = useMemo(() => {
    if (!data?.kanbanDeals) return [];
    return [...data.kanbanDeals]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);
  }, [data?.kanbanDeals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="neu-card p-8 animate-pulse-glow">
          <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full bg-primary-500 animate-ping" />
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !data || data.kanbanDeals.length === 0;

  if (isEmpty) {
    return (
      <div className="space-y-8 stagger-children">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-surface-900 dark:text-surface-50">Dashboard</h1>
            <p className="text-surface-500 dark:text-surface-400 mt-1">
              Welcome to SNFalyze. Get started by creating your first deal.
            </p>
          </div>
        </div>

        {/* Empty State */}
        <Card variant="glass" className="glow">
          <CardContent className="py-16 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-500/30 animate-float">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-3">
              No deals in your pipeline
            </h2>
            <p className="text-surface-500 dark:text-surface-400 max-w-md mx-auto mb-8">
              Upload deal documents to get started. Our AI will analyze them and help you make better investment decisions.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/app/deals/new">
                <Button size="lg">
                  <Sparkles className="w-5 h-5" />
                  New Deal
                </Button>
              </Link>
              <Link href="/upload">
                <Button variant="secondary" size="lg">
                  <FileText className="w-5 h-5" />
                  Quick Upload
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Dashboard</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Track your deal pipeline and investment opportunities
          </p>
        </div>
        <Link href="/app/deals/new">
          <Button size="sm">
            <Plus className="w-4 h-4" />
            New Deal
          </Button>
        </Link>
      </div>

      {/* Stats Cards - Compact inline */}
      <div className="neu-card p-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary-500" />
            <span className="text-lg font-bold text-surface-900 dark:text-white">{data.stats.activeTargets}</span>
            <span className="text-xs text-surface-500">Active Deals</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-500" />
            <span className="text-lg font-bold text-surface-900 dark:text-white">{formatCurrency(data.stats.pipelineValue)}</span>
            <span className="text-xs text-surface-500">Pipeline</span>
          </div>
          <div className="flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-blue-500" />
            <span className="text-lg font-bold text-surface-900 dark:text-white">{(data.stats.totalBeds || 0).toLocaleString()}</span>
            <span className="text-xs text-surface-500">Beds</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-purple-500" />
            <span className="text-lg font-bold text-surface-900 dark:text-white">{data.stats.facilitiesTracked}</span>
            <span className="text-xs text-surface-500">Facilities</span>
          </div>
        </div>
      </div>

      {/* Deal Pipeline Kanban Board */}
      <Card>
        <CardHeader className="border-b border-surface-200 dark:border-surface-700 py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Deal Pipeline</CardTitle>
            <Link href="/app/deals">
              <Button variant="secondary" size="sm">
                Full Board
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-4 overflow-x-auto">
          <div className="flex gap-3 min-w-max">
            {KANBAN_STAGES.filter(s => s.id !== 'passed').map((stage) => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                deals={dealsByStatus[stage.id] || []}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row - Compact */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="border-b border-surface-200 dark:border-surface-700 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary-500" />
                  <CardTitle className="text-base">Recent Deals</CardTitle>
                </div>
                <Link href="/app/deals" className="text-xs font-medium text-primary-500 hover:text-primary-600">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-surface-200 dark:divide-surface-700">
                {recentDeals.slice(0, 4).map((deal) => {
                  const stageConfig = KANBAN_STAGES.find(s => s.id === deal.status);

                  return (
                    <Link
                      key={deal.id}
                      href={`/app/deals/${deal.id}`}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-100 dark:hover:bg-surface-800/50 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-sm text-surface-900 dark:text-surface-50 truncate group-hover:text-primary-600 transition-colors">
                            {deal.name}
                          </h3>
                          {deal.assetType && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400">
                              {deal.assetType}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                          <span className="font-semibold">{formatCurrency(deal.value)}</span>
                          <span>•</span>
                          <span>{deal.beds} beds</span>
                          {deal.primaryState && (
                            <>
                              <span>•</span>
                              <span>{deal.primaryState}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={cn(
                          'text-xs px-1.5 py-0.5 rounded',
                          stageConfig?.color === 'primary' && 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400',
                          stageConfig?.color === 'accent' && 'bg-accent-100 text-accent-700 dark:bg-accent-900/30 dark:text-accent-400',
                          stageConfig?.color === 'emerald' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                        )}>
                          {stageConfig?.label || 'New'}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions - Compact */}
        <Card>
          <CardHeader className="border-b border-surface-200 dark:border-surface-700 py-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <Link href="/app/deals/new" className="block">
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-surface-900 dark:text-surface-50">New Deal</h3>
                  <p className="text-xs text-surface-500">Drop files or start fresh</p>
                </div>
              </div>
            </Link>

            <Link href="/app/repository" className="block">
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-accent-500 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-surface-900 dark:text-surface-50">Upload Documents</h3>
                  <p className="text-xs text-surface-500">P&L, census reports</p>
                </div>
              </div>
            </Link>

            <Link href="/app/macro" className="block">
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-surface-900 dark:text-surface-50">Macro Overview</h3>
                  <p className="text-xs text-surface-500">30,000 ft view</p>
                </div>
              </div>
            </Link>

            <Link href="/app/partners" className="block">
              <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                  <Handshake className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-surface-900 dark:text-surface-50">Capital Partners</h3>
                  <p className="text-xs text-surface-500">Lenders & investors</p>
                </div>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
