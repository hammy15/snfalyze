'use client';

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, TrendingDown, Minus, Plus, X, BarChart3 } from 'lucide-react';
import { formatCurrency, formatPercent, formatNumber } from './types';

interface ScenarioData {
  id: string;
  name: string;
  type: 'baseline' | 'upside' | 'downside' | 'custom';
  assumptions: {
    revenueGrowth: number;
    expenseGrowth: number;
    occupancyTarget: number;
    rentEscalation: number;
  };
  projections: {
    year: number;
    revenue: number;
    expenses: number;
    ebitdar: number;
    rent: number;
    ebitda: number;
    ebitdaMargin: number;
    occupancy: number;
  }[];
}

interface ScenarioComparisonProps {
  dealId: string;
  dealName: string;
  availableScenarios: ScenarioData[];
  onCreateScenario?: () => void;
}

const SCENARIO_COLORS: Record<string, string> = {
  baseline: 'bg-blue-500',
  upside: 'bg-green-500',
  downside: 'bg-red-500',
  custom: 'bg-purple-500',
};

const SCENARIO_BADGES: Record<string, string> = {
  baseline: 'Base Case',
  upside: 'Upside',
  downside: 'Downside',
  custom: 'Custom',
};

export function ScenarioComparison({
  dealId,
  dealName,
  availableScenarios,
  onCreateScenario,
}: ScenarioComparisonProps) {
  const [selectedScenarios, setSelectedScenarios] = useState<string[]>([]);
  const [comparisonYear, setComparisonYear] = useState<number>(5);

  // Update selected scenarios when availableScenarios changes
  useEffect(() => {
    if (availableScenarios.length > 0 && selectedScenarios.length === 0) {
      setSelectedScenarios(availableScenarios.slice(0, 2).map((s) => s.id));
    }
  }, [availableScenarios, selectedScenarios.length]);

  const scenarios = useMemo(
    () => availableScenarios.filter((s) => selectedScenarios.includes(s.id)),
    [availableScenarios, selectedScenarios]
  );

  const baseScenario = scenarios[0];
  const projectionYears = baseScenario?.projections.length || 5;

  const handleAddScenario = (scenarioId: string) => {
    if (!selectedScenarios.includes(scenarioId) && selectedScenarios.length < 4) {
      setSelectedScenarios([...selectedScenarios, scenarioId]);
    }
  };

  const handleRemoveScenario = (scenarioId: string) => {
    if (selectedScenarios.length > 1) {
      setSelectedScenarios(selectedScenarios.filter((id) => id !== scenarioId));
    }
  };

  const calculateDifference = (value: number, baseValue: number): number => {
    if (baseValue === 0) return 0;
    return ((value - baseValue) / baseValue) * 100;
  };

  const formatDifference = (diff: number): string => {
    const prefix = diff > 0 ? '+' : '';
    return `${prefix}${diff.toFixed(1)}%`;
  };

  const getMetricForYear = (scenario: ScenarioData, metric: keyof ScenarioData['projections'][0], yearIndex: number) => {
    return scenario.projections[yearIndex]?.[metric] ?? 0;
  };

  const calculateCAGR = (scenario: ScenarioData, metric: 'revenue' | 'ebitda' | 'ebitdar'): number => {
    const startValue = scenario.projections[0]?.[metric] ?? 0;
    const endValue = scenario.projections[scenario.projections.length - 1]?.[metric] ?? 0;
    const years = scenario.projections.length - 1;
    if (startValue <= 0 || endValue <= 0 || years <= 0) return 0;
    return Math.pow(endValue / startValue, 1 / years) - 1;
  };

  if (availableScenarios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Scenario Comparison
          </CardTitle>
          <CardDescription>Compare multiple pro forma scenarios side by side</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No scenarios available for comparison</p>
            {onCreateScenario && (
              <Button onClick={onCreateScenario}>
                <Plus className="h-4 w-4 mr-2" />
                Create Scenario
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Scenario Comparison
            </CardTitle>
            <CardDescription>{dealName} - Compare pro forma scenarios</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={comparisonYear.toString()}
              onValueChange={(v) => setComparisonYear(parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: projectionYears }, (_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    Year {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableScenarios.length > selectedScenarios.length && selectedScenarios.length < 4 && (
              <Select onValueChange={handleAddScenario}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Add scenario..." />
                </SelectTrigger>
                <SelectContent>
                  {availableScenarios
                    .filter((s) => !selectedScenarios.includes(s.id))
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Selected Scenarios Badges */}
        <div className="flex items-center gap-2 mb-6">
          {scenarios.map((scenario, index) => (
            <Badge
              key={scenario.id}
              variant="outline"
              className="flex items-center gap-2 py-1.5 px-3"
            >
              <div className={`w-2 h-2 rounded-full ${SCENARIO_COLORS[scenario.type]}`} />
              <span>{scenario.name}</span>
              {index > 0 && selectedScenarios.length > 1 && (
                <button
                  onClick={() => handleRemoveScenario(scenario.id)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-3 font-medium">Metric</th>
                {scenarios.map((scenario, index) => (
                  <th key={scenario.id} className="text-right py-3 px-3 font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <div className={`w-2 h-2 rounded-full ${SCENARIO_COLORS[scenario.type]}`} />
                      {scenario.name}
                    </div>
                    <div className="text-xs font-normal text-muted-foreground">
                      {SCENARIO_BADGES[scenario.type]}
                    </div>
                  </th>
                ))}
                {scenarios.length > 1 && (
                  <th className="text-right py-3 px-3 font-medium bg-muted/50">
                    Variance
                    <div className="text-xs font-normal text-muted-foreground">vs Base</div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {/* Assumptions Section */}
              <tr className="bg-muted/30">
                <td colSpan={scenarios.length + 2} className="py-2 px-3 font-semibold text-xs uppercase tracking-wide">
                  Assumptions
                </td>
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">Revenue Growth Rate</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatPercent(scenario.assumptions.revenueGrowth)}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={scenarios[1].assumptions.revenueGrowth}
                        baseValue={scenarios[0].assumptions.revenueGrowth}
                        isPercent
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">Expense Growth Rate</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatPercent(scenario.assumptions.expenseGrowth)}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={scenarios[1].assumptions.expenseGrowth}
                        baseValue={scenarios[0].assumptions.expenseGrowth}
                        isPercent
                        invertColors
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">Target Occupancy</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatPercent(scenario.assumptions.occupancyTarget)}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={scenarios[1].assumptions.occupancyTarget}
                        baseValue={scenarios[0].assumptions.occupancyTarget}
                        isPercent
                      />
                    )}
                  </td>
                )}
              </tr>

              {/* Year N Projections Section */}
              <tr className="bg-muted/30">
                <td colSpan={scenarios.length + 2} className="py-2 px-3 font-semibold text-xs uppercase tracking-wide">
                  Year {comparisonYear} Projections
                </td>
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">Revenue</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatCurrency(getMetricForYear(scenario, 'revenue', comparisonYear - 1))}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={getMetricForYear(scenarios[1], 'revenue', comparisonYear - 1)}
                        baseValue={getMetricForYear(scenarios[0], 'revenue', comparisonYear - 1)}
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">Operating Expenses</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatCurrency(getMetricForYear(scenario, 'expenses', comparisonYear - 1))}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={getMetricForYear(scenarios[1], 'expenses', comparisonYear - 1)}
                        baseValue={getMetricForYear(scenarios[0], 'expenses', comparisonYear - 1)}
                        invertColors
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30 bg-primary/5 font-semibold">
                <td className="py-2 px-3">EBITDAR</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatCurrency(getMetricForYear(scenario, 'ebitdar', comparisonYear - 1))}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={getMetricForYear(scenarios[1], 'ebitdar', comparisonYear - 1)}
                        baseValue={getMetricForYear(scenarios[0], 'ebitdar', comparisonYear - 1)}
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">Rent</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatCurrency(getMetricForYear(scenario, 'rent', comparisonYear - 1))}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={getMetricForYear(scenarios[1], 'rent', comparisonYear - 1)}
                        baseValue={getMetricForYear(scenarios[0], 'rent', comparisonYear - 1)}
                        invertColors
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30 bg-primary/5 font-semibold">
                <td className="py-2 px-3">EBITDA</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatCurrency(getMetricForYear(scenario, 'ebitda', comparisonYear - 1))}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={getMetricForYear(scenarios[1], 'ebitda', comparisonYear - 1)}
                        baseValue={getMetricForYear(scenarios[0], 'ebitda', comparisonYear - 1)}
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">EBITDA Margin</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    {formatPercent(getMetricForYear(scenario, 'ebitdaMargin', comparisonYear - 1))}
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={getMetricForYear(scenarios[1], 'ebitdaMargin', comparisonYear - 1)}
                        baseValue={getMetricForYear(scenarios[0], 'ebitdaMargin', comparisonYear - 1)}
                        isPercent
                        showPoints
                      />
                    )}
                  </td>
                )}
              </tr>

              {/* CAGR Section */}
              <tr className="bg-muted/30">
                <td colSpan={scenarios.length + 2} className="py-2 px-3 font-semibold text-xs uppercase tracking-wide">
                  Growth Rates (CAGR)
                </td>
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">Revenue CAGR</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    <span className={calculateCAGR(scenario, 'revenue') >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(calculateCAGR(scenario, 'revenue'))}
                    </span>
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={calculateCAGR(scenarios[1], 'revenue')}
                        baseValue={calculateCAGR(scenarios[0], 'revenue')}
                        isPercent
                        showPoints
                      />
                    )}
                  </td>
                )}
              </tr>
              <tr className="border-b border-muted/30">
                <td className="py-2 px-3">EBITDA CAGR</td>
                {scenarios.map((scenario) => (
                  <td key={scenario.id} className="py-2 px-3 text-right tabular-nums">
                    <span className={calculateCAGR(scenario, 'ebitda') >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatPercent(calculateCAGR(scenario, 'ebitda'))}
                    </span>
                  </td>
                ))}
                {scenarios.length > 1 && (
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {scenarios[1] && (
                      <DifferenceIndicator
                        value={calculateCAGR(scenarios[1], 'ebitda')}
                        baseValue={calculateCAGR(scenarios[0], 'ebitda')}
                        isPercent
                        showPoints
                      />
                    )}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t">
          {scenarios.slice(0, 2).map((scenario, index) => (
            <div key={scenario.id} className="text-center p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${SCENARIO_COLORS[scenario.type]}`} />
                <span className="text-xs font-medium">{scenario.name}</span>
              </div>
              <div className="text-2xl font-bold tabular-nums">
                {formatCurrency(getMetricForYear(scenario, 'ebitda', comparisonYear - 1))}
              </div>
              <div className="text-xs text-muted-foreground">Y{comparisonYear} EBITDA</div>
            </div>
          ))}
          {scenarios.length > 1 && (
            <>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xs font-medium mb-2 text-muted-foreground">EBITDA Difference</div>
                <div className="text-2xl font-bold tabular-nums">
                  {formatCurrency(
                    getMetricForYear(scenarios[1], 'ebitda', comparisonYear - 1) -
                    getMetricForYear(scenarios[0], 'ebitda', comparisonYear - 1)
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Y{comparisonYear} Delta</div>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <div className="text-xs font-medium mb-2 text-muted-foreground">Margin Spread</div>
                <div className="text-2xl font-bold tabular-nums">
                  {((getMetricForYear(scenarios[1], 'ebitdaMargin', comparisonYear - 1) -
                    getMetricForYear(scenarios[0], 'ebitdaMargin', comparisonYear - 1)) * 100).toFixed(1)} pts
                </div>
                <div className="text-xs text-muted-foreground">Y{comparisonYear} Margin Gap</div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Helper component for displaying differences
function DifferenceIndicator({
  value,
  baseValue,
  isPercent = false,
  showPoints = false,
  invertColors = false,
}: {
  value: number;
  baseValue: number;
  isPercent?: boolean;
  showPoints?: boolean;
  invertColors?: boolean;
}) {
  const diff = isPercent
    ? showPoints
      ? (value - baseValue) * 100
      : ((value - baseValue) / (baseValue || 1)) * 100
    : ((value - baseValue) / (baseValue || 1)) * 100;

  const isPositive = invertColors ? diff < 0 : diff > 0;
  const isNeutral = Math.abs(diff) < 0.1;

  if (isNeutral) {
    return (
      <span className="flex items-center justify-end gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        0.0{showPoints ? ' pts' : '%'}
      </span>
    );
  }

  return (
    <span className={`flex items-center justify-end gap-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {diff > 0 ? '+' : ''}{diff.toFixed(1)}{showPoints ? ' pts' : '%'}
    </span>
  );
}

export default ScenarioComparison;
