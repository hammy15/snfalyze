'use client';

import { cn } from '@/lib/utils';
import { Building2, Bed, DollarSign, TrendingUp, Percent } from 'lucide-react';
import type { FacilityData } from './facility-list';

interface PortfolioMetrics {
  totalFacilities: number;
  totalBeds: number;
  snfCount: number;
  alfCount: number;
  ilfCount: number;
  snfBeds: number;
  alfBeds: number;
  ilfBeds: number;
  avgCmsRating?: number;
  totalValue?: number;
  totalNoi?: number;
  blendedCapRate?: number;
  weightedOccupancy?: number;
}

interface PortfolioSummaryProps {
  facilities: FacilityData[];
  financials?: {
    totalValue?: number;
    totalNoi?: number;
    blendedCapRate?: number;
    weightedOccupancy?: number;
  };
  className?: string;
}

function calculateMetrics(
  facilities: FacilityData[],
  financials?: PortfolioSummaryProps['financials']
): PortfolioMetrics {
  const snfFacilities = facilities.filter((f) => f.assetType === 'SNF');
  const alfFacilities = facilities.filter((f) => f.assetType === 'ALF');
  const ilfFacilities = facilities.filter((f) => f.assetType === 'ILF');

  const snfBeds = snfFacilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
  const alfBeds = alfFacilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
  const ilfBeds = ilfFacilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);

  const facilitiesWithRating = facilities.filter((f) => f.cmsRating);
  const avgCmsRating =
    facilitiesWithRating.length > 0
      ? facilitiesWithRating.reduce((sum, f) => sum + (f.cmsRating || 0), 0) /
        facilitiesWithRating.length
      : undefined;

  return {
    totalFacilities: facilities.length,
    totalBeds: snfBeds + alfBeds + ilfBeds,
    snfCount: snfFacilities.length,
    alfCount: alfFacilities.length,
    ilfCount: ilfFacilities.length,
    snfBeds,
    alfBeds,
    ilfBeds,
    avgCmsRating,
    totalValue: financials?.totalValue,
    totalNoi: financials?.totalNoi,
    blendedCapRate: financials?.blendedCapRate,
    weightedOccupancy: financials?.weightedOccupancy,
  };
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

function MetricCard({
  icon: Icon,
  label,
  value,
  subValue,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}) {
  return (
    <div className={cn('p-4 rounded-lg bg-[var(--gray-50)]', className)}>
      <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
      {subValue && (
        <div className="text-sm text-[var(--color-text-tertiary)]">{subValue}</div>
      )}
    </div>
  );
}

export function PortfolioSummary({
  facilities,
  financials,
  className,
}: PortfolioSummaryProps) {
  const metrics = calculateMetrics(facilities, financials);

  if (facilities.length === 0) {
    return null;
  }

  return (
    <div className={cn('card p-6', className)}>
      <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">
        Portfolio Summary
      </h3>

      {/* Primary metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard
          icon={Building2}
          label="Total Facilities"
          value={metrics.totalFacilities}
          subValue={
            [
              metrics.snfCount > 0 && `${metrics.snfCount} SNF`,
              metrics.alfCount > 0 && `${metrics.alfCount} ALF`,
              metrics.ilfCount > 0 && `${metrics.ilfCount} ILF`,
            ]
              .filter(Boolean)
              .join(', ') || undefined
          }
        />

        <MetricCard
          icon={Bed}
          label="Total Beds"
          value={metrics.totalBeds.toLocaleString()}
          subValue={`${Math.round(metrics.totalBeds / metrics.totalFacilities)} avg/facility`}
        />

        {metrics.totalValue !== undefined && (
          <MetricCard
            icon={DollarSign}
            label="Portfolio Value"
            value={formatCurrency(metrics.totalValue)}
            subValue={`${formatCurrency(metrics.totalValue / metrics.totalBeds)}/bed`}
          />
        )}

        {metrics.totalNoi !== undefined && (
          <MetricCard
            icon={TrendingUp}
            label="Total NOI"
            value={formatCurrency(metrics.totalNoi)}
            subValue={
              metrics.blendedCapRate
                ? `${(metrics.blendedCapRate * 100).toFixed(2)}% cap`
                : undefined
            }
          />
        )}
      </div>

      {/* Asset type breakdown */}
      <div className="border-t border-[var(--color-border-default)] pt-4">
        <h4 className="text-xs font-medium text-[var(--color-text-tertiary)] uppercase mb-3">
          Asset Type Breakdown
        </h4>
        <div className="space-y-3">
          {metrics.snfCount > 0 && (
            <AssetTypeRow
              type="SNF"
              label="Skilled Nursing Facilities"
              count={metrics.snfCount}
              beds={metrics.snfBeds}
              totalBeds={metrics.totalBeds}
              color="bg-blue-500"
            />
          )}
          {metrics.alfCount > 0 && (
            <AssetTypeRow
              type="ALF"
              label="Assisted Living Facilities"
              count={metrics.alfCount}
              beds={metrics.alfBeds}
              totalBeds={metrics.totalBeds}
              color="bg-purple-500"
            />
          )}
          {metrics.ilfCount > 0 && (
            <AssetTypeRow
              type="ILF"
              label="Independent Living Facilities"
              count={metrics.ilfCount}
              beds={metrics.ilfBeds}
              totalBeds={metrics.totalBeds}
              color="bg-green-500"
            />
          )}
        </div>
      </div>

      {/* Additional metrics */}
      {(metrics.avgCmsRating !== undefined || metrics.weightedOccupancy !== undefined) && (
        <div className="border-t border-[var(--color-border-default)] pt-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {metrics.avgCmsRating !== undefined && (
              <div>
                <div className="text-sm text-[var(--color-text-tertiary)]">Avg CMS Rating</div>
                <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {metrics.avgCmsRating.toFixed(1)} ★
                </div>
              </div>
            )}
            {metrics.weightedOccupancy !== undefined && (
              <div>
                <div className="text-sm text-[var(--color-text-tertiary)]">Weighted Occupancy</div>
                <div className="text-lg font-semibold text-[var(--color-text-primary)]">
                  {(metrics.weightedOccupancy * 100).toFixed(1)}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AssetTypeRow({
  type,
  label,
  count,
  beds,
  totalBeds,
  color,
}: {
  type: string;
  label: string;
  count: number;
  beds: number;
  totalBeds: number;
  color: string;
}) {
  const percentage = totalBeds > 0 ? (beds / totalBeds) * 100 : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">{type}</span>
          <span className="text-xs text-[var(--color-text-tertiary)]">{label}</span>
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          {count} facilities · {beds.toLocaleString()} beds
        </div>
      </div>
      <div className="h-2 bg-[var(--gray-100)] rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// Compact version for sidebar/cards
export function PortfolioSummaryCompact({
  facilities,
  className,
}: {
  facilities: FacilityData[];
  className?: string;
}) {
  const metrics = calculateMetrics(facilities);

  return (
    <div className={cn('flex items-center gap-4 text-sm', className)}>
      <div className="flex items-center gap-1">
        <Building2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        <span className="font-medium">{metrics.totalFacilities}</span>
        <span className="text-[var(--color-text-tertiary)]">facilities</span>
      </div>
      <div className="flex items-center gap-1">
        <Bed className="w-4 h-4 text-[var(--color-text-tertiary)]" />
        <span className="font-medium">{metrics.totalBeds.toLocaleString()}</span>
        <span className="text-[var(--color-text-tertiary)]">beds</span>
      </div>
      {metrics.avgCmsRating !== undefined && (
        <div className="flex items-center gap-1">
          <span className="font-medium">{metrics.avgCmsRating.toFixed(1)}</span>
          <span className="text-yellow-500">★</span>
        </div>
      )}
    </div>
  );
}
