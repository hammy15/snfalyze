'use client';

import { useState, useEffect } from 'react';
import { FacilityFinancialDashboard } from './facility-financial-dashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';
import type {
  CensusPeriod,
  PayerRates,
  PLLineItem,
  ProformaAssumption,
  ProformaOverride,
  YearlyProforma,
} from './types';
import { DEFAULT_PPD_RATES } from './types';

interface FacilityFinancialWrapperProps {
  facilityId: string;
  facilityName: string;
  dealId: string;
  scenarioId?: string;
}

// Default empty rates when none exist
const defaultRates: PayerRates = {
  id: '',
  facilityId: '',
  effectiveDate: new Date().toISOString().split('T')[0],
  medicarePartAPpd: DEFAULT_PPD_RATES.medicare_part_a,
  medicareAdvantagePpd: DEFAULT_PPD_RATES.medicare_advantage,
  managedCarePpd: DEFAULT_PPD_RATES.managed_care,
  medicaidPpd: DEFAULT_PPD_RATES.medicaid,
  managedMedicaidPpd: DEFAULT_PPD_RATES.managed_medicaid,
  privatePpd: DEFAULT_PPD_RATES.private,
  vaContractPpd: DEFAULT_PPD_RATES.va_contract,
  hospicePpd: DEFAULT_PPD_RATES.hospice,
  ancillaryRevenuePpd: 20,
  therapyRevenuePpd: 5,
};

// Default P&L line items when none exist
const defaultPlLineItems: PLLineItem[] = [
  { coaCode: '4000', label: 'Room & Board Revenue', category: 'revenue', actual: 0, ppd: 0 },
  { coaCode: '4100', label: 'Ancillary Revenue', category: 'revenue', actual: 0, ppd: 0 },
  { coaCode: '4200', label: 'Therapy Revenue', category: 'revenue', actual: 0, ppd: 0 },
  { coaCode: '4999', label: 'Total Revenue', category: 'subtotal', actual: 0, ppd: 0, isHighlighted: true },
  { coaCode: '5100', label: 'Salaries & Wages', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5200', label: 'Employee Benefits', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5300', label: 'Contract Labor', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5400', label: 'Dietary', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5500', label: 'Pharmacy', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5600', label: 'Supplies', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5700', label: 'Utilities', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5800', label: 'Insurance', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '5900', label: 'Property Tax', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '6000', label: 'Management Fee', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '6100', label: 'Other Operating', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '6999', label: 'Total Expenses', category: 'subtotal', actual: 0, ppd: 0 },
  { coaCode: '7000', label: 'EBITDAR', category: 'total', actual: 0, ppd: 0, isHighlighted: true },
  { coaCode: '7100', label: 'Rent', category: 'expense', actual: 0, ppd: 0 },
  { coaCode: '7999', label: 'EBITDA', category: 'total', actual: 0, ppd: 0, isHighlighted: true },
];

// Default proforma assumptions - must match keys expected by ProformaEditor
const defaultAssumptions: ProformaAssumption[] = [
  // Revenue growth rates
  { key: 'medicare_rate_increase', label: 'Medicare Rate Increase', value: 0.03, category: 'revenue' },
  { key: 'medicaid_rate_increase', label: 'Medicaid Rate Increase', value: 0.015, category: 'revenue' },
  { key: 'private_rate_increase', label: 'Private Pay Rate Increase', value: 0.04, category: 'revenue' },
  // Expense inflation
  { key: 'wage_increase', label: 'Wage Increase', value: 0.035, category: 'expense' },
  { key: 'benefits_inflation', label: 'Benefits Inflation', value: 0.05, category: 'expense' },
  { key: 'general_inflation', label: 'General Inflation', value: 0.025, category: 'expense' },
  // Occupancy targets by year
  { key: 'occupancy_target_y1', label: 'Occupancy Target Y1', value: 0.86, category: 'census' },
  { key: 'occupancy_target_y3', label: 'Occupancy Target Y3', value: 0.90, category: 'census' },
  { key: 'occupancy_target_y5', label: 'Occupancy Target Y5', value: 0.92, category: 'census' },
  // Growth
  { key: 'rent_escalation', label: 'Rent Escalation', value: 0.02, category: 'growth' },
];

export function FacilityFinancialWrapper({
  facilityId,
  facilityName,
  dealId,
  scenarioId = 'default',
}: FacilityFinancialWrapperProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [censusPeriods, setCensusPeriods] = useState<CensusPeriod[]>([]);
  const [currentRates, setCurrentRates] = useState<PayerRates>(defaultRates);
  const [historicalRates, setHistoricalRates] = useState<PayerRates[]>([]);
  const [plLineItems, setPlLineItems] = useState<PLLineItem[]>(defaultPlLineItems);
  const [proformaAssumptions, setProformaAssumptions] = useState<ProformaAssumption[]>(defaultAssumptions);
  const [proformaOverrides, setProformaOverrides] = useState<ProformaOverride[]>([]);
  const [totalBeds, setTotalBeds] = useState(120); // Default

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Fetch facility details
        const facilityRes = await fetch(`/api/facilities/${facilityId}`);
        if (facilityRes.ok) {
          const facilityData = await facilityRes.json();
          if (facilityData.data?.licensedBeds) {
            setTotalBeds(facilityData.data.licensedBeds);
          }
        }

        // Fetch census data
        const censusRes = await fetch(`/api/facilities/${facilityId}/census`);
        if (censusRes.ok) {
          const censusData = await censusRes.json();
          if (censusData.success && censusData.data?.censusPeriods) {
            setCensusPeriods(
              censusData.data.censusPeriods.map((p: any) => ({
                ...p,
                medicarePartADays: p.medicarePartADays || 0,
                medicareAdvantageDays: p.medicareAdvantageDays || 0,
                managedCareDays: p.managedCareDays || 0,
                medicaidDays: p.medicaidDays || 0,
                managedMedicaidDays: p.managedMedicaidDays || 0,
                privateDays: p.privateDays || 0,
                vaContractDays: p.vaContractDays || 0,
                hospiceDays: p.hospiceDays || 0,
                otherDays: p.otherDays || 0,
              }))
            );
            if (censusData.data.totalBeds) {
              setTotalBeds(censusData.data.totalBeds);
            }
          }
        }

        // Fetch payer rates
        const ratesRes = await fetch(`/api/facilities/${facilityId}/payer-rates`);
        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          if (ratesData.success && ratesData.data) {
            if (ratesData.data.currentRates) {
              setCurrentRates({
                ...defaultRates,
                ...ratesData.data.currentRates,
                medicarePartAPpd: Number(ratesData.data.currentRates.medicarePartAPpd) || DEFAULT_PPD_RATES.medicare_part_a,
                medicareAdvantagePpd: Number(ratesData.data.currentRates.medicareAdvantagePpd) || DEFAULT_PPD_RATES.medicare_advantage,
                managedCarePpd: Number(ratesData.data.currentRates.managedCarePpd) || DEFAULT_PPD_RATES.managed_care,
                medicaidPpd: Number(ratesData.data.currentRates.medicaidPpd) || DEFAULT_PPD_RATES.medicaid,
                managedMedicaidPpd: Number(ratesData.data.currentRates.managedMedicaidPpd) || DEFAULT_PPD_RATES.managed_medicaid,
                privatePpd: Number(ratesData.data.currentRates.privatePpd) || DEFAULT_PPD_RATES.private,
                vaContractPpd: Number(ratesData.data.currentRates.vaContractPpd) || DEFAULT_PPD_RATES.va_contract,
                hospicePpd: Number(ratesData.data.currentRates.hospicePpd) || DEFAULT_PPD_RATES.hospice,
                ancillaryRevenuePpd: Number(ratesData.data.currentRates.ancillaryRevenuePpd) || 20,
                therapyRevenuePpd: Number(ratesData.data.currentRates.therapyRevenuePpd) || 5,
              });
            }
            if (ratesData.data.historicalRates) {
              setHistoricalRates(ratesData.data.historicalRates);
            }
          }
        }

        // Fetch financial data (P&L from financial_periods)
        const financialRes = await fetch(`/api/facilities/${facilityId}/financial?months=12`);
        if (financialRes.ok) {
          const financialData = await financialRes.json();
          if (financialData.success && financialData.data?.plLineItems?.length > 0) {
            setPlLineItems(financialData.data.plLineItems);
          }
        }

        // Fetch proforma assumptions if we have a scenario
        if (scenarioId && scenarioId !== 'default') {
          const proformaRes = await fetch(`/api/proforma/${scenarioId}/assumptions`);
          if (proformaRes.ok) {
            const proformaData = await proformaRes.json();
            if (proformaData.success && proformaData.data) {
              if (proformaData.data.assumptions?.length > 0) {
                setProformaAssumptions(
                  proformaData.data.assumptions.map((a: any) => ({
                    key: a.assumptionKey,
                    label: formatAssumptionLabel(a.assumptionKey),
                    value: Number(a.assumptionValue) || 0,
                    category: categorizeAssumption(a.assumptionKey),
                  }))
                );
              }
              if (proformaData.data.overrides?.length > 0) {
                setProformaOverrides(proformaData.data.overrides);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error fetching facility financial data:', err);
        setError('Failed to load financial data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [facilityId, scenarioId]);

  // Save handlers
  const handleSaveCensus = async (periods: CensusPeriod[]) => {
    const res = await fetch(`/api/facilities/${facilityId}/census`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(periods),
    });
    if (res.ok) {
      setCensusPeriods(periods);
    }
  };

  const handleSaveRates = async (rates: PayerRates) => {
    const method = rates.id ? 'PUT' : 'POST';
    const res = await fetch(`/api/facilities/${facilityId}/payer-rates`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rates),
    });
    if (res.ok) {
      setCurrentRates(rates);
    }
  };

  const handleSaveProforma = async (
    assumptions: ProformaAssumption[],
    overrides: ProformaOverride[]
  ) => {
    if (scenarioId && scenarioId !== 'default') {
      const res = await fetch(`/api/proforma/${scenarioId}/assumptions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assumptions: assumptions.map((a) => ({
            facilityId,
            key: a.key,
            value: a.value,
          })),
          overrides,
        }),
      });
      if (res.ok) {
        setProformaAssumptions(assumptions);
        setProformaOverrides(overrides);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-red-600 bg-red-50 border border-red-200 rounded-lg">
        <AlertTriangle className="h-4 w-4" />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <FacilityFinancialDashboard
      facilityId={facilityId}
      facilityName={facilityName}
      totalBeds={totalBeds}
      scenarioId={scenarioId}
      scenarioName="Base Case"
      censusPeriods={censusPeriods}
      onSaveCensus={handleSaveCensus}
      currentRates={currentRates}
      historicalRates={historicalRates}
      onSaveRates={handleSaveRates}
      plLineItems={plLineItems}
      budgetLineItems={[]}
      proformaAssumptions={proformaAssumptions}
      proformaOverrides={proformaOverrides}
      onSaveProforma={handleSaveProforma}
    />
  );
}

// Helper functions
function formatAssumptionLabel(key: string): string {
  return key
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function categorizeAssumption(key: string): 'revenue' | 'expense' | 'census' | 'growth' {
  if (key.includes('revenue') || key.includes('rate_increase')) return 'growth';
  if (key.includes('expense') || key.includes('inflation') || key.includes('wage') || key.includes('rent'))
    return 'expense';
  if (key.includes('occupancy') || key.includes('census')) return 'census';
  return 'revenue';
}
