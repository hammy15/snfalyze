import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, ahaMoments } from '@/db/schema';
import { isNotNull } from 'drizzle-orm';
import { getRouter } from '@/lib/ai/singleton';

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

    const router = getRouter();
    const results: Array<{ dealName: string; moments: number }> = [];

    for (const deal of analyzedDeals) {
      try {
        const response = await router.route({
          taskType: 'deal_analysis',
          systemPrompt: `You extract AHA moments — breakthrough insights that emerge when two AI brains (Newo=operations, Dev=strategy) debate a deal. These are NOT summaries — they are specific, actionable "eureka" findings where the operational and strategic perspectives clashed and produced a deeper truth.`,
          userPrompt: `Analyze this dual-brain output for a deal called "${deal.name}" (${deal.primaryState} ${deal.assetType}, confidence: ${deal.confidenceScore}%).

NARRATIVE:
${deal.narrative}

THESIS:
${deal.thesis || 'N/A'}

Extract 2-3 AHA moments. For each, provide:
- title: A punchy headline (max 80 chars)
- insight: The breakthrough finding (2-3 sentences)
- newoPosition: What the operations brain argued
- devPosition: What the strategy brain argued
- resolution: How the tension was resolved
- category: One of: valuation, risk, operations, strategy, market, regulatory
- significance: high, medium, or low

Return ONLY valid JSON array, no markdown:
[{"title":"...","insight":"...","newoPosition":"...","devPosition":"...","resolution":"...","category":"...","significance":"..."}]`,
          maxTokens: 2000,
          temperature: 0.4,
        });

        let moments: Array<Record<string, string>> = [];
        try {
          const cleaned = response.content.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
          moments = JSON.parse(cleaned);
        } catch {
          console.warn(`[AHA Extract] Failed to parse response for ${deal.name}`);
          continue;
        }

        for (const m of moments) {
          await db.insert(ahaMoments).values({
            dealId: deal.id,
            dealName: deal.name,
            title: m.title || 'Untitled Insight',
            insight: m.insight || '',
            newoPosition: m.newoPosition || null,
            devPosition: m.devPosition || null,
            resolution: m.resolution || null,
            category: m.category || 'general',
            significance: m.significance || 'medium',
            confidence: deal.confidenceScore,
            tags: [deal.primaryState, deal.assetType].filter(Boolean),
          });
        }

        results.push({ dealName: deal.name, moments: moments.length });
      } catch (err) {
        console.error(`[AHA Extract] Failed for ${deal.name}:`, err);
        results.push({ dealName: deal.name, moments: 0 });
      }
    }

    const total = results.reduce((s, r) => s + r.moments, 0);
    return NextResponse.json({
      message: `Extracted ${total} AHA moments from ${analyzedDeals.length} deals`,
      results,
    });
  } catch (error) {
    console.error('[AHA Extract] Error:', error);
    return NextResponse.json({ error: 'Failed to extract AHA moments' }, { status: 500 });
  }
}
