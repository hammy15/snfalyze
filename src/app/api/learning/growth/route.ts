import { NextResponse } from 'next/server';
import { db } from '@/db';
import { cilActivityLog, ahaMoments, researchMissions, historicalDeals } from '@/db/schema';
import { sql, count } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoff = thirtyDaysAgo.toISOString();

    // Run all queries in parallel
    const [activityByDate, ahaByDate, researchByDate, totalDeals] = await Promise.all([
      // CIL activity log entries grouped by date (last 30 days)
      db.execute(sql`
        SELECT
          DATE(created_at) as date,
          COUNT(*)::int as count
        FROM cil_activity_log
        WHERE created_at >= ${cutoff}::timestamptz
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `),

      // Aha moments grouped by date (last 30 days)
      db.execute(sql`
        SELECT
          DATE(created_at) as date,
          COUNT(*)::int as count
        FROM aha_moments
        WHERE created_at >= ${cutoff}::timestamptz
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `),

      // Research missions completed grouped by date (last 30 days)
      db.execute(sql`
        SELECT
          DATE(completed_at) as date,
          COUNT(*)::int as count
        FROM research_missions
        WHERE status = 'complete'
          AND completed_at >= ${cutoff}::timestamptz
        GROUP BY DATE(completed_at)
        ORDER BY DATE(completed_at)
      `),

      // Total historical deals learned
      db.select({ count: count() }).from(historicalDeals),
    ]);

    // Build a date map for the last 30 days
    const dateMap = new Map<string, { activities: number; ahaMoments: number; research: number }>();

    // Initialize all 30 days
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      const key = d.toISOString().split('T')[0]!;
      dateMap.set(key, { activities: 0, ahaMoments: 0, research: 0 });
    }

    // Fill in activity counts
    for (const row of activityByDate.rows as Array<Record<string, unknown>>) {
      const dateStr = String(row.date);
      const existing = dateMap.get(dateStr);
      if (existing) {
        existing.activities = (row.count as number) || 0;
      }
    }

    // Fill in aha moment counts
    for (const row of ahaByDate.rows as Array<Record<string, unknown>>) {
      const dateStr = String(row.date);
      const existing = dateMap.get(dateStr);
      if (existing) {
        existing.ahaMoments = (row.count as number) || 0;
      }
    }

    // Fill in research mission counts
    for (const row of researchByDate.rows as Array<Record<string, unknown>>) {
      const dateStr = String(row.date);
      const existing = dateMap.get(dateStr);
      if (existing) {
        existing.research = (row.count as number) || 0;
      }
    }

    // Build timeline array
    const timeline = Array.from(dateMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Count knowledge .md files
    let knowledgeFileCount = 0;
    try {
      const knowledgeDir = path.join(process.cwd(), 'knowledge');
      const entries = fs.readdirSync(knowledgeDir, { recursive: true }) as string[];
      knowledgeFileCount = entries.filter((e: string) => e.endsWith('.md')).length;
    } catch {
      // knowledge directory may not exist
    }

    // Compute totals
    const totalAha = timeline.reduce((sum, t) => sum + t.ahaMoments, 0);
    const totalResearch = timeline.reduce((sum, t) => sum + t.research, 0);
    const dealsLearned = totalDeals[0]?.count ?? 0;

    return NextResponse.json({
      timeline,
      totals: {
        knowledgeFiles: knowledgeFileCount,
        dealsLearned,
        ahaMoments: totalAha,
        researchMissions: totalResearch,
      },
    });
  } catch (error) {
    console.error('[API] Learning growth error:', error);
    return NextResponse.json({ error: 'Failed to get growth data' }, { status: 500 });
  }
}
