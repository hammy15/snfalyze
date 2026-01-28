'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Grid3X3, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Sensitivity } from '@/hooks/useMasterLease';

interface SensitivityMatrixProps {
  sensitivity: Sensitivity;
  currentCapRate?: number;
}

export function SensitivityMatrix({
  sensitivity,
  currentCapRate = 0.075,
}: SensitivityMatrixProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const { capRateSensitivity, breakEvenOccupancy, breakEvenNoiDecline, cushionToBreakeven } =
    sensitivity;

  // Find the current cap rate row to highlight
  const currentIndex = capRateSensitivity.findIndex(
    (s) => Math.abs(s.capRate - currentCapRate) < 0.001
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Grid3X3 className="h-5 w-5 text-primary" />
          Sensitivity Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Break-even metrics */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Break-Even Occupancy</p>
            <p className="text-xl font-bold">{formatPercent(breakEvenOccupancy)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Break-Even NOI Decline</p>
            <p className="text-xl font-bold">{formatPercent(breakEvenNoiDecline)}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Cushion to Break-Even</p>
            <p
              className={cn(
                'text-xl font-bold',
                cushionToBreakeven >= 0.2 ? 'text-emerald-600' : cushionToBreakeven >= 0.1 ? 'text-amber-600' : 'text-red-600'
              )}
            >
              {formatPercent(cushionToBreakeven)}
            </p>
          </div>
        </div>

        {/* Cap Rate Sensitivity Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-2 px-3 text-left font-medium text-muted-foreground">Cap Rate</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Purchase Price</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Annual Rent</th>
                <th className="py-2 px-3 text-right font-medium text-muted-foreground">Coverage</th>
              </tr>
            </thead>
            <tbody>
              {capRateSensitivity.map((row, i) => {
                const isCurrentRow = i === currentIndex;
                const isBelowTarget = row.coverage < 1.4;
                return (
                  <tr
                    key={i}
                    className={cn(
                      'border-b border-border/30',
                      isCurrentRow && 'bg-primary/10 font-semibold'
                    )}
                  >
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        {formatPercent(row.capRate)}
                        {isCurrentRow && (
                          <span className="text-xs text-primary ml-1">←</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">{formatCurrency(row.purchasePrice)}</td>
                    <td className="py-2 px-3 text-right">{formatCurrency(row.annualRent)}</td>
                    <td
                      className={cn(
                        'py-2 px-3 text-right',
                        isBelowTarget ? 'text-red-600' : 'text-emerald-600'
                      )}
                    >
                      {row.coverage.toFixed(2)}x
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Occupancy Sensitivity */}
        {sensitivity.occupancySensitivity && sensitivity.occupancySensitivity.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium mb-2">Occupancy Impact</h4>
            <div className="flex items-end gap-1 h-20">
              {sensitivity.occupancySensitivity.map((point, i) => {
                const maxCoverage = Math.max(
                  ...sensitivity.occupancySensitivity.map((p) => p.coverage)
                );
                const height = (point.coverage / maxCoverage) * 100;
                const isBelowTarget = point.coverage < 1.4;

                return (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div
                      className={cn(
                        'w-full rounded-t',
                        isBelowTarget ? 'bg-red-400' : 'bg-emerald-400'
                      )}
                      style={{ height: `${height}%` }}
                      title={`${formatPercent(point.occupancy)} occupancy → ${point.coverage.toFixed(2)}x coverage`}
                    />
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {(point.occupancy * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Coverage ratio by occupancy level
            </p>
          </div>
        )}

        {/* Escalation Sensitivity */}
        {sensitivity.escalationSensitivity && sensitivity.escalationSensitivity.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium mb-2">Escalation Impact</h4>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="font-medium text-muted-foreground">Rate</div>
              <div className="font-medium text-muted-foreground text-right">Yr 5 Rent</div>
              <div className="font-medium text-muted-foreground text-right">Yr 10 Rent</div>
              <div className="font-medium text-muted-foreground text-right">Total</div>
              {sensitivity.escalationSensitivity.map((row, i) => (
                <>
                  <div key={`esc-${i}`}>{formatPercent(row.escalation)}</div>
                  <div key={`y5-${i}`} className="text-right">{formatCurrency(row.year5Rent)}</div>
                  <div key={`y10-${i}`} className="text-right">{formatCurrency(row.year10Rent)}</div>
                  <div key={`tot-${i}`} className="text-right font-medium">
                    {formatCurrency(row.totalLeaseObligation)}
                  </div>
                </>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
