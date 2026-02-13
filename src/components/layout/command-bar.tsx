'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Search,
  Sparkles,
  Crosshair,
  Building2,
  Calculator,
  FileText,
  ArrowRight,
  Command,
  Loader2,
  X,
  Zap,
  TrendingUp,
  DollarSign,
  BarChart3,
  Users,
  MapPin,
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'deal' | 'facility' | 'tool' | 'page' | 'ai';
  title: string;
  subtitle?: string;
  icon: typeof Search;
  href?: string;
  action?: () => void;
}

const TOOLS: SearchResult[] = [
  { id: 'tool-caprate', type: 'tool', title: 'Cap Rate Calculator', subtitle: 'Calculate capitalization rates', icon: Calculator, href: '/app/tools/cap-rate' },
  { id: 'tool-irr', type: 'tool', title: 'IRR Calculator', subtitle: 'Internal rate of return', icon: TrendingUp, href: '/app/tools/irr' },
  { id: 'tool-waterfall', type: 'tool', title: 'Waterfall Calculator', subtitle: 'Distribution waterfall', icon: DollarSign, href: '/app/tools/waterfall' },
  { id: 'tool-sensitivity', type: 'tool', title: 'Sensitivity Analysis', subtitle: 'Multi-variable stress testing', icon: BarChart3, href: '/app/tools/sensitivity' },
  { id: 'tool-comps', type: 'tool', title: 'Market Comparables', subtitle: 'Comparable transaction analysis', icon: Building2, href: '/app/tools/comps' },
];

const PAGES: SearchResult[] = [
  { id: 'page-macro', type: 'page', title: 'Portfolio Radar', subtitle: 'Macro analytics & map view', icon: MapPin, href: '/app/macro' },
  { id: 'page-deals', type: 'page', title: 'Deal Pipeline', subtitle: 'Active deals & pipeline', icon: Crosshair, href: '/app/deals' },
  { id: 'page-facilities', type: 'page', title: 'Facilities', subtitle: 'Facility database', icon: Building2, href: '/app/facilities' },
  { id: 'page-partners', type: 'page', title: 'Capital Partners', subtitle: 'LP/partner management', icon: Users, href: '/app/partners' },
  { id: 'page-repo', type: 'page', title: 'Document Repository', subtitle: 'Files & deal workspaces', icon: FileText, href: '/app/repository' },
];

const TYPE_LABELS: Record<string, string> = {
  ai: 'AI',
  deal: 'Deal',
  facility: 'Facility',
  tool: 'Tool',
  page: 'Navigate',
};

const TYPE_COLORS: Record<string, string> = {
  ai: 'text-purple-400 bg-purple-500/10',
  deal: 'text-primary-400 bg-primary-500/10',
  facility: 'text-blue-400 bg-blue-500/10',
  tool: 'text-amber-400 bg-amber-500/10',
  page: 'text-surface-400 bg-surface-500/10',
};

export function CommandBar() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Search logic
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    const lower = q.toLowerCase();
    const matched: SearchResult[] = [];

    // Search static tools & pages
    for (const item of [...TOOLS, ...PAGES]) {
      if (item.title.toLowerCase().includes(lower) || item.subtitle?.toLowerCase().includes(lower)) {
        matched.push(item);
      }
    }

    // Search deals from API (with client-side filter since API may not filter)
    setLoading(true);
    try {
      const res = await fetch(`/api/deals?limit=50`);
      const data = await res.json();
      const deals = (data.data || [])
        .filter((d: any) => d.name?.toLowerCase().includes(lower) || d.location?.toLowerCase().includes(lower))
        .slice(0, 5);
      for (const deal of deals) {
        matched.push({
          id: `deal-${deal.id}`,
          type: 'deal',
          title: deal.name,
          subtitle: `${deal.stage || 'Pipeline'} · ${deal.location || 'Unknown'}`,
          icon: Crosshair,
          href: `/app/deals/${deal.id}`,
        });
      }
    } catch {
      // silently fail
    }

    // Search facilities (with client-side filter)
    try {
      const res = await fetch(`/api/facilities?limit=100`);
      const data = await res.json();
      const facilities = (data.data || data.facilities || [])
        .filter((f: any) => f.name?.toLowerCase().includes(lower) || f.city?.toLowerCase().includes(lower) || f.state?.toLowerCase().includes(lower))
        .slice(0, 5);
      for (const f of facilities) {
        matched.push({
          id: `facility-${f.id}`,
          type: 'facility',
          title: f.name,
          subtitle: `${f.city || ''}, ${f.state || ''} · ${f.type || 'SNF'}`,
          icon: Building2,
          href: `/app/facilities/${f.id}`,
        });
      }
    } catch {
      // silently fail
    }

    // AI intent — always offer as last option
    matched.push({
      id: 'ai-query',
      type: 'ai',
      title: `Ask AI: "${q}"`,
      subtitle: 'Get AI-powered insights',
      icon: Sparkles,
      action: () => {
        // Navigate to deals with AI query — could be enhanced to open AI advisor
        router.push(`/app/deals?ai=${encodeURIComponent(q)}`);
      },
    });

    setLoading(false);
    setResults(matched);
    setSelectedIndex(0);
  }, [router]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => search(query), 200);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      executeResult(results[selectedIndex]);
    }
  };

  const executeResult = (result: SearchResult) => {
    setOpen(false);
    if (result.action) {
      result.action();
    } else if (result.href) {
      router.push(result.href);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Command Bar */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
        <div
          className={cn(
            'w-full max-w-xl pointer-events-auto animate-scale-in',
            'bg-surface-900/95 backdrop-blur-xl border border-surface-700/50 rounded-2xl shadow-2xl overflow-hidden',
          )}
        >
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-800">
            {loading ? (
              <Loader2 className="w-5 h-5 text-primary-400 animate-spin flex-shrink-0" />
            ) : (
              <Search className="w-5 h-5 text-surface-500 flex-shrink-0" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search deals, facilities, tools, or ask AI..."
              className="flex-1 bg-transparent text-surface-100 placeholder:text-surface-500 text-sm outline-none"
            />
            <div className="flex items-center gap-1.5 text-surface-600">
              <kbd className="px-1.5 py-0.5 bg-surface-800 rounded text-[10px] font-mono">ESC</kbd>
            </div>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div className="max-h-80 overflow-y-auto py-2">
              {results.map((result, index) => {
                const Icon = result.icon;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={result.id}
                    onClick={() => executeResult(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors',
                      isSelected
                        ? 'bg-surface-800/80 text-surface-100'
                        : 'text-surface-400 hover:bg-surface-800/40'
                    )}
                  >
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      TYPE_COLORS[result.type]
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{result.title}</div>
                      {result.subtitle && (
                        <div className="text-xs text-surface-500 truncate">{result.subtitle}</div>
                      )}
                    </div>
                    <span className={cn(
                      'text-[10px] font-medium px-1.5 py-0.5 rounded-full uppercase tracking-wider',
                      TYPE_COLORS[result.type]
                    )}>
                      {TYPE_LABELS[result.type]}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-surface-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Empty state */}
          {query && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center">
              <Sparkles className="w-8 h-8 text-surface-600 mx-auto mb-2" />
              <p className="text-sm text-surface-500">No results found</p>
              <p className="text-xs text-surface-600 mt-1">Try a different search term</p>
            </div>
          )}

          {/* Quick actions when empty */}
          {!query && (
            <div className="px-4 py-3">
              <p className="text-[10px] uppercase tracking-wider text-surface-600 mb-2">Quick Actions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'New Deal', icon: Crosshair, href: '/app/deals' },
                  { label: 'Portfolio Radar', icon: MapPin, href: '/app/macro' },
                  { label: 'Cap Rate Calc', icon: Calculator, href: '/app/tools/cap-rate' },
                  { label: 'Documents', icon: FileText, href: '/app/repository' },
                ].map(action => (
                  <button
                    key={action.label}
                    onClick={() => { setOpen(false); router.push(action.href); }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-400 hover:text-surface-200 hover:bg-surface-800/50 transition-colors text-xs"
                  >
                    <action.icon className="w-3.5 h-3.5" />
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-surface-800 text-[10px] text-surface-600">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-surface-800 rounded font-mono">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-surface-800 rounded font-mono">↵</kbd> select
              </span>
            </div>
            <div className="flex items-center gap-1 text-primary-500/60">
              <Zap className="w-3 h-3" />
              <span>AI-powered</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
