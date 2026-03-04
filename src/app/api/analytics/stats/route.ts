import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pageViews } from '@/db/schema';
import { sql, gte, count, countDistinct } from 'drizzle-orm';

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

    // Run all queries in parallel
    const [totalViews, todayViews, weekViews, activeNow, uniqueVisitors, topPages, recentSessions] = await Promise.all([
      // Total all-time views
      db.select({ count: count() }).from(pageViews),
      // Today's views
      db.select({ count: count() }).from(pageViews).where(gte(pageViews.createdAt, today)),
      // Last 7 days views
      db.select({ count: count() }).from(pageViews).where(gte(pageViews.createdAt, weekAgo)),
      // Active in last 30 min (unique sessions)
      db.select({ count: countDistinct(pageViews.sessionId) }).from(pageViews).where(gte(pageViews.createdAt, thirtyMinAgo)),
      // Unique visitors all-time
      db.select({ count: countDistinct(pageViews.visitorId) }).from(pageViews),
      // Top pages last 7 days
      db.select({
        path: pageViews.path,
        views: count(),
        uniqueVisitors: countDistinct(pageViews.visitorId),
      })
        .from(pageViews)
        .where(gte(pageViews.createdAt, weekAgo))
        .groupBy(pageViews.path)
        .orderBy(sql`count(*) DESC`)
        .limit(10),
      // Recent unique sessions (last 24h) with details
      db.select({
        sessionId: pageViews.sessionId,
        visitorId: pageViews.visitorId,
        ip: pageViews.ip,
        country: pageViews.country,
        firstSeen: sql<string>`MIN(${pageViews.createdAt})`,
        lastSeen: sql<string>`MAX(${pageViews.createdAt})`,
        pageCount: count(),
        paths: sql<string>`string_agg(DISTINCT ${pageViews.path}, ', ' ORDER BY ${pageViews.path})`,
      })
        .from(pageViews)
        .where(gte(pageViews.createdAt, weekAgo))
        .groupBy(pageViews.sessionId, pageViews.visitorId, pageViews.ip, pageViews.country)
        .orderBy(sql`MAX(${pageViews.createdAt}) DESC`)
        .limit(20),
    ]);

    return NextResponse.json({
      totalViews: totalViews[0]?.count || 0,
      todayViews: todayViews[0]?.count || 0,
      weekViews: weekViews[0]?.count || 0,
      activeNow: activeNow[0]?.count || 0,
      uniqueVisitors: uniqueVisitors[0]?.count || 0,
      topPages,
      recentSessions,
    });
  } catch (error) {
    console.error('[Analytics] Stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
