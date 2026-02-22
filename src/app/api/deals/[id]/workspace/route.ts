import { NextResponse } from 'next/server';
import { db, deals, dealWorkspaceStages } from '@/db';
import { eq, and } from 'drizzle-orm';

const WORKSPACE_STAGES_CONFIG = [
  { stage: 'deal_intake' as const, order: 1 },
  { stage: 'comp_pull' as const, order: 2 },
  { stage: 'pro_forma' as const, order: 3 },
  { stage: 'risk_score' as const, order: 4 },
  { stage: 'investment_memo' as const, order: 5 },
];

// GET — Load workspace state for a deal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const stages = await db
      .select()
      .from(dealWorkspaceStages)
      .where(eq(dealWorkspaceStages.dealId, dealId))
      .orderBy(dealWorkspaceStages.order);

    if (stages.length === 0) {
      return NextResponse.json({ error: 'Workspace not initialized' }, { status: 404 });
    }

    // Get the deal's current workspace stage
    const [deal] = await db.select({ workspaceCurrentStage: deals.workspaceCurrentStage })
      .from(deals)
      .where(eq(deals.id, dealId));

    return NextResponse.json({
      stages: stages.map(s => ({
        id: s.id,
        dealId: s.dealId,
        stage: s.stage,
        order: s.order,
        status: s.status,
        stageData: s.stageData || {},
        completionScore: s.completionScore || 0,
        validationErrors: s.validationErrors || [],
        cilInsights: s.cilInsights,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
      currentStage: deal?.workspaceCurrentStage || 'deal_intake',
    });
  } catch (error) {
    console.error('GET workspace error:', error);
    return NextResponse.json({ error: 'Failed to load workspace' }, { status: 500 });
  }
}

// POST — Initialize workspace for a deal (create all 5 stages)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    // Check if workspace already exists
    const existing = await db
      .select()
      .from(dealWorkspaceStages)
      .where(eq(dealWorkspaceStages.dealId, dealId));

    if (existing.length > 0) {
      return NextResponse.json({ error: 'Workspace already initialized' }, { status: 409 });
    }

    // Create all 5 stages
    const newStages = [];
    for (const config of WORKSPACE_STAGES_CONFIG) {
      const [stage] = await db
        .insert(dealWorkspaceStages)
        .values({
          dealId,
          stage: config.stage,
          order: config.order,
          status: config.order === 1 ? 'in_progress' : 'pending',
          stageData: {},
          completionScore: 0,
          validationErrors: [],
          startedAt: config.order === 1 ? new Date() : null,
        })
        .returning();
      newStages.push(stage);
    }

    // Update deal's current workspace stage
    await db
      .update(deals)
      .set({ workspaceCurrentStage: 'deal_intake', updatedAt: new Date() })
      .where(eq(deals.id, dealId));

    return NextResponse.json({
      stages: newStages.map(s => ({
        id: s.id,
        dealId: s.dealId,
        stage: s.stage,
        order: s.order,
        status: s.status,
        stageData: s.stageData || {},
        completionScore: s.completionScore || 0,
        validationErrors: s.validationErrors || [],
        cilInsights: null,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      })),
      currentStage: 'deal_intake',
    });
  } catch (error) {
    console.error('POST workspace error:', error);
    return NextResponse.json({ error: 'Failed to initialize workspace' }, { status: 500 });
  }
}

// PATCH — Update stage data or navigate to a stage
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    // Navigate to a different stage
    if (body.currentStage) {
      await db
        .update(deals)
        .set({ workspaceCurrentStage: body.currentStage, updatedAt: new Date() })
        .where(eq(deals.id, dealId));

      // Mark the target stage as in_progress if it's pending
      await db
        .update(dealWorkspaceStages)
        .set({
          status: 'in_progress',
          startedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dealWorkspaceStages.dealId, dealId),
            eq(dealWorkspaceStages.stage, body.currentStage),
            eq(dealWorkspaceStages.status, 'pending')
          )
        );

      return NextResponse.json({ success: true });
    }

    // Update stage data
    if (body.stage && body.stageData) {
      // Deep merge with existing data
      const [existing] = await db
        .select()
        .from(dealWorkspaceStages)
        .where(
          and(
            eq(dealWorkspaceStages.dealId, dealId),
            eq(dealWorkspaceStages.stage, body.stage)
          )
        );

      if (!existing) {
        return NextResponse.json({ error: 'Stage not found' }, { status: 404 });
      }

      const existingData = (existing.stageData || {}) as Record<string, unknown>;
      const merged = deepMerge(existingData, body.stageData);

      // Calculate completion score
      const completionScore = calculateCompletionScore(body.stage, merged);

      await db
        .update(dealWorkspaceStages)
        .set({
          stageData: merged,
          completionScore,
          status: existing.status === 'pending' ? 'in_progress' : existing.status,
          startedAt: existing.startedAt || new Date(),
          updatedAt: new Date(),
        })
        .where(eq(dealWorkspaceStages.id, existing.id));

      return NextResponse.json({
        stageData: merged,
        completionScore,
      });
    }

    // Mark stage complete
    if (body.completeStage) {
      await db
        .update(dealWorkspaceStages)
        .set({
          status: 'completed',
          completionScore: 100,
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dealWorkspaceStages.dealId, dealId),
            eq(dealWorkspaceStages.stage, body.completeStage)
          )
        );

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'No valid action provided' }, { status: 400 });
  } catch (error) {
    console.error('PATCH workspace error:', error);
    return NextResponse.json({ error: 'Failed to update workspace' }, { status: 500 });
  }
}

// Deep merge utility
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      );
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// Calculate completion score based on filled fields
function calculateCompletionScore(stage: string, data: Record<string, unknown>): number {
  const sections = Object.keys(data);
  if (sections.length === 0) return 0;

  let filledFields = 0;
  let totalFields = 0;

  for (const section of sections) {
    const sectionData = data[section];
    if (typeof sectionData === 'object' && sectionData !== null) {
      const fields = Object.values(sectionData as Record<string, unknown>);
      totalFields += fields.length;
      filledFields += fields.filter(v =>
        v !== null && v !== undefined && v !== '' && v !== 0
      ).length;
    }
  }

  if (totalFields === 0) return 0;
  return Math.round((filledFields / totalFields) * 100);
}
