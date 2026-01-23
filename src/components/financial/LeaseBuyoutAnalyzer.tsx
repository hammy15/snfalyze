'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FileText, DollarSign, TrendingUp, Calendar, Building2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CashFlowChart } from '@/components/charts';

// ============================================================================
// Types
// ============================================================================

interface FacilityLease {
  id: string;
  name: string;
  currentRent: number;
  remainingYears: number;
  escalation: number;
  ebitdar?: number;
}

interface BuyoutResult {
  totalBuyoutCost: number;
  buyoutAmortization: number;
  effectiveRentIncrease: number;
  newTotalRent: number;
  newCoverage: number;
  projectedCashFlows: Array<{
    period: number;
    baseRent: number;
    buyoutAmort: number;
    totalRent: number;
    ebitdar: number;
    cashFlow: number;
    cumulativeCashFlow: number;
  }>;
  npv: number;
  paybackPeriod: number;
}

export interface LeaseBuyoutAnalyzerProps {
  initialFacilities?: FacilityLease[];
  onCalculate?: (result: BuyoutResult) => void;
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
  return `${(value * 100).toFixed(2)}%`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================================================
// Component
// ============================================================================

export function LeaseBuyoutAnalyzer({
  initialFacilities,
  onCalculate,
  className,
}: LeaseBuyoutAnalyzerProps) {
  const [facilities, setFacilities] = React.useState<FacilityLease[]>(
    initialFacilities ?? [
      {
        id: generateId(),
        name: 'Facility 1',
        currentRent: 2_000_000,
        remainingYears: 8,
        escalation: 0.025,
        ebitdar: 3_000_000,
      },
    ]
  );

  const [buyoutAmount, setBuyoutAmount] = React.useState(5_000_000);
  const [acquisitionCosts, setAcquisitionCosts] = React.useState(100_000);
  const [projectionYears, setProjectionYears] = React.useState(10);
  const [discountRate, setDiscountRate] = React.useState(0.10);

  const [result, setResult] = React.useState<BuyoutResult | null>(null);

  const addFacility = () => {
    setFacilities((prev) => [
      ...prev,
      {
        id: generateId(),
        name: `Facility ${prev.length + 1}`,
        currentRent: 2_000_000,
        remainingYears: 8,
        escalation: 0.025,
        ebitdar: 3_000_000,
      },
    ]);
  };

  const removeFacility = (id: string) => {
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFacility = (id: string, field: keyof FacilityLease, value: string | number) => {
    setFacilities((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  };

  const handleCalculate = () => {
    // Calculate totals
    const totalCurrentRent = facilities.reduce((sum, f) => sum + f.currentRent, 0);
    const totalEbitdar = facilities.reduce((sum, f) => sum + (f.ebitdar ?? 0), 0);
    const avgRemainingYears = facilities.reduce((sum, f) => sum + f.remainingYears, 0) / facilities.length;
    const avgEscalation = facilities.reduce((sum, f) => sum + f.escalation, 0) / facilities.length;

    // Calculate buyout amortization
    const totalBuyoutCost = buyoutAmount + acquisitionCosts;
    const buyoutAmortization = totalBuyoutCost / avgRemainingYears;
    const effectiveRentIncrease = buyoutAmortization;
    const newTotalRent = totalCurrentRent + effectiveRentIncrease;
    const newCoverage = totalEbitdar / newTotalRent;

    // Generate cash flow projections
    const projectedCashFlows: BuyoutResult['projectedCashFlows'] = [];
    let cumulativeCashFlow = -totalBuyoutCost;

    for (let year = 1; year <= projectionYears; year++) {
      const yearsOfEscalation = year - 1;
      const baseRent = totalCurrentRent * Math.pow(1 + avgEscalation, yearsOfEscalation);
      const buyoutAmort = year <= avgRemainingYears ? buyoutAmortization : 0;
      const totalRent = baseRent + buyoutAmort;
      const yearEbitdar = totalEbitdar * Math.pow(1 + 0.02, yearsOfEscalation); // Assume 2% EBITDAR growth
      const cashFlow = yearEbitdar - totalRent;
      cumulativeCashFlow += cashFlow;

      projectedCashFlows.push({
        period: year,
        baseRent,
        buyoutAmort,
        totalRent,
        ebitdar: yearEbitdar,
        cashFlow,
        cumulativeCashFlow,
      });
    }

    // Calculate NPV
    let npv = -totalBuyoutCost;
    for (let i = 0; i < projectedCashFlows.length; i++) {
      npv += projectedCashFlows[i].cashFlow / Math.pow(1 + discountRate, i + 1);
    }

    // Calculate payback period
    let paybackPeriod = projectionYears;
    for (let i = 0; i < projectedCashFlows.length; i++) {
      if (projectedCashFlows[i].cumulativeCashFlow >= 0) {
        // Interpolate
        if (i > 0) {
          const prevCum = projectedCashFlows[i - 1].cumulativeCashFlow;
          const currCum = projectedCashFlows[i].cumulativeCashFlow;
          const fraction = Math.abs(prevCum) / (currCum - prevCum);
          paybackPeriod = i + fraction;
        } else {
          paybackPeriod = i + 1;
        }
        break;
      }
    }

    const newResult: BuyoutResult = {
      totalBuyoutCost,
      buyoutAmortization,
      effectiveRentIncrease,
      newTotalRent,
      newCoverage,
      projectedCashFlows,
      npv,
      paybackPeriod,
    };

    setResult(newResult);
    onCalculate?.(newResult);
  };

  // Auto-calculate
  React.useEffect(() => {
    if (facilities.length > 0) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilities, buyoutAmount, acquisitionCosts, projectionYears, discountRate]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Buyout Analyzer
          </CardTitle>
          <CardDescription>
            Model lease acquisition costs and their impact on operator economics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Facilities */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Facilities</CardTitle>
          <Button variant="outline" size="sm" onClick={addFacility}>
            <Plus className="h-4 w-4 mr-1" />
            Add Facility
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {facilities.map((facility, index) => (
            <div key={facility.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={facility.name}
                    onChange={(e) => updateFacility(facility.id, 'name', e.target.value)}
                    className="w-48 h-8"
                  />
                </div>
                {facilities.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFacility(facility.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Current Annual Rent</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={facility.currentRent}
                      onChange={(e) => updateFacility(facility.id, 'currentRent', parseFloat(e.target.value) || 0)}
                      className="pl-7 h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Remaining Years</Label>
                  <div className="relative">
                    <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={facility.remainingYears}
                      onChange={(e) => updateFacility(facility.id, 'remainingYears', parseInt(e.target.value) || 0)}
                      className="pl-7 h-8"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Annual Escalation</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={facility.escalation}
                    onChange={(e) => updateFacility(facility.id, 'escalation', parseFloat(e.target.value) || 0)}
                    className="h-8"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Facility EBITDAR</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={facility.ebitdar ?? 0}
                      onChange={(e) => updateFacility(facility.id, 'ebitdar', parseFloat(e.target.value) || 0)}
                      className="pl-7 h-8"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Buyout Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buyout Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Buyout Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={buyoutAmount}
                  onChange={(e) => setBuyoutAmount(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Acquisition Costs</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={acquisitionCosts}
                  onChange={(e) => setAcquisitionCosts(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Projection Years</Label>
              <Input
                type="number"
                value={projectionYears}
                onChange={(e) => setProjectionYears(parseInt(e.target.value) || 10)}
              />
            </div>

            <div className="space-y-2">
              <Label>Discount Rate</Label>
              <Input
                type="number"
                step="0.01"
                value={discountRate}
                onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0.10)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Total Buyout Cost</div>
                <div className="text-2xl font-bold">{formatCurrency(result.totalBuyoutCost)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Annual Amortization</div>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(result.buyoutAmortization)}
                </div>
                <div className="text-xs text-muted-foreground">Added to rent</div>
              </CardContent>
            </Card>

            <Card className={cn(result.newCoverage >= 1.4 ? 'border-emerald-500' : 'border-amber-500')}>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">New Coverage Ratio</div>
                <div className={cn(
                  'text-2xl font-bold',
                  result.newCoverage >= 1.4 ? 'text-emerald-600' : 'text-amber-600'
                )}>
                  {result.newCoverage.toFixed(2)}x
                </div>
                <Badge variant={result.newCoverage >= 1.4 ? 'default' : 'secondary'} className="mt-1">
                  {result.newCoverage >= 1.4 ? 'Healthy' : 'Tight'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">NPV @ {formatPercent(discountRate)}</div>
                <div className={cn(
                  'text-2xl font-bold',
                  result.npv >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {formatCurrency(result.npv)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Payback: {result.paybackPeriod.toFixed(1)} years
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Projected Cash Flows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CashFlowChart
                data={result.projectedCashFlows.map((cf) => ({
                  period: `Yr ${cf.period}`,
                  cashFlow: cf.cashFlow,
                  cumulativeCashFlow: cf.cumulativeCashFlow,
                }))}
                height={250}
                showCumulative={true}
              />
            </CardContent>
          </Card>

          {/* Detailed Projections */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rent & Cash Flow Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Year</th>
                      <th className="text-right py-2 px-2">Base Rent</th>
                      <th className="text-right py-2 px-2">Buyout Amort</th>
                      <th className="text-right py-2 px-2">Total Rent</th>
                      <th className="text-right py-2 px-2">EBITDAR</th>
                      <th className="text-right py-2 px-2">Cash Flow</th>
                      <th className="text-right py-2 px-2">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.projectedCashFlows.map((cf) => (
                      <tr key={cf.period} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-2">{cf.period}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(cf.baseRent)}</td>
                        <td className="text-right py-2 px-2 text-amber-600">
                          {cf.buyoutAmort > 0 ? formatCurrency(cf.buyoutAmort) : '-'}
                        </td>
                        <td className="text-right py-2 px-2">{formatCurrency(cf.totalRent)}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(cf.ebitdar)}</td>
                        <td className={cn(
                          'text-right py-2 px-2 font-medium',
                          cf.cashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                          {formatCurrency(cf.cashFlow)}
                        </td>
                        <td className={cn(
                          'text-right py-2 px-2',
                          cf.cumulativeCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        )}>
                          {formatCurrency(cf.cumulativeCashFlow)}
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

export default LeaseBuyoutAnalyzer;
