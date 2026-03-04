import { NextRequest, NextResponse } from 'next/server';
import { getCIL } from '@/lib/cil';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deal, activateSenses, includeResearch } = body;

    if (!deal) {
      return NextResponse.json({ error: 'deal is required' }, { status: 400 });
    }

    const cil = getCIL();
    const result = await cil.analyze({ deal, activateSenses, includeResearch });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] CIL insights error:', error);
    return NextResponse.json({ error: 'Failed to generate CIL insights' }, { status: 500 });
  }
}
