'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, TrendingUp, TrendingDown, Percent, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SensitivityAnalysisPage() {
  const [baseNoi, setBaseNoi] = useState<number>(1500000);
  const [baseCapRate, setBaseCapRate] = useState<number>(7.5);
  const [baseValue, setBaseValue] = useState<number>(20000000);

  // Sensitivity ranges
  const noiRange = [-20, -15, -10, -5, 0, 5, 10, 15, 20];
  const capRateRange = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5];

  // Calculate sensitivity matrix
  const sensitivityMatrix = useMemo(() => {
    return noiRange.map((noiDelta) => {
      return capRateRange.map((capDelta) => {
        const adjustedNoi = baseNoi * (1 + noiDelta / 100);
        const adjustedCapRate = baseCapRate + capDelta;
        if (adjustedCapRate <= 0) return null;
        const value = adjustedNoi / (adjustedCapRate / 100);
        const percentChange = ((value - baseValue) / baseValue) * 100;
        return {
          value,
          percentChange,
          noiDelta,
          capDelta,
        };
      });
    });
  }, [baseNoi, baseCapRate, baseValue, noiRange, capRateRange]);

  // Get color based on percent change
  const getColor = (pctChange: number) => {
    if (pctChange > 20) return 'bg-green-600 text-white';
    if (pctChange > 10) return 'bg-green-500 text-white';
    if (pctChange > 5) return 'bg-green-400 text-white';
    if (pctChange > 0) return 'bg-green-200 text-green-800';
    if (pctChange > -5) return 'bg-red-100 text-red-800';
    if (pctChange > -10) return 'bg-red-300 text-white';
    if (pctChange > -20) return 'bg-red-500 text-white';
    return 'bg-red-700 text-white';
  };

  // Monte Carlo simulation
  const [iterations] = useState(1000);
  const monteCarloResults = useMemo(() => {
    const results: number[] = [];
    for (let i = 0; i < iterations; i++) {
      // Random NOI variation: -20% to +20%
      const noiVariation = (Math.random() * 40 - 20) / 100;
      // Random cap rate variation: -1.5% to +1.5%
      const capRateVariation = Math.random() * 3 - 1.5;

      const simNoi = baseNoi * (1 + noiVariation);
      const simCapRate = baseCapRate + capRateVariation;
      if (simCapRate > 0) {
        results.push(simNoi / (simCapRate / 100));
      }
    }
    results.sort((a, b) => a - b);
    return results;
  }, [baseNoi, baseCapRate, iterations]);

  const percentile = (arr: number[], p: number) => arr[Math.floor(arr.length * p / 100)];

  const stats = useMemo(() => ({
    min: Math.min(...monteCarloResults),
    max: Math.max(...monteCarloResults),
    mean: monteCarloResults.reduce((a, b) => a + b, 0) / monteCarloResults.length,
    p10: percentile(monteCarloResults, 10),
    p25: percentile(monteCarloResults, 25),
    p50: percentile(monteCarloResults, 50),
    p75: percentile(monteCarloResults, 75),
    p90: percentile(monteCarloResults, 90),
  }), [monteCarloResults]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">Sensitivity Analysis</h1>
          <p className="text-sm text-surface-500">Monte Carlo simulation and scenario modeling</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="neu-card p-4">
        <h3 className="text-sm font-semibold mb-3">Base Case Assumptions</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium mb-1">Base NOI</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="number"
                value={baseNoi}
                onChange={(e) => setBaseNoi(Number(e.target.value))}
                className="input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Exit Cap Rate (%)</label>
            <input
              type="number"
              step="0.25"
              value={baseCapRate}
              onChange={(e) => setBaseCapRate(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Base Value</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="number"
                value={baseValue}
                onChange={(e) => setBaseValue(Number(e.target.value))}
                className="input pl-9"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sensitivity Matrix */}
        <div className="neu-card p-4">
          <h3 className="text-sm font-semibold mb-3">NOI vs Cap Rate Sensitivity</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="p-1 text-left">NOI \ Cap</th>
                  {capRateRange.map((cap) => (
                    <th key={cap} className="p-1 text-center">
                      {(baseCapRate + cap).toFixed(1)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sensitivityMatrix.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="p-1 font-medium">
                      {noiRange[rowIdx] >= 0 ? '+' : ''}{noiRange[rowIdx]}%
                    </td>
                    {row.map((cell, colIdx) => (
                      <td key={colIdx} className="p-0.5">
                        {cell && (
                          <div className={cn(
                            'p-1 rounded text-center',
                            getColor(cell.percentChange),
                            cell.noiDelta === 0 && cell.capDelta === 0 && 'ring-2 ring-black'
                          )}>
                            ${(cell.value / 1000000).toFixed(1)}M
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span>Value increase</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-red-500" />
              <span>Value decrease</span>
            </div>
          </div>
        </div>

        {/* Monte Carlo Results */}
        <div className="neu-card p-4">
          <h3 className="text-sm font-semibold mb-3">Monte Carlo Simulation ({iterations.toLocaleString()} iterations)</h3>

          {/* Distribution visualization */}
          <div className="relative h-24 bg-surface-100 dark:bg-surface-800 rounded-lg mb-4 overflow-hidden">
            {/* Simple histogram bars */}
            <div className="absolute inset-0 flex items-end justify-around px-1">
              {[10, 25, 50, 75, 90].map((p, i) => {
                const val = percentile(monteCarloResults, p);
                const height = 20 + (p === 50 ? 80 : p > 25 && p < 75 ? 60 : 40);
                return (
                  <div
                    key={p}
                    className="w-8 bg-primary-500 rounded-t"
                    style={{ height: `${height}%` }}
                    title={`P${p}: $${(val / 1000000).toFixed(2)}M`}
                  />
                );
              })}
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded">
              <div className="text-xs text-red-600 dark:text-red-400">Downside (P10)</div>
              <div className="font-bold text-red-700 dark:text-red-300">${(stats.p10 / 1000000).toFixed(2)}M</div>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="text-xs text-green-600 dark:text-green-400">Upside (P90)</div>
              <div className="font-bold text-green-700 dark:text-green-300">${(stats.p90 / 1000000).toFixed(2)}M</div>
            </div>
            <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded">
              <div className="text-xs text-surface-500">Median (P50)</div>
              <div className="font-bold">${(stats.p50 / 1000000).toFixed(2)}M</div>
            </div>
            <div className="p-2 bg-surface-50 dark:bg-surface-800 rounded">
              <div className="text-xs text-surface-500">Mean</div>
              <div className="font-bold">${(stats.mean / 1000000).toFixed(2)}M</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-xs">
            <div className="font-medium text-amber-700 dark:text-amber-300 mb-1">Value at Risk</div>
            <div className="text-amber-600 dark:text-amber-400">
              80% probability value falls between ${(stats.p10 / 1000000).toFixed(2)}M and ${(stats.p90 / 1000000).toFixed(2)}M
            </div>
          </div>
        </div>
      </div>

      {/* Assumptions */}
      <div className="neu-card p-4">
        <h3 className="text-sm font-semibold mb-3">Simulation Assumptions</h3>
        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <h4 className="font-medium text-surface-700 dark:text-surface-300 mb-2">NOI Variation</h4>
            <ul className="space-y-1 text-xs text-surface-500">
              <li>• Range: -20% to +20% from base</li>
              <li>• Distribution: Uniform random</li>
              <li>• Reflects occupancy and rate changes</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-surface-700 dark:text-surface-300 mb-2">Cap Rate Variation</h4>
            <ul className="space-y-1 text-xs text-surface-500">
              <li>• Range: -1.5% to +1.5% from base</li>
              <li>• Distribution: Uniform random</li>
              <li>• Reflects market condition changes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
