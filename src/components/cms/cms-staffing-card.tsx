'use client';

import { Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NormalizedProviderData } from '@/lib/cms';

// National average HPPD values (approximate)
const NATIONAL_AVERAGES = {
  rn: 0.75,
  lpn: 0.85,
  cna: 2.25,
  total: 3.85,
  pt: 0.10,
};

interface StaffingMetric {
  label: string;
  value: number | null;
  national: number;
  unit: string;
}

interface CMSStaffingCardProps {
  provider: NormalizedProviderData | {
    reportedRnHppd?: number | null;
    reportedLpnHppd?: number | null;
    reportedCnaHppd?: number | null;
    totalNursingHppd?: number | null;
  };
  className?: string;
  variant?: 'default' | 'compact';
  showComparison?: boolean;
}

function getComparisonIcon(value: number | null, national: number) {
  if (value === null) return null;
  const diff = ((value - national) / national) * 100;
  if (diff > 5) return { icon: TrendingUp, color: 'text-green-600 dark:text-green-400' };
  if (diff < -5) return { icon: TrendingDown, color: 'text-red-600 dark:text-red-400' };
  return { icon: Minus, color: 'text-surface-500' };
}

export function CMSStaffingCard({
  provider,
  className,
  variant = 'default',
  showComparison = true,
}: CMSStaffingCardProps) {
  const metrics: StaffingMetric[] = [
    {
      label: 'RN Hours',
      value: provider.reportedRnHppd ?? null,
      national: NATIONAL_AVERAGES.rn,
      unit: 'hrs',
    },
    {
      label: 'LPN Hours',
      value: provider.reportedLpnHppd ?? null,
      national: NATIONAL_AVERAGES.lpn,
      unit: 'hrs',
    },
    {
      label: 'CNA Hours',
      value: provider.reportedCnaHppd ?? null,
      national: NATIONAL_AVERAGES.cna,
      unit: 'hrs',
    },
    {
      label: 'Total Nursing',
      value: provider.totalNursingHppd ?? null,
      national: NATIONAL_AVERAGES.total,
      unit: 'hrs',
    },
  ];

  const hasData = metrics.some((m) => m.value !== null);

  if (!hasData) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        <div className="flex items-center gap-1.5 text-surface-500">
          <Users className="w-4 h-4" />
          <span className="font-medium">HPPD:</span>
        </div>
        {metrics.map((metric) => (
          <div key={metric.label} className="flex items-center gap-1">
            <span className="text-surface-500">{metric.label.split(' ')[0]}:</span>
            <span className="font-medium">
              {metric.value !== null ? metric.value.toFixed(2) : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-surface-200 dark:border-surface-700', className)}>
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Staffing Hours per Resident per Day (HPPD)
          </h4>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {metrics.map((metric) => {
            const comparison = showComparison ? getComparisonIcon(metric.value, metric.national) : null;
            const ComparisonIcon = comparison?.icon;

            return (
              <div
                key={metric.label}
                className="flex items-center justify-between py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    {metric.label}:
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-surface-900 dark:text-surface-100">
                    {metric.value !== null ? `${metric.value.toFixed(2)} ${metric.unit}` : 'N/A'}
                  </span>
                  {showComparison && (
                    <div className="flex items-center gap-1 text-xs text-surface-500">
                      {ComparisonIcon && (
                        <ComparisonIcon className={cn('w-3 h-3', comparison?.color)} />
                      )}
                      <span>(Nat'l avg: {metric.national.toFixed(2)})</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact inline display for staffing metrics
 */
export function StaffingMetricsBadges({
  provider,
  className,
}: {
  provider: CMSStaffingCardProps['provider'];
  className?: string;
}) {
  const totalHppd = provider.totalNursingHppd;
  if (totalHppd === null || totalHppd === undefined) return null;

  const isAboveAverage = totalHppd > NATIONAL_AVERAGES.total;
  const isBelowAverage = totalHppd < NATIONAL_AVERAGES.total * 0.85;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        isBelowAverage
          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
          : isAboveAverage
          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
          : 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
        className
      )}
    >
      <Users className="w-3 h-3" />
      <span>{totalHppd.toFixed(2)} HPPD</span>
      {isBelowAverage && <TrendingDown className="w-3 h-3" />}
      {isAboveAverage && <TrendingUp className="w-3 h-3" />}
    </div>
  );
}
