'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  MapPin,
  Building2,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Users,
  Calendar,
  Layers,
  Map,
  Filter,
  Download,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DonutChart } from '@/components/charts/donut-chart';
import { USMapChart } from '@/components/charts/us-map-chart';
import { Sparkline, SparklineCard } from '@/components/charts/sparkline';
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

          // By stage
          const stage = deal.status || 'unknown';
          if (!dealsByStage[stage]) {
            dealsByStage[stage] = { count: 0, value: 0 };
          }
          dealsByStage[stage].count++;
          dealsByStage[stage].value += value;

          // Count by status category
          if (['closed'].includes(stage.toLowerCase())) {
            closedCount++;
          } else if (['passed'].includes(stage.toLowerCase())) {
            passedCount++;
          } else {
            activeCount++;
          }

          // By type
          const type = deal.assetType || 'Unknown';
          dealsByType[type] = (dealsByType[type] || 0) + 1;

          // By state
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

          // By state
          const state = facility.state || 'Unknown';
          if (!facilityByState[state]) {
            facilityByState[state] = { count: 0, beds: 0 };
          }
          facilityByState[state].count++;
          facilityByState[state].beds += beds;

          // By type
          const type = facility.assetType || 'Unknown';
          facilityByType[type] = (facilityByType[type] || 0) + 1;
        });

        // Generate mock trend data (would come from real data)
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
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-surface-500">Loading macro view...</p>
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

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">
            Macro Overview
          </h1>
          <p className="text-surface-500 text-sm">
            30,000 foot view of deal flow and market activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="neu-button-sm flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
          <button className="neu-button-sm flex items-center gap-1.5 text-xs">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <div className="flex items-center gap-2 text-xs text-surface-500 ml-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Top KPIs with Sparklines */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="neu-card p-3">
          <SparklineCard
            data={stats.trends.weeklyDeals}
            value={stats.deals.total}
            label="Total Deals"
            change={stats.trends.pipelineGrowth}
            changeLabel="vs last month"
            width={60}
            height={20}
          />
        </div>
        <div className="neu-card p-3">
          <SparklineCard
            data={[stats.deals.active * 0.7, stats.deals.active * 0.8, stats.deals.active * 0.9, stats.deals.active]}
            value={stats.deals.active}
            label="Active Deals"
            width={60}
            height={20}
            color="#14B8A6"
          />
        </div>
        <div className="neu-card p-3">
          <SparklineCard
            data={stats.trends.weeklyValue.map(v => v / 1000000)}
            value={formatCurrency(stats.deals.totalValue, true)}
            label="Pipeline Value"
            change={12.5}
            width={60}
            height={20}
          />
        </div>
        <div className="neu-card p-3">
          <SparklineCard
            data={[stats.deals.avgDealSize * 0.9, stats.deals.avgDealSize * 0.95, stats.deals.avgDealSize]}
            value={formatCurrency(stats.deals.avgDealSize, true)}
            label="Avg Deal Size"
            width={60}
            height={20}
          />
        </div>
        <div className="neu-card p-3">
          <SparklineCard
            data={[stats.facilities.total * 0.85, stats.facilities.total * 0.9, stats.facilities.total]}
            value={stats.facilities.total}
            label="Facilities"
            width={60}
            height={20}
            color="#8B5CF6"
          />
        </div>
        <div className="neu-card p-3">
          <SparklineCard
            data={[stats.facilities.totalBeds * 0.85, stats.facilities.totalBeds * 0.9, stats.facilities.totalBeds]}
            value={stats.facilities.totalBeds.toLocaleString()}
            label="Total Beds"
            width={60}
            height={20}
            color="#F59E0B"
          />
        </div>
      </div>

      {/* Main Grid - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Deal Flow Funnel */}
        <div className="lg:col-span-2 neu-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 text-sm">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              Deal Flow Pipeline
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-surface-500">Active</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="text-surface-500">Closed</span>
              </div>
            </div>
          </div>

          <HorizontalFunnel data={funnelData} />

          {/* Conversion metrics */}
          <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <span className="text-xl font-bold text-emerald-600">{stats.deals.closed}</span>
                  <span className="text-xs text-surface-500 ml-1">Closed</span>
                </div>
                <div className="text-center">
                  <span className="text-xl font-bold text-primary-600">{stats.deals.active}</span>
                  <span className="text-xs text-surface-500 ml-1">Active</span>
                </div>
                <div className="text-center">
                  <span className="text-xl font-bold text-surface-400">{stats.deals.passed}</span>
                  <span className="text-xs text-surface-500 ml-1">Passed</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-surface-500">Win Rate</div>
                <div className="text-xl font-bold text-emerald-600">
                  {stats.deals.total > 0 ? Math.round((stats.deals.closed / stats.deals.total) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Type Donut */}
        <div className="neu-card p-4">
          <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-4 text-sm">
            <PieChart className="w-4 h-4 text-primary-500" />
            Asset Type Mix
          </h3>

          <div className="flex justify-center">
            <DonutChart
              data={donutData}
              size={140}
              strokeWidth={24}
              centerValue={stats.deals.total}
              centerLabel="DEALS"
            />
          </div>

          {/* Facility breakdown */}
          <div className="mt-4 pt-3 border-t border-surface-200 dark:border-surface-700">
            <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wide mb-2">
              Portfolio Breakdown
            </h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.facilities.byType).map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center gap-1.5 px-2 py-1 bg-surface-50 dark:bg-surface-800 rounded"
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: assetTypeColors[type] || '#9CA3AF' }}
                  />
                  <span className="text-xs font-medium">{count}</span>
                  <span className="text-xs text-surface-500">{type}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Geographic Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* US Map */}
        <div className="neu-card p-4">
          <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-3 text-sm">
            <Map className="w-4 h-4 text-primary-500" />
            Deal Concentration by State
          </h3>
          <USMapChart
            data={mapData}
            colorScale={['#93C5FD', '#1E40AF']}
            selectedState={selectedState}
            onStateClick={(state) => setSelectedState(state === selectedState ? undefined : state)}
            className="w-full aspect-[16/10]"
          />
          {selectedState && stats.deals.byState[selectedState] && (
            <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded text-xs">
              <span className="font-medium text-primary-700 dark:text-primary-300">
                {selectedState}: {stats.deals.byState[selectedState]} deal{stats.deals.byState[selectedState] !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>

        {/* State Rankings */}
        <div className="space-y-4">
          {/* Deal Geography */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-3 text-sm">
              <MapPin className="w-4 h-4 text-primary-500" />
              Top Deal Markets
            </h3>

            <div className="space-y-2">
              {Object.entries(stats.deals.byState)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([state, count], i) => {
                  const percentage = (count / stats.deals.total) * 100;
                  return (
                    <div key={state} className="flex items-center gap-2">
                      <div className="w-5 text-xs font-bold text-surface-400">#{i + 1}</div>
                      <div className="w-8 text-xs font-medium text-surface-700 dark:text-surface-300">
                        {state}
                      </div>
                      <div className="flex-1 h-3 bg-surface-100 dark:bg-surface-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-8 text-xs font-semibold text-surface-900 dark:text-white text-right">
                        {count}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Facility Geography */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2 mb-3 text-sm">
              <Building2 className="w-4 h-4 text-primary-500" />
              Top Facility Markets
            </h3>

            <div className="space-y-2">
              {Object.entries(stats.facilities.byState)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([state, data], i) => {
                  const maxCount = Object.values(stats.facilities.byState).reduce((max, s) => Math.max(max, s.count), 1);
                  const percentage = (data.count / maxCount) * 100;
                  return (
                    <div key={state} className="flex items-center gap-2">
                      <div className="w-5 text-xs font-bold text-surface-400">#{i + 1}</div>
                      <div className="w-8 text-xs font-medium text-surface-700 dark:text-surface-300">
                        {state}
                      </div>
                      <div className="flex-1 h-3 bg-surface-100 dark:bg-surface-800 rounded overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-20 text-xs text-surface-500 text-right">
                        {data.count} / {data.beds.toLocaleString()} beds
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Insights - Compact inline */}
      <div className="neu-card p-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            <div>
              <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {stats.deals.total > 0 ? Math.round((stats.deals.closed / stats.deals.total) * 100) : 0}%
              </div>
              <div className="text-xs text-emerald-600">Win Rate</div>
            </div>
            <Sparkline
              data={[65, 68, 72, 75, stats.deals.total > 0 ? Math.round((stats.deals.closed / stats.deals.total) * 100) : 70]}
              width={50}
              height={20}
              color="#10B981"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Building2 className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                {stats.facilities.total > 0 ? Math.round(stats.facilities.totalBeds / stats.facilities.total) : 0}
              </div>
              <div className="text-xs text-blue-600">Avg Beds/Facility</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <MapPin className="w-4 h-4 text-purple-600" />
            <div>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {Object.keys(stats.facilities.byState).length}
              </div>
              <div className="text-xs text-purple-600">States</div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            <div>
              <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                +{stats.trends.pipelineGrowth}%
              </div>
              <div className="text-xs text-amber-600">Pipeline Growth</div>
            </div>
            <Sparkline
              data={stats.trends.weeklyDeals}
              width={50}
              height={20}
              color="#F59E0B"
            />
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <DollarSign className="w-4 h-4 text-primary-600" />
            <div>
              <div className="text-lg font-bold text-primary-700 dark:text-primary-300">
                {formatCurrency(stats.deals.totalValue / (stats.facilities.totalBeds || 1), false)}
              </div>
              <div className="text-xs text-primary-600">Value/Bed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
