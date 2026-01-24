// Types for Per-Building Financial Analysis System

export type PayerType =
  | 'medicare_part_a'
  | 'medicare_advantage'
  | 'managed_care'
  | 'medicaid'
  | 'managed_medicaid'
  | 'private'
  | 'va_contract'
  | 'hospice'
  | 'other';

export type CensusSource = 'extracted' | 'manual' | 'projected';

export interface CensusByPayer {
  medicarePartADays: number;
  medicareAdvantageDays: number;
  managedCareDays: number;
  medicaidDays: number;
  managedMedicaidDays: number;
  privateDays: number;
  vaContractDays: number;
  hospiceDays: number;
  otherDays: number;
}

export interface CensusPeriod extends CensusByPayer {
  id: string;
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  totalBeds: number;
  occupancyRate: number;
  source: CensusSource;
  notes?: string;
}

export interface PayerRates {
  id: string;
  facilityId: string;
  effectiveDate: string;
  // Skilled PPD Rates
  medicarePartAPpd: number;
  medicareAdvantagePpd: number;
  managedCarePpd: number;
  // Non-Skilled PPD Rates
  medicaidPpd: number;
  managedMedicaidPpd: number;
  privatePpd: number;
  vaContractPpd: number;
  hospicePpd: number;
  // Ancillary
  ancillaryRevenuePpd: number;
  therapyRevenuePpd: number;
}

export interface RevenueByPayer {
  medicarePartA: number;
  medicareAdvantage: number;
  managedCare: number;
  medicaid: number;
  managedMedicaid: number;
  private: number;
  vaContract: number;
  hospice: number;
  other: number;
  ancillary: number;
  therapy: number;
  total: number;
}

export interface PLLineItem {
  coaCode: string;
  label: string;
  category: 'revenue' | 'expense' | 'subtotal' | 'total';
  subcategory?: string;
  actual: number;
  ppd: number;
  budget?: number;
  variance?: number;
  variancePercent?: number;
  isHighlighted?: boolean;
  indent?: number;
}

export interface FacilityFinancials {
  facilityId: string;
  facilityName: string;
  beds: number;
  totalDays: number;
  occupancy: number;
  totalRevenue: number;
  totalExpenses: number;
  ebitdar: number;
  ebitda: number;
  blendedPPD: number;
  censusByPayer: CensusByPayer;
  revenueByPayer: RevenueByPayer;
}

export interface PortfolioMetrics {
  totalFacilities: number;
  totalBeds: number;
  totalDays: number;
  weightedOccupancy: number;
  totalRevenue: number;
  totalExpenses: number;
  totalEbitdar: number;
  totalEbitda: number;
  weightedPPD: number;
  weightedMargin: number;
  facilitiesRanked: FacilityFinancials[];
  combinedPayerMix: Array<{
    payerType: string;
    totalDays: number;
    percentMix: number;
    weightedPPD: number;
    totalRevenue: number;
  }>;
}

export interface ProformaAssumption {
  key: string;
  label: string;
  value: number;
  category: 'revenue' | 'expense' | 'census' | 'growth';
}

export interface ProformaOverride {
  id: string;
  scenarioId: string;
  facilityId: string;
  coaCode: string;
  monthIndex: number;
  overrideType: 'fixed' | 'ppd' | 'percent_revenue';
  overrideValue: number;
  annualGrowthRate?: number;
  notes?: string;
}

export interface YearlyProforma {
  year: number;
  totalDays: number;
  occupancy: number;
  revenue: number;
  expenses: number;
  ebitdar: number;
  rent: number;
  ebitda: number;
  ebitdaMargin: number;
}

// Default PPD rates by payer (industry benchmarks)
export const DEFAULT_PPD_RATES: Record<PayerType, number> = {
  medicare_part_a: 625,
  medicare_advantage: 480,
  managed_care: 420,
  medicaid: 185,
  managed_medicaid: 195,
  private: 285,
  va_contract: 310,
  hospice: 175,
  other: 200,
};

// Payer type display names
export const PAYER_LABELS: Record<PayerType, string> = {
  medicare_part_a: 'Medicare Part A',
  medicare_advantage: 'Medicare Advantage',
  managed_care: 'Managed Care',
  medicaid: 'Medicaid',
  managed_medicaid: 'Managed Medicaid',
  private: 'Private Pay',
  va_contract: 'VA Contract',
  hospice: 'Hospice',
  other: 'Other',
};

// Skilled vs Non-Skilled categorization
export const SKILLED_PAYERS: PayerType[] = ['medicare_part_a', 'medicare_advantage', 'managed_care'];
export const NON_SKILLED_PAYERS: PayerType[] = ['medicaid', 'managed_medicaid', 'private', 'va_contract', 'hospice', 'other'];

// Utility functions
export function getTotalDays(census: CensusByPayer): number {
  return (
    census.medicarePartADays +
    census.medicareAdvantageDays +
    census.managedCareDays +
    census.medicaidDays +
    census.managedMedicaidDays +
    census.privateDays +
    census.vaContractDays +
    census.hospiceDays +
    census.otherDays
  );
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPPD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
