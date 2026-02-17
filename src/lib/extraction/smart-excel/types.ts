/**
 * Smart Excel Extraction Types
 *
 * Types for direct Excel parsing that bypasses AI intermediary.
 * Implements Cascadia's actual three-method valuation methodology.
 */

import type { SheetExtraction as BaseSheetExtraction } from '../excel-extractor';

// Re-export the base type
export type { BaseSheetExtraction };

// ============================================================================
// FILE CLASSIFICATION
// ============================================================================

export type CascadiaFileType =
  | 'opco_review'       // T13 P&L data with GL codes (400110-600353)
  | 'asset_valuation'   // Cap rates, multipliers, per-facility valuations
  | 'portfolio_model'   // Multi-scenario workbook (Current State, 85% Occupancy)
  | 'gl_mapping'        // GL code → P&L category mapping reference
  | 'unknown';

export interface FileClassification {
  documentId: string;
  filename: string;
  fileType: CascadiaFileType;
  confidence: number;
  indicators: string[];
  sheetSummary: { name: string; rowCount: number; suggestedType: string }[];
  extractionPriority: number; // Lower = extract first
}

// ============================================================================
// PROPERTY CLASSIFICATION
// ============================================================================

export type CascadiaPropertyType = 'SNF-Owned' | 'Leased' | 'ALF/SNC-Owned';

export type ValuationMethodType = 'ebitda_cap_rate' | 'ni_multiplier';

export interface FacilityClassification {
  facilityName: string;
  propertyType: CascadiaPropertyType;
  valuationMethod: ValuationMethodType;
  sncPercent?: number;
  applicableRate: number; // Cap rate (decimal, e.g. 0.10) or multiplier (e.g. 5.0)
  beds: number;
  confidence: number;
  indicators: string[];
}

// ============================================================================
// T13 LINE ITEMS & FACILITY SECTIONS
// ============================================================================

export interface T13LineItem {
  rowIndex: number;
  glCode: string;
  label: string;
  annualValue: number;
  monthlyValue?: number;
  ppdValue?: number;
  budgetAnnual?: number;
  budgetPpd?: number;
  monthlyValues?: Record<string, number>; // { "Jan-25": 12345, ... }
  category: 'revenue' | 'expense' | 'metric' | 'census';
  subcategory?: string;
  coaCode?: string;
  coaName?: string;
  isSubtotal: boolean;
  isTotal: boolean;
  indentLevel: number;
}

export interface T13FacilitySection {
  facilityName: string;
  facilityType?: string; // e.g., "SNF_AL_IL", "ALF"
  startRow: number;
  endRow: number;
  lineItems: T13LineItem[];
  censusData?: {
    totalPatientDays?: number;
    avgDailyCensus?: number;
    beds?: number;
    occupancy?: number;
  };
  summaryMetrics: {
    totalRevenue: number;
    totalExpenses: number;
    ebitdar: number;
    ebitda: number;
    netIncome: number;
    managementFee?: number;
    managementFeePercent?: number;
    leaseExpense?: number;
    providerTax?: number;
  };
  columnMap: {
    glCodeCol: number;
    labelCol: number;
    annualCol: number;
    monthlyCol?: number;
    ppdCol?: number;
    budgetAnnualCol?: number;
    budgetPpdCol?: number;
  };
}

export interface T13ParseResult {
  facilities: T13FacilitySection[];
  rollup?: T13FacilitySection; // Consolidated portfolio data
  entityGroups?: Map<string, T13FacilitySection>; // OR-SNFOwned, etc.
  glCodeMapping: Map<string, string>; // GL code -> label
  facilityMapping?: Map<string, FacilityMappingEntry>; // Opco name -> metadata
  periods: string[];
  warnings: string[];
}

export interface FacilityMappingEntry {
  opcoName: string;       // e.g., "Gateway (Opco)"
  propertyName: string;   // e.g., "Gateway Care and Retirement Center"
  stateBL: string;        // e.g., "OR-Split"
  leaseOwned: string;     // "Leased" or "Owned"
  group: string;          // e.g., "OR-SplitLeased"
  beds: number;           // Total Beds/Units
  businessLine: string;   // e.g., "SNF/IL", "AL/IL/MC"
  businessLineDetail: string; // e.g., "SNF/IL", "ALF/MC", "MC"
}

// ============================================================================
// ASSET VALUATION
// ============================================================================

export interface AssetValuationEntry {
  facilityName: string;
  propertyType: CascadiaPropertyType;
  beds: number;
  sncPercent?: number;
  capRate?: number;
  multiplier?: number;
  ebitda2025?: number;
  ebitda2026?: number;
  netIncome2025?: number;
  netIncome2026?: number;
  value2025?: number;
  value2026?: number;
  valuePerBed2025?: number;
  valuePerBed2026?: number;
  city?: string;
  state?: string;
  notes?: string;
}

export interface AssetValuationResult {
  entries: AssetValuationEntry[];
  categoryTotals: {
    category: string;
    facilityCount: number;
    totalBeds: number;
    totalValue: number;
    avgValuePerBed: number;
    valuationMethod: string;
  }[];
  portfolioTotal: {
    facilityCount: number;
    totalBeds: number;
    totalValue: number;
    avgValuePerBed: number;
  };
  warnings: string[];
}

// ============================================================================
// GL MAPPING
// ============================================================================

export interface GLMappingEntry {
  glCode: string;
  label: string;
  category?: string;
  subcategory?: string;
  coaCode?: string;
  facilityMappings?: Map<string, string>; // facilityName -> mapped category
}

// ============================================================================
// PORTFOLIO MODEL
// ============================================================================

export interface PortfolioScenario {
  name: string;
  sheetName: string;
  entityGroups: PortfolioEntityGroup[];
  totals: PortfolioFinancials;
}

export interface PortfolioEntityGroup {
  groupName: string; // e.g., "OR-SNFOwned", "WA-AL/IL/MCOwned"
  financials: PortfolioFinancials;
}

export interface PortfolioFinancials {
  totalRevenue: { annual: number; monthly?: number; ppd?: number };
  revenueBreakdown: {
    label: string;
    annual: number;
    monthly?: number;
    ppd?: number;
  }[];
  expenseBreakdown: {
    label: string;
    annual: number;
    monthly?: number;
    ppd?: number;
  }[];
  ebitdar: { annual: number; monthly?: number; ppd?: number; margin?: number };
  ebitda: { annual: number; monthly?: number; ppd?: number; margin?: number };
  managementFee?: { annual: number; percent?: number };
  leaseExpense?: { annual: number };
}

export interface PortfolioModelResult {
  scenarios: PortfolioScenario[];
  individualFacilities: Map<string, T13FacilitySection>;
  mappingSheet?: Map<string, GLMappingEntry>;
  warnings: string[];
}

// ============================================================================
// CASCADIA VALUATION
// ============================================================================

export interface CascadiaFacilityValuation {
  facilityName: string;
  propertyType: CascadiaPropertyType;
  beds: number;
  metricUsed: 'EBITDA' | 'Net Income';
  metricValue: number;
  rateOrMultiplier: number;
  rateLabel: string; // e.g., "10% Cap Rate" or "5.0x Multiplier"
  facilityValue: number;
  valuePerBed: number;
  sncPercent?: number;
  capRateBasis?: string; // e.g., "8% (0% SNC)"
}

export interface CascadiaCategoryTotal {
  category: string;
  propertyType: CascadiaPropertyType;
  facilityCount: number;
  totalBeds: number;
  totalValue: number;
  avgValuePerBed: number;
  valuationMethod: string;
}

export interface CascadiaValuationResult {
  facilities: CascadiaFacilityValuation[];
  categories: CascadiaCategoryTotal[];
  portfolioTotal: {
    facilityCount: number;
    totalBeds: number;
    totalValue: number;
    avgValuePerBed: number;
  };
  sensitivity: CascadiaSensitivityTable;
  dualView?: {
    cascadiaValue: number;
    externalValue: number;
    valueRange: { low: number; mid: number; high: number };
  };
}

export interface CascadiaSensitivityTable {
  baseValue: number;
  capRateVariations: {
    capRate: number;
    label: string;
    value: number;
    delta: number;
    deltaPercent: number;
  }[];
}

// ============================================================================
// SMART EXTRACTION RESULT (COMBINED OUTPUT)
// ============================================================================

export interface SmartExtractionResult {
  fileClassifications: FileClassification[];
  t13Data?: T13ParseResult;
  assetValuation?: AssetValuationResult;
  glMapping?: Map<string, GLMappingEntry>;
  portfolioModel?: PortfolioModelResult;
  facilityClassifications: FacilityClassification[];
  cascadiaValuation?: CascadiaValuationResult;
  confidence: number;
  extractionMethod: 'smart_excel';
  warnings: string[];
  processingTimeMs: number;
}

// ============================================================================
// BENCHMARK COMPARISON
// ============================================================================

export interface FacilityBenchmark {
  facilityName: string;
  operationalTier: 'strong' | 'average' | 'weak';
  comparisons: {
    metric: string;
    actual: number;
    benchmark: { low: number; median: number; high: number };
    rating: 'above' | 'at' | 'below';
    unit: string;
  }[];
  dealBreakers: {
    rule: string;
    triggered: boolean;
    value?: number;
    threshold?: number;
  }[];
  capRateValidation: {
    usedRate: number;
    benchmarkRange: { low: number; high: number };
    isWithinRange: boolean;
  };
}
