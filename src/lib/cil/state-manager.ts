// =============================================================================
// CIL STATE MANAGER — Persistent CIL state tracking
// =============================================================================

import { db } from '@/db';
import {
  cilActivityLog,
  statePerformance,
  researchMissions,
  aggregatedPreferences,
  historicalDeals,
  deals,
} from '@/db/schema';
import { eq, sql, count, avg, desc } from 'drizzle-orm';
import type { CILState, CILActivity, StatePerformanceModel } from './types';

// ── In-memory state cache (refreshed every 60s) ────────────────────

let _cachedState: CILState | null = null;
let _stateTimestamp = 0;
const STATE_CACHE_TTL = 60_000; // 1 minute

export async function getCILState(): Promise<CILState> {
  if (_cachedState && Date.now() - _stateTimestamp < STATE_CACHE_TTL) {
    return _cachedState;
  }

  const [knowledgeCount, dealsAnalyzed, historicalCount, prefCount, missionCount] =
    await Promise.all([
      countKnowledgeFiles(),
      db.select({ count: count() }).from(deals),
      db.select({ count: count() }).from(historicalDeals),
      db.select({ count: count() }).from(aggregatedPreferences),
      db.select({ count: count() }).from(researchMissions),
    ]);

  const totalDeals = (dealsAnalyzed[0]?.count ?? 0) + (historicalCount[0]?.count ?? 0);

  // Compute overall confidence from aggregated preferences
  const confResult = await db
    .select({ avgConf: avg(aggregatedPreferences.confidence) })
    .from(aggregatedPreferences);
  const avgConfidence = confResult[0]?.avgConf ? parseFloat(confResult[0].avgConf) * 100 : 0;

  _cachedState = {
    knowledgeFileCount: knowledgeCount,
    dealsAnalyzed: dealsAnalyzed[0]?.count ?? 0,
    dealsLearned: historicalCount[0]?.count ?? 0,
    totalDeals,
    preferenceCount: prefCount[0]?.count ?? 0,
    researchMissions: missionCount[0]?.count ?? 0,
    avgConfidence: Math.round(avgConfidence),
    ipoProgress: {
      currentOps: 58,
      targetOps: 125,
      currentRevenue: 0,
      targetRevenue: 0,
    },
    lastUpdated: new Date().toISOString(),
  };
  _stateTimestamp = Date.now();

  return _cachedState;
}

export function invalidateStateCache(): void {
  _cachedState = null;
  _stateTimestamp = 0;
}

// ── Activity Log ───────────────────────────────────────────────────

export async function logActivity(
  activityType: CILActivity['activityType'],
  summary: string,
  opts?: {
    brainId?: string;
    senseId?: string;
    dealId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await db.insert(cilActivityLog).values({
      activityType,
      summary,
      brainId: opts?.brainId ?? null,
      senseId: opts?.senseId ?? null,
      dealId: opts?.dealId ?? null,
      metadata: opts?.metadata ?? null,
    });
    invalidateStateCache();
  } catch (err) {
    console.error('[CIL] Failed to log activity:', err);
  }
}

export async function getRecentActivity(limit = 20): Promise<CILActivity[]> {
  const rows = await db
    .select()
    .from(cilActivityLog)
    .orderBy(desc(cilActivityLog.createdAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    activityType: r.activityType,
    brainId: r.brainId as 'newo' | 'dev' | null,
    senseId: r.senseId,
    dealId: r.dealId,
    summary: r.summary,
    metadata: r.metadata as Record<string, unknown> | null,
    createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
  }));
}

// ── State Performance ──────────────────────────────────────────────

export async function getStatePerformanceData(): Promise<StatePerformanceModel[]> {
  const rows = await db.select().from(statePerformance).orderBy(desc(statePerformance.dealCount));

  return rows.map((r) => ({
    state: r.state,
    assetType: r.assetType,
    dealCount: r.dealCount ?? 0,
    avgConfidence: r.avgConfidence ? parseFloat(r.avgConfidence) : 0,
    avgCapRate: r.avgCapRate ? parseFloat(r.avgCapRate) : 0,
    avgPricePerBed: r.avgPricePerBed ? parseFloat(r.avgPricePerBed) : 0,
    performanceTier: r.performanceTier ?? 'no_data',
    topPatterns: (r.topPatterns as string[]) ?? [],
  }));
}

export async function refreshStatePerformance(): Promise<void> {
  // Aggregate from historical_deal_facilities
  const stateStats = await db.execute(sql`
    SELECT
      hdf.state,
      hdf.asset_type,
      COUNT(*)::int as deal_count,
      AVG(CASE WHEN hdf.user_cap_rate IS NOT NULL THEN hdf.user_cap_rate ELSE NULL END)::numeric(5,4) as avg_cap_rate,
      AVG(CASE WHEN hdf.user_price_per_bed IS NOT NULL THEN hdf.user_price_per_bed ELSE NULL END)::numeric(15,2) as avg_price_per_bed
    FROM historical_deal_facilities hdf
    WHERE hdf.state IS NOT NULL
    GROUP BY hdf.state, hdf.asset_type
  `);

  for (const row of stateStats.rows as Array<Record<string, unknown>>) {
    const state = row.state as string;
    const assetType = row.asset_type as string;
    const dealCount = row.deal_count as number;
    const avgCapRate = row.avg_cap_rate ? parseFloat(row.avg_cap_rate as string) : null;
    const avgPricePerBed = row.avg_price_per_bed ? parseFloat(row.avg_price_per_bed as string) : null;

    // Derive tier
    let tier: 'strong' | 'developing' | 'limited' | 'no_data' = 'no_data';
    if (dealCount >= 5) tier = 'strong';
    else if (dealCount >= 2) tier = 'developing';
    else if (dealCount >= 1) tier = 'limited';

    // Compute avg confidence from aggregated_preferences for this state
    const confResult = await db
      .select({ avgConf: avg(aggregatedPreferences.confidence) })
      .from(aggregatedPreferences)
      .where(eq(aggregatedPreferences.state, state));
    const avgConfidence = confResult[0]?.avgConf ? parseFloat(confResult[0].avgConf) * 100 : null;

    await db
      .insert(statePerformance)
      .values({
        state,
        assetType: assetType as 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
        dealCount,
        avgConfidence: avgConfidence?.toFixed(2) ?? null,
        avgCapRate: avgCapRate?.toFixed(4) ?? null,
        avgPricePerBed: avgPricePerBed?.toFixed(2) ?? null,
        performanceTier: tier,
      })
      .onConflictDoUpdate({
        target: [statePerformance.state, statePerformance.assetType],
        set: {
          dealCount,
          avgConfidence: avgConfidence?.toFixed(2) ?? null,
          avgCapRate: avgCapRate?.toFixed(4) ?? null,
          avgPricePerBed: avgPricePerBed?.toFixed(2) ?? null,
          performanceTier: tier,
          updatedAt: new Date(),
        },
      });
  }

  invalidateStateCache();
}

// ── Knowledge file counter ─────────────────────────────────────────

async function countKnowledgeFiles(): Promise<number> {
  try {
    const fs = await import('fs');
    const path = await import('path');
    const knowledgeDir = path.join(process.cwd(), 'knowledge');
    const entries = fs.readdirSync(knowledgeDir, { recursive: true }) as string[];
    return entries.filter((e: string) => e.endsWith('.md')).length;
  } catch {
    return 0;
  }
}
