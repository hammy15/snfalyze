// Deal Analysis Framework Types
// Based on Cascadia Healthcare's structured deal evaluation process

export type AssetType = 'snf' | 'alf' | 'ilf' | 'hospice';
export type DealSource = 'broker' | 'seller_direct' | 'off_market' | 'auction' | 'other';
export type DealStatus = 'active' | 'under_loi' | 'due_diligence' | 'closed' | 'passed' | 'dead';

export type DealHypothesis =
  | 'stabilized'
  | 'turnaround'
  | 'distressed_fixable'
  | 'value_add'
  | 'development'
  | 'other';

export type AnalysisStage =
  | 'document_understanding'
  | 'financial_reconstruction'
  | 'operating_reality'
  | 'risk_constraints'
  | 'valuation'
  | 'synthesis';

export type StageStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export type AssumptionType = 'minor' | 'census' | 'labor' | 'regulatory' | 'capital' | 'market';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

// Deal Container - the core record for each deal
export interface Deal {
  id: string;
  deal_id: string; // Human-readable ID like "CAS-2024-001"
  name: string;

  // Asset Information
  asset_types: AssetType[];
  is_portfolio: boolean;
  facility_count: number;
  total_beds: number;
  states: string[];

  // Deal Source & Timing
  source: DealSource;
  source_name?: string; // e.g., "Marcus & Millichap", "Direct from Seller"
  received_date: Date;
  response_deadline?: Date;

  // Working Hypothesis
  initial_hypothesis: DealHypothesis;
  current_hypothesis?: DealHypothesis;
  hypothesis_updated_at?: Date;
  hypothesis_notes?: string;

  // Status
  status: DealStatus;
  current_stage: AnalysisStage;

  // Financial Summary (populated during analysis)
  asking_price?: number;
  normalized_t12_revenue?: number;
  normalized_t12_ebitdar?: number;
  implied_cap_rate?: number;

  // Metadata
  created_at: Date;
  updated_at: Date;
  created_by?: string;
  assigned_to?: string[];
}

// Analysis Stage Progress
export interface AnalysisStageProgress {
  id: string;
  deal_id: string;
  stage: AnalysisStage;
  status: StageStatus;
  started_at?: Date;
  completed_at?: Date;
  completed_by?: string;
  notes?: string;
  blockers?: string[];
}

// Assumptions logged during analysis
export interface DealAssumption {
  id: string;
  deal_id: string;
  stage: AnalysisStage;

  type: AssumptionType;
  description: string;
  value?: string; // e.g., "85% occupancy by Month 12"
  rationale?: string;

  confidence: ConfidenceLevel;
  impact: 'high' | 'medium' | 'low';

  created_at: Date;
  created_by?: string;
}

// Documents attached to deal
export interface DealDocument {
  id: string;
  deal_id: string;

  name: string;
  type: 'pdf' | 'excel' | 'csv' | 'image' | 'other';
  category: 'financials' | 'rent_roll' | 'survey' | 'license' | 'lease' | 'other';
  size: number;
  url?: string;

  // Extraction status
  extracted: boolean;
  extraction_confidence?: number;
  extracted_data?: Record<string, any>;

  uploaded_at: Date;
  uploaded_by?: string;
}

// Risk identified during analysis
export interface DealRisk {
  id: string;
  deal_id: string;

  category: 'regulatory' | 'operational' | 'financial' | 'market' | 'legal' | 'physical';
  severity: 'critical' | 'high' | 'medium' | 'low';

  title: string;
  description: string;
  mitigation?: string;

  is_deal_breaker: boolean;

  created_at: Date;
}

// Final synthesis - required for every deal
export interface DealSynthesis {
  id: string;
  deal_id: string;

  // Hypothesis Review
  final_hypothesis: DealHypothesis;
  hypothesis_changed: boolean;
  hypothesis_change_reason?: string;

  // Key Success Factors
  must_go_right_first: string[]; // What must happen first
  cannot_go_wrong: string[]; // Critical success factors
  deal_breakers: string[]; // What kills this deal

  // Valuation
  suggested_price_low: number;
  suggested_price_high: number;
  suggested_starting_point: number;
  valuation_rationale: string;

  // Walk-Away
  walk_away_condition: string;
  walk_away_price?: number;

  // Confidence
  overall_confidence: ConfidenceLevel;
  confidence_factors: string[];

  // Capital Partner View
  capital_partner_concerns: string[];
  capital_partner_price_adjustment?: number;

  // Recommendation
  recommendation: 'pursue' | 'pursue_with_conditions' | 'pass' | 'need_more_info';
  recommendation_summary: string;

  created_at: Date;
  created_by?: string;
}

// Deal Memory - for learning from past deals
export interface DealOutcome {
  id: string;
  deal_id: string;

  // What happened
  outcome: 'won' | 'lost_to_competitor' | 'passed' | 'deal_fell_through' | 'still_active';
  final_price?: number;
  close_date?: Date;

  // Learnings
  what_we_got_right: string[];
  what_we_got_wrong: string[];
  surprises: string[];

  // For future reference
  comparable_deal_tags: string[]; // e.g., "rural_snf", "turnaround", "high_agency"

  created_at: Date;
}

// Stage definitions with descriptions
export const ANALYSIS_STAGES: Record<AnalysisStage, {
  label: string;
  description: string;
  order: number;
  key_questions: string[];
}> = {
  document_understanding: {
    label: 'Document Understanding',
    description: 'Review all provided materials and identify gaps',
    order: 1,
    key_questions: [
      'What documents were provided?',
      'What time periods are covered?',
      'What is missing that we need?',
      'Are the financials seller-prepared or audited?',
    ],
  },
  financial_reconstruction: {
    label: 'Financial Reconstruction',
    description: 'Build normalized T12 and identify distortions',
    order: 2,
    key_questions: [
      'What are the one-time items?',
      'What owner-specific expenses exist?',
      'Is management fee market-rate?',
      'What is the normalized T12 EBITDAR?',
    ],
  },
  operating_reality: {
    label: 'Operating Reality',
    description: 'Assess operational performance and trajectory',
    order: 3,
    key_questions: [
      'What is true occupancy vs. reported?',
      'What is the payer mix trend?',
      'How dependent on agency staffing?',
      'What is the survey/compliance history?',
    ],
  },
  risk_constraints: {
    label: 'Risk & Constraints',
    description: 'Identify deal-breakers and key risks',
    order: 4,
    key_questions: [
      'Any regulatory red flags?',
      'Physical plant concerns?',
      'Market/competitive risks?',
      'Labor market constraints?',
    ],
  },
  valuation: {
    label: 'Valuation',
    description: 'Determine appropriate pricing and structure',
    order: 5,
    key_questions: [
      'What cap rate is appropriate?',
      'How does this compare to recent comps?',
      'What price creates acceptable returns?',
      'What contingencies are needed?',
    ],
  },
  synthesis: {
    label: 'Synthesis & Judgment',
    description: 'Final recommendation and deal terms',
    order: 6,
    key_questions: [
      'Does the hypothesis hold?',
      'What must go right?',
      'What is the walk-away point?',
      'Should we pursue this deal?',
    ],
  },
};

// Hypothesis definitions
export const DEAL_HYPOTHESES: Record<DealHypothesis, {
  label: string;
  description: string;
  typical_characteristics: string[];
}> = {
  stabilized: {
    label: 'Stabilized',
    description: 'Facility performing at or near market potential',
    typical_characteristics: [
      'Occupancy > 85%',
      'Minimal agency usage',
      'Clean survey history',
      'Stable payer mix',
    ],
  },
  turnaround: {
    label: 'Turnaround',
    description: 'Underperforming but fixable with operational improvements',
    typical_characteristics: [
      'Occupancy below market',
      'High agency/labor costs',
      'Recent survey issues',
      'Upside through better operations',
    ],
  },
  distressed_fixable: {
    label: 'Distressed but Fixable',
    description: 'Significant issues but recoverable with capital and effort',
    typical_characteristics: [
      'Low occupancy or census decline',
      'Regulatory concerns',
      'Deferred maintenance',
      'Requires significant investment',
    ],
  },
  value_add: {
    label: 'Value-Add',
    description: 'Opportunity to enhance value through specific improvements',
    typical_characteristics: [
      'Payer mix improvement opportunity',
      'Ancillary service expansion',
      'Operational efficiency gains',
      'Market repositioning',
    ],
  },
  development: {
    label: 'Development/Expansion',
    description: 'New construction or major expansion project',
    typical_characteristics: [
      'Ground-up development',
      'Major addition/renovation',
      'License expansion',
      'Campus development',
    ],
  },
  other: {
    label: 'Other',
    description: 'Does not fit standard categories',
    typical_characteristics: [],
  },
};

// Generate deal ID
export function generateDealId(prefix: string = 'CAS'): string {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${year}-${random}`;
}
