'use client';

import {
  FileWarning,
  AlertTriangle,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NormalizedProviderData } from '@/lib/cms';

interface CMSComplianceCardProps {
  provider: NormalizedProviderData | {
    totalDeficiencies?: number | null;
    healthDeficiencies?: number | null;
    finesTotal?: number | null;
  };
  deficiencies?: Array<{
    surveyDate: string;
    tag: string;
    description: string;
    scopeSeverity: string;
    corrected: boolean;
    correctionDate?: string;
  }>;
  penalties?: Array<{
    type: string;
    date: string;
    amount: number | null;
  }>;
  className?: string;
  variant?: 'default' | 'compact';
}

// Scope/severity code meanings
const SEVERITY_LEVELS: Record<string, { label: string; severity: 'low' | 'medium' | 'high' }> = {
  'A': { label: 'Isolated - No harm, potential', severity: 'low' },
  'B': { label: 'Pattern - No harm, potential', severity: 'low' },
  'C': { label: 'Widespread - No harm, potential', severity: 'low' },
  'D': { label: 'Isolated - No harm, actual', severity: 'medium' },
  'E': { label: 'Pattern - No harm, actual', severity: 'medium' },
  'F': { label: 'Widespread - No harm, actual', severity: 'medium' },
  'G': { label: 'Isolated - Actual harm', severity: 'high' },
  'H': { label: 'Pattern - Actual harm', severity: 'high' },
  'I': { label: 'Widespread - Actual harm', severity: 'high' },
  'J': { label: 'Isolated - Immediate jeopardy', severity: 'high' },
  'K': { label: 'Pattern - Immediate jeopardy', severity: 'high' },
  'L': { label: 'Widespread - Immediate jeopardy', severity: 'high' },
};

function getSeverityInfo(code: string) {
  return SEVERITY_LEVELS[code?.toUpperCase()] || { label: code, severity: 'medium' };
}

export function CMSComplianceCard({
  provider,
  deficiencies = [],
  penalties = [],
  className,
  variant = 'default',
}: CMSComplianceCardProps) {
  const totalDeficiencies = provider.totalDeficiencies ?? deficiencies.length;
  const healthDeficiencies = provider.healthDeficiencies ?? 0;
  const fireSafetyDeficiencies = totalDeficiencies - healthDeficiencies;
  const totalFines = provider.finesTotal ?? penalties.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-4 text-sm', className)}>
        <div className="flex items-center gap-1.5">
          <FileWarning className="w-4 h-4 text-surface-500" />
          <span className="text-surface-500">Deficiencies:</span>
          <span className="font-medium">{totalDeficiencies || 0}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-surface-500" />
          <span className="text-surface-500">Fines:</span>
          <span className="font-medium">{totalFines ? formatCurrency(totalFines) : '$0'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-surface-200 dark:border-surface-700', className)}>
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50 rounded-t-lg">
        <div className="flex items-center gap-2">
          <FileWarning className="w-4 h-4 text-primary-500" />
          <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-100">
            Compliance & Regulatory
          </h4>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
              <FileWarning className="w-3.5 h-3.5" />
              Total Deficiencies
            </div>
            <p className="font-semibold text-lg text-surface-900 dark:text-surface-100">
              {totalDeficiencies ?? 0}
            </p>
            {healthDeficiencies > 0 && (
              <p className="text-xs text-surface-500 mt-1">
                Health: {healthDeficiencies} | Fire Safety: {fireSafetyDeficiencies}
              </p>
            )}
          </div>
          <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              Total Fines
            </div>
            <p
              className={cn(
                'font-semibold text-lg',
                totalFines > 50000
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-surface-900 dark:text-surface-100'
              )}
            >
              {totalFines ? formatCurrency(totalFines) : '$0'}
            </p>
            {totalFines === 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">No penalties</p>
            )}
          </div>
        </div>

        {/* Recent Deficiencies */}
        {deficiencies.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
              Recent Deficiencies ({deficiencies.length})
            </h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {deficiencies.slice(0, 5).map((def, idx) => {
                const severityInfo = getSeverityInfo(def.scopeSeverity);
                return (
                  <div
                    key={idx}
                    className={cn(
                      'p-2 rounded border text-xs',
                      severityInfo.severity === 'high'
                        ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                        : severityInfo.severity === 'medium'
                        ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-surface-700 dark:text-surface-300">
                            {def.tag}
                          </span>
                          <span
                            className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-medium',
                              severityInfo.severity === 'high'
                                ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                                : severityInfo.severity === 'medium'
                                ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                                : 'bg-surface-200 text-surface-700 dark:bg-surface-700 dark:text-surface-300'
                            )}
                          >
                            {def.scopeSeverity}
                          </span>
                        </div>
                        <p className="text-surface-600 dark:text-surface-400 line-clamp-2 mt-1">
                          {def.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {def.corrected ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-surface-500">
                      <Calendar className="w-3 h-3" />
                      <span>{def.surveyDate}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            {deficiencies.length > 5 && (
              <p className="text-xs text-surface-500 mt-2">
                +{deficiencies.length - 5} more deficiencies
              </p>
            )}
          </div>
        )}

        {/* Recent Penalties */}
        {penalties.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-2">
              Recent Penalties ({penalties.length})
            </h5>
            <div className="space-y-1">
              {penalties.slice(0, 3).map((penalty, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-surface-600 dark:text-surface-400">
                      {penalty.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-surface-500">{penalty.date}</span>
                    <span className="font-medium text-surface-900 dark:text-surface-100">
                      {penalty.amount ? formatCurrency(penalty.amount) : 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Clean record message */}
        {totalDeficiencies === 0 && totalFines === 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-700 dark:text-green-300">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Clean compliance record</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compliance status badge for compact display
 */
export function ComplianceStatusBadge({
  provider,
  className,
}: {
  provider: CMSComplianceCardProps['provider'];
  className?: string;
}) {
  const defCount = provider.totalDeficiencies ?? 0;
  const fines = provider.finesTotal ?? 0;

  const isClean = defCount === 0 && fines === 0;
  const hasIssues = defCount > 10 || fines > 25000;
  const hasCriticalIssues = defCount > 20 || fines > 100000;

  if (isClean) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
          'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
          className
        )}
      >
        <CheckCircle2 className="w-3 h-3" />
        Clean Record
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        hasCriticalIssues
          ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
          : hasIssues
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
          : 'bg-surface-100 text-surface-700 dark:bg-surface-800 dark:text-surface-300',
        className
      )}
    >
      <FileWarning className="w-3 h-3" />
      {defCount} Deficiencies
    </div>
  );
}
