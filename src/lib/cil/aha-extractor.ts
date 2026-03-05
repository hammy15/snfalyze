// =============================================================================
// AHA EXTRACTOR — Mines breakthrough insights from dual-brain analyses + research
// =============================================================================

import { db } from '@/db';
import { ahaMoments } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getRouter } from '@/lib/ai/singleton';
import { logActivity } from './state-manager';
import { notifyAhaMoment } from '@/lib/notifications/telegram';

interface AhaMomentInput {
  dealId?: string;
  dealName?: string;
  narrative: string;
  thesis?: string;
  state?: string | null;
  assetType?: string | null;
  confidence?: number;
  source?: 'dual_brain' | 'research';
}

/**
 * Extract AHA moments from a dual-brain analysis narrative.
 * Called automatically after every dual-brain analysis completes.
 */
export async function extractAhaMoments(input: AhaMomentInput): Promise<number> {
  try {
    // Deduplication: skip if this deal already has AHA moments from this source
    if (input.dealId) {
      const existing = await db
        .select({ count: count() })
        .from(ahaMoments)
        .where(eq(ahaMoments.dealId, input.dealId));
      if ((existing[0]?.count ?? 0) > 0) {
        console.log(`[AHA] Skipping ${input.dealName} — already has AHA moments`);
        return 0;
      }
    }

    const router = getRouter();

    const sourceContext = input.source === 'research'
      ? `research findings about "${input.dealName || 'unknown topic'}"`
      : `dual-brain analysis for deal "${input.dealName}" (${input.state || ''} ${input.assetType || ''}, confidence: ${input.confidence}%)`;

    const response = await router.route({
      taskType: 'deal_analysis',
      systemPrompt: `You extract AHA moments — breakthrough insights that emerge when two AI brains (Newo=operations, Dev=strategy) debate. These are NOT summaries — they are specific, actionable "eureka" findings where operational and strategic perspectives clashed and produced a deeper truth.`,
      userPrompt: `Analyze this ${sourceContext}.

NARRATIVE:
${input.narrative}

${input.thesis ? `THESIS:\n${input.thesis}` : ''}

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
      console.warn(`[AHA] Failed to parse response for ${input.dealName}`);
      return 0;
    }

    if (!Array.isArray(moments) || moments.length === 0) return 0;

    for (const m of moments) {
      await db.insert(ahaMoments).values({
        dealId: input.dealId || null,
        dealName: input.dealName || null,
        title: m.title || 'Untitled Insight',
        insight: m.insight || '',
        newoPosition: m.newoPosition || null,
        devPosition: m.devPosition || null,
        resolution: m.resolution || null,
        category: m.category || 'general',
        significance: m.significance || 'medium',
        confidence: input.confidence || null,
        tags: [input.state, input.assetType].filter(Boolean),
      });

      // Telegram notification for high-significance AHA moments
      notifyAhaMoment(
        m.title || 'Untitled Insight',
        input.dealName || null,
        m.significance || 'medium'
      ).catch(() => {});
    }

    await logActivity('insight', `${moments.length} AHA moments extracted from ${input.dealName || 'research'}`, {
      metadata: { dealId: input.dealId, count: moments.length, source: input.source || 'dual_brain' },
    });

    return moments.length;
  } catch (err) {
    console.error(`[AHA] Extraction failed for ${input.dealName}:`, err);
    return 0;
  }
}
