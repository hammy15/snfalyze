'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RiskAdjustment } from '@/hooks/useRiskValuation';

interface RiskAdjustmentWaterfallProps {
  baseCapRate: number;
  adjustedCapRate: number;
  adjustments: RiskAdjustment[];
}

export function RiskAdjustmentWaterfall({
  baseCapRate,
  adjustedCapRate,
  adjustments,
}: RiskAdjustmentWaterfallProps) {
  const formatBps = (bps: number) => {
    const sign = bps >= 0 ? '+' : '';
    return `${sign}${bps} bps`;
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  // Sort adjustments by absolute impact
  const sortedAdjustments = [...adjustments].sort(
    (a, b) => Math.abs(b.basisPoints) - Math.abs(a.basisPoints)
  );

  const totalAdjustment = adjustments.reduce((sum, a) => sum + a.basisPoints, 0);

  // Calculate cumulative values for waterfall
  let cumulative = baseCapRate;
  const waterfallData = sortedAdjustments.map((adj) => {
    const start = cumulative;
    cumulative += adj.basisPoints / 10000;
    return {
      ...adj,
      start,
      end: cumulative,
    };
  });

  // Category colors
  const categoryColors: Record<string, string> = {
    quality: 'bg-purple-500',
    operations: 'bg-blue-500',
    compliance: 'bg-red-500',
    capital: 'bg-amber-500',
    market: 'bg-emerald-500',
    other: 'bg-gray-500',
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Cap Rate Risk Adjustments
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg mb-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Base Cap Rate</p>
            <p className="text-xl font-bold">{formatPercent(baseCapRate)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-lg font-semibold',
                totalAdjustment > 0 ? 'text-red-600' : 'text-emerald-600'
              )}
            >
              {formatBps(totalAdjustment)}
            </span>
            {totalAdjustment > 0 ? (
              <TrendingUp className="h-5 w-5 text-red-600" />
            ) : totalAdjustment < 0 ? (
              <TrendingDown className="h-5 w-5 text-emerald-600" />
            ) : (
              <Minus className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Adjusted Cap Rate</p>
            <p className="text-xl font-bold text-primary">{formatPercent(adjustedCapRate)}</p>
          </div>
        </div>

        {/* Waterfall visualization */}
        <div className="space-y-2">
          {/* Base cap rate */}
          <div className="flex items-center gap-2 py-2 border-b border-border/50">
            <span className="w-32 text-sm font-medium">Base Cap Rate</span>
            <div className="flex-1 h-6 relative">
              <div
                className="absolute h-full bg-primary rounded"
                style={{
                  left: 0,
                  width: `${(baseCapRate / 0.15) * 100}%`,
                }}
              />
            </div>
            <span className="w-20 text-right text-sm font-semibold">
              {formatPercent(baseCapRate)}
            </span>
          </div>

          {/* Individual adjustments */}
          {waterfallData.map((adj, i) => (
            <div key={i} className="flex items-center gap-2 py-1 text-sm">
              <span className="w-32 truncate text-muted-foreground" title={adj.factor}>
                {adj.factor}
              </span>
              <div className="flex-1 h-4 relative bg-gray-100 dark:bg-gray-800 rounded">
                <div
                  className={cn(
                    'absolute h-full rounded',
                    adj.basisPoints >= 0 ? 'bg-red-400' : 'bg-emerald-400'
                  )}
                  style={{
                    left: `${(Math.min(adj.start, adj.end) / 0.15) * 100}%`,
                    width: `${(Math.abs(adj.basisPoints) / 10000 / 0.15) * 100}%`,
                  }}
                />
              </div>
              <span
                className={cn(
                  'w-20 text-right font-medium',
                  adj.basisPoints >= 0 ? 'text-red-600' : 'text-emerald-600'
                )}
              >
                {formatBps(adj.basisPoints)}
              </span>
            </div>
          ))}

          {/* Final adjusted */}
          <div className="flex items-center gap-2 py-2 border-t border-border/50">
            <span className="w-32 text-sm font-medium">Adjusted Cap Rate</span>
            <div className="flex-1 h-6 relative">
              <div
                className={cn(
                  'absolute h-full rounded',
                  adjustedCapRate > baseCapRate ? 'bg-red-500' : 'bg-emerald-500'
                )}
                style={{
                  left: 0,
                  width: `${(adjustedCapRate / 0.15) * 100}%`,
                }}
              />
            </div>
            <span className="w-20 text-right text-sm font-bold text-primary">
              {formatPercent(adjustedCapRate)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          {Object.entries(categoryColors).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1">
              <div className={cn('w-3 h-3 rounded', color)} />
              <span className="capitalize text-muted-foreground">{cat}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
