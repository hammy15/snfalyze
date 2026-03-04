// =============================================================================
// DUAL-BRAIN ANALYSIS TYPES — Newo (Operations) + Dev (Strategy)
// =============================================================================

import type { AnalysisInput } from '../engine';

// =============================================================================
// BRAIN IDENTITY
// =============================================================================

export type BrainId = 'newo' | 'dev';

export interface BrainConfig {
  id: BrainId;
  name: string;
  description: string;
  color: string; // for frontend
  icon: string;  // lucide icon name
}

export const BRAIN_CONFIGS: Record<BrainId, BrainConfig> = {
  newo: {
    id: 'newo',
    name: 'Newo',
    description: 'Operations & Institutional Knowledge',
    color: '#14b8a6', // teal
    icon: 'Building2',
  },
  dev: {
    id: 'dev',
    name: 'Dev',
    description: 'Strategic Analysis & Deal Intelligence',
    color: '#f97316', // orange
    icon: 'TrendingUp',
  },
};

// =============================================================================
// NEWO RESULT — Left Brain: Operations & Institutional Knowledge
// =============================================================================

export interface NewoResult {
  brainId: 'newo';

  operationalViability: {
    score: number; // 0-100
    assessment: string;
    staffingFeasibility: string;
    censusProjection: string;
    agencyEliminationTimeline: string;
  };

  qualityRemediation: {
    currentState: string;
    targetState: string;
    annualCostEstimate: number;
    timelineMonths: number;
    keyActions: string[];
    deficiencyRate: number | null;
    nationalAvgDeficiencyRate: number;
  };

  staffingAnalysis: {
    currentHPPD: number | null;
    targetHPPD: number;
    currentAgencyPercent: number | null;
    annualStaffingCostDelta: number;
    laborMarketAssessment: string;
    wageGapToMarket: string;
    turnoverRate: number | null;
    nationalAvgTurnover: number;
  };

  platformUpside: {
    managementFeeReduction: number;
    purchasingPowerSavings: number;
    referralNetworkImpact: string;
    billingOptimization: number;
    totalAnnualSynergies: number;
    timelineToRealize: string;
  };

  reimbursementUpside: {
    pdpmGapPercent: number;
    pdpmAnnualUpside: number;
    qualityBonusPerBed: number;
    qualityBonusTotal: number;
    stateProgram: string | null;
    stateProgramUpside: number;
    totalAnnualUpside: number;
    implementationMonths: number;
    confidence: 'high' | 'medium' | 'low';
  };

  operationalRisks: Array<{
    risk: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    mitigationCost: number;
    mitigationTimeline: string;
    cascadiaCanFix: boolean;
  }>;

  recommendation: 'pursue' | 'conditional' | 'pass';
  confidenceScore: number; // 0-100
  narrative: string;
}

// =============================================================================
// DEV RESULT — Right Brain: Strategic Analysis & Deal Intelligence
// =============================================================================

export interface DevResult {
  brainId: 'dev';

  companyIntelligence: {
    ownershipStructure: string;
    ownershipType: 'pe_backed' | 'founder_operated' | 'family_owned' | 'reit_owned' | 'public' | 'nonprofit' | 'unknown';
    peExitWindow: string | null;
    holdPeriodYears: number | null;
    operatorTimeline: string;
    sellerMotivation: 'high' | 'medium' | 'low' | 'unknown';
    sellerMotivationRationale: string;
    ceoStatus: string;
    recentEvents: string[];
  };

  valuationScenarios: {
    bear: ValuationScenario;
    base: ValuationScenario;
    bull: ValuationScenario;
    cascadiaNormalized: ValuationScenario;
  };

  dealStructure: {
    openingBid: number;
    targetPrice: number;
    walkAwayCeiling: number;
    revenueMultiple: { low: number; mid: number; high: number };
    ebitdarMultiple: { low: number; mid: number; high: number };
    perBedValue: { low: number; mid: number; high: number };
    structureNotes: string;
    warranties: string[];
    escrowPercent: number;
    earnoutTerms: string | null;
    conditionsPrecedent: string[];
    txStructure: 'asset_purchase' | 'stock_purchase' | 'merger' | 'management_agreement' | 'unknown';
  };

  ipoImpact: {
    currentCascadiaOps: number;
    postAcquisitionOps: number;
    currentCascadiaRevenue: number;
    postAcquisitionRevenue: number;
    opsThresholdForIPO: number;
    revenueThresholdForIPO: number;
    ipoReadiness: 'ready' | 'close' | 'not_yet';
    narrative: string;
  };

  strategicFit: {
    geographicOverlap: string;
    geographicOverlapScore: number; // 0-100
    clusterPotential: string;
    portfolioDiversification: string;
    competitivePositioning: string;
    overallScore: number; // 0-100
  };

  dueDiligence: Array<{
    item: string;
    priority: 'critical' | 'high' | 'medium';
    category: 'financial' | 'regulatory' | 'operational' | 'legal' | 'real_estate' | 'market';
    rationale: string;
  }>;

  pipelineRanking: {
    tier: 1 | 2 | 3;
    confidenceToClose: number; // 0-100
    actionRequired: string;
    timelineToClose: string;
    comparedTo: string; // context vs other pipeline deals
  };

  strategicRisks: Array<{
    risk: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: 'market' | 'financial' | 'regulatory' | 'integration' | 'ipo_narrative' | 'competitive';
    mitigation: string;
  }>;

  recommendation: 'pursue' | 'conditional' | 'pass';
  confidenceScore: number; // 0-100
  narrative: string;
}

export interface ValuationScenario {
  label: string;
  ebitdar: number;
  ebitdarMargin: number;
  ebitdarMultiple: number;
  value: number;
  perBed: number;
  revenueMultiple: number;
  assumptions: string;
}

// =============================================================================
// TENSION POINTS — Where the Brains Disagree
// =============================================================================

export type TensionCategory =
  | 'recommendation'    // Different pursue/conditional/pass
  | 'confidence'        // >20 point confidence gap
  | 'valuation'         // >15% valuation gap
  | 'risk_assessment'   // Opposing risk severity views
  | 'timeline'          // Different timeline assumptions
  | 'deal_structure';   // Structural disagreement

export interface TensionPoint {
  category: TensionCategory;
  title: string;
  newoPosition: string;
  devPosition: string;
  significance: 'high' | 'medium' | 'low';
  resolutionHint: string;
}

// =============================================================================
// SYNTHESIS — Combined Result
// =============================================================================

export interface SynthesisResult {
  unifiedNarrative: string;
  recommendation: 'pursue' | 'conditional' | 'pass';
  confidence: number; // 0-100
  tensionPoints: TensionPoint[];
  keyInsight: string; // single most important finding from combining both views
  criticalQuestions: {
    whatMustGoRightFirst: string[];
    whatCannotGoWrong: string[];
    whatBreaksThisDeal: string[];
    whatRiskIsUnderpriced: string[];
  };
}

// =============================================================================
// DUAL-BRAIN RESULT — Top-Level Output
// =============================================================================

export interface DualBrainResult {
  newo: NewoResult;
  dev: DevResult;
  synthesis: SynthesisResult;
  metadata: {
    dealId: string;
    dealName: string;
    analyzedAt: string;
    newoLatencyMs: number;
    devLatencyMs: number;
    synthesisLatencyMs: number;
    totalLatencyMs: number;
  };
}

// =============================================================================
// BRAIN INPUT — Extended deal context for brain-specific analysis
// =============================================================================

export interface BrainInput extends AnalysisInput {
  /** Knowledge context injected into the system prompt */
  knowledgeContext?: string;
  /** Previous analysis results for this deal (for learning) */
  previousAnalyses?: Array<{
    date: string;
    recommendation: string;
    confidence: number;
  }>;
}
