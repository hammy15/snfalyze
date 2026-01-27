/**
 * AI Response Parser
 *
 * Transforms raw AI extraction responses into normalized data structures.
 */

import { nanoid } from 'nanoid';
import type {
  PartialFinancialPeriod,
  PartialCensusPeriod,
  PartialPayerRate,
  PartialFacilityInfo,
  NormalizedFinancialPeriod,
  NormalizedCensusPeriod,
  NormalizedPayerRate,
  DataSource,
  PayerMixBreakdown,
} from '../types';

// ============================================================================
// FINANCIAL PERIOD PARSER
// ============================================================================

export function parseFinancialPeriod(
  partial: PartialFinancialPeriod,
  facilityId: string,
  documentId: string,
  filename: string
): NormalizedFinancialPeriod | null {
  // Validate required fields
  if (!partial.facilityName) {
    console.warn('Financial period missing facility name');
    return null;
  }

  // Parse dates
  const periodStart = parseDate(partial.periodStart);
  const periodEnd = parseDate(partial.periodEnd);

  if (!periodStart || !periodEnd) {
    console.warn('Financial period missing valid dates');
    return null;
  }

  // Build normalized period
  const revenue = normalizeRevenue(partial.revenue);
  const expenses = normalizeExpenses(partial.expenses);
  const metrics = normalizeMetrics(partial.metrics, revenue.total, expenses.total);

  const source: DataSource = {
    documentId,
    filename,
    sheetName: partial.sourceSheet,
    rowRange: partial.sourceRows?.length
      ? { start: partial.sourceRows[0], end: partial.sourceRows[partial.sourceRows.length - 1] }
      : undefined,
    extractedAt: new Date(),
  };

  return {
    id: nanoid(),
    facilityId,
    facilityName: partial.facilityName,
    periodStart,
    periodEnd,
    periodType: (partial.periodType as NormalizedFinancialPeriod['periodType']) || 'monthly',
    isAnnualized: partial.periodType === 'annual' || partial.periodType === 'ttm',
    revenue,
    expenses,
    metrics,
    sources: [source],
    confidence: partial.confidence || 50,
    normalizedAt: new Date(),
  };
}

function normalizeRevenue(
  partial?: Partial<NormalizedFinancialPeriod['revenue']>
): NormalizedFinancialPeriod['revenue'] {
  const byPayer = {
    medicarePartA: partial?.byPayer?.medicarePartA || 0,
    medicareAdvantage: partial?.byPayer?.medicareAdvantage || 0,
    managedCare: partial?.byPayer?.managedCare || 0,
    medicaid: partial?.byPayer?.medicaid || 0,
    managedMedicaid: partial?.byPayer?.managedMedicaid || 0,
    private: partial?.byPayer?.private || 0,
    va: partial?.byPayer?.va || 0,
    hospice: partial?.byPayer?.hospice || 0,
    other: partial?.byPayer?.other || 0,
  };

  const byType = {
    roomAndBoard: partial?.byType?.roomAndBoard || 0,
    ancillary: partial?.byType?.ancillary || 0,
    therapy: partial?.byType?.therapy || 0,
    pharmacy: partial?.byType?.pharmacy || 0,
    other: partial?.byType?.other || 0,
  };

  // Calculate total if not provided
  const payerTotal = Object.values(byPayer).reduce((a, b) => a + b, 0);
  const typeTotal = Object.values(byType).reduce((a, b) => a + b, 0);
  const total = partial?.total || Math.max(payerTotal, typeTotal) || 0;

  return { total, byPayer, byType };
}

function normalizeExpenses(
  partial?: Partial<NormalizedFinancialPeriod['expenses']>
): NormalizedFinancialPeriod['expenses'] {
  const labor = {
    total: partial?.labor?.total || 0,
    core: partial?.labor?.core || 0,
    agency: partial?.labor?.agency || 0,
    benefits: partial?.labor?.benefits || 0,
  };

  const operating = {
    dietary: partial?.operating?.dietary || 0,
    housekeeping: partial?.operating?.housekeeping || 0,
    utilities: partial?.operating?.utilities || 0,
    maintenance: partial?.operating?.maintenance || 0,
    supplies: partial?.operating?.supplies || 0,
    other: partial?.operating?.other || 0,
  };

  const fixed = {
    insurance: partial?.fixed?.insurance || 0,
    propertyTax: partial?.fixed?.propertyTax || 0,
    managementFee: partial?.fixed?.managementFee || 0,
    rent: partial?.fixed?.rent || 0,
    other: partial?.fixed?.other || 0,
  };

  // Calculate totals if not provided
  if (!labor.total && (labor.core || labor.agency)) {
    labor.total = labor.core + labor.agency + labor.benefits;
  }

  const laborTotal = labor.total;
  const operatingTotal = Object.values(operating).reduce((a, b) => a + b, 0);
  const fixedTotal = Object.values(fixed).reduce((a, b) => a + b, 0);
  const total = partial?.total || (laborTotal + operatingTotal + fixedTotal) || 0;

  return { total, labor, operating, fixed };
}

function normalizeMetrics(
  partial?: Partial<NormalizedFinancialPeriod['metrics']>,
  totalRevenue?: number,
  totalExpenses?: number
): NormalizedFinancialPeriod['metrics'] {
  const revenue = totalRevenue || 0;
  const expenses = totalExpenses || 0;

  // Calculate metrics if not provided
  const ebitdar = partial?.ebitdar ?? (revenue - expenses);
  const ebitda = partial?.ebitda ?? ebitdar; // Same for SNF typically
  const noi = partial?.noi ?? ebitda;
  const netIncome = partial?.netIncome ?? noi;

  const ebitdarMargin = partial?.ebitdarMargin ?? (revenue > 0 ? ebitdar / revenue : 0);
  const noiMargin = partial?.noiMargin ?? (revenue > 0 ? noi / revenue : 0);
  const laborPercentage = partial?.laborPercentage ?? 0;
  const agencyPercentage = partial?.agencyPercentage ?? 0;

  return {
    ebitdar,
    ebitda,
    noi,
    netIncome,
    ebitdarMargin,
    noiMargin,
    laborPercentage,
    agencyPercentage,
  };
}

// ============================================================================
// CENSUS PERIOD PARSER
// ============================================================================

export function parseCensusPeriod(
  partial: PartialCensusPeriod,
  facilityId: string,
  documentId: string,
  filename: string
): NormalizedCensusPeriod | null {
  if (!partial.facilityName) {
    console.warn('Census period missing facility name');
    return null;
  }

  const periodStart = parseDate(partial.periodStart);
  const periodEnd = parseDate(partial.periodEnd);

  if (!periodStart || !periodEnd) {
    console.warn('Census period missing valid dates');
    return null;
  }

  const patientDays = normalizePatientDays(partial.patientDays);
  const payerMixPercentages = calculatePayerMixPercentages(patientDays);

  // Calculate skilled vs non-skilled
  const skilledDays =
    patientDays.medicarePartA + patientDays.medicareAdvantage + patientDays.managedCare;
  const nonSkilledDays = patientDays.total - skilledDays;
  const skilledMix = patientDays.total > 0 ? skilledDays / patientDays.total : 0;

  const source: DataSource = {
    documentId,
    filename,
    sheetName: partial.sourceSheet,
    rowRange: partial.sourceRows?.length
      ? { start: partial.sourceRows[0], end: partial.sourceRows[partial.sourceRows.length - 1] }
      : undefined,
    extractedAt: new Date(),
  };

  // Calculate ADC
  const daysCovered = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24) + 1;
  const avgDailyCensus = partial.avgDailyCensus ?? (patientDays.total / daysCovered);
  const totalBeds = partial.totalBeds || 0;
  const occupancyRate = partial.occupancyRate ?? (totalBeds > 0 ? avgDailyCensus / totalBeds : 0);

  return {
    id: nanoid(),
    facilityId,
    facilityName: partial.facilityName,
    periodStart,
    periodEnd,
    periodType: 'monthly', // Default
    patientDays,
    avgDailyCensus,
    totalBeds,
    occupancyRate,
    payerMixPercentages,
    skilledDays,
    nonSkilledDays,
    skilledMix,
    sources: [source],
    confidence: partial.confidence || 50,
    normalizedAt: new Date(),
  };
}

function normalizePatientDays(
  partial?: Partial<NormalizedCensusPeriod['patientDays']>
): NormalizedCensusPeriod['patientDays'] {
  const days = {
    medicarePartA: partial?.medicarePartA || 0,
    medicareAdvantage: partial?.medicareAdvantage || 0,
    managedCare: partial?.managedCare || 0,
    medicaid: partial?.medicaid || 0,
    managedMedicaid: partial?.managedMedicaid || 0,
    private: partial?.private || 0,
    va: partial?.va || 0,
    hospice: partial?.hospice || 0,
    other: partial?.other || 0,
    total: partial?.total || 0,
  };

  // Calculate total if not provided
  if (!days.total) {
    days.total =
      days.medicarePartA +
      days.medicareAdvantage +
      days.managedCare +
      days.medicaid +
      days.managedMedicaid +
      days.private +
      days.va +
      days.hospice +
      days.other;
  }

  return days;
}

function calculatePayerMixPercentages(
  patientDays: NormalizedCensusPeriod['patientDays']
): PayerMixBreakdown {
  const total = patientDays.total || 1; // Avoid division by zero

  return {
    medicarePartA: patientDays.medicarePartA / total,
    medicareAdvantage: patientDays.medicareAdvantage / total,
    managedCare: patientDays.managedCare / total,
    medicaid: patientDays.medicaid / total,
    managedMedicaid: patientDays.managedMedicaid / total,
    private: patientDays.private / total,
    va: patientDays.va / total,
    hospice: patientDays.hospice / total,
    other: patientDays.other / total,
  };
}

// ============================================================================
// PAYER RATE PARSER
// ============================================================================

export function parsePayerRate(
  partial: PartialPayerRate,
  facilityId: string,
  documentId: string,
  filename: string
): NormalizedPayerRate | null {
  if (!partial.facilityName) {
    console.warn('Payer rate missing facility name');
    return null;
  }

  const effectiveDate = parseDate(partial.effectiveDate);
  if (!effectiveDate) {
    console.warn('Payer rate missing valid effective date');
    return null;
  }

  const rates = {
    medicarePartA: partial.rates?.medicarePartA ?? null,
    medicareAdvantage: partial.rates?.medicareAdvantage ?? null,
    managedCare: partial.rates?.managedCare ?? null,
    medicaid: partial.rates?.medicaid ?? null,
    managedMedicaid: partial.rates?.managedMedicaid ?? null,
    private: partial.rates?.private ?? null,
    va: partial.rates?.va ?? null,
    hospice: partial.rates?.hospice ?? null,
  };

  const source: DataSource = {
    documentId,
    filename,
    sheetName: partial.sourceSheet,
    rowRange: partial.sourceRows?.length
      ? { start: partial.sourceRows[0], end: partial.sourceRows[partial.sourceRows.length - 1] }
      : undefined,
    extractedAt: new Date(),
  };

  // Calculate weighted averages
  const nonNullRates = Object.values(rates).filter((r): r is number => r !== null && r > 0);
  const weightedAvgPpd = nonNullRates.length > 0
    ? nonNullRates.reduce((a, b) => a + b, 0) / nonNullRates.length
    : undefined;

  // Blended skilled PPD (Medicare A, MA, Managed Care)
  const skilledRates = [rates.medicarePartA, rates.medicareAdvantage, rates.managedCare].filter(
    (r): r is number => r !== null && r > 0
  );
  const blendedSkilledPpd = skilledRates.length > 0
    ? skilledRates.reduce((a, b) => a + b, 0) / skilledRates.length
    : undefined;

  return {
    id: nanoid(),
    facilityId,
    facilityName: partial.facilityName,
    effectiveDate,
    expirationDate: undefined,
    rates,
    ancillaryPpd: partial.ancillaryPpd ?? null,
    therapyPpd: partial.therapyPpd ?? null,
    weightedAvgPpd,
    blendedSkilledPpd,
    sources: [source],
    confidence: partial.confidence || 50,
    normalizedAt: new Date(),
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null;

  // Try ISO format
  const isoDate = new Date(dateStr);
  if (!isNaN(isoDate.getTime())) return isoDate;

  // Try MM/DD/YYYY
  const mdyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (mdyMatch) {
    const year = mdyMatch[3].length === 2 ? `20${mdyMatch[3]}` : mdyMatch[3];
    return new Date(`${year}-${mdyMatch[1].padStart(2, '0')}-${mdyMatch[2].padStart(2, '0')}`);
  }

  // Try month name formats (Jan 2024, January 2024)
  const monthMatch = dateStr.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})/i);
  if (monthMatch) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const month = months[monthMatch[1].toLowerCase().slice(0, 3)];
    const year = monthMatch[2].length === 2 ? `20${monthMatch[2]}` : monthMatch[2];
    return new Date(`${year}-${month}-01`);
  }

  return null;
}

export default {
  parseFinancialPeriod,
  parseCensusPeriod,
  parsePayerRate,
};
