'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Activity, CheckCircle, AlertTriangle, AlertOctagon, XCircle } from 'lucide-react';

interface QualityGaugeProps {
  score: number; // 0-100
  level: 'excellent' | 'good' | 'fair' | 'poor';
  breakdown?: {
    completeness: number;
    confidence: number;
    consistency: number;
    validation: number;
  };
  showBreakdown?: boolean;
  compact?: boolean;
}

export function QualityGauge({
  score,
  level,
  breakdown,
  showBreakdown = true,
  compact = false,
}: QualityGaugeProps) {
  const getConfig = (level: string) => {
    const configs = {
      excellent: {
        label: 'Excellent',
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
        icon: CheckCircle,
      },
      good: {
        label: 'Good',
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        icon: Activity,
      },
      fair: {
        label: 'Fair',
        color: 'text-orange-600',
        bgColor: 'bg-orange-500',
        icon: AlertTriangle,
      },
      poor: {
        label: 'Poor',
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        icon: XCircle,
      },
    };
    return configs[level as keyof typeof configs] || configs.fair;
  };

  const config = getConfig(level);
  const Icon = config.icon;

  // Calculate needle rotation (-90 to 90 degrees for half circle)
  const rotation = -90 + (score / 100) * 180;

  const breakdownItems = breakdown
    ? [
        { label: 'Completeness', value: breakdown.completeness, weight: '30%' },
        { label: 'Confidence', value: breakdown.confidence, weight: '25%' },
        { label: 'Consistency', value: breakdown.consistency, weight: '25%' },
        { label: 'Validation', value: breakdown.validation, weight: '20%' },
      ]
    : [];

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-10">
          <svg className="w-full h-full" viewBox="0 0 100 55">
            <defs>
              <linearGradient id="qualityGradientCompact" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="40%" stopColor="#f97316" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#10b981" />
              </linearGradient>
            </defs>
            <path
              d="M 5 50 A 45 45 0 0 1 95 50"
              fill="none"
              stroke="url(#qualityGradientCompact)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <g transform={`rotate(${rotation}, 50, 50)`}>
              <line
                x1="50"
                y1="50"
                x2="50"
                y2="15"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-800 dark:text-gray-200"
              />
              <circle
                cx="50"
                cy="50"
                r="3"
                fill="currentColor"
                className="text-gray-800 dark:text-gray-200"
              />
            </g>
          </svg>
        </div>
        <div>
          <div className={cn('text-lg font-bold', config.color)}>{score}%</div>
          <div className="text-xs text-muted-foreground">{config.label}</div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          Extraction Quality
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Semi-circle gauge */}
          <div className="relative w-40 h-24">
            <svg className="w-full h-full" viewBox="0 0 100 55">
              <defs>
                <linearGradient id="qualityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="40%" stopColor="#f97316" />
                  <stop offset="60%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
              </defs>
              <path
                d="M 5 50 A 45 45 0 0 1 95 50"
                fill="none"
                stroke="url(#qualityGradient)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Needle */}
              <g transform={`rotate(${rotation}, 50, 50)`}>
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
            <div className="absolute bottom-0 left-0 text-xs text-red-600">0%</div>
            <div className="absolute bottom-0 right-0 text-xs text-emerald-600">100%</div>
          </div>

          {/* Score display */}
          <div className="flex flex-col items-center">
            <Icon className={cn('h-10 w-10', config.color)} />
            <span className={cn('mt-1 text-3xl font-bold', config.color)}>{score}%</span>
            <span className={cn('text-sm font-medium', config.color)}>{config.label}</span>
          </div>
        </div>

        {/* Breakdown */}
        {showBreakdown && breakdown && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {breakdownItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all',
                      item.value >= 80
                        ? 'bg-emerald-500'
                        : item.value >= 60
                          ? 'bg-amber-500'
                          : item.value >= 40
                            ? 'bg-orange-500'
                            : 'bg-red-500'
                    )}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">Weight: {item.weight}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
