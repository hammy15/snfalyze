/**
 * Rent Suggestion Engine
 *
 * Calculates suggested rent, purchase price, and coverage ratios
 * for individual facilities and portfolios.
 *
 * Key formulas:
 * - Purchase Price = NOI / Cap Rate
 * - Annual Rent = Purchase Price × Yield
 * - Coverage Ratio = EBITDAR / Annual Rent
 * - Max Rent at 1.40x Coverage = EBITDAR / 1.40
 */

export interface RentAssumptions {
  capRate: number;           // Default: 0.075 (7.5%)
  yield: number;             // Default: 0.085 (8.5%)
  minCoverageRatio: number;  // Default: 1.40
  warningCoverageRatio: number; // Default: 1.25
  rentEscalation: number;    // Default: 0.02 (2% annual)
}

export const DEFAULT_RENT_ASSUMPTIONS: RentAssumptions = {
  capRate: 0.075,
  yield: 0.085,
  minCoverageRatio: 1.40,
  warningCoverageRatio: 1.25,
  rentEscalation: 0.02,
};

export type CoverageStatus = 'healthy' | 'warning' | 'critical';

export interface FacilityRentSuggestion {
  facilityId: string;
  facilityName: string;
  beds: number;

  // Input financials (TTM)
  ttmRevenue: number;
  ttmEbitdar: number;
  ttmNoi: number;

  // Calculated values
  suggestedPurchasePrice: number;
  suggestedAnnualRent: number;
  suggestedMonthlyRent: number;
  rentPerBed: number;

  // Coverage analysis
  coverageRatio: number;
  coverageStatus: CoverageStatus;

  // Max rent thresholds
  maxRentAt140Coverage: number;
  maxRentAt125Coverage: number;
  maxRentAt110Coverage: number;

  // Per-bed metrics
  pricePerBed: number;
  noiPerBed: number;
  ebitdarPerBed: number;
}

export interface PortfolioRentSuggestion {
  facilities: FacilityRentSuggestion[];

  // Portfolio totals
  totalBeds: number;
  totalRevenue: number;
  totalEbitdar: number;
  totalNoi: number;
  totalPurchasePrice: number;
  totalAnnualRent: number;
  totalMonthlyRent: number;

  // Weighted metrics
  weightedCapRate: number;
  weightedYield: number;
  weightedCoverageRatio: number;
  portfolioCoverageStatus: CoverageStatus;

  // Portfolio per-bed metrics
  avgPricePerBed: number;
  avgRentPerBed: number;
  avgNoiPerBed: number;

  // Summary
  healthyCount: number;
  warningCount: number;
  criticalCount: number;
}

/**
 * Calculate rent suggestion for a single facility
 */
export function calculateFacilityRentSuggestion(
  facilityId: string,
  facilityName: string,
  beds: number,
  ttmRevenue: number,
  ttmEbitdar: number,
  ttmNoi: number,
  assumptions: Partial<RentAssumptions> = {}
): FacilityRentSuggestion {
  const config = { ...DEFAULT_RENT_ASSUMPTIONS, ...assumptions };

  // If no NOI provided, estimate from EBITDAR (assume 95% flows to NOI)
  const noi = ttmNoi > 0 ? ttmNoi : ttmEbitdar * 0.95;

  // Calculate purchase price: NOI / Cap Rate
  const suggestedPurchasePrice = noi / config.capRate;

  // Calculate annual rent: Purchase Price × Yield
  const suggestedAnnualRent = suggestedPurchasePrice * config.yield;
  const suggestedMonthlyRent = suggestedAnnualRent / 12;

  // Calculate coverage ratio: EBITDAR / Annual Rent
  const coverageRatio = suggestedAnnualRent > 0
    ? ttmEbitdar / suggestedAnnualRent
    : 0;

  // Determine coverage status
  const coverageStatus: CoverageStatus =
    coverageRatio >= config.minCoverageRatio ? 'healthy' :
    coverageRatio >= config.warningCoverageRatio ? 'warning' : 'critical';

  // Calculate max rent at various coverage thresholds
  const maxRentAt140Coverage = ttmEbitdar / 1.40;
  const maxRentAt125Coverage = ttmEbitdar / 1.25;
  const maxRentAt110Coverage = ttmEbitdar / 1.10;

  // Per-bed metrics
  const pricePerBed = beds > 0 ? suggestedPurchasePrice / beds : 0;
  const rentPerBed = beds > 0 ? suggestedAnnualRent / beds : 0;
  const noiPerBed = beds > 0 ? noi / beds : 0;
  const ebitdarPerBed = beds > 0 ? ttmEbitdar / beds : 0;

  return {
    facilityId,
    facilityName,
    beds,
    ttmRevenue,
    ttmEbitdar,
    ttmNoi: noi,
    suggestedPurchasePrice,
    suggestedAnnualRent,
    suggestedMonthlyRent,
    rentPerBed,
    coverageRatio,
    coverageStatus,
    maxRentAt140Coverage,
    maxRentAt125Coverage,
    maxRentAt110Coverage,
    pricePerBed,
    noiPerBed,
    ebitdarPerBed,
  };
}

/**
 * Calculate rent suggestions for a portfolio of facilities
 */
export function calculatePortfolioRentSuggestion(
  facilities: Array<{
    facilityId: string;
    facilityName: string;
    beds: number;
    ttmRevenue: number;
    ttmEbitdar: number;
    ttmNoi: number;
  }>,
  assumptions: Partial<RentAssumptions> = {}
): PortfolioRentSuggestion {
  const config = { ...DEFAULT_RENT_ASSUMPTIONS, ...assumptions };

  // Calculate individual facility suggestions
  const facilitySuggestions = facilities.map(f =>
    calculateFacilityRentSuggestion(
      f.facilityId,
      f.facilityName,
      f.beds,
      f.ttmRevenue,
      f.ttmEbitdar,
      f.ttmNoi,
      assumptions
    )
  );

  // Calculate portfolio totals
  const totalBeds = facilitySuggestions.reduce((sum, f) => sum + f.beds, 0);
  const totalRevenue = facilitySuggestions.reduce((sum, f) => sum + f.ttmRevenue, 0);
  const totalEbitdar = facilitySuggestions.reduce((sum, f) => sum + f.ttmEbitdar, 0);
  const totalNoi = facilitySuggestions.reduce((sum, f) => sum + f.ttmNoi, 0);
  const totalPurchasePrice = facilitySuggestions.reduce((sum, f) => sum + f.suggestedPurchasePrice, 0);
  const totalAnnualRent = facilitySuggestions.reduce((sum, f) => sum + f.suggestedAnnualRent, 0);
  const totalMonthlyRent = totalAnnualRent / 12;

  // Calculate weighted metrics
  const weightedCapRate = totalPurchasePrice > 0 ? totalNoi / totalPurchasePrice : config.capRate;
  const weightedYield = totalPurchasePrice > 0 ? totalAnnualRent / totalPurchasePrice : config.yield;
  const weightedCoverageRatio = totalAnnualRent > 0 ? totalEbitdar / totalAnnualRent : 0;

  // Determine portfolio coverage status
  const portfolioCoverageStatus: CoverageStatus =
    weightedCoverageRatio >= config.minCoverageRatio ? 'healthy' :
    weightedCoverageRatio >= config.warningCoverageRatio ? 'warning' : 'critical';

  // Per-bed averages
  const avgPricePerBed = totalBeds > 0 ? totalPurchasePrice / totalBeds : 0;
  const avgRentPerBed = totalBeds > 0 ? totalAnnualRent / totalBeds : 0;
  const avgNoiPerBed = totalBeds > 0 ? totalNoi / totalBeds : 0;

  // Count by status
  const healthyCount = facilitySuggestions.filter(f => f.coverageStatus === 'healthy').length;
  const warningCount = facilitySuggestions.filter(f => f.coverageStatus === 'warning').length;
  const criticalCount = facilitySuggestions.filter(f => f.coverageStatus === 'critical').length;

  return {
    facilities: facilitySuggestions,
    totalBeds,
    totalRevenue,
    totalEbitdar,
    totalNoi,
    totalPurchasePrice,
    totalAnnualRent,
    totalMonthlyRent,
    weightedCapRate,
    weightedYield,
    weightedCoverageRatio,
    portfolioCoverageStatus,
    avgPricePerBed,
    avgRentPerBed,
    avgNoiPerBed,
    healthyCount,
    warningCount,
    criticalCount,
  };
}

/**
 * Calculate rent with different cap rate scenarios
 */
export function calculateRentScenarios(
  noi: number,
  capRates: number[] = [0.07, 0.075, 0.08, 0.085, 0.09],
  yields: number[] = [0.08, 0.085, 0.09]
): Array<{
  capRate: number;
  yield: number;
  purchasePrice: number;
  annualRent: number;
  monthlyRent: number;
}> {
  const scenarios: Array<{
    capRate: number;
    yield: number;
    purchasePrice: number;
    annualRent: number;
    monthlyRent: number;
  }> = [];

  for (const capRate of capRates) {
    for (const yld of yields) {
      const purchasePrice = noi / capRate;
      const annualRent = purchasePrice * yld;
      scenarios.push({
        capRate,
        yield: yld,
        purchasePrice,
        annualRent,
        monthlyRent: annualRent / 12,
      });
    }
  }

  return scenarios;
}

/**
 * Calculate rent escalation over time
 */
export function projectRentEscalation(
  baseRent: number,
  escalationRate: number,
  years: number
): Array<{ year: number; rent: number; cumulative: number }> {
  const projections: Array<{ year: number; rent: number; cumulative: number }> = [];
  let cumulative = 0;

  for (let year = 1; year <= years; year++) {
    const rent = baseRent * Math.pow(1 + escalationRate, year - 1);
    cumulative += rent;
    projections.push({ year, rent, cumulative });
  }

  return projections;
}

/**
 * Calculate implied cap rate from rent and NOI
 */
export function calculateImpliedCapRate(
  annualRent: number,
  yield_: number,
  noi: number
): number {
  const impliedPurchasePrice = annualRent / yield_;
  return noi / impliedPurchasePrice;
}

/**
 * Calculate rent to achieve target coverage
 */
export function calculateRentForTargetCoverage(
  ebitdar: number,
  targetCoverage: number
): number {
  return ebitdar / targetCoverage;
}

/**
 * Format currency for display
 */
export function formatRentCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format percentage for display
 */
export function formatRentPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

/**
 * Format coverage ratio for display
 */
export function formatCoverageRatio(value: number): string {
  return `${value.toFixed(2)}x`;
}
