/**
 * Quality Score Calculator
 *
 * Core algorithms for calculating quality scores at different levels.
 * Quality Score = weighted average of:
 *   - Completeness (30%): % of required fields present
 *   - Confidence (25%): AI extraction confidence
 *   - Consistency (25%): Cross-document agreement
 *   - Validation (20%): Business rule compliance
 */

// ============================================================================
// TYPES
// ============================================================================

export interface QualityScore {
  overall: number; // 0-100
  breakdown: {
    completeness: number;
    confidence: number;
    consistency: number;
    validation: number;
  };
  level: QualityLevel;
  canProceedToAnalysis: boolean;
}

export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';

export interface QualityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'missing_data' | 'conflict' | 'validation' | 'confidence' | 'stale_data';
  field?: string;
  facilityId?: string;
  facilityName?: string;
  message: string;
  suggestedAction?: string;
}

export interface CompletenessData {
  revenue: {
    present: boolean;
    fields: { name: string; present: boolean; required: boolean }[];
  };
  expenses: {
    present: boolean;
    fields: { name: string; present: boolean; required: boolean }[];
  };
  census: {
    present: boolean;
    fields: { name: string; present: boolean; required: boolean }[];
  };
  rates: {
    present: boolean;
    fields: { name: string; present: boolean; required: boolean }[];
  };
  facilityInfo: {
    present: boolean;
    fields: { name: string; present: boolean; required: boolean }[];
  };
}

export interface FacilityQualityInput {
  id: string;
  name: string;
  dataCompleteness: number;
  dataConfidence: number;
  hasRevenue: boolean;
  hasExpenses: boolean;
  hasCensus: boolean;
  hasRates: boolean;
  licensedBeds?: number;
  financialPeriodCount: number;
  censusPeriodCount: number;
  latestPeriodDate?: Date;
}

export interface DealQualityInput {
  dealId: string;
  facilities: FacilityQualityInput[];
  conflictCount: number;
  criticalConflictCount: number;
  clarificationCount: number;
  resolvedClarificationCount: number;
  documentCount: number;
  documentConfidences: number[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WEIGHTS = {
  completeness: 0.30,
  confidence: 0.25,
  consistency: 0.25,
  validation: 0.20,
};

const QUALITY_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
  analysisMinimum: 40,
};

// ============================================================================
// CALCULATOR FUNCTIONS
// ============================================================================

/**
 * Calculate completeness score based on required fields present
 */
export function calculateCompletenessScore(facilities: FacilityQualityInput[]): number {
  if (facilities.length === 0) return 0;

  let totalScore = 0;

  for (const facility of facilities) {
    let facilityScore = 0;
    const maxScore = 100;

    // Revenue data (35 points) - most critical
    if (facility.hasRevenue) facilityScore += 35;

    // Expense data (25 points)
    if (facility.hasExpenses) facilityScore += 25;

    // Census data (20 points)
    if (facility.hasCensus) facilityScore += 20;

    // Rate data (10 points)
    if (facility.hasRates) facilityScore += 10;

    // Basic info (10 points)
    if (facility.licensedBeds) facilityScore += 5;
    if (facility.financialPeriodCount >= 3) facilityScore += 5;

    totalScore += Math.min(maxScore, facilityScore);
  }

  return Math.round(totalScore / facilities.length);
}

/**
 * Calculate confidence score from AI extraction confidence
 */
export function calculateConfidenceScore(
  facilities: FacilityQualityInput[],
  documentConfidences: number[]
): number {
  const confidences: number[] = [];

  // Facility data confidence
  for (const facility of facilities) {
    if (facility.dataConfidence > 0) {
      confidences.push(facility.dataConfidence);
    }
  }

  // Document extraction confidence
  confidences.push(...documentConfidences.filter((c) => c > 0));

  if (confidences.length === 0) return 0;

  return Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);
}

/**
 * Calculate consistency score based on conflicts
 */
export function calculateConsistencyScore(
  conflictCount: number,
  criticalConflictCount: number,
  clarificationCount: number,
  resolvedClarificationCount: number
): number {
  // Start at 100, deduct for issues
  let score = 100;

  // Critical conflicts are major deductions (-20 each, max -60)
  score -= Math.min(60, criticalConflictCount * 20);

  // Regular conflicts (-5 each, max -30)
  score -= Math.min(30, conflictCount * 5);

  // Unresolved clarifications (-3 each, max -30)
  const unresolvedCount = clarificationCount - resolvedClarificationCount;
  score -= Math.min(30, unresolvedCount * 3);

  // Bonus for resolved clarifications (+2 each, max +10)
  score += Math.min(10, resolvedClarificationCount * 2);

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate validation score based on business rules
 */
export function calculateValidationScore(facilities: FacilityQualityInput[]): number {
  if (facilities.length === 0) return 0;

  let totalScore = 0;

  for (const facility of facilities) {
    let facilityScore = 100;

    // Check data freshness (deduct if data is old)
    if (facility.latestPeriodDate) {
      const daysSinceLatest = Math.floor(
        (Date.now() - facility.latestPeriodDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLatest > 365) {
        facilityScore -= 40; // Over a year old
      } else if (daysSinceLatest > 180) {
        facilityScore -= 20; // Over 6 months old
      } else if (daysSinceLatest > 90) {
        facilityScore -= 10; // Over 3 months old
      }
    } else {
      facilityScore -= 30; // No date info
    }

    // Check data sufficiency
    if (facility.financialPeriodCount < 3) {
      facilityScore -= 20; // Less than 3 months of financials
    }

    if (facility.censusPeriodCount < 3 && facility.hasCensus) {
      facilityScore -= 10; // Less than 3 months of census
    }

    // Require both revenue and expenses for valid analysis
    if (!facility.hasRevenue || !facility.hasExpenses) {
      facilityScore -= 30;
    }

    totalScore += Math.max(0, facilityScore);
  }

  return Math.round(totalScore / facilities.length);
}

/**
 * Calculate overall quality score
 */
export function calculateOverallScore(input: DealQualityInput): QualityScore {
  const completeness = calculateCompletenessScore(input.facilities);
  const confidence = calculateConfidenceScore(input.facilities, input.documentConfidences);
  const consistency = calculateConsistencyScore(
    input.conflictCount,
    input.criticalConflictCount,
    input.clarificationCount,
    input.resolvedClarificationCount
  );
  const validation = calculateValidationScore(input.facilities);

  const overall = Math.round(
    completeness * WEIGHTS.completeness +
      confidence * WEIGHTS.confidence +
      consistency * WEIGHTS.consistency +
      validation * WEIGHTS.validation
  );

  return {
    overall,
    breakdown: {
      completeness,
      confidence,
      consistency,
      validation,
    },
    level: getQualityLevel(overall),
    canProceedToAnalysis: overall >= QUALITY_THRESHOLDS.analysisMinimum,
  };
}

/**
 * Get quality level label from score
 */
export function getQualityLevel(score: number): QualityLevel {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (score >= QUALITY_THRESHOLDS.good) return 'good';
  if (score >= QUALITY_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

/**
 * Get color for quality level
 */
export function getQualityColor(level: QualityLevel): string {
  switch (level) {
    case 'excellent':
      return '#22c55e'; // green
    case 'good':
      return '#eab308'; // yellow
    case 'fair':
      return '#f97316'; // orange
    case 'poor':
      return '#ef4444'; // red
  }
}

/**
 * Detect quality issues from input data
 */
export function detectQualityIssues(input: DealQualityInput): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check each facility for issues
  for (const facility of input.facilities) {
    // Missing revenue data
    if (!facility.hasRevenue) {
      issues.push({
        id: `missing-revenue-${facility.id}`,
        severity: 'critical',
        category: 'missing_data',
        field: 'revenue',
        facilityId: facility.id,
        facilityName: facility.name,
        message: `No revenue data for ${facility.name}`,
        suggestedAction: 'Upload financial statements with revenue information',
      });
    }

    // Missing expense data
    if (!facility.hasExpenses) {
      issues.push({
        id: `missing-expenses-${facility.id}`,
        severity: 'high',
        category: 'missing_data',
        field: 'expenses',
        facilityId: facility.id,
        facilityName: facility.name,
        message: `No expense data for ${facility.name}`,
        suggestedAction: 'Upload financial statements with expense breakdown',
      });
    }

    // Missing census data
    if (!facility.hasCensus) {
      issues.push({
        id: `missing-census-${facility.id}`,
        severity: 'medium',
        category: 'missing_data',
        field: 'census',
        facilityId: facility.id,
        facilityName: facility.name,
        message: `No census/occupancy data for ${facility.name}`,
        suggestedAction: 'Upload census reports or rent rolls',
      });
    }

    // Low confidence
    if (facility.dataConfidence > 0 && facility.dataConfidence < 70) {
      issues.push({
        id: `low-confidence-${facility.id}`,
        severity: 'medium',
        category: 'confidence',
        facilityId: facility.id,
        facilityName: facility.name,
        message: `Low extraction confidence (${facility.dataConfidence}%) for ${facility.name}`,
        suggestedAction: 'Review extracted data for accuracy',
      });
    }

    // Stale data
    if (facility.latestPeriodDate) {
      const daysSinceLatest = Math.floor(
        (Date.now() - facility.latestPeriodDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceLatest > 180) {
        issues.push({
          id: `stale-data-${facility.id}`,
          severity: daysSinceLatest > 365 ? 'high' : 'medium',
          category: 'stale_data',
          facilityId: facility.id,
          facilityName: facility.name,
          message: `Financial data is ${Math.round(daysSinceLatest / 30)} months old for ${facility.name}`,
          suggestedAction: 'Upload more recent financial statements',
        });
      }
    }

    // Insufficient periods
    if (facility.financialPeriodCount < 3 && facility.hasRevenue) {
      issues.push({
        id: `insufficient-periods-${facility.id}`,
        severity: 'low',
        category: 'missing_data',
        facilityId: facility.id,
        facilityName: facility.name,
        message: `Only ${facility.financialPeriodCount} month(s) of data for ${facility.name}`,
        suggestedAction: 'Upload additional months for trend analysis',
      });
    }
  }

  // Deal-level issues
  if (input.criticalConflictCount > 0) {
    issues.push({
      id: 'critical-conflicts',
      severity: 'critical',
      category: 'conflict',
      message: `${input.criticalConflictCount} critical data conflict(s) require resolution`,
      suggestedAction: 'Review and resolve conflicting values in the clarifications tab',
    });
  }

  if (input.conflictCount > 3) {
    issues.push({
      id: 'multiple-conflicts',
      severity: 'high',
      category: 'conflict',
      message: `${input.conflictCount} data conflicts detected across documents`,
      suggestedAction: 'Review cross-document conflicts',
    });
  }

  const unresolvedCount = input.clarificationCount - input.resolvedClarificationCount;
  if (unresolvedCount > 5) {
    issues.push({
      id: 'unresolved-clarifications',
      severity: 'medium',
      category: 'validation',
      message: `${unresolvedCount} clarification(s) pending review`,
      suggestedAction: 'Review and resolve pending clarifications',
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return issues;
}

/**
 * Generate recommendations based on quality score
 */
export function generateRecommendations(
  score: QualityScore,
  issues: QualityIssue[]
): string[] {
  const recommendations: string[] = [];

  // Completeness recommendations
  if (score.breakdown.completeness < 60) {
    const missingRevenue = issues.filter(
      (i) => i.category === 'missing_data' && i.field === 'revenue'
    );
    if (missingRevenue.length > 0) {
      recommendations.push(
        `Upload financial statements for ${missingRevenue.length} facilit${missingRevenue.length > 1 ? 'ies' : 'y'} to enable valuation`
      );
    }

    const missingCensus = issues.filter(
      (i) => i.category === 'missing_data' && i.field === 'census'
    );
    if (missingCensus.length > 0) {
      recommendations.push(
        `Add census data to improve payer mix analysis`
      );
    }
  }

  // Consistency recommendations
  if (score.breakdown.consistency < 70) {
    const conflictIssues = issues.filter((i) => i.category === 'conflict');
    if (conflictIssues.length > 0) {
      recommendations.push(
        `Resolve ${conflictIssues.length} data conflict(s) to improve reliability`
      );
    }
  }

  // Confidence recommendations
  if (score.breakdown.confidence < 70) {
    recommendations.push(
      `Review extracted data for accuracy - some values have low confidence`
    );
  }

  // Validation recommendations
  if (score.breakdown.validation < 60) {
    const staleIssues = issues.filter((i) => i.category === 'stale_data');
    if (staleIssues.length > 0) {
      recommendations.push(
        `Upload more recent financials - current data may be outdated`
      );
    }
  }

  // Overall recommendations
  if (score.overall < QUALITY_THRESHOLDS.analysisMinimum) {
    recommendations.unshift(
      `Quality score (${score.overall}%) is below minimum for analysis. Address critical issues first.`
    );
  } else if (score.level === 'fair') {
    recommendations.push(
      `Consider resolving medium-priority issues for more reliable analysis`
    );
  }

  return recommendations;
}
