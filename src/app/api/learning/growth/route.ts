import { NextResponse } from 'next/server';
import { getKnowledgeGrowth } from '@/lib/cil';

export async function GET() {
  try {
    const growth = await getKnowledgeGrowth();
    return NextResponse.json(growth);
  } catch (error) {
    console.error('[API] Learning growth error:', error);
    return NextResponse.json({ error: 'Failed to get growth data' }, { status: 500 });
  }
}
