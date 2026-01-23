'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PurchasePriceCalculator } from './PurchasePriceCalculator';
import { CoverageAnalysis } from './CoverageAnalysis';
import { SensitivityTable } from './SensitivityTable';
import { PortfolioRollup } from './PortfolioRollup';
import {
  Building2,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  assetType: 'SNF' | 'ALF' | 'ILF';
  beds: number | null;
  state: string | null;
  city: string | null;
  financials: {
    totalRevenue: string | null;
    ebitdar: string | null;
    noi: string | null;
    normalizedNoi: string | null;
    occupancyRate: string | null;
  } | null;
  saleLeasebackData: {
    propertyNoi: string | null;
    appliedCapRate: string | null;
    purchasePrice: string | null;
    annualRent: string | null;
    coverageRatio: string | null;
    coveragePassFail: boolean | null;
  } | null;
}

interface DealData {
  id: string;
  name: string;
  assetType: string;
  dealStructure: string;
  isAllOrNothing: boolean;
  buyerPartner: {
    id: string;
    name: string;
    minimumCoverageRatio: string | null;
    targetYield: string | null;
  } | null;
}

interface SaleLeasebackDashboardProps {
  dealId: string;
}

export function SaleLeasebackDashboard({ dealId }: SaleLeasebackDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deal, setDeal] = useState<DealData | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [defaults, setDefaults] = useState({
    capRate: 0.125,
    minimumCoverageRatio: 1.4,
    buyerYieldRequirement: 0.125,
  });
  const [calculationResults, setCalculationResults] = useState<{
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
      facilitiesPassingCoverage: number;
      facilitiesFailingCoverage: number;
      blendedCapRate: number;
      impliedPortfolioYield: number;
      diversificationScore: number;
      largestFacilityConcentration: number;
    };
    facilityResults: Array<{
      facilityId: string;
      facilityName: string;
      purchasePrice: number;
      annualRent: number;
      coverageRatio: number;
      coveragePassFail: boolean;
      operatorCashFlowAfterRent: number;
    }>;
    facilityContributions: Array<{
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
    }>;
    assetTypeBreakdown: Array<{
      assetType: string;
      facilityCount: number;
      totalBeds: number;
      totalPurchasePrice: number;
      totalAnnualRent: number;
      totalEbitdar: number;
      blendedCoverageRatio: number;
    }>;
    geographicBreakdown: Array<{
      state: string;
      facilityCount: number;
      totalBeds: number;
      totalPurchasePrice: number;
      percentOfPortfolio: number;
    }>;
    allOrNothingAnalysis: {
      worstFacility: {
        facilityId: string;
        facilityName: string;
        coverageRatio: number;
        isDealkiller: boolean;
      };
      recommendation: string;
      recommendedAction: string;
    } | null;
    sensitivityResults: {
      capRate?: Array<{
        capRate: number;
        purchasePrice: number;
        annualRent: number;
        coverageRatio: number;
        coveragePassFail: boolean;
      }>;
      twoWay?: {
        capRates: number[];
        yieldRequirements: number[];
        matrix: Array<Array<{
          capRate: number;
          yieldRequirement: number;
          coverageRatio: number;
          coveragePassFail: boolean;
          purchasePrice: number;
          annualRent: number;
        }>>;
      };
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
    } | null;
  } | null>(null);

  const [parameters, setParameters] = useState({
    capRate: 0.125,
    buyerYieldRequirement: 0.125,
    minimumCoverageRatio: 1.4,
    leaseTermYears: 15,
    rentEscalation: 0.025,
  });

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/deals/${dealId}/sale-leaseback`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch data');
        }

        setDeal(data.data.deal);
        setFacilities(data.data.facilities);
        setDefaults(data.data.defaults);
        setParameters({
          ...parameters,
          capRate: data.data.defaults.capRate,
          buyerYieldRequirement: data.data.defaults.buyerYieldRequirement,
          minimumCoverageRatio: data.data.defaults.minimumCoverageRatio,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dealId]);

  // Run calculations
  const runCalculations = useCallback(async () => {
    if (!facilities.length) return;

    try {
      setCalculating(true);
      setError(null);

      const facilityInputs = facilities.map((f) => ({
        id: f.id,
        name: f.name,
        assetType: f.assetType,
        beds: f.beds || 0,
        propertyNOI: f.financials?.noi ? parseFloat(f.financials.noi) : 0,
        facilityEbitdar: f.financials?.ebitdar ? parseFloat(f.financials.ebitdar) : 0,
        totalRevenue: f.financials?.totalRevenue ? parseFloat(f.financials.totalRevenue) : 0,
        capRate: parameters.capRate,
        state: f.state,
        city: f.city,
      }));

      const response = await fetch(`/api/deals/${dealId}/sale-leaseback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facilities: facilityInputs,
          buyerYieldRequirement: parameters.buyerYieldRequirement,
          minimumCoverageRatio: parameters.minimumCoverageRatio,
          leaseTermYears: parameters.leaseTermYears,
          rentEscalation: parameters.rentEscalation,
          runSensitivity: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Calculation failed');
      }

      setCalculationResults(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation failed');
    } finally {
      setCalculating(false);
    }
  }, [dealId, facilities, parameters]);

  // Export to Excel
  const exportToExcel = async () => {
    try {
      setExporting(true);
      const response = await fetch(`/api/deals/${dealId}/export/excel`);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${deal?.name || 'deal'}_sale_leaseback.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error && !deal) {
    return (
      <Card variant="flat" className="text-center py-12">
        <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
        <p className="text-surface-600">{error}</p>
      </Card>
    );
  }

  const hasFinancials = facilities.some((f) => f.financials?.ebitdar);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Sale-Leaseback Analysis
          </h2>
          <p className="text-surface-500 mt-1">
            {deal?.name} - {facilities.length} Facilities
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={runCalculations}
            disabled={calculating || !hasFinancials}
          >
            {calculating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Calculate
          </Button>
          <Button
            onClick={exportToExcel}
            disabled={exporting || !calculationResults}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export Excel
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* No Financials Warning */}
      {!hasFinancials && (
        <Card variant="flat" className="bg-amber-50 border-amber-200">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-800">Financial Data Required</p>
                <p className="text-sm text-amber-600">
                  Upload and process financial documents to enable sale-leaseback calculations.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Summary */}
      {calculationResults && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-surface-500">Total Purchase Price</div>
              <div className="text-2xl font-bold text-surface-900">
                ${(calculationResults.portfolio.totalPurchasePrice / 1000000).toFixed(1)}M
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-surface-500">Annual Rent</div>
              <div className="text-2xl font-bold text-surface-900">
                ${(calculationResults.portfolio.totalAnnualRent / 1000000).toFixed(2)}M
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-surface-500">Portfolio Coverage</div>
              <div
                className={`text-2xl font-bold ${
                  calculationResults.portfolio.portfolioCoveragePassFail
                    ? 'text-emerald-600'
                    : 'text-red-600'
                }`}
              >
                {calculationResults.portfolio.portfolioCoverageRatio.toFixed(2)}x
                {calculationResults.portfolio.portfolioCoveragePassFail ? (
                  <CheckCircle className="h-5 w-5 inline ml-2" />
                ) : (
                  <XCircle className="h-5 w-5 inline ml-2" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-surface-500">Operator Cash Flow</div>
              <div className="text-2xl font-bold text-surface-900">
                ${(calculationResults.portfolio.totalOperatorCashFlowAfterRent / 1000000).toFixed(2)}M
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* All-or-Nothing Warning */}
      {calculationResults?.allOrNothingAnalysis && deal?.isAllOrNothing && (
        <Card
          variant="flat"
          className={
            calculationResults.allOrNothingAnalysis.recommendedAction === 'proceed'
              ? 'bg-emerald-50 border-emerald-200'
              : calculationResults.allOrNothingAnalysis.recommendedAction === 'pass'
                ? 'bg-red-50 border-red-200'
                : 'bg-amber-50 border-amber-200'
          }
        >
          <CardContent className="py-4">
            <p className="font-medium">
              {calculationResults.allOrNothingAnalysis.recommendation}
            </p>
            {calculationResults.allOrNothingAnalysis.worstFacility.isDealkiller && (
              <p className="text-sm mt-1">
                Weakest facility: {calculationResults.allOrNothingAnalysis.worstFacility.facilityName}{' '}
                ({calculationResults.allOrNothingAnalysis.worstFacility.coverageRatio.toFixed(2)}x coverage)
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList>
          <TabsTrigger value="calculator" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="coverage" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Coverage
          </TabsTrigger>
          <TabsTrigger value="sensitivity" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Sensitivity
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Portfolio
          </TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <PurchasePriceCalculator
            facilities={facilities}
            parameters={parameters}
            onParametersChange={setParameters}
            results={calculationResults}
          />
        </TabsContent>

        <TabsContent value="coverage">
          <CoverageAnalysis
            facilities={facilities}
            results={calculationResults}
            minimumCoverage={parameters.minimumCoverageRatio}
          />
        </TabsContent>

        <TabsContent value="sensitivity">
          <SensitivityTable
            sensitivityResults={calculationResults?.sensitivityResults ?? null}
            baseCapRate={parameters.capRate}
            baseYield={parameters.buyerYieldRequirement}
          />
        </TabsContent>

        <TabsContent value="portfolio">
          <PortfolioRollup
            facilities={facilities}
            results={calculationResults}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
