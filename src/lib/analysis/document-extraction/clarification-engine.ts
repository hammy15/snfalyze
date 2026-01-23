/**
 * Clarification Engine
 *
 * Detects ambiguities, conflicts, and low-confidence extractions,
 * and generates clarification requests for user resolution.
 */

import { db } from '@/db';
import {
  extractionClarifications,
  documentConflicts,
  documents,
  deals,
  financialPeriods,
} from '@/db/schema';
import { eq, and, desc, ne } from 'drizzle-orm';
import type { Clarification, ClarificationType, ClarificationStatus } from '@/lib/agent/types';
import { getBenchmarks, type FieldBenchmark } from './benchmark-validator';

// ============================================================================
// Configuration
// ============================================================================

export interface ClarificationConfig {
  /** Minimum confidence score before triggering clarification (0-100) */
  minConfidenceThreshold: number;
  /** Maximum variance from benchmark before triggering clarification (0-1) */
  maxBenchmarkVariance: number;
  /** Maximum variance between documents before flagging conflict (0-1) */
  maxDocumentVariance: number;
  /** Fields that are critical and should always be clarified if uncertain */
  criticalFields: string[];
  /** Auto-resolve clarifications above this confidence */
  autoResolveThreshold: number;
}

const DEFAULT_CONFIG: ClarificationConfig = {
  minConfidenceThreshold: 70,
  maxBenchmarkVariance: 0.20,
  maxDocumentVariance: 0.10,
  criticalFields: [
    'totalRevenue',
    'totalExpenses',
    'noi',
    'normalizedNoi',
    'occupancyRate',
    'licensedBeds',
    'certifiedBeds',
    'laborCost',
    'agencyLabor',
  ],
  autoResolveThreshold: 95,
};

// ============================================================================
// Main Clarification Engine Class
// ============================================================================

export class ClarificationEngine {
  private config: ClarificationConfig;

  constructor(config?: Partial<ClarificationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze extracted data and generate clarification requests
   */
  async analyzeExtraction(params: {
    documentId: string;
    dealId?: string;
    extractedData: Record<string, ExtractedField>;
    documentType?: string;
    facilityType?: 'SNF' | 'ALF' | 'ILF';
  }): Promise<ClarificationResult> {
    const { documentId, dealId, extractedData, documentType, facilityType } = params;

    const clarifications: Clarification[] = [];
    const autoResolved: string[] = [];

    // Get benchmarks for the facility type
    const benchmarks = getBenchmarks(facilityType || 'SNF');

    // Check each field
    for (const [fieldName, field] of Object.entries(extractedData)) {
      const checks = await this.checkField(
        fieldName,
        field,
        benchmarks[fieldName],
        documentId,
        dealId
      );

      for (const check of checks) {
        if (check.shouldClarify) {
          if (
            check.confidenceScore &&
            check.confidenceScore >= this.config.autoResolveThreshold
          ) {
            // Auto-resolve high-confidence extractions
            autoResolved.push(fieldName);
          } else {
            clarifications.push(check.clarification!);
          }
        }
      }
    }

    // Check for cross-document conflicts
    if (dealId) {
      const conflicts = await this.detectCrossDocumentConflicts(
        dealId,
        documentId,
        extractedData
      );
      clarifications.push(...conflicts);
    }

    // Store clarifications
    if (clarifications.length > 0) {
      await this.storeClarifications(clarifications, documentId, dealId);
    }

    // Update document status
    await db
      .update(documents)
      .set({
        pendingClarifications: clarifications.length,
        clarificationStatus: clarifications.length > 0 ? 'pending' : 'resolved',
        extractionConfidence: this.calculateOverallConfidence(extractedData),
      })
      .where(eq(documents.id, documentId));

    // Update deal status if conflicts detected
    if (dealId) {
      const hasConflicts = clarifications.some(
        (c) => c.clarificationType === 'conflict'
      );
      if (hasConflicts) {
        await db
          .update(deals)
          .set({ hasUnresolvedConflicts: true })
          .where(eq(deals.id, dealId));
      }
    }

    return {
      clarificationsGenerated: clarifications.length,
      clarifications,
      autoResolved,
      overallConfidence: this.calculateOverallConfidence(extractedData),
      criticalClarifications: clarifications.filter(
        (c) => c.priority >= 8 || this.config.criticalFields.includes(c.fieldName)
      ).length,
    };
  }

  /**
   * Check a single field for clarification triggers
   */
  private async checkField(
    fieldName: string,
    field: ExtractedField,
    benchmark: FieldBenchmark | undefined,
    documentId: string,
    dealId?: string
  ): Promise<FieldCheckResult[]> {
    const results: FieldCheckResult[] = [];

    // 1. Check confidence score
    if (
      field.confidence !== undefined &&
      field.confidence < this.config.minConfidenceThreshold
    ) {
      results.push({
        shouldClarify: true,
        confidenceScore: field.confidence,
        clarification: this.createClarification({
          documentId,
          dealId,
          fieldName,
          clarificationType: 'low_confidence',
          extractedValue: field.value,
          confidenceScore: field.confidence,
          reason: `Extraction confidence (${field.confidence}%) is below threshold (${this.config.minConfidenceThreshold}%)`,
          suggestedValues: field.alternatives,
          priority: this.calculatePriority(fieldName, 'low_confidence', field.confidence),
        }),
      });
    }

    // 2. Check benchmark range
    if (benchmark && field.value !== null && field.value !== undefined) {
      const numValue = typeof field.value === 'number' ? field.value : parseFloat(String(field.value));

      if (!isNaN(numValue)) {
        const variance = this.calculateBenchmarkVariance(numValue, benchmark);

        if (Math.abs(variance) > this.config.maxBenchmarkVariance) {
          results.push({
            shouldClarify: true,
            confidenceScore: field.confidence,
            clarification: this.createClarification({
              documentId,
              dealId,
              fieldName,
              clarificationType: 'out_of_range',
              extractedValue: field.value,
              confidenceScore: field.confidence,
              benchmarkValue: String(benchmark.median),
              benchmarkRange: {
                min: benchmark.min,
                max: benchmark.max,
                median: benchmark.median,
              },
              reason: `Value is ${Math.abs(variance * 100).toFixed(1)}% ${variance > 0 ? 'above' : 'below'} expected range`,
              priority: this.calculatePriority(fieldName, 'out_of_range', field.confidence),
            }),
          });
        }
      }
    }

    // 3. Check for missing critical fields
    if (
      this.config.criticalFields.includes(fieldName) &&
      (field.value === null || field.value === undefined || field.value === '')
    ) {
      results.push({
        shouldClarify: true,
        confidenceScore: 0,
        clarification: this.createClarification({
          documentId,
          dealId,
          fieldName,
          clarificationType: 'missing',
          extractedValue: null,
          confidenceScore: 0,
          reason: `Critical field "${fieldName}" is missing or empty`,
          priority: 10, // Maximum priority for missing critical fields
        }),
      });
    }

    return results;
  }

  /**
   * Detect conflicts between documents in the same deal
   */
  private async detectCrossDocumentConflicts(
    dealId: string,
    currentDocumentId: string,
    extractedData: Record<string, ExtractedField>
  ): Promise<Clarification[]> {
    const conflicts: Clarification[] = [];

    // Get other documents in the deal
    const otherDocuments = await db
      .select()
      .from(documents)
      .where(
        and(eq(documents.dealId, dealId), ne(documents.id, currentDocumentId))
      );

    for (const otherDoc of otherDocuments) {
      if (!otherDoc.extractedData) continue;

      const otherData = otherDoc.extractedData as Record<string, ExtractedField>;

      // Compare overlapping fields
      for (const [fieldName, field] of Object.entries(extractedData)) {
        const otherField = otherData[fieldName];
        if (!otherField) continue;

        // Compare numeric values
        const value1 = parseFloat(String(field.value));
        const value2 = parseFloat(String(otherField.value));

        if (!isNaN(value1) && !isNaN(value2) && value1 !== 0) {
          const variance = Math.abs((value1 - value2) / value1);

          if (variance > this.config.maxDocumentVariance) {
            // Create document conflict
            await db.insert(documentConflicts).values({
              dealId,
              document1Id: currentDocumentId,
              document2Id: otherDoc.id,
              fieldName,
              value1: String(value1),
              value2: String(value2),
              variancePercent: String(variance),
              resolution: 'pending',
            });

            conflicts.push(
              this.createClarification({
                documentId: currentDocumentId,
                dealId,
                fieldName,
                clarificationType: 'conflict',
                extractedValue: field.value,
                suggestedValues: [String(value1), String(value2), String((value1 + value2) / 2)],
                reason: `Value differs from ${otherDoc.filename} by ${(variance * 100).toFixed(1)}%`,
                priority: this.calculatePriority(fieldName, 'conflict'),
              })
            );
          }
        }
      }
    }

    return conflicts;
  }

  /**
   * Store clarifications to database
   */
  private async storeClarifications(
    clarifications: Clarification[],
    documentId: string,
    dealId?: string
  ): Promise<void> {
    for (const c of clarifications) {
      await db.insert(extractionClarifications).values({
        documentId,
        dealId,
        fieldName: c.fieldName,
        fieldPath: c.fieldPath,
        extractedValue: c.extractedValue !== null ? String(c.extractedValue) : null,
        suggestedValues: c.suggestedValues,
        benchmarkValue: c.benchmarkValue !== undefined ? String(c.benchmarkValue) : null,
        benchmarkRange: c.benchmarkRange,
        clarificationType: c.clarificationType,
        status: 'pending',
        confidenceScore: c.confidenceScore,
        reason: c.reason,
        priority: c.priority,
      });
    }
  }

  /**
   * Create a clarification object
   */
  private createClarification(params: {
    documentId: string;
    dealId?: string;
    fieldName: string;
    fieldPath?: string;
    clarificationType: ClarificationType;
    extractedValue?: unknown;
    suggestedValues?: unknown[];
    benchmarkValue?: string;
    benchmarkRange?: { min: number; max: number; median: number };
    reason: string;
    confidenceScore?: number;
    priority?: number;
  }): Clarification {
    return {
      id: '', // Will be assigned on insert
      documentId: params.documentId,
      dealId: params.dealId,
      fieldName: params.fieldName,
      fieldPath: params.fieldPath,
      extractedValue: params.extractedValue,
      suggestedValues: params.suggestedValues,
      benchmarkValue: params.benchmarkValue,
      benchmarkRange: params.benchmarkRange,
      clarificationType: params.clarificationType,
      status: 'pending' as ClarificationStatus,
      confidenceScore: params.confidenceScore,
      reason: params.reason,
      priority: params.priority || 5,
    };
  }

  /**
   * Calculate priority based on field importance and issue type
   */
  private calculatePriority(
    fieldName: string,
    issueType: ClarificationType,
    confidence?: number
  ): number {
    let basePriority = 5;

    // Critical fields get higher priority
    if (this.config.criticalFields.includes(fieldName)) {
      basePriority += 3;
    }

    // Issue type affects priority
    switch (issueType) {
      case 'missing':
        basePriority += 3;
        break;
      case 'conflict':
        basePriority += 2;
        break;
      case 'out_of_range':
        basePriority += 1;
        break;
      case 'low_confidence':
        // Lower confidence = higher priority
        if (confidence !== undefined) {
          basePriority += Math.floor((100 - confidence) / 25);
        }
        break;
    }

    return Math.min(10, basePriority);
  }

  /**
   * Calculate benchmark variance
   */
  private calculateBenchmarkVariance(value: number, benchmark: FieldBenchmark): number {
    if (value < benchmark.min) {
      return (value - benchmark.min) / benchmark.min;
    }
    if (value > benchmark.max) {
      return (value - benchmark.max) / benchmark.max;
    }
    return 0; // Within range
  }

  /**
   * Calculate overall confidence from extracted data
   */
  private calculateOverallConfidence(extractedData: Record<string, ExtractedField>): number {
    const confidences = Object.values(extractedData)
      .filter((f) => f.confidence !== undefined)
      .map((f) => f.confidence!);

    if (confidences.length === 0) return 0;

    // Weight critical fields more heavily
    let weightedSum = 0;
    let totalWeight = 0;

    for (const [fieldName, field] of Object.entries(extractedData)) {
      if (field.confidence === undefined) continue;

      const weight = this.config.criticalFields.includes(fieldName) ? 2 : 1;
      weightedSum += field.confidence * weight;
      totalWeight += weight;
    }

    return Math.round(weightedSum / totalWeight);
  }
}

// ============================================================================
// Types
// ============================================================================

export interface ExtractedField {
  value: unknown;
  confidence?: number;
  source?: string;
  alternatives?: unknown[];
}

export interface FieldCheckResult {
  shouldClarify: boolean;
  confidenceScore?: number;
  clarification?: Clarification;
}

export interface ClarificationResult {
  clarificationsGenerated: number;
  clarifications: Clarification[];
  autoResolved: string[];
  overallConfidence: number;
  criticalClarifications: number;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createClarificationEngine(
  config?: Partial<ClarificationConfig>
): ClarificationEngine {
  return new ClarificationEngine(config);
}

export default ClarificationEngine;
