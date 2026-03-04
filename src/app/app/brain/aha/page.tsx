'use client';

import { useEffect, useState } from 'react';
import { Lightbulb, Loader2, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AhaMoment {
  id: string;
  dealId: string | null;
  dealName: string | null;
  title: string;
  insight: string;
  newoPosition: string | null;
  devPosition: string | null;
  resolution: string | null;
  category: string;
  significance: string;
  confidence: number | null;
  tags: string[];
  createdAt: string;
}

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  valuation: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
  risk: { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  operations: { bg: 'bg-teal-50 dark:bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
  strategy: { bg: 'bg-orange-50 dark:bg-orange-500/10', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  market: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  regulatory: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
  general: { bg: 'bg-surface-50 dark:bg-surface-800', text: 'text-surface-600 dark:text-surface-400', border: 'border-surface-200 dark:border-surface-700' },
};

const SIGNIFICANCE_GLOW: Record<string, string> = {
  high: 'shadow-[0_0_20px_rgba(251,191,36,0.15)]',
  medium: '',
  low: 'opacity-80',
};

export default function AhaPage() {
  const [moments, setMoments] = useState<AhaMoment[]>([]);
  const [loading, setLoading] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    loadMoments();
  }, []);

  const loadMoments = async () => {
    try {
      const r = await fetch('/api/aha');
      const data = await r.json();
      setMoments(Array.isArray(data) ? data : []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const extractMoments = async () => {
    setExtracting(true);
    try {
      await fetch('/api/aha/extract', { method: 'POST' });
      await loadMoments();
    } catch { /* empty */ }
    setExtracting(false);
  };

  const categories = [...new Set(moments.map(m => m.category))];
  const filtered = filter ? moments.filter(m => m.category === filter) : moments;
  const highCount = moments.filter(m => m.significance === 'high').length;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-col sm:flex-row gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-amber-500" />
            AHA Moments
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            Breakthrough insights born from Newo + Dev debating deals
            {moments.length > 0 && (
              <span className="ml-1">
                — <span className="text-amber-500 font-medium">{moments.length} discoveries</span>
                {highCount > 0 && <span className="text-red-400 font-medium">, {highCount} high-significance</span>}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={extractMoments}
          disabled={extracting}
          className="px-4 py-2 neu-button-primary rounded-xl text-xs font-medium flex items-center gap-2"
        >
          {extracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {extracting ? 'Extracting...' : 'Extract from Analyses'}
        </button>
      </div>

      {/* Category filters */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter(null)}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              !filter ? 'bg-surface-800 text-white dark:bg-surface-200 dark:text-surface-900' : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400 hover:bg-surface-200'
            )}
          >
            All ({moments.length})
          </button>
          {categories.map(cat => {
            const style = CATEGORY_STYLES[cat] || CATEGORY_STYLES.general;
            const cnt = moments.filter(m => m.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? null : cat)}
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-medium transition-colors',
                  filter === cat ? `${style.bg} ${style.text} ring-1 ${style.border}` : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400 hover:bg-surface-200'
                )}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)} ({cnt})
              </button>
            );
          })}
        </div>
      )}

      {/* Moments */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 shimmer-warm rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="w-10 h-10 mx-auto mb-3 text-amber-300 opacity-40" />
          <p className="text-sm text-surface-500">No AHA moments yet</p>
          <p className="text-xs text-surface-400 mt-1 max-w-md mx-auto">
            Run dual-brain analysis on deals, then click &quot;Extract from Analyses&quot; to mine breakthrough insights from where Newo and Dev disagreed
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(moment => {
            const style = CATEGORY_STYLES[moment.category] || CATEGORY_STYLES.general;
            const isExpanded = expanded === moment.id;
            const glow = SIGNIFICANCE_GLOW[moment.significance] || '';

            return (
              <div
                key={moment.id}
                className={cn(
                  'neu-card-warm overflow-hidden transition-all cursor-pointer hover-lift',
                  glow,
                  isExpanded && 'ring-1 ring-amber-300/50'
                )}
                onClick={() => setExpanded(isExpanded ? null : moment.id)}
              >
                {/* Significance bar */}
                <div className={cn(
                  'h-1',
                  moment.significance === 'high' ? 'bg-gradient-to-r from-amber-400 to-orange-400' :
                  moment.significance === 'medium' ? 'bg-gradient-to-r from-primary-300 to-primary-400' :
                  'bg-surface-200 dark:bg-surface-700'
                )} />

                <div className="p-4 sm:p-5">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Lightbulb className={cn(
                        'w-5 h-5',
                        moment.significance === 'high' ? 'text-amber-500' :
                        moment.significance === 'medium' ? 'text-primary-500' :
                        'text-surface-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-surface-800 dark:text-surface-100">
                        {moment.title}
                      </h3>
                      <p className="text-xs text-surface-500 mt-1 leading-relaxed">
                        {moment.insight}
                      </p>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full', style.bg, style.text)}>
                          {moment.category}
                        </span>
                        {moment.dealName && (
                          <span className="text-[10px] text-surface-400">
                            from {moment.dealName}
                          </span>
                        )}
                        {moment.confidence && (
                          <span className="text-[10px] text-surface-400">
                            {moment.confidence}% confidence
                          </span>
                        )}
                        {moment.tags?.map((tag: string) => (
                          <span key={tag} className="text-[8px] px-1.5 py-0.5 rounded bg-surface-100 dark:bg-surface-800 text-surface-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <ArrowRight className={cn(
                      'w-4 h-4 text-surface-300 transition-transform shrink-0',
                      isExpanded && 'rotate-90'
                    )} />
                  </div>

                  {/* Expanded: Debate view */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#E2DFD8] dark:border-surface-700 space-y-3">
                      {/* Newo vs Dev debate */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {moment.newoPosition && (
                          <div className="rounded-lg bg-teal-50/50 dark:bg-teal-500/5 border border-teal-200/50 dark:border-teal-800/50 p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="w-2 h-2 rounded-full bg-teal-500" />
                              <span className="text-[10px] font-bold text-teal-600 dark:text-teal-400">Newo (Operations)</span>
                            </div>
                            <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                              {moment.newoPosition}
                            </p>
                          </div>
                        )}
                        {moment.devPosition && (
                          <div className="rounded-lg bg-orange-50/50 dark:bg-orange-500/5 border border-orange-200/50 dark:border-orange-800/50 p-3">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">Dev (Strategy)</span>
                            </div>
                            <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                              {moment.devPosition}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Resolution */}
                      {moment.resolution && (
                        <div className="rounded-lg bg-amber-50/50 dark:bg-amber-500/5 border border-amber-200/50 dark:border-amber-800/50 p-3">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Resolution</span>
                          </div>
                          <p className="text-xs text-surface-600 dark:text-surface-300 leading-relaxed">
                            {moment.resolution}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
