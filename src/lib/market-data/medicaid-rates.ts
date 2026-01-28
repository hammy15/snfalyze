/**
 * Medicaid Rate Data by State
 *
 * Contains state Medicaid daily rates, trends, and projections
 * for SNF reimbursement analysis.
 *
 * Data sources: State Medicaid agency rate sheets, CMS reports
 * Last updated: 2024
 */

// =============================================================================
// TYPES
// =============================================================================

export interface StateMedicaidData {
  state: string;
  stateName: string;

  // Current rates
  currentDailyRate: number;        // Average SNF Medicaid rate
  effectiveDate: string;
  rateType: 'case_mix' | 'flat' | 'hybrid';

  // Rate components (if case-mix)
  nursingComponent?: number;
  capitalComponent?: number;
  ancillaryComponent?: number;

  // Trends
  priorYearRate: number;
  yearOverYearChange: number;      // Percentage
  fiveYearCagr: number;            // 5-year compound annual growth

  // Projections
  projectedNextYearRate: number;
  projectedChange: number;

  // Quality adjustments
  hasQualityIncentive: boolean;
  qualityBonusMax?: number;        // Max bonus per day

  // Special considerations
  notes: string[];
  lastUpdated: string;
}

export interface MarketRateComparison {
  state: string;
  medicaidRate: number;
  medicareRateEstimate: number;    // Estimated average Medicare rate
  managedCareRateEstimate: number;
  privatePayRateEstimate: number;
  blendedRateAtMix: number;        // At typical payer mix
}

// =============================================================================
// STATE MEDICAID RATE DATA
// =============================================================================

export const STATE_MEDICAID_RATES: Record<string, StateMedicaidData> = {
  TX: {
    state: 'TX',
    stateName: 'Texas',
    currentDailyRate: 213.45,
    effectiveDate: '2024-09-01',
    rateType: 'case_mix',
    nursingComponent: 168.20,
    capitalComponent: 28.15,
    ancillaryComponent: 17.10,
    priorYearRate: 203.80,
    yearOverYearChange: 0.0473,
    fiveYearCagr: 0.028,
    projectedNextYearRate: 219.85,
    projectedChange: 0.03,
    hasQualityIncentive: true,
    qualityBonusMax: 8.50,
    notes: [
      'Case-mix reimbursement based on RUG-IV',
      'Quality incentive program (QIPP) available',
      'Managed care penetration ~70%',
    ],
    lastUpdated: '2024-09-01',
  },

  FL: {
    state: 'FL',
    stateName: 'Florida',
    currentDailyRate: 228.75,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 178.40,
    capitalComponent: 32.85,
    ancillaryComponent: 17.50,
    priorYearRate: 218.50,
    yearOverYearChange: 0.0469,
    fiveYearCagr: 0.032,
    projectedNextYearRate: 237.90,
    projectedChange: 0.04,
    hasQualityIncentive: true,
    qualityBonusMax: 12.00,
    notes: [
      'PDPM-aligned case-mix system',
      'Strong quality incentive program',
      'High managed care enrollment',
    ],
    lastUpdated: '2024-07-01',
  },

  CA: {
    state: 'CA',
    stateName: 'California',
    currentDailyRate: 295.40,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 235.20,
    capitalComponent: 38.70,
    ancillaryComponent: 21.50,
    priorYearRate: 278.60,
    yearOverYearChange: 0.0603,
    fiveYearCagr: 0.045,
    projectedNextYearRate: 310.15,
    projectedChange: 0.05,
    hasQualityIncentive: true,
    qualityBonusMax: 15.00,
    notes: [
      'Highest Medicaid rates nationally',
      'Significant labor cost pressures',
      'CDPH survey scrutiny intensive',
    ],
    lastUpdated: '2024-07-01',
  },

  NY: {
    state: 'NY',
    stateName: 'New York',
    currentDailyRate: 312.80,
    effectiveDate: '2024-04-01',
    rateType: 'case_mix',
    nursingComponent: 248.50,
    capitalComponent: 42.30,
    ancillaryComponent: 22.00,
    priorYearRate: 298.25,
    yearOverYearChange: 0.0488,
    fiveYearCagr: 0.038,
    projectedNextYearRate: 325.30,
    projectedChange: 0.04,
    hasQualityIncentive: false,
    notes: [
      'Highest cost state for operations',
      'Complex regulatory environment',
      '1% assessment on gross receipts',
    ],
    lastUpdated: '2024-04-01',
  },

  PA: {
    state: 'PA',
    stateName: 'Pennsylvania',
    currentDailyRate: 245.60,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 195.80,
    capitalComponent: 32.50,
    ancillaryComponent: 17.30,
    priorYearRate: 234.85,
    yearOverYearChange: 0.0458,
    fiveYearCagr: 0.031,
    projectedNextYearRate: 255.40,
    projectedChange: 0.04,
    hasQualityIncentive: true,
    qualityBonusMax: 10.00,
    notes: [
      'County-based rate variations',
      'Strong managed care presence',
      'Quality incentive through OBRA rate',
    ],
    lastUpdated: '2024-07-01',
  },

  OH: {
    state: 'OH',
    stateName: 'Ohio',
    currentDailyRate: 218.90,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 172.40,
    capitalComponent: 29.80,
    ancillaryComponent: 16.70,
    priorYearRate: 208.45,
    yearOverYearChange: 0.0501,
    fiveYearCagr: 0.029,
    projectedNextYearRate: 226.50,
    projectedChange: 0.035,
    hasQualityIncentive: true,
    qualityBonusMax: 8.00,
    notes: [
      'Managed care ~90% penetration',
      'Quality incentive through franchise fee rebate',
      'Regional labor cost adjustments',
    ],
    lastUpdated: '2024-07-01',
  },

  IL: {
    state: 'IL',
    stateName: 'Illinois',
    currentDailyRate: 198.75,
    effectiveDate: '2024-07-01',
    rateType: 'flat',
    priorYearRate: 192.60,
    yearOverYearChange: 0.0319,
    fiveYearCagr: 0.022,
    projectedNextYearRate: 204.70,
    projectedChange: 0.03,
    hasQualityIncentive: false,
    notes: [
      'Flat rate system (non-case-mix)',
      'Rate increase historically below inflation',
      'Bed tax funds supplemental payments',
    ],
    lastUpdated: '2024-07-01',
  },

  GA: {
    state: 'GA',
    stateName: 'Georgia',
    currentDailyRate: 205.30,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 162.50,
    capitalComponent: 27.80,
    ancillaryComponent: 15.00,
    priorYearRate: 195.80,
    yearOverYearChange: 0.0485,
    fiveYearCagr: 0.033,
    projectedNextYearRate: 213.50,
    projectedChange: 0.04,
    hasQualityIncentive: true,
    qualityBonusMax: 7.50,
    notes: [
      'Growing managed care program',
      'Quality incentive through UPL payments',
      'Favorable regulatory environment',
    ],
    lastUpdated: '2024-07-01',
  },

  NC: {
    state: 'NC',
    stateName: 'North Carolina',
    currentDailyRate: 195.40,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 155.20,
    capitalComponent: 26.70,
    ancillaryComponent: 13.50,
    priorYearRate: 186.50,
    yearOverYearChange: 0.0477,
    fiveYearCagr: 0.028,
    projectedNextYearRate: 203.20,
    projectedChange: 0.04,
    hasQualityIncentive: false,
    notes: [
      'Certificate of Need state',
      'Limited supply growth',
      'Transitioning to managed care',
    ],
    lastUpdated: '2024-07-01',
  },

  TN: {
    state: 'TN',
    stateName: 'Tennessee',
    currentDailyRate: 188.60,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 149.80,
    capitalComponent: 25.30,
    ancillaryComponent: 13.50,
    priorYearRate: 180.40,
    yearOverYearChange: 0.0455,
    fiveYearCagr: 0.027,
    projectedNextYearRate: 195.70,
    projectedChange: 0.0375,
    hasQualityIncentive: true,
    qualityBonusMax: 6.00,
    notes: [
      'TennCare managed care program',
      'Quality metrics tied to payment',
      'Operator-friendly environment',
    ],
    lastUpdated: '2024-07-01',
  },

  AZ: {
    state: 'AZ',
    stateName: 'Arizona',
    currentDailyRate: 215.80,
    effectiveDate: '2024-10-01',
    rateType: 'case_mix',
    nursingComponent: 170.40,
    capitalComponent: 29.90,
    ancillaryComponent: 15.50,
    priorYearRate: 205.20,
    yearOverYearChange: 0.0517,
    fiveYearCagr: 0.035,
    projectedNextYearRate: 224.40,
    projectedChange: 0.04,
    hasQualityIncentive: true,
    qualityBonusMax: 9.00,
    notes: [
      'ALTCS managed care program',
      'Strong rate growth trajectory',
      'Growing senior population',
    ],
    lastUpdated: '2024-10-01',
  },

  IN: {
    state: 'IN',
    stateName: 'Indiana',
    currentDailyRate: 208.45,
    effectiveDate: '2024-07-01',
    rateType: 'case_mix',
    nursingComponent: 165.20,
    capitalComponent: 28.25,
    ancillaryComponent: 15.00,
    priorYearRate: 198.75,
    yearOverYearChange: 0.0488,
    fiveYearCagr: 0.030,
    projectedNextYearRate: 216.80,
    projectedChange: 0.04,
    hasQualityIncentive: true,
    qualityBonusMax: 8.50,
    notes: [
      'Managed care with quality-based payments',
      'Certificate of Need state',
      'Stable regulatory environment',
    ],
    lastUpdated: '2024-07-01',
  },

  // Default for states without specific data
  DEFAULT: {
    state: 'DEFAULT',
    stateName: 'Default',
    currentDailyRate: 200.00,
    effectiveDate: '2024-01-01',
    rateType: 'case_mix',
    priorYearRate: 192.00,
    yearOverYearChange: 0.0417,
    fiveYearCagr: 0.028,
    projectedNextYearRate: 208.00,
    projectedChange: 0.04,
    hasQualityIncentive: false,
    notes: ['Default values - state-specific data not available'],
    lastUpdated: '2024-01-01',
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Medicaid rate data for a state
 */
export function getStateMedicaidData(state: string): StateMedicaidData {
  return STATE_MEDICAID_RATES[state.toUpperCase()] || STATE_MEDICAID_RATES.DEFAULT;
}

/**
 * Calculate blended rate based on payer mix
 */
export function calculateBlendedRate(
  state: string,
  payerMix: {
    medicarePercent: number;
    medicaidPercent: number;
    managedCarePercent: number;
    privatePayPercent: number;
  }
): MarketRateComparison {
  const medicaidData = getStateMedicaidData(state);
  const medicaidRate = medicaidData.currentDailyRate;

  // Estimate other payer rates (simplified - these vary significantly)
  const medicareRateEstimate = medicaidRate * 2.2;  // Medicare typically 2-2.5x Medicaid
  const managedCareRateEstimate = medicaidRate * 1.3;  // MC typically 1.2-1.4x Medicaid
  const privatePayRateEstimate = medicaidRate * 1.8;  // Private typically 1.5-2x Medicaid

  const blendedRateAtMix =
    (medicareRateEstimate * payerMix.medicarePercent) +
    (medicaidRate * payerMix.medicaidPercent) +
    (managedCareRateEstimate * payerMix.managedCarePercent) +
    (privatePayRateEstimate * payerMix.privatePayPercent);

  return {
    state,
    medicaidRate,
    medicareRateEstimate,
    managedCareRateEstimate,
    privatePayRateEstimate,
    blendedRateAtMix,
  };
}

/**
 * Project revenue based on census and payer mix
 */
export function projectRevenue(
  state: string,
  beds: number,
  occupancy: number,
  payerMix: {
    medicarePercent: number;
    medicaidPercent: number;
    managedCarePercent: number;
    privatePayPercent: number;
  }
): {
  dailyRevenue: number;
  monthlyRevenue: number;
  annualRevenue: number;
  revenuePerBed: number;
  blendedPpd: number;
} {
  const rates = calculateBlendedRate(state, payerMix);
  const avgDailyCensus = beds * occupancy;

  const dailyRevenue = avgDailyCensus * rates.blendedRateAtMix;
  const monthlyRevenue = dailyRevenue * 30.44;  // Avg days per month
  const annualRevenue = dailyRevenue * 365;
  const revenuePerBed = annualRevenue / beds;

  return {
    dailyRevenue,
    monthlyRevenue,
    annualRevenue,
    revenuePerBed,
    blendedPpd: rates.blendedRateAtMix,
  };
}

/**
 * Compare facility rates to market
 */
export function compareToMarket(
  state: string,
  actualBlendedPpd: number
): {
  marketBlendedPpd: number;
  variancePercent: number;
  assessment: 'above_market' | 'at_market' | 'below_market';
} {
  // Use typical payer mix to estimate market rate
  const typicalMix = {
    medicarePercent: 0.20,
    medicaidPercent: 0.55,
    managedCarePercent: 0.15,
    privatePayPercent: 0.10,
  };

  const marketRates = calculateBlendedRate(state, typicalMix);
  const variancePercent = (actualBlendedPpd - marketRates.blendedRateAtMix) / marketRates.blendedRateAtMix;

  const assessment: 'above_market' | 'at_market' | 'below_market' =
    variancePercent > 0.05 ? 'above_market' :
    variancePercent < -0.05 ? 'below_market' : 'at_market';

  return {
    marketBlendedPpd: marketRates.blendedRateAtMix,
    variancePercent,
    assessment,
  };
}

/**
 * Get all states sorted by Medicaid rate
 */
export function getStatesByMedicaidRate(): { state: string; rate: number }[] {
  return Object.values(STATE_MEDICAID_RATES)
    .filter(s => s.state !== 'DEFAULT')
    .map(s => ({ state: s.state, rate: s.currentDailyRate }))
    .sort((a, b) => b.rate - a.rate);
}

/**
 * Get rate trend analysis for a state
 */
export function getRateTrendAnalysis(state: string): {
  currentRate: number;
  trend: 'strong' | 'moderate' | 'weak' | 'declining';
  fiveYearProjection: number;
  reimbursementRisk: 'low' | 'medium' | 'high';
} {
  const data = getStateMedicaidData(state);

  const trend: 'strong' | 'moderate' | 'weak' | 'declining' =
    data.fiveYearCagr >= 0.04 ? 'strong' :
    data.fiveYearCagr >= 0.025 ? 'moderate' :
    data.fiveYearCagr >= 0.01 ? 'weak' : 'declining';

  const fiveYearProjection = data.currentDailyRate * Math.pow(1 + data.fiveYearCagr, 5);

  // Assess reimbursement risk
  const reimbursementRisk: 'low' | 'medium' | 'high' =
    data.fiveYearCagr < 0.02 ? 'high' :
    data.fiveYearCagr < 0.03 ? 'medium' : 'low';

  return {
    currentRate: data.currentDailyRate,
    trend,
    fiveYearProjection,
    reimbursementRisk,
  };
}
