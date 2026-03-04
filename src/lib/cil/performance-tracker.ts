// =============================================================================
// CIL PERFORMANCE TRACKER — State-by-state performance models
// =============================================================================

import { db } from '@/db';
import {
  historicalDealFacilities,
  aggregatedPreferences,
  statePerformance,
} from '@/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { refreshStatePerformance, getStatePerformanceData } from './state-manager';
import type { StatePerformanceModel, KnowledgeGrowthPoint } from './types';

// ── US States for map rendering ────────────────────────────────────

export const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
] as const;

// ── Performance data ───────────────────────────────────────────────

export async function getPerformanceMap(): Promise<Record<string, StatePerformanceModel>> {
  const data = await getStatePerformanceData();
  const map: Record<string, StatePerformanceModel> = {};

  for (const row of data) {
    // Use state as key (combine asset types into highest-count entry)
    const existing = map[row.state];
    if (!existing || row.dealCount > existing.dealCount) {
      map[row.state] = row;
    }
  }

  // Fill in missing states with no_data
  for (const state of US_STATES) {
    if (!map[state]) {
      map[state] = {
        state,
        assetType: null,
        dealCount: 0,
        avgConfidence: 0,
        avgCapRate: 0,
        avgPricePerBed: 0,
        performanceTier: 'no_data',
        topPatterns: [],
      };
    }
  }

  return map;
}

export async function getStateDetail(state: string): Promise<{
  performance: StatePerformanceModel[];
  preferences: Array<{ key: string; value: number; confidence: number; sampleCount: number }>;
  dealCount: number;
}> {
  const [perfRows, prefRows, countResult] = await Promise.all([
    db
      .select()
      .from(statePerformance)
      .where(eq(statePerformance.state, state.toUpperCase())),
    db
      .select()
      .from(aggregatedPreferences)
      .where(eq(aggregatedPreferences.state, state.toUpperCase()))
      .orderBy(desc(aggregatedPreferences.confidence)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(historicalDealFacilities)
      .where(eq(historicalDealFacilities.state, state.toUpperCase())),
  ]);

  return {
    performance: perfRows.map((r) => ({
      state: r.state,
      assetType: r.assetType,
      dealCount: r.dealCount ?? 0,
      avgConfidence: r.avgConfidence ? parseFloat(r.avgConfidence) : 0,
      avgCapRate: r.avgCapRate ? parseFloat(r.avgCapRate) : 0,
      avgPricePerBed: r.avgPricePerBed ? parseFloat(r.avgPricePerBed) : 0,
      performanceTier: r.performanceTier ?? 'no_data',
      topPatterns: (r.topPatterns as string[]) ?? [],
    })),
    preferences: prefRows.map((p) => ({
      key: p.preferenceKey,
      value: p.medianValue ? parseFloat(p.medianValue) : 0,
      confidence: p.confidence ? parseFloat(p.confidence) : 0,
      sampleCount: p.sampleCount ?? 0,
    })),
    dealCount: countResult[0]?.count ?? 0,
  };
}

// ── Knowledge Growth Time-Series ───────────────────────────────────

export async function getKnowledgeGrowth(): Promise<KnowledgeGrowthPoint[]> {
  // Build growth series from historical deals completion dates
  const completedDeals = await db.execute(sql`
    SELECT
      DATE(completed_at) as date,
      COUNT(*)::int as deals_completed
    FROM historical_deals
    WHERE completed_at IS NOT NULL
    GROUP BY DATE(completed_at)
    ORDER BY DATE(completed_at)
  `);

  let cumulativeDeals = 0;
  const points: KnowledgeGrowthPoint[] = [];

  for (const row of completedDeals.rows as Array<Record<string, unknown>>) {
    cumulativeDeals += row.deals_completed as number;

    // Confidence grows with sample size: min(95, 20 + n * 10)
    const avgConfidence = Math.min(95, 20 + cumulativeDeals * 10);

    points.push({
      date: String(row.date),
      knowledgeFiles: 0, // Will be enriched client-side or via file count
      dealsLearned: cumulativeDeals,
      avgConfidence,
      preferenceCount: cumulativeDeals * 8, // ~8 preferences per deal
    });
  }

  // If no data, return a single point with current state
  if (points.length === 0) {
    const fs = await import('fs');
    const path = await import('path');
    let fileCount = 0;
    try {
      const knowledgeDir = path.join(process.cwd(), 'knowledge');
      const entries = fs.readdirSync(knowledgeDir, { recursive: true }) as string[];
      fileCount = entries.filter((e: string) => e.endsWith('.md')).length;
    } catch { /* empty */ }

    points.push({
      date: new Date().toISOString().split('T')[0]!,
      knowledgeFiles: fileCount,
      dealsLearned: 0,
      avgConfidence: 0,
      preferenceCount: 0,
    });
  }

  return points;
}

// ── Refresh (called after learning cycles) ─────────────────────────

export { refreshStatePerformance };
