'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface FacilityProforma {
  facilityId: string;
  facilityName: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  beds: number;
  scenarioName?: string;
  metrics: {
    revenue: number;
    expenses: number;
    noi: number;
    ebitda?: number;
    occupancy?: number;
  };
  yearlyData?: {
    year: number;
    revenue: number;
    expenses: number;
    noi: number;
  }[];
}

interface PortfolioRollupViewProps {
  facilities: FacilityProforma[];
  year?: number;
  showYearlyBreakdown?: boolean;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(2)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

const ASSET_TYPE_COLORS = {
  SNF: 'bg-blue-100 text-blue-700',
  ALF: 'bg-purple-100 text-purple-700',
  ILF: 'bg-green-100 text-green-700',
};

function calculatePortfolioTotals(facilities: FacilityProforma[]) {
  const totals = facilities.reduce(
    (acc, f) => ({
      revenue: acc.revenue + f.metrics.revenue,
      expenses: acc.expenses + f.metrics.expenses,
      noi: acc.noi + f.metrics.noi,
      beds: acc.beds + f.beds,
    }),
    { revenue: 0, expenses: 0, noi: 0, beds: 0 }
  );

  // Calculate weighted occupancy
  const occupancySum = facilities.reduce((sum, f) => {
    if (f.metrics.occupancy) {
      return sum + f.metrics.occupancy * f.beds;
    }
    return sum;
  }, 0);
  const weightedOccupancy = totals.beds > 0 ? occupancySum / totals.beds : 0;

  return {
    ...totals,
    noiMargin: totals.revenue > 0 ? totals.noi / totals.revenue : 0,
    weightedOccupancy,
    facilityCount: facilities.length,
  };
}

function FacilityRow({
  facility,
  portfolioRevenue,
  isExpanded,
  onToggle,
}: {
  facility: FacilityProforma;
  portfolioRevenue: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const revenueShare = portfolioRevenue > 0 ? facility.metrics.revenue / portfolioRevenue : 0;
  const noiMargin = facility.metrics.revenue > 0
    ? facility.metrics.noi / facility.metrics.revenue
    : 0;

  return (
    <>
      <tr
        className={cn(
          'border-b border-[var(--color-border-default)] hover:bg-[var(--gray-50)] cursor-pointer transition-colors',
          isExpanded && 'bg-[var(--gray-50)]'
        )}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <button type="button" className="text-[var(--color-text-tertiary)]">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            <span className={cn('px-2 py-0.5 rounded text-xs font-medium', ASSET_TYPE_COLORS[facility.assetType])}>
              {facility.assetType}
            </span>
            <div>
              <div className="font-medium text-[var(--color-text-primary)]">{facility.facilityName}</div>
              <div className="text-xs text-[var(--color-text-tertiary)]">{facility.beds} beds</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right tabular-nums font-medium">
          {formatCurrency(facility.metrics.revenue)}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {formatCurrency(facility.metrics.expenses)}
        </td>
        <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--color-text-primary)]">
          {formatCurrency(facility.metrics.noi)}
        </td>
        <td className="px-4 py-3 text-right tabular-nums">
          {formatPercent(noiMargin)}
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <div className="w-16 h-2 bg-[var(--gray-100)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-solid)] rounded-full"
                style={{ width: `${revenueShare * 100}%` }}
              />
            </div>
            <span className="text-xs text-[var(--color-text-tertiary)] w-10 text-right">
              {formatPercent(revenueShare)}
            </span>
          </div>
        </td>
      </tr>

      {/* Expanded yearly data */}
      {isExpanded && facility.yearlyData && (
        <tr className="bg-[var(--gray-50)]">
          <td colSpan={6} className="px-4 py-3">
            <div className="pl-10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[var(--color-text-tertiary)]">
                    <th className="text-left py-1 font-normal">Year</th>
                    <th className="text-right py-1 font-normal">Revenue</th>
                    <th className="text-right py-1 font-normal">Expenses</th>
                    <th className="text-right py-1 font-normal">NOI</th>
                    <th className="text-right py-1 font-normal">YoY Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {facility.yearlyData.map((year, idx) => {
                    const prevYear = idx > 0 ? facility.yearlyData![idx - 1] : null;
                    const yoyGrowth = prevYear
                      ? (year.noi - prevYear.noi) / prevYear.noi
                      : null;

                    return (
                      <tr key={year.year} className="border-t border-[var(--color-border-default)]">
                        <td className="py-2 font-medium">{year.year}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(year.revenue)}</td>
                        <td className="py-2 text-right tabular-nums">{formatCurrency(year.expenses)}</td>
                        <td className="py-2 text-right tabular-nums font-medium">{formatCurrency(year.noi)}</td>
                        <td className="py-2 text-right tabular-nums">
                          {yoyGrowth !== null && (
                            <span className={cn(yoyGrowth >= 0 ? 'text-green-600' : 'text-red-600')}>
                              {yoyGrowth >= 0 ? '+' : ''}{formatPercent(yoyGrowth)}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function PortfolioRollupView({
  facilities,
  year,
  showYearlyBreakdown = true,
  className,
}: PortfolioRollupViewProps) {
  const [expandedFacilities, setExpandedFacilities] = useState<Set<string>>(new Set());

  const totals = useMemo(() => calculatePortfolioTotals(facilities), [facilities]);

  // Group by asset type
  const byAssetType = useMemo(() => {
    const groups: Record<string, FacilityProforma[]> = { SNF: [], ALF: [], ILF: [] };
    facilities.forEach((f) => {
      groups[f.assetType].push(f);
    });
    return groups;
  }, [facilities]);

  const toggleFacility = (id: string) => {
    setExpandedFacilities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (facilities.length === 0) {
    return (
      <div className={cn('text-center py-12 text-[var(--color-text-tertiary)]', className)}>
        <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No facility proformas to display</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={Building2}
          label="Facilities"
          value={totals.facilityCount.toString()}
          subValue={`${totals.beds.toLocaleString()} beds`}
        />
        <SummaryCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(totals.revenue)}
          subValue={`${formatCurrency(totals.revenue / totals.beds)}/bed`}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total NOI"
          value={formatCurrency(totals.noi)}
          subValue={`${formatPercent(totals.noiMargin)} margin`}
        />
        <SummaryCard
          icon={TrendingDown}
          label="Total Expenses"
          value={formatCurrency(totals.expenses)}
          subValue={`${formatPercent(1 - totals.noiMargin)} of revenue`}
        />
      </div>

      {/* Asset type breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {(['SNF', 'ALF', 'ILF'] as const).map((type) => {
          const group = byAssetType[type];
          if (group.length === 0) return null;

          const groupTotals = calculatePortfolioTotals(group);

          return (
            <div key={type} className={cn('card p-4', ASSET_TYPE_COLORS[type].replace('text-', 'border-').replace('100', '200'))}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn('px-2 py-0.5 rounded text-xs font-medium', ASSET_TYPE_COLORS[type])}>
                  {type}
                </span>
                <span className="text-sm text-[var(--color-text-secondary)]">
                  {group.length} facilities
                </span>
              </div>
              <div className="text-xl font-bold text-[var(--color-text-primary)]">
                {formatCurrency(groupTotals.noi)}
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)]">
                {groupTotals.beds.toLocaleString()} beds · {formatPercent(groupTotals.noi / totals.noi)} of portfolio
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--gray-50)] border-b border-[var(--color-border-default)]">
                <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                  Facility
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                  Revenue
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                  Expenses
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                  NOI
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                  Margin
                </th>
                <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                  % of Portfolio
                </th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((facility) => (
                <FacilityRow
                  key={facility.facilityId}
                  facility={facility}
                  portfolioRevenue={totals.revenue}
                  isExpanded={expandedFacilities.has(facility.facilityId)}
                  onToggle={() => toggleFacility(facility.facilityId)}
                />
              ))}

              {/* Totals row */}
              <tr className="bg-[var(--gray-100)] font-semibold">
                <td className="px-4 py-3 text-[var(--color-text-primary)]">
                  Portfolio Total
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(totals.revenue)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatCurrency(totals.expenses)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-[var(--color-text-primary)]">
                  {formatCurrency(totals.noi)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatPercent(totals.noiMargin)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  100%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
      <div className="text-sm text-[var(--color-text-tertiary)]">{subValue}</div>
    </div>
  );
}
