'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverageIndicatorProps {
  coverage: number;
  targetCoverage: number;
  status: 'healthy' | 'warning' | 'critical';
  annualRent?: number;
  noi?: number;
}

export function CoverageIndicator({
  coverage,
  targetCoverage,
  status,
  annualRent,
  noi,
}: CoverageIndicatorProps) {
  const getStatusConfig = (s: 'healthy' | 'warning' | 'critical') => {
    const configs = {
      healthy: {
        label: 'Healthy',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        barColor: 'bg-emerald-500',
        icon: CheckCircle,
      },
      warning: {
        label: 'Warning',
        color: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        barColor: 'bg-amber-500',
        icon: AlertTriangle,
      },
      critical: {
        label: 'Critical',
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        barColor: 'bg-red-500',
        icon: XCircle,
      },
    };
    return configs[s];
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  // Calculate gauge position (0-100)
  const minCoverage = 1.0;
  const maxCoverage = 2.5;
  const gaugePosition = Math.min(
    100,
    Math.max(0, ((coverage - minCoverage) / (maxCoverage - minCoverage)) * 100)
  );
  const targetPosition = Math.min(
    100,
    Math.max(0, ((targetCoverage - minCoverage) / (maxCoverage - minCoverage)) * 100)
  );

  return (
    <Card className={cn('border-2', config.borderColor, config.bgColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Coverage Ratio
          </CardTitle>
          <Badge className={cn(config.bgColor, config.color, 'border', config.borderColor)}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main coverage display */}
        <div className="flex items-center justify-center gap-6 py-4">
          <div className="text-center">
            <p className={cn('text-5xl font-bold', config.color)}>
              {coverage.toFixed(2)}x
            </p>
            <p className="text-sm text-muted-foreground mt-1">Current Coverage</p>
          </div>
          <div className="text-center border-l border-border/50 pl-6">
            <p className="text-2xl font-semibold text-muted-foreground">
              {targetCoverage.toFixed(2)}x
            </p>
            <p className="text-sm text-muted-foreground mt-1">Target</p>
          </div>
        </div>

        {/* Coverage gauge */}
        <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
          {/* Gradient background */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" />
          </div>
          {/* Current coverage marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all"
            style={{ left: `${gaugePosition}%` }}
          >
            <div className={cn('w-5 h-5 rounded-full border-2 border-white shadow-lg', config.barColor)} />
          </div>
          {/* Target marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style={{ left: `${targetPosition}%` }}
          >
            <div className="w-0.5 h-6 bg-gray-600 dark:bg-gray-300" />
          </div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>1.0x</span>
          <span className="text-center">Target: {targetCoverage.toFixed(2)}x</span>
          <span>2.5x</span>
        </div>

        {/* NOI / Rent breakdown */}
        {noi && annualRent && (
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Annual NOI</p>
              <p className="font-semibold">{formatCurrency(noi)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Annual Rent</p>
              <p className="font-semibold">{formatCurrency(annualRent)}</p>
            </div>
          </div>
        )}

        {/* Coverage explanation */}
        <div className="mt-3 text-xs text-muted-foreground">
          {status === 'healthy' && (
            <p>Coverage exceeds target - strong rent payment capacity.</p>
          )}
          {status === 'warning' && (
            <p>Coverage below target - monitor closely for operational improvements.</p>
          )}
          {status === 'critical' && (
            <p>Coverage critically low - significant rent payment risk.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
