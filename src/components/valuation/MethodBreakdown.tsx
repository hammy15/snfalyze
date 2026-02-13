'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  TrendingUp,
  Building2,
  Calculator,
  BarChart3,
  ArrowLeftRight,
  Hammer,
  Info,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface MethodResult {
  name: string;
  value: number;
  confidence: 'high' | 'medium' | 'low';
  weight: number;
  weightedValue: number;
  inputs: Record<string, number | string>;
  adjustments?: Array<{ description: string; impact: number }>;
}

interface MethodBreakdownProps {
  methods: Record<string, MethodResult | undefined>;
  reconciledValue: number;
  valueLow: number;
  valueMid: number;
  valueHigh: number;
  overallConfidence: 'high' | 'medium' | 'low';
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

const METHOD_META: Record<string, { icon: typeof TrendingUp; color: string; description: string }> = {
  capRate: {
    icon: TrendingUp,
    color: 'text-blue-500',
    description: 'Value = NOI / Cap Rate. Reflects market-required yield on the asset.',
  },
  pricePerBed: {
    icon: Building2,
    color: 'text-emerald-500',
    description: 'Value = Beds × Adjusted Price Per Bed. Market comp-driven approach.',
  },
  dcf: {
    icon: Calculator,
    color: 'text-purple-500',
    description: 'Discounted cash flow over hold period. Forward-looking income approach.',
  },
  noiMultiple: {
    icon: BarChart3,
    color: 'text-amber-500',
    description: 'Value = NOI × Multiple. Income multiplier adjusted for quality and market.',
  },
  comparableSales: {
    icon: ArrowLeftRight,
    color: 'text-red-500',
    description: 'Weighted average of recent comparable transactions within 250 miles.',
  },
  replacementCost: {
    icon: Hammer,
    color: 'text-teal-500',
    description: 'Cost to rebuild minus depreciation. Floor/ceiling check on value.',
  },
};

const confidenceColors = {
  high: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

// =============================================================================
// COMPONENT
// =============================================================================

export function MethodBreakdown({
  methods,
  reconciledValue,
  valueLow,
  valueMid,
  valueHigh,
  overallConfidence,
}: MethodBreakdownProps) {
  const [expandedMethod, setExpandedMethod] = useState<string | null>(null);

  const enabledMethods = Object.entries(methods).filter(([, v]) => v !== undefined) as [string, MethodResult][];

  if (enabledMethods.length === 0) {
    return (
      <div className="neu-card p-6 text-center">
        <Calculator className="w-10 h-10 mx-auto text-surface-300 dark:text-surface-600 mb-3" />
        <p className="text-sm text-surface-500">No valuation methods have been run yet</p>
        <p className="text-xs text-surface-400 mt-1">
          Complete financial analysis to generate valuations
        </p>
      </div>
    );
  }

  // Find max value for bar scaling
  const maxValue = Math.max(...enabledMethods.map(([, m]) => m.value));

  return (
    <div className="space-y-4">
      {/* Reconciliation summary */}
      <div className="neu-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              Valuation Reconciliation
            </h3>
            <p className="text-xs text-surface-500 mt-0.5">
              {enabledMethods.length} methods applied · Weighted average
            </p>
          </div>
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', confidenceColors[overallConfidence])}>
            {overallConfidence} confidence
          </span>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Low</p>
            <p className="text-lg font-bold text-red-500">{formatCurrency(valueLow)}</p>
          </div>
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Reconciled</p>
            <p className="text-xl font-bold text-surface-900 dark:text-surface-50">{formatCurrency(reconciledValue)}</p>
          </div>
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">Market</p>
            <p className="text-lg font-bold text-surface-700 dark:text-surface-300">{formatCurrency(valueMid)}</p>
          </div>
          <div>
            <p className="text-[10px] text-surface-500 uppercase tracking-wider">High</p>
            <p className="text-lg font-bold text-emerald-500">{formatCurrency(valueHigh)}</p>
          </div>
        </div>
      </div>

      {/* Method cards */}
      <div className="space-y-2">
        {enabledMethods.map(([key, method]) => {
          const meta = METHOD_META[key] || { icon: BarChart3, color: 'text-surface-500', description: '' };
          const Icon = meta.icon;
          const isExpanded = expandedMethod === key;
          const barWidth = (method.value / maxValue) * 100;

          return (
            <div key={key} className="neu-card overflow-hidden">
              {/* Header */}
              <button
                onClick={() => setExpandedMethod(isExpanded ? null : key)}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
              >
                <Icon className={cn('w-5 h-5 flex-shrink-0', meta.color)} />
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-surface-900 dark:text-surface-50">
                      {method.name}
                    </span>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', confidenceColors[method.confidence])}>
                      {method.confidence}
                    </span>
                  </div>
                  {/* Value bar */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', meta.color.replace('text-', 'bg-'))}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-surface-50 flex-shrink-0">
                      {formatCurrency(method.value)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-surface-500">
                    {Math.round(method.weight * 100)}% weight
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-4 h-4 text-surface-400 transition-transform',
                      isExpanded && 'rotate-180'
                    )}
                  />
                </div>
              </button>

              {/* Expanded details */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-surface-200 dark:border-surface-700 pt-3 space-y-3">
                  <p className="text-xs text-surface-500 flex items-start gap-1.5">
                    <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {meta.description}
                  </p>

                  {/* Key inputs */}
                  {Object.keys(method.inputs).length > 0 && (
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2">Key Inputs</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(method.inputs).slice(0, 8).map(([inputKey, inputValue]) => (
                          <div key={inputKey} className="bg-surface-50 dark:bg-surface-800 rounded-lg px-3 py-1.5">
                            <p className="text-[10px] text-surface-500 capitalize">{inputKey.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-xs font-medium text-surface-900 dark:text-surface-50">
                              {typeof inputValue === 'number'
                                ? inputValue >= 1000 ? formatCurrency(inputValue) : inputValue.toFixed(2)
                                : String(inputValue)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Adjustments */}
                  {method.adjustments && method.adjustments.length > 0 && (
                    <div>
                      <p className="text-[10px] text-surface-500 uppercase tracking-wider mb-2">Adjustments</p>
                      <div className="space-y-1">
                        {method.adjustments.map((adj, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-surface-600 dark:text-surface-400">{adj.description}</span>
                            <span className={cn('font-medium', adj.impact >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                              {adj.impact >= 0 ? '+' : ''}{typeof adj.impact === 'number' && adj.impact < 1 && adj.impact > -1
                                ? `${(adj.impact * 100).toFixed(1)}%`
                                : formatCurrency(adj.impact)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Weighted value */}
                  <div className="flex items-center justify-between pt-2 border-t border-surface-200 dark:border-surface-700">
                    <span className="text-xs text-surface-500">Weighted Contribution</span>
                    <span className="text-sm font-bold text-surface-900 dark:text-surface-50">
                      {formatCurrency(method.weightedValue)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
