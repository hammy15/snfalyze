/**
 * Sale-Leaseback Portfolio Aggregation Module
 *
 * Handles portfolio-level calculations and roll-ups for multi-facility
 * sale-leaseback transactions.
 */

import {
  SaleLeasebackCalculator,
  FacilitySaleLeasebackInput,
  PortfolioSaleLeasebackResult,
  DEFAULT_CAP_RATES,
  DEFAULT_MIN_COVERAGE_RATIOS,
  AssetType,
} from './calculator';

export interface PortfolioFacility {
  id: string;
  name: string;
  assetType: AssetType;
  beds: number;
  propertyNOI: number;
  facilityEbitdar: number;
  totalRevenue: number;
  capRate?: number; // Optional per-facility cap rate override
  state?: string;
  city?: string;
}

export interface PortfolioAnalysisInput {
  facilities: PortfolioFacility[];
  buyerYieldRequirement: number;
  minimumCoverageRatio: number;
  leaseTermYears: number;
  rentEscalation: number;
  useBlendedCapRate?: boolean; // If true, use weighted average cap rate for all facilities
}

export interface FacilityContribution {
  facilityId: string;
  facilityName: string;
  assetType: AssetType;
  beds: number;
  percentOfTotalBeds: number;
  purchasePrice: number;
  percentOfTotalPurchasePrice: number;
  annualRent: number;
  percentOfTotalRent: number;
  ebitdar: number;
  percentOfTotalEbitdar: number;
  individualCoverageRatio: number;
  individualCoveragePassFail: boolean;
  operatorCashFlow: number;
}

export interface AssetTypeBreakdown {
  assetType: AssetType;
  facilityCount: number;
  totalBeds: number;
  totalPurchasePrice: number;
  totalAnnualRent: number;
  totalEbitdar: number;
  blendedCoverageRatio: number;
  averageCapRate: number;
}

export interface GeographicBreakdown {
  state: string;
  facilityCount: number;
  totalBeds: number;
  totalPurchasePrice: number;
  percentOfPortfolio: number;
}

export interface PortfolioDetailedResult extends PortfolioSaleLeasebackResult {
  facilityContributions: FacilityContribution[];
  assetTypeBreakdown: AssetTypeBreakdown[];
  geographicBreakdown: GeographicBreakdown[];
  blendedCapRate: number;
  impliedPortfolioYield: number;
  largestFacilityConcentration: number; // % of portfolio from largest facility
  diversificationScore: number; // 0-100 score based on facility/geography mix
}

export interface AllOrNothingAnalysis {
  worstFacility: {
    facilityId: string;
    facilityName: string;
    coverageRatio: number;
    isDealkiller: boolean;
  };
  facilitiesAtRisk: Array<{
    facilityId: string;
    facilityName: string;
    coverageRatio: number;
    coverageGap: number; // How much below minimum
  }>;
  portfolioDragEffect: number; // How much weak facilities drag down portfolio coverage
  recommendedAction: 'proceed' | 'negotiate' | 'exclude_weak' | 'pass';
  recommendation: string;
}

export class PortfolioAnalyzer {
  private calculator: SaleLeasebackCalculator;

  constructor() {
    this.calculator = new SaleLeasebackCalculator();
  }

  /**
   * Run comprehensive portfolio analysis
   */
  analyzePortfolio(input: PortfolioAnalysisInput): PortfolioDetailedResult {
    // Prepare facility inputs for calculator
    const facilityInputs: FacilitySaleLeasebackInput[] = input.facilities.map((facility) => {
      const capRate = facility.capRate ?? DEFAULT_CAP_RATES[facility.assetType];
      return {
        facilityId: facility.id,
        facilityName: facility.name,
        propertyNOI: facility.propertyNOI,
        capRate,
        buyerYieldRequirement: input.buyerYieldRequirement,
        facilityEbitdar: facility.facilityEbitdar,
        minimumCoverageRatio: input.minimumCoverageRatio,
        leaseTermYears: input.leaseTermYears,
        rentEscalation: input.rentEscalation,
        beds: facility.beds,
        totalRevenue: facility.totalRevenue,
        assetType: facility.assetType,
      };
    });

    // Run base portfolio analysis
    const baseResult = this.calculator.runPortfolioAnalysis(
      facilityInputs,
      input.minimumCoverageRatio
    );

    // Calculate facility contributions
    const facilityContributions = this.calculateFacilityContributions(
      input.facilities,
      baseResult,
      input.minimumCoverageRatio
    );

    // Calculate asset type breakdown
    const assetTypeBreakdown = this.calculateAssetTypeBreakdown(
      input.facilities,
      baseResult.facilityResults
    );

    // Calculate geographic breakdown
    const geographicBreakdown = this.calculateGeographicBreakdown(
      input.facilities,
      baseResult.facilityResults
    );

    // Calculate blended cap rate
    const blendedCapRate = this.calculateBlendedCapRate(input.facilities, baseResult.facilityResults);

    // Calculate implied portfolio yield
    const impliedPortfolioYield = baseResult.totalAnnualRent / baseResult.totalPurchasePrice;

    // Calculate concentration metrics
    const largestFacilityConcentration = this.calculateLargestConcentration(baseResult);
    const diversificationScore = this.calculateDiversificationScore(
      input.facilities,
      baseResult,
      geographicBreakdown
    );

    return {
      ...baseResult,
      facilityContributions,
      assetTypeBreakdown,
      geographicBreakdown,
      blendedCapRate,
      impliedPortfolioYield,
      largestFacilityConcentration,
      diversificationScore,
    };
  }

  /**
   * Analyze all-or-nothing deal structure
   */
  analyzeAllOrNothing(
    portfolioResult: PortfolioDetailedResult,
    minimumCoverageRatio: number
  ): AllOrNothingAnalysis {
    // Find worst performing facility
    const sortedByRatio = [...portfolioResult.facilityResults].sort(
      (a, b) => a.coverageRatio - b.coverageRatio
    );
    const worstFacility = sortedByRatio[0];

    // Find all facilities at risk
    const facilitiesAtRisk = sortedByRatio
      .filter((f) => f.coverageRatio < minimumCoverageRatio)
      .map((f) => ({
        facilityId: f.facilityId,
        facilityName: f.facilityName,
        coverageRatio: f.coverageRatio,
        coverageGap: minimumCoverageRatio - f.coverageRatio,
      }));

    // Calculate drag effect
    // How much do weak facilities reduce portfolio coverage?
    const strongFacilities = portfolioResult.facilityResults.filter(
      (f) => f.coverageRatio >= minimumCoverageRatio
    );
    const strongEbitdar = strongFacilities.reduce(
      (sum, f) =>
        sum +
        (portfolioResult.facilityContributions.find((c) => c.facilityId === f.facilityId)?.ebitdar ??
          0),
      0
    );
    const strongRent = strongFacilities.reduce((sum, f) => sum + f.annualRent, 0);
    const strongOnlyCoverage = strongRent > 0 ? strongEbitdar / strongRent : 0;
    const portfolioDragEffect = strongOnlyCoverage - portfolioResult.portfolioCoverageRatio;

    // Determine recommendation
    let recommendedAction: 'proceed' | 'negotiate' | 'exclude_weak' | 'pass';
    let recommendation: string;

    if (portfolioResult.portfolioCoveragePassFail && facilitiesAtRisk.length === 0) {
      recommendedAction = 'proceed';
      recommendation = 'All facilities meet coverage requirements. Deal structure is viable.';
    } else if (portfolioResult.portfolioCoveragePassFail && facilitiesAtRisk.length > 0) {
      recommendedAction = 'negotiate';
      recommendation = `Portfolio coverage meets minimum, but ${facilitiesAtRisk.length} individual facility(ies) fall below. Consider negotiating lower cap rate on weak facilities or operational improvements.`;
    } else if (!portfolioResult.portfolioCoveragePassFail && facilitiesAtRisk.length <= 1) {
      recommendedAction = 'exclude_weak';
      recommendation = `Portfolio fails coverage due to 1 weak facility. Consider excluding ${worstFacility.facilityName} to improve deal viability.`;
    } else {
      recommendedAction = 'pass';
      recommendation = `Portfolio coverage of ${(portfolioResult.portfolioCoverageRatio * 100).toFixed(2)}% is below minimum ${(minimumCoverageRatio * 100).toFixed(2)}%. Deal structure needs significant restructuring.`;
    }

    return {
      worstFacility: {
        facilityId: worstFacility.facilityId,
        facilityName: worstFacility.facilityName,
        coverageRatio: worstFacility.coverageRatio,
        isDealkiller: !portfolioResult.portfolioCoveragePassFail && facilitiesAtRisk.length === 1,
      },
      facilitiesAtRisk,
      portfolioDragEffect,
      recommendedAction,
      recommendation,
    };
  }

  /**
   * Calculate what-if scenario excluding specific facilities
   */
  calculateExclusionScenario(
    input: PortfolioAnalysisInput,
    excludeFacilityIds: string[]
  ): PortfolioDetailedResult {
    const filteredInput: PortfolioAnalysisInput = {
      ...input,
      facilities: input.facilities.filter((f) => !excludeFacilityIds.includes(f.id)),
    };
    return this.analyzePortfolio(filteredInput);
  }

  /**
   * Find optimal portfolio composition to meet coverage
   */
  findOptimalPortfolioComposition(
    input: PortfolioAnalysisInput
  ): {
    includedFacilities: string[];
    excludedFacilities: string[];
    result: PortfolioDetailedResult;
  } {
    // Simple greedy approach: remove worst facilities until coverage is met
    let currentInput = { ...input };
    const excludedFacilities: string[] = [];

    let result = this.analyzePortfolio(currentInput);

    while (!result.portfolioCoveragePassFail && currentInput.facilities.length > 1) {
      // Find and remove worst facility
      const sortedByRatio = [...result.facilityResults].sort(
        (a, b) => a.coverageRatio - b.coverageRatio
      );
      const worstFacilityId = sortedByRatio[0].facilityId;

      excludedFacilities.push(worstFacilityId);
      currentInput = {
        ...currentInput,
        facilities: currentInput.facilities.filter((f) => f.id !== worstFacilityId),
      };

      result = this.analyzePortfolio(currentInput);
    }

    return {
      includedFacilities: currentInput.facilities.map((f) => f.id),
      excludedFacilities,
      result,
    };
  }

  private calculateFacilityContributions(
    facilities: PortfolioFacility[],
    baseResult: PortfolioSaleLeasebackResult,
    minimumCoverageRatio: number
  ): FacilityContribution[] {
    return facilities.map((facility) => {
      const facilityResult = baseResult.facilityResults.find((r) => r.facilityId === facility.id);
      if (!facilityResult) {
        throw new Error(`Facility result not found for ${facility.id}`);
      }

      return {
        facilityId: facility.id,
        facilityName: facility.name,
        assetType: facility.assetType,
        beds: facility.beds,
        percentOfTotalBeds:
          baseResult.totalBeds > 0 ? facility.beds / baseResult.totalBeds : 0,
        purchasePrice: facilityResult.purchasePrice,
        percentOfTotalPurchasePrice:
          baseResult.totalPurchasePrice > 0
            ? facilityResult.purchasePrice / baseResult.totalPurchasePrice
            : 0,
        annualRent: facilityResult.annualRent,
        percentOfTotalRent:
          baseResult.totalAnnualRent > 0
            ? facilityResult.annualRent / baseResult.totalAnnualRent
            : 0,
        ebitdar: facility.facilityEbitdar,
        percentOfTotalEbitdar:
          baseResult.totalEbitdar > 0
            ? facility.facilityEbitdar / baseResult.totalEbitdar
            : 0,
        individualCoverageRatio: facilityResult.coverageRatio,
        individualCoveragePassFail: facilityResult.coverageRatio >= minimumCoverageRatio,
        operatorCashFlow: facilityResult.operatorCashFlowAfterRent,
      };
    });
  }

  private calculateAssetTypeBreakdown(
    facilities: PortfolioFacility[],
    results: Array<{ facilityId: string; purchasePrice: number; annualRent: number }>
  ): AssetTypeBreakdown[] {
    const assetTypes = ['SNF', 'ALF', 'ILF'] as const;
    const breakdown: AssetTypeBreakdown[] = [];

    for (const assetType of assetTypes) {
      const typeFacilities = facilities.filter((f) => f.assetType === assetType);
      if (typeFacilities.length === 0) continue;

      const typeResults = results.filter((r) =>
        typeFacilities.some((f) => f.id === r.facilityId)
      );

      const totalBeds = typeFacilities.reduce((sum, f) => sum + f.beds, 0);
      const totalPurchasePrice = typeResults.reduce((sum, r) => sum + r.purchasePrice, 0);
      const totalAnnualRent = typeResults.reduce((sum, r) => sum + r.annualRent, 0);
      const totalEbitdar = typeFacilities.reduce((sum, f) => sum + f.facilityEbitdar, 0);
      const totalNoi = typeFacilities.reduce((sum, f) => sum + f.propertyNOI, 0);

      breakdown.push({
        assetType,
        facilityCount: typeFacilities.length,
        totalBeds,
        totalPurchasePrice,
        totalAnnualRent,
        totalEbitdar,
        blendedCoverageRatio: totalAnnualRent > 0 ? totalEbitdar / totalAnnualRent : 0,
        averageCapRate: totalPurchasePrice > 0 ? totalNoi / totalPurchasePrice : 0,
      });
    }

    return breakdown;
  }

  private calculateGeographicBreakdown(
    facilities: PortfolioFacility[],
    results: Array<{ facilityId: string; purchasePrice: number }>
  ): GeographicBreakdown[] {
    const stateMap = new Map<
      string,
      { count: number; beds: number; purchasePrice: number }
    >();

    const totalPurchasePrice = results.reduce((sum, r) => sum + r.purchasePrice, 0);

    for (const facility of facilities) {
      const state = facility.state ?? 'Unknown';
      const result = results.find((r) => r.facilityId === facility.id);
      const purchasePrice = result?.purchasePrice ?? 0;

      const existing = stateMap.get(state) ?? { count: 0, beds: 0, purchasePrice: 0 };
      stateMap.set(state, {
        count: existing.count + 1,
        beds: existing.beds + facility.beds,
        purchasePrice: existing.purchasePrice + purchasePrice,
      });
    }

    return Array.from(stateMap.entries())
      .map(([state, data]) => ({
        state,
        facilityCount: data.count,
        totalBeds: data.beds,
        totalPurchasePrice: data.purchasePrice,
        percentOfPortfolio: totalPurchasePrice > 0 ? data.purchasePrice / totalPurchasePrice : 0,
      }))
      .sort((a, b) => b.totalPurchasePrice - a.totalPurchasePrice);
  }

  private calculateBlendedCapRate(
    facilities: PortfolioFacility[],
    results: Array<{ facilityId: string; purchasePrice: number }>
  ): number {
    const totalNoi = facilities.reduce((sum, f) => sum + f.propertyNOI, 0);
    const totalPurchasePrice = results.reduce((sum, r) => sum + r.purchasePrice, 0);

    return totalPurchasePrice > 0 ? totalNoi / totalPurchasePrice : 0;
  }

  private calculateLargestConcentration(
    baseResult: PortfolioSaleLeasebackResult
  ): number {
    if (baseResult.facilityResults.length === 0 || baseResult.totalPurchasePrice === 0) {
      return 0;
    }

    const largestPurchasePrice = Math.max(
      ...baseResult.facilityResults.map((f) => f.purchasePrice)
    );
    return largestPurchasePrice / baseResult.totalPurchasePrice;
  }

  private calculateDiversificationScore(
    facilities: PortfolioFacility[],
    baseResult: PortfolioSaleLeasebackResult,
    geographicBreakdown: GeographicBreakdown[]
  ): number {
    // Score based on:
    // 1. Number of facilities (more = better, up to a point)
    // 2. Geographic spread
    // 3. Asset type mix
    // 4. Size distribution

    let score = 0;

    // Facility count score (max 25 points)
    const facilityCountScore = Math.min(facilities.length * 5, 25);
    score += facilityCountScore;

    // Geographic score (max 25 points)
    const stateCount = geographicBreakdown.length;
    const maxStateConcentration = Math.max(
      ...geographicBreakdown.map((g) => g.percentOfPortfolio)
    );
    const geoScore = Math.min(stateCount * 5, 15) + (1 - maxStateConcentration) * 10;
    score += geoScore;

    // Asset type mix score (max 25 points)
    const assetTypes = new Set(facilities.map((f) => f.assetType));
    const assetTypeScore = assetTypes.size * 8;
    score += Math.min(assetTypeScore, 25);

    // Size distribution score (max 25 points)
    const largestConcentration = this.calculateLargestConcentration(baseResult);
    const sizeScore = (1 - largestConcentration) * 25;
    score += sizeScore;

    return Math.round(score);
  }
}

// Singleton instance for convenience
export const portfolioAnalyzer = new PortfolioAnalyzer();
