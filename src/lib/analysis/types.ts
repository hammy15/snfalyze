// =============================================================================
// CORE ANALYSIS TYPES
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';

// =============================================================================
// FACILITY & DEAL TYPES
// =============================================================================

export interface FacilityProfile {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    county?: string;
  };
  ccn?: string; // CMS Certification Number
  npi?: string; // National Provider Identifier
  assetType: AssetType;

  // Physical characteristics
  beds: {
    licensed: number;
    certified: number;
    operational: number;
  };
  squareFootage?: number;
  acres?: number;
  yearBuilt: number;
  yearRenovated?: number;
  stories: number;
  buildingCount: number;

  // Room configuration
  roomConfiguration: {
    private: number;
    semiPrivate: number;
    ward?: number;
  };

  // Ownership
  ownershipType: 'for_profit' | 'nonprofit' | 'government';
  chainAffiliation?: {
    name: string;
    facilityCount: number;
  };

  // Location classification
  locationType: 'urban' | 'suburban' | 'rural' | 'frontier';
  region: 'west' | 'midwest' | 'northeast' | 'southeast' | 'southwest';
}

export interface CMSData {
  ccn: string;
  providerName: string;

  // Star ratings
  overallRating: number;
  healthInspectionRating: number;
  staffingRating: number;
  qualityMeasureRating: number;

  // Staffing
  reportedNurseAideStaffingHoursPerResidentDay: number;
  reportedLPNStaffingHoursPerResidentDay: number;
  reportedRNStaffingHoursPerResidentDay: number;
  reportedTotalNurseStaffingHoursPerResidentDay: number;

  // Physical therapist staffing
  reportedPhysicalTherapistStaffingHoursPerResidentDay: number;

  // Survey data
  totalDeficiencies: number;
  healthDeficiencies: number;
  fireDeficiencies: number;

  // SFF status
  isSFF: boolean;
  isSFFCandidate: boolean;

  // Penalties
  totalFines: number;
  paymentDenialDays: number;

  // Abuse icon
  hasAbuseIcon: boolean;

  // Census
  averageResidentsPerDay: number;

  // Ownership
  ownershipType: string;

  // Last survey date
  lastHealthSurveyDate: string;

  // Quality measures (subset)
  qualityMeasures: {
    shortStayRehospitalizationRate?: number;
    shortStayERVisitRate?: number;
    longStayFallsWithMajorInjury?: number;
    longStayPressureUlcers?: number;
    longStayUTIs?: number;
    longStayAntipsychoticUse?: number;
    longStayPhysicalRestraints?: number;
  };

  dataDate: string;
}

export interface OperatingMetrics {
  // Census & Occupancy
  currentCensus: number;
  occupancyRate: number;
  occupancyTrend: 'improving' | 'stable' | 'declining';

  // Payer Mix (percentages)
  payerMix: {
    medicareA: number;
    medicareB: number;
    medicareAdvantage: number;
    medicaid: number;
    privatePay: number;
    managedCare: number;
    vaContract: number;
    hospice: number;
    other: number;
  };

  // Acuity
  caseMixIndex?: number;
  acuityLevel: 'high' | 'moderate' | 'low';

  // Staffing
  staffing: {
    rnHPPD: number;
    lpnHPPD: number;
    cnaHPPD: number;
    totalHPPD: number;
    agencyUsagePercent: number;
    turnoverRate: number;
  };

  // Average Length of Stay
  averageLOS: {
    medicare: number;
    medicaid: number;
    privatePay: number;
    overall: number;
  };
}

// =============================================================================
// FINANCIAL TYPES
// =============================================================================

export interface FinancialPeriod {
  startDate: string;
  endDate: string;
  periodType: 'month' | 'quarter' | 'year' | 'trailing_12';
  isAudited: boolean;
  isProjected: boolean;
}

export interface RevenueLineItem {
  category: RevenueCategory;
  amount: number;
  patientDays?: number;
  ratePerDay?: number;
  percentOfTotal?: number;
}

export type RevenueCategory =
  | 'medicare_part_a'
  | 'medicare_part_b'
  | 'medicare_advantage'
  | 'medicaid'
  | 'medicaid_quality_addon'
  | 'private_pay'
  | 'managed_care'
  | 'va_contract'
  | 'hospice'
  | 'respite'
  | 'therapy_ancillary'
  | 'pharmacy_ancillary'
  | 'other_ancillary'
  | 'other_revenue';

export interface ExpenseLineItem {
  category: ExpenseCategory;
  amount: number;
  percentOfRevenue?: number;
  perBed?: number;
  perPatientDay?: number;
}

export type ExpenseCategory =
  | 'nursing_salaries'
  | 'nursing_wages'
  | 'agency_nursing'
  | 'other_salaries'
  | 'employee_benefits'
  | 'payroll_taxes'
  | 'dietary'
  | 'housekeeping'
  | 'laundry'
  | 'activities'
  | 'social_services'
  | 'medical_supplies'
  | 'general_supplies'
  | 'utilities'
  | 'telephone'
  | 'insurance_liability'
  | 'insurance_property'
  | 'insurance_workers_comp'
  | 'property_tax'
  | 'management_fee'
  | 'marketing'
  | 'maintenance_repairs'
  | 'administration'
  | 'professional_fees'
  | 'technology'
  | 'bad_debt'
  | 'rent'
  | 'depreciation'
  | 'amortization'
  | 'interest'
  | 'other_expense';

export interface FinancialStatement {
  period: FinancialPeriod;
  facility: {
    id: string;
    name: string;
    beds: number;
  };

  // Revenue
  revenue: {
    items: RevenueLineItem[];
    totalGrossRevenue: number;
    contractualAdjustments: number;
    badDebt: number;
    charityCare: number;
    totalNetRevenue: number;
  };

  // Expenses
  expenses: {
    items: ExpenseLineItem[];
    totalLaborExpense: number;
    totalNonLaborExpense: number;
    totalOperatingExpense: number;
  };

  // Calculated metrics
  metrics: {
    ebitdar: number;
    ebitdarMargin: number;
    ebitda: number;
    ebitdaMargin: number;
    noi: number;
    noiMargin: number;
    netIncome: number;
    netIncomeMargin: number;
    revenuePerBed: number;
    expensePerBed: number;
    revenuePerPatientDay: number;
    expensePerPatientDay: number;
    laborCostPercent: number;
  };

  // Patient days
  patientDays: {
    total: number;
    byPayer: Record<string, number>;
  };
}

export interface NormalizedFinancials {
  original: FinancialStatement;
  normalized: FinancialStatement;

  adjustments: NormalizationAdjustment[];

  // Comparison to benchmarks
  benchmarkComparison: {
    revenuePerPatientDay: { value: number; benchmark: number; variance: number; rating: string };
    laborCostPercent: { value: number; benchmark: number; variance: number; rating: string };
    ebitdarMargin: { value: number; benchmark: number; variance: number; rating: string };
    occupancy: { value: number; benchmark: number; variance: number; rating: string };
  };
}

export interface NormalizationAdjustment {
  category: string;
  description: string;
  originalAmount: number;
  adjustedAmount: number;
  adjustmentAmount: number;
  reason: string;
}

// =============================================================================
// VALUATION TYPES
// =============================================================================

export interface ValuationInput {
  facility: FacilityProfile;
  cmsData?: CMSData;
  operatingMetrics?: OperatingMetrics;
  financials?: NormalizedFinancials;
  marketData?: MarketData;
  comparableSales?: ComparableSale[];
}

export interface MarketData {
  region: string;
  state: string;
  msa?: string;

  // Demographics
  population65Plus: number;
  population65PlusGrowth: number;
  population85Plus: number;
  population85PlusGrowth: number;

  // Market metrics
  marketOccupancy: number;
  supplyGrowthRate: number;
  demandGrowthRate: number;
  absorptionRate: number;

  // Competition
  competitorCount: number;
  competitorBeds: number;
  marketConcentration: number;

  // Reimbursement
  medicaidRate: number;
  medicaidRateTrend: number;

  // Economic
  medianHouseholdIncome: number;
  unemploymentRate: number;
  povertyRate: number;
}

export interface ComparableSale {
  id: string;
  propertyName: string;
  address: {
    city: string;
    state: string;
  };
  assetType: AssetType;

  // Sale details
  saleDate: string;
  salePrice: number;
  pricePerBed: number;
  capRate?: number;

  // Property characteristics
  beds: number;
  yearBuilt: number;
  cmsRating?: number;
  occupancyAtSale?: number;
  noiAtSale?: number;

  // Distance and similarity
  distanceMiles?: number;
  similarityScore?: number;
}

export interface ValuationMethod {
  name: string;
  value: number;
  confidence: 'high' | 'medium' | 'low';
  weight: number;
  weightedValue: number;

  inputs: Record<string, number | string>;
  adjustments?: {
    description: string;
    impact: number;
  }[];
}

export interface ValuationResult {
  facilityId: string;
  valuationDate: string;
  assetType: AssetType;

  // Individual method results
  methods: {
    capRate?: ValuationMethod;
    pricePerBed?: ValuationMethod;
    dcf?: ValuationMethod;
    noiMultiple?: ValuationMethod;
    comparableSales?: ValuationMethod;
    replacementCost?: ValuationMethod;
  };

  // Reconciled value
  reconciledValue: number;
  valuePerBed: number;
  impliedCapRate: number;

  // Range
  valueLow: number;
  valueMid: number;
  valueHigh: number;

  // Confidence
  overallConfidence: 'high' | 'medium' | 'low';
  confidenceFactors: string[];

  // Sensitivity
  sensitivity?: {
    capRateSensitivity: { capRate: number; value: number }[];
    occupancySensitivity: { occupancy: number; value: number }[];
    noiSensitivity: { noiChange: number; value: number }[];
  };
}

// =============================================================================
// RISK TYPES
// =============================================================================

export interface RiskFactor {
  category: RiskCategory;
  name: string;
  score: number; // 0-100
  weight: number;
  weightedScore: number;
  severity: 'critical' | 'high' | 'elevated' | 'moderate' | 'low';
  details: string;
  dataSource: string;
  recommendation?: string;
}

export type RiskCategory =
  | 'regulatory'
  | 'operational'
  | 'financial'
  | 'market'
  | 'reputational'
  | 'legal'
  | 'environmental'
  | 'technology';

export interface RiskAssessment {
  facilityId: string;
  assessmentDate: string;

  // Overall score
  overallScore: number; // 0-100, higher = more risk
  overallRating: 'critical' | 'high' | 'elevated' | 'moderate' | 'low' | 'very_low';

  // Category scores
  categoryScores: Record<RiskCategory, {
    score: number;
    weight: number;
    weightedScore: number;
    factors: RiskFactor[];
  }>;

  // Deal breakers
  dealBreakers: {
    triggered: boolean;
    items: {
      rule: string;
      threshold: number | string;
      actual: number | string;
      triggered: boolean;
    }[];
  };

  // Key risks
  keyRisks: RiskFactor[];

  // Mitigants
  mitigants: {
    risk: string;
    mitigant: string;
    effectiveness: 'high' | 'medium' | 'low';
  }[];

  // Recommendations
  recommendations: string[];

  // Due diligence focus areas
  dueDiligenceFocus: string[];
}

// =============================================================================
// DOCUMENT EXTRACTION TYPES
// =============================================================================

export interface ExtractedDocument {
  id: string;
  filename: string;
  documentType: DocumentType;
  uploadedAt: string;
  processedAt?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';

  // Extracted content
  rawText?: string;
  pages?: number;

  // Structured extractions
  extractedData?: Record<string, unknown>;

  // Confidence
  extractionConfidence?: number;

  // Errors
  errors?: string[];
}

export type DocumentType =
  | 'offering_memorandum'
  | 'rent_roll'
  | 'trailing_12'
  | 'historical_pnl'
  | 'medicare_cost_report'
  | 'survey_report'
  | 'lease_abstract'
  | 'environmental_report'
  | 'appraisal'
  | 'capital_expenditure'
  | 'census_report'
  | 'staffing_report'
  | 'quality_report'
  | 'other';

export interface ExtractionTemplate {
  documentType: DocumentType;
  fields: ExtractionField[];
}

export interface ExtractionField {
  name: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'percentage' | 'boolean' | 'array' | 'object';
  required: boolean;
  aliases?: string[]; // Alternative names to look for
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  location?: {
    page?: number;
    section?: string;
    nearText?: string[];
  };
}

export interface TableExtraction {
  tableId: string;
  page: number;
  headers: string[];
  rows: string[][];
  confidence: number;
  mappedTo?: string; // Which data structure this maps to
}

// =============================================================================
// ANALYSIS RESULT TYPES
// =============================================================================

export interface DealAnalysis {
  dealId: string;
  facilityId: string;
  analysisDate: string;
  version: number;
  status: 'draft' | 'in_progress' | 'complete' | 'approved';

  // Components
  facilityProfile: FacilityProfile;
  cmsData?: CMSData;
  operatingMetrics: OperatingMetrics;
  financials: NormalizedFinancials;
  valuation: ValuationResult;
  riskAssessment: RiskAssessment;

  // Recommendation
  recommendation: 'pursue' | 'conditional' | 'pass';
  recommendationRationale: string[];

  // Key metrics summary
  keyMetrics: {
    askingPrice?: number;
    valuedPrice: number;
    pricePerBed: number;
    impliedCapRate: number;
    goingInYield: number;
    occupancy: number;
    cmsRating?: number;
    riskScore: number;
    ebitdarMargin: number;
  };

  // Proforma
  proforma?: ProformaProjection;

  // Audit trail
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface ProformaProjection {
  scenarioName: string;
  scenarioType: 'baseline' | 'upside' | 'downside' | 'turnaround';

  holdPeriod: number;
  acquisitionPrice: number;

  // Annual projections
  years: {
    year: number;
    revenue: number;
    expenses: number;
    noi: number;
    capex: number;
    debtService: number;
    cashFlow: number;
  }[];

  // Exit
  exitYear: number;
  exitNOI: number;
  exitCapRate: number;
  exitValue: number;

  // Returns
  returns: {
    irr: number;
    equityMultiple: number;
    cashOnCash: number[];
    averageCashOnCash: number;
  };
}
