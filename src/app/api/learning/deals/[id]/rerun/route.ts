import { NextRequest, NextResponse } from 'next/server';
import { getCIL } from '@/lib/cil';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cil = getCIL();
    const result = await cil.learn({ mode: 'rerun', historicalDealId: id });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Learning rerun error:', error);
    const message = error instanceof Error ? error.message : 'Failed to rerun deal';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
