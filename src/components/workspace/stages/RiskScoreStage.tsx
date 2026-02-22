'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ShieldAlert, AlertTriangle, AlertOctagon, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import type { RiskScoreStageData, RiskCategoryScore, DealBreakerFlag, RiskItem } from '@/types/workspace';

interface RiskScoreStageProps {
  dealId: string;
  stageData: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

const RATING_COLORS: Record<string, string> = {
  LOW: 'text-emerald-600',
  MODERATE: 'text-amber-500',
  ELEVATED: 'text-orange-500',
  HIGH: 'text-red-500',
  CRITICAL: 'text-red-700',
};

const RATING_BG: Record<string, string> = {
  LOW: 'bg-emerald-500',
  MODERATE: 'bg-amber-500',
  ELEVATED: 'bg-orange-500',
  HIGH: 'bg-red-500',
  CRITICAL: 'bg-red-700',
};

export function RiskScoreStage({ dealId, stageData, onUpdate }: RiskScoreStageProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const data = stageData as Partial<RiskScoreStageData>;

  const calculateRisk = async () => {
    setIsCalculating(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/workspace/risk`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        onUpdate(result);
      }
    } catch (err) {
      console.error('Failed to calculate risk:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  if (!data.compositeScore && data.compositeScore !== 0) {
    return (
      <div className="max-w-3xl mx-auto text-center py-16">
        <ShieldAlert className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-2">Calculate Risk Score</h3>
        <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
          Analyze regulatory, operational, financial, market, ownership, and integration risk across 6 weighted domains.
        </p>
        <button
          onClick={calculateRisk}
          disabled={isCalculating}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium transition-colors flex items-center gap-2 mx-auto"
        >
          {isCalculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
          {isCalculating ? 'Analyzing...' : 'Run Risk Assessment'}
        </button>
      </div>
    );
  }

  const score = data.compositeScore || 0;
  const rating = data.rating || 'MODERATE';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Composite Score Hero */}
      <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="relative w-32 h-32">
            {/* Background ring */}
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-200 dark:text-surface-700" />
              <circle
                cx="50" cy="50" r="42" fill="none"
                strokeWidth="8"
                strokeDasharray={`${(score / 100) * 264} 264`}
                strokeLinecap="round"
                className={RATING_BG[rating]}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn('text-3xl font-bold', RATING_COLORS[rating])}>{score}</span>
              <span className="text-[10px] text-surface-500">/100</span>
            </div>
          </div>
        </div>
        <p className={cn('text-lg font-semibold', RATING_COLORS[rating])}>{rating} RISK</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <button
            onClick={calculateRisk}
            disabled={isCalculating}
            className="text-xs text-primary-500 hover:text-primary-600 flex items-center gap-1"
          >
            <RefreshCw className={cn("w-3 h-3", isCalculating && "animate-spin")} /> Recalculate
          </button>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
        <div className="bg-surface-50 dark:bg-surface-800 px-5 py-3">
          <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300">Risk Categories</h3>
        </div>
        <div className="divide-y divide-surface-100 dark:divide-surface-800">
          {(data.categories || []).map(cat => (
            <CategoryRow key={cat.category} category={cat} />
          ))}
        </div>
      </div>

      {/* Deal Breaker Flags */}
      {data.dealBreakerFlags && data.dealBreakerFlags.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
            <AlertOctagon className="w-4 h-4" />
            Deal-Breaker Flags ({data.dealBreakerFlags.length})
          </h3>
          <div className="space-y-2">
            {data.dealBreakerFlags.map(flag => (
              <div key={flag.id} className="bg-white dark:bg-surface-900 rounded-lg p-3 border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{flag.description}</p>
                <p className="text-xs text-red-500 mt-1">{flag.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Elevated Risk Items */}
      {data.elevatedRiskItems && data.elevatedRiskItems.length > 0 && (
        <div className="border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Elevated Risk Items
          </h3>
          <div className="space-y-1.5">
            {data.elevatedRiskItems.map(item => (
              <div key={item.id} className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <div>
                  <p>{item.description}</p>
                  {item.detail && <p className="text-xs opacity-70 mt-0.5">{item.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strengths */}
      {data.strengths && data.strengths.length > 0 && (
        <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Strengths
          </h3>
          <div className="space-y-1.5">
            {data.strengths.map(item => (
              <div key={item.id} className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk-Adjusted Valuation */}
      {data.riskAdjustedValuation && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Risk-Adjusted Valuation</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-surface-500">Original Value</p>
              <p className="text-lg font-semibold">${(data.riskAdjustedValuation.originalValue / 1e6).toFixed(1)}M</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Adjusted Value</p>
              <p className="text-lg font-semibold text-primary-600">${(data.riskAdjustedValuation.adjustedValue / 1e6).toFixed(1)}M</p>
            </div>
            <div>
              <p className="text-xs text-surface-500">Adjustment</p>
              <p className={cn(
                'text-lg font-semibold',
                data.riskAdjustedValuation.adjustmentPercent < 0 ? 'text-red-500' : 'text-surface-600'
              )}>
                {data.riskAdjustedValuation.adjustmentPercent > 0 ? '+' : ''}{data.riskAdjustedValuation.adjustmentPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-surface-400 mt-0.5">{data.riskAdjustedValuation.adjustmentReason}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ category }: { category: RiskCategoryScore }) {
  const [expanded, setExpanded] = useState(false);
  const barWidth = Math.min(category.score, 100);

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-3 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{category.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-surface-400">{(category.weight * 100).toFixed(0)}% weight</span>
                <span className="text-sm font-semibold text-surface-800 dark:text-surface-200">{category.score}/100</span>
              </div>
            </div>
            <div className="w-full bg-surface-200 dark:bg-surface-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full transition-all',
                  barWidth <= 30 ? 'bg-emerald-500' :
                  barWidth <= 50 ? 'bg-amber-500' :
                  barWidth <= 70 ? 'bg-orange-500' :
                  'bg-red-500'
                )}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        </div>
      </button>

      {expanded && category.factors.length > 0 && (
        <div className="px-5 pb-3 pl-9">
          <div className="space-y-1.5">
            {category.factors.map((f, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-surface-600 dark:text-surface-400">{f.name}</span>
                <span className="text-surface-500">{f.score}/100</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
