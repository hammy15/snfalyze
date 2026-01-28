/**
 * Extraction Context Manager
 *
 * Manages the accumulated state across the sequential extraction pipeline.
 * Each document builds upon the context from previous documents.
 */

import { nanoid } from 'nanoid';
import type {
  ExtractionContext,
  FacilityFinancialProfile,
  NormalizedFinancialPeriod,
  NormalizedCensusPeriod,
  NormalizedPayerRate,
  CrossReferenceIndex,
  DataConflict,
  PipelineClarification,
  ProcessingStats,
  DataSource,
  CrossReferenceEntry,
  CalculatedRevenueEntry,
  VALIDATION_THRESHOLDS,
} from '../types';
import { FacilityProfileBuilder } from './facility-profile';

// ============================================================================
// EXTRACTION CONTEXT MANAGER
// ============================================================================

export class ExtractionContextManager {
  private context: ExtractionContext;
  private facilityBuilders: Map<string, FacilityProfileBuilder>;

  constructor(sessionId: string, dealId: string) {
    this.context = this.createEmptyContext(sessionId, dealId);
    this.facilityBuilders = new Map();
  }

  // --------------------------------------------------------------------------
  // Context Getters
  // --------------------------------------------------------------------------

  getContext(): ExtractionContext {
    return this.context;
  }

  getSessionId(): string {
    return this.context.sessionId;
  }

  getDealId(): string {
    return this.context.dealId;
  }

  getFacilityProfiles(): FacilityFinancialProfile[] {
    return Array.from(this.context.facilityProfiles.values());
  }

  getFacilityProfile(facilityId: string): FacilityFinancialProfile | undefined {
    return this.context.facilityProfiles.get(facilityId);
  }

  getExtractedPeriods(): NormalizedFinancialPeriod[] {
    return this.context.extractedPeriods;
  }

  getExtractedCensus(): NormalizedCensusPeriod[] {
    return this.context.extractedCensus;
  }

  getExtractedRates(): NormalizedPayerRate[] {
    return this.context.extractedRates;
  }

  getDetectedConflicts(): DataConflict[] {
    return this.context.detectedConflicts;
  }

  getPendingClarifications(): PipelineClarification[] {
    return this.context.pendingClarifications;
  }

  getOverallConfidence(): number {
    return this.context.overallConfidence;
  }

  getStats(): ProcessingStats {
    return this.context.processingStats;
  }

  // --------------------------------------------------------------------------
  // Facility Management
  // --------------------------------------------------------------------------

  /**
   * Find or create a facility profile by name (handles aliases)
   */
  findOrCreateFacility(name: string): { profile: FacilityFinancialProfile; isNew: boolean } {
    // Handle undefined/null names with a fallback
    const effectiveName = name || 'Unknown Facility';
    const normalizedName = this.normalizeFacilityName(effectiveName);

    // Check if facility exists (by name or alias)
    for (const [id, profile] of this.context.facilityProfiles) {
      if (
        this.normalizeFacilityName(profile.name) === normalizedName ||
        profile.aliases.some((a) => this.normalizeFacilityName(a) === normalizedName)
      ) {
        // Add alias if not already present
        if (!profile.aliases.includes(effectiveName) && profile.name !== effectiveName) {
          profile.aliases.push(effectiveName);
        }
        return { profile, isNew: false };
      }
    }

    // Create new facility
    const id = nanoid();
    const builder = new FacilityProfileBuilder(id, effectiveName);
    this.facilityBuilders.set(id, builder);

    const profile = builder.getProfile();
    this.context.facilityProfiles.set(id, profile);

    return { profile, isNew: true };
  }

  /**
   * Get facility builder for detailed updates
   */
  getFacilityBuilder(facilityId: string): FacilityProfileBuilder | undefined {
    return this.facilityBuilders.get(facilityId);
  }

  /**
   * Resolve facility alias to canonical ID
   */
  resolveFacilityId(nameOrAlias: string): string | null {
    const normalized = this.normalizeFacilityName(nameOrAlias);

    for (const [id, profile] of this.context.facilityProfiles) {
      if (
        this.normalizeFacilityName(profile.name) === normalized ||
        profile.aliases.some((a) => this.normalizeFacilityName(a) === normalized)
      ) {
        return id;
      }
    }

    return null;
  }

  // --------------------------------------------------------------------------
  // Data Addition
  // --------------------------------------------------------------------------

  /**
   * Add extracted financial period
   */
  addFinancialPeriod(period: NormalizedFinancialPeriod): void {
    this.context.extractedPeriods.push(period);

    // Add to cross-reference index
    const periodKey = this.getPeriodKey(period.periodStart, period.periodEnd);
    this.addCrossReference(
      this.context.crossReferenceIndex.revenueByPeriod,
      periodKey,
      period.revenue.total,
      period.sources[0],
      period.confidence,
      'revenue.total'
    );
    this.addCrossReference(
      this.context.crossReferenceIndex.expensesByPeriod,
      periodKey,
      period.expenses.total,
      period.sources[0],
      period.confidence,
      'expenses.total'
    );

    // Update facility profile
    const builder = this.facilityBuilders.get(period.facilityId);
    if (builder) {
      builder.addFinancialPeriod(period);
      this.context.facilityProfiles.set(period.facilityId, builder.getProfile());
    }

    this.recalculateOverallConfidence();
  }

  /**
   * Add extracted census period
   */
  addCensusPeriod(census: NormalizedCensusPeriod): void {
    this.context.extractedCensus.push(census);

    // Add to cross-reference index
    const periodKey = this.getPeriodKey(census.periodStart, census.periodEnd);
    this.addCrossReference(
      this.context.crossReferenceIndex.censusByPeriod,
      periodKey,
      census.patientDays.total,
      census.sources[0],
      census.confidence,
      'patientDays.total'
    );

    // Update facility profile
    const builder = this.facilityBuilders.get(census.facilityId);
    if (builder) {
      builder.addCensusPeriod(census);
      this.context.facilityProfiles.set(census.facilityId, builder.getProfile());
    }

    // Trigger revenue reconciliation check
    this.checkRevenueReconciliation(census.facilityId, periodKey);

    this.recalculateOverallConfidence();
  }

  /**
   * Add extracted payer rate
   */
  addPayerRate(rate: NormalizedPayerRate): void {
    this.context.extractedRates.push(rate);

    // Add to cross-reference index
    const dateKey = rate.effectiveDate.toISOString().split('T')[0];
    const avgRate = this.calculateWeightedAverageRate(rate);
    if (avgRate) {
      this.addCrossReference(
        this.context.crossReferenceIndex.ratesByDate,
        dateKey,
        avgRate,
        rate.sources[0],
        rate.confidence,
        'rates.weightedAvg'
      );
    }

    // Update facility profile
    const builder = this.facilityBuilders.get(rate.facilityId);
    if (builder) {
      builder.addPayerRate(rate);
      this.context.facilityProfiles.set(rate.facilityId, builder.getProfile());
    }

    this.recalculateOverallConfidence();
  }

  // --------------------------------------------------------------------------
  // Conflict Management
  // --------------------------------------------------------------------------

  /**
   * Add a detected conflict
   */
  addConflict(conflict: DataConflict): void {
    this.context.detectedConflicts.push(conflict);
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(
    conflictId: string,
    resolvedValue: number,
    method: 'auto_average' | 'auto_highest_confidence' | 'user_input',
    note?: string
  ): void {
    const conflict = this.context.detectedConflicts.find((c) => c.id === conflictId);
    if (conflict) {
      conflict.status = method === 'user_input' ? 'user_resolved' : 'auto_resolved';
      conflict.resolvedValue = resolvedValue;
      conflict.resolutionMethod = method;
      conflict.resolutionNote = note;
      conflict.resolvedAt = new Date();
    }
  }

  // --------------------------------------------------------------------------
  // Clarification Management
  // --------------------------------------------------------------------------

  /**
   * Add a clarification request
   */
  addClarification(clarification: PipelineClarification): void {
    this.context.pendingClarifications.push(clarification);
  }

  /**
   * Resolve a clarification
   */
  resolveClarification(
    clarificationId: string,
    resolvedValue: number | string,
    resolvedBy: string,
    note?: string
  ): void {
    const index = this.context.pendingClarifications.findIndex((c) => c.id === clarificationId);
    if (index !== -1) {
      const clarification = this.context.pendingClarifications[index];
      clarification.status = 'resolved';
      clarification.resolvedValue = resolvedValue;
      clarification.resolvedBy = resolvedBy;
      clarification.resolvedAt = new Date();
      clarification.resolutionNote = note;

      // Move to resolved
      this.context.pendingClarifications.splice(index, 1);
      this.context.resolvedClarifications.push(clarification);
    }
  }

  /**
   * Skip a clarification (use extracted value as-is)
   */
  skipClarification(clarificationId: string): void {
    const index = this.context.pendingClarifications.findIndex((c) => c.id === clarificationId);
    if (index !== -1) {
      const clarification = this.context.pendingClarifications[index];
      clarification.status = 'skipped';
      clarification.resolvedAt = new Date();

      this.context.pendingClarifications.splice(index, 1);
      this.context.resolvedClarifications.push(clarification);
    }
  }

  // --------------------------------------------------------------------------
  // Stats Tracking
  // --------------------------------------------------------------------------

  /**
   * Update processing stats
   */
  updateStats(updates: Partial<ProcessingStats>): void {
    Object.assign(this.context.processingStats, updates);
  }

  /**
   * Increment stat counters
   */
  incrementStats(
    field: 'aiCallCount' | 'aiTokensUsed' | 'documentsProcessed' | 'sheetsAnalyzed' | 'dataPointsExtracted',
    amount: number = 1
  ): void {
    this.context.processingStats[field] += amount;
  }

  // --------------------------------------------------------------------------
  // Context Summary (for AI prompts)
  // --------------------------------------------------------------------------

  /**
   * Generate a summary of current context for AI prompts
   */
  getContextSummary(): {
    knownFacilities: { id: string; name: string; aliases: string[] }[];
    knownPeriods: { start: Date; end: Date; type: string }[];
    extractedMetrics: { field: string; value: number; period: string }[];
    pendingQuestions: string[];
  } {
    const facilities = this.getFacilityProfiles().map((f) => ({
      id: f.id,
      name: f.name,
      aliases: f.aliases,
    }));

    const periods = this.context.extractedPeriods
      .slice(-24) // Last 24 periods
      .map((p) => ({
        start: p.periodStart,
        end: p.periodEnd,
        type: p.periodType,
      }));

    const metrics = this.context.extractedPeriods
      .slice(-12) // Last 12 periods
      .flatMap((p) => [
        { field: 'revenue', value: p.revenue.total, period: this.formatPeriodLabel(p) },
        { field: 'expenses', value: p.expenses.total, period: this.formatPeriodLabel(p) },
        { field: 'noi', value: p.metrics.noi, period: this.formatPeriodLabel(p) },
      ]);

    const questions = this.context.pendingClarifications
      .filter((c) => c.priority >= 7)
      .map((c) => c.context.aiExplanation || `Clarify ${c.fieldLabel}`);

    return { knownFacilities: facilities, knownPeriods: periods, extractedMetrics: metrics, pendingQuestions: questions };
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  private createEmptyContext(sessionId: string, dealId: string): ExtractionContext {
    return {
      sessionId,
      dealId,
      facilityProfiles: new Map(),
      extractedPeriods: [],
      extractedCensus: [],
      extractedRates: [],
      crossReferenceIndex: {
        revenueByPeriod: new Map(),
        expensesByPeriod: new Map(),
        censusByPeriod: new Map(),
        ratesByDate: new Map(),
        calculatedRevenue: new Map(),
      },
      detectedConflicts: [],
      pendingClarifications: [],
      resolvedClarifications: [],
      overallConfidence: 0,
      processingStats: {
        totalProcessingTimeMs: 0,
        aiCallCount: 0,
        aiTokensUsed: 0,
        documentsProcessed: 0,
        sheetsAnalyzed: 0,
        dataPointsExtracted: 0,
      },
    };
  }

  private normalizeFacilityName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private getPeriodKey(start: Date, end: Date): string {
    return `${start.toISOString().split('T')[0]}_${end.toISOString().split('T')[0]}`;
  }

  private formatPeriodLabel(period: NormalizedFinancialPeriod): string {
    const start = period.periodStart.toISOString().split('T')[0];
    const end = period.periodEnd.toISOString().split('T')[0];
    return `${start} to ${end}`;
  }

  private addCrossReference(
    index: Map<string, CrossReferenceEntry[]>,
    key: string,
    value: number,
    source: DataSource,
    confidence: number,
    fieldPath: string
  ): void {
    const entries = index.get(key) || [];
    entries.push({ value, source, confidence, fieldPath });
    index.set(key, entries);

    // Check for conflicts if multiple entries
    if (entries.length > 1) {
      this.checkForConflict(entries, key, fieldPath);
    }
  }

  private checkForConflict(entries: CrossReferenceEntry[], key: string, fieldPath: string): void {
    if (entries.length < 2) return;

    // Calculate variance between values
    const values = entries.map((e) => e.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const maxDiff = Math.max(...values.map((v) => Math.abs(v - avg)));
    const variancePercent = avg !== 0 ? maxDiff / avg : 0;

    // Only flag if variance exceeds threshold
    if (variancePercent > 0.05) {
      // 5% threshold
      const conflict: DataConflict = {
        id: nanoid(),
        type: 'cross_document',
        severity: variancePercent > 0.15 ? 'high' : variancePercent > 0.10 ? 'medium' : 'low',
        fieldPath,
        periodKey: key,
        values: entries.map((e) => ({
          value: e.value,
          source: e.source,
          confidence: e.confidence,
        })),
        variancePercent,
        varianceAbsolute: maxDiff,
        status: 'detected',
        detectedAt: new Date(),
      };

      this.addConflict(conflict);
    }
  }

  private checkRevenueReconciliation(facilityId: string, periodKey: string): void {
    // Get revenue for this period
    const revenueEntries = this.context.crossReferenceIndex.revenueByPeriod.get(periodKey);
    if (!revenueEntries?.length) return;

    const reportedRevenue = revenueEntries[0].value;

    // Get census for this period
    const census = this.context.extractedCensus.find(
      (c) =>
        c.facilityId === facilityId &&
        this.getPeriodKey(c.periodStart, c.periodEnd) === periodKey
    );
    if (!census) return;

    // Get rates (use most recent effective date before period end)
    const rates = this.context.extractedRates
      .filter((r) => r.facilityId === facilityId)
      .sort((a, b) => b.effectiveDate.getTime() - a.effectiveDate.getTime())[0];
    if (!rates) return;

    // Calculate expected revenue
    const calculatedByPayer: CalculatedRevenueEntry['byPayer'] = [];
    let calculatedTotal = 0;

    const payerMappings: { payer: string; daysKey: keyof typeof census.patientDays; rateKey: keyof typeof rates.rates }[] = [
      { payer: 'Medicare Part A', daysKey: 'medicarePartA', rateKey: 'medicarePartA' },
      { payer: 'Medicare Advantage', daysKey: 'medicareAdvantage', rateKey: 'medicareAdvantage' },
      { payer: 'Managed Care', daysKey: 'managedCare', rateKey: 'managedCare' },
      { payer: 'Medicaid', daysKey: 'medicaid', rateKey: 'medicaid' },
      { payer: 'Managed Medicaid', daysKey: 'managedMedicaid', rateKey: 'managedMedicaid' },
      { payer: 'Private', daysKey: 'private', rateKey: 'private' },
      { payer: 'VA', daysKey: 'va', rateKey: 'va' },
      { payer: 'Hospice', daysKey: 'hospice', rateKey: 'hospice' },
    ];

    for (const mapping of payerMappings) {
      const days = census.patientDays[mapping.daysKey] || 0;
      const rate = rates.rates[mapping.rateKey] || 0;
      const calculated = days * rate;
      calculatedTotal += calculated;

      if (days > 0 || rate > 0) {
        calculatedByPayer.push({
          payer: mapping.payer,
          days,
          rate,
          calculated,
          reported: 0, // Would need payer-level revenue breakdown
          variance: 0,
        });
      }
    }

    const variance = reportedRevenue - calculatedTotal;
    const variancePercent = reportedRevenue !== 0 ? variance / reportedRevenue : 0;

    // Store calculated revenue
    this.context.crossReferenceIndex.calculatedRevenue.set(periodKey, {
      periodKey,
      calculatedTotal,
      reportedTotal: reportedRevenue,
      variance,
      variancePercent,
      byPayer: calculatedByPayer,
    });

    // Flag if variance is significant
    if (Math.abs(variancePercent) > 0.10) {
      const conflict: DataConflict = {
        id: nanoid(),
        type: 'revenue_reconciliation',
        severity: Math.abs(variancePercent) > 0.20 ? 'high' : 'medium',
        fieldPath: 'revenue.total',
        facilityId,
        periodKey,
        values: [
          {
            value: reportedRevenue,
            source: revenueEntries[0].source,
            confidence: revenueEntries[0].confidence,
          },
          {
            value: calculatedTotal,
            source: { ...census.sources[0], filename: 'Calculated (Census × Rates)' },
            confidence: Math.min(census.confidence, rates.confidence),
          },
        ],
        variancePercent: Math.abs(variancePercent),
        varianceAbsolute: Math.abs(variance),
        status: 'detected',
        detectedAt: new Date(),
      };

      this.addConflict(conflict);
    }
  }

  private calculateWeightedAverageRate(rate: NormalizedPayerRate): number | null {
    const rateValues = Object.values(rate.rates).filter((r): r is number => r !== null && r > 0);
    if (rateValues.length === 0) return null;
    return rateValues.reduce((a, b) => a + b, 0) / rateValues.length;
  }

  private recalculateOverallConfidence(): void {
    const allConfidences: number[] = [
      ...this.context.extractedPeriods.map((p) => p.confidence),
      ...this.context.extractedCensus.map((c) => c.confidence),
      ...this.context.extractedRates.map((r) => r.confidence),
    ];

    if (allConfidences.length === 0) {
      this.context.overallConfidence = 0;
      return;
    }

    // Penalize for unresolved conflicts
    const conflictPenalty = this.context.detectedConflicts.filter(
      (c) => c.status === 'detected' || c.status === 'pending_clarification'
    ).length * 2;

    // Penalize for pending clarifications
    const clarificationPenalty = this.context.pendingClarifications.length;

    const avgConfidence = allConfidences.reduce((a, b) => a + b, 0) / allConfidences.length;
    this.context.overallConfidence = Math.max(0, avgConfidence - conflictPenalty - clarificationPenalty);
  }
}

export default ExtractionContextManager;
