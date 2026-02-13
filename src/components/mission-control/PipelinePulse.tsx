'use client';

import { cn } from '@/lib/utils';
import Link from 'next/link';

interface PipelineStage {
  stage: string;
  label: string;
  count: number;
  value: number;
  color: string;
}

interface PipelinePulseProps {
  stages: PipelineStage[];
  totalDeals: number;
  totalValue: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export function PipelinePulse({ stages, totalDeals, totalValue }: PipelinePulseProps) {
  const activeStages = stages.filter(s => s.count > 0);
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-surface-300">Pipeline Pulse</h3>
          <p className="text-xs text-surface-500 mt-0.5">
            {totalDeals} deal{totalDeals !== 1 ? 's' : ''} · {formatCurrency(totalValue)} total
          </p>
        </div>
        <Link
          href="/app/deals"
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          View all
        </Link>
      </div>

      {/* Horizontal Stacked Bar */}
      <div className="h-8 rounded-xl overflow-hidden flex bg-surface-800 border border-surface-700/50">
        {stages.map((stage) => {
          if (stage.count === 0) return null;
          const pct = (stage.count / totalDeals) * 100;
          return (
            <Link
              key={stage.stage}
              href={`/app/deals?status=${stage.stage}`}
              className="relative group h-full transition-opacity hover:opacity-80"
              style={{
                width: `${Math.max(pct, 8)}%`,
                backgroundColor: stage.color,
              }}
            >
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-surface-800 border border-surface-700 text-surface-200 text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-xl">
                <span className="font-semibold">{stage.label}</span>: {stage.count} deal{stage.count !== 1 ? 's' : ''}
                {stage.value > 0 && ` · ${formatCurrency(stage.value)}`}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {stages.map((stage) => (
          <div key={stage.stage} className="flex items-center gap-1.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-[10px] text-surface-500">
              {stage.label}
              {stage.count > 0 && (
                <span className="text-surface-300 font-medium ml-1">{stage.count}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
