import { NextResponse } from 'next/server';
import { db } from '@/db';
import { ahaMoments } from '@/db/schema';
import { desc } from 'drizzle-orm';

interface AhaResearchSuggestion {
  topic: string;
  reason: string;
  fromAha: string;
  category: string;
  significance: string;
}

export async function GET() {
  try {
    // Fetch recent AHA moments
    const moments = await db
      .select()
      .from(ahaMoments)
      .orderBy(desc(ahaMoments.createdAt))
      .limit(30);

    if (moments.length === 0) {
      return NextResponse.json([]);
    }

    // Generate research suggestions from AHA moment gaps
    const suggestions: AhaResearchSuggestion[] = [];
    const seen = new Set<string>();

    for (const m of moments) {
      const title = (m.title || '').toLowerCase();
      const insight = (m.insight || '').toLowerCase();
      const resolution = (m.resolution || '').toLowerCase();
      const category = m.category || 'general';
      const tags = (m.tags as string[]) || [];
      const state = tags[0] || '';
      const assetType = tags[1] || 'SNF';

      // Look for unresolved tensions / knowledge gaps
      const hasGap =
        resolution.includes('unknown') ||
        resolution.includes('unclear') ||
        resolution.includes('need') ||
        resolution.includes('further') ||
        resolution.includes('investigate') ||
        resolution.includes('data') ||
        resolution.includes('insufficient') ||
        insight.includes('gap') ||
        insight.includes('unknown') ||
        insight.includes('limited data');

      // Category-specific suggestions
      if (category === 'regulatory' || title.includes('regulat') || insight.includes('regulat')) {
        const topic = state
          ? `${state} healthcare regulatory environment and survey enforcement trends 2026`
          : 'Multi-state SNF regulatory enforcement patterns and trends 2026';
        if (!seen.has(topic)) {
          suggestions.push({ topic, reason: `AHA insight flagged regulatory tension`, fromAha: m.title || '', category, significance: m.significance || 'medium' });
          seen.add(topic);
        }
      }

      if (category === 'market' || title.includes('market') || insight.includes('market')) {
        const topic = state
          ? `${state} ${assetType} market conditions and competitive landscape 2026`
          : `National ${assetType} acquisition market dynamics 2026`;
        if (!seen.has(topic)) {
          suggestions.push({ topic, reason: `Market intelligence gap from brain debate`, fromAha: m.title || '', category, significance: m.significance || 'medium' });
          seen.add(topic);
        }
      }

      if (category === 'valuation' || title.includes('valuat') || insight.includes('cap rate') || insight.includes('pricing')) {
        const topic = state
          ? `${state} ${assetType} transaction comps and cap rate benchmarks Q1 2026`
          : `${assetType} valuation multiples and cap rate trends 2026`;
        if (!seen.has(topic)) {
          suggestions.push({ topic, reason: `Valuation uncertainty from Newo/Dev debate`, fromAha: m.title || '', category, significance: m.significance || 'medium' });
          seen.add(topic);
        }
      }

      if (category === 'operations' || title.includes('staff') || insight.includes('staff') || insight.includes('operat')) {
        const topic = state
          ? `${state} healthcare staffing costs, availability, and agency dependency analysis`
          : `National SNF staffing crisis and operational improvement strategies 2026`;
        if (!seen.has(topic)) {
          suggestions.push({ topic, reason: `Operations gap identified in brain analysis`, fromAha: m.title || '', category, significance: m.significance || 'medium' });
          seen.add(topic);
        }
      }

      if (category === 'risk' || title.includes('risk') || insight.includes('risk')) {
        const topic = state
          ? `${state} ${assetType} key risk factors and mitigation strategies for acquisitions`
          : `Healthcare real estate acquisition risk factors and mitigation 2026`;
        if (!seen.has(topic)) {
          suggestions.push({ topic, reason: `Risk factor flagged by brain tension`, fromAha: m.title || '', category, significance: m.significance || 'medium' });
          seen.add(topic);
        }
      }

      if (category === 'strategy' || title.includes('strateg') || insight.includes('portfolio')) {
        const topic = state
          ? `${state} portfolio growth strategy and synergy opportunities for multi-site operators`
          : `Healthcare portfolio consolidation strategy and scale economics 2026`;
        if (!seen.has(topic)) {
          suggestions.push({ topic, reason: `Strategic knowledge gap from AHA insight`, fromAha: m.title || '', category, significance: m.significance || 'medium' });
          seen.add(topic);
        }
      }

      // Generic gap-driven suggestion
      if (hasGap && state) {
        const topic = `${state} ${assetType} market intelligence deep dive — ${(m.title || 'general').slice(0, 50)}`;
        if (!seen.has(topic)) {
          suggestions.push({ topic, reason: `Unresolved knowledge gap in AHA moment`, fromAha: m.title || '', category, significance: m.significance || 'medium' });
          seen.add(topic);
        }
      }
    }

    // Sort: high significance first
    const sigOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    suggestions.sort((a, b) => (sigOrder[a.significance] ?? 1) - (sigOrder[b.significance] ?? 1));

    return NextResponse.json(suggestions.slice(0, 12));
  } catch (error) {
    console.error('[AHA Suggest] Error:', error);
    return NextResponse.json([]);
  }
}
