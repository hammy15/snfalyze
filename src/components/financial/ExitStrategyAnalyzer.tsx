'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { LogOut, TrendingUp, RefreshCw, Home, Award, DollarSign, Percent, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';

// ============================================================================
// Types
// ============================================================================

interface PropertyData {
  currentNoi: number;
  currentValue: number;
  debtBalance: number;
  equityInvested: number;
  annualNoiGrowth: number;
}

interface ExitScenario {
  name: string;
  type: 'sale' | 'refinance' | 'hold';
  irr: number;
  equityMultiple: number;
  grossProceeds: number;
  netProceeds: number;
  holdingPeriodYears: number;
  isRecommended?: boolean;
}

interface ExitAnalysisResult {
  scenarios: ExitScenario[];
  recommendation: string;
  rationale: string;
}

export interface ExitStrategyAnalyzerProps {
  initialValues?: Partial<PropertyData>;
  onAnalyze?: (result: ExitAnalysisResult) => void;
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
  // Newton-Raphson method for IRR
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

  return rate;
}

// ============================================================================
// Component
// ============================================================================

export function ExitStrategyAnalyzer({
  initialValues,
  onAnalyze,
  className,
}: ExitStrategyAnalyzerProps) {
  const [property, setProperty] = React.useState<PropertyData>({
    currentNoi: initialValues?.currentNoi ?? 2_500_000,
    currentValue: initialValues?.currentValue ?? 25_000_000,
    debtBalance: initialValues?.debtBalance ?? 15_000_000,
    equityInvested: initialValues?.equityInvested ?? 8_000_000,
    annualNoiGrowth: initialValues?.annualNoiGrowth ?? 0.02,
  });

  // Exit assumptions
  const [exitYear, setExitYear] = React.useState(5);
  const [saleCapRate, setSaleCapRate] = React.useState(0.12);
  const [sellingCosts, setSellingCosts] = React.useState(0.02);
  const [refinanceLtv, setRefinanceLtv] = React.useState(0.70);
  const [refinanceRate, setRefinanceRate] = React.useState(0.075);
  const [holdYears, setHoldYears] = React.useState(10);

  const [result, setResult] = React.useState<ExitAnalysisResult | null>(null);

  const updateProperty = (field: keyof PropertyData, value: number) => {
    setProperty((prev) => ({ ...prev, [field]: value }));
  };

  const handleAnalyze = () => {
    const scenarios: ExitScenario[] = [];

    // Project NOI at exit
    const exitNoi = property.currentNoi * Math.pow(1 + property.annualNoiGrowth, exitYear);
    const holdNoi = property.currentNoi * Math.pow(1 + property.annualNoiGrowth, holdYears);

    // 1. Sale Scenario
    const saleValue = exitNoi / saleCapRate;
    const saleGrossProceeds = saleValue;
    const saleNetProceeds = saleValue * (1 - sellingCosts) - property.debtBalance;

    // Sale IRR calculation
    const saleCashFlows = [-property.equityInvested];
    for (let y = 1; y <= exitYear; y++) {
      const yearNoi = property.currentNoi * Math.pow(1 + property.annualNoiGrowth, y);
      saleCashFlows.push(yearNoi * 0.3); // Assume 30% to equity after debt service
    }
    saleCashFlows[exitYear] += saleNetProceeds;

    const saleIrr = calculateIRR(saleCashFlows);
    const saleEquityMultiple = (saleNetProceeds + saleCashFlows.slice(1, -1).reduce((a, b) => a + b, 0)) / property.equityInvested;

    scenarios.push({
      name: 'Sale',
      type: 'sale',
      irr: saleIrr,
      equityMultiple: saleEquityMultiple,
      grossProceeds: saleGrossProceeds,
      netProceeds: saleNetProceeds,
      holdingPeriodYears: exitYear,
    });

    // 2. Refinance Scenario
    const refiValue = exitNoi / saleCapRate;
    const newLoanAmount = refiValue * refinanceLtv;
    const cashOutRefi = newLoanAmount - property.debtBalance;

    // Refinance IRR (cash out + continued hold)
    const refiCashFlows = [-property.equityInvested];
    for (let y = 1; y <= exitYear; y++) {
      const yearNoi = property.currentNoi * Math.pow(1 + property.annualNoiGrowth, y);
      refiCashFlows.push(yearNoi * 0.3);
    }
    refiCashFlows[exitYear] += cashOutRefi;

    const refiIrr = calculateIRR(refiCashFlows);
    const refiEquityMultiple = (cashOutRefi + refiCashFlows.slice(1, -1).reduce((a, b) => a + b, 0)) / property.equityInvested;

    scenarios.push({
      name: 'Refinance',
      type: 'refinance',
      irr: refiIrr,
      equityMultiple: refiEquityMultiple,
      grossProceeds: newLoanAmount,
      netProceeds: cashOutRefi,
      holdingPeriodYears: exitYear,
    });

    // 3. Hold Scenario (longer hold)
    const holdValue = holdNoi / saleCapRate;
    const holdGrossProceeds = holdValue;
    const holdNetProceeds = holdValue * (1 - sellingCosts) - property.debtBalance;

    const holdCashFlows = [-property.equityInvested];
    for (let y = 1; y <= holdYears; y++) {
      const yearNoi = property.currentNoi * Math.pow(1 + property.annualNoiGrowth, y);
      holdCashFlows.push(yearNoi * 0.3);
    }
    holdCashFlows[holdYears] += holdNetProceeds;

    const holdIrr = calculateIRR(holdCashFlows);
    const holdEquityMultiple = (holdNetProceeds + holdCashFlows.slice(1, -1).reduce((a, b) => a + b, 0)) / property.equityInvested;

    scenarios.push({
      name: 'Extended Hold',
      type: 'hold',
      irr: holdIrr,
      equityMultiple: holdEquityMultiple,
      grossProceeds: holdGrossProceeds,
      netProceeds: holdNetProceeds,
      holdingPeriodYears: holdYears,
    });

    // Determine recommendation
    const sortedByIrr = [...scenarios].sort((a, b) => b.irr - a.irr);
    const recommended = sortedByIrr[0];
    recommended.isRecommended = true;

    let rationale = '';
    if (recommended.type === 'sale') {
      rationale = `Sale in Year ${exitYear} provides the highest IRR of ${formatPercent(recommended.irr)} with net proceeds of ${formatCurrency(recommended.netProceeds)}. Current market conditions and cap rate compression support this exit.`;
    } else if (recommended.type === 'refinance') {
      rationale = `Refinancing allows you to extract ${formatCurrency(recommended.netProceeds)} while maintaining ownership. Consider this if you believe the property has additional upside or want to defer capital gains.`;
    } else {
      rationale = `Extended hold to Year ${holdYears} maximizes absolute returns with an equity multiple of ${recommended.equityMultiple.toFixed(2)}x. This strategy works best with stable cash flows and low turnover expectations.`;
    }

    const newResult: ExitAnalysisResult = {
      scenarios,
      recommendation: recommended.name,
      rationale,
    };

    setResult(newResult);
    onAnalyze?.(newResult);
  };

  // Auto-analyze
  React.useEffect(() => {
    handleAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property, exitYear, saleCapRate, sellingCosts, refinanceLtv, refinanceRate, holdYears]);

  const getScenarioIcon = (type: string) => {
    switch (type) {
      case 'sale':
        return <LogOut className="h-4 w-4" />;
      case 'refinance':
        return <RefreshCw className="h-4 w-4" />;
      case 'hold':
        return <Home className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Exit Strategy Analyzer
          </CardTitle>
          <CardDescription>
            Compare sale, refinance, and hold scenarios to optimize exit timing
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Property Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Property Data</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Current NOI</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={property.currentNoi}
                  onChange={(e) => updateProperty('currentNoi', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Property Value</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={property.currentValue}
                  onChange={(e) => updateProperty('currentValue', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Debt Balance</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={property.debtBalance}
                  onChange={(e) => updateProperty('debtBalance', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Equity Invested</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={property.equityInvested}
                  onChange={(e) => updateProperty('equityInvested', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Annual NOI Growth</Label>
                <span className="text-sm font-medium">{formatPercent(property.annualNoiGrowth)}</span>
              </div>
              <Slider
                value={[property.annualNoiGrowth * 100]}
                onValueChange={(v: number[]) => updateProperty('annualNoiGrowth', v[0] / 100)}
                min={0}
                max={5}
                step={0.25}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exit Assumptions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exit Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Exit Year (Sale/Refi)</Label>
              <Input
                type="number"
                value={exitYear}
                onChange={(e) => setExitYear(parseInt(e.target.value) || 5)}
                min={1}
                max={15}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Exit Cap Rate</Label>
                <span className="text-sm font-medium">{formatPercent(saleCapRate)}</span>
              </div>
              <Slider
                value={[saleCapRate * 100]}
                onValueChange={(v: number[]) => setSaleCapRate(v[0] / 100)}
                min={8}
                max={16}
                step={0.25}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Selling Costs</Label>
                <span className="text-sm font-medium">{formatPercent(sellingCosts)}</span>
              </div>
              <Slider
                value={[sellingCosts * 100]}
                onValueChange={(v: number[]) => setSellingCosts(v[0] / 100)}
                min={1}
                max={5}
                step={0.25}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Refinance LTV</Label>
                <span className="text-sm font-medium">{formatPercent(refinanceLtv)}</span>
              </div>
              <Slider
                value={[refinanceLtv * 100]}
                onValueChange={(v: number[]) => setRefinanceLtv(v[0] / 100)}
                min={50}
                max={80}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Refi Interest Rate</Label>
                <span className="text-sm font-medium">{formatPercent(refinanceRate)}</span>
              </div>
              <Slider
                value={[refinanceRate * 100]}
                onValueChange={(v: number[]) => setRefinanceRate(v[0] / 100)}
                min={5}
                max={10}
                step={0.25}
              />
            </div>

            <div className="space-y-2">
              <Label>Extended Hold (years)</Label>
              <Input
                type="number"
                value={holdYears}
                onChange={(e) => setHoldYears(parseInt(e.target.value) || 10)}
                min={exitYear + 1}
                max={20}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Recommendation */}
          <Card className="border-primary">
            <CardContent className="pt-4">
              <div className="flex items-start gap-4">
                <Award className="h-6 w-6 text-primary shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-lg">
                    Recommended: {result.recommendation}
                  </div>
                  <p className="text-muted-foreground mt-1">{result.rationale}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Comparison */}
          <div className="grid gap-4 md:grid-cols-3">
            {result.scenarios.map((scenario, i) => (
              <Card
                key={i}
                className={cn(
                  scenario.isRecommended && 'border-primary ring-1 ring-primary'
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {getScenarioIcon(scenario.type)}
                      {scenario.name}
                    </CardTitle>
                    {scenario.isRecommended && (
                      <Badge>Recommended</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5" />
                      IRR
                    </span>
                    <span className={cn(
                      'text-lg font-bold',
                      scenario.irr >= 0.15 ? 'text-emerald-600' :
                      scenario.irr >= 0.10 ? 'text-amber-600' : 'text-rose-600'
                    )}>
                      {formatPercent(scenario.irr)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Equity Multiple</span>
                    <span className="font-semibold">{scenario.equityMultiple.toFixed(2)}x</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3.5 w-3.5" />
                      Gross Proceeds
                    </span>
                    <span className="font-medium">{formatCurrency(scenario.grossProceeds)}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Net to Equity</span>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(scenario.netProceeds)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Hold Period
                    </span>
                    <span className="font-medium">{scenario.holdingPeriodYears} years</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Comparison Bars */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Return Comparison</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* IRR Comparison */}
              <div className="space-y-2">
                <div className="text-sm font-medium">IRR</div>
                {result.scenarios.map((s, i) => {
                  const maxIrr = Math.max(...result.scenarios.map((sc) => sc.irr));
                  const width = maxIrr > 0 ? (s.irr / maxIrr) * 100 : 0;

                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-muted-foreground truncate">{s.name}</div>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded relative">
                        <div
                          className={cn(
                            'absolute top-0 bottom-0 left-0 rounded',
                            s.isRecommended ? 'bg-primary' : 'bg-slate-400'
                          )}
                          style={{ width: `${width}%` }}
                        />
                        <span className={cn(
                          'absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium',
                          width > 80 ? 'text-white' : ''
                        )}>
                          {formatPercent(s.irr)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Equity Multiple Comparison */}
              <div className="space-y-2 pt-4">
                <div className="text-sm font-medium">Equity Multiple</div>
                {result.scenarios.map((s, i) => {
                  const maxMult = Math.max(...result.scenarios.map((sc) => sc.equityMultiple));
                  const width = maxMult > 0 ? (s.equityMultiple / maxMult) * 100 : 0;

                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-28 text-xs text-muted-foreground truncate">{s.name}</div>
                      <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded relative">
                        <div
                          className={cn(
                            'absolute top-0 bottom-0 left-0 rounded',
                            s.isRecommended ? 'bg-primary' : 'bg-slate-400'
                          )}
                          style={{ width: `${width}%` }}
                        />
                        <span className={cn(
                          'absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium',
                          width > 80 ? 'text-white' : ''
                        )}>
                          {s.equityMultiple.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default ExitStrategyAnalyzer;
