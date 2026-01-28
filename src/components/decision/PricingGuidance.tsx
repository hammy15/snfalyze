'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Target, Building2 } from 'lucide-react';
import type { DecisionPricing } from '@/hooks/useDecisionAnalysis';

interface PricingGuidanceProps {
  pricing: DecisionPricing;
}

export function PricingGuidance({ pricing }: PricingGuidanceProps) {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  const { suggestedPrice, suggestedRent, impliedMetrics, askingPrice, riskAdjustedValue } =
    pricing;

  // Calculate position of target price relative to min/max for slider
  const priceRange = suggestedPrice.max - suggestedPrice.min;
  const targetPosition =
    priceRange > 0
      ? ((suggestedPrice.target - suggestedPrice.min) / priceRange) * 100
      : 50;
  const askingPosition =
    askingPrice && priceRange > 0
      ? Math.min(100, Math.max(0, ((askingPrice - suggestedPrice.min) / priceRange) * 100))
      : null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Pricing Guidance
          </CardTitle>
          {askingPrice && (
            <Badge variant="outline" className="text-sm">
              Asking: {formatCurrency(askingPrice)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Price Range Slider */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Suggested Purchase Price Range</span>
          </div>
          <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full">
            {/* Gradient fill */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-400" />
            {/* Target marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${targetPosition}%` }}
            >
              <div className="w-5 h-5 rounded-full bg-primary border-2 border-white shadow-lg" />
            </div>
            {/* Asking price marker */}
            {askingPosition !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                style={{ left: `${askingPosition}%` }}
              >
                <div className="w-4 h-4 rounded-full bg-white border-2 border-gray-500 shadow" />
              </div>
            )}
          </div>
          <div className="flex justify-between text-sm">
            <div className="text-left">
              <p className="font-semibold text-emerald-600">
                {formatCurrency(suggestedPrice.min)}
              </p>
              <p className="text-xs text-muted-foreground">Min</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-lg text-primary">
                {formatCurrency(suggestedPrice.target)}
              </p>
              <p className="text-xs text-muted-foreground">Target</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-red-600">
                {formatCurrency(suggestedPrice.max)}
              </p>
              <p className="text-xs text-muted-foreground">Max</p>
            </div>
          </div>
        </div>

        {/* Risk Adjusted Value */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Risk-Adjusted Value</span>
            <span className="font-bold text-lg">{formatCurrency(riskAdjustedValue)}</span>
          </div>
        </div>

        {/* Implied Metrics at Target */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-1 text-primary" />
            <p className="text-xs text-muted-foreground">Cap Rate @ Target</p>
            <p className="font-bold">
              {formatPercent(impliedMetrics.atTargetPrice.capRate)}
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <Target className="h-5 w-5 mx-auto mb-1 text-emerald-500" />
            <p className="text-xs text-muted-foreground">Coverage @ Target</p>
            <p className="font-bold">
              {impliedMetrics.atTargetPrice.coverage.toFixed(2)}x
            </p>
          </div>
          <div className="p-3 bg-muted/30 rounded-lg text-center">
            <Building2 className="h-5 w-5 mx-auto mb-1 text-amber-500" />
            <p className="text-xs text-muted-foreground">Price/Bed @ Target</p>
            <p className="font-bold">
              {formatCurrency(impliedMetrics.atTargetPrice.pricePerBed)}
            </p>
          </div>
        </div>

        {/* Suggested Rent */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm font-medium mb-2">Suggested Annual Rent</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded">
              <p className="text-muted-foreground text-xs">At Min Price</p>
              <p className="font-semibold text-emerald-600">
                {formatCurrency(suggestedRent.atMinPrice)}
              </p>
            </div>
            <div className="text-center p-2 bg-primary/10 rounded border border-primary/30">
              <p className="text-muted-foreground text-xs">At Target</p>
              <p className="font-bold text-primary">
                {formatCurrency(suggestedRent.atTargetPrice)}
              </p>
            </div>
            <div className="text-center p-2 bg-red-50 dark:bg-red-950/30 rounded">
              <p className="text-muted-foreground text-xs">At Max Price</p>
              <p className="font-semibold text-red-600">
                {formatCurrency(suggestedRent.atMaxPrice)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
