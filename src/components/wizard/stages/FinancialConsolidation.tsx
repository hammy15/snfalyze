'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  CheckCircle2,
  Users,
  DollarSign,
  Building2,
  PieChart,
  FileSpreadsheet,
  TrendingUp,
  Calculator,
  Loader2,
  Settings2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface CensusData {
  facilityId: string;
  facilityName: string;
  licensedBeds: number;
  averageDailyCensus: number;
  occupancyRate: number;
  isVerified: boolean;
}

interface PPDData {
  facilityId: string;
  facilityName: string;
  revenuePpd: number;
  laborPpd: number;
  expensesPpd: number;
  noiPpd: number;
}

interface FacilityPnL {
  facilityId: string;
  facilityName: string;
  revenue: number;
  expenses: number;
  noi: number;
  margin: number;
}

interface PortfolioRollup {
  totalRevenue: number;
  totalExpenses: number;
  totalNoi: number;
  noiMargin: number;
  totalBeds: number;
  averageOccupancy: number;
}

interface ProformaAssumptions {
  revenueGrowthRate: number;
  expenseGrowthRate: number;
  targetOccupancy: number | null;
}

interface ProformaProjection {
  year: number;
  isBaseYear: boolean;
  facilities: Array<{
    facilityId: string;
    facilityName: string;
    revenue: number;
    expenses: number;
    noi: number;
    margin: number;
  }>;
  portfolio: {
    revenue: number;
    expenses: number;
    noi: number;
    margin: number;
  };
}

interface ProformaData {
  assumptions: ProformaAssumptions;
  projections: ProformaProjection[];
  summary: {
    baseYear: number;
    projectionYears: number;
  };
}

interface FinancialConsolidationProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

export function FinancialConsolidation({ stageData, onUpdate, dealId }: FinancialConsolidationProps) {
  const [activeTab, setActiveTab] = useState('census');
  const [loading, setLoading] = useState(true);
  const [censusData, setCensusData] = useState<CensusData[]>([]);
  const [ppdData, setPpdData] = useState<PPDData[]>([]);
  const [facilityPnl, setFacilityPnl] = useState<FacilityPnL[]>([]);
  const [rollup, setRollup] = useState<PortfolioRollup | null>(null);
  const [generatingProforma, setGeneratingProforma] = useState(false);
  const [proformaGenerated, setProformaGenerated] = useState(false);
  const [proformaData, setProformaData] = useState<ProformaData | null>(null);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [assumptions, setAssumptions] = useState<ProformaAssumptions>({
    revenueGrowthRate: 2.5,
    expenseGrowthRate: 3.0,
    targetOccupancy: 90,
  });

  // Load financial data from extraction or API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      // First, try to load from extraction data (available before deal is created)
      const extraction = (stageData as any).extraction;
      const facilities = stageData.facilityIdentification?.facilities || [];

      if (extraction && extraction.summary) {
        // Build data from extraction
        const extractionFacilities = extraction.facilities || [];

        // Build census data from extraction
        const censusFromExtraction: CensusData[] = facilities.map((f: any, idx: number) => {
          const extractedFacility = extractionFacilities.find(
            (ef: any) => ef.name?.toLowerCase().includes(f.name?.toLowerCase()) ||
                        f.name?.toLowerCase().includes(ef.name?.toLowerCase())
          ) || extractionFacilities[idx];

          return {
            facilityId: `facility-${idx}`,
            facilityName: f.name || `Facility ${idx + 1}`,
            licensedBeds: f.licensedBeds || extractedFacility?.metrics?.licensedBeds || 100,
            averageDailyCensus: extractedFacility?.metrics?.avgDailyCensus || (f.licensedBeds || 100) * 0.85,
            occupancyRate: extractedFacility?.metrics?.occupancyRate ? extractedFacility.metrics.occupancyRate / 100 : 0.85,
            isVerified: f.isVerified || false,
          };
        });
        setCensusData(censusFromExtraction);

        // Build PPD data from extraction
        const ppdFromExtraction: PPDData[] = facilities.map((f: any, idx: number) => {
          const extractedFacility = extractionFacilities.find(
            (ef: any) => ef.name?.toLowerCase().includes(f.name?.toLowerCase()) ||
                        f.name?.toLowerCase().includes(ef.name?.toLowerCase())
          ) || extractionFacilities[idx];

          return {
            facilityId: `facility-${idx}`,
            facilityName: f.name || `Facility ${idx + 1}`,
            revenuePpd: extractedFacility?.metrics?.revenuePPD || 350,
            laborPpd: extractedFacility?.metrics?.laborPPD || 180,
            expensesPpd: extractedFacility?.metrics?.expensePPD || 300,
            noiPpd: (extractedFacility?.metrics?.revenuePPD || 350) - (extractedFacility?.metrics?.expensePPD || 300),
          };
        });
        setPpdData(ppdFromExtraction);

        // Build P&L from extraction summary
        const totalRevenue = extraction.summary.totalRevenue || 0;
        const totalExpenses = extraction.summary.totalExpenses || 0;
        const totalNoi = extraction.summary.totalNOI || (totalRevenue - totalExpenses);
        const totalBeds = facilities.reduce((sum: number, f: any) => sum + (f.licensedBeds || 100), 0);

        setRollup({
          totalRevenue,
          totalExpenses,
          totalNoi,
          noiMargin: totalRevenue > 0 ? (totalNoi / totalRevenue) * 100 : 0,
          totalBeds,
          averageOccupancy: extraction.summary.avgOccupancy || 85,
        });

        // Build facility P&L
        const facilityPnlFromExtraction: FacilityPnL[] = facilities.map((f: any, idx: number) => {
          const extractedFacility = extractionFacilities.find(
            (ef: any) => ef.name?.toLowerCase().includes(f.name?.toLowerCase()) ||
                        f.name?.toLowerCase().includes(ef.name?.toLowerCase())
          ) || extractionFacilities[idx];

          const facilityRevenue = extractedFacility?.metrics?.netOperatingIncome
            ? (extractedFacility.metrics.netOperatingIncome / (extractedFacility.metrics.ebitdaMargin || 0.15))
            : totalRevenue / Math.max(facilities.length, 1);
          const facilityNoi = extractedFacility?.metrics?.netOperatingIncome || totalNoi / Math.max(facilities.length, 1);
          const facilityExpenses = facilityRevenue - facilityNoi;

          return {
            facilityId: `facility-${idx}`,
            facilityName: f.name || `Facility ${idx + 1}`,
            revenue: facilityRevenue,
            expenses: facilityExpenses,
            noi: facilityNoi,
            margin: facilityRevenue > 0 ? (facilityNoi / facilityRevenue) * 100 : 0,
          };
        });
        setFacilityPnl(facilityPnlFromExtraction);

        setLoading(false);
        return;
      }

      // If no extraction data and no dealId, show empty state
      if (!dealId) {
        setLoading(false);
        return;
      }

      // Load from API if dealId exists
      try {
        // Load census
        const censusRes = await fetch(`/api/deals/${dealId}/financial/census`);
        const censusJson = await censusRes.json();
        if (censusJson.success) {
          setCensusData(censusJson.data.facilities || []);
        }

        // Load PPD
        const ppdRes = await fetch(`/api/deals/${dealId}/financial/ppd`);
        const ppdJson = await ppdRes.json();
        if (ppdJson.success) {
          setPpdData(
            (ppdJson.data.facilities || []).map((f: any) => ({
              facilityId: f.facilityId,
              facilityName: f.facilityName,
              revenuePpd: f.ppd?.revenue?.value || 0,
              laborPpd: f.ppd?.laborCost?.value || 0,
              expensesPpd: f.ppd?.totalExpenses?.value || 0,
              noiPpd: f.ppd?.noi?.value || 0,
            }))
          );
        }

        // Load rollup
        const rollupRes = await fetch(`/api/deals/${dealId}/financial/rollup`);
        const rollupJson = await rollupRes.json();
        if (rollupJson.success) {
          const data = rollupJson.data;
          setRollup({
            totalRevenue: data.financials?.revenue?.total || 0,
            totalExpenses: data.financials?.expenses?.total || 0,
            totalNoi: data.financials?.profitability?.noi || 0,
            noiMargin: data.financials?.profitability?.noiMargin || 0,
            totalBeds: data.portfolio?.totalBeds || 0,
            averageOccupancy: data.portfolio?.weightedOccupancy || 0,
          });

          setFacilityPnl(
            (data.facilities || []).map((f: any) => ({
              facilityId: f.id,
              facilityName: f.name,
              revenue: f.revenue || 0,
              expenses: f.expenses || 0,
              noi: f.noi || 0,
              margin: f.margin || 0,
            }))
          );
        }

        // Check existing stage data
        if (stageData.financialConsolidation?.proformaGenerated) {
          setProformaGenerated(true);
        }
      } catch (err) {
        console.error('Failed to load financial data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [dealId, stageData]);

  // Store onUpdate in a ref to avoid infinite loops
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Track previous values to avoid unnecessary updates
  const prevValuesRef = useRef<{
    censusVerified: boolean;
    ppdCalculated: boolean;
    facilityPnlGenerated: boolean;
    portfolioRollupGenerated: boolean;
    proformaGenerated: boolean;
  } | null>(null);

  // Sync to parent - only when values actually change
  useEffect(() => {
    const newValues = {
      censusVerified: censusData.every((c) => c.isVerified),
      ppdCalculated: ppdData.length > 0,
      facilityPnlGenerated: facilityPnl.length > 0,
      portfolioRollupGenerated: !!rollup,
      proformaGenerated,
    };

    // Only update if values actually changed
    const prev = prevValuesRef.current;
    if (
      !prev ||
      prev.censusVerified !== newValues.censusVerified ||
      prev.ppdCalculated !== newValues.ppdCalculated ||
      prev.facilityPnlGenerated !== newValues.facilityPnlGenerated ||
      prev.portfolioRollupGenerated !== newValues.portfolioRollupGenerated ||
      prev.proformaGenerated !== newValues.proformaGenerated
    ) {
      prevValuesRef.current = newValues;
      onUpdateRef.current({
        financialConsolidation: newValues,
      });
    }
  }, [censusData, ppdData, facilityPnl, rollup, proformaGenerated]);

  // Generate proforma - works with or without dealId
  const generateProforma = async () => {
    setGeneratingProforma(true);
    try {
      // If we have a dealId, use the API
      if (dealId) {
        const response = await fetch(`/api/deals/${dealId}/financial/proforma`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            scenarioName: 'Baseline',
            scenarioType: 'baseline',
            projectionYears: 5,
            revenueGrowthRate: assumptions.revenueGrowthRate / 100,
            expenseGrowthRate: assumptions.expenseGrowthRate / 100,
            targetOccupancy: assumptions.targetOccupancy ? assumptions.targetOccupancy / 100 : null,
          }),
        });

        const data = await response.json();
        if (data.success) {
          setProformaData({
            assumptions,
            projections: data.data.projections,
            summary: {
              baseYear: data.data.summary.baseYear,
              projectionYears: 5,
            },
          });
          setProformaGenerated(true);
        }
      } else {
        // Generate proforma from local extraction data (before deal is created)
        const baseYear = new Date().getFullYear();
        const projections: ProformaProjection[] = [];

        for (let year = 0; year <= 5; year++) {
          const revGrowth = Math.pow(1 + assumptions.revenueGrowthRate / 100, year);
          const expGrowth = Math.pow(1 + assumptions.expenseGrowthRate / 100, year);

          const yearFacilities = facilityPnl.map(f => ({
            facilityId: f.facilityId,
            facilityName: f.facilityName,
            revenue: f.revenue * revGrowth,
            expenses: f.expenses * expGrowth,
            noi: (f.revenue * revGrowth) - (f.expenses * expGrowth),
            margin: f.revenue > 0 ? (((f.revenue * revGrowth) - (f.expenses * expGrowth)) / (f.revenue * revGrowth)) * 100 : 0,
          }));

          const portfolioRevenue = yearFacilities.reduce((sum, f) => sum + f.revenue, 0);
          const portfolioExpenses = yearFacilities.reduce((sum, f) => sum + f.expenses, 0);
          const portfolioNoi = portfolioRevenue - portfolioExpenses;

          projections.push({
            year: baseYear + year,
            isBaseYear: year === 0,
            facilities: yearFacilities,
            portfolio: {
              revenue: portfolioRevenue,
              expenses: portfolioExpenses,
              noi: portfolioNoi,
              margin: portfolioRevenue > 0 ? (portfolioNoi / portfolioRevenue) * 100 : 0,
            },
          });
        }

        setProformaData({
          assumptions,
          projections,
          summary: {
            baseYear,
            projectionYears: 5,
          },
        });
        setProformaGenerated(true);
      }
    } catch (err) {
      console.error('Failed to generate proforma:', err);
    } finally {
      setGeneratingProforma(false);
    }
  };

  // Regenerate proforma with new assumptions
  const regenerateProforma = () => {
    generateProforma();
  };

  // Format currency
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <Building2 className="w-5 h-5 mx-auto text-primary-500 mb-1" />
            <p className="text-2xl font-bold">{censusData.length}</p>
            <p className="text-xs text-surface-500">Facilities</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <Users className="w-5 h-5 mx-auto text-primary-500 mb-1" />
            <p className="text-2xl font-bold">{rollup?.totalBeds || 0}</p>
            <p className="text-xs text-surface-500">Total Beds</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <DollarSign className="w-5 h-5 mx-auto text-primary-500 mb-1" />
            <p className="text-2xl font-bold">
              {formatCurrency(rollup?.totalRevenue || 0)}
            </p>
            <p className="text-xs text-surface-500">Portfolio Revenue</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto text-primary-500 mb-1" />
            <p className="text-2xl font-bold">
              {(rollup?.noiMargin || 0).toFixed(1)}%
            </p>
            <p className="text-xs text-surface-500">NOI Margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="census" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Census</span>
          </TabsTrigger>
          <TabsTrigger value="ppd" className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">PPD</span>
          </TabsTrigger>
          <TabsTrigger value="pnl" className="flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            <span className="hidden sm:inline">P&L</span>
          </TabsTrigger>
          <TabsTrigger value="proforma" className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Proforma</span>
          </TabsTrigger>
          <TabsTrigger value="valuation" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Valuation</span>
          </TabsTrigger>
        </TabsList>

        {/* Census Tab */}
        <TabsContent value="census" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Facility</th>
                  <th className="text-right py-2 font-medium">Beds</th>
                  <th className="text-right py-2 font-medium">ADC</th>
                  <th className="text-right py-2 font-medium">Occupancy</th>
                  <th className="text-center py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {censusData.map((facility) => (
                  <tr key={facility.facilityId} className="border-b">
                    <td className="py-2">{facility.facilityName}</td>
                    <td className="text-right py-2">{facility.licensedBeds}</td>
                    <td className="text-right py-2">
                      {facility.averageDailyCensus.toFixed(1)}
                    </td>
                    <td className="text-right py-2">
                      {(facility.occupancyRate * 100).toFixed(1)}%
                    </td>
                    <td className="text-center py-2">
                      {facility.isVerified ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pending</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* PPD Tab */}
        <TabsContent value="ppd" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Facility</th>
                  <th className="text-right py-2 font-medium">Revenue PPD</th>
                  <th className="text-right py-2 font-medium">Labor PPD</th>
                  <th className="text-right py-2 font-medium">Total Exp PPD</th>
                  <th className="text-right py-2 font-medium">NOI PPD</th>
                </tr>
              </thead>
              <tbody>
                {ppdData.map((facility) => (
                  <tr key={facility.facilityId} className="border-b">
                    <td className="py-2">{facility.facilityName}</td>
                    <td className="text-right py-2 font-mono">
                      ${facility.revenuePpd.toFixed(2)}
                    </td>
                    <td className="text-right py-2 font-mono">
                      ${facility.laborPpd.toFixed(2)}
                    </td>
                    <td className="text-right py-2 font-mono">
                      ${facility.expensesPpd.toFixed(2)}
                    </td>
                    <td className="text-right py-2 font-mono text-primary-600">
                      ${facility.noiPpd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* P&L Tab */}
        <TabsContent value="pnl" className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Facility</th>
                  <th className="text-right py-2 font-medium">Revenue</th>
                  <th className="text-right py-2 font-medium">Expenses</th>
                  <th className="text-right py-2 font-medium">NOI</th>
                  <th className="text-right py-2 font-medium">Margin</th>
                </tr>
              </thead>
              <tbody>
                {facilityPnl.map((facility) => (
                  <tr key={facility.facilityId} className="border-b">
                    <td className="py-2">{facility.facilityName}</td>
                    <td className="text-right py-2 font-mono">
                      {formatCurrency(facility.revenue)}
                    </td>
                    <td className="text-right py-2 font-mono">
                      {formatCurrency(facility.expenses)}
                    </td>
                    <td className="text-right py-2 font-mono text-primary-600">
                      {formatCurrency(facility.noi)}
                    </td>
                    <td className="text-right py-2">
                      {facility.margin.toFixed(1)}%
                    </td>
                  </tr>
                ))}
                {/* Portfolio total */}
                {rollup && (
                  <tr className="font-semibold bg-surface-100 dark:bg-surface-800">
                    <td className="py-2">Portfolio Total</td>
                    <td className="text-right py-2 font-mono">
                      {formatCurrency(rollup.totalRevenue)}
                    </td>
                    <td className="text-right py-2 font-mono">
                      {formatCurrency(rollup.totalExpenses)}
                    </td>
                    <td className="text-right py-2 font-mono text-primary-600">
                      {formatCurrency(rollup.totalNoi)}
                    </td>
                    <td className="text-right py-2">
                      {rollup.noiMargin.toFixed(1)}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Proforma Tab */}
        <TabsContent value="proforma" className="space-y-4">
          {/* Assumptions Panel */}
          <Card variant="flat">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Assumptions
                </h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAssumptions(!showAssumptions)}
                >
                  {showAssumptions ? 'Hide' : 'Edit'}
                </Button>
              </div>

              {showAssumptions ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
                  <div className="space-y-2">
                    <Label>Revenue Growth Rate</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[assumptions.revenueGrowthRate]}
                        onValueChange={(v) => setAssumptions(prev => ({ ...prev, revenueGrowthRate: v[0] }))}
                        min={0}
                        max={10}
                        step={0.5}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{assumptions.revenueGrowthRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Expense Inflation Rate</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[assumptions.expenseGrowthRate]}
                        onValueChange={(v) => setAssumptions(prev => ({ ...prev, expenseGrowthRate: v[0] }))}
                        min={0}
                        max={10}
                        step={0.5}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{assumptions.expenseGrowthRate}%</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Occupancy (Year 5)</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[assumptions.targetOccupancy || 85]}
                        onValueChange={(v) => setAssumptions(prev => ({ ...prev, targetOccupancy: v[0] }))}
                        min={70}
                        max={100}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{assumptions.targetOccupancy || 85}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-6 text-sm text-surface-600">
                  <span>Revenue: +{assumptions.revenueGrowthRate}%/yr</span>
                  <span>Expenses: +{assumptions.expenseGrowthRate}%/yr</span>
                  <span>Target Occ: {assumptions.targetOccupancy || 85}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {proformaGenerated && proformaData ? (
            <div className="space-y-4">
              {/* Regenerate button */}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateProforma}
                  disabled={generatingProforma}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", generatingProforma && "animate-spin")} />
                  Recalculate
                </Button>
              </div>

              {/* Projections Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-surface-50 dark:bg-surface-900">
                      <th className="text-left py-3 px-3 font-medium">Metric</th>
                      {proformaData.projections.map((p) => (
                        <th key={p.year} className={cn(
                          "text-right py-3 px-3 font-medium",
                          p.isBaseYear && "bg-primary-50 dark:bg-primary-900/30"
                        )}>
                          {p.year}
                          {p.isBaseYear && <span className="block text-xs text-surface-500">Base</span>}
                        </th>
                      ))}
                      <th className="text-right py-3 px-3 font-medium">CAGR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Revenue Row */}
                    <tr className="border-b hover:bg-surface-50 dark:hover:bg-surface-800">
                      <td className="py-2 px-3 font-medium text-emerald-600">Revenue</td>
                      {proformaData.projections.map((p) => (
                        <td key={p.year} className={cn(
                          "text-right py-2 px-3 font-mono",
                          p.isBaseYear && "bg-primary-50 dark:bg-primary-900/30"
                        )}>
                          {formatCurrency(p.portfolio.revenue)}
                        </td>
                      ))}
                      <td className="text-right py-2 px-3 font-mono text-emerald-600">
                        {assumptions.revenueGrowthRate.toFixed(1)}%
                      </td>
                    </tr>
                    {/* Expenses Row */}
                    <tr className="border-b hover:bg-surface-50 dark:hover:bg-surface-800">
                      <td className="py-2 px-3 font-medium text-rose-600">Expenses</td>
                      {proformaData.projections.map((p) => (
                        <td key={p.year} className={cn(
                          "text-right py-2 px-3 font-mono",
                          p.isBaseYear && "bg-primary-50 dark:bg-primary-900/30"
                        )}>
                          {formatCurrency(p.portfolio.expenses)}
                        </td>
                      ))}
                      <td className="text-right py-2 px-3 font-mono text-rose-600">
                        {assumptions.expenseGrowthRate.toFixed(1)}%
                      </td>
                    </tr>
                    {/* NOI Row */}
                    <tr className="border-b font-semibold bg-surface-100 dark:bg-surface-800">
                      <td className="py-2 px-3">NOI</td>
                      {proformaData.projections.map((p) => (
                        <td key={p.year} className={cn(
                          "text-right py-2 px-3 font-mono text-primary-600",
                          p.isBaseYear && "bg-primary-100 dark:bg-primary-900/50"
                        )}>
                          {formatCurrency(p.portfolio.noi)}
                        </td>
                      ))}
                      <td className="text-right py-2 px-3 font-mono text-primary-600">
                        {proformaData.projections.length >= 2
                          ? ((Math.pow(
                              proformaData.projections[proformaData.projections.length - 1].portfolio.noi /
                                Math.max(proformaData.projections[0].portfolio.noi, 1),
                              1 / 5
                            ) - 1) * 100).toFixed(1)
                          : '-'}%
                      </td>
                    </tr>
                    {/* NOI Margin Row */}
                    <tr className="border-b hover:bg-surface-50 dark:hover:bg-surface-800">
                      <td className="py-2 px-3 font-medium">NOI Margin</td>
                      {proformaData.projections.map((p) => (
                        <td key={p.year} className={cn(
                          "text-right py-2 px-3",
                          p.isBaseYear && "bg-primary-50 dark:bg-primary-900/30"
                        )}>
                          {p.portfolio.margin.toFixed(1)}%
                        </td>
                      ))}
                      <td className="text-right py-2 px-3">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Per-Facility Breakdown */}
              {proformaData.projections[0].facilities.length > 1 && (
                <Card variant="flat">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Per-Facility Year 5 Projection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">Facility</th>
                            <th className="text-right py-2 font-medium">Base Revenue</th>
                            <th className="text-right py-2 font-medium">Y5 Revenue</th>
                            <th className="text-right py-2 font-medium">Y5 NOI</th>
                            <th className="text-right py-2 font-medium">Y5 Margin</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proformaData.projections[proformaData.projections.length - 1].facilities.map((f, idx) => (
                            <tr key={f.facilityId} className="border-b">
                              <td className="py-2">{f.facilityName}</td>
                              <td className="text-right py-2 font-mono">
                                {formatCurrency(proformaData.projections[0].facilities[idx]?.revenue || 0)}
                              </td>
                              <td className="text-right py-2 font-mono">
                                {formatCurrency(f.revenue)}
                              </td>
                              <td className="text-right py-2 font-mono text-primary-600">
                                {formatCurrency(f.noi)}
                              </td>
                              <td className="text-right py-2">
                                {f.margin.toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Success message */}
              <Card variant="glass">
                <CardContent className="py-4">
                  <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <p className="font-medium">
                      5-year proforma generated. Adjust assumptions above and recalculate as needed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card variant="flat" className="text-center py-8">
              <CardContent>
                <FileSpreadsheet className="w-12 h-12 mx-auto text-surface-300 mb-4" />
                <p className="text-surface-600 dark:text-surface-400 mb-4">
                  Generate a 5-year proforma based on current financial data
                </p>
                <Button
                  onClick={generateProforma}
                  disabled={generatingProforma || facilityPnl.length === 0}
                  loading={generatingProforma}
                >
                  {generatingProforma ? (
                    'Generating...'
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Generate Proforma
                    </>
                  )}
                </Button>
                {facilityPnl.length === 0 && (
                  <p className="text-xs text-surface-500 mt-2">
                    Upload documents with financial data to enable proforma generation
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Valuation Tab — Best Practices */}
        <TabsContent value="valuation" className="space-y-4">
          {rollup && rollup.totalNoi > 0 ? (() => {
            const noi = rollup.totalNoi;
            const beds = rollup.totalBeds || 1;
            const capRates = [0.10, 0.105, 0.11, 0.115, 0.12, 0.125, 0.13];
            const revPpd = beds > 0 ? rollup.totalRevenue / (beds * 365) : 0;
            const expPpd = beds > 0 ? rollup.totalExpenses / (beds * 365) : 0;
            const noiPpd = revPpd - expPpd;
            const stressNoi = noi * 0.75; // 15% rev decline + 10% exp increase

            return (
              <>
                {/* Cap Rate Sensitivity */}
                <Card variant="flat">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Cap Rate Sensitivity Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 font-medium">Cap Rate</th>
                            <th className="text-right py-2 font-medium">Value</th>
                            <th className="text-right py-2 font-medium">Per Bed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {capRates.map(rate => {
                            const value = noi / rate;
                            const perBed = value / beds;
                            const isMid = rate === 0.115;
                            return (
                              <tr key={rate} className={cn('border-b', isMid && 'bg-primary-50 dark:bg-primary-900/30 font-semibold')}>
                                <td className="py-2">{(rate * 100).toFixed(1)}%{isMid ? ' (Base)' : ''}</td>
                                <td className="text-right py-2 font-mono">{formatCurrency(value)}</td>
                                <td className="text-right py-2 font-mono">{formatCurrency(perBed)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Dual View */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card variant="flat" className="border-l-4 border-l-blue-500">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-blue-600">External / Lender View</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Cap Rate</span><span className="font-mono">12.0%</span></div>
                      <div className="flex justify-between"><span>Implied Value</span><span className="font-mono">{formatCurrency(noi / 0.12)}</span></div>
                      <div className="flex justify-between"><span>Per Bed</span><span className="font-mono">{formatCurrency(noi / 0.12 / beds)}</span></div>
                      <div className="flex justify-between"><span>NOI (As-Is)</span><span className="font-mono">{formatCurrency(noi)}</span></div>
                    </CardContent>
                  </Card>
                  <Card variant="flat" className="border-l-4 border-l-emerald-500">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-emerald-600">Cascadia / Execution View</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span>Target Cap Rate</span><span className="font-mono">10.5%</span></div>
                      <div className="flex justify-between"><span>Stabilized Value</span><span className="font-mono">{formatCurrency(noi * 1.15 / 0.105)}</span></div>
                      <div className="flex justify-between"><span>Per Bed (Stabilized)</span><span className="font-mono">{formatCurrency(noi * 1.15 / 0.105 / beds)}</span></div>
                      <div className="flex justify-between"><span>NOI (Stabilized +15%)</span><span className="font-mono">{formatCurrency(noi * 1.15)}</span></div>
                    </CardContent>
                  </Card>
                </div>

                {/* Stress Test */}
                <Card variant="flat" className="border-l-4 border-l-amber-500">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm text-amber-600">Recession Stress Scenario</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-surface-500">Revenue (-15%)</p>
                        <p className="font-mono font-medium">{formatCurrency(rollup.totalRevenue * 0.85)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500">Expenses (+10%)</p>
                        <p className="font-mono font-medium">{formatCurrency(rollup.totalExpenses * 1.10)}</p>
                      </div>
                      <div>
                        <p className="text-surface-500">Stressed NOI</p>
                        <p className={cn('font-mono font-medium', stressNoi > 0 ? 'text-emerald-600' : 'text-rose-600')}>
                          {formatCurrency(rollup.totalRevenue * 0.85 - rollup.totalExpenses * 1.10)}
                        </p>
                      </div>
                      <div>
                        <p className="text-surface-500">Stressed Value (12%)</p>
                        <p className="font-mono font-medium">
                          {formatCurrency(Math.max(0, (rollup.totalRevenue * 0.85 - rollup.totalExpenses * 1.10)) / 0.12)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* PPD Metrics */}
                <Card variant="flat">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Per Patient Day (PPD) Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-surface-500 text-xs">Revenue PPD</p>
                        <p className="text-xl font-bold text-emerald-600">${revPpd.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-surface-500 text-xs">Expense PPD</p>
                        <p className="text-xl font-bold text-rose-600">${expPpd.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-surface-500 text-xs">NOI PPD</p>
                        <p className="text-xl font-bold text-primary-600">${noiPpd.toFixed(2)}</p>
                      </div>
                      <div className="text-center p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
                        <p className="text-surface-500 text-xs">NOI Margin</p>
                        <p className="text-xl font-bold">{rollup.noiMargin.toFixed(1)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            );
          })() : (
            <Card variant="flat" className="text-center py-8">
              <CardContent>
                <TrendingUp className="w-12 h-12 mx-auto text-surface-300 mb-4" />
                <p className="text-surface-500">Financial data required for valuation analysis.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Completion summary */}
      {proformaGenerated && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                Financial consolidation complete! Click "Complete Setup" to finalize
                the deal.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
