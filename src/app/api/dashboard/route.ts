import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities } from '@/db';
import { count, sql, eq, desc, gte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Get count of deals
    const dealsResult = await db
      .select({ count: count() })
      .from(deals);
    const dealsCount = dealsResult[0]?.count || 0;

    // Get count of facilities
    const facilitiesResult = await db
      .select({ count: count() })
      .from(facilities);
    const facilitiesCount = facilitiesResult[0]?.count || 0;

    // Get recent deals for pipeline
    const recentDeals = await db
      .select({
        id: deals.id,
        name: deals.name,
        status: deals.status,
        askingPrice: deals.askingPrice,
        beds: deals.beds,
      })
      .from(deals)
      .orderBy(desc(deals.updatedAt))
      .limit(5);

    // Calculate pipeline value
    const pipelineValueResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${deals.askingPrice} AS DECIMAL)), 0)`,
      })
      .from(deals);
    const pipelineValue = Number(pipelineValueResult[0]?.total) || 0;

    // Get pipeline breakdown by status
    const pipelineBreakdown = await db
      .select({
        status: deals.status,
        count: count(),
        value: sql<number>`COALESCE(SUM(CAST(${deals.askingPrice} AS DECIMAL)), 0)`,
      })
      .from(deals)
      .groupBy(deals.status);

    // Map status to stage display names
    const statusMapping: Record<string, string> = {
      'new': 'Target',
      'analyzing': 'Target',
      'analysis_complete': 'Contacted',
      'reviewed': 'LOI',
      'in_progress': 'Diligence',
      'complete': 'Closed',
      'archived': 'Closed',
    };

    const pipelineOverview = [
      { stage: 'Target', count: 0, value: 0 },
      { stage: 'Contacted', count: 0, value: 0 },
      { stage: 'LOI', count: 0, value: 0 },
      { stage: 'Diligence', count: 0, value: 0 },
      { stage: 'PSA', count: 0, value: 0 },
      { stage: 'Closed', count: 0, value: 0 },
    ];

    for (const item of pipelineBreakdown) {
      const stageName = statusMapping[item.status || 'new'] || 'Target';
      const idx = pipelineOverview.findIndex(p => p.stage === stageName);
      if (idx !== -1) {
        pipelineOverview[idx].count += Number(item.count) || 0;
        pipelineOverview[idx].value += Math.round((Number(item.value) || 0) / 1000000);
      }
    }

    // Get total beds from facilities
    const bedsResult = await db
      .select({
        totalBeds: sql<number>`COALESCE(SUM(${facilities.licensedBeds}), 0)`,
      })
      .from(facilities);
    const totalBeds = Number(bedsResult[0]?.totalBeds) || 0;

    // Map status to stage for UI
    const statusToStage: Record<string, 'target' | 'contacted' | 'loi' | 'diligence' | 'psa' | 'closed'> = {
      'new': 'target',
      'analyzing': 'target',
      'analysis_complete': 'contacted',
      'reviewed': 'loi',
      'in_progress': 'diligence',
      'complete': 'closed',
      'archived': 'closed',
    };

    // Build pipeline deals list
    const pipelineDeals = recentDeals.map(deal => ({
      id: deal.id,
      name: deal.name || 'Unnamed Deal',
      stage: statusToStage[deal.status || 'new'] || 'target',
      value: Number(deal.askingPrice) || 0,
      beds: deal.beds || 0,
      assignee: 'You',
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          facilitiesTracked: facilitiesCount,
          activeTargets: dealsCount,
          pipelineValue: pipelineValue,
          updatesToday: 0,
          riskAlerts: 0,
        },
        recentActivity: [],
        pipelineDeals,
        riskAlerts: [],
        pipelineOverview,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load dashboard data',
    }, { status: 500 });
  }
}
