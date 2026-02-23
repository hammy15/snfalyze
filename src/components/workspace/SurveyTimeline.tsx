'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Shield,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface SurveyItem {
  date: string;
  tag: string;
  description: string;
  scopeSeverity: string;
  corrected: boolean;
  correctionDate: string | null;
}

interface PenaltyItem {
  type: string;
  date: string;
  amount: number | null;
}

interface FacilityInfo {
  name: string;
  ccn: string;
  state: string;
  beds: number | null;
  overallRating: number | null;
}

interface SurveyHistoryData {
  facility: FacilityInfo;
  surveys: SurveyItem[];
  penalties: PenaltyItem[];
}

interface SurveyTimelineProps {
  ccn: string;
  facilityName?: string;
}

/**
 * Immediate Jeopardy scope/severity codes: J, K, L
 * These indicate situations where the provider's noncompliance has caused,
 * or is likely to cause, serious injury, harm, impairment, or death.
 */
function isImmediateJeopardy(scopeSeverity: string): boolean {
  const code = scopeSeverity.trim().toUpperCase();
  return code === 'J' || code === 'K' || code === 'L';
}

/**
 * Determine the visual accent for a survey deficiency.
 * - IJ items: red
 * - Corrected items: green
 * - Standard deficiencies: amber
 */
function getSurveyAccent(item: SurveyItem): {
  border: string;
  bg: string;
  icon: string;
  dot: string;
} {
  if (isImmediateJeopardy(item.scopeSeverity)) {
    return {
      border: 'border-red-500/40 dark:border-red-400/30',
      bg: 'bg-red-50 dark:bg-red-950/20',
      icon: 'text-red-600 dark:text-red-400',
      dot: 'bg-red-500',
    };
  }
  if (item.corrected) {
    return {
      border: 'border-emerald-500/40 dark:border-emerald-400/30',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  }
  return {
    border: 'border-amber-500/40 dark:border-amber-400/30',
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    icon: 'text-amber-600 dark:text-amber-400',
    dot: 'bg-amber-500',
  };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return 'Unknown';
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function ScopeSeverityBadge({ code }: { code: string }) {
  const ij = isImmediateJeopardy(code);
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
        ij
          ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
          : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400'
      )}
    >
      {code}
      {ij && <span className="ml-1">IJ</span>}
    </span>
  );
}

export function SurveyTimeline({ ccn, facilityName }: SurveyTimelineProps) {
  const [data, setData] = useState<SurveyHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/cms/survey-history/${encodeURIComponent(ccn)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Failed to fetch survey history (${res.status})`);
      }
      const json: SurveyHistoryData = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [ccn]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleExpanded = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // --- Loading state ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Loading survey history for {facilityName || ccn}...
        </p>
      </div>
    );
  }

  // --- Error state ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <AlertTriangle className="w-6 h-6 text-red-500" />
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={fetchData}
          className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // --- Empty state ---
  if (!data || (data.surveys.length === 0 && data.penalties.length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Shield className="w-8 h-8 text-surface-300 dark:text-surface-600" />
        <p className="text-sm text-surface-500 dark:text-surface-400">
          No survey deficiencies or penalties found for {facilityName || data?.facility?.name || ccn}.
        </p>
      </div>
    );
  }

  const totalDeficiencies = data.surveys.length;
  const ijCount = data.surveys.filter((s) => isImmediateJeopardy(s.scopeSeverity)).length;
  const correctedCount = data.surveys.filter((s) => s.corrected).length;
  const totalFines = data.penalties.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Build a merged timeline: surveys + penalties sorted by date desc
  type TimelineEntry =
    | { kind: 'survey'; item: SurveyItem; index: number }
    | { kind: 'penalty'; item: PenaltyItem; index: number };

  const timeline: TimelineEntry[] = [
    ...data.surveys.map((item, index) => ({ kind: 'survey' as const, item, index })),
    ...data.penalties.map((item, index) => ({ kind: 'penalty' as const, item, index })),
  ].sort((a, b) => {
    const dateA = a.item.date ? new Date(a.item.date).getTime() : 0;
    const dateB = b.item.date ? new Date(b.item.date).getTime() : 0;
    return dateB - dateA;
  });

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-surface-900 dark:text-surface-100">
              {data.facility.name}
            </h3>
            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
              CCN {data.facility.ccn} &middot; {data.facility.state}
              {data.facility.beds !== null && ` \u00B7 ${data.facility.beds} beds`}
              {data.facility.overallRating !== null &&
                ` \u00B7 ${data.facility.overallRating}\u2605 overall`}
            </p>
          </div>
          <Shield className="w-5 h-5 text-surface-400 dark:text-surface-500" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total deficiencies */}
          <div className="rounded-lg bg-surface-50 dark:bg-surface-800 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-surface-500 dark:text-surface-400 font-medium">
              Deficiencies
            </p>
            <p className="text-lg font-bold text-surface-900 dark:text-surface-100 mt-0.5">
              {totalDeficiencies}
            </p>
          </div>

          {/* IJ count */}
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400 font-medium">
              Immediate Jeopardy
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">
              {ijCount}
            </p>
          </div>

          {/* Corrected count */}
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-emerald-600 dark:text-emerald-400 font-medium">
              Corrected
            </p>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mt-0.5">
              {correctedCount}
            </p>
          </div>

          {/* Total fines */}
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400 font-medium">
              Total Fines
            </p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300 mt-0.5">
              {totalFines > 0 ? formatCurrency(totalFines) : '$0'}
            </p>
          </div>
        </div>
      </div>

      {/* Vertical timeline */}
      <div className="relative pl-6">
        {/* Vertical connector line */}
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-surface-200 dark:bg-surface-700" />

        <div className="space-y-3">
          {timeline.map((entry) => {
            if (entry.kind === 'penalty') {
              const p = entry.item;
              const key = `penalty-${entry.index}`;
              return (
                <div key={key} className="relative">
                  {/* Timeline dot */}
                  <div className="absolute -left-6 top-3 w-[18px] h-[18px] rounded-full border-2 border-white dark:border-surface-900 bg-red-500 flex items-center justify-center z-10">
                    <DollarSign className="w-2.5 h-2.5 text-white" />
                  </div>

                  <div className="rounded-xl border border-red-500/40 dark:border-red-400/30 bg-red-50 dark:bg-red-950/20 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-sm font-semibold text-red-700 dark:text-red-300">
                          Penalty
                        </span>
                        <span className="text-xs text-red-600/70 dark:text-red-400/70">
                          {p.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.amount !== null && p.amount > 0 && (
                          <span className="text-sm font-bold text-red-700 dark:text-red-300">
                            {formatCurrency(p.amount)}
                          </span>
                        )}
                        <span className="text-xs text-surface-500 dark:text-surface-400">
                          {formatDate(p.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            // Survey deficiency entry
            const s = entry.item;
            const key = `survey-${entry.index}`;
            const isExpanded = expandedItems.has(key);
            const accent = getSurveyAccent(s);
            const IconComponent = isImmediateJeopardy(s.scopeSeverity)
              ? AlertTriangle
              : s.corrected
                ? CheckCircle2
                : Clock;

            return (
              <div key={key} className="relative">
                {/* Timeline dot */}
                <div
                  className={cn(
                    'absolute -left-6 top-3 w-[18px] h-[18px] rounded-full border-2 border-white dark:border-surface-900 z-10',
                    accent.dot
                  )}
                />

                <button
                  onClick={() => toggleExpanded(key)}
                  className={cn(
                    'w-full text-left rounded-xl border p-4 transition-all',
                    accent.border,
                    accent.bg,
                    'hover:shadow-sm'
                  )}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0 flex-1">
                      <IconComponent
                        className={cn('w-4 h-4 mt-0.5 shrink-0', accent.icon)}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">
                            {s.tag}
                          </span>
                          <ScopeSeverityBadge code={s.scopeSeverity} />
                          {s.corrected && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-3 h-3" />
                              Corrected
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">
                          {s.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-surface-500 dark:text-surface-400 whitespace-nowrap">
                        {formatDate(s.date)}
                      </span>
                      <ChevronDown
                        className={cn(
                          'w-4 h-4 text-surface-400 transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-surface-200/50 dark:border-surface-700/50 space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div>
                          <span className="text-surface-500 dark:text-surface-400">
                            Survey Date
                          </span>
                          <p className="text-surface-800 dark:text-surface-200 font-medium">
                            {formatDate(s.date)}
                          </p>
                        </div>
                        <div>
                          <span className="text-surface-500 dark:text-surface-400">
                            Scope/Severity
                          </span>
                          <p className="text-surface-800 dark:text-surface-200 font-medium">
                            {s.scopeSeverity || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <span className="text-surface-500 dark:text-surface-400">
                            Corrected
                          </span>
                          <p className="text-surface-800 dark:text-surface-200 font-medium">
                            {s.corrected ? 'Yes' : 'No'}
                          </p>
                        </div>
                        <div>
                          <span className="text-surface-500 dark:text-surface-400">
                            Correction Date
                          </span>
                          <p className="text-surface-800 dark:text-surface-200 font-medium">
                            {s.correctionDate ? formatDate(s.correctionDate) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-surface-500 dark:text-surface-400">
                          Full Description
                        </span>
                        <p className="text-xs text-surface-700 dark:text-surface-300 mt-0.5 leading-relaxed">
                          {s.description}
                        </p>
                      </div>
                    </div>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
