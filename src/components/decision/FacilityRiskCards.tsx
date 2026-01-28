'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, AlertTriangle, CheckCircle, AlertOctagon, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FacilityValuation } from '@/hooks/useRiskValuation';

interface FacilityRiskCardsProps {
  facilities: FacilityValuation[];
}

export function FacilityRiskCards({ facilities }: FacilityRiskCardsProps) {
  const getRiskConfig = (risk: FacilityValuation['riskProfile']['overallRisk']) => {
    const configs = {
      low: {
        color: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        icon: CheckCircle,
        iconColor: 'text-emerald-500',
      },
      moderate: {
        color: 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20',
        badgeColor: 'bg-amber-100 text-amber-800',
        icon: Shield,
        iconColor: 'text-amber-500',
      },
      high: {
        color: 'border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20',
        badgeColor: 'bg-orange-100 text-orange-800',
        icon: AlertTriangle,
        iconColor: 'text-orange-500',
      },
      critical: {
        color: 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20',
        badgeColor: 'bg-red-100 text-red-800',
        icon: AlertOctagon,
        iconColor: 'text-red-500',
      },
    };
    return configs[risk] || configs.moderate;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  // Sort facilities by risk score (highest risk first)
  const sortedFacilities = [...facilities].sort(
    (a, b) => {
      const riskOrder = { critical: 0, high: 1, moderate: 2, low: 3 };
      return (
        riskOrder[a.riskProfile.overallRisk] - riskOrder[b.riskProfile.overallRisk]
      );
    }
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Facility Risk Assessment
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{facilities.length} facilities</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedFacilities.map((facility) => {
            const config = getRiskConfig(facility.riskProfile.overallRisk);
            const Icon = config.icon;

            return (
              <div
                key={facility.id}
                className={cn(
                  'rounded-lg border p-3 transition-all hover:shadow-md',
                  config.color
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-5 w-5', config.iconColor)} />
                    <h4 className="font-medium text-sm truncate max-w-[150px]" title={facility.name}>
                      {facility.name}
                    </h4>
                  </div>
                  <Badge className={config.badgeColor}>
                    {facility.riskProfile.overallRisk}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Base Value</p>
                    <p className="font-semibold">{formatCurrency(facility.baseValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Risk-Adjusted</p>
                    <p className="font-semibold">{formatCurrency(facility.riskAdjustedValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Cap Rate</p>
                    <p className="font-semibold">
                      {formatPercent(facility.baseCapRate)} → {formatPercent(facility.riskAdjustedCapRate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Price/Bed</p>
                    <p className="font-semibold">{formatCurrency(facility.pricePerBed)}</p>
                  </div>
                </div>

                {/* Key risks */}
                {facility.riskProfile.keyRisks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <ul className="text-xs space-y-0.5">
                      {facility.riskProfile.keyRisks.slice(0, 2).map((risk, i) => (
                        <li key={i} className="flex items-start gap-1 text-muted-foreground">
                          <AlertTriangle className="h-3 w-3 mt-0.5 text-amber-500 shrink-0" />
                          <span className="line-clamp-1">{risk}</span>
                        </li>
                      ))}
                      {facility.riskProfile.keyRisks.length > 2 && (
                        <li className="text-muted-foreground">
                          +{facility.riskProfile.keyRisks.length - 2} more risks
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
