// =============================================================================
// DEAL BREAKERS - Automatic disqualification rules
// =============================================================================

import type { CMSData, OperatingMetrics, NormalizedFinancials, MarketData, FacilityProfile } from '../types';
import { isCONState, getCONData } from '../knowledge';

// =============================================================================
// TYPES
// =============================================================================

export interface DealBreakerRule {
  id: string;
  name: string;
  description: string;
  category: 'regulatory' | 'operational' | 'financial' | 'market' | 'reputational';
  evaluate: (data: DealBreakerData) => DealBreakerResult;
}

export interface DealBreakerData {
  facility?: FacilityProfile;
  cmsData?: CMSData;
  operations?: OperatingMetrics;
  financials?: NormalizedFinancials;
  market?: MarketData;
}

export interface DealBreakerResult {
  triggered: boolean;
  threshold: number | string;
  actual: number | string;
  reason?: string;
  exception?: string; // Conditions under which this might be acceptable
}

export interface DealBreakerAssessment {
  anyTriggered: boolean;
  triggeredCount: number;
  results: {
    rule: string;
    name: string;
    category: string;
    result: DealBreakerResult;
  }[];
}

// =============================================================================
// DEAL BREAKER RULES
// =============================================================================

export const DEAL_BREAKER_RULES: DealBreakerRule[] = [
  // Regulatory Deal Breakers
  {
    id: 'sff_status',
    name: 'Special Focus Facility',
    description: 'Facility is on CMS Special Focus Facility list',
    category: 'regulatory',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { triggered: false, threshold: 'Not SFF', actual: 'Unknown' };
      }
      return {
        triggered: data.cmsData.isSFF,
        threshold: 'Not SFF',
        actual: data.cmsData.isSFF ? 'On SFF List' : 'Not SFF',
        reason: data.cmsData.isSFF ? 'Facility is under enhanced regulatory scrutiny' : undefined,
        exception: 'May consider with significant price discount and turnaround plan',
      };
    },
  },
  {
    id: 'one_star_rating',
    name: 'One-Star Overall Rating',
    description: 'CMS overall rating of 1 star',
    category: 'regulatory',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { triggered: false, threshold: '>1 star', actual: 'Unknown' };
      }
      return {
        triggered: data.cmsData.overallRating === 1,
        threshold: '>1 star',
        actual: `${data.cmsData.overallRating} stars`,
        reason: data.cmsData.overallRating === 1 ? 'Lowest possible quality rating' : undefined,
        exception: 'May consider if trend improving and with turnaround capital budget',
      };
    },
  },
  {
    id: 'abuse_icon',
    name: 'Abuse Icon Present',
    description: 'Facility has substantiated abuse citation',
    category: 'regulatory',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { triggered: false, threshold: 'No abuse icon', actual: 'Unknown' };
      }
      return {
        triggered: data.cmsData.hasAbuseIcon,
        threshold: 'No abuse icon',
        actual: data.cmsData.hasAbuseIcon ? 'Abuse icon present' : 'No abuse icon',
        reason: data.cmsData.hasAbuseIcon ? 'Substantiated abuse or neglect citation' : undefined,
        exception: 'Must review full citation history and current corrective actions',
      };
    },
  },
  {
    id: 'immediate_jeopardy',
    name: 'Immediate Jeopardy Citation',
    description: 'Recent immediate jeopardy (J, K, or L) deficiency',
    category: 'regulatory',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { triggered: false, threshold: 'No IJ', actual: 'Unknown' };
      }
      // Check for severe deficiencies (this would need actual survey data)
      const severeDeficiencies = data.cmsData.totalDeficiencies > 20;
      return {
        triggered: severeDeficiencies,
        threshold: 'No IJ',
        actual: severeDeficiencies ? 'Likely IJ history' : 'No recent IJ',
        reason: severeDeficiencies ? 'High deficiency count suggests serious citations' : undefined,
      };
    },
  },

  // Operational Deal Breakers
  {
    id: 'critical_occupancy',
    name: 'Critical Occupancy',
    description: 'Occupancy below 60%',
    category: 'operational',
    evaluate: (data) => {
      if (!data.operations) {
        return { triggered: false, threshold: '>60%', actual: 'Unknown' };
      }
      return {
        triggered: data.operations.occupancyRate < 60,
        threshold: '>60%',
        actual: `${data.operations.occupancyRate.toFixed(1)}%`,
        reason: data.operations.occupancyRate < 60 ? 'Occupancy indicates operational distress' : undefined,
        exception: 'May consider for turnaround if market fundamentals support recovery',
      };
    },
  },
  {
    id: 'excessive_agency',
    name: 'Excessive Agency Staffing',
    description: 'Agency staffing above 40%',
    category: 'operational',
    evaluate: (data) => {
      if (!data.operations?.staffing) {
        return { triggered: false, threshold: '<40%', actual: 'Unknown' };
      }
      return {
        triggered: data.operations.staffing.agencyUsagePercent > 40,
        threshold: '<40%',
        actual: `${data.operations.staffing.agencyUsagePercent.toFixed(1)}%`,
        reason: data.operations.staffing.agencyUsagePercent > 40 ? 'Indicates staffing crisis' : undefined,
        exception: 'May consider with retention strategy and labor market analysis',
      };
    },
  },
  {
    id: 'minimum_staffing',
    name: 'Below Minimum Staffing',
    description: 'Total nursing HPPD below 3.0',
    category: 'operational',
    evaluate: (data) => {
      const hppd = data.cmsData?.reportedTotalNurseStaffingHoursPerResidentDay ||
                   data.operations?.staffing?.totalHPPD;
      if (!hppd) {
        return { triggered: false, threshold: '>3.0', actual: 'Unknown' };
      }
      return {
        triggered: hppd < 3.0,
        threshold: '>3.0 HPPD',
        actual: `${hppd.toFixed(2)} HPPD`,
        reason: hppd < 3.0 ? 'Below minimum safe staffing levels' : undefined,
        exception: 'Must have immediate staffing improvement plan',
      };
    },
  },

  // Financial Deal Breakers
  {
    id: 'negative_noi',
    name: 'Negative NOI',
    description: 'Net operating income is negative',
    category: 'financial',
    evaluate: (data) => {
      if (!data.financials) {
        return { triggered: false, threshold: '>0', actual: 'Unknown' };
      }
      const noi = data.financials.normalized.metrics.noi;
      return {
        triggered: noi < 0,
        threshold: '>0',
        actual: `$${noi.toLocaleString()}`,
        reason: noi < 0 ? 'Facility is operating at a loss' : undefined,
        exception: 'May consider if clear path to profitability within 12-18 months',
      };
    },
  },
  {
    id: 'critical_margin',
    name: 'Critical EBITDAR Margin',
    description: 'EBITDAR margin below 2%',
    category: 'financial',
    evaluate: (data) => {
      if (!data.financials) {
        return { triggered: false, threshold: '>2%', actual: 'Unknown' };
      }
      const margin = data.financials.normalized.metrics.ebitdarMargin * 100;
      return {
        triggered: margin < 2,
        threshold: '>2%',
        actual: `${margin.toFixed(1)}%`,
        reason: margin < 2 ? 'Insufficient margin to service debt and maintain operations' : undefined,
        exception: 'May consider with operational improvement plan showing path to 8%+ margin',
      };
    },
  },
  {
    id: 'high_medicaid',
    name: 'Excessive Medicaid Concentration',
    description: 'Medicaid payer mix above 85%',
    category: 'financial',
    evaluate: (data) => {
      if (!data.operations?.payerMix) {
        return { triggered: false, threshold: '<85%', actual: 'Unknown' };
      }
      const medicaid = data.operations.payerMix.medicaid;
      return {
        triggered: medicaid > 85,
        threshold: '<85%',
        actual: `${medicaid.toFixed(1)}%`,
        reason: medicaid > 85 ? 'Excessive dependence on Medicaid reimbursement' : undefined,
        exception: 'May consider in markets with favorable Medicaid rates and limited competition',
      };
    },
  },

  // Market Deal Breakers
  {
    id: 'declining_market',
    name: 'Declining Market',
    description: 'Negative senior population growth',
    category: 'market',
    evaluate: (data) => {
      if (!data.market) {
        return { triggered: false, threshold: '>0%', actual: 'Unknown' };
      }
      const growth = data.market.demandGrowthRate * 100;
      return {
        triggered: growth < -2,
        threshold: '>-2%',
        actual: `${growth.toFixed(1)}%`,
        reason: growth < -2 ? 'Significant demographic decline in market' : undefined,
        exception: 'May consider if facility has dominant market position',
      };
    },
  },
  {
    id: 'oversupplied_market',
    name: 'Severely Oversupplied Market',
    description: 'Market occupancy below 70%',
    category: 'market',
    evaluate: (data) => {
      if (!data.market) {
        return { triggered: false, threshold: '>70%', actual: 'Unknown' };
      }
      const occ = data.market.marketOccupancy * 100;
      return {
        triggered: occ < 70,
        threshold: '>70%',
        actual: `${occ.toFixed(1)}%`,
        reason: occ < 70 ? 'Severe oversupply in market' : undefined,
        exception: 'May consider if acquisition eliminates competitor capacity',
      };
    },
  },

  // Knowledge-Driven Deal Breakers
  {
    id: 'con_moratorium',
    name: 'CON State Moratorium Risk',
    description: 'State has CON requirements with very low approval rates or extended timelines affecting deal viability',
    category: 'regulatory',
    evaluate: (data) => {
      const state = data.facility?.address?.state;
      if (!state || !isCONState(state)) {
        return { triggered: false, threshold: 'No CON moratorium', actual: state ? `${state} — no CON` : 'Unknown' };
      }
      const conData = getCONData(state);
      if (!conData) {
        return { triggered: false, threshold: 'No CON moratorium', actual: `${state} — CON data unavailable` };
      }
      // Trigger if approval rate < 55% AND extended timeline > 16 months
      const isHighRisk = conData.approvalRate < 0.55 && conData.timelineMonths.extended > 16;
      return {
        triggered: isHighRisk,
        threshold: 'Approval rate >55% and timeline <16mo',
        actual: `${state}: ${(conData.approvalRate * 100).toFixed(0)}% approval, ${conData.timelineMonths.extended}mo max timeline`,
        reason: isHighRisk ? `CON state with very low approval rate (${(conData.approvalRate * 100).toFixed(0)}%) and extended timeline (${conData.timelineMonths.extended}mo) — deal economics may not survive regulatory delay` : undefined,
        exception: 'May proceed if deal does not require CON approval (existing bed count, no conversion)',
      };
    },
  },
];

// =============================================================================
// EVALUATION FUNCTIONS
// =============================================================================

/**
 * Evaluate all deal breaker rules
 */
export function evaluateDealBreakers(data: DealBreakerData): DealBreakerAssessment {
  const results = DEAL_BREAKER_RULES.map((rule) => ({
    rule: rule.id,
    name: rule.name,
    category: rule.category,
    result: rule.evaluate(data),
  }));

  const triggeredResults = results.filter((r) => r.result.triggered);

  return {
    anyTriggered: triggeredResults.length > 0,
    triggeredCount: triggeredResults.length,
    results,
  };
}

/**
 * Get deal breakers by category
 */
export function getDealBreakersByCategory(
  category: DealBreakerRule['category']
): DealBreakerRule[] {
  return DEAL_BREAKER_RULES.filter((r) => r.category === category);
}

/**
 * Check if any deal breaker is triggered (fast check)
 */
export function hasAnyDealBreaker(data: DealBreakerData): boolean {
  return DEAL_BREAKER_RULES.some((rule) => rule.evaluate(data).triggered);
}

/**
 * Get triggered deal breakers only
 */
export function getTriggeredDealBreakers(data: DealBreakerData): {
  rule: DealBreakerRule;
  result: DealBreakerResult;
}[] {
  return DEAL_BREAKER_RULES
    .map((rule) => ({ rule, result: rule.evaluate(data) }))
    .filter(({ result }) => result.triggered);
}

// =============================================================================
// CUSTOM RULE CREATION
// =============================================================================

/**
 * Create a custom deal breaker rule
 */
export function createDealBreakerRule(
  id: string,
  name: string,
  description: string,
  category: DealBreakerRule['category'],
  evaluate: (data: DealBreakerData) => DealBreakerResult
): DealBreakerRule {
  return { id, name, description, category, evaluate };
}

/**
 * Add a custom rule to the evaluation set
 */
export function addCustomRule(rule: DealBreakerRule): void {
  DEAL_BREAKER_RULES.push(rule);
}

/**
 * Remove a rule by ID
 */
export function removeRule(id: string): boolean {
  const index = DEAL_BREAKER_RULES.findIndex((r) => r.id === id);
  if (index >= 0) {
    DEAL_BREAKER_RULES.splice(index, 1);
    return true;
  }
  return false;
}
