import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { deals, facilities, dealWorkspaceStages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { loadKnowledgeForStage, searchKnowledge } from './knowledge-loader';
import type { CILInsight, WorkspaceStageType } from '@/types/workspace';

export interface CILRequest {
  dealId: string;
  stage: WorkspaceStageType;
  query?: string;
}

export interface CILResponse {
  insights: CILInsight[];
  response?: string;
}

// ── Stage-specific system prompts ───────────────────────────────────

const STAGE_PROMPTS: Record<string, string> = {
  deal_intake: `You are the Cascadia Intelligence Layer (CIL) for deal intake analysis. Based on the facility data and knowledge base, provide insights about:
- Regulatory environment (CON status, state regulations)
- CMS quality flags (SFF status, IJ citations, low star ratings)
- Market context (demographics, competition, occupancy trends)
- Initial red flags or green flags based on the data provided
Format each insight as a JSON object with: type (info|warning|opportunity|benchmark), title, content, source.`,

  comp_pull: `You are the CIL for comparable transaction analysis. Provide insights about:
- Relevant transaction benchmarks for this market/asset type
- Price per bed ranges for the state and region
- Cap rate expectations based on geographic and quality data
- How this deal compares to recent comparable transactions
Format each insight as a JSON object with: type, title, content, source.`,

  pro_forma: `You are the CIL for pro forma modeling. Provide insights about:
- State-specific Medicaid reimbursement trends
- Medicare PDPM optimization opportunities
- Labor market conditions and agency reduction potential
- Revenue enhancement opportunities (CMI, payer mix, occupancy)
- Expense benchmarking vs industry standards
Format each insight as a JSON object with: type, title, content, source.`,

  risk_score: `You are the CIL for risk assessment. Provide insights about:
- Regulatory risk factors specific to this state/facility
- Operational risk flags from CMS data
- Financial risk indicators
- Market and competitive risks
- Mitigation strategies for identified risks
Format each insight as a JSON object with: type, title, content, source.`,

  investment_memo: `You are the CIL for investment memo preparation. Provide insights to improve the memo:
- Suggested improvements for each section
- Data points that should be highlighted
- Industry context and benchmarks to reference
- Competitive positioning narratives
- Key risks to emphasize and mitigants to include
Format each insight as a JSON object with: type, title, content, source.`,
};

// ── Generate stage-specific CIL insights ────────────────────────────

export async function generateCILInsights(request: CILRequest): Promise<CILResponse> {
  const { dealId, stage, query } = request;

  // Load deal context
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return { insights: [] };

  const facilityList = await db.select().from(facilities).where(eq(facilities.dealId, dealId)).limit(1);
  const facility = facilityList[0];

  const [stageRow] = await db
    .select()
    .from(dealWorkspaceStages)
    .where(and(eq(dealWorkspaceStages.dealId, dealId), eq(dealWorkspaceStages.stage, stage)));

  const stageData = (stageRow?.stageData || {}) as Record<string, unknown>;

  // Load relevant knowledge files
  const knowledgeFiles = query
    ? await searchKnowledge(query, 5)
    : await loadKnowledgeForStage(stage, {
        state: deal.primaryState || facility?.state || undefined,
        assetType: deal.assetType || undefined,
      });

  // Build knowledge context
  const knowledgeContext = knowledgeFiles
    .map(f => `--- ${f.filename} ---\n${f.content}`)
    .join('\n\n');

  // Build deal context
  const dealContext = buildDealContext(deal, facility, stageData);

  // Generate insights via Claude
  const anthropic = new Anthropic();

  const stagePrompt = STAGE_PROMPTS[stage] || STAGE_PROMPTS.deal_intake;
  const userMessage = query
    ? `DEAL CONTEXT:\n${dealContext}\n\nKNOWLEDGE BASE:\n${knowledgeContext}\n\nUSER QUESTION: ${query}\n\nProvide a direct answer to the question, plus any relevant insights. Return your response as JSON: { "response": "direct answer", "insights": [{ "type": "...", "title": "...", "content": "...", "source": "..." }] }`
    : `DEAL CONTEXT:\n${dealContext}\n\nKNOWLEDGE BASE:\n${knowledgeContext}\n\nGenerate 3-5 actionable insights for this stage. Return as JSON array: [{ "type": "...", "title": "...", "content": "...", "source": "..." }]`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: stagePrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Parse JSON from response
    const parsed = parseInsightsResponse(responseText, stage);

    // Store insights in stage data
    if (parsed.insights.length > 0) {
      await db
        .update(dealWorkspaceStages)
        .set({
          cilInsights: parsed.insights as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(and(eq(dealWorkspaceStages.dealId, dealId), eq(dealWorkspaceStages.stage, stage)));
    }

    return parsed;
  } catch (error) {
    console.error('CIL generation error:', error);
    return {
      insights: getFallbackInsights(stage, deal, facility),
      response: query ? 'Unable to process your question at this time. Please try again.' : undefined,
    };
  }
}

// ── Response parser ─────────────────────────────────────────────────

function parseInsightsResponse(text: string, stage: string): CILResponse {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text;

    const parsed = JSON.parse(jsonStr);

    // Handle both array and object responses
    if (Array.isArray(parsed)) {
      return {
        insights: parsed.map((item, idx) => ({
          id: `cil_${stage}_${idx}`,
          type: normalizeType(item.type),
          title: item.title || 'Insight',
          content: item.content || '',
          source: item.source || 'CIL Analysis',
          confidence: normalizeConfidence(item.confidence),
          stage: stage as WorkspaceStageType,
        })),
      };
    }

    if (parsed.insights) {
      return {
        response: parsed.response,
        insights: (parsed.insights as Array<Record<string, string>>).map((item, idx) => ({
          id: `cil_${stage}_${idx}`,
          type: normalizeType(item.type),
          title: item.title || 'Insight',
          content: item.content || '',
          source: item.source || 'CIL Analysis',
          confidence: normalizeConfidence(item.confidence),
          stage: stage as WorkspaceStageType,
        })),
      };
    }

    return { insights: [] };
  } catch {
    // If JSON parsing fails, extract insights from text
    return {
      response: text.slice(0, 500),
      insights: [{
        id: `cil_${stage}_0`,
        type: 'info',
        title: 'Analysis',
        content: text.slice(0, 800),
        source: 'CIL Analysis',
        confidence: 'medium' as const,
        stage: stage as WorkspaceStageType,
      }],
    };
  }
}

// ── Deal context builder ────────────────────────────────────────────

function buildDealContext(
  deal: typeof deals.$inferSelect,
  facility: typeof facilities.$inferSelect | undefined,
  stageData: Record<string, unknown>
): string {
  const lines: string[] = [];
  lines.push(`Deal: ${deal.name || 'Unknown'}`);
  lines.push(`Asset Type: ${deal.assetType || 'snf'}`);
  lines.push(`State: ${deal.primaryState || 'N/A'}`);
  lines.push(`Beds: ${deal.beds || 'N/A'}`);
  lines.push(`Asking Price: ${deal.askingPrice ? `$${(parseFloat(deal.askingPrice) / 1e6).toFixed(1)}M` : 'N/A'}`);

  if (facility) {
    lines.push(`CMS Rating: ${facility.cmsRating || 'N/A'}/5`);
    lines.push(`SFF Status: ${facility.isSff ? 'YES' : 'No'}`);
    lines.push(`Health Rating: ${facility.healthRating || 'N/A'}/5`);
  }

  // Include stage-specific data
  if (stageData && Object.keys(stageData).length > 0) {
    lines.push(`\nStage Data: ${JSON.stringify(stageData).slice(0, 2000)}`);
  }

  return lines.join('\n');
}

// ── Type normalization ───────────────────────────────────────────────

function normalizeType(type: string | undefined): CILInsight['type'] {
  if (!type) return 'info';
  const t = type.toLowerCase();
  if (t === 'warning' || t === 'risk' || t === 'red_flag' || t === 'caution') return 'warning';
  if (t === 'opportunity' || t === 'upside' || t === 'green_flag' || t === 'positive') return 'opportunity';
  if (t.includes('benchmark') || t.includes('data') || t.includes('price') || t.includes('metric')) return 'benchmark';
  if (t === 'info' || t === 'warning' || t === 'opportunity' || t === 'benchmark') return t as CILInsight['type'];
  return 'info';
}

function normalizeConfidence(confidence: string | undefined): CILInsight['confidence'] {
  if (!confidence) return 'medium';
  const c = confidence.toLowerCase();
  if (c === 'high') return 'high';
  if (c === 'low') return 'low';
  return 'medium';
}

// ── Fallback insights ───────────────────────────────────────────────

function getFallbackInsights(
  stage: string,
  deal: typeof deals.$inferSelect,
  facility: typeof facilities.$inferSelect | undefined
): CILInsight[] {
  const insights: CILInsight[] = [];

  if (facility?.isSff) {
    insights.push({
      id: `cil_${stage}_sff`,
      type: 'warning',
      title: 'Special Focus Facility Status',
      content: 'This facility is on the SFF list. Expect 3x higher survey frequency and additional regulatory scrutiny. Factor into risk assessment.',
      source: 'CMS Data',
      confidence: 'high',
      stage: stage as WorkspaceStageType,
    });
  }

  if (deal.primaryState) {
    insights.push({
      id: `cil_${stage}_state`,
      type: 'info',
      title: `${deal.primaryState} Market Context`,
      content: `Review state-specific Medicaid rates, CON requirements, and regulatory environment for ${deal.primaryState}.`,
      source: 'Knowledge Base',
      confidence: 'medium',
      stage: stage as WorkspaceStageType,
    });
  }

  insights.push({
    id: `cil_${stage}_general`,
    type: 'benchmark',
    title: 'Industry Benchmark',
    content: `${deal.assetType === 'ALF' ? 'ALF' : 'SNF'} national median cap rates: ${deal.assetType === 'ALF' ? '6.5-7.5%' : '8.5-10.5%'}. Verify against regional data for this deal.`,
    source: 'Cascadia Intelligence',
    confidence: 'high',
    stage: stage as WorkspaceStageType,
  });

  return insights;
}
