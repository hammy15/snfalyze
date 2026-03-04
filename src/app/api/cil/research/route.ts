import { NextRequest, NextResponse } from 'next/server';
import { getCIL } from '@/lib/cil';

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20');
    const cil = getCIL();
    const missions = await cil.getResearchMissions(limit);
    return NextResponse.json(missions);
  } catch (error) {
    console.error('[API] CIL research list error:', error);
    return NextResponse.json({ error: 'Failed to list research missions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, context } = body;

    if (!topic) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const cil = getCIL();
    const mission = await cil.research(topic, context);
    return NextResponse.json(mission, { status: 201 });
  } catch (error) {
    console.error('[API] CIL research create error:', error);
    return NextResponse.json({ error: 'Failed to create research mission' }, { status: 500 });
  }
}
