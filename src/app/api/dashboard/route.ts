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

    // Get ALL deals with facilities for the Kanban board
    const allDeals = await db
      .select({
        id: deals.id,
        name: deals.name,
        status: deals.status,
        assetType: deals.assetType,
        askingPrice: deals.askingPrice,
        beds: deals.beds,
        primaryState: deals.primaryState,
        confidenceScore: deals.confidenceScore,
        updatedAt: deals.updatedAt,
      })
      .from(deals)
      .orderBy(desc(deals.updatedAt));

    // Get facilities for each deal
    const dealsWithFacilities = await Promise.all(
      allDeals.map(async (deal) => {
        const dealFacilities = await db
          .select({
            id: facilities.id,
            name: facilities.name,
            licensedBeds: facilities.licensedBeds,
          })
          .from(facilities)
          .where(eq(facilities.dealId, deal.id));
        return { ...deal, facilities: dealFacilities };
      })
    );

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

    // Build pipeline overview by actual status
    const statusConfig: Record<string, { label: string; order: number }> = {
      'new': { label: 'New', order: 0 },
      'analyzing': { label: 'Analyzing', order: 1 },
      'reviewed': { label: 'Reviewed', order: 2 },
      'under_loi': { label: 'Under LOI', order: 3 },
      'due_diligence': { label: 'Due Diligence', order: 4 },
      'closed': { label: 'Closed', order: 5 },
      'passed': { label: 'Passed', order: 6 },
    };

    const pipelineOverview = Object.entries(statusConfig).map(([status, config]) => {
      const found = pipelineBreakdown.find(p => p.status === status);
      return {
        stage: status,
        label: config.label,
        order: config.order,
        count: found ? Number(found.count) : 0,
        value: found ? Math.round(Number(found.value) / 1000000) : 0,
      };
    }).sort((a, b) => a.order - b.order);

    // Get total beds from facilities
    const bedsResult = await db
      .select({
        totalBeds: sql<number>`COALESCE(SUM(${facilities.licensedBeds}), 0)`,
      })
      .from(facilities);
    const totalBeds = Number(bedsResult[0]?.totalBeds) || 0;

    // Build all deals list for Kanban
    const kanbanDeals = dealsWithFacilities.map(deal => ({
      id: deal.id,
      name: deal.name || 'Unnamed Deal',
      status: deal.status || 'new',
      assetType: deal.assetType,
      value: Number(deal.askingPrice) || 0,
      beds: deal.beds || deal.facilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0),
      primaryState: deal.primaryState,
      confidenceScore: deal.confidenceScore,
      facilitiesCount: deal.facilities.length,
      updatedAt: deal.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          facilitiesTracked: facilitiesCount,
          activeTargets: dealsCount,
          pipelineValue: pipelineValue,
          totalBeds: totalBeds,
          updatesToday: 0,
          riskAlerts: 0,
        },
        recentActivity: [],
        kanbanDeals,
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
