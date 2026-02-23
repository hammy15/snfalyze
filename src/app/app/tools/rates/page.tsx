'use client';

import { useState, useMemo, Fragment } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  DollarSign,
  TrendingUp,
  Trophy,
  Filter,
  FileText,
  ChevronUp,
  ChevronDown,
  Target,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { STATE_MEDICAID_RATES, type StateMedicaidData } from '@/lib/market-data/medicaid-rates';

// Cascadia target states
const CASCADIA_STATES = new Set(['OH', 'ID', 'WA', 'OR']);

type SortKey =
  | 'stateName'
  | 'currentDailyRate'
  | 'rateType'
  | 'yearOverYearChange'
  | 'fiveYearCagr'
  | 'projectedNextYearRate'
  | 'qualityBonusMax'
  | 'notes';

type SortDirection = 'asc' | 'desc';
type RateTypeFilter = 'all' | 'case_mix' | 'flat' | 'hybrid';

function formatCurrency(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export default function ReimbursementRateTrackerPage() {
  const [sortKey, setSortKey] = useState<SortKey>('currentDailyRate');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [rateTypeFilter, setRateTypeFilter] = useState<RateTypeFilter>('all');
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // Get all state data, excluding DEFAULT
  const allStates = useMemo(() => {
    return Object.values(STATE_MEDICAID_RATES).filter((s) => s.state !== 'DEFAULT');
  }, []);

  // Filter by rate type
  const filteredStates = useMemo(() => {
    if (rateTypeFilter === 'all') return allStates;
    return allStates.filter((s) => s.rateType === rateTypeFilter);
  }, [allStates, rateTypeFilter]);

  // Sort
  const sortedStates = useMemo(() => {
    const sorted = [...filteredStates].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortKey) {
        case 'stateName':
          aVal = a.stateName;
          bVal = b.stateName;
          break;
        case 'currentDailyRate':
          aVal = a.currentDailyRate;
          bVal = b.currentDailyRate;
          break;
        case 'rateType':
          aVal = a.rateType;
          bVal = b.rateType;
          break;
        case 'yearOverYearChange':
          aVal = a.yearOverYearChange;
          bVal = b.yearOverYearChange;
          break;
        case 'fiveYearCagr':
          aVal = a.fiveYearCagr;
          bVal = b.fiveYearCagr;
          break;
        case 'projectedNextYearRate':
          aVal = a.projectedNextYearRate;
          bVal = b.projectedNextYearRate;
          break;
        case 'qualityBonusMax':
          aVal = a.qualityBonusMax ?? 0;
          bVal = b.qualityBonusMax ?? 0;
          break;
        case 'notes':
          aVal = a.notes.length;
          bVal = b.notes.length;
          break;
        default:
          return 0;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDir === 'asc'
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
    return sorted;
  }, [filteredStates, sortKey, sortDir]);

  // Summary statistics
  const summary = useMemo(() => {
    if (allStates.length === 0) return null;

    const rates = allStates.map((s) => s.currentDailyRate);
    const nationalAvg = rates.reduce((sum, r) => sum + r, 0) / rates.length;

    const highestGrowthState = [...allStates].sort(
      (a, b) => b.yearOverYearChange - a.yearOverYearChange
    )[0];

    const top5ByRate = [...allStates]
      .sort((a, b) => b.currentDailyRate - a.currentDailyRate)
      .slice(0, 5);

    const cascadiaStates = allStates.filter((s) => CASCADIA_STATES.has(s.state));

    return {
      nationalAvg,
      highestGrowthState,
      top5ByRate,
      cascadiaStates,
      totalStates: allStates.length,
    };
  }, [allStates]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const toggleNotes = (state: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(state)) {
        next.delete(state);
      } else {
        next.add(state);
      }
      return next;
    });
  };

  const SortHeader = ({
    label,
    sortKeyValue,
    className,
  }: {
    label: string;
    sortKeyValue: SortKey;
    className?: string;
  }) => (
    <th
      className={cn(
        'px-3 py-2.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400 cursor-pointer select-none hover:text-surface-700 dark:hover:text-surface-200 transition-colors',
        className
      )}
      onClick={() => handleSort(sortKeyValue)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {sortKey === sortKeyValue ? (
          sortDir === 'desc' ? (
            <ChevronDown className="w-3 h-3 text-primary-500" />
          ) : (
            <ChevronUp className="w-3 h-3 text-primary-500" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 opacity-30" />
        )}
      </div>
    </th>
  );

  if (!summary) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">
            Reimbursement Rate Tracker
          </h1>
          <p className="text-sm text-surface-500">
            State Medicaid SNF daily rates, trends, and projections across {summary.totalStates}{' '}
            tracked states
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* National Average */}
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <DollarSign className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-xs font-medium text-surface-500">National Average Rate</span>
          </div>
          <div className="text-2xl font-bold text-surface-900 dark:text-white">
            {formatCurrency(summary.nationalAvg)}
          </div>
          <div className="text-xs text-surface-500 mt-1">Per patient day (Medicaid)</div>
        </div>

        {/* Highest Growth */}
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30">
              <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-xs font-medium text-surface-500">Highest YoY Growth</span>
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {formatPercent(summary.highestGrowthState.yearOverYearChange)}
          </div>
          <div className="text-xs text-surface-500 mt-1">
            {summary.highestGrowthState.stateName} ({formatCurrency(summary.highestGrowthState.currentDailyRate)}/day)
          </div>
        </div>

        {/* Top 5 by Daily Rate */}
        <div className="neu-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Trophy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-surface-500">Top 5 by Daily Rate</span>
          </div>
          <div className="space-y-1 mt-1">
            {summary.top5ByRate.map((s, i) => (
              <div key={s.state} className="flex items-center justify-between text-xs">
                <span className="text-surface-600 dark:text-surface-400">
                  <span className="font-semibold text-surface-400 dark:text-surface-500 mr-1">
                    {i + 1}.
                  </span>
                  {s.stateName}
                </span>
                <span className="font-mono font-semibold text-surface-900 dark:text-white">
                  {formatCurrency(s.currentDailyRate)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cascadia Target States */}
        <div className="neu-card p-4 border border-primary-200 dark:border-primary-800/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Target className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <span className="text-xs font-medium text-primary-600 dark:text-primary-400">
              Cascadia Targets
            </span>
          </div>
          <div className="space-y-1 mt-1">
            {summary.cascadiaStates.length > 0 ? (
              summary.cascadiaStates
                .sort((a, b) => b.currentDailyRate - a.currentDailyRate)
                .map((s) => (
                  <div key={s.state} className="flex items-center justify-between text-xs">
                    <span className="text-surface-600 dark:text-surface-400">
                      {s.stateName} ({s.state})
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-surface-900 dark:text-white">
                        {formatCurrency(s.currentDailyRate)}
                      </span>
                      <span className="text-green-600 dark:text-green-400">
                        {formatPercent(s.yearOverYearChange)}
                      </span>
                    </div>
                  </div>
                ))
            ) : (
              <div className="text-xs text-surface-400">
                OH, ID, WA, OR data tracked when available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="neu-card p-3 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs text-surface-500">
          <Filter className="w-3.5 h-3.5" />
          <span className="font-medium">Rate Type:</span>
        </div>
        {(['all', 'case_mix', 'flat', 'hybrid'] as RateTypeFilter[]).map((type) => (
          <button
            key={type}
            onClick={() => setRateTypeFilter(type)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              rateTypeFilter === type
                ? 'bg-primary-500 text-white shadow-sm'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
          >
            {type === 'all'
              ? 'All Types'
              : type === 'case_mix'
                ? 'Case Mix'
                : type === 'flat'
                  ? 'Flat'
                  : 'Hybrid'}
          </button>
        ))}
        <div className="ml-auto text-xs text-surface-400">
          {filteredStates.length} state{filteredStates.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* State Rate Table */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/50">
                <SortHeader label="State" sortKeyValue="stateName" />
                <SortHeader label="Daily Rate" sortKeyValue="currentDailyRate" />
                <SortHeader label="Rate Type" sortKeyValue="rateType" />
                <SortHeader label="YoY Change" sortKeyValue="yearOverYearChange" />
                <SortHeader label="5yr CAGR" sortKeyValue="fiveYearCagr" />
                <SortHeader label="Projected Rate" sortKeyValue="projectedNextYearRate" />
                <SortHeader label="Quality Bonus" sortKeyValue="qualityBonusMax" />
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-surface-500 dark:text-surface-400">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {sortedStates.map((s) => {
                const isCascadia = CASCADIA_STATES.has(s.state);
                const notesExpanded = expandedNotes.has(s.state);

                return (
                  <Fragment key={s.state}>
                    <tr
                      className={cn(
                        'hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors',
                        isCascadia &&
                          'bg-primary-50/50 dark:bg-primary-900/10 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                      )}
                    >
                      {/* State */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {isCascadia && (
                            <Target className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          )}
                          <div>
                            <div className="font-semibold text-surface-900 dark:text-white">
                              {s.stateName}
                            </div>
                            <div className="text-xs text-surface-400">{s.state}</div>
                          </div>
                        </div>
                      </td>

                      {/* Daily Rate */}
                      <td className="px-3 py-3">
                        <span className="font-mono font-bold text-surface-900 dark:text-white">
                          {formatCurrency(s.currentDailyRate)}
                        </span>
                      </td>

                      {/* Rate Type */}
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-xs font-medium',
                            s.rateType === 'case_mix'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : s.rateType === 'flat'
                                ? 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          )}
                        >
                          {s.rateType === 'case_mix'
                            ? 'Case Mix'
                            : s.rateType === 'flat'
                              ? 'Flat'
                              : 'Hybrid'}
                        </span>
                      </td>

                      {/* YoY Change */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          {s.yearOverYearChange >= 0 ? (
                            <ArrowUp className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span
                            className={cn(
                              'font-mono font-semibold',
                              s.yearOverYearChange >= 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            )}
                          >
                            {formatPercent(s.yearOverYearChange)}
                          </span>
                        </div>
                      </td>

                      {/* 5yr CAGR */}
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'font-mono text-xs font-medium',
                            s.fiveYearCagr >= 0.035
                              ? 'text-green-600 dark:text-green-400'
                              : s.fiveYearCagr >= 0.025
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-surface-500'
                          )}
                        >
                          {formatPercent(s.fiveYearCagr)}
                        </span>
                      </td>

                      {/* Projected Rate */}
                      <td className="px-3 py-3">
                        <div>
                          <span className="font-mono text-surface-700 dark:text-surface-300">
                            {formatCurrency(s.projectedNextYearRate)}
                          </span>
                          <span className="text-xs text-green-500 ml-1">
                            +{formatPercent(s.projectedChange)}
                          </span>
                        </div>
                      </td>

                      {/* Quality Bonus */}
                      <td className="px-3 py-3">
                        {s.hasQualityIncentive && s.qualityBonusMax ? (
                          <span className="font-mono text-xs font-medium text-green-600 dark:text-green-400">
                            +{formatCurrency(s.qualityBonusMax)}/day
                          </span>
                        ) : (
                          <span className="text-xs text-surface-400">--</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="px-3 py-3">
                        {s.notes.length > 0 && (
                          <button
                            onClick={() => toggleNotes(s.state)}
                            className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 transition-colors"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{s.notes.length}</span>
                            {notesExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded notes row */}
                    {notesExpanded && (
                      <tr
                        className={cn(
                          'bg-surface-50 dark:bg-surface-800/30',
                          isCascadia && 'bg-primary-50/30 dark:bg-primary-900/5'
                        )}
                      >
                        <td colSpan={8} className="px-6 py-3">
                          <div className="flex gap-6">
                            {/* Notes */}
                            <div className="flex-1">
                              <div className="text-xs font-semibold text-surface-500 uppercase mb-1.5">
                                Notes
                              </div>
                              <ul className="space-y-1">
                                {s.notes.map((note, i) => (
                                  <li
                                    key={i}
                                    className="text-xs text-surface-600 dark:text-surface-400 flex items-start gap-1.5"
                                  >
                                    <span className="text-surface-400 mt-0.5">-</span>
                                    {note}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Rate Components (if available) */}
                            {s.nursingComponent && (
                              <div className="shrink-0">
                                <div className="text-xs font-semibold text-surface-500 uppercase mb-1.5">
                                  Rate Components
                                </div>
                                <div className="space-y-1 text-xs">
                                  <div className="flex justify-between gap-4">
                                    <span className="text-surface-500">Nursing</span>
                                    <span className="font-mono font-medium text-surface-700 dark:text-surface-300">
                                      {formatCurrency(s.nursingComponent)}
                                    </span>
                                  </div>
                                  {s.capitalComponent && (
                                    <div className="flex justify-between gap-4">
                                      <span className="text-surface-500">Capital</span>
                                      <span className="font-mono font-medium text-surface-700 dark:text-surface-300">
                                        {formatCurrency(s.capitalComponent)}
                                      </span>
                                    </div>
                                  )}
                                  {s.ancillaryComponent && (
                                    <div className="flex justify-between gap-4">
                                      <span className="text-surface-500">Ancillary</span>
                                      <span className="font-mono font-medium text-surface-700 dark:text-surface-300">
                                        {formatCurrency(s.ancillaryComponent)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Footer */}
      <div className="neu-card p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-surface-400 shrink-0 mt-0.5" />
        <div className="text-xs text-surface-500 space-y-1">
          <p>
            Rates sourced from state Medicaid agency rate sheets and CMS reports. Data reflects
            average SNF Medicaid per-diem rates by state. Case-mix states adjust rates based on
            resident acuity (RUG-IV/PDPM). Quality bonus amounts represent the maximum available
            daily add-on.
          </p>
          <p>
            <span className="inline-flex items-center gap-1">
              <Target className="w-3 h-3 text-primary-500" />
              <span className="font-medium text-primary-600 dark:text-primary-400">
                Highlighted rows
              </span>
            </span>{' '}
            indicate Cascadia Healthcare target markets (OH, ID, WA, OR).
          </p>
        </div>
      </div>
    </div>
  );
}
