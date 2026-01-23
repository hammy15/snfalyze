// =============================================================================
// FINANCIAL NORMALIZER - Standardize and normalize financial statements
// =============================================================================

import type {
  FinancialStatement,
  NormalizedFinancials,
  NormalizationAdjustment,
  RevenueLineItem,
  ExpenseLineItem,
  RevenueCategory,
  ExpenseCategory,
} from '../types';
import { matchToAccount, CHART_OF_ACCOUNTS, type COAAccount } from './chart-of-accounts';

// =============================================================================
// TYPES
// =============================================================================

export interface NormalizationOptions {
  // Expense adjustments
  normalizeManagementFee?: boolean;
  targetManagementFeePercent?: number;
  normalizeRent?: boolean;
  targetRentPerBed?: number;
  removeRelatedPartyExpenses?: boolean;
  relatedPartyItems?: string[];

  // Revenue adjustments
  normalizeOccupancy?: boolean;
  targetOccupancy?: number;
  normalizePayerMix?: boolean;
  targetPayerMix?: Record<string, number>;

  // Staffing normalization
  normalizeAgency?: boolean;
  targetAgencyPercent?: number;

  // Other
  addReserves?: boolean;
  reservePercent?: number;
  annualize?: boolean;
}

export interface RawFinancialData {
  revenueLines: { label: string; amount: number }[];
  expenseLines: { label: string; amount: number }[];
  beds: number;
  patientDays: number;
  period: {
    startDate?: string;
    endDate: string;
    months?: number;
    isAudited?: boolean;
    isProjected?: boolean;
  };
}

// =============================================================================
// DEFAULT NORMALIZATION OPTIONS
// =============================================================================

const DEFAULT_OPTIONS: NormalizationOptions = {
  normalizeManagementFee: true,
  targetManagementFeePercent: 0.05, // 5%
  normalizeRent: false,
  normalizeOccupancy: false,
  normalizePayerMix: false,
  normalizeAgency: true,
  targetAgencyPercent: 0.03, // 3%
  addReserves: true,
  reservePercent: 0.03, // 3% capital reserve
  annualize: true,
};

// =============================================================================
// FINANCIAL NORMALIZER CLASS
// =============================================================================

export class FinancialNormalizer {
  private options: NormalizationOptions;

  constructor(options: Partial<NormalizationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Normalize raw financial data into standard format
   */
  normalize(rawData: RawFinancialData): NormalizedFinancials {
    // First, map raw data to standard COA
    const mappedRevenue = this.mapRevenueLines(rawData.revenueLines);
    const mappedExpenses = this.mapExpenseLines(rawData.expenseLines);

    // Build original statement
    const original = this.buildStatement(mappedRevenue, mappedExpenses, rawData);

    // Apply normalizations
    const { normalized, adjustments } = this.applyNormalizations(original, rawData);

    // Calculate benchmark comparison
    const benchmarkComparison = this.calculateBenchmarkComparison(normalized, rawData);

    return {
      original,
      normalized,
      adjustments,
      benchmarkComparison,
    };
  }

  /**
   * Map raw revenue lines to standard categories
   */
  private mapRevenueLines(
    lines: { label: string; amount: number }[]
  ): Map<RevenueCategory, number> {
    const mapped = new Map<RevenueCategory, number>();

    for (const line of lines) {
      const match = matchToAccount(line.label);

      if (match.matchedAccount && match.matchedAccount.type === 'revenue') {
        const category = match.matchedAccount.category as RevenueCategory;
        const current = mapped.get(category) || 0;
        mapped.set(category, current + line.amount);
      } else {
        // Unmapped revenue goes to "other"
        const current = mapped.get('other_revenue') || 0;
        mapped.set('other_revenue', current + line.amount);
      }
    }

    return mapped;
  }

  /**
   * Map raw expense lines to standard categories
   */
  private mapExpenseLines(
    lines: { label: string; amount: number }[]
  ): Map<ExpenseCategory, number> {
    const mapped = new Map<ExpenseCategory, number>();

    for (const line of lines) {
      const match = matchToAccount(line.label);

      if (match.matchedAccount && match.matchedAccount.type === 'expense') {
        const category = match.matchedAccount.category as ExpenseCategory;
        const current = mapped.get(category) || 0;
        mapped.set(category, current + line.amount);
      } else {
        // Unmapped expense goes to "other"
        const current = mapped.get('other_expense') || 0;
        mapped.set('other_expense', current + line.amount);
      }
    }

    return mapped;
  }

  /**
   * Build a financial statement from mapped data
   */
  private buildStatement(
    revenue: Map<RevenueCategory, number>,
    expenses: Map<ExpenseCategory, number>,
    rawData: RawFinancialData
  ): FinancialStatement {
    // Calculate revenue items
    const revenueItems: RevenueLineItem[] = [];
    let totalGrossRevenue = 0;

    for (const [category, amount] of revenue.entries()) {
      revenueItems.push({
        category,
        amount,
      });
      totalGrossRevenue += amount;
    }

    // Calculate percentages
    for (const item of revenueItems) {
      item.percentOfTotal = totalGrossRevenue > 0 ? item.amount / totalGrossRevenue : 0;
      if (rawData.patientDays > 0) {
        item.patientDays = rawData.patientDays;
        item.ratePerDay = item.amount / rawData.patientDays;
      }
    }

    // Calculate expense items
    const expenseItems: ExpenseLineItem[] = [];
    let totalLaborExpense = 0;
    let totalNonLaborExpense = 0;

    const laborCategories: ExpenseCategory[] = [
      'nursing_salaries',
      'nursing_wages',
      'agency_nursing',
      'other_salaries',
      'employee_benefits',
      'payroll_taxes',
    ];

    for (const [category, amount] of expenses.entries()) {
      const item: ExpenseLineItem = {
        category,
        amount,
        percentOfRevenue: totalGrossRevenue > 0 ? amount / totalGrossRevenue : 0,
        perBed: rawData.beds > 0 ? amount / rawData.beds : 0,
        perPatientDay: rawData.patientDays > 0 ? amount / rawData.patientDays : 0,
      };
      expenseItems.push(item);

      if (laborCategories.includes(category)) {
        totalLaborExpense += amount;
      } else {
        totalNonLaborExpense += amount;
      }
    }

    const totalOperatingExpense = totalLaborExpense + totalNonLaborExpense;
    const totalNetRevenue = totalGrossRevenue; // Adjust if contractual adjustments exist
    const noi = totalNetRevenue - totalOperatingExpense;

    // Calculate EBITDAR (NOI + Rent)
    const rentExpense = expenses.get('rent') || 0;
    const ebitdar = noi + rentExpense;

    // Calculate EBITDA (NOI + Rent + D&A)
    const depreciation = expenses.get('depreciation') || 0;
    const amortization = expenses.get('amortization') || 0;
    const ebitda = ebitdar - rentExpense + depreciation + amortization;

    // Calculate net income
    const interest = expenses.get('interest') || 0;
    const netIncome = ebitda - depreciation - amortization - interest;

    return {
      period: {
        startDate: rawData.period.startDate || '',
        endDate: rawData.period.endDate,
        periodType: rawData.period.months === 12 ? 'year' : 'trailing_12',
        isAudited: rawData.period.isAudited || false,
        isProjected: rawData.period.isProjected || false,
      },
      facility: {
        id: '',
        name: '',
        beds: rawData.beds,
      },
      revenue: {
        items: revenueItems,
        totalGrossRevenue,
        contractualAdjustments: 0,
        badDebt: 0,
        charityCare: 0,
        totalNetRevenue,
      },
      expenses: {
        items: expenseItems,
        totalLaborExpense,
        totalNonLaborExpense,
        totalOperatingExpense,
      },
      metrics: {
        ebitdar,
        ebitdarMargin: totalNetRevenue > 0 ? ebitdar / totalNetRevenue : 0,
        ebitda,
        ebitdaMargin: totalNetRevenue > 0 ? ebitda / totalNetRevenue : 0,
        noi,
        noiMargin: totalNetRevenue > 0 ? noi / totalNetRevenue : 0,
        netIncome,
        netIncomeMargin: totalNetRevenue > 0 ? netIncome / totalNetRevenue : 0,
        revenuePerBed: rawData.beds > 0 ? totalNetRevenue / rawData.beds : 0,
        expensePerBed: rawData.beds > 0 ? totalOperatingExpense / rawData.beds : 0,
        revenuePerPatientDay: rawData.patientDays > 0 ? totalNetRevenue / rawData.patientDays : 0,
        expensePerPatientDay:
          rawData.patientDays > 0 ? totalOperatingExpense / rawData.patientDays : 0,
        laborCostPercent: totalNetRevenue > 0 ? totalLaborExpense / totalNetRevenue : 0,
      },
      patientDays: {
        total: rawData.patientDays,
        byPayer: {},
      },
    };
  }

  /**
   * Apply normalization adjustments
   */
  private applyNormalizations(
    original: FinancialStatement,
    rawData: RawFinancialData
  ): { normalized: FinancialStatement; adjustments: NormalizationAdjustment[] } {
    const adjustments: NormalizationAdjustment[] = [];
    let normalized = this.cloneStatement(original);

    // Annualize if needed
    if (this.options.annualize && rawData.period.months && rawData.period.months !== 12) {
      const result = this.annualizeStatement(normalized, rawData.period.months);
      normalized = result.statement;
      adjustments.push(result.adjustment);
    }

    // Normalize management fee
    if (this.options.normalizeManagementFee) {
      const result = this.normalizeManagementFee(normalized);
      if (result.adjustment) {
        normalized = result.statement;
        adjustments.push(result.adjustment);
      }
    }

    // Normalize agency costs
    if (this.options.normalizeAgency) {
      const result = this.normalizeAgency(normalized);
      if (result.adjustment) {
        normalized = result.statement;
        adjustments.push(result.adjustment);
      }
    }

    // Add capital reserves
    if (this.options.addReserves && this.options.reservePercent) {
      const result = this.addCapitalReserves(normalized);
      if (result.adjustment) {
        normalized = result.statement;
        adjustments.push(result.adjustment);
      }
    }

    // Recalculate metrics after adjustments
    normalized = this.recalculateMetrics(normalized);

    return { normalized, adjustments };
  }

  /**
   * Annualize a partial-year statement
   */
  private annualizeStatement(
    statement: FinancialStatement,
    months: number
  ): { statement: FinancialStatement; adjustment: NormalizationAdjustment } {
    const factor = 12 / months;
    const newStatement = this.cloneStatement(statement);

    // Annualize revenue
    for (const item of newStatement.revenue.items) {
      item.amount *= factor;
    }
    newStatement.revenue.totalGrossRevenue *= factor;
    newStatement.revenue.totalNetRevenue *= factor;

    // Annualize expenses
    for (const item of newStatement.expenses.items) {
      item.amount *= factor;
    }
    newStatement.expenses.totalLaborExpense *= factor;
    newStatement.expenses.totalNonLaborExpense *= factor;
    newStatement.expenses.totalOperatingExpense *= factor;

    // Update patient days
    newStatement.patientDays.total *= factor;

    const adjustment: NormalizationAdjustment = {
      category: 'annualization',
      description: `Annualized ${months}-month financials to 12 months`,
      originalAmount: statement.revenue.totalNetRevenue,
      adjustedAmount: newStatement.revenue.totalNetRevenue,
      adjustmentAmount: newStatement.revenue.totalNetRevenue - statement.revenue.totalNetRevenue,
      reason: `Multiplied all line items by ${factor.toFixed(2)} to annualize`,
    };

    return { statement: newStatement, adjustment };
  }

  /**
   * Normalize management fee to target percentage
   */
  private normalizeManagementFee(statement: FinancialStatement): {
    statement: FinancialStatement;
    adjustment: NormalizationAdjustment | null;
  } {
    const targetPercent = this.options.targetManagementFeePercent || 0.05;
    const mgmtFeeItem = statement.expenses.items.find((i) => i.category === 'management_fee');

    if (!mgmtFeeItem) {
      // No management fee found - add one at target rate
      const targetAmount = statement.revenue.totalNetRevenue * targetPercent;
      const newStatement = this.cloneStatement(statement);

      newStatement.expenses.items.push({
        category: 'management_fee',
        amount: targetAmount,
        percentOfRevenue: targetPercent,
      });
      newStatement.expenses.totalNonLaborExpense += targetAmount;
      newStatement.expenses.totalOperatingExpense += targetAmount;

      return {
        statement: newStatement,
        adjustment: {
          category: 'management_fee',
          description: 'Added management fee at market rate',
          originalAmount: 0,
          adjustedAmount: targetAmount,
          adjustmentAmount: targetAmount,
          reason: `No management fee found; added ${(targetPercent * 100).toFixed(1)}% fee`,
        },
      };
    }

    const currentPercent = mgmtFeeItem.amount / statement.revenue.totalNetRevenue;
    const targetAmount = statement.revenue.totalNetRevenue * targetPercent;

    // Only adjust if significantly different (> 1% variance)
    if (Math.abs(currentPercent - targetPercent) < 0.01) {
      return { statement, adjustment: null };
    }

    const newStatement = this.cloneStatement(statement);
    const adjustmentAmount = targetAmount - mgmtFeeItem.amount;

    const newMgmtFeeItem = newStatement.expenses.items.find((i) => i.category === 'management_fee');
    if (newMgmtFeeItem) {
      newMgmtFeeItem.amount = targetAmount;
      newMgmtFeeItem.percentOfRevenue = targetPercent;
    }

    newStatement.expenses.totalNonLaborExpense += adjustmentAmount;
    newStatement.expenses.totalOperatingExpense += adjustmentAmount;

    return {
      statement: newStatement,
      adjustment: {
        category: 'management_fee',
        description: 'Normalized management fee to market rate',
        originalAmount: mgmtFeeItem.amount,
        adjustedAmount: targetAmount,
        adjustmentAmount,
        reason: `Adjusted from ${(currentPercent * 100).toFixed(1)}% to ${(targetPercent * 100).toFixed(1)}%`,
      },
    };
  }

  /**
   * Normalize agency costs
   */
  private normalizeAgency(statement: FinancialStatement): {
    statement: FinancialStatement;
    adjustment: NormalizationAdjustment | null;
  } {
    const targetPercent = this.options.targetAgencyPercent || 0.03;
    const agencyItem = statement.expenses.items.find((i) => i.category === 'agency_nursing');
    const nursingWagesItem = statement.expenses.items.find((i) => i.category === 'nursing_wages');

    // Calculate total nursing labor as baseline
    const totalNursingLabor =
      (agencyItem?.amount || 0) + (nursingWagesItem?.amount || 0);

    if (totalNursingLabor === 0 || !agencyItem) {
      return { statement, adjustment: null };
    }

    const currentPercent = agencyItem.amount / totalNursingLabor;
    const targetAmount = totalNursingLabor * targetPercent;

    // Only adjust if agency is significantly above target (> 2%)
    if (currentPercent <= targetPercent + 0.02) {
      return { statement, adjustment: null };
    }

    const newStatement = this.cloneStatement(statement);
    const adjustmentAmount = agencyItem.amount - targetAmount;

    // Reduce agency, increase regular wages (net effect on NOI = 0)
    const newAgencyItem = newStatement.expenses.items.find((i) => i.category === 'agency_nursing');
    const newNursingWagesItem = newStatement.expenses.items.find(
      (i) => i.category === 'nursing_wages'
    );

    if (newAgencyItem) {
      newAgencyItem.amount = targetAmount;
    }
    if (newNursingWagesItem) {
      newNursingWagesItem.amount += adjustmentAmount * 0.7; // Agency typically costs 30% more
    }

    // Net savings from reduced agency premium
    const savings = adjustmentAmount * 0.3;
    newStatement.expenses.totalLaborExpense -= savings;
    newStatement.expenses.totalOperatingExpense -= savings;

    return {
      statement: newStatement,
      adjustment: {
        category: 'agency_nursing',
        description: 'Normalized agency costs to market rate',
        originalAmount: agencyItem.amount,
        adjustedAmount: targetAmount,
        adjustmentAmount: -savings,
        reason: `Reduced agency from ${(currentPercent * 100).toFixed(1)}% to ${(targetPercent * 100).toFixed(1)}% with $${savings.toLocaleString()} savings`,
      },
    };
  }

  /**
   * Add capital reserves
   */
  private addCapitalReserves(statement: FinancialStatement): {
    statement: FinancialStatement;
    adjustment: NormalizationAdjustment | null;
  } {
    const reservePercent = this.options.reservePercent || 0.03;
    const reserveAmount = statement.revenue.totalNetRevenue * reservePercent;

    const newStatement = this.cloneStatement(statement);

    // Add as an expense
    newStatement.expenses.items.push({
      category: 'other_expense',
      amount: reserveAmount,
      percentOfRevenue: reservePercent,
    });
    newStatement.expenses.totalNonLaborExpense += reserveAmount;
    newStatement.expenses.totalOperatingExpense += reserveAmount;

    return {
      statement: newStatement,
      adjustment: {
        category: 'capital_reserves',
        description: 'Added capital reserve allocation',
        originalAmount: 0,
        adjustedAmount: reserveAmount,
        adjustmentAmount: reserveAmount,
        reason: `Added ${(reservePercent * 100).toFixed(1)}% capital reserve for ongoing capex`,
      },
    };
  }

  /**
   * Recalculate all metrics after adjustments
   */
  private recalculateMetrics(statement: FinancialStatement): FinancialStatement {
    const newStatement = this.cloneStatement(statement);
    const revenue = newStatement.revenue.totalNetRevenue;
    const opex = newStatement.expenses.totalOperatingExpense;
    const labor = newStatement.expenses.totalLaborExpense;
    const beds = newStatement.facility.beds;
    const patientDays = newStatement.patientDays.total;

    const rentExpense = newStatement.expenses.items.find((i) => i.category === 'rent')?.amount || 0;
    const depreciation =
      newStatement.expenses.items.find((i) => i.category === 'depreciation')?.amount || 0;
    const amortization =
      newStatement.expenses.items.find((i) => i.category === 'amortization')?.amount || 0;
    const interest =
      newStatement.expenses.items.find((i) => i.category === 'interest')?.amount || 0;

    const noi = revenue - opex;
    const ebitdar = noi + rentExpense;
    const ebitda = ebitdar - rentExpense + depreciation + amortization;
    const netIncome = ebitda - depreciation - amortization - interest;

    newStatement.metrics = {
      ebitdar,
      ebitdarMargin: revenue > 0 ? ebitdar / revenue : 0,
      ebitda,
      ebitdaMargin: revenue > 0 ? ebitda / revenue : 0,
      noi,
      noiMargin: revenue > 0 ? noi / revenue : 0,
      netIncome,
      netIncomeMargin: revenue > 0 ? netIncome / revenue : 0,
      revenuePerBed: beds > 0 ? revenue / beds : 0,
      expensePerBed: beds > 0 ? opex / beds : 0,
      revenuePerPatientDay: patientDays > 0 ? revenue / patientDays : 0,
      expensePerPatientDay: patientDays > 0 ? opex / patientDays : 0,
      laborCostPercent: revenue > 0 ? labor / revenue : 0,
    };

    return newStatement;
  }

  /**
   * Calculate benchmark comparison
   */
  private calculateBenchmarkComparison(
    statement: FinancialStatement,
    rawData: RawFinancialData
  ): NormalizedFinancials['benchmarkComparison'] {
    // Industry benchmarks (these would typically come from a database)
    const benchmarks = {
      revenuePerPatientDay: 350, // $350/day average
      laborCostPercent: 0.55, // 55% labor cost
      ebitdarMargin: 0.12, // 12% EBITDAR margin
      occupancy: 0.85, // 85% occupancy
    };

    const actualOccupancy =
      rawData.patientDays > 0 && rawData.beds > 0
        ? rawData.patientDays / (rawData.beds * 365)
        : 0;

    return {
      revenuePerPatientDay: {
        value: statement.metrics.revenuePerPatientDay,
        benchmark: benchmarks.revenuePerPatientDay,
        variance: statement.metrics.revenuePerPatientDay - benchmarks.revenuePerPatientDay,
        rating: this.getRating(
          statement.metrics.revenuePerPatientDay,
          benchmarks.revenuePerPatientDay,
          true
        ),
      },
      laborCostPercent: {
        value: statement.metrics.laborCostPercent,
        benchmark: benchmarks.laborCostPercent,
        variance: statement.metrics.laborCostPercent - benchmarks.laborCostPercent,
        rating: this.getRating(
          statement.metrics.laborCostPercent,
          benchmarks.laborCostPercent,
          false
        ),
      },
      ebitdarMargin: {
        value: statement.metrics.ebitdarMargin,
        benchmark: benchmarks.ebitdarMargin,
        variance: statement.metrics.ebitdarMargin - benchmarks.ebitdarMargin,
        rating: this.getRating(statement.metrics.ebitdarMargin, benchmarks.ebitdarMargin, true),
      },
      occupancy: {
        value: actualOccupancy,
        benchmark: benchmarks.occupancy,
        variance: actualOccupancy - benchmarks.occupancy,
        rating: this.getRating(actualOccupancy, benchmarks.occupancy, true),
      },
    };
  }

  /**
   * Get rating based on comparison to benchmark
   */
  private getRating(value: number, benchmark: number, higherIsBetter: boolean): string {
    const percentDiff = (value - benchmark) / benchmark;

    if (higherIsBetter) {
      if (percentDiff >= 0.1) return 'Excellent';
      if (percentDiff >= 0) return 'Good';
      if (percentDiff >= -0.1) return 'Fair';
      return 'Poor';
    } else {
      if (percentDiff <= -0.1) return 'Excellent';
      if (percentDiff <= 0) return 'Good';
      if (percentDiff <= 0.1) return 'Fair';
      return 'Poor';
    }
  }

  /**
   * Clone a financial statement
   */
  private cloneStatement(statement: FinancialStatement): FinancialStatement {
    return JSON.parse(JSON.stringify(statement));
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const financialNormalizer = new FinancialNormalizer();
