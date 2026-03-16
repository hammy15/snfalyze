'use client';

import { Brain, Database, Target, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CILStatusBarProps {
  knowledgeFileCount?: number | null;
  dealsAnalyzed?: number | null;
  dealsLearned?: number | null;
  avgConfidence?: number | null;
  ipoProgress?: { currentOps: number; targetOps: number } | null;
  className?: string;
}

export function CILStatusBar({
  knowledgeFileCount,
  dealsAnalyzed,
  dealsLearned,
  avgConfidence,
  ipoProgress,
  className,
}: CILStatusBarProps) {
  const kf = knowledgeFileCount ?? 0;
  const da = dealsAnalyzed ?? 0;
  const dl = dealsLearned ?? 0;
  const ac = avgConfidence ?? 0;
  const ipo = ipoProgress ?? { currentOps: 0, targetOps: 130 };

  const stats = [
    {
      icon: Database,
      label: 'Knowledge Files',
      value: kf.toLocaleString(),
      color: 'text-blue-500',
    },
    {
      icon: Target,
      label: 'Deals Analyzed',
      value: da.toLocaleString(),
      color: 'text-primary-500',
    },
    {
      icon: Brain,
      label: 'Deals Learned',
      value: dl.toLocaleString(),
      color: 'text-purple-500',
    },
    {
      icon: Zap,
      label: 'Avg Confidence',
      value: `${ac}%`,
      color: ac >= 70 ? 'text-emerald-500' : ac >= 40 ? 'text-amber-500' : 'text-red-500',
    },
    {
      icon: TrendingUp,
      label: 'IPO Progress',
      value: `${ipo.currentOps} / ${ipo.targetOps}`,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-5 gap-3', className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="neu-card-warm px-4 py-3 flex items-center gap-3"
        >
          <stat.icon className={cn('w-5 h-5 shrink-0', stat.color)} />
          <div className="min-w-0">
            <div className="text-lg font-bold text-surface-800 dark:text-surface-100 truncate">
              {stat.value}
            </div>
            <div className="text-[10px] text-surface-400 truncate">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
