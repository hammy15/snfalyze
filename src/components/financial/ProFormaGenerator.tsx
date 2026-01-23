'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { FileSpreadsheet, Settings, TrendingUp, DollarSign, Percent, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { CashFlowChart } from '@/components/charts';

// ============================================================================
// Types
// ============================================================================

interface FacilityData {
  facilityName: string;
  beds: number;
  currentOccupancy: number;
  currentRevenue: number;
  currentExpenses: number;
  currentNoi: number;
}

interface GrowthAssumptions {
  occupancyImprovement: number;
  targetOccupancy: number;
  revenueGrowth: number;
  expenseInflation: number;
  agencyReduction: number;
  managementFeePercent: number;
}

interface ProFormaResult {
  yearlyProjections: Array<{
    year: number;
    occupancy: number;
    revenue: number;
    expenses: number;
    noi: number;
    cashFlow: number;
    cumulativeCashFlow: number;
  }>;
  totalRevenue: number;
  totalNoi: number;
  averageNoi: number;
  noiGrowthRate: number;
  terminalValue: number;
}

export interface ProFormaGeneratorProps {
  initialFacility?: Partial<FacilityData>;
  initialAssumptions?: Partial<GrowthAssumptions>;
  onCalculate?: (result: ProFormaResult) => void;
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

// ============================================================================
// Component
// ============================================================================

export function ProFormaGenerator({
  initialFacility,
  initialAssumptions,
  onCalculate,
  className,
}: ProFormaGeneratorProps) {
  const [facility, setFacility] = React.useState<FacilityData>({
    facilityName: initialFacility?.facilityName ?? 'Example SNF',
    beds: initialFacility?.beds ?? 120,
    currentOccupancy: initialFacility?.currentOccupancy ?? 0.85,
    currentRevenue: initialFacility?.currentRevenue ?? 15_000_000,
    currentExpenses: initialFacility?.currentExpenses ?? 12_500_000,
    currentNoi: initialFacility?.currentNoi ?? 2_500_000,
  });

  const [assumptions, setAssumptions] = React.useState<GrowthAssumptions>({
    occupancyImprovement: initialAssumptions?.occupancyImprovement ?? 0.02,
    targetOccupancy: initialAssumptions?.targetOccupancy ?? 0.92,
    revenueGrowth: initialAssumptions?.revenueGrowth ?? 0.025,
    expenseInflation: initialAssumptions?.expenseInflation ?? 0.03,
    agencyReduction: initialAssumptions?.agencyReduction ?? 0.005,
    managementFeePercent: initialAssumptions?.managementFeePercent ?? 0.05,
  });

  const [holdPeriod, setHoldPeriod] = React.useState(10);
  const [exitCapRate, setExitCapRate] = React.useState(0.125);
  const [showAssumptions, setShowAssumptions] = React.useState(false);

  const [result, setResult] = React.useState<ProFormaResult | null>(null);

  const updateFacility = (field: keyof FacilityData, value: number | string) => {
    setFacility((prev) => ({ ...prev, [field]: value }));
  };

  const updateAssumption = (field: keyof GrowthAssumptions, value: number) => {
    setAssumptions((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    const yearlyProjections: ProFormaResult['yearlyProjections'] = [];
    let cumulativeCashFlow = 0;

    let currentOccupancy = facility.currentOccupancy;
    let currentRevenue = facility.currentRevenue;
    let currentExpenses = facility.currentExpenses;

    for (let year = 1; year <= holdPeriod; year++) {
      // Improve occupancy up to target
      const newOccupancy = Math.min(
        currentOccupancy + assumptions.occupancyImprovement,
        assumptions.targetOccupancy
      );

      // Revenue growth from occupancy improvement and rate increases
      const occupancyBoost = currentOccupancy > 0
        ? (newOccupancy - currentOccupancy) / currentOccupancy
        : 0;
      const revenue = currentRevenue * (1 + assumptions.revenueGrowth + occupancyBoost);

      // Expense growth with agency reduction benefit
      const expenseGrowth = assumptions.expenseInflation - assumptions.agencyReduction;
      const expenses = currentExpenses * (1 + Math.max(expenseGrowth, 0.01));

      const noi = revenue - expenses;
      const cashFlow = noi * (1 - assumptions.managementFeePercent);
      cumulativeCashFlow += cashFlow;

      yearlyProjections.push({
        year,
        occupancy: newOccupancy,
        revenue,
        expenses,
        noi,
        cashFlow,
        cumulativeCashFlow,
      });

      // Update for next iteration
      currentOccupancy = newOccupancy;
      currentRevenue = revenue;
      currentExpenses = expenses;
    }

    const totalRevenue = yearlyProjections.reduce((sum, y) => sum + y.revenue, 0);
    const totalNoi = yearlyProjections.reduce((sum, y) => sum + y.noi, 0);
    const averageNoi = totalNoi / holdPeriod;

    const firstNoi = yearlyProjections[0]?.noi ?? 0;
    const lastNoi = yearlyProjections[yearlyProjections.length - 1]?.noi ?? 0;
    const noiGrowthRate = firstNoi > 0
      ? Math.pow(lastNoi / firstNoi, 1 / (holdPeriod - 1)) - 1
      : 0;

    const terminalValue = lastNoi / exitCapRate;

    const newResult: ProFormaResult = {
      yearlyProjections,
      totalRevenue,
      totalNoi,
      averageNoi,
      noiGrowthRate,
      terminalValue,
    };

    setResult(newResult);
    onCalculate?.(newResult);
  };

  // Auto-calculate
  React.useEffect(() => {
    handleCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility, assumptions, holdPeriod, exitCapRate]);

  // Sync NOI with revenue/expenses
  React.useEffect(() => {
    const noi = facility.currentRevenue - facility.currentExpenses;
    if (noi !== facility.currentNoi) {
      setFacility((prev) => ({ ...prev, currentNoi: noi }));
    }
  }, [facility.currentRevenue, facility.currentExpenses, facility.currentNoi]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Pro Forma Generator
          </CardTitle>
          <CardDescription>
            Build multi-year operating projections with growth assumptions
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Facility Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Operations (Year 0)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Facility Name</Label>
              <Input
                value={facility.facilityName}
                onChange={(e) => updateFacility('facilityName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Number of Beds</Label>
              <Input
                type="number"
                value={facility.beds}
                onChange={(e) => updateFacility('beds', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label>Current Occupancy</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[facility.currentOccupancy * 100]}
                  onValueChange={(v: number[]) => updateFacility('currentOccupancy', v[0] / 100)}
                  min={50}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="w-14 text-sm font-medium">
                  {formatPercent(facility.currentOccupancy)}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div className="space-y-2">
              <Label>Current Annual Revenue</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={facility.currentRevenue}
                  onChange={(e) => updateFacility('currentRevenue', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Annual Expenses</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={facility.currentExpenses}
                  onChange={(e) => updateFacility('currentExpenses', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current NOI</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={facility.currentNoi}
                  disabled
                  className="pl-9 bg-slate-50 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Assumptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Growth Assumptions
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAssumptions(!showAssumptions)}
          >
            {showAssumptions ? 'Hide' : 'Show'} Details
          </Button>
        </CardHeader>

        {showAssumptions && (
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Annual Occupancy Improvement</Label>
                  <span className="text-sm font-medium">{formatPercent(assumptions.occupancyImprovement)}</span>
                </div>
                <Slider
                  value={[assumptions.occupancyImprovement * 100]}
                  onValueChange={(v: number[]) => updateAssumption('occupancyImprovement', v[0] / 100)}
                  min={0}
                  max={5}
                  step={0.5}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Target Occupancy</Label>
                  <span className="text-sm font-medium">{formatPercent(assumptions.targetOccupancy)}</span>
                </div>
                <Slider
                  value={[assumptions.targetOccupancy * 100]}
                  onValueChange={(v: number[]) => updateAssumption('targetOccupancy', v[0] / 100)}
                  min={80}
                  max={98}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Revenue Growth Rate</Label>
                  <span className="text-sm font-medium">{formatPercent(assumptions.revenueGrowth)}</span>
                </div>
                <Slider
                  value={[assumptions.revenueGrowth * 100]}
                  onValueChange={(v: number[]) => updateAssumption('revenueGrowth', v[0] / 100)}
                  min={0}
                  max={5}
                  step={0.25}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Expense Inflation</Label>
                  <span className="text-sm font-medium">{formatPercent(assumptions.expenseInflation)}</span>
                </div>
                <Slider
                  value={[assumptions.expenseInflation * 100]}
                  onValueChange={(v: number[]) => updateAssumption('expenseInflation', v[0] / 100)}
                  min={1}
                  max={6}
                  step={0.25}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Annual Agency Reduction</Label>
                  <span className="text-sm font-medium">{formatPercent(assumptions.agencyReduction)}</span>
                </div>
                <Slider
                  value={[assumptions.agencyReduction * 100]}
                  onValueChange={(v: number[]) => updateAssumption('agencyReduction', v[0] / 100)}
                  min={0}
                  max={2}
                  step={0.1}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Management Fee</Label>
                  <span className="text-sm font-medium">{formatPercent(assumptions.managementFeePercent)}</span>
                </div>
                <Slider
                  value={[assumptions.managementFeePercent * 100]}
                  onValueChange={(v: number[]) => updateAssumption('managementFeePercent', v[0] / 100)}
                  min={3}
                  max={8}
                  step={0.5}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 pt-4 border-t">
              <div className="space-y-2">
                <Label>Hold Period (years)</Label>
                <Input
                  type="number"
                  value={holdPeriod}
                  onChange={(e) => setHoldPeriod(parseInt(e.target.value) || 10)}
                  min={3}
                  max={15}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Exit Cap Rate</Label>
                  <span className="text-sm font-medium">{formatPercent(exitCapRate)}</span>
                </div>
                <Slider
                  value={[exitCapRate * 100]}
                  onValueChange={(v: number[]) => setExitCapRate(v[0] / 100)}
                  min={8}
                  max={16}
                  step={0.25}
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Year {holdPeriod} NOI</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(result.yearlyProjections[holdPeriod - 1]?.noi ?? 0)}
                </div>
                <Badge variant="secondary" className="mt-1">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatPercent(result.noiGrowthRate)} CAGR
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Terminal Value</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(result.terminalValue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  @ {formatPercent(exitCapRate)} cap
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Total NOI</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(result.totalNoi)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {holdPeriod} year total
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Final Occupancy
                </div>
                <div className="text-2xl font-bold">
                  {formatPercent(result.yearlyProjections[holdPeriod - 1]?.occupancy ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  +{formatPercent((result.yearlyProjections[holdPeriod - 1]?.occupancy ?? 0) - facility.currentOccupancy)} improvement
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cash Flow Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">NOI Projection</CardTitle>
            </CardHeader>
            <CardContent>
              <CashFlowChart
                data={result.yearlyProjections.map((y) => ({
                  period: `Yr ${y.year}`,
                  cashFlow: y.noi,
                  cumulativeCashFlow: y.cumulativeCashFlow,
                }))}
                height={250}
                showCumulative={true}
              />
            </CardContent>
          </Card>

          {/* Detailed Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Year-by-Year Projections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Year</th>
                      <th className="text-right py-2 px-2">Occupancy</th>
                      <th className="text-right py-2 px-2">Revenue</th>
                      <th className="text-right py-2 px-2">Expenses</th>
                      <th className="text-right py-2 px-2">NOI</th>
                      <th className="text-right py-2 px-2">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                      <td className="py-2 px-2 font-medium">0 (Current)</td>
                      <td className="text-right py-2 px-2">{formatPercent(facility.currentOccupancy)}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(facility.currentRevenue)}</td>
                      <td className="text-right py-2 px-2">{formatCurrency(facility.currentExpenses)}</td>
                      <td className="text-right py-2 px-2 font-medium">{formatCurrency(facility.currentNoi)}</td>
                      <td className="text-right py-2 px-2">
                        {formatPercent(facility.currentNoi / facility.currentRevenue)}
                      </td>
                    </tr>
                    {result.yearlyProjections.map((y) => (
                      <tr key={y.year} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-2">{y.year}</td>
                        <td className="text-right py-2 px-2">{formatPercent(y.occupancy)}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(y.revenue)}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(y.expenses)}</td>
                        <td className="text-right py-2 px-2 font-medium text-emerald-600">
                          {formatCurrency(y.noi)}
                        </td>
                        <td className="text-right py-2 px-2">
                          {formatPercent(y.noi / y.revenue)}
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

export default ProFormaGenerator;
