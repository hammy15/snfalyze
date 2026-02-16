// =============================================================================
// INSTITUTIONAL BENCHMARKS — Cascadia Healthcare Intelligence
// Extracted from 150+ institutional knowledge files (OpenClaw bot)
// =============================================================================

// =============================================================================
// GEOGRAPHIC CAP RATE RANGES
// =============================================================================

export type Region = 'northeast' | 'southeast' | 'midwest' | 'southwest' | 'west_coast' | 'northwest';

export interface CapRateRange {
  low: number;
  high: number;
  notes: string;
}

export const GEOGRAPHIC_CAP_RATES: Record<Region, Record<string, CapRateRange>> = {
  northeast: {
    SNF: { low: 0.085, high: 0.115, notes: 'High regulatory barriers, strong unions, premium labor' },
    ALF: { low: 0.055, high: 0.075, notes: 'Quality-focused performance-based contracting' },
  },
  southeast: {
    SNF: { low: 0.075, high: 0.09, notes: 'Growth demographics, expanding MA penetration' },
    ALF: { low: 0.055, high: 0.07, notes: 'Emerging provider networks, cost-sensitive' },
  },
  midwest: {
    SNF: { low: 0.075, high: 0.095, notes: 'Value markets, established networks, cost pressure' },
    ALF: { low: 0.06, high: 0.075, notes: 'Mature relationships, rural access challenges' },
  },
  southwest: {
    SNF: { low: 0.07, high: 0.09, notes: 'Business-friendly regulatory, growing population' },
    ALF: { low: 0.055, high: 0.07, notes: 'Sun Belt migration, new development activity' },
  },
  west_coast: {
    SNF: { low: 0.055, high: 0.075, notes: 'Supply constraints, premium reimbursement, innovation' },
    ALF: { low: 0.04, high: 0.06, notes: 'High-barrier markets, 30-50% premium' },
  },
  northwest: {
    SNF: { low: 0.07, high: 0.09, notes: 'Smaller markets, less institutional competition' },
    ALF: { low: 0.055, high: 0.07, notes: 'Growing senior populations, limited supply' },
  },
};

// =============================================================================
// VALUATION MULTIPLES BY MARKET TIER
// =============================================================================

export type MarketTier = 'premium' | 'growth' | 'value';

export interface ValuationMultiples {
  revenueMultiple: { low: number; high: number };
  ebitdaMultiple: { low: number; high: number };
  pricePerBed: { low: number; high: number };
  description: string;
}

export const SNF_VALUATION_MULTIPLES: Record<MarketTier, ValuationMultiples> = {
  premium: {
    revenueMultiple: { low: 1.2, high: 1.8 },
    ebitdaMultiple: { low: 8, high: 12 },
    pricePerBed: { low: 25000, high: 40000 },
    description: 'Gateway markets, high-barrier-to-entry, institutional quality',
  },
  growth: {
    revenueMultiple: { low: 0.8, high: 1.4 },
    ebitdaMultiple: { low: 6, high: 9 },
    pricePerBed: { low: 15000, high: 30000 },
    description: 'Expanding demographics, moderate competition, stabilizing operations',
  },
  value: {
    revenueMultiple: { low: 0.6, high: 1.2 },
    ebitdaMultiple: { low: 4, high: 7 },
    pricePerBed: { low: 10000, high: 20000 },
    description: 'Rural/secondary markets, turnaround plays, succession-driven',
  },
};

export const ALF_VALUATION_MULTIPLES: Record<MarketTier, ValuationMultiples> = {
  premium: {
    revenueMultiple: { low: 2.0, high: 3.5 },
    ebitdaMultiple: { low: 12, high: 18 },
    pricePerBed: { low: 175000, high: 300000 },
    description: 'West Coast, major metros, Class A product',
  },
  growth: {
    revenueMultiple: { low: 1.4, high: 2.2 },
    ebitdaMultiple: { low: 8, high: 14 },
    pricePerBed: { low: 100000, high: 175000 },
    description: 'Sun Belt, secondary metros, strong occupancy trends',
  },
  value: {
    revenueMultiple: { low: 0.8, high: 1.5 },
    ebitdaMultiple: { low: 5, high: 9 },
    pricePerBed: { low: 75000, high: 125000 },
    description: 'Southeast tertiary, older product, repositioning opportunity',
  },
};

// =============================================================================
// OPERATIONAL PERFORMANCE TIERS
// =============================================================================

export type OperationalTier = 'strong' | 'average' | 'weak';

export interface OperationalBenchmarks {
  revenuePerBedDay: { min: number; max: number };
  occupancy: { min: number; max: number };
  ebitdarMargin: { min: number; max: number };
  laborCostPercent: { min: number; max: number };
  agencyPercent: { min: number; max: number };
  hppd: { min: number; max: number };
  description: string;
}

export const SNF_OPERATIONAL_TIERS: Record<OperationalTier, OperationalBenchmarks> = {
  strong: {
    revenuePerBedDay: { min: 150, max: 999 },
    occupancy: { min: 95, max: 100 },
    ebitdarMargin: { min: 20, max: 40 },
    laborCostPercent: { min: 40, max: 52 },
    agencyPercent: { min: 0, max: 3 },
    hppd: { min: 4.5, max: 6.0 },
    description: 'Top-quartile operator, institutional quality, premium valuation',
  },
  average: {
    revenuePerBedDay: { min: 100, max: 150 },
    occupancy: { min: 80, max: 95 },
    ebitdarMargin: { min: 10, max: 20 },
    laborCostPercent: { min: 52, max: 62 },
    agencyPercent: { min: 3, max: 10 },
    hppd: { min: 3.5, max: 4.5 },
    description: 'Market-rate operator, standard multiples, improvement potential',
  },
  weak: {
    revenuePerBedDay: { min: 0, max: 100 },
    occupancy: { min: 0, max: 80 },
    ebitdarMargin: { min: -10, max: 10 },
    laborCostPercent: { min: 62, max: 80 },
    agencyPercent: { min: 10, max: 50 },
    hppd: { min: 2.5, max: 3.5 },
    description: 'Distressed or turnaround candidate, value pricing, execution risk',
  },
};

// =============================================================================
// CON STATE REGULATORY DATA
// =============================================================================

export interface CONStateData {
  hasCON: boolean;
  investmentScore: number; // 1-10 (higher = more attractive despite CON)
  timelineMonths: { fast: number; standard: number; extended: number };
  applicationCost: { low: number; high: number };
  approvalRate: number; // 0-1
  reformRisk: 'high' | 'moderate' | 'low';
  notes: string;
}

export const CON_STATE_DATA: Record<string, CONStateData> = {
  FL: { hasCON: true, investmentScore: 8.7, timelineMonths: { fast: 3, standard: 6, extended: 12 }, applicationCost: { low: 50000, high: 100000 }, approvalRate: 0.82, reformRisk: 'low', notes: 'Strong growth demographics, business-friendly' },
  SC: { hasCON: true, investmentScore: 8.4, timelineMonths: { fast: 3, standard: 8, extended: 14 }, applicationCost: { low: 45000, high: 90000 }, approvalRate: 0.78, reformRisk: 'low', notes: 'Growing retirement destination' },
  VA: { hasCON: true, investmentScore: 8.1, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 60000, high: 120000 }, approvalRate: 0.75, reformRisk: 'moderate', notes: 'Mature market, moderate regulatory' },
  NY: { hasCON: true, investmentScore: 6.5, timelineMonths: { fast: 6, standard: 12, extended: 18 }, applicationCost: { low: 100000, high: 150000 }, approvalRate: 0.65, reformRisk: 'moderate', notes: 'Complex regulatory, high returns if approved' },
  CT: { hasCON: true, investmentScore: 6.8, timelineMonths: { fast: 4, standard: 8, extended: 14 }, applicationCost: { low: 60000, high: 110000 }, approvalRate: 0.72, reformRisk: 'moderate', notes: 'Northeast premium, regulatory complexity' },
  GA: { hasCON: true, investmentScore: 7.9, timelineMonths: { fast: 3, standard: 7, extended: 12 }, applicationCost: { low: 50000, high: 95000 }, approvalRate: 0.80, reformRisk: 'low', notes: 'High growth, aging population tailwinds' },
  NC: { hasCON: true, investmentScore: 7.5, timelineMonths: { fast: 4, standard: 8, extended: 14 }, applicationCost: { low: 55000, high: 100000 }, approvalRate: 0.76, reformRisk: 'low', notes: 'Growing metros, moderate regulation' },
  TN: { hasCON: true, investmentScore: 7.2, timelineMonths: { fast: 3, standard: 7, extended: 12 }, applicationCost: { low: 50000, high: 90000 }, approvalRate: 0.78, reformRisk: 'moderate', notes: 'Central location, growing healthcare hub' },
  AL: { hasCON: true, investmentScore: 6.8, timelineMonths: { fast: 3, standard: 8, extended: 14 }, applicationCost: { low: 45000, high: 85000 }, approvalRate: 0.74, reformRisk: 'low', notes: 'Limited supply, aging demographics' },
  MS: { hasCON: true, investmentScore: 6.2, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 45000, high: 80000 }, approvalRate: 0.70, reformRisk: 'low', notes: 'Medicaid-heavy, limited competition' },
  WV: { hasCON: true, investmentScore: 5.8, timelineMonths: { fast: 4, standard: 10, extended: 16 }, applicationCost: { low: 50000, high: 90000 }, approvalRate: 0.68, reformRisk: 'moderate', notes: 'Declining population, regulatory complexity' },
  ME: { hasCON: true, investmentScore: 6.0, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 55000, high: 95000 }, approvalRate: 0.70, reformRisk: 'moderate', notes: 'Aging population, limited supply' },
  VT: { hasCON: true, investmentScore: 5.5, timelineMonths: { fast: 5, standard: 10, extended: 16 }, applicationCost: { low: 60000, high: 100000 }, approvalRate: 0.65, reformRisk: 'moderate', notes: 'Small market, strict regulation' },
  RI: { hasCON: true, investmentScore: 6.2, timelineMonths: { fast: 4, standard: 9, extended: 14 }, applicationCost: { low: 55000, high: 95000 }, approvalRate: 0.72, reformRisk: 'moderate', notes: 'Small market, established networks' },
  HI: { hasCON: true, investmentScore: 6.0, timelineMonths: { fast: 5, standard: 10, extended: 18 }, applicationCost: { low: 70000, high: 130000 }, approvalRate: 0.60, reformRisk: 'low', notes: 'Isolated market, premium pricing' },
  MD: { hasCON: true, investmentScore: 7.0, timelineMonths: { fast: 4, standard: 8, extended: 14 }, applicationCost: { low: 65000, high: 110000 }, approvalRate: 0.73, reformRisk: 'moderate', notes: 'Unique all-payer rate system' },
  NJ: { hasCON: true, investmentScore: 6.8, timelineMonths: { fast: 5, standard: 10, extended: 16 }, applicationCost: { low: 75000, high: 130000 }, approvalRate: 0.70, reformRisk: 'moderate', notes: 'High-cost market, dense competition' },
  DC: { hasCON: true, investmentScore: 6.5, timelineMonths: { fast: 4, standard: 8, extended: 12 }, applicationCost: { low: 60000, high: 100000 }, approvalRate: 0.72, reformRisk: 'low', notes: 'Limited supply, high demand' },
  KY: { hasCON: true, investmentScore: 6.5, timelineMonths: { fast: 3, standard: 8, extended: 14 }, applicationCost: { low: 45000, high: 85000 }, approvalRate: 0.75, reformRisk: 'low', notes: 'Growing elderly population' },
  LA: { hasCON: true, investmentScore: 6.3, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 50000, high: 90000 }, approvalRate: 0.72, reformRisk: 'low', notes: 'Medicaid expansion impacts' },
  MO: { hasCON: true, investmentScore: 6.8, timelineMonths: { fast: 3, standard: 7, extended: 12 }, applicationCost: { low: 45000, high: 80000 }, approvalRate: 0.78, reformRisk: 'moderate', notes: 'Value market, moderate regulation' },
  MT: { hasCON: true, investmentScore: 5.5, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 45000, high: 80000 }, approvalRate: 0.70, reformRisk: 'low', notes: 'Rural, limited infrastructure' },
  NE: { hasCON: true, investmentScore: 6.0, timelineMonths: { fast: 3, standard: 8, extended: 13 }, applicationCost: { low: 45000, high: 80000 }, approvalRate: 0.75, reformRisk: 'low', notes: 'Stable market, aging rural population' },
  OR: { hasCON: true, investmentScore: 7.0, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 55000, high: 100000 }, approvalRate: 0.72, reformRisk: 'moderate', notes: 'West Coast premium, progressive regulation' },
  WA: { hasCON: true, investmentScore: 7.2, timelineMonths: { fast: 4, standard: 8, extended: 14 }, applicationCost: { low: 60000, high: 110000 }, approvalRate: 0.74, reformRisk: 'moderate', notes: 'Growing metros, tech-forward' },
  MI: { hasCON: true, investmentScore: 6.5, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 55000, high: 95000 }, approvalRate: 0.72, reformRisk: 'moderate', notes: 'Established market, urban/rural divide' },
  IL: { hasCON: true, investmentScore: 6.8, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 65000, high: 120000 }, approvalRate: 0.70, reformRisk: 'moderate', notes: 'Major metro, complex regulation' },
  MN: { hasCON: true, investmentScore: 6.5, timelineMonths: { fast: 4, standard: 9, extended: 14 }, applicationCost: { low: 55000, high: 95000 }, approvalRate: 0.73, reformRisk: 'moderate', notes: 'Strong healthcare sector, aging population' },
  MA: { hasCON: true, investmentScore: 6.3, timelineMonths: { fast: 5, standard: 10, extended: 16 }, applicationCost: { low: 80000, high: 140000 }, approvalRate: 0.65, reformRisk: 'moderate', notes: 'Premium market, heavy regulation' },
  OH: { hasCON: true, investmentScore: 6.8, timelineMonths: { fast: 3, standard: 8, extended: 13 }, applicationCost: { low: 50000, high: 90000 }, approvalRate: 0.76, reformRisk: 'moderate', notes: 'Large market, value opportunities' },
  AK: { hasCON: true, investmentScore: 5.0, timelineMonths: { fast: 5, standard: 10, extended: 18 }, applicationCost: { low: 60000, high: 110000 }, approvalRate: 0.60, reformRisk: 'low', notes: 'Isolated market, high costs' },
  DE: { hasCON: true, investmentScore: 6.5, timelineMonths: { fast: 4, standard: 8, extended: 13 }, applicationCost: { low: 55000, high: 95000 }, approvalRate: 0.74, reformRisk: 'moderate', notes: 'Small market, business-friendly' },
  NH: { hasCON: true, investmentScore: 6.0, timelineMonths: { fast: 4, standard: 9, extended: 15 }, applicationCost: { low: 55000, high: 95000 }, approvalRate: 0.70, reformRisk: 'moderate', notes: 'Aging demographics, limited supply' },
};

export function isCONState(state: string): boolean {
  return state?.toUpperCase() in CON_STATE_DATA;
}

export function getCONData(state: string): CONStateData | null {
  return CON_STATE_DATA[state?.toUpperCase()] || null;
}

// =============================================================================
// REIMBURSEMENT OPTIMIZATION
// =============================================================================

export interface ReimbursementOptimization {
  pdpmPotential: { low: number; high: number }; // % revenue increase
  medicaidSupplementPerBed: { low: number; high: number };
  qualityBonusPerBed: { conservative: { low: number; high: number }; aggressive: { low: number; high: number } };
  totalOptimizationRange: { low: number; high: number }; // % revenue increase
}

export const REIMBURSEMENT_OPTIMIZATION: ReimbursementOptimization = {
  pdpmPotential: { low: 0.10, high: 0.15 },
  medicaidSupplementPerBed: { low: 500, high: 2000 },
  qualityBonusPerBed: {
    conservative: { low: 4500, high: 10400 },
    aggressive: { low: 6500, high: 13500 },
  },
  totalOptimizationRange: { low: 0.12, high: 0.30 },
};

export interface StateReimbursementProgram {
  name: string;
  annualPool?: string;
  perBedBenefit: { low: number; high: number };
  requirements: string;
}

export const STATE_REIMBURSEMENT_PROGRAMS: Record<string, StateReimbursementProgram> = {
  TX: {
    name: 'LTCQIP (Long-Term Care Quality Incentive Program)',
    annualPool: '$50M',
    perBedBenefit: { low: 750, high: 2100 },
    requirements: 'Quality metrics scoring across MDS measures, Five-Star rating, infection control, staff retention',
  },
  CA: {
    name: 'Quality Assurance Fee (QAF)',
    perBedBenefit: { low: 500, high: 14400 },
    requirements: 'Nursing hours, staff turnover rates, satisfaction scores, regulatory compliance',
  },
  NY: {
    name: 'Quality Pool Distribution',
    perBedBenefit: { low: 600, high: 1800 },
    requirements: 'Quality metrics, efficiency measures, patient outcomes',
  },
  OH: {
    name: 'Quality Incentive Program',
    perBedBenefit: { low: 400, high: 1500 },
    requirements: 'MDS quality measures, occupancy thresholds',
  },
  IL: {
    name: 'Quality Add-on',
    perBedBenefit: { low: 500, high: 1600 },
    requirements: 'CMS star rating, staffing levels',
  },
};

// =============================================================================
// QUALITY BONUS REVENUE IMPACT
// =============================================================================

export interface QualityRevenueImpact {
  starRating: number;
  revenuePerBed: { low: number; high: number };
  investmentRequired: { low: number; high: number };
  roi: { low: number; high: number }; // percentage
  paybackMonths: { low: number; high: number };
}

export const QUALITY_REVENUE_IMPACT: QualityRevenueImpact[] = [
  { starRating: 5, revenuePerBed: { low: 2000, high: 4000 }, investmentRequired: { low: 0, high: 50000 }, roi: { low: 200, high: 400 }, paybackMonths: { low: 3, high: 6 } },
  { starRating: 4, revenuePerBed: { low: 1500, high: 3000 }, investmentRequired: { low: 50000, high: 150000 }, roi: { low: 150, high: 300 }, paybackMonths: { low: 6, high: 12 } },
  { starRating: 3, revenuePerBed: { low: 800, high: 1500 }, investmentRequired: { low: 100000, high: 250000 }, roi: { low: 100, high: 200 }, paybackMonths: { low: 9, high: 15 } },
  { starRating: 2, revenuePerBed: { low: 4500, high: 10400 }, investmentRequired: { low: 200000, high: 400000 }, roi: { low: 125, high: 200 }, paybackMonths: { low: 12, high: 18 } },
  { starRating: 1, revenuePerBed: { low: 6500, high: 13500 }, investmentRequired: { low: 300000, high: 500000 }, roi: { low: 170, high: 270 }, paybackMonths: { low: 12, high: 24 } },
];

export function getQualityRevenueImpact(currentRating: number): QualityRevenueImpact | undefined {
  return QUALITY_REVENUE_IMPACT.find((q) => q.starRating === currentRating);
}

// =============================================================================
// HMO / MEDICARE ADVANTAGE CONTRACT BENCHMARKS
// =============================================================================

export interface MAContractBenchmarks {
  pmpmRate: { low: number; high: number }; // per-member-per-month
  episodeRates: {
    shortStay: { low: number; high: number };
    mediumStay: { low: number; high: number };
    longStay: { low: number; high: number };
  };
  qualityPremium: number; // multiplier for 5-star facilities
  fiveStarRatePremium: { low: number; high: number }; // % above 3-star
}

export const MA_CONTRACT_BENCHMARKS: MAContractBenchmarks = {
  pmpmRate: { low: 85, high: 125 },
  episodeRates: {
    shortStay: { low: 8500, high: 15000 },
    mediumStay: { low: 18000, high: 28000 },
    longStay: { low: 35000, high: 55000 },
  },
  qualityPremium: 1.20, // 5-star gets 20% premium
  fiveStarRatePremium: { low: 0.15, high: 0.25 },
};

// =============================================================================
// BUYER INTELLIGENCE
// =============================================================================

export interface BuyerProfile {
  name: string;
  type: 'pe' | 'reit' | 'strategic';
  dealSizeRange: { min: number; max: number }; // millions
  irrTarget: { low: number; high: number }; // percentage
  riskAppetite: 'conservative' | 'moderate' | 'aggressive' | 'opportunistic';
  assetFocus: string[];
  geographicPreference: string;
  notes: string;
}

export const BUYER_PROFILES: BuyerProfile[] = [
  // Private Equity
  { name: 'Formation Capital', type: 'pe', dealSizeRange: { min: 25, max: 150 }, irrTarget: { low: 15, high: 20 }, riskAppetite: 'moderate', assetFocus: ['SNF', 'ALF'], geographicPreference: 'National', notes: 'Specialized healthcare RE, platform building, operator partnerships' },
  { name: 'Carlyle Group', type: 'pe', dealSizeRange: { min: 100, max: 500 }, irrTarget: { low: 15, high: 22 }, riskAppetite: 'moderate', assetFocus: ['SNF', 'ALF', 'ILF'], geographicPreference: 'National', notes: 'Large-scale platforms, operational improvement thesis' },
  { name: 'TPG Capital', type: 'pe', dealSizeRange: { min: 75, max: 400 }, irrTarget: { low: 15, high: 20 }, riskAppetite: 'moderate', assetFocus: ['SNF', 'ALF'], geographicPreference: 'National', notes: 'Growth-oriented, operational improvement, technology integration' },
  { name: 'KKR & Co.', type: 'pe', dealSizeRange: { min: 100, max: 500 }, irrTarget: { low: 12, high: 18 }, riskAppetite: 'moderate', assetFocus: ['SNF', 'ALF', 'ILF'], geographicPreference: 'National', notes: 'Platform building, 12-18% IRR targets, long hold periods' },
  { name: 'Apollo Global', type: 'pe', dealSizeRange: { min: 50, max: 300 }, irrTarget: { low: 18, high: 25 }, riskAppetite: 'opportunistic', assetFocus: ['SNF'], geographicPreference: 'National', notes: 'Distressed situations, higher yield, shorter holds' },

  // REITs
  { name: 'Welltower (WELL)', type: 'reit', dealSizeRange: { min: 50, max: 500 }, irrTarget: { low: 5.5, high: 7.5 }, riskAppetite: 'conservative', assetFocus: ['ALF', 'ILF', 'SNF'], geographicPreference: 'Gateway markets', notes: '$60B+ portfolio, premium senior housing, tight caps, quality focus' },
  { name: 'Ventas (VTR)', type: 'reit', dealSizeRange: { min: 30, max: 400 }, irrTarget: { low: 6, high: 8 }, riskAppetite: 'moderate', assetFocus: ['ALF', 'SNF', 'ILF'], geographicPreference: 'National', notes: 'Diversified healthcare RE, moderate risk appetite, RIDEA structures' },
  { name: 'Omega Healthcare (OHI)', type: 'reit', dealSizeRange: { min: 20, max: 200 }, irrTarget: { low: 8, high: 10 }, riskAppetite: 'moderate', assetFocus: ['SNF'], geographicPreference: 'National', notes: 'Traditional SNF focus, yield-driven, triple-net leases' },
  { name: 'Sabra Health Care (SBRA)', type: 'reit', dealSizeRange: { min: 10, max: 100 }, irrTarget: { low: 7, high: 9.5 }, riskAppetite: 'moderate', assetFocus: ['SNF', 'ALF'], geographicPreference: 'National', notes: 'Value-add repositioning, smaller deal sizes' },

  // Strategic
  { name: 'Ensign Group', type: 'strategic', dealSizeRange: { min: 5, max: 50 }, irrTarget: { low: 15, high: 25 }, riskAppetite: 'aggressive', assetFocus: ['SNF'], geographicPreference: 'Western US', notes: 'Turnaround specialist, cluster acquisition strategy, proven ops platform' },
  { name: 'Genesis Healthcare', type: 'strategic', dealSizeRange: { min: 10, max: 100 }, irrTarget: { low: 12, high: 18 }, riskAppetite: 'moderate', assetFocus: ['SNF'], geographicPreference: 'Eastern US', notes: 'Portfolio expansion, integration-focused' },
  { name: 'National HealthCare (NHC)', type: 'strategic', dealSizeRange: { min: 5, max: 75 }, irrTarget: { low: 12, high: 16 }, riskAppetite: 'conservative', assetFocus: ['SNF', 'ALF'], geographicPreference: 'Southeast', notes: 'Quality-first operator, long-term holds, selective growth' },
];

// =============================================================================
// ALF / MEMORY CARE SPECIFIC DATA
// =============================================================================

export const ALF_MEMORY_CARE = {
  memoryCareRevenuePremium: { low: 0.15, high: 0.40 }, // 15-40% over traditional AL
  capRates: {
    tier1: { low: 0.04, high: 0.06 },
    tier2: { low: 0.055, high: 0.07 },
    tier3: { low: 0.065, high: 0.08 },
  },
  perUnitValues: {
    westCoast: { low: 175000, high: 300000 },
    sunBelt: { low: 100000, high: 175000 },
    southeast: { low: 75000, high: 125000 },
    midwest: { low: 60000, high: 110000 },
  },
  highBarrierPremium: { low: 0.30, high: 0.50 }, // 30-50% premium in constrained markets
};

// =============================================================================
// DEAL STRUCTURE BENCHMARKS
// =============================================================================

export const DEAL_STRUCTURE = {
  dueDiligencePeriod: { institutional: { low: 30, high: 90 }, individual: { low: 45, high: 120 } },
  transactionCosts: { low: 0.03, high: 0.05 }, // 3-5% of purchase price
  typicalFinancing: {
    commercialBank: { ltv: { low: 0.65, high: 0.75 }, terms: '25-30yr amort, 5-7yr term' },
    lifeInsurance: { ltv: { low: 0.60, high: 0.70 }, terms: '25-30yr amort, 10yr term' },
    cmbs: { ltv: { low: 0.65, high: 0.75 }, terms: '25-30yr amort, 10yr term, IO available' },
    privateDebt: { ltv: { low: 0.70, high: 0.80 }, terms: '3-5yr bridge, transitional' },
    fhaBacked: { ltv: { low: 0.80, high: 0.85 }, terms: '35yr amort, owner-operator only' },
  },
  dscrMinimum: 1.25,
  sellerMotivationFactors: ['succession', 'distress', 'strategic_exit', 'regulatory_pressure', 'operator_fatigue'],
};

// =============================================================================
// MARKET DEMOGRAPHICS
// =============================================================================

export const MARKET_DEMOGRAPHICS = {
  seniorGrowthRate65Plus: 0.035, // 3.5% annually
  seniorGrowthRate85Plus: 0.042, // 4.2% annually
  familyOwnedOperatorPercent: 0.55, // 55% of market
  estimatedSuccessionDealFlow: { low: 8e9, high: 12e9 }, // $8-12B
  buyerCompetitionBreakdown: {
    privateEquity: 0.40,
    reits: 0.35,
    strategicBuyers: 0.25,
  },
  consolidationTrend: 'accelerating',
};

// =============================================================================
// ACQUISITION TARGET SCORING
// =============================================================================

export interface TargetScoringWeights {
  strategicFit: number;
  financialPerformance: number;
  operationalExcellence: number;
  marketDynamics: number;
  transactionFeasibility: number;
}

export const TARGET_SCORING_WEIGHTS: TargetScoringWeights = {
  strategicFit: 0.30,
  financialPerformance: 0.25,
  operationalExcellence: 0.20,
  marketDynamics: 0.15,
  transactionFeasibility: 0.10,
};

export const TARGET_TIER_THRESHOLDS = {
  tier1: 8.0, // Immediate pursuit
  tier2: 6.0, // Opportunistic
  tier3: 0,   // Monitor / pass
};

// =============================================================================
// STAFFING BENCHMARKS
// =============================================================================

export const STAFFING_BENCHMARKS = {
  rnHoursPerResidentDay: {
    fiveStarThreshold: 0.75,
    optimizationTarget: 0.85,
    costPerResidentDay: { low: 8, high: 12 },
    revenueReturn: { low: 15, high: 20 },
  },
  totalNursingHours: {
    fiveStarThreshold: 4.1,
    optimizationTarget: 4.5,
    costPerResidentDay: { low: 25, high: 35 },
    qualityBonus: { low: 40, high: 55 },
  },
  turnover: {
    industryAverage: 0.50,
    topQuartile: 0.35,
    costPerTurnover: { low: 8000, high: 12000 },
    retentionInvestment: { low: 2000, high: 5000 },
  },
};

// =============================================================================
// HELPER: Get region from state
// =============================================================================

const STATE_TO_REGION: Record<string, Region> = {
  NY: 'northeast', CA: 'west_coast', IL: 'midwest', TX: 'southwest', DC: 'northeast',
  MA: 'northeast', AZ: 'southwest', GA: 'southeast', FL: 'southeast', PA: 'northeast',
  CO: 'southwest', WA: 'northwest', OR: 'northwest', VA: 'southeast', NJ: 'northeast',
  CT: 'northeast', MD: 'northeast', MN: 'midwest', NC: 'southeast', TN: 'southeast',
  OH: 'midwest', ID: 'northwest', MT: 'northwest', WY: 'northwest', ND: 'midwest',
  SD: 'midwest', NE: 'midwest', KS: 'midwest', IA: 'midwest', MO: 'midwest',
  AR: 'southeast', MS: 'southeast', AL: 'southeast', LA: 'southeast', OK: 'southwest',
  NM: 'southwest', NV: 'west_coast', UT: 'southwest', WI: 'midwest', IN: 'midwest',
  MI: 'midwest', KY: 'southeast', WV: 'southeast', SC: 'southeast', ME: 'northeast',
  NH: 'northeast', VT: 'northeast', RI: 'northeast', DE: 'northeast', HI: 'west_coast',
  AK: 'northwest',
};

export function getRegion(state: string): Region {
  return STATE_TO_REGION[state?.toUpperCase()] || 'midwest';
}

export function getGeographicCapRate(state: string, assetType: string): CapRateRange | null {
  const region = getRegion(state);
  const type = assetType?.toUpperCase() || 'SNF';
  return GEOGRAPHIC_CAP_RATES[region]?.[type] || null;
}

export function getMarketTier(state: string): MarketTier {
  const tier1States = ['NY', 'CA', 'IL', 'TX', 'DC', 'MA'];
  const tier2States = ['AZ', 'GA', 'FL', 'PA', 'CO', 'WA', 'OR', 'VA', 'NJ', 'CT', 'MD', 'MN', 'NC', 'TN', 'OH', 'HI'];
  const s = state?.toUpperCase();
  if (tier1States.includes(s)) return 'premium';
  if (tier2States.includes(s)) return 'growth';
  return 'value';
}
