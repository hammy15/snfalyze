import { NextResponse } from 'next/server';
import { getSenseList } from '@/lib/cil';

export async function GET() {
  try {
    const senses = getSenseList();
    return NextResponse.json(senses);
  } catch (error) {
    console.error('[API] CIL senses error:', error);
    return NextResponse.json({ error: 'Failed to get senses' }, { status: 500 });
  }
}
