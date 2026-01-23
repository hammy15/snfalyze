/**
 * Lease Buyout Calculator
 * Models the acquisition of lease rights from an operator
 * Buyout amount is amortized as additional rent over remaining lease term
 */

export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface ExistingLeaseTerms {
  currentAnnualRent: number;
  remainingYears: number;
  annualEscalation: number; // e.g., 0.025 for 2.5%
  renewalOptions?: {
    terms: number; // Number of renewal options
    yearsEach: number;
    escalationOnRenewal?: number;
  };
}

export interface LeaseAcquisition {
  facilityId: string;
  facilityName: string;
  assetType: AssetType;
  beds: number;
  existingLease: ExistingLeaseTerms;
  facilityEbitdar: number;
  facilityRevenue: number;
}

export interface LeaseBuyoutInput {
  // Facilities being acquired
  facilities: LeaseAcquisition[];

  // Buyout economics
  buyoutAmount: number; // Total amount paid to operator for lease rights

  // Amortization terms
  amortizationYears?: number; // If different from remaining lease term
  buyoutInterestRate?: number; // Implicit interest rate on buyout amortization

  // New lease terms (post-buyout)
  newLeaseTermYears?: number;
  newBaseRent?: number; // If renegotiating
  newEscalation?: number;

  // Coverage requirements
  minimumCoverageRatio?: number;
}

export interface BuyoutAmortizationRow {
  year: number;
  buyoutAmortization: number; // Extra rent component from buyout
  baseRent: number;
  totalRent: number;
  facilityEbitdar: number; // Projected with growth
  coverageRatio: number;
  operatorCashFlow: number;
}

export interface FacilityBuyoutAnalysis {
  facilityId: string;
  facilityName: string;
  assetType: AssetType;
  beds: number;

  // Existing lease economics
  existingAnnualRent: number;
  remainingLeaseValue: number; // NPV of remaining lease payments

  // Buyout allocation
  allocatedBuyoutAmount: number;
  buyoutPerBed: number;

  // New lease economics
  newBaseRent: number;
  buyoutAmortizationPerYear: number;
  totalNewAnnualRent: number;
  rentIncrease: number; // Dollar increase
  rentIncreasePercent: number;

  // Coverage analysis
  existingCoverageRatio: number;
  newCoverageRatio: number;
  coverageImpact: number;

  // Amortization schedule
  amortizationSchedule: BuyoutAmortizationRow[];
}

export interface LeaseBuyoutResult {
  // Summary
  totalBuyoutAmount: number;
  totalFacilities: number;
  totalBeds: number;

  // Existing lease summary
  totalExistingAnnualRent: number;
  totalRemainingLeaseValue: number;

  // New lease summary
  totalNewBaseRent: number;
  totalBuyoutAmortization: number;
  totalNewAnnualRent: number;
  portfolioRentIncrease: number;
  portfolioRentIncreasePercent: number;

  // Coverage analysis
  portfolioExistingCoverage: number;
  portfolioNewCoverage: number;
  coveragePassFail: boolean;
  minimumCoverageRequired: number;

  // Value analysis
  buyoutMultiple: number; // Buyout / Annual rent increase
  paybackYears: number; // How long until buyout is "paid back" through amortization
  npvOfBuyout: number; // NPV of buyout vs continuing existing lease

  // Facility-level analysis
  facilityAnalyses: FacilityBuyoutAnalysis[];

  // Portfolio projections
  yearByYearProjection: BuyoutAmortizationRow[];
}

// Default parameters
export const DEFAULT_BUYOUT_INTEREST_RATE = 0.08; // 8% implicit rate
export const DEFAULT_EBITDAR_GROWTH = 0.02; // 2% annual EBITDAR growth

export const MINIMUM_COVERAGE_RATIOS: Record<AssetType, number> = {
  SNF: 1.40,
  ALF: 1.30,
  ILF: 1.25,
};

export class LeaseBuyoutCalculator {
  /**
   * Calculate NPV of remaining lease payments
   */
  calculateRemainingLeaseValue(
    currentRent: number,
    remainingYears: number,
    escalation: number,
    discountRate: number = 0.08
  ): number {
    let npv = 0;
    let rent = currentRent;

    for (let year = 1; year <= remainingYears; year++) {
      npv += rent / Math.pow(1 + discountRate, year);
      rent *= (1 + escalation);
    }

    return npv;
  }

  /**
   * Calculate annual buyout amortization
   */
  calculateBuyoutAmortization(
    buyoutAmount: number,
    years: number,
    interestRate: number = DEFAULT_BUYOUT_INTEREST_RATE
  ): number {
    if (interestRate === 0) {
      return buyoutAmount / years;
    }

    // Amortizing payment calculation
    return buyoutAmount * (interestRate * Math.pow(1 + interestRate, years)) /
           (Math.pow(1 + interestRate, years) - 1);
  }

  /**
   * Allocate buyout amount across facilities
   */
  allocateBuyoutAmount(
    totalBuyout: number,
    facilities: LeaseAcquisition[],
    method: 'rent' | 'ebitdar' | 'beds' | 'equal' = 'rent'
  ): Map<string, number> {
    const allocation = new Map<string, number>();

    if (method === 'equal') {
      const perFacility = totalBuyout / facilities.length;
      facilities.forEach(f => allocation.set(f.facilityId, perFacility));
      return allocation;
    }

    // Calculate total for proportional allocation
    let total = 0;
    facilities.forEach(f => {
      if (method === 'rent') {
        total += f.existingLease.currentAnnualRent;
      } else if (method === 'ebitdar') {
        total += f.facilityEbitdar;
      } else if (method === 'beds') {
        total += f.beds;
      }
    });

    // Allocate proportionally
    facilities.forEach(f => {
      let proportion = 0;
      if (method === 'rent') {
        proportion = f.existingLease.currentAnnualRent / total;
      } else if (method === 'ebitdar') {
        proportion = f.facilityEbitdar / total;
      } else if (method === 'beds') {
        proportion = f.beds / total;
      }
      allocation.set(f.facilityId, totalBuyout * proportion);
    });

    return allocation;
  }

  /**
   * Generate amortization schedule for a facility
   */
  generateAmortizationSchedule(
    baseRent: number,
    buyoutAmortization: number,
    facilityEbitdar: number,
    years: number,
    rentEscalation: number,
    ebitdarGrowth: number = DEFAULT_EBITDAR_GROWTH
  ): BuyoutAmortizationRow[] {
    const schedule: BuyoutAmortizationRow[] = [];
    let currentBaseRent = baseRent;
    let currentEbitdar = facilityEbitdar;

    for (let year = 1; year <= years; year++) {
      const totalRent = currentBaseRent + buyoutAmortization;
      const coverage = totalRent > 0 ? currentEbitdar / totalRent : 0;
      const operatorCashFlow = currentEbitdar - totalRent;

      schedule.push({
        year,
        buyoutAmortization,
        baseRent: currentBaseRent,
        totalRent,
        facilityEbitdar: currentEbitdar,
        coverageRatio: coverage,
        operatorCashFlow,
      });

      // Escalate for next year
      currentBaseRent *= (1 + rentEscalation);
      currentEbitdar *= (1 + ebitdarGrowth);
    }

    return schedule;
  }

  /**
   * Analyze single facility buyout
   */
  analyzeFacility(
    facility: LeaseAcquisition,
    allocatedBuyout: number,
    amortizationYears: number,
    buyoutInterestRate: number,
    newBaseRent?: number,
    newEscalation?: number
  ): FacilityBuyoutAnalysis {
    const existingLease = facility.existingLease;

    // Calculate remaining lease value
    const remainingLeaseValue = this.calculateRemainingLeaseValue(
      existingLease.currentAnnualRent,
      existingLease.remainingYears,
      existingLease.annualEscalation
    );

    // Calculate buyout amortization
    const buyoutAmortizationPerYear = this.calculateBuyoutAmortization(
      allocatedBuyout,
      amortizationYears,
      buyoutInterestRate
    );

    // Determine new lease terms
    const effectiveNewBaseRent = newBaseRent ?? existingLease.currentAnnualRent;
    const effectiveEscalation = newEscalation ?? existingLease.annualEscalation;
    const totalNewAnnualRent = effectiveNewBaseRent + buyoutAmortizationPerYear;

    // Calculate rent changes
    const rentIncrease = totalNewAnnualRent - existingLease.currentAnnualRent;
    const rentIncreasePercent = existingLease.currentAnnualRent > 0
      ? rentIncrease / existingLease.currentAnnualRent
      : 0;

    // Calculate coverage ratios
    const existingCoverageRatio = existingLease.currentAnnualRent > 0
      ? facility.facilityEbitdar / existingLease.currentAnnualRent
      : 0;
    const newCoverageRatio = totalNewAnnualRent > 0
      ? facility.facilityEbitdar / totalNewAnnualRent
      : 0;

    // Generate amortization schedule
    const amortizationSchedule = this.generateAmortizationSchedule(
      effectiveNewBaseRent,
      buyoutAmortizationPerYear,
      facility.facilityEbitdar,
      amortizationYears,
      effectiveEscalation
    );

    return {
      facilityId: facility.facilityId,
      facilityName: facility.facilityName,
      assetType: facility.assetType,
      beds: facility.beds,
      existingAnnualRent: existingLease.currentAnnualRent,
      remainingLeaseValue,
      allocatedBuyoutAmount: allocatedBuyout,
      buyoutPerBed: allocatedBuyout / facility.beds,
      newBaseRent: effectiveNewBaseRent,
      buyoutAmortizationPerYear,
      totalNewAnnualRent,
      rentIncrease,
      rentIncreasePercent,
      existingCoverageRatio,
      newCoverageRatio,
      coverageImpact: newCoverageRatio - existingCoverageRatio,
      amortizationSchedule,
    };
  }

  /**
   * Run full lease buyout analysis
   */
  runFullAnalysis(input: LeaseBuyoutInput): LeaseBuyoutResult {
    const {
      facilities,
      buyoutAmount,
      amortizationYears,
      buyoutInterestRate = DEFAULT_BUYOUT_INTEREST_RATE,
      minimumCoverageRatio,
    } = input;

    // Determine amortization period (default to average remaining lease term)
    const avgRemainingYears = facilities.reduce((sum, f) =>
      sum + f.existingLease.remainingYears, 0) / facilities.length;
    const effectiveAmortYears = amortizationYears ?? Math.ceil(avgRemainingYears);

    // Allocate buyout across facilities
    const allocation = this.allocateBuyoutAmount(buyoutAmount, facilities, 'rent');

    // Analyze each facility
    const facilityAnalyses: FacilityBuyoutAnalysis[] = facilities.map(facility => {
      const allocatedBuyout = allocation.get(facility.facilityId) ?? 0;
      return this.analyzeFacility(
        facility,
        allocatedBuyout,
        effectiveAmortYears,
        buyoutInterestRate,
        input.newBaseRent,
        input.newEscalation
      );
    });

    // Calculate portfolio totals
    const totalBeds = facilities.reduce((sum, f) => sum + f.beds, 0);
    const totalExistingAnnualRent = facilityAnalyses.reduce((sum, fa) =>
      sum + fa.existingAnnualRent, 0);
    const totalRemainingLeaseValue = facilityAnalyses.reduce((sum, fa) =>
      sum + fa.remainingLeaseValue, 0);
    const totalNewBaseRent = facilityAnalyses.reduce((sum, fa) =>
      sum + fa.newBaseRent, 0);
    const totalBuyoutAmortization = facilityAnalyses.reduce((sum, fa) =>
      sum + fa.buyoutAmortizationPerYear, 0);
    const totalNewAnnualRent = facilityAnalyses.reduce((sum, fa) =>
      sum + fa.totalNewAnnualRent, 0);
    const totalEbitdar = facilities.reduce((sum, f) =>
      sum + f.facilityEbitdar, 0);

    const portfolioRentIncrease = totalNewAnnualRent - totalExistingAnnualRent;
    const portfolioRentIncreasePercent = totalExistingAnnualRent > 0
      ? portfolioRentIncrease / totalExistingAnnualRent
      : 0;

    // Portfolio coverage
    const portfolioExistingCoverage = totalExistingAnnualRent > 0
      ? totalEbitdar / totalExistingAnnualRent
      : 0;
    const portfolioNewCoverage = totalNewAnnualRent > 0
      ? totalEbitdar / totalNewAnnualRent
      : 0;

    // Determine minimum coverage requirement (use most restrictive)
    const effectiveMinCoverage = minimumCoverageRatio ??
      Math.max(...facilities.map(f => MINIMUM_COVERAGE_RATIOS[f.assetType]));

    // Value analysis
    const buyoutMultiple = portfolioRentIncrease > 0
      ? buyoutAmount / portfolioRentIncrease
      : 0;
    const paybackYears = totalBuyoutAmortization > 0
      ? buyoutAmount / totalBuyoutAmortization
      : 0;

    // NPV of buyout (simplified)
    const discountRate = 0.10;
    const totalAmortPayments = totalBuyoutAmortization * effectiveAmortYears;
    const npvOfBuyout = totalAmortPayments / Math.pow(1 + discountRate, effectiveAmortYears / 2);

    // Generate portfolio year-by-year projection
    const yearByYearProjection: BuyoutAmortizationRow[] = [];
    for (let year = 1; year <= effectiveAmortYears; year++) {
      const yearData = facilityAnalyses.reduce((acc, fa) => {
        const yearRow = fa.amortizationSchedule.find(r => r.year === year);
        if (yearRow) {
          acc.buyoutAmortization += yearRow.buyoutAmortization;
          acc.baseRent += yearRow.baseRent;
          acc.totalRent += yearRow.totalRent;
          acc.facilityEbitdar += yearRow.facilityEbitdar;
          acc.operatorCashFlow += yearRow.operatorCashFlow;
        }
        return acc;
      }, {
        year,
        buyoutAmortization: 0,
        baseRent: 0,
        totalRent: 0,
        facilityEbitdar: 0,
        coverageRatio: 0,
        operatorCashFlow: 0,
      });

      yearData.coverageRatio = yearData.totalRent > 0
        ? yearData.facilityEbitdar / yearData.totalRent
        : 0;

      yearByYearProjection.push(yearData);
    }

    return {
      totalBuyoutAmount: buyoutAmount,
      totalFacilities: facilities.length,
      totalBeds,
      totalExistingAnnualRent,
      totalRemainingLeaseValue,
      totalNewBaseRent,
      totalBuyoutAmortization,
      totalNewAnnualRent,
      portfolioRentIncrease,
      portfolioRentIncreasePercent,
      portfolioExistingCoverage,
      portfolioNewCoverage,
      coveragePassFail: portfolioNewCoverage >= effectiveMinCoverage,
      minimumCoverageRequired: effectiveMinCoverage,
      buyoutMultiple,
      paybackYears,
      npvOfBuyout,
      facilityAnalyses,
      yearByYearProjection,
    };
  }

  /**
   * Calculate maximum buyout amount that maintains coverage
   */
  calculateMaxBuyoutForCoverage(
    facilities: LeaseAcquisition[],
    targetCoverage: number,
    amortizationYears: number,
    buyoutInterestRate: number = DEFAULT_BUYOUT_INTEREST_RATE
  ): number {
    const totalEbitdar = facilities.reduce((sum, f) => sum + f.facilityEbitdar, 0);
    const totalExistingRent = facilities.reduce((sum, f) =>
      sum + f.existingLease.currentAnnualRent, 0);

    // Max rent at target coverage
    const maxTotalRent = totalEbitdar / targetCoverage;
    const maxAdditionalRent = maxTotalRent - totalExistingRent;

    if (maxAdditionalRent <= 0) return 0;

    // Reverse calculate max buyout from amortization
    // Payment = P * (r(1+r)^n) / ((1+r)^n - 1)
    // P = Payment * ((1+r)^n - 1) / (r(1+r)^n)
    const r = buyoutInterestRate;
    const n = amortizationYears;
    const maxBuyout = maxAdditionalRent * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));

    return Math.max(0, maxBuyout);
  }
}

// Export singleton instance
export const leaseBuyoutCalculator = new LeaseBuyoutCalculator();
