'use client';

import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CensusByPayerTable } from './census-by-payer';
import { PPDRatesEditor } from './ppd-rates-editor';
import { IncomeStatement } from './income-statement';
import { ProformaEditor } from './proforma-editor';
import {
  CensusPeriod,
  PayerRates,
  PLLineItem,
  ProformaAssumption,
  ProformaOverride,
  YearlyProforma,
  CensusByPayer,
  DEFAULT_PPD_RATES,
  getTotalDays,
} from './types';

interface FacilityFinancialDashboardProps {
  facilityId: string;
  facilityName: string;
  totalBeds: number;
  scenarioId: string;
  scenarioName?: string;

  // Census data
  censusPeriods: CensusPeriod[];
  onSaveCensus?: (periods: CensusPeriod[]) => Promise<void>;

  // PPD Rates
  currentRates: PayerRates;
  historicalRates?: PayerRates[];
  onSaveRates?: (rates: PayerRates) => Promise<void>;

  // P&L Data
  plLineItems: PLLineItem[];
  budgetLineItems?: PLLineItem[];

  // Pro Forma
  proformaAssumptions: ProformaAssumption[];
  proformaOverrides?: ProformaOverride[];
  baselineProforma?: YearlyProforma;
  onSaveProforma?: (assumptions: ProformaAssumption[], overrides: ProformaOverride[]) => Promise<void>;
}

export function FacilityFinancialDashboard({
  facilityId,
  facilityName,
  totalBeds,
  scenarioId,
  scenarioName = 'Base Case',
  censusPeriods,
  onSaveCensus,
  currentRates,
  historicalRates = [],
  onSaveRates,
  plLineItems,
  budgetLineItems = [],
  proformaAssumptions,
  proformaOverrides = [],
  baselineProforma,
  onSaveProforma,
}: FacilityFinancialDashboardProps) {
  const [activeTab, setActiveTab] = useState('census');

  // Calculate annual census from periods
  const annualCensus = useMemo((): CensusByPayer => {
    if (censusPeriods.length === 0) {
      return {
        medicarePartADays: 0,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
      };
    }

    return censusPeriods.reduce(
      (acc, period) => ({
        medicarePartADays: acc.medicarePartADays + period.medicarePartADays,
        medicareAdvantageDays: acc.medicareAdvantageDays + period.medicareAdvantageDays,
        managedCareDays: acc.managedCareDays + period.managedCareDays,
        medicaidDays: acc.medicaidDays + period.medicaidDays,
        managedMedicaidDays: acc.managedMedicaidDays + period.managedMedicaidDays,
        privateDays: acc.privateDays + period.privateDays,
        vaContractDays: acc.vaContractDays + period.vaContractDays,
        hospiceDays: acc.hospiceDays + period.hospiceDays,
        otherDays: acc.otherDays + period.otherDays,
      }),
      {
        medicarePartADays: 0,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
      }
    );
  }, [censusPeriods]);

  // Calculate total patient days for P&L
  const totalPatientDays = useMemo(() => getTotalDays(annualCensus), [annualCensus]);

  // Calculate P&L period description
  const plPeriod = useMemo(() => {
    if (censusPeriods.length === 0) return 'TTM';
    const firstPeriod = censusPeriods[0];
    const lastPeriod = censusPeriods[censusPeriods.length - 1];
    const start = new Date(firstPeriod.periodStart);
    const end = new Date(lastPeriod.periodEnd);
    return `${start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  }, [censusPeriods]);

  // Generate baseline pro forma if not provided
  const defaultBaselineProforma = useMemo((): YearlyProforma => {
    if (baselineProforma) return baselineProforma;

    // Calculate from P&L data
    const totalRevenue = plLineItems
      .filter((item) => item.category === 'revenue')
      .reduce((sum, item) => sum + item.actual, 0);

    const totalExpenses = plLineItems
      .filter((item) => item.category === 'expense')
      .reduce((sum, item) => sum + item.actual, 0);

    const rent = plLineItems.find((item) => item.coaCode === '6100')?.actual || totalRevenue * 0.08;
    const ebitdar = totalRevenue - totalExpenses;
    const ebitda = ebitdar - rent;

    const avgOccupancy = totalBeds > 0 ? (totalPatientDays / 365) / totalBeds : 0.85;

    return {
      year: new Date().getFullYear(),
      totalDays: totalPatientDays || totalBeds * 365 * 0.85,
      occupancy: avgOccupancy,
      revenue: totalRevenue || totalBeds * 365 * avgOccupancy * 280,
      expenses: totalExpenses || (totalRevenue || totalBeds * 365 * avgOccupancy * 280) * 0.82,
      ebitdar: ebitdar || (totalRevenue || totalBeds * 365 * avgOccupancy * 280) * 0.18,
      rent: rent,
      ebitda: ebitda || (totalRevenue || totalBeds * 365 * avgOccupancy * 280) * 0.10,
      ebitdaMargin: totalRevenue > 0 ? ebitda / totalRevenue : 0.10,
    };
  }, [baselineProforma, plLineItems, totalBeds, totalPatientDays]);

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="census">Census</TabsTrigger>
          <TabsTrigger value="ppd">PPD/Rates</TabsTrigger>
          <TabsTrigger value="pl">P&L</TabsTrigger>
          <TabsTrigger value="proforma">Pro Forma</TabsTrigger>
        </TabsList>

        <TabsContent value="census" className="mt-4">
          <CensusByPayerTable
            facilityId={facilityId}
            facilityName={facilityName}
            totalBeds={totalBeds}
            censusPeriods={censusPeriods}
            onSave={onSaveCensus}
          />
        </TabsContent>

        <TabsContent value="ppd" className="mt-4">
          <PPDRatesEditor
            facilityId={facilityId}
            facilityName={facilityName}
            currentRates={currentRates}
            historicalRates={historicalRates}
            annualCensus={annualCensus}
            onSave={onSaveRates}
          />
        </TabsContent>

        <TabsContent value="pl" className="mt-4">
          <IncomeStatement
            facilityId={facilityId}
            facilityName={facilityName}
            period={plPeriod}
            totalPatientDays={totalPatientDays}
            lineItems={plLineItems}
            budgetLineItems={budgetLineItems}
          />
        </TabsContent>

        <TabsContent value="proforma" className="mt-4">
          <ProformaEditor
            facilityId={facilityId}
            facilityName={facilityName}
            scenarioId={scenarioId}
            scenarioName={scenarioName}
            baseYear={new Date().getFullYear()}
            projectionYears={5}
            initialAssumptions={proformaAssumptions}
            initialOverrides={proformaOverrides}
            baselineData={defaultBaselineProforma}
            onSave={onSaveProforma}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FacilityFinancialDashboard;
