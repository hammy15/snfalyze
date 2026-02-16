// =============================================================================
// RISK FACTORS - Define and evaluate individual risk factors
// =============================================================================

import type { RiskFactor, RiskCategory, CMSData, OperatingMetrics, NormalizedFinancials, MarketData, FacilityProfile } from '../types';
import { isCONState, getCONData, REIMBURSEMENT_OPTIMIZATION, QUALITY_REVENUE_IMPACT } from '../knowledge';

// =============================================================================
// TYPES
// =============================================================================

export interface RiskFactorDefinition {
  id: string;
  name: string;
  category: RiskCategory;
  weight: number;
  description: string;
  dataSource: string;
  evaluate: (data: RiskEvaluationData) => RiskFactorResult;
}

export interface RiskEvaluationData {
  facility?: FacilityProfile;
  cmsData?: CMSData;
  operations?: OperatingMetrics;
  financials?: NormalizedFinancials;
  market?: MarketData;
}

export interface RiskFactorResult {
  score: number; // 0-100 (0 = no risk, 100 = maximum risk)
  severity: RiskFactor['severity'];
  details: string;
  recommendation?: string;
}

// =============================================================================
// SEVERITY CALCULATION
// =============================================================================

function scoreToSeverity(score: number): RiskFactor['severity'] {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'elevated';
  if (score >= 20) return 'moderate';
  return 'low';
}

// =============================================================================
// REGULATORY RISK FACTORS
// =============================================================================

export const REGULATORY_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'cms_overall_rating',
    name: 'CMS Overall Rating',
    category: 'regulatory',
    weight: 0.25,
    description: 'CMS Five-Star Quality Rating',
    dataSource: 'CMS Care Compare',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { score: 50, severity: 'elevated', details: 'CMS data not available' };
      }

      const rating = data.cmsData.overallRating;
      let score: number;
      let details: string;

      if (rating === 1) {
        score = 85;
        details = '1-star rating indicates significant quality concerns';
      } else if (rating === 2) {
        score = 65;
        details = '2-star rating indicates below average performance';
      } else if (rating === 3) {
        score = 40;
        details = '3-star rating indicates average performance';
      } else if (rating === 4) {
        score = 20;
        details = '4-star rating indicates above average performance';
      } else {
        score = 5;
        details = '5-star rating indicates excellent performance';
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: rating <= 2 ? 'Develop quality improvement plan' : undefined,
      };
    },
  },
  {
    id: 'health_inspection_rating',
    name: 'Health Inspection Rating',
    category: 'regulatory',
    weight: 0.20,
    description: 'CMS Health Inspection Star Rating',
    dataSource: 'CMS Care Compare',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { score: 50, severity: 'elevated', details: 'CMS data not available' };
      }

      const rating = data.cmsData.healthInspectionRating;
      const deficiencies = data.cmsData.totalDeficiencies;

      let score = (5 - rating) * 20; // Convert 1-5 to 80-0

      // Adjust for deficiency count
      if (deficiencies > 15) score += 15;
      else if (deficiencies > 10) score += 10;
      else if (deficiencies > 5) score += 5;

      score = Math.min(100, score);

      return {
        score,
        severity: scoreToSeverity(score),
        details: `${rating}-star health inspection with ${deficiencies} deficiencies`,
        recommendation: rating <= 2 ? 'Review survey history and implement corrective actions' : undefined,
      };
    },
  },
  {
    id: 'sff_status',
    name: 'Special Focus Facility Status',
    category: 'regulatory',
    weight: 0.30,
    description: 'CMS Special Focus Facility designation',
    dataSource: 'CMS Care Compare',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { score: 50, severity: 'elevated', details: 'CMS data not available' };
      }

      if (data.cmsData.isSFF) {
        return {
          score: 95,
          severity: 'critical',
          details: 'Facility is on Special Focus Facility list',
          recommendation: 'Critical - require immediate quality improvement plan and enhanced monitoring',
        };
      }

      if (data.cmsData.isSFFCandidate) {
        return {
          score: 75,
          severity: 'high',
          details: 'Facility is an SFF candidate',
          recommendation: 'High risk - implement proactive quality measures',
        };
      }

      return {
        score: 5,
        severity: 'low',
        details: 'Not on SFF or candidate list',
      };
    },
  },
  {
    id: 'abuse_icon',
    name: 'Abuse Icon',
    category: 'regulatory',
    weight: 0.25,
    description: 'CMS Abuse Icon indicator',
    dataSource: 'CMS Care Compare',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { score: 50, severity: 'elevated', details: 'CMS data not available' };
      }

      if (data.cmsData.hasAbuseIcon) {
        return {
          score: 90,
          severity: 'critical',
          details: 'Facility has abuse icon - substantiated abuse/neglect citation',
          recommendation: 'Critical due diligence required - review all abuse-related documentation',
        };
      }

      return {
        score: 0,
        severity: 'low',
        details: 'No abuse icon',
      };
    },
  },
];

// =============================================================================
// OPERATIONAL RISK FACTORS
// =============================================================================

export const OPERATIONAL_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'occupancy_rate',
    name: 'Occupancy Rate',
    category: 'operational',
    weight: 0.30,
    description: 'Current facility occupancy',
    dataSource: 'Operating data',
    evaluate: (data) => {
      if (!data.operations) {
        return { score: 50, severity: 'elevated', details: 'Operating data not available' };
      }

      const occ = data.operations.occupancyRate;
      let score: number;
      let details: string;

      if (occ < 70) {
        score = 85;
        details = `${occ.toFixed(1)}% occupancy is critically low`;
      } else if (occ < 75) {
        score = 70;
        details = `${occ.toFixed(1)}% occupancy is significantly below market`;
      } else if (occ < 80) {
        score = 50;
        details = `${occ.toFixed(1)}% occupancy is below average`;
      } else if (occ < 85) {
        score = 30;
        details = `${occ.toFixed(1)}% occupancy is near average`;
      } else if (occ < 90) {
        score = 15;
        details = `${occ.toFixed(1)}% occupancy is above average`;
      } else {
        score = 5;
        details = `${occ.toFixed(1)}% occupancy is excellent`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: occ < 80 ? 'Develop census building strategy' : undefined,
      };
    },
  },
  {
    id: 'agency_utilization',
    name: 'Agency Staff Utilization',
    category: 'operational',
    weight: 0.25,
    description: 'Percentage of staffing from agency/contract labor',
    dataSource: 'Operating data',
    evaluate: (data) => {
      if (!data.operations?.staffing) {
        return { score: 40, severity: 'elevated', details: 'Staffing data not available' };
      }

      const agencyPercent = data.operations.staffing.agencyUsagePercent;
      let score: number;
      let details: string;

      if (agencyPercent > 25) {
        score = 80;
        details = `${agencyPercent.toFixed(1)}% agency usage indicates staffing crisis`;
      } else if (agencyPercent > 15) {
        score = 60;
        details = `${agencyPercent.toFixed(1)}% agency usage is elevated`;
      } else if (agencyPercent > 8) {
        score = 40;
        details = `${agencyPercent.toFixed(1)}% agency usage is above typical`;
      } else if (agencyPercent > 3) {
        score = 20;
        details = `${agencyPercent.toFixed(1)}% agency usage is acceptable`;
      } else {
        score = 5;
        details = `${agencyPercent.toFixed(1)}% agency usage is minimal`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: agencyPercent > 15 ? 'Implement recruitment and retention programs' : undefined,
      };
    },
  },
  {
    id: 'staffing_hppd',
    name: 'Total Nursing HPPD',
    category: 'operational',
    weight: 0.25,
    description: 'Total nursing hours per patient day',
    dataSource: 'CMS PBJ data',
    evaluate: (data) => {
      const hppd = data.cmsData?.reportedTotalNurseStaffingHoursPerResidentDay ||
                   data.operations?.staffing?.totalHPPD;

      if (!hppd) {
        return { score: 50, severity: 'elevated', details: 'HPPD data not available' };
      }

      let score: number;
      let details: string;

      if (hppd < 3.0) {
        score = 85;
        details = `${hppd.toFixed(2)} HPPD is critically low`;
      } else if (hppd < 3.5) {
        score = 60;
        details = `${hppd.toFixed(2)} HPPD is below minimum standards`;
      } else if (hppd < 4.0) {
        score = 40;
        details = `${hppd.toFixed(2)} HPPD is below average`;
      } else if (hppd < 4.5) {
        score = 20;
        details = `${hppd.toFixed(2)} HPPD is adequate`;
      } else {
        score = 10;
        details = `${hppd.toFixed(2)} HPPD is above average`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: hppd < 3.5 ? 'Evaluate staffing levels against acuity' : undefined,
      };
    },
  },
  {
    id: 'turnover_rate',
    name: 'Staff Turnover Rate',
    category: 'operational',
    weight: 0.20,
    description: 'Annual staff turnover percentage',
    dataSource: 'Operating data',
    evaluate: (data) => {
      if (!data.operations?.staffing) {
        return { score: 50, severity: 'elevated', details: 'Turnover data not available' };
      }

      const turnover = data.operations.staffing.turnoverRate;
      let score: number;
      let details: string;

      if (turnover > 80) {
        score = 85;
        details = `${turnover.toFixed(0)}% turnover is critically high`;
      } else if (turnover > 60) {
        score = 65;
        details = `${turnover.toFixed(0)}% turnover is very high`;
      } else if (turnover > 50) {
        score = 45;
        details = `${turnover.toFixed(0)}% turnover is above industry average`;
      } else if (turnover > 35) {
        score = 25;
        details = `${turnover.toFixed(0)}% turnover is typical for industry`;
      } else {
        score = 10;
        details = `${turnover.toFixed(0)}% turnover is below average`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: turnover > 50 ? 'Review compensation and workplace culture' : undefined,
      };
    },
  },
];

// =============================================================================
// FINANCIAL RISK FACTORS
// =============================================================================

export const FINANCIAL_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'ebitdar_margin',
    name: 'EBITDAR Margin',
    category: 'financial',
    weight: 0.30,
    description: 'Earnings before interest, taxes, depreciation, amortization, and rent',
    dataSource: 'Financial statements',
    evaluate: (data) => {
      if (!data.financials) {
        return { score: 50, severity: 'elevated', details: 'Financial data not available' };
      }

      const margin = data.financials.normalized.metrics.ebitdarMargin * 100;
      let score: number;
      let details: string;

      if (margin < 0) {
        score = 95;
        details = `${margin.toFixed(1)}% EBITDAR margin is negative`;
      } else if (margin < 5) {
        score = 80;
        details = `${margin.toFixed(1)}% EBITDAR margin is critically low`;
      } else if (margin < 8) {
        score = 60;
        details = `${margin.toFixed(1)}% EBITDAR margin is below breakeven threshold`;
      } else if (margin < 12) {
        score = 35;
        details = `${margin.toFixed(1)}% EBITDAR margin is below average`;
      } else if (margin < 16) {
        score = 15;
        details = `${margin.toFixed(1)}% EBITDAR margin is healthy`;
      } else {
        score = 5;
        details = `${margin.toFixed(1)}% EBITDAR margin is excellent`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: margin < 8 ? 'Evaluate revenue enhancement and cost reduction opportunities' : undefined,
      };
    },
  },
  {
    id: 'labor_cost_ratio',
    name: 'Labor Cost Ratio',
    category: 'financial',
    weight: 0.25,
    description: 'Labor costs as percentage of revenue',
    dataSource: 'Financial statements',
    evaluate: (data) => {
      if (!data.financials) {
        return { score: 50, severity: 'elevated', details: 'Financial data not available' };
      }

      const ratio = data.financials.normalized.metrics.laborCostPercent * 100;
      let score: number;
      let details: string;

      if (ratio > 70) {
        score = 85;
        details = `${ratio.toFixed(1)}% labor cost ratio is unsustainably high`;
      } else if (ratio > 62) {
        score = 60;
        details = `${ratio.toFixed(1)}% labor cost ratio is elevated`;
      } else if (ratio > 56) {
        score = 35;
        details = `${ratio.toFixed(1)}% labor cost ratio is above average`;
      } else if (ratio > 50) {
        score = 15;
        details = `${ratio.toFixed(1)}% labor cost ratio is typical`;
      } else {
        score = 5;
        details = `${ratio.toFixed(1)}% labor cost ratio is excellent`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: ratio > 62 ? 'Review staffing efficiency and wage competitiveness' : undefined,
      };
    },
  },
  {
    id: 'payer_mix',
    name: 'Payer Mix Risk',
    category: 'financial',
    weight: 0.25,
    description: 'Revenue concentration by payer source',
    dataSource: 'Operating data',
    evaluate: (data) => {
      if (!data.operations?.payerMix) {
        return { score: 50, severity: 'elevated', details: 'Payer mix data not available' };
      }

      const medicaid = data.operations.payerMix.medicaid;
      const medicare = data.operations.payerMix.medicareA + data.operations.payerMix.medicareAdvantage;
      const privatePay = data.operations.payerMix.privatePay;

      let score = 0;
      const details: string[] = [];

      // High Medicaid concentration risk
      if (medicaid > 75) {
        score += 40;
        details.push(`High Medicaid concentration (${medicaid.toFixed(0)}%)`);
      } else if (medicaid > 60) {
        score += 25;
        details.push(`Elevated Medicaid mix (${medicaid.toFixed(0)}%)`);
      }

      // Low private pay risk
      if (privatePay < 10) {
        score += 20;
        details.push(`Low private pay (${privatePay.toFixed(0)}%)`);
      }

      // Medicare advantage risk
      if (data.operations.payerMix.medicareAdvantage > 15) {
        score += 15;
        details.push(`High Medicare Advantage exposure`);
      }

      score = Math.min(score, 90);

      return {
        score,
        severity: scoreToSeverity(score),
        details: details.length > 0 ? details.join('; ') : 'Balanced payer mix',
        recommendation: score > 50 ? 'Develop private pay marketing and Medicare strategy' : undefined,
      };
    },
  },
  {
    id: 'revenue_per_day',
    name: 'Revenue Per Patient Day',
    category: 'financial',
    weight: 0.20,
    description: 'Average revenue generated per patient day',
    dataSource: 'Financial statements',
    evaluate: (data) => {
      if (!data.financials) {
        return { score: 50, severity: 'elevated', details: 'Financial data not available' };
      }

      const rppd = data.financials.normalized.metrics.revenuePerPatientDay;
      let score: number;
      let details: string;

      if (rppd < 250) {
        score = 80;
        details = `$${rppd.toFixed(0)}/day revenue is critically low`;
      } else if (rppd < 300) {
        score = 55;
        details = `$${rppd.toFixed(0)}/day revenue is below average`;
      } else if (rppd < 350) {
        score = 30;
        details = `$${rppd.toFixed(0)}/day revenue is near average`;
      } else if (rppd < 425) {
        score = 15;
        details = `$${rppd.toFixed(0)}/day revenue is above average`;
      } else {
        score = 5;
        details = `$${rppd.toFixed(0)}/day revenue is excellent`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
        recommendation: rppd < 300 ? 'Evaluate rate structures and payer negotiations' : undefined,
      };
    },
  },
];

// =============================================================================
// MARKET RISK FACTORS
// =============================================================================

export const MARKET_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'market_occupancy',
    name: 'Market Occupancy',
    category: 'market',
    weight: 0.30,
    description: 'Overall market occupancy rate',
    dataSource: 'Market data',
    evaluate: (data) => {
      if (!data.market) {
        return { score: 50, severity: 'elevated', details: 'Market data not available' };
      }

      const occ = data.market.marketOccupancy * 100;
      let score: number;
      let details: string;

      if (occ < 75) {
        score = 75;
        details = `${occ.toFixed(0)}% market occupancy indicates oversupply`;
      } else if (occ < 80) {
        score = 50;
        details = `${occ.toFixed(0)}% market occupancy is soft`;
      } else if (occ < 85) {
        score = 30;
        details = `${occ.toFixed(0)}% market occupancy is average`;
      } else if (occ < 90) {
        score = 15;
        details = `${occ.toFixed(0)}% market occupancy is healthy`;
      } else {
        score = 5;
        details = `${occ.toFixed(0)}% market occupancy is tight`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
      };
    },
  },
  {
    id: 'supply_growth',
    name: 'Supply Growth',
    category: 'market',
    weight: 0.25,
    description: 'New supply pipeline in market',
    dataSource: 'Market data',
    evaluate: (data) => {
      if (!data.market) {
        return { score: 50, severity: 'elevated', details: 'Market data not available' };
      }

      const supplyGrowth = data.market.supplyGrowthRate * 100;
      let score: number;
      let details: string;

      if (supplyGrowth > 5) {
        score = 75;
        details = `${supplyGrowth.toFixed(1)}% supply growth is excessive`;
      } else if (supplyGrowth > 3) {
        score = 50;
        details = `${supplyGrowth.toFixed(1)}% supply growth is elevated`;
      } else if (supplyGrowth > 1.5) {
        score = 25;
        details = `${supplyGrowth.toFixed(1)}% supply growth is moderate`;
      } else {
        score = 10;
        details = `${supplyGrowth.toFixed(1)}% supply growth is minimal`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
      };
    },
  },
  {
    id: 'demand_growth',
    name: 'Demand Growth',
    category: 'market',
    weight: 0.25,
    description: 'Senior population growth rate',
    dataSource: 'Market data',
    evaluate: (data) => {
      if (!data.market) {
        return { score: 50, severity: 'elevated', details: 'Market data not available' };
      }

      const demandGrowth = data.market.demandGrowthRate * 100;
      let score: number;
      let details: string;

      if (demandGrowth < 0) {
        score = 80;
        details = `${demandGrowth.toFixed(1)}% demand decline is concerning`;
      } else if (demandGrowth < 1) {
        score = 55;
        details = `${demandGrowth.toFixed(1)}% demand growth is below national average`;
      } else if (demandGrowth < 2) {
        score = 30;
        details = `${demandGrowth.toFixed(1)}% demand growth is typical`;
      } else if (demandGrowth < 3.5) {
        score = 15;
        details = `${demandGrowth.toFixed(1)}% demand growth is favorable`;
      } else {
        score = 5;
        details = `${demandGrowth.toFixed(1)}% demand growth is excellent`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
      };
    },
  },
  {
    id: 'market_concentration',
    name: 'Competitive Concentration',
    category: 'market',
    weight: 0.20,
    description: 'Market concentration and competition',
    dataSource: 'Market data',
    evaluate: (data) => {
      if (!data.market) {
        return { score: 50, severity: 'elevated', details: 'Market data not available' };
      }

      const concentration = data.market.marketConcentration; // HHI-like measure
      let score: number;
      let details: string;

      // Higher concentration = more competitive risk (dominated by few players)
      if (concentration > 0.25) {
        score = 60;
        details = 'Market is highly concentrated';
      } else if (concentration > 0.15) {
        score = 40;
        details = 'Market is moderately concentrated';
      } else {
        score = 20;
        details = 'Market is competitive';
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
      };
    },
  },
];

// =============================================================================
// REPUTATIONAL RISK FACTORS
// =============================================================================

export const REPUTATIONAL_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'complaint_count',
    name: 'Complaint History',
    category: 'reputational',
    weight: 0.50,
    description: 'Number of substantiated complaints',
    dataSource: 'CMS/State data',
    evaluate: (data) => {
      // Would need complaint data - using deficiencies as proxy
      if (!data.cmsData) {
        return { score: 50, severity: 'elevated', details: 'Complaint data not available' };
      }

      const deficiencies = data.cmsData.healthDeficiencies;
      let score: number;
      let details: string;

      if (deficiencies > 15) {
        score = 75;
        details = `${deficiencies} health deficiencies indicate significant concerns`;
      } else if (deficiencies > 10) {
        score = 55;
        details = `${deficiencies} health deficiencies is above average`;
      } else if (deficiencies > 5) {
        score = 30;
        details = `${deficiencies} health deficiencies is typical`;
      } else {
        score = 10;
        details = `${deficiencies} health deficiencies is below average`;
      }

      return {
        score,
        severity: scoreToSeverity(score),
        details,
      };
    },
  },
  {
    id: 'penalties',
    name: 'CMS Penalties',
    category: 'reputational',
    weight: 0.50,
    description: 'Federal fines and payment denials',
    dataSource: 'CMS data',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { score: 50, severity: 'elevated', details: 'Penalty data not available' };
      }

      const fines = data.cmsData.totalFines;
      const denialDays = data.cmsData.paymentDenialDays;
      let score = 0;
      const details: string[] = [];

      if (fines > 100000) {
        score += 60;
        details.push(`$${(fines / 1000).toFixed(0)}K in federal fines`);
      } else if (fines > 50000) {
        score += 40;
        details.push(`$${(fines / 1000).toFixed(0)}K in federal fines`);
      } else if (fines > 10000) {
        score += 20;
        details.push(`$${(fines / 1000).toFixed(0)}K in federal fines`);
      }

      if (denialDays > 30) {
        score += 30;
        details.push(`${denialDays} payment denial days`);
      } else if (denialDays > 0) {
        score += 15;
        details.push(`${denialDays} payment denial days`);
      }

      score = Math.min(score, 95);

      return {
        score,
        severity: scoreToSeverity(score),
        details: details.length > 0 ? details.join('; ') : 'No significant penalties',
      };
    },
  },
];

// =============================================================================
// KNOWLEDGE-DRIVEN RISK FACTORS (from institutional intelligence)
// =============================================================================

export const KNOWLEDGE_REGULATORY_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'con_regulatory_risk',
    name: 'CON Regulatory Complexity',
    category: 'regulatory',
    weight: 0.15,
    description: 'Certificate of Need state regulatory burden and timeline risk',
    dataSource: 'Institutional knowledge / CON database',
    evaluate: (data) => {
      const state = data.facility?.address?.state;
      if (!state) {
        return { score: 30, severity: 'moderate', details: 'State unknown — cannot assess CON status' };
      }

      if (!isCONState(state)) {
        return {
          score: 5,
          severity: 'low',
          details: `${state} is not a CON state — no certificate of need requirements`,
        };
      }

      const conData = getCONData(state);
      if (!conData) {
        return { score: 35, severity: 'moderate', details: `${state} is a CON state but detailed data unavailable` };
      }

      // Higher investment score = less risky (better market despite CON)
      // Scale: 10 = great, 5 = poor → risk score inverted
      const riskFromScore = Math.max(0, (10 - conData.investmentScore) * 10);

      // Reform risk adds uncertainty
      const reformPenalty = conData.reformRisk === 'high' ? 15 : conData.reformRisk === 'moderate' ? 8 : 0;

      // Timeline adds cost
      const timelinePenalty = conData.timelineMonths.standard > 10 ? 10 : conData.timelineMonths.standard > 7 ? 5 : 0;

      const score = Math.min(85, riskFromScore + reformPenalty + timelinePenalty);

      return {
        score,
        severity: scoreToSeverity(score),
        details: `${state} CON state — investment score ${conData.investmentScore}/10, ${conData.timelineMonths.standard}mo typical timeline, $${(conData.applicationCost.low / 1000).toFixed(0)}-${(conData.applicationCost.high / 1000).toFixed(0)}K application cost`,
        recommendation: score >= 40 ? `Budget $${(conData.applicationCost.high / 1000).toFixed(0)}K and ${conData.timelineMonths.extended}mo for CON process` : undefined,
      };
    },
  },
];

export const KNOWLEDGE_FINANCIAL_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'reimbursement_concentration',
    name: 'Reimbursement Concentration Risk',
    category: 'financial',
    weight: 0.15,
    description: 'Risk from dependence on single reimbursement source and optimization gap',
    dataSource: 'Institutional knowledge / payer data',
    evaluate: (data) => {
      if (!data.operations?.payerMix) {
        return { score: 40, severity: 'elevated', details: 'Payer mix data unavailable — cannot assess reimbursement concentration' };
      }

      const medicaid = data.operations.payerMix.medicaid;
      const medicareA = data.operations.payerMix.medicareA;
      const ma = data.operations.payerMix.medicareAdvantage;

      let score = 0;
      const details: string[] = [];

      // Heavy Medicaid dependence
      if (medicaid > 70) {
        score += 35;
        details.push(`${medicaid.toFixed(0)}% Medicaid — high reimbursement cliff risk`);
      } else if (medicaid > 55) {
        score += 20;
        details.push(`${medicaid.toFixed(0)}% Medicaid — moderate concentration`);
      }

      // MA rate compression risk
      if (ma > 20) {
        score += 25;
        details.push(`${ma.toFixed(0)}% Medicare Advantage — rate compression exposure (MA rates 15-30% below traditional)`);
      } else if (ma > 10) {
        score += 10;
        details.push(`${ma.toFixed(0)}% Medicare Advantage exposure`);
      }

      // Low Medicare A (PDPM optimization limited)
      if (medicareA < 15) {
        score += 15;
        details.push(`${medicareA.toFixed(0)}% Medicare A — limited PDPM optimization upside`);
      }

      score = Math.min(score, 90);

      return {
        score,
        severity: scoreToSeverity(score),
        details: details.length > 0 ? details.join('; ') : 'Balanced reimbursement sources',
        recommendation: score >= 40 ? 'Develop payer diversification strategy and PDPM optimization plan' : undefined,
      };
    },
  },
  {
    id: 'quality_bonus_opportunity',
    name: 'Quality Revenue Opportunity',
    category: 'financial',
    weight: 0.10,
    description: 'Revenue upside from quality improvement (inverted — lower rating = higher opportunity)',
    dataSource: 'Institutional knowledge / CMS data',
    evaluate: (data) => {
      if (!data.cmsData) {
        return { score: 30, severity: 'moderate', details: 'CMS data unavailable — cannot assess quality revenue opportunity' };
      }

      const rating = data.cmsData.overallRating;
      const impact = QUALITY_REVENUE_IMPACT.find((q) => q.starRating === rating);

      if (!impact) {
        return { score: 30, severity: 'moderate', details: 'Cannot map rating to revenue impact' };
      }

      // This is an OPPORTUNITY score, not a risk score
      // Lower star rating = more upside = lower risk (opportunity pricing)
      // We invert: 1-star has most opportunity → lower score (positive signal)
      if (rating >= 4) {
        return {
          score: 10,
          severity: 'low',
          details: `${rating}-star facility — limited quality bonus upside ($${impact.revenuePerBed.low.toLocaleString()}-${impact.revenuePerBed.high.toLocaleString()}/bed), already high performer`,
        };
      }

      if (rating === 3) {
        return {
          score: 20,
          severity: 'moderate',
          details: `3-star facility — moderate quality improvement opportunity ($${impact.revenuePerBed.low.toLocaleString()}-${impact.revenuePerBed.high.toLocaleString()}/bed achievable)`,
          recommendation: 'Target 4-star within 12 months through QAPI and staffing investment',
        };
      }

      // 1-2 star: high opportunity but requires investment
      return {
        score: 35,
        severity: 'moderate',
        details: `${rating}-star facility — significant quality bonus opportunity ($${impact.revenuePerBed.low.toLocaleString()}-${impact.revenuePerBed.high.toLocaleString()}/bed), requires $${(impact.investmentRequired.low / 1000).toFixed(0)}-${(impact.investmentRequired.high / 1000).toFixed(0)}K investment, ROI ${impact.roi.low}-${impact.roi.high}%`,
        recommendation: `Invest in quality improvement — ${impact.paybackMonths.low}-${impact.paybackMonths.high} month payback with ${impact.roi.low}-${impact.roi.high}% ROI`,
      };
    },
  },
];

export const KNOWLEDGE_MARKET_RISK_FACTORS: RiskFactorDefinition[] = [
  {
    id: 'succession_motivation',
    name: 'Seller Succession / Motivation',
    category: 'market',
    weight: 0.15,
    description: 'Assessment of seller motivation from succession pressure (55% of operators are family-owned)',
    dataSource: 'Institutional knowledge / deal intelligence',
    evaluate: (data) => {
      // This factor primarily provides context — without specific seller data,
      // we flag the macro trend and its implications
      if (!data.market) {
        return {
          score: 30,
          severity: 'moderate',
          details: '55% of SNF operators are family-owned and facing succession — this creates both opportunity (motivated sellers, 10-20% discount potential) and risk (deferred maintenance, outdated systems)',
        };
      }

      // If we have market data, assess based on market characteristics
      const marketOcc = data.market.marketOccupancy * 100;
      const supplyGrowth = data.market.supplyGrowthRate * 100;

      let score = 25; // Base — succession dynamics are always present
      const details: string[] = ['55% of operators face succession — deal flow opportunity'];

      // Soft market + succession = more motivated sellers
      if (marketOcc < 80) {
        score -= 5; // Actually good for buyers — more negotiating leverage
        details.push('Soft market increases seller motivation');
      }

      if (supplyGrowth < 1) {
        score -= 5; // Low supply growth means less new competition
        details.push('Low supply growth protects existing operators');
      }

      return {
        score: Math.max(5, score),
        severity: scoreToSeverity(Math.max(5, score)),
        details: details.join('; '),
      };
    },
  },
];

// =============================================================================
// ALL RISK FACTORS
// =============================================================================

export const ALL_RISK_FACTORS: RiskFactorDefinition[] = [
  ...REGULATORY_RISK_FACTORS,
  ...OPERATIONAL_RISK_FACTORS,
  ...FINANCIAL_RISK_FACTORS,
  ...MARKET_RISK_FACTORS,
  ...REPUTATIONAL_RISK_FACTORS,
  ...KNOWLEDGE_REGULATORY_RISK_FACTORS,
  ...KNOWLEDGE_FINANCIAL_RISK_FACTORS,
  ...KNOWLEDGE_MARKET_RISK_FACTORS,
];

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get risk factors by category
 */
export function getRiskFactorsByCategory(category: RiskCategory): RiskFactorDefinition[] {
  return ALL_RISK_FACTORS.filter((f) => f.category === category);
}

/**
 * Evaluate a single risk factor
 */
export function evaluateRiskFactor(
  factorId: string,
  data: RiskEvaluationData
): RiskFactor | null {
  const definition = ALL_RISK_FACTORS.find((f) => f.id === factorId);
  if (!definition) return null;

  const result = definition.evaluate(data);

  return {
    category: definition.category,
    name: definition.name,
    score: result.score,
    weight: definition.weight,
    weightedScore: result.score * definition.weight,
    severity: result.severity,
    details: result.details,
    dataSource: definition.dataSource,
    recommendation: result.recommendation,
  };
}

/**
 * Evaluate all risk factors in a category
 */
export function evaluateCategory(
  category: RiskCategory,
  data: RiskEvaluationData
): RiskFactor[] {
  const factors = getRiskFactorsByCategory(category);
  return factors
    .map((f) => evaluateRiskFactor(f.id, data))
    .filter((f): f is RiskFactor => f !== null);
}
