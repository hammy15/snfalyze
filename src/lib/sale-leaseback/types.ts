/**
 * Sale-Leaseback Types and Client-Safe Utilities
 *
 * This file contains types and pure functions that can be safely imported
 * by client components. Database-dependent functions are in auto-calculator.ts
 */

import { STATE_PRICE_PER_BED } from '../proforma/proforma-template';

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
// PURE UTILITY FUNCTIONS (safe for client)
// ============================================================================

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
// FORMAT FUNCTIONS
// ============================================================================

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
