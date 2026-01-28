'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LeaseProjection, YearlyProjection } from '@/hooks/useMasterLease';

interface LeaseProjectionChartProps {
  projection: LeaseProjection;
}

export function LeaseProjectionChart({ projection }: LeaseProjectionChartProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const { yearlyProjections, leaseNpv, totalLeaseObligation, avgAnnualRent } = projection;

  // Find max values for scaling
  const maxRent = Math.max(...yearlyProjections.map((y) => y.annualRent));
  const maxCumulative = Math.max(...yearlyProjections.map((y) => y.cumulativeRent));

  // Phase colors
  const phaseColors: Record<string, string> = {
    initial: 'bg-primary/80',
    renewal_1: 'bg-emerald-500/80',
    renewal_2: 'bg-amber-500/80',
    renewal_3: 'bg-purple-500/80',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Lease Projection
          </CardTitle>
          <Badge variant="outline">
            {projection.totalPotentialYears} Years Total
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary metrics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Lease NPV</p>
            <p className="font-bold text-lg">{formatCompact(leaseNpv)}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Total Obligation</p>
            <p className="font-bold text-lg">{formatCompact(totalLeaseObligation)}</p>
          </div>
          <div className="text-center p-2 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Avg Annual Rent</p>
            <p className="font-bold text-lg">{formatCompact(avgAnnualRent)}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="relative h-48 flex items-end gap-0.5">
          {yearlyProjections.map((year, i) => {
            const height = (year.annualRent / maxRent) * 100;
            const isNewPhase =
              i === 0 ||
              year.phase !== yearlyProjections[i - 1].phase;

            return (
              <div
                key={year.year}
                className="flex-1 flex flex-col items-center group relative"
              >
                {/* Bar */}
                <div
                  className={cn(
                    'w-full rounded-t transition-all',
                    phaseColors[year.phase] || 'bg-primary/80',
                    'hover:opacity-100 opacity-80'
                  )}
                  style={{ height: `${height}%` }}
                />
                {/* Year label (every 5 years) */}
                {year.year % 5 === 0 || year.year === 1 ? (
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Y{year.year}
                  </span>
                ) : null}
                {/* Tooltip on hover */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-popover border rounded-lg shadow-lg p-2 text-xs whitespace-nowrap">
                    <p className="font-semibold">Year {year.year}</p>
                    <p>Rent: {formatCurrency(year.annualRent)}</p>
                    <p>Coverage: {year.projectedCoverage.toFixed(2)}x</p>
                    <p className="capitalize text-muted-foreground">{year.phase.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-primary/80" />
            <span>Initial ({projection.initialTermYears}yr)</span>
          </div>
          {projection.renewalOptions > 0 && (
            <>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-500/80" />
                <span>Renewal 1</span>
              </div>
              {projection.renewalOptions > 1 && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-amber-500/80" />
                  <span>Renewal 2</span>
                </div>
              )}
              {projection.renewalOptions > 2 && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-500/80" />
                  <span>Renewal 3</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Coverage trend line indicator */}
        <div className="mt-3 flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <span className="text-muted-foreground">
            Coverage improves from{' '}
            <span className="font-medium">
              {yearlyProjections[0]?.projectedCoverage.toFixed(2)}x
            </span>{' '}
            to{' '}
            <span className="font-medium">
              {yearlyProjections[yearlyProjections.length - 1]?.projectedCoverage.toFixed(2)}x
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
