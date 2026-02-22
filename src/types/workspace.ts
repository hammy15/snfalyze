// =============================================================================
// 5-Stage Deal Workspace Types
// =============================================================================

export type WorkspaceStageType =
  | 'deal_intake'
  | 'comp_pull'
  | 'pro_forma'
  | 'risk_score'
  | 'investment_memo';

export type WorkspaceStageStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export const WORKSPACE_STAGES: WorkspaceStageConfig[] = [
  {
    id: 'deal_intake',
    order: 1,
    label: 'Deal Intake',
    description: 'Capture facility, financial, and market data',
    icon: 'ClipboardList',
    cilDomain: 'Market Context',
  },
  {
    id: 'comp_pull',
    order: 2,
    label: 'Comp Pull',
    description: 'Transaction comps and operating benchmarks',
    icon: 'BarChart3',
    cilDomain: 'Transaction Data',
  },
  {
    id: 'pro_forma',
    order: 3,
    label: 'Pro Forma',
    description: '5-year financial model with scenario analysis',
    icon: 'Calculator',
    cilDomain: 'Reimbursement Benchmarks',
  },
  {
    id: 'risk_score',
    order: 4,
    label: 'Risk Score',
    description: 'Composite risk assessment across 6 domains',
    icon: 'ShieldAlert',
    cilDomain: 'Regulatory Intelligence',
  },
  {
    id: 'investment_memo',
    order: 5,
    label: 'Investment Memo',
    description: 'Auto-generated investment memorandum',
    icon: 'FileText',
    cilDomain: 'Deal Templates',
  },
];

export interface WorkspaceStageConfig {
  id: WorkspaceStageType;
  order: number;
  label: string;
  description: string;
  icon: string;
  cilDomain: string;
}

// =============================================================================
// Stage Data Shapes
// =============================================================================

export interface WorkspaceStageRecord {
  id: string;
  dealId: string;
  stage: WorkspaceStageType;
  order: number;
  status: WorkspaceStageStatus;
  stageData: Record<string, unknown>;
  completionScore: number;
  validationErrors: string[];
  cilInsights: CILInsight[] | null;
  startedAt: string | null;
  completedAt: string | null;
}

// Stage 1: Deal Intake
export interface IntakeStageData {
  facilityIdentification: {
    facilityName: string;
    ccn: string;
    npiNumber: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    facilityType: 'SNF' | 'ALF' | 'CCRC' | 'SNF_ALF_COMBO';
    licensedBeds: number | null;
    medicareCertifiedBeds: number | null;
    medicaidCertifiedBeds: number | null;
  };
  ownershipDealStructure: {
    currentOwnerName: string;
    ownerType: 'individual' | 'llc' | 'pe_backed' | 'reit' | 'non_profit';
    yearsUnderCurrentOwnership: number | null;
    askingPrice: number | null;
    dealStructure: 'asset_sale' | 'stock_sale' | 'lease' | 'jv';
    realEstateIncluded: boolean;
    sellerFinancingAvailable: boolean;
    estimatedClosingTimeline: '<30_days' | '30_60' | '60_90' | '90_plus' | '';
    sourceOfDeal: 'broker' | 'direct' | 'auction' | 'relationship';
    brokerName: string;
  };
  financialSnapshot: {
    ttmRevenue: number | null;
    ttmEbitda: number | null;
    normalizedEbitda: number | null;
    managementFeeStructure: string;
    ttmTotalCensusAdc: number | null;
    medicareCensusPercent: number | null;
    medicaidCensusPercent: number | null;
    privatePayCensusPercent: number | null;
    revenueYear1: number | null;
    revenueYear2: number | null;
    revenueYear3: number | null;
    ebitdaYear1: number | null;
    ebitdaYear2: number | null;
    ebitdaYear3: number | null;
  };
  operationalSnapshot: {
    cmsOverallRating: number | null;
    cmsStaffingStar: number | null;
    cmsQualityStar: number | null;
    cmsInspectionStar: number | null;
    administratorName: string;
    donName: string;
    totalStaffingFte: number | null;
    agencyStaffPercent: number | null;
    lastSurveyDate: string;
    ijCitationsLast3Years: number | null;
    cmi: number | null;
  };
  marketContext: {
    primaryMarketArea: string;
    marketType: 'urban' | 'suburban' | 'rural';
    population65Plus: number | null;
    knownCompetitors: string;
    marketOccupancyRate: number | null;
    isCONState: boolean;
  };
}

// Stage 2: Comp Pull
export interface CompPullStageData {
  transactionComps: TransactionComp[];
  operatingBenchmarks: OperatingBenchmarks | null;
  marketBenchmarkSummary: MarketBenchmarkSummary | null;
  compFilters: {
    state: string;
    assetType: string;
    bedCountMin: number | null;
    bedCountMax: number | null;
    dateRangeMonths: number;
    starRatingRange: number;
  };
}

export interface TransactionComp {
  id: string;
  facilityName: string;
  state: string;
  marketType: string;
  bedCount: number;
  salePrice: number;
  pricePerBed: number;
  capRate: number | null;
  ebitdaMultiple: number | null;
  payerMix: { medicare: number; medicaid: number; privatePay: number };
  starRating: number | null;
  dealDate: string;
  source: string;
  relevanceScore: number;
  isSelected: boolean;
}

export interface OperatingBenchmarks {
  medicare: {
    adc: number | null;
    revenuePerDay: number | null;
    cmi: number | null;
    expectedCmiAdjustedRate: number | null;
    therapyUtilization: number | null;
    stateAvg: Record<string, number | null>;
    nationalAvg: Record<string, number | null>;
  };
  medicaid: {
    baseRatePerDay: number | null;
    rateTrend: 'improving' | 'flat' | 'declining';
    supplementalPrograms: string[];
    rateAdjustmentTimeline: string;
  };
  quality: {
    starRatingVsState: number | null;
    starRatingVsNational: number | null;
    surveyDeficiencyVsState: number | null;
    staffingHprdVsMinimum: number | null;
  };
  cost: {
    laborCostPerPatientDay: number | null;
    contractLaborPercent: number | null;
    foodCostPerPatientDay: number | null;
    totalOpCostPerPatientDay: number | null;
  };
}

export interface MarketBenchmarkSummary {
  medianPricePerBed: { low: number; high: number };
  medianEbitdaMultiple: { low: number; high: number };
  medianCapRate: { low: number; high: number };
  dealPosition: 'BELOW' | 'AT' | 'ABOVE';
  dataConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  compCount: number;
}

// Stage 3: Pro Forma
export interface ProFormaStageData {
  revenueModel: {
    censusProjections: YearProjection[];
    payerMixRevenue: PayerMixRevenue[];
    enhancementOpportunities: string[];
  };
  expenseModel: {
    laborProjections: LaborProjection[];
    otherOpex: OpexCategory[];
    capexAssumptions: { routinePerBed: number; renovationYear1: number; equipmentReplacement: number };
  };
  scenarios: {
    base: ScenarioResult;
    bull: ScenarioResult;
    bear: ScenarioResult;
  };
  valuationOutput: {
    capRateValuation: number | null;
    ebitdaMultipleValuation: number | null;
    dcfValuation: number | null;
    askingPrice: number | null;
    pricePerBed: number | null;
    cilAssessment: 'PRICED_BELOW' | 'AT' | 'ABOVE';
    negotiationRange: { low: number; high: number };
  };
}

export interface YearProjection {
  year: number;
  occupancy: number;
  adc: number;
  medicareAdc: number;
  medicaidAdc: number;
  privatPayAdc: number;
}

export interface PayerMixRevenue {
  year: number;
  medicareRevenue: number;
  medicaidRevenue: number;
  privatePayRevenue: number;
  totalRevenue: number;
}

export interface LaborProjection {
  year: number;
  nursingCost: number;
  managementCost: number;
  contractLaborCost: number;
  benefitsCost: number;
  totalLabor: number;
}

export interface OpexCategory {
  category: string;
  benchmarkPercent: { low: number; high: number };
  projectedAmount: number;
}

export interface ScenarioResult {
  label: string;
  assumptions: {
    occupancyChange: number;
    cmiChange: number;
    medicaidRateChange: number;
    laborCostChange: number;
  };
  year3Ebitda: number;
  year5Ebitda: number;
  impliedValue: number;
  irr: number;
}

// Stage 4: Risk Score
export interface RiskScoreStageData {
  compositeScore: number;
  rating: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  categories: RiskCategoryScore[];
  dealBreakerFlags: DealBreakerFlag[];
  elevatedRiskItems: RiskItem[];
  strengths: RiskItem[];
  riskAdjustedValuation: {
    originalValue: number;
    adjustedValue: number;
    adjustmentPercent: number;
    adjustmentReason: string;
  } | null;
}

export interface RiskCategoryScore {
  category: 'regulatory' | 'operational' | 'financial' | 'market' | 'ownership_legal' | 'integration';
  label: string;
  score: number;
  weight: number;
  weightedScore: number;
  factors: { name: string; score: number; description: string }[];
}

export interface DealBreakerFlag {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'high';
  recommendation: string;
}

export interface RiskItem {
  id: string;
  category: string;
  description: string;
  detail: string;
}

// Stage 5: Investment Memo
export interface InvestmentMemoStageData {
  memoId: string | null;
  sections: MemoSection[];
  status: 'not_started' | 'generating' | 'draft' | 'review' | 'final';
  lastExportedAt: string | null;
  exportFormat: string | null;
}

export interface MemoSection {
  id: string;
  title: string;
  content: string;
  isGenerated: boolean;
  isEdited: boolean;
  generatedAt: string | null;
}

// CIL (Contextual Intelligence Layer)
export interface CILInsight {
  id: string;
  type: 'info' | 'warning' | 'opportunity' | 'benchmark';
  title: string;
  content: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  stage: WorkspaceStageType;
}

// Workspace State (for the hook)
export interface WorkspaceState {
  dealId: string;
  currentStage: WorkspaceStageType;
  stages: WorkspaceStageRecord[];
  isDirty: boolean;
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
}
