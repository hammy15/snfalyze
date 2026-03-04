'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Layers, GitCompareArrows, X, TrendingUp, DollarSign, Building2 } from 'lucide-react';

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
  pricePerBed: number | null;
  capRate: string | null;
  valuationLow: number | null;
  valuationHigh: number | null;
}

const STATUS_COLUMNS = [
  { key: 'new', label: 'New', color: 'border-blue-400' },
  { key: 'analyzing', label: 'Analyzing', color: 'border-amber-400' },
  { key: 'reviewed', label: 'Reviewed', color: 'border-purple-400' },
  { key: 'under_loi', label: 'Under LOI', color: 'border-primary-400' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'border-orange-400' },
  { key: 'closed', label: 'Closed', color: 'border-emerald-400' },
];

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

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    fetch('/api/deals?limit=50&includeFinancials=true')
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
      else if (next.size < 4) next.add(id);
      return next;
    });
  };

  const compareDeals = deals.filter((d) => compareIds.has(d.id));
  const groupedDeals = STATUS_COLUMNS.map((col) => ({
    ...col,
    deals: deals.filter((d) => d.status === col.key),
  }));

  const totalOps = deals.length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
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
          {compareIds.size > 0 && (
            <button
              onClick={() => setShowCompare(true)}
              className="flex items-center gap-2 px-4 py-2 neu-button-primary rounded-xl text-xs font-medium"
            >
              <GitCompareArrows className="w-3.5 h-3.5" />
              Compare ({compareIds.size})
            </button>
          )}
          <div className="text-xs text-surface-400">
            IPO Target: <span className="font-bold text-orange-500">58 → 125+ ops</span>
          </div>
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
            <button onClick={() => setShowCompare(false)} className="text-surface-400 hover:text-surface-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#E2DFD8] dark:border-surface-700">
                  <th className="text-left py-2 pr-4 text-surface-400 font-medium w-32">Metric</th>
                  {compareDeals.map((d) => (
                    <th key={d.id} className="text-left py-2 px-3 font-bold text-surface-700 dark:text-surface-200 min-w-[160px]">
                      <div className="truncate">{d.name}</div>
                      <div className="text-[10px] font-normal text-surface-400">{d.assetType} · {d.primaryState}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD8]/50 dark:divide-surface-800/50">
                {[
                  { label: 'Beds', render: (d: Deal) => d.beds?.toLocaleString() || '—' },
                  { label: 'Asking Price', render: (d: Deal) => formatM(d.askingPrice) || '—' },
                  { label: 'Price / Bed', render: (d: Deal) => formatPPB(d.askingPrice, d.beds) || '—' },
                  { label: 'EBITDAR', render: (d: Deal) => formatM(d.ebitdar) || '—' },
                  { label: 'Valuation Range', render: (d: Deal) => d.valuationLow && d.valuationHigh ? `${formatM(d.valuationLow)} — ${formatM(d.valuationHigh)}` : '—' },
                  { label: 'Cap Rate', render: (d: Deal) => d.capRate ? `${d.capRate}%` : '—' },
                  { label: 'Confidence', render: (d: Deal) => d.confidenceScore ? `${d.confidenceScore}%` : '—' },
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
        <div className="grid grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 shimmer-warm rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-3 overflow-x-auto">
          {groupedDeals.map((col) => (
            <div key={col.key} className="space-y-2">
              <div className={cn('text-xs font-bold text-surface-500 pb-2 border-b-2', col.color)}>
                {col.label} <span className="text-surface-300">({col.deals.length})</span>
              </div>
              {col.deals.map((deal) => (
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
                      {deal.askingPrice && deal.beds > 0 && (
                        <span className="text-[9px] text-surface-400 flex items-center gap-0.5">
                          <Building2 className="w-2.5 h-2.5" />
                          {formatPPB(deal.askingPrice, deal.beds)}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500" title="Newo" />
                    <span className="w-2 h-2 rounded-full bg-orange-500" title="Dev" />
                    {deal.confidenceScore && (
                      <span className="text-[10px] text-surface-400 ml-1">{deal.confidenceScore}%</span>
                    )}
                  </div>
                </Link>
              ))}
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
