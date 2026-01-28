'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Shield, AlertTriangle, AlertOctagon, CheckCircle } from 'lucide-react';
import type { PortfolioRiskProfile } from '@/hooks/useRiskValuation';

interface RiskProfileGaugeProps {
  riskProfile: PortfolioRiskProfile;
  riskAdjustedCapRate?: number;
  baseCapRate?: number;
}

export function RiskProfileGauge({
  riskProfile,
  riskAdjustedCapRate,
  baseCapRate,
}: RiskProfileGaugeProps) {
  const getRiskConfig = (risk: PortfolioRiskProfile['overallRisk']) => {
    const configs = {
      low: {
        label: 'Low Risk',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
        rotation: -67.5, // Points to ~25% of arc
        icon: CheckCircle,
      },
      moderate: {
        label: 'Moderate Risk',
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        rotation: -22.5, // Points to ~50% of arc
        icon: Shield,
      },
      high: {
        label: 'High Risk',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        rotation: 22.5, // Points to ~75% of arc
        icon: AlertTriangle,
      },
      critical: {
        label: 'Critical Risk',
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        rotation: 67.5, // Points to ~100% of arc
        icon: AlertOctagon,
      },
    };
    return configs[risk] || configs.moderate;
  };

  const riskConfig = getRiskConfig(riskProfile.overallRisk);
  const Icon = riskConfig.icon;

  const riskFactors = [
    { label: 'Concentration', value: riskProfile.concentrationRisk, max: 1 },
    { label: 'Geographic', value: 1 - riskProfile.geographicDiversification, max: 1 },
    { label: 'Compliance', value: riskProfile.complianceRisk, max: 1 },
    { label: 'Operational', value: riskProfile.operationalRisk, max: 1 },
    { label: 'Market', value: riskProfile.marketRisk, max: 1 },
    { label: 'Capital Needs', value: riskProfile.capitalNeedsRisk, max: 1 },
    { label: 'Staffing', value: riskProfile.staffingRisk, max: 1 },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Portfolio Risk Profile
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Semi-circle gauge */}
          <div className="relative w-40 h-24">
            {/* Background arc */}
            <svg className="w-full h-full" viewBox="0 0 100 55">
              {/* Gradient arc background */}
              <defs>
                <linearGradient id="riskGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="33%" stopColor="#f59e0b" />
                  <stop offset="66%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <path
                d="M 5 50 A 45 45 0 0 1 95 50"
                fill="none"
                stroke="url(#riskGradient)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Needle */}
              <g transform={`rotate(${riskConfig.rotation}, 50, 50)`}>
                <line
                  x1="50"
                  y1="50"
                  x2="50"
                  y2="12"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-gray-800 dark:text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="4"
                  fill="currentColor"
                  className="text-gray-800 dark:text-gray-200"
                />
              </g>
            </svg>
            {/* Labels */}
            <div className="absolute bottom-0 left-0 text-xs text-emerald-600">Low</div>
            <div className="absolute bottom-0 right-0 text-xs text-red-600">Critical</div>
          </div>

          {/* Risk level label */}
          <div className="flex flex-col items-center">
            <Icon className={cn('h-10 w-10', riskConfig.color)} />
            <span className={cn('mt-1 text-xl font-bold', riskConfig.color)}>
              {riskConfig.label}
            </span>
            {baseCapRate && riskAdjustedCapRate && (
              <div className="mt-2 text-sm text-muted-foreground">
                <span>Cap Rate: </span>
                <span className="font-medium">{(baseCapRate * 100).toFixed(1)}%</span>
                <span className="mx-1">→</span>
                <span className={cn('font-bold', riskConfig.color)}>
                  {(riskAdjustedCapRate * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Risk factors breakdown */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {riskFactors.map((factor) => (
            <div key={factor.label} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground w-24">{factor.label}</span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    factor.value <= 0.3
                      ? 'bg-emerald-500'
                      : factor.value <= 0.6
                      ? 'bg-amber-500'
                      : factor.value <= 0.8
                      ? 'bg-orange-500'
                      : 'bg-red-500'
                  )}
                  style={{ width: `${(factor.value / factor.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quality distribution */}
        {riskProfile.qualityDistribution && riskProfile.qualityDistribution.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm font-medium mb-2">CMS Star Rating Distribution</p>
            <div className="flex items-end gap-1 h-16">
              {[1, 2, 3, 4, 5].map((rating) => {
                const dist = riskProfile.qualityDistribution.find((d) => d.rating === rating);
                const pct = dist?.percentage || 0;
                return (
                  <div key={rating} className="flex-1 flex flex-col items-center">
                    <div
                      className={cn(
                        'w-full rounded-t transition-all',
                        rating <= 2 ? 'bg-red-400' : rating === 3 ? 'bg-amber-400' : 'bg-emerald-400'
                      )}
                      style={{ height: `${Math.max(4, pct * 0.6)}px` }}
                    />
                    <span className="text-xs mt-1">
                      {rating}★
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
