/**
 * Deal Comparison API
 *
 * Returns enriched workspace data for 2-4 deals side-by-side.
 * Pulls from workspace stages, facilities, risk, pro forma.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, dealWorkspaceStages, proformaScenarios } from '@/db';
import { eq, inArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealIds = searchParams.get('ids')?.split(',').filter(Boolean) || [];

    if (dealIds.length < 2 || dealIds.length > 4) {
      return NextResponse.json(
        { error: 'Provide 2-4 deal IDs' },
        { status: 400 }
      );
    }

    // Fetch all deals in parallel
    const dealData = await Promise.all(
      dealIds.map(async (id) => {
        const [deal] = await db.select().from(deals).where(eq(deals.id, id));
        if (!deal) return null;

        const [dealFacilities, workspaceStages, scenarios] = await Promise.all([
          db.select().from(facilities).where(eq(facilities.dealId, id)),
          db.select().from(dealWorkspaceStages).where(eq(dealWorkspaceStages.dealId, id)),
          db.select().from(proformaScenarios).where(eq(proformaScenarios.dealId, id)),
        ]);

        // Extract stage data
        const intakeStage = workspaceStages.find(s => s.stage === 'deal_intake');
        const riskStage = workspaceStages.find(s => s.stage === 'risk_score');
        const proformaStage = workspaceStages.find(s => s.stage === 'pro_forma');
        const compStage = workspaceStages.find(s => s.stage === 'comp_pull');

        const intakeData = (intakeStage?.stageData || {}) as Record<string, Record<string, unknown>>;
        const riskData = (riskStage?.stageData || {}) as Record<string, unknown>;
        const proformaData = (proformaStage?.stageData || {}) as Record<string, unknown>;

        // Build comparison metrics
        const totalBeds = dealFacilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
        const avgCmsRating = dealFacilities.length > 0
          ? dealFacilities.reduce((sum, f) => sum + (f.cmsRating || 0), 0) / dealFacilities.filter(f => f.cmsRating).length
          : null;

        const fi = intakeData.facilityIdentification || {};
        const fs = intakeData.financialSnapshot || {};
        const os = intakeData.operationalSnapshot || {};

        // Workspace completion
        const completedStages = workspaceStages.filter(s => s.status === 'completed').length;
        const totalStages = workspaceStages.length;

        // Base scenario from pro forma
        const baseScenario = scenarios.find(s => s.scenarioType === 'baseline') || scenarios[0];
        const scenarioData = (baseScenario?.data || {}) as Record<string, unknown>;

        return {
          id: deal.id,
          name: deal.name,
          assetType: deal.assetType,
          status: deal.status,
          primaryState: deal.primaryState,
          askingPrice: deal.askingPrice,

          // Facility metrics
          facilityCount: dealFacilities.length,
          totalBeds,
          avgCmsRating: avgCmsRating ? Math.round(avgCmsRating * 10) / 10 : null,
          hasSffFacility: dealFacilities.some(f => f.isSff),

          // Financial (from intake or deal)
          ttmRevenue: (fs.ttmRevenue as number) || null,
          ttmEbitda: (fs.ttmEbitda as number) || null,
          normalizedEbitda: (fs.normalizedEbitda as number) || null,
          pricePerBed: totalBeds > 0 && deal.askingPrice
            ? Math.round(Number(deal.askingPrice) / totalBeds)
            : null,
          ebitdaMultiple: fs.ttmEbitda && deal.askingPrice
            ? Math.round((Number(deal.askingPrice) / (fs.ttmEbitda as number)) * 10) / 10
            : null,

          // Payer mix
          medicarePct: (fs.medicareCensusPercent as number) || null,
          medicaidPct: (fs.medicaidCensusPercent as number) || null,
          privatePayPct: (fs.privatePayCensusPercent as number) || null,

          // Operational
          cmsOverallRating: (os.cmsOverallRating as number) || avgCmsRating,
          staffingFte: (os.totalStaffingFte as number) || null,
          agencyPct: (os.agencyStaffPercent as number) || null,
          cmi: (os.cmi as number) || null,

          // Risk
          riskScore: (riskData.compositeScore as number) || null,
          riskRating: (riskData.rating as string) || null,
          riskCategories: (riskData.categories as Record<string, unknown>[]) || [],

          // Pro forma (from jsonb data field)
          proformaYear1Revenue: scenarioData.projectedRevenue
            ? Number(scenarioData.projectedRevenue)
            : null,
          proformaYear1Ebitda: scenarioData.projectedEbitda
            ? Number(scenarioData.projectedEbitda)
            : null,

          // Workspace progress
          workspaceCompletion: totalStages > 0
            ? Math.round((completedStages / totalStages) * 100)
            : 0,
          stagesCompleted: completedStages,
          totalStages,
          currentStage: deal.workspaceCurrentStage,
        };
      })
    );

    const validDeals = dealData.filter(Boolean);

    return NextResponse.json({
      success: true,
      data: validDeals,
    });
  } catch (error) {
    console.error('Comparison API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compare deals' },
      { status: 500 }
    );
  }
}
