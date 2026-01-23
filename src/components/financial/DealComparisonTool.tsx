'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Scale, Building2, DollarSign, Percent, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { DealComparisonChart, type DealStructureMetrics } from '@/components/charts';

// ============================================================================
// Types
// ============================================================================

interface DealInputs {
  purchasePrice: number;
  propertyNoi: number;
  facilityEbitdar: number;
  beds: number;
  holdYears: number;
  noiGrowth: number;
  exitCapRate: number;
}

interface StructureConfig {
  enabled: boolean;
  // Conventional
  ltv?: number;
  interestRate?: number;
  amortYears?: number;
  // Sale-Leaseback
  capRate?: number;
  buyerYield?: number;
  // Lease Buyout
  buyoutAmount?: number;
  currentRent?: number;
}

interface ComparisonResult {
  structures: DealStructureMetrics[];
  recommendation: {
    structure: string;
    rationale: string;
  };
}

export interface DealComparisonToolProps {
  initialInputs?: Partial<DealInputs>;
  onCompare?: (result: ComparisonResult) => void;
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

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function calculateIRR(cashFlows: number[]): number {
  let rate = 0.1;
  const maxIterations = 100;
  const tolerance = 0.0001;

  for (let i = 0; i < maxIterations; i++) {
    let npv = 0;
    let derivative = 0;

    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      if (t > 0) {
        derivative -= t * cashFlows[t] / Math.pow(1 + rate, t + 1);
      }
    }

    if (Math.abs(npv) < tolerance) break;
    if (derivative === 0) break;

    rate = rate - npv / derivative;
  }

  return isFinite(rate) && rate > -1 ? rate : 0;
}

function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cf, t) => npv + cf / Math.pow(1 + discountRate, t), 0);
}

// ============================================================================
// Component
// ============================================================================

export function DealComparisonTool({
  initialInputs,
  onCompare,
  className,
}: DealComparisonToolProps) {
  const [inputs, setInputs] = React.useState<DealInputs>({
    purchasePrice: initialInputs?.purchasePrice ?? 25_000_000,
    propertyNoi: initialInputs?.propertyNoi ?? 2_500_000,
    facilityEbitdar: initialInputs?.facilityEbitdar ?? 3_500_000,
    beds: initialInputs?.beds ?? 120,
    holdYears: initialInputs?.holdYears ?? 10,
    noiGrowth: initialInputs?.noiGrowth ?? 0.02,
    exitCapRate: initialInputs?.exitCapRate ?? 0.125,
  });

  const [structures, setStructures] = React.useState<Record<string, StructureConfig>>({
    cash: { enabled: true },
    conventional: {
      enabled: true,
      ltv: 0.70,
      interestRate: 0.075,
      amortYears: 25,
    },
    saleLeaseback: {
      enabled: true,
      capRate: 0.125,
      buyerYield: 0.09,
    },
  });

  const [result, setResult] = React.useState<ComparisonResult | null>(null);

  const updateInput = (field: keyof DealInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const updateStructure = (key: string, field: string, value: number | boolean) => {
    setStructures((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const handleCompare = () => {
    const comparedStructures: DealStructureMetrics[] = [];
    const discountRate = 0.10;

    // Calculate terminal NOI and exit value
    const terminalNoi = inputs.propertyNoi * Math.pow(1 + inputs.noiGrowth, inputs.holdYears);
    const exitValue = terminalNoi / inputs.exitCapRate;

    // 1. Cash Purchase
    if (structures.cash.enabled) {
      const equityRequired = inputs.purchasePrice;
      const cashFlows = [-equityRequired];

      for (let y = 1; y <= inputs.holdYears; y++) {
        const yearNoi = inputs.propertyNoi * Math.pow(1 + inputs.noiGrowth, y);
        cashFlows.push(yearNoi);
      }
      cashFlows[inputs.holdYears] += exitValue * 0.98; // Less 2% selling costs

      const irr = calculateIRR(cashFlows);
      const totalCashFlows = cashFlows.slice(1).reduce((a, b) => a + b, 0);
      const equityMultiple = totalCashFlows / equityRequired;
      const cashOnCash = (inputs.propertyNoi / equityRequired);
      const npv = calculateNPV(cashFlows, discountRate);

      comparedStructures.push({
        name: 'All Cash Purchase',
        irr,
        equityMultiple,
        cashOnCash,
        equityRequired,
        npv,
        riskScore: 2, // Low risk
      });
    }

    // 2. Conventional Financing
    if (structures.conventional.enabled) {
      const config = structures.conventional;
      const loanAmount = inputs.purchasePrice * (config.ltv ?? 0.70);
      const equityRequired = inputs.purchasePrice - loanAmount;

      // Calculate annual debt service
      const monthlyRate = (config.interestRate ?? 0.075) / 12;
      const numPayments = (config.amortYears ?? 25) * 12;
      const monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
      const annualDebtService = monthlyPayment * 12;

      // Calculate remaining balance at exit
      let balance = loanAmount;
      for (let month = 1; month <= inputs.holdYears * 12; month++) {
        const interest = balance * monthlyRate;
        const principal = monthlyPayment - interest;
        balance -= principal;
      }

      const cashFlows = [-equityRequired];
      for (let y = 1; y <= inputs.holdYears; y++) {
        const yearNoi = inputs.propertyNoi * Math.pow(1 + inputs.noiGrowth, y);
        cashFlows.push(yearNoi - annualDebtService);
      }
      cashFlows[inputs.holdYears] += (exitValue * 0.98) - balance;

      const irr = calculateIRR(cashFlows);
      const totalCashFlows = cashFlows.slice(1).reduce((a, b) => a + b, 0);
      const equityMultiple = totalCashFlows / equityRequired;
      const cashOnCash = (inputs.propertyNoi - annualDebtService) / equityRequired;
      const npv = calculateNPV(cashFlows, discountRate);

      // Calculate DSCR
      const dscr = inputs.propertyNoi / annualDebtService;
      const riskScore = dscr < 1.25 ? 7 : dscr < 1.4 ? 5 : 4;

      comparedStructures.push({
        name: 'Conventional Financing',
        irr,
        equityMultiple,
        cashOnCash,
        equityRequired,
        npv,
        riskScore,
      });
    }

    // 3. Sale-Leaseback
    if (structures.saleLeaseback.enabled) {
      const config = structures.saleLeaseback;
      const salePrice = inputs.propertyNoi / (config.capRate ?? 0.125);
      const annualRent = salePrice * (config.buyerYield ?? 0.09);

      // Operator cash flow after rent
      const equityRequired = 0; // No equity needed
      const cashFlows = [0]; // No initial investment (assuming existing owner)

      for (let y = 1; y <= inputs.holdYears; y++) {
        const yearEbitdar = inputs.facilityEbitdar * Math.pow(1 + inputs.noiGrowth, y);
        const yearRent = annualRent * Math.pow(1 + 0.025, y - 1); // 2.5% annual escalation
        cashFlows.push(yearEbitdar - yearRent);
      }

      // No terminal value since you don't own the property
      const totalCashFlow = cashFlows.slice(1).reduce((a, b) => a + b, 0);
      const avgAnnualCashFlow = totalCashFlow / inputs.holdYears;
      const coverage = inputs.facilityEbitdar / annualRent;

      // For sale-leaseback, metrics are different
      comparedStructures.push({
        name: 'Sale-Leaseback',
        irr: 0, // N/A - no equity invested
        equityMultiple: 0, // N/A
        cashOnCash: 0, // No equity base
        equityRequired: 0,
        npv: calculateNPV(cashFlows, discountRate),
        riskScore: coverage < 1.4 ? 8 : coverage < 1.6 ? 5 : 3,
      });
    }

    // Determine recommendation
    const eligibleStructures = comparedStructures.filter(
      (s) => s.name !== 'Sale-Leaseback' || s.riskScore <= 5
    );

    // Rank by risk-adjusted IRR
    const ranked = [...eligibleStructures]
      .filter((s) => s.irr > 0)
      .sort((a, b) => {
        // Risk-adjusted score: IRR minus risk penalty
        const aScore = a.irr - a.riskScore * 0.01;
        const bScore = b.irr - b.riskScore * 0.01;
        return bScore - aScore;
      });

    const recommended = ranked[0] ?? comparedStructures[0];
    if (recommended) {
      recommended.isRecommended = true;
    }

    let rationale = '';
    if (recommended) {
      if (recommended.name === 'All Cash Purchase') {
        rationale = 'All-cash provides the lowest risk profile with stable, predictable returns. Best for risk-averse investors with available capital.';
      } else if (recommended.name === 'Conventional Financing') {
        rationale = `Conventional financing offers leveraged returns of ${formatPercent(recommended.irr)} IRR with acceptable debt coverage. Good balance of return and risk.`;
      } else if (recommended.name === 'Sale-Leaseback') {
        rationale = 'Sale-leaseback allows capital extraction while maintaining operations. Consider if you need liquidity without selling the business.';
      }
    }

    const newResult: ComparisonResult = {
      structures: comparedStructures,
      recommendation: {
        structure: recommended?.name ?? 'None',
        rationale,
      },
    };

    setResult(newResult);
    onCompare?.(newResult);
  };

  // Auto-compare
  React.useEffect(() => {
    handleCompare();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs, structures]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Deal Structure Comparison Tool
          </CardTitle>
          <CardDescription>
            Compare financing alternatives to find the optimal deal structure
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Deal Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Deal Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={inputs.purchasePrice}
                  onChange={(e) => updateInput('purchasePrice', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Property NOI</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={inputs.propertyNoi}
                  onChange={(e) => updateInput('propertyNoi', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Facility EBITDAR</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={inputs.facilityEbitdar}
                  onChange={(e) => updateInput('facilityEbitdar', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Number of Beds</Label>
              <Input
                type="number"
                value={inputs.beds}
                onChange={(e) => updateInput('beds', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Hold Period (years)</Label>
              <Input
                type="number"
                value={inputs.holdYears}
                onChange={(e) => updateInput('holdYears', parseInt(e.target.value) || 10)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>NOI Growth Rate</Label>
                <span className="text-sm font-medium">{formatPercent(inputs.noiGrowth)}</span>
              </div>
              <Slider
                value={[inputs.noiGrowth * 100]}
                onValueChange={(v: number[]) => updateInput('noiGrowth', v[0] / 100)}
                min={0}
                max={5}
                step={0.25}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Structure Configurations */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Cash Purchase */}
        <Card className={cn(!structures.cash.enabled && 'opacity-60')}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">All Cash</CardTitle>
              <input
                type="checkbox"
                checked={structures.cash.enabled}
                onChange={(e) => updateStructure('cash', 'enabled', e.target.checked)}
                className="rounded"
              />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No financing - full equity purchase
            </p>
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Equity: </span>
              <span className="font-medium">{formatCurrency(inputs.purchasePrice)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Conventional Financing */}
        <Card className={cn(!structures.conventional.enabled && 'opacity-60')}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Conventional</CardTitle>
              <input
                type="checkbox"
                checked={structures.conventional.enabled}
                onChange={(e) => updateStructure('conventional', 'enabled', e.target.checked)}
                className="rounded"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>LTV</span>
                <span>{formatPercent(structures.conventional.ltv ?? 0.70)}</span>
              </div>
              <Slider
                value={[(structures.conventional.ltv ?? 0.70) * 100]}
                onValueChange={(v: number[]) => updateStructure('conventional', 'ltv', v[0] / 100)}
                min={50}
                max={80}
                step={5}
                disabled={!structures.conventional.enabled}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Rate</span>
                <span>{formatPercent(structures.conventional.interestRate ?? 0.075)}</span>
              </div>
              <Slider
                value={[(structures.conventional.interestRate ?? 0.075) * 100]}
                onValueChange={(v: number[]) => updateStructure('conventional', 'interestRate', v[0] / 100)}
                min={5}
                max={12}
                step={0.25}
                disabled={!structures.conventional.enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sale-Leaseback */}
        <Card className={cn(!structures.saleLeaseback.enabled && 'opacity-60')}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Sale-Leaseback</CardTitle>
              <input
                type="checkbox"
                checked={structures.saleLeaseback.enabled}
                onChange={(e) => updateStructure('saleLeaseback', 'enabled', e.target.checked)}
                className="rounded"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Cap Rate</span>
                <span>{formatPercent(structures.saleLeaseback.capRate ?? 0.125)}</span>
              </div>
              <Slider
                value={[(structures.saleLeaseback.capRate ?? 0.125) * 100]}
                onValueChange={(v: number[]) => updateStructure('saleLeaseback', 'capRate', v[0] / 100)}
                min={8}
                max={16}
                step={0.25}
                disabled={!structures.saleLeaseback.enabled}
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Buyer Yield</span>
                <span>{formatPercent(structures.saleLeaseback.buyerYield ?? 0.09)}</span>
              </div>
              <Slider
                value={[(structures.saleLeaseback.buyerYield ?? 0.09) * 100]}
                onValueChange={(v: number[]) => updateStructure('saleLeaseback', 'buyerYield', v[0] / 100)}
                min={7}
                max={12}
                step={0.25}
                disabled={!structures.saleLeaseback.enabled}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && result.structures.length > 0 && (
        <>
          {/* Recommendation */}
          <Card className="border-primary">
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <Award className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-lg">
                    Recommended: {result.recommendation.structure}
                  </div>
                  <p className="text-muted-foreground mt-1">
                    {result.recommendation.rationale}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Structure Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <DealComparisonChart structures={result.structures} />
            </CardContent>
          </Card>

          {/* Key Metrics Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detailed Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-3">Structure</th>
                      <th className="text-right py-2 px-3">IRR</th>
                      <th className="text-right py-2 px-3">Multiple</th>
                      <th className="text-right py-2 px-3">Cash-on-Cash</th>
                      <th className="text-right py-2 px-3">Equity</th>
                      <th className="text-right py-2 px-3">NPV</th>
                      <th className="text-center py-2 px-3">Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.structures.map((s, i) => (
                      <tr
                        key={i}
                        className={cn(
                          'border-b border-slate-100 dark:border-slate-800',
                          s.isRecommended && 'bg-primary/5'
                        )}
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            {s.name}
                            {s.isRecommended && (
                              <Badge variant="default" className="text-xs">Recommended</Badge>
                            )}
                          </div>
                        </td>
                        <td className="text-right py-2 px-3">
                          {s.irr > 0 ? (
                            <span className={cn(
                              'font-medium',
                              s.irr >= 0.15 ? 'text-emerald-600' :
                              s.irr >= 0.10 ? 'text-amber-600' : ''
                            )}>
                              {formatPercent(s.irr)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-3">
                          {s.equityMultiple > 0 ? (
                            `${s.equityMultiple.toFixed(2)}x`
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-3">
                          {s.cashOnCash > 0 ? formatPercent(s.cashOnCash) : '-'}
                        </td>
                        <td className="text-right py-2 px-3">
                          {s.equityRequired > 0 ? formatCurrency(s.equityRequired) : '$0'}
                        </td>
                        <td className={cn(
                          'text-right py-2 px-3 font-medium',
                          s.npv >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                          {formatCurrency(s.npv)}
                        </td>
                        <td className="text-center py-2 px-3">
                          <Badge variant={
                            s.riskScore <= 3 ? 'default' :
                            s.riskScore <= 6 ? 'secondary' : 'destructive'
                          }>
                            {s.riskScore <= 3 ? 'Low' : s.riskScore <= 6 ? 'Medium' : 'High'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default DealComparisonTool;
