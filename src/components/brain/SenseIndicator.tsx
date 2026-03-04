'use client';

import { cn } from '@/lib/utils';

interface SenseInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
}

interface SenseIndicatorProps {
  senses: SenseInfo[];
  activeSenses?: string[];
  className?: string;
}

export function SenseIndicator({ senses, activeSenses = [], className }: SenseIndicatorProps) {
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-2 sm:gap-3', className)}>
      {senses.map((sense) => {
        const isActive = activeSenses.includes(sense.id);
        return (
          <div
            key={sense.id}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-all duration-300',
              isActive
                ? 'bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300/50'
                : 'bg-surface-100 dark:bg-surface-800 text-surface-400'
            )}
            title={sense.description}
          >
            <span className="text-base">{sense.icon}</span>
            <span className="font-medium">{sense.name}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );
}
