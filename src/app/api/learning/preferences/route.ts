import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aggregatedPreferences } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * GET /api/learning/preferences — Query learned preferences
 *
 * Query params:
 * - assetType: SNF | ALF | ILF
 * - state: Two-letter state code
 * - key: Preference key (cap_rate, mgmt_fee_pct, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetType = searchParams.get('assetType');
    const state = searchParams.get('state');
    const key = searchParams.get('key');

    const conditions = [];

    if (assetType) {
      conditions.push(eq(aggregatedPreferences.assetType, assetType as 'SNF' | 'ALF' | 'ILF' | 'HOSPICE'));
    }
    if (state) {
      conditions.push(eq(aggregatedPreferences.state, state));
    }
    if (key) {
      conditions.push(eq(aggregatedPreferences.preferenceKey, key));
    }

    const preferences = conditions.length > 0
      ? await db.select().from(aggregatedPreferences).where(and(...conditions))
      : await db.select().from(aggregatedPreferences);

    return NextResponse.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch preferences' },
      { status: 500 }
    );
  }
}
