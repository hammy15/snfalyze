import { NextRequest, NextResponse } from 'next/server';
import { db, analysisStages, deals, extractionClarifications } from '@/db';
import { eq, and, asc } from 'drizzle-orm';
import { isValidUUID, invalidIdResponse } from '@/lib/validate-uuid';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Stage metadata for display
const STAGE_METADATA = {
  document_upload: {
    title: 'Document Upload',
    description: 'Upload financial statements, rent rolls, and census reports',
    requiredDocTypes: ['financial_statement', 'rent_roll', 'census_report'],
  },
  census_validation: {
    title: 'Census Validation',
    description: 'Validate census data and occupancy trends',
    requiredDocTypes: ['census_report'],
  },
  revenue_analysis: {
    title: 'Revenue Analysis',
    description: 'Analyze revenue by payer mix and identify trends',
    requiredDocTypes: ['financial_statement'],
  },
  expense_analysis: {
    title: 'Expense Analysis',
    description: 'Normalize expenses and identify cost savings opportunities',
    requiredDocTypes: ['financial_statement', 'cost_report'],
  },
  cms_integration: {
    title: 'CMS Integration',
    description: 'Integrate CMS quality data, star ratings, and survey history',
    requiredDocTypes: [],
  },
  valuation_coverage: {
    title: 'Valuation & Coverage',
    description: 'Calculate purchase price, rent, and coverage ratios',
    requiredDocTypes: [],
  },
};

// GET - Fetch all stages for a deal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    if (!isValidUUID(dealId)) return invalidIdResponse();

    // Verify deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Fetch all stages
    const stages = await db
      .select()
      .from(analysisStages)
      .where(eq(analysisStages.dealId, dealId))
      .orderBy(asc(analysisStages.order));

    // Get pending clarifications count per stage (approximate by mapping doc types)
    const clarifications = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.dealId, dealId),
          eq(extractionClarifications.status, 'pending')
        )
      );

    // Enrich stages with metadata and clarification counts
    const enrichedStages = stages.map((stage) => {
      const metadata =
        STAGE_METADATA[stage.stage as keyof typeof STAGE_METADATA] || {};
      const stageClairifications = clarifications.filter((c) => {
        // Map clarifications to stages based on field name patterns
        const fieldName = c.fieldName.toLowerCase();
        if (stage.stage === 'revenue_analysis') {
          return fieldName.includes('revenue') || fieldName.includes('income');
        }
        if (stage.stage === 'expense_analysis') {
          return (
            fieldName.includes('expense') ||
            fieldName.includes('cost') ||
            fieldName.includes('labor')
          );
        }
        if (stage.stage === 'census_validation') {
          return (
            fieldName.includes('census') ||
            fieldName.includes('occupancy') ||
            fieldName.includes('adc')
          );
        }
        return false;
      });

      return {
        id: stage.id,
        stage: stage.stage,
        status: stage.status,
        order: stage.order,
        startedAt: stage.startedAt,
        completedAt: stage.completedAt,
        pendingClarifications: stageClairifications.length,
        stageData: stage.stageData,
        ...metadata,
      };
    });

    // Calculate overall progress
    const completedCount = stages.filter((s) => s.status === 'completed').length;
    const totalCount = stages.length;
    const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    // Find current active stage
    const currentStage = stages.find(
      (s) => s.status === 'in_progress' || s.status === 'blocked'
    );

    return NextResponse.json({
      success: true,
      data: {
        dealId,
        stages: enrichedStages,
        progress,
        completedStages: completedCount,
        totalStages: totalCount,
        currentStage: currentStage
          ? {
              id: currentStage.id,
              stage: currentStage.stage,
              status: currentStage.status,
            }
          : null,
      },
    });
  } catch (error) {
    console.error('Error fetching stages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stages' },
      { status: 500 }
    );
  }
}

// PATCH - Update a specific stage
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();
    const { stageId, status, stageData } = body;

    if (!stageId) {
      return NextResponse.json(
        { success: false, error: 'Stage ID is required' },
        { status: 400 }
      );
    }

    // Verify stage belongs to deal
    const stage = await db.query.analysisStages.findFirst({
      where: and(eq(analysisStages.id, stageId), eq(analysisStages.dealId, dealId)),
    });

    if (!stage) {
      return NextResponse.json(
        { success: false, error: 'Stage not found for this deal' },
        { status: 404 }
      );
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (status === 'in_progress' && !stage.startedAt) {
        updateData.startedAt = new Date();
      }
      if (status === 'completed') {
        updateData.completedAt = new Date();
      }
    }

    if (stageData !== undefined) {
      updateData.stageData = stageData;
    }

    // Update the stage
    const [updated] = await db
      .update(analysisStages)
      .set(updateData)
      .where(eq(analysisStages.id, stageId))
      .returning();

    // If completed, advance to next stage
    if (status === 'completed') {
      const nextStage = await db.query.analysisStages.findFirst({
        where: and(
          eq(analysisStages.dealId, dealId),
          eq(analysisStages.order, stage.order + 1)
        ),
      });

      if (nextStage && nextStage.status === 'pending') {
        await db
          .update(analysisStages)
          .set({ status: 'in_progress', startedAt: new Date(), updatedAt: new Date() })
          .where(eq(analysisStages.id, nextStage.id));
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating stage:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update stage' },
      { status: 500 }
    );
  }
}
