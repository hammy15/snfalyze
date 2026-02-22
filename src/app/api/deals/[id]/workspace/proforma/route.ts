import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dealWorkspaceStages, proformaScenarios } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateProForma } from '@/lib/workspace/proforma-generator';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Deep merge utility
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ── GET: Load pro forma state ───────────────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const [stage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    // Also load persisted scenarios
    const scenarios = await db
      .select()
      .from(proformaScenarios)
      .where(eq(proformaScenarios.dealId, dealId));

    return NextResponse.json({
      success: true,
      stageData: stage?.stageData || {},
      scenarios,
    });
  } catch (error) {
    console.error('ProForma GET error:', error);
    return NextResponse.json({ error: 'Failed to load pro forma' }, { status: 500 });
  }
}

// ── POST: Generate pro forma from deal data ─────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const result = await generateProForma({ dealId });

    // Store full result in stage data
    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: result as unknown as Record<string, unknown>,
        completionScore: 75,
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('ProForma POST error:', error);
    return NextResponse.json({ error: 'Failed to generate pro forma' }, { status: 500 });
  }
}

// ── PATCH: Update pro forma assumptions/overrides ───────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const body = await request.json();

    // Load current stage data
    const [currentStage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    if (!currentStage) {
      return NextResponse.json({ error: 'Pro forma not initialized' }, { status: 404 });
    }

    const currentData = (currentStage.stageData || {}) as Record<string, unknown>;
    const merged = deepMerge(currentData, body);

    // Update scenario if specific scenario update requested
    if (body.updateScenario) {
      const { scenarioType, assumptions } = body.updateScenario;
      await db
        .update(proformaScenarios)
        .set({
          assumptions,
          revenueGrowthRate: String(assumptions.revenueGrowthRate),
          expenseGrowthRate: String(assumptions.expenseGrowthRate),
          targetOccupancy: String(assumptions.occupancyTarget),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(proformaScenarios.dealId, dealId),
            eq(proformaScenarios.scenarioType, scenarioType)
          )
        );
    }

    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: merged,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    return NextResponse.json({ success: true, stageData: merged });
  } catch (error) {
    console.error('ProForma PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update pro forma' }, { status: 500 });
  }
}
