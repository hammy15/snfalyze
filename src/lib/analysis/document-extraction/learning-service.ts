/**
 * Learning Service
 *
 * Integrates with the extraction pipeline to learn from corrections
 * and apply learned patterns to improve future extractions.
 */

import { db } from '@/db';
import { learnedPatterns, fieldCorrections, extractionMetrics } from '@/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import type { LearnedPattern, CorrectionFeedback } from '@/lib/agent/types';

// ============================================================================
// Types
// ============================================================================

export interface ExtractionContext {
  documentType: string;
  fieldName: string;
  extractedValue: unknown;
  rawText?: string;
  contextSnippet?: string;
}

export interface LearningResult {
  appliedPatterns: Array<{
    patternId: string;
    originalValue: unknown;
    correctedValue: unknown;
    confidence: number;
  }>;
  suggestedCorrections: Array<{
    fieldName: string;
    currentValue: unknown;
    suggestedValue: unknown;
    confidence: number;
    basedOnPattern: string;
  }>;
  fieldsSkipped: string[];
}

// ============================================================================
// Learning Service Class
// ============================================================================

export class LearningService {
  private minPatternConfidence: number;
  private maxPatternAge: number; // days

  constructor(minPatternConfidence = 0.7, maxPatternAgeDays = 180) {
    this.minPatternConfidence = minPatternConfidence;
    this.maxPatternAge = maxPatternAgeDays;
  }

  /**
   * Apply learned patterns to extracted data
   */
  async applyLearnedPatterns(
    extractedData: Record<string, { value: unknown; confidence?: number }>,
    documentType: string
  ): Promise<LearningResult> {
    const result: LearningResult = {
      appliedPatterns: [],
      suggestedCorrections: [],
      fieldsSkipped: [],
    };

    // Get applicable patterns
    const patterns = await this.getApplicablePatterns(documentType);

    for (const [fieldName, field] of Object.entries(extractedData)) {
      // Find patterns for this field
      const fieldPatterns = patterns.filter(
        (p) => p.fieldName === fieldName || !p.fieldName
      );

      if (fieldPatterns.length === 0) {
        result.fieldsSkipped.push(fieldName);
        continue;
      }

      for (const pattern of fieldPatterns) {
        const match = this.matchPattern(pattern, field.value);

        if (match.matches) {
          if (match.correction !== undefined) {
            result.suggestedCorrections.push({
              fieldName,
              currentValue: field.value,
              suggestedValue: match.correction,
              confidence: Number(pattern.confidence) * match.matchConfidence,
              basedOnPattern: pattern.id,
            });
          }
        }
      }
    }

    return result;
  }

  /**
   * Get patterns applicable to a document type
   */
  private async getApplicablePatterns(documentType: string): Promise<LearnedPattern[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxPatternAge);

    const patterns = await db
      .select()
      .from(learnedPatterns)
      .where(
        and(
          eq(learnedPatterns.isActive, true),
          gte(learnedPatterns.confidence, String(this.minPatternConfidence)),
          eq(learnedPatterns.documentType, documentType as typeof learnedPatterns.documentType.enumValues[number])
        )
      )
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
   * Match a pattern against a value
   */
  private matchPattern(
    pattern: LearnedPattern,
    value: unknown
  ): { matches: boolean; correction?: unknown; matchConfidence: number } {
    // Parse pattern (format: "from->to")
    const [from, to] = pattern.pattern.split('->');

    if (!from || to === undefined) {
      return { matches: false, matchConfidence: 0 };
    }

    const valueStr = String(value);

    // Exact match
    if (valueStr === from) {
      return {
        matches: true,
        correction: to,
        matchConfidence: 1.0,
      };
    }

    // Pattern-based match (simplified regex)
    try {
      const regex = new RegExp(from, 'i');
      if (regex.test(valueStr)) {
        const correctedValue = valueStr.replace(regex, to);
        return {
          matches: true,
          correction: correctedValue,
          matchConfidence: 0.8,
        };
      }
    } catch {
      // Invalid regex, skip
    }

    // Fuzzy match for numbers with similar values
    const fromNum = parseFloat(from);
    const valueNum = parseFloat(valueStr);
    if (!isNaN(fromNum) && !isNaN(valueNum) && fromNum !== 0) {
      const similarity = 1 - Math.abs(fromNum - valueNum) / Math.abs(fromNum);
      if (similarity > 0.95) {
        return {
          matches: true,
          correction: to,
          matchConfidence: similarity,
        };
      }
    }

    return { matches: false, matchConfidence: 0 };
  }

  /**
   * Record a correction for learning
   */
  async recordCorrection(feedback: CorrectionFeedback): Promise<void> {
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

    // Store the correction
    await db.insert(fieldCorrections).values({
      documentId,
      dealId,
      documentType: documentType as typeof fieldCorrections.documentType.enumValues[number] | undefined,
      fieldName,
      originalValue: typeof originalValue === 'string' ? originalValue : JSON.stringify(originalValue),
      correctedValue: typeof correctedValue === 'string' ? correctedValue : JSON.stringify(correctedValue),
      correctionSource,
      contextSnippet,
      correctedAt: new Date(),
    });

    // Update metrics
    await this.updateMetrics(documentType, fieldName, false);

    // Check for pattern learning
    if (documentType) {
      await this.checkPatternLearning(documentType, fieldName);
    }
  }

  /**
   * Record successful extraction
   */
  async recordSuccess(documentType: string, fieldName: string): Promise<void> {
    await this.updateMetrics(documentType, fieldName, true);
  }

  /**
   * Update extraction metrics
   */
  private async updateMetrics(
    documentType: string | undefined,
    fieldName: string,
    wasCorrect: boolean
  ): Promise<void> {
    if (!documentType) return;

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

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
      const newTotal = (existing.totalExtractions || 0) + 1;
      const newCorrect = (existing.correctExtractions || 0) + (wasCorrect ? 1 : 0);

      await db
        .update(extractionMetrics)
        .set({
          totalExtractions: newTotal,
          correctExtractions: newCorrect,
          correctionsApplied: (existing.correctionsApplied || 0) + (wasCorrect ? 0 : 1),
          accuracyRate: String(newCorrect / newTotal),
          updatedAt: new Date(),
        })
        .where(eq(extractionMetrics.id, existing.id));
    } else {
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
   * Check if corrections form a learnable pattern
   */
  private async checkPatternLearning(
    documentType: string,
    fieldName: string
  ): Promise<void> {
    // Get recent corrections for this field
    const corrections = await db
      .select()
      .from(fieldCorrections)
      .where(
        and(
          eq(fieldCorrections.documentType, documentType as typeof fieldCorrections.documentType.enumValues[number]),
          eq(fieldCorrections.fieldName, fieldName)
        )
      )
      .orderBy(desc(fieldCorrections.correctedAt))
      .limit(20);

    if (corrections.length < 3) return;

    // Group by transformation
    const transformations = corrections.reduce((acc, c) => {
      const key = `${c.originalValue}->${c.correctedValue}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    }, {} as Record<string, typeof corrections>);

    // Find patterns with at least 3 occurrences
    for (const [pattern, instances] of Object.entries(transformations)) {
      if (instances.length < 3) continue;

      const confidence = instances.length / corrections.length;

      // Check if pattern already exists
      const [existing] = await db
        .select()
        .from(learnedPatterns)
        .where(
          and(
            eq(learnedPatterns.documentType, documentType as typeof learnedPatterns.documentType.enumValues[number]),
            eq(learnedPatterns.fieldName, fieldName),
            eq(learnedPatterns.pattern, pattern)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing pattern
        await db
          .update(learnedPatterns)
          .set({
            occurrenceCount: (existing.occurrenceCount || 0) + 1,
            confidence: String(Math.max(Number(existing.confidence), confidence)),
            lastUsedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(learnedPatterns.id, existing.id));
      } else {
        // Create new pattern
        await db.insert(learnedPatterns).values({
          patternType: 'extraction',
          documentType: documentType as typeof learnedPatterns.documentType.enumValues[number],
          fieldName,
          pattern,
          confidence: String(confidence),
          occurrenceCount: instances.length,
          exampleInputs: instances.slice(0, 5).map((i) => i.originalValue),
          exampleOutputs: instances.slice(0, 5).map((i) => i.correctedValue),
          isActive: confidence >= this.minPatternConfidence,
        });
      }

      // Mark corrections as pattern-learned
      for (const instance of instances) {
        await db
          .update(fieldCorrections)
          .set({ wasPatternLearned: true })
          .where(eq(fieldCorrections.id, instance.id));
      }
    }
  }

  /**
   * Get field accuracy over time
   */
  async getFieldAccuracy(
    documentType: string,
    fieldName: string,
    months = 6
  ): Promise<{
    periods: Array<{
      period: string;
      total: number;
      correct: number;
      accuracy: number;
    }>;
    overall: {
      total: number;
      correct: number;
      accuracy: number;
      trend: 'improving' | 'declining' | 'stable';
    };
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

    const periods = metrics.map((m) => ({
      period: m.periodStart || '',
      total: m.totalExtractions || 0,
      correct: m.correctExtractions || 0,
      accuracy: m.totalExtractions
        ? (m.correctExtractions || 0) / m.totalExtractions
        : 0,
    }));

    const totalAll = periods.reduce((sum, p) => sum + p.total, 0);
    const correctAll = periods.reduce((sum, p) => sum + p.correct, 0);

    // Calculate trend
    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (periods.length >= 2) {
      const firstHalf = periods.slice(0, Math.floor(periods.length / 2));
      const secondHalf = periods.slice(Math.floor(periods.length / 2));

      const firstAvg =
        firstHalf.reduce((sum, p) => sum + p.accuracy, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum, p) => sum + p.accuracy, 0) / secondHalf.length;

      if (secondAvg > firstAvg + 0.05) trend = 'improving';
      else if (secondAvg < firstAvg - 0.05) trend = 'declining';
    }

    return {
      periods,
      overall: {
        total: totalAll,
        correct: correctAll,
        accuracy: totalAll > 0 ? correctAll / totalAll : 0,
        trend,
      },
    };
  }

  /**
   * Apply pattern feedback (success or failure)
   */
  async applyPatternFeedback(patternId: string, wasSuccessful: boolean): Promise<void> {
    const [pattern] = await db
      .select()
      .from(learnedPatterns)
      .where(eq(learnedPatterns.id, patternId))
      .limit(1);

    if (!pattern) return;

    const newSuccessCount = (pattern.successCount || 0) + (wasSuccessful ? 1 : 0);
    const newFailureCount = (pattern.failureCount || 0) + (wasSuccessful ? 0 : 1);
    const totalUsage = newSuccessCount + newFailureCount;
    const newConfidence = totalUsage > 0 ? newSuccessCount / totalUsage : 0.5;

    await db
      .update(learnedPatterns)
      .set({
        successCount: newSuccessCount,
        failureCount: newFailureCount,
        confidence: String(newConfidence),
        lastUsedAt: new Date(),
        // Deactivate patterns with low success rate
        isActive: newConfidence >= 0.5 || totalUsage < 5,
      })
      .where(eq(learnedPatterns.id, patternId));
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLearningService(
  minPatternConfidence?: number,
  maxPatternAgeDays?: number
): LearningService {
  return new LearningService(minPatternConfidence, maxPatternAgeDays);
}

export default LearningService;
