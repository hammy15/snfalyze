'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Building2, Users, DollarSign, Percent, Download } from 'lucide-react';
import { exportPortfolioToExcel } from '@/lib/export/portfolio-excel';
import { ScenarioComparison } from './scenario-comparison';
import {
  FacilityFinancials,
  PortfolioMetrics,
  PayerType,
  PAYER_LABELS,
  SKILLED_PAYERS,
  formatCurrency,
  formatPercent,
  formatNumber,
  formatPPD,
} from './types';

interface PortfolioFinancialViewProps {
  dealId?: string;
  dealName?: string;
  facilities: FacilityFinancials[];
  priorYearMetrics?: PortfolioMetrics;
}

export function PortfolioFinancialView({
  dealId,
  dealName = 'Portfolio',
  facilities,
  priorYearMetrics,
}: PortfolioFinancialViewProps) {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(false);

  // Fetch scenarios for the deal
  useEffect(() => {
    async function fetchScenarios() {
      if (!dealId) return;
      setScenariosLoading(true);
      try {
        const res = await fetch(`/api/deals/${dealId}/scenarios`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setScenarios(data.data);
          }
        }
      } catch (err) {
        console.error('Error fetching scenarios:', err);
      } finally {
        setScenariosLoading(false);
      }
    }
    fetchScenarios();
  }, [dealId]);
  // Calculate portfolio-wide metrics
  const portfolioMetrics = useMemo((): PortfolioMetrics => {
    const totalFacilities = facilities.length;
    const totalBeds = facilities.reduce((sum, f) => sum + f.beds, 0);
    const totalDays = facilities.reduce((sum, f) => sum + f.totalDays, 0);
    const totalRevenue = facilities.reduce((sum, f) => sum + f.totalRevenue, 0);
    const totalExpenses = facilities.reduce((sum, f) => sum + f.totalExpenses, 0);
    const totalEbitdar = facilities.reduce((sum, f) => sum + f.ebitdar, 0);
    const totalEbitda = facilities.reduce((sum, f) => sum + f.ebitda, 0);

    // Weighted average occupancy (by beds)
    const weightedOccupancy =
      totalBeds > 0
        ? facilities.reduce((sum, f) => sum + f.occupancy * f.beds, 0) / totalBeds
        : 0;

    // Weighted average PPD (by days)
    const weightedPPD =
      totalDays > 0
        ? facilities.reduce((sum, f) => sum + f.blendedPPD * f.totalDays, 0) / totalDays
        : 0;

    // Weighted margin
    const weightedMargin = totalRevenue > 0 ? totalEbitda / totalRevenue : 0;

    // Rank facilities by EBITDA margin
    const facilitiesRanked = [...facilities].sort((a, b) => {
      const marginA = a.totalRevenue > 0 ? a.ebitda / a.totalRevenue : 0;
      const marginB = b.totalRevenue > 0 ? b.ebitda / b.totalRevenue : 0;
      return marginB - marginA;
    });

    // Combined payer mix
    const payerTotals = new Map<PayerType, { days: number; revenue: number }>();
    const allPayers: PayerType[] = [
      'medicare_part_a',
      'medicare_advantage',
      'managed_care',
      'medicaid',
      'managed_medicaid',
      'private',
      'va_contract',
      'hospice',
      'other',
    ];

    allPayers.forEach((payer) => {
      const totalPayerDays = facilities.reduce((sum, f) => {
        const census = f.censusByPayer;
        switch (payer) {
          case 'medicare_part_a':
            return sum + census.medicarePartADays;
          case 'medicare_advantage':
            return sum + census.medicareAdvantageDays;
          case 'managed_care':
            return sum + census.managedCareDays;
          case 'medicaid':
            return sum + census.medicaidDays;
          case 'managed_medicaid':
            return sum + census.managedMedicaidDays;
          case 'private':
            return sum + census.privateDays;
          case 'va_contract':
            return sum + census.vaContractDays;
          case 'hospice':
            return sum + census.hospiceDays;
          case 'other':
            return sum + census.otherDays;
          default:
            return sum;
        }
      }, 0);

      const totalPayerRevenue = facilities.reduce((sum, f) => {
        const rev = f.revenueByPayer;
        switch (payer) {
          case 'medicare_part_a':
            return sum + rev.medicarePartA;
          case 'medicare_advantage':
            return sum + rev.medicareAdvantage;
          case 'managed_care':
            return sum + rev.managedCare;
          case 'medicaid':
            return sum + rev.medicaid;
          case 'managed_medicaid':
            return sum + rev.managedMedicaid;
          case 'private':
            return sum + rev.private;
          case 'va_contract':
            return sum + rev.vaContract;
          case 'hospice':
            return sum + rev.hospice;
          case 'other':
            return sum + rev.other;
          default:
            return sum;
        }
      }, 0);

      payerTotals.set(payer, { days: totalPayerDays, revenue: totalPayerRevenue });
    });

    const combinedPayerMix = allPayers
      .map((payer) => {
        const data = payerTotals.get(payer) || { days: 0, revenue: 0 };
        return {
          payerType: payer,
          totalDays: data.days,
          percentMix: totalDays > 0 ? data.days / totalDays : 0,
          weightedPPD: data.days > 0 ? data.revenue / data.days : 0,
          totalRevenue: data.revenue,
        };
      })
      .filter((p) => p.totalDays > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return {
      totalFacilities,
      totalBeds,
      totalDays,
      weightedOccupancy,
      totalRevenue,
      totalExpenses,
      totalEbitdar,
      totalEbitda,
      weightedPPD,
      weightedMargin,
      facilitiesRanked,
      combinedPayerMix,
    };
  }, [facilities]);

  // Calculate YoY changes
  const yoyChanges = useMemo(() => {
    if (!priorYearMetrics) return null;
    return {
      revenue: (portfolioMetrics.totalRevenue - priorYearMetrics.totalRevenue) / priorYearMetrics.totalRevenue,
      ebitda: (portfolioMetrics.totalEbitda - priorYearMetrics.totalEbitda) / priorYearMetrics.totalEbitda,
      ppd: (portfolioMetrics.weightedPPD - priorYearMetrics.weightedPPD) / priorYearMetrics.weightedPPD,
      margin: portfolioMetrics.weightedMargin - priorYearMetrics.weightedMargin,
    };
  }, [portfolioMetrics, priorYearMetrics]);

  const renderChangeIndicator = (change: number | undefined, isPercent = false) => {
    if (change === undefined) return null;
    const isPositive = change > 0;
    return (
      <span
        className={`flex items-center gap-0.5 text-xs ${
          isPositive ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-muted-foreground'
        }`}
      >
        {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isPositive ? '+' : ''}
        {isPercent ? `${(change * 100).toFixed(1)} pts` : formatPercent(change)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Portfolio Summary</h2>
          <p className="text-sm text-muted-foreground">
            {portfolioMetrics.totalFacilities} Facilities · {formatNumber(portfolioMetrics.totalBeds)} Beds ·{' '}
            {formatPercent(portfolioMetrics.weightedOccupancy)} Occupancy
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportPortfolioToExcel({
            dealName,
            facilities,
            portfolioMetrics,
            includeProforma: true,
          })}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <DollarSign className="h-8 w-8 text-muted-foreground" />
              {yoyChanges && renderChangeIndicator(yoyChanges.revenue)}
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tabular-nums">{formatCurrency(portfolioMetrics.totalRevenue)}</div>
              <div className="text-xs text-muted-foreground">Total Revenue</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              {yoyChanges && renderChangeIndicator(yoyChanges.ebitda)}
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tabular-nums">{formatCurrency(portfolioMetrics.totalEbitda)}</div>
              <div className="text-xs text-muted-foreground">EBITDA</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Users className="h-8 w-8 text-muted-foreground" />
              {yoyChanges && renderChangeIndicator(yoyChanges.ppd)}
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tabular-nums">{formatPPD(portfolioMetrics.weightedPPD)}</div>
              <div className="text-xs text-muted-foreground">Blended PPD</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <Percent className="h-8 w-8 text-muted-foreground" />
              {yoyChanges && renderChangeIndicator(yoyChanges.margin, true)}
            </div>
            <div className="mt-2">
              <div className="text-2xl font-bold tabular-nums">{formatPercent(portfolioMetrics.weightedMargin)}</div>
              <div className="text-xs text-muted-foreground">EBITDA Margin</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Combined Payer Mix */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Combined Payer Mix</CardTitle>
          <CardDescription>Revenue breakdown by payer type across all facilities</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium">Payer</th>
                <th className="text-right py-2 px-3 font-medium">Total Days</th>
                <th className="text-right py-2 px-3 font-medium">% Mix</th>
                <th className="text-right py-2 px-3 font-medium">Wtd PPD</th>
                <th className="text-right py-2 px-3 font-medium">Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              {portfolioMetrics.combinedPayerMix.map((payer) => (
                <tr key={payer.payerType} className="border-b border-muted/50 hover:bg-muted/30">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {PAYER_LABELS[payer.payerType as PayerType]}
                      {SKILLED_PAYERS.includes(payer.payerType as PayerType) && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          Skilled
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatNumber(payer.totalDays)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatPercent(payer.percentMix)}</td>
                  <td className="py-2 px-3 text-right tabular-nums">{formatPPD(payer.weightedPPD)}</td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">{formatCurrency(payer.totalRevenue)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/30">
                <td className="py-2 px-3">TOTAL</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatNumber(portfolioMetrics.totalDays)}</td>
                <td className="py-2 px-3 text-right">100%</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatPPD(portfolioMetrics.weightedPPD)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(portfolioMetrics.totalRevenue)}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Facility Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Facility Comparison</CardTitle>
          <CardDescription>Performance ranking by EBITDA margin</CardDescription>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium">Facility</th>
                <th className="text-right py-2 px-3 font-medium">Beds</th>
                <th className="text-right py-2 px-3 font-medium">Occ %</th>
                <th className="text-right py-2 px-3 font-medium">Revenue</th>
                <th className="text-right py-2 px-3 font-medium">EBITDA</th>
                <th className="text-right py-2 px-3 font-medium">Margin</th>
                <th className="text-center py-2 px-3 font-medium">Rank</th>
              </tr>
            </thead>
            <tbody>
              {portfolioMetrics.facilitiesRanked.map((facility, index) => {
                const margin = facility.totalRevenue > 0 ? facility.ebitda / facility.totalRevenue : 0;
                return (
                  <tr key={facility.facilityId} className="border-b border-muted/50 hover:bg-muted/30">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {facility.facilityName}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{facility.beds}</td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`tabular-nums ${
                          facility.occupancy >= 0.9
                            ? 'text-green-600'
                            : facility.occupancy >= 0.8
                            ? 'text-amber-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatPercent(facility.occupancy)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(facility.totalRevenue)}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(facility.ebitda)}</td>
                    <td className="py-2 px-3 text-right">
                      <span
                        className={`tabular-nums ${
                          margin >= 0.15 ? 'text-green-600' : margin >= 0.10 ? 'text-amber-600' : 'text-red-600'
                        }`}
                      >
                        {formatPercent(margin)}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <Badge
                        variant={index === 0 ? 'default' : 'secondary'}
                        className={index === 0 ? 'bg-yellow-500' : ''}
                      >
                        #{index + 1}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
              <tr className="font-bold bg-muted/30">
                <td className="py-2 px-3">PORTFOLIO TOTAL</td>
                <td className="py-2 px-3 text-right tabular-nums">{portfolioMetrics.totalBeds}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatPercent(portfolioMetrics.weightedOccupancy)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(portfolioMetrics.totalRevenue)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(portfolioMetrics.totalEbitda)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatPercent(portfolioMetrics.weightedMargin)}</td>
                <td className="py-2 px-3"></td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Scenario Comparison */}
      {dealId && (
        <ScenarioComparison
          dealId={dealId}
          dealName={dealName}
          availableScenarios={scenarios}
        />
      )}

      {/* Combined Pro Forma Summary */}
      {!dealId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Combined Pro Forma (5-Year)</CardTitle>
            <CardDescription>Portfolio-level projections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>
                Pro forma projections are calculated at the facility level. Select a facility tab to view
                individual pro formas, or export all to Excel for combined analysis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PortfolioFinancialView;
