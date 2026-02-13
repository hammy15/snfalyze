'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ChevronRight,
  Command,
  Bell,
  Sparkles,
} from 'lucide-react';

interface BreadcrumbSegment {
  label: string;
  href: string;
}

const ROUTE_LABELS: Record<string, string> = {
  app: 'Home',
  macro: 'Portfolio Radar',
  deals: 'Deal Pipeline',
  facilities: 'Facilities',
  partners: 'Capital Partners',
  admin: 'Team Admin',
  repository: 'Repository',
  tools: 'Tools',
  settings: 'Settings',
  map: 'Map',
  'cap-rate': 'Cap Rate Calculator',
  irr: 'IRR Calculator',
  waterfall: 'Waterfall',
  sensitivity: 'Sensitivity',
  comps: 'Comparables',
};

// Deal stage labels for stage indicator
const DEAL_STAGES: Record<string, { label: string; color: string; position: number }> = {
  'document-review': { label: 'Doc Review', color: 'bg-blue-400', position: 1 },
  'financial-reconstruction': { label: 'Financial', color: 'bg-amber-400', position: 2 },
  'operational-analysis': { label: 'Operations', color: 'bg-orange-400', position: 3 },
  'risk-assessment': { label: 'Risk', color: 'bg-rose-400', position: 4 },
  'valuation': { label: 'Valuation', color: 'bg-primary-400', position: 5 },
  'synthesis': { label: 'Synthesis', color: 'bg-purple-400', position: 6 },
};

export function ContextBreadcrumb() {
  const pathname = usePathname();

  const segments = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean);
    const crumbs: BreadcrumbSegment[] = [];

    let currentPath = '';
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      currentPath += `/${part}`;

      // Skip the "app" prefix in display but include in href
      if (part === 'app' && i === 0) {
        crumbs.push({ label: 'SNFalyze', href: '/app' });
        continue;
      }

      // If it's a UUID-like ID (deal page), show as "Deal Details"
      if (part.length > 20 || /^[0-9a-f-]{20,}$/i.test(part)) {
        crumbs.push({ label: 'Deal Details', href: currentPath });
        continue;
      }

      const label = ROUTE_LABELS[part] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      crumbs.push({ label, href: currentPath });
    }

    return crumbs;
  }, [pathname]);

  // Determine if we're inside a deal (for stage indicator)
  const isDealPage = pathname.match(/\/app\/deals\/[^/]+/);

  return (
    <header
      className={cn(
        'fixed top-0 right-0 z-30 h-12 flex items-center justify-between',
        'bg-surface-950/80 backdrop-blur-xl border-b border-surface-800/50',
        'left-14' // Account for collapsed focus rail width
      )}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-1 px-4 min-w-0 flex-1">
        {segments.map((segment, index) => (
          <div key={segment.href} className="flex items-center gap-1 min-w-0">
            {index > 0 && (
              <ChevronRight className="w-3 h-3 text-surface-600 flex-shrink-0" />
            )}
            {index === segments.length - 1 ? (
              <span className="text-xs font-medium text-surface-200 truncate">
                {segment.label}
              </span>
            ) : (
              <Link
                href={segment.href}
                className="text-xs text-surface-500 hover:text-surface-300 transition-colors truncate"
              >
                {segment.label}
              </Link>
            )}
          </div>
        ))}

        {/* Stage dots for deal pages */}
        {isDealPage && (
          <div className="flex items-center gap-1 ml-4 pl-4 border-l border-surface-800">
            {Object.entries(DEAL_STAGES).map(([key, stage]) => (
              <div
                key={key}
                className="group relative"
              >
                <div className={cn(
                  'w-2 h-2 rounded-full transition-all',
                  stage.color,
                  'opacity-30 group-hover:opacity-100'
                )} />
                <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 bg-surface-800 text-surface-200 text-[10px] rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 shadow-lg">
                  {stage.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 px-4">
        {/* Cmd+K trigger */}
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent('keydown', {
              key: 'k',
              metaKey: true,
              bubbles: true,
            }));
          }}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg',
            'bg-surface-800/50 hover:bg-surface-800 text-surface-500 hover:text-surface-300',
            'transition-colors text-xs border border-surface-700/50'
          )}
        >
          <Command className="w-3 h-3" />
          <span>K</span>
        </button>

        {/* AI status */}
        <button
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'text-primary-400/60 hover:text-primary-400 hover:bg-primary-500/10',
            'transition-colors relative'
          )}
        >
          <Sparkles className="w-4 h-4" />
          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-soft" />
        </button>

        {/* Notifications */}
        <button
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            'text-surface-500 hover:text-surface-300 hover:bg-surface-800/50',
            'transition-colors relative'
          )}
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
