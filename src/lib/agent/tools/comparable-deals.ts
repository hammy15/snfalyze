/**
 * Comparable Deals Tool
 *
 * Allows the AI agent to find similar historical deals from memory.
 */

import { db } from '@/db';
import {
  deals,
  facilities,
  financialPeriods,
  valuations,
  dealMemory,
  dealEmbeddings,
} from '@/db/schema';
import { eq, and, or, sql, desc, gte, lte, inArray } from 'drizzle-orm';
import type { AgentTool, ToolOutput, ToolExecutionContext, SimilarDealReference } from '../types';

export const findComparableDealsTool: AgentTool = {
  name: 'find_comparable_deals',
  description: `Search deal memory to find similar historical deals. This helps identify patterns, outcomes, and learnings from past deals with similar characteristics.

Use this tool when:
- Starting analysis on a new deal to find relevant precedents
- User asks about similar deals or comparisons
- Looking for outcome data to inform current deal analysis
- Identifying patterns in successful vs. unsuccessful deals

Similarity can be based on:
- Asset type (SNF, ALF, ILF)
- Geography (state, region)
- Deal size (beds, price)
- Financial metrics (NOI, cap rate)
- Quality ratings
- Thesis type (turnaround, stabilized, etc.)`,

  inputSchema: {
    type: 'object',
    properties: {
      assetType: {
        type: 'string',
        description: 'Filter by asset type',
        enum: ['SNF', 'ALF', 'ILF'],
      },
      state: {
        type: 'string',
        description: 'Filter by state (2-letter code)',
      },
      minBeds: {
        type: 'number',
        description: 'Minimum number of beds',
      },
      maxBeds: {
        type: 'number',
        description: 'Maximum number of beds',
      },
      minPrice: {
        type: 'number',
        description: 'Minimum asking/sale price',
      },
      maxPrice: {
        type: 'number',
        description: 'Maximum asking/sale price',
      },
      outcome: {
        type: 'string',
        description: 'Filter by deal outcome',
        enum: ['closed', 'passed', 'lost', 'withdrawn'],
      },
      thesis: {
        type: 'string',
        description: 'Filter by deal thesis/hypothesis',
      },
      minSimilarity: {
        type: 'number',
        description: 'Minimum similarity score (0-1)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of deals to return (default: 5)',
      },
      includeDetails: {
        type: 'boolean',
        description: 'Whether to include detailed financial and outcome data',
      },
    },
    required: [],
  },

  requiresConfirmation: false,

  async execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolOutput> {
    const startTime = Date.now();

    const {
      assetType,
      state,
      minBeds,
      maxBeds,
      minPrice,
      maxPrice,
      outcome,
      thesis,
      minSimilarity = 0.3,
      limit = 5,
      includeDetails = true,
    } = input as {
      assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
      state?: string;
      minBeds?: number;
      maxBeds?: number;
      minPrice?: number;
      maxPrice?: number;
      outcome?: string;
      thesis?: string;
      minSimilarity?: number;
      limit?: number;
      includeDetails?: boolean;
    };

    try {
      // Build query conditions
      const conditions = [];

      if (assetType) {
        conditions.push(eq(deals.assetType, assetType));
      }
      if (state) {
        conditions.push(eq(deals.primaryState, state.toUpperCase()));
      }
      if (minBeds !== undefined) {
        conditions.push(gte(deals.beds, minBeds));
      }
      if (maxBeds !== undefined) {
        conditions.push(lte(deals.beds, maxBeds));
      }
      if (minPrice !== undefined) {
        conditions.push(gte(deals.askingPrice, String(minPrice)));
      }
      if (maxPrice !== undefined) {
        conditions.push(lte(deals.askingPrice, String(maxPrice)));
      }
      if (thesis) {
        conditions.push(sql`${deals.thesis} ILIKE ${`%${thesis}%`}`);
      }

      // Only include completed/closed deals for comparison
      conditions.push(
        inArray(deals.status, ['closed', 'passed', 'reviewed'])
      );

      // Exclude current deal if in context
      if (context.dealId) {
        conditions.push(sql`${deals.id} != ${context.dealId}`);
      }

      // Query deals
      let query = db
        .select({
          id: deals.id,
          name: deals.name,
          assetType: deals.assetType,
          askingPrice: deals.askingPrice,
          beds: deals.beds,
          primaryState: deals.primaryState,
          thesis: deals.thesis,
          status: deals.status,
          confidenceScore: deals.confidenceScore,
          createdAt: deals.createdAt,
        })
        .from(deals);

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as typeof query;
      }

      query = query.orderBy(desc(deals.createdAt)).limit(limit * 2) as typeof query; // Get more to filter by similarity

      const similarDeals = await query;

      // Calculate similarity scores
      const currentDealContext = context.agentContext;
      const scoredDeals = await Promise.all(
        similarDeals.map(async (deal) => {
          const similarity = calculateSimilarity(deal, currentDealContext as unknown as Record<string, unknown>, context.dealId);

          let details: Record<string, unknown> = {};

          if (includeDetails && similarity >= minSimilarity) {
            // Get memory/outcome data
            const [memory] = await db
              .select()
              .from(dealMemory)
              .where(eq(dealMemory.dealId, deal.id))
              .orderBy(desc(dealMemory.version))
              .limit(1);

            // Get latest valuation
            const [valuation] = await db
              .select()
              .from(valuations)
              .where(eq(valuations.dealId, deal.id))
              .limit(1);

            // Get latest financials
            const [financial] = await db
              .select()
              .from(financialPeriods)
              .where(eq(financialPeriods.dealId, deal.id))
              .orderBy(desc(financialPeriods.periodEnd))
              .limit(1);

            details = {
              outcome: memory?.outcome,
              outcomeNotes: memory?.outcomeNotes,
              postMortem: memory?.postMortem,
              valuation: valuation
                ? {
                    method: valuation.method,
                    valueBase: valuation.valueBase,
                    capRate: valuation.capRateBase,
                    suggestedOffer: valuation.suggestedOffer,
                  }
                : null,
              financials: financial
                ? {
                    noi: financial.noi,
                    occupancy: financial.occupancyRate,
                    revenue: financial.totalRevenue,
                  }
                : null,
            };
          }

          return {
            dealId: deal.id,
            dealName: deal.name,
            assetType: deal.assetType,
            state: deal.primaryState,
            beds: deal.beds,
            askingPrice: deal.askingPrice,
            thesis: deal.thesis,
            status: deal.status,
            similarityScore: similarity,
            ...details,
          };
        })
      );

      // Filter by similarity and sort
      const filteredDeals = scoredDeals
        .filter((d) => d.similarityScore >= minSimilarity)
        .sort((a, b) => b.similarityScore - a.similarityScore)
        .slice(0, limit);

      // Filter by outcome if specified
      const finalDeals = outcome
        ? filteredDeals.filter((d) => (d as Record<string, unknown>).outcome === outcome)
        : filteredDeals;

      const executionTimeMs = Date.now() - startTime;

      // Generate learnings summary
      const learningsSummary = generateLearningsSummary(finalDeals);

      return {
        success: true,
        data: {
          found: finalDeals.length,
          deals: finalDeals,
          learnings: learningsSummary,
          searchCriteria: {
            assetType,
            state,
            bedRange: minBeds || maxBeds ? { min: minBeds, max: maxBeds } : null,
            priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
            outcome,
            thesis,
          },
        },
        metadata: {
          executionTimeMs,
          affectedRecords: finalDeals.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find comparable deals',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  },
};

/**
 * Calculate similarity score between deals
 */
function calculateSimilarity(
  deal: {
    assetType: string;
    primaryState: string | null;
    beds: number | null;
    askingPrice: string | null;
    thesis: string | null;
  },
  context: Record<string, unknown>,
  excludeId?: string
): number {
  let score = 0;
  let weights = 0;

  // Asset type match (weight: 0.3)
  if (context.assetType && deal.assetType === context.assetType) {
    score += 0.3;
  }
  weights += 0.3;

  // State match (weight: 0.2)
  if (context.dealSummary && deal.primaryState) {
    const contextState = String(context.dealSummary).match(/\b([A-Z]{2})\b/);
    if (contextState && contextState[1] === deal.primaryState) {
      score += 0.2;
    }
  }
  weights += 0.2;

  // Bed count similarity (weight: 0.25)
  if (deal.beds && context.extractedData) {
    const contextBeds = (context.extractedData as Record<string, unknown>).beds as number;
    if (contextBeds) {
      const bedRatio = Math.min(deal.beds, contextBeds) / Math.max(deal.beds, contextBeds);
      score += 0.25 * bedRatio;
    }
  }
  weights += 0.25;

  // Price similarity (weight: 0.15)
  if (deal.askingPrice && context.currentValuation) {
    const contextValue = (context.currentValuation as Record<string, unknown>).valueBase as number;
    if (contextValue) {
      const dealPrice = Number(deal.askingPrice);
      const priceRatio = Math.min(dealPrice, contextValue) / Math.max(dealPrice, contextValue);
      score += 0.15 * priceRatio;
    }
  }
  weights += 0.15;

  // Thesis similarity (weight: 0.1)
  // Simple keyword matching - could be enhanced with embeddings
  weights += 0.1;

  return weights > 0 ? score / weights : 0;
}

/**
 * Generate learnings summary from comparable deals
 */
function generateLearningsSummary(deals: Array<Record<string, unknown>>): Record<string, unknown> {
  if (deals.length === 0) {
    return { message: 'No comparable deals found for learning extraction' };
  }

  const outcomes = deals.reduce<Record<string, number>>((acc, d) => {
    const outcome = d.outcome as string;
    if (outcome) {
      acc[outcome] = (acc[outcome] || 0) + 1;
    }
    return acc;
  }, {});

  const avgSimilarity = deals.reduce((sum, d) => sum + (d.similarityScore as number), 0) / deals.length;

  const valuations = deals
    .filter((d) => d.valuation)
    .map((d) => {
      const val = d.valuation as Record<string, unknown>;
      return {
        capRate: val.capRate ? Number(val.capRate) : null,
        value: val.valueBase ? Number(val.valueBase) : null,
      };
    });

  const avgCapRate = valuations.filter((v) => v.capRate).length > 0
    ? valuations.filter((v) => v.capRate).reduce((sum, v) => sum + (v.capRate || 0), 0) /
      valuations.filter((v) => v.capRate).length
    : null;

  return {
    dealCount: deals.length,
    averageSimilarity: avgSimilarity,
    outcomeDistribution: outcomes,
    valuationInsights: {
      averageCapRate: avgCapRate,
      dealsWithValuation: valuations.length,
    },
    keyTakeaways: generateTakeaways(deals, outcomes),
  };
}

/**
 * Generate key takeaways from deal analysis
 */
function generateTakeaways(
  deals: Array<Record<string, unknown>>,
  outcomes: Record<string, number>
): string[] {
  const takeaways: string[] = [];

  if (outcomes.closed && outcomes.closed > 0) {
    takeaways.push(`${outcomes.closed} similar deal(s) closed successfully`);
  }

  if (outcomes.passed && outcomes.passed > 0) {
    takeaways.push(`${outcomes.passed} similar deal(s) were passed on`);
  }

  const highSimilarity = deals.filter((d) => (d.similarityScore as number) > 0.7);
  if (highSimilarity.length > 0) {
    takeaways.push(`${highSimilarity.length} highly similar deal(s) found (>70% match)`);
  }

  // Look for patterns in post-mortems
  const postMortems = deals.filter((d) => d.postMortem).map((d) => d.postMortem as string);
  if (postMortems.length > 0) {
    takeaways.push(`${postMortems.length} deal(s) have post-mortem notes available`);
  }

  return takeaways;
}

/**
 * Find deals by embedding similarity (for semantic search)
 */
export async function findSimilarByEmbedding(
  dealId: string,
  embeddingType: string,
  limit = 5
): Promise<SimilarDealReference[]> {
  // Get the current deal's embedding
  const [currentEmbedding] = await db
    .select()
    .from(dealEmbeddings)
    .where(
      and(eq(dealEmbeddings.dealId, dealId), eq(dealEmbeddings.embeddingType, embeddingType))
    )
    .limit(1);

  if (!currentEmbedding) {
    return [];
  }

  const currentVector = currentEmbedding.embedding as number[];

  // Get all embeddings of the same type
  const allEmbeddings = await db
    .select()
    .from(dealEmbeddings)
    .where(
      and(
        eq(dealEmbeddings.embeddingType, embeddingType),
        sql`${dealEmbeddings.dealId} != ${dealId}`
      )
    );

  // Calculate cosine similarity
  const similarities = allEmbeddings.map((e) => {
    const vector = e.embedding as number[];
    const similarity = cosineSimilarity(currentVector, vector);
    return { dealId: e.dealId, similarity };
  });

  // Sort by similarity and get top results
  const topSimilar = similarities.sort((a, b) => b.similarity - a.similarity).slice(0, limit);

  // Get deal details
  const dealDetails = await Promise.all(
    topSimilar.map(async ({ dealId: similarDealId, similarity }) => {
      const [deal] = await db
        .select()
        .from(deals)
        .where(eq(deals.id, similarDealId))
        .limit(1);

      const [memory] = await db
        .select()
        .from(dealMemory)
        .where(eq(dealMemory.dealId, similarDealId))
        .orderBy(desc(dealMemory.version))
        .limit(1);

      return {
        dealId: similarDealId,
        dealName: deal?.name || 'Unknown',
        similarityScore: similarity,
        outcome: memory?.outcome ?? undefined,
        keyLearnings: memory?.postMortem ? [memory.postMortem] : undefined,
      };
    })
  );

  return dealDetails;
}

/**
 * Calculate cosine similarity between two vectors
 */
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

export default findComparableDealsTool;
