'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';
import type { ProformaScenario, ScenarioType } from './scenario-tabs';

interface ScenarioMetrics {
  revenue: number;
  expenses: number;
  noi: number;
  ebitda?: number;
  occupancy?: number;
  pricePerBed?: number;
  capRate?: number;
  value?: number;
}

interface ScenarioWithMetrics extends ProformaScenario {
  metrics: ScenarioMetrics;
  yearlyData?: {
    year: number;
    revenue: number;
    expenses: number;
    noi: number;
  }[];
}

interface ScenarioComparisonProps {
  scenarios: ScenarioWithMetrics[];
  baseScenarioId?: string;
  className?: string;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function formatPercent(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

function VarianceDisplay({
  value,
  baseValue,
  format = 'currency',
  positiveIsGood = true,
}: {
  value: number;
  baseValue: number;
  format?: 'currency' | 'percent' | 'number';
  positiveIsGood?: boolean;
}) {
  if (baseValue === 0) return null;

  const diff = value - baseValue;
  const pctChange = (diff / baseValue) * 100;
  const isPositive = pctChange > 0;
  const isNegative = pctChange < 0;
  const isNeutral = Math.abs(pctChange) < 0.1;

  const colorClass =
    isNeutral
      ? 'text-gray-500'
      : (isPositive && positiveIsGood) || (isNegative && !positiveIsGood)
        ? 'text-green-600'
        : 'text-red-600';

  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <div className={cn('flex items-center gap-1 text-xs', colorClass)}>
      <Icon className="w-3 h-3" />
      <span>
        {isPositive ? '+' : ''}
        {pctChange.toFixed(1)}%
      </span>
    </div>
  );
}

const METRIC_CONFIG: Record<
  keyof ScenarioMetrics,
  {
    label: string;
    format: 'currency' | 'percent' | 'number';
    positiveIsGood: boolean;
  }
> = {
  revenue: { label: 'Revenue', format: 'currency', positiveIsGood: true },
  expenses: { label: 'Expenses', format: 'currency', positiveIsGood: false },
  noi: { label: 'NOI', format: 'currency', positiveIsGood: true },
  ebitda: { label: 'EBITDA', format: 'currency', positiveIsGood: true },
  occupancy: { label: 'Occupancy', format: 'percent', positiveIsGood: true },
  pricePerBed: { label: 'Price/Bed', format: 'currency', positiveIsGood: true },
  capRate: { label: 'Cap Rate', format: 'percent', positiveIsGood: false },
  value: { label: 'Valuation', format: 'currency', positiveIsGood: true },
};

const SCENARIO_TYPE_COLORS: Record<ScenarioType, string> = {
  baseline: 'border-blue-200 bg-blue-50',
  upside: 'border-green-200 bg-green-50',
  downside: 'border-red-200 bg-red-50',
  custom: 'border-purple-200 bg-purple-50',
};

function formatValue(value: number, format: 'currency' | 'percent' | 'number'): string {
  switch (format) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    default:
      return value.toLocaleString();
  }
}

export function ScenarioComparison({
  scenarios,
  baseScenarioId,
  className,
}: ScenarioComparisonProps) {
  // Find base scenario for comparison
  const baseScenario =
    scenarios.find((s) => s.id === baseScenarioId) ||
    scenarios.find((s) => s.isBaseCase) ||
    scenarios[0];

  if (scenarios.length === 0) {
    return (
      <div className={cn('text-center py-8 text-[var(--color-text-tertiary)]', className)}>
        No scenarios to compare
      </div>
    );
  }

  // Metrics to compare
  const metricsToShow: (keyof ScenarioMetrics)[] = [
    'revenue',
    'expenses',
    'noi',
    'occupancy',
    'value',
  ];

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--gray-50)] border border-[var(--color-border-default)]">
              Metric
            </th>
            {scenarios.map((scenario) => (
              <th
                key={scenario.id}
                className={cn(
                  'px-4 py-3 text-center font-medium border border-[var(--color-border-default)] min-w-[160px]',
                  SCENARIO_TYPE_COLORS[scenario.scenarioType]
                )}
              >
                <div className="text-sm text-[var(--color-text-primary)]">{scenario.name}</div>
                {scenario.isBaseCase && (
                  <div className="text-xs text-[var(--accent-solid)]">Base Case</div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metricsToShow.map((metricKey) => {
            const config = METRIC_CONFIG[metricKey];

            return (
              <tr key={metricKey}>
                <td className="px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)] bg-[var(--gray-50)] border border-[var(--color-border-default)]">
                  {config.label}
                </td>
                {scenarios.map((scenario) => {
                  const value = scenario.metrics[metricKey];
                  const baseValue = baseScenario?.metrics[metricKey];
                  const isBase = scenario.id === baseScenario?.id;

                  if (value === undefined) {
                    return (
                      <td
                        key={scenario.id}
                        className="px-4 py-3 text-center text-[var(--color-text-tertiary)] border border-[var(--color-border-default)]"
                      >
                        —
                      </td>
                    );
                  }

                  return (
                    <td
                      key={scenario.id}
                      className={cn(
                        'px-4 py-3 text-center border border-[var(--color-border-default)]',
                        isBase && 'bg-[var(--gray-50)]'
                      )}
                    >
                      <div className="font-semibold text-[var(--color-text-primary)] tabular-nums">
                        {formatValue(value, config.format)}
                      </div>
                      {!isBase && baseValue !== undefined && (
                        <VarianceDisplay
                          value={value}
                          baseValue={baseValue}
                          format={config.format}
                          positiveIsGood={config.positiveIsGood}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Side-by-side card comparison
export function ScenarioComparisonCards({
  scenarios,
  baseScenarioId,
  className,
}: ScenarioComparisonProps) {
  const baseScenario =
    scenarios.find((s) => s.id === baseScenarioId) ||
    scenarios.find((s) => s.isBaseCase) ||
    scenarios[0];

  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {scenarios.map((scenario) => {
        const isBase = scenario.id === baseScenario?.id;

        return (
          <div
            key={scenario.id}
            className={cn(
              'card p-5 border-2',
              SCENARIO_TYPE_COLORS[scenario.scenarioType],
              isBase && 'ring-2 ring-[var(--accent-solid)]'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)]">{scenario.name}</h3>
                <p className="text-xs text-[var(--color-text-tertiary)] capitalize">
                  {scenario.scenarioType}
                  {isBase && ' • Base Case'}
                </p>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-3">
              <MetricRow
                label="Revenue"
                value={scenario.metrics.revenue}
                baseValue={isBase ? undefined : baseScenario?.metrics.revenue}
                format="currency"
                positiveIsGood
              />
              <MetricRow
                label="NOI"
                value={scenario.metrics.noi}
                baseValue={isBase ? undefined : baseScenario?.metrics.noi}
                format="currency"
                positiveIsGood
              />
              {scenario.metrics.value && (
                <MetricRow
                  label="Valuation"
                  value={scenario.metrics.value}
                  baseValue={isBase ? undefined : baseScenario?.metrics.value}
                  format="currency"
                  positiveIsGood
                />
              )}
              {scenario.metrics.occupancy && (
                <MetricRow
                  label="Occupancy"
                  value={scenario.metrics.occupancy}
                  baseValue={isBase ? undefined : baseScenario?.metrics.occupancy}
                  format="percent"
                  positiveIsGood
                />
              )}
            </div>

            {/* NOI Margin */}
            <div className="mt-4 pt-4 border-t border-[var(--color-border-default)]">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-tertiary)]">NOI Margin</span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {formatPercent(scenario.metrics.noi / scenario.metrics.revenue)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MetricRow({
  label,
  value,
  baseValue,
  format,
  positiveIsGood,
}: {
  label: string;
  value: number;
  baseValue?: number;
  format: 'currency' | 'percent' | 'number';
  positiveIsGood: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[var(--color-text-tertiary)]">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-medium text-[var(--color-text-primary)] tabular-nums">
          {formatValue(value, format)}
        </span>
        {baseValue !== undefined && (
          <VarianceDisplay
            value={value}
            baseValue={baseValue}
            format={format}
            positiveIsGood={positiveIsGood}
          />
        )}
      </div>
    </div>
  );
}

// Waterfall view showing changes between scenarios
export function ScenarioWaterfall({
  fromScenario,
  toScenario,
  className,
}: {
  fromScenario: ScenarioWithMetrics;
  toScenario: ScenarioWithMetrics;
  className?: string;
}) {
  const noiDiff = toScenario.metrics.noi - fromScenario.metrics.noi;
  const revDiff = toScenario.metrics.revenue - fromScenario.metrics.revenue;
  const expDiff = toScenario.metrics.expenses - fromScenario.metrics.expenses;

  return (
    <div className={cn('card p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-medium text-[var(--color-text-primary)]">
          {fromScenario.name}
        </h3>
        <ArrowRight className="w-5 h-5 text-[var(--color-text-tertiary)]" />
        <h3 className="font-medium text-[var(--color-text-primary)]">{toScenario.name}</h3>
      </div>

      <div className="space-y-4">
        {/* Starting NOI */}
        <div className="flex items-center justify-between py-2 border-b border-[var(--color-border-default)]">
          <span className="text-sm text-[var(--color-text-secondary)]">Starting NOI</span>
          <span className="font-medium tabular-nums">{formatCurrency(fromScenario.metrics.noi)}</span>
        </div>

        {/* Revenue change */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Revenue Change</span>
          <span className={cn('font-medium tabular-nums', revDiff >= 0 ? 'text-green-600' : 'text-red-600')}>
            {revDiff >= 0 ? '+' : ''}{formatCurrency(revDiff)}
          </span>
        </div>

        {/* Expense change */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm text-[var(--color-text-secondary)]">Expense Change</span>
          <span className={cn('font-medium tabular-nums', expDiff <= 0 ? 'text-green-600' : 'text-red-600')}>
            {expDiff >= 0 ? '+' : ''}{formatCurrency(expDiff)}
          </span>
        </div>

        {/* Net change */}
        <div className="flex items-center justify-between py-2 border-t border-[var(--color-border-default)]">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Net NOI Change</span>
          <span className={cn('font-semibold tabular-nums', noiDiff >= 0 ? 'text-green-600' : 'text-red-600')}>
            {noiDiff >= 0 ? '+' : ''}{formatCurrency(noiDiff)}
          </span>
        </div>

        {/* Ending NOI */}
        <div className="flex items-center justify-between py-3 bg-[var(--gray-50)] rounded-lg px-3">
          <span className="text-sm font-medium text-[var(--color-text-primary)]">Ending NOI</span>
          <span className="font-bold text-lg tabular-nums">{formatCurrency(toScenario.metrics.noi)}</span>
        </div>
      </div>
    </div>
  );
}
