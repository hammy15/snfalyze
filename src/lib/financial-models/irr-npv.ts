/**
 * IRR/NPV Calculator
 * Investment return analysis for healthcare real estate transactions
 */

export interface CashFlowItem {
  year: number;
  operatingCashFlow: number; // NOI or EBITDAR minus debt service
  capitalExpenditures?: number;
  acquisitionCost?: number; // Year 0 typically
  dispositionProceeds?: number; // Exit year
  debtPaydown?: number;
  netCashFlow?: number; // Computed
}

export interface IRRNPVInput {
  cashFlows: CashFlowItem[];
  initialInvestment: number; // Total equity invested
  discountRate?: number; // For NPV calculation
  exitCapRate?: number; // For terminal value
  exitYear?: number;
  noi?: number; // For terminal value calculation
  noGrowthRate?: number; // Annual NOI growth
}

export interface IRRNPVResult {
  // Core metrics
  irr: number;
  npv: number;
  discountRate: number;

  // Additional return metrics
  equityMultiple: number;
  cashOnCash: number[]; // By year
  averageCashOnCash: number;
  paybackPeriod: number; // Years to recover investment

  // Exit analysis
  exitValue?: number;
  exitYear?: number;
  totalDistributions: number;
  totalCashReturned: number;

  // Profitability index
  profitabilityIndex: number;

  // Cash flows with computed net
  cashFlows: CashFlowItem[];
}

export interface SensitivityPoint {
  variable: string;
  value: number;
  irr: number;
  npv: number;
  equityMultiple: number;
}

export class IRRNPVCalculator {
  /**
   * Calculate Net Present Value
   */
  calculateNPV(cashFlows: number[], discountRate: number): number {
    return cashFlows.reduce((npv, cf, i) => {
      return npv + cf / Math.pow(1 + discountRate, i);
    }, 0);
  }

  /**
   * Calculate Internal Rate of Return using Newton-Raphson method
   */
  calculateIRR(cashFlows: number[], guess: number = 0.10): number {
    const maxIterations = 1000;
    const tolerance = 0.0000001;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      // Calculate NPV at current rate
      let npv = 0;
      let derivativeNpv = 0;

      for (let j = 0; j < cashFlows.length; j++) {
        const discountFactor = Math.pow(1 + rate, j);
        npv += cashFlows[j] / discountFactor;
        if (j > 0) {
          derivativeNpv -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
        }
      }

      // Check for convergence
      if (Math.abs(npv) < tolerance) {
        return rate;
      }

      // Newton-Raphson iteration
      if (derivativeNpv === 0) {
        rate += 0.01; // Nudge if derivative is zero
      } else {
        const newRate = rate - npv / derivativeNpv;
        // Bound the rate to reasonable values
        rate = Math.max(-0.99, Math.min(10, newRate));
      }
    }

    // If Newton-Raphson doesn't converge, try bisection method
    return this.calculateIRRBisection(cashFlows);
  }

  /**
   * Calculate IRR using bisection method (more robust but slower)
   */
  calculateIRRBisection(cashFlows: number[]): number {
    let low = -0.99;
    let high = 10;
    const tolerance = 0.0000001;
    const maxIterations = 1000;

    for (let i = 0; i < maxIterations; i++) {
      const mid = (low + high) / 2;
      const npv = this.calculateNPV(cashFlows, mid);

      if (Math.abs(npv) < tolerance) {
        return mid;
      }

      if (npv > 0) {
        low = mid;
      } else {
        high = mid;
      }

      if (high - low < tolerance) {
        return mid;
      }
    }

    return (low + high) / 2;
  }

  /**
   * Calculate Modified IRR (MIRR)
   * Assumes reinvestment at a different rate than financing cost
   */
  calculateMIRR(
    cashFlows: number[],
    financeRate: number,
    reinvestRate: number
  ): number {
    const n = cashFlows.length - 1;
    if (n <= 0) return 0;

    // PV of negative cash flows at finance rate
    let pvNegative = 0;
    // FV of positive cash flows at reinvest rate
    let fvPositive = 0;

    for (let i = 0; i < cashFlows.length; i++) {
      if (cashFlows[i] < 0) {
        pvNegative += cashFlows[i] / Math.pow(1 + financeRate, i);
      } else {
        fvPositive += cashFlows[i] * Math.pow(1 + reinvestRate, n - i);
      }
    }

    if (pvNegative >= 0) return 0;

    return Math.pow(fvPositive / (-pvNegative), 1 / n) - 1;
  }

  /**
   * Calculate payback period
   */
  calculatePaybackPeriod(cashFlows: number[]): number {
    let cumulativeCashFlow = 0;

    for (let i = 0; i < cashFlows.length; i++) {
      cumulativeCashFlow += cashFlows[i];

      if (cumulativeCashFlow >= 0 && i > 0) {
        // Linear interpolation for exact payback period
        const previousCumulative = cumulativeCashFlow - cashFlows[i];
        const fractionOfYear = (-previousCumulative) / cashFlows[i];
        return (i - 1) + fractionOfYear;
      }
    }

    return cashFlows.length; // Didn't pay back within period
  }

  /**
   * Calculate terminal value using exit cap rate
   */
  calculateTerminalValue(
    noi: number,
    exitCapRate: number,
    sellingCosts: number = 0.02 // 2% default selling costs
  ): number {
    const grossValue = noi / exitCapRate;
    return grossValue * (1 - sellingCosts);
  }

  /**
   * Run full IRR/NPV analysis
   */
  runFullAnalysis(input: IRRNPVInput): IRRNPVResult {
    const discountRate = input.discountRate ?? 0.10;

    // Process cash flows and compute net cash flow for each period
    const processedCashFlows = input.cashFlows.map(cf => ({
      ...cf,
      netCashFlow: cf.netCashFlow ??
        (cf.operatingCashFlow ?? 0) -
        (cf.capitalExpenditures ?? 0) -
        (cf.acquisitionCost ?? 0) +
        (cf.dispositionProceeds ?? 0),
    }));

    // If exit info provided, add terminal value to last year
    if (input.exitCapRate && input.noi && input.exitYear) {
      const exitYearCF = processedCashFlows.find(cf => cf.year === input.exitYear);
      if (exitYearCF) {
        // Project NOI to exit year
        const projectedNOI = input.noi * Math.pow(1 + (input.noGrowthRate ?? 0.02), input.exitYear);
        const terminalValue = this.calculateTerminalValue(projectedNOI, input.exitCapRate);
        exitYearCF.dispositionProceeds = terminalValue;
        exitYearCF.netCashFlow = (exitYearCF.netCashFlow ?? 0) + terminalValue;
      }
    }

    // Extract cash flow array for calculations
    const cashFlowArray = processedCashFlows.map(cf => cf.netCashFlow ?? 0);

    // Prepend initial investment as negative cash flow if not in year 0
    const year0 = processedCashFlows.find(cf => cf.year === 0);
    if (!year0) {
      cashFlowArray.unshift(-input.initialInvestment);
    }

    // Calculate core metrics
    const irr = this.calculateIRR(cashFlowArray);
    const npv = this.calculateNPV(cashFlowArray, discountRate);
    const paybackPeriod = this.calculatePaybackPeriod(cashFlowArray);

    // Calculate total distributions and equity multiple
    const totalDistributions = processedCashFlows
      .filter(cf => cf.year > 0)
      .reduce((sum, cf) => sum + (cf.netCashFlow ?? 0), 0);

    const totalCashReturned = totalDistributions + (input.initialInvestment * -1) + input.initialInvestment;
    const equityMultiple = input.initialInvestment > 0
      ? (totalDistributions + input.initialInvestment) / input.initialInvestment
      : 0;

    // Calculate cash-on-cash returns by year
    const cashOnCash = processedCashFlows
      .filter(cf => cf.year > 0)
      .map(cf => input.initialInvestment > 0
        ? (cf.operatingCashFlow ?? 0) / input.initialInvestment
        : 0
      );

    const averageCashOnCash = cashOnCash.length > 0
      ? cashOnCash.reduce((sum, c) => sum + c, 0) / cashOnCash.length
      : 0;

    // Profitability index
    const profitabilityIndex = input.initialInvestment > 0
      ? (npv + input.initialInvestment) / input.initialInvestment
      : 0;

    // Exit analysis
    const exitCF = processedCashFlows.find(cf => cf.dispositionProceeds && cf.dispositionProceeds > 0);

    return {
      irr,
      npv,
      discountRate,
      equityMultiple,
      cashOnCash,
      averageCashOnCash,
      paybackPeriod,
      exitValue: exitCF?.dispositionProceeds,
      exitYear: exitCF?.year,
      totalDistributions,
      totalCashReturned,
      profitabilityIndex,
      cashFlows: processedCashFlows,
    };
  }

  /**
   * Run sensitivity analysis on key variables
   */
  runSensitivityAnalysis(
    baseInput: IRRNPVInput,
    variables: {
      exitCapRates?: number[];
      discountRates?: number[];
      noiGrowthRates?: number[];
    }
  ): SensitivityPoint[] {
    const results: SensitivityPoint[] = [];

    // Exit cap rate sensitivity
    if (variables.exitCapRates) {
      for (const exitCapRate of variables.exitCapRates) {
        const result = this.runFullAnalysis({ ...baseInput, exitCapRate });
        results.push({
          variable: 'exitCapRate',
          value: exitCapRate,
          irr: result.irr,
          npv: result.npv,
          equityMultiple: result.equityMultiple,
        });
      }
    }

    // Discount rate sensitivity
    if (variables.discountRates) {
      for (const discountRate of variables.discountRates) {
        const result = this.runFullAnalysis({ ...baseInput, discountRate });
        results.push({
          variable: 'discountRate',
          value: discountRate,
          irr: result.irr,
          npv: result.npv,
          equityMultiple: result.equityMultiple,
        });
      }
    }

    // NOI growth rate sensitivity
    if (variables.noiGrowthRates) {
      for (const noGrowthRate of variables.noiGrowthRates) {
        const result = this.runFullAnalysis({ ...baseInput, noGrowthRate });
        results.push({
          variable: 'noiGrowthRate',
          value: noGrowthRate,
          irr: result.irr,
          npv: result.npv,
          equityMultiple: result.equityMultiple,
        });
      }
    }

    return results;
  }

  /**
   * Calculate required exit cap rate to achieve target IRR
   */
  calculateRequiredExitCapForTargetIRR(
    baseInput: IRRNPVInput,
    targetIRR: number
  ): number {
    let low = 0.04;
    let high = 0.20;
    const tolerance = 0.0001;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      const mid = (low + high) / 2;
      const result = this.runFullAnalysis({ ...baseInput, exitCapRate: mid });

      if (Math.abs(result.irr - targetIRR) < tolerance) {
        return mid;
      }

      if (result.irr > targetIRR) {
        low = mid; // Need higher cap rate (lower exit value) to reduce IRR
      } else {
        high = mid;
      }
    }

    return (low + high) / 2;
  }
}

// Export singleton instance
export const irrNpvCalculator = new IRRNPVCalculator();
