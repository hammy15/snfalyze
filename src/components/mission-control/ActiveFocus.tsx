'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  Sparkles,
  Building2,
  DollarSign,
  BedDouble,
} from 'lucide-react';

interface ActiveFocusProps {
  deal: {
    id: string;
    name: string;
    status: string;
    stage: string;
    askingPrice: number;
    totalBeds: number;
    assetType: string;
    updatedAt: string;
  } | null;
}

const STAGE_LABELS: Record<string, { label: string; position: number }> = {
  document_understanding: { label: 'Doc Review', position: 1 },
  financial_reconstruction: { label: 'Financial', position: 2 },
  operating_reality: { label: 'Operations', position: 3 },
  risk_constraints: { label: 'Risk', position: 4 },
  valuation: { label: 'Valuation', position: 5 },
  synthesis: { label: 'Synthesis', position: 6 },
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  if (value === 0) return 'TBD';
  return `$${value}`;
}

function timeAgo(dateString: string): string {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ActiveFocus({ deal }: ActiveFocusProps) {
  if (!deal) return null;

  const stageInfo = STAGE_LABELS[deal.stage] || { label: 'Review', position: 1 };
  const progress = (stageInfo.position / 6) * 100;

  return (
    <Link href={`/app/deals/${deal.id}`}>
      <div className={cn(
        'relative overflow-hidden rounded-2xl border border-surface-700/50',
        'bg-gradient-to-br from-surface-900 to-surface-800',
        'p-5 group hover:border-primary-500/30 transition-all hover:shadow-glow-primary cursor-pointer'
      )}>
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/5 rounded-full blur-3xl" />

        {/* Header */}
        <div className="flex items-start justify-between mb-4 relative">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary-400/80 font-medium mb-1">
              Last Active Deal
            </p>
            <h3 className="text-lg font-semibold text-surface-100 group-hover:text-primary-300 transition-colors">
              {deal.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20">
                {deal.assetType}
              </span>
              <span className="text-xs text-surface-500">{timeAgo(deal.updatedAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-primary-400 bg-primary-500/10 px-3 py-1.5 rounded-lg border border-primary-500/20 group-hover:bg-primary-500/20 transition-colors">
            Resume
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Stage Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-surface-400">Stage: <span className="text-surface-200 font-medium">{stageInfo.label}</span></span>
            <span className="text-surface-500">{stageInfo.position}/6</span>
          </div>
          <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            {Object.entries(STAGE_LABELS).map(([key, stage]) => (
              <div
                key={key}
                className={cn(
                  'w-2 h-2 rounded-full transition-colors',
                  stage.position <= stageInfo.position
                    ? 'bg-primary-400'
                    : 'bg-surface-700'
                )}
              />
            ))}
          </div>
        </div>

        {/* Metrics Row */}
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5 text-surface-400">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-surface-200">{formatCurrency(deal.askingPrice)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-surface-400">
            <BedDouble className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-surface-200">{deal.totalBeds || '—'} beds</span>
          </div>
          <div className="flex items-center gap-1.5 text-surface-400">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-semibold text-surface-200 capitalize">{deal.status?.replace('_', ' ') || 'New'}</span>
          </div>
        </div>

        {/* AI Quote */}
        <div className="mt-4 pt-3 border-t border-surface-700/50">
          <div className="flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-primary-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-surface-400 italic leading-relaxed">
              "Continue with {stageInfo.label.toLowerCase()} stage — {
                stageInfo.position <= 2
                  ? 'document analysis and financial normalization are next.'
                  : stageInfo.position <= 4
                    ? 'operational data and risk factors need review.'
                    : 'valuation inputs are ready for final synthesis.'
              }"
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
