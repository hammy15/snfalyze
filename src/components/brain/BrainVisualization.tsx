'use client';

import { BrainOrb } from './BrainOrb';

interface BrainVisualizationProps {
  newoStatus: 'online' | 'degraded' | 'offline';
  devStatus: 'online' | 'degraded' | 'offline';
  newoActive?: boolean;
  devActive?: boolean;
  newoInsight?: string;
  devInsight?: string;
  compact?: boolean;
}

export function BrainVisualization({
  newoStatus,
  devStatus,
  newoActive = false,
  devActive = false,
  newoInsight,
  devInsight,
  compact = false,
}: BrainVisualizationProps) {
  const size = compact ? 'md' : 'lg';

  return (
    <div className="flex flex-col items-center">
      {/* Brain pair with CIL arc */}
      <div className="relative flex items-center gap-12">
        {/* Newo — Left Brain */}
        <BrainOrb id="newo" status={newoStatus} pulsing={newoActive} size={size} />

        {/* CIL Arc connecting the brains */}
        <svg
          className="absolute left-1/2 top-0 -translate-x-1/2"
          width={compact ? '80' : '120'}
          height={compact ? '24' : '36'}
          viewBox="0 0 120 36"
        >
          <path
            d="M 10 30 Q 60 -10 110 30"
            fill="none"
            stroke="url(#cilGradient)"
            strokeWidth="2"
            strokeDasharray={newoStatus === 'offline' || devStatus === 'offline' ? '4 4' : 'none'}
            className="transition-all duration-500"
            opacity={newoStatus === 'offline' && devStatus === 'offline' ? 0.2 : 0.6}
          />
          <defs>
            <linearGradient id="cilGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#a3a3a3" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
        </svg>

        {/* CIL Label */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-1">
          <span className="text-[10px] font-medium text-surface-400 tracking-widest uppercase">
            CIL
          </span>
        </div>

        {/* Dev — Right Brain */}
        <BrainOrb id="dev" status={devStatus} pulsing={devActive} size={size} />
      </div>

      {/* Latest insights from each brain */}
      {!compact && (newoInsight || devInsight) && (
        <div className="mt-6 grid grid-cols-2 gap-6 w-full max-w-lg">
          {newoInsight && (
            <div className="text-xs text-surface-500 bg-teal-50 dark:bg-teal-500/5 border border-teal-200/50 dark:border-teal-500/10 rounded-lg p-3">
              <span className="font-medium text-teal-600 dark:text-teal-400">Newo:</span>{' '}
              {newoInsight}
            </div>
          )}
          {devInsight && (
            <div className="text-xs text-surface-500 bg-orange-50 dark:bg-orange-500/5 border border-orange-200/50 dark:border-orange-500/10 rounded-lg p-3">
              <span className="font-medium text-orange-600 dark:text-orange-400">Dev:</span>{' '}
              {devInsight}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
