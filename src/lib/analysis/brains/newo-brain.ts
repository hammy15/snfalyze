// =============================================================================
// NEWO BRAIN — Left Brain: Operations & Institutional Knowledge
//
// Newo is Cascadia's operational intelligence engine. 500+ transaction memory,
// institutional knowledge from the OpenClaw bot, and deep expertise in staffing,
// quality remediation, reimbursement optimization, and platform synergies.
//
// Newo answers: "Can Cascadia actually run this? What will it really cost?"
// =============================================================================

import { getRouter } from '@/lib/ai';
import type { AnalysisInput } from '../engine';
import type { NewoResult } from './types';

// =============================================================================
// NEWO SYSTEM PROMPT
// =============================================================================

export const NEWO_SYSTEM_PROMPT = `You are NEWO — Cascadia Healthcare's institutional operations intelligence.

You have the memory of 500+ healthcare transactions and Cascadia's complete operational playbook.
You are the experienced operator who has walked every hallway, read every survey, and knows exactly
what it takes to turn a struggling facility into a performing asset. You are cautious, detail-oriented,
and you know where the bodies are buried.

YOUR IDENTITY:
- You are the LEFT BRAIN of SNFalyze — the operations and institutional knowledge side
- You work alongside DEV (the right brain — strategic/financial) on every analysis
- Your job is operational truth: staffing reality, quality remediation costs, platform synergies
- You never sugarcoat. If a facility is a staffing nightmare, you say so with numbers.

YOUR EXPERTISE:
1. STAFFING & LABOR: You know exact HPPD benchmarks, agency dependency costs, labor market tightness
   by region, turnover rates, and what it costs to normalize staffing to Cascadia standards.
   National avg: 3.9 HPPD total nursing, 46.4% turnover. Cascadia target: 4.0+ HPPD, <40% turnover.

2. QUALITY REMEDIATION: You know CMS survey patterns, deficiency rates (national avg: 0.7 serious),
   SFF candidate thresholds, Immediate Jeopardy resolution timelines, and the cost to fix quality.
   You can estimate remediation cost per facility and timeline to reach national average.

3. CASCADIA PLATFORM UPSIDE: When Cascadia acquires, you know the synergies:
   - Management fee elimination: PE operators charge 4-6% mgmt fees. Cascadia self-manages.
   - GPO purchasing power: 58 facilities = bulk pricing on supplies, food, pharmacy (~3-5% savings)
   - Billing optimization: Cascadia's billing platform captures 2-4% more revenue through PDPM coding
   - Referral network: Cascadia's hospital relationships drive census in new markets
   - Staffing platform: Centralized recruiting reduces agency dependency 30-50% in Year 1
   Typical SNF platform migration: 200-400bps EBITDAR margin improvement within 24 months.

4. REIMBURSEMENT OPTIMIZATION: You know PDPM optimization gaps (10-15% upside for most operators),
   quality bonus revenue ($4.5-13.5K/bed for 4-5 star facilities), state supplemental programs
   (TX LTCQIP, CA QAF, WA EARC, OR Medicaid, ID Medicaid, etc.), and Medicare Advantage contract rates.

5. REGIONAL MARKET INTELLIGENCE: You know every state Cascadia operates in (ID, OR, WA, MT, AZ, NM)
   and adjacent markets. Labor costs, Medicaid rates, survey body behavior, CON requirements,
   staffing pool depth, hospital referral patterns.

CASCADIA'S CURRENT PORTFOLIO:
- 58 operations across 6 states (ID, OR, WA, MT, AZ, NM)
- Mix: SNF (primary), ALF (Olympus brand), hospice
- Estimated revenue: ~$410-550M
- Operational playbook: quality-first, staffing-first, reimbursement optimization
- IPO target: 120-130+ operations

VALUATION BENCHMARKS (for operational context only — Dev handles deal pricing):
- SNF-Owned: EBITDAR / 12.5% cap rate (Cascadia view) or 14% (lender/external view)
- Leased: EBIT × 2.5x (Cascadia) or 2.0x (lender)
- ALF cap rates: 6.5-7.5% nationally
- Operating benchmarks: 75-90% occupancy healthy, 50-65% labor cost, <5% agency healthy

RESPONSE FORMAT:
You MUST respond with valid JSON matching the NewoResult schema. No markdown, no commentary outside JSON.
Be specific with dollar amounts, percentages, and timelines. Never hedge with "it depends" — give
your best estimate with the data available, and flag uncertainty in confidence scores.

JSON SCHEMA:
{
  "brainId": "newo",
  "operationalViability": {
    "score": <0-100>,
    "assessment": "<2-3 sentence operational viability assessment>",
    "staffingFeasibility": "<can Cascadia staff this? labor market reality>",
    "censusProjection": "<census trajectory assessment — improving, stable, declining>",
    "agencyEliminationTimeline": "<months to eliminate agency dependency>"
  },
  "qualityRemediation": {
    "currentState": "<current quality profile summary>",
    "targetState": "<target quality within 24 months>",
    "annualCostEstimate": <dollar amount>,
    "timelineMonths": <number>,
    "keyActions": ["<action 1>", "<action 2>", ...],
    "deficiencyRate": <number or null>,
    "nationalAvgDeficiencyRate": 0.7
  },
  "staffingAnalysis": {
    "currentHPPD": <number or null>,
    "targetHPPD": <number>,
    "currentAgencyPercent": <number or null>,
    "annualStaffingCostDelta": <additional annual cost to normalize>,
    "laborMarketAssessment": "<tight, moderate, or favorable + context>",
    "wageGapToMarket": "<above, at, or below market + delta>",
    "turnoverRate": <number or null>,
    "nationalAvgTurnover": 46.4
  },
  "platformUpside": {
    "managementFeeReduction": <annual savings>,
    "purchasingPowerSavings": <annual savings>,
    "referralNetworkImpact": "<description of referral/census impact>",
    "billingOptimization": <annual revenue uplift>,
    "totalAnnualSynergies": <total>,
    "timelineToRealize": "<months to full realization>"
  },
  "reimbursementUpside": {
    "pdpmGapPercent": <estimated gap %>,
    "pdpmAnnualUpside": <dollar amount>,
    "qualityBonusPerBed": <dollar amount>,
    "qualityBonusTotal": <dollar amount>,
    "stateProgram": "<state program name or null>",
    "stateProgramUpside": <dollar amount>,
    "totalAnnualUpside": <total>,
    "implementationMonths": <number>,
    "confidence": "high" | "medium" | "low"
  },
  "operationalRisks": [
    {
      "risk": "<risk description>",
      "severity": "critical" | "high" | "medium" | "low",
      "mitigationCost": <dollar amount>,
      "mitigationTimeline": "<timeline>",
      "cascadiaCanFix": <boolean>
    }
  ],
  "recommendation": "pursue" | "conditional" | "pass",
  "confidenceScore": <0-100>,
  "narrative": "<3-5 paragraph operational assessment narrative>"
}`;

// =============================================================================
// BUILD NEWO USER PROMPT
// =============================================================================

export function buildNewoPrompt(deal: AnalysisInput): string {
  const beds = deal.beds || 'Unknown';
  const state = deal.primaryState || 'Unknown';
  const askingPrice = deal.askingPrice || 'Not disclosed';
  const assetType = deal.assetType || 'SNF';

  // Extract financial data if available
  const financials = deal.financialPeriods?.length
    ? deal.financialPeriods.map((fp: any) => ({
        period: fp.periodLabel || 'Unknown period',
        revenue: fp.totalRevenue,
        laborCost: fp.laborCost,
        noi: fp.noi,
        ebitdar: fp.ebitdar,
        occupancy: fp.occupancyRate,
        agencyPercent: fp.agencyPercentage,
      }))
    : null;

  // Extract facility data
  const facilities = deal.facilities?.length
    ? deal.facilities.map((f: any) => ({
        name: f.name,
        beds: f.beds || f.licensedBeds,
        state: f.state,
        cmsRating: f.cmsOverallRating,
        hppd: f.totalNursingHPPD,
        deficiencies: f.totalDeficiencies,
        occupancy: f.occupancyRate,
      }))
    : null;

  return `DEAL FOR OPERATIONAL ASSESSMENT:
Name: ${deal.name}
Asset Type: ${assetType}
Total Beds: ${beds}
Primary State: ${state}
Asking Price: ${askingPrice}
Number of Facilities: ${deal.facilities?.length || 'Unknown'}

${facilities ? `FACILITY DATA:\n${JSON.stringify(facilities, null, 2)}` : 'No facility-level data available.'}

${financials ? `FINANCIAL DATA:\n${JSON.stringify(financials, null, 2)}` : 'No financial data available — estimate based on market benchmarks.'}

${deal.documents?.length ? `DOCUMENTS PROVIDED: ${deal.documents.map((d: any) => d.filename || d.type).join(', ')}` : 'No documents uploaded.'}

ANALYZE THIS DEAL FROM AN OPERATIONAL PERSPECTIVE:
1. Can Cascadia run this? Assess staffing feasibility for ${state}.
2. What is the quality remediation cost and timeline?
3. What are the true staffing costs to normalize to Cascadia standards?
4. What platform synergies does Cascadia bring (mgmt fees, GPO, billing, referrals)?
5. What reimbursement optimization is available in ${state}?
6. What are the operational risks that could derail this deal?
7. Give your honest operational recommendation: pursue, conditional, or pass.

Respond with valid JSON only. No markdown wrapping.`;
}

// =============================================================================
// RUN NEWO BRAIN
// =============================================================================

export async function runNewoBrain(
  deal: AnalysisInput,
  knowledgeContext?: string
): Promise<{ result: NewoResult; latencyMs: number }> {
  const startTime = Date.now();

  // Build enriched system prompt with knowledge
  const systemPrompt = knowledgeContext
    ? `${NEWO_SYSTEM_PROMPT}\n\n## INSTITUTIONAL INTELLIGENCE FROM NEWO KNOWLEDGE BASE\n\n${knowledgeContext}`
    : NEWO_SYSTEM_PROMPT;

  const userPrompt = buildNewoPrompt(deal);

  try {
    const router = getRouter();
    const response = await router.route({
      taskType: 'newo_analysis',
      systemPrompt,
      userPrompt,
      maxTokens: 8000,
      temperature: 0.7,
      responseFormat: 'json',
    });

    const latencyMs = Date.now() - startTime;
    const result = parseNewoResponse(response.content);

    return { result, latencyMs };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.error('[Newo Brain] Analysis failed:', error);

    // Return a degraded result rather than throwing
    return {
      result: buildFallbackNewoResult(deal),
      latencyMs,
    };
  }
}

// =============================================================================
// PARSE NEWO RESPONSE
// =============================================================================

function parseNewoResponse(content: string): NewoResult {
  // Strip markdown code blocks if present
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    const parsed = JSON.parse(cleaned);
    // Ensure brainId is set
    parsed.brainId = 'newo';
    return parsed as NewoResult;
  } catch {
    console.error('[Newo Brain] Failed to parse JSON response, attempting extraction...');
    // Try to find JSON in the response
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      parsed.brainId = 'newo';
      return parsed as NewoResult;
    }
    throw new Error('Failed to parse Newo brain response as JSON');
  }
}

// =============================================================================
// FALLBACK RESULT
// =============================================================================

function buildFallbackNewoResult(deal: AnalysisInput): NewoResult {
  const beds = typeof deal.beds === 'number' ? deal.beds : 100;
  return {
    brainId: 'newo',
    operationalViability: {
      score: 50,
      assessment: 'Unable to complete full operational assessment. Insufficient data or analysis error.',
      staffingFeasibility: 'Requires further investigation.',
      censusProjection: 'Unknown — need facility-level census data.',
      agencyEliminationTimeline: '12-18 months typical for Cascadia transitions.',
    },
    qualityRemediation: {
      currentState: 'Unknown — CMS data not available.',
      targetState: 'National average (0.7 serious deficiencies) within 24 months.',
      annualCostEstimate: beds * 5000,
      timelineMonths: 24,
      keyActions: ['Pull CMS survey data', 'Assess staffing levels', 'Review deficiency history'],
      deficiencyRate: null,
      nationalAvgDeficiencyRate: 0.7,
    },
    staffingAnalysis: {
      currentHPPD: null,
      targetHPPD: 4.0,
      currentAgencyPercent: null,
      annualStaffingCostDelta: 0,
      laborMarketAssessment: 'Requires state-level labor market analysis.',
      wageGapToMarket: 'Unknown — need wage data.',
      turnoverRate: null,
      nationalAvgTurnover: 46.4,
    },
    platformUpside: {
      managementFeeReduction: 0,
      purchasingPowerSavings: 0,
      referralNetworkImpact: 'Pending analysis.',
      billingOptimization: 0,
      totalAnnualSynergies: 0,
      timelineToRealize: '12-24 months',
    },
    reimbursementUpside: {
      pdpmGapPercent: 0,
      pdpmAnnualUpside: 0,
      qualityBonusPerBed: 0,
      qualityBonusTotal: 0,
      stateProgram: null,
      stateProgramUpside: 0,
      totalAnnualUpside: 0,
      implementationMonths: 12,
      confidence: 'low',
    },
    operationalRisks: [{
      risk: 'Insufficient data for complete operational risk assessment.',
      severity: 'medium',
      mitigationCost: 0,
      mitigationTimeline: 'Pending NDA data room access.',
      cascadiaCanFix: true,
    }],
    recommendation: 'conditional',
    confidenceScore: 25,
    narrative: 'Newo was unable to complete a full operational assessment due to limited data. Request NDA and data room access to provide a complete operational viability analysis.',
  };
}
