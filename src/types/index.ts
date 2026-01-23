// Core domain types for SNFalyze

export type AssetType = 'SNF' | 'ALF' | 'ILF';

export type DealStatus =
  | 'new'
  | 'analyzing'
  | 'reviewed'
  | 'under_loi'
  | 'due_diligence'
  | 'closed'
  | 'passed';

export type DocumentType =
  | 'financial_statement'
  | 'rent_roll'
  | 'census_report'
  | 'staffing_report'
  | 'survey_report'
  | 'cost_report'
  | 'om_package'
  | 'lease_agreement'
  | 'appraisal'
  | 'environmental'
  | 'other';

export type DocumentStatus =
  | 'uploaded'
  | 'parsing'
  | 'normalizing'
  | 'analyzing'
  | 'complete'
  | 'error';

export type PayorType = 'medicare' | 'medicaid' | 'managed_care' | 'private_pay' | 'other';

export type CapExCategory = 'immediate' | 'deferred' | 'competitive';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Upload state (client-side)
export interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'parsing' | 'normalizing' | 'analyzing' | 'complete' | 'error';
  progress: number;
  type?: string;
  error?: string;
}

// Document & Ingestion
export interface Document {
  id: string;
  dealId: string;
  filename: string;
  type: DocumentType;
  status: DocumentStatus;
  periodStart?: Date;
  periodEnd?: Date;
  facilityId?: string;
  uploadedAt: Date;
  processedAt?: Date;
  extractedData?: Record<string, unknown>;
  rawText?: string;
  errors?: string[];
}

// Financial Data
export interface FinancialPeriod {
  id: string;
  dealId: string;
  facilityId: string;
  periodStart: Date;
  periodEnd: Date;
  isAnnualized: boolean;

  // Revenue
  totalRevenue: number;
  medicareRevenue: number;
  medicaidRevenue: number;
  managedCareRevenue: number;
  privatePayRevenue: number;
  otherRevenue: number;

  // Expenses
  totalExpenses: number;
  laborCost: number;
  coreLabor: number;
  agencyLabor: number;
  foodCost: number;
  suppliesCost: number;
  utilitiesCost: number;
  insuranceCost: number;
  managementFee: number;
  otherExpenses: number;

  // Calculated
  noi: number;
  ebitdar: number;
  normalizedNoi?: number;

  // Census
  licensedBeds: number;
  averageDailyCensus: number;
  occupancyRate: number;

  // Labor
  hppd?: number;
  agencyPercentage?: number;

  // Assumptions
  assumptions: Assumption[];
  confidenceScore: number;
}

export interface Assumption {
  id: string;
  field: string;
  originalValue?: string | number;
  assumedValue: string | number;
  reason: string;
  confidenceImpact: number;
  category: 'minor' | 'census' | 'labor' | 'regulatory';
}

// Facility
export interface Facility {
  id: string;
  dealId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  assetType: AssetType;
  licensedBeds: number;
  certifiedBeds?: number;
  yearBuilt?: number;
  lastRenovation?: number;
  squareFootage?: number;
  acres?: number;

  // Regulatory
  cmsRating?: number;
  healthRating?: number;
  staffingRating?: number;
  qualityRating?: number;
  isSff?: boolean;
  isSffWatch?: boolean;
  hasImmediateJeopardy?: boolean;
  surveyDeficiencies?: SurveyDeficiency[];
}

export interface SurveyDeficiency {
  tag: string;
  scope: string;
  severity: string;
  description: string;
  correctionDate?: Date;
}

// Valuation
export interface Valuation {
  id: string;
  dealId: string;
  facilityId?: string;
  viewType: 'external' | 'cascadia';

  // Value Range
  valueLow: number;
  valueBase: number;
  valueHigh: number;

  // Key Drivers
  capRateLow: number;
  capRateBase: number;
  capRateHigh: number;

  noiUsed: number;
  pricePerBed: number;

  // Offer Guidance
  suggestedOffer: number;
  walkAwayThreshold: number;
  upsideScenario?: UpsideScenario;

  // Risk Assessment
  confidenceScore: number;
  confidenceNarrative: string;

  assumptions: Assumption[];
  createdAt: Date;
}

export interface UpsideScenario {
  description: string;
  potentialValue: number;
  keyActions: string[];
  timelineMonths: number;
  probability: number;
}

// CapEx
export interface CapExItem {
  id: string;
  dealId: string;
  facilityId: string;
  category: CapExCategory;
  description: string;
  estimatedCost: number;
  perBedCost?: number;
  timeline?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
}

export interface CapExSummary {
  immediateTotal: number;
  deferredTotal: number;
  competitiveTotal: number;
  totalCapEx: number;
  perBedTotal: number;
  items: CapExItem[];
  noiImpact: number;
  valuationDiscount: number;
}

// Capital Partner
export interface CapitalPartner {
  id: string;
  name: string;
  type: 'lender' | 'reit' | 'equity';

  // Preferences
  assetTypes: AssetType[];
  geographies: string[];
  minDealSize?: number;
  maxDealSize?: number;
  targetYield?: number;
  maxLtv?: number;

  // Structure
  preferredStructure?: string;
  termPreference?: string;

  // Track Record
  dealHistory: PartnerDealHistory[];
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';

  // Contact
  contactName?: string;
  contactEmail?: string;
  notes?: string;
}

export interface PartnerDealHistory {
  dealName: string;
  dealDate: Date;
  dealSize: number;
  outcome: 'closed' | 'passed' | 'fell_through';
  notes?: string;
}

export interface PartnerMatch {
  partnerId: string;
  partnerName: string;
  matchScore: number;
  expectedYield?: number;
  probabilityOfClose: number;
  concerns: string[];
  strengths: string[];
}

// Deal
export interface Deal {
  id: string;
  name: string;
  status: DealStatus;
  assetType: AssetType;

  // Overview
  askingPrice?: number;
  beds: number;
  facilities: Facility[];

  // Location
  primaryState: string;
  markets: string[];

  // Broker / Seller
  brokerName?: string;
  brokerFirm?: string;
  sellerName?: string;
  brokerCredibilityScore?: number;

  // Analysis
  financials: FinancialPeriod[];
  valuations: Valuation[];
  capEx?: CapExSummary;
  partnerMatches: PartnerMatch[];

  // Memory
  thesis?: string;
  overrides: Override[];
  analogDeals?: string[];

  // Risk
  riskFactors: RiskFactor[];
  dealBreakers: string[];

  // Outputs
  confidenceScore: number;
  analysisNarrative?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  analyzedAt?: Date;
  version: number;
}

export interface Override {
  id: string;
  field: string;
  originalValue: unknown;
  overrideValue: unknown;
  rationale: string;
  overriddenBy: string;
  overriddenAt: Date;
}

export interface RiskFactor {
  category: 'regulatory' | 'labor' | 'census' | 'capital' | 'market' | 'operational';
  description: string;
  severity: 'high' | 'medium' | 'low';
  mitigationStrategy?: string;
  isUnderpriced?: boolean;
}

// Analysis Output (IC-ready)
export interface AnalysisOutput {
  dealId: string;

  // Value Guidance
  valueRange: {
    low: number;
    base: number;
    high: number;
  };
  suggestedOffer: number;
  walkAwayThreshold: number;
  upsideCapture?: UpsideScenario;

  // Confidence
  confidenceScore: number;
  confidenceNarrative: string;

  // Critical Questions
  whatMustGoRightFirst: string[];
  whatCannotGoWrong: string[];
  whatBreaksThisDeal: string[];
  whatRiskIsUnderpriced: string[];

  // Dual View
  externalView: Valuation;
  cascadiaView: Valuation;

  // Partner Simulation
  partnerMatches: PartnerMatch[];
  bestEconomics?: PartnerMatch;
  highestProbabilityClose?: PartnerMatch;

  // Portfolio Context
  portfolioFit?: PortfolioFit;

  // Analogs
  similarDeals: DealAnalog[];

  createdAt: Date;
}

export interface PortfolioFit {
  capitalConcentrationRisk: 'low' | 'medium' | 'high';
  laborBandwidthFit: 'good' | 'stretched' | 'problematic';
  geographicFit: 'core' | 'adjacent' | 'new_market';
  opportunityCostAssessment: string;
  recommendation: string;
}

export interface DealAnalog {
  dealId: string;
  dealName: string;
  similarity: number;
  outcome?: string;
  keyLearning?: string;
}

// Cascadia Chart of Accounts
export interface COAMapping {
  externalTerm: string;
  cascadiaTerm: string;
  category: string;
  subcategory?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warnings?: string[];
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
