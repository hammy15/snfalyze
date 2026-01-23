// =============================================================================
// FINANCIAL CALCULATOR - Calculate key financial metrics
// =============================================================================

import type {
  FinancialStatement,
  OperatingMetrics,
  FacilityProfile,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface FinancialMetrics {
  // Profitability
  grossMargin: number;
  operatingMargin: number;
  ebitdarMargin: number;
  ebitdaMargin: number;
  noiMargin: number;
  netMargin: number;

  // Per-Unit Metrics
  revenuePerBed: number;
  expensePerBed: number;
  noiPerBed: number;
  revenuePerPatientDay: number;
  expensePerPatientDay: number;
  noiPerPatientDay: number;

  // Efficiency
  laborCostRatio: number;
  agencyRatio: number;
  supplyRatio: number;
  overheadRatio: number;

  // Coverage
  debtServiceCoverage?: number;
  rentCoverage?: number;
  fixedChargeCoverage?: number;
}

export interface PayerMixAnalysis {
  revenueByPayer: {
    payer: string;
    revenue: number;
    percentage: number;
    patientDays: number;
    ratePerDay: number;
  }[];
  acuityIndicator: 'high' | 'medium' | 'low';
  skillMixRatio: number;
  medicareUtilization: number;
}

export interface TrendAnalysis {
  periods: string[];
  metrics: {
    name: string;
    values: number[];
    trend: 'improving' | 'stable' | 'declining';
    cagr?: number;
  }[];
}

// =============================================================================
// FINANCIAL CALCULATOR CLASS
// =============================================================================

export class FinancialCalculator {
  /**
   * Calculate all financial metrics from a statement
   */
  calculateMetrics(
    statement: FinancialStatement,
    facility?: FacilityProfile
  ): FinancialMetrics {
    const revenue = statement.revenue.totalNetRevenue;
    const grossRevenue = statement.revenue.totalGrossRevenue;
    const opex = statement.expenses.totalOperatingExpense;
    const labor = statement.expenses.totalLaborExpense;
    const beds = statement.facility.beds || facility?.beds.operational || 0;
    const patientDays = statement.patientDays.total;

    // Find specific expense items
    const findExpense = (category: string) =>
      statement.expenses.items.find((i) => i.category === category)?.amount || 0;

    const rent = findExpense('rent');
    const depreciation = findExpense('depreciation');
    const amortization = findExpense('amortization');
    const interest = findExpense('interest');
    const agency = findExpense('agency_nursing');
    const supplies = findExpense('medical_supplies') + findExpense('general_supplies');

    const noi = revenue - opex;
    const ebitdar = noi + rent;
    const ebitda = ebitdar - rent + depreciation + amortization;
    const netIncome = ebitda - depreciation - amortization - interest;

    // Calculate overhead (non-labor operating expenses)
    const overhead = opex - labor;

    return {
      // Profitability
      grossMargin: grossRevenue > 0 ? (grossRevenue - opex) / grossRevenue : 0,
      operatingMargin: revenue > 0 ? (revenue - opex) / revenue : 0,
      ebitdarMargin: revenue > 0 ? ebitdar / revenue : 0,
      ebitdaMargin: revenue > 0 ? ebitda / revenue : 0,
      noiMargin: revenue > 0 ? noi / revenue : 0,
      netMargin: revenue > 0 ? netIncome / revenue : 0,

      // Per-Unit Metrics
      revenuePerBed: beds > 0 ? revenue / beds : 0,
      expensePerBed: beds > 0 ? opex / beds : 0,
      noiPerBed: beds > 0 ? noi / beds : 0,
      revenuePerPatientDay: patientDays > 0 ? revenue / patientDays : 0,
      expensePerPatientDay: patientDays > 0 ? opex / patientDays : 0,
      noiPerPatientDay: patientDays > 0 ? noi / patientDays : 0,

      // Efficiency
      laborCostRatio: revenue > 0 ? labor / revenue : 0,
      agencyRatio: labor > 0 ? agency / labor : 0,
      supplyRatio: revenue > 0 ? supplies / revenue : 0,
      overheadRatio: revenue > 0 ? overhead / revenue : 0,

      // Coverage (if debt service info available)
      rentCoverage: rent > 0 ? ebitdar / rent : undefined,
    };
  }

  /**
   * Analyze payer mix from financial statement
   */
  analyzePayerMix(
    statement: FinancialStatement,
    operatingMetrics?: OperatingMetrics
  ): PayerMixAnalysis {
    const revenueByPayer: PayerMixAnalysis['revenueByPayer'] = [];
    const totalRevenue = statement.revenue.totalNetRevenue;
    const totalPatientDays = statement.patientDays.total;

    // Map revenue categories to payer names
    const payerMapping: Record<string, string> = {
      medicare_part_a: 'Medicare Part A',
      medicare_part_b: 'Medicare Part B',
      medicare_advantage: 'Medicare Advantage',
      medicaid: 'Medicaid',
      private_pay: 'Private Pay',
      managed_care: 'Managed Care',
      va_contract: 'VA Contract',
      hospice: 'Hospice',
      other_revenue: 'Other',
    };

    for (const item of statement.revenue.items) {
      const payerName = payerMapping[item.category] || item.category;

      // Estimate patient days if not provided
      let estimatedDays = item.patientDays || 0;
      if (!estimatedDays && operatingMetrics?.payerMix) {
        const mixPercent = this.getPayerMixPercent(item.category, operatingMetrics.payerMix);
        estimatedDays = totalPatientDays * mixPercent;
      }

      revenueByPayer.push({
        payer: payerName,
        revenue: item.amount,
        percentage: totalRevenue > 0 ? item.amount / totalRevenue : 0,
        patientDays: estimatedDays,
        ratePerDay: estimatedDays > 0 ? item.amount / estimatedDays : 0,
      });
    }

    // Calculate skill mix (Medicare A + MA as % of total census)
    const medicareARevenue = statement.revenue.items
      .filter((i) => i.category === 'medicare_part_a' || i.category === 'medicare_advantage')
      .reduce((sum, i) => sum + i.amount, 0);

    const skillMixRatio = totalRevenue > 0 ? medicareARevenue / totalRevenue : 0;

    // Determine acuity level based on Medicare utilization
    let acuityIndicator: 'high' | 'medium' | 'low' = 'medium';
    if (skillMixRatio >= 0.35) {
      acuityIndicator = 'high';
    } else if (skillMixRatio <= 0.15) {
      acuityIndicator = 'low';
    }

    // Calculate Medicare utilization (all Medicare revenue as % of total)
    const allMedicareRevenue = statement.revenue.items
      .filter((i) =>
        i.category === 'medicare_part_a' ||
        i.category === 'medicare_part_b' ||
        i.category === 'medicare_advantage'
      )
      .reduce((sum, i) => sum + i.amount, 0);

    const medicareUtilization = totalRevenue > 0 ? allMedicareRevenue / totalRevenue : 0;

    return {
      revenueByPayer,
      acuityIndicator,
      skillMixRatio,
      medicareUtilization,
    };
  }

  /**
   * Calculate debt service coverage ratio
   */
  calculateDSCR(
    noi: number,
    annualDebtService: number
  ): number {
    if (annualDebtService <= 0) return Infinity;
    return noi / annualDebtService;
  }

  /**
   * Calculate fixed charge coverage ratio
   */
  calculateFCCR(
    ebitdar: number,
    rent: number,
    debtService: number
  ): number {
    const fixedCharges = rent + debtService;
    if (fixedCharges <= 0) return Infinity;
    return ebitdar / fixedCharges;
  }

  /**
   * Calculate rent coverage ratio
   */
  calculateRentCoverage(ebitdar: number, rent: number): number {
    if (rent <= 0) return Infinity;
    return ebitdar / rent;
  }

  /**
   * Analyze trends across multiple periods
   */
  analyzeTrends(statements: FinancialStatement[]): TrendAnalysis {
    if (statements.length === 0) {
      return { periods: [], metrics: [] };
    }

    // Sort by period end date
    const sorted = [...statements].sort(
      (a, b) => new Date(a.period.endDate).getTime() - new Date(b.period.endDate).getTime()
    );

    const periods = sorted.map((s) => s.period.endDate);

    const metrics: TrendAnalysis['metrics'] = [
      {
        name: 'Revenue',
        values: sorted.map((s) => s.revenue.totalNetRevenue),
        trend: 'stable',
      },
      {
        name: 'NOI',
        values: sorted.map((s) => s.metrics.noi),
        trend: 'stable',
      },
      {
        name: 'NOI Margin',
        values: sorted.map((s) => s.metrics.noiMargin),
        trend: 'stable',
      },
      {
        name: 'Labor Cost %',
        values: sorted.map((s) => s.metrics.laborCostPercent),
        trend: 'stable',
      },
      {
        name: 'Revenue/Bed',
        values: sorted.map((s) => s.metrics.revenuePerBed),
        trend: 'stable',
      },
    ];

    // Calculate trends and CAGR
    for (const metric of metrics) {
      metric.trend = this.calculateTrend(metric.values);
      if (metric.values.length >= 2) {
        metric.cagr = this.calculateCAGR(
          metric.values[0],
          metric.values[metric.values.length - 1],
          metric.values.length - 1
        );
      }
    }

    return { periods, metrics };
  }

  /**
   * Calculate break-even occupancy
   */
  calculateBreakEvenOccupancy(
    fixedCosts: number,
    variableCostPerPatientDay: number,
    revenuePerPatientDay: number,
    beds: number
  ): number {
    if (revenuePerPatientDay <= variableCostPerPatientDay) {
      return Infinity; // Cannot break even
    }

    const contributionMargin = revenuePerPatientDay - variableCostPerPatientDay;
    const breakEvenPatientDays = fixedCosts / contributionMargin;
    const maxPatientDays = beds * 365;

    return breakEvenPatientDays / maxPatientDays;
  }

  /**
   * Project financials based on occupancy change
   */
  projectFinancialsAtOccupancy(
    statement: FinancialStatement,
    targetOccupancy: number,
    currentOccupancy: number,
    variableCostRatio: number = 0.3 // Assume 30% of costs are variable
  ): FinancialStatement {
    const occupancyChange = targetOccupancy / currentOccupancy;
    const projected = JSON.parse(JSON.stringify(statement)) as FinancialStatement;

    // Scale revenue proportionally to occupancy
    const revenueMultiplier = occupancyChange;
    projected.revenue.totalGrossRevenue *= revenueMultiplier;
    projected.revenue.totalNetRevenue *= revenueMultiplier;
    for (const item of projected.revenue.items) {
      item.amount *= revenueMultiplier;
    }

    // Scale patient days
    projected.patientDays.total *= occupancyChange;

    // Scale variable costs, keep fixed costs the same
    for (const item of projected.expenses.items) {
      const variablePortion = item.amount * variableCostRatio;
      const fixedPortion = item.amount * (1 - variableCostRatio);
      item.amount = fixedPortion + variablePortion * occupancyChange;
    }

    // Recalculate totals
    projected.expenses.totalLaborExpense = projected.expenses.items
      .filter((i) => ['nursing_salaries', 'nursing_wages', 'agency_nursing', 'other_salaries', 'employee_benefits', 'payroll_taxes'].includes(i.category))
      .reduce((sum, i) => sum + i.amount, 0);

    projected.expenses.totalNonLaborExpense = projected.expenses.items
      .filter((i) => !['nursing_salaries', 'nursing_wages', 'agency_nursing', 'other_salaries', 'employee_benefits', 'payroll_taxes'].includes(i.category))
      .reduce((sum, i) => sum + i.amount, 0);

    projected.expenses.totalOperatingExpense =
      projected.expenses.totalLaborExpense + projected.expenses.totalNonLaborExpense;

    // Recalculate metrics
    const revenue = projected.revenue.totalNetRevenue;
    const opex = projected.expenses.totalOperatingExpense;
    const noi = revenue - opex;
    const rent = projected.expenses.items.find((i) => i.category === 'rent')?.amount || 0;
    const depreciation = projected.expenses.items.find((i) => i.category === 'depreciation')?.amount || 0;
    const amortization = projected.expenses.items.find((i) => i.category === 'amortization')?.amount || 0;
    const interest = projected.expenses.items.find((i) => i.category === 'interest')?.amount || 0;

    const ebitdar = noi + rent;
    const ebitda = ebitdar - rent + depreciation + amortization;
    const netIncome = ebitda - depreciation - amortization - interest;

    projected.metrics = {
      ebitdar,
      ebitdarMargin: revenue > 0 ? ebitdar / revenue : 0,
      ebitda,
      ebitdaMargin: revenue > 0 ? ebitda / revenue : 0,
      noi,
      noiMargin: revenue > 0 ? noi / revenue : 0,
      netIncome,
      netIncomeMargin: revenue > 0 ? netIncome / revenue : 0,
      revenuePerBed: projected.facility.beds > 0 ? revenue / projected.facility.beds : 0,
      expensePerBed: projected.facility.beds > 0 ? opex / projected.facility.beds : 0,
      revenuePerPatientDay: projected.patientDays.total > 0 ? revenue / projected.patientDays.total : 0,
      expensePerPatientDay: projected.patientDays.total > 0 ? opex / projected.patientDays.total : 0,
      laborCostPercent: revenue > 0 ? projected.expenses.totalLaborExpense / revenue : 0,
    };

    return projected;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Get payer mix percentage from operating metrics
   */
  private getPayerMixPercent(
    category: string,
    payerMix: OperatingMetrics['payerMix']
  ): number {
    const mapping: Record<string, keyof OperatingMetrics['payerMix']> = {
      medicare_part_a: 'medicareA',
      medicare_part_b: 'medicareB',
      medicare_advantage: 'medicareAdvantage',
      medicaid: 'medicaid',
      private_pay: 'privatePay',
      managed_care: 'managedCare',
      va_contract: 'vaContract',
      hospice: 'hospice',
      other_revenue: 'other',
    };

    const key = mapping[category];
    return key ? payerMix[key] / 100 : 0;
  }

  /**
   * Calculate trend from values
   */
  private calculateTrend(values: number[]): 'improving' | 'stable' | 'declining' {
    if (values.length < 2) return 'stable';

    const first = values[0];
    const last = values[values.length - 1];
    const change = (last - first) / first;

    if (change > 0.05) return 'improving';
    if (change < -0.05) return 'declining';
    return 'stable';
  }

  /**
   * Calculate compound annual growth rate
   */
  private calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || years <= 0) return 0;
    return Math.pow(endValue / startValue, 1 / years) - 1;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const financialCalculator = new FinancialCalculator();
