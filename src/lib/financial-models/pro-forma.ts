/**
 * Multi-Year Pro Forma Generator
 * Generates detailed year-by-year financial projections for healthcare facilities
 */

export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface FacilityBaseData {
  facilityId: string;
  facilityName: string;
  assetType: AssetType;
  beds: number;
  currentOccupancy: number;
  currentCensus: number;

  // Revenue
  currentRevenue: number;
  revenuePerPatientDay?: number;
  medicaidMix?: number;
  medicareMix?: number;
  privateMix?: number;

  // Expenses
  currentExpenses: number;
  laborCostPercent?: number;
  agencyUsagePercent?: number;

  // Property
  currentNOI: number;
  currentEBITDAR: number;
  managementFeePercent?: number;
  rentExpense?: number;
}

export interface GrowthAssumptions {
  // Revenue assumptions
  revenueGrowth: number; // Base annual growth
  occupancyImprovement: number; // Annual occupancy gain (absolute points)
  targetOccupancy: number; // Max occupancy
  rateIncreases: number; // Annual rate increases

  // Expense assumptions
  expenseGrowth: number; // Base annual growth
  laborInflation: number; // Wage inflation
  agencyReduction: number; // Annual reduction in agency usage
  targetAgencyPercent: number; // Target agency percentage

  // Property assumptions
  capexPerBed?: number; // Annual CapEx
  capexGrowth?: number;
  managementFeePercent?: number;
}

export interface FinancingAssumptions {
  dealStructure: 'purchase' | 'sale_leaseback' | 'conventional' | 'lease_buyout';

  // Purchase/financing terms
  purchasePrice?: number;
  loanAmount?: number;
  interestRate?: number;
  amortizationYears?: number;
  loanTermYears?: number;

  // Lease terms
  annualRent?: number;
  rentEscalation?: number;
}

export interface ProFormaYear {
  year: number;

  // Census/Occupancy
  beds: number;
  occupancy: number;
  averageDailyCensus: number;
  patientDays: number;

  // Revenue
  grossRevenue: number;
  revenuePerPatientDay: number;
  revenueGrowthRate: number;

  // Revenue by payer (if modeled)
  medicaidRevenue?: number;
  medicareRevenue?: number;
  privateRevenue?: number;
  otherRevenue?: number;

  // Operating Expenses
  totalExpenses: number;
  laborCosts: number;
  agencyCosts: number;
  otherOperatingExpenses: number;
  managementFee: number;
  expenseGrowthRate: number;

  // Operating Metrics
  ebitda: number;
  ebitdaMargin: number;
  ebitdar: number;
  ebitdarMargin: number;
  noi: number;
  noiMargin: number;

  // Per Unit Metrics
  revenuePerBed: number;
  expensePerBed: number;
  noiPerBed: number;
  ebitdarPerBed: number;

  // Financing
  rentExpense: number;
  debtService: number;
  interestExpense: number;
  principalPayment: number;

  // Cash Flow
  cashFlowBeforeDebt: number;
  cashFlowAfterDebt: number;
  cashFlowAfterRent: number;

  // Coverage Ratios
  debtServiceCoverageRatio: number;
  rentCoverageRatio: number;
  fixedChargeCoverage: number;

  // Capital
  capitalExpenditures: number;
  freeCashFlow: number;
}

export interface ProFormaResult {
  // Facility info
  facilityId: string;
  facilityName: string;
  assetType: AssetType;

  // Summary metrics
  holdPeriod: number;
  totalRevenue: number;
  totalExpenses: number;
  totalNOI: number;
  totalEBITDAR: number;
  totalCashFlow: number;

  // Growth summary
  revenueCAGR: number;
  expenseCAGR: number;
  noiCAGR: number;
  ebitdarCAGR: number;

  // Year 1 vs Final Year comparison
  year1Revenue: number;
  finalYearRevenue: number;
  year1NOI: number;
  finalYearNOI: number;
  year1EBITDAR: number;
  finalYearEBITDAR: number;

  // Stabilization metrics
  yearToStabilization: number | null; // Year when occupancy reaches target
  stabilizedNOI: number;
  stabilizedEBITDAR: number;

  // Yearly projections
  yearlyProjections: ProFormaYear[];

  // Assumptions used
  assumptions: {
    growth: GrowthAssumptions;
    financing: FinancingAssumptions;
  };
}

export interface PortfolioProFormaResult {
  facilities: ProFormaResult[];

  // Portfolio totals
  totalBeds: number;
  holdPeriod: number;

  // Aggregated metrics by year
  portfolioYearlyTotals: {
    year: number;
    totalRevenue: number;
    totalExpenses: number;
    totalNOI: number;
    totalEBITDAR: number;
    totalRent: number;
    totalDebtService: number;
    portfolioCashFlow: number;
    portfolioDSCR: number;
    portfolioRentCoverage: number;
  }[];

  // Portfolio summary
  totalRevenue: number;
  totalNOI: number;
  totalEBITDAR: number;
  portfolioRevenueCAGR: number;
  portfolioNOICAGR: number;
}

// Default assumptions by asset type
export const DEFAULT_GROWTH_ASSUMPTIONS: Record<AssetType, GrowthAssumptions> = {
  SNF: {
    revenueGrowth: 0.025, // 2.5% base
    occupancyImprovement: 0.02, // 2 points per year
    targetOccupancy: 0.92,
    rateIncreases: 0.03, // 3% rate increases
    expenseGrowth: 0.03, // 3% base
    laborInflation: 0.035, // 3.5% wage inflation
    agencyReduction: 0.05, // 5% reduction per year
    targetAgencyPercent: 0.05, // 5% target
    capexPerBed: 1500,
    capexGrowth: 0.02,
    managementFeePercent: 0.05,
  },
  ALF: {
    revenueGrowth: 0.03,
    occupancyImprovement: 0.025,
    targetOccupancy: 0.94,
    rateIncreases: 0.035,
    expenseGrowth: 0.028,
    laborInflation: 0.03,
    agencyReduction: 0.03,
    targetAgencyPercent: 0.03,
    capexPerBed: 1200,
    capexGrowth: 0.02,
    managementFeePercent: 0.05,
  },
  ILF: {
    revenueGrowth: 0.035,
    occupancyImprovement: 0.03,
    targetOccupancy: 0.95,
    rateIncreases: 0.04,
    expenseGrowth: 0.025,
    laborInflation: 0.025,
    agencyReduction: 0.02,
    targetAgencyPercent: 0.02,
    capexPerBed: 1000,
    capexGrowth: 0.02,
    managementFeePercent: 0.04,
  },
};

export class ProFormaGenerator {
  /**
   * Calculate CAGR (Compound Annual Growth Rate)
   */
  calculateCAGR(startValue: number, endValue: number, years: number): number {
    if (startValue <= 0 || years <= 0) return 0;
    return Math.pow(endValue / startValue, 1 / years) - 1;
  }

  /**
   * Calculate debt service payment
   */
  calculateAnnualDebtService(
    principal: number,
    rate: number,
    amortizationYears: number
  ): number {
    if (rate === 0) return principal / amortizationYears;
    const monthlyRate = rate / 12;
    const numPayments = amortizationYears * 12;
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                           (Math.pow(1 + monthlyRate, numPayments) - 1);
    return monthlyPayment * 12;
  }

  /**
   * Generate single facility pro forma
   */
  generateFacilityProForma(
    facility: FacilityBaseData,
    growthAssumptions: GrowthAssumptions,
    financingAssumptions: FinancingAssumptions,
    holdPeriod: number = 10
  ): ProFormaResult {
    const yearlyProjections: ProFormaYear[] = [];

    // Initialize tracking variables
    let currentOccupancy = facility.currentOccupancy;
    let currentRevenue = facility.currentRevenue;
    let currentExpenses = facility.currentExpenses;
    let currentAgencyPercent = facility.agencyUsagePercent ?? 0.15;
    let loanBalance = financingAssumptions.loanAmount ?? 0;

    // Calculate initial debt service
    const annualDebtService = financingAssumptions.loanAmount
      ? this.calculateAnnualDebtService(
          financingAssumptions.loanAmount,
          financingAssumptions.interestRate ?? 0.07,
          financingAssumptions.amortizationYears ?? 25
        )
      : 0;

    let yearToStabilization: number | null = null;

    for (let year = 1; year <= holdPeriod; year++) {
      // Occupancy improvement (capped at target)
      const newOccupancy = Math.min(
        currentOccupancy + growthAssumptions.occupancyImprovement,
        growthAssumptions.targetOccupancy
      );

      // Check for stabilization
      if (yearToStabilization === null && newOccupancy >= growthAssumptions.targetOccupancy) {
        yearToStabilization = year;
      }

      const occupancyGain = newOccupancy - currentOccupancy;
      currentOccupancy = newOccupancy;

      // Census calculations
      const averageDailyCensus = facility.beds * currentOccupancy;
      const patientDays = averageDailyCensus * 365;

      // Revenue projection
      const occupancyRevenueLift = occupancyGain * (currentRevenue / (currentOccupancy - occupancyGain));
      const baseRevenueGrowth = currentRevenue * growthAssumptions.revenueGrowth;
      const rateIncreaseRevenue = currentRevenue * growthAssumptions.rateIncreases;
      const newRevenue = currentRevenue + occupancyRevenueLift + baseRevenueGrowth + rateIncreaseRevenue * 0.5;

      const revenueGrowthRate = (newRevenue - currentRevenue) / currentRevenue;
      currentRevenue = newRevenue;

      const revenuePerPatientDay = patientDays > 0 ? currentRevenue / patientDays : 0;

      // Expense projection
      const laborCosts = currentExpenses * (facility.laborCostPercent ?? 0.55);

      // Agency cost reduction
      const newAgencyPercent = Math.max(
        currentAgencyPercent - growthAssumptions.agencyReduction,
        growthAssumptions.targetAgencyPercent
      );
      const agencyCostSavings = laborCosts * (currentAgencyPercent - newAgencyPercent);
      currentAgencyPercent = newAgencyPercent;

      const agencyCosts = laborCosts * currentAgencyPercent;
      const newLaborCosts = laborCosts * (1 + growthAssumptions.laborInflation) - agencyCostSavings;

      const otherExpenses = currentExpenses * (1 - (facility.laborCostPercent ?? 0.55));
      const newOtherExpenses = otherExpenses * (1 + growthAssumptions.expenseGrowth);

      const managementFee = currentRevenue * (growthAssumptions.managementFeePercent ?? 0.05);
      const newExpenses = newLaborCosts + newOtherExpenses;

      const expenseGrowthRate = (newExpenses - currentExpenses) / currentExpenses;
      currentExpenses = newExpenses;

      // Operating metrics
      const ebitda = currentRevenue - currentExpenses - managementFee;
      const ebitdaMargin = currentRevenue > 0 ? ebitda / currentRevenue : 0;

      const rentExpense = financingAssumptions.annualRent
        ? financingAssumptions.annualRent * Math.pow(1 + (financingAssumptions.rentEscalation ?? 0.025), year - 1)
        : 0;

      const ebitdar = ebitda + rentExpense;
      const ebitdarMargin = currentRevenue > 0 ? ebitdar / currentRevenue : 0;

      const noi = ebitdar - managementFee;
      const noiMargin = currentRevenue > 0 ? noi / currentRevenue : 0;

      // Financing calculations
      const interestExpense = loanBalance * (financingAssumptions.interestRate ?? 0);
      const principalPayment = annualDebtService - interestExpense;
      loanBalance = Math.max(0, loanBalance - principalPayment);

      // Cash flows
      const cashFlowBeforeDebt = noi;
      const cashFlowAfterDebt = noi - annualDebtService;
      const cashFlowAfterRent = ebitdar - rentExpense;

      // Coverage ratios
      const debtServiceCoverageRatio = annualDebtService > 0 ? noi / annualDebtService : 0;
      const rentCoverageRatio = rentExpense > 0 ? ebitdar / rentExpense : 0;
      const fixedChargeCoverage = (annualDebtService + rentExpense) > 0
        ? ebitdar / (annualDebtService + rentExpense)
        : 0;

      // Capital expenditures
      const capitalExpenditures = (growthAssumptions.capexPerBed ?? 1500) *
        facility.beds * Math.pow(1 + (growthAssumptions.capexGrowth ?? 0.02), year - 1);

      const freeCashFlow = cashFlowAfterDebt - capitalExpenditures;

      yearlyProjections.push({
        year,
        beds: facility.beds,
        occupancy: currentOccupancy,
        averageDailyCensus,
        patientDays,
        grossRevenue: currentRevenue,
        revenuePerPatientDay,
        revenueGrowthRate,
        totalExpenses: currentExpenses,
        laborCosts: newLaborCosts,
        agencyCosts,
        otherOperatingExpenses: newOtherExpenses,
        managementFee,
        expenseGrowthRate,
        ebitda,
        ebitdaMargin,
        ebitdar,
        ebitdarMargin,
        noi,
        noiMargin,
        revenuePerBed: currentRevenue / facility.beds,
        expensePerBed: currentExpenses / facility.beds,
        noiPerBed: noi / facility.beds,
        ebitdarPerBed: ebitdar / facility.beds,
        rentExpense,
        debtService: annualDebtService,
        interestExpense,
        principalPayment,
        cashFlowBeforeDebt,
        cashFlowAfterDebt,
        cashFlowAfterRent,
        debtServiceCoverageRatio,
        rentCoverageRatio,
        fixedChargeCoverage,
        capitalExpenditures,
        freeCashFlow,
      });
    }

    // Calculate summary metrics
    const totalRevenue = yearlyProjections.reduce((sum, y) => sum + y.grossRevenue, 0);
    const totalExpenses = yearlyProjections.reduce((sum, y) => sum + y.totalExpenses, 0);
    const totalNOI = yearlyProjections.reduce((sum, y) => sum + y.noi, 0);
    const totalEBITDAR = yearlyProjections.reduce((sum, y) => sum + y.ebitdar, 0);
    const totalCashFlow = yearlyProjections.reduce((sum, y) => sum + y.freeCashFlow, 0);

    const year1 = yearlyProjections[0];
    const finalYear = yearlyProjections[yearlyProjections.length - 1];

    return {
      facilityId: facility.facilityId,
      facilityName: facility.facilityName,
      assetType: facility.assetType,
      holdPeriod,
      totalRevenue,
      totalExpenses,
      totalNOI,
      totalEBITDAR,
      totalCashFlow,
      revenueCAGR: this.calculateCAGR(year1.grossRevenue, finalYear.grossRevenue, holdPeriod),
      expenseCAGR: this.calculateCAGR(year1.totalExpenses, finalYear.totalExpenses, holdPeriod),
      noiCAGR: this.calculateCAGR(year1.noi, finalYear.noi, holdPeriod),
      ebitdarCAGR: this.calculateCAGR(year1.ebitdar, finalYear.ebitdar, holdPeriod),
      year1Revenue: year1.grossRevenue,
      finalYearRevenue: finalYear.grossRevenue,
      year1NOI: year1.noi,
      finalYearNOI: finalYear.noi,
      year1EBITDAR: year1.ebitdar,
      finalYearEBITDAR: finalYear.ebitdar,
      yearToStabilization,
      stabilizedNOI: yearToStabilization ? yearlyProjections[yearToStabilization - 1]?.noi ?? finalYear.noi : finalYear.noi,
      stabilizedEBITDAR: yearToStabilization ? yearlyProjections[yearToStabilization - 1]?.ebitdar ?? finalYear.ebitdar : finalYear.ebitdar,
      yearlyProjections,
      assumptions: {
        growth: growthAssumptions,
        financing: financingAssumptions,
      },
    };
  }

  /**
   * Generate portfolio-level pro forma
   */
  generatePortfolioProForma(
    facilities: FacilityBaseData[],
    growthAssumptions: GrowthAssumptions | Record<string, GrowthAssumptions>,
    financingAssumptions: FinancingAssumptions,
    holdPeriod: number = 10
  ): PortfolioProFormaResult {
    // Generate pro forma for each facility
    const facilityProFormas = facilities.map(facility => {
      const assumptions = typeof growthAssumptions === 'object' && 'revenueGrowth' in growthAssumptions
        ? growthAssumptions as GrowthAssumptions
        : (growthAssumptions as Record<string, GrowthAssumptions>)[facility.facilityId] ??
          DEFAULT_GROWTH_ASSUMPTIONS[facility.assetType];

      return this.generateFacilityProForma(facility, assumptions, financingAssumptions, holdPeriod);
    });

    // Aggregate yearly totals
    const portfolioYearlyTotals = [];
    for (let year = 1; year <= holdPeriod; year++) {
      const yearData = facilityProFormas.reduce(
        (acc, fp) => {
          const yearProjection = fp.yearlyProjections.find(y => y.year === year);
          if (yearProjection) {
            acc.totalRevenue += yearProjection.grossRevenue;
            acc.totalExpenses += yearProjection.totalExpenses;
            acc.totalNOI += yearProjection.noi;
            acc.totalEBITDAR += yearProjection.ebitdar;
            acc.totalRent += yearProjection.rentExpense;
            acc.totalDebtService += yearProjection.debtService;
            acc.portfolioCashFlow += yearProjection.freeCashFlow;
          }
          return acc;
        },
        {
          year,
          totalRevenue: 0,
          totalExpenses: 0,
          totalNOI: 0,
          totalEBITDAR: 0,
          totalRent: 0,
          totalDebtService: 0,
          portfolioCashFlow: 0,
          portfolioDSCR: 0,
          portfolioRentCoverage: 0,
        }
      );

      yearData.portfolioDSCR = yearData.totalDebtService > 0
        ? yearData.totalNOI / yearData.totalDebtService
        : 0;
      yearData.portfolioRentCoverage = yearData.totalRent > 0
        ? yearData.totalEBITDAR / yearData.totalRent
        : 0;

      portfolioYearlyTotals.push(yearData);
    }

    // Portfolio summary
    const totalBeds = facilities.reduce((sum, f) => sum + f.beds, 0);
    const totalRevenue = portfolioYearlyTotals.reduce((sum, y) => sum + y.totalRevenue, 0);
    const totalNOI = portfolioYearlyTotals.reduce((sum, y) => sum + y.totalNOI, 0);
    const totalEBITDAR = portfolioYearlyTotals.reduce((sum, y) => sum + y.totalEBITDAR, 0);

    const year1 = portfolioYearlyTotals[0];
    const finalYear = portfolioYearlyTotals[portfolioYearlyTotals.length - 1];

    return {
      facilities: facilityProFormas,
      totalBeds,
      holdPeriod,
      portfolioYearlyTotals,
      totalRevenue,
      totalNOI,
      totalEBITDAR,
      portfolioRevenueCAGR: this.calculateCAGR(year1.totalRevenue, finalYear.totalRevenue, holdPeriod),
      portfolioNOICAGR: this.calculateCAGR(year1.totalNOI, finalYear.totalNOI, holdPeriod),
    };
  }
}

// Export singleton instance
export const proFormaGenerator = new ProFormaGenerator();
