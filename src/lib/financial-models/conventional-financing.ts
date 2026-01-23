/**
 * Conventional Financing Calculator
 * Models traditional bank/lender financing for SNF/ALF acquisitions
 */

export type LoanType = 'fixed' | 'variable';
export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface ConventionalFinancingInput {
  // Property details
  purchasePrice: number;
  propertyNOI: number;
  facilityEbitdar: number;
  assetType: AssetType;
  beds: number;

  // Loan terms
  loanType: LoanType;
  ltv: number; // Loan-to-value ratio (0.65-0.75 typical)
  interestRate: number; // Annual interest rate
  amortizationYears: number; // Typically 25 years
  loanTermYears: number; // Typically 5-10 years (balloon)

  // Variable rate specifics (if applicable)
  indexRate?: number; // e.g., SOFR
  spread?: number; // Spread over index
  rateCap?: number; // Interest rate cap
  rateFloor?: number; // Interest rate floor

  // Additional costs
  originationFee?: number; // As decimal (0.01 = 1%)
  closingCosts?: number; // Flat amount

  // Equity details
  equityRequired?: number; // If different from (1 - LTV)
}

export interface LoanScheduleRow {
  year: number;
  beginningBalance: number;
  annualPayment: number;
  principalPayment: number;
  interestPayment: number;
  endingBalance: number;
  interestRate: number; // For variable rate tracking
}

export interface ConventionalFinancingResult {
  // Loan summary
  loanAmount: number;
  equityRequired: number;
  totalCapitalization: number;

  // Payment details
  monthlyPayment: number;
  annualDebtService: number;

  // Coverage metrics
  dscr: number; // Debt Service Coverage Ratio (NOI / Annual Debt Service)
  dscrEbitdar: number; // Using EBITDAR
  dscrPassFail: boolean;
  minimumDscr: number;

  // Returns
  cashOnCash: number; // Year 1 (NOI - Debt Service) / Equity
  equityMultiple: number; // Over hold period

  // Loan schedule
  loanSchedule: LoanScheduleRow[];

  // Balloon payment
  balloonPayment: number;
  balloonYear: number;

  // Costs
  totalOriginationCosts: number;
  allInCost: number; // Effective interest rate including fees

  // Per unit metrics
  loanPerBed: number;
  equityPerBed: number;
}

// Default LTV ranges by asset type
export const DEFAULT_LTV_RANGES: Record<AssetType, { min: number; max: number; typical: number }> = {
  SNF: { min: 0.60, max: 0.75, typical: 0.70 },
  ALF: { min: 0.65, max: 0.75, typical: 0.70 },
  ILF: { min: 0.65, max: 0.80, typical: 0.72 },
};

// Default interest rates by asset type
export const DEFAULT_INTEREST_RATES: Record<AssetType, { fixed: number; variable: { spread: number } }> = {
  SNF: { fixed: 0.075, variable: { spread: 0.035 } }, // 7.5% fixed, SOFR + 350bps
  ALF: { fixed: 0.070, variable: { spread: 0.030 } }, // 7.0% fixed, SOFR + 300bps
  ILF: { fixed: 0.065, variable: { spread: 0.028 } }, // 6.5% fixed, SOFR + 280bps
};

// Minimum DSCR requirements
export const MINIMUM_DSCR: Record<AssetType, number> = {
  SNF: 1.25,
  ALF: 1.20,
  ILF: 1.20,
};

export class ConventionalFinancingCalculator {
  /**
   * Calculate monthly payment using standard amortization formula
   */
  calculateMonthlyPayment(principal: number, annualRate: number, amortizationYears: number): number {
    const monthlyRate = annualRate / 12;
    const numPayments = amortizationYears * 12;

    if (monthlyRate === 0) {
      return principal / numPayments;
    }

    return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
           (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  /**
   * Generate full loan amortization schedule
   */
  generateLoanSchedule(
    principal: number,
    annualRate: number,
    amortizationYears: number,
    loanTermYears: number,
    loanType: LoanType,
    variableRateParams?: { indexRate: number; spread: number; rateCap?: number; rateFloor?: number }
  ): LoanScheduleRow[] {
    const schedule: LoanScheduleRow[] = [];
    let balance = principal;

    for (let year = 1; year <= loanTermYears; year++) {
      // Calculate effective rate for this year
      let effectiveRate = annualRate;
      if (loanType === 'variable' && variableRateParams) {
        // Simulate rate changes for variable loans (simplified model)
        const projectedIndex = variableRateParams.indexRate + (year - 1) * 0.0025; // Assume slight increases
        effectiveRate = projectedIndex + variableRateParams.spread;

        if (variableRateParams.rateCap) {
          effectiveRate = Math.min(effectiveRate, variableRateParams.rateCap);
        }
        if (variableRateParams.rateFloor) {
          effectiveRate = Math.max(effectiveRate, variableRateParams.rateFloor);
        }
      }

      const monthlyPayment = this.calculateMonthlyPayment(principal, effectiveRate, amortizationYears);
      const annualPayment = monthlyPayment * 12;

      // Calculate interest and principal for the year
      let yearInterest = 0;
      let yearPrincipal = 0;
      let tempBalance = balance;

      for (let month = 0; month < 12; month++) {
        const monthInterest = tempBalance * (effectiveRate / 12);
        const monthPrincipal = monthlyPayment - monthInterest;
        yearInterest += monthInterest;
        yearPrincipal += monthPrincipal;
        tempBalance -= monthPrincipal;
      }

      schedule.push({
        year,
        beginningBalance: balance,
        annualPayment,
        principalPayment: yearPrincipal,
        interestPayment: yearInterest,
        endingBalance: balance - yearPrincipal,
        interestRate: effectiveRate,
      });

      balance -= yearPrincipal;
    }

    return schedule;
  }

  /**
   * Calculate DSCR (Debt Service Coverage Ratio)
   */
  calculateDSCR(noi: number, annualDebtService: number): number {
    if (annualDebtService <= 0) return 0;
    return noi / annualDebtService;
  }

  /**
   * Calculate Cash-on-Cash Return
   */
  calculateCashOnCash(noi: number, annualDebtService: number, equity: number): number {
    if (equity <= 0) return 0;
    const cashFlow = noi - annualDebtService;
    return cashFlow / equity;
  }

  /**
   * Calculate all-in cost (effective interest rate including fees)
   */
  calculateAllInCost(
    loanAmount: number,
    annualRate: number,
    originationFee: number,
    closingCosts: number,
    loanTermYears: number
  ): number {
    const totalFees = loanAmount * originationFee + closingCosts;
    const effectiveProceeds = loanAmount - totalFees;
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, annualRate, 25);

    // Use Newton-Raphson to find effective rate
    let guess = annualRate + 0.01;
    for (let i = 0; i < 100; i++) {
      const payment = this.calculateMonthlyPayment(effectiveProceeds, guess, 25);
      const diff = payment - monthlyPayment;
      if (Math.abs(diff) < 0.01) break;
      guess += diff > 0 ? -0.0001 : 0.0001;
    }

    return guess;
  }

  /**
   * Run full conventional financing analysis
   */
  runFullAnalysis(input: ConventionalFinancingInput): ConventionalFinancingResult {
    // Calculate loan amount and equity
    const loanAmount = input.purchasePrice * input.ltv;
    const equityRequired = input.equityRequired ?? input.purchasePrice * (1 - input.ltv);
    const totalCapitalization = loanAmount + equityRequired;

    // Determine effective interest rate
    let effectiveRate = input.interestRate;
    if (input.loanType === 'variable' && input.indexRate && input.spread) {
      effectiveRate = input.indexRate + input.spread;
      if (input.rateCap) effectiveRate = Math.min(effectiveRate, input.rateCap);
      if (input.rateFloor) effectiveRate = Math.max(effectiveRate, input.rateFloor);
    }

    // Calculate payments
    const monthlyPayment = this.calculateMonthlyPayment(loanAmount, effectiveRate, input.amortizationYears);
    const annualDebtService = monthlyPayment * 12;

    // Generate loan schedule
    const loanSchedule = this.generateLoanSchedule(
      loanAmount,
      effectiveRate,
      input.amortizationYears,
      input.loanTermYears,
      input.loanType,
      input.loanType === 'variable' ? {
        indexRate: input.indexRate!,
        spread: input.spread!,
        rateCap: input.rateCap,
        rateFloor: input.rateFloor,
      } : undefined
    );

    // Calculate coverage ratios
    const dscr = this.calculateDSCR(input.propertyNOI, annualDebtService);
    const dscrEbitdar = this.calculateDSCR(input.facilityEbitdar, annualDebtService);
    const minimumDscr = MINIMUM_DSCR[input.assetType];

    // Calculate returns
    const cashOnCash = this.calculateCashOnCash(input.propertyNOI, annualDebtService, equityRequired);

    // Calculate balloon payment
    const balloonPayment = loanSchedule[loanSchedule.length - 1]?.endingBalance ?? 0;

    // Calculate costs
    const originationFee = input.originationFee ?? 0.01;
    const closingCosts = input.closingCosts ?? 0;
    const totalOriginationCosts = loanAmount * originationFee + closingCosts;

    const allInCost = this.calculateAllInCost(
      loanAmount,
      effectiveRate,
      originationFee,
      closingCosts,
      input.loanTermYears
    );

    // Calculate equity multiple (simplified - assumes 5 year hold with exit at same cap rate)
    const totalCashFlow = loanSchedule.reduce((sum, row) =>
      sum + (input.propertyNOI - row.annualPayment), 0);
    const exitProceeds = input.purchasePrice - balloonPayment; // Simplified
    const equityMultiple = (totalCashFlow + exitProceeds) / equityRequired;

    return {
      loanAmount,
      equityRequired,
      totalCapitalization,
      monthlyPayment,
      annualDebtService,
      dscr,
      dscrEbitdar,
      dscrPassFail: dscr >= minimumDscr,
      minimumDscr,
      cashOnCash,
      equityMultiple,
      loanSchedule,
      balloonPayment,
      balloonYear: input.loanTermYears,
      totalOriginationCosts,
      allInCost,
      loanPerBed: loanAmount / input.beds,
      equityPerBed: equityRequired / input.beds,
    };
  }

  /**
   * Analyze maximum loan amount based on DSCR constraint
   */
  calculateMaxLoanByDSCR(
    noi: number,
    interestRate: number,
    amortizationYears: number,
    targetDSCR: number
  ): number {
    const maxAnnualDebtService = noi / targetDSCR;
    const maxMonthlyPayment = maxAnnualDebtService / 12;

    // Reverse the payment formula to find principal
    const monthlyRate = interestRate / 12;
    const numPayments = amortizationYears * 12;

    if (monthlyRate === 0) {
      return maxMonthlyPayment * numPayments;
    }

    const maxLoan = maxMonthlyPayment * (Math.pow(1 + monthlyRate, numPayments) - 1) /
                    (monthlyRate * Math.pow(1 + monthlyRate, numPayments));

    return maxLoan;
  }

  /**
   * Compare fixed vs variable rate scenarios
   */
  compareFixedVsVariable(
    input: Omit<ConventionalFinancingInput, 'loanType' | 'interestRate'>,
    fixedRate: number,
    variableParams: { indexRate: number; spread: number; rateCap?: number; rateFloor?: number }
  ): { fixed: ConventionalFinancingResult; variable: ConventionalFinancingResult } {
    const fixedResult = this.runFullAnalysis({
      ...input,
      loanType: 'fixed',
      interestRate: fixedRate,
    });

    const variableResult = this.runFullAnalysis({
      ...input,
      loanType: 'variable',
      interestRate: variableParams.indexRate + variableParams.spread,
      indexRate: variableParams.indexRate,
      spread: variableParams.spread,
      rateCap: variableParams.rateCap,
      rateFloor: variableParams.rateFloor,
    });

    return { fixed: fixedResult, variable: variableResult };
  }
}

// Export singleton instance
export const conventionalFinancingCalculator = new ConventionalFinancingCalculator();
