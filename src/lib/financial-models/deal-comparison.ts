/**
 * Deal Structure Comparison Tool
 * Compares the same deal across different financing/acquisition structures
 */

import { conventionalFinancingCalculator, type ConventionalFinancingInput, type ConventionalFinancingResult } from './conventional-financing';
import { leaseBuyoutCalculator, type LeaseBuyoutInput, type LeaseBuyoutResult } from './lease-buyout';
import { saleLeasebackCalculator, type SaleLeasebackInput, type SaleLeasebackResult } from '../sale-leaseback/calculator';
import { irrNpvCalculator, type IRRNPVResult } from './irr-npv';
import { proFormaGenerator, type ProFormaResult } from './pro-forma';

export type DealStructure = 'purchase_cash' | 'conventional_financing' | 'sale_leaseback' | 'reit_leaseback' | 'lease_buyout';
export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface FacilityData {
  id: string;
  name: string;
  assetType: AssetType;
  beds: number;
  currentOccupancy: number;
  annualRevenue: number;
  annualExpenses: number;
  noi: number;
  ebitdar: number;
  currentRent?: number;
  state?: string;
}

export interface DealComparisonInput {
  // Facility data
  facilities: FacilityData[];

  // Purchase terms
  purchasePrice: number;
  closingCosts?: number;

  // Cash purchase assumptions
  cashPurchase?: {
    enabled: boolean;
  };

  // Conventional financing assumptions
  conventionalFinancing?: {
    enabled: boolean;
    ltv: number;
    interestRate: number;
    amortizationYears: number;
    loanTermYears: number;
    loanType: 'fixed' | 'variable';
  };

  // Sale-leaseback assumptions
  saleLeaseback?: {
    enabled: boolean;
    capRate: number;
    buyerYieldRequirement: number;
    leaseTermYears: number;
    rentEscalation: number;
    minimumCoverageRatio: number;
  };

  // REIT leaseback assumptions (similar to sale-leaseback but with REIT-specific terms)
  reitLeaseback?: {
    enabled: boolean;
    capRate: number;
    buyerYieldRequirement: number;
    leaseTermYears: number;
    rentEscalation: number;
    minimumCoverageRatio: number;
    masterLease?: boolean;
    reitName?: string;
  };

  // Lease buyout assumptions
  leaseBuyout?: {
    enabled: boolean;
    buyoutAmount: number;
    existingRent: number;
    remainingLeaseYears: number;
    existingEscalation: number;
  };

  // Analysis parameters
  holdPeriodYears: number;
  discountRate: number;
  exitCapRate?: number;
  noiGrowthRate?: number;
}

export interface StructureAnalysis {
  structure: DealStructure;
  structureName: string;

  // Capital requirements
  equityRequired: number;
  debtAmount: number;
  totalCapitalization: number;

  // Returns
  irr: number;
  equityMultiple: number;
  cashOnCash: number; // Year 1
  npv: number;

  // Coverage
  dscr: number;
  rentCoverage: number;
  coveragePassFail: boolean;

  // Cash flows
  year1CashFlow: number;
  avgAnnualCashFlow: number;
  totalCashFlow: number;

  // Exit
  exitValue: number;
  netExitProceeds: number;

  // Risk metrics
  breakEvenOccupancy: number;
  riskScore: number; // 1-10 scale

  // Detailed results
  detailedResults?: ConventionalFinancingResult | SaleLeasebackResult | LeaseBuyoutResult | null;
  proForma?: ProFormaResult;

  // Pros/Cons
  pros: string[];
  cons: string[];
}

export interface DealComparisonResult {
  // Deal summary
  dealName: string;
  totalFacilities: number;
  totalBeds: number;
  totalNOI: number;
  totalEBITDAR: number;
  purchasePrice: number;

  // Structure analyses
  structures: StructureAnalysis[];

  // Rankings
  rankings: {
    byIRR: DealStructure[];
    byEquityMultiple: DealStructure[];
    byCashOnCash: DealStructure[];
    byEquityRequired: DealStructure[];
    byRisk: DealStructure[];
  };

  // Recommendation
  recommendedStructure: DealStructure;
  recommendationRationale: string[];

  // Comparison matrix
  comparisonMatrix: {
    metric: string;
    [key: string]: string | number;
  }[];
}

export class DealComparisonAnalyzer {
  /**
   * Calculate IRR for a series of cash flows
   */
  private calculateIRR(cashFlows: number[]): number {
    return irrNpvCalculator.calculateIRR(cashFlows);
  }

  /**
   * Calculate NPV
   */
  private calculateNPV(cashFlows: number[], discountRate: number): number {
    return irrNpvCalculator.calculateNPV(cashFlows, discountRate);
  }

  /**
   * Analyze cash purchase structure
   */
  private analyzeCashPurchase(
    input: DealComparisonInput,
    totalNOI: number,
    totalEBITDAR: number
  ): StructureAnalysis {
    const { purchasePrice, closingCosts = 0, holdPeriodYears, discountRate, exitCapRate, noiGrowthRate = 0.02 } = input;

    const totalEquity = purchasePrice + closingCosts;

    // Build cash flows
    const cashFlows: number[] = [-totalEquity];
    for (let year = 1; year <= holdPeriodYears; year++) {
      const yearNOI = totalNOI * Math.pow(1 + noiGrowthRate, year);
      cashFlows.push(yearNOI);
    }

    // Exit value
    const exitNOI = totalNOI * Math.pow(1 + noiGrowthRate, holdPeriodYears);
    const effectiveExitCap = exitCapRate ?? 0.12;
    const exitValue = exitNOI / effectiveExitCap;
    const netExitProceeds = exitValue * 0.98; // 2% selling costs
    cashFlows[holdPeriodYears] += netExitProceeds;

    const irr = this.calculateIRR(cashFlows);
    const npv = this.calculateNPV(cashFlows, discountRate);
    const totalCashFlow = cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);
    const equityMultiple = totalCashFlow / totalEquity;
    const cashOnCash = (totalNOI * (1 + noiGrowthRate)) / totalEquity;

    return {
      structure: 'purchase_cash',
      structureName: 'All-Cash Purchase',
      equityRequired: totalEquity,
      debtAmount: 0,
      totalCapitalization: totalEquity,
      irr,
      equityMultiple,
      cashOnCash,
      npv,
      dscr: 0,
      rentCoverage: 0,
      coveragePassFail: true,
      year1CashFlow: totalNOI * (1 + noiGrowthRate),
      avgAnnualCashFlow: totalCashFlow / holdPeriodYears,
      totalCashFlow,
      exitValue,
      netExitProceeds,
      breakEvenOccupancy: 0,
      riskScore: 2, // Low risk - no debt
      pros: [
        'No debt service obligations',
        'Maximum operational flexibility',
        'No refinance/maturity risk',
        'Immediate full ownership',
      ],
      cons: [
        'Highest equity requirement',
        'Lower levered returns',
        'Capital intensive - limits portfolio growth',
        'No tax shield from interest',
      ],
    };
  }

  /**
   * Analyze conventional financing structure
   */
  private analyzeConventionalFinancing(
    input: DealComparisonInput,
    facilities: FacilityData[],
    totalNOI: number,
    totalEBITDAR: number
  ): StructureAnalysis | null {
    if (!input.conventionalFinancing?.enabled) return null;

    const { purchasePrice, holdPeriodYears, discountRate, exitCapRate, noiGrowthRate = 0.02 } = input;
    const { ltv, interestRate, amortizationYears, loanTermYears } = input.conventionalFinancing;

    // Run conventional financing analysis
    const convInput: ConventionalFinancingInput = {
      purchasePrice,
      propertyNOI: totalNOI,
      facilityEbitdar: totalEBITDAR,
      assetType: facilities[0]?.assetType ?? 'SNF',
      beds: facilities.reduce((sum, f) => sum + f.beds, 0),
      loanType: input.conventionalFinancing.loanType,
      ltv,
      interestRate,
      amortizationYears,
      loanTermYears,
    };

    const convResult = conventionalFinancingCalculator.runFullAnalysis(convInput);

    // Build cash flows
    const cashFlows: number[] = [-convResult.equityRequired];
    for (let year = 1; year <= holdPeriodYears; year++) {
      const yearNOI = totalNOI * Math.pow(1 + noiGrowthRate, year);
      cashFlows.push(yearNOI - convResult.annualDebtService);
    }

    // Exit
    const exitNOI = totalNOI * Math.pow(1 + noiGrowthRate, holdPeriodYears);
    const effectiveExitCap = exitCapRate ?? 0.12;
    const exitValue = exitNOI / effectiveExitCap;
    const loanBalance = convResult.loanSchedule[Math.min(holdPeriodYears - 1, convResult.loanSchedule.length - 1)]?.endingBalance ?? convResult.balloonPayment;
    const netExitProceeds = exitValue * 0.98 - loanBalance;
    cashFlows[holdPeriodYears] += netExitProceeds;

    const irr = this.calculateIRR(cashFlows);
    const npv = this.calculateNPV(cashFlows, discountRate);
    const totalCashFlow = cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);
    const equityMultiple = totalCashFlow / convResult.equityRequired;

    return {
      structure: 'conventional_financing',
      structureName: 'Conventional Bank Financing',
      equityRequired: convResult.equityRequired,
      debtAmount: convResult.loanAmount,
      totalCapitalization: convResult.totalCapitalization,
      irr,
      equityMultiple,
      cashOnCash: convResult.cashOnCash,
      npv,
      dscr: convResult.dscr,
      rentCoverage: 0,
      coveragePassFail: convResult.dscrPassFail,
      year1CashFlow: totalNOI * (1 + noiGrowthRate) - convResult.annualDebtService,
      avgAnnualCashFlow: totalCashFlow / holdPeriodYears,
      totalCashFlow,
      exitValue,
      netExitProceeds,
      breakEvenOccupancy: (convResult.annualDebtService / totalNOI) * (facilities[0]?.currentOccupancy ?? 0.85),
      riskScore: convResult.dscr >= 1.4 ? 4 : convResult.dscr >= 1.25 ? 6 : 8,
      detailedResults: convResult,
      pros: [
        'Lower equity requirement',
        'Leverage amplifies returns',
        'Tax-deductible interest',
        'Preserve capital for other opportunities',
      ],
      cons: [
        'Debt service obligations',
        'Refinance/maturity risk',
        'Personal guarantees may be required',
        `DSCR of ${convResult.dscr.toFixed(2)}x ${convResult.dscrPassFail ? 'passes' : 'fails'} requirements`,
      ],
    };
  }

  /**
   * Analyze sale-leaseback structure
   */
  private analyzeSaleLeaseback(
    input: DealComparisonInput,
    facilities: FacilityData[],
    totalNOI: number,
    totalEBITDAR: number,
    isReit: boolean = false
  ): StructureAnalysis | null {
    const config = isReit ? input.reitLeaseback : input.saleLeaseback;
    if (!config?.enabled) return null;

    const { holdPeriodYears, discountRate, noiGrowthRate = 0.02 } = input;
    const { capRate, buyerYieldRequirement, leaseTermYears, rentEscalation, minimumCoverageRatio } = config;

    // Calculate SLB economics
    const purchasePrice = totalNOI / capRate;
    const annualRent = purchasePrice * buyerYieldRequirement;
    const coverageRatio = totalEBITDAR / annualRent;
    const operatorCashFlow = totalEBITDAR - annualRent;

    // Build cash flows (operator perspective - no capital outlay, just rent payments)
    const cashFlows: number[] = [purchasePrice]; // Proceeds from sale
    for (let year = 1; year <= holdPeriodYears; year++) {
      const yearEBITDAR = totalEBITDAR * Math.pow(1 + noiGrowthRate, year);
      const yearRent = annualRent * Math.pow(1 + rentEscalation, year - 1);
      cashFlows.push(yearEBITDAR - yearRent);
    }

    // No equity in property at exit (leasehold)
    const totalCashFlow = cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);

    // For SLB, "equity" is the value unlocked, IRR is return on that capital
    const equityValue = purchasePrice;
    const irr = this.calculateIRR(cashFlows.map((cf, i) => i === 0 ? -cf : cf));
    const npv = this.calculateNPV(cashFlows.map((cf, i) => i === 0 ? -cf : cf), discountRate);

    const structureName = isReit
      ? `REIT Sale-Leaseback${(config as typeof input.reitLeaseback)?.reitName ? ` (${(config as typeof input.reitLeaseback)?.reitName})` : ''}`
      : 'Sale-Leaseback';

    return {
      structure: isReit ? 'reit_leaseback' : 'sale_leaseback',
      structureName,
      equityRequired: 0, // No equity required - you're selling
      debtAmount: 0,
      totalCapitalization: purchasePrice, // Proceeds received
      irr,
      equityMultiple: totalCashFlow / purchasePrice + 1,
      cashOnCash: operatorCashFlow / purchasePrice,
      npv,
      dscr: 0,
      rentCoverage: coverageRatio,
      coveragePassFail: coverageRatio >= minimumCoverageRatio,
      year1CashFlow: operatorCashFlow,
      avgAnnualCashFlow: totalCashFlow / holdPeriodYears,
      totalCashFlow,
      exitValue: 0, // No property ownership at exit
      netExitProceeds: 0,
      breakEvenOccupancy: (annualRent / totalEBITDAR) * (facilities[0]?.currentOccupancy ?? 0.85),
      riskScore: coverageRatio >= 1.5 ? 3 : coverageRatio >= 1.3 ? 5 : 7,
      pros: [
        'Immediate capital release',
        'No debt on balance sheet',
        'Monetize real estate value',
        'Maintain operational control',
        `Coverage ratio of ${coverageRatio.toFixed(2)}x ${coverageRatio >= minimumCoverageRatio ? 'passes' : 'fails'} requirements`,
      ],
      cons: [
        'Ongoing rent obligations',
        'Loss of real estate ownership/appreciation',
        'Lease escalations reduce future margins',
        'Less flexibility than ownership',
      ],
    };
  }

  /**
   * Analyze lease buyout structure
   */
  private analyzeLeaseBuyout(
    input: DealComparisonInput,
    facilities: FacilityData[],
    totalNOI: number,
    totalEBITDAR: number
  ): StructureAnalysis | null {
    if (!input.leaseBuyout?.enabled) return null;

    const { holdPeriodYears, discountRate, noiGrowthRate = 0.02 } = input;
    const { buyoutAmount, existingRent, remainingLeaseYears, existingEscalation } = input.leaseBuyout;

    // Calculate buyout amortization
    const amortizationYears = remainingLeaseYears;
    const buyoutInterestRate = 0.08;
    const annualBuyoutPayment = buyoutAmount * (buyoutInterestRate * Math.pow(1 + buyoutInterestRate, amortizationYears)) /
                                (Math.pow(1 + buyoutInterestRate, amortizationYears) - 1);

    const newTotalRent = existingRent + annualBuyoutPayment;
    const coverageRatio = totalEBITDAR / newTotalRent;
    const operatorCashFlow = totalEBITDAR - newTotalRent;

    // Build cash flows (cost to acquire leases, then ongoing rent savings after buyout period)
    const cashFlows: number[] = [-buyoutAmount];
    for (let year = 1; year <= holdPeriodYears; year++) {
      const yearEBITDAR = totalEBITDAR * Math.pow(1 + noiGrowthRate, year);
      let yearRent = existingRent * Math.pow(1 + existingEscalation, year - 1);

      // Add buyout amortization during amortization period
      if (year <= amortizationYears) {
        yearRent += annualBuyoutPayment;
      }

      cashFlows.push(yearEBITDAR - yearRent);
    }

    const totalCashFlow = cashFlows.slice(1).reduce((sum, cf) => sum + cf, 0);
    const irr = this.calculateIRR(cashFlows);
    const npv = this.calculateNPV(cashFlows, discountRate);

    return {
      structure: 'lease_buyout',
      structureName: 'Lease Buyout',
      equityRequired: buyoutAmount,
      debtAmount: 0,
      totalCapitalization: buyoutAmount,
      irr,
      equityMultiple: totalCashFlow / buyoutAmount,
      cashOnCash: operatorCashFlow / buyoutAmount,
      npv,
      dscr: 0,
      rentCoverage: coverageRatio,
      coveragePassFail: coverageRatio >= 1.4,
      year1CashFlow: operatorCashFlow,
      avgAnnualCashFlow: totalCashFlow / holdPeriodYears,
      totalCashFlow,
      exitValue: 0, // Still leasehold
      netExitProceeds: 0,
      breakEvenOccupancy: (newTotalRent / totalEBITDAR) * (facilities[0]?.currentOccupancy ?? 0.85),
      riskScore: coverageRatio >= 1.5 ? 4 : coverageRatio >= 1.3 ? 6 : 8,
      pros: [
        'Acquire operational control',
        'Transfer existing lease obligations',
        'Lower capital than full purchase',
        `Buyout amortizes over ${amortizationYears} years`,
      ],
      cons: [
        'Ongoing rent obligations continue',
        'Buyout increases effective rent temporarily',
        `Coverage ratio drops to ${coverageRatio.toFixed(2)}x during amortization`,
        'No real estate ownership/appreciation',
      ],
    };
  }

  /**
   * Run full deal comparison
   */
  runComparison(input: DealComparisonInput): DealComparisonResult {
    const { facilities, purchasePrice, holdPeriodYears } = input;

    // Calculate totals
    const totalBeds = facilities.reduce((sum, f) => sum + f.beds, 0);
    const totalNOI = facilities.reduce((sum, f) => sum + f.noi, 0);
    const totalEBITDAR = facilities.reduce((sum, f) => sum + f.ebitdar, 0);
    const dealName = facilities.length === 1
      ? facilities[0].name
      : `${facilities.length}-Facility Portfolio`;

    // Analyze each structure
    const structures: StructureAnalysis[] = [];

    // Cash purchase
    if (input.cashPurchase?.enabled !== false) {
      structures.push(this.analyzeCashPurchase(input, totalNOI, totalEBITDAR));
    }

    // Conventional financing
    const convAnalysis = this.analyzeConventionalFinancing(input, facilities, totalNOI, totalEBITDAR);
    if (convAnalysis) structures.push(convAnalysis);

    // Sale-leaseback
    const slbAnalysis = this.analyzeSaleLeaseback(input, facilities, totalNOI, totalEBITDAR, false);
    if (slbAnalysis) structures.push(slbAnalysis);

    // REIT leaseback
    const reitAnalysis = this.analyzeSaleLeaseback(input, facilities, totalNOI, totalEBITDAR, true);
    if (reitAnalysis) structures.push(reitAnalysis);

    // Lease buyout
    const buyoutAnalysis = this.analyzeLeaseBuyout(input, facilities, totalNOI, totalEBITDAR);
    if (buyoutAnalysis) structures.push(buyoutAnalysis);

    // Generate rankings
    const rankings = {
      byIRR: [...structures].sort((a, b) => b.irr - a.irr).map(s => s.structure),
      byEquityMultiple: [...structures].sort((a, b) => b.equityMultiple - a.equityMultiple).map(s => s.structure),
      byCashOnCash: [...structures].sort((a, b) => b.cashOnCash - a.cashOnCash).map(s => s.structure),
      byEquityRequired: [...structures].sort((a, b) => a.equityRequired - b.equityRequired).map(s => s.structure),
      byRisk: [...structures].sort((a, b) => a.riskScore - b.riskScore).map(s => s.structure),
    };

    // Generate recommendation
    const scoredStructures = structures.map(s => ({
      structure: s.structure,
      score:
        (rankings.byIRR.indexOf(s.structure) === 0 ? 3 : rankings.byIRR.indexOf(s.structure) === 1 ? 2 : 1) +
        (rankings.byRisk.indexOf(s.structure) === 0 ? 2 : rankings.byRisk.indexOf(s.structure) === 1 ? 1 : 0) +
        (s.coveragePassFail ? 2 : 0),
    }));

    const recommendedStructure = scoredStructures.sort((a, b) => b.score - a.score)[0]?.structure ?? 'purchase_cash';
    const recommended = structures.find(s => s.structure === recommendedStructure);

    const recommendationRationale: string[] = [];
    if (recommended) {
      if (rankings.byIRR[0] === recommendedStructure) {
        recommendationRationale.push(`Highest IRR at ${(recommended.irr * 100).toFixed(1)}%`);
      }
      if (rankings.byRisk[0] === recommendedStructure) {
        recommendationRationale.push('Lowest risk profile');
      }
      if (recommended.coveragePassFail) {
        recommendationRationale.push('Meets coverage requirements');
      }
      recommendationRationale.push(`Equity multiple of ${recommended.equityMultiple.toFixed(2)}x`);
    }

    // Build comparison matrix
    const comparisonMatrix = [
      { metric: 'Equity Required', ...Object.fromEntries(structures.map(s => [s.structure, `$${(s.equityRequired / 1000000).toFixed(2)}M`])) },
      { metric: 'IRR', ...Object.fromEntries(structures.map(s => [s.structure, `${(s.irr * 100).toFixed(1)}%`])) },
      { metric: 'Equity Multiple', ...Object.fromEntries(structures.map(s => [s.structure, `${s.equityMultiple.toFixed(2)}x`])) },
      { metric: 'Cash-on-Cash', ...Object.fromEntries(structures.map(s => [s.structure, `${(s.cashOnCash * 100).toFixed(1)}%`])) },
      { metric: 'Year 1 Cash Flow', ...Object.fromEntries(structures.map(s => [s.structure, `$${(s.year1CashFlow / 1000).toFixed(0)}K`])) },
      { metric: 'DSCR', ...Object.fromEntries(structures.map(s => [s.structure, s.dscr > 0 ? `${s.dscr.toFixed(2)}x` : 'N/A'])) },
      { metric: 'Rent Coverage', ...Object.fromEntries(structures.map(s => [s.structure, s.rentCoverage > 0 ? `${s.rentCoverage.toFixed(2)}x` : 'N/A'])) },
      { metric: 'Risk Score', ...Object.fromEntries(structures.map(s => [s.structure, `${s.riskScore}/10`])) },
    ];

    return {
      dealName,
      totalFacilities: facilities.length,
      totalBeds,
      totalNOI,
      totalEBITDAR,
      purchasePrice,
      structures,
      rankings,
      recommendedStructure,
      recommendationRationale,
      comparisonMatrix,
    };
  }
}

// Export singleton instance
export const dealComparisonAnalyzer = new DealComparisonAnalyzer();
