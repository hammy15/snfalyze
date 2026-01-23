'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  assetType: string;
  beds: number | null;
  financials: {
    ebitdar: string | null;
    totalRevenue: string | null;
  } | null;
}

interface Results {
  portfolio: {
    portfolioCoverageRatio: number;
    portfolioCoveragePassFail: boolean;
    totalEbitdar: number;
    totalAnnualRent: number;
    facilitiesPassingCoverage: number;
    facilitiesFailingCoverage: number;
  };
  facilityResults: Array<{
    facilityId: string;
    facilityName: string;
    coverageRatio: number;
    coveragePassFail: boolean;
    annualRent: number;
    operatorCashFlowAfterRent: number;
  }>;
}

interface CoverageAnalysisProps {
  facilities: Facility[];
  results: Results | null;
  minimumCoverage: number;
}

export function CoverageAnalysis({
  facilities,
  results,
  minimumCoverage,
}: CoverageAnalysisProps) {
  if (!results) {
    return (
      <Card variant="flat" className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-surface-400 mb-4" />
        <p className="text-surface-500">Run calculations to see coverage analysis</p>
      </Card>
    );
  }

  const { portfolio, facilityResults } = results;
  const sortedResults = [...facilityResults].sort(
    (a, b) => a.coverageRatio - b.coverageRatio
  );

  const getCoverageColor = (ratio: number) => {
    if (ratio >= minimumCoverage * 1.1) return 'text-emerald-600';
    if (ratio >= minimumCoverage) return 'text-emerald-500';
    if (ratio >= minimumCoverage * 0.9) return 'text-amber-500';
    return 'text-red-600';
  };

  const getCoverageBgColor = (ratio: number) => {
    if (ratio >= minimumCoverage * 1.1) return 'bg-emerald-500';
    if (ratio >= minimumCoverage) return 'bg-emerald-400';
    if (ratio >= minimumCoverage * 0.9) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Coverage Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Portfolio Coverage Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-6">
            {/* Coverage Ratio */}
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${getCoverageColor(
                  portfolio.portfolioCoverageRatio
                )}`}
              >
                {portfolio.portfolioCoverageRatio.toFixed(2)}x
              </div>
              <p className="text-sm text-surface-500 mt-1">Portfolio Coverage</p>
              <div className="flex items-center justify-center mt-2">
                {portfolio.portfolioCoveragePassFail ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    Passes {minimumCoverage}x
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                    <XCircle className="h-4 w-4" />
                    Below {minimumCoverage}x
                  </span>
                )}
              </div>
            </div>

            {/* Cushion/Gap */}
            <div className="text-center">
              <div
                className={`text-4xl font-bold ${
                  portfolio.portfolioCoverageRatio >= minimumCoverage
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {portfolio.portfolioCoverageRatio >= minimumCoverage
                  ? `+${((portfolio.portfolioCoverageRatio - minimumCoverage) * 100).toFixed(0)}%`
                  : `-${((minimumCoverage - portfolio.portfolioCoverageRatio) * 100).toFixed(0)}%`}
              </div>
              <p className="text-sm text-surface-500 mt-1">
                {portfolio.portfolioCoverageRatio >= minimumCoverage ? 'Cushion' : 'Gap'}
              </p>
            </div>

            {/* Pass/Fail Count */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-4">
                <div>
                  <span className="text-3xl font-bold text-emerald-600">
                    {portfolio.facilitiesPassingCoverage}
                  </span>
                  <p className="text-xs text-surface-500">Pass</p>
                </div>
                <div className="text-2xl text-surface-300">/</div>
                <div>
                  <span className="text-3xl font-bold text-red-600">
                    {portfolio.facilitiesFailingCoverage}
                  </span>
                  <p className="text-xs text-surface-500">Fail</p>
                </div>
              </div>
              <p className="text-sm text-surface-500 mt-1">Facilities</p>
            </div>

            {/* Total EBITDAR / Rent */}
            <div className="text-center">
              <div className="text-lg">
                <span className="font-bold text-surface-900 dark:text-surface-100">
                  ${(portfolio.totalEbitdar / 1000000).toFixed(2)}M
                </span>
                <span className="text-surface-400 mx-1">/</span>
                <span className="font-medium text-surface-600">
                  ${(portfolio.totalAnnualRent / 1000000).toFixed(2)}M
                </span>
              </div>
              <p className="text-sm text-surface-500 mt-1">EBITDAR / Rent</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Facility Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Facility Coverage Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedResults.map((result) => {
              const facility = facilities.find((f) => f.id === result.facilityId);
              const coveragePercent = Math.min(
                (result.coverageRatio / (minimumCoverage * 1.5)) * 100,
                100
              );

              return (
                <div key={result.facilityId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {result.coveragePassFail ? (
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="font-medium">{result.facilityName}</span>
                      <span className="text-xs text-surface-400">
                        {facility?.assetType} • {facility?.beds || 0} beds
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold ${getCoverageColor(result.coverageRatio)}`}>
                        {result.coverageRatio.toFixed(2)}x
                      </span>
                      <span
                        className={`text-sm ${
                          result.operatorCashFlowAfterRent >= 0
                            ? 'text-emerald-600'
                            : 'text-red-600'
                        }`}
                      >
                        {result.operatorCashFlowAfterRent >= 0 ? (
                          <TrendingUp className="h-4 w-4 inline" />
                        ) : (
                          <TrendingDown className="h-4 w-4 inline" />
                        )}
                        ${Math.abs(result.operatorCashFlowAfterRent / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress
                      value={coveragePercent}
                      className="h-2"
                    />
                    {/* Minimum coverage marker */}
                    <div
                      className="absolute top-0 h-2 w-0.5 bg-surface-800 dark:bg-surface-200"
                      style={{
                        left: `${(minimumCoverage / (minimumCoverage * 1.5)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-6 pt-4 border-t border-surface-200 text-xs text-surface-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span>Above {minimumCoverage}x</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Near threshold</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Below {minimumCoverage}x</span>
            </div>
            <div className="flex items-center gap-1 ml-auto">
              <div className="w-0.5 h-3 bg-surface-800 dark:bg-surface-200" />
              <span>Minimum required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Stress Scenarios */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Stress Scenarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 pr-4">Scenario</th>
                  <th className="text-right py-2 px-4">EBITDAR Change</th>
                  <th className="text-right py-2 px-4">New Coverage</th>
                  <th className="text-center py-2 pl-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Base Case', change: 0 },
                  { name: 'Mild Stress (-5%)', change: -0.05 },
                  { name: 'Moderate Stress (-10%)', change: -0.10 },
                  { name: 'Severe Stress (-15%)', change: -0.15 },
                  { name: 'Occupancy Gain (+5%)', change: 0.05 },
                ].map((scenario) => {
                  const adjustedEbitdar = portfolio.totalEbitdar * (1 + scenario.change);
                  const newCoverage = adjustedEbitdar / portfolio.totalAnnualRent;
                  const passes = newCoverage >= minimumCoverage;

                  return (
                    <tr key={scenario.name} className="border-b border-surface-100">
                      <td className="py-2 pr-4 font-medium">{scenario.name}</td>
                      <td
                        className={`text-right py-2 px-4 ${
                          scenario.change === 0
                            ? ''
                            : scenario.change > 0
                              ? 'text-emerald-600'
                              : 'text-red-600'
                        }`}
                      >
                        {scenario.change === 0
                          ? '-'
                          : `${scenario.change > 0 ? '+' : ''}${(scenario.change * 100).toFixed(0)}%`}
                      </td>
                      <td className={`text-right py-2 px-4 font-semibold ${getCoverageColor(newCoverage)}`}>
                        {newCoverage.toFixed(2)}x
                      </td>
                      <td className="text-center py-2 pl-4">
                        {passes ? (
                          <CheckCircle className="h-4 w-4 text-emerald-500 inline" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500 inline" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
