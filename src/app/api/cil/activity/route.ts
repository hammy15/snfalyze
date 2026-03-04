import { NextRequest, NextResponse } from 'next/server';
import { getCIL } from '@/lib/cil';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const cil = getCIL();
    const activity = await cil.getActivity(limit);
    return NextResponse.json(activity);
  } catch (error) {
    console.error('[API] CIL activity error:', error);
    return NextResponse.json({ error: 'Failed to get CIL activity' }, { status: 500 });
  }
}
