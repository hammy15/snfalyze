import { ProformaAssumptions, FacilityType } from './types';
import type {
  CensusByPayer,
  PayerRates,
  RevenueByPayer,
  FacilityFinancials,
  PortfolioMetrics,
} from '@/components/financials/types';
import { getTotalDays } from '@/components/financials/types';

export interface MonthlyData {
  // Census
  licensedBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  totalPatientDays: number;
  daysInMonth: number;

  // Patient Days by Payer
  medicaidDays: number;
  managedMedicaidDays: number;
  privateDays: number;
  veteransDays: number;
  hospiceDays: number;
  medicareDays: number;
  hmoDays: number;
  isnpDays: number;

  // Revenue
  medicaidRevenue: number;
  managedMedicaidRevenue: number;
  privateRevenue: number;
  veteransRevenue: number;
  hospiceRevenue: number;
  totalNonSkilledRevenue: number;

  medicareRevenue: number;
  managedMedicaidSkilledRevenue: number;
  hmoRevenue: number;
  isnpRevenue: number;
  veteransSkilledRevenue: number;
  totalSkilledRevenue: number;

  medBRevenue: number;
  uplRevenue: number;
  otherRevenue: number;
  totalOtherRevenue: number;

  totalRevenue: number;

  // Expenses
  nursingWages: number;
  nursingBenefits: number;
  nursingAgency: number;
  nursingSupplies: number;
  nursingOther: number;
  totalNursingExpenses: number;

  therapyWages: number;
  therapyBenefits: number;
  therapyOther: number;
  totalTherapyExpenses: number;

  dietaryWages: number;
  dietaryBenefits: number;
  dietaryFood: number;
  dietaryOther: number;
  totalDietaryExpenses: number;

  plantWages: number;
  plantBenefits: number;
  plantUtilities: number;
  plantMaintenance: number;
  plantOther: number;
  totalPlantExpenses: number;

  adminWages: number;
  adminBenefits: number;
  adminInsurance: number;
  adminIT: number;
  adminLegal: number;
  adminOther: number;
  totalAdminExpenses: number;

  badDebt: number;
  bedTax: number;

  totalOperatingExpenses: number;

  // Below the line
  managementFee: number;
  ebitdar: number;
  ebitdarMargin: number;

  rentExpense: number;
  propertyTaxes: number;
  totalPropertyExpenses: number;

  ebitda: number;
  ebitdaMargin: number;

  depreciation: number;
  interest: number;
  otherMisc: number;
  totalOtherExpenses: number;

  netIncome: number;
  netIncomeMargin: number;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function calculateMonthlyProforma(
  assumptions: ProformaAssumptions,
  year: number,
  month: number,
  overrides: Partial<MonthlyData> = {}
): MonthlyData {
  const daysInMonth = getDaysInMonth(year, month);

  // Census calculations
  const licensedBeds = overrides.licensedBeds ?? assumptions.licensedBeds;
  const occupancyRate = overrides.occupancyRate ?? assumptions.targetOccupancy;
  const occupiedBeds = Math.round(licensedBeds * occupancyRate);
  const totalPatientDays = occupiedBeds * daysInMonth;

  // Patient days by payer
  const medicaidDays = Math.round(totalPatientDays * assumptions.medicaidMix);
  const managedMedicaidDays = Math.round(totalPatientDays * assumptions.managedMedicaidMix);
  const privateDays = Math.round(totalPatientDays * assumptions.privateMix);
  const veteransDays = Math.round(totalPatientDays * assumptions.veteransMix);
  const hospiceDays = Math.round(totalPatientDays * assumptions.hospiceMix);
  const medicareDays = Math.round(totalPatientDays * assumptions.medicareMix);
  const hmoDays = Math.round(totalPatientDays * assumptions.hmoMix);
  const isnpDays = Math.round(totalPatientDays * assumptions.isnpMix);

  // Revenue calculations
  const medicaidRevenue = medicaidDays * assumptions.medicaidPPD;
  const managedMedicaidRevenue = managedMedicaidDays * assumptions.managedMedicaidPPD;
  const privateRevenue = privateDays * assumptions.privatePPD;
  const veteransRevenue = veteransDays * assumptions.veteransPPD;
  const hospiceRevenue = hospiceDays * assumptions.hospicePPD;
  const totalNonSkilledRevenue =
    medicaidRevenue + managedMedicaidRevenue + privateRevenue + veteransRevenue + hospiceRevenue;

  const medicareRevenue = medicareDays * assumptions.medicarePPD;
  const managedMedicaidSkilledRevenue = 0; // Can be added if needed
  const hmoRevenue = hmoDays * assumptions.hmoPPD;
  const isnpRevenue = isnpDays * assumptions.isnpPPD;
  const veteransSkilledRevenue = 0; // Can be added if needed
  const totalSkilledRevenue =
    medicareRevenue + managedMedicaidSkilledRevenue + hmoRevenue + isnpRevenue + veteransSkilledRevenue;

  const medBRevenue = overrides.medBRevenue ?? Math.round(totalPatientDays * 8); // ~$8/day Med B
  const uplRevenue = overrides.uplRevenue ?? 0;
  const otherRevenue = overrides.otherRevenue ?? 0;
  const totalOtherRevenue = medBRevenue + uplRevenue + otherRevenue;

  const totalRevenue = totalNonSkilledRevenue + totalSkilledRevenue + totalOtherRevenue;

  // Expense calculations (using industry benchmarks for SNF)
  // Nursing: typically 40-50% of revenue
  const nursingWages = overrides.nursingWages ?? Math.round(totalRevenue * 0.32);
  const nursingBenefits = Math.round(nursingWages * assumptions.benefitsPercent);
  const nursingAgency = overrides.nursingAgency ?? Math.round(totalRevenue * 0.03);
  const nursingSupplies = overrides.nursingSupplies ?? Math.round(totalPatientDays * 12);
  const nursingOther = overrides.nursingOther ?? Math.round(totalRevenue * 0.01);
  const totalNursingExpenses = nursingWages + nursingBenefits + nursingAgency + nursingSupplies + nursingOther;

  // Therapy: typically 8-12% of revenue for SNF
  const therapyWages = overrides.therapyWages ?? Math.round(totalRevenue * 0.07);
  const therapyBenefits = Math.round(therapyWages * assumptions.benefitsPercent);
  const therapyOther = overrides.therapyOther ?? Math.round(totalRevenue * 0.01);
  const totalTherapyExpenses = therapyWages + therapyBenefits + therapyOther;

  // Dietary: typically 5-7% of revenue
  const dietaryWages = overrides.dietaryWages ?? Math.round(totalRevenue * 0.035);
  const dietaryBenefits = Math.round(dietaryWages * assumptions.benefitsPercent);
  const dietaryFood = overrides.dietaryFood ?? Math.round(totalPatientDays * 18);
  const dietaryOther = overrides.dietaryOther ?? Math.round(totalRevenue * 0.005);
  const totalDietaryExpenses = dietaryWages + dietaryBenefits + dietaryFood + dietaryOther;

  // Plant/Maintenance: typically 3-5% of revenue
  const plantWages = overrides.plantWages ?? Math.round(totalRevenue * 0.02);
  const plantBenefits = Math.round(plantWages * assumptions.benefitsPercent);
  const plantUtilities = overrides.plantUtilities ?? Math.round(licensedBeds * 150); // ~$150/bed/month
  const plantMaintenance = overrides.plantMaintenance ?? Math.round(totalRevenue * 0.015);
  const plantOther = overrides.plantOther ?? Math.round(totalRevenue * 0.005);
  const totalPlantExpenses = plantWages + plantBenefits + plantUtilities + plantMaintenance + plantOther;

  // Admin: typically 8-12% of revenue
  const adminWages = overrides.adminWages ?? Math.round(totalRevenue * 0.06);
  const adminBenefits = Math.round(adminWages * assumptions.benefitsPercent);
  const adminInsurance = overrides.adminInsurance ?? Math.round(totalRevenue * 0.02);
  const adminIT = overrides.adminIT ?? Math.round(totalRevenue * 0.008);
  const adminLegal = overrides.adminLegal ?? Math.round(totalRevenue * 0.003);
  const adminOther = overrides.adminOther ?? Math.round(totalRevenue * 0.01);
  const totalAdminExpenses = adminWages + adminBenefits + adminInsurance + adminIT + adminLegal + adminOther;

  // Other operating
  const badDebt = Math.round(totalRevenue * assumptions.badDebtPercent);
  const bedTax = overrides.bedTax ?? Math.round(totalPatientDays * 15); // Varies by state

  const totalOperatingExpenses =
    totalNursingExpenses +
    totalTherapyExpenses +
    totalDietaryExpenses +
    totalPlantExpenses +
    totalAdminExpenses +
    badDebt +
    bedTax;

  // Below the line
  const managementFee = Math.round(totalRevenue * assumptions.managementFeePercent);
  const ebitdar = totalRevenue - totalOperatingExpenses - managementFee;
  const ebitdarMargin = totalRevenue > 0 ? ebitdar / totalRevenue : 0;

  // Property
  const rentExpense = assumptions.rentRate * licensedBeds;
  const propertyTaxes = overrides.propertyTaxes ?? Math.round(assumptions.propertyTaxes / 12);
  const totalPropertyExpenses = rentExpense + propertyTaxes;

  const ebitda = ebitdar - totalPropertyExpenses;
  const ebitdaMargin = totalRevenue > 0 ? ebitda / totalRevenue : 0;

  // Other
  const depreciation = overrides.depreciation ?? Math.round(totalRevenue * 0.02);
  const interest = overrides.interest ?? 0;
  const otherMisc = overrides.otherMisc ?? 0;
  const totalOtherExpenses = depreciation + interest + otherMisc;

  const netIncome = ebitda - totalOtherExpenses;
  const netIncomeMargin = totalRevenue > 0 ? netIncome / totalRevenue : 0;

  return {
    licensedBeds,
    occupiedBeds,
    occupancyRate,
    totalPatientDays,
    daysInMonth,

    medicaidDays,
    managedMedicaidDays,
    privateDays,
    veteransDays,
    hospiceDays,
    medicareDays,
    hmoDays,
    isnpDays,

    medicaidRevenue,
    managedMedicaidRevenue,
    privateRevenue,
    veteransRevenue,
    hospiceRevenue,
    totalNonSkilledRevenue,

    medicareRevenue,
    managedMedicaidSkilledRevenue,
    hmoRevenue,
    isnpRevenue,
    veteransSkilledRevenue,
    totalSkilledRevenue,

    medBRevenue,
    uplRevenue,
    otherRevenue,
    totalOtherRevenue,

    totalRevenue,

    nursingWages,
    nursingBenefits,
    nursingAgency,
    nursingSupplies,
    nursingOther,
    totalNursingExpenses,

    therapyWages,
    therapyBenefits,
    therapyOther,
    totalTherapyExpenses,

    dietaryWages,
    dietaryBenefits,
    dietaryFood,
    dietaryOther,
    totalDietaryExpenses,

    plantWages,
    plantBenefits,
    plantUtilities,
    plantMaintenance,
    plantOther,
    totalPlantExpenses,

    adminWages,
    adminBenefits,
    adminInsurance,
    adminIT,
    adminLegal,
    adminOther,
    totalAdminExpenses,

    badDebt,
    bedTax,

    totalOperatingExpenses,

    managementFee,
    ebitdar,
    ebitdarMargin,

    rentExpense,
    propertyTaxes,
    totalPropertyExpenses,

    ebitda,
    ebitdaMargin,

    depreciation,
    interest,
    otherMisc,
    totalOtherExpenses,

    netIncome,
    netIncomeMargin,
  };
}

export function generateYearlyProforma(
  assumptions: ProformaAssumptions,
  year: number,
  monthlyOverrides: Partial<MonthlyData>[] = []
): MonthlyData[] {
  const months: MonthlyData[] = [];

  for (let month = 0; month < 12; month++) {
    const overrides = monthlyOverrides[month] || {};
    months.push(calculateMonthlyProforma(assumptions, year, month, overrides));
  }

  return months;
}

export function sumYearlyTotals(monthlyData: MonthlyData[]): MonthlyData {
  const totals = { ...monthlyData[0] };

  // Initialize all numeric fields to 0
  Object.keys(totals).forEach((key) => {
    if (typeof totals[key as keyof MonthlyData] === 'number') {
      (totals as Record<string, number>)[key] = 0;
    }
  });

  // Sum all months
  monthlyData.forEach((month) => {
    Object.keys(month).forEach((key) => {
      const value = month[key as keyof MonthlyData];
      if (typeof value === 'number' && !key.includes('Margin') && !key.includes('Rate') && key !== 'licensedBeds') {
        (totals as Record<string, number>)[key] += value;
      }
    });
  });

  // Set non-summed values
  totals.licensedBeds = monthlyData[0].licensedBeds;
  totals.occupancyRate = monthlyData.reduce((sum, m) => sum + m.occupancyRate, 0) / 12;
  totals.daysInMonth = monthlyData.reduce((sum, m) => sum + m.daysInMonth, 0);

  // Recalculate margins
  totals.ebitdarMargin = totals.totalRevenue > 0 ? totals.ebitdar / totals.totalRevenue : 0;
  totals.ebitdaMargin = totals.totalRevenue > 0 ? totals.ebitda / totals.totalRevenue : 0;
  totals.netIncomeMargin = totals.totalRevenue > 0 ? totals.netIncome / totals.totalRevenue : 0;

  return totals;
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

// ============================================================================
// Payer-Level Calculation Functions
// ============================================================================

/**
 * Calculate revenue by payer type
 * Revenue = Census Days × PPD Rate for each payer
 */
export function calculatePayerRevenue(
  census: CensusByPayer,
  rates: Partial<PayerRates>
): RevenueByPayer {
  const totalDays = getTotalDays(census);

  const medicarePartA = census.medicarePartADays * (rates.medicarePartAPpd || 0);
  const medicareAdvantage = census.medicareAdvantageDays * (rates.medicareAdvantagePpd || 0);
  const managedCare = census.managedCareDays * (rates.managedCarePpd || 0);
  const medicaid = census.medicaidDays * (rates.medicaidPpd || 0);
  const managedMedicaid = census.managedMedicaidDays * (rates.managedMedicaidPpd || 0);
  const privatePay = census.privateDays * (rates.privatePpd || 0);
  const vaContract = census.vaContractDays * (rates.vaContractPpd || 0);
  const hospice = census.hospiceDays * (rates.hospicePpd || 0);
  const other = census.otherDays * 200; // Default $200 PPD for other

  const ancillary = totalDays * (rates.ancillaryRevenuePpd || 0);
  const therapy = totalDays * (rates.therapyRevenuePpd || 0);

  const total =
    medicarePartA +
    medicareAdvantage +
    managedCare +
    medicaid +
    managedMedicaid +
    privatePay +
    vaContract +
    hospice +
    other +
    ancillary +
    therapy;

  return {
    medicarePartA,
    medicareAdvantage,
    managedCare,
    medicaid,
    managedMedicaid,
    private: privatePay,
    vaContract,
    hospice,
    other,
    ancillary,
    therapy,
    total,
  };
}

/**
 * Calculate blended (weighted average) PPD across all payers
 */
export function calculateBlendedPPD(
  census: CensusByPayer,
  rates: Partial<PayerRates>
): number {
  const revenue = calculatePayerRevenue(census, rates);
  const totalDays = getTotalDays(census);

  // Exclude ancillary and therapy from blended room & board PPD
  const roomBoardRevenue =
    revenue.total - revenue.ancillary - revenue.therapy;

  return totalDays > 0 ? roomBoardRevenue / totalDays : 0;
}

/**
 * Calculate blended PPD including ancillary revenue
 */
export function calculateAllInPPD(
  census: CensusByPayer,
  rates: Partial<PayerRates>
): number {
  const revenue = calculatePayerRevenue(census, rates);
  const totalDays = getTotalDays(census);
  return totalDays > 0 ? revenue.total / totalDays : 0;
}

/**
 * Calculate portfolio-weighted metrics across multiple facilities
 */
export function calculatePortfolioMetrics(
  facilities: FacilityFinancials[]
): PortfolioMetrics {
  if (facilities.length === 0) {
    return {
      totalFacilities: 0,
      totalBeds: 0,
      totalDays: 0,
      weightedOccupancy: 0,
      totalRevenue: 0,
      totalExpenses: 0,
      totalEbitdar: 0,
      totalEbitda: 0,
      weightedPPD: 0,
      weightedMargin: 0,
      facilitiesRanked: [],
      combinedPayerMix: [],
    };
  }

  const totalFacilities = facilities.length;
  const totalBeds = facilities.reduce((sum, f) => sum + f.beds, 0);
  const totalDays = facilities.reduce((sum, f) => sum + f.totalDays, 0);
  const totalRevenue = facilities.reduce((sum, f) => sum + f.totalRevenue, 0);
  const totalExpenses = facilities.reduce((sum, f) => sum + f.totalExpenses, 0);
  const totalEbitdar = facilities.reduce((sum, f) => sum + f.ebitdar, 0);
  const totalEbitda = facilities.reduce((sum, f) => sum + f.ebitda, 0);

  // Weighted occupancy (by beds)
  const weightedOccupancy =
    totalBeds > 0
      ? facilities.reduce((sum, f) => sum + f.occupancy * f.beds, 0) / totalBeds
      : 0;

  // Weighted PPD (by patient days)
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
  const combinedPayerMix = calculateCombinedPayerMix(facilities, totalDays, totalRevenue);

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
}

/**
 * Calculate combined payer mix across facilities
 */
function calculateCombinedPayerMix(
  facilities: FacilityFinancials[],
  totalDays: number,
  totalRevenue: number
): PortfolioMetrics['combinedPayerMix'] {
  const payerTypes = [
    { key: 'medicarePartA', label: 'Medicare Part A', daysKey: 'medicarePartADays', revenueKey: 'medicarePartA' },
    { key: 'medicareAdvantage', label: 'Medicare Advantage', daysKey: 'medicareAdvantageDays', revenueKey: 'medicareAdvantage' },
    { key: 'managedCare', label: 'Managed Care', daysKey: 'managedCareDays', revenueKey: 'managedCare' },
    { key: 'medicaid', label: 'Medicaid', daysKey: 'medicaidDays', revenueKey: 'medicaid' },
    { key: 'managedMedicaid', label: 'Managed Medicaid', daysKey: 'managedMedicaidDays', revenueKey: 'managedMedicaid' },
    { key: 'private', label: 'Private Pay', daysKey: 'privateDays', revenueKey: 'private' },
    { key: 'vaContract', label: 'VA Contract', daysKey: 'vaContractDays', revenueKey: 'vaContract' },
    { key: 'hospice', label: 'Hospice', daysKey: 'hospiceDays', revenueKey: 'hospice' },
    { key: 'other', label: 'Other', daysKey: 'otherDays', revenueKey: 'other' },
  ];

  return payerTypes.map((payer) => {
    const payerDays = facilities.reduce((sum, f) => {
      const days = f.censusByPayer[payer.daysKey as keyof CensusByPayer] || 0;
      return sum + days;
    }, 0);

    const payerRevenue = facilities.reduce((sum, f) => {
      const revenue = f.revenueByPayer[payer.revenueKey as keyof RevenueByPayer] || 0;
      return sum + revenue;
    }, 0);

    const percentMix = totalDays > 0 ? payerDays / totalDays : 0;
    const payerPPD = payerDays > 0 ? payerRevenue / payerDays : 0;

    return {
      payerType: payer.label,
      totalDays: payerDays,
      percentMix,
      weightedPPD: payerPPD,
      totalRevenue: payerRevenue,
    };
  }).filter((p) => p.totalDays > 0); // Only include payers with days
}

/**
 * Calculate Year-over-Year change percentage
 */
export function calculateYoYChange(current: number, prior: number): number {
  if (prior === 0) return 0;
  return (current - prior) / prior;
}

/**
 * Calculate Compound Annual Growth Rate (CAGR)
 */
export function calculateCAGR(
  startValue: number,
  endValue: number,
  years: number
): number {
  if (startValue <= 0 || years <= 0) return 0;
  return Math.pow(endValue / startValue, 1 / years) - 1;
}

/**
 * Project future value with annual growth rate
 */
export function projectWithGrowth(
  baseValue: number,
  annualGrowthRate: number,
  years: number
): number {
  return baseValue * Math.pow(1 + annualGrowthRate, years);
}

/**
 * Calculate skilled vs non-skilled census breakdown
 */
export function calculateSkilledMix(census: CensusByPayer): {
  skilledDays: number;
  nonSkilledDays: number;
  skilledPercent: number;
} {
  const skilledDays =
    census.medicarePartADays +
    census.medicareAdvantageDays +
    census.managedCareDays;

  const nonSkilledDays =
    census.medicaidDays +
    census.managedMedicaidDays +
    census.privateDays +
    census.vaContractDays +
    census.hospiceDays +
    census.otherDays;

  const totalDays = skilledDays + nonSkilledDays;
  const skilledPercent = totalDays > 0 ? skilledDays / totalDays : 0;

  return { skilledDays, nonSkilledDays, skilledPercent };
}
