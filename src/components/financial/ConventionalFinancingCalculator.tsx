'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Calculator, TrendingUp, AlertCircle, Check, DollarSign, Percent } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { AmortizationChart } from '@/components/charts';

// ============================================================================
// Types
// ============================================================================

interface FinancingInputs {
  purchasePrice: number;
  propertyNoi: number;
  facilityEbitdar: number;
  beds: number;
  ltv: number;
  interestRate: number;
  amortizationYears: number;
  loanTermYears: number;
}

interface FinancingResult {
  loanAmount: number;
  equityRequired: number;
  annualDebtService: number;
  monthlyPayment: number;
  dscr: number;
  dscrPassFail: boolean;
  debtYield: number;
  pricePerBed: number;
  cashOnCash: number;
  capRate: number;
  amortizationSchedule?: Array<{
    period: number;
    payment: number;
    principal: number;
    interest: number;
    balance: number;
  }>;
}

export interface ConventionalFinancingCalculatorProps {
  initialValues?: Partial<FinancingInputs>;
  onCalculate?: (result: FinancingResult) => void;
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

function calculateMonthlyPayment(principal: number, annualRate: number, years: number): number {
  const monthlyRate = annualRate / 12;
  const numPayments = years * 12;
  if (monthlyRate === 0) return principal / numPayments;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

function generateAmortizationSchedule(
  principal: number,
  annualRate: number,
  years: number
): Array<{ period: number; payment: number; principal: number; interest: number; balance: number }> {
  const monthlyRate = annualRate / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
  const schedule: Array<{ period: number; payment: number; principal: number; interest: number; balance: number }> = [];
  let balance = principal;

  for (let month = 1; month <= years * 12; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance = Math.max(0, balance - principalPayment);

    schedule.push({
      period: month,
      payment: monthlyPayment,
      principal: principalPayment,
      interest: interestPayment,
      balance,
    });
  }

  return schedule;
}

// ============================================================================
// Component
// ============================================================================

export function ConventionalFinancingCalculator({
  initialValues,
  onCalculate,
  className,
}: ConventionalFinancingCalculatorProps) {
  const [inputs, setInputs] = React.useState<FinancingInputs>({
    purchasePrice: initialValues?.purchasePrice ?? 20_000_000,
    propertyNoi: initialValues?.propertyNoi ?? 2_000_000,
    facilityEbitdar: initialValues?.facilityEbitdar ?? 3_000_000,
    beds: initialValues?.beds ?? 120,
    ltv: initialValues?.ltv ?? 0.70,
    interestRate: initialValues?.interestRate ?? 0.075,
    amortizationYears: initialValues?.amortizationYears ?? 25,
    loanTermYears: initialValues?.loanTermYears ?? 10,
  });

  const [result, setResult] = React.useState<FinancingResult | null>(null);
  const [showSchedule, setShowSchedule] = React.useState(false);

  const handleInputChange = (field: keyof FinancingInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    const loanAmount = inputs.purchasePrice * inputs.ltv;
    const equityRequired = inputs.purchasePrice - loanAmount;
    const monthlyPayment = calculateMonthlyPayment(loanAmount, inputs.interestRate, inputs.amortizationYears);
    const annualDebtService = monthlyPayment * 12;
    const dscr = inputs.propertyNoi / annualDebtService;
    const debtYield = inputs.propertyNoi / loanAmount;
    const pricePerBed = inputs.purchasePrice / inputs.beds;
    const cashFlow = inputs.propertyNoi - annualDebtService;
    const cashOnCash = cashFlow / equityRequired;
    const capRate = inputs.propertyNoi / inputs.purchasePrice;

    const amortizationSchedule = generateAmortizationSchedule(
      loanAmount,
      inputs.interestRate,
      inputs.amortizationYears
    );

    const newResult: FinancingResult = {
      loanAmount,
      equityRequired,
      annualDebtService,
      monthlyPayment,
      dscr,
      dscrPassFail: dscr >= 1.25,
      debtYield,
      pricePerBed,
      cashOnCash,
      capRate,
      amortizationSchedule,
    };

    setResult(newResult);
    onCalculate?.(newResult);
  };

  // Auto-calculate on input change
  React.useEffect(() => {
    handleCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputs]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Conventional Financing Calculator
          </CardTitle>
          <CardDescription>
            Model bank financing with LTV, DSCR, and amortization analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Property Inputs */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="purchasePrice">Purchase Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="purchasePrice"
                  type="number"
                  value={inputs.purchasePrice}
                  onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyNoi">Property NOI</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="propertyNoi"
                  type="number"
                  value={inputs.propertyNoi}
                  onChange={(e) => handleInputChange('propertyNoi', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityEbitdar">Facility EBITDAR</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="facilityEbitdar"
                  type="number"
                  value={inputs.facilityEbitdar}
                  onChange={(e) => handleInputChange('facilityEbitdar', parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="beds">Number of Beds</Label>
              <Input
                id="beds"
                type="number"
                value={inputs.beds}
                onChange={(e) => handleInputChange('beds', parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Loan Parameters */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Loan Parameters</h4>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Loan-to-Value (LTV)</Label>
                  <span className="text-sm font-medium">{formatPercent(inputs.ltv)}</span>
                </div>
                <Slider
                  value={[inputs.ltv * 100]}
                  onValueChange={(v: number[]) => handleInputChange('ltv', v[0] / 100)}
                  min={50}
                  max={80}
                  step={1}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>50%</span>
                  <span>80%</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Interest Rate</Label>
                  <span className="text-sm font-medium">{formatPercent(inputs.interestRate)}</span>
                </div>
                <Slider
                  value={[inputs.interestRate * 100]}
                  onValueChange={(v: number[]) => handleInputChange('interestRate', v[0] / 100)}
                  min={4}
                  max={12}
                  step={0.125}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>4%</span>
                  <span>12%</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amortYears">Amortization (years)</Label>
                  <Input
                    id="amortYears"
                    type="number"
                    value={inputs.amortizationYears}
                    onChange={(e) => handleInputChange('amortizationYears', parseInt(e.target.value) || 25)}
                    min={10}
                    max={30}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="termYears">Loan Term (years)</Label>
                  <Input
                    id="termYears"
                    type="number"
                    value={inputs.loanTermYears}
                    onChange={(e) => handleInputChange('loanTermYears', parseInt(e.target.value) || 10)}
                    min={3}
                    max={15}
                  />
                </div>
              </div>
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
                <div className="text-sm text-muted-foreground">Loan Amount</div>
                <div className="text-2xl font-bold">{formatCurrency(result.loanAmount)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent(inputs.ltv)} LTV
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Equity Required</div>
                <div className="text-2xl font-bold">{formatCurrency(result.equityRequired)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatPercent(1 - inputs.ltv)} of purchase
                </div>
              </CardContent>
            </Card>

            <Card className={cn(result.dscrPassFail ? 'border-emerald-500' : 'border-rose-500')}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">DSCR</div>
                  {result.dscrPassFail ? (
                    <Badge variant="default" className="bg-emerald-500">
                      <Check className="h-3 w-3 mr-1" />
                      Pass
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Fail
                    </Badge>
                  )}
                </div>
                <div className={cn(
                  'text-2xl font-bold',
                  result.dscrPassFail ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {result.dscr.toFixed(2)}x
                </div>
                <div className="text-xs text-muted-foreground">Min: 1.25x</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Cash-on-Cash</div>
                <div className={cn(
                  'text-2xl font-bold',
                  result.cashOnCash >= 0 ? 'text-emerald-600' : 'text-rose-600'
                )}>
                  {formatPercent(result.cashOnCash)}
                </div>
                <div className="text-xs text-muted-foreground">Year 1 return</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Financing Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Annual Debt Service</span>
                    <span className="font-medium">{formatCurrency(result.annualDebtService)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Monthly Payment</span>
                    <span className="font-medium">{formatCurrency(result.monthlyPayment)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Debt Yield</span>
                    <span className="font-medium">{formatPercent(result.debtYield)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cap Rate</span>
                    <span className="font-medium">{formatPercent(result.capRate)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price Per Bed</span>
                    <span className="font-medium">{formatCurrency(result.pricePerBed)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Annual Cash Flow</span>
                    <span className={cn(
                      'font-medium',
                      (inputs.propertyNoi - result.annualDebtService) >= 0
                        ? 'text-emerald-600'
                        : 'text-rose-600'
                    )}>
                      {formatCurrency(inputs.propertyNoi - result.annualDebtService)}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">EBITDAR Coverage</span>
                    <span className="font-medium">
                      {(inputs.facilityEbitdar / result.annualDebtService).toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balloon at Term End</span>
                    <span className="font-medium">
                      {formatCurrency(
                        result.amortizationSchedule?.[inputs.loanTermYears * 12 - 1]?.balance ?? 0
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Amortization Schedule */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Amortization Schedule</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSchedule(!showSchedule)}
              >
                {showSchedule ? 'Hide' : 'Show'} Schedule
              </Button>
            </CardHeader>
            {showSchedule && result.amortizationSchedule && (
              <CardContent>
                <AmortizationChart
                  data={result.amortizationSchedule}
                  height={250}
                  showTable={true}
                  maxTableRows={inputs.loanTermYears}
                />
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

export default ConventionalFinancingCalculator;
