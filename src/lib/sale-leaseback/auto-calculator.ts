/**
 * Auto SLB Calculator & Rent Suggestion Engine
 *
 * Calculates per-building and portfolio-level rent suggestions based on:
 * - Extracted financial data (EBITDAR)
 * - Extracted census data
 * - Extracted PPD rates
 * - User-adjustable assumptions (cap rate, yield, coverage)
 * - State-based price per bed fallback when financials unavailable
 */

import { db } from '@/db';
import { facilities, financialPeriods, saleLeaseback } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getLatestFinancials, getLatestCensus, getLatestPayerRates } from '../extraction/db-populator';
import { STATE_PRICE_PER_BED, DEFAULT_ASSUMPTIONS as PROFORMA_DEFAULTS } from '../proforma/proforma-template';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface RentSuggestion {
  facilityId: string;
  facilityName: string;
  beds: number;
  state?: string;

  // Valuation method used
  valuationMethod: 'financials' | 'price_per_bed' | 'hybrid';
  valuationNote?: string;

  // From extracted financials (may be 0 if using price_per_bed fallback)
  ttmRevenue: number;
  ttmExpenses: number;
  ttmEbitdar: number;
  ttmNoi: number;
  hasFinancials: boolean;

  // SLB calculations
  suggestedPurchasePrice: number;
  suggestedAnnualRent: number;
  suggestedMonthlyRent: number;

  // Range estimates (low/mid/high)
  purchasePriceRange: {
    low: number;
    mid: number;
    high: number;
  };
  annualRentRange: {
    low: number;
    mid: number;
    high: number;
  };

  // Coverage analysis (only meaningful with financials)
  coverageRatio: number;
  coverageStatus: 'healthy' | 'warning' | 'critical' | 'unknown';

  // Max rent thresholds
  maxRentAt140Coverage: number;
  maxRentAt125Coverage: number;
  maxRentAt110Coverage: number;

  // Per-bed metrics
  pricePerBed: number;
  rentPerBed: number;
  statePricePerBed?: number; // State average for reference

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
    // Range estimates
    purchasePriceRange: {
      low: number;
      mid: number;
      high: number;
    };
    annualRentRange: {
      low: number;
      mid: number;
      high: number;
    };
    // Breakdown by valuation method
    facilitiesWithFinancials: number;
    facilitiesWithPricePerBed: number;
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
 * Uses financials-based valuation when available, falls back to price per bed
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

  const beds = facility.licensedBeds || facility.certifiedBeds || 100;
  const state = facility.state?.toUpperCase() || 'TX'; // Default to TX if no state
  const statePricePerBed = STATE_PRICE_PER_BED[state] || 50000; // Default $50K

  // Get TTM financials
  const financials = await getLatestFinancials(facilityId);
  const hasFinancials = !!financials && financials.ebitdar > 0;

  let valuationMethod: 'financials' | 'price_per_bed' | 'hybrid';
  let valuationNote: string | undefined;
  let ttmRevenue: number;
  let ttmExpenses: number;
  let ttmEbitdar: number;
  let ttmNoi: number;
  let suggestedPurchasePrice: number;
  let coverageRatio: number;
  let coverageStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  let maxRentAt140Coverage: number;
  let maxRentAt125Coverage: number;
  let maxRentAt110Coverage: number;

  if (hasFinancials) {
    // Use financials-based valuation
    valuationMethod = 'financials';
    ttmRevenue = financials.totalRevenue;
    ttmExpenses = financials.totalExpenses;
    ttmEbitdar = financials.ebitdar;
    ttmNoi = financials.noi || ttmEbitdar * 0.95;

    // Calculate purchase price: NOI / Cap Rate
    suggestedPurchasePrice = ttmNoi / assumptions.capRate;

    // Calculate max rent at various coverage levels
    maxRentAt140Coverage = ttmEbitdar / 1.40;
    maxRentAt125Coverage = ttmEbitdar / 1.25;
    maxRentAt110Coverage = ttmEbitdar / 1.10;
  } else {
    // Use price per bed fallback
    valuationMethod = 'price_per_bed';
    valuationNote = `Using ${state} state average price per bed ($${statePricePerBed.toLocaleString()}/bed) - no financial data available`;

    ttmRevenue = 0;
    ttmExpenses = 0;
    ttmEbitdar = 0;
    ttmNoi = 0;

    // Calculate purchase price based on state price per bed
    suggestedPurchasePrice = beds * statePricePerBed;

    // Can't calculate coverage-based max rent without EBITDAR
    maxRentAt140Coverage = 0;
    maxRentAt125Coverage = 0;
    maxRentAt110Coverage = 0;
  }

  // Calculate annual rent: Purchase Price × Yield
  const suggestedAnnualRent = suggestedPurchasePrice * assumptions.yield;
  const suggestedMonthlyRent = suggestedAnnualRent / 12;

  // Calculate coverage ratio (only meaningful with financials)
  if (hasFinancials && suggestedAnnualRent > 0) {
    coverageRatio = ttmEbitdar / suggestedAnnualRent;
    if (coverageRatio >= 1.40) {
      coverageStatus = 'healthy';
    } else if (coverageRatio >= 1.25) {
      coverageStatus = 'warning';
    } else {
      coverageStatus = 'critical';
    }
  } else {
    coverageRatio = 0;
    coverageStatus = 'unknown';
  }

  // Calculate per-bed metrics
  const pricePerBed = suggestedPurchasePrice / beds;
  const rentPerBed = suggestedAnnualRent / beds;

  // Calculate price ranges (±15% for low/high)
  const rangeFactor = 0.15;
  const purchasePriceRange = {
    low: suggestedPurchasePrice * (1 - rangeFactor),
    mid: suggestedPurchasePrice,
    high: suggestedPurchasePrice * (1 + rangeFactor),
  };
  const annualRentRange = {
    low: suggestedAnnualRent * (1 - rangeFactor),
    mid: suggestedAnnualRent,
    high: suggestedAnnualRent * (1 + rangeFactor),
  };

  return {
    facilityId,
    facilityName: facility.name,
    beds,
    state,
    valuationMethod,
    valuationNote,
    hasFinancials,
    ttmRevenue,
    ttmExpenses,
    ttmEbitdar,
    ttmNoi,
    suggestedPurchasePrice,
    suggestedAnnualRent,
    suggestedMonthlyRent,
    purchasePriceRange,
    annualRentRange,
    coverageRatio,
    coverageStatus,
    maxRentAt140Coverage,
    maxRentAt125Coverage,
    maxRentAt110Coverage,
    pricePerBed,
    rentPerBed,
    statePricePerBed,
    assumptions: {
      capRate: assumptions.capRate,
      yield: assumptions.yield,
      minCoverage: assumptions.minCoverage,
    },
  };
}

/**
 * Calculate portfolio-level rent suggestion
 * Aggregates all facilities, handling both financials-based and price-per-bed valuations
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

  // Calculate rent suggestion for each facility (including those without financials)
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

  // Count facilities by valuation method
  const facilitiesWithFinancials = suggestions.filter(s => s.valuationMethod === 'financials').length;
  const facilitiesWithPricePerBed = suggestions.filter(s => s.valuationMethod === 'price_per_bed').length;

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
    purchasePriceRange: {
      low: suggestions.reduce((sum, s) => sum + s.purchasePriceRange.low, 0),
      mid: suggestions.reduce((sum, s) => sum + s.purchasePriceRange.mid, 0),
      high: suggestions.reduce((sum, s) => sum + s.purchasePriceRange.high, 0),
    },
    annualRentRange: {
      low: suggestions.reduce((sum, s) => sum + s.annualRentRange.low, 0),
      mid: suggestions.reduce((sum, s) => sum + s.annualRentRange.mid, 0),
      high: suggestions.reduce((sum, s) => sum + s.annualRentRange.high, 0),
    },
    facilitiesWithFinancials,
    facilitiesWithPricePerBed,
  };

  // Calculate weighted coverage (weighted by EBITDAR, only for facilities with financials)
  const totalEbitdarForWeight = portfolioTotal.totalEbitdar;
  if (totalEbitdarForWeight > 0) {
    const facilitiesWithCoverage = suggestions.filter(s => s.hasFinancials && s.coverageRatio > 0);
    if (facilitiesWithCoverage.length > 0) {
      const ebitdarWithCoverage = facilitiesWithCoverage.reduce((sum, s) => sum + s.ttmEbitdar, 0);
      portfolioTotal.weightedCoverage = facilitiesWithCoverage.reduce((sum, s) => {
        return sum + (s.coverageRatio * s.ttmEbitdar / ebitdarWithCoverage);
      }, 0);
    }
  }

  // Calculate weighted cap rate (weighted by NOI, only for facilities with financials)
  const totalNoiForWeight = portfolioTotal.totalNoi;
  if (totalNoiForWeight > 0) {
    const facilitiesWithNoi = suggestions.filter(s => s.hasFinancials && s.ttmNoi > 0);
    if (facilitiesWithNoi.length > 0) {
      portfolioTotal.weightedCapRate = facilitiesWithNoi.reduce((sum, s) => {
        const impliedCapRate = s.ttmNoi / s.suggestedPurchasePrice;
        return sum + (impliedCapRate * s.ttmNoi / totalNoiForWeight);
      }, 0);
    }
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
 * Get state price per bed with fallback
 */
export function getStatePricePerBed(stateCode: string): number {
  const normalized = stateCode?.toUpperCase()?.trim() || 'TX';
  return STATE_PRICE_PER_BED[normalized] || 50000;
}

/**
 * Calculate purchase price using price per bed method
 */
export function calculatePricePerBedValuation(
  beds: number,
  stateCode: string
): { purchasePrice: number; pricePerBed: number } {
  const pricePerBed = getStatePricePerBed(stateCode);
  return {
    purchasePrice: beds * pricePerBed,
    pricePerBed,
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
        effectiveRentPerBed: (suggestion as PortfolioRentSuggestion).portfolioTotal.totalBeds > 0
          ? ((suggestion as PortfolioRentSuggestion).portfolioTotal.totalAnnualRent / (suggestion as PortfolioRentSuggestion).portfolioTotal.totalBeds).toString()
          : null,
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
        // For price per bed fallback, coverage is unknown, mark as pass if financials exist
        coveragePassFail: (suggestion as RentSuggestion).hasFinancials
          ? (suggestion as RentSuggestion).coverageRatio >= 1.40
          : null,
        effectiveRentPerBed: (suggestion as RentSuggestion).rentPerBed.toString(),
      };

  await db
    .insert(saleLeaseback)
    .values(values)
    .onConflictDoNothing();
}

/**
 * Generate a summary of the valuation approach for display
 */
export function generateValuationSummary(suggestion: RentSuggestion): string {
  if (suggestion.valuationMethod === 'financials') {
    return `Based on TTM NOI of ${formatCurrency(suggestion.ttmNoi)} at ${formatPercent(suggestion.assumptions.capRate)} cap rate`;
  } else if (suggestion.valuationMethod === 'price_per_bed') {
    return `Based on ${suggestion.state} state average price per bed ($${suggestion.statePricePerBed?.toLocaleString()}/bed) - financial data not available`;
  } else {
    return 'Hybrid valuation using available data';
  }
}

/**
 * Generate portfolio valuation summary
 */
export function generatePortfolioSummary(portfolio: PortfolioRentSuggestion): string {
  const { facilitiesWithFinancials, facilitiesWithPricePerBed } = portfolio.portfolioTotal;
  const total = facilitiesWithFinancials + facilitiesWithPricePerBed;

  if (facilitiesWithFinancials === total) {
    return `All ${total} facilities valued using financial data`;
  } else if (facilitiesWithPricePerBed === total) {
    return `All ${total} facilities valued using state price per bed averages (no financial data)`;
  } else {
    return `${facilitiesWithFinancials} facilities valued using financials, ${facilitiesWithPricePerBed} using price per bed fallback`;
  }
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
