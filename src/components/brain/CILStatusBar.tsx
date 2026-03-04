'use client';

import { Brain, Database, Target, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CILStatusBarProps {
  knowledgeFileCount: number;
  dealsAnalyzed: number;
  dealsLearned: number;
  avgConfidence: number;
  ipoProgress: { currentOps: number; targetOps: number };
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
  const stats = [
    {
      icon: Database,
      label: 'Knowledge Files',
      value: knowledgeFileCount.toLocaleString(),
      color: 'text-blue-500',
    },
    {
      icon: Target,
      label: 'Deals Analyzed',
      value: dealsAnalyzed.toLocaleString(),
      color: 'text-primary-500',
    },
    {
      icon: Brain,
      label: 'Deals Learned',
      value: dealsLearned.toLocaleString(),
      color: 'text-purple-500',
    },
    {
      icon: Zap,
      label: 'Avg Confidence',
      value: `${avgConfidence}%`,
      color: avgConfidence >= 70 ? 'text-emerald-500' : avgConfidence >= 40 ? 'text-amber-500' : 'text-red-500',
    },
    {
      icon: TrendingUp,
      label: 'IPO Progress',
      value: `${ipoProgress.currentOps} / ${ipoProgress.targetOps}`,
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
