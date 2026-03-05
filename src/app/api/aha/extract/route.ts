import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals } from '@/db/schema';
import { isNotNull } from 'drizzle-orm';
import { extractAhaMoments } from '@/lib/cil/aha-extractor';

export const maxDuration = 120;

export async function POST() {
  try {
    // Get all deals that have been dual-brain analyzed (have analysisNarrative)
    const analyzedDeals = await db
      .select({
        id: deals.id,
        name: deals.name,
        narrative: deals.analysisNarrative,
        thesis: deals.thesis,
        primaryState: deals.primaryState,
        assetType: deals.assetType,
        confidenceScore: deals.confidenceScore,
      })
      .from(deals)
      .where(isNotNull(deals.analysisNarrative));

    if (analyzedDeals.length === 0) {
      return NextResponse.json({ message: 'No analyzed deals to extract from', count: 0 });
    }

    const results: Array<{ dealName: string; moments: number; skipped?: boolean }> = [];

    for (const deal of analyzedDeals) {
      try {
        // Uses shared extractor which has built-in deduplication
        const momentCount = await extractAhaMoments({
          dealId: deal.id,
          dealName: deal.name,
          narrative: deal.narrative || '',
          thesis: deal.thesis || undefined,
          state: deal.primaryState,
          assetType: deal.assetType,
          confidence: deal.confidenceScore ?? undefined,
          source: 'dual_brain',
        });

        results.push({
          dealName: deal.name,
          moments: momentCount,
          skipped: momentCount === 0,
        });
      } catch (err) {
        console.error(`[AHA Extract] Failed for ${deal.name}:`, err);
        results.push({ dealName: deal.name, moments: 0 });
      }
    }

    const total = results.reduce((s, r) => s + r.moments, 0);
    const skipped = results.filter(r => r.skipped).length;
    return NextResponse.json({
      message: `Extracted ${total} AHA moments from ${analyzedDeals.length} deals (${skipped} skipped — already extracted)`,
      results,
    });
  } catch (error) {
    console.error('[AHA Extract] Error:', error);
    return NextResponse.json({ error: 'Failed to extract AHA moments' }, { status: 500 });
  }
}
