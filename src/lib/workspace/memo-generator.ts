import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import {
  deals,
  facilities,
  financialPeriods,
  dealWorkspaceStages,
  investmentMemos,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { MemoSection } from '@/types/workspace';

const MEMO_SECTION_IDS = [
  'executive_summary',
  'facility_overview',
  'market_analysis',
  'financial_analysis',
  'risk_assessment',
  'investment_thesis',
  'due_diligence',
  'recommendation',
] as const;

const SECTION_LABELS: Record<string, string> = {
  executive_summary: 'Executive Summary',
  facility_overview: 'Facility Overview',
  market_analysis: 'Market Analysis',
  financial_analysis: 'Financial Analysis',
  risk_assessment: 'Risk Assessment',
  investment_thesis: 'Investment Thesis & Value Creation',
  due_diligence: 'Due Diligence Checklist',
  recommendation: 'Recommendation',
};

export interface MemoGeneratorResult {
  memoId: string;
  sections: MemoSection[];
}

// ── Generate full investment memo ───────────────────────────────────

export async function generateInvestmentMemo(dealId: string): Promise<MemoGeneratorResult> {
  // Load all workspace stage data
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error('Deal not found');

  const facilityList = await db.select().from(facilities).where(eq(facilities.dealId, dealId)).limit(1);
  const facility = facilityList[0];

  const stages = await db
    .select()
    .from(dealWorkspaceStages)
    .where(eq(dealWorkspaceStages.dealId, dealId));

  const stageDataMap: Record<string, Record<string, unknown>> = {};
  for (const stage of stages) {
    stageDataMap[stage.stage] = (stage.stageData || {}) as Record<string, unknown>;
  }

  const periods = await db
    .select()
    .from(financialPeriods)
    .where(eq(financialPeriods.dealId, dealId))
    .limit(1);

  // Build context for AI generation
  const context = buildMemoContext(deal, facility, stageDataMap, periods[0]);

  // Generate all 8 sections via Claude
  const anthropic = new Anthropic();

  const systemPrompt = `You are a senior healthcare real estate investment analyst at Cascadia Healthcare, writing a professional investment memorandum for a skilled nursing facility (SNF) or assisted living facility (ALF) acquisition.

Write in a formal, analytical tone suitable for an investment committee. Use specific data points from the provided context. Structure each section clearly with paragraphs.

Key Cascadia principles:
- Risk is priced, not avoided
- Dual-view analysis (Cascadia execution view vs external/lender view)
- Focus on operational value creation and turnaround potential
- Data-driven recommendations with specific metrics`;

  const userPrompt = `Generate a complete 8-section investment memorandum for this deal.

DEAL CONTEXT:
${context}

CRITICAL FORMATTING RULES:
- Output EXACTLY 8 sections separated by "---SECTION_BREAK---"
- Do NOT include any preamble, header, title page, or introductory text before the first section
- Do NOT include section numbers or section titles at the start of each section (e.g., do NOT write "Section 1 - Executive Summary" or "**Executive Summary**")
- Start IMMEDIATELY with the content of Section 1
- Each section should contain ONLY the body text — no section labels

The 8 sections in order:

1. Executive Summary: Deal thesis, key metrics (asking price, beds, cap rate, EBITDA), and top-level recommendation (2-3 paragraphs).
---SECTION_BREAK---
2. Facility Overview: Physical plant, CMS ratings, survey history, staffing metrics, census data, SFF status if applicable (2-3 paragraphs).
---SECTION_BREAK---
3. Market Analysis: Demographics, competition, occupancy trends, regulatory environment (CON status), reimbursement outlook (2-3 paragraphs).
---SECTION_BREAK---
4. Financial Analysis: Historical performance, pro forma projections for base/bull/bear cases, revenue build by payer, expense benchmarking, valuation summary (3-4 paragraphs).
---SECTION_BREAK---
5. Risk Assessment: Composite risk score, top risk categories, deal-breaker flags, mitigants, risk-adjusted valuation (2-3 paragraphs).
---SECTION_BREAK---
6. Investment Thesis & Value Creation: Primary value levers (CMI optimization, occupancy recovery, agency reduction, payer mix improvement, operational efficiencies), estimated financial impact, timeline (3-4 paragraphs).
---SECTION_BREAK---
7. Due Diligence Checklist: Bulleted list of 15-20 due diligence items organized by category (regulatory, financial, operational, legal, environmental).
---SECTION_BREAK---
8. Recommendation: Final recommendation (proceed/conditional/pass), key conditions, suggested offer range, next steps (2-3 paragraphs).

Remember: NO preamble before section 1. NO section titles/headers within sections. Start immediately with content.`;

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  // Parse sections from response
  const rawSections = responseText.split('---SECTION_BREAK---').map(s => s.trim()).filter(Boolean);

  // Strip section labels/headers that the AI may have included
  const cleanedSections = rawSections.map(s => {
    // Remove lines like "**Section 1 - Executive Summary**" or "## Executive Summary" or "Section 1:" etc.
    return s
      .replace(/^\*{0,2}(?:Section\s+\d+\s*[-–:]\s*)?(?:Executive Summary|Facility Overview|Market Analysis|Financial Analysis|Risk Assessment|Investment Thesis[^*\n]*|Due Diligence[^*\n]*|Recommendation)\*{0,2}\s*\n*/i, '')
      .replace(/^#{1,3}\s.*?\n+/, '')
      .trim();
  });

  // Detect if first section is a preamble (very short or contains "MEMORANDUM" / "Date:" header-like content)
  let sectionOffset = 0;
  if (cleanedSections.length > 8) {
    // AI likely added a preamble — skip it
    sectionOffset = cleanedSections.length - 8;
  } else if (cleanedSections.length > 0 && cleanedSections[0].length < 200) {
    // Check if first section looks like a preamble (title block, not real content)
    const first = cleanedSections[0].toLowerCase();
    if (first.includes('memorandum') || first.includes('date:') || first.includes('analyst:') || first.includes('prepared')) {
      sectionOffset = 1;
    }
  }

  const sections: MemoSection[] = MEMO_SECTION_IDS.map((id, idx) => ({
    id,
    title: SECTION_LABELS[id],
    content: cleanedSections[idx + sectionOffset] || `[${SECTION_LABELS[id]} - content pending]`,
    isGenerated: true,
    isEdited: false,
    generatedAt: new Date().toISOString(),
  }));

  // Persist to investment_memos table
  const [memo] = await db
    .insert(investmentMemos)
    .values({
      dealId,
      version: 1,
      status: 'draft',
      executiveSummary: sections.find(s => s.id === 'executive_summary')?.content || null,
      facilityOverview: sections.find(s => s.id === 'facility_overview')?.content || null,
      marketAnalysis: sections.find(s => s.id === 'market_analysis')?.content || null,
      financialAnalysis: sections.find(s => s.id === 'financial_analysis')?.content || null,
      riskAssessment: sections.find(s => s.id === 'risk_assessment')?.content || null,
      investmentThesis: sections.find(s => s.id === 'investment_thesis')?.content || null,
      recommendation: sections.find(s => s.id === 'recommendation')?.content || null,
      dueDiligenceChecklist: { content: sections.find(s => s.id === 'due_diligence')?.content || '' },
      generatedBy: 'ai',
      generatedAt: new Date(),
      metadata: {
        model: message.model,
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    })
    .returning();

  return {
    memoId: memo.id,
    sections,
  };
}

// ── Regenerate a single section ─────────────────────────────────────

export async function regenerateMemoSection(
  dealId: string,
  sectionId: string
): Promise<MemoSection | null> {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) return null;

  const stages = await db
    .select()
    .from(dealWorkspaceStages)
    .where(eq(dealWorkspaceStages.dealId, dealId));

  const stageDataMap: Record<string, Record<string, unknown>> = {};
  for (const stage of stages) {
    stageDataMap[stage.stage] = (stage.stageData || {}) as Record<string, unknown>;
  }

  const facilityList = await db.select().from(facilities).where(eq(facilities.dealId, dealId)).limit(1);
  const periods = await db.select().from(financialPeriods).where(eq(financialPeriods.dealId, dealId)).limit(1);

  const context = buildMemoContext(deal, facilityList[0], stageDataMap, periods[0]);
  const sectionTitle = SECTION_LABELS[sectionId] || sectionId;

  const anthropic = new Anthropic();
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a senior healthcare real estate analyst at Cascadia Healthcare. Regenerate the "${sectionTitle}" section of an investment memorandum.

DEAL CONTEXT:
${context}

Write 2-4 paragraphs for the "${sectionTitle}" section. Be specific with data points and metrics. Use formal analytical tone.`,
    }],
  });

  const content = message.content[0].type === 'text' ? message.content[0].text : '';

  // Update the DB record
  const columnMap: Record<string, string> = {
    executive_summary: 'executiveSummary',
    facility_overview: 'facilityOverview',
    market_analysis: 'marketAnalysis',
    financial_analysis: 'financialAnalysis',
    risk_assessment: 'riskAssessment',
    investment_thesis: 'investmentThesis',
    recommendation: 'recommendation',
  };

  if (columnMap[sectionId]) {
    await db
      .update(investmentMemos)
      .set({
        [columnMap[sectionId]]: content,
        updatedAt: new Date(),
      })
      .where(eq(investmentMemos.dealId, dealId));
  }

  return {
    id: sectionId,
    title: sectionTitle,
    content,
    isGenerated: true,
    isEdited: false,
    generatedAt: new Date().toISOString(),
  };
}

// ── Context builder ─────────────────────────────────────────────────

function buildMemoContext(
  deal: typeof deals.$inferSelect,
  facility: typeof facilities.$inferSelect | undefined,
  stageData: Record<string, Record<string, unknown>>,
  financials: typeof financialPeriods.$inferSelect | undefined
): string {
  const intake = stageData.deal_intake || {};
  const fi = (intake.facilityIdentification || {}) as Record<string, unknown>;
  const ods = (intake.ownershipDealStructure || {}) as Record<string, unknown>;
  const fs = (intake.financialSnapshot || {}) as Record<string, unknown>;
  const ops = (intake.operationalSnapshot || {}) as Record<string, unknown>;
  const mc = (intake.marketContext || {}) as Record<string, unknown>;

  const proforma = stageData.pro_forma || {};
  const risk = stageData.risk_score || {};
  const comps = stageData.comp_pull || {};

  const lines: string[] = [];

  lines.push(`Deal Name: ${deal.name || 'Unknown'}`);
  lines.push(`Facility: ${fi.facilityName || deal.name || 'N/A'}`);
  lines.push(`Location: ${fi.city || ''}, ${fi.state || deal.primaryState || ''}`);
  lines.push(`Asset Type: ${deal.assetType || 'SNF'}`);
  lines.push(`Licensed Beds: ${fi.licensedBeds || deal.beds || 'N/A'}`);
  lines.push(`Asking Price: ${deal.askingPrice ? `$${(parseFloat(deal.askingPrice) / 1e6).toFixed(1)}M` : 'N/A'}`);
  if (deal.askingPrice && (fi.licensedBeds || deal.beds)) {
    const ppb = parseFloat(deal.askingPrice) / ((fi.licensedBeds as number) || deal.beds || 1);
    lines.push(`Price Per Bed: $${Math.round(ppb).toLocaleString()}`);
  }

  lines.push(`\nDeal Structure: ${ods.dealStructure || 'N/A'}`);
  lines.push(`Real Estate Included: ${ods.realEstateIncluded ? 'Yes' : 'No'}`);
  lines.push(`Current Owner: ${ods.currentOwnerName || 'N/A'}`);
  lines.push(`Source: ${ods.sourceOfDeal || 'N/A'}`);

  lines.push(`\nTTM Revenue: ${fs.ttmRevenue ? `$${((fs.ttmRevenue as number) / 1e6).toFixed(1)}M` : 'N/A'}`);
  lines.push(`TTM EBITDA: ${fs.ttmEbitda ? `$${((fs.ttmEbitda as number) / 1e6).toFixed(1)}M` : 'N/A'}`);
  lines.push(`Payer Mix: Medicare ${fs.medicareCensusPercent || 'N/A'}% / Medicaid ${fs.medicaidCensusPercent || 'N/A'}% / Private ${fs.privatePayCensusPercent || 'N/A'}%`);
  lines.push(`ADC: ${fs.ttmTotalCensusAdc || 'N/A'}`);

  lines.push(`\nCMS Overall Rating: ${ops.cmsOverallRating || 'N/A'}/5`);
  lines.push(`CMS Staffing: ${ops.cmsStaffingStar || 'N/A'}/5`);
  lines.push(`CMS Quality: ${ops.cmsQualityStar || 'N/A'}/5`);
  lines.push(`Agency Staff: ${ops.agencyStaffPercent || 'N/A'}%`);
  lines.push(`IJ Citations (3yr): ${ops.ijCitationsLast3Years || 'N/A'}`);
  lines.push(`CMI: ${ops.cmi || 'N/A'}`);

  lines.push(`\nMarket: ${mc.primaryMarketArea || 'N/A'} (${mc.marketType || 'N/A'})`);
  lines.push(`Market Occupancy: ${mc.marketOccupancyRate || 'N/A'}%`);
  lines.push(`CON State: ${mc.isCONState ? 'Yes' : 'No'}`);

  if (risk.compositeScore !== undefined) {
    lines.push(`\nRisk Score: ${risk.compositeScore}/100 (${risk.rating})`);
    if (risk.dealBreakerFlags && (risk.dealBreakerFlags as unknown[]).length > 0) {
      lines.push(`Deal Breakers: ${(risk.dealBreakerFlags as Array<{ description: string }>).map(f => f.description).join(', ')}`);
    }
  }

  if (proforma.valuationOutput) {
    const vo = proforma.valuationOutput as Record<string, unknown>;
    lines.push(`\nReconciled Valuation: ${vo.reconciledValue ? `$${((vo.reconciledValue as number) / 1e6).toFixed(1)}M` : 'N/A'}`);
    lines.push(`Cap Rate Valuation: ${vo.capRateValue ? `$${((vo.capRateValue as number) / 1e6).toFixed(1)}M` : 'N/A'}`);
    lines.push(`Implied Cap Rate: ${vo.impliedCapRate ? `${((vo.impliedCapRate as number) * 100).toFixed(1)}%` : 'N/A'}`);
  }

  if (comps.marketBenchmarkSummary) {
    const mbs = comps.marketBenchmarkSummary as Record<string, unknown>;
    lines.push(`\nMedian Comp Price/Bed: ${mbs.medianPricePerBed ? `$${(mbs.medianPricePerBed as number).toLocaleString()}` : 'N/A'}`);
    lines.push(`Comp Count: ${mbs.recentTransactionCount || 'N/A'}`);
    lines.push(`Deal vs Market: ${mbs.dealPositionVsMarket || 'N/A'}`);
  }

  return lines.join('\n');
}
