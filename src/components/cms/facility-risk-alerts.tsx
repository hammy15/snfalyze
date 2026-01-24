'use client';

import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  Star,
  Heart,
  FileWarning,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NormalizedProviderData } from '@/lib/cms';

export interface RiskAlert {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  description?: string;
  icon: LucideIcon;
}

interface FacilityRiskAlertsProps {
  provider: NormalizedProviderData | {
    isSff?: boolean;
    isSffCandidate?: boolean;
    abuseIcon?: boolean;
    overallRating?: number | null;
    healthInspectionRating?: number | null;
    totalDeficiencies?: number | null;
    finesTotal?: number | null;
  };
  className?: string;
  variant?: 'default' | 'compact';
}

/**
 * Generate risk alerts based on CMS provider data
 */
export function getRiskAlerts(provider: FacilityRiskAlertsProps['provider']): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  // Critical alerts (red)
  if (provider.isSff) {
    alerts.push({
      id: 'sff',
      severity: 'critical',
      title: 'SPECIAL FOCUS FACILITY',
      description: 'Under CMS enhanced oversight due to history of serious quality issues',
      icon: AlertOctagon,
    });
  }

  if (provider.abuseIcon) {
    alerts.push({
      id: 'abuse',
      severity: 'critical',
      title: 'ABUSE ICON NOTED',
      description: 'CMS has noted abuse concerns for this facility',
      icon: ShieldAlert,
    });
  }

  if (provider.overallRating === 1) {
    alerts.push({
      id: 'one-star',
      severity: 'critical',
      title: '1-STAR OVERALL RATING',
      description: 'Lowest possible CMS quality rating',
      icon: Star,
    });
  }

  // Warning alerts (amber)
  if (provider.isSffCandidate && !provider.isSff) {
    alerts.push({
      id: 'sff-candidate',
      severity: 'warning',
      title: 'SFF CANDIDATE - Watch List',
      description: 'On CMS watch list for potential Special Focus Facility designation',
      icon: AlertTriangle,
    });
  }

  if (provider.healthInspectionRating && provider.healthInspectionRating <= 2) {
    alerts.push({
      id: 'low-health',
      severity: 'warning',
      title: `LOW HEALTH INSPECTION (${provider.healthInspectionRating}-Star)`,
      description: 'Below average health inspection rating',
      icon: Heart,
    });
  }

  if (provider.totalDeficiencies && provider.totalDeficiencies > 15) {
    alerts.push({
      id: 'high-deficiencies',
      severity: 'warning',
      title: `HIGH DEFICIENCIES (${provider.totalDeficiencies})`,
      description: 'Above average number of health and safety deficiencies',
      icon: FileWarning,
    });
  }

  if (provider.finesTotal && provider.finesTotal > 50000) {
    const formattedFines = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(provider.finesTotal);
    alerts.push({
      id: 'recent-penalties',
      severity: 'warning',
      title: `PENALTIES: ${formattedFines}`,
      description: 'Significant fine history in recent years',
      icon: DollarSign,
    });
  }

  return alerts;
}

/**
 * Component to display facility risk alerts prominently
 */
export function FacilityRiskAlerts({
  provider,
  className,
  variant = 'default',
}: FacilityRiskAlertsProps) {
  const alerts = getRiskAlerts(provider);

  if (alerts.length === 0) {
    return null;
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {alerts.map((alert) => {
          const Icon = alert.icon;
          return (
            <div
              key={alert.id}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                alert.severity === 'critical'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
              )}
            >
              <Icon className="w-3 h-3" />
              <span className="truncate max-w-[140px]">{alert.title}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {alerts.map((alert) => {
        const Icon = alert.icon;
        return (
          <div
            key={alert.id}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border-2 transition-colors',
              alert.severity === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-400 dark:border-red-600'
                : 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600'
            )}
          >
            <Icon
              className={cn(
                'w-5 h-5 flex-shrink-0 mt-0.5',
                alert.severity === 'critical'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-amber-600 dark:text-amber-400'
              )}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  'font-semibold text-sm',
                  alert.severity === 'critical'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-amber-800 dark:text-amber-200'
                )}
              >
                {alert.title}
              </p>
              {alert.description && (
                <p
                  className={cn(
                    'text-xs mt-0.5',
                    alert.severity === 'critical'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-amber-700 dark:text-amber-300'
                  )}
                >
                  {alert.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Simple banner variant for use in headers
 */
export function FacilityRiskBanner({
  provider,
  className,
}: {
  provider: FacilityRiskAlertsProps['provider'];
  className?: string;
}) {
  const alerts = getRiskAlerts(provider);
  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a) => a.severity === 'warning').length;

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
        criticalCount > 0
          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        className
      )}
    >
      {criticalCount > 0 ? (
        <AlertOctagon className="w-4 h-4" />
      ) : (
        <AlertTriangle className="w-4 h-4" />
      )}
      <span>
        {criticalCount > 0 && `${criticalCount} critical alert${criticalCount > 1 ? 's' : ''}`}
        {criticalCount > 0 && warningCount > 0 && ', '}
        {warningCount > 0 && `${warningCount} warning${warningCount > 1 ? 's' : ''}`}
      </span>
    </div>
  );
}
