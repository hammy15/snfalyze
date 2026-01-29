/**
 * Quality Gate
 *
 * Controls when actions (analysis, valuation, export) can proceed
 * based on quality scores.
 */

import { QualityScore, QualityIssue, getQualityLevel } from './quality-calculator';

// ============================================================================
// TYPES
// ============================================================================

export type GateAction = 'analysis' | 'valuation' | 'export' | 'loi';

export type GateLevel = 'pass' | 'warn' | 'block';

export interface QualityGateResult {
  canProceed: boolean;
  gateLevel: GateLevel;
  blockers: QualityIssue[];
  warnings: QualityIssue[];
  bypassable: boolean;
  minimumScore: number;
  actualScore: number;
  message: string;
}

// ============================================================================
// GATE THRESHOLDS
// ============================================================================

const GATE_THRESHOLDS: Record<GateAction, { minimum: number; warn: number; bypassable: boolean }> = {
  analysis: {
    minimum: 40,
    warn: 60,
    bypassable: true, // Can proceed with acknowledgment
  },
  valuation: {
    minimum: 50,
    warn: 70,
    bypassable: true,
  },
  export: {
    minimum: 30,
    warn: 50,
    bypassable: true,
  },
  loi: {
    minimum: 60,
    warn: 80,
    bypassable: false, // Must meet quality for LOI
  },
};

// ============================================================================
// GATE FUNCTIONS
// ============================================================================

/**
 * Check if an action can proceed based on quality score
 */
export function checkQualityGate(
  score: QualityScore,
  issues: QualityIssue[],
  action: GateAction
): QualityGateResult {
  const threshold = GATE_THRESHOLDS[action];

  // Separate blockers and warnings
  const blockers = issues.filter((i) => i.severity === 'critical');
  const warnings = issues.filter((i) => i.severity === 'high' || i.severity === 'medium');

  // Determine gate level
  let gateLevel: GateLevel;
  let canProceed: boolean;
  let message: string;

  if (score.overall < threshold.minimum || blockers.length > 0) {
    gateLevel = 'block';
    canProceed = false;
    message = blockers.length > 0
      ? `Cannot proceed with ${action}: ${blockers.length} critical issue(s) must be resolved`
      : `Quality score (${score.overall}%) is below minimum (${threshold.minimum}%) for ${action}`;
  } else if (score.overall < threshold.warn || warnings.length > 3) {
    gateLevel = 'warn';
    canProceed = true;
    message = `Quality score (${score.overall}%) is below recommended (${threshold.warn}%) for ${action}. Results may be less reliable.`;
  } else {
    gateLevel = 'pass';
    canProceed = true;
    message = `Quality score (${score.overall}%) meets requirements for ${action}`;
  }

  return {
    canProceed,
    gateLevel,
    blockers,
    warnings,
    bypassable: threshold.bypassable && gateLevel === 'block' && blockers.length === 0,
    minimumScore: threshold.minimum,
    actualScore: score.overall,
    message,
  };
}

/**
 * Get required actions to pass gate
 */
export function getGateRequirements(
  gateResult: QualityGateResult,
  action: GateAction
): string[] {
  const requirements: string[] = [];

  if (gateResult.gateLevel === 'block') {
    // Critical blockers first
    for (const blocker of gateResult.blockers) {
      requirements.push(blocker.suggestedAction || blocker.message);
    }

    // Score improvement if no blockers
    if (gateResult.blockers.length === 0) {
      const pointsNeeded = gateResult.minimumScore - gateResult.actualScore;
      requirements.push(
        `Improve quality score by ${pointsNeeded} points (currently ${gateResult.actualScore}%, need ${gateResult.minimumScore}%)`
      );
    }
  }

  return requirements;
}

/**
 * Get action-specific quality requirements description
 */
export function getActionDescription(action: GateAction): {
  name: string;
  description: string;
  requirements: string[];
} {
  switch (action) {
    case 'analysis':
      return {
        name: 'Run Analysis',
        description: 'Execute decision engine, risk valuation, and master lease analysis',
        requirements: [
          'At least 40% quality score',
          'No critical issues',
          'Basic financial data present',
        ],
      };
    case 'valuation':
      return {
        name: 'Generate Valuation',
        description: 'Calculate risk-adjusted cap rates and property values',
        requirements: [
          'At least 50% quality score',
          'Revenue and expense data required',
          'Facility bed counts needed',
        ],
      };
    case 'export':
      return {
        name: 'Export Data',
        description: 'Export extracted data to spreadsheet or report',
        requirements: [
          'At least 30% quality score',
          'Any extracted data present',
        ],
      };
    case 'loi':
      return {
        name: 'Generate LOI',
        description: 'Generate Letter of Intent document',
        requirements: [
          'At least 60% quality score (cannot bypass)',
          'Complete financial picture required',
          'No critical or high-severity issues',
        ],
      };
  }
}
