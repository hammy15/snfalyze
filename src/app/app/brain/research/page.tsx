'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Plus, ExternalLink, Download, Clock, CheckCircle2, XCircle, Loader2, Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResearchMission {
  id: string;
  topic: string;
  context: { state?: string; assetType?: string; target?: string } | null;
  status: 'queued' | 'researching' | 'complete' | 'failed';
  findings: string | null;
  sources: Array<{ url: string; title: string }>;
  importedToKnowledge: boolean;
  createdAt: string;
  completedAt: string | null;
}

const STATUS_CONFIG = {
  queued: { icon: Clock, color: 'text-surface-400', label: 'Queued' },
  researching: { icon: Loader2, color: 'text-blue-500 animate-spin', label: 'Researching' },
  complete: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Complete' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Failed' },
};

interface PipelineDeal {
  primaryState: string;
  assetType: string;
  name: string;
  thesis: string | null;
  specialCircumstances: string | null;
  beds: number;
  status: string;
}

interface Suggestion {
  topic: string;
  source: string; // 'pipeline' | 'deal-specific'
  dealName?: string;
}

function generateSuggestions(deals: PipelineDeal[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const states = [...new Set(deals.map((d) => d.primaryState).filter(Boolean))];
  const types = [...new Set(deals.map((d) => d.assetType).filter(Boolean))];

  // State-level suggestions
  states.forEach((st) => {
    suggestions.push({ topic: `${st} Medicaid rate trends 2026`, source: 'pipeline' });
    suggestions.push({ topic: `${st} SNF staffing pool depth and wage analysis`, source: 'pipeline' });
    suggestions.push({ topic: `${st} Certificate of Need requirements`, source: 'pipeline' });
  });
  types.forEach((t) => {
    suggestions.push({ topic: `${t} national cap rate benchmarks Q1 2026`, source: 'pipeline' });
  });
  if (states.length > 0) {
    suggestions.push({ topic: `${states[0]} survey body enforcement patterns`, source: 'pipeline' });
  }

  // Deal-specific suggestions from thesis and special circumstances
  deals.forEach((deal) => {
    if (deal.thesis) {
      // Extract keywords from thesis for targeted research
      const thesis = deal.thesis.toLowerCase();
      if (thesis.includes('vent') || thesis.includes('respiratory')) {
        suggestions.push({
          topic: `${deal.primaryState || ''} ventilator/respiratory reimbursement rates and regulations`.trim(),
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
      if (thesis.includes('memory care') || thesis.includes('alzheimer') || thesis.includes('dementia')) {
        suggestions.push({
          topic: `${deal.primaryState || ''} memory care unit licensing and staffing requirements`.trim(),
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
      if (thesis.includes('medicaid') || thesis.includes('managed care')) {
        suggestions.push({
          topic: `${deal.primaryState || ''} Medicaid managed care penetration and rate adequacy`.trim(),
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
      if (thesis.includes('turnaround') || thesis.includes('distressed')) {
        suggestions.push({
          topic: `${deal.primaryState || ''} distressed SNF acquisition playbook and regulatory timeline`.trim(),
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
      if (thesis.includes('campus') || thesis.includes('ccrc') || thesis.includes('continuum')) {
        suggestions.push({
          topic: `CCRC continuum of care market trends and conversion economics 2026`,
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
    }

    if (deal.specialCircumstances) {
      const special = deal.specialCircumstances.toLowerCase();
      if (special.includes('sff') || special.includes('special focus')) {
        suggestions.push({
          topic: `${deal.primaryState || ''} Special Focus Facility graduation timeline and acquisition discount`.trim(),
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
      if (special.includes('receivership') || special.includes('bankruptcy')) {
        suggestions.push({
          topic: `${deal.primaryState || ''} SNF receivership acquisition process and regulatory approval timeline`.trim(),
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
      if (special.includes('leaseback') || special.includes('sale-leaseback')) {
        suggestions.push({
          topic: `Healthcare sale-leaseback market terms and REIT buyer landscape 2026`,
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
      if (special.includes('competition') || special.includes('competing')) {
        suggestions.push({
          topic: `${deal.primaryState || ''} ${deal.assetType || 'SNF'} market competition and bed supply analysis`.trim(),
          source: 'deal-specific',
          dealName: deal.name,
        });
      }
    }

    // Generic deal-context research if deal has state + type
    if (deal.primaryState && deal.beds > 100) {
      suggestions.push({
        topic: `${deal.primaryState} large ${deal.assetType || 'SNF'} portfolio acquisition financing and lender appetite`,
        source: 'deal-specific',
        dealName: deal.name,
      });
    }
  });

  // Deduplicate by topic
  const seen = new Set<string>();
  return suggestions.filter((s) => {
    if (seen.has(s.topic)) return false;
    seen.add(s.topic);
    return true;
  }).slice(0, 16);
}

export default function ResearchPage() {
  const searchParams = useSearchParams();
  const [missions, setMissions] = useState<ResearchMission[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [topic, setTopic] = useState('');
  const [contextState, setContextState] = useState('');
  const [contextAssetType, setContextAssetType] = useState('');
  const [selectedMission, setSelectedMission] = useState<ResearchMission | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  // Pre-fill topic from URL params (e.g., from state map click)
  useEffect(() => {
    const urlTopic = searchParams.get('topic');
    if (urlTopic) setTopic(urlTopic);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      loadMissions(),
      fetch('/api/deals?limit=30')
        .then((r) => r.json())
        .then((data) => {
          const pipelineDeals = (data.data || []).filter((d: PipelineDeal) => d.primaryState);
          setSuggestions(generateSuggestions(pipelineDeals));
        })
        .catch(() => {}),
    ]);
  }, []);

  const loadMissions = async () => {
    try {
      const r = await fetch('/api/cil/research');
      const data = await r.json();
      setMissions(Array.isArray(data) ? data : []);
    } catch { /* empty */ }
    setLoading(false);
  };

  const createMission = async () => {
    if (!topic.trim()) return;
    setCreating(true);
    try {
      const context: Record<string, string> = {};
      if (contextState) context.state = contextState;
      if (contextAssetType) context.assetType = contextAssetType;

      await fetch('/api/cil/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, context: Object.keys(context).length > 0 ? context : undefined }),
      });
      setTopic('');
      setContextState('');
      setContextAssetType('');
      await loadMissions();
    } catch { /* empty */ }
    setCreating(false);
  };

  const importToKnowledge = async (missionId: string) => {
    setImporting(missionId);
    try {
      await fetch(`/api/cil/research/${missionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'import' }),
      });
      await loadMissions();
    } catch { /* empty */ }
    setImporting(null);
  };

  const pipelineSuggestions = suggestions.filter((s) => s.source === 'pipeline');
  const dealSuggestions = suggestions.filter((s) => s.source === 'deal-specific');

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
          <Search className="w-6 h-6 text-primary-500" />
          Research Agents
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          CIL dispatches research missions — findings get imported into Newo + Dev&apos;s knowledge
        </p>
      </div>

      {/* Create Mission */}
      <div className="neu-card-warm p-4 space-y-3">
        <h2 className="text-sm font-bold text-surface-700 dark:text-surface-200">New Research Mission</h2>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createMission()}
          placeholder="e.g., 'Idaho SNF market trends 2026' or 'Oregon staffing wage analysis'"
          className="w-full neu-input px-4 py-2.5 text-sm"
        />
        <div className="flex gap-3">
          <input
            type="text"
            value={contextState}
            onChange={(e) => setContextState(e.target.value)}
            placeholder="State (optional)"
            className="w-24 neu-input px-3 py-2 text-xs"
          />
          <select
            value={contextAssetType}
            onChange={(e) => setContextAssetType(e.target.value)}
            className="neu-input px-3 py-2 text-xs"
          >
            <option value="">Asset type (optional)</option>
            <option value="SNF">SNF</option>
            <option value="ALF">ALF</option>
            <option value="ILF">ILF</option>
            <option value="HOSPICE">Hospice</option>
          </select>
          <button
            onClick={createMission}
            disabled={creating || !topic.trim()}
            className="ml-auto px-5 py-2 neu-button-primary rounded-xl text-xs font-medium flex items-center gap-2"
          >
            {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Deploy Agent
          </button>
        </div>
      </div>

      {/* Deal-Specific Suggestions */}
      {dealSuggestions.length > 0 && (
        <div className="neu-card-warm p-4 border-l-4 border-orange-300">
          <h2 className="text-xs font-bold text-orange-600 dark:text-orange-400 mb-1 flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5" />
            Deal Intelligence Gaps
          </h2>
          <p className="text-[10px] text-surface-400 mb-2">
            Research suggestions mined from deal thesis and special circumstances
          </p>
          <div className="flex flex-wrap gap-2">
            {dealSuggestions.map((s) => (
              <button
                key={s.topic}
                onClick={() => setTopic(s.topic)}
                className="px-3 py-1.5 text-[10px] rounded-lg bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20 transition-colors text-left"
              >
                <span>{s.topic}</span>
                {s.dealName && (
                  <span className="block text-[8px] text-orange-400/70 mt-0.5">from: {s.dealName}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline-Level Suggestions */}
      {pipelineSuggestions.length > 0 && (
        <div className="neu-card-warm p-4">
          <h2 className="text-xs font-bold text-surface-500 mb-2">Suggested from Pipeline</h2>
          <div className="flex flex-wrap gap-2">
            {pipelineSuggestions.map((s) => (
              <button
                key={s.topic}
                onClick={() => setTopic(s.topic)}
                className="px-3 py-1.5 text-[10px] rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
              >
                {s.topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Missions List */}
      <div className="space-y-2">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-20 shimmer-warm rounded-xl" />)
        ) : missions.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No research missions yet</p>
            <p className="text-xs mt-1">Deploy an agent above to start gathering intelligence</p>
          </div>
        ) : (
          missions.map((mission) => {
            const statusConf = STATUS_CONFIG[mission.status];
            const StatusIcon = statusConf.icon;
            return (
              <div
                key={mission.id}
                className={cn(
                  'neu-card-warm p-4 cursor-pointer hover-lift',
                  selectedMission?.id === mission.id && 'ring-1 ring-primary-300'
                )}
                onClick={() => setSelectedMission(selectedMission?.id === mission.id ? null : mission)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={cn('w-4 h-4 shrink-0', statusConf.color)} />
                      <span className="text-sm font-medium text-surface-800 dark:text-surface-100 truncate">
                        {mission.topic}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-surface-400">
                      <span>{new Date(mission.createdAt).toLocaleDateString()}</span>
                      {mission.context?.state && <span>State: {mission.context.state}</span>}
                      {mission.context?.assetType && <span>{mission.context.assetType}</span>}
                      {mission.importedToKnowledge && (
                        <span className="text-emerald-500 font-medium">Imported to Knowledge</span>
                      )}
                    </div>
                  </div>
                  {mission.status === 'complete' && !mission.importedToKnowledge && (
                    <button
                      onClick={(e) => { e.stopPropagation(); importToKnowledge(mission.id); }}
                      disabled={importing === mission.id}
                      className="px-3 py-1.5 text-[10px] font-medium text-primary-600 bg-primary-50 dark:bg-primary-500/10 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      {importing === mission.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-1"><Download className="w-3 h-3" /> Import</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Expanded view */}
                {selectedMission?.id === mission.id && mission.findings && (
                  <div className="mt-4 pt-4 border-t border-[#E2DFD8] dark:border-surface-700">
                    <pre className="text-xs text-surface-600 dark:text-surface-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {mission.findings}
                    </pre>
                    {mission.sources?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        <span className="text-[10px] font-bold text-surface-400">Sources:</span>
                        {mission.sources.map((src, i) => (
                          <a
                            key={i}
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[10px] text-primary-500 hover:underline"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            {src.title || src.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
