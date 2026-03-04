// =============================================================================
// CIL LEARNING ENGINE — Wraps existing learning system with CIL orchestration
// =============================================================================

import { db } from '@/db';
import { historicalDeals, historicalDealFacilities } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { reverseEngineer } from '../learning/reverse-engineer';
import { extractPreferenceDataPoints, aggregatePreferences } from '../learning/pattern-aggregator';
import { runDualBrainAnalysis } from '../analysis/brains';
import { loadNewoKnowledge, loadDevKnowledge } from '../analysis/knowledge-bridge';
import { logActivity, invalidateStateCache } from './state-manager';
import { refreshStatePerformance } from './performance-tracker';
import type { CILLearningResult } from './types';
import type { AnalysisInput } from '../analysis/engine';

// ── Rerun a historical deal through dual-brain ─────────────────────

export async function rerunHistoricalDeal(historicalDealId: string): Promise<CILLearningResult> {
  const [deal] = await db
    .select()
    .from(historicalDeals)
    .where(eq(historicalDeals.id, historicalDealId));

  if (!deal) {
    throw new Error(`Historical deal ${historicalDealId} not found`);
  }

  const facilities = await db
    .select()
    .from(historicalDealFacilities)
    .where(eq(historicalDealFacilities.historicalDealId, historicalDealId));

  // Build AnalysisInput from historical deal
  const analysisInput: AnalysisInput = {
    id: historicalDealId,
    name: deal.name,
    askingPrice: deal.askingPrice ? parseFloat(deal.askingPrice) : 0,
    beds: deal.beds ?? 0,
    assetType: (deal.assetType ?? 'SNF') as string,
    primaryState: deal.primaryState,
    facilities: facilities.map((f) => ({
      name: f.facilityName,
      state: f.state ?? deal.primaryState ?? '',
      beds: f.beds ?? 0,
      assetType: (f.assetType ?? deal.assetType ?? 'SNF') as 'SNF' | 'ALF',
      occupancy: f.rawOccupancy ? parseFloat(f.rawOccupancy) : 0.8,
      revenue: 0,
      expenses: 0,
      ebitdar: f.rawEbitdar ? parseFloat(f.rawEbitdar) : 0,
      cmsRating: null,
    })),
  };

  // Load brain-specific knowledge
  const [newoKnowledge, devKnowledge] = await Promise.all([
    loadNewoKnowledge({ state: deal.primaryState ?? undefined, assetType: deal.assetType ?? undefined }),
    loadDevKnowledge({ state: deal.primaryState ?? undefined, assetType: deal.assetType ?? undefined }),
  ]);

  // Run dual-brain analysis
  const result = await runDualBrainAnalysis(analysisInput, {
    newo: newoKnowledge,
    dev: devKnowledge,
  });

  // Compare with historical outcome
  const statesUpdated = [...new Set(facilities.map((f) => f.state).filter(Boolean))] as string[];

  await logActivity('rerun', `Re-ran ${deal.name} through dual-brain — ${result.synthesis.recommendation} (${result.synthesis.confidence}%)`, {
    dealId: historicalDealId,
    metadata: {
      recommendation: result.synthesis.recommendation,
      confidence: result.synthesis.confidence,
      newoConfidence: result.newo.confidenceScore,
      devConfidence: result.dev.confidenceScore,
      tensionCount: result.synthesis.tensionPoints.length,
    },
  });

  // Refresh state performance after learning
  await refreshStatePerformance().catch((err) =>
    console.error('[CIL Learning] Performance refresh failed:', err)
  );

  invalidateStateCache();

  return {
    mode: 'rerun',
    success: true,
    patternsExtracted: result.synthesis.tensionPoints.length,
    preferencesUpdated: 0,
    statesUpdated,
    summary: `Re-analyzed ${deal.name}: ${result.synthesis.recommendation} with ${result.synthesis.confidence}% confidence. ${result.synthesis.tensionPoints.length} tension points identified.`,
  };
}

// ── Ingest new learning data (reverse engineer) ────────────────────

export async function ingestLearningData(
  historicalDealId: string
): Promise<CILLearningResult> {
  const [deal] = await db
    .select()
    .from(historicalDeals)
    .where(eq(historicalDeals.id, historicalDealId));

  if (!deal) {
    throw new Error(`Historical deal ${historicalDealId} not found`);
  }

  const rawExtraction = deal.rawExtraction;
  const proformaExtraction = deal.proformaExtraction;
  const valuationExtraction = deal.valuationExtraction;

  if (!rawExtraction || !proformaExtraction) {
    throw new Error('Deal must have both raw extraction and proforma data for learning');
  }

  // Run reverse engineering — types are stored as jsonb, cast to expected shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const comparison = reverseEngineer(rawExtraction as any, proformaExtraction as any, valuationExtraction as any, historicalDealId);

  // Extract preference data points
  const dataPoints = extractPreferenceDataPoints(comparison);

  // Aggregate preferences
  const aggregated = aggregatePreferences(dataPoints);

  // Store comparison result
  await db
    .update(historicalDeals)
    .set({
      comparisonResult: comparison as unknown as Record<string, unknown>,
      status: 'complete',
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(historicalDeals.id, historicalDealId));

  const statesUpdated = [...new Set(
    (comparison.facilities || []).map((f: { state?: string }) => f.state).filter(Boolean)
  )] as string[];

  await logActivity('learning', `Ingested ${deal.name} — ${dataPoints.length} data points, ${aggregated.length} preferences`, {
    dealId: historicalDealId,
    metadata: { dataPoints: dataPoints.length, preferences: aggregated.length, statesUpdated },
  });

  // Refresh performance
  await refreshStatePerformance().catch(() => {});
  invalidateStateCache();

  return {
    mode: 'ingest',
    success: true,
    patternsExtracted: dataPoints.length,
    preferencesUpdated: aggregated.length,
    statesUpdated,
    summary: `Learned from ${deal.name}: extracted ${dataPoints.length} data points across ${statesUpdated.length} states.`,
  };
}
