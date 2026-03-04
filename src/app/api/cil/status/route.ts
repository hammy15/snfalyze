import { NextResponse } from 'next/server';
import { getCIL, getBrainHealth } from '@/lib/cil';

export async function GET() {
  try {
    const cil = getCIL();
    const [state, brainHealth] = await Promise.all([
      cil.getState(),
      Promise.resolve(getBrainHealth()),
    ]);

    return NextResponse.json({
      ...state,
      brains: brainHealth,
    });
  } catch (error) {
    console.error('[API] CIL status error:', error);
    return NextResponse.json({ error: 'Failed to get CIL status' }, { status: 500 });
  }
}
