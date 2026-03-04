'use client';

import { cn } from '@/lib/utils';

interface BrainOrbProps {
  id: 'newo' | 'dev';
  status: 'online' | 'degraded' | 'offline';
  pulsing?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const ORB_CONFIG = {
  newo: {
    label: 'Newo',
    subtitle: 'Operations',
    color: '#14b8a6',
    bgClass: 'bg-teal-500',
    glowClass: 'shadow-[0_0_20px_rgba(20,184,166,0.4)]',
    ringClass: 'ring-teal-400/30',
    textClass: 'text-teal-600 dark:text-teal-400',
  },
  dev: {
    label: 'Dev',
    subtitle: 'Strategy',
    color: '#f97316',
    bgClass: 'bg-orange-500',
    glowClass: 'shadow-[0_0_20px_rgba(249,115,22,0.4)]',
    ringClass: 'ring-orange-400/30',
    textClass: 'text-orange-600 dark:text-orange-400',
  },
};

const SIZES = {
  sm: { orb: 'w-8 h-8', ring: 'w-12 h-12', text: 'text-[10px]' },
  md: { orb: 'w-14 h-14', ring: 'w-20 h-20', text: 'text-xs' },
  lg: { orb: 'w-20 h-20', ring: 'w-28 h-28', text: 'text-sm' },
};

export function BrainOrb({ id, status, pulsing = false, size = 'md', className }: BrainOrbProps) {
  const config = ORB_CONFIG[id];
  const sizeConfig = SIZES[size];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      {/* Orb Container */}
      <div className="relative flex items-center justify-center">
        {/* Outer ring — pulses when active */}
        <div
          className={cn(
            'absolute rounded-full ring-2 transition-all duration-500',
            sizeConfig.ring,
            config.ringClass,
            pulsing && 'animate-ping opacity-20',
            status === 'offline' && 'opacity-0'
          )}
        />

        {/* Inner orb */}
        <div
          className={cn(
            'relative rounded-full transition-all duration-300',
            sizeConfig.orb,
            config.bgClass,
            status === 'online' && config.glowClass,
            status === 'degraded' && 'opacity-60',
            status === 'offline' && 'opacity-20 grayscale',
            pulsing && status === 'online' && 'animate-pulse',
          )}
        >
          {/* Status indicator dot */}
          <div
            className={cn(
              'absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-surface-900',
              status === 'online' && 'bg-emerald-400',
              status === 'degraded' && 'bg-amber-400 animate-pulse',
              status === 'offline' && 'bg-red-400',
            )}
          />
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <div className={cn('font-semibold', sizeConfig.text, config.textClass)}>
          {config.label}
        </div>
        {size !== 'sm' && (
          <div className="text-[10px] text-surface-400">{config.subtitle}</div>
        )}
      </div>
    </div>
  );
}
