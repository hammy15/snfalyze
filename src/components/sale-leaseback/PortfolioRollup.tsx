'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Building2, MapPin, Bed, PieChart, AlertTriangle } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  assetType: string;
  beds: number | null;
  state: string | null;
  city: string | null;
  financials: {
    ebitdar: string | null;
    totalRevenue: string | null;
    noi: string | null;
  } | null;
}

interface FacilityContribution {
  facilityId: string;
  facilityName: string;
  assetType: string;
  beds: number;
  percentOfTotalBeds: number;
  purchasePrice: number;
  percentOfTotalPurchasePrice: number;
  annualRent: number;
  percentOfTotalRent: number;
  ebitdar: number;
  percentOfTotalEbitdar: number;
  individualCoverageRatio: number;
  individualCoveragePassFail: boolean;
  operatorCashFlow: number;
}

interface AssetTypeBreakdown {
  assetType: string;
  facilityCount: number;
  totalBeds: number;
  totalPurchasePrice: number;
  totalAnnualRent: number;
  totalEbitdar: number;
  blendedCoverageRatio: number;
}

interface GeographicBreakdown {
  state: string;
  facilityCount: number;
  totalBeds: number;
  totalPurchasePrice: number;
  percentOfPortfolio: number;
}

interface Results {
  portfolio: {
    totalPurchasePrice: number;
    totalAnnualRent: number;
    totalMonthlyRent: number;
    portfolioCoverageRatio: number;
    portfolioCoveragePassFail: boolean;
    totalOperatorCashFlowAfterRent: number;
    totalBeds: number;
    totalEbitdar: number;
    totalRevenue: number;
    blendedCapRate: number;
    impliedPortfolioYield: number;
    diversificationScore: number;
    largestFacilityConcentration: number;
  };
  facilityContributions: FacilityContribution[];
  assetTypeBreakdown: AssetTypeBreakdown[];
  geographicBreakdown: GeographicBreakdown[];
}

interface PortfolioRollupProps {
  facilities: Facility[];
  results: Results | null;
}

export function PortfolioRollup({ facilities, results }: PortfolioRollupProps) {
  if (!results) {
    return (
      <Card variant="flat" className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-surface-400 mb-4" />
        <p className="text-surface-500">Run calculations to see portfolio rollup</p>
      </Card>
    );
  }

  const { portfolio, facilityContributions, assetTypeBreakdown, geographicBreakdown } = results;

  const formatCurrency = (value: number) =>
    value >= 1000000 ? `$${(value / 1000000).toFixed(2)}M` : `$${(value / 1000).toFixed(0)}K`;

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  const ASSET_TYPE_COLORS: Record<string, string> = {
    SNF: 'bg-blue-500',
    ALF: 'bg-emerald-500',
    ILF: 'bg-purple-500',
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Value</p>
                <p className="text-xl font-bold">{formatCurrency(portfolio.totalPurchasePrice)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Bed className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Total Beds</p>
                <p className="text-xl font-bold">{portfolio.totalBeds}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <PieChart className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Blended Cap Rate</p>
                <p className="text-xl font-bold">{formatPercent(portfolio.blendedCapRate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <MapPin className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-surface-500">Diversification</p>
                <p className="text-xl font-bold">{portfolio.diversificationScore}/100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facility Contribution Table */}
      <Card>
        <CardHeader>
          <CardTitle>Facility Contribution Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 pr-4">Facility</th>
                  <th className="text-right py-2 px-4">Beds</th>
                  <th className="text-right py-2 px-4">Purchase Price</th>
                  <th className="text-right py-2 px-4">Annual Rent</th>
                  <th className="text-right py-2 px-4">EBITDAR</th>
                  <th className="text-right py-2 px-4">Coverage</th>
                  <th className="text-right py-2 pl-4">Cash Flow</th>
                </tr>
              </thead>
              <tbody>
                {facilityContributions.map((fc) => (
                  <tr key={fc.facilityId} className="border-b border-surface-100">
                    <td className="py-3 pr-4">
                      <div className="font-medium">{fc.facilityName}</div>
                      <div className="text-xs text-surface-500">{fc.assetType}</div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div>{fc.beds}</div>
                      <div className="text-xs text-surface-400">
                        {formatPercent(fc.percentOfTotalBeds)}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div>{formatCurrency(fc.purchasePrice)}</div>
                      <div className="text-xs text-surface-400">
                        {formatPercent(fc.percentOfTotalPurchasePrice)}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div>{formatCurrency(fc.annualRent)}</div>
                      <div className="text-xs text-surface-400">
                        {formatPercent(fc.percentOfTotalRent)}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div>{formatCurrency(fc.ebitdar)}</div>
                      <div className="text-xs text-surface-400">
                        {formatPercent(fc.percentOfTotalEbitdar)}
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span
                        className={`font-semibold ${
                          fc.individualCoveragePassFail ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {fc.individualCoverageRatio.toFixed(2)}x
                      </span>
                    </td>
                    <td
                      className={`text-right py-3 pl-4 font-medium ${
                        fc.operatorCashFlow >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(fc.operatorCashFlow)}
                    </td>
                  </tr>
                ))}
                {/* Portfolio Total Row */}
                <tr className="bg-surface-50 dark:bg-surface-800 font-semibold">
                  <td className="py-3 pr-4">Portfolio Total</td>
                  <td className="text-right py-3 px-4">{portfolio.totalBeds}</td>
                  <td className="text-right py-3 px-4">
                    {formatCurrency(portfolio.totalPurchasePrice)}
                  </td>
                  <td className="text-right py-3 px-4">
                    {formatCurrency(portfolio.totalAnnualRent)}
                  </td>
                  <td className="text-right py-3 px-4">
                    {formatCurrency(portfolio.totalEbitdar)}
                  </td>
                  <td
                    className={`text-right py-3 px-4 ${
                      portfolio.portfolioCoveragePassFail ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    {portfolio.portfolioCoverageRatio.toFixed(2)}x
                  </td>
                  <td
                    className={`text-right py-3 pl-4 ${
                      portfolio.totalOperatorCashFlowAfterRent >= 0
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(portfolio.totalOperatorCashFlowAfterRent)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Asset Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Type Mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {assetTypeBreakdown.map((at) => {
              const percent =
                portfolio.totalPurchasePrice > 0
                  ? at.totalPurchasePrice / portfolio.totalPurchasePrice
                  : 0;

              return (
                <div key={at.assetType} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          ASSET_TYPE_COLORS[at.assetType] || 'bg-gray-500'
                        }`}
                      />
                      <span className="font-medium">{at.assetType}</span>
                      <span className="text-xs text-surface-400">
                        ({at.facilityCount} {at.facilityCount === 1 ? 'facility' : 'facilities'})
                      </span>
                    </div>
                    <span className="font-semibold">{formatPercent(percent)}</span>
                  </div>
                  <Progress value={percent * 100} className="h-2" />
                  <div className="flex justify-between text-xs text-surface-500">
                    <span>{at.totalBeds} beds</span>
                    <span>{formatCurrency(at.totalPurchasePrice)}</span>
                    <span>Coverage: {at.blendedCoverageRatio.toFixed(2)}x</span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Geographic Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Geographic Distribution</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {geographicBreakdown.map((geo) => (
              <div key={geo.state} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-surface-400" />
                    <span className="font-medium">{geo.state || 'Unknown'}</span>
                    <span className="text-xs text-surface-400">
                      ({geo.facilityCount}{' '}
                      {geo.facilityCount === 1 ? 'facility' : 'facilities'})
                    </span>
                  </div>
                  <span className="font-semibold">{formatPercent(geo.percentOfPortfolio)}</span>
                </div>
                <Progress value={geo.percentOfPortfolio * 100} className="h-2" />
                <div className="flex justify-between text-xs text-surface-500">
                  <span>{geo.totalBeds} beds</span>
                  <span>{formatCurrency(geo.totalPurchasePrice)}</span>
                </div>
              </div>
            ))}

            {geographicBreakdown.length === 0 && (
              <p className="text-center text-surface-500 py-4">
                No geographic data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Concentration Risk */}
      <Card>
        <CardHeader>
          <CardTitle>Concentration Risk</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-surface-500">Largest Facility Concentration</p>
              <p
                className={`text-2xl font-bold ${
                  portfolio.largestFacilityConcentration > 0.5
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {formatPercent(portfolio.largestFacilityConcentration)}
              </p>
              <p className="text-xs text-surface-400 mt-1">
                {portfolio.largestFacilityConcentration > 0.5
                  ? 'High concentration risk'
                  : 'Acceptable concentration'}
              </p>
            </div>
            <div>
              <p className="text-sm text-surface-500">States Represented</p>
              <p className="text-2xl font-bold">{geographicBreakdown.length}</p>
              <p className="text-xs text-surface-400 mt-1">
                {geographicBreakdown.length > 2
                  ? 'Good geographic diversity'
                  : 'Limited geographic spread'}
              </p>
            </div>
            <div>
              <p className="text-sm text-surface-500">Asset Types</p>
              <p className="text-2xl font-bold">{assetTypeBreakdown.length}</p>
              <p className="text-xs text-surface-400 mt-1">
                {assetTypeBreakdown.length > 1
                  ? 'Diversified asset mix'
                  : 'Single asset type focus'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
