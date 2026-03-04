import { NextRequest, NextResponse } from 'next/server';
import { getCIL, getStateDetail } from '@/lib/cil';

export async function GET(request: NextRequest) {
  try {
    const state = request.nextUrl.searchParams.get('state');

    if (state) {
      const detail = await getStateDetail(state);
      return NextResponse.json(detail);
    }

    const cil = getCIL();
    const performance = await cil.getPerformance();
    return NextResponse.json(performance);
  } catch (error) {
    console.error('[API] CIL performance error:', error);
    return NextResponse.json({ error: 'Failed to get performance data' }, { status: 500 });
  }
}
