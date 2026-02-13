'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Check,
  Shield,
  DollarSign,
  Building2,
  BarChart3,
} from 'lucide-react';
import type { DealSynthesis, RedFlag } from '@/lib/pipeline/types';

interface PipelineResultsProps {
  dealId: string;
  dealName: string;
  synthesis: DealSynthesis;
  redFlags: RedFlag[];
  completenessScore: number;
}

export function PipelineResults({
  dealId,
  dealName,
  synthesis,
  redFlags,
  completenessScore,
}: PipelineResultsProps) {
  const recommendationConfig = {
    pursue: { label: 'Pursue', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30' },
    conditional: { label: 'Conditional', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30' },
    pass: { label: 'Pass', color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30' },
  };

  const rec = recommendationConfig[synthesis.recommendation];
  const criticalFlags = redFlags.filter((f) => f.severity === 'critical');
  const warningFlags = redFlags.filter((f) => f.severity === 'warning');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Hero Score Card */}
      <div className="relative rounded-2xl border border-surface-700/50 bg-surface-900/50 backdrop-blur-xl p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 to-transparent" />
        <div className="relative flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-surface-100 mb-1">{dealName}</h2>
            <div className="flex items-center gap-3">
              <span className={cn('text-sm font-semibold px-3 py-1 rounded-lg border', rec.bg, rec.color)}>
                {rec.label}
              </span>
              <span className="text-sm text-surface-400">
                Document Completeness: {completenessScore}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold text-primary-400">{synthesis.dealScore}</div>
            <div className="text-xs text-surface-500 mt-0.5">Deal Score</div>
          </div>
        </div>

        {/* Investment Thesis */}
        <div className="relative mt-4 p-3 rounded-xl bg-surface-800/50 border border-surface-700/30">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-surface-300 leading-relaxed">
              {synthesis.investmentThesis}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Valuation + Risks + Tools */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Valuation Summary */}
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-4">
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Valuation
          </h3>
          <div className="space-y-2">
            {synthesis.valuationSummary.askingPrice && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Asking Price</span>
                <span className="text-surface-200 font-medium">
                  ${(synthesis.valuationSummary.askingPrice / 1_000_000).toFixed(1)}M
                </span>
              </div>
            )}
            {synthesis.valuationSummary.estimatedValue && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Est. Value</span>
                <span className="text-primary-300 font-medium">
                  ${(synthesis.valuationSummary.estimatedValue.low / 1_000_000).toFixed(1)}M–$
                  {(synthesis.valuationSummary.estimatedValue.high / 1_000_000).toFixed(1)}M
                </span>
              </div>
            )}
            {synthesis.valuationSummary.capRate && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Cap Rate</span>
                <span className="text-surface-200 font-medium">
                  {synthesis.valuationSummary.capRate.toFixed(2)}%
                </span>
              </div>
            )}
            {synthesis.valuationSummary.pricePerBed && (
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Price/Bed</span>
                <span className="text-surface-200 font-medium">
                  ${Math.round(synthesis.valuationSummary.pricePerBed / 1000)}K
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Risk Summary */}
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-4">
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            Risks ({redFlags.length})
          </h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {criticalFlags.map((flag) => (
              <div key={flag.id} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-rose-400 mt-0.5 flex-shrink-0" />
                <span className="text-rose-300">{flag.message}</span>
              </div>
            ))}
            {warningFlags.map((flag) => (
              <div key={flag.id} className="flex items-start gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-amber-300">{flag.message}</span>
              </div>
            ))}
            {redFlags.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <Check className="w-3 h-3" />
                No red flags detected
              </div>
            )}
          </div>
        </div>

        {/* Tool Results */}
        <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-4">
          <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5" />
            Tool Results
          </h3>
          <div className="space-y-1.5">
            {synthesis.toolSummary.map((tool, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <TrendingUp className="w-3 h-3 text-primary-400 mt-0.5 flex-shrink-0" />
                <span className="text-surface-300">{tool.headline}</span>
              </div>
            ))}
            {synthesis.toolSummary.length === 0 && (
              <p className="text-xs text-surface-500">No tools executed (insufficient data)</p>
            )}
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div className="rounded-xl border border-surface-700/50 bg-surface-900/30 p-4">
        <h3 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2">
          Suggested Next Steps
        </h3>
        <div className="space-y-1.5">
          {synthesis.suggestedNextSteps.map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-surface-300">
              <div className="w-4 h-4 rounded-full bg-surface-800 flex items-center justify-center flex-shrink-0">
                <span className="text-[9px] text-surface-500">{i + 1}</span>
              </div>
              {step}
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-2">
        <Link
          href={`/app/deals/${dealId}`}
          className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 shadow-lg shadow-primary-500/30 transition-all hover:shadow-primary-500/50 hover:scale-[1.02]"
        >
          <Building2 className="w-5 h-5" />
          Open Deal Workbench
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}
