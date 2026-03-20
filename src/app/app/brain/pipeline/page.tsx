'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Layers, GitCompareArrows, X, TrendingUp, DollarSign, Building2, Circle, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  status: string;
  assetType: string;
  primaryState: string;
  beds: number;
  confidenceScore: number;
  askingPrice: number | null;
  ebitdar: number | null;
  ebitdarMargin: number | null;
  rentExpense: number | null;
  totalRevenue: number | null;
  pricePerBed: number | null;
  capRate: string | null;
  valuationLow: number | null;
  valuationHigh: number | null;
  dataCompleteness: number;
  dataHealth: 'good' | 'partial' | 'shell';
  hasT12: boolean;
  hasProforma: boolean;
  hasRisk: boolean;
  thesis: string | null;
}

const STATUS_COLUMNS = [
  { key: 'new', label: 'New', color: 'border-blue-400' },
  { key: 'analyzing', label: 'Analyzing', color: 'border-amber-400' },
  { key: 'reviewed', label: 'Reviewed', color: 'border-purple-400' },
  { key: 'under_loi', label: 'Under LOI', color: 'border-primary-400' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'border-orange-400' },
  { key: 'closed', label: 'Closed', color: 'border-emerald-400' },
];

// Cascadia core markets for scoring boost
const CASCADIA_CORE_MARKETS = ['OR', 'WA', 'ID', 'MT', 'AZ'];

function formatM(n: number | null) {
  if (!n) return null;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function formatPPB(price: number | null, beds: number) {
  if (!price || !beds) return null;
  return `$${Math.round(price / beds / 1000)}K/bed`;
}

function formatPercent(n: number | null) {
  if (n === null || n === undefined) return null;
  return `${(n * 100).toFixed(1)}%`;
}

function getRecommendation(conf: number | null): { label: string; color: string } {
  if (!conf) return { label: '—', color: 'text-surface-300' };
  if (conf >= 75) return { label: 'Pursue', color: 'text-emerald-600' };
  if (conf >= 55) return { label: 'Conditional', color: 'text-amber-600' };
  return { label: 'Pass', color: 'text-red-500' };
}

function hasSNCIndicator(deal: Deal): boolean {
  const name = deal.name?.toLowerCase() || '';
  const type = deal.assetType?.toLowerCase() || '';
  return (
    type.includes('snc') ||
    name.includes('ohana') ||
    name.includes('sapphire') ||
    name.includes('snc')
  );
}

function hasRentRuleViolation(deal: Deal): boolean {
  if (!deal.rentExpense || !deal.totalRevenue || deal.totalRevenue === 0) return false;
  return deal.rentExpense / deal.totalRevenue > 0.25;
}

const HEALTH_COLORS = {
  good: 'bg-emerald-400',
  partial: 'bg-amber-400',
  shell: 'bg-red-400',
};

const HEALTH_LABELS = {
  good: 'Rich data',
  partial: 'Partial data',
  shell: 'Intake only',
};

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetch('/api/deals?limit=50')
      .then((r) => r.json())
      .then((data) => {
        setDeals(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleCompare = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompareIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 6) next.add(id);
      return next;
    });
  };

  const quickCompare = (statusKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    const statusDeals = deals.filter((d) => d.status === statusKey);
    if (statusDeals.length < 2) return;
    setCompareIds(new Set(statusDeals.slice(0, 6).map((d) => d.id)));
    setShowCompare(true);
  };

  const compareDeals = deals.filter((d) => compareIds.has(d.id));
  const groupedDeals = STATUS_COLUMNS.map((col) => ({
    ...col,
    deals: deals.filter((d) => d.status === col.key),
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Cascadia Context Bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-primary-50 to-orange-50 dark:from-primary-900/20 dark:to-orange-900/20 rounded-xl border border-primary-200/50 dark:border-primary-700/30 text-xs">
        <Building2 className="w-4 h-4 text-primary-500 flex-shrink-0" />
        <span className="font-semibold text-primary-700 dark:text-primary-300">Cascadia Today:</span>
        <div className="flex items-center gap-3 flex-wrap text-surface-600 dark:text-surface-300">
          <span><span className="font-bold text-surface-800 dark:text-surface-100">58</span> ops</span>
          <span className="text-surface-300">·</span>
          <span><span className="font-bold text-surface-800 dark:text-surface-100">$590M</span> revenue</span>
          <span className="text-surface-300">·</span>
          <span><span className="font-bold text-emerald-600">14.3%</span> EBITDAR</span>
          <span className="text-surface-300">·</span>
          <span className="text-surface-400">Target:</span>
          <span className="font-bold text-orange-500">125+ ops</span>
          <span className="text-surface-300">·</span>
          <span className="text-surface-400">EBITDAR target:</span>
          <span className="font-bold text-primary-600">17-20%</span>
        </div>
        <div className="ml-auto flex-shrink-0 text-[10px] text-surface-400">
          OR/WA/ID/MT/AZ · IPO path: 120+ ops
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-primary-500" />
            Pipeline Intelligence
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            Every deal has Newo + Dev brain indicators
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/app/brain/compare"
            className="flex items-center gap-2 px-4 py-2 neu-button-secondary rounded-xl text-xs font-medium"
          >
            <GitCompareArrows className="w-3.5 h-3.5" />
            Full Compare
          </Link>
          {compareIds.size > 0 && (
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-2 px-4 py-2 neu-button-primary rounded-xl text-xs font-medium"
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              Quick Compare ({compareIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Compare Modal */}
      {showCompare && compareDeals.length > 1 && (
        <div className="neu-card-warm p-5 space-y-4 border-2 border-primary-200/50">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
              <GitCompareArrows className="w-4 h-4 text-primary-500" />
              Deal Comparison
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setCompareIds(new Set()); setShowCompare(false); }}
                className="text-[10px] text-surface-400 hover:text-surface-600"
              >
                Clear all
              </button>
              <button onClick={() => setShowCompare(false)} className="text-surface-400 hover:text-surface-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2DFD8] dark:border-surface-700">
                  <th className="text-left py-2 pr-4 text-surface-400 font-medium w-32">Metric</th>
                  {compareDeals.map((d) => (
                    <th key={d.id} className="text-left py-2 px-3 font-bold text-surface-700 dark:text-surface-200 min-w-[150px]">
                      <div className="truncate">{d.name}</div>
                      <div className="text-[10px] font-normal text-surface-400">{d.assetType} · {d.primaryState}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD8]/50 dark:divide-surface-800/50">
                {[
                  { label: 'Recommendation', render: (d: Deal) => {
                    const rec = getRecommendation(d.confidenceScore);
                    return <span className={cn('font-bold', rec.color)}>{rec.label}</span>;
                  }},
                  { label: 'Confidence', render: (d: Deal) => d.confidenceScore ? <span className="font-medium">{d.confidenceScore}%</span> : '—' },
                  { label: 'Beds', render: (d: Deal) => d.beds?.toLocaleString() || '—' },
                  { label: 'Asking Price', render: (d: Deal) => formatM(d.askingPrice) || '—' },
                  { label: 'Price / Bed', render: (d: Deal) => formatPPB(d.askingPrice, d.beds) || '—' },
                  { label: 'EBITDAR', render: (d: Deal) => formatM(d.ebitdar) || <span className="text-red-400 text-[9px]">No data</span> },
                  { label: 'EBITDAR Margin', render: (d: Deal) => formatPercent(d.ebitdarMargin) || '—' },
                  { label: 'Valuation Range', render: (d: Deal) => d.valuationLow && d.valuationHigh ? `${formatM(d.valuationLow)} — ${formatM(d.valuationHigh)}` : '—' },
                  { label: 'Data Health', render: (d: Deal) => (
                    <span className="flex items-center gap-1.5">
                      <span className={cn('w-2 h-2 rounded-full', HEALTH_COLORS[d.dataHealth || 'shell'])} />
                      <span>{d.dataCompleteness || 0}%</span>
                    </span>
                  )},
                  { label: 'SNC', render: (d: Deal) => hasSNCIndicator(d) ? <span className="text-purple-600 font-bold">YES</span> : '—' },
                  { label: 'Rent Rule', render: (d: Deal) => hasRentRuleViolation(d) ? <span className="text-red-500 font-bold">⚠ &gt;25%</span> : <span className="text-emerald-500">OK</span> },
                  { label: 'Status', render: (d: Deal) => d.status.replace(/_/g, ' ') },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="py-2 pr-4 text-surface-400 font-medium">{row.label}</td>
                    {compareDeals.map((d) => (
                      <td key={d.id} className="py-2 px-3 text-surface-700 dark:text-surface-200">
                        {row.render(d)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 shimmer-warm rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 overflow-x-auto">
          {groupedDeals.map((col) => (
            <div key={col.key} className="space-y-2">
              <button
                onClick={(e) => quickCompare(col.key, e)}
                className={cn(
                  'w-full text-left text-xs font-bold text-surface-500 pb-2 border-b-2 hover:text-primary-600 transition-colors',
                  col.color,
                  col.deals.length >= 2 && 'cursor-pointer'
                )}
                title={col.deals.length >= 2 ? `Click to compare all ${col.deals.length} deals` : ''}
              >
                {col.label} <span className="text-surface-300">({col.deals.length})</span>
                {col.deals.length >= 2 && (
                  <GitCompareArrows className="w-2.5 h-2.5 inline ml-1 opacity-0 group-hover:opacity-100" />
                )}
              </button>
              {col.deals.map((deal) => {
                const rec = getRecommendation(deal.confidenceScore);
                const isSNC = hasSNCIndicator(deal);
                const rentViolation = hasRentRuleViolation(deal);
                const isCoreMkt = CASCADIA_CORE_MARKETS.includes(deal.primaryState?.toUpperCase());
                return (
                  <Link
                    key={deal.id}
                    href={`/app/deals/${deal.id}`}
                    className={cn(
                      'block neu-card-warm p-3 hover-lift relative',
                      compareIds.has(deal.id) && 'ring-2 ring-primary-400'
                    )}
                  >
                    {/* Compare checkbox */}
                    <button
                      onClick={(e) => toggleCompare(deal.id, e)}
                      className={cn(
                        'absolute top-1.5 right-1.5 w-4 h-4 rounded border text-[8px] flex items-center justify-center transition-colors',
                        compareIds.has(deal.id)
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-surface-300 hover:border-primary-400'
                      )}
                    >
                      {compareIds.has(deal.id) && '✓'}
                    </button>

                    {/* Badges row: SNC + Rent Rule + Core Market */}
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      {isSNC && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-700/50">
                          SNC
                        </span>
                      )}
                      {isCoreMkt && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
                          Core
                        </span>
                      )}
                      {rentViolation && (
                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 flex items-center gap-0.5">
                          <AlertTriangle className="w-2 h-2" />
                          Rent&gt;25%
                        </span>
                      )}
                    </div>

                    <div className="text-xs font-bold text-surface-700 dark:text-surface-200 truncate pr-5">
                      {deal.name}
                    </div>
                    <div className="text-[10px] text-surface-400 mt-1">
                      {deal.assetType} · {deal.primaryState} · {deal.beds} beds
                    </div>

                    {/* Deal Economics */}
                    {(deal.askingPrice || deal.ebitdar) && (
                      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
                        {deal.askingPrice && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-0.5">
                            <DollarSign className="w-2.5 h-2.5" />
                            {formatM(deal.askingPrice)}
                          </span>
                        )}
                        {deal.ebitdar && (
                          <span className="text-[9px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5">
                            <TrendingUp className="w-2.5 h-2.5" />
                            {formatM(deal.ebitdar)}
                          </span>
                        )}
                        {deal.ebitdarMargin && (
                          <span className={cn(
                            'text-[9px] font-medium',
                            deal.ebitdarMargin >= 0.17 ? 'text-emerald-600' :
                            deal.ebitdarMargin >= 0.12 ? 'text-amber-600' : 'text-red-500'
                          )}>
                            {formatPercent(deal.ebitdarMargin)} EBITDAR
                          </span>
                        )}
                        {deal.askingPrice && deal.beds > 0 && (
                          <span className="text-[9px] text-surface-400 flex items-center gap-0.5">
                            <Building2 className="w-2.5 h-2.5" />
                            {formatPPB(deal.askingPrice, deal.beds)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Data Health Badges: T12, ProForma, Risk */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {deal.hasT12 && (
                        <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-700/30">
                          T12 ✓
                        </span>
                      )}
                      {deal.hasProforma && (
                        <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-700/30">
                          ProForma ✓
                        </span>
                      )}
                      {deal.hasRisk && (
                        <span className="text-[8px] font-medium px-1 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-700/30">
                          Risk ✓
                        </span>
                      )}
                    </div>

                    {/* Bottom row: brain dots + confidence + data health + recommendation */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-teal-500" title="Newo" />
                        <span className="w-2 h-2 rounded-full bg-orange-500" title="Dev" />
                        {deal.confidenceScore && (
                          <span className="text-[10px] text-surface-400 ml-1">{deal.confidenceScore}%</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[9px] font-bold', rec.color)}>{rec.label}</span>
                        <span
                          className={cn('w-2 h-2 rounded-full', HEALTH_COLORS[deal.dataHealth || 'shell'])}
                          title={`${HEALTH_LABELS[deal.dataHealth || 'shell']} (${deal.dataCompleteness || 0}%)`}
                        />
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`/api/deals/${deal.id}/export/one-pager`, '_blank'); }}
                          className="text-surface-300 hover:text-primary-500 transition-colors"
                          title="Export One-Pager"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {col.deals.length === 0 && (
                <div className="text-[10px] text-surface-300 text-center py-6">Empty</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
