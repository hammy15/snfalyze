'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  // Sync to parent
  useEffect(() => {
    onUpdate({
      financialConsolidation: {
        censusVerified: censusData.every((c) => c.isVerified),
        ppdCalculated: ppdData.length > 0,
        facilityPnlGenerated: facilityPnl.length > 0,
        portfolioRollupGenerated: !!rollup,
        proformaGenerated,
      },
    });
  }, [censusData, ppdData, facilityPnl, rollup, proformaGenerated, onUpdate]);

  // Generate proforma
  const generateProforma = async () => {
    if (!dealId) return;

    setGeneratingProforma(true);
    try {
      const response = await fetch(`/api/deals/${dealId}/financial/proforma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenarioName: 'Baseline',
          scenarioType: 'baseline',
          projectionYears: 5,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setProformaGenerated(true);
      }
    } catch (err) {
      console.error('Failed to generate proforma:', err);
    } finally {
      setGeneratingProforma(false);
    }
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
        <TabsList className="grid grid-cols-4 w-full">
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
          {proformaGenerated ? (
            <Card variant="glass">
              <CardContent className="py-6">
                <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <div>
                    <p className="font-medium text-lg">Proforma Generated</p>
                    <p className="text-sm text-surface-500">
                      5-year baseline projection created successfully.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card variant="flat" className="text-center py-8">
              <CardContent>
                <FileSpreadsheet className="w-12 h-12 mx-auto text-surface-300 mb-4" />
                <p className="text-surface-600 dark:text-surface-400 mb-4">
                  Generate a 5-year proforma based on mapped financial data
                </p>
                <Button
                  onClick={generateProforma}
                  disabled={generatingProforma}
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
