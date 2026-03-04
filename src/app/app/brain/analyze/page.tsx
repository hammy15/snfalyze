'use client';

import { useState, useEffect } from 'react';
import { BrainVisualization } from '@/components/brain/BrainVisualization';
import { SenseIndicator } from '@/components/brain/SenseIndicator';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Crosshair,
  Upload,
  ArrowRight,
  Loader2,
  CheckCircle2,
  Zap,
  Eye,
  Ear,
  Hand,
  ShieldAlert,
  Handshake,
  AlertTriangle,
  TrendingUp,
  FileText,
} from 'lucide-react';

interface RecentDeal {
  id: string;
  name: string;
  assetType: string;
  primaryState: string;
  beds: number;
  confidenceScore: number;
  status: string;
  analyzedAt: string | null;
}

const SENSES = [
  { id: 'cms', name: 'CMS', icon: '👁', description: 'Star ratings, deficiencies, SFF status' },
  { id: 'market', name: 'Market', icon: '👂', description: 'Medicaid rates, economic data, labor markets' },
  { id: 'financial', name: 'Financial', icon: '✋', description: 'P&L extraction, EBITDAR, occupancy' },
  { id: 'regulatory', name: 'Regulatory', icon: '👃', description: 'CON, licensing, survey body behavior' },
  { id: 'deal', name: 'Deal', icon: '👄', description: 'Valuations, risk scoring, deal structure' },
];

const ANALYSIS_PHASES = [
  { id: 'intake', label: 'Document Intake', description: 'Upload deal package — CIL identifies document types', icon: Upload, duration: '~5s' },
  { id: 'senses', label: 'Sense Activation', description: 'CIL activates relevant senses based on deal context', icon: Eye, duration: '~10s' },
  { id: 'newo', label: 'Newo Analysis', description: 'Operations brain evaluates staffing, quality, reimbursement', icon: Zap, duration: '~30s' },
  { id: 'dev', label: 'Dev Analysis', description: 'Strategy brain models valuations, deal structure, IPO impact', icon: TrendingUp, duration: '~30s' },
  { id: 'tension', label: 'Tension Resolution', description: 'CIL reconciles where Newo and Dev disagree', icon: AlertTriangle, duration: '~10s' },
  { id: 'synthesis', label: 'CIL Synthesis', description: 'Final recommendation with confidence score', icon: CheckCircle2, duration: '~5s' },
];

export default function AnalyzePage() {
  const [recentDeals, setRecentDeals] = useState<RecentDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [brainHealth, setBrainHealth] = useState({ newo: 'online' as const, dev: 'online' as const });

  useEffect(() => {
    Promise.all([
      fetch('/api/deals?limit=10').then((r) => r.json()).catch(() => ({ data: [] })),
      fetch('/api/cil/status').then((r) => r.json()).catch(() => ({})),
    ]).then(([dealsData, status]) => {
      const analyzed = (dealsData.data || [])
        .filter((d: RecentDeal) => d.analyzedAt)
        .sort((a: RecentDeal, b: RecentDeal) => new Date(b.analyzedAt!).getTime() - new Date(a.analyzedAt!).getTime())
        .slice(0, 5);
      setRecentDeals(analyzed);
      if (status?.brains) {
        setBrainHealth({
          newo: status.brains.newo?.status || 'online',
          dev: status.brains.dev?.status || 'online',
        });
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
          <Crosshair className="w-6 h-6 text-primary-500" />
          Deal Analyzer
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Newo + Dev analyze every deal in parallel with full CIL orchestration
        </p>
      </div>

      {/* Brain Status + Upload Zone */}
      <div className="neu-card-warm p-8">
        <div className="flex flex-col items-center">
          <BrainVisualization
            newoStatus={brainHealth.newo}
            devStatus={brainHealth.dev}
            compact
          />
          <div className="mt-6">
            <SenseIndicator senses={SENSES} />
          </div>
        </div>

        {/* Upload Drop Zone */}
        <div className="mt-8 border-2 border-dashed border-primary-200 dark:border-primary-500/30 rounded-xl p-8 text-center hover:border-primary-400 dark:hover:border-primary-500/50 transition-colors bg-primary-50/30 dark:bg-primary-500/5">
          <Upload className="w-8 h-8 text-primary-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200">
            Start a New Analysis
          </h3>
          <p className="text-xs text-surface-400 mt-1 max-w-md mx-auto">
            Create a deal first, then upload your deal package — CIMs, T12s, rent rolls, proformas.
            CIL will identify documents, activate senses, and run dual-brain analysis.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <Link
              href="/app/deals/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 neu-button-primary rounded-xl text-sm font-medium"
            >
              <FileText className="w-4 h-4" />
              Create New Deal
            </Link>
            <Link
              href="/app/deals"
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-surface-500 hover:text-surface-700 transition-colors"
            >
              View Existing Deals
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-surface-300">
            <span>PDF, Excel, CSV accepted</span>
            <span>·</span>
            <span>Max 50MB per file</span>
            <span>·</span>
            <span>CIL auto-extracts financials</span>
          </div>
        </div>
      </div>

      {/* How Dual-Brain Analysis Works */}
      <div className="neu-card-warm p-6">
        <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100 mb-5">
          How Dual-Brain Analysis Works
        </h2>
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-gradient-to-b from-primary-300 via-teal-300 to-orange-300" />

          <div className="space-y-6">
            {ANALYSIS_PHASES.map((phase, i) => (
              <div key={phase.id} className="flex items-start gap-4 relative">
                <div className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10',
                  i < 2 ? 'bg-primary-100 dark:bg-primary-500/10' :
                  i < 4 ? (i === 2 ? 'bg-teal-100 dark:bg-teal-500/10' : 'bg-orange-100 dark:bg-orange-500/10') :
                  'bg-surface-100 dark:bg-surface-800'
                )}>
                  <phase.icon className={cn(
                    'w-4 h-4',
                    i < 2 ? 'text-primary-500' :
                    i === 2 ? 'text-teal-500' :
                    i === 3 ? 'text-orange-500' :
                    'text-surface-500'
                  )} />
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-surface-700 dark:text-surface-200">
                      {phase.label}
                    </h3>
                    <span className="text-[10px] text-surface-300 font-mono">{phase.duration}</span>
                    {i === 2 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400 font-medium">NEWO</span>}
                    {i === 3 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 font-medium">DEV</span>}
                    {i === 4 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 font-medium">TENSION</span>}
                    {i === 5 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 font-medium">CIL</span>}
                  </div>
                  <p className="text-xs text-surface-400 mt-0.5">{phase.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* What Each Brain Evaluates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Newo */}
        <div className="neu-card-warm p-5 border-l-4 border-teal-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-teal-500" />
            <h3 className="text-sm font-bold text-teal-700 dark:text-teal-400">Newo Evaluates</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Operational Viability Score', desc: '0-100 — Can Cascadia actually run this?' },
              { label: 'Staffing Feasibility', desc: 'HPPD, agency dependency, turnover, labor market depth' },
              { label: 'Quality Remediation', desc: 'Deficiency patterns, SFF risk, remediation cost/timeline' },
              { label: 'Platform Synergies', desc: 'Mgmt fee savings, GPO, PDPM billing, referral network' },
              { label: 'Reimbursement Upside', desc: 'PDPM gaps, quality bonuses, state supplement programs' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-teal-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-surface-700 dark:text-surface-200">{item.label}</div>
                  <div className="text-[10px] text-surface-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dev */}
        <div className="neu-card-warm p-5 border-l-4 border-orange-400">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <h3 className="text-sm font-bold text-orange-700 dark:text-orange-400">Dev Evaluates</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: '4-Scenario Valuation', desc: 'Bear / Base / Bull / Cascadia-Normalized models' },
              { label: 'Deal Structure', desc: 'Bid strategy, R&W insurance, earnouts, conditions precedent' },
              { label: 'Seller Intelligence', desc: 'PE exit windows, founder motivation, timing signals' },
              { label: 'IPO Impact', desc: 'Post-acquisition ops count, revenue scale, multiple expansion' },
              { label: 'Pipeline Positioning', desc: 'Tier ranking, geographic overlap, cluster potential' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-2">
                <CheckCircle2 className="w-3 h-3 text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-medium text-surface-700 dark:text-surface-200">{item.label}</div>
                  <div className="text-[10px] text-surface-400">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Analyses */}
      {recentDeals.length > 0 && (
        <div className="neu-card-warm p-5">
          <h2 className="text-sm font-bold text-surface-800 dark:text-surface-100 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary-500" />
            Recent Analyses
          </h2>
          <div className="space-y-2">
            {recentDeals.map((deal) => (
              <Link
                key={deal.id}
                href={`/app/deals/${deal.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-[#EFEDE8] dark:hover:bg-surface-800/50 transition-colors"
              >
                <div>
                  <div className="text-xs font-medium text-surface-700 dark:text-surface-200">{deal.name}</div>
                  <div className="text-[10px] text-surface-400">
                    {deal.assetType} · {deal.primaryState} · {deal.beds} beds
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-500" />
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                  </div>
                  {deal.confidenceScore && (
                    <span className={cn(
                      'text-xs font-bold',
                      deal.confidenceScore >= 80 ? 'text-emerald-500' :
                      deal.confidenceScore >= 60 ? 'text-amber-500' : 'text-red-400'
                    )}>
                      {deal.confidenceScore}%
                    </span>
                  )}
                  <ArrowRight className="w-3 h-3 text-surface-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
