'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeftRight, TrendingUp, Building2, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BuyVsLeaseAnalysis } from '@/hooks/useMasterLease';

interface BuyVsLeaseComparisonProps {
  analysis: BuyVsLeaseAnalysis;
}

export function BuyVsLeaseComparison({ analysis }: BuyVsLeaseComparisonProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  const getRecommendationConfig = (rec: 'purchase' | 'lease' | 'either') => {
    const configs = {
      purchase: {
        label: 'Purchase Preferred',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-100',
        icon: Building2,
      },
      lease: {
        label: 'Lease Preferred',
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        icon: FileText,
      },
      either: {
        label: 'Either Option',
        color: 'text-amber-600',
        bgColor: 'bg-amber-100',
        icon: ArrowLeftRight,
      },
    };
    return configs[rec];
  };

  const recConfig = getRecommendationConfig(analysis.recommendation);
  const Icon = recConfig.icon;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Buy vs. Lease Analysis
          </CardTitle>
          <Badge className={cn(recConfig.bgColor, recConfig.color)}>
            <Icon className="h-3 w-3 mr-1" />
            {recConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {/* Purchase Column */}
          <div
            className={cn(
              'p-4 rounded-lg border-2',
              analysis.recommendation === 'purchase'
                ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30'
                : 'border-border bg-muted/30'
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-emerald-600" />
              <h4 className="font-semibold">Purchase</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Cost</span>
                <span className="font-medium">{formatCurrency(analysis.purchase.totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equity Required</span>
                <span className="font-medium">{formatCurrency(analysis.purchase.equityRequired)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Annual Debt Service</span>
                <span className="font-medium">{formatCurrency(analysis.purchase.debtService)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Net Cash Flow</span>
                <span
                  className={cn(
                    'font-medium',
                    analysis.purchase.netCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                  )}
                >
                  {formatCurrency(analysis.purchase.netCashFlow)}
                </span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year 1 Return</span>
                  <span className="font-bold">{formatPercent(analysis.purchase.yearOneReturn)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">5-Year IRR</span>
                  <span className="font-bold text-emerald-600">
                    {formatPercent(analysis.purchase.fiveYearIrr)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Lease Column */}
          <div
            className={cn(
              'p-4 rounded-lg border-2',
              analysis.recommendation === 'lease'
                ? 'border-blue-300 bg-blue-50 dark:bg-blue-950/30'
                : 'border-border bg-muted/30'
            )}
          >
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h4 className="font-semibold">Lease</h4>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Year 1 Rent</span>
                <span className="font-medium">{formatCurrency(analysis.lease.yearOneRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">5-Year Total</span>
                <span className="font-medium">{formatCurrency(analysis.lease.fiveYearRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">10-Year Total</span>
                <span className="font-medium">{formatCurrency(analysis.lease.tenYearRent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Effective Annual Cost</span>
                <span className="font-medium">{formatCurrency(analysis.lease.effectiveCost)}</span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Capital Preservation</span>
                  <Badge variant="secondary" className="text-xs">
                    No Equity Needed
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Rationale */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">{analysis.rationale}</p>
        </div>
      </CardContent>
    </Card>
  );
}
