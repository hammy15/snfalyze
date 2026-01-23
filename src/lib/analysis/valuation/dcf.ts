// =============================================================================
// DCF VALUATION - Discounted Cash Flow Analysis
// =============================================================================

import type { ValuationMethod, FacilityProfile, NormalizedFinancials } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface DCFInput {
  currentNOI: number;
  facility: FacilityProfile;
  financials?: NormalizedFinancials;
  settings?: DCFSettings;
}

export interface DCFSettings {
  holdPeriod: number; // Years
  discountRate: number; // Annual rate
  exitCapRate: number;

  // Growth assumptions
  revenueGrowthRate: number;
  expenseGrowthRate: number;
  noiGrowthRate?: number; // If set, overrides revenue/expense growth

  // Occupancy assumptions
  currentOccupancy?: number;
  stabilizedOccupancy?: number;
  yearsToStabilize?: number;

  // Capital expenditure assumptions
  annualCapexPercent?: number; // As % of revenue
  initialCapex?: number;

  // Transaction costs
  exitCostPercent?: number; // Selling costs as % of exit value
}

export interface DCFProjection {
  year: number;
  revenue: number;
  expenses: number;
  noi: number;
  capex: number;
  cashFlow: number;
  discountFactor: number;
  presentValue: number;
}

export interface DCFResult {
  projections: DCFProjection[];
  exitValue: number;
  exitValuePV: number;
  totalCashFlowPV: number;
  totalValue: number;
  irr: number;
  equityMultiple: number;
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_DCF_SETTINGS: DCFSettings = {
  holdPeriod: 10,
  discountRate: 0.09, // 9%
  exitCapRate: 0.095, // 9.5%
  revenueGrowthRate: 0.025, // 2.5%
  expenseGrowthRate: 0.03, // 3%
  annualCapexPercent: 0.02, // 2% of revenue
  exitCostPercent: 0.03, // 3% selling costs
};

// =============================================================================
// DCF CALCULATOR CLASS
// =============================================================================

export class DCFCalculator {
  /**
   * Calculate value using DCF method
   */
  calculate(input: DCFInput): ValuationMethod {
    const settings = { ...DEFAULT_DCF_SETTINGS, ...input.settings };
    const { currentNOI, facility, financials } = input;

    // Get base revenue and expense from financials or estimate
    let baseRevenue: number;
    let baseExpense: number;

    if (financials) {
      baseRevenue = financials.normalized.revenue.totalNetRevenue;
      baseExpense = financials.normalized.expenses.totalOperatingExpense;
    } else {
      // Estimate based on NOI and typical margin
      const estimatedMargin = 0.10; // Assume 10% NOI margin
      baseRevenue = currentNOI / estimatedMargin;
      baseExpense = baseRevenue - currentNOI;
    }

    // Calculate DCF projections
    const dcfResult = this.calculateDCF(baseRevenue, baseExpense, settings);

    // Determine confidence
    const confidence = this.calculateConfidence(input, settings);

    return {
      name: 'Discounted Cash Flow',
      value: dcfResult.totalValue,
      confidence,
      weight: 0.25,
      weightedValue: dcfResult.totalValue * 0.25,
      inputs: {
        currentNOI,
        holdPeriod: settings.holdPeriod,
        discountRate: settings.discountRate,
        exitCapRate: settings.exitCapRate,
        revenueGrowthRate: settings.revenueGrowthRate,
        expenseGrowthRate: settings.expenseGrowthRate,
        irr: dcfResult.irr,
        equityMultiple: dcfResult.equityMultiple,
      },
      adjustments: [
        {
          description: `${settings.holdPeriod}-year hold period`,
          impact: 0,
        },
        {
          description: `${(settings.discountRate * 100).toFixed(1)}% discount rate`,
          impact: 0,
        },
        {
          description: `${(settings.exitCapRate * 100).toFixed(2)}% exit cap rate`,
          impact: 0,
        },
      ],
    };
  }

  /**
   * Perform full DCF analysis with projections
   */
  calculateDCF(
    baseRevenue: number,
    baseExpense: number,
    settings: DCFSettings
  ): DCFResult {
    const projections: DCFProjection[] = [];
    let totalCashFlowPV = 0;

    const {
      holdPeriod,
      discountRate,
      exitCapRate,
      revenueGrowthRate,
      expenseGrowthRate,
      noiGrowthRate,
      annualCapexPercent = 0,
      initialCapex = 0,
      currentOccupancy,
      stabilizedOccupancy,
      yearsToStabilize,
    } = settings;

    // Project each year
    for (let year = 1; year <= holdPeriod; year++) {
      // Calculate occupancy factor if stabilization is modeled
      let occupancyFactor = 1.0;
      if (currentOccupancy && stabilizedOccupancy && yearsToStabilize) {
        if (year <= yearsToStabilize) {
          const progress = year / yearsToStabilize;
          const currentYearOcc = currentOccupancy + (stabilizedOccupancy - currentOccupancy) * progress;
          occupancyFactor = currentYearOcc / currentOccupancy;
        } else {
          occupancyFactor = stabilizedOccupancy / currentOccupancy;
        }
      }

      // Calculate revenue (with growth and occupancy adjustment)
      const revenueGrowth = Math.pow(1 + revenueGrowthRate, year);
      const revenue = baseRevenue * revenueGrowth * occupancyFactor;

      // Calculate expenses (with growth)
      const expenseGrowth = Math.pow(1 + expenseGrowthRate, year);
      const expenses = baseExpense * expenseGrowth;

      // Calculate NOI
      let noi: number;
      if (noiGrowthRate !== undefined) {
        // Direct NOI growth
        const baseNOI = baseRevenue - baseExpense;
        noi = baseNOI * Math.pow(1 + noiGrowthRate, year);
      } else {
        noi = revenue - expenses;
      }

      // Calculate capex
      let capex = revenue * annualCapexPercent;
      if (year === 1 && initialCapex > 0) {
        capex += initialCapex;
      }

      // Calculate cash flow
      const cashFlow = noi - capex;

      // Calculate present value
      const discountFactor = Math.pow(1 + discountRate, year);
      const presentValue = cashFlow / discountFactor;

      projections.push({
        year,
        revenue,
        expenses,
        noi,
        capex,
        cashFlow,
        discountFactor,
        presentValue,
      });

      totalCashFlowPV += presentValue;
    }

    // Calculate exit value
    const finalYearNOI = projections[projections.length - 1].noi;
    const grossExitValue = finalYearNOI / exitCapRate;
    const exitCosts = grossExitValue * (settings.exitCostPercent || 0);
    const exitValue = grossExitValue - exitCosts;

    // Present value of exit
    const exitDiscountFactor = Math.pow(1 + discountRate, holdPeriod);
    const exitValuePV = exitValue / exitDiscountFactor;

    // Total value
    const totalValue = totalCashFlowPV + exitValuePV;

    // Calculate IRR and equity multiple
    const cashFlows = projections.map((p) => p.cashFlow);
    cashFlows.push(exitValue); // Add exit value to final year

    const irr = this.calculateIRR([-totalValue, ...cashFlows]);
    const totalCashReturned = cashFlows.reduce((sum, cf) => sum + cf, 0);
    const equityMultiple = totalCashReturned / totalValue;

    return {
      projections,
      exitValue,
      exitValuePV,
      totalCashFlowPV,
      totalValue,
      irr,
      equityMultiple,
    };
  }

  /**
   * Calculate IRR using Newton's method
   */
  private calculateIRR(cashFlows: number[], guess: number = 0.1): number {
    const maxIterations = 100;
    const tolerance = 0.0001;
    let irr = guess;

    for (let i = 0; i < maxIterations; i++) {
      const npv = this.calculateNPV(cashFlows, irr);
      const npvDerivative = this.calculateNPVDerivative(cashFlows, irr);

      if (Math.abs(npvDerivative) < tolerance) {
        break;
      }

      const newIRR = irr - npv / npvDerivative;

      if (Math.abs(newIRR - irr) < tolerance) {
        return newIRR;
      }

      irr = newIRR;
    }

    return irr;
  }

  /**
   * Calculate NPV
   */
  private calculateNPV(cashFlows: number[], rate: number): number {
    return cashFlows.reduce((npv, cf, t) => {
      return npv + cf / Math.pow(1 + rate, t);
    }, 0);
  }

  /**
   * Calculate NPV derivative for Newton's method
   */
  private calculateNPVDerivative(cashFlows: number[], rate: number): number {
    return cashFlows.reduce((derivative, cf, t) => {
      if (t === 0) return derivative;
      return derivative - (t * cf) / Math.pow(1 + rate, t + 1);
    }, 0);
  }

  /**
   * Calculate confidence level
   */
  private calculateConfidence(input: DCFInput, settings: DCFSettings): 'high' | 'medium' | 'low' {
    let score = 0;

    // Base data quality
    if (input.currentNOI > 0) score += 2;
    if (input.financials) score += 2;

    // Reasonable assumptions
    if (settings.discountRate >= 0.07 && settings.discountRate <= 0.15) score += 1;
    if (settings.exitCapRate >= 0.06 && settings.exitCapRate <= 0.14) score += 1;
    if (settings.holdPeriod >= 5 && settings.holdPeriod <= 15) score += 1;

    // Penalize unrealistic scenarios
    if (input.currentNOI < 0) score -= 2;
    if (settings.revenueGrowthRate > 0.05) score -= 1;

    if (score >= 5) return 'high';
    if (score >= 3) return 'medium';
    return 'low';
  }

  /**
   * Perform sensitivity analysis
   */
  sensitivityAnalysis(
    baseRevenue: number,
    baseExpense: number,
    settings: DCFSettings,
    variable: 'discountRate' | 'exitCapRate' | 'noiGrowthRate',
    range: number[] // Array of values to test
  ): { value: number; result: number }[] {
    return range.map((testValue) => {
      const testSettings = { ...settings, [variable]: testValue };
      const result = this.calculateDCF(baseRevenue, baseExpense, testSettings);
      return { value: testValue, result: result.totalValue };
    });
  }

  /**
   * Get default settings
   */
  static getDefaultSettings(): DCFSettings {
    return { ...DEFAULT_DCF_SETTINGS };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const dcfCalculator = new DCFCalculator();
