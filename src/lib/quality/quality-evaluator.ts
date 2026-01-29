/**
 * Quality Evaluator Service
 *
 * Orchestrates quality evaluation by pulling data from the database
 * and running quality calculations.
 */

import { db } from '@/db';
import {
  deals,
  facilities,
  documents,
  financialPeriods,
  facilityCensusPeriods,
  facilityPayerRates,
  extractionClarifications,
} from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  calculateOverallScore,
  detectQualityIssues,
  generateRecommendations,
  type QualityIssue,
  type CompletenessData,
  type FacilityQualityInput,
  type DealQualityInput,
} from './quality-calculator';

// ============================================================================
// TYPES
// ============================================================================

type FinancialPeriod = typeof financialPeriods.$inferSelect;
type Clarification = typeof extractionClarifications.$inferSelect;
type Document = typeof documents.$inferSelect;

export interface DealQualityReport {
  dealId: string;
  dealName: string;
  overallScore: number;
  breakdown: {
    completeness: number;
    confidence: number;
    consistency: number;
    validation: number;
  };
  level: string;
  canProceedToAnalysis: boolean;
  issues: QualityIssue[];
  completeness: CompletenessData;
  recommendations: string[];
  facilityScores: FacilityQualityScore[];
  documentScores: DocumentQualityScore[];
  evaluatedAt: Date;
}

export interface FacilityQualityScore {
  facilityId: string;
  facilityName: string;
  score: number;
  dataCompleteness: number;
  dataConfidence: number;
  issueCount: number;
  hasRevenue: boolean;
  hasExpenses: boolean;
  hasCensus: boolean;
  hasRates: boolean;
  periodCount: number;
}

export interface DocumentQualityScore {
  documentId: string;
  filename: string;
  ocrQuality: number | null;
  extractionConfidence: number | null;
  type: string;
}

// ============================================================================
// MAIN EVALUATOR
// ============================================================================

/**
 * Evaluate quality for an entire deal
 */
export async function evaluateDealQuality(dealId: string): Promise<DealQualityReport> {
  // Fetch deal
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));

  if (!deal) {
    throw new Error(`Deal not found: ${dealId}`);
  }

  // Fetch facilities with their data
  const dealFacilities = await db.select().from(facilities).where(eq(facilities.dealId, dealId));

  // Fetch documents
  const dealDocuments: Document[] = await db
    .select()
    .from(documents)
    .where(eq(documents.dealId, dealId));

  // Fetch clarifications
  const dealClarifications: Clarification[] = await db
    .select()
    .from(extractionClarifications)
    .where(eq(extractionClarifications.dealId, dealId));

  // Build facility quality inputs
  const facilityInputs: FacilityQualityInput[] = [];
  const facilityScores: FacilityQualityScore[] = [];

  for (const facility of dealFacilities) {
    // Get financial periods
    const periods: FinancialPeriod[] = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.facilityId, facility.id))
      .orderBy(desc(financialPeriods.periodEnd));

    // Get census periods
    const census = await db
      .select()
      .from(facilityCensusPeriods)
      .where(eq(facilityCensusPeriods.facilityId, facility.id));

    // Get payer rates
    const rates = await db
      .select()
      .from(facilityPayerRates)
      .where(eq(facilityPayerRates.facilityId, facility.id));

    // Check what data exists
    const hasRevenue = periods.some((p: FinancialPeriod) => p.totalRevenue && Number(p.totalRevenue) > 0);
    const hasExpenses = periods.some((p: FinancialPeriod) => p.totalExpenses && Number(p.totalExpenses) > 0);
    const hasCensus = census.length > 0;
    const hasRates = rates.length > 0;

    // Calculate facility-level confidence
    const confidences = periods
      .filter((p: FinancialPeriod) => p.confidenceScore !== null)
      .map((p: FinancialPeriod) => p.confidenceScore!);
    const avgConfidence =
      confidences.length > 0
        ? Math.round(confidences.reduce((a: number, b: number) => a + b, 0) / confidences.length)
        : 0;

    // Calculate completeness
    let completeness = 0;
    if (hasRevenue) completeness += 35;
    if (hasExpenses) completeness += 25;
    if (hasCensus) completeness += 20;
    if (hasRates) completeness += 10;
    if (facility.licensedBeds) completeness += 5;
    if (periods.length >= 3) completeness += 5;

    const facilityInput: FacilityQualityInput = {
      id: facility.id,
      name: facility.name,
      dataCompleteness: completeness,
      dataConfidence: avgConfidence,
      hasRevenue,
      hasExpenses,
      hasCensus,
      hasRates,
      licensedBeds: facility.licensedBeds ?? undefined,
      financialPeriodCount: periods.length,
      censusPeriodCount: census.length,
      latestPeriodDate: periods[0]?.periodEnd ? new Date(periods[0].periodEnd) : undefined,
    };

    facilityInputs.push(facilityInput);

    // Count issues - clarifications don't have facilityId, so count all pending
    const facilityIssues = dealClarifications.filter(
      (c: Clarification) => c.status === 'pending'
    );

    facilityScores.push({
      facilityId: facility.id,
      facilityName: facility.name,
      score: Math.round((completeness * 0.5 + avgConfidence * 0.5)),
      dataCompleteness: completeness,
      dataConfidence: avgConfidence,
      issueCount: facilityIssues.length + (hasRevenue ? 0 : 1) + (hasExpenses ? 0 : 1),
      hasRevenue,
      hasExpenses,
      hasCensus,
      hasRates,
      periodCount: periods.length,
    });
  }

  // Build document scores
  const documentScores: DocumentQualityScore[] = dealDocuments.map((doc: Document) => ({
    documentId: doc.id,
    filename: doc.filename,
    ocrQuality: doc.ocrQualityScore,
    extractionConfidence: doc.extractionConfidence,
    type: doc.type ?? 'other',
  }));

  // Count conflicts (conflict type clarifications)
  const conflictCount = dealClarifications.filter(
    (c: Clarification) => c.clarificationType === 'conflict'
  ).length;

  const criticalConflictCount = dealClarifications.filter(
    (c: Clarification) => (c.priority ?? 0) >= 9 && c.status === 'pending'
  ).length;

  const resolvedCount = dealClarifications.filter(
    (c: Clarification) => c.status === 'resolved' || c.status === 'auto_resolved'
  ).length;

  // Build deal quality input
  const dealInput: DealQualityInput = {
    dealId,
    facilities: facilityInputs,
    conflictCount,
    criticalConflictCount,
    clarificationCount: dealClarifications.length,
    resolvedClarificationCount: resolvedCount,
    documentCount: dealDocuments.length,
    documentConfidences: dealDocuments
      .map((d: Document) => d.extractionConfidence)
      .filter((c): c is number => c !== null),
  };

  // Calculate scores
  const qualityScore = calculateOverallScore(dealInput);
  const issues = detectQualityIssues(dealInput);
  const recommendations = generateRecommendations(qualityScore, issues);

  // Build completeness data
  const completeness = buildCompletenessData(facilityInputs);

  return {
    dealId,
    dealName: deal.name,
    overallScore: qualityScore.overall,
    breakdown: qualityScore.breakdown,
    level: qualityScore.level,
    canProceedToAnalysis: qualityScore.canProceedToAnalysis,
    issues,
    completeness,
    recommendations,
    facilityScores,
    documentScores,
    evaluatedAt: new Date(),
  };
}

/**
 * Update deal's stored quality score after evaluation
 */
export async function updateDealQualityScore(
  dealId: string,
  score: number
): Promise<void> {
  await db
    .update(deals)
    .set({ extractionQualityScore: score })
    .where(eq(deals.id, dealId));
}

/**
 * Update document's OCR quality score
 */
export async function updateDocumentOcrQuality(
  documentId: string,
  ocrQuality: number
): Promise<void> {
  await db
    .update(documents)
    .set({ ocrQualityScore: ocrQuality })
    .where(eq(documents.id, documentId));
}

// ============================================================================
// HELPERS
// ============================================================================

function buildCompletenessData(inputs: FacilityQualityInput[]): CompletenessData {
  const hasAnyRevenue = inputs.some((f) => f.hasRevenue);
  const hasAnyExpenses = inputs.some((f) => f.hasExpenses);
  const hasAnyCensus = inputs.some((f) => f.hasCensus);
  const hasAnyRates = inputs.some((f) => f.hasRates);

  return {
    revenue: {
      present: hasAnyRevenue,
      fields: [
        { name: 'Total Revenue', present: hasAnyRevenue, required: true },
        { name: 'Medicare Revenue', present: hasAnyRevenue, required: false },
        { name: 'Medicaid Revenue', present: hasAnyRevenue, required: false },
        { name: 'Private Pay Revenue', present: hasAnyRevenue, required: false },
      ],
    },
    expenses: {
      present: hasAnyExpenses,
      fields: [
        { name: 'Total Expenses', present: hasAnyExpenses, required: true },
        { name: 'Labor Cost', present: hasAnyExpenses, required: false },
        { name: 'Operating Expenses', present: hasAnyExpenses, required: false },
      ],
    },
    census: {
      present: hasAnyCensus,
      fields: [
        { name: 'Patient Days', present: hasAnyCensus, required: true },
        { name: 'Occupancy Rate', present: hasAnyCensus, required: false },
        { name: 'Payer Mix', present: hasAnyCensus, required: false },
      ],
    },
    rates: {
      present: hasAnyRates,
      fields: [
        { name: 'Medicare PPD', present: hasAnyRates, required: false },
        { name: 'Medicaid PPD', present: hasAnyRates, required: false },
        { name: 'Private PPD', present: hasAnyRates, required: false },
      ],
    },
    facilityInfo: {
      present: inputs.some((f) => f.licensedBeds),
      fields: [
        { name: 'Licensed Beds', present: inputs.some((f) => f.licensedBeds), required: true },
        {
          name: 'Multiple Periods',
          present: inputs.some((f) => f.financialPeriodCount >= 3),
          required: false,
        },
      ],
    },
  };
}
