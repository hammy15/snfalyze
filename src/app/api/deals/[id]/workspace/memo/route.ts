import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dealWorkspaceStages, investmentMemos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateInvestmentMemo, regenerateMemoSection } from '@/lib/workspace/memo-generator';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ── GET: Load existing memo ─────────────────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const [memo] = await db
      .select()
      .from(investmentMemos)
      .where(eq(investmentMemos.dealId, dealId))
      .limit(1);

    const [stage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'investment_memo')
        )
      );

    return NextResponse.json({
      success: true,
      memo,
      stageData: stage?.stageData || {},
    });
  } catch (error) {
    console.error('Memo GET error:', error);
    return NextResponse.json({ error: 'Failed to load memo' }, { status: 500 });
  }
}

// ── POST: Generate investment memo ──────────────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const result = await generateInvestmentMemo(dealId);

    // Store sections in workspace stage
    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: {
          sections: result.sections,
          memoId: result.memoId,
          status: 'draft',
        },
        completionScore: 90,
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'investment_memo')
        )
      );

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Memo POST error:', error);
    return NextResponse.json({ error: 'Failed to generate memo' }, { status: 500 });
  }
}

// ── PATCH: Update section or regenerate ─────────────────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const body = await request.json();

    // Regenerate a specific section
    if (body.regenerateSection) {
      const section = await regenerateMemoSection(dealId, body.regenerateSection);
      return NextResponse.json({ success: true, section });
    }

    // Manual section update
    if (body.sectionId && body.content !== undefined) {
      const [currentStage] = await db
        .select()
        .from(dealWorkspaceStages)
        .where(
          and(
            eq(dealWorkspaceStages.dealId, dealId),
            eq(dealWorkspaceStages.stage, 'investment_memo')
          )
        );

      if (!currentStage) {
        return NextResponse.json({ error: 'Memo stage not found' }, { status: 404 });
      }

      const stageData = (currentStage.stageData || {}) as Record<string, unknown>;
      const sections = (stageData.sections || []) as Array<{ id: string; title: string; content: string; isEdited: boolean }>;

      const updatedSections = sections.map(s =>
        s.id === body.sectionId ? { ...s, content: body.content, isEdited: true } : s
      );

      await db
        .update(dealWorkspaceStages)
        .set({
          stageData: { ...stageData, sections: updatedSections },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(dealWorkspaceStages.dealId, dealId),
            eq(dealWorkspaceStages.stage, 'investment_memo')
          )
        );

      // Also update the investmentMemos record
      const columnMap: Record<string, string> = {
        executive_summary: 'executiveSummary',
        facility_overview: 'facilityOverview',
        market_analysis: 'marketAnalysis',
        financial_analysis: 'financialAnalysis',
        risk_assessment: 'riskAssessment',
        investment_thesis: 'investmentThesis',
        recommendation: 'recommendation',
      };

      if (columnMap[body.sectionId]) {
        await db
          .update(investmentMemos)
          .set({
            [columnMap[body.sectionId]]: body.content,
            updatedAt: new Date(),
          })
          .where(eq(investmentMemos.dealId, dealId));
      }

      return NextResponse.json({ success: true, updated: body.sectionId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Memo PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update memo' }, { status: 500 });
  }
}
