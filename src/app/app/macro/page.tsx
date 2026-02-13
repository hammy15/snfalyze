'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  MapPin,
  Building2,
  DollarSign,
  PieChart,
  ArrowUpRight,
  Briefcase,
  Map,
  X,
  Activity,
  Target,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DonutChart } from '@/components/charts/donut-chart';
import { USMapChart } from '@/components/charts/us-map-chart';
import { HorizontalFunnel } from '@/components/charts/funnel-chart';

interface Deal {
  id: string;
  name: string;
  status: string;
  assetType: string;
  askingPrice: string;
  beds: number;
  primaryState: string;
  markets: string[];
  createdAt?: string;
}

interface Facility {
  id: string;
  name: string;
  state: string;
  assetType: string;
  licensedBeds: number;
}

interface MacroStats {
  deals: {
    total: number;
    active: number;
    closed: number;
    passed: number;
    totalValue: number;
    avgDealSize: number;
    byStage: Record<string, { count: number; value: number }>;
    byType: Record<string, number>;
    byState: Record<string, number>;
  };
  facilities: {
    total: number;
    totalBeds: number;
    byState: Record<string, { count: number; beds: number }>;
    byType: Record<string, number>;
  };
  trends: {
    dealsThisMonth: number;
    dealsLastMonth: number;
    pipelineGrowth: number;
    weeklyDeals: number[];
    weeklyValue: number[];
  };
}

// Stage configuration
const stageOrder = ['new', 'analyzing', 'reviewed', 'under_loi', 'due_diligence', 'closed', 'passed'];
const stageLabels: Record<string, string> = {
  new: 'New',
  analyzing: 'Analyzing',
  reviewed: 'Reviewed',
  under_loi: 'Under LOI',
  due_diligence: 'Due Diligence',
  closed: 'Closed',
  passed: 'Passed'
};
const stageColors: Record<string, string> = {
  new: '#10B981',
  analyzing: '#F59E0B',
  reviewed: '#3B82F6',
  under_loi: '#F97316',
  due_diligence: '#8B5CF6',
  closed: '#14B8A6',
  passed: '#9CA3AF'
};

// Asset type colors
const assetTypeColors: Record<string, string> = {
  SNF: '#3B82F6',
  ALF: '#10B981',
  ILF: '#8B5CF6',
  CCRC: '#F59E0B',
  HOSPICE: '#F97316',
};

export default function MacroPage() {
  const [stats, setStats] = useState<MacroStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [showPipeline, setShowPipeline] = useState(true);
  const [showAssetMix, setShowAssetMix] = useState(true);
  const [showMarkets, setShowMarkets] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dealsRes, facilitiesRes] = await Promise.all([
          fetch('/api/deals'),
          fetch('/api/facilities')
        ]);

        const dealsData = await dealsRes.json();
        const facilitiesData = await facilitiesRes.json();

        const deals: Deal[] = dealsData.data || [];
        const facilities: Facility[] = facilitiesData.data || [];

        // Calculate deal stats
        const dealsByStage: Record<string, { count: number; value: number }> = {};
        const dealsByType: Record<string, number> = {};
        const dealsByState: Record<string, number> = {};
        let totalValue = 0;
        let activeCount = 0;
        let closedCount = 0;
        let passedCount = 0;

        deals.forEach(deal => {
          const value = parseFloat(deal.askingPrice) || 0;
          totalValue += value;

          const stage = deal.status || 'unknown';
          if (!dealsByStage[stage]) {
            dealsByStage[stage] = { count: 0, value: 0 };
          }
          dealsByStage[stage].count++;
          dealsByStage[stage].value += value;

          if (['closed'].includes(stage.toLowerCase())) {
            closedCount++;
          } else if (['passed'].includes(stage.toLowerCase())) {
            passedCount++;
          } else {
            activeCount++;
          }

          const type = deal.assetType || 'Unknown';
          dealsByType[type] = (dealsByType[type] || 0) + 1;

          const state = deal.primaryState || 'Unknown';
          dealsByState[state] = (dealsByState[state] || 0) + 1;
        });

        // Calculate facility stats
        const facilityByState: Record<string, { count: number; beds: number }> = {};
        const facilityByType: Record<string, number> = {};
        let totalBeds = 0;

        facilities.forEach(facility => {
          const beds = facility.licensedBeds || 0;
          totalBeds += beds;

          const state = facility.state || 'Unknown';
          if (!facilityByState[state]) {
            facilityByState[state] = { count: 0, beds: 0 };
          }
          facilityByState[state].count++;
          facilityByState[state].beds += beds;

          const type = facility.assetType || 'Unknown';
          facilityByType[type] = (facilityByType[type] || 0) + 1;
        });

        const weeklyDeals = [3, 5, 4, 7, 6, 8, deals.length > 0 ? Math.min(deals.length, 10) : 9];
        const weeklyValue = weeklyDeals.map(d => d * (totalValue / deals.length || 1000000));

        setStats({
          deals: {
            total: deals.length,
            active: activeCount,
            closed: closedCount,
            passed: passedCount,
            totalValue,
            avgDealSize: deals.length > 0 ? totalValue / deals.length : 0,
            byStage: dealsByStage,
            byType: dealsByType,
            byState: dealsByState,
          },
          facilities: {
            total: facilities.length,
            totalBeds,
            byState: facilityByState,
            byType: facilityByType,
          },
          trends: {
            dealsThisMonth: deals.length,
            dealsLastMonth: Math.max(0, deals.length - 2),
            pipelineGrowth: 15.3,
            weeklyDeals,
            weeklyValue,
          },
        });
      } catch (error) {
        console.error('Error fetching macro data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Prepare chart data
  const donutData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.deals.byType).map(([type, count]) => ({
      label: type,
      value: count,
      color: assetTypeColors[type] || '#9CA3AF',
    }));
  }, [stats]);

  const funnelData = useMemo(() => {
    if (!stats) return [];
    return stageOrder
      .filter(stage => stage !== 'passed')
      .map(stage => ({
        label: stageLabels[stage],
        value: stats.deals.byStage[stage]?.count || 0,
        secondaryValue: formatCurrency(stats.deals.byStage[stage]?.value || 0, true),
        color: stageColors[stage],
      }));
  }, [stats]);

  const mapData = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.deals.byState).map(([state, count]) => ({
      state,
      value: count,
      label: `${count} deal${count !== 1 ? 's' : ''}`,
    }));
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3rem)] -m-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-500">Loading radar view...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <p className="text-surface-500">Unable to load data</p>
      </div>
    );
  }

  const winRate = stats.deals.total > 0 ? Math.round((stats.deals.closed / stats.deals.total) * 100) : 0;

  return (
    <div className="relative h-[calc(100vh-3rem)] -m-6 overflow-hidden bg-surface-950">
      {/* === FULL-VIEWPORT MAP CANVAS === */}
      <div className="absolute inset-0">
        <USMapChart
          data={mapData}
          colorScale={['#134e4a', '#14b8a6']}
          selectedState={selectedState}
          onStateClick={(state) => setSelectedState(state === selectedState ? undefined : state)}
          className="w-full h-full"
        />
      </div>

      {/* === FLOATING OVERLAYS === */}

      {/* Top: KPI Strip */}
      <div className="absolute top-3 left-3 right-3 z-10">
        <div className="flex items-center gap-3">
          {/* Title Chip */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-900/80 backdrop-blur-xl border border-surface-700/50">
            <Map className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-semibold text-white">Portfolio Radar</span>
          </div>

          {/* KPI Chips */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            <KPIChip
              icon={<Briefcase className="w-3.5 h-3.5" />}
              value={stats.deals.total}
              label="Deals"
              color="primary"
            />
            <KPIChip
              icon={<DollarSign className="w-3.5 h-3.5" />}
              value={formatCurrency(stats.deals.totalValue, true)}
              label="Pipeline"
              color="primary"
            />
            <KPIChip
              icon={<Target className="w-3.5 h-3.5" />}
              value={stats.deals.active}
              label="Active"
              color="emerald"
            />
            <KPIChip
              icon={<ArrowUpRight className="w-3.5 h-3.5" />}
              value={`${winRate}%`}
              label="Win Rate"
              color="emerald"
            />
            <KPIChip
              icon={<Building2 className="w-3.5 h-3.5" />}
              value={stats.facilities.total}
              label="Facilities"
              color="violet"
            />
            <KPIChip
              icon={<Activity className="w-3.5 h-3.5" />}
              value={`+${stats.trends.pipelineGrowth}%`}
              label="Growth"
              color="amber"
            />
          </div>

          {/* Panel Toggles */}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-surface-900/80 backdrop-blur-xl border border-surface-700/50">
            <ToggleButton active={showPipeline} onClick={() => setShowPipeline(!showPipeline)} label="Pipeline">
              <TrendingUp className="w-3.5 h-3.5" />
            </ToggleButton>
            <ToggleButton active={showAssetMix} onClick={() => setShowAssetMix(!showAssetMix)} label="Mix">
              <PieChart className="w-3.5 h-3.5" />
            </ToggleButton>
            <ToggleButton active={showMarkets} onClick={() => setShowMarkets(!showMarkets)} label="Markets">
              <MapPin className="w-3.5 h-3.5" />
            </ToggleButton>
          </div>
        </div>
      </div>

      {/* Bottom-Left: Deal Flow Pipeline (Floating) */}
      {showPipeline && (
        <div className="absolute bottom-3 left-3 z-10 w-[420px] animate-fade-in">
          <FloatingCard
            title="Deal Flow Pipeline"
            icon={<TrendingUp className="w-3.5 h-3.5 text-primary-400" />}
            onClose={() => setShowPipeline(false)}
          >
            <HorizontalFunnel data={funnelData} />
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-xs">
                  <span className="font-bold text-emerald-400">{stats.deals.closed}</span>
                  <span className="text-surface-400 ml-1">Closed</span>
                </span>
                <span className="text-xs">
                  <span className="font-bold text-primary-400">{stats.deals.active}</span>
                  <span className="text-surface-400 ml-1">Active</span>
                </span>
                <span className="text-xs">
                  <span className="font-bold text-surface-500">{stats.deals.passed}</span>
                  <span className="text-surface-400 ml-1">Passed</span>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-surface-400">Win Rate </span>
                <span className="text-sm font-bold text-emerald-400">{winRate}%</span>
              </div>
            </div>
          </FloatingCard>
        </div>
      )}

      {/* Bottom-Right: Asset Mix (Floating) */}
      {showAssetMix && (
        <div className="absolute bottom-3 right-3 z-10 w-[280px] animate-fade-in">
          <FloatingCard
            title="Asset Mix"
            icon={<PieChart className="w-3.5 h-3.5 text-primary-400" />}
            onClose={() => setShowAssetMix(false)}
          >
            <div className="flex justify-center">
              <DonutChart
                data={donutData}
                size={120}
                strokeWidth={20}
                centerValue={stats.deals.total}
                centerLabel="DEALS"
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(stats.facilities.byType).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded text-xs"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: assetTypeColors[type] || '#9CA3AF' }}
                  />
                  <span className="text-surface-300">{count} {type}</span>
                </div>
              ))}
            </div>
          </FloatingCard>
        </div>
      )}

      {/* Top-Right: Market Rankings (Floating) */}
      {showMarkets && (
        <div className="absolute top-16 right-3 z-10 w-[300px] animate-fade-in">
          <FloatingCard
            title="Top Markets"
            icon={<MapPin className="w-3.5 h-3.5 text-primary-400" />}
            onClose={() => setShowMarkets(false)}
          >
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-surface-500">Deal Concentration</p>
              {Object.entries(stats.deals.byState)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([state, count], i) => {
                  const percentage = (count / stats.deals.total) * 100;
                  return (
                    <button
                      key={state}
                      onClick={() => setSelectedState(state === selectedState ? undefined : state)}
                      className={cn(
                        'flex items-center gap-2 w-full text-left rounded-lg px-2 py-1.5 transition-colors',
                        selectedState === state ? 'bg-primary-500/20' : 'hover:bg-white/5'
                      )}
                    >
                      <div className="w-5 text-xs font-bold text-surface-500">#{i + 1}</div>
                      <div className="w-8 text-xs font-medium text-surface-200">{state}</div>
                      <div className="flex-1 h-2 bg-white/5 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-8 text-xs font-semibold text-white text-right">{count}</div>
                    </button>
                  );
                })}
            </div>

            {Object.keys(stats.facilities.byState).length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-surface-500">Facility Beds</p>
                {Object.entries(stats.facilities.byState)
                  .sort((a, b) => b[1].beds - a[1].beds)
                  .slice(0, 3)
                  .map(([state, data]) => (
                    <div key={state} className="flex items-center justify-between text-xs">
                      <span className="text-surface-300">{state}</span>
                      <span className="text-surface-400">
                        {data.count} facilities · {data.beds.toLocaleString()} beds
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </FloatingCard>
        </div>
      )}

      {/* State Detail Slide-Out */}
      {selectedState && stats.deals.byState[selectedState] && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 animate-fade-in">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-900/90 backdrop-blur-xl border border-primary-500/30 shadow-glow-primary">
            <MapPin className="w-4 h-4 text-primary-400" />
            <div>
              <span className="text-sm font-semibold text-white">{selectedState}</span>
              <span className="text-xs text-surface-400 ml-2">
                {stats.deals.byState[selectedState]} deal{stats.deals.byState[selectedState] !== 1 ? 's' : ''}
              </span>
              {stats.facilities.byState[selectedState] && (
                <span className="text-xs text-surface-400 ml-2">
                  · {stats.facilities.byState[selectedState].count} facilities
                  · {stats.facilities.byState[selectedState].beds.toLocaleString()} beds
                </span>
              )}
            </div>
            <button
              onClick={() => setSelectedState(undefined)}
              className="ml-2 w-5 h-5 rounded flex items-center justify-center text-surface-500 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// === Floating Card Component ===
function FloatingCard({
  title,
  icon,
  onClose,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-surface-900/85 backdrop-blur-xl border border-surface-700/50 shadow-xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-xs font-medium text-surface-200">{title}</span>
        </div>
        <button
          onClick={onClose}
          className="w-5 h-5 rounded flex items-center justify-center text-surface-500 hover:text-white transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="px-3 py-3">
        {children}
      </div>
    </div>
  );
}

// === KPI Chip Component ===
function KPIChip({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: 'primary' | 'emerald' | 'violet' | 'amber';
}) {
  const colorMap = {
    primary: 'text-primary-400',
    emerald: 'text-emerald-400',
    violet: 'text-violet-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-surface-900/80 backdrop-blur-xl border border-surface-700/50 flex-shrink-0">
      <span className={colorMap[color]}>{icon}</span>
      <span className="text-xs font-bold text-white">{value}</span>
      <span className="text-[10px] text-surface-400">{label}</span>
    </div>
  );
}

// === Toggle Button Component ===
function ToggleButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={`${active ? 'Hide' : 'Show'} ${label}`}
      className={cn(
        'w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
        active
          ? 'bg-primary-500/20 text-primary-400'
          : 'text-surface-500 hover:text-surface-300 hover:bg-white/5'
      )}
    >
      {children}
    </button>
  );
}
