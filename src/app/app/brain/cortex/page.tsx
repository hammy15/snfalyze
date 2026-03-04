'use client';

import { useState } from 'react';
import { Database, Search, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KnowledgeFile {
  filename: string;
  content: string;
  topics: string[];
  relevanceScore: number;
}

const TOPIC_CATEGORIES = [
  { key: 'regulatory', label: 'Regulatory', color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400' },
  { key: 'market', label: 'Market', color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
  { key: 'operational', label: 'Operational', color: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400' },
  { key: 'financial', label: 'Financial', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  { key: 'reimbursement', label: 'Reimbursement', color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400' },
  { key: 'transactions', label: 'Transactions', color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400' },
  { key: 'benchmarks', label: 'Benchmarks', color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
];

function RelevanceBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <span className={cn(
      'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
      pct >= 80 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
      pct >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
      'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
    )}>
      {pct}%
    </span>
  );
}

export default function CortexPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<KnowledgeFile[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<KnowledgeFile | null>(null);
  const [totalFiles, setTotalFiles] = useState<number | null>(null);

  const doSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;
    if (searchQuery) setQuery(searchQuery);
    setSearching(true);
    try {
      const r = await fetch(`/api/knowledge/search?q=${encodeURIComponent(q)}`);
      const data = await r.json();
      const files = (data.files || []).sort((a: KnowledgeFile, b: KnowledgeFile) =>
        (b.relevanceScore || 0) - (a.relevanceScore || 0)
      );
      setResults(files);
      if (data.totalFiles) setTotalFiles(data.totalFiles);
    } catch {
      setResults([]);
    }
    setSearching(false);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
          <Database className="w-6 h-6 text-primary-500" />
          Knowledge Cortex
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Browse and search Cascadia&apos;s institutional intelligence — what Newo and Dev know
          {totalFiles && <span className="ml-1 text-primary-500 font-medium">({totalFiles} files)</span>}
        </p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
            placeholder="Search knowledge base... (e.g., 'Idaho staffing', 'cap rate benchmarks')"
            className="w-full neu-input pl-10 pr-4 py-2.5 text-sm"
          />
        </div>
        <button
          onClick={() => doSearch()}
          disabled={searching}
          className="px-5 py-2.5 neu-button-primary rounded-xl text-sm font-medium"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Topic tags */}
      <div className="flex flex-wrap gap-2">
        {TOPIC_CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => doSearch(cat.key)}
            className={cn('px-3 py-1 rounded-full text-xs font-medium', cat.color)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Two-column: File Brain Split */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Newo's Domain */}
        <div className="neu-card-warm p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <h2 className="text-sm font-bold text-teal-700 dark:text-teal-400">What Newo Knows</h2>
          </div>
          <p className="text-xs text-surface-400 mb-3">
            Operations: staffing, quality, reimbursement, clinical, regulatory
          </p>
          <div className="space-y-1">
            {['staffing', 'quality', 'pdpm', 'reimbursement', 'operational', 'clinical'].map((topic) => (
              <button
                key={topic}
                onClick={() => doSearch(topic)}
                className="block w-full text-left px-3 py-2 rounded-lg text-xs text-surface-600 hover:bg-teal-50 dark:hover:bg-teal-500/5 transition-colors"
              >
                <FileText className="w-3 h-3 inline mr-2 text-teal-400" />
                {topic.charAt(0).toUpperCase() + topic.slice(1)} intelligence
              </button>
            ))}
          </div>
        </div>

        {/* Dev's Domain */}
        <div className="neu-card-warm p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <h2 className="text-sm font-bold text-orange-700 dark:text-orange-400">What Dev Knows</h2>
          </div>
          <p className="text-xs text-surface-400 mb-3">
            Strategy: transactions, buyers, market comps, valuations, deal intelligence
          </p>
          <div className="space-y-1">
            {['transactions', 'buyers', 'market', 'valuations', 'deal-intelligence', 'ipo'].map((topic) => (
              <button
                key={topic}
                onClick={() => doSearch(topic)}
                className="block w-full text-left px-3 py-2 rounded-lg text-xs text-surface-600 hover:bg-orange-50 dark:hover:bg-orange-500/5 transition-colors"
              >
                <FileText className="w-3 h-3 inline mr-2 text-orange-400" />
                {topic.charAt(0).toUpperCase() + topic.slice(1).replace(/-/g, ' ')} intelligence
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search Results with Relevance Scores */}
      {results.length > 0 && (
        <div className="neu-card-warm p-4 space-y-2">
          <h2 className="text-sm font-bold text-surface-700 dark:text-surface-200">
            Results ({results.length})
          </h2>
          {results.map((file, i) => (
            <button
              key={i}
              onClick={() => setSelected(file)}
              className={cn(
                'block w-full text-left p-3 rounded-lg transition-colors',
                selected?.filename === file.filename
                  ? 'bg-primary-50 dark:bg-primary-500/10 border border-primary-200/50'
                  : 'hover:bg-[#EFEDE8] dark:hover:bg-surface-800/50'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-surface-700 dark:text-surface-200">
                  {file.filename}
                </div>
                {file.relevanceScore > 0 && <RelevanceBadge score={file.relevanceScore} />}
              </div>
              <div className="text-[10px] text-surface-400 mt-1 line-clamp-2">
                {file.content.slice(0, 200)}
              </div>
              {file.topics?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {file.topics.slice(0, 4).map((t) => (
                    <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-surface-100 dark:bg-surface-800 text-surface-500">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Preview */}
      {selected && (
        <div className="neu-card-warm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-bold text-surface-700 dark:text-surface-200">
                {selected.filename}
              </h2>
              {selected.relevanceScore > 0 && <RelevanceBadge score={selected.relevanceScore} />}
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-surface-400 hover:text-surface-600"
            >
              Close
            </button>
          </div>
          <pre className="text-xs text-surface-600 dark:text-surface-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
            {selected.content.slice(0, 3000)}
          </pre>
        </div>
      )}
    </div>
  );
}
