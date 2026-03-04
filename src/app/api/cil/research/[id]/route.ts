import { NextRequest, NextResponse } from 'next/server';
import { getResearchMission, importMissionToKnowledge } from '@/lib/cil';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mission = await getResearchMission(id);

    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    return NextResponse.json(mission);
  } catch (error) {
    console.error('[API] CIL research detail error:', error);
    return NextResponse.json({ error: 'Failed to get research mission' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'import') {
      const filePath = await importMissionToKnowledge(id);
      return NextResponse.json({ success: true, filePath });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[API] CIL research action error:', error);
    return NextResponse.json({ error: 'Failed to process research action' }, { status: 500 });
  }
}
