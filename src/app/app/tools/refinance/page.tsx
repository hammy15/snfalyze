'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, DollarSign, TrendingUp, Calculator, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RefinanceAnalyzerPage() {
  // Current loan
  const [currentBalance, setCurrentBalance] = useState<number>(12000000);
  const [currentRate, setCurrentRate] = useState<number>(5.5);
  const [currentMonthlyPayment, setCurrentMonthlyPayment] = useState<number>(85000);
  const [remainingTerm, setRemainingTerm] = useState<number>(20);

  // Property
  const [currentValue, setCurrentValue] = useState<number>(22000000);
  const [currentNoi, setCurrentNoi] = useState<number>(1800000);

  // New loan options
  const [newLoanAmount, setNewLoanAmount] = useState<number>(16500000);
  const [newRate, setNewRate] = useState<number>(6.25);
  const [newTerm, setNewTerm] = useState<number>(25);
  const [closingCosts, setClosingCosts] = useState<number>(165000);

  // Calculate new loan payment
  const newMonthlyPayment = useMemo(() => {
    const monthlyRate = newRate / 100 / 12;
    const numPayments = newTerm * 12;
    if (monthlyRate === 0) return newLoanAmount / numPayments;
    return newLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
  }, [newLoanAmount, newRate, newTerm]);

  const newAnnualDebtService = newMonthlyPayment * 12;
  const currentAnnualDebtService = currentMonthlyPayment * 12;

  // Cash out
  const grossCashOut = newLoanAmount - currentBalance;
  const netCashOut = grossCashOut - closingCosts;

  // Metrics
  const newLtv = (newLoanAmount / currentValue) * 100;
  const newDscr = currentNoi / newAnnualDebtService;
  const newDebtYield = (currentNoi / newLoanAmount) * 100;

  const currentLtv = (currentBalance / currentValue) * 100;
  const currentDscr = currentNoi / currentAnnualDebtService;

  // Breakeven analysis
  const monthlyDifference = newMonthlyPayment - currentMonthlyPayment;
  const breakevenMonths = monthlyDifference > 0 ? (closingCosts + Math.max(0, newLoanAmount - currentBalance)) / (netCashOut > 0 ? netCashOut / 60 : 1) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Refinance Analyzer</h1>
          <p className="text-sm text-surface-500">Evaluate refinance scenarios with cash-out options</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Current Loan */}
        <div className="space-y-4">
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              Current Loan
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-surface-500 mb-1">Current Balance</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={currentBalance}
                    onChange={(e) => setCurrentBalance(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Interest Rate (%)</label>
                <input
                  type="number"
                  step="0.125"
                  value={currentRate}
                  onChange={(e) => setCurrentRate(Number(e.target.value))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Monthly Payment</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={currentMonthlyPayment}
                    onChange={(e) => setCurrentMonthlyPayment(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Remaining Term (years)</label>
                <input
                  type="number"
                  value={remainingTerm}
                  onChange={(e) => setRemainingTerm(Number(e.target.value))}
                  className="input"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
              <div className="text-xs text-surface-500 mb-2">Current Metrics</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-surface-500">LTV:</span>
                  <span className="ml-1 font-medium">{currentLtv.toFixed(1)}%</span>
                </div>
                <div>
                  <span className="text-surface-500">DSCR:</span>
                  <span className="ml-1 font-medium">{currentDscr.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Property */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Property</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-surface-500 mb-1">Current Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-surface-500 mb-1">Current NOI</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={currentNoi}
                    onChange={(e) => setCurrentNoi(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* New Loan */}
        <div className="neu-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            New Loan
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-surface-500 mb-1">New Loan Amount</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="number"
                  value={newLoanAmount}
                  onChange={(e) => setNewLoanAmount(Number(e.target.value))}
                  className="input pl-9"
                />
              </div>
              <div className="text-xs text-surface-500 mt-1">
                Max @ 75% LTV: ${((currentValue * 0.75) / 1000000).toFixed(2)}M
              </div>
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Interest Rate (%)</label>
              <input
                type="number"
                step="0.125"
                value={newRate}
                onChange={(e) => setNewRate(Number(e.target.value))}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Amortization (years)</label>
              <select
                value={newTerm}
                onChange={(e) => setNewTerm(Number(e.target.value))}
                className="input"
              >
                <option value={20}>20 years</option>
                <option value={25}>25 years</option>
                <option value={30}>30 years</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-surface-500 mb-1">Closing Costs</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="number"
                  value={closingCosts}
                  onChange={(e) => setClosingCosts(Number(e.target.value))}
                  className="input pl-9"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
            <div className="text-xs text-surface-500 mb-2">New Loan Metrics</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-surface-500">LTV:</span>
                <span className={cn('ml-1 font-medium', newLtv > 75 ? 'text-red-600' : 'text-green-600')}>
                  {newLtv.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-surface-500">DSCR:</span>
                <span className={cn('ml-1 font-medium', newDscr < 1.25 ? 'text-red-600' : 'text-green-600')}>
                  {newDscr.toFixed(2)}x
                </span>
              </div>
              <div>
                <span className="text-surface-500">Debt Yield:</span>
                <span className={cn('ml-1 font-medium', newDebtYield < 9 ? 'text-red-600' : 'text-green-600')}>
                  {newDebtYield.toFixed(1)}%
                </span>
              </div>
              <div>
                <span className="text-surface-500">Monthly:</span>
                <span className="ml-1 font-medium">${(newMonthlyPayment / 1000).toFixed(1)}K</span>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison & Results */}
        <div className="space-y-4">
          <div className="neu-card p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <h3 className="text-sm font-semibold mb-3">Cash-Out Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">New Loan</span>
                <span className="font-medium">${(newLoanAmount / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Pay Off Existing</span>
                <span className="font-medium text-red-600">-${(currentBalance / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Gross Cash Out</span>
                <span className="font-medium">${(grossCashOut / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Closing Costs</span>
                <span className="font-medium text-red-600">-${(closingCosts / 1000).toFixed(0)}K</span>
              </div>
              <div className="border-t border-surface-200 dark:border-surface-700 pt-2">
                <div className="flex justify-between">
                  <span className="font-semibold">Net Cash Out</span>
                  <span className={cn('text-xl font-bold', netCashOut >= 0 ? 'text-green-600' : 'text-red-600')}>
                    ${(netCashOut / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Payment Comparison</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="text-xs text-surface-500">Current Monthly</div>
                  <div className="font-medium">${(currentMonthlyPayment / 1000).toFixed(1)}K</div>
                </div>
                <ArrowRight className="w-4 h-4 text-surface-400" />
                <div className="flex-1 text-right">
                  <div className="text-xs text-surface-500">New Monthly</div>
                  <div className="font-medium">${(newMonthlyPayment / 1000).toFixed(1)}K</div>
                </div>
              </div>
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded text-center">
                <div className="text-xs text-surface-500">Monthly Difference</div>
                <div className={cn('font-bold', monthlyDifference > 0 ? 'text-red-600' : 'text-green-600')}>
                  {monthlyDifference > 0 ? '+' : ''}${(monthlyDifference / 1000).toFixed(1)}K/mo
                </div>
              </div>
            </div>
          </div>

          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Recommendation</h3>
            <div className={cn(
              'p-3 rounded-lg text-sm',
              netCashOut > 0 && newDscr >= 1.25 && newLtv <= 75
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
            )}>
              {netCashOut > 0 && newDscr >= 1.25 && newLtv <= 75 ? (
                <span>✓ Refinance looks favorable with ${(netCashOut / 1000000).toFixed(2)}M cash out while maintaining healthy metrics.</span>
              ) : (
                <span>⚠ Review metrics carefully. {newDscr < 1.25 && 'DSCR below 1.25x. '}{newLtv > 75 && 'LTV exceeds 75%. '}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
