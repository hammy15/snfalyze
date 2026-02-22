import { NextRequest, NextResponse } from 'next/server';
import { generateCILInsights } from '@/lib/workspace/cil-engine';
import type { WorkspaceStageType } from '@/types/workspace';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

const VALID_STAGES: WorkspaceStageType[] = [
  'deal_intake',
  'comp_pull',
  'pro_forma',
  'risk_score',
  'investment_memo',
];

// ── POST: Generate CIL insights or answer a query ───────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const body = await request.json();
    const { stage, query } = body;

    if (!stage || !VALID_STAGES.includes(stage)) {
      return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
    }

    const result = await generateCILInsights({
      dealId,
      stage,
      query: query || undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('CIL route error:', error);
    return NextResponse.json({ error: 'CIL processing failed' }, { status: 500 });
  }
}
