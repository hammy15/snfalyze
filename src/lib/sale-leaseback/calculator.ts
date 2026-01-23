/**
 * Sale-Leaseback Calculator Module
 *
 * Handles core calculations for sale-leaseback transactions:
 * - Purchase Price = Property NOI ÷ Cap Rate
 * - Annual Rent = Purchase Price × Buyer Yield Requirement
 * - Coverage Ratio = Facility EBITDAR ÷ Annual Rent (minimum 1.4x)
 * - Operator Cash Flow = EBITDAR - Rent
 */

export type AssetType = 'SNF' | 'ALF' | 'ILF';

// Default cap rates by asset type (SNF is 12.5%, ALF is closer to 9%)
export const DEFAULT_CAP_RATES: Record<AssetType, number> = {
  SNF: 0.125, // 12.5% for Skilled Nursing Facilities
  ALF: 0.09, // 9% for Assisted Living Facilities
  ILF: 0.085, // 8.5% for Independent Living Facilities
};

// Default minimum coverage ratios by asset type
export const DEFAULT_MIN_COVERAGE_RATIOS: Record<AssetType, number> = {
  SNF: 1.4, // 1.4x EBITDAR coverage for SNF
  ALF: 1.35, // 1.35x for ALF
  ILF: 1.3, // 1.3x for ILF
};

export interface SaleLeasebackInput {
  propertyNOI: number;
  capRate: number;
  buyerYieldRequirement: number;
  facilityEbitdar: number;
  minimumCoverageRatio: number;
  leaseTermYears: number;
  rentEscalation: number; // Annual escalation percentage (e.g., 0.025 for 2.5%)
  beds: number;
  totalRevenue: number;
  assetType?: AssetType;
}

export interface SaleLeasebackResult {
  purchasePrice: number;
  annualRent: number;
  monthlyRent: number;
  coverageRatio: number;
  coveragePassFail: boolean;
  operatorCashFlowAfterRent: number;
  effectiveRentPerBed: number;
  rentAsPercentOfRevenue: number;
  impliedYieldOnCost: number;
  spreadOverCapRate: number;
}

export interface FacilitySaleLeasebackInput extends SaleLeasebackInput {
  facilityId: string;
  facilityName: string;
}

export interface FacilitySaleLeasebackResult extends SaleLeasebackResult {
  facilityId: string;
  facilityName: string;
  beds: number;
}

export interface PortfolioSaleLeasebackResult {
  totalPurchasePrice: number;
  totalAnnualRent: number;
  totalMonthlyRent: number;
  portfolioCoverageRatio: number;
  portfolioCoveragePassFail: boolean;
  totalOperatorCashFlowAfterRent: number;
  weightedAvgRentPerBed: number;
  weightedAvgRentAsPercentOfRevenue: number;
  totalBeds: number;
  totalEbitdar: number;
  totalRevenue: number;
  facilityResults: FacilitySaleLeasebackResult[];
  facilitiesPassingCoverage: number;
  facilitiesFailingCoverage: number;
}

export class SaleLeasebackCalculator {
  /**
   * Calculate purchase price using cap rate method
   * Purchase Price = NOI / Cap Rate
   */
  calculatePurchasePrice(noi: number, capRate: number): number {
    if (capRate <= 0) {
      throw new Error('Cap rate must be greater than 0');
    }
    return noi / capRate;
  }

  /**
   * Calculate annual rent based on buyer yield requirement
   * Annual Rent = Purchase Price × Yield Requirement
   */
  calculateAnnualRent(purchasePrice: number, yieldRequirement: number): number {
    return purchasePrice * yieldRequirement;
  }

  /**
   * Calculate coverage ratio (EBITDAR coverage)
   * Coverage Ratio = EBITDAR / Annual Rent
   */
  calculateCoverageRatio(ebitdar: number, annualRent: number): number {
    if (annualRent <= 0) {
      return 0;
    }
    return ebitdar / annualRent;
  }

  /**
   * Check if coverage ratio meets minimum requirement
   */
  checkCoveragePassFail(coverageRatio: number, minimumCoverage: number): boolean {
    return coverageRatio >= minimumCoverage;
  }

  /**
   * Calculate operator cash flow after rent
   * Operator Cash Flow = EBITDAR - Annual Rent
   */
  calculateOperatorCashFlow(ebitdar: number, annualRent: number): number {
    return ebitdar - annualRent;
  }

  /**
   * Calculate rent per bed
   */
  calculateRentPerBed(annualRent: number, beds: number): number {
    if (beds <= 0) {
      return 0;
    }
    return annualRent / beds;
  }

  /**
   * Calculate rent as percentage of revenue
   */
  calculateRentAsPercentOfRevenue(annualRent: number, totalRevenue: number): number {
    if (totalRevenue <= 0) {
      return 0;
    }
    return annualRent / totalRevenue;
  }

  /**
   * Calculate implied yield on cost (what buyer is getting)
   */
  calculateImpliedYieldOnCost(annualRent: number, purchasePrice: number): number {
    if (purchasePrice <= 0) {
      return 0;
    }
    return annualRent / purchasePrice;
  }

  /**
   * Run full sale-leaseback analysis for a single facility
   */
  runFullAnalysis(input: SaleLeasebackInput): SaleLeasebackResult {
    const purchasePrice = this.calculatePurchasePrice(input.propertyNOI, input.capRate);
    const annualRent = this.calculateAnnualRent(purchasePrice, input.buyerYieldRequirement);
    const coverageRatio = this.calculateCoverageRatio(input.facilityEbitdar, annualRent);

    const result: SaleLeasebackResult = {
      purchasePrice,
      annualRent,
      monthlyRent: annualRent / 12,
      coverageRatio,
      coveragePassFail: this.checkCoveragePassFail(coverageRatio, input.minimumCoverageRatio),
      operatorCashFlowAfterRent: this.calculateOperatorCashFlow(input.facilityEbitdar, annualRent),
      effectiveRentPerBed: this.calculateRentPerBed(annualRent, input.beds),
      rentAsPercentOfRevenue: this.calculateRentAsPercentOfRevenue(annualRent, input.totalRevenue),
      impliedYieldOnCost: this.calculateImpliedYieldOnCost(annualRent, purchasePrice),
      spreadOverCapRate: input.buyerYieldRequirement - input.capRate,
    };

    return result;
  }

  /**
   * Run portfolio analysis across multiple facilities
   */
  runPortfolioAnalysis(
    facilities: FacilitySaleLeasebackInput[],
    portfolioMinCoverage?: number
  ): PortfolioSaleLeasebackResult {
    const facilityResults: FacilitySaleLeasebackResult[] = [];

    let totalPurchasePrice = 0;
    let totalAnnualRent = 0;
    let totalEbitdar = 0;
    let totalRevenue = 0;
    let totalBeds = 0;
    let facilitiesPassingCoverage = 0;
    let facilitiesFailingCoverage = 0;

    for (const facility of facilities) {
      const result = this.runFullAnalysis(facility);

      facilityResults.push({
        ...result,
        facilityId: facility.facilityId,
        facilityName: facility.facilityName,
        beds: facility.beds,
      });

      totalPurchasePrice += result.purchasePrice;
      totalAnnualRent += result.annualRent;
      totalEbitdar += facility.facilityEbitdar;
      totalRevenue += facility.totalRevenue;
      totalBeds += facility.beds;

      if (result.coveragePassFail) {
        facilitiesPassingCoverage++;
      } else {
        facilitiesFailingCoverage++;
      }
    }

    const portfolioCoverageRatio = this.calculateCoverageRatio(totalEbitdar, totalAnnualRent);
    const effectiveMinCoverage = portfolioMinCoverage ?? 1.4;

    return {
      totalPurchasePrice,
      totalAnnualRent,
      totalMonthlyRent: totalAnnualRent / 12,
      portfolioCoverageRatio,
      portfolioCoveragePassFail: this.checkCoveragePassFail(
        portfolioCoverageRatio,
        effectiveMinCoverage
      ),
      totalOperatorCashFlowAfterRent: totalEbitdar - totalAnnualRent,
      weightedAvgRentPerBed: totalBeds > 0 ? totalAnnualRent / totalBeds : 0,
      weightedAvgRentAsPercentOfRevenue: totalRevenue > 0 ? totalAnnualRent / totalRevenue : 0,
      totalBeds,
      totalEbitdar,
      totalRevenue,
      facilityResults,
      facilitiesPassingCoverage,
      facilitiesFailingCoverage,
    };
  }

  /**
   * Calculate rent projections over lease term with escalations
   */
  calculateRentProjections(
    initialAnnualRent: number,
    leaseTermYears: number,
    annualEscalation: number
  ): Array<{ year: number; annualRent: number; cumulativeRent: number }> {
    const projections: Array<{ year: number; annualRent: number; cumulativeRent: number }> = [];
    let cumulativeRent = 0;
    let currentRent = initialAnnualRent;

    for (let year = 1; year <= leaseTermYears; year++) {
      if (year > 1) {
        currentRent = currentRent * (1 + annualEscalation);
      }
      cumulativeRent += currentRent;

      projections.push({
        year,
        annualRent: currentRent,
        cumulativeRent,
      });
    }

    return projections;
  }

  /**
   * Calculate present value of lease payments
   */
  calculatePresentValueOfLease(
    initialAnnualRent: number,
    leaseTermYears: number,
    annualEscalation: number,
    discountRate: number
  ): number {
    let presentValue = 0;
    let currentRent = initialAnnualRent;

    for (let year = 1; year <= leaseTermYears; year++) {
      if (year > 1) {
        currentRent = currentRent * (1 + annualEscalation);
      }
      presentValue += currentRent / Math.pow(1 + discountRate, year);
    }

    return presentValue;
  }

  /**
   * Solve for maximum purchase price given EBITDAR and coverage requirement
   * Useful for understanding deal constraints
   */
  calculateMaxPurchasePrice(
    ebitdar: number,
    buyerYieldRequirement: number,
    minimumCoverageRatio: number
  ): number {
    // max_rent = EBITDAR / min_coverage
    // max_rent = max_purchase * yield
    // max_purchase = max_rent / yield = (EBITDAR / min_coverage) / yield
    const maxRent = ebitdar / minimumCoverageRatio;
    return maxRent / buyerYieldRequirement;
  }

  /**
   * Solve for required EBITDAR given purchase price and coverage requirement
   */
  calculateRequiredEbitdar(
    purchasePrice: number,
    buyerYieldRequirement: number,
    minimumCoverageRatio: number
  ): number {
    const annualRent = purchasePrice * buyerYieldRequirement;
    return annualRent * minimumCoverageRatio;
  }

  /**
   * Get default cap rate for asset type
   */
  getDefaultCapRate(assetType: AssetType): number {
    return DEFAULT_CAP_RATES[assetType];
  }

  /**
   * Get default minimum coverage ratio for asset type
   */
  getDefaultMinCoverageRatio(assetType: AssetType): number {
    return DEFAULT_MIN_COVERAGE_RATIOS[assetType];
  }
}

// Singleton instance for convenience
export const saleLeasebackCalculator = new SaleLeasebackCalculator();
