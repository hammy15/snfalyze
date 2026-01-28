'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, DollarSign, Plus, Trash2, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CashFlow {
  year: number;
  amount: number;
}

export default function IrrNpvCalculatorPage() {
  const [initialInvestment, setInitialInvestment] = useState<number>(20000000);
  const [discountRate, setDiscountRate] = useState<number>(10);
  const [holdPeriod, setHoldPeriod] = useState<number>(5);
  const [cashFlows, setCashFlows] = useState<CashFlow[]>([
    { year: 1, amount: 1200000 },
    { year: 2, amount: 1300000 },
    { year: 3, amount: 1400000 },
    { year: 4, amount: 1500000 },
    { year: 5, amount: 1600000 },
  ]);
  const [exitValue, setExitValue] = useState<number>(25000000);

  // Calculate NPV
  const npv = useMemo(() => {
    let value = -initialInvestment;
    cashFlows.forEach((cf) => {
      value += cf.amount / Math.pow(1 + discountRate / 100, cf.year);
    });
    // Add exit value
    value += exitValue / Math.pow(1 + discountRate / 100, holdPeriod);
    return value;
  }, [initialInvestment, cashFlows, discountRate, exitValue, holdPeriod]);

  // Calculate IRR using Newton-Raphson method
  const irr = useMemo(() => {
    const allCashFlows = [-initialInvestment, ...cashFlows.map((cf) => cf.amount)];
    // Add exit value to last year
    allCashFlows[allCashFlows.length - 1] += exitValue;

    let rate = 0.1; // Initial guess
    const maxIterations = 100;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npvCalc = 0;
      let derivative = 0;

      for (let j = 0; j < allCashFlows.length; j++) {
        npvCalc += allCashFlows[j] / Math.pow(1 + rate, j);
        derivative -= j * allCashFlows[j] / Math.pow(1 + rate, j + 1);
      }

      const newRate = rate - npvCalc / derivative;
      if (Math.abs(newRate - rate) < tolerance) {
        return newRate * 100;
      }
      rate = newRate;
    }
    return rate * 100;
  }, [initialInvestment, cashFlows, exitValue]);

  // Calculate equity multiple
  const equityMultiple = useMemo(() => {
    const totalReturns = cashFlows.reduce((sum, cf) => sum + cf.amount, 0) + exitValue;
    return totalReturns / initialInvestment;
  }, [cashFlows, exitValue, initialInvestment]);

  const addYear = () => {
    const newYear = cashFlows.length + 1;
    setCashFlows([...cashFlows, { year: newYear, amount: cashFlows[cashFlows.length - 1]?.amount || 0 }]);
    setHoldPeriod(newYear);
  };

  const removeYear = (year: number) => {
    setCashFlows(cashFlows.filter((cf) => cf.year !== year).map((cf, i) => ({ ...cf, year: i + 1 })));
    setHoldPeriod(cashFlows.length - 1);
  };

  const updateCashFlow = (year: number, amount: number) => {
    setCashFlows(cashFlows.map((cf) => (cf.year === year ? { ...cf, amount } : cf)));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">IRR/NPV Calculator</h1>
          <p className="text-sm text-surface-500">Investment return analysis with cash flow projections</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Inputs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Basic Inputs */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Investment Parameters</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium mb-1">Initial Investment</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={initialInvestment}
                    onChange={(e) => setInitialInvestment(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Discount Rate (%)</label>
                <input
                  type="number"
                  step="0.5"
                  value={discountRate}
                  onChange={(e) => setDiscountRate(Number(e.target.value))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Exit Value</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={exitValue}
                    onChange={(e) => setExitValue(Number(e.target.value))}
                    className="input pl-9"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cash Flows */}
          <div className="neu-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Annual Cash Flows</h3>
              <button onClick={addYear} className="neu-button text-xs py-1 px-2 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Year
              </button>
            </div>
            <div className="space-y-2">
              {cashFlows.map((cf) => (
                <div key={cf.year} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">Year {cf.year}</span>
                  <div className="relative flex-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="number"
                      value={cf.amount}
                      onChange={(e) => updateCashFlow(cf.year, Number(e.target.value))}
                      className="input pl-9"
                    />
                  </div>
                  {cashFlows.length > 1 && (
                    <button onClick={() => removeYear(cf.year)} className="p-2 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <div className="neu-card p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <h3 className="text-sm font-semibold mb-3">Investment Returns</h3>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="p-3 rounded-lg bg-white dark:bg-surface-800">
                <div className="text-xs text-surface-500 mb-1">IRR</div>
                <div className={cn('text-2xl font-bold', irr >= discountRate ? 'text-green-600' : 'text-red-600')}>
                  {irr.toFixed(2)}%
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-surface-800">
                <div className="text-xs text-surface-500 mb-1">NPV</div>
                <div className={cn('text-2xl font-bold', npv >= 0 ? 'text-green-600' : 'text-red-600')}>
                  ${(npv / 1000000).toFixed(2)}M
                </div>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-surface-800">
                <div className="text-xs text-surface-500 mb-1">Equity Multiple</div>
                <div className="text-2xl font-bold text-primary-600">{equityMultiple.toFixed(2)}x</div>
              </div>
              <div className="p-3 rounded-lg bg-white dark:bg-surface-800">
                <div className="text-xs text-surface-500 mb-1">Hold Period</div>
                <div className="text-2xl font-bold">{holdPeriod} yrs</div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-white/50 dark:bg-surface-800/50 rounded-lg">
              <div className="text-sm">
                {npv >= 0 ? (
                  <span className="text-green-700 dark:text-green-400">
                    ✓ This investment exceeds your {discountRate}% hurdle rate with an IRR of {irr.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-red-700 dark:text-red-400">
                    ✗ This investment does not meet your {discountRate}% hurdle rate
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Cash Flow Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Initial Investment</span>
                <span className="font-medium text-red-600">-${(initialInvestment / 1000000).toFixed(2)}M</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Total Cash Flows</span>
                <span className="font-medium text-green-600">
                  +${(cashFlows.reduce((s, c) => s + c.amount, 0) / 1000000).toFixed(2)}M
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-surface-500">Exit Proceeds</span>
                <span className="font-medium text-green-600">+${(exitValue / 1000000).toFixed(2)}M</span>
              </div>
              <div className="border-t border-surface-200 dark:border-surface-700 pt-2 mt-2">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Returns</span>
                  <span className="text-primary-600">
                    ${((cashFlows.reduce((s, c) => s + c.amount, 0) + exitValue) / 1000000).toFixed(2)}M
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">IRR Benchmarks</h3>
            <div className="space-y-2 text-xs">
              {[
                { label: 'Core', range: '6-8%', color: 'bg-blue-500' },
                { label: 'Core Plus', range: '8-12%', color: 'bg-green-500' },
                { label: 'Value Add', range: '12-18%', color: 'bg-amber-500' },
                { label: 'Opportunistic', range: '18%+', color: 'bg-red-500' },
              ].map((b) => (
                <div key={b.label} className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', b.color)} />
                  <span className="flex-1">{b.label}</span>
                  <span className="text-surface-500">{b.range}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-surface-50 dark:bg-surface-800 rounded text-xs">
              Your IRR of <strong>{irr.toFixed(1)}%</strong> is{' '}
              {irr < 8 ? 'Core' : irr < 12 ? 'Core Plus' : irr < 18 ? 'Value Add' : 'Opportunistic'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
