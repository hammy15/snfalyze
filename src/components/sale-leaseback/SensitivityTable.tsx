'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface TwoWayCell {
  capRate: number;
  yieldRequirement: number;
  coverageRatio: number;
  coveragePassFail: boolean;
  purchasePrice: number;
  annualRent: number;
}

interface TwoWayResult {
  capRates: number[];
  yieldRequirements: number[];
  matrix: TwoWayCell[][];
}

interface SensitivityResults {
  capRate?: Array<{
    capRate: number;
    purchasePrice: number;
    annualRent: number;
    coverageRatio: number;
    coveragePassFail: boolean;
  }>;
  twoWay?: TwoWayResult;
  escalationScenarios?: Array<{
    scenario: { name: string; escalationRate: number; leaseTermYears: number };
    year1Rent: number;
    year5Rent: number;
    year10Rent: number;
    totalRentOverTerm: number;
    year1Coverage: number;
    year5Coverage: number;
    year10Coverage: number;
  }>;
}

interface SensitivityTableProps {
  sensitivityResults: SensitivityResults | null;
  baseCapRate: number;
  baseYield: number;
}

export function SensitivityTable({
  sensitivityResults,
  baseCapRate,
  baseYield,
}: SensitivityTableProps) {
  if (!sensitivityResults) {
    return (
      <Card variant="flat" className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-surface-400 mb-4" />
        <p className="text-surface-500">Run calculations to see sensitivity analysis</p>
      </Card>
    );
  }

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatCurrency = (value: number) =>
    value >= 1000000 ? `$${(value / 1000000).toFixed(1)}M` : `$${(value / 1000).toFixed(0)}K`;

  const getCoverageColor = (ratio: number, passes: boolean) => {
    if (passes && ratio >= 1.5) return 'bg-emerald-100 text-emerald-800';
    if (passes) return 'bg-emerald-50 text-emerald-700';
    if (ratio >= 1.3) return 'bg-amber-50 text-amber-700';
    return 'bg-red-50 text-red-700';
  };

  return (
    <div className="space-y-6">
      {/* Two-Way Sensitivity Matrix */}
      {sensitivityResults.twoWay && (
        <Card>
          <CardHeader>
            <CardTitle>Coverage Sensitivity: Cap Rate vs Yield</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2 bg-surface-100 dark:bg-surface-800 text-left">
                      Cap Rate ↓ / Yield →
                    </th>
                    {sensitivityResults.twoWay.yieldRequirements.map((y) => (
                      <th
                        key={y}
                        className={`p-2 text-center ${
                          Math.abs(y - baseYield) < 0.001
                            ? 'bg-emerald-100 dark:bg-emerald-900 font-bold'
                            : 'bg-surface-100 dark:bg-surface-800'
                        }`}
                      >
                        {formatPercent(y)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sensitivityResults.twoWay.matrix.map((row, rowIndex) => {
                    const capRate = sensitivityResults.twoWay!.capRates[rowIndex];
                    const isBaseCapRate = Math.abs(capRate - baseCapRate) < 0.001;

                    return (
                      <tr key={capRate}>
                        <td
                          className={`p-2 font-medium ${
                            isBaseCapRate
                              ? 'bg-emerald-100 dark:bg-emerald-900'
                              : 'bg-surface-50 dark:bg-surface-900'
                          }`}
                        >
                          {formatPercent(capRate)}
                        </td>
                        {row.map((cell, colIndex) => {
                          const isBaseYield =
                            Math.abs(
                              sensitivityResults.twoWay!.yieldRequirements[colIndex] - baseYield
                            ) < 0.001;
                          const isBaseCell = isBaseCapRate && isBaseYield;

                          return (
                            <td
                              key={`${rowIndex}-${colIndex}`}
                              className={`p-2 text-center ${getCoverageColor(
                                cell.coverageRatio,
                                cell.coveragePassFail
                              )} ${isBaseCell ? 'ring-2 ring-emerald-600 ring-inset' : ''}`}
                            >
                              <div className="font-semibold">
                                {cell.coverageRatio.toFixed(2)}x
                              </div>
                              <div className="text-xs opacity-70">
                                {formatCurrency(cell.purchasePrice)}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs text-surface-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-emerald-100" />
                <span>Pass (&ge;1.4x)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-amber-50" />
                <span>Near (1.3-1.4x)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-red-50" />
                <span>Fail (&lt;1.3x)</span>
              </div>
              <div className="flex items-center gap-1 ml-auto">
                <div className="w-3 h-3 rounded ring-2 ring-emerald-600" />
                <span>Current selection</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cap Rate Sensitivity */}
      {sensitivityResults.capRate && (
        <Card>
          <CardHeader>
            <CardTitle>Cap Rate Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 pr-4">Cap Rate</th>
                    <th className="text-right py-2 px-4">Purchase Price</th>
                    <th className="text-right py-2 px-4">Annual Rent</th>
                    <th className="text-right py-2 px-4">Coverage</th>
                    <th className="text-center py-2 pl-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityResults.capRate.map((row) => {
                    const isBase = Math.abs(row.capRate - baseCapRate) < 0.001;
                    return (
                      <tr
                        key={row.capRate}
                        className={`border-b border-surface-100 ${
                          isBase ? 'bg-emerald-50 dark:bg-emerald-950' : ''
                        }`}
                      >
                        <td className="py-2 pr-4">
                          <span className={isBase ? 'font-bold' : ''}>
                            {formatPercent(row.capRate)}
                          </span>
                          {isBase && (
                            <span className="ml-2 text-xs text-emerald-600">(Current)</span>
                          )}
                        </td>
                        <td className="text-right py-2 px-4">
                          {formatCurrency(row.purchasePrice)}
                        </td>
                        <td className="text-right py-2 px-4">
                          {formatCurrency(row.annualRent)}
                        </td>
                        <td
                          className={`text-right py-2 px-4 font-semibold ${
                            row.coveragePassFail ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {row.coverageRatio.toFixed(2)}x
                        </td>
                        <td className="text-center py-2 pl-4">
                          <span
                            className={`px-2 py-0.5 text-xs rounded ${
                              row.coveragePassFail
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {row.coveragePassFail ? 'PASS' : 'FAIL'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rent Escalation Scenarios */}
      {sensitivityResults.escalationScenarios && (
        <Card>
          <CardHeader>
            <CardTitle>Rent Escalation Impact (15-Year Lease)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 pr-4">Escalation</th>
                    <th className="text-right py-2 px-4">Year 1</th>
                    <th className="text-right py-2 px-4">Year 5</th>
                    <th className="text-right py-2 px-4">Year 10</th>
                    <th className="text-right py-2 px-4">Total Rent</th>
                    <th className="text-center py-2 px-4">Y1 Coverage</th>
                    <th className="text-center py-2 px-4">Y5 Coverage</th>
                    <th className="text-center py-2 pl-4">Y10 Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {sensitivityResults.escalationScenarios.map((row) => (
                    <tr key={row.scenario.name} className="border-b border-surface-100">
                      <td className="py-2 pr-4 font-medium">{row.scenario.name}</td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(row.year1Rent)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(row.year5Rent)}
                      </td>
                      <td className="text-right py-2 px-4">
                        {formatCurrency(row.year10Rent)}
                      </td>
                      <td className="text-right py-2 px-4 font-semibold">
                        {formatCurrency(row.totalRentOverTerm)}
                      </td>
                      <td
                        className={`text-center py-2 px-4 ${
                          row.year1Coverage >= 1.4 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {row.year1Coverage.toFixed(2)}x
                      </td>
                      <td
                        className={`text-center py-2 px-4 ${
                          row.year5Coverage >= 1.4 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {row.year5Coverage.toFixed(2)}x
                      </td>
                      <td
                        className={`text-center py-2 pl-4 ${
                          row.year10Coverage >= 1.4 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {row.year10Coverage.toFixed(2)}x
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-surface-500 mt-3">
              * Coverage calculations assume flat EBITDAR (conservative stress test).
              In practice, EBITDAR should grow with revenue increases.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
