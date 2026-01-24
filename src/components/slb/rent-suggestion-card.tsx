'use client';

import { useState } from 'react';
import { Settings, TrendingUp, Building2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { RentSuggestion, PortfolioRentSuggestion, SLBAssumptions } from '@/lib/sale-leaseback/types';
import { formatCurrency, formatPercent, formatCoverage, DEFAULT_ASSUMPTIONS } from '@/lib/sale-leaseback/types';

interface RentSuggestionCardProps {
  portfolioData: PortfolioRentSuggestion | null;
  onAssumptionsChange?: (assumptions: SLBAssumptions) => void;
  isLoading?: boolean;
}

export function RentSuggestionCard({
  portfolioData,
  onAssumptionsChange,
  isLoading = false,
}: RentSuggestionCardProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [assumptions, setAssumptions] = useState<SLBAssumptions>(
    portfolioData?.assumptions || DEFAULT_ASSUMPTIONS
  );

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!portfolioData || portfolioData.facilities.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No Financial Data</p>
          <p className="text-sm">Upload financial documents to see rent suggestions.</p>
        </div>
      </div>
    );
  }

  const { portfolioTotal, facilities } = portfolioData;
  const coverageStatus = portfolioTotal.weightedCoverage >= 1.40 ? 'healthy' :
                         portfolioTotal.weightedCoverage >= 1.25 ? 'warning' : 'critical';

  const handleAssumptionChange = (key: keyof SLBAssumptions, value: number) => {
    const updated = { ...assumptions, [key]: value };
    setAssumptions(updated);
    onAssumptionsChange?.(updated);
  };

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-teal-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Rent Suggestions
          </h3>
        </div>
        <button
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <Settings className="h-4 w-4" />
          Adjust Assumptions
        </button>
      </div>

      {/* Assumptions Panel */}
      {showAssumptions && (
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cap Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="15"
                  value={(assumptions.capRate * 100).toFixed(1)}
                  onChange={(e) => handleAssumptionChange('capRate', parseFloat(e.target.value) / 100)}
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Yield Requirement
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="5"
                  max="15"
                  value={(assumptions.yield * 100).toFixed(1)}
                  onChange={(e) => handleAssumptionChange('yield', parseFloat(e.target.value) / 100)}
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Min Coverage
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.05"
                  min="1.0"
                  max="2.0"
                  value={assumptions.minCoverage.toFixed(2)}
                  onChange={(e) => handleAssumptionChange('minCoverage', parseFloat(e.target.value))}
                  className="w-20 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
                />
                <span className="text-sm text-gray-500">x</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Portfolio Summary */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Purchase Price</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(portfolioTotal.totalPurchasePrice)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatCurrency(portfolioTotal.blendedPricePerBed)}/bed
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Annual Rent</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(portfolioTotal.totalAnnualRent)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formatCurrency(portfolioTotal.totalMonthlyRent)}/month
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Coverage Ratio</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCoverage(portfolioTotal.weightedCoverage)}
              </p>
              {coverageStatus === 'healthy' && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {coverageStatus === 'warning' && (
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
              )}
              {coverageStatus === 'critical' && (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className={`text-xs mt-1 ${
              coverageStatus === 'healthy' ? 'text-green-600 dark:text-green-400' :
              coverageStatus === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {coverageStatus === 'healthy' ? 'Healthy' :
               coverageStatus === 'warning' ? 'Caution' : 'At Risk'}
            </p>
          </div>
        </div>

        {/* Per-Building Breakdown */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Per Building Breakdown
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    Facility
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    EBITDAR
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    Purchase
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    Annual Rent
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    Coverage
                  </th>
                  <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr
                    key={facility.facilityId}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                  >
                    <td className="py-2 px-3 text-gray-900 dark:text-white">
                      {facility.facilityName}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(facility.ttmEbitdar)}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(facility.suggestedPurchasePrice)}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                      {formatCurrency(facility.suggestedAnnualRent)}
                    </td>
                    <td className="py-2 px-3 text-right text-gray-700 dark:text-gray-300">
                      {formatCoverage(facility.coverageRatio)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      {facility.coverageStatus === 'healthy' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          OK
                        </span>
                      )}
                      {facility.coverageStatus === 'warning' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Warn
                        </span>
                      )}
                      {facility.coverageStatus === 'critical' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Risk
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-900 font-medium">
                  <td className="py-2 px-3 text-gray-900 dark:text-white">
                    TOTAL
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(portfolioTotal.totalEbitdar)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(portfolioTotal.totalPurchasePrice)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                    {formatCurrency(portfolioTotal.totalAnnualRent)}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-900 dark:text-white">
                    {formatCoverage(portfolioTotal.weightedCoverage)}
                  </td>
                  <td className="py-2 px-3" />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Assumptions Footer */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Assumptions:</span>{' '}
            Cap Rate {formatPercent(assumptions.capRate, 1)} |{' '}
            Yield {formatPercent(assumptions.yield, 1)} |{' '}
            Min Coverage {formatCoverage(assumptions.minCoverage)}
          </p>
        </div>
      </div>
    </div>
  );
}
