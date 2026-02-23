import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, dealWorkspaceStages } from '@/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Fetch all deals
    const allDeals = await db.select().from(deals).orderBy(desc(deals.updatedAt));

    // Fetch facilities + workspace stages for each deal
    const dealsWithData = await Promise.all(
      allDeals.map(async (deal) => {
        const [dealFacilities, workspaceStages] = await Promise.all([
          db
            .select({
              id: facilities.id,
              name: facilities.name,
              licensedBeds: facilities.licensedBeds,
              city: facilities.city,
              state: facilities.state,
              assetType: facilities.assetType,
              cmsRating: facilities.cmsRating,
              isSff: facilities.isSff,
            })
            .from(facilities)
            .where(eq(facilities.dealId, deal.id)),
          db
            .select({
              stage: dealWorkspaceStages.stage,
              status: dealWorkspaceStages.status,
              completionScore: dealWorkspaceStages.completionScore,
              stageData: dealWorkspaceStages.stageData,
            })
            .from(dealWorkspaceStages)
            .where(eq(dealWorkspaceStages.dealId, deal.id)),
        ]);

        // Extract risk score from risk_score stage data
        const riskStage = workspaceStages.find(s => s.stage === 'risk_score');
        const riskData = riskStage?.stageData as Record<string, unknown> | null;
        const riskScore = riskData?.compositeScore as number | null ?? null;
        const riskRating = riskData?.rating as string | null ?? null;

        // Calculate workspace completion
        const completedStages = workspaceStages.filter(s => s.status === 'completed').length;
        const totalStages = workspaceStages.length;
        const workspaceCompletion = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

        return {
          ...deal,
          facilities: dealFacilities,
          workspace: totalStages > 0 ? {
            currentStage: deal.workspaceCurrentStage,
            stages: workspaceStages.map(s => ({
              stage: s.stage,
              status: s.status,
              completionScore: s.completionScore,
            })),
            completedStages,
            totalStages,
            completionPercent: workspaceCompletion,
            riskScore,
            riskRating,
          } : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: dealsWithData,
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      assetType,
      assetTypes, // Support both singular and array format
      askingPrice,
      beds,
      primaryState,
      brokerName,
      brokerFirm,
      sellerName,
      status,
    } = body;

    // Handle asset type - accept either singular or array
    const resolvedAssetType = assetType || (Array.isArray(assetTypes) ? assetTypes[0] : assetTypes);

    // Validate required fields
    if (!name || !resolvedAssetType) {
      return NextResponse.json(
        { success: false, error: 'Name and asset type are required' },
        { status: 400 }
      );
    }

    // Create deal
    const [newDeal] = await db
      .insert(deals)
      .values({
        name,
        assetType: resolvedAssetType,
        askingPrice,
        beds,
        primaryState,
        brokerName,
        brokerFirm,
        sellerName,
        status: status || 'new',
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newDeal,
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
