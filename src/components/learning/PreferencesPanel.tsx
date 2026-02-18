'use client';

import { useState, useEffect } from 'react';
import { Brain, TrendingUp, Building2, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AggregatedPref {
  id: string;
  preferenceKey: string;
  assetType: string | null;
  state: string | null;
  region: string | null;
  avgValue: string;
  medianValue: string;
  minValue: string;
  maxValue: string;
  stdDev: string;
  sampleCount: number;
  confidence: string;
  sourceDealIds: string[];
}

interface PreferencesPanelProps {
  assetTypeFilter?: string;
  stateFilter?: string;
  className?: string;
}

const PREF_LABELS: Record<string, string> = {
  cap_rate: 'Cap Rate',
  leased_multiplier: 'Leased Multiplier',
  mgmt_fee_pct: 'Management Fee %',
  agency_pct: 'Agency / Staffing %',
  capex_reserve_pct: 'CapEx Reserve %',
  revenue_growth: 'Revenue Growth',
  expense_growth: 'Expense Growth',
  occupancy_assumption: 'Occupancy Assumption',
};

const PREF_FORMAT: Record<string, (v: number) => string> = {
  cap_rate: (v) => `${(v * 100).toFixed(1)}%`,
  leased_multiplier: (v) => `${v.toFixed(2)}x`,
  mgmt_fee_pct: (v) => `${(v * 100).toFixed(1)}%`,
  agency_pct: (v) => `${(v * 100).toFixed(1)}%`,
  capex_reserve_pct: (v) => `${(v * 100).toFixed(1)}%`,
  revenue_growth: (v) => `${(v * 100).toFixed(1)}%`,
  expense_growth: (v) => `${(v * 100).toFixed(1)}%`,
  occupancy_assumption: (v) => `${(v * 100).toFixed(1)}%`,
};

function formatValue(key: string, value: number): string {
  return (PREF_FORMAT[key] || ((v: number) => v.toFixed(2)))(value);
}

function ConfidenceBar({ confidence }: { confidence: number }) {
  const pct = confidence * 100;
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 rounded-full bg-surface-100 overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 70 ? 'bg-emerald-400' : pct >= 40 ? 'bg-amber-400' : 'bg-surface-300'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-surface-400 tabular-nums w-8">{pct.toFixed(0)}%</span>
    </div>
  );
}

function RangeBar({ min, max, median, prefKey }: { min: number; max: number; median: number; prefKey: string }) {
  if (max === min) return null;
  const range = max - min;
  const medianPos = range > 0 ? ((median - min) / range) * 100 : 50;

  return (
    <div className="relative h-2 bg-surface-100 rounded-full mt-1 mb-0.5">
      <div
        className="absolute top-0 h-full bg-primary-200 rounded-full"
        style={{ left: '0%', right: '0%' }}
      />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-primary-500 rounded-full border border-white shadow-sm"
        style={{ left: `${medianPos}%` }}
        title={`Median: ${formatValue(prefKey, median)}`}
      />
      <div className="flex justify-between mt-2">
        <span className="text-[9px] text-surface-400">{formatValue(prefKey, min)}</span>
        <span className="text-[9px] text-surface-400">{formatValue(prefKey, max)}</span>
      </div>
    </div>
  );
}

export function PreferencesPanel({ assetTypeFilter, stateFilter, className }: PreferencesPanelProps) {
  const [preferences, setPreferences] = useState<AggregatedPref[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [groupBy, setGroupBy] = useState<'key' | 'assetType'>('key');

  useEffect(() => {
    async function fetchPreferences() {
      const params = new URLSearchParams();
      if (assetTypeFilter) params.set('assetType', assetTypeFilter);
      if (stateFilter) params.set('state', stateFilter);

      try {
        const res = await fetch(`/api/learning/preferences?${params}`);
        const data = await res.json();
        if (data.success) setPreferences(data.data || []);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, [assetTypeFilter, stateFilter]);

  if (loading) {
    return (
      <div className={cn('bg-white rounded-xl border border-[#E2DFD8] p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-surface-800">Learned Preferences</h3>
        </div>
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-surface-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (preferences.length === 0) {
    return (
      <div className={cn('bg-white rounded-xl border border-[#E2DFD8] p-6 text-center', className)}>
        <Brain className="w-10 h-10 text-surface-300 mx-auto mb-3" />
        <h3 className="text-sm font-semibold text-surface-700 mb-1">No Learned Preferences Yet</h3>
        <p className="text-xs text-surface-400">
          Upload completed deals to start building learned preferences
        </p>
      </div>
    );
  }

  // Group by preference key
  const grouped = preferences.reduce<Record<string, AggregatedPref[]>>((acc, pref) => {
    const key = groupBy === 'key' ? pref.preferenceKey : (pref.assetType || 'All');
    if (!acc[key]) acc[key] = [];
    acc[key].push(pref);
    return acc;
  }, {});

  return (
    <div className={cn('bg-white rounded-xl border border-[#E2DFD8] p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-surface-800">Learned Preferences</h3>
          <span className="text-xs text-surface-400 bg-surface-100 px-2 py-0.5 rounded-full">
            {preferences.length} patterns
          </span>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setGroupBy('key')}
            className={cn('px-2 py-1 rounded', groupBy === 'key' ? 'bg-primary-100 text-primary-600' : 'text-surface-400 hover:bg-surface-100')}
          >
            By Metric
          </button>
          <button
            onClick={() => setGroupBy('assetType')}
            className={cn('px-2 py-1 rounded', groupBy === 'assetType' ? 'bg-primary-100 text-primary-600' : 'text-surface-400 hover:bg-surface-100')}
          >
            By Type
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(grouped).map(([group, prefs]) => (
          <div key={group} className="border border-surface-100 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedKey(expandedKey === group ? null : group)}
              className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-surface-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedKey === group ? (
                  <ChevronDown className="w-3.5 h-3.5 text-surface-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-surface-400" />
                )}
                <span className="text-sm font-medium text-surface-700">
                  {PREF_LABELS[group] || group}
                </span>
                <span className="text-[10px] text-surface-400">
                  {prefs.length} slice{prefs.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-primary-600 tabular-nums">
                  {formatValue(prefs[0].preferenceKey, Number(prefs[0].medianValue))}
                </span>
                <ConfidenceBar confidence={Number(prefs[0].confidence)} />
              </div>
            </button>

            {expandedKey === group && (
              <div className="px-4 pb-3 space-y-2">
                {prefs.map((pref) => (
                  <div key={pref.id} className="bg-surface-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {pref.assetType && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary-100 text-primary-600">
                          <Building2 className="w-2.5 h-2.5" />
                          {pref.assetType}
                        </span>
                      )}
                      {pref.state && (
                        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600">
                          <MapPin className="w-2.5 h-2.5" />
                          {pref.state}
                        </span>
                      )}
                      {pref.region && !pref.state && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-600">
                          {pref.region}
                        </span>
                      )}
                      <span className="text-[10px] text-surface-400 ml-auto">
                        n={pref.sampleCount}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      <div>
                        <span className="text-surface-400">Avg</span>
                        <div className="font-semibold text-surface-700 tabular-nums">
                          {formatValue(pref.preferenceKey, Number(pref.avgValue))}
                        </div>
                      </div>
                      <div>
                        <span className="text-surface-400">Median</span>
                        <div className="font-semibold text-primary-600 tabular-nums">
                          {formatValue(pref.preferenceKey, Number(pref.medianValue))}
                        </div>
                      </div>
                      <div>
                        <span className="text-surface-400">Std Dev</span>
                        <div className="font-semibold text-surface-700 tabular-nums">
                          {formatValue(pref.preferenceKey, Number(pref.stdDev))}
                        </div>
                      </div>
                      <div>
                        <span className="text-surface-400">Confidence</span>
                        <ConfidenceBar confidence={Number(pref.confidence)} />
                      </div>
                    </div>
                    <RangeBar
                      min={Number(pref.minValue)}
                      max={Number(pref.maxValue)}
                      median={Number(pref.medianValue)}
                      prefKey={pref.preferenceKey}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
