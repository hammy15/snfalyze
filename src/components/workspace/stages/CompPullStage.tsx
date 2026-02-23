'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Search, Plus, Filter, ArrowUpDown, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CompPullStageData, TransactionComp, MarketBenchmarkSummary } from '@/types/workspace';

interface CompPullStageProps {
  dealId: string;
  stageData: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function CompPullStage({ dealId, stageData, onUpdate }: CompPullStageProps) {
  const [activeTab, setActiveTab] = useState<'transaction' | 'benchmarks' | 'summary'>('transaction');
  const [isLoading, setIsLoading] = useState(false);

  const data = stageData as Partial<CompPullStageData>;
  const comps = data.transactionComps || [];
  const benchmarks = data.operatingBenchmarks;
  const summary = data.marketBenchmarkSummary;

  const loadComps = async () => {
    setIsLoading(true);
    try {
      // POST triggers the comp engine to pull + score comps
      const res = await fetch(`/api/deals/${dealId}/workspace/comps`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        onUpdate({
          transactionComps: result.transactionComps || [],
          operatingBenchmarks: result.operatingBenchmarks || null,
          marketBenchmarkSummary: result.marketBenchmarkSummary || null,
        });
      }
    } catch (err) {
      console.error('Failed to load comps:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (comps.length === 0) loadComps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCompSelection = (compId: string) => {
    onUpdate({
      transactionComps: comps.map(c =>
        c.id === compId ? { ...c, isSelected: !c.isSelected } : c
      ),
    });
  };

  const selectedCount = comps.filter(c => c.isSelected).length;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Tab nav */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
        {(['transaction', 'benchmarks', 'summary'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors',
              activeTab === tab
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            )}
          >
            {tab === 'transaction' ? `Transaction Comps (${selectedCount})` : tab === 'benchmarks' ? 'Operating Benchmarks' : 'Market Summary'}
          </button>
        ))}
      </div>

      {/* Transaction Comps */}
      {activeTab === 'transaction' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-surface-500">{comps.length} comparable transactions found</p>
            <button
              onClick={loadComps}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-40 flex items-center gap-1.5"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
              Refresh Comps
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                <p className="text-sm text-surface-500">Searching for comparable transactions...</p>
              </div>
            </div>
          ) : comps.length === 0 ? (
            <div className="text-center py-16 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              <BarChart3 className="w-10 h-10 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500 mb-1">No comps found yet</p>
              <p className="text-xs text-surface-400">Complete Deal Intake first, then comps will auto-populate</p>
            </div>
          ) : (
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-50 dark:bg-surface-800">
                  <tr>
                    <th className="w-10 px-3 py-2.5"></th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium text-surface-500">Facility</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-surface-500">Beds</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-surface-500">Sale Price</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-surface-500">$/Bed</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-surface-500">Cap Rate</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-surface-500">EBITDA X</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-surface-500">Stars</th>
                    <th className="text-right px-3 py-2.5 text-xs font-medium text-surface-500">Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {comps.map(comp => (
                    <tr
                      key={comp.id}
                      className={cn(
                        'hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors',
                        comp.isSelected ? '' : 'opacity-50'
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={comp.isSelected}
                          onChange={() => toggleCompSelection(comp.id)}
                          className="rounded border-surface-300"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-medium text-surface-800 dark:text-surface-200">{comp.facilityName}</div>
                        <div className="text-xs text-surface-400">{comp.state} · {comp.marketType} · {comp.dealDate}</div>
                      </td>
                      <td className="text-right px-3 py-2.5 text-surface-700 dark:text-surface-300">{comp.bedCount}</td>
                      <td className="text-right px-3 py-2.5 text-surface-700 dark:text-surface-300">${(comp.salePrice / 1e6).toFixed(1)}M</td>
                      <td className="text-right px-3 py-2.5 text-surface-700 dark:text-surface-300">${comp.pricePerBed?.toLocaleString()}</td>
                      <td className="text-right px-3 py-2.5 text-surface-700 dark:text-surface-300">{comp.capRate ? `${(comp.capRate * 100).toFixed(1)}%` : '—'}</td>
                      <td className="text-right px-3 py-2.5 text-surface-700 dark:text-surface-300">{comp.ebitdaMultiple ? `${comp.ebitdaMultiple.toFixed(1)}x` : '—'}</td>
                      <td className="text-right px-3 py-2.5 text-surface-700 dark:text-surface-300">{comp.starRating || '—'}</td>
                      <td className="text-right px-3 py-2.5">
                        <span className={cn(
                          'text-xs font-medium px-1.5 py-0.5 rounded',
                          comp.relevanceScore >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          comp.relevanceScore >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                          'bg-surface-100 text-surface-500'
                        )}>
                          {comp.relevanceScore}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Operating Benchmarks */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-4">
          {benchmarks ? (
            <>
              <BenchmarkSection title="Medicare Reimbursement" data={[
                { label: 'Medicare ADC', facility: benchmarks.medicare.adc, stateAvg: benchmarks.medicare.stateAvg?.adc, nationalAvg: benchmarks.medicare.nationalAvg?.adc },
                { label: 'Revenue Per Day', facility: benchmarks.medicare.revenuePerDay, stateAvg: benchmarks.medicare.stateAvg?.revenuePerDay, nationalAvg: benchmarks.medicare.nationalAvg?.revenuePerDay, isCurrency: true },
                { label: 'CMI Score', facility: benchmarks.medicare.cmi, stateAvg: benchmarks.medicare.stateAvg?.cmi, nationalAvg: benchmarks.medicare.nationalAvg?.cmi },
              ]} />
              <BenchmarkSection title="Medicaid Rate Intelligence" data={[
                { label: 'Base Rate Per Day', facility: benchmarks.medicaid.baseRatePerDay, isCurrency: true },
                { label: 'Rate Trend', facility: null, note: benchmarks.medicaid.rateTrend },
              ]} />
              <BenchmarkSection title="Quality Benchmark" data={[
                { label: 'Star Rating vs State', facility: benchmarks.quality.starRatingVsState },
                { label: 'Star Rating vs National', facility: benchmarks.quality.starRatingVsNational },
              ]} />
              <BenchmarkSection title="Cost Benchmarks" data={[
                { label: 'Labor Cost/Patient Day', facility: benchmarks.cost.laborCostPerPatientDay, isCurrency: true },
                { label: 'Contract Labor %', facility: benchmarks.cost.contractLaborPercent, isPercent: true },
                { label: 'Total Op Cost/Patient Day', facility: benchmarks.cost.totalOpCostPerPatientDay, isCurrency: true },
              ]} />
            </>
          ) : (
            <div className="text-center py-16 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              <BarChart3 className="w-10 h-10 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500">Benchmarks will populate after comp pull</p>
            </div>
          )}
        </div>
      )}

      {/* Market Summary */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          {summary ? (
            <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Market Benchmark Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <MetricCard label="Median $/Bed" value={`$${summary.medianPricePerBed.low.toLocaleString()} – $${summary.medianPricePerBed.high.toLocaleString()}`} />
                <MetricCard label="Median EBITDA Multiple" value={`${summary.medianEbitdaMultiple.low.toFixed(1)}x – ${summary.medianEbitdaMultiple.high.toFixed(1)}x`} />
                <MetricCard label="Median Cap Rate" value={`${(summary.medianCapRate.low * 100).toFixed(1)}% – ${(summary.medianCapRate.high * 100).toFixed(1)}%`} />
              </div>
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-500">Position vs Market:</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    summary.dealPosition === 'BELOW' ? 'text-emerald-600' :
                    summary.dealPosition === 'AT' ? 'text-surface-600' :
                    'text-red-600'
                  )}>
                    {summary.dealPosition === 'BELOW' && <TrendingDown className="w-4 h-4 inline mr-1" />}
                    {summary.dealPosition === 'AT' && <Minus className="w-4 h-4 inline mr-1" />}
                    {summary.dealPosition === 'ABOVE' && <TrendingUp className="w-4 h-4 inline mr-1" />}
                    {summary.dealPosition} Market
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-500">Data Confidence:</span>
                  <span className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded',
                    summary.dataConfidence === 'HIGH' ? 'bg-emerald-100 text-emerald-700' :
                    summary.dataConfidence === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  )}>
                    {summary.dataConfidence} ({summary.compCount} comps)
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              <BarChart3 className="w-10 h-10 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500">Market summary will generate after comp pull</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BenchmarkSection({ title, data }: {
  title: string;
  data: { label: string; facility?: number | null; stateAvg?: number | null; nationalAvg?: number | null; isCurrency?: boolean; isPercent?: boolean; note?: string }[];
}) {
  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
      <div className="bg-surface-50 dark:bg-surface-800 px-4 py-2.5">
        <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300">{title}</h4>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-100 dark:border-surface-800">
            <th className="text-left px-4 py-2 text-xs text-surface-500">Metric</th>
            <th className="text-right px-4 py-2 text-xs text-surface-500">This Facility</th>
            <th className="text-right px-4 py-2 text-xs text-surface-500">State Avg</th>
            <th className="text-right px-4 py-2 text-xs text-surface-500">National Avg</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
          {data.map(row => (
            <tr key={row.label}>
              <td className="px-4 py-2 text-surface-700 dark:text-surface-300">{row.label}</td>
              <td className="text-right px-4 py-2 font-medium text-surface-800 dark:text-surface-200">
                {row.note || formatValue(row.facility, row.isCurrency, row.isPercent)}
              </td>
              <td className="text-right px-4 py-2 text-surface-500">{formatValue(row.stateAvg, row.isCurrency, row.isPercent)}</td>
              <td className="text-right px-4 py-2 text-surface-500">{formatValue(row.nationalAvg, row.isCurrency, row.isPercent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
      <p className="text-xs text-surface-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{value}</p>
    </div>
  );
}

function formatValue(value: number | null | undefined, isCurrency?: boolean, isPercent?: boolean): string {
  if (value === null || value === undefined) return '—';
  if (isCurrency) return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (isPercent) return `${value.toFixed(1)}%`;
  return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
