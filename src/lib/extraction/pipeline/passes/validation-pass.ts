/**
 * Validation Pass
 *
 * Pass 3 of the extraction pipeline - cross-validates extracted data,
 * checks for conflicts, and runs reconciliation checks.
 */

import { nanoid } from 'nanoid';
import type {
  ExtractionContext,
  DataConflict,
  PipelineClarification,
  NormalizedFinancialPeriod,
  NormalizedCensusPeriod,
  NormalizedPayerRate,
  VALIDATION_THRESHOLDS,
} from '../types';
import { ExtractionContextManager } from '../context/extraction-context';

// Validation thresholds
const THRESHOLDS = {
  autoResolveVariance: 0.03,
  clarificationThreshold: 0.05,
  errorThreshold: 0.15,
  minAutoAcceptConfidence: 90,
  revenueReconciliationTolerance: 0.05,
  periodChangeThresholds: {
    revenue: 0.20,
    expenses: 0.25,
    occupancy: 0.15,
    rates: 0.10,
  },
};

// ============================================================================
// VALIDATION PASS EXECUTOR
// ============================================================================

export interface ValidationPassResult {
  isValid: boolean;
  conflicts: DataConflict[];
  clarifications: PipelineClarification[];
  autoResolved: { conflictId: string; resolution: string }[];
  warnings: string[];
  validationScore: number;
  processingTimeMs: number;
}

export async function executeValidationPass(params: {
  contextManager: ExtractionContextManager;
  onProgress?: (progress: number, message: string) => void;
}): Promise<ValidationPassResult> {
  const { contextManager, onProgress } = params;
  const startTime = Date.now();

  const conflicts: DataConflict[] = [];
  const clarifications: PipelineClarification[] = [];
  const autoResolved: { conflictId: string; resolution: string }[] = [];
  const warnings: string[] = [];

  onProgress?.(0, 'Starting validation pass...');

  // 1. Validate cross-document consistency
  onProgress?.(10, 'Checking cross-document consistency...');
  const crossDocConflicts = validateCrossDocumentConsistency(contextManager);
  conflicts.push(...crossDocConflicts);

  // 2. Validate period-over-period changes
  onProgress?.(30, 'Checking period-over-period changes...');
  const periodConflicts = validatePeriodOverPeriod(contextManager);
  conflicts.push(...periodConflicts);

  // 3. Revenue reconciliation (Census × Rates ≈ Revenue)
  onProgress?.(50, 'Running revenue reconciliation...');
  const reconConflicts = validateRevenueReconciliation(contextManager);
  conflicts.push(...reconConflicts);

  // 4. Internal consistency checks
  onProgress?.(70, 'Checking internal consistency...');
  const internalConflicts = validateInternalConsistency(contextManager);
  conflicts.push(...internalConflicts);

  // 5. Auto-resolve low-variance conflicts
  onProgress?.(85, 'Auto-resolving minor conflicts...');
  for (const conflict of conflicts) {
    if (conflict.status === 'detected') {
      const resolution = attemptAutoResolve(conflict, contextManager);
      if (resolution) {
        autoResolved.push(resolution);
      }
    }
  }

  // 6. Generate clarifications for remaining conflicts
  onProgress?.(95, 'Generating clarification requests...');
  for (const conflict of conflicts) {
    if (conflict.status === 'detected' || conflict.status === 'pending_clarification') {
      const clarification = conflictToClarification(conflict, contextManager);
      clarifications.push(clarification);
      contextManager.addClarification(clarification);
    }
  }

  // Add conflicts to context
  for (const conflict of conflicts) {
    if (!contextManager.getDetectedConflicts().find((c) => c.id === conflict.id)) {
      contextManager.addConflict(conflict);
    }
  }

  // Calculate validation score
  const validationScore = calculateValidationScore(contextManager, conflicts);

  onProgress?.(100, 'Validation pass complete');

  return {
    isValid: conflicts.filter((c) => c.severity === 'critical' || c.severity === 'high').length === 0,
    conflicts,
    clarifications,
    autoResolved,
    warnings,
    validationScore,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// CROSS-DOCUMENT VALIDATION
// ============================================================================

function validateCrossDocumentConsistency(contextManager: ExtractionContextManager): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const context = contextManager.getContext();

  // Group financial periods by facility and period
  const periodGroups = groupByFacilityAndPeriod(context.extractedPeriods);

  for (const [key, periods] of periodGroups) {
    if (periods.length < 2) continue;

    // Check revenue consistency
    const revenues = periods.map((p) => ({ value: p.revenue.total, source: p.sources[0], confidence: p.confidence }));
    const revenueConflict = checkValueConsistency(revenues, 'revenue.total', key);
    if (revenueConflict) {
      conflicts.push(revenueConflict);
    }

    // Check expenses consistency
    const expenses = periods.map((p) => ({ value: p.expenses.total, source: p.sources[0], confidence: p.confidence }));
    const expenseConflict = checkValueConsistency(expenses, 'expenses.total', key);
    if (expenseConflict) {
      conflicts.push(expenseConflict);
    }

    // Check NOI consistency
    const nois = periods.map((p) => ({ value: p.metrics.noi, source: p.sources[0], confidence: p.confidence }));
    const noiConflict = checkValueConsistency(nois, 'metrics.noi', key);
    if (noiConflict) {
      conflicts.push(noiConflict);
    }
  }

  return conflicts;
}

function groupByFacilityAndPeriod<T extends { facilityId: string; periodStart: Date; periodEnd: Date }>(
  items: T[]
): Map<string, T[]> {
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const key = `${item.facilityId}_${item.periodStart.toISOString()}_${item.periodEnd.toISOString()}`;
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  return groups;
}

function checkValueConsistency(
  values: { value: number; source: import('../types').DataSource; confidence: number }[],
  fieldPath: string,
  periodKey: string
): DataConflict | null {
  if (values.length < 2) return null;

  const numericValues = values.filter((v) => v.value > 0);
  if (numericValues.length < 2) return null;

  const avg = numericValues.reduce((sum, v) => sum + v.value, 0) / numericValues.length;
  const maxDiff = Math.max(...numericValues.map((v) => Math.abs(v.value - avg)));
  const variancePercent = avg > 0 ? maxDiff / avg : 0;

  if (variancePercent <= THRESHOLDS.clarificationThreshold) return null;

  const severity =
    variancePercent > THRESHOLDS.errorThreshold
      ? 'high'
      : variancePercent > THRESHOLDS.clarificationThreshold
      ? 'medium'
      : 'low';

  return {
    id: nanoid(),
    type: 'cross_document',
    severity,
    fieldPath,
    periodKey,
    values: numericValues.map((v) => ({
      value: v.value,
      source: v.source,
      confidence: v.confidence,
    })),
    variancePercent,
    varianceAbsolute: maxDiff,
    status: 'detected',
    detectedAt: new Date(),
  };
}

// ============================================================================
// PERIOD-OVER-PERIOD VALIDATION
// ============================================================================

function validatePeriodOverPeriod(contextManager: ExtractionContextManager): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const context = contextManager.getContext();

  // Group by facility
  const facilityPeriods = new Map<string, NormalizedFinancialPeriod[]>();
  for (const period of context.extractedPeriods) {
    const existing = facilityPeriods.get(period.facilityId) || [];
    existing.push(period);
    facilityPeriods.set(period.facilityId, existing);
  }

  for (const [facilityId, periods] of facilityPeriods) {
    // Sort by period start date
    periods.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());

    for (let i = 1; i < periods.length; i++) {
      const prev = periods[i - 1];
      const curr = periods[i];

      // Check revenue change
      if (prev.revenue.total > 0) {
        const revenueChange = (curr.revenue.total - prev.revenue.total) / prev.revenue.total;
        if (Math.abs(revenueChange) > THRESHOLDS.periodChangeThresholds.revenue) {
          conflicts.push({
            id: nanoid(),
            type: 'cross_period',
            severity: Math.abs(revenueChange) > 0.5 ? 'high' : 'medium',
            fieldPath: 'revenue.total',
            facilityId,
            periodKey: `${prev.periodEnd.toISOString()}_to_${curr.periodStart.toISOString()}`,
            values: [
              { value: prev.revenue.total, source: prev.sources[0], confidence: prev.confidence },
              { value: curr.revenue.total, source: curr.sources[0], confidence: curr.confidence },
            ],
            variancePercent: Math.abs(revenueChange),
            varianceAbsolute: Math.abs(curr.revenue.total - prev.revenue.total),
            status: 'detected',
            detectedAt: new Date(),
          });
        }
      }

      // Check expense change
      if (prev.expenses.total > 0) {
        const expenseChange = (curr.expenses.total - prev.expenses.total) / prev.expenses.total;
        if (Math.abs(expenseChange) > THRESHOLDS.periodChangeThresholds.expenses) {
          conflicts.push({
            id: nanoid(),
            type: 'cross_period',
            severity: Math.abs(expenseChange) > 0.5 ? 'high' : 'medium',
            fieldPath: 'expenses.total',
            facilityId,
            periodKey: `${prev.periodEnd.toISOString()}_to_${curr.periodStart.toISOString()}`,
            values: [
              { value: prev.expenses.total, source: prev.sources[0], confidence: prev.confidence },
              { value: curr.expenses.total, source: curr.sources[0], confidence: curr.confidence },
            ],
            variancePercent: Math.abs(expenseChange),
            varianceAbsolute: Math.abs(curr.expenses.total - prev.expenses.total),
            status: 'detected',
            detectedAt: new Date(),
          });
        }
      }
    }
  }

  return conflicts;
}

// ============================================================================
// REVENUE RECONCILIATION
// ============================================================================

function validateRevenueReconciliation(contextManager: ExtractionContextManager): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const context = contextManager.getContext();

  // Get calculated revenue from context (populated during census addition)
  for (const [periodKey, calculated] of context.crossReferenceIndex.calculatedRevenue) {
    if (Math.abs(calculated.variancePercent) > THRESHOLDS.revenueReconciliationTolerance) {
      // Check if we already have a conflict for this
      const existingConflict = context.detectedConflicts.find(
        (c) => c.type === 'revenue_reconciliation' && c.periodKey === periodKey
      );

      if (!existingConflict) {
        conflicts.push({
          id: nanoid(),
          type: 'revenue_reconciliation',
          severity: Math.abs(calculated.variancePercent) > 0.15 ? 'high' : 'medium',
          fieldPath: 'revenue.total',
          periodKey,
          values: [
            {
              value: calculated.reportedTotal,
              source: {
                documentId: 'reported',
                filename: 'P&L Statement',
                extractedAt: new Date(),
              },
              confidence: 80,
            },
            {
              value: calculated.calculatedTotal,
              source: {
                documentId: 'calculated',
                filename: 'Census × Rates',
                extractedAt: new Date(),
              },
              confidence: 70,
            },
          ],
          variancePercent: Math.abs(calculated.variancePercent),
          varianceAbsolute: Math.abs(calculated.variance),
          status: 'detected',
          detectedAt: new Date(),
        });
      }
    }
  }

  return conflicts;
}

// ============================================================================
// INTERNAL CONSISTENCY
// ============================================================================

function validateInternalConsistency(contextManager: ExtractionContextManager): DataConflict[] {
  const conflicts: DataConflict[] = [];
  const context = contextManager.getContext();

  for (const period of context.extractedPeriods) {
    // Check: Total expenses should equal sum of components
    const laborTotal = period.expenses.labor.total;
    const operatingTotal = Object.values(period.expenses.operating).reduce((a, b) => a + b, 0);
    const fixedTotal = Object.values(period.expenses.fixed).reduce((a, b) => a + b, 0);
    const componentsSum = laborTotal + operatingTotal + fixedTotal;

    if (period.expenses.total > 0 && componentsSum > 0) {
      const expenseVariance = Math.abs(period.expenses.total - componentsSum) / period.expenses.total;

      if (expenseVariance > 0.05) {
        conflicts.push({
          id: nanoid(),
          type: 'internal_consistency',
          severity: expenseVariance > 0.15 ? 'high' : 'medium',
          fieldPath: 'expenses.total',
          facilityId: period.facilityId,
          periodKey: `${period.periodStart.toISOString()}_${period.periodEnd.toISOString()}`,
          values: [
            { value: period.expenses.total, source: period.sources[0], confidence: period.confidence },
            { value: componentsSum, source: { ...period.sources[0], filename: 'Sum of components' }, confidence: 85 },
          ],
          variancePercent: expenseVariance,
          varianceAbsolute: Math.abs(period.expenses.total - componentsSum),
          status: 'detected',
          detectedAt: new Date(),
        });
      }
    }

    // Check: Labor = Core + Agency + Benefits
    const laborComponents = period.expenses.labor.core + period.expenses.labor.agency + period.expenses.labor.benefits;
    if (laborTotal > 0 && laborComponents > 0) {
      const laborVariance = Math.abs(laborTotal - laborComponents) / laborTotal;

      if (laborVariance > 0.05) {
        conflicts.push({
          id: nanoid(),
          type: 'internal_consistency',
          severity: 'low',
          fieldPath: 'expenses.labor.total',
          facilityId: period.facilityId,
          periodKey: `${period.periodStart.toISOString()}_${period.periodEnd.toISOString()}`,
          values: [
            { value: laborTotal, source: period.sources[0], confidence: period.confidence },
            { value: laborComponents, source: { ...period.sources[0], filename: 'Core + Agency + Benefits' }, confidence: 80 },
          ],
          variancePercent: laborVariance,
          varianceAbsolute: Math.abs(laborTotal - laborComponents),
          status: 'detected',
          detectedAt: new Date(),
        });
      }
    }
  }

  return conflicts;
}

// ============================================================================
// AUTO-RESOLUTION
// ============================================================================

function attemptAutoResolve(
  conflict: DataConflict,
  contextManager: ExtractionContextManager
): { conflictId: string; resolution: string } | null {
  // Only auto-resolve if variance is below threshold
  if (conflict.variancePercent > THRESHOLDS.autoResolveVariance) {
    return null;
  }

  // Only auto-resolve cross_document and internal_consistency
  if (conflict.type !== 'cross_document' && conflict.type !== 'internal_consistency') {
    return null;
  }

  // Use highest confidence value
  const sortedValues = [...conflict.values].sort((a, b) => b.confidence - a.confidence);
  const resolvedValue = sortedValues[0].value;

  contextManager.resolveConflict(
    conflict.id,
    resolvedValue,
    'auto_highest_confidence',
    `Auto-resolved: used highest confidence value (${sortedValues[0].confidence}%)`
  );

  return {
    conflictId: conflict.id,
    resolution: `Used ${sortedValues[0].source.filename} value: ${resolvedValue.toLocaleString()} (confidence: ${sortedValues[0].confidence}%)`,
  };
}

// ============================================================================
// CLARIFICATION CONVERSION
// ============================================================================

function conflictToClarification(
  conflict: DataConflict,
  contextManager: ExtractionContextManager
): PipelineClarification {
  const sessionId = contextManager.getSessionId();
  const dealId = contextManager.getDealId();

  // Generate suggested values
  const suggestedValues = conflict.values.map((v) => ({
    value: v.value,
    source: v.source.filename,
    confidence: v.confidence,
    reasoning: `From ${v.source.filename}`,
  }));

  // Add average as suggestion for cross-document conflicts
  if (conflict.type === 'cross_document' && conflict.values.length > 1) {
    const avg = conflict.values.reduce((sum, v) => sum + v.value, 0) / conflict.values.length;
    suggestedValues.push({
      value: Math.round(avg),
      source: 'Calculated average',
      confidence: 60,
      reasoning: 'Average of all extracted values',
    });
  }

  // Determine priority based on severity and field
  let priority = 5;
  if (conflict.severity === 'critical') priority = 10;
  else if (conflict.severity === 'high') priority = 8;
  else if (conflict.severity === 'medium') priority = 6;

  // Increase priority for critical fields
  const criticalFields = ['revenue.total', 'expenses.total', 'metrics.noi', 'metrics.ebitdar'];
  if (criticalFields.includes(conflict.fieldPath)) {
    priority = Math.min(10, priority + 2);
  }

  return {
    id: nanoid(),
    sessionId,
    dealId,
    facilityId: conflict.facilityId,
    fieldPath: conflict.fieldPath,
    fieldLabel: formatFieldLabel(conflict.fieldPath),
    clarificationType: 'conflict',
    priority,
    extractedValue: conflict.values[0]?.value ?? null,
    extractedConfidence: conflict.values[0]?.confidence ?? 0,
    suggestedValues,
    context: {
      documentName: conflict.values.map((v) => v.source.filename).join(', '),
      periodDescription: conflict.periodKey?.replace(/_/g, ' '),
      aiExplanation: generateConflictExplanation(conflict),
    },
    conflictDetails: conflict,
    status: 'pending',
    createdAt: new Date(),
  };
}

function formatFieldLabel(fieldPath: string): string {
  const labels: Record<string, string> = {
    'revenue.total': 'Total Revenue',
    'expenses.total': 'Total Expenses',
    'metrics.noi': 'Net Operating Income',
    'metrics.ebitdar': 'EBITDAR',
    'expenses.labor.total': 'Total Labor Cost',
    'expenses.labor.agency': 'Agency Labor Cost',
  };

  return labels[fieldPath] || fieldPath.split('.').pop() || fieldPath;
}

function generateConflictExplanation(conflict: DataConflict): string {
  switch (conflict.type) {
    case 'cross_document':
      return `Different documents show different values for this field. The variance is ${(conflict.variancePercent * 100).toFixed(1)}%.`;
    case 'cross_period':
      return `This value changed significantly from the previous period (${(conflict.variancePercent * 100).toFixed(1)}% change). Please verify if this is correct.`;
    case 'revenue_reconciliation':
      return `Reported revenue doesn't match calculated revenue (Census × Rates). Variance is ${(conflict.variancePercent * 100).toFixed(1)}%.`;
    case 'internal_consistency':
      return `The total doesn't match the sum of its components. Please verify the breakdown.`;
    default:
      return `Please verify this value. There appears to be an inconsistency.`;
  }
}

// ============================================================================
// SCORING
// ============================================================================

function calculateValidationScore(
  contextManager: ExtractionContextManager,
  conflicts: DataConflict[]
): number {
  let score = 100;

  // Deduct for conflicts
  for (const conflict of conflicts) {
    if (conflict.status === 'detected' || conflict.status === 'pending_clarification') {
      switch (conflict.severity) {
        case 'critical':
          score -= 20;
          break;
        case 'high':
          score -= 10;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'low':
          score -= 2;
          break;
      }
    }
  }

  // Deduct for pending clarifications
  const pendingClarifications = contextManager.getPendingClarifications();
  score -= pendingClarifications.length * 3;

  return Math.max(0, score);
}

export default { executeValidationPass };
