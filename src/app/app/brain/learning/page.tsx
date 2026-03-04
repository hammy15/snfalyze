'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, RefreshCw, Map, TrendingUp, Upload, Brain, Loader2, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HistoricalDeal {
  id: string;
  name: string;
  status: string;
  assetType: string;
  primaryState: string;
  beds: number;
  dealDate: string;
}

interface PipelineDeal {
  id: string;
  name: string;
  status: string;
  assetType: string;
  primaryState: string;
  beds: number;
  dataHealth: 'good' | 'partial' | 'shell';
  hasT12: boolean;
  hasProforma: boolean;
  hasRisk: boolean;
}

interface GrowthPoint {
  date: string;
  dealsLearned: number;
  avgConfidence: number;
  preferenceCount: number;
}

interface StatePerf {
  state: string;
  dealCount: number;
  avgConfidence: number;
  performanceTier: string;
}

export default function LearningPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'overview' | 'deals' | 'map' | 'rerun'>('overview');
  const [growth, setGrowth] = useState<GrowthPoint[]>([]);
  const [performance, setPerformance] = useState<Record<string, StatePerf>>({});
  const [deals, setDeals] = useState<HistoricalDeal[]>([]);
  const [pipelineDeals, setPipelineDeals] = useState<PipelineDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [rerunning, setRerunning] = useState<string | null>(null);
  const [rerunResult, setRerunResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/learning/growth').then((r) => r.json()).catch(() => []),
      fetch('/api/cil/performance').then((r) => r.json()).catch(() => ({})),
      fetch('/api/learning/deals?limit=50').then((r) => r.json()).catch(() => []),
      fetch('/api/deals?limit=50').then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([g, p, d, pipeline]) => {
      setGrowth(Array.isArray(g) ? g : []);
      setPerformance(p || {});
      setDeals(Array.isArray(d) ? d : d.data || []);
      setPipelineDeals(pipeline.data || []);
      setLoading(false);
    });
  }, []);

  // Calculate unlearned deals
  const learnedIds = new Set(deals.map((d) => d.id));
  const unlearnedDeals = pipelineDeals.filter(
    (d) => !learnedIds.has(d.id) && d.status !== 'new'
  );

  const handleRerun = async (dealId: string) => {
    setRerunning(dealId);
    setRerunResult(null);
    try {
      const r = await fetch(`/api/learning/deals/${dealId}/rerun`, { method: 'POST' });
      const data = await r.json();
      setRerunResult(data.summary || 'Re-run complete');
    } catch {
      setRerunResult('Re-run failed');
    }
    setRerunning(null);
  };

  const tabs = [
    { key: 'overview', label: 'Knowledge Growth', icon: TrendingUp },
    { key: 'deals', label: 'Historical Deals', icon: Upload },
    { key: 'map', label: 'State Performance', icon: Map },
    { key: 'rerun', label: 'Model Re-Run', icon: RefreshCw },
  ] as const;

  const TIER_COLORS: Record<string, string> = {
    strong: 'bg-emerald-500',
    developing: 'bg-amber-500',
    limited: 'bg-red-400',
    no_data: 'bg-surface-300',
  };

  // Get unique states from performance data
  const stateEntries = Object.entries(performance)
    .filter(([, v]) => v && typeof v === 'object' && 'state' in v)
    .sort((a, b) => ((b[1] as StatePerf).dealCount || 0) - ((a[1] as StatePerf).dealCount || 0));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
          <GraduationCap className="w-6 h-6 text-primary-500" />
          Learning Center
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Drop deal docs, proformas, and results — Newo + Dev learn how Cascadia underwrites
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors',
              tab === t.key
                ? 'bg-white dark:bg-surface-700 text-surface-800 dark:text-surface-100 shadow-sm'
                : 'text-surface-400 hover:text-surface-600'
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-32 shimmer-warm rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {tab === 'overview' && (
            <div className="space-y-6">
              {/* Unlearned Deals Banner */}
              {unlearnedDeals.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-700 dark:text-amber-400">
                      {unlearnedDeals.length} deal{unlearnedDeals.length > 1 ? 's' : ''} available to learn from
                    </div>
                    <p className="text-xs text-amber-600/80 dark:text-amber-300/70 mt-0.5">
                      These pipeline deals haven&apos;t been ingested into the learning engine yet.
                      Upload their proformas and outcomes to make Newo + Dev smarter.
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {unlearnedDeals.slice(0, 5).map((d) => (
                        <span key={d.id} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          {d.name}
                        </span>
                      ))}
                      {unlearnedDeals.length > 5 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                          +{unlearnedDeals.length - 5} more
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setTab('deals')}
                      className="mt-3 px-4 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      View Unlearned Deals
                    </button>
                  </div>
                </div>
              )}

              {/* Growth Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Deals Learned', value: growth.length > 0 ? growth[growth.length - 1]!.dealsLearned : 0, color: 'text-primary-500' },
                  { label: 'Avg Confidence', value: `${growth.length > 0 ? growth[growth.length - 1]!.avgConfidence : 0}%`, color: 'text-emerald-500' },
                  { label: 'Preferences', value: growth.length > 0 ? growth[growth.length - 1]!.preferenceCount : 0, color: 'text-purple-500' },
                  { label: 'States Covered', value: stateEntries.filter(([, v]) => (v as StatePerf).dealCount > 0).length, color: 'text-orange-500' },
                ].map((stat) => (
                  <div key={stat.label} className="neu-card-warm px-4 py-3">
                    <div className={cn('text-2xl font-bold', stat.color)}>{stat.value}</div>
                    <div className="text-[10px] text-surface-400">{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Growth time-series (simplified bar chart) */}
              {growth.length > 1 && (
                <div className="neu-card-warm p-4">
                  <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200 mb-4">Confidence Growth</h3>
                  <div className="flex items-end gap-1 h-32">
                    {growth.map((point, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-primary-400 dark:bg-primary-500 rounded-t"
                          style={{ height: `${point.avgConfidence}%` }}
                          title={`${point.date}: ${point.avgConfidence}% confidence`}
                        />
                        <span className="text-[8px] text-surface-300 rotate-45 origin-left">{point.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="neu-card-warm p-4">
                <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200 mb-3">How Learning Works</h3>
                <div className="grid grid-cols-3 gap-4 text-xs text-surface-500">
                  <div>
                    <div className="text-teal-600 dark:text-teal-400 font-bold mb-1">1. Drop Docs</div>
                    <p>Upload raw T13s, proformas, and value assessments from completed deals.</p>
                  </div>
                  <div>
                    <div className="text-orange-600 dark:text-orange-400 font-bold mb-1">2. CIL Learns</div>
                    <p>Reverse engineers how Cascadia normalized, valued, and structured the deal.</p>
                  </div>
                  <div>
                    <div className="text-purple-600 dark:text-purple-400 font-bold mb-1">3. Brains Improve</div>
                    <p>Newo + Dev incorporate new preferences into future analyses. Re-run to validate.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Deals Tab */}
          {tab === 'deals' && (
            <div className="space-y-3">
              <div className="neu-card-warm p-4">
                <p className="text-xs text-surface-400 mb-3">
                  Upload historical deal packages through the existing Learning page to grow Newo + Dev&apos;s intelligence.
                </p>
                <a
                  href="/app/learning"
                  className="inline-flex items-center gap-2 px-4 py-2 neu-button-primary rounded-xl text-xs font-medium"
                >
                  <Upload className="w-3 h-3" />
                  Go to Upload Page
                </a>
              </div>

              {deals.length > 0 ? (
                deals.map((deal) => (
                  <div key={deal.id} className="neu-card-warm p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-surface-800 dark:text-surface-100">{deal.name}</div>
                      <div className="text-[10px] text-surface-400">
                        {deal.assetType} · {deal.primaryState} · {deal.beds} beds · {deal.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'text-[10px] px-2 py-0.5 rounded-full font-medium',
                        deal.status === 'complete' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-surface-100 text-surface-500'
                      )}>
                        {deal.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-surface-400">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No historical deals ingested yet</p>
                </div>
              )}
            </div>
          )}

          {/* State Performance Map Tab */}
          {tab === 'map' && (
            <div className="space-y-4">
              <div className="flex gap-3 mb-4">
                {Object.entries(TIER_COLORS).map(([tier, color]) => (
                  <div key={tier} className="flex items-center gap-1.5 text-[10px] text-surface-400">
                    <div className={cn('w-3 h-3 rounded-sm', color)} />
                    {tier.replace('_', ' ')}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
                  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
                  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
                  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
                  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'] as const).map((state) => {
                  const perf = performance[state] as StatePerf | undefined;
                  const tier = perf?.performanceTier || 'no_data';
                  const tierColor = TIER_COLORS[tier] || TIER_COLORS.no_data;
                  const isNoData = !perf || perf.dealCount === 0;
                  return (
                    <button
                      key={state}
                      onClick={() => {
                        if (isNoData) {
                          router.push(`/app/brain/research?topic=${encodeURIComponent(`${state} SNF market analysis 2026`)}`);
                        }
                      }}
                      className={cn(
                        'neu-card-warm p-2 flex flex-col items-center transition-colors',
                        isNoData ? 'cursor-pointer hover:border-primary-300 group' : 'cursor-default'
                      )}
                      title={
                        isNoData
                          ? `${state}: No data — Click to research`
                          : `${state}: ${perf.dealCount} deals, ${perf.avgConfidence}% confidence`
                      }
                    >
                      <div className={cn('w-4 h-4 rounded-sm mb-1', tierColor)} />
                      <span className="text-[10px] font-bold text-surface-600">{state}</span>
                      {perf && perf.dealCount > 0 ? (
                        <span className="text-[8px] text-surface-300">{perf.dealCount}</span>
                      ) : (
                        <Search className="w-2.5 h-2.5 text-surface-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="text-[10px] text-surface-300 mt-2">
                Click any gray (no data) state to dispatch a research agent
              </div>
            </div>
          )}

          {/* Model Re-Run Tab */}
          {tab === 'rerun' && (
            <div className="space-y-4">
              <div className="neu-card-warm p-4">
                <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200 mb-2">
                  Re-Run Historical Deals
                </h3>
                <p className="text-xs text-surface-400 mb-3">
                  Re-analyze any completed historical deal through the current dual-brain system.
                  Compare AI output vs Cascadia&apos;s actual decision to measure improvement.
                </p>
              </div>

              {rerunResult && (
                <div className="p-3 rounded-lg bg-primary-50 dark:bg-primary-500/10 border border-primary-200/50 text-xs text-primary-700 dark:text-primary-300">
                  {rerunResult}
                </div>
              )}

              {deals.filter((d) => d.status === 'complete').length > 0 ? (
                deals.filter((d) => d.status === 'complete').map((deal) => (
                  <div key={deal.id} className="neu-card-warm p-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-surface-800 dark:text-surface-100">{deal.name}</div>
                      <div className="text-[10px] text-surface-400">
                        {deal.assetType} · {deal.primaryState} · {deal.beds} beds
                      </div>
                    </div>
                    <button
                      onClick={() => handleRerun(deal.id)}
                      disabled={rerunning === deal.id}
                      className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 dark:bg-primary-500/10 rounded-lg hover:bg-primary-100 transition-colors flex items-center gap-1.5"
                    >
                      {rerunning === deal.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Re-Run
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-surface-400">
                  <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No completed historical deals to re-run</p>
                  <p className="text-xs mt-1">Ingest some deals first via the Historical Deals tab</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
