// =============================================================================
// RISK ENGINE - Orchestrate risk assessment
// =============================================================================

import type {
  RiskAssessment,
  RiskFactor,
  RiskCategory,
  CMSData,
  OperatingMetrics,
  NormalizedFinancials,
  MarketData,
  FacilityProfile,
} from '../types';

import {
  ALL_RISK_FACTORS,
  evaluateRiskFactor,
  evaluateCategory,
  type RiskEvaluationData,
} from './risk-factors';

import {
  evaluateDealBreakers,
  type DealBreakerAssessment,
} from './deal-breakers';

// =============================================================================
// TYPES
// =============================================================================

export interface RiskEngineSettings {
  // Category weights (should sum to 1.0)
  categoryWeights: Record<RiskCategory, number>;

  // Thresholds
  thresholds: {
    critical: number;
    high: number;
    elevated: number;
    moderate: number;
  };

  // Options
  includeDealBreakers: boolean;
  includeRecommendations: boolean;
  maxKeyRisks: number;
}

export interface RiskEngineInput {
  facility: FacilityProfile;
  cmsData?: CMSData;
  operations?: OperatingMetrics;
  financials?: NormalizedFinancials;
  market?: MarketData;
}

export interface RiskEngineOutput {
  assessment: RiskAssessment;
  dealBreakers: DealBreakerAssessment;
  summary: {
    overallScore: number;
    overallRating: RiskAssessment['overallRating'];
    topRisks: string[];
    strengths: string[];
    recommendation: 'pursue' | 'conditional' | 'pass';
  };
}

// =============================================================================
// DEFAULT SETTINGS
// =============================================================================

const DEFAULT_SETTINGS: RiskEngineSettings = {
  categoryWeights: {
    regulatory: 0.30,
    operational: 0.20,
    financial: 0.25,
    market: 0.10,
    reputational: 0.10,
    legal: 0.02,
    environmental: 0.02,
    technology: 0.01,
  },
  thresholds: {
    critical: 80,
    high: 60,
    elevated: 40,
    moderate: 20,
  },
  includeDealBreakers: true,
  includeRecommendations: true,
  maxKeyRisks: 5,
};

// =============================================================================
// RISK ENGINE CLASS
// =============================================================================

export class RiskEngine {
  private settings: RiskEngineSettings;

  constructor(settings?: Partial<RiskEngineSettings>) {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
  }

  /**
   * Run full risk assessment
   */
  assess(input: RiskEngineInput): RiskEngineOutput {
    const evaluationData: RiskEvaluationData = {
      facility: input.facility,
      cmsData: input.cmsData,
      operations: input.operations,
      financials: input.financials,
      market: input.market,
    };

    // Evaluate deal breakers first
    const dealBreakers = this.settings.includeDealBreakers
      ? evaluateDealBreakers(evaluationData)
      : { anyTriggered: false, triggeredCount: 0, results: [] };

    // Evaluate all risk categories
    const categoryScores = this.evaluateAllCategories(evaluationData);

    // Calculate overall score
    const overallScore = this.calculateOverallScore(categoryScores);
    const overallRating = this.scoreToRating(overallScore);

    // Identify key risks
    const keyRisks = this.identifyKeyRisks(categoryScores);

    // Generate mitigants
    const mitigants = this.generateMitigants(keyRisks);

    // Generate recommendations
    const recommendations = this.settings.includeRecommendations
      ? this.generateRecommendations(categoryScores, keyRisks, dealBreakers)
      : [];

    // Identify due diligence focus areas
    const dueDiligenceFocus = this.identifyDueDiligenceFocus(categoryScores, keyRisks);

    // Build assessment
    const assessment: RiskAssessment = {
      facilityId: input.facility.id,
      assessmentDate: new Date().toISOString(),
      overallScore,
      overallRating,
      categoryScores,
      dealBreakers: {
        triggered: dealBreakers.anyTriggered,
        items: dealBreakers.results.map((r) => ({
          rule: r.name,
          threshold: r.result.threshold,
          actual: r.result.actual,
          triggered: r.result.triggered,
        })),
      },
      keyRisks,
      mitigants,
      recommendations,
      dueDiligenceFocus,
    };

    // Build summary
    const summary = this.buildSummary(assessment, dealBreakers);

    return {
      assessment,
      dealBreakers,
      summary,
    };
  }

  /**
   * Evaluate all risk categories
   */
  private evaluateAllCategories(
    data: RiskEvaluationData
  ): RiskAssessment['categoryScores'] {
    const categories: RiskCategory[] = [
      'regulatory',
      'operational',
      'financial',
      'market',
      'reputational',
      'legal',
      'environmental',
      'technology',
    ];

    const categoryScores: RiskAssessment['categoryScores'] = {} as RiskAssessment['categoryScores'];

    for (const category of categories) {
      const factors = evaluateCategory(category, data);
      const weight = this.settings.categoryWeights[category] || 0;

      // Calculate category score (weighted average of factor scores)
      let totalFactorWeight = 0;
      let weightedSum = 0;

      for (const factor of factors) {
        totalFactorWeight += factor.weight;
        weightedSum += factor.score * factor.weight;
      }

      const score = totalFactorWeight > 0 ? weightedSum / totalFactorWeight : 0;
      const weightedScore = score * weight;

      categoryScores[category] = {
        score,
        weight,
        weightedScore,
        factors,
      };
    }

    return categoryScores;
  }

  /**
   * Calculate overall risk score
   */
  private calculateOverallScore(
    categoryScores: RiskAssessment['categoryScores']
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const category of Object.keys(categoryScores) as RiskCategory[]) {
      const categoryData = categoryScores[category];
      if (categoryData.factors.length > 0) {
        totalWeight += categoryData.weight;
        weightedSum += categoryData.weightedScore;
      }
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  /**
   * Convert score to rating
   */
  private scoreToRating(score: number): RiskAssessment['overallRating'] {
    const { thresholds } = this.settings;

    if (score >= thresholds.critical) return 'critical';
    if (score >= thresholds.high) return 'high';
    if (score >= thresholds.elevated) return 'elevated';
    if (score >= thresholds.moderate) return 'moderate';
    if (score >= 10) return 'low';
    return 'very_low';
  }

  /**
   * Identify key risks (highest scoring factors)
   */
  private identifyKeyRisks(
    categoryScores: RiskAssessment['categoryScores']
  ): RiskFactor[] {
    const allFactors: RiskFactor[] = [];

    for (const category of Object.keys(categoryScores) as RiskCategory[]) {
      allFactors.push(...categoryScores[category].factors);
    }

    // Sort by score (highest first) and take top N
    return allFactors
      .filter((f) => f.score >= 40) // Only include elevated+ risks
      .sort((a, b) => b.score - a.score)
      .slice(0, this.settings.maxKeyRisks);
  }

  /**
   * Generate mitigants for identified risks
   */
  private generateMitigants(
    keyRisks: RiskFactor[]
  ): RiskAssessment['mitigants'] {
    const mitigants: RiskAssessment['mitigants'] = [];

    for (const risk of keyRisks) {
      const mitigant = this.getMitigant(risk);
      if (mitigant) {
        mitigants.push(mitigant);
      }
    }

    return mitigants;
  }

  /**
   * Get mitigant for a specific risk
   */
  private getMitigant(risk: RiskFactor): RiskAssessment['mitigants'][0] | null {
    // Standard mitigants based on risk category and severity
    const mitigantMap: Record<string, { mitigant: string; effectiveness: 'high' | 'medium' | 'low' }> = {
      'cms_overall_rating': {
        mitigant: 'Implement quality improvement program with QAPI framework',
        effectiveness: 'medium',
      },
      'health_inspection_rating': {
        mitigant: 'Conduct mock surveys and establish compliance monitoring',
        effectiveness: 'medium',
      },
      'sff_status': {
        mitigant: 'Engage CMS consultant and develop intensive remediation plan',
        effectiveness: 'low',
      },
      'occupancy_rate': {
        mitigant: 'Implement census building program with hospital liaison',
        effectiveness: 'medium',
      },
      'agency_utilization': {
        mitigant: 'Launch recruitment campaign with competitive wages and retention bonuses',
        effectiveness: 'medium',
      },
      'staffing_hppd': {
        mitigant: 'Increase staffing ratios and evaluate wage competitiveness',
        effectiveness: 'medium',
      },
      'ebitdar_margin': {
        mitigant: 'Implement revenue cycle optimization and cost reduction initiatives',
        effectiveness: 'medium',
      },
      'labor_cost_ratio': {
        mitigant: 'Review scheduling efficiency and agency replacement program',
        effectiveness: 'medium',
      },
      'payer_mix': {
        mitigant: 'Develop private pay marketing and Medicare admissions strategy',
        effectiveness: 'high',
      },
    };

    const mitigantInfo = mitigantMap[risk.name.toLowerCase().replace(/\s+/g, '_')];

    if (mitigantInfo) {
      return {
        risk: risk.name,
        mitigant: mitigantInfo.mitigant,
        effectiveness: mitigantInfo.effectiveness,
      };
    }

    // Generic mitigant based on category
    return {
      risk: risk.name,
      mitigant: `Address ${risk.category} risk through targeted improvement initiatives`,
      effectiveness: 'medium',
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    categoryScores: RiskAssessment['categoryScores'],
    keyRisks: RiskFactor[],
    dealBreakers: DealBreakerAssessment
  ): string[] {
    const recommendations: string[] = [];

    // Deal breaker recommendations
    if (dealBreakers.anyTriggered) {
      recommendations.push(
        'CRITICAL: Address deal-breaking issues before proceeding with acquisition'
      );

      for (const db of dealBreakers.results.filter((r) => r.result.triggered)) {
        if (db.result.reason) {
          recommendations.push(`• ${db.name}: ${db.result.reason}`);
        }
      }
    }

    // Category-specific recommendations
    for (const category of Object.keys(categoryScores) as RiskCategory[]) {
      const categoryData = categoryScores[category];
      if (categoryData.score >= 60) {
        recommendations.push(
          `HIGH PRIORITY: ${this.getCategoryRecommendation(category, categoryData.score)}`
        );
      } else if (categoryData.score >= 40) {
        recommendations.push(
          `Monitor: ${this.getCategoryRecommendation(category, categoryData.score)}`
        );
      }
    }

    // Key risk recommendations
    for (const risk of keyRisks.slice(0, 3)) {
      if (risk.recommendation) {
        recommendations.push(`• ${risk.name}: ${risk.recommendation}`);
      }
    }

    return recommendations.slice(0, 10);
  }

  /**
   * Get recommendation for a category
   */
  private getCategoryRecommendation(category: RiskCategory, score: number): string {
    const recommendations: Record<RiskCategory, string> = {
      regulatory: 'Conduct thorough regulatory due diligence including survey history review',
      operational: 'Evaluate staffing stability and develop operational improvement plan',
      financial: 'Perform detailed financial analysis and stress testing',
      market: 'Complete market study including competitive analysis',
      reputational: 'Review public reputation and develop communication strategy',
      legal: 'Conduct legal due diligence for pending litigation or claims',
      environmental: 'Order Phase I Environmental Site Assessment',
      technology: 'Assess IT infrastructure and EMR system requirements',
    };

    return recommendations[category];
  }

  /**
   * Identify due diligence focus areas
   */
  private identifyDueDiligenceFocus(
    categoryScores: RiskAssessment['categoryScores'],
    keyRisks: RiskFactor[]
  ): string[] {
    const focusAreas: string[] = [];

    // Add focus areas for high-scoring categories
    const sortedCategories = (Object.entries(categoryScores) as [RiskCategory, typeof categoryScores[RiskCategory]][])
      .sort((a, b) => b[1].score - a[1].score);

    for (const [category, data] of sortedCategories.slice(0, 3)) {
      if (data.score >= 30) {
        focusAreas.push(this.getCategoryFocusArea(category));
      }
    }

    // Add focus areas for key risks
    for (const risk of keyRisks) {
      const focusArea = this.getRiskFocusArea(risk);
      if (focusArea && !focusAreas.includes(focusArea)) {
        focusAreas.push(focusArea);
      }
    }

    return focusAreas.slice(0, 8);
  }

  /**
   * Get focus area for category
   */
  private getCategoryFocusArea(category: RiskCategory): string {
    const focusAreas: Record<RiskCategory, string> = {
      regulatory: 'Review last 3 years of survey reports and plans of correction',
      operational: 'Analyze staffing trends, turnover, and scheduling practices',
      financial: 'Verify financial statements and analyze revenue cycle',
      market: 'Conduct competitive analysis and demographic study',
      reputational: 'Search news, reviews, and litigation history',
      legal: 'Review pending claims and insurance coverage',
      environmental: 'Obtain environmental reports and assess compliance',
      technology: 'Evaluate EMR, infrastructure, and IT security',
    };

    return focusAreas[category];
  }

  /**
   * Get focus area for specific risk
   */
  private getRiskFocusArea(risk: RiskFactor): string | null {
    if (risk.name.includes('CMS') || risk.name.includes('Rating')) {
      return 'Obtain detailed CMS data and state survey history';
    }
    if (risk.name.includes('Occupancy')) {
      return 'Analyze census trends and referral source relationships';
    }
    if (risk.name.includes('Staff') || risk.name.includes('Agency')) {
      return 'Interview key staff and review HR records';
    }
    if (risk.name.includes('Margin') || risk.name.includes('NOI')) {
      return 'Perform detailed P&L analysis with management';
    }
    if (risk.name.includes('Payer')) {
      return 'Review payer contracts and reimbursement rates';
    }
    return null;
  }

  /**
   * Build summary
   */
  private buildSummary(
    assessment: RiskAssessment,
    dealBreakers: DealBreakerAssessment
  ): RiskEngineOutput['summary'] {
    // Get top risks
    const topRisks = assessment.keyRisks.slice(0, 3).map((r) => r.name);

    // Get strengths (low-scoring factors)
    const allFactors: RiskFactor[] = [];
    for (const category of Object.keys(assessment.categoryScores) as RiskCategory[]) {
      allFactors.push(...assessment.categoryScores[category].factors);
    }
    const strengths = allFactors
      .filter((f) => f.score <= 20)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map((f) => f.name);

    // Determine recommendation
    let recommendation: 'pursue' | 'conditional' | 'pass';

    if (dealBreakers.anyTriggered) {
      recommendation = 'pass';
    } else if (assessment.overallScore >= 60) {
      recommendation = 'pass';
    } else if (assessment.overallScore >= 35) {
      recommendation = 'conditional';
    } else {
      recommendation = 'pursue';
    }

    return {
      overallScore: assessment.overallScore,
      overallRating: assessment.overallRating,
      topRisks,
      strengths,
      recommendation,
    };
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<RiskEngineSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Get current settings
   */
  getSettings(): RiskEngineSettings {
    return { ...this.settings };
  }

  /**
   * Get default settings
   */
  static getDefaultSettings(): RiskEngineSettings {
    return { ...DEFAULT_SETTINGS };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const riskEngine = new RiskEngine();
