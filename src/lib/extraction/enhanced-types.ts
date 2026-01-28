/**
 * Enhanced Extraction Types
 *
 * Extended data types for extracting debt, existing rent, capex needs,
 * survey deficiencies, and other data needed for comprehensive valuation.
 */

// =============================================================================
// DEBT & FINANCING EXTRACTION
// =============================================================================

export interface ExtractedDebtSchedule {
  facilityId?: string;
  facilityName?: string;
  extractedFrom: string;  // Document source
  confidence: number;

  // Current debt
  currentDebt: DebtItem[];
  totalDebtBalance: number;
  weightedAvgInterestRate: number;
  totalAnnualDebtService: number;

  // Maturity analysis
  nearestMaturityDate?: string;
  debtMaturingIn12Months: number;
  debtMaturingIn24Months: number;
}

export interface DebtItem {
  lenderName?: string;
  loanType: 'hud' | 'conventional' | 'cmbs' | 'bridge' | 'mezzanine' | 'other';
  originalBalance: number;
  currentBalance: number;
  interestRate: number;
  isFixedRate: boolean;
  maturityDate?: string;
  monthlyPayment?: number;
  annualDebtService?: number;
  isAssumed?: boolean;
  prepaymentPenalty?: string;
  ltvRatio?: number;
  dscrRatio?: number;
  confidence: number;
}

// =============================================================================
// EXISTING RENT/LEASE EXTRACTION
// =============================================================================

export interface ExtractedLeaseTerms {
  facilityId?: string;
  facilityName?: string;
  extractedFrom: string;
  confidence: number;

  // Current lease
  currentAnnualRent: number;
  currentMonthlyRent: number;
  rentPerBed?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  remainingTermMonths?: number;

  // Landlord info
  landlordName?: string;
  landlordType?: 'reit' | 'pe' | 'individual' | 'other';

  // Structure
  leaseStructure: 'triple_net' | 'modified_gross' | 'gross' | 'unknown';

  // Escalation
  escalationType?: 'fixed' | 'cpi' | 'greater_of' | 'none';
  escalationRate?: number;
  nextEscalationDate?: string;

  // Options
  renewalOptions?: number;
  renewalTermYears?: number;
  purchaseOptionExists?: boolean;
  purchaseOptionTerms?: string;

  // Coverage
  impliedCoverageRatio?: number;  // Calculated from EBITDAR / Rent

  // Historical rent
  historicalRent?: { year: number; annualRent: number }[];
}

// =============================================================================
// CAPEX & RESERVE EXTRACTION
// =============================================================================

export interface ExtractedCapexNeeds {
  facilityId?: string;
  facilityName?: string;
  extractedFrom: string;
  confidence: number;

  // Summary
  totalImmediateCapex: number;      // Year 1 needs
  totalDeferredCapex: number;       // Years 2-5
  totalCompetitiveCapex: number;    // Nice-to-have
  totalCapexNeeds: number;

  // By category
  capexByCategory: CapexCategory[];

  // Life safety / compliance
  lifeSafetyItems: CapexItem[];
  complianceItems: CapexItem[];

  // Reserve analysis
  currentReserveBalance?: number;
  requiredReservePerBed?: number;
  reserveDeficiency?: number;

  // Source documents
  hasReserveStudy: boolean;
  reserveStudyDate?: string;
  hasPcaReport: boolean;
  pcaReportDate?: string;
}

export interface CapexCategory {
  category: string;
  immediateAmount: number;
  deferredAmount: number;
  competitiveAmount: number;
  totalAmount: number;
  items: CapexItem[];
}

export interface CapexItem {
  description: string;
  category: 'roof' | 'hvac' | 'elevator' | 'fire_safety' | 'ada' | 'plumbing' |
            'electrical' | 'flooring' | 'windows' | 'parking' | 'kitchen' |
            'beds_furniture' | 'technology' | 'other';
  priority: 'immediate' | 'deferred' | 'competitive';
  estimatedCost: number;
  estimatedYear?: number;
  usefulLife?: number;
  isLifeSafety: boolean;
  isCompliance: boolean;
  notes?: string;
  confidence: number;
}

// =============================================================================
// SURVEY & COMPLIANCE EXTRACTION
// =============================================================================

export interface ExtractedSurveyData {
  facilityId?: string;
  facilityName?: string;
  extractedFrom: string;
  confidence: number;

  // Latest survey summary
  latestSurveyDate?: string;
  surveyType: 'annual' | 'complaint' | 'focused' | 'revisit' | 'unknown';
  totalDeficiencies: number;

  // Deficiency breakdown
  deficiencyBySeverity: {
    immediateJeopardy: number;      // Level J, K, L
    actualHarm: number;             // Level G, H, I
    potentialHarm: number;          // Level D, E, F
    minimalHarm: number;            // Level A, B, C
  };

  // Specific deficiencies
  deficiencies: SurveyDeficiency[];

  // Compliance status
  hasImmediateJeopardy: boolean;
  hasCmp: boolean;                  // Civil Monetary Penalty
  cmpAmount?: number;
  hasPaymentDenial: boolean;
  isOnPoc: boolean;                 // Plan of Correction
  pocDueDate?: string;

  // Historical context
  priorYearDeficiencies?: number;
  deficiencyTrend: 'improving' | 'stable' | 'worsening' | 'unknown';

  // Risk scoring
  surveyRiskScore: number;          // 0-100, higher = more risk
}

export interface SurveyDeficiency {
  fTag: string;                     // e.g., "F880"
  description: string;
  scope: 'isolated' | 'pattern' | 'widespread';
  severity: 'minimal' | 'potential_harm' | 'actual_harm' | 'immediate_jeopardy';
  level: string;                    // e.g., "D", "G", "J"
  category: string;                 // e.g., "Infection Control", "Quality of Care"
  surveyDate: string;
  isRepeat: boolean;
  correctionDate?: string;
  cmpAssociated: boolean;
  cmpAmount?: number;
  confidence: number;
}

// =============================================================================
// STAFFING EXTRACTION
// =============================================================================

export interface ExtractedStaffingData {
  facilityId?: string;
  facilityName?: string;
  extractedFrom: string;
  confidence: number;

  // HPPD (Hours Per Patient Day)
  totalNursingHppd: number;
  rnHppd: number;
  lpnHppd: number;
  cnaHppd: number;

  // Staffing counts
  totalFtes: number;
  rnFtes: number;
  lpnFtes: number;
  cnaFtes: number;
  otherFtes: number;

  // Agency usage
  agencyPercent: number;
  agencyCost: number;
  coreStaffingCost: number;
  totalStaffingCost: number;

  // Turnover
  annualTurnoverRate?: number;
  averageTenure?: number;

  // Compliance
  meetsStateMandates: boolean;
  stateMandatedHppd?: number;
  hppdDeficiency?: number;

  // Weekend staffing (per CMS requirements)
  weekendRnHppd?: number;
  weekendTotalHppd?: number;
}

// =============================================================================
// MARKET DATA EXTRACTION
// =============================================================================

export interface ExtractedMarketData {
  facilityId?: string;
  state: string;
  county?: string;
  msa?: string;
  extractedFrom: string;
  confidence: number;

  // Reimbursement rates
  medicaidDailyRate: number;
  medicaidRateEffectiveDate?: string;
  medicaidRateTrend?: 'increasing' | 'stable' | 'decreasing';
  projectedMedicaidRateChange?: number;

  // Market occupancy
  marketOccupancyRate?: number;
  competitorCount?: number;

  // Demographics
  seniorPopulation65Plus?: number;
  seniorPopulationGrowthRate?: number;

  // Labor market
  medianNursingWage?: number;
  nursingShortageIndex?: number;  // Higher = more shortage
}

// =============================================================================
// COMPOSITE FACILITY PROFILE
// =============================================================================

export interface EnhancedFacilityProfile {
  // Basic info
  facilityId: string;
  facilityName: string;
  beds: number;
  state: string;

  // Financial data (from existing extraction)
  ttmRevenue: number;
  ttmExpenses: number;
  ttmEbitdar: number;
  ttmNoi: number;

  // Enhanced extractions
  debtSchedule?: ExtractedDebtSchedule;
  leaseTerms?: ExtractedLeaseTerms;
  capexNeeds?: ExtractedCapexNeeds;
  surveyData?: ExtractedSurveyData;
  staffingData?: ExtractedStaffingData;
  marketData?: ExtractedMarketData;

  // Calculated risk metrics
  riskProfile: FacilityRiskProfile;
}

export interface FacilityRiskProfile {
  // Overall score (0-100, higher = more risk)
  overallRiskScore: number;
  riskCategory: 'low' | 'moderate' | 'high' | 'critical';

  // Component scores
  financialRiskScore: number;      // Based on coverage, margins
  operationalRiskScore: number;    // Based on staffing, occupancy
  complianceRiskScore: number;     // Based on surveys, CMS rating
  marketRiskScore: number;         // Based on reimbursement, competition
  capitalRiskScore: number;        // Based on capex needs, building age

  // Risk factors
  riskFactors: RiskFactor[];

  // Risk-adjusted cap rate premium
  suggestedCapRatePremium: number;  // Add to base cap rate
}

export interface RiskFactor {
  category: 'financial' | 'operational' | 'compliance' | 'market' | 'capital';
  factor: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  capRateImpact: number;  // bps to add/subtract
}

// =============================================================================
// EXTRACTION PATTERNS FOR NEW DATA TYPES
// =============================================================================

export const DEBT_PATTERNS = {
  balance: /(?:current|outstanding|principal)\s*balance[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  interestRate: /(?:interest|rate)[:\s]*([\d.]+)\s*%/i,
  maturity: /(?:maturity|matures?)[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  lender: /(?:lender|bank|lien holder)[:\s]*([^\n,]+)/i,
  monthlyPayment: /(?:monthly|p&i)\s*(?:payment)?[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
};

export const LEASE_PATTERNS = {
  monthlyRent: /(?:monthly|base)\s*rent[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  annualRent: /(?:annual|yearly)\s*rent[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  leaseExpiry: /(?:expir|terminat|end)[^\n]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  escalation: /(?:escalat|increase)[:\s]*([\d.]+)\s*%/i,
  tripleNet: /triple\s*net|nnn/i,
};

export const CAPEX_PATTERNS = {
  totalCapex: /(?:total|estimated)\s*(?:capex|capital)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
  immediateNeeds: /(?:immediate|year\s*1|urgent)[^\n]*\$?([\d,]+(?:\.\d{2})?)/i,
  roof: /roof[^\n]*\$?([\d,]+(?:\.\d{2})?)/i,
  hvac: /hvac|heating|cooling[^\n]*\$?([\d,]+(?:\.\d{2})?)/i,
  elevator: /elevator[^\n]*\$?([\d,]+(?:\.\d{2})?)/i,
};

export const SURVEY_PATTERNS = {
  totalDeficiencies: /(?:total|number\s*of)\s*deficienc[^\n]*(\d+)/i,
  surveyDate: /(?:survey|inspection)\s*date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  fTag: /F[-\s]?(\d{3,4})/gi,
  cmp: /(?:cmp|civil\s*monetary\s*penalty)[:\s]*\$?([\d,]+(?:\.\d{2})?)/i,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Calculate facility risk score based on extracted data
 */
export function calculateFacilityRiskScore(profile: Partial<EnhancedFacilityProfile>): FacilityRiskProfile {
  const riskFactors: RiskFactor[] = [];
  let totalRisk = 0;
  let factorCount = 0;

  // Financial risk (coverage ratio)
  if (profile.leaseTerms?.impliedCoverageRatio !== undefined) {
    const coverage = profile.leaseTerms.impliedCoverageRatio;
    if (coverage < 1.2) {
      riskFactors.push({
        category: 'financial',
        factor: 'Low Coverage Ratio',
        description: `Coverage ratio of ${coverage.toFixed(2)}x is below 1.20x threshold`,
        impact: 'high',
        capRateImpact: 100,
      });
      totalRisk += 80;
    } else if (coverage < 1.35) {
      riskFactors.push({
        category: 'financial',
        factor: 'Moderate Coverage Ratio',
        description: `Coverage ratio of ${coverage.toFixed(2)}x is below 1.35x target`,
        impact: 'medium',
        capRateImpact: 50,
      });
      totalRisk += 50;
    } else {
      totalRisk += 20;
    }
    factorCount++;
  }

  // Compliance risk (survey deficiencies)
  if (profile.surveyData) {
    const survey = profile.surveyData;
    if (survey.hasImmediateJeopardy) {
      riskFactors.push({
        category: 'compliance',
        factor: 'Immediate Jeopardy',
        description: 'Facility has immediate jeopardy citation',
        impact: 'high',
        capRateImpact: 150,
      });
      totalRisk += 95;
    } else if (survey.totalDeficiencies > 15) {
      riskFactors.push({
        category: 'compliance',
        factor: 'High Deficiency Count',
        description: `${survey.totalDeficiencies} total deficiencies`,
        impact: 'high',
        capRateImpact: 75,
      });
      totalRisk += 70;
    } else if (survey.totalDeficiencies > 8) {
      riskFactors.push({
        category: 'compliance',
        factor: 'Moderate Deficiency Count',
        description: `${survey.totalDeficiencies} total deficiencies`,
        impact: 'medium',
        capRateImpact: 35,
      });
      totalRisk += 45;
    } else {
      totalRisk += 15;
    }
    factorCount++;
  }

  // Capital risk (capex needs)
  if (profile.capexNeeds) {
    const capex = profile.capexNeeds;
    const capexPerBed = profile.beds ? capex.totalImmediateCapex / profile.beds : 0;
    if (capexPerBed > 15000) {
      riskFactors.push({
        category: 'capital',
        factor: 'High Immediate CapEx',
        description: `$${capexPerBed.toLocaleString()} per bed in immediate capital needs`,
        impact: 'high',
        capRateImpact: 50,
      });
      totalRisk += 65;
    } else if (capexPerBed > 8000) {
      riskFactors.push({
        category: 'capital',
        factor: 'Moderate Immediate CapEx',
        description: `$${capexPerBed.toLocaleString()} per bed in immediate capital needs`,
        impact: 'medium',
        capRateImpact: 25,
      });
      totalRisk += 40;
    } else {
      totalRisk += 15;
    }
    factorCount++;
  }

  // Operational risk (staffing)
  if (profile.staffingData) {
    const staffing = profile.staffingData;
    if (staffing.agencyPercent > 0.20) {
      riskFactors.push({
        category: 'operational',
        factor: 'High Agency Usage',
        description: `${(staffing.agencyPercent * 100).toFixed(1)}% agency staffing`,
        impact: 'high',
        capRateImpact: 50,
      });
      totalRisk += 60;
    } else if (staffing.agencyPercent > 0.10) {
      riskFactors.push({
        category: 'operational',
        factor: 'Elevated Agency Usage',
        description: `${(staffing.agencyPercent * 100).toFixed(1)}% agency staffing`,
        impact: 'medium',
        capRateImpact: 25,
      });
      totalRisk += 35;
    } else {
      totalRisk += 10;
    }
    factorCount++;
  }

  // Calculate overall score
  const overallRiskScore = factorCount > 0 ? Math.round(totalRisk / factorCount) : 50;

  // Determine category
  const riskCategory: 'low' | 'moderate' | 'high' | 'critical' =
    overallRiskScore >= 75 ? 'critical' :
    overallRiskScore >= 55 ? 'high' :
    overallRiskScore >= 35 ? 'moderate' : 'low';

  // Calculate cap rate premium
  const suggestedCapRatePremium = riskFactors.reduce((sum, f) => sum + f.capRateImpact, 0) / 100;

  return {
    overallRiskScore,
    riskCategory,
    financialRiskScore: 50,  // Would calculate from specific data
    operationalRiskScore: 50,
    complianceRiskScore: 50,
    marketRiskScore: 50,
    capitalRiskScore: 50,
    riskFactors,
    suggestedCapRatePremium,
  };
}
