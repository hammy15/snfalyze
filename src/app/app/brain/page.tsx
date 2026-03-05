'use client';

import { useEffect, useState } from 'react';
import { BrainVisualization } from '@/components/brain/BrainVisualization';
import { CILStatusBar } from '@/components/brain/CILStatusBar';
import { ActivityFeed } from '@/components/brain/ActivityFeed';
import { SenseIndicator } from '@/components/brain/SenseIndicator';
import { cn } from '@/lib/utils';

interface CILStatus {
  knowledgeFileCount: number;
  dealsAnalyzed: number;
  dealsLearned: number;
  totalDeals: number;
  preferenceCount: number;
  researchMissions: number;
  avgConfidence: number;
  ipoProgress: { currentOps: number; targetOps: number };
  brains: {
    newo: { status: 'online' | 'degraded' | 'offline'; avgLatencyMs: number; consecutiveFailures: number };
    dev: { status: 'online' | 'degraded' | 'offline'; avgLatencyMs: number; consecutiveFailures: number };
  };
}

const DEFAULT_SENSES = [
  { id: 'cms', name: 'CMS', icon: '👁', description: 'Star ratings, deficiencies, SFF status' },
  { id: 'market', name: 'Market', icon: '👂', description: 'Medicaid rates, economic data' },
  { id: 'financial', name: 'Financial', icon: '✋', description: 'P&L, EBITDAR, occupancy' },
  { id: 'regulatory', name: 'Regulatory', icon: '👃', description: 'CON, licensing, surveys' },
  { id: 'deal', name: 'Deal', icon: '👄', description: 'Valuations, risk, structure' },
];

export default function BrainDashboard() {
  const [status, setStatus] = useState<CILStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const loadStatus = () => {
      fetch('/api/cil/status')
        .then((r) => r.json())
        .then((data) => {
          setStatus(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    };

    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('snf_onboarding_dismissed')) {
      setShowOnboarding(true);
    }
  }, []);

  const dismissOnboarding = () => {
    setShowOnboarding(false);
    localStorage.setItem('snf_onboarding_dismissed', '1');
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-48 shimmer-warm rounded-2xl" />
        <div className="grid grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 shimmer-warm rounded-xl" />
          ))}
        </div>
        <div className="h-64 shimmer-warm rounded-2xl" />
      </div>
    );
  }

  const newoStatus = status?.brains?.newo?.status ?? 'online';
  const devStatus = status?.brains?.dev?.status ?? 'online';

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100">
            Cascadia Intelligence Layer
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            The cranium that holds everything together
          </p>
        </div>

        {/* Failover Status Banner */}
        {(newoStatus !== 'online' || devStatus !== 'online') && (
          <div className="px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20">
            <div className="text-xs font-bold text-amber-700 dark:text-amber-400">
              FAILOVER ACTIVE
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-300 mt-0.5">
              {newoStatus !== 'online' && 'Newo (ops) degraded — Dev compensating'}
              {devStatus !== 'online' && 'Dev (strategy) degraded — Newo compensating'}
            </div>
          </div>
        )}
      </div>

      {/* Onboarding Quick-Start */}
      {showOnboarding && (
        <div className="neu-card-warm p-5 border border-primary-200/50 dark:border-primary-500/20 bg-gradient-to-r from-primary-50/30 to-transparent dark:from-primary-500/5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100">Welcome to CIL</h2>
              <p className="text-xs text-surface-400 mt-1">Here&apos;s how to get started with Cascadia Intelligence:</p>
            </div>
            <button onClick={dismissOnboarding} className="text-surface-300 hover:text-surface-500 text-xs">Dismiss</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
            {[
              { step: '1', title: 'Upload a Deal', desc: 'Drop documents into Analyze', href: '/app/brain/analyze', color: 'bg-blue-500' },
              { step: '2', title: 'Run Analysis', desc: 'Newo + Dev dual-brain', href: '/app/brain/pipeline', color: 'bg-teal-500' },
              { step: '3', title: 'Deploy Research', desc: 'Send agents for intel', href: '/app/brain/research', color: 'bg-orange-500' },
              { step: '4', title: 'Review AHA Moments', desc: 'Brain breakthroughs', href: '/app/brain/aha', color: 'bg-amber-500' },
            ].map((s) => (
              <a key={s.step} href={s.href} className="flex items-start gap-2.5 p-3 rounded-lg hover:bg-white/50 dark:hover:bg-surface-800/50 transition-colors group">
                <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0', s.color)}>{s.step}</span>
                <div>
                  <div className="text-xs font-bold text-surface-700 dark:text-surface-200 group-hover:text-primary-600">{s.title}</div>
                  <div className="text-[10px] text-surface-400">{s.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Brain Visualization Hero */}
      <div className="neu-card-warm p-8 flex flex-col items-center">
        <BrainVisualization
          newoStatus={newoStatus}
          devStatus={devStatus}
          newoInsight={status?.dealsAnalyzed ? `${status.dealsAnalyzed} deals analyzed` : undefined}
          devInsight={status?.researchMissions ? `${status.researchMissions} research missions` : undefined}
        />

        {/* Senses */}
        <div className="mt-8">
          <SenseIndicator senses={DEFAULT_SENSES} />
        </div>
      </div>

      {/* Stats Row */}
      {status && (
        <CILStatusBar
          knowledgeFileCount={status.knowledgeFileCount}
          dealsAnalyzed={status.dealsAnalyzed}
          dealsLearned={status.dealsLearned}
          avgConfidence={status.avgConfidence}
          ipoProgress={status.ipoProgress}
        />
      )}

      {/* Staffing Intelligence Quick View (Newo's Domain) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="neu-card-warm p-4 border-l-4 border-teal-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <h2 className="text-sm font-bold text-teal-700 dark:text-teal-400">Newo — Operational Benchmarks</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Nat. Avg HPPD', value: '3.9', target: '4.0+', color: 'text-teal-600' },
              { label: 'Nat. Turnover', value: '46.4%', target: '<40%', color: 'text-amber-600' },
              { label: 'Agency Threshold', value: '<5%', target: 'Red >15%', color: 'text-emerald-600' },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className={cn('text-lg font-bold', m.color)}>{m.value}</div>
                <div className="text-[9px] text-surface-400">{m.label}</div>
                <div className="text-[8px] text-surface-300 mt-0.5">Target: {m.target}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-surface-400">
            Cascadia platform lift: 200-400bps EBITDAR margin improvement within 24 months
          </div>
        </div>

        <div className="neu-card-warm p-4 border-l-4 border-orange-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <h2 className="text-sm font-bold text-orange-700 dark:text-orange-400">Dev — Market Benchmarks</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'SNF Cap Rate', value: '12.5%', target: '14% lender', color: 'text-orange-600' },
              { label: 'ALF Cap Rate', value: '6.5-7.5%', target: 'National', color: 'text-orange-600' },
              { label: 'Leased Multiple', value: '2.5x', target: '2.0x lender', color: 'text-orange-600' },
            ].map((m) => (
              <div key={m.label} className="text-center">
                <div className={cn('text-lg font-bold', m.color)}>{m.value}</div>
                <div className="text-[9px] text-surface-400">{m.label}</div>
                <div className="text-[8px] text-surface-300 mt-0.5">{m.target}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-[10px] text-surface-400">
            IPO target: 200 operations (~$1B+ revenue). Current: 58 ops.
          </div>
        </div>
      </div>

      {/* Two-column layout: Activity + Brain Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Feed */}
        <div className="lg:col-span-2 neu-card-warm p-4">
          <h2 className="text-sm font-bold text-surface-700 dark:text-surface-200 mb-3">
            CIL Activity Feed
          </h2>
          <ActivityFeed />
        </div>

        {/* Brain Health Panel */}
        <div className="neu-card-warm p-4 space-y-4">
          <h2 className="text-sm font-bold text-surface-700 dark:text-surface-200">
            Brain Health
          </h2>

          {/* Newo */}
          <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-500/5 border border-teal-200/50 dark:border-teal-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${newoStatus === 'online' ? 'bg-emerald-400' : newoStatus === 'degraded' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-sm font-bold text-teal-700 dark:text-teal-300">Newo</span>
              </div>
              <span className="text-[10px] uppercase font-medium text-teal-500">{newoStatus}</span>
            </div>
            <div className="mt-2 text-xs text-teal-600/70 dark:text-teal-400/60">
              Left Brain — Operations & Institutional Knowledge
            </div>
            {status?.brains?.newo?.avgLatencyMs ? (
              <div className="mt-1 text-[10px] text-surface-400">
                Avg latency: {(status.brains.newo.avgLatencyMs / 1000).toFixed(1)}s
              </div>
            ) : null}
          </div>

          {/* Dev */}
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-500/5 border border-orange-200/50 dark:border-orange-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${devStatus === 'online' ? 'bg-emerald-400' : devStatus === 'degraded' ? 'bg-amber-400 animate-pulse' : 'bg-red-400'}`} />
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300">Dev</span>
              </div>
              <span className="text-[10px] uppercase font-medium text-orange-500">{devStatus}</span>
            </div>
            <div className="mt-2 text-xs text-orange-600/70 dark:text-orange-400/60">
              Right Brain — Strategic Analysis & Deal Intelligence
            </div>
            {status?.brains?.dev?.avgLatencyMs ? (
              <div className="mt-1 text-[10px] text-surface-400">
                Avg latency: {(status.brains.dev.avgLatencyMs / 1000).toFixed(1)}s
              </div>
            ) : null}
          </div>

          {/* CIL */}
          <div className="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold text-surface-700 dark:text-surface-200">CIL</span>
            </div>
            <div className="mt-2 text-xs text-surface-500">
              Cranium — Coordination, learning, and failover management
            </div>
            <div className="mt-2 text-[10px] text-surface-400">
              {status?.preferenceCount ?? 0} preferences learned
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
