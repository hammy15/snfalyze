'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  DollarSign,
  BedDouble,
  Shield,
  Clock,
  ChevronDown,
} from 'lucide-react';

interface DealIdentityBarProps {
  dealId: string;
  name: string;
  assetType: string;
  askingPrice: number;
  totalBeds: number;
  stage: string;
  stageLabel: string;
  stagePosition: number;
  totalStages: number;
  score?: number;
  status: string;
}

function formatCurrency(value: number): string {
  if (!value) return 'TBD';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function DealIdentityBar({
  dealId,
  name,
  assetType,
  askingPrice,
  totalBeds,
  stage,
  stageLabel,
  stagePosition,
  totalStages,
  score,
  status,
}: DealIdentityBarProps) {
  const progress = (stagePosition / totalStages) * 100;

  return (
    <div className={cn(
      'flex items-center gap-4 px-4 py-2.5 rounded-xl',
      'bg-surface-900/80 backdrop-blur-sm border border-surface-800/50'
    )}>
      {/* Back */}
      <Link
        href="/app/deals"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-200 hover:bg-surface-800 transition-colors flex-shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
      </Link>

      {/* Deal Name + Type */}
      <div className="flex items-center gap-2 min-w-0">
        <h1 className="text-sm font-semibold text-surface-100 truncate">{name}</h1>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary-500/10 text-primary-400 border border-primary-500/20 flex-shrink-0">
          {assetType}
        </span>
      </div>

      {/* Stage Progress Ring */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-surface-700" />
            <circle
              cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5"
              className="text-primary-400"
              strokeDasharray={`${2 * Math.PI * 13}`}
              strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-surface-300">
            {stagePosition}/{totalStages}
          </span>
        </div>
        <span className="text-xs text-surface-400 hidden lg:block">{stageLabel}</span>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-surface-700 flex-shrink-0" />

      {/* Key Metrics */}
      <div className="flex items-center gap-4 text-xs flex-shrink-0">
        <div className="flex items-center gap-1 text-surface-400">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-surface-200">{formatCurrency(askingPrice)}</span>
        </div>
        <div className="flex items-center gap-1 text-surface-400">
          <BedDouble className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-medium text-surface-200">{totalBeds || '—'}</span>
        </div>
        {score !== undefined && score > 0 && (
          <div className="flex items-center gap-1 text-surface-400">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium text-surface-200">{score}</span>
          </div>
        )}
      </div>
    </div>
  );
}
