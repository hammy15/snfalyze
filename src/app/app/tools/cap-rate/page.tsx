'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calculator, TrendingUp, Building2, DollarSign, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CapRateScenario {
  id: string;
  name: string;
  noi: number;
  value: number;
  capRate: number;
}

export default function CapRateCalculatorPage() {
  const [mode, setMode] = useState<'cap-rate' | 'value' | 'noi'>('cap-rate');
  const [noi, setNoi] = useState<number>(1500000);
  const [propertyValue, setPropertyValue] = useState<number>(20000000);
  const [capRate, setCapRate] = useState<number>(7.5);
  const [scenarios, setScenarios] = useState<CapRateScenario[]>([]);

  // Calculate based on mode
  const calculatedValue = useMemo(() => {
    switch (mode) {
      case 'cap-rate':
        return propertyValue > 0 ? (noi / propertyValue) * 100 : 0;
      case 'value':
        return capRate > 0 ? noi / (capRate / 100) : 0;
      case 'noi':
        return propertyValue * (capRate / 100);
    }
  }, [mode, noi, propertyValue, capRate]);

  const displayCapRate = mode === 'cap-rate' ? calculatedValue : capRate;
  const displayValue = mode === 'value' ? calculatedValue : propertyValue;
  const displayNoi = mode === 'noi' ? calculatedValue : noi;

  const pricePerBed = (beds: number) => beds > 0 ? displayValue / beds : 0;

  const addScenario = () => {
    const newScenario: CapRateScenario = {
      id: Date.now().toString(),
      name: `Scenario ${scenarios.length + 1}`,
      noi: displayNoi,
      value: displayValue,
      capRate: displayCapRate,
    };
    setScenarios([...scenarios, newScenario]);
  };

  const removeScenario = (id: string) => {
    setScenarios(scenarios.filter((s) => s.id !== id));
  };

  // Market cap rate benchmarks
  const benchmarks = [
    { type: 'Premium SNF', range: '6.0% - 7.5%', median: 6.75 },
    { type: 'Average SNF', range: '7.5% - 9.0%', median: 8.25 },
    { type: 'Value-Add SNF', range: '9.0% - 11.0%', median: 10.0 },
    { type: 'ALF/Memory Care', range: '5.5% - 7.5%', median: 6.5 },
    { type: 'ILF', range: '5.0% - 6.5%', median: 5.75 },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Cap Rate Calculator</h1>
          <p className="text-sm text-surface-500">Calculate cap rates, values, or NOI from the other two</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calculator */}
        <div className="lg:col-span-2 space-y-4">
          {/* Mode Selector */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Calculate:</h3>
            <div className="flex gap-2">
              {[
                { id: 'cap-rate', label: 'Cap Rate', desc: 'From NOI & Value' },
                { id: 'value', label: 'Property Value', desc: 'From NOI & Cap Rate' },
                { id: 'noi', label: 'Required NOI', desc: 'From Value & Cap Rate' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as typeof mode)}
                  className={cn(
                    'flex-1 p-3 rounded-lg border-2 transition-all text-left',
                    mode === m.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-200 dark:border-surface-700 hover:border-surface-300'
                  )}
                >
                  <div className="font-medium text-sm">{m.label}</div>
                  <div className="text-xs text-surface-500">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Inputs */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Inputs</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* NOI */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Net Operating Income (NOI)
                  {mode === 'noi' && <span className="text-primary-500 ml-1">(Calculated)</span>}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={mode === 'noi' ? Math.round(calculatedValue) : noi}
                    onChange={(e) => setNoi(Number(e.target.value))}
                    disabled={mode === 'noi'}
                    className={cn('input pl-9', mode === 'noi' && 'bg-surface-100 dark:bg-surface-800')}
                    placeholder="Annual NOI"
                  />
                </div>
              </div>

              {/* Property Value */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Property Value
                  {mode === 'value' && <span className="text-primary-500 ml-1">(Calculated)</span>}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    value={mode === 'value' ? Math.round(calculatedValue) : propertyValue}
                    onChange={(e) => setPropertyValue(Number(e.target.value))}
                    disabled={mode === 'value'}
                    className={cn('input pl-9', mode === 'value' && 'bg-surface-100 dark:bg-surface-800')}
                    placeholder="Property value"
                  />
                </div>
              </div>

              {/* Cap Rate */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cap Rate (%)
                  {mode === 'cap-rate' && <span className="text-primary-500 ml-1">(Calculated)</span>}
                </label>
                <div className="relative">
                  <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                  <input
                    type="number"
                    step="0.1"
                    value={mode === 'cap-rate' ? calculatedValue.toFixed(2) : capRate}
                    onChange={(e) => setCapRate(Number(e.target.value))}
                    disabled={mode === 'cap-rate'}
                    className={cn('input pl-9', mode === 'cap-rate' && 'bg-surface-100 dark:bg-surface-800')}
                    placeholder="Cap rate %"
                  />
                </div>
              </div>

              {/* Optional: Beds for price per bed */}
              <div>
                <label className="block text-sm font-medium mb-1">Number of Beds (Optional)</label>
                <input
                  type="number"
                  placeholder="e.g., 120"
                  className="input"
                  id="beds-input"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="neu-card p-4 bg-gradient-to-br from-primary-50 to-teal-50 dark:from-primary-900/20 dark:to-teal-900/20">
            <h3 className="text-sm font-semibold mb-3">Results</h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className={cn('p-3 rounded-lg bg-white dark:bg-surface-800', mode === 'cap-rate' && 'ring-2 ring-primary-500')}>
                <div className="text-xs text-surface-500 mb-1">Cap Rate</div>
                <div className="text-2xl font-bold text-primary-600">{displayCapRate.toFixed(2)}%</div>
              </div>
              <div className={cn('p-3 rounded-lg bg-white dark:bg-surface-800', mode === 'value' && 'ring-2 ring-primary-500')}>
                <div className="text-xs text-surface-500 mb-1">Property Value</div>
                <div className="text-2xl font-bold">${(displayValue / 1000000).toFixed(2)}M</div>
              </div>
              <div className={cn('p-3 rounded-lg bg-white dark:bg-surface-800', mode === 'noi' && 'ring-2 ring-primary-500')}>
                <div className="text-xs text-surface-500 mb-1">NOI</div>
                <div className="text-2xl font-bold">${(displayNoi / 1000).toFixed(0)}K</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={addScenario} className="neu-button-primary text-sm py-1.5 px-3">
                Save Scenario
              </button>
            </div>
          </div>

          {/* Scenarios Comparison */}
          {scenarios.length > 0 && (
            <div className="neu-card p-4">
              <h3 className="text-sm font-semibold mb-3">Saved Scenarios</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-200 dark:border-surface-700">
                      <th className="text-left py-2 px-2">Scenario</th>
                      <th className="text-right py-2 px-2">NOI</th>
                      <th className="text-right py-2 px-2">Value</th>
                      <th className="text-right py-2 px-2">Cap Rate</th>
                      <th className="py-2 px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((s) => (
                      <tr key={s.id} className="border-b border-surface-100 dark:border-surface-800">
                        <td className="py-2 px-2 font-medium">{s.name}</td>
                        <td className="py-2 px-2 text-right">${(s.noi / 1000).toFixed(0)}K</td>
                        <td className="py-2 px-2 text-right">${(s.value / 1000000).toFixed(2)}M</td>
                        <td className="py-2 px-2 text-right text-primary-600 font-medium">{s.capRate.toFixed(2)}%</td>
                        <td className="py-2 px-2 text-right">
                          <button onClick={() => removeScenario(s.id)} className="text-red-500 hover:text-red-700 text-xs">
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Benchmarks */}
        <div className="space-y-4">
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-500" />
              Market Cap Rate Benchmarks
            </h3>
            <div className="space-y-3">
              {benchmarks.map((b) => (
                <div key={b.type} className="p-2 rounded-lg bg-surface-50 dark:bg-surface-800">
                  <div className="font-medium text-sm">{b.type}</div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-surface-500">{b.range}</span>
                    <span className="text-xs font-medium text-primary-600">Med: {b.median}%</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full"
                      style={{ width: `${((displayCapRate - 5) / 6) * 100}%`, maxWidth: '100%', minWidth: '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <div className="text-xs text-amber-700 dark:text-amber-300">
                Your cap rate of <strong>{displayCapRate.toFixed(2)}%</strong> is{' '}
                {displayCapRate < 7 ? 'below' : displayCapRate > 9 ? 'above' : 'within'} typical SNF range.
              </div>
            </div>
          </div>

          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Formula Reference</h3>
            <div className="space-y-2 text-xs text-surface-600 dark:text-surface-400">
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded font-mono">
                Cap Rate = NOI ÷ Value × 100
              </div>
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded font-mono">
                Value = NOI ÷ (Cap Rate ÷ 100)
              </div>
              <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded font-mono">
                NOI = Value × (Cap Rate ÷ 100)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
