'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { RotateCcw, Lock, Unlock, Play, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// Types
// ============================================================================

export interface SensitivityParameter {
  id: string;
  name: string;
  path: string;
  value: number;
  defaultValue: number;
  min: number;
  max: number;
  step: number;
  unit: 'percent' | 'currency' | 'number' | 'ratio';
  format?: (value: number) => string;
  description?: string;
}

export interface SensitivityResult {
  parameter: string;
  lowValue: number;
  highValue: number;
  range: number;
  baselineValue: number;
}

export interface InteractiveSensitivityProps {
  parameters: SensitivityParameter[];
  sensitivityResults?: SensitivityResult[];
  baselineValuation: number;
  currentValuation: number;
  isCalculating: boolean;
  onParameterChange: (parameterId: string, value: number) => void;
  onReset: () => void;
  onLockParameter?: (parameterId: string, locked: boolean) => void;
  lockedParameters?: Set<string>;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatValue(value: number, unit: string, customFormat?: (value: number) => string): string {
  if (customFormat) return customFormat(value);

  switch (unit) {
    case 'percent':
      return `${(value * 100).toFixed(1)}%`;
    case 'currency':
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    case 'ratio':
      return value.toFixed(2);
    default:
      return value.toLocaleString();
  }
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

// ============================================================================
// Parameter Slider Component
// ============================================================================

interface ParameterSliderProps {
  parameter: SensitivityParameter;
  onChange: (value: number) => void;
  onLock?: (locked: boolean) => void;
  isLocked?: boolean;
  isCalculating?: boolean;
}

function ParameterSlider({
  parameter,
  onChange,
  onLock,
  isLocked = false,
  isCalculating = false,
}: ParameterSliderProps) {
  const { id, name, value, defaultValue, min, max, step, unit, format, description } = parameter;

  const isModified = Math.abs(value - defaultValue) > step / 2;
  const percentOfRange = ((value - min) / (max - min)) * 100;

  return (
    <div className={cn('p-4 rounded-lg border', isModified && 'bg-amber-500/5 border-amber-500/30')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{name}</span>
          {isModified && <Badge variant="warning">Modified</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tabular-nums">
            {formatValue(value, unit, format)}
          </span>
          {onLock && (
            <button
              onClick={() => onLock(!isLocked)}
              className={cn(
                'p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800',
                isLocked && 'text-amber-500'
              )}
              title={isLocked ? 'Unlock parameter' : 'Lock parameter'}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="relative mt-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          disabled={isLocked || isCalculating}
          className={cn(
            'w-full h-2 rounded-lg appearance-none cursor-pointer',
            'bg-slate-200 dark:bg-slate-700',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-4',
            '[&::-webkit-slider-thumb]:h-4',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-primary',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:shadow',
            isLocked && 'opacity-50 cursor-not-allowed'
          )}
        />

        {/* Default marker */}
        <div
          className="absolute top-1/2 w-0.5 h-4 bg-slate-400 -translate-y-1/2 pointer-events-none"
          style={{ left: `${((defaultValue - min) / (max - min)) * 100}%` }}
        />
      </div>

      {/* Range labels */}
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>{formatValue(min, unit, format)}</span>
        {description && <span className="text-center">{description}</span>}
        <span>{formatValue(max, unit, format)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Tornado Chart Component
// ============================================================================

interface TornadoChartProps {
  results: SensitivityResult[];
  baseline: number;
  className?: string;
}

function TornadoChart({ results, baseline, className }: TornadoChartProps) {
  if (results.length === 0) return null;

  // Find max range for scaling
  const maxRange = Math.max(...results.map((r) => r.range));
  const sortedResults = [...results].sort((a, b) => b.range - a.range);

  return (
    <div className={cn('space-y-2', className)}>
      {sortedResults.map((result) => {
        const lowDiff = result.lowValue - baseline;
        const highDiff = result.highValue - baseline;
        const totalRange = maxRange * 2;

        // Calculate bar positions relative to center
        const lowPercent = ((lowDiff / totalRange) * 100) + 50;
        const highPercent = ((highDiff / totalRange) * 100) + 50;

        const barLeft = Math.min(lowPercent, highPercent, 50);
        const barRight = Math.max(lowPercent, highPercent, 50);

        return (
          <div key={result.parameter} className="flex items-center gap-3">
            <div className="w-24 text-sm text-right truncate">{result.parameter}</div>
            <div className="flex-1 relative h-6 bg-slate-100 dark:bg-slate-800 rounded">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-300 dark:bg-slate-600" />

              {/* Bar */}
              <div
                className={cn(
                  'absolute top-1 bottom-1 rounded',
                  lowDiff < 0 ? 'bg-rose-500' : 'bg-emerald-500'
                )}
                style={{
                  left: `${barLeft}%`,
                  right: `${100 - barRight}%`,
                }}
              />

              {/* Value labels */}
              <div
                className="absolute top-0 bottom-0 flex items-center text-xs font-medium"
                style={{ left: `${lowPercent}%`, transform: 'translateX(-100%)' }}
              >
                <span className="mr-1">{formatCurrency(result.lowValue)}</span>
              </div>
              <div
                className="absolute top-0 bottom-0 flex items-center text-xs font-medium"
                style={{ left: `${highPercent}%` }}
              >
                <span className="ml-1">{formatCurrency(result.highValue)}</span>
              </div>
            </div>
            <div className="w-20 text-xs text-muted-foreground">
              ±{formatCurrency(result.range / 2)}
            </div>
          </div>
        );
      })}

      {/* Baseline label */}
      <div className="flex items-center justify-center text-sm text-muted-foreground mt-2">
        <span>Baseline: {formatCurrency(baseline)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InteractiveSensitivity({
  parameters,
  sensitivityResults = [],
  baselineValuation,
  currentValuation,
  isCalculating,
  onParameterChange,
  onReset,
  onLockParameter,
  lockedParameters = new Set(),
  className,
}: InteractiveSensitivityProps) {
  const modifiedCount = parameters.filter(
    (p) => Math.abs(p.value - p.defaultValue) > p.step / 2
  ).length;

  const valuationChange = currentValuation - baselineValuation;
  const valuationChangePercent =
    baselineValuation > 0 ? (valuationChange / baselineValuation) * 100 : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Sensitivity Analysis</h3>
          <p className="text-sm text-muted-foreground">
            Adjust parameters to see impact on valuation
          </p>
        </div>
        <div className="flex items-center gap-4">
          {modifiedCount > 0 && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset ({modifiedCount})
            </Button>
          )}
          {isCalculating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Calculating...
            </div>
          )}
        </div>
      </div>

      {/* Current valuation display */}
      <Card className={cn(valuationChange !== 0 && 'border-primary')}>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground">Current Valuation</div>
              <div className="text-3xl font-bold">{formatCurrency(currentValuation)}</div>
            </div>
            {valuationChange !== 0 && (
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Change from Baseline</div>
                <div
                  className={cn(
                    'text-xl font-semibold',
                    valuationChange > 0 ? 'text-emerald-600' : 'text-rose-600'
                  )}
                >
                  {valuationChange > 0 ? '+' : ''}
                  {formatCurrency(valuationChange)}
                  <span className="text-sm ml-1">
                    ({valuationChangePercent > 0 ? '+' : ''}
                    {valuationChangePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parameter sliders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parameter Adjustments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parameters.map((param) => (
            <ParameterSlider
              key={param.id}
              parameter={param}
              onChange={(value) => onParameterChange(param.id, value)}
              onLock={onLockParameter ? (locked) => onLockParameter(param.id, locked) : undefined}
              isLocked={lockedParameters.has(param.id)}
              isCalculating={isCalculating}
            />
          ))}
        </CardContent>
      </Card>

      {/* Tornado chart */}
      {sensitivityResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Impact Ranking</CardTitle>
          </CardHeader>
          <CardContent>
            <TornadoChart
              results={sensitivityResults}
              baseline={baselineValuation}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default InteractiveSensitivity;
