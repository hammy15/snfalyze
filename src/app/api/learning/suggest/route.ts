import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { aggregatedPreferences } from '@/db/schema';
import { suggestAll } from '@/lib/learning/preference-engine';
import type { PreferenceLookupQuery, AggregatedPreference } from '@/lib/learning/types';

/**
 * POST /api/learning/suggest — Get suggestions for a new deal context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { assetType, state, dealSize, qualityTier } = body;

    if (!assetType) {
      return NextResponse.json(
        { success: false, error: 'assetType is required' },
        { status: 400 }
      );
    }

    // Fetch all aggregated preferences
    const prefs = await db.select().from(aggregatedPreferences);

    // Convert DB records to typed AggregatedPreference objects
    const typedPrefs: AggregatedPreference[] = prefs.map(p => ({
      preferenceKey: p.preferenceKey as AggregatedPreference['preferenceKey'],
      assetType: p.assetType || undefined,
      state: p.state || undefined,
      region: p.region || undefined,
      avgValue: Number(p.avgValue) || 0,
      medianValue: Number(p.medianValue) || 0,
      minValue: Number(p.minValue) || 0,
      maxValue: Number(p.maxValue) || 0,
      stdDev: Number(p.stdDev) || 0,
      sampleCount: p.sampleCount || 0,
      confidence: Number(p.confidence) || 0,
      sourceDealIds: (p.sourceDealIds || []) as string[],
    }));

    const query: PreferenceLookupQuery = {
      assetType,
      state,
      dealSize,
      qualityTier,
    };

    const suggestions = suggestAll(query, typedPrefs);

    return NextResponse.json({ success: true, data: suggestions });
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate suggestions' },
      { status: 500 }
    );
  }
}
