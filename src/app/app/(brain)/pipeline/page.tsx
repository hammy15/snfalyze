'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Layers, ArrowRight } from 'lucide-react';

interface Deal {
  id: string;
  name: string;
  status: string;
  assetType: string;
  primaryState: string;
  beds: number;
  confidenceScore: number;
}

const STATUS_COLUMNS = [
  { key: 'new', label: 'New', color: 'border-blue-400' },
  { key: 'analyzing', label: 'Analyzing', color: 'border-amber-400' },
  { key: 'reviewed', label: 'Reviewed', color: 'border-purple-400' },
  { key: 'under_loi', label: 'Under LOI', color: 'border-primary-400' },
  { key: 'due_diligence', label: 'Due Diligence', color: 'border-orange-400' },
  { key: 'closed', label: 'Closed', color: 'border-emerald-400' },
];

export default function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/deals?limit=50')
      .then((r) => r.json())
      .then((data) => {
        setDeals(data.data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const groupedDeals = STATUS_COLUMNS.map((col) => ({
    ...col,
    deals: deals.filter((d) => d.status === col.key),
  }));

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
        <div className="text-xs text-surface-400">
          IPO Target: <span className="font-bold text-orange-500">58 → 125+ ops</span>
        </div>
      </div>

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
                  className="block neu-card-warm p-3 hover-lift"
                >
                  <div className="text-xs font-bold text-surface-700 dark:text-surface-200 truncate">
                    {deal.name}
                  </div>
                  <div className="text-[10px] text-surface-400 mt-1">
                    {deal.assetType} · {deal.primaryState} · {deal.beds} beds
                  </div>
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
