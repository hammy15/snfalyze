/**
 * Sale-Leaseback Sensitivity Analysis Module
 *
 * Provides sensitivity analysis for:
 * - Cap rate changes
 * - Buyer yield requirement changes
 * - Occupancy/revenue changes affecting EBITDAR
 * - Rent escalation scenarios
 */

import {
  SaleLeasebackCalculator,
  SaleLeasebackInput,
  SaleLeasebackResult,
  DEFAULT_CAP_RATES,
  AssetType,
} from './calculator';

export interface SensitivityRange {
  min: number;
  max: number;
  step: number;
}

export interface CapRateSensitivityResult {
  capRate: number;
  purchasePrice: number;
  annualRent: number;
  coverageRatio: number;
  coveragePassFail: boolean;
  operatorCashFlowAfterRent: number;
}

export interface YieldSensitivityResult {
  yieldRequirement: number;
  annualRent: number;
  coverageRatio: number;
  coveragePassFail: boolean;
  operatorCashFlowAfterRent: number;
  rentPerBed: number;
}

export interface OccupancySensitivityResult {
  occupancyChange: number; // Percentage change from baseline (e.g., -0.05 = -5%)
  adjustedEbitdar: number;
  coverageRatio: number;
  coveragePassFail: boolean;
  operatorCashFlowAfterRent: number;
}

export interface TwoWaySensitivityCell {
  capRate: number;
  yieldRequirement: number;
  coverageRatio: number;
  coveragePassFail: boolean;
  purchasePrice: number;
  annualRent: number;
}

export interface TwoWaySensitivityResult {
  capRates: number[];
  yieldRequirements: number[];
  matrix: TwoWaySensitivityCell[][];
}

export interface RentEscalationScenario {
  name: string;
  escalationRate: number;
  leaseTermYears: number;
}

export interface RentEscalationResult {
  scenario: RentEscalationScenario;
  year1Rent: number;
  year5Rent: number;
  year10Rent: number;
  totalRentOverTerm: number;
  averageAnnualRent: number;
  year1Coverage: number;
  year5Coverage: number;
  year10Coverage: number;
}

export class SaleLeasebackSensitivityAnalyzer {
  private calculator: SaleLeasebackCalculator;

  constructor() {
    this.calculator = new SaleLeasebackCalculator();
  }

  /**
   * Run cap rate sensitivity analysis
   */
  analyzeCapRateSensitivity(
    baseInput: SaleLeasebackInput,
    range: SensitivityRange
  ): CapRateSensitivityResult[] {
    const results: CapRateSensitivityResult[] = [];

    for (let capRate = range.min; capRate <= range.max; capRate += range.step) {
      const purchasePrice = this.calculator.calculatePurchasePrice(baseInput.propertyNOI, capRate);
      const annualRent = this.calculator.calculateAnnualRent(
        purchasePrice,
        baseInput.buyerYieldRequirement
      );
      const coverageRatio = this.calculator.calculateCoverageRatio(
        baseInput.facilityEbitdar,
        annualRent
      );

      results.push({
        capRate,
        purchasePrice,
        annualRent,
        coverageRatio,
        coveragePassFail: coverageRatio >= baseInput.minimumCoverageRatio,
        operatorCashFlowAfterRent: baseInput.facilityEbitdar - annualRent,
      });
    }

    return results;
  }

  /**
   * Run buyer yield requirement sensitivity analysis
   */
  analyzeYieldSensitivity(
    baseInput: SaleLeasebackInput,
    purchasePrice: number,
    range: SensitivityRange
  ): YieldSensitivityResult[] {
    const results: YieldSensitivityResult[] = [];

    for (let yieldReq = range.min; yieldReq <= range.max; yieldReq += range.step) {
      const annualRent = this.calculator.calculateAnnualRent(purchasePrice, yieldReq);
      const coverageRatio = this.calculator.calculateCoverageRatio(
        baseInput.facilityEbitdar,
        annualRent
      );

      results.push({
        yieldRequirement: yieldReq,
        annualRent,
        coverageRatio,
        coveragePassFail: coverageRatio >= baseInput.minimumCoverageRatio,
        operatorCashFlowAfterRent: baseInput.facilityEbitdar - annualRent,
        rentPerBed: baseInput.beds > 0 ? annualRent / baseInput.beds : 0,
      });
    }

    return results;
  }

  /**
   * Run occupancy/EBITDAR sensitivity analysis
   */
  analyzeOccupancySensitivity(
    baseInput: SaleLeasebackInput,
    baseResult: SaleLeasebackResult,
    occupancyChanges: number[] // Array of percentage changes (e.g., [-0.10, -0.05, 0, 0.05, 0.10])
  ): OccupancySensitivityResult[] {
    const results: OccupancySensitivityResult[] = [];

    // Assume EBITDAR scales linearly with occupancy changes
    // In reality, this depends on the operating leverage of the facility
    const ebitdarMargin = baseInput.facilityEbitdar / baseInput.totalRevenue;

    for (const change of occupancyChanges) {
      const adjustedRevenue = baseInput.totalRevenue * (1 + change);
      // EBITDAR doesn't scale 1:1 with revenue due to fixed costs
      // Assume 70% of costs are variable for sensitivity purposes
      const variableRatio = 0.7;
      const adjustedEbitdar =
        baseInput.facilityEbitdar +
        (adjustedRevenue - baseInput.totalRevenue) * ebitdarMargin * variableRatio;

      const coverageRatio = this.calculator.calculateCoverageRatio(
        adjustedEbitdar,
        baseResult.annualRent
      );

      results.push({
        occupancyChange: change,
        adjustedEbitdar,
        coverageRatio,
        coveragePassFail: coverageRatio >= baseInput.minimumCoverageRatio,
        operatorCashFlowAfterRent: adjustedEbitdar - baseResult.annualRent,
      });
    }

    return results;
  }

  /**
   * Run two-way sensitivity analysis (cap rate vs yield requirement)
   */
  analyzeTwoWaySensitivity(
    baseInput: SaleLeasebackInput,
    capRateRange: SensitivityRange,
    yieldRange: SensitivityRange
  ): TwoWaySensitivityResult {
    const capRates: number[] = [];
    const yieldRequirements: number[] = [];
    const matrix: TwoWaySensitivityCell[][] = [];

    // Build cap rate array
    for (let capRate = capRateRange.min; capRate <= capRateRange.max; capRate += capRateRange.step) {
      capRates.push(capRate);
    }

    // Build yield array
    for (let yieldReq = yieldRange.min; yieldReq <= yieldRange.max; yieldReq += yieldRange.step) {
      yieldRequirements.push(yieldReq);
    }

    // Build matrix
    for (const capRate of capRates) {
      const row: TwoWaySensitivityCell[] = [];
      const purchasePrice = this.calculator.calculatePurchasePrice(baseInput.propertyNOI, capRate);

      for (const yieldReq of yieldRequirements) {
        const annualRent = this.calculator.calculateAnnualRent(purchasePrice, yieldReq);
        const coverageRatio = this.calculator.calculateCoverageRatio(
          baseInput.facilityEbitdar,
          annualRent
        );

        row.push({
          capRate,
          yieldRequirement: yieldReq,
          coverageRatio,
          coveragePassFail: coverageRatio >= baseInput.minimumCoverageRatio,
          purchasePrice,
          annualRent,
        });
      }

      matrix.push(row);
    }

    return {
      capRates,
      yieldRequirements,
      matrix,
    };
  }

  /**
   * Analyze different rent escalation scenarios
   */
  analyzeRentEscalationScenarios(
    baseInput: SaleLeasebackInput,
    baseResult: SaleLeasebackResult,
    scenarios: RentEscalationScenario[]
  ): RentEscalationResult[] {
    const results: RentEscalationResult[] = [];

    for (const scenario of scenarios) {
      const projections = this.calculator.calculateRentProjections(
        baseResult.annualRent,
        scenario.leaseTermYears,
        scenario.escalationRate
      );

      const year5 = projections.find((p) => p.year === 5);
      const year10 = projections.find((p) => p.year === 10);
      const lastYear = projections[projections.length - 1];

      // Calculate coverage at different years assuming flat EBITDAR (conservative)
      // In practice, EBITDAR should grow, so these are stress test scenarios
      const year1Coverage = this.calculator.calculateCoverageRatio(
        baseInput.facilityEbitdar,
        baseResult.annualRent
      );
      const year5Coverage = year5
        ? this.calculator.calculateCoverageRatio(baseInput.facilityEbitdar, year5.annualRent)
        : 0;
      const year10Coverage = year10
        ? this.calculator.calculateCoverageRatio(baseInput.facilityEbitdar, year10.annualRent)
        : 0;

      results.push({
        scenario,
        year1Rent: baseResult.annualRent,
        year5Rent: year5?.annualRent ?? 0,
        year10Rent: year10?.annualRent ?? 0,
        totalRentOverTerm: lastYear.cumulativeRent,
        averageAnnualRent: lastYear.cumulativeRent / scenario.leaseTermYears,
        year1Coverage,
        year5Coverage,
        year10Coverage,
      });
    }

    return results;
  }

  /**
   * Find breakeven cap rate for given coverage requirement
   */
  findBreakevenCapRate(
    propertyNoi: number,
    facilityEbitdar: number,
    buyerYieldRequirement: number,
    minimumCoverageRatio: number
  ): number {
    // coverage = EBITDAR / rent
    // min_coverage = EBITDAR / (purchasePrice * yield)
    // purchasePrice = NOI / capRate
    // min_coverage = EBITDAR / ((NOI / capRate) * yield)
    // min_coverage = (EBITDAR * capRate) / (NOI * yield)
    // capRate = (min_coverage * NOI * yield) / EBITDAR

    return (minimumCoverageRatio * propertyNoi * buyerYieldRequirement) / facilityEbitdar;
  }

  /**
   * Find breakeven yield for given coverage requirement
   */
  findBreakevenYield(
    purchasePrice: number,
    facilityEbitdar: number,
    minimumCoverageRatio: number
  ): number {
    // coverage = EBITDAR / rent
    // min_coverage = EBITDAR / (purchasePrice * yield)
    // yield = EBITDAR / (purchasePrice * min_coverage)

    return facilityEbitdar / (purchasePrice * minimumCoverageRatio);
  }

  /**
   * Get default sensitivity ranges based on asset type
   */
  getDefaultRanges(assetType: AssetType): {
    capRate: SensitivityRange;
    yield: SensitivityRange;
    occupancy: number[];
  } {
    const baseCapRate = DEFAULT_CAP_RATES[assetType];

    return {
      capRate: {
        min: baseCapRate - 0.02, // -200 bps
        max: baseCapRate + 0.02, // +200 bps
        step: 0.005, // 50 bps increments
      },
      yield: {
        min: baseCapRate - 0.01, // Usually yield is at or above cap rate
        max: baseCapRate + 0.03, // Up to 300 bps spread
        step: 0.005,
      },
      occupancy: [-0.1, -0.05, 0, 0.05, 0.1], // -10% to +10%
    };
  }

  /**
   * Generate standard escalation scenarios
   */
  getStandardEscalationScenarios(): RentEscalationScenario[] {
    return [
      { name: 'Flat', escalationRate: 0, leaseTermYears: 15 },
      { name: 'CPI-Linked (2%)', escalationRate: 0.02, leaseTermYears: 15 },
      { name: 'Fixed 2.5%', escalationRate: 0.025, leaseTermYears: 15 },
      { name: 'Fixed 3%', escalationRate: 0.03, leaseTermYears: 15 },
      { name: 'Aggressive 3.5%', escalationRate: 0.035, leaseTermYears: 15 },
    ];
  }
}

// Singleton instance for convenience
export const sensitivityAnalyzer = new SaleLeasebackSensitivityAnalyzer();
