'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  BarChart3,
  Upload,
  ArrowRight,
  Zap,
} from 'lucide-react';

interface Suggestion {
  title: string;
  detail: string;
  action: string;
  href: string;
  icon: string;
}

interface SuggestedActionsProps {
  suggestions: Suggestion[];
}

const ICON_MAP: Record<string, typeof Sparkles> = {
  sparkles: Sparkles,
  'bar-chart': BarChart3,
  upload: Upload,
  zap: Zap,
};

const ICON_COLORS: Record<string, string> = {
  sparkles: 'from-primary-500 to-primary-600',
  'bar-chart': 'from-blue-500 to-blue-600',
  upload: 'from-accent-500 to-accent-600',
  zap: 'from-amber-500 to-amber-600',
};

export function SuggestedActions({ suggestions }: SuggestedActionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="w-3.5 h-3.5 text-amber-400" />
        <h3 className="text-sm font-medium text-surface-300">AI Suggested Actions</h3>
      </div>

      <div className="grid gap-2">
        {suggestions.slice(0, 3).map((suggestion, index) => {
          const Icon = ICON_MAP[suggestion.icon] || Sparkles;
          const gradient = ICON_COLORS[suggestion.icon] || 'from-primary-500 to-primary-600';

          return (
            <Link key={index} href={suggestion.href}>
              <div className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'bg-surface-800/50 border border-surface-700/50',
                'hover:border-surface-600 hover:bg-surface-800 transition-all group cursor-pointer'
              )}>
                <div className={cn(
                  'w-8 h-8 rounded-lg bg-gradient-to-br flex items-center justify-center flex-shrink-0',
                  gradient
                )}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">{suggestion.title}</p>
                  <p className="text-xs text-surface-500">{suggestion.detail}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {suggestion.action}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
