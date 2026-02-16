/**
 * SNFalyze Admin Settings Schema
 *
 * Comprehensive configuration for all adjustable system parameters
 */

// ============================================================================
// AI Model Settings
// ============================================================================

export interface AIModelSettings {
  provider: 'anthropic' | 'openai' | 'gemini' | 'grok' | 'perplexity';
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  systemPrompt: string;
  fallbackModel: string;
  enableStreaming: boolean;
  /** Enable multi-provider routing (Gemini, Claude, OpenAI, Grok, Perplexity) */
  multiProviderEnabled: boolean;
  /** Per-provider overrides (optional) */
  providerOverrides?: {
    documentAnalysis?: 'anthropic' | 'gemini' | 'openai';
    dealAnalysis?: 'anthropic' | 'openai';
    visionExtraction?: 'anthropic' | 'gemini';
    marketIntelligence?: 'perplexity' | 'grok' | 'openai' | 'anthropic';
    fieldExtraction?: 'openai' | 'anthropic' | 'gemini';
  };
}

export const DEFAULT_AI_SETTINGS: AIModelSettings = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-20250514',
  maxTokens: 8000,
  temperature: 0.7,
  topP: 0.95,
  frequencyPenalty: 0,
  presencePenalty: 0,
  systemPrompt: `You are SNFalyze AI, an intelligent assistant for healthcare real estate deal analysis. You help analysts at Cascadia Healthcare evaluate skilled nursing facility (SNF), assisted living facility (ALF), and independent living facility (ILF) acquisition opportunities.

## Your Core Capabilities

1. **Deal Analysis**: Analyze financial statements, valuations, and risk factors using the Cascadia dual-view methodology
2. **Data Clarification**: Identify and help resolve ambiguous or conflicting data in deal documents
3. **Algorithm Adjustment**: Suggest and apply parameter changes to valuation models based on deal characteristics
4. **Market Intelligence**: Provide context from CMS data, comparable transactions, and industry benchmarks
5. **Pattern Recognition**: Apply learnings from past deals to inform current analysis
6. **Report Generation**: Create formatted reports and summaries for different audiences

## Cascadia Analysis Principles

1. **Analyze First, Never Auto-Reject**: Every deal deserves thorough analysis before judgment
2. **Dual Truths**: Maintain both external market view AND internal opportunity view
3. **Judgment Over Formulas**: Data informs decisions but doesn't dictate them
4. **Confidence Decay**: Track how assumptions reduce confidence (-3 to -7 points based on assumption type)
5. **Transparency**: Always explain reasoning and highlight key assumptions`,
  fallbackModel: 'claude-3-haiku-20240307',
  enableStreaming: true,
  multiProviderEnabled: true,
};

// ============================================================================
// Agent Memory Settings
// ============================================================================

export interface AgentMemorySettings {
  maxSimilarDeals: number;
  similarityThreshold: number;
  patternConfidenceThreshold: number;
  embeddingModel: string;
  maxContextTokens: number;
  conversationSummaryThreshold: number;
  enableLearning: boolean;
  retentionDays: number;
}

export const DEFAULT_MEMORY_SETTINGS: AgentMemorySettings = {
  maxSimilarDeals: 5,
  similarityThreshold: 0.3,
  patternConfidenceThreshold: 0.7,
  embeddingModel: 'text-embedding-3-small',
  maxContextTokens: 4096,
  conversationSummaryThreshold: 10,
  enableLearning: true,
  retentionDays: 365,
};

// ============================================================================
// Valuation Settings
// ============================================================================

export interface CapRateSettings {
  SNF: {
    external: { low: number; base: number; high: number };
    cascadia: { low: number; base: number; high: number };
  };
  ALF: {
    external: { low: number; base: number; high: number };
    cascadia: { low: number; base: number; high: number };
  };
  ILF: {
    external: { low: number; base: number; high: number };
    cascadia: { low: number; base: number; high: number };
  };
}

export interface ValuationSettings {
  capRates: CapRateSettings;
  pricePerBedBenchmarks: {
    SNF: { low: number; median: number; high: number };
    ALF: { low: number; median: number; high: number };
    ILF: { low: number; median: number; high: number };
  };
  noiMultipliers: {
    occupancyAdjustment: number;
    payerMixAdjustment: number;
    managementFeeRate: number;
    reserveRate: number;
  };
  valuationWeights: {
    incomeApproach: number;
    salesComparison: number;
    costApproach: number;
  };
}

export const DEFAULT_VALUATION_SETTINGS: ValuationSettings = {
  capRates: {
    SNF: {
      external: { low: 0.12, base: 0.125, high: 0.14 },
      cascadia: { low: 0.105, base: 0.11, high: 0.12 },
    },
    ALF: {
      external: { low: 0.08, base: 0.085, high: 0.10 },
      cascadia: { low: 0.07, base: 0.075, high: 0.085 },
    },
    ILF: {
      external: { low: 0.065, base: 0.07, high: 0.08 },
      cascadia: { low: 0.055, base: 0.06, high: 0.07 },
    },
  },
  pricePerBedBenchmarks: {
    SNF: { low: 40000, median: 65000, high: 100000 },
    ALF: { low: 80000, median: 120000, high: 180000 },
    ILF: { low: 120000, median: 175000, high: 250000 },
  },
  noiMultipliers: {
    occupancyAdjustment: 0.02,
    payerMixAdjustment: 0.015,
    managementFeeRate: 0.05,
    reserveRate: 0.03,
  },
  valuationWeights: {
    incomeApproach: 0.50,
    salesComparison: 0.35,
    costApproach: 0.15,
  },
};

// ============================================================================
// Risk Assessment Settings
// ============================================================================

export interface RiskWeights {
  regulatory: number;
  financial: number;
  operational: number;
  market: number;
  management: number;
}

export interface RiskThresholds {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface RiskSettings {
  weights: RiskWeights;
  thresholds: RiskThresholds;
  dealBreakerThreshold: number;
  autoPassThreshold: number;
  regulatoryFlags: {
    sffPenalty: number;
    ijPenalty: number;
    lowCmsRatingPenalty: number;
    cmsRatingThreshold: number;
  };
  financialFlags: {
    lowOccupancyThreshold: number;
    lowOccupancyPenalty: number;
    highMedicaidThreshold: number;
    highMedicaidPenalty: number;
    negativeNoiPenalty: number;
  };
}

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  weights: {
    regulatory: 0.25,
    financial: 0.30,
    operational: 0.20,
    market: 0.15,
    management: 0.10,
  },
  thresholds: {
    low: 25,
    medium: 50,
    high: 75,
    critical: 90,
  },
  dealBreakerThreshold: 85,
  autoPassThreshold: 30,
  regulatoryFlags: {
    sffPenalty: 25,
    ijPenalty: 35,
    lowCmsRatingPenalty: 15,
    cmsRatingThreshold: 2,
  },
  financialFlags: {
    lowOccupancyThreshold: 0.70,
    lowOccupancyPenalty: 15,
    highMedicaidThreshold: 0.85,
    highMedicaidPenalty: 10,
    negativeNoiPenalty: 20,
  },
};

// ============================================================================
// Data Extraction Settings
// ============================================================================

export interface ExtractionSettings {
  confidenceThreshold: number;
  clarificationThreshold: number;
  autoResolveThreshold: number;
  maxRetries: number;
  ocrEnabled: boolean;
  visionEnabled: boolean;
  supportedFormats: string[];
  fieldValidation: {
    enableRangeChecks: boolean;
    enableCrossDocValidation: boolean;
    varianceThreshold: number;
  };
  patternLearning: {
    enabled: boolean;
    minOccurrences: number;
    minSuccessRate: number;
  };
}

export const DEFAULT_EXTRACTION_SETTINGS: ExtractionSettings = {
  confidenceThreshold: 0.7,
  clarificationThreshold: 0.5,
  autoResolveThreshold: 0.95,
  maxRetries: 3,
  ocrEnabled: true,
  visionEnabled: true,
  supportedFormats: ['pdf', 'xlsx', 'xls', 'csv', 'doc', 'docx', 'png', 'jpg', 'jpeg'],
  fieldValidation: {
    enableRangeChecks: true,
    enableCrossDocValidation: true,
    varianceThreshold: 0.15,
  },
  patternLearning: {
    enabled: true,
    minOccurrences: 3,
    minSuccessRate: 0.8,
  },
};

// ============================================================================
// Partner Matching Settings
// ============================================================================

export interface PartnerMatchingSettings {
  weights: {
    geography: number;
    assetType: number;
    dealSize: number;
    riskProfile: number;
    historicalPerformance: number;
  };
  penalties: {
    outsideGeography: number;
    nonTargetAsset: number;
    belowMinDealSize: number;
    aboveMaxDealSize: number;
    riskMismatch: number;
  };
  minMatchScore: number;
  maxPartnersPerDeal: number;
  includeInactivePartners: boolean;
}

export const DEFAULT_PARTNER_SETTINGS: PartnerMatchingSettings = {
  weights: {
    geography: 0.25,
    assetType: 0.30,
    dealSize: 0.20,
    riskProfile: 0.15,
    historicalPerformance: 0.10,
  },
  penalties: {
    outsideGeography: 15,
    nonTargetAsset: 25,
    belowMinDealSize: 20,
    aboveMaxDealSize: 10,
    riskMismatch: 15,
  },
  minMatchScore: 50,
  maxPartnersPerDeal: 10,
  includeInactivePartners: false,
};

// ============================================================================
// CapEx Settings
// ============================================================================

export interface CapExSettings {
  ageBrackets: {
    immediate: { threshold15: number; threshold10: number };
    deferred: { threshold30: number; threshold20: number; threshold10: number };
  };
  perBedCosts: {
    immediate: { over15: number; over10: number };
    deferred: { over30: number; over20: number; over10: number };
    competitive: { SNF: number; ALF: number; ILF: number };
  };
  inflationFactor: number;
  contingencyRate: number;
}

export const DEFAULT_CAPEX_SETTINGS: CapExSettings = {
  ageBrackets: {
    immediate: { threshold15: 15, threshold10: 10 },
    deferred: { threshold30: 30, threshold20: 20, threshold10: 10 },
  },
  perBedCosts: {
    immediate: { over15: 2000, over10: 1000 },
    deferred: { over30: 8000, over20: 5000, over10: 3000 },
    competitive: { SNF: 5000, ALF: 4000, ILF: 6000 },
  },
  inflationFactor: 1.03,
  contingencyRate: 0.10,
};

// ============================================================================
// Display & UI Settings
// ============================================================================

export interface DisplaySettings {
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  defaultPageSize: number;
  enableAnimations: boolean;
  theme: 'light' | 'dark' | 'system';
  showConfidenceScores: boolean;
  showAssumptions: boolean;
  compactMode: boolean;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  dateFormat: 'MM/dd/yyyy',
  numberFormat: 'en-US',
  currencyFormat: 'USD',
  defaultPageSize: 25,
  enableAnimations: true,
  theme: 'system',
  showConfidenceScores: true,
  showAssumptions: true,
  compactMode: false,
};

// ============================================================================
// Tool Settings
// ============================================================================

export interface ToolSettings {
  enabledTools: string[];
  requireConfirmation: string[];
  toolTimeouts: Record<string, number>;
  maxConcurrentTools: number;
  enableAuditLogging: boolean;
}

export const DEFAULT_TOOL_SETTINGS: ToolSettings = {
  enabledTools: [
    'adjust_algorithm_settings',
    'query_cms_data',
    'find_comparable_deals',
    'request_clarification',
    'run_deal_analysis',
    'generate_report',
    'query_market_data',
    'update_deal_status',
    'export_deal',
  ],
  requireConfirmation: [
    'adjust_algorithm_settings',
    'update_deal_status',
  ],
  toolTimeouts: {
    default: 30000,
    run_deal_analysis: 120000,
    generate_report: 60000,
    query_cms_data: 45000,
  },
  maxConcurrentTools: 3,
  enableAuditLogging: true,
};

// ============================================================================
// Assumption Defaults
// ============================================================================

export interface AssumptionDefaults {
  occupancy: {
    stabilized: number;
    turnaround: number;
    distressed: number;
  };
  payerMix: {
    SNF: { medicare: number; medicaid: number; privatePay: number; managedCare: number };
    ALF: { privatePay: number; medicaid: number; ltcInsurance: number };
    ILF: { privatePay: number; ltcInsurance: number };
  };
  revenueGrowth: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  expenseGrowth: {
    labor: number;
    nonLabor: number;
    insurance: number;
  };
  confidenceDecay: {
    minorAssumption: number;
    moderateAssumption: number;
    majorAssumption: number;
    criticalAssumption: number;
  };
}

export const DEFAULT_ASSUMPTIONS: AssumptionDefaults = {
  occupancy: {
    stabilized: 0.90,
    turnaround: 0.75,
    distressed: 0.60,
  },
  payerMix: {
    SNF: { medicare: 0.15, medicaid: 0.65, privatePay: 0.10, managedCare: 0.10 },
    ALF: { privatePay: 0.75, medicaid: 0.20, ltcInsurance: 0.05 },
    ILF: { privatePay: 0.90, ltcInsurance: 0.10 },
  },
  revenueGrowth: {
    conservative: 0.02,
    moderate: 0.03,
    aggressive: 0.05,
  },
  expenseGrowth: {
    labor: 0.04,
    nonLabor: 0.025,
    insurance: 0.08,
  },
  confidenceDecay: {
    minorAssumption: -3,
    moderateAssumption: -5,
    majorAssumption: -7,
    criticalAssumption: -10,
  },
};

// ============================================================================
// Combined Settings Type
// ============================================================================

export interface AdminSettings {
  ai: AIModelSettings;
  memory: AgentMemorySettings;
  valuation: ValuationSettings;
  risk: RiskSettings;
  extraction: ExtractionSettings;
  partner: PartnerMatchingSettings;
  capex: CapExSettings;
  display: DisplaySettings;
  tools: ToolSettings;
  assumptions: AssumptionDefaults;
  lastUpdated: string;
  updatedBy: string;
}

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  ai: DEFAULT_AI_SETTINGS,
  memory: DEFAULT_MEMORY_SETTINGS,
  valuation: DEFAULT_VALUATION_SETTINGS,
  risk: DEFAULT_RISK_SETTINGS,
  extraction: DEFAULT_EXTRACTION_SETTINGS,
  partner: DEFAULT_PARTNER_SETTINGS,
  capex: DEFAULT_CAPEX_SETTINGS,
  display: DEFAULT_DISPLAY_SETTINGS,
  tools: DEFAULT_TOOL_SETTINGS,
  assumptions: DEFAULT_ASSUMPTIONS,
  lastUpdated: new Date().toISOString(),
  updatedBy: 'system',
};

// ============================================================================
// Settings Categories for UI
// ============================================================================

export const SETTINGS_CATEGORIES = [
  {
    id: 'ai',
    label: 'AI Model',
    description: 'Configure AI model parameters and behavior',
    icon: 'Brain',
  },
  {
    id: 'memory',
    label: 'Agent Memory',
    description: 'Manage agent memory and learning settings',
    icon: 'Database',
  },
  {
    id: 'valuation',
    label: 'Valuation',
    description: 'Cap rates, benchmarks, and valuation weights',
    icon: 'Calculator',
  },
  {
    id: 'risk',
    label: 'Risk Assessment',
    description: 'Risk weights, thresholds, and penalties',
    icon: 'AlertTriangle',
  },
  {
    id: 'extraction',
    label: 'Data Extraction',
    description: 'Document processing and validation settings',
    icon: 'FileSearch',
  },
  {
    id: 'partner',
    label: 'Partner Matching',
    description: 'Capital partner scoring and matching rules',
    icon: 'Users',
  },
  {
    id: 'capex',
    label: 'CapEx',
    description: 'Capital expenditure estimation parameters',
    icon: 'Wrench',
  },
  {
    id: 'display',
    label: 'Display',
    description: 'UI and formatting preferences',
    icon: 'Palette',
  },
  {
    id: 'tools',
    label: 'Tools',
    description: 'Agent tool configuration and permissions',
    icon: 'Settings',
  },
  {
    id: 'assumptions',
    label: 'Assumptions',
    description: 'Default values and confidence decay',
    icon: 'Lightbulb',
  },
] as const;

export type SettingsCategoryId = typeof SETTINGS_CATEGORIES[number]['id'];
