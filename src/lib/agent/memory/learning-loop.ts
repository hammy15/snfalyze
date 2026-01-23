/**
 * Learning Loop
 *
 * Integrates feedback from corrections and deal outcomes
 * to improve extraction and analysis accuracy over time.
 */

import { db } from '@/db';
import {
  fieldCorrections,
  learnedPatterns,
  extractionMetrics,
  dealMemory,
} from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { CorrectionFeedback, LearnedPattern } from '../types';

// ============================================================================
// Correction Recording
// ============================================================================

/**
 * Record a field correction for learning
 */
export async function recordCorrection(feedback: CorrectionFeedback): Promise<void> {
  const {
    documentId,
    dealId,
    documentType,
    fieldName,
    originalValue,
    correctedValue,
    correctionSource,
    contextSnippet,
  } = feedback;

  // Save the correction
  const [correction] = await db
    .insert(fieldCorrections)
    .values({
      documentId,
      dealId,
      documentType: documentType as typeof fieldCorrections.documentType.enumValues[number] | undefined,
      fieldName,
      originalValue: typeof originalValue === 'string' ? originalValue : JSON.stringify(originalValue),
      correctedValue: typeof correctedValue === 'string' ? correctedValue : JSON.stringify(correctedValue),
      correctionSource,
      contextSnippet,
      correctedAt: new Date(),
    })
    .returning();

  // Update extraction metrics
  await updateExtractionMetrics(documentType, fieldName, false);

  // Check if this creates a learnable pattern
  await checkForLearnablePattern(correction.id, fieldName, documentType);
}

/**
 * Record a successful extraction (no correction needed)
 */
export async function recordSuccessfulExtraction(
  documentType: string,
  fieldName: string
): Promise<void> {
  await updateExtractionMetrics(documentType, fieldName, true);
}

// ============================================================================
// Metrics Tracking
// ============================================================================

/**
 * Update extraction metrics
 */
async function updateExtractionMetrics(
  documentType: string | null | undefined,
  fieldName: string,
  wasCorrect: boolean
): Promise<void> {
  if (!documentType) return;

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  // Get or create metrics record
  const [existing] = await db
    .select()
    .from(extractionMetrics)
    .where(
      and(
        eq(extractionMetrics.documentType, documentType as typeof extractionMetrics.documentType.enumValues[number]),
        eq(extractionMetrics.fieldName, fieldName),
        eq(extractionMetrics.periodStart, periodStart.toISOString().split('T')[0])
      )
    )
    .limit(1);

  if (existing) {
    // Update existing
    const newTotal = (existing.totalExtractions || 0) + 1;
    const newCorrect = (existing.correctExtractions || 0) + (wasCorrect ? 1 : 0);
    const newClarifications = (existing.clarificationsGenerated || 0);
    const newCorrections = (existing.correctionsApplied || 0) + (wasCorrect ? 0 : 1);

    await db
      .update(extractionMetrics)
      .set({
        totalExtractions: newTotal,
        correctExtractions: newCorrect,
        correctionsApplied: newCorrections,
        accuracyRate: String(newCorrect / newTotal),
        updatedAt: new Date(),
      })
      .where(eq(extractionMetrics.id, existing.id));
  } else {
    // Create new
    await db.insert(extractionMetrics).values({
      documentType: documentType as typeof extractionMetrics.documentType.enumValues[number],
      fieldName,
      periodStart: periodStart.toISOString().split('T')[0],
      periodEnd: periodEnd.toISOString().split('T')[0],
      totalExtractions: 1,
      correctExtractions: wasCorrect ? 1 : 0,
      correctionsApplied: wasCorrect ? 0 : 1,
      accuracyRate: wasCorrect ? '1' : '0',
    });
  }
}

/**
 * Get extraction accuracy for a field
 */
export async function getFieldAccuracy(
  documentType: string,
  fieldName: string,
  months = 3
): Promise<{
  totalExtractions: number;
  correctExtractions: number;
  accuracyRate: number;
  trend: 'improving' | 'declining' | 'stable';
}> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const metrics = await db
    .select()
    .from(extractionMetrics)
    .where(
      and(
        eq(extractionMetrics.documentType, documentType as typeof extractionMetrics.documentType.enumValues[number]),
        eq(extractionMetrics.fieldName, fieldName),
        gte(extractionMetrics.periodStart, cutoff.toISOString().split('T')[0])
      )
    )
    .orderBy(extractionMetrics.periodStart);

  if (metrics.length === 0) {
    return {
      totalExtractions: 0,
      correctExtractions: 0,
      accuracyRate: 0,
      trend: 'stable',
    };
  }

  const totalExtractions = metrics.reduce(
    (sum, m) => sum + (m.totalExtractions || 0),
    0
  );
  const correctExtractions = metrics.reduce(
    (sum, m) => sum + (m.correctExtractions || 0),
    0
  );
  const accuracyRate = totalExtractions > 0 ? correctExtractions / totalExtractions : 0;

  // Calculate trend
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (metrics.length >= 2) {
    const firstHalf = metrics.slice(0, Math.floor(metrics.length / 2));
    const secondHalf = metrics.slice(Math.floor(metrics.length / 2));

    const firstAccuracy =
      firstHalf.reduce((sum, m) => sum + Number(m.accuracyRate || 0), 0) /
      firstHalf.length;
    const secondAccuracy =
      secondHalf.reduce((sum, m) => sum + Number(m.accuracyRate || 0), 0) /
      secondHalf.length;

    if (secondAccuracy > firstAccuracy + 0.05) {
      trend = 'improving';
    } else if (secondAccuracy < firstAccuracy - 0.05) {
      trend = 'declining';
    }
  }

  return {
    totalExtractions,
    correctExtractions,
    accuracyRate,
    trend,
  };
}

// ============================================================================
// Pattern Learning
// ============================================================================

/**
 * Check if a correction creates a learnable pattern
 */
async function checkForLearnablePattern(
  correctionId: string,
  fieldName: string,
  documentType: string | null | undefined
): Promise<void> {
  if (!documentType) return;

  // Get similar corrections for this field
  const similarCorrections = await db
    .select()
    .from(fieldCorrections)
    .where(
      and(
        eq(fieldCorrections.fieldName, fieldName),
        eq(fieldCorrections.documentType, documentType as typeof fieldCorrections.documentType.enumValues[number])
      )
    )
    .orderBy(desc(fieldCorrections.correctedAt))
    .limit(10);

  if (similarCorrections.length < 3) {
    return; // Not enough data to learn a pattern
  }

  // Check if there's a consistent pattern
  const correctionPatterns = similarCorrections.map((c) => ({
    original: c.originalValue,
    corrected: c.correctedValue,
    context: c.contextSnippet,
  }));

  // Simple pattern detection: if most corrections are the same transformation
  const transformations = correctionPatterns.map((p) => ({
    from: p.original,
    to: p.corrected,
  }));

  // Group by transformation
  const transformationCounts = transformations.reduce((acc, t) => {
    const key = `${t.from}->${t.to}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Find dominant transformation
  const sorted = Object.entries(transformationCounts).sort((a, b) => b[1] - a[1]);

  if (sorted.length > 0 && sorted[0][1] >= 3) {
    // We have a learnable pattern (at least 3 occurrences)
    const [pattern, count] = sorted[0];
    const confidence = count / similarCorrections.length;

    // Check if pattern already exists
    const [existingPattern] = await db
      .select()
      .from(learnedPatterns)
      .where(
        and(
          eq(learnedPatterns.fieldName, fieldName),
          eq(learnedPatterns.documentType, documentType as typeof learnedPatterns.documentType.enumValues[number]),
          eq(learnedPatterns.pattern, pattern)
        )
      )
      .limit(1);

    if (existingPattern) {
      // Update existing pattern
      await db
        .update(learnedPatterns)
        .set({
          occurrenceCount: (existingPattern.occurrenceCount || 0) + 1,
          confidence: String(confidence),
          lastUsedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(learnedPatterns.id, existingPattern.id));
    } else {
      // Create new pattern
      await db.insert(learnedPatterns).values({
        patternType: 'extraction',
        documentType: documentType as typeof learnedPatterns.documentType.enumValues[number],
        fieldName,
        pattern,
        confidence: String(confidence),
        occurrenceCount: count,
        exampleInputs: correctionPatterns.map((p) => p.original),
        exampleOutputs: correctionPatterns.map((p) => p.corrected),
      });
    }

    // Mark corrections as pattern-learned
    await db
      .update(fieldCorrections)
      .set({
        wasPatternLearned: true,
      })
      .where(
        and(
          eq(fieldCorrections.fieldName, fieldName),
          eq(fieldCorrections.documentType, documentType as typeof fieldCorrections.documentType.enumValues[number])
        )
      );
  }
}

/**
 * Get learned patterns for a document type and field
 */
export async function getLearnedPatterns(
  documentType?: string,
  fieldName?: string,
  minConfidence = 0.5
): Promise<LearnedPattern[]> {
  const conditions = [
    eq(learnedPatterns.isActive, true),
    gte(learnedPatterns.confidence, String(minConfidence)),
  ];

  if (documentType) {
    conditions.push(eq(learnedPatterns.documentType, documentType as typeof learnedPatterns.documentType.enumValues[number]));
  }
  if (fieldName) {
    conditions.push(eq(learnedPatterns.fieldName, fieldName));
  }

  const patterns = await db
    .select()
    .from(learnedPatterns)
    .where(and(...conditions))
    .orderBy(desc(learnedPatterns.confidence));

  return patterns.map((p) => ({
    id: p.id,
    patternType: p.patternType as 'extraction' | 'normalization' | 'validation' | 'classification',
    documentType: p.documentType || undefined,
    fieldName: p.fieldName || undefined,
    pattern: p.pattern,
    confidence: Number(p.confidence),
    occurrenceCount: p.occurrenceCount || 0,
    successCount: p.successCount || 0,
    failureCount: p.failureCount || 0,
    exampleInputs: p.exampleInputs as unknown[] | undefined,
    exampleOutputs: p.exampleOutputs as unknown[] | undefined,
    isActive: p.isActive || false,
  }));
}

/**
 * Apply a learned pattern to a value
 */
export async function applyLearnedPattern(
  patternId: string,
  inputValue: unknown,
  success: boolean
): Promise<void> {
  const [pattern] = await db
    .select()
    .from(learnedPatterns)
    .where(eq(learnedPatterns.id, patternId))
    .limit(1);

  if (!pattern) return;

  await db
    .update(learnedPatterns)
    .set({
      successCount: (pattern.successCount || 0) + (success ? 1 : 0),
      failureCount: (pattern.failureCount || 0) + (success ? 0 : 1),
      lastUsedAt: new Date(),
      // Recalculate confidence based on success rate
      confidence: String(
        ((pattern.successCount || 0) + (success ? 1 : 0)) /
          ((pattern.successCount || 0) + (pattern.failureCount || 0) + 1)
      ),
    })
    .where(eq(learnedPatterns.id, patternId));
}

// ============================================================================
// Deal Outcome Learning
// ============================================================================

/**
 * Learn from deal outcome
 */
export async function learnFromDealOutcome(
  dealId: string,
  outcome: 'closed' | 'passed' | 'lost' | 'withdrawn'
): Promise<{
  patternsIdentified: string[];
  recommendationsUpdated: boolean;
}> {
  // Get deal memory
  const [memory] = await db
    .select()
    .from(dealMemory)
    .where(eq(dealMemory.dealId, dealId))
    .orderBy(desc(dealMemory.version))
    .limit(1);

  if (!memory) {
    return {
      patternsIdentified: [],
      recommendationsUpdated: false,
    };
  }

  const patternsIdentified: string[] = [];

  // Extract patterns based on outcome
  const snapshot = memory.snapshotData as Record<string, unknown>;

  if (outcome === 'closed') {
    // Learn what made this deal succeed
    patternsIdentified.push('Successful deal characteristics captured');
  } else if (outcome === 'passed' || outcome === 'lost') {
    // Learn what to watch for in similar deals
    const risks = (snapshot.risks as Array<{ category: string; severity: string }>) || [];
    const criticalRisks = risks.filter((r) => r.severity === 'critical' || r.severity === 'high');

    if (criticalRisks.length > 0) {
      patternsIdentified.push(
        `High-risk categories identified: ${criticalRisks.map((r) => r.category).join(', ')}`
      );
    }
  }

  return {
    patternsIdentified,
    recommendationsUpdated: patternsIdentified.length > 0,
  };
}

// ============================================================================
// Learning Analytics
// ============================================================================

/**
 * Get learning statistics
 */
export async function getLearningStats(): Promise<{
  totalPatterns: number;
  activePatterns: number;
  totalCorrections: number;
  avgPatternConfidence: number;
  topPerformingPatterns: Array<{
    fieldName: string;
    confidence: number;
    successRate: number;
  }>;
}> {
  const patterns = await db.select().from(learnedPatterns);
  const corrections = await db.select().from(fieldCorrections);

  const activePatterns = patterns.filter((p) => p.isActive);
  const avgConfidence =
    activePatterns.length > 0
      ? activePatterns.reduce((sum, p) => sum + Number(p.confidence), 0) /
        activePatterns.length
      : 0;

  const topPerforming = activePatterns
    .map((p) => ({
      fieldName: p.fieldName || 'unknown',
      confidence: Number(p.confidence),
      successRate:
        (p.successCount || 0) / Math.max(1, (p.successCount || 0) + (p.failureCount || 0)),
    }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5);

  return {
    totalPatterns: patterns.length,
    activePatterns: activePatterns.length,
    totalCorrections: corrections.length,
    avgPatternConfidence: avgConfidence,
    topPerformingPatterns: topPerforming,
  };
}

export default {
  recordCorrection,
  recordSuccessfulExtraction,
  getFieldAccuracy,
  getLearnedPatterns,
  applyLearnedPattern,
  learnFromDealOutcome,
  getLearningStats,
};
