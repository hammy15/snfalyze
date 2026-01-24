/**
 * Auto SLB Calculator & Rent Suggestion Engine
 *
 * Calculates per-building and portfolio-level rent suggestions based on:
 * - Extracted financial data (EBITDAR)
 * - Extracted census data
 * - Extracted PPD rates
 * - User-adjustable assumptions (cap rate, yield, coverage)
 */

import { db } from '@/db';
import { facilities, financialPeriods, saleLeaseback } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLatestFinancials, getLatestCensus, getLatestPayerRates } from '../extraction/db-populator';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RentSuggestion {
  facilityId: string;
  facilityName: string;
  beds: number;

  // From extracted financials
  ttmRevenue: number;
  ttmExpenses: number;
  ttmEbitdar: number;
  ttmNoi: number;

  // SLB calculations
  suggestedPurchasePrice: number;
  suggestedAnnualRent: number;
  suggestedMonthlyRent: number;

  // Coverage analysis
  coverageRatio: number;
  coverageStatus: 'healthy' | 'warning' | 'critical';

  // Max rent thresholds
  maxRentAt140Coverage: number;
  maxRentAt125Coverage: number;
  maxRentAt110Coverage: number;

  // Per-bed metrics
  pricePerBed: number;
  rentPerBed: number;

  // Assumptions used
  assumptions: {
    capRate: number;
    yield: number;
    minCoverage: number;
  };
}

export interface PortfolioRentSuggestion {
  facilities: RentSuggestion[];
  portfolioTotal: {
    totalRevenue: number;
    totalExpenses: number;
    totalEbitdar: number;
    totalNoi: number;
    totalPurchasePrice: number;
    totalAnnualRent: number;
    totalMonthlyRent: number;
    totalBeds: number;
    weightedCoverage: number;
    weightedCapRate: number;
    blendedPricePerBed: number;
  };
  assumptions: {
    capRate: number;
    yield: number;
    minCoverage: number;
  };
}

export interface SLBAssumptions {
  capRate: number;       // e.g., 0.075 for 7.5%
  yield: number;         // e.g., 0.085 for 8.5%
  minCoverage: number;   // e.g., 1.40 for 1.40x
}

// ============================================================================
// DEFAULT ASSUMPTIONS
// ============================================================================

export const DEFAULT_ASSUMPTIONS: SLBAssumptions = {
  capRate: 0.075,    // 7.5%
  yield: 0.085,      // 8.5%
  minCoverage: 1.40, // 1.40x
};

// ============================================================================
// CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate rent suggestion for a single facility
 */
export async function calculateRentSuggestion(
  facilityId: string,
  assumptions: SLBAssumptions = DEFAULT_ASSUMPTIONS
): Promise<RentSuggestion | null> {
  // Get facility details
  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility) {
    return null;
  }

  // Get TTM financials
  const financials = await getLatestFinancials(facilityId);
  if (!financials) {
    return null;
  }

  const ttmRevenue = financials.totalRevenue;
  const ttmExpenses = financials.totalExpenses;
  const ttmEbitdar = financials.ebitdar;
  const ttmNoi = financials.noi || ttmEbitdar * 0.95; // Approximate NOI

  // Calculate purchase price: NOI / Cap Rate
  const suggestedPurchasePrice = ttmNoi / assumptions.capRate;

  // Calculate annual rent: Purchase Price × Yield
  const suggestedAnnualRent = suggestedPurchasePrice * assumptions.yield;
  const suggestedMonthlyRent = suggestedAnnualRent / 12;

  // Calculate coverage ratio: EBITDAR / Rent
  const coverageRatio = ttmEbitdar / suggestedAnnualRent;

  // Determine coverage status
  let coverageStatus: 'healthy' | 'warning' | 'critical';
  if (coverageRatio >= 1.40) {
    coverageStatus = 'healthy';
  } else if (coverageRatio >= 1.25) {
    coverageStatus = 'warning';
  } else {
    coverageStatus = 'critical';
  }

  // Calculate max rent at various coverage levels
  const maxRentAt140Coverage = ttmEbitdar / 1.40;
  const maxRentAt125Coverage = ttmEbitdar / 1.25;
  const maxRentAt110Coverage = ttmEbitdar / 1.10;

  // Calculate per-bed metrics
  const beds = facility.licensedBeds || facility.certifiedBeds || 100;
  const pricePerBed = suggestedPurchasePrice / beds;
  const rentPerBed = suggestedAnnualRent / beds;

  return {
    facilityId,
    facilityName: facility.name,
    beds,
    ttmRevenue,
    ttmExpenses,
    ttmEbitdar,
    ttmNoi,
    suggestedPurchasePrice,
    suggestedAnnualRent,
    suggestedMonthlyRent,
    coverageRatio,
    coverageStatus,
    maxRentAt140Coverage,
    maxRentAt125Coverage,
    maxRentAt110Coverage,
    pricePerBed,
    rentPerBed,
    assumptions: {
      capRate: assumptions.capRate,
      yield: assumptions.yield,
      minCoverage: assumptions.minCoverage,
    },
  };
}

/**
 * Calculate portfolio-level rent suggestion
 */
export async function calculatePortfolioRent(
  dealId: string,
  assumptions: SLBAssumptions = DEFAULT_ASSUMPTIONS
): Promise<PortfolioRentSuggestion | null> {
  // Get all facilities for this deal
  const dealFacilities = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, dealId));

  if (dealFacilities.length === 0) {
    return null;
  }

  // Calculate rent suggestion for each facility
  const suggestions: RentSuggestion[] = [];
  for (const facility of dealFacilities) {
    const suggestion = await calculateRentSuggestion(facility.id, assumptions);
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  if (suggestions.length === 0) {
    return null;
  }

  // Calculate portfolio totals
  const portfolioTotal = {
    totalRevenue: sum(suggestions, 'ttmRevenue'),
    totalExpenses: sum(suggestions, 'ttmExpenses'),
    totalEbitdar: sum(suggestions, 'ttmEbitdar'),
    totalNoi: sum(suggestions, 'ttmNoi'),
    totalPurchasePrice: sum(suggestions, 'suggestedPurchasePrice'),
    totalAnnualRent: sum(suggestions, 'suggestedAnnualRent'),
    totalMonthlyRent: sum(suggestions, 'suggestedMonthlyRent'),
    totalBeds: sum(suggestions, 'beds'),
    weightedCoverage: 0,
    weightedCapRate: 0,
    blendedPricePerBed: 0,
  };

  // Calculate weighted coverage (weighted by EBITDAR)
  const totalEbitdarForWeight = portfolioTotal.totalEbitdar;
  if (totalEbitdarForWeight > 0) {
    portfolioTotal.weightedCoverage = suggestions.reduce((sum, s) => {
      return sum + (s.coverageRatio * s.ttmEbitdar / totalEbitdarForWeight);
    }, 0);
  }

  // Calculate weighted cap rate (weighted by NOI)
  const totalNoiForWeight = portfolioTotal.totalNoi;
  if (totalNoiForWeight > 0) {
    portfolioTotal.weightedCapRate = suggestions.reduce((sum, s) => {
      const impliedCapRate = s.ttmNoi / s.suggestedPurchasePrice;
      return sum + (impliedCapRate * s.ttmNoi / totalNoiForWeight);
    }, 0);
  }

  // Calculate blended price per bed
  if (portfolioTotal.totalBeds > 0) {
    portfolioTotal.blendedPricePerBed = portfolioTotal.totalPurchasePrice / portfolioTotal.totalBeds;
  }

  return {
    facilities: suggestions,
    portfolioTotal,
    assumptions: {
      capRate: assumptions.capRate,
      yield: assumptions.yield,
      minCoverage: assumptions.minCoverage,
    },
  };
}

/**
 * Calculate rent using the coverage-first approach
 * (Start with desired coverage, work backwards to rent)
 */
export function calculateRentFromCoverage(
  ebitdar: number,
  targetCoverage: number = 1.40
): { annualRent: number; monthlyRent: number } {
  const annualRent = ebitdar / targetCoverage;
  return {
    annualRent,
    monthlyRent: annualRent / 12,
  };
}

/**
 * Calculate implied cap rate from price and NOI
 */
export function calculateImpliedCapRate(
  purchasePrice: number,
  noi: number
): number {
  if (purchasePrice === 0) return 0;
  return noi / purchasePrice;
}

/**
 * Calculate implied yield from price and rent
 */
export function calculateImpliedYield(
  purchasePrice: number,
  annualRent: number
): number {
  if (purchasePrice === 0) return 0;
  return annualRent / purchasePrice;
}

/**
 * Update SLB record in database with calculated values
 */
export async function saveSLBCalculation(
  dealId: string,
  facilityId: string | null,
  suggestion: RentSuggestion | PortfolioRentSuggestion
): Promise<void> {
  const isPortfolio = !facilityId && 'portfolioTotal' in suggestion;

  const values = isPortfolio
    ? {
        dealId,
        facilityId: null,
        propertyNoi: (suggestion as PortfolioRentSuggestion).portfolioTotal.totalNoi.toString(),
        appliedCapRate: (suggestion as PortfolioRentSuggestion).assumptions.capRate.toString(),
        purchasePrice: (suggestion as PortfolioRentSuggestion).portfolioTotal.totalPurchasePrice.toString(),
        buyerYieldRequirement: (suggestion as PortfolioRentSuggestion).assumptions.yield.toString(),
        annualRent: (suggestion as PortfolioRentSuggestion).portfolioTotal.totalAnnualRent.toString(),
        facilityEbitdar: (suggestion as PortfolioRentSuggestion).portfolioTotal.totalEbitdar.toString(),
        coverageRatio: (suggestion as PortfolioRentSuggestion).portfolioTotal.weightedCoverage.toString(),
        coveragePassFail: (suggestion as PortfolioRentSuggestion).portfolioTotal.weightedCoverage >= 1.40,
      }
    : {
        dealId,
        facilityId,
        propertyNoi: (suggestion as RentSuggestion).ttmNoi.toString(),
        appliedCapRate: (suggestion as RentSuggestion).assumptions.capRate.toString(),
        purchasePrice: (suggestion as RentSuggestion).suggestedPurchasePrice.toString(),
        buyerYieldRequirement: (suggestion as RentSuggestion).assumptions.yield.toString(),
        annualRent: (suggestion as RentSuggestion).suggestedAnnualRent.toString(),
        facilityEbitdar: (suggestion as RentSuggestion).ttmEbitdar.toString(),
        coverageRatio: (suggestion as RentSuggestion).coverageRatio.toString(),
        coveragePassFail: (suggestion as RentSuggestion).coverageRatio >= 1.40,
        effectiveRentPerBed: (suggestion as RentSuggestion).rentPerBed.toString(),
      };

  await db
    .insert(saleLeaseback)
    .values(values)
    .onConflictDoNothing();
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function sum<T>(arr: T[], key: keyof T): number {
  return arr.reduce((total, item) => {
    const value = item[key];
    return total + (typeof value === 'number' ? value : 0);
  }, 0);
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format percentage for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Format coverage ratio for display
 */
export function formatCoverage(value: number): string {
  return `${value.toFixed(2)}x`;
}
