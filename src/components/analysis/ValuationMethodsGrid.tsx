'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Building2,
  TrendingUp,
  Calculator,
  LineChart,
  Scale,
  Hammer,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ValuationMethod, ValuationResult } from '@/lib/analysis/types';

// ============================================================================
// Types
// ============================================================================

export interface ValuationMethodsGridProps {
  result: ValuationResult;
  selectedMethod?: string;
  onMethodSelect?: (method: string) => void;
  highlightRecommended?: boolean;
  className?: string;
}

interface MethodCardData {
  key: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  method?: ValuationMethod;
}

// ============================================================================
// Method Configurations
// ============================================================================

const METHOD_CONFIG: Record<
  string,
  { name: string; shortName: string; icon: React.ComponentType<{ className?: string }>; description: string }
> = {
  capRate: {
    name: 'Cap Rate',
    shortName: 'Cap Rate',
    icon: TrendingUp,
    description: 'Value based on NOI divided by market cap rate',
  },
  pricePerBed: {
    name: 'Price Per Bed',
    shortName: '$/Bed',
    icon: Building2,
    description: 'Value based on comparable price per licensed bed',
  },
  dcf: {
    name: 'Discounted Cash Flow',
    shortName: 'DCF',
    icon: LineChart,
    description: 'Present value of projected future cash flows',
  },
  noiMultiple: {
    name: 'NOI Multiple',
    shortName: 'NOI Mult',
    icon: Calculator,
    description: 'Value as a multiple of stabilized NOI',
  },
  comparableSales: {
    name: 'Comparable Sales',
    shortName: 'Comps',
    icon: Scale,
    description: 'Value based on recent similar transactions',
  },
  replacementCost: {
    name: 'Replacement Cost',
    shortName: 'Replace',
    icon: Hammer,
    description: 'Cost to build an equivalent facility today',
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'medium':
      return 'text-amber-600 dark:text-amber-400';
    case 'low':
      return 'text-rose-600 dark:text-rose-400';
    default:
      return 'text-slate-500';
  }
}

function getConfidenceBg(confidence: 'high' | 'medium' | 'low'): string {
  switch (confidence) {
    case 'high':
      return 'bg-emerald-500/10';
    case 'medium':
      return 'bg-amber-500/10';
    case 'low':
      return 'bg-rose-500/10';
    default:
      return 'bg-slate-500/10';
  }
}

// ============================================================================
// Main Component
// ============================================================================

export function ValuationMethodsGrid({
  result,
  selectedMethod,
  onMethodSelect,
  highlightRecommended = true,
  className,
}: ValuationMethodsGridProps) {
  const [expandedMethod, setExpandedMethod] = React.useState<string | null>(null);

  // Build method cards data
  const methods: MethodCardData[] = Object.entries(METHOD_CONFIG).map(([key, config]) => ({
    key,
    ...config,
    method: result.methods[key as keyof typeof result.methods],
  }));

  // Calculate which method is closest to reconciled value
  const recommendedMethod = React.useMemo(() => {
    let closest: { key: string; diff: number } | null = null;

    for (const { key, method } of methods) {
      if (method && method.value > 0) {
        const diff = Math.abs(method.value - result.reconciledValue);
        if (!closest || diff < closest.diff) {
          closest = { key, diff };
        }
      }
    }

    return closest?.key;
  }, [methods, result.reconciledValue]);

  const toggleExpand = (key: string) => {
    setExpandedMethod(expandedMethod === key ? null : key);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Valuation Methods</h3>
          <p className="text-sm text-muted-foreground">
            {methods.filter((m) => m.method && m.method.value > 0).length} of 6 methods applied
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Reconciled Value</div>
          <div className="text-2xl font-bold">{formatCurrency(result.reconciledValue)}</div>
        </div>
      </div>

      {/* Methods grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.map(({ key, name, shortName, icon: Icon, description, method }) => {
          const isExpanded = expandedMethod === key;
          const isSelected = selectedMethod === key;
          const isRecommended = highlightRecommended && recommendedMethod === key;
          const isEnabled = method && method.value > 0;

          return (
            <Card
              key={key}
              className={cn(
                'transition-all cursor-pointer',
                isEnabled ? 'hover:shadow-md' : 'opacity-50',
                isSelected && 'ring-2 ring-primary',
                isRecommended && 'ring-2 ring-emerald-500'
              )}
              onClick={() => isEnabled && onMethodSelect?.(key)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{shortName}</CardTitle>
                  </div>
                  {isRecommended && (
                    <Badge variant="success" className="text-xs">
                      Recommended
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                {isEnabled ? (
                  <>
                    {/* Value */}
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-2xl font-bold tabular-nums">
                        {formatCurrency(method.value)}
                      </span>
                      <Badge
                        className={cn(
                          'text-xs',
                          getConfidenceColor(method.confidence),
                          getConfidenceBg(method.confidence)
                        )}
                      >
                        {method.confidence}
                      </Badge>
                    </div>

                    {/* Variance from reconciled */}
                    {result.reconciledValue > 0 && (
                      <div className="text-xs text-muted-foreground mb-3">
                        {method.value > result.reconciledValue ? '+' : ''}
                        {(
                          ((method.value - result.reconciledValue) / result.reconciledValue) *
                          100
                        ).toFixed(1)}
                        % from reconciled
                      </div>
                    )}

                    {/* Expand toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(key);
                      }}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3 w-3" />
                          Hide details
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3 w-3" />
                          View details
                        </>
                      )}
                    </button>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                        <p className="text-muted-foreground">{description}</p>

                        {method.inputs && Object.keys(method.inputs).length > 0 && (
                          <div>
                            <span className="font-medium">Inputs: </span>
                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                              {Object.entries(method.inputs).map(([key, value]) => (
                                <li key={key} className="flex justify-between">
                                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                  <span>{typeof value === 'number' ? value.toLocaleString() : value}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {method.adjustments && method.adjustments.length > 0 && (
                          <div>
                            <span className="font-medium">Adjustments: </span>
                            <ul className="mt-1 space-y-1">
                              {method.adjustments.map((adj, idx) => (
                                <li
                                  key={idx}
                                  className="flex justify-between text-xs text-muted-foreground"
                                >
                                  <span>{adj.description}</span>
                                  <span
                                    className={adj.impact > 0 ? 'text-emerald-600' : 'text-rose-600'}
                                  >
                                    {adj.impact > 0 ? '+' : ''}
                                    {(adj.impact * 100).toFixed(1)}%
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div>
                          <span className="font-medium">Weight: </span>
                          <span className="text-muted-foreground">{(method.weight * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <Info className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Not applicable</p>
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Reconciliation summary */}
      <Card className="bg-slate-50 dark:bg-slate-800/50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Value Reconciliation</h4>
              <p className="text-sm text-muted-foreground">
                {result.overallConfidence} confidence based on {result.confidenceFactors.join(', ')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Value Range</div>
              <div className="text-lg font-semibold">
                {formatCurrency(result.valueLow)} - {formatCurrency(result.valueHigh)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ValuationMethodsGrid;
