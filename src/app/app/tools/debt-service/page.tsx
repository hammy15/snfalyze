'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, DollarSign, Percent, Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DebtServiceCalculatorPage() {
  const [noi, setNoi] = useState<number>(1500000);
  const [loanAmount, setLoanAmount] = useState<number>(15000000);
  const [interestRate, setInterestRate] = useState<number>(6.5);
  const [amortization, setAmortization] = useState<number>(25);
  const [propertyValue, setPropertyValue] = useState<number>(20000000);

  // Calculate annual debt service
  const annualDebtService = useMemo(() => {
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = amortization * 12;
    if (monthlyRate === 0) return loanAmount / numPayments * 12;
    const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment * 12;
  }, [loanAmount, interestRate, amortization]);

  // Calculate metrics
  const dscr = useMemo(() => noi / annualDebtService, [noi, annualDebtService]);
  const debtYield = useMemo(() => (noi / loanAmount) * 100, [noi, loanAmount]);
  const ltv = useMemo(() => (loanAmount / propertyValue) * 100, [loanAmount, propertyValue]);
  const interestOnly = useMemo(() => loanAmount * (interestRate / 100), [loanAmount, interestRate]);

  // Calculate max loan amounts based on constraints
  const maxLoanByDscr = useMemo(() => {
    // Target 1.25x DSCR
    const targetDscr = 1.25;
    const maxAnnualDS = noi / targetDscr;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = amortization * 12;
    if (monthlyRate === 0) return maxAnnualDS / 12 * numPayments;
    return maxAnnualDS / 12 / (monthlyRate * Math.pow(1 + monthlyRate, numPayments) / (Math.pow(1 + monthlyRate, numPayments) - 1));
  }, [noi, interestRate, amortization]);

  const maxLoanByLtv = useMemo(() => propertyValue * 0.75, [propertyValue]); // 75% LTV
  const maxLoanByDebtYield = useMemo(() => noi / 0.09, [noi]); // 9% debt yield

  const constraints = [
    { name: 'DSCR (1.25x min)', value: dscr, threshold: 1.25, passed: dscr >= 1.25, maxLoan: maxLoanByDscr },
    { name: 'LTV (75% max)', value: ltv, threshold: 75, passed: ltv <= 75, maxLoan: maxLoanByLtv, isPercent: true },
    { name: 'Debt Yield (9% min)', value: debtYield, threshold: 9, passed: debtYield >= 9, maxLoan: maxLoanByDebtYield, isPercent: true },
  ];

  const bindingConstraint = useMemo(() => {
    return constraints.reduce((min, c) => c.maxLoan < min.maxLoan ? c : min, constraints[0]);
  }, [constraints]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Debt Service Calculator</h1>
          <p className="text-sm text-surface-500">DSCR, debt yield analysis, and coverage optimization</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Inputs */}
        <div className="lg:col-span-2 space-y-4">
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Property & Loan Inputs</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium mb-1">Net Operating Income (NOI)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={noi}
                    onChange={(e) => setNoi(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Property Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={propertyValue}
                    onChange={(e) => setPropertyValue(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={loanAmount}
                    onChange={(e) => setLoanAmount(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.125"
                  value={interestRate}
                  onChange={(e) => setInterestRate(Number(e.target.value))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Amortization (years)</label>
                <select
                  value={amortization}
                  onChange={(e) => setAmortization(Number(e.target.value))}
                  className="input"
                >
                  <option value={20}>20 years</option>
                  <option value={25}>25 years</option>
                  <option value={30}>30 years</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="neu-card p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20">
            <h3 className="text-sm font-semibold mb-3">Debt Service Metrics</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="p-3 rounded-lg bg-white dark:bg-surface-800">
                <div className="text-xs text-surface-500 mb-1">Annual Debt Service</div>
                <div className="text-2xl font-bold">${(annualDebtService / 1000).toFixed(0)}K</div>
              </div>
              <div className={cn('p-3 rounded-lg bg-white dark:bg-surface-800', dscr < 1.25 && 'ring-2 ring-red-500')}>
                <div className="text-xs text-surface-500 mb-1">DSCR</div>
                <div className={cn('text-2xl font-bold', dscr >= 1.25 ? 'text-green-600' : 'text-red-600')}>
                  {dscr.toFixed(2)}x
                </div>
              </div>
              <div className={cn('p-3 rounded-lg bg-white dark:bg-surface-800', debtYield < 9 && 'ring-2 ring-red-500')}>
                <div className="text-xs text-surface-500 mb-1">Debt Yield</div>
                <div className={cn('text-2xl font-bold', debtYield >= 9 ? 'text-green-600' : 'text-red-600')}>
                  {debtYield.toFixed(2)}%
                </div>
              </div>
              <div className={cn('p-3 rounded-lg bg-white dark:bg-surface-800', ltv > 75 && 'ring-2 ring-red-500')}>
                <div className="text-xs text-surface-500 mb-1">LTV</div>
                <div className={cn('text-2xl font-bold', ltv <= 75 ? 'text-green-600' : 'text-red-600')}>
                  {ltv.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Constraint Analysis */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Constraint Analysis</h3>
            <div className="space-y-3">
              {constraints.map((c) => (
                <div key={c.name} className="flex items-center gap-3">
                  {c.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{c.name}</span>
                      <span className={cn(c.passed ? 'text-green-600' : 'text-red-600')}>
                        {c.value.toFixed(2)}{c.isPercent ? '%' : 'x'}
                      </span>
                    </div>
                    <div className="text-xs text-surface-500">
                      Max loan: ${(c.maxLoan / 1000000).toFixed(2)}M
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
              <div className="text-sm font-medium text-primary-700 dark:text-primary-300">
                Binding Constraint: {bindingConstraint.name}
              </div>
              <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                Maximum supportable loan: ${(bindingConstraint.maxLoan / 1000000).toFixed(2)}M
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Payment Breakdown</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Interest Only</span>
                <span className="font-medium">${(interestOnly / 12 / 1000).toFixed(1)}K/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">P&I Payment</span>
                <span className="font-medium">${(annualDebtService / 12 / 1000).toFixed(1)}K/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Principal Paydown</span>
                <span className="font-medium">${((annualDebtService - interestOnly) / 12 / 1000).toFixed(1)}K/mo</span>
              </div>
              <div className="border-t border-surface-200 dark:border-surface-700 pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Annual Debt Service</span>
                  <span>${(annualDebtService / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          </div>

          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Typical Lender Requirements</h3>
            <div className="space-y-2 text-xs">
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded">
                <div className="font-medium">Agency (Fannie/Freddie)</div>
                <div className="text-surface-500">DSCR: 1.30x | LTV: 70% | DY: 9%</div>
              </div>
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded">
                <div className="font-medium">CMBS</div>
                <div className="text-surface-500">DSCR: 1.25x | LTV: 75% | DY: 8%</div>
              </div>
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded">
                <div className="font-medium">Bank/Credit Union</div>
                <div className="text-surface-500">DSCR: 1.20x | LTV: 75% | Recourse</div>
              </div>
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded">
                <div className="font-medium">HUD/FHA</div>
                <div className="text-surface-500">DSCR: 1.45x | LTV: 80% | DY: 11%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
