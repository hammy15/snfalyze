/**
 * Deal Learning System Types
 *
 * Types for the reverse-engineering engine that learns how Cascadia
 * evaluates deals by comparing raw data → completed proformas → valuations.
 */

// ============================================================================
// Input / Configuration
// ============================================================================

export interface HistoricalDealInput {
  name: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  primaryState?: string;
  dealDate?: string;
  askingPrice?: number;
  finalPrice?: number;
  beds?: number;
  facilityCount?: number;
  dealStructure?: 'purchase' | 'lease' | 'sale_leaseback' | 'acquisition_financing';
  notes?: string;
  tags?: string[];
}

export type FileRole = 'raw_source' | 'completed_proforma' | 'value_assessment';

export interface UploadedHistoricalFile {
  id: string;
  filename: string;
  fileRole: FileRole;
  fileSize: number;
  storagePath: string;
}

// ============================================================================
// Extraction Results (Per-File)
// ============================================================================

export interface ProformaFacilityData {
  facilityName: string;
  revenue: number;
  expenses: number;
  ebitdar: number;
  ebitda: number;
  netIncome: number;
  occupancy?: number;
  beds?: number;
  lineItems: ProformaLineItem[];
  assumptions?: ProformaAssumptions;
}

export interface ProformaLineItem {
  label: string;
  coaCode?: string;
  category: 'revenue' | 'expense' | 'metric';
  annualValue: number;
  monthlyValues?: Record<string, number>;
  ppdValue?: number;
}

export interface ProformaAssumptions {
  revenueGrowthRate?: number;
  expenseGrowthRate?: number;
  targetOccupancy?: number;
  managementFeePercent?: number;
  agencyTargetPercent?: number;
  capexReservePercent?: number;
  payerMix?: Record<string, number>;
}

export interface ProformaParseResult {
  facilities: ProformaFacilityData[];
  portfolioSummary?: {
    totalRevenue: number;
    totalExpenses: number;
    totalEbitdar: number;
    totalBeds: number;
  };
  assumptions?: ProformaAssumptions;
  confidence: number;
  warnings: string[];
}

export interface ValuationFacilityData {
  facilityName: string;
  beds?: number;
  propertyType?: string;
  state?: string;
  sncPercent?: number;
  ebitdar?: number;
  ebitda?: number;
  ebit?: number;
  netIncome?: number;
  capRate?: number;
  multiplier?: number;
  valuation: number;
  pricePerBed?: number;
  valuationMethod?: string;
}

export interface ValuationParseResult {
  facilities: ValuationFacilityData[];
  portfolioTotal?: number;
  confidence: number;
  warnings: string[];
}

// ============================================================================
// Comparison / Reverse-Engineering Results
// ============================================================================

export interface NormalizationDiff {
  field: string;
  rawValue: number;
  proformaValue: number;
  changeAmount: number;
  changePercent: number;
  changeType: 'increase' | 'decrease' | 'unchanged' | 'added' | 'removed';
  description?: string;
}

export interface LineItemDiff {
  label: string;
  coaCode?: string;
  category: 'revenue' | 'expense';
  rawValue: number;
  proformaValue: number;
  delta: number;
  deltaPercent: number;
}

export interface FacilityComparison {
  facilityName: string;
  propertyType?: string;
  assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  state?: string;
  beds?: number;

  // Raw extracted data
  raw: {
    revenue: number;
    expenses: number;
    ebitdar: number;
    ebitda: number;
    netIncome: number;
    occupancy?: number;
    lineItems: LineItemDiff[];
  };

  // User's proforma data
  proforma: {
    revenue: number;
    expenses: number;
    ebitdar: number;
    ebitda: number;
    netIncome: number;
    occupancy?: number;
    lineItems: LineItemDiff[];
  };

  // Detected normalization adjustments
  adjustments: NormalizationDiff[];

  // Valuation comparison
  valuation: {
    userValue: number;
    systemValue: number;
    userCapRate?: number;
    impliedCapRate?: number;
    userMultiplier?: number;
    impliedMultiplier?: number;
    delta: number;
    deltaPercent: number;
  };

  // Detected preferences
  detectedPreferences: DetectedPreferences;
}

export interface DetectedPreferences {
  managementFeePercent?: number;
  agencyTargetPercent?: number;
  capexReservePercent?: number;
  revenueGrowthRate?: number;
  expenseGrowthRate?: number;
  occupancyAssumption?: number;
  capRateUsed?: number;
  multiplierUsed?: number;
}

export interface ComparisonResult {
  historicalDealId: string;
  facilities: FacilityComparison[];
  portfolioSummary: {
    totalRawRevenue: number;
    totalProformaRevenue: number;
    totalRawEbitdar: number;
    totalProformaEbitdar: number;
    totalUserValuation: number;
    totalSystemValuation: number;
    avgCapRate?: number;
    avgMultiplier?: number;
    totalBeds: number;
    facilityCount: number;
  };
  confidence: number;
  warnings: string[];
}

// ============================================================================
// Aggregated Preferences / Learning Output
// ============================================================================

export type PreferenceKey =
  | 'cap_rate'
  | 'leased_multiplier'
  | 'mgmt_fee_pct'
  | 'agency_pct'
  | 'capex_reserve_pct'
  | 'revenue_growth'
  | 'expense_growth'
  | 'occupancy_target';

export interface AggregatedPreference {
  preferenceKey: PreferenceKey;
  assetType?: string;
  state?: string;
  region?: string;
  avgValue: number;
  medianValue: number;
  minValue: number;
  maxValue: number;
  stdDev: number;
  sampleCount: number;
  confidence: number;
  sourceDealIds: string[];
}

export interface PreferenceSuggestion {
  key: PreferenceKey;
  baseline: {
    value: number;
    source: 'cascadia' | 'industry_benchmark';
    label: string;
  };
  learned?: {
    value: number;
    confidence: number;
    sampleCount: number;
    sourceDealIds: string[];
  };
  recommended: number;
  recommendedSource: 'cascadia' | 'industry_benchmark' | 'learned';
  displayLabel: string;
}

export interface PreferenceLookupQuery {
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  state?: string;
  preferenceKey?: PreferenceKey;
  dealSize?: number;
  qualityTier?: 'strong' | 'average' | 'weak';
}

// ============================================================================
// Processing Pipeline
// ============================================================================

export type ProcessingPhase =
  | 'uploading'
  | 'extracting_raw'
  | 'extracting_proforma'
  | 'extracting_valuation'
  | 'comparing'
  | 'learning'
  | 'visualizing'
  | 'complete'
  | 'error';

export interface ProcessingStatus {
  phase: ProcessingPhase;
  progress: number; // 0-100
  message: string;
  errors?: string[];
}

// ============================================================================
// Visual Generation
// ============================================================================

export type VisualType =
  | 'deal_summary'
  | 'valuation_breakdown'
  | 'portfolio_map'
  | 'proforma_chart'
  | 'comparison_diff'
  | 'learned_preferences';

export interface VisualRequest {
  type: VisualType;
  data: Record<string, unknown>;
  style?: 'professional' | 'executive' | 'detailed';
  width?: number;
  height?: number;
}

export interface GeneratedVisual {
  imageUrl: string;
  prompt: string;
  type: VisualType;
  generatedAt: string;
}
