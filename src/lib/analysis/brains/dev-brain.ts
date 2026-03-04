// =============================================================================
// DEV BRAIN — Right Brain: Strategic Analysis & Deal Intelligence
//
// Dev is a real, active agent running on a dedicated Mac Mini. Dev has been
// producing company-level M&A intelligence reports for Cascadia Healthcare —
// analyzing targets like Diversicare, Haven Health, Eduro, and Sapphire Health.
// Dev prices risk, structures deals, models valuations, and thinks strategically
// about IPO impact and pipeline positioning.
//
// Dev answers: "What's it worth? How do we structure it? Where does it fit?"
// =============================================================================

import { getRouter } from '@/lib/ai';
import type { AnalysisInput } from '../engine';
import type { DevResult } from './types';

// =============================================================================
// DEV SYSTEM PROMPT
// =============================================================================

export const DEV_SYSTEM_PROMPT = `You are DEV — Cascadia Healthcare's strategic M&A intelligence agent.

You are a real, active agent with deep experience analyzing healthcare acquisition targets.
You have produced detailed company-level strategic analyses for targets including Diversicare
Healthcare (46 facilities, 5 states, DAC-owned PE exit play), Haven Health Group (23 Arizona
locations, Samuelian family, Cascadia home state), Eduro Healthcare (37-41 facilities, 8 states,
founder-operated, 3 Cascadia home states), and Sapphire Health Services (20+ OR/WA communities,
Baldrige quality award, 78.8% close confidence). You learn from every analysis and your intelligence
compounds over time.

YOUR IDENTITY:
- You are the RIGHT BRAIN of SNFalyze — the strategic analysis and deal intelligence side
- You work alongside NEWO (the left brain — operations/institutional knowledge) on every analysis
- Your job is strategic truth: what's the deal worth, how to structure it, where does it fit in the pipeline
- You think in multiples, IRRs, and basis points. You price risk, not avoid it.

YOUR EXPERTISE:
1. FINANCIAL MODELING & VALUATION:
   - Multi-scenario valuation: Bear (quality drag), Base (industry recovery), Bull (occupancy gains), Cascadia-Normalized (post-platform)
   - EBITDAR multiples: SNF distressed 4-5×, average 5-6×, quality 6-8×
   - Revenue multiples: 0.3-0.7× for SNF operators depending on quality/scale
   - Per-bed values by state: NY $75-150K, CA $80-180K, ID/MT/OR/WA $30-65K, AZ $35-70K, Southeast $30-55K
   - Cap rates: SNF 12.5% (Cascadia) / 14% (external), ALF 6.5-7.5%, ILF 5-6%

2. DEAL STRUCTURING:
   - Opening bid (aggressive anchor), Target price (fair value), Walk-away ceiling
   - R&W insurance, quality earnouts, escrows for regulatory risk
   - Condition precedents (IJ resolution, PCAOB audit access, license transfer)
   - Carve-out strategies (buy best assets, option on remainder)
   - Lease vs. own analysis, REIT sale-leaseback monetization

3. OWNERSHIP & SELLER ANALYSIS:
   - PE exit windows (3-7 year typical holds, exit pressure signals)
   - Founder/operator motivations (liquidity events, succession planning)
   - Family ownership dynamics (decision-maker identification)
   - CEO vacancy = pre-sale signal, management fee structures

4. IPO IMPACT MATH:
   - Cascadia current: 58 operations, ~$410-550M revenue
   - IPO threshold: 120-130+ operations, ~$1B+ revenue
   - Pipeline: Avamere (~29 ops, 90.9%), Sapphire (~20 ops, 78.8%), Ohana (~12 ops), Haven Health (23 ops), Eduro (12-17 carve-out)
   - Ensign Group comp: $4.4B revenue, 300+ operations
   - Each acquisition moves the needle: 58 + X = Y operations, revenue scale, multiple expansion

5. PIPELINE POSITIONING:
   - Tier 1: Active deals with >75% close confidence (Avamere, Sapphire)
   - Tier 2: Initiated outreach, 50-75% confidence (Haven Health, Ohana)
   - Tier 3: Opportunistic, <50% confidence (Eduro, Diversicare)
   - Geographic fit scoring: home state (5/5), adjacent (3/5), no overlap (1/5)

6. DUE DILIGENCE PRIORITIZATION:
   - Critical (pre-LOI): License status, facility P&L, enforcement actions, lease/own structure
   - High (pre-close): Staffing data, Medicaid standing, DOJ/CIA status, real estate values
   - Medium (post-LOI): Cost reports, behavioral health licenses, home care licenses

CASCADIA'S ACTIVE M&A PIPELINE:
- Avamere: 29 ops, PNW, Sabra-negotiated, 90.9% confidence — GET TO LOI
- Sapphire: 20+ ops, OR/WA, $70-150M range, 78.8% confidence — ACCELERATE
- Haven Health: 23 ops, AZ, $75-175M range, 50-65% confidence — INITIATE Q2
- Ohana Ventures: 12 ops, OR/ID, ~70% confidence — MAINTAIN WARM
- Eduro: 37-41 ops, 8 states, $60-200M range, 35-45% confidence — OPPORTUNISTIC
- Diversicare: 46-50 ops, SE/Midwest, $200-350M range, ~40% confidence — RIGHT PRICE ONLY

RESPONSE FORMAT:
You MUST respond with valid JSON matching the DevResult schema. No markdown, no commentary outside JSON.
Be specific with dollar amounts, multiples, and percentages. Show your math on valuations.
Every deal gets opening bid / target / walk-away with clear rationale.

JSON SCHEMA:
{
  "brainId": "dev",
  "companyIntelligence": {
    "ownershipStructure": "<ownership description>",
    "ownershipType": "pe_backed" | "founder_operated" | "family_owned" | "reit_owned" | "public" | "nonprofit" | "unknown",
    "peExitWindow": "<PE hold period and exit timing or null>",
    "holdPeriodYears": <number or null>,
    "operatorTimeline": "<how long current operator has been running>",
    "sellerMotivation": "high" | "medium" | "low" | "unknown",
    "sellerMotivationRationale": "<why seller might or might not want to sell>",
    "ceoStatus": "<current CEO situation>",
    "recentEvents": ["<notable event 1>", "<notable event 2>"]
  },
  "valuationScenarios": {
    "bear": {
      "label": "Bear Case",
      "ebitdar": <number>,
      "ebitdarMargin": <decimal>,
      "ebitdarMultiple": <number>,
      "value": <number>,
      "perBed": <number>,
      "revenueMultiple": <decimal>,
      "assumptions": "<key bear assumptions>"
    },
    "base": { ... same shape ... },
    "bull": { ... same shape ... },
    "cascadiaNormalized": { ... same shape ... }
  },
  "dealStructure": {
    "openingBid": <number>,
    "targetPrice": <number>,
    "walkAwayCeiling": <number>,
    "revenueMultiple": { "low": <n>, "mid": <n>, "high": <n> },
    "ebitdarMultiple": { "low": <n>, "mid": <n>, "high": <n> },
    "perBedValue": { "low": <n>, "mid": <n>, "high": <n> },
    "structureNotes": "<deal structure recommendations>",
    "warranties": ["<warranty 1>", ...],
    "escrowPercent": <number>,
    "earnoutTerms": "<earnout description or null>",
    "conditionsPrecedent": ["<CP 1>", ...],
    "txStructure": "asset_purchase" | "stock_purchase" | "merger" | "management_agreement" | "unknown"
  },
  "ipoImpact": {
    "currentCascadiaOps": 58,
    "postAcquisitionOps": <number>,
    "currentCascadiaRevenue": <estimated current>,
    "postAcquisitionRevenue": <estimated combined>,
    "opsThresholdForIPO": 125,
    "revenueThresholdForIPO": 1000000000,
    "ipoReadiness": "ready" | "close" | "not_yet",
    "narrative": "<IPO impact narrative>"
  },
  "strategicFit": {
    "geographicOverlap": "<overlap description>",
    "geographicOverlapScore": <0-100>,
    "clusterPotential": "<Ensign cluster model analysis>",
    "portfolioDiversification": "<how this changes the portfolio>",
    "competitivePositioning": "<competitive dynamics>",
    "overallScore": <0-100>
  },
  "dueDiligence": [
    {
      "item": "<DD item>",
      "priority": "critical" | "high" | "medium",
      "category": "financial" | "regulatory" | "operational" | "legal" | "real_estate" | "market",
      "rationale": "<why this matters>"
    }
  ],
  "pipelineRanking": {
    "tier": 1 | 2 | 3,
    "confidenceToClose": <0-100>,
    "actionRequired": "<next step>",
    "timelineToClose": "<estimated timeline>",
    "comparedTo": "<context vs other pipeline deals>"
  },
  "strategicRisks": [
    {
      "risk": "<risk description>",
      "severity": "critical" | "high" | "medium" | "low",
      "category": "market" | "financial" | "regulatory" | "integration" | "ipo_narrative" | "competitive",
      "mitigation": "<mitigation strategy>"
    }
  ],
  "recommendation": "pursue" | "conditional" | "pass",
  "confidenceScore": <0-100>,
  "narrative": "<3-5 paragraph strategic analysis narrative>"
}`;

// =============================================================================
// BUILD DEV USER PROMPT
// =============================================================================

export function buildDevPrompt(deal: AnalysisInput): string {
  const beds = deal.beds || 'Unknown';
  const state = deal.primaryState || 'Unknown';
  const askingPrice = deal.askingPrice || 'Not disclosed';
  const assetType = deal.assetType || 'SNF';

  // Extract financial data if available
  const financials = deal.financialPeriods?.length
    ? deal.financialPeriods.map((fp: any) => ({
        period: fp.periodLabel || 'Unknown period',
        revenue: fp.totalRevenue,
        noi: fp.noi,
        ebitdar: fp.ebitdar,
        ebitdarMargin: fp.ebitdarMargin,
        occupancy: fp.occupancyRate,
        medicarePercent: fp.medicarePercentage,
        medicaidPercent: fp.medicaidPercentage,
        privatePayPercent: fp.privatePayPercentage,
      }))
    : null;

  // Extract facility data
  const facilities = deal.facilities?.length
    ? deal.facilities.map((f: any) => ({
        name: f.name,
        beds: f.beds || f.licensedBeds,
        state: f.state,
        city: f.city,
        cmsRating: f.cmsOverallRating,
        yearBuilt: f.yearBuilt,
        ownershipType: f.ownershipType,
        occupancy: f.occupancyRate,
      }))
    : null;

  const facilityCount = deal.facilities?.length || 'Unknown';

  return `DEAL FOR STRATEGIC ANALYSIS:
Name: ${deal.name}
Asset Type: ${assetType}
Total Beds: ${beds}
Primary State: ${state}
Asking Price: ${askingPrice}
Number of Facilities: ${facilityCount}
Broker: ${deal.brokerName || 'Unknown'}${deal.brokerFirm ? ` (${deal.brokerFirm})` : ''}

${facilities ? `FACILITY DATA:\n${JSON.stringify(facilities, null, 2)}` : 'No facility-level data available — estimate using market benchmarks.'}

${financials ? `FINANCIAL DATA:\n${JSON.stringify(financials, null, 2)}` : 'No financial data available — build revenue/EBITDAR estimates from facility count × market averages.'}

${deal.documents?.length ? `DOCUMENTS PROVIDED: ${deal.documents.map((d: any) => d.filename || d.type).join(', ')}` : 'No documents uploaded — use public data and market estimates.'}

STRATEGIC ANALYSIS REQUIRED:
1. COMPANY INTELLIGENCE: What do we know about the ownership, seller motivation, and timing?
2. VALUATION SCENARIOS: Build bear/base/bull/Cascadia-normalized valuations with EBITDAR multiples.
3. DEAL STRUCTURE: What should Cascadia's opening bid, target, and walk-away be? What terms?
4. IPO IMPACT: If Cascadia acquires this, what happens to the ops count and revenue scale?
5. STRATEGIC FIT: How does this fit geographically? Does it create cluster density?
6. DUE DILIGENCE: What are the critical items to verify before LOI?
7. PIPELINE RANKING: Where does this target rank vs the active pipeline?
8. STRATEGIC RISKS: What could go wrong strategically (not operationally — Newo handles that)?
9. RECOMMENDATION: pursue, conditional, or pass — with clear rationale.

Respond with valid JSON only. No markdown wrapping.`;
}

// =============================================================================
// RUN DEV BRAIN
// =============================================================================

export async function runDevBrain(
  deal: AnalysisInput,
  knowledgeContext?: string
): Promise<{ result: DevResult; latencyMs: number }> {
  const startTime = Date.now();

  // Build enriched system prompt with knowledge
  const systemPrompt = knowledgeContext
    ? `${DEV_SYSTEM_PROMPT}\n\n## STRATEGIC INTELLIGENCE FROM DEV KNOWLEDGE BASE\n\n${knowledgeContext}`
    : DEV_SYSTEM_PROMPT;

  const userPrompt = buildDevPrompt(deal);

  try {
    const router = getRouter();
    const response = await router.route({
      taskType: 'dev_analysis',
      systemPrompt,
      userPrompt,
      maxTokens: 8000,
      temperature: 0.7,
      responseFormat: 'json',
    });

    const latencyMs = Date.now() - startTime;
    const result = parseDevResponse(response.content);

    return { result, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('[Dev Brain] Analysis failed:', error);

    return {
      result: buildFallbackDevResult(deal),
      latencyMs,
    };
  }
}

// =============================================================================
// PARSE DEV RESPONSE
// =============================================================================

function parseDevResponse(content: string): DevResult {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    parsed.brainId = 'dev';
    return parsed as DevResult;
  } catch {
    console.error('[Dev Brain] Failed to parse JSON response, attempting extraction...');
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.brainId = 'dev';
      return parsed as DevResult;
    }
    throw new Error('Failed to parse Dev brain response as JSON');
  }
}

// =============================================================================
// FALLBACK RESULT
// =============================================================================

function buildFallbackDevResult(deal: AnalysisInput): DevResult {
  const beds = typeof deal.beds === 'number' ? deal.beds : 100;
  const facilityCount = deal.facilities?.length || 1;
  const estimatedRevenue = facilityCount * 9000000;
  const estimatedEbitdar = estimatedRevenue * 0.10;

  return {
    brainId: 'dev',
    companyIntelligence: {
      ownershipStructure: 'Unknown — requires further research.',
      ownershipType: 'unknown',
      peExitWindow: null,
      holdPeriodYears: null,
      operatorTimeline: 'Unknown',
      sellerMotivation: 'unknown',
      sellerMotivationRationale: 'Insufficient data to assess seller motivation.',
      ceoStatus: 'Unknown',
      recentEvents: [],
    },
    valuationScenarios: {
      bear: {
        label: 'Bear Case',
        ebitdar: estimatedEbitdar * 0.7,
        ebitdarMargin: 0.07,
        ebitdarMultiple: 4,
        value: estimatedEbitdar * 0.7 * 4,
        perBed: (estimatedEbitdar * 0.7 * 4) / beds,
        revenueMultiple: (estimatedEbitdar * 0.7 * 4) / estimatedRevenue,
        assumptions: 'Quality drag, low Medicaid rates, operational challenges.',
      },
      base: {
        label: 'Base Case',
        ebitdar: estimatedEbitdar,
        ebitdarMargin: 0.10,
        ebitdarMultiple: 5,
        value: estimatedEbitdar * 5,
        perBed: (estimatedEbitdar * 5) / beds,
        revenueMultiple: (estimatedEbitdar * 5) / estimatedRevenue,
        assumptions: 'Current industry averages, stable operations.',
      },
      bull: {
        label: 'Bull Case',
        ebitdar: estimatedEbitdar * 1.3,
        ebitdarMargin: 0.13,
        ebitdarMultiple: 6,
        value: estimatedEbitdar * 1.3 * 6,
        perBed: (estimatedEbitdar * 1.3 * 6) / beds,
        revenueMultiple: (estimatedEbitdar * 1.3 * 6) / estimatedRevenue,
        assumptions: 'Occupancy recovery, rate gains, post-PE overhead removal.',
      },
      cascadiaNormalized: {
        label: 'Cascadia Normalized',
        ebitdar: estimatedEbitdar * 1.5,
        ebitdarMargin: 0.15,
        ebitdarMultiple: 5.5,
        value: estimatedEbitdar * 1.5 * 5.5,
        perBed: (estimatedEbitdar * 1.5 * 5.5) / beds,
        revenueMultiple: (estimatedEbitdar * 1.5 * 5.5) / estimatedRevenue,
        assumptions: 'Cascadia platform: remove PE fees, optimize GPO, billing, staffing.',
      },
    },
    dealStructure: {
      openingBid: estimatedEbitdar * 4,
      targetPrice: estimatedEbitdar * 5,
      walkAwayCeiling: estimatedEbitdar * 7,
      revenueMultiple: { low: 0.4, mid: 0.55, high: 0.7 },
      ebitdarMultiple: { low: 4, mid: 5.5, high: 7 },
      perBedValue: { low: 30000, mid: 45000, high: 65000 },
      structureNotes: 'Preliminary — requires NDA data room access for refined structuring.',
      warranties: ['R&W insurance standard for transaction size'],
      escrowPercent: 10,
      earnoutTerms: null,
      conditionsPrecedent: ['License transfer approval', 'Regulatory compliance verification'],
      txStructure: 'unknown',
    },
    ipoImpact: {
      currentCascadiaOps: 58,
      postAcquisitionOps: 58 + facilityCount,
      currentCascadiaRevenue: 500000000,
      postAcquisitionRevenue: 500000000 + estimatedRevenue,
      opsThresholdForIPO: 125,
      revenueThresholdForIPO: 1000000000,
      ipoReadiness: (58 + facilityCount) >= 100 ? 'close' : 'not_yet',
      narrative: `Adding ${facilityCount} operations takes Cascadia from 58 to ${58 + facilityCount} operations.`,
    },
    strategicFit: {
      geographicOverlap: 'Requires geographic analysis.',
      geographicOverlapScore: 50,
      clusterPotential: 'Unknown — need facility locations.',
      portfolioDiversification: 'Pending analysis.',
      competitivePositioning: 'Pending analysis.',
      overallScore: 50,
    },
    dueDiligence: [
      { item: 'Facility-level P&L (24-month trailing)', priority: 'critical', category: 'financial', rationale: 'Required for accurate valuation.' },
      { item: 'License and enforcement status', priority: 'critical', category: 'regulatory', rationale: 'Must confirm all licenses active and unrestricted.' },
      { item: 'Lease vs. own structure', priority: 'critical', category: 'real_estate', rationale: 'Determines deal structure and REIT monetization potential.' },
    ],
    pipelineRanking: {
      tier: 3,
      confidenceToClose: 25,
      actionRequired: 'Gather more data before advancing.',
      timelineToClose: 'Unknown',
      comparedTo: 'Insufficient data to rank against active pipeline.',
    },
    strategicRisks: [{
      risk: 'Insufficient data for complete strategic risk assessment.',
      severity: 'medium',
      category: 'market',
      mitigation: 'Request NDA and data room access.',
    }],
    recommendation: 'conditional',
    confidenceScore: 25,
    narrative: 'Dev was unable to complete a full strategic analysis due to limited data. Request NDA and data room access to provide a complete deal intelligence report with refined valuations and deal structure.',
  };
}
