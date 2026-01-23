/**
 * Exit Strategy Modeling
 * Analyzes various exit scenarios: Sale, Refinance, Hold
 */

export type ExitType = 'sale' | 'refinance' | 'hold';
export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface PropertyMetrics {
  currentNOI: number;
  currentEBITDAR: number;
  stabilizedNOI: number;
  stabilizedEBITDAR: number;
  noiGrowthRate: number;
  beds: number;
  assetType: AssetType;
}

export interface CurrentFinancing {
  originalLoanAmount: number;
  currentBalance: number;
  interestRate: number;
  remainingTerm: number;
  annualDebtService: number;
  prepaymentPenalty?: number; // As decimal (0.01 = 1%)
}

export interface EquityPosition {
  totalEquityInvested: number;
  cumulativeCashDistributions: number;
  currentEquityValue?: number;
}

export interface SaleAssumptions {
  exitCapRate: number;
  sellingCosts: number; // As decimal (0.02 = 2%)
  timeToClose: number; // Months
}

export interface RefinanceAssumptions {
  newLTV: number;
  newInterestRate: number;
  newAmortization: number;
  newLoanTerm: number;
  refinanceCosts: number; // As decimal
  cashOutAmount?: number; // Desired cash out (if any)
}

export interface HoldAssumptions {
  additionalHoldYears: number;
  capexRequirements: number[];
  projectedNOI: number[];
}

export interface ExitAnalysisInput {
  property: PropertyMetrics;
  currentFinancing: CurrentFinancing;
  equity: EquityPosition;
  exitYear: number;
  saleAssumptions?: SaleAssumptions;
  refinanceAssumptions?: RefinanceAssumptions;
  holdAssumptions?: HoldAssumptions;
}

export interface SaleExitResult {
  exitType: 'sale';

  // Valuation
  grossSalePrice: number;
  pricePerBed: number;
  impliedCapRate: number;

  // Costs
  sellingCosts: number;
  prepaymentPenalty: number;
  loanPayoff: number;

  // Net proceeds
  netSaleProceeds: number;
  equityProceeds: number;

  // Returns
  totalCashReturned: number;
  equityMultiple: number;
  irr: number;

  // Comparison metrics
  holdVsSellDelta?: number;
}

export interface RefinanceExitResult {
  exitType: 'refinance';

  // New loan
  newLoanAmount: number;
  newMonthlyPayment: number;
  newAnnualDebtService: number;

  // Cash event
  proceedsFromRefi: number;
  refinanceCosts: number;
  cashOutToEquity: number;

  // Coverage
  newDSCR: number;
  dscrPassFail: boolean;

  // Post-refi metrics
  newLTV: number;
  remainingEquity: number;
  monthlyPaymentChange: number;
  annualCashFlowChange: number;

  // Forward projections
  forwardIRR: number;
}

export interface HoldExitResult {
  exitType: 'hold';

  // Holding period analysis
  additionalYears: number;
  projectedCashFlows: number[];
  totalAdditionalCashFlow: number;

  // Future exit
  projectedExitNOI: number;
  projectedExitValue: number;
  projectedNetProceeds: number;

  // Total returns
  totalEquityReturned: number;
  equityMultiple: number;
  irr: number;

  // Risk metrics
  breakEvenOccupancy: number;
  noiDeclineTolerance: number;
}

export interface ExitComparisonResult {
  recommendedExit: ExitType;
  saleAnalysis?: SaleExitResult;
  refinanceAnalysis?: RefinanceExitResult;
  holdAnalysis?: HoldExitResult;

  // Comparison summary
  comparison: {
    scenario: ExitType;
    equityMultiple: number;
    irr: number;
    totalCashReturned: number;
    riskLevel: 'low' | 'medium' | 'high';
    recommendation: string;
  }[];

  // Key decision factors
  keyFactors: string[];
}

// Default cap rates by asset type
export const DEFAULT_EXIT_CAP_RATES: Record<AssetType, number> = {
  SNF: 0.125, // 12.5%
  ALF: 0.090, // 9.0%
  ILF: 0.085, // 8.5%
};

// Default selling costs
export const DEFAULT_SELLING_COSTS = 0.02; // 2%

export class ExitStrategyAnalyzer {
  /**
   * Calculate property value using cap rate
   */
  calculatePropertyValue(noi: number, capRate: number): number {
    if (capRate <= 0) return 0;
    return noi / capRate;
  }

  /**
   * Calculate IRR given cash flows
   */
  calculateIRR(cashFlows: number[], guess: number = 0.15): number {
    const maxIterations = 1000;
    const tolerance = 0.0000001;
    let rate = guess;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivativeNpv = 0;

      for (let j = 0; j < cashFlows.length; j++) {
        npv += cashFlows[j] / Math.pow(1 + rate, j);
        if (j > 0) {
          derivativeNpv -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
        }
      }

      if (Math.abs(npv) < tolerance) return rate;

      if (derivativeNpv === 0) {
        rate += 0.01;
      } else {
        rate = Math.max(-0.99, Math.min(10, rate - npv / derivativeNpv));
      }
    }

    return rate;
  }

  /**
   * Analyze sale exit scenario
   */
  analyzeSaleExit(
    input: ExitAnalysisInput,
    assumptions: SaleAssumptions
  ): SaleExitResult {
    const { property, currentFinancing, equity, exitYear } = input;

    // Project NOI to exit year
    const exitNOI = property.stabilizedNOI * Math.pow(1 + property.noiGrowthRate, exitYear);

    // Calculate gross sale price
    const grossSalePrice = this.calculatePropertyValue(exitNOI, assumptions.exitCapRate);
    const pricePerBed = grossSalePrice / property.beds;

    // Calculate costs
    const sellingCosts = grossSalePrice * assumptions.sellingCosts;
    const prepaymentPenalty = currentFinancing.currentBalance * (currentFinancing.prepaymentPenalty ?? 0);
    const loanPayoff = currentFinancing.currentBalance;

    // Net proceeds
    const netSaleProceeds = grossSalePrice - sellingCosts - prepaymentPenalty - loanPayoff;

    // Build cash flow array for IRR
    const cashFlows: number[] = [-equity.totalEquityInvested];

    // Add annual cash flows (simplified - assume level NOI minus debt service)
    for (let year = 1; year < exitYear; year++) {
      const yearNOI = property.currentNOI * Math.pow(1 + property.noiGrowthRate, year);
      const cashFlow = yearNOI - currentFinancing.annualDebtService;
      cashFlows.push(cashFlow);
    }

    // Add exit year cash flow (includes sale proceeds)
    const exitYearNOI = property.currentNOI * Math.pow(1 + property.noiGrowthRate, exitYear);
    const exitYearOperatingCF = exitYearNOI - currentFinancing.annualDebtService;
    cashFlows.push(exitYearOperatingCF + netSaleProceeds);

    // Calculate returns
    const totalCashReturned = cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);
    const equityMultiple = (equity.cumulativeCashDistributions + netSaleProceeds) / equity.totalEquityInvested;
    const irr = this.calculateIRR(cashFlows);

    return {
      exitType: 'sale',
      grossSalePrice,
      pricePerBed,
      impliedCapRate: assumptions.exitCapRate,
      sellingCosts,
      prepaymentPenalty,
      loanPayoff,
      netSaleProceeds,
      equityProceeds: netSaleProceeds,
      totalCashReturned,
      equityMultiple,
      irr,
    };
  }

  /**
   * Analyze refinance scenario
   */
  analyzeRefinance(
    input: ExitAnalysisInput,
    assumptions: RefinanceAssumptions
  ): RefinanceExitResult {
    const { property, currentFinancing, equity, exitYear } = input;

    // Project NOI to refinance year
    const refiNOI = property.stabilizedNOI * Math.pow(1 + property.noiGrowthRate, exitYear);

    // Calculate property value and new loan amount
    const propertyValue = this.calculatePropertyValue(refiNOI, DEFAULT_EXIT_CAP_RATES[property.assetType]);
    const maxNewLoan = propertyValue * assumptions.newLTV;
    const newLoanAmount = Math.min(maxNewLoan, assumptions.cashOutAmount
      ? currentFinancing.currentBalance + assumptions.cashOutAmount + (maxNewLoan * assumptions.refinanceCosts)
      : maxNewLoan
    );

    // Calculate new debt service
    const monthlyRate = assumptions.newInterestRate / 12;
    const numPayments = assumptions.newAmortization * 12;
    const newMonthlyPayment = newLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                              (Math.pow(1 + monthlyRate, numPayments) - 1);
    const newAnnualDebtService = newMonthlyPayment * 12;

    // Refinance proceeds
    const refinanceCosts = newLoanAmount * assumptions.refinanceCosts;
    const proceedsFromRefi = newLoanAmount - currentFinancing.currentBalance - refinanceCosts;
    const cashOutToEquity = Math.max(0, proceedsFromRefi);

    // Coverage analysis
    const newDSCR = refiNOI / newAnnualDebtService;
    const dscrPassFail = newDSCR >= 1.25;

    // Post-refi metrics
    const newLTV = newLoanAmount / propertyValue;
    const remainingEquity = propertyValue - newLoanAmount;
    const monthlyPaymentChange = newMonthlyPayment - (currentFinancing.annualDebtService / 12);
    const annualCashFlowChange = currentFinancing.annualDebtService - newAnnualDebtService;

    // Forward IRR (from refi point forward, assuming 5 more years then sale)
    const forwardCashFlows: number[] = [cashOutToEquity > 0 ? -remainingEquity : -equity.totalEquityInvested];
    for (let year = 1; year <= 5; year++) {
      const yearNOI = refiNOI * Math.pow(1 + property.noiGrowthRate, year);
      forwardCashFlows.push(yearNOI - newAnnualDebtService);
    }
    // Exit in year 5 post-refi
    const forwardExitNOI = refiNOI * Math.pow(1 + property.noiGrowthRate, 5);
    const forwardExitValue = this.calculatePropertyValue(forwardExitNOI, DEFAULT_EXIT_CAP_RATES[property.assetType]);
    const forwardLoanBalance = newLoanAmount * 0.85; // Approximate 5-year paydown
    const forwardNetProceeds = forwardExitValue * 0.98 - forwardLoanBalance;
    forwardCashFlows[5] += forwardNetProceeds;

    const forwardIRR = this.calculateIRR(forwardCashFlows);

    return {
      exitType: 'refinance',
      newLoanAmount,
      newMonthlyPayment,
      newAnnualDebtService,
      proceedsFromRefi,
      refinanceCosts,
      cashOutToEquity,
      newDSCR,
      dscrPassFail,
      newLTV,
      remainingEquity,
      monthlyPaymentChange,
      annualCashFlowChange,
      forwardIRR,
    };
  }

  /**
   * Analyze hold scenario
   */
  analyzeHold(
    input: ExitAnalysisInput,
    assumptions: HoldAssumptions,
    eventualSaleCapRate: number
  ): HoldExitResult {
    const { property, currentFinancing, equity, exitYear } = input;

    const totalHoldYears = exitYear + assumptions.additionalHoldYears;

    // Project cash flows for additional hold period
    const projectedCashFlows: number[] = [];
    let totalAdditionalCashFlow = 0;

    for (let year = 0; year < assumptions.additionalHoldYears; year++) {
      const yearNOI = assumptions.projectedNOI[year] ??
        property.stabilizedNOI * Math.pow(1 + property.noiGrowthRate, exitYear + year);
      const capex = assumptions.capexRequirements[year] ?? 0;
      const cashFlow = yearNOI - currentFinancing.annualDebtService - capex;
      projectedCashFlows.push(cashFlow);
      totalAdditionalCashFlow += cashFlow;
    }

    // Project exit value
    const projectedExitNOI = property.stabilizedNOI * Math.pow(1 + property.noiGrowthRate, totalHoldYears);
    const projectedExitValue = this.calculatePropertyValue(projectedExitNOI, eventualSaleCapRate);

    // Estimate remaining loan balance (simplified)
    const yearsOfPayments = totalHoldYears;
    const principalPaidRatio = 0.15 + (yearsOfPayments * 0.025); // Rough approximation
    const estimatedLoanBalance = currentFinancing.currentBalance * (1 - Math.min(0.5, principalPaidRatio));

    const projectedNetProceeds = projectedExitValue * 0.98 - estimatedLoanBalance;

    // Build full cash flow series for IRR
    const fullCashFlows: number[] = [-equity.totalEquityInvested];

    // Operating years
    for (let year = 1; year <= exitYear; year++) {
      const yearNOI = property.currentNOI * Math.pow(1 + property.noiGrowthRate, year);
      fullCashFlows.push(yearNOI - currentFinancing.annualDebtService);
    }

    // Additional hold years
    for (let i = 0; i < projectedCashFlows.length; i++) {
      fullCashFlows.push(projectedCashFlows[i]);
    }

    // Add exit proceeds to final year
    fullCashFlows[fullCashFlows.length - 1] += projectedNetProceeds;

    // Calculate returns
    const totalEquityReturned = fullCashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);
    const equityMultiple = totalEquityReturned / equity.totalEquityInvested;
    const irr = this.calculateIRR(fullCashFlows);

    // Risk metrics
    const currentOccupancy = 0.85; // Assumed
    const breakEvenNOI = currentFinancing.annualDebtService;
    const breakEvenOccupancy = (breakEvenNOI / property.stabilizedNOI) * currentOccupancy;
    const noiDeclineTolerance = 1 - (breakEvenNOI / property.stabilizedNOI);

    return {
      exitType: 'hold',
      additionalYears: assumptions.additionalHoldYears,
      projectedCashFlows,
      totalAdditionalCashFlow,
      projectedExitNOI,
      projectedExitValue,
      projectedNetProceeds,
      totalEquityReturned,
      equityMultiple,
      irr,
      breakEvenOccupancy,
      noiDeclineTolerance,
    };
  }

  /**
   * Compare all exit strategies
   */
  compareExitStrategies(input: ExitAnalysisInput): ExitComparisonResult {
    const { property } = input;
    const defaultCapRate = DEFAULT_EXIT_CAP_RATES[property.assetType];

    // Analyze sale
    const saleAssumptions: SaleAssumptions = input.saleAssumptions ?? {
      exitCapRate: defaultCapRate,
      sellingCosts: DEFAULT_SELLING_COSTS,
      timeToClose: 3,
    };
    const saleAnalysis = this.analyzeSaleExit(input, saleAssumptions);

    // Analyze refinance
    const refinanceAssumptions: RefinanceAssumptions = input.refinanceAssumptions ?? {
      newLTV: 0.70,
      newInterestRate: 0.07,
      newAmortization: 25,
      newLoanTerm: 10,
      refinanceCosts: 0.01,
    };
    const refinanceAnalysis = this.analyzeRefinance(input, refinanceAssumptions);

    // Analyze hold
    const holdAssumptions: HoldAssumptions = input.holdAssumptions ?? {
      additionalHoldYears: 5,
      capexRequirements: Array(5).fill(property.beds * 1500),
      projectedNOI: [],
    };
    const holdAnalysis = this.analyzeHold(input, holdAssumptions, defaultCapRate);

    // Build comparison
    const comparison = [
      {
        scenario: 'sale' as ExitType,
        equityMultiple: saleAnalysis.equityMultiple,
        irr: saleAnalysis.irr,
        totalCashReturned: saleAnalysis.totalCashReturned,
        riskLevel: 'low' as const,
        recommendation: saleAnalysis.irr >= 0.15 ? 'Attractive exit' : 'Below target returns',
      },
      {
        scenario: 'refinance' as ExitType,
        equityMultiple: refinanceAnalysis.cashOutToEquity / input.equity.totalEquityInvested + 1,
        irr: refinanceAnalysis.forwardIRR,
        totalCashReturned: refinanceAnalysis.cashOutToEquity,
        riskLevel: refinanceAnalysis.dscrPassFail ? 'medium' as const : 'high' as const,
        recommendation: refinanceAnalysis.dscrPassFail
          ? 'Viable refi with cash out'
          : 'DSCR too tight for refinance',
      },
      {
        scenario: 'hold' as ExitType,
        equityMultiple: holdAnalysis.equityMultiple,
        irr: holdAnalysis.irr,
        totalCashReturned: holdAnalysis.totalEquityReturned,
        riskLevel: holdAnalysis.noiDeclineTolerance > 0.2 ? 'medium' as const : 'high' as const,
        recommendation: holdAnalysis.irr > saleAnalysis.irr
          ? 'Hold for better returns'
          : 'Consider sale over continued hold',
      },
    ];

    // Determine recommendation
    const sortedByIRR = [...comparison].sort((a, b) => b.irr - a.irr);
    let recommendedExit: ExitType = sortedByIRR[0].scenario;

    // Factor in risk
    if (sortedByIRR[0].riskLevel === 'high' && sortedByIRR[1].riskLevel !== 'high') {
      if (sortedByIRR[1].irr >= sortedByIRR[0].irr * 0.85) {
        recommendedExit = sortedByIRR[1].scenario;
      }
    }

    // Key decision factors
    const keyFactors: string[] = [];

    if (saleAnalysis.irr >= 0.15) {
      keyFactors.push('Sale IRR exceeds 15% target');
    }
    if (refinanceAnalysis.cashOutToEquity > input.equity.totalEquityInvested * 0.5) {
      keyFactors.push('Refinance allows significant cash out while maintaining ownership');
    }
    if (holdAnalysis.irr > saleAnalysis.irr) {
      keyFactors.push('Continued hold projects higher returns than immediate sale');
    }
    if (holdAnalysis.noiDeclineTolerance < 0.15) {
      keyFactors.push('Limited NOI decline tolerance - elevated risk in hold scenario');
    }
    if (!refinanceAnalysis.dscrPassFail) {
      keyFactors.push('Refinance constrained by DSCR requirements');
    }

    return {
      recommendedExit,
      saleAnalysis,
      refinanceAnalysis,
      holdAnalysis,
      comparison,
      keyFactors,
    };
  }
}

// Export singleton instance
export const exitStrategyAnalyzer = new ExitStrategyAnalyzer();
