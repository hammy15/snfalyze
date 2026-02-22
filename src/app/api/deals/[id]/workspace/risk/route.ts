import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dealWorkspaceStages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateWorkspaceRisk } from '@/lib/workspace/workspace-risk-adapter';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ── GET: Load existing risk assessment ──────────────────────────────
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
          eq(dealWorkspaceStages.stage, 'risk_score')
        )
      );

    return NextResponse.json({
      success: true,
      stageData: stage?.stageData || {},
    });
  } catch (error) {
    console.error('Risk GET error:', error);
    return NextResponse.json({ error: 'Failed to load risk assessment' }, { status: 500 });
  }
}

// ── POST: Run risk assessment ───────────────────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const result = await calculateWorkspaceRisk(dealId);

    // Store in workspace stage
    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: result as unknown as Record<string, unknown>,
        completionScore: 100,
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'risk_score')
        )
      );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Risk POST error:', error);
    return NextResponse.json({ error: 'Failed to calculate risk' }, { status: 500 });
  }
}
