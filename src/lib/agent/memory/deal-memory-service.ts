/**
 * Deal Memory Service
 *
 * Manages deal memory for learning and pattern recognition.
 * Enables the AI agent to learn from past deals and outcomes.
 */

import { db } from '@/db';
import {
  deals,
  dealMemory,
  dealEmbeddings,
  facilities,
  financialPeriods,
  valuations,
  riskFactors,
} from '@/db/schema';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import type { DealMemoryEntry, SimilarDealReference } from '../types';

// ============================================================================
// Memory Storage
// ============================================================================

/**
 * Save a deal snapshot to memory
 */
export async function saveDealToMemory(params: {
  dealId: string;
  outcome?: 'closed' | 'passed' | 'lost' | 'withdrawn';
  outcomeNotes?: string;
  postMortem?: string;
  createdBy?: string;
}): Promise<typeof dealMemory.$inferSelect> {
  const { dealId, outcome, outcomeNotes, postMortem, createdBy } = params;

  // Get current deal data
  const [deal] = await db
    .select()
    .from(deals)
    .where(eq(deals.id, dealId))
    .limit(1);

  if (!deal) {
    throw new Error(`Deal ${dealId} not found`);
  }

  // Get related data
  const dealFacilities = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, dealId));

  const [latestFinancials] = await db
    .select()
    .from(financialPeriods)
    .where(eq(financialPeriods.dealId, dealId))
    .orderBy(desc(financialPeriods.periodEnd))
    .limit(1);

  const dealValuations = await db
    .select()
    .from(valuations)
    .where(eq(valuations.dealId, dealId));

  const risks = await db
    .select()
    .from(riskFactors)
    .where(eq(riskFactors.dealId, dealId));

  // Get current version
  const [latestMemory] = await db
    .select({ version: dealMemory.version })
    .from(dealMemory)
    .where(eq(dealMemory.dealId, dealId))
    .orderBy(desc(dealMemory.version))
    .limit(1);

  const newVersion = (latestMemory?.version || 0) + 1;

  // Build snapshot
  const snapshot = {
    deal: {
      id: deal.id,
      name: deal.name,
      assetType: deal.assetType,
      askingPrice: deal.askingPrice,
      beds: deal.beds,
      primaryState: deal.primaryState,
      thesis: deal.thesis,
      status: deal.status,
      confidenceScore: deal.confidenceScore,
    },
    facilities: dealFacilities.map((f) => ({
      id: f.id,
      name: f.name,
      assetType: f.assetType,
      beds: f.licensedBeds,
      state: f.state,
      cmsRating: f.cmsRating,
    })),
    financials: latestFinancials
      ? {
          revenue: latestFinancials.totalRevenue,
          expenses: latestFinancials.totalExpenses,
          noi: latestFinancials.noi,
          occupancy: latestFinancials.occupancyRate,
          period: {
            start: latestFinancials.periodStart,
            end: latestFinancials.periodEnd,
          },
        }
      : null,
    valuations: dealValuations.map((v) => ({
      viewType: v.viewType,
      method: v.method,
      value: v.valueBase,
      capRate: v.capRateBase,
      confidence: v.confidenceScore,
    })),
    risks: risks.map((r) => ({
      category: r.category,
      description: r.description,
      severity: r.severity,
    })),
  };

  // Save to memory
  const [memory] = await db
    .insert(dealMemory)
    .values({
      dealId,
      version: newVersion,
      snapshotData: snapshot,
      thesis: deal.thesis,
      outcome,
      outcomeNotes,
      postMortem,
      createdBy,
    })
    .returning();

  return memory;
}

/**
 * Update deal outcome in memory
 */
export async function updateDealOutcome(params: {
  dealId: string;
  outcome: 'closed' | 'passed' | 'lost' | 'withdrawn';
  outcomeNotes?: string;
  postMortem?: string;
  finalPrice?: number;
}): Promise<void> {
  const { dealId, outcome, outcomeNotes, postMortem } = params;

  // Get latest memory entry
  const [latest] = await db
    .select()
    .from(dealMemory)
    .where(eq(dealMemory.dealId, dealId))
    .orderBy(desc(dealMemory.version))
    .limit(1);

  if (latest) {
    // Update existing entry
    await db
      .update(dealMemory)
      .set({
        outcome,
        outcomeNotes,
        postMortem,
      })
      .where(eq(dealMemory.id, latest.id));
  } else {
    // Create new memory entry with outcome
    await saveDealToMemory({
      dealId,
      outcome,
      outcomeNotes,
      postMortem,
    });
  }
}

// ============================================================================
// Memory Retrieval
// ============================================================================

/**
 * Get deal memory entries
 */
export async function getDealMemory(
  dealId: string,
  version?: number
): Promise<typeof dealMemory.$inferSelect | null> {
  if (version) {
    const [memory] = await db
      .select()
      .from(dealMemory)
      .where(and(eq(dealMemory.dealId, dealId), eq(dealMemory.version, version)))
      .limit(1);
    return memory || null;
  }

  const [memory] = await db
    .select()
    .from(dealMemory)
    .where(eq(dealMemory.dealId, dealId))
    .orderBy(desc(dealMemory.version))
    .limit(1);

  return memory || null;
}

/**
 * Get all memory versions for a deal
 */
export async function getDealMemoryHistory(
  dealId: string
): Promise<(typeof dealMemory.$inferSelect)[]> {
  return db
    .select()
    .from(dealMemory)
    .where(eq(dealMemory.dealId, dealId))
    .orderBy(desc(dealMemory.version));
}

/**
 * Find similar deals from memory
 */
export async function findSimilarDeals(params: {
  assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  state?: string;
  minBeds?: number;
  maxBeds?: number;
  minPrice?: number;
  maxPrice?: number;
  outcome?: string;
  excludeDealId?: string;
  limit?: number;
}): Promise<DealMemoryEntry[]> {
  const {
    assetType,
    state,
    minBeds,
    maxBeds,
    minPrice,
    maxPrice,
    outcome,
    excludeDealId,
    limit = 10,
  } = params;

  // Build conditions
  const conditions = [];

  if (assetType) {
    conditions.push(eq(deals.assetType, assetType));
  }
  if (state) {
    conditions.push(eq(deals.primaryState, state.toUpperCase()));
  }
  if (minBeds !== undefined) {
    conditions.push(sql`${deals.beds} >= ${minBeds}`);
  }
  if (maxBeds !== undefined) {
    conditions.push(sql`${deals.beds} <= ${maxBeds}`);
  }
  if (minPrice !== undefined) {
    conditions.push(sql`${deals.askingPrice}::numeric >= ${minPrice}`);
  }
  if (maxPrice !== undefined) {
    conditions.push(sql`${deals.askingPrice}::numeric <= ${maxPrice}`);
  }
  if (excludeDealId) {
    conditions.push(sql`${deals.id} != ${excludeDealId}`);
  }

  // Only include deals with memory entries
  const memoryQuery = db
    .select({ dealId: dealMemory.dealId })
    .from(dealMemory);

  if (outcome) {
    conditions.push(
      inArray(
        deals.id,
        db
          .select({ dealId: dealMemory.dealId })
          .from(dealMemory)
          .where(eq(dealMemory.outcome, outcome))
      )
    );
  }

  // Query deals
  let query = db
    .select()
    .from(deals)
    .where(
      and(
        ...conditions,
        inArray(deals.id, memoryQuery)
      )
    )
    .limit(limit);

  const matchingDeals = await query;

  // Build memory entries
  const entries: DealMemoryEntry[] = await Promise.all(
    matchingDeals.map(async (deal) => {
      const memory = await getDealMemory(deal.id);
      const [financial] = await db
        .select()
        .from(financialPeriods)
        .where(eq(financialPeriods.dealId, deal.id))
        .orderBy(desc(financialPeriods.periodEnd))
        .limit(1);

      const [valuation] = await db
        .select()
        .from(valuations)
        .where(eq(valuations.dealId, deal.id))
        .limit(1);

      return {
        dealId: deal.id,
        dealName: deal.name,
        assetType: deal.assetType as 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
        state: deal.primaryState || undefined,
        beds: deal.beds || undefined,
        askingPrice: deal.askingPrice ? Number(deal.askingPrice) : undefined,
        outcome: (memory?.outcome as 'closed' | 'passed' | 'lost' | 'withdrawn') || undefined,
        keyMetrics: {
          noi: financial?.noi ? Number(financial.noi) : undefined,
          capRate: valuation?.capRateBase ? Number(valuation.capRateBase) : undefined,
          pricePerBed: deal.beds && deal.askingPrice
            ? Number(deal.askingPrice) / deal.beds
            : undefined,
          occupancyRate: financial?.occupancyRate
            ? Number(financial.occupancyRate)
            : undefined,
        },
        lessonsLearned: memory?.postMortem ? [memory.postMortem] : undefined,
      };
    })
  );

  return entries;
}

/**
 * Get deals with specific outcome for learning
 */
export async function getDealsWithOutcome(
  outcome: 'closed' | 'passed' | 'lost' | 'withdrawn',
  limit = 20
): Promise<DealMemoryEntry[]> {
  return findSimilarDeals({ outcome, limit });
}

// ============================================================================
// Embedding Management
// ============================================================================

/**
 * Store deal embedding
 */
export async function storeDealEmbedding(params: {
  dealId: string;
  embeddingType: 'deal_summary' | 'financials' | 'risk_profile';
  embedding: number[];
  textContent?: string;
  embeddingModel?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { dealId, embeddingType, embedding, textContent, embeddingModel, metadata } = params;

  // Check for existing embedding
  const [existing] = await db
    .select()
    .from(dealEmbeddings)
    .where(
      and(eq(dealEmbeddings.dealId, dealId), eq(dealEmbeddings.embeddingType, embeddingType))
    )
    .limit(1);

  if (existing) {
    // Update existing
    await db
      .update(dealEmbeddings)
      .set({
        embedding,
        textContent,
        embeddingModel,
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(dealEmbeddings.id, existing.id));
  } else {
    // Insert new
    await db.insert(dealEmbeddings).values({
      dealId,
      embeddingType,
      embedding,
      textContent,
      embeddingModel,
      metadata,
    });
  }
}

/**
 * Find similar deals by embedding
 */
export async function findSimilarDealsByEmbedding(params: {
  embedding: number[];
  embeddingType: string;
  excludeDealId?: string;
  limit?: number;
  threshold?: number;
}): Promise<SimilarDealReference[]> {
  const { embedding, embeddingType, excludeDealId, limit = 5, threshold = 0.5 } = params;

  // Get all embeddings of the same type
  let conditions = [eq(dealEmbeddings.embeddingType, embeddingType)];
  if (excludeDealId) {
    conditions.push(sql`${dealEmbeddings.dealId} != ${excludeDealId}`);
  }

  const allEmbeddings = await db
    .select()
    .from(dealEmbeddings)
    .where(and(...conditions));

  // Calculate cosine similarities
  const similarities = allEmbeddings
    .map((e) => {
      const storedEmbedding = e.embedding as number[];
      const similarity = cosineSimilarity(embedding, storedEmbedding);
      return {
        dealId: e.dealId,
        similarity,
      };
    })
    .filter((s) => s.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);

  // Get deal details
  const results: SimilarDealReference[] = await Promise.all(
    similarities.map(async ({ dealId, similarity }) => {
      const [deal] = await db
        .select()
        .from(deals)
        .where(eq(deals.id, dealId))
        .limit(1);

      const memory = await getDealMemory(dealId);

      return {
        dealId,
        dealName: deal?.name || 'Unknown',
        similarityScore: similarity,
        outcome: memory?.outcome ?? undefined,
        keyLearnings: memory?.postMortem ? [memory.postMortem] : undefined,
      };
    })
  );

  return results;
}

// ============================================================================
// Analytics
// ============================================================================

/**
 * Get deal outcome statistics
 */
export async function getDealOutcomeStats(): Promise<{
  total: number;
  closed: number;
  passed: number;
  lost: number;
  withdrawn: number;
  closeRate: number;
}> {
  const outcomes = await db
    .select({
      outcome: dealMemory.outcome,
      count: sql<number>`COUNT(DISTINCT ${dealMemory.dealId})`,
    })
    .from(dealMemory)
    .where(sql`${dealMemory.outcome} IS NOT NULL`)
    .groupBy(dealMemory.outcome);

  const stats = {
    total: 0,
    closed: 0,
    passed: 0,
    lost: 0,
    withdrawn: 0,
    closeRate: 0,
  };

  outcomes.forEach((o) => {
    const count = Number(o.count);
    stats.total += count;
    if (o.outcome === 'closed') stats.closed = count;
    if (o.outcome === 'passed') stats.passed = count;
    if (o.outcome === 'lost') stats.lost = count;
    if (o.outcome === 'withdrawn') stats.withdrawn = count;
  });

  stats.closeRate = stats.total > 0 ? stats.closed / stats.total : 0;

  return stats;
}

/**
 * Get average metrics by outcome
 */
export async function getMetricsByOutcome(): Promise<
  Record<string, { avgCapRate: number; avgPricePerBed: number; count: number }>
> {
  // This would require aggregation across multiple tables
  // Simplified version for now
  const dealsWithMemory = await db
    .select({
      dealId: dealMemory.dealId,
      outcome: dealMemory.outcome,
    })
    .from(dealMemory)
    .where(sql`${dealMemory.outcome} IS NOT NULL`);

  const results: Record<string, { avgCapRate: number; avgPricePerBed: number; count: number }> = {};

  // Group by outcome
  for (const dm of dealsWithMemory) {
    if (!dm.outcome) continue;

    if (!results[dm.outcome]) {
      results[dm.outcome] = { avgCapRate: 0, avgPricePerBed: 0, count: 0 };
    }
    results[dm.outcome].count++;

    // Skip if no dealId
    if (!dm.dealId) continue;

    // Get valuation for this deal
    const [val] = await db
      .select()
      .from(valuations)
      .where(eq(valuations.dealId, dm.dealId))
      .limit(1);

    if (val?.capRateBase) {
      const current = results[dm.outcome];
      current.avgCapRate =
        (current.avgCapRate * (current.count - 1) + Number(val.capRateBase)) / current.count;
    }

    // Get price per bed
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dm.dealId))
      .limit(1);

    if (deal?.askingPrice && deal?.beds) {
      const ppb = Number(deal.askingPrice) / deal.beds;
      const current = results[dm.outcome];
      current.avgPricePerBed =
        (current.avgPricePerBed * (current.count - 1) + ppb) / current.count;
    }
  }

  return results;
}

// ============================================================================
// Helper Functions
// ============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export default {
  saveDealToMemory,
  updateDealOutcome,
  getDealMemory,
  getDealMemoryHistory,
  findSimilarDeals,
  getDealsWithOutcome,
  storeDealEmbedding,
  findSimilarDealsByEmbedding,
  getDealOutcomeStats,
  getMetricsByOutcome,
};
