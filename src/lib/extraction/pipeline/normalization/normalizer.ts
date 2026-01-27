/**
 * Data Normalizer
 *
 * Transforms raw extracted data into standardized normalized formats
 * with consistent field mappings and calculated metrics.
 */

import type {
  NormalizedFinancialPeriod,
  NormalizedCensusPeriod,
  NormalizedPayerRate,
  PayerMixBreakdown,
} from '../types';

// ============================================================================
// FINANCIAL PERIOD NORMALIZATION
// ============================================================================

/**
 * Normalize and calculate derived metrics for a financial period
 */
export function normalizeFinancialPeriod(
  period: NormalizedFinancialPeriod
): NormalizedFinancialPeriod {
  // Ensure all revenue components are numbers
  const revenue = normalizeRevenueSection(period.revenue);

  // Ensure all expense components are numbers
  const expenses = normalizeExpenseSection(period.expenses);

  // Calculate/normalize metrics
  const metrics = calculateMetrics(revenue.total, expenses.total, period.expenses.fixed.rent);

  // Determine period type if not set
  const periodType = determinePeriodType(period.periodStart, period.periodEnd);

  return {
    ...period,
    periodType: period.periodType || periodType,
    isAnnualized: period.isAnnualized ?? (periodType === 'annual' || periodType === 'ttm'),
    revenue,
    expenses,
    metrics: {
      ...metrics,
      laborPercentage: revenue.total > 0 ? expenses.labor.total / revenue.total : 0,
      agencyPercentage: expenses.labor.total > 0 ? expenses.labor.agency / expenses.labor.total : 0,
    },
    normalizedAt: new Date(),
  };
}

function normalizeRevenueSection(
  revenue: NormalizedFinancialPeriod['revenue']
): NormalizedFinancialPeriod['revenue'] {
  const byPayer = {
    medicarePartA: sanitizeNumber(revenue.byPayer.medicarePartA),
    medicareAdvantage: sanitizeNumber(revenue.byPayer.medicareAdvantage),
    managedCare: sanitizeNumber(revenue.byPayer.managedCare),
    medicaid: sanitizeNumber(revenue.byPayer.medicaid),
    managedMedicaid: sanitizeNumber(revenue.byPayer.managedMedicaid),
    private: sanitizeNumber(revenue.byPayer.private),
    va: sanitizeNumber(revenue.byPayer.va),
    hospice: sanitizeNumber(revenue.byPayer.hospice),
    other: sanitizeNumber(revenue.byPayer.other),
  };

  const byType = {
    roomAndBoard: sanitizeNumber(revenue.byType.roomAndBoard),
    ancillary: sanitizeNumber(revenue.byType.ancillary),
    therapy: sanitizeNumber(revenue.byType.therapy),
    pharmacy: sanitizeNumber(revenue.byType.pharmacy),
    other: sanitizeNumber(revenue.byType.other),
  };

  // Validate total
  const payerSum = Object.values(byPayer).reduce((a, b) => a + b, 0);
  const typeSum = Object.values(byType).reduce((a, b) => a + b, 0);
  const providedTotal = sanitizeNumber(revenue.total);

  // Use provided total, or largest sum if total seems wrong
  const total = providedTotal > 0 ? providedTotal : Math.max(payerSum, typeSum);

  return { total, byPayer, byType };
}

function normalizeExpenseSection(
  expenses: NormalizedFinancialPeriod['expenses']
): NormalizedFinancialPeriod['expenses'] {
  const labor = {
    total: sanitizeNumber(expenses.labor.total),
    core: sanitizeNumber(expenses.labor.core),
    agency: sanitizeNumber(expenses.labor.agency),
    benefits: sanitizeNumber(expenses.labor.benefits),
  };

  // Recalculate labor total if components are provided but total is wrong
  const laborSum = labor.core + labor.agency + labor.benefits;
  if (laborSum > 0 && Math.abs(labor.total - laborSum) > labor.total * 0.1) {
    labor.total = laborSum;
  }

  const operating = {
    dietary: sanitizeNumber(expenses.operating.dietary),
    housekeeping: sanitizeNumber(expenses.operating.housekeeping),
    utilities: sanitizeNumber(expenses.operating.utilities),
    maintenance: sanitizeNumber(expenses.operating.maintenance),
    supplies: sanitizeNumber(expenses.operating.supplies),
    other: sanitizeNumber(expenses.operating.other),
  };

  const fixed = {
    insurance: sanitizeNumber(expenses.fixed.insurance),
    propertyTax: sanitizeNumber(expenses.fixed.propertyTax),
    managementFee: sanitizeNumber(expenses.fixed.managementFee),
    rent: sanitizeNumber(expenses.fixed.rent),
    other: sanitizeNumber(expenses.fixed.other),
  };

  // Calculate total
  const laborTotal = labor.total;
  const operatingTotal = Object.values(operating).reduce((a, b) => a + b, 0);
  const fixedTotal = Object.values(fixed).reduce((a, b) => a + b, 0);
  const calculatedTotal = laborTotal + operatingTotal + fixedTotal;

  const providedTotal = sanitizeNumber(expenses.total);
  const total = providedTotal > 0 ? providedTotal : calculatedTotal;

  return { total, labor, operating, fixed };
}

function calculateMetrics(
  totalRevenue: number,
  totalExpenses: number,
  rent: number
): Pick<NormalizedFinancialPeriod['metrics'], 'ebitdar' | 'ebitda' | 'noi' | 'netIncome' | 'ebitdarMargin' | 'noiMargin'> {
  // EBITDAR = Revenue - Operating Expenses (before rent)
  const ebitdar = totalRevenue - (totalExpenses - rent);

  // EBITDA = EBITDAR - Rent
  const ebitda = ebitdar - rent;

  // NOI = EBITDA (for SNF, typically same as EBITDA)
  const noi = ebitda;

  // Net Income (same as NOI for now, would need D&A and interest for full calc)
  const netIncome = noi;

  // Margins
  const ebitdarMargin = totalRevenue > 0 ? ebitdar / totalRevenue : 0;
  const noiMargin = totalRevenue > 0 ? noi / totalRevenue : 0;

  return { ebitdar, ebitda, noi, netIncome, ebitdarMargin, noiMargin };
}

// ============================================================================
// CENSUS PERIOD NORMALIZATION
// ============================================================================

/**
 * Normalize and calculate derived metrics for a census period
 */
export function normalizeCensusPeriod(
  census: NormalizedCensusPeriod
): NormalizedCensusPeriod {
  // Sanitize patient days
  const patientDays = {
    medicarePartA: sanitizeNumber(census.patientDays.medicarePartA),
    medicareAdvantage: sanitizeNumber(census.patientDays.medicareAdvantage),
    managedCare: sanitizeNumber(census.patientDays.managedCare),
    medicaid: sanitizeNumber(census.patientDays.medicaid),
    managedMedicaid: sanitizeNumber(census.patientDays.managedMedicaid),
    private: sanitizeNumber(census.patientDays.private),
    va: sanitizeNumber(census.patientDays.va),
    hospice: sanitizeNumber(census.patientDays.hospice),
    other: sanitizeNumber(census.patientDays.other),
    total: sanitizeNumber(census.patientDays.total),
  };

  // Recalculate total if needed
  const calculatedTotal =
    patientDays.medicarePartA +
    patientDays.medicareAdvantage +
    patientDays.managedCare +
    patientDays.medicaid +
    patientDays.managedMedicaid +
    patientDays.private +
    patientDays.va +
    patientDays.hospice +
    patientDays.other;

  if (patientDays.total === 0 || Math.abs(patientDays.total - calculatedTotal) > patientDays.total * 0.1) {
    patientDays.total = calculatedTotal;
  }

  // Calculate payer mix percentages
  const payerMixPercentages = calculatePayerMix(patientDays);

  // Calculate skilled vs non-skilled
  const skilledDays =
    patientDays.medicarePartA + patientDays.medicareAdvantage + patientDays.managedCare;
  const nonSkilledDays = patientDays.total - skilledDays;
  const skilledMix = patientDays.total > 0 ? skilledDays / patientDays.total : 0;

  // Calculate ADC and occupancy
  const daysCovered = getDaysBetween(census.periodStart, census.periodEnd);
  const avgDailyCensus = daysCovered > 0 ? patientDays.total / daysCovered : 0;
  const totalBeds = sanitizeNumber(census.totalBeds);
  const occupancyRate = totalBeds > 0 ? avgDailyCensus / totalBeds : sanitizeNumber(census.occupancyRate);

  return {
    ...census,
    patientDays,
    avgDailyCensus,
    totalBeds,
    occupancyRate,
    payerMixPercentages,
    skilledDays,
    nonSkilledDays,
    skilledMix,
    normalizedAt: new Date(),
  };
}

function calculatePayerMix(patientDays: NormalizedCensusPeriod['patientDays']): PayerMixBreakdown {
  const total = patientDays.total || 1;

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
// PAYER RATE NORMALIZATION
// ============================================================================

/**
 * Normalize and calculate derived metrics for payer rates
 */
export function normalizePayerRate(rate: NormalizedPayerRate): NormalizedPayerRate {
  // Sanitize rates
  const rates = {
    medicarePartA: sanitizeRate(rate.rates.medicarePartA),
    medicareAdvantage: sanitizeRate(rate.rates.medicareAdvantage),
    managedCare: sanitizeRate(rate.rates.managedCare),
    medicaid: sanitizeRate(rate.rates.medicaid),
    managedMedicaid: sanitizeRate(rate.rates.managedMedicaid),
    private: sanitizeRate(rate.rates.private),
    va: sanitizeRate(rate.rates.va),
    hospice: sanitizeRate(rate.rates.hospice),
  };

  // Calculate weighted average (simple average for now, would need census weights for proper calc)
  const nonNullRates = Object.values(rates).filter((r): r is number => r !== null && r > 0);
  const weightedAvgPpd = nonNullRates.length > 0
    ? nonNullRates.reduce((a, b) => a + b, 0) / nonNullRates.length
    : undefined;

  // Calculate blended skilled rate
  const skilledRates = [rates.medicarePartA, rates.medicareAdvantage, rates.managedCare].filter(
    (r): r is number => r !== null && r > 0
  );
  const blendedSkilledPpd = skilledRates.length > 0
    ? skilledRates.reduce((a, b) => a + b, 0) / skilledRates.length
    : undefined;

  return {
    ...rate,
    rates,
    ancillaryPpd: sanitizeRate(rate.ancillaryPpd),
    therapyPpd: sanitizeRate(rate.therapyPpd),
    weightedAvgPpd,
    blendedSkilledPpd,
    normalizedAt: new Date(),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sanitizeNumber(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.round(value * 100) / 100; // Round to 2 decimal places
}

function sanitizeRate(value: number | null | undefined): number | null {
  if (value === null || value === undefined || isNaN(value) || value <= 0) return null;
  return Math.round(value * 100) / 100;
}

function getDaysBetween(start: Date, end: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function determinePeriodType(
  start: Date,
  end: Date
): 'monthly' | 'quarterly' | 'annual' | 'ttm' {
  const days = getDaysBetween(start, end);

  if (days <= 35) return 'monthly';
  if (days <= 100) return 'quarterly';
  if (days >= 360 && days <= 370) return 'annual';
  if (days >= 360) return 'ttm';

  return 'monthly'; // Default
}

// ============================================================================
// ANNUALIZATION
// ============================================================================

/**
 * Annualize a financial period if needed
 */
export function annualizeFinancialPeriod(
  period: NormalizedFinancialPeriod,
  force: boolean = false
): NormalizedFinancialPeriod {
  if (period.isAnnualized && !force) return period;

  const daysCovered = getDaysBetween(period.periodStart, period.periodEnd);
  const factor = 365 / daysCovered;

  if (factor <= 1.05 && factor >= 0.95) {
    // Already approximately annual
    return { ...period, isAnnualized: true };
  }

  return {
    ...period,
    isAnnualized: true,
    revenue: {
      total: period.revenue.total * factor,
      byPayer: multiplyObject(period.revenue.byPayer, factor),
      byType: multiplyObject(period.revenue.byType, factor),
    },
    expenses: {
      total: period.expenses.total * factor,
      labor: multiplyObject(period.expenses.labor, factor),
      operating: multiplyObject(period.expenses.operating, factor),
      fixed: multiplyObject(period.expenses.fixed, factor),
    },
    metrics: {
      ...period.metrics,
      ebitdar: period.metrics.ebitdar * factor,
      ebitda: period.metrics.ebitda * factor,
      noi: period.metrics.noi * factor,
      netIncome: period.metrics.netIncome * factor,
      // Margins don't change with annualization
    },
    normalizedAt: new Date(),
  };
}

function multiplyObject<T extends Record<string, number>>(obj: T, factor: number): T {
  const result = {} as T;
  for (const key in obj) {
    result[key] = (obj[key] * factor) as T[typeof key];
  }
  return result;
}

export default {
  normalizeFinancialPeriod,
  normalizeCensusPeriod,
  normalizePayerRate,
  annualizeFinancialPeriod,
};
