/**
 * Cross-Document Analyzer
 *
 * Analyzes data across multiple documents in a deal to detect
 * conflicts, inconsistencies, and opportunities for triangulation.
 */

import { db } from '@/db';
import { documents, documentConflicts, deals } from '@/db/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import type { ConflictResolution } from '@/lib/agent/types';

// ============================================================================
// Types
// ============================================================================

export interface CrossDocumentAnalysisResult {
  totalDocuments: number;
  analyzedFields: number;
  conflicts: DetectedConflict[];
  triangulations: Triangulation[];
  overallConsistencyScore: number;
  recommendations: string[];
}

export interface DetectedConflict {
  fieldName: string;
  document1: DocumentReference;
  document2: DocumentReference;
  value1: unknown;
  value2: unknown;
  variancePercent: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedResolution: 'use_first' | 'use_second' | 'use_average' | 'manual_review';
  reasoning: string;
}

export interface DocumentReference {
  id: string;
  filename: string;
  type: string | null;
  periodEnd: string | null;
}

export interface Triangulation {
  fieldName: string;
  sources: Array<{
    documentId: string;
    documentType: string | null;
    value: unknown;
    confidence: number;
  }>;
  reconciledValue: unknown;
  reconciledConfidence: number;
  methodology: string;
}

// ============================================================================
// Cross-Document Analyzer Class
// ============================================================================

export class CrossDocumentAnalyzer {
  private varianceThreshold: number;

  constructor(varianceThreshold = 0.10) {
    this.varianceThreshold = varianceThreshold;
  }

  /**
   * Analyze all documents in a deal for cross-document issues
   */
  async analyzeDeal(dealId: string): Promise<CrossDocumentAnalysisResult> {
    // Get all documents for the deal
    const dealDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.dealId, dealId))
      .orderBy(desc(documents.processedAt));

    if (dealDocuments.length < 2) {
      return {
        totalDocuments: dealDocuments.length,
        analyzedFields: 0,
        conflicts: [],
        triangulations: [],
        overallConsistencyScore: 100,
        recommendations: ['Upload additional documents for cross-validation'],
      };
    }

    const conflicts: DetectedConflict[] = [];
    const fieldValues: Map<string, Array<{ doc: typeof dealDocuments[0]; value: unknown; confidence: number }>> = new Map();

    // Collect all field values across documents
    for (const doc of dealDocuments) {
      if (!doc.extractedData) continue;

      const extractedData = doc.extractedData as Record<string, { value: unknown; confidence?: number }>;

      for (const [fieldName, field] of Object.entries(extractedData)) {
        if (field.value === null || field.value === undefined) continue;

        if (!fieldValues.has(fieldName)) {
          fieldValues.set(fieldName, []);
        }

        fieldValues.get(fieldName)!.push({
          doc,
          value: field.value,
          confidence: field.confidence || 50,
        });
      }
    }

    // Analyze each field for conflicts
    for (const [fieldName, values] of fieldValues) {
      if (values.length < 2) continue;

      // Compare all pairs
      for (let i = 0; i < values.length - 1; i++) {
        for (let j = i + 1; j < values.length; j++) {
          const conflict = this.detectConflict(fieldName, values[i], values[j]);
          if (conflict) {
            conflicts.push(conflict);
          }
        }
      }
    }

    // Generate triangulations for fields with multiple sources
    const triangulations: Triangulation[] = [];
    for (const [fieldName, values] of fieldValues) {
      if (values.length >= 2) {
        const triangulation = this.triangulateField(fieldName, values);
        triangulations.push(triangulation);
      }
    }

    // Store conflicts in database
    for (const conflict of conflicts) {
      await this.storeConflict(dealId, conflict);
    }

    // Update deal conflict status
    if (conflicts.length > 0) {
      await db
        .update(deals)
        .set({ hasUnresolvedConflicts: true })
        .where(eq(deals.id, dealId));
    }

    // Calculate overall consistency score
    const consistencyScore = this.calculateConsistencyScore(
      dealDocuments.length,
      fieldValues.size,
      conflicts.length
    );

    return {
      totalDocuments: dealDocuments.length,
      analyzedFields: fieldValues.size,
      conflicts,
      triangulations,
      overallConsistencyScore: consistencyScore,
      recommendations: this.generateRecommendations(conflicts, triangulations),
    };
  }

  /**
   * Detect conflict between two values
   */
  private detectConflict(
    fieldName: string,
    entry1: { doc: typeof documents.$inferSelect; value: unknown; confidence: number },
    entry2: { doc: typeof documents.$inferSelect; value: unknown; confidence: number }
  ): DetectedConflict | null {
    const value1 = this.normalizeValue(entry1.value);
    const value2 = this.normalizeValue(entry2.value);

    if (value1 === null || value2 === null) return null;

    // Calculate variance for numeric values
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      if (value1 === 0 && value2 === 0) return null;

      const avgValue = (value1 + value2) / 2;
      const variance = Math.abs(value1 - value2) / Math.max(Math.abs(avgValue), 1);

      if (variance <= this.varianceThreshold) return null;

      const severity = this.determineSeverity(variance, fieldName);
      const resolution = this.suggestResolution(entry1, entry2, variance);

      return {
        fieldName,
        document1: {
          id: entry1.doc.id,
          filename: entry1.doc.filename,
          type: entry1.doc.type,
          periodEnd: entry1.doc.periodEnd,
        },
        document2: {
          id: entry2.doc.id,
          filename: entry2.doc.filename,
          type: entry2.doc.type,
          periodEnd: entry2.doc.periodEnd,
        },
        value1,
        value2,
        variancePercent: variance * 100,
        severity,
        suggestedResolution: resolution.suggestion,
        reasoning: resolution.reasoning,
      };
    }

    // String comparison
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      if (value1.toLowerCase() !== value2.toLowerCase()) {
        return {
          fieldName,
          document1: {
            id: entry1.doc.id,
            filename: entry1.doc.filename,
            type: entry1.doc.type,
            periodEnd: entry1.doc.periodEnd,
          },
          document2: {
            id: entry2.doc.id,
            filename: entry2.doc.filename,
            type: entry2.doc.type,
            periodEnd: entry2.doc.periodEnd,
          },
          value1,
          value2,
          variancePercent: 100,
          severity: 'medium',
          suggestedResolution: 'manual_review',
          reasoning: 'String values differ - manual review recommended',
        };
      }
    }

    return null;
  }

  /**
   * Normalize value for comparison
   */
  private normalizeValue(value: unknown): number | string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[,$%]/g, ''));
      return isNaN(num) ? value : num;
    }
    return null;
  }

  /**
   * Determine severity of a conflict
   */
  private determineSeverity(
    variance: number,
    fieldName: string
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalFields = ['totalRevenue', 'noi', 'totalExpenses', 'occupancyRate'];

    if (criticalFields.includes(fieldName)) {
      if (variance > 0.20) return 'critical';
      if (variance > 0.10) return 'high';
      return 'medium';
    }

    if (variance > 0.30) return 'high';
    if (variance > 0.15) return 'medium';
    return 'low';
  }

  /**
   * Suggest how to resolve a conflict
   */
  private suggestResolution(
    entry1: { doc: typeof documents.$inferSelect; value: unknown; confidence: number },
    entry2: { doc: typeof documents.$inferSelect; value: unknown; confidence: number },
    variance: number
  ): { suggestion: 'use_first' | 'use_second' | 'use_average' | 'manual_review'; reasoning: string } {
    // If one document has significantly higher confidence
    if (entry1.confidence - entry2.confidence >= 20) {
      return {
        suggestion: 'use_first',
        reasoning: `${entry1.doc.filename} has higher extraction confidence (${entry1.confidence}% vs ${entry2.confidence}%)`,
      };
    }
    if (entry2.confidence - entry1.confidence >= 20) {
      return {
        suggestion: 'use_second',
        reasoning: `${entry2.doc.filename} has higher extraction confidence (${entry2.confidence}% vs ${entry1.confidence}%)`,
      };
    }

    // If one document is more recent
    if (entry1.doc.periodEnd && entry2.doc.periodEnd) {
      const date1 = new Date(entry1.doc.periodEnd);
      const date2 = new Date(entry2.doc.periodEnd);
      if (date1 > date2) {
        return {
          suggestion: 'use_first',
          reasoning: `${entry1.doc.filename} covers a more recent period`,
        };
      }
      if (date2 > date1) {
        return {
          suggestion: 'use_second',
          reasoning: `${entry2.doc.filename} covers a more recent period`,
        };
      }
    }

    // For small variances, average might be reasonable
    if (variance <= 0.15) {
      return {
        suggestion: 'use_average',
        reasoning: 'Values are within 15% - averaging may be appropriate',
      };
    }

    // Default to manual review for large discrepancies
    return {
      suggestion: 'manual_review',
      reasoning: `Large variance (${(variance * 100).toFixed(1)}%) requires manual review`,
    };
  }

  /**
   * Triangulate a field from multiple sources
   */
  private triangulateField(
    fieldName: string,
    values: Array<{ doc: typeof documents.$inferSelect; value: unknown; confidence: number }>
  ): Triangulation {
    const numericValues = values
      .map((v) => ({
        documentId: v.doc.id,
        documentType: v.doc.type,
        value: this.normalizeValue(v.value),
        confidence: v.confidence,
      }))
      .filter((v) => typeof v.value === 'number') as Array<{
      documentId: string;
      documentType: string | null;
      value: number;
      confidence: number;
    }>;

    if (numericValues.length === 0) {
      // Non-numeric values - use highest confidence
      const sorted = [...values].sort((a, b) => b.confidence - a.confidence);
      return {
        fieldName,
        sources: values.map((v) => ({
          documentId: v.doc.id,
          documentType: v.doc.type,
          value: v.value,
          confidence: v.confidence,
        })),
        reconciledValue: sorted[0]?.value,
        reconciledConfidence: sorted[0]?.confidence || 0,
        methodology: 'Highest confidence source',
      };
    }

    // Confidence-weighted average
    const totalWeight = numericValues.reduce((sum, v) => sum + v.confidence, 0);
    const weightedSum = numericValues.reduce(
      (sum, v) => sum + v.value * v.confidence,
      0
    );
    const reconciledValue = weightedSum / totalWeight;

    // Reconciled confidence based on agreement
    const maxValue = Math.max(...numericValues.map((v) => v.value));
    const minValue = Math.min(...numericValues.map((v) => v.value));
    const spread = maxValue > 0 ? (maxValue - minValue) / maxValue : 0;
    const agreementFactor = 1 - Math.min(spread, 1);
    const avgConfidence =
      numericValues.reduce((sum, v) => sum + v.confidence, 0) / numericValues.length;
    const reconciledConfidence = Math.round(avgConfidence * agreementFactor);

    return {
      fieldName,
      sources: numericValues,
      reconciledValue: Math.round(reconciledValue * 100) / 100,
      reconciledConfidence,
      methodology: 'Confidence-weighted average',
    };
  }

  /**
   * Store a conflict in the database
   */
  private async storeConflict(dealId: string, conflict: DetectedConflict): Promise<void> {
    await db.insert(documentConflicts).values({
      dealId,
      document1Id: conflict.document1.id,
      document2Id: conflict.document2.id,
      fieldName: conflict.fieldName,
      value1: String(conflict.value1),
      value2: String(conflict.value2),
      variancePercent: String(conflict.variancePercent / 100),
      resolution: 'pending',
    });
  }

  /**
   * Calculate overall consistency score
   */
  private calculateConsistencyScore(
    totalDocuments: number,
    analyzedFields: number,
    conflictCount: number
  ): number {
    if (analyzedFields === 0) return 100;

    const possibleComparisons = analyzedFields * (totalDocuments * (totalDocuments - 1)) / 2;
    const conflictRate = possibleComparisons > 0 ? conflictCount / possibleComparisons : 0;

    return Math.round(Math.max(0, (1 - conflictRate) * 100));
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    conflicts: DetectedConflict[],
    triangulations: Triangulation[]
  ): string[] {
    const recommendations: string[] = [];

    // Critical conflicts
    const criticalConflicts = conflicts.filter((c) => c.severity === 'critical');
    if (criticalConflicts.length > 0) {
      recommendations.push(
        `Review ${criticalConflicts.length} critical conflict(s) before proceeding with analysis`
      );
    }

    // High variance fields
    const highVarianceFields = new Set(
      conflicts.filter((c) => c.variancePercent > 20).map((c) => c.fieldName)
    );
    if (highVarianceFields.size > 0) {
      recommendations.push(
        `Fields with high variance: ${Array.from(highVarianceFields).join(', ')}`
      );
    }

    // Low confidence triangulations
    const lowConfidence = triangulations.filter((t) => t.reconciledConfidence < 60);
    if (lowConfidence.length > 0) {
      recommendations.push(
        `${lowConfidence.length} field(s) have low reconciled confidence - consider additional data sources`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('Document data is consistent - proceed with analysis');
    }

    return recommendations;
  }
}

// ============================================================================
// Conflict Resolution Functions
// ============================================================================

/**
 * Resolve a document conflict
 */
export async function resolveConflict(
  conflictId: string,
  resolution: {
    resolution: 'use_first' | 'use_second' | 'use_average' | 'manual_value' | 'ignored';
    resolvedValue?: string;
    resolvedBy: string;
    rationale?: string;
  }
): Promise<void> {
  const [conflict] = await db
    .select()
    .from(documentConflicts)
    .where(eq(documentConflicts.id, conflictId))
    .limit(1);

  if (!conflict) {
    throw new Error(`Conflict ${conflictId} not found`);
  }

  // Calculate resolved value based on resolution type
  let resolvedValue = resolution.resolvedValue;
  if (!resolvedValue) {
    switch (resolution.resolution) {
      case 'use_first':
        resolvedValue = conflict.value1 || undefined;
        break;
      case 'use_second':
        resolvedValue = conflict.value2 || undefined;
        break;
      case 'use_average':
        const v1 = parseFloat(conflict.value1 || '0');
        const v2 = parseFloat(conflict.value2 || '0');
        resolvedValue = String((v1 + v2) / 2);
        break;
    }
  }

  await db
    .update(documentConflicts)
    .set({
      resolution: resolution.resolution,
      resolvedValue,
      resolvedBy: resolution.resolvedBy,
      resolvedAt: new Date(),
      resolutionRationale: resolution.rationale,
    })
    .where(eq(documentConflicts.id, conflictId));

  // Check if deal still has unresolved conflicts
  const remaining = await db
    .select()
    .from(documentConflicts)
    .where(
      and(
        eq(documentConflicts.dealId, conflict.dealId),
        eq(documentConflicts.resolution, 'pending')
      )
    );

  if (remaining.length === 0) {
    await db
      .update(deals)
      .set({ hasUnresolvedConflicts: false })
      .where(eq(deals.id, conflict.dealId));
  }
}

/**
 * Get unresolved conflicts for a deal
 */
export async function getUnresolvedConflicts(
  dealId: string
): Promise<(typeof documentConflicts.$inferSelect)[]> {
  return db
    .select()
    .from(documentConflicts)
    .where(
      and(eq(documentConflicts.dealId, dealId), eq(documentConflicts.resolution, 'pending'))
    );
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCrossDocumentAnalyzer(varianceThreshold?: number): CrossDocumentAnalyzer {
  return new CrossDocumentAnalyzer(varianceThreshold);
}

export default CrossDocumentAnalyzer;
