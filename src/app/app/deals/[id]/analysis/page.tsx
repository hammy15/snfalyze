'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calculator,
  TrendingUp,
  Settings,
  BarChart3,
  Loader2,
  RefreshCw,
  Save,
  AlertCircle,
} from 'lucide-react';
import {
  ValuationMethodsGrid,
  InteractiveSensitivity,
  ParameterAdjuster,
  MonteCarloVisualization,
  type SensitivityParameter,
  type SensitivityResult,
  type ParameterGroup,
  type DistributionConfig,
} from '@/components/analysis';
import type { ValuationResult } from '@/lib/analysis/types';
import type { MonteCarloResult } from '@/lib/analysis/realtime';

// ============================================================================
// Mock Data (would come from API in real implementation)
// ============================================================================

const MOCK_VALUATION_RESULT: ValuationResult = {
  facilityId: 'demo',
  valuationDate: new Date().toISOString(),
  assetType: 'SNF',
  methods: {
    capRate: {
      name: 'Cap Rate',
      value: 12500000,
      confidence: 'high',
      weight: 0.30,
      weightedValue: 3750000,
      inputs: { noi: 1200000, capRate: 0.096 },
      adjustments: [
        { description: 'Quality Rating adjustment', impact: 0.05 },
        { description: 'Location premium', impact: 0.03 },
      ],
    },
    pricePerBed: {
      name: 'Price Per Bed',
      value: 11000000,
      confidence: 'medium',
      weight: 0.20,
      weightedValue: 2200000,
      inputs: { beds: 100, pricePerBed: 110000 },
      adjustments: [{ description: 'Occupancy discount', impact: -0.08 }],
    },
    dcf: {
      name: 'DCF',
      value: 13200000,
      confidence: 'medium',
      weight: 0.20,
      weightedValue: 2640000,
      inputs: { discountRate: 0.10, terminalCapRate: 0.095, holdPeriod: 10 },
      adjustments: [],
    },
    noiMultiple: {
      name: 'NOI Multiple',
      value: 12000000,
      confidence: 'medium',
      weight: 0.10,
      weightedValue: 1200000,
      inputs: { noi: 1200000, multiple: 10 },
      adjustments: [],
    },
    comparableSales: {
      name: 'Comparable Sales',
      value: 11800000,
      confidence: 'low',
      weight: 0.10,
      weightedValue: 1180000,
      inputs: { comparableCount: 3, avgAdjustment: 0.05 },
      adjustments: [],
    },
    replacementCost: {
      name: 'Replacement Cost',
      value: 14500000,
      confidence: 'high',
      weight: 0.10,
      weightedValue: 1450000,
      inputs: { costPerSqFt: 250, sqFt: 60000, depreciation: 0.03 },
      adjustments: [],
    },
  },
  reconciledValue: 12400000,
  valuePerBed: 124000,
  impliedCapRate: 0.097,
  valueLow: 11000000,
  valueMid: 12400000,
  valueHigh: 14000000,
  overallConfidence: 'medium',
  confidenceFactors: ['6 methods applied', 'Low variance across methods'],
};

const SENSITIVITY_PARAMETERS: SensitivityParameter[] = [
  {
    id: 'capRate',
    name: 'Cap Rate',
    path: 'capRate.baseCapRate',
    value: 0.095,
    defaultValue: 0.095,
    min: 0.07,
    max: 0.13,
    step: 0.005,
    unit: 'percent',
  },
  {
    id: 'occupancy',
    name: 'Occupancy Rate',
    path: 'operatingMetrics.occupancyRate',
    value: 0.85,
    defaultValue: 0.85,
    min: 0.6,
    max: 0.98,
    step: 0.01,
    unit: 'percent',
  },
  {
    id: 'discountRate',
    name: 'Discount Rate',
    path: 'dcf.discountRate',
    value: 0.10,
    defaultValue: 0.10,
    min: 0.08,
    max: 0.14,
    step: 0.005,
    unit: 'percent',
  },
  {
    id: 'revenueGrowth',
    name: 'Revenue Growth',
    path: 'dcf.revenueGrowth',
    value: 0.025,
    defaultValue: 0.025,
    min: 0,
    max: 0.05,
    step: 0.005,
    unit: 'percent',
  },
];

const PARAMETER_GROUPS: ParameterGroup[] = [
  {
    id: 'weights',
    name: 'Method Weights',
    description: 'Adjust the relative importance of each valuation method',
    parameters: [
      {
        id: 'capRateWeight',
        path: 'methodWeights.capRate',
        name: 'Cap Rate Weight',
        type: 'percent',
        value: 0.30,
        defaultValue: 0.30,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        id: 'pricePerBedWeight',
        path: 'methodWeights.pricePerBed',
        name: 'Price Per Bed Weight',
        type: 'percent',
        value: 0.20,
        defaultValue: 0.20,
        min: 0,
        max: 1,
        step: 0.05,
      },
      {
        id: 'dcfWeight',
        path: 'methodWeights.dcf',
        name: 'DCF Weight',
        type: 'percent',
        value: 0.20,
        defaultValue: 0.20,
        min: 0,
        max: 1,
        step: 0.05,
      },
    ],
  },
  {
    id: 'capRate',
    name: 'Cap Rate Settings',
    parameters: [
      {
        id: 'baseCapRate',
        path: 'capRate.baseCapRate',
        name: 'Base Cap Rate',
        type: 'percent',
        value: 0.095,
        defaultValue: 0.095,
        min: 0.05,
        max: 0.15,
        step: 0.005,
      },
      {
        id: 'qualityAdjustment',
        path: 'capRate.qualityAdjustment',
        name: 'Quality Adjustment',
        type: 'boolean',
        value: true,
        defaultValue: true,
      },
    ],
  },
];

const MONTE_CARLO_DISTRIBUTIONS: DistributionConfig[] = [
  {
    parameter: 'capRate.baseCapRate',
    name: 'Cap Rate',
    distribution: 'triangular',
    params: { min: 0.08, mode: 0.095, max: 0.12 },
  },
  {
    parameter: 'operatingMetrics.occupancyRate',
    name: 'Occupancy',
    distribution: 'normal',
    params: { mean: 0.85, stdDev: 0.05 },
  },
  {
    parameter: 'dcf.discountRate',
    name: 'Discount Rate',
    distribution: 'uniform',
    params: { min: 0.08, max: 0.12 },
  },
];

// ============================================================================
// Main Component
// ============================================================================

export default function DealAnalysisPage() {
  const params = useParams();
  const dealId = params.id as string;

  const [activeTab, setActiveTab] = React.useState('valuation');
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRecalculating, setIsRecalculating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // State for each section
  const [valuationResult, setValuationResult] =
    React.useState<ValuationResult>(MOCK_VALUATION_RESULT);
  const [sensitivityParams, setSensitivityParams] =
    React.useState<SensitivityParameter[]>(SENSITIVITY_PARAMETERS);
  const [sensitivityResults, setSensitivityResults] = React.useState<SensitivityResult[]>([]);
  const [currentValuation, setCurrentValuation] = React.useState(
    MOCK_VALUATION_RESULT.reconciledValue
  );
  const [parameterGroups, setParameterGroups] = React.useState<ParameterGroup[]>(PARAMETER_GROUPS);
  const [monteCarloResult, setMonteCarloResult] = React.useState<MonteCarloResult | null>(null);
  const [monteCarloDistributions, setMonteCarloDistributions] =
    React.useState<DistributionConfig[]>(MONTE_CARLO_DISTRIBUTIONS);
  const [isRunningMonteCarlo, setIsRunningMonteCarlo] = React.useState(false);

  // Handle sensitivity parameter change
  const handleSensitivityChange = (parameterId: string, value: number) => {
    setSensitivityParams((prev) =>
      prev.map((p) => (p.id === parameterId ? { ...p, value } : p))
    );

    // Trigger recalculation (debounced in real implementation)
    setIsRecalculating(true);
    setTimeout(() => {
      // Mock recalculation - would call API in real implementation
      const variance = (Math.random() - 0.5) * 0.1;
      setCurrentValuation(MOCK_VALUATION_RESULT.reconciledValue * (1 + variance));
      setIsRecalculating(false);
    }, 200);
  };

  // Handle sensitivity reset
  const handleSensitivityReset = () => {
    setSensitivityParams(SENSITIVITY_PARAMETERS);
    setCurrentValuation(MOCK_VALUATION_RESULT.reconciledValue);
  };

  // Handle parameter change
  const handleParameterChange = (path: string, value: unknown) => {
    setParameterGroups((prev) =>
      prev.map((g) => ({
        ...g,
        parameters: g.parameters.map((p) => (p.path === path ? { ...p, value } : p)),
      }))
    );
  };

  // Handle Monte Carlo run
  const handleRunMonteCarlo = async (iterations: number) => {
    setIsRunningMonteCarlo(true);
    setError(null);

    try {
      const response = await fetch('/api/analysis/monte-carlo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          iterations,
          distributions: monteCarloDistributions,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to run Monte Carlo simulation');
      }

      const data = await response.json();
      setMonteCarloResult({
        iterations: data.iterations,
        mean: data.statistics.mean,
        median: data.statistics.median,
        stdDev: data.statistics.stdDev,
        min: data.statistics.min,
        max: data.statistics.max,
        percentiles: data.percentiles,
        distribution: data.distribution,
        calculationTime: data.calculationTime,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Simulation failed');
    } finally {
      setIsRunningMonteCarlo(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Interactive Analysis</h1>
          <p className="text-muted-foreground">
            Explore valuations, adjust parameters, and run simulations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
          <Button>
            <Save className="h-4 w-4 mr-2" />
            Save Analysis
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="bg-rose-500/10 border-rose-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setError(null)}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="valuation" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Valuation Methods
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Sensitivity Analysis
          </TabsTrigger>
          <TabsTrigger value="parameters" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Algorithm Parameters
          </TabsTrigger>
          <TabsTrigger value="montecarlo" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Monte Carlo
          </TabsTrigger>
        </TabsList>

        {/* Valuation Methods */}
        <TabsContent value="valuation" className="mt-6">
          <ValuationMethodsGrid
            result={valuationResult}
            highlightRecommended
          />
        </TabsContent>

        {/* Sensitivity Analysis */}
        <TabsContent value="sensitivity" className="mt-6">
          <InteractiveSensitivity
            parameters={sensitivityParams}
            sensitivityResults={sensitivityResults}
            baselineValuation={MOCK_VALUATION_RESULT.reconciledValue}
            currentValuation={currentValuation}
            isCalculating={isRecalculating}
            onParameterChange={handleSensitivityChange}
            onReset={handleSensitivityReset}
          />
        </TabsContent>

        {/* Algorithm Parameters */}
        <TabsContent value="parameters" className="mt-6">
          <ParameterAdjuster
            groups={parameterGroups}
            onParameterChange={handleParameterChange}
            onSave={async () => {
              // Would save to API
              await new Promise((r) => setTimeout(r, 500));
            }}
            onReset={() => setParameterGroups(PARAMETER_GROUPS)}
          />
        </TabsContent>

        {/* Monte Carlo */}
        <TabsContent value="montecarlo" className="mt-6">
          <MonteCarloVisualization
            result={monteCarloResult || undefined}
            isRunning={isRunningMonteCarlo}
            distributions={monteCarloDistributions}
            iterations={1000}
            onRun={handleRunMonteCarlo}
            onUpdateDistribution={(idx, config) => {
              setMonteCarloDistributions((prev) =>
                prev.map((d, i) => (i === idx ? config : d))
              );
            }}
            baselineValue={MOCK_VALUATION_RESULT.reconciledValue}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
