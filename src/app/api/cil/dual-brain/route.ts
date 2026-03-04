import { NextRequest, NextResponse } from 'next/server';
import { db, deals } from '@/db';
import { eq, inArray, isNull } from 'drizzle-orm';
import { analyzeDealDualBrain } from '@/lib/analysis/engine';
import { logActivity } from '@/lib/cil/state-manager';
import { extractAhaMoments } from '@/lib/cil/aha-extractor';

// Allow up to 5 minutes for dual-brain analysis
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const dealIds: string[] = body.dealIds || [];
    const limit = body.limit || 3;

    // Either use provided IDs or pick top deals without analysis
    let targetDeals;
    if (dealIds.length > 0) {
      targetDeals = await db.query.deals.findMany({
        where: inArray(deals.id, dealIds),
        with: { facilities: true, documents: true, financialPeriods: true },
      });
    } else {
      // Pick top deals by confidence that haven't been dual-brain analyzed
      targetDeals = await db.query.deals.findMany({
        where: isNull(deals.analyzedAt),
        with: { facilities: true, documents: true, financialPeriods: true },
        orderBy: (d, { desc }) => [desc(d.confidenceScore)],
        limit,
      });
    }

    if (targetDeals.length === 0) {
      return NextResponse.json({ success: true, message: 'No deals to analyze', results: [] });
    }

    const results: Array<{ dealId: string; dealName: string; success: boolean; confidence?: number; recommendation?: string; error?: string }> = [];

    // Run sequentially to avoid overwhelming the AI providers
    for (const deal of targetDeals) {
      try {
        await db.update(deals).set({ status: 'analyzing' }).where(eq(deals.id, deal.id));

        const { dualBrainResult } = await analyzeDealDualBrain(deal);

        // Save results back to deal
        await db.update(deals).set({
          status: deal.status === 'analyzing' ? 'reviewed' : deal.status,
          confidenceScore: dualBrainResult.synthesis.confidence,
          analysisNarrative: dualBrainResult.synthesis.unifiedNarrative,
          thesis: dualBrainResult.synthesis.keyInsight,
          analyzedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(deals.id, deal.id));

        await logActivity('analysis', `Dual-brain analysis complete: ${deal.name} — ${dualBrainResult.synthesis.recommendation} (${dualBrainResult.synthesis.confidence}%)`, {
          metadata: {
            dealId: deal.id,
            newoConfidence: dualBrainResult.newo?.confidenceScore,
            devConfidence: dualBrainResult.dev?.confidenceScore,
            recommendation: dualBrainResult.synthesis.recommendation,
            tensionPoints: dualBrainResult.synthesis.tensionPoints?.length || 0,
            totalLatencyMs: dualBrainResult.metadata.totalLatencyMs,
          },
        });

        // Auto-extract AHA moments from the analysis (non-blocking)
        extractAhaMoments({
          dealId: deal.id,
          dealName: deal.name,
          narrative: dualBrainResult.synthesis.unifiedNarrative || '',
          thesis: dualBrainResult.synthesis.keyInsight || '',
          state: deal.primaryState,
          assetType: deal.assetType,
          confidence: dualBrainResult.synthesis.confidence,
          source: 'dual_brain',
        }).catch(err => console.error('[AHA] Auto-extract failed:', err));

        results.push({
          dealId: deal.id,
          dealName: deal.name,
          success: true,
          confidence: dualBrainResult.synthesis.confidence,
          recommendation: dualBrainResult.synthesis.recommendation,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[CIL Dual-Brain] Failed for ${deal.name}:`, errorMsg);

        // Reset status
        await db.update(deals).set({ status: deal.status }).where(eq(deals.id, deal.id));

        results.push({
          dealId: deal.id,
          dealName: deal.name,
          success: false,
          error: errorMsg,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    return NextResponse.json({
      success: true,
      message: `Dual-brain analysis complete: ${successCount}/${results.length} deals analyzed`,
      results,
    });
  } catch (error) {
    console.error('[CIL Dual-Brain] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Dual-brain batch analysis failed' },
      { status: 500 }
    );
  }
}
