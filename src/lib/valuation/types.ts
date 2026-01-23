/**
 * Valuation Types
 *
 * Core type definitions for the valuation engine.
 */

export type ValuationMethod =
  | 'cap_rate'
  | 'price_per_bed'
  | 'comparable_sales'
  | 'dcf'
  | 'noi_multiple'
  | 'proprietary';

export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface ValuationInput {
  // Financial metrics
  noi?: number;
  revenue?: number;
  ebitdar?: number;
  ebitda?: number;

  // Property characteristics
  beds: number;
  squareFootage?: number;
  assetType: AssetType;
  state: string;
  city?: string;
  yearBuilt?: number;
  cmsRating?: number;

  // Operating metrics
  occupancy?: number;
  payerMix?: {
    medicare: number;
    medicaid: number;
    privatePay: number;
    managedCare?: number;
  };

  // Market data
  marketCapRate?: number;
  marketPricePerBed?: number;

  // DCF-specific inputs
  projectionYears?: number;
  discountRate?: number;
  terminalCapRate?: number;
  revenueGrowthRate?: number;
  expenseGrowthRate?: number;

  // Multiple-based inputs
  noiMultiple?: number;
}

export interface ValuationResult {
  method: ValuationMethod;
  value: number;
  valueLow?: number;
  valueHigh?: number;
  confidence: number; // 0-100
  assumptions: ValuationAssumption[];
  calculations: ValuationCalculation[];
  notes?: string;
  inputsUsed: Partial<ValuationInput>;
}

export interface ValuationAssumption {
  field: string;
  value: string | number;
  source: 'provided' | 'market' | 'derived' | 'assumed';
  description?: string;
}

export interface ValuationCalculation {
  label: string;
  formula?: string;
  value: number;
  details?: string;
}

export interface ComparableSale {
  id: string;
  propertyName: string;
  city: string;
  state: string;
  assetType: AssetType;
  beds: number;
  saleDate: Date;
  salePrice: number;
  pricePerBed: number;
  capRate?: number;
  noiAtSale?: number;
  occupancyAtSale?: number;
  similarity?: number; // 0-100, how similar to subject
}

export interface SensitivityAnalysis {
  baseValue: number;
  variations: {
    label: string;
    value: number;
    percentChange: number;
  }[];
}

export interface ValuationSummary {
  methods: ValuationResult[];
  recommendedValue: number;
  valueRange: {
    low: number;
    high: number;
  };
  weightedAverage: number;
  confidence: number;
  sensitivityAnalysis?: {
    capRate?: SensitivityAnalysis;
    noi?: SensitivityAnalysis;
    occupancy?: SensitivityAnalysis;
  };
}

// Market data for defaults
export interface MarketData {
  assetType: AssetType;
  state: string;
  avgCapRate: number;
  avgPricePerBed: number;
  avgOccupancy: number;
  sampleSize: number;
  lastUpdated: Date;
}

// Default market assumptions by asset type
export const DEFAULT_MARKET_DATA: Record<AssetType, Partial<MarketData>> = {
  SNF: {
    avgCapRate: 0.10,
    avgPricePerBed: 85000,
    avgOccupancy: 0.82,
  },
  ALF: {
    avgCapRate: 0.075,
    avgPricePerBed: 125000,
    avgOccupancy: 0.88,
  },
  ILF: {
    avgCapRate: 0.065,
    avgPricePerBed: 175000,
    avgOccupancy: 0.92,
  },
};

// Cap rate ranges by rating
export const CAP_RATE_BY_RATING: Record<number, { low: number; high: number }> = {
  5: { low: 0.070, high: 0.085 },
  4: { low: 0.080, high: 0.095 },
  3: { low: 0.090, high: 0.110 },
  2: { low: 0.100, high: 0.130 },
  1: { low: 0.120, high: 0.160 },
};
