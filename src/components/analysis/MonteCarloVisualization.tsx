'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Play, Loader2, Info, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { MonteCarloResult } from '@/lib/analysis/realtime';

// ============================================================================
// Types
// ============================================================================

export interface DistributionConfig {
  parameter: string;
  name: string;
  distribution: 'uniform' | 'normal' | 'triangular';
  params: {
    min?: number;
    max?: number;
    mean?: number;
    stdDev?: number;
    mode?: number;
  };
}

export interface MonteCarloVisualizationProps {
  result?: MonteCarloResult;
  isRunning: boolean;
  progress?: number;
  distributions: DistributionConfig[];
  iterations?: number;
  onRun: (iterations: number) => void;
  onUpdateDistribution?: (index: number, config: DistributionConfig) => void;
  baselineValue?: number;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// ============================================================================
// Distribution Chart Component
// ============================================================================

interface DistributionChartProps {
  distribution: Array<{ bucket: number; count: number; percentage: number }>;
  mean: number;
  median: number;
  percentiles: { p5: number; p95: number };
  baselineValue?: number;
  className?: string;
}

function DistributionChart({
  distribution,
  mean,
  median,
  percentiles,
  baselineValue,
  className,
}: DistributionChartProps) {
  const maxCount = Math.max(...distribution.map((d) => d.count));
  const minBucket = distribution[0]?.bucket || 0;
  const maxBucket = distribution[distribution.length - 1]?.bucket || 0;
  const range = maxBucket - minBucket;

  const getPosition = (value: number) => ((value - minBucket) / range) * 100;

  return (
    <div className={cn('relative', className)}>
      {/* Histogram bars */}
      <div className="flex items-end h-40 gap-0.5">
        {distribution.map((d, i) => (
          <div
            key={i}
            className="flex-1 bg-primary/60 hover:bg-primary/80 transition-colors rounded-t"
            style={{ height: `${(d.count / maxCount) * 100}%` }}
            title={`${formatCurrency(d.bucket)}: ${d.percentage.toFixed(1)}%`}
          />
        ))}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2">
        <span>{formatCurrency(minBucket)}</span>
        <span>{formatCurrency((minBucket + maxBucket) / 2)}</span>
        <span>{formatCurrency(maxBucket)}</span>
      </div>

      {/* Markers overlay */}
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none">
        {/* Mean marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-emerald-500"
          style={{ left: `${getPosition(mean)}%` }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-emerald-500 text-white px-1 rounded">
            Mean
          </div>
        </div>

        {/* Median marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-amber-500"
          style={{ left: `${getPosition(median)}%` }}
        >
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap bg-amber-500 text-white px-1 rounded">
            Median
          </div>
        </div>

        {/* P5 - P95 range */}
        <div
          className="absolute bottom-0 h-2 bg-primary/20"
          style={{
            left: `${getPosition(percentiles.p5)}%`,
            width: `${getPosition(percentiles.p95) - getPosition(percentiles.p5)}%`,
          }}
        />

        {/* Baseline marker */}
        {baselineValue !== undefined && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-slate-500 border-l border-dashed border-slate-400"
            style={{ left: `${getPosition(baselineValue)}%` }}
          >
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap">
              Baseline
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Distribution Config Editor
// ============================================================================

interface DistributionEditorProps {
  config: DistributionConfig;
  onChange: (config: DistributionConfig) => void;
}

function DistributionEditor({ config, onChange }: DistributionEditorProps) {
  const handleParamChange = (key: string, value: number) => {
    onChange({
      ...config,
      params: { ...config.params, [key]: value },
    });
  };

  return (
    <div className="p-3 border rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm">{config.name}</span>
        <select
          value={config.distribution}
          onChange={(e) =>
            onChange({ ...config, distribution: e.target.value as DistributionConfig['distribution'] })
          }
          className="text-xs px-2 py-1 border rounded"
        >
          <option value="uniform">Uniform</option>
          <option value="normal">Normal</option>
          <option value="triangular">Triangular</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        {config.distribution === 'uniform' && (
          <>
            <div>
              <label className="text-muted-foreground">Min</label>
              <input
                type="number"
                value={config.params.min || 0}
                onChange={(e) => handleParamChange('min', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="text-muted-foreground">Max</label>
              <input
                type="number"
                value={config.params.max || 0}
                onChange={(e) => handleParamChange('max', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
          </>
        )}

        {config.distribution === 'normal' && (
          <>
            <div>
              <label className="text-muted-foreground">Mean</label>
              <input
                type="number"
                value={config.params.mean || 0}
                onChange={(e) => handleParamChange('mean', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="text-muted-foreground">Std Dev</label>
              <input
                type="number"
                value={config.params.stdDev || 0}
                onChange={(e) => handleParamChange('stdDev', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
          </>
        )}

        {config.distribution === 'triangular' && (
          <>
            <div>
              <label className="text-muted-foreground">Min</label>
              <input
                type="number"
                value={config.params.min || 0}
                onChange={(e) => handleParamChange('min', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div>
              <label className="text-muted-foreground">Mode</label>
              <input
                type="number"
                value={config.params.mode || 0}
                onChange={(e) => handleParamChange('mode', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
            <div className="col-span-2">
              <label className="text-muted-foreground">Max</label>
              <input
                type="number"
                value={config.params.max || 0}
                onChange={(e) => handleParamChange('max', parseFloat(e.target.value))}
                className="w-full px-2 py-1 border rounded"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function MonteCarloVisualization({
  result,
  isRunning,
  progress,
  distributions,
  iterations = 1000,
  onRun,
  onUpdateDistribution,
  baselineValue,
  className,
}: MonteCarloVisualizationProps) {
  const [iterationCount, setIterationCount] = React.useState(iterations);
  const [showDistributions, setShowDistributions] = React.useState(false);

  const probabilityAboveBaseline = React.useMemo(() => {
    if (!result || !baselineValue) return null;
    // Estimate probability from distribution
    const aboveCount = result.distribution.reduce(
      (sum, d) => sum + (d.bucket >= baselineValue ? d.count : 0),
      0
    );
    return (aboveCount / result.iterations) * 100;
  }, [result, baselineValue]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Monte Carlo Simulation</CardTitle>
              <Badge variant="secondary">{iterationCount.toLocaleString()} iterations</Badge>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={iterationCount}
                onChange={(e) => setIterationCount(parseInt(e.target.value) || 1000)}
                min={100}
                max={10000}
                step={100}
                className="w-24 px-2 py-1 text-sm border rounded"
                disabled={isRunning}
              />
              <Button
                onClick={() => onRun(iterationCount)}
                disabled={isRunning || distributions.length === 0}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Progress bar */}
        {isRunning && progress !== undefined && (
          <CardContent className="pt-0">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round(progress)}% complete
            </p>
          </CardContent>
        )}
      </Card>

      {/* Distribution inputs */}
      {onUpdateDistribution && (
        <Card>
          <CardHeader className="pb-2">
            <button
              onClick={() => setShowDistributions(!showDistributions)}
              className="flex items-center justify-between w-full"
            >
              <CardTitle className="text-base">Input Distributions</CardTitle>
              <Badge variant="secondary">{distributions.length} parameters</Badge>
            </button>
          </CardHeader>
          {showDistributions && (
            <CardContent className="grid gap-3 md:grid-cols-2">
              {distributions.map((dist, idx) => (
                <DistributionEditor
                  key={dist.parameter}
                  config={dist}
                  onChange={(config) => onUpdateDistribution(idx, config)}
                />
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Mean</div>
                <div className="text-2xl font-bold">{formatCurrency(result.mean)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Median (P50)</div>
                <div className="text-2xl font-bold">{formatCurrency(result.median)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Std Deviation</div>
                <div className="text-2xl font-bold">{formatCurrency(result.stdDev)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Range</div>
                <div className="text-lg font-bold">
                  {formatCurrency(result.min)} - {formatCurrency(result.max)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Distribution chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Value Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <DistributionChart
                distribution={result.distribution}
                mean={result.mean}
                median={result.median}
                percentiles={{ p5: result.percentiles.p5, p95: result.percentiles.p95 }}
                baselineValue={baselineValue}
              />
            </CardContent>
          </Card>

          {/* Percentiles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Percentile Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2 text-center text-sm">
                {Object.entries(result.percentiles).map(([key, value]) => (
                  <div key={key} className="p-2 bg-slate-50 dark:bg-slate-800 rounded">
                    <div className="text-muted-foreground text-xs">{key.toUpperCase()}</div>
                    <div className="font-medium">{formatCurrency(value)}</div>
                  </div>
                ))}
              </div>

              {/* Probability analysis */}
              {baselineValue !== undefined && probabilityAboveBaseline !== null && (
                <div className="mt-4 p-4 bg-primary/5 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-primary" />
                    <span className="font-medium">Probability Analysis</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {probabilityAboveBaseline >= 50 ? (
                        <TrendingUp className="h-5 w-5 text-emerald-500" />
                      ) : probabilityAboveBaseline <= 30 ? (
                        <TrendingDown className="h-5 w-5 text-rose-500" />
                      ) : (
                        <Minus className="h-5 w-5 text-amber-500" />
                      )}
                      <span>
                        <strong>{probabilityAboveBaseline.toFixed(1)}%</strong> chance of exceeding
                        baseline ({formatCurrency(baselineValue)})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Calculation time */}
              <div className="mt-4 text-xs text-muted-foreground">
                Completed {result.iterations.toLocaleString()} iterations in{' '}
                {(result.calculationTime / 1000).toFixed(2)} seconds
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default MonteCarloVisualization;
