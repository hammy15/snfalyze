import { NextResponse } from 'next/server';
import { getCIL } from '@/lib/cil';

export async function GET() {
  try {
    const cil = getCIL();
    const state = await cil.getState();
    return NextResponse.json(state);
  } catch (error) {
    console.error('[API] CIL status error:', error);
    return NextResponse.json({ error: 'Failed to get CIL status' }, { status: 500 });
  }
}
