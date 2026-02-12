import Anthropic from '@anthropic-ai/sdk';
import { CASCADIA_SYSTEM_PROMPT, ANALYSIS_PROMPT_TEMPLATE, getStateMarketData } from './prompts';
import { calculateConfidenceDecay } from '@/lib/utils';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export interface AnalysisInput {
  id: string;
  name: string;
  assetType: string;
  beds?: number | null;
  primaryState?: string | null;
  askingPrice?: number | string | null;
  brokerName?: string | null;
  brokerFirm?: string | null;
  facilities: any[];
  documents?: any[];
  financialPeriods?: any[];
}

export interface AnalysisResult {
  confidenceScore: number;
  narrative: string;
  thesis: string;
  marketContext?: {
    marketTier: string;
    regionalCapRateRange: string;
    regionalPerBedRange: string;
    comparableDeals: string;
  };
  financials: any[];
  valuations: any[];
  assumptions: any[];
  riskFactors: any[];
  partnerMatches: any[];
  selfValidation?: {
    weakestAssumption: string;
    sellerManipulationRisk: string;
    recessionStressTest: string;
    coverageUnderStress: string;
  };
  criticalQuestions: {
    whatMustGoRightFirst: string[];
    whatCannotGoWrong: string[];
    whatBreaksThisDeal: string[];
    whatRiskIsUnderpriced: string[];
  };
}

export async function analyzeDeal(deal: AnalysisInput): Promise<AnalysisResult> {
  const prompt = buildAnalysisPrompt(deal);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: CASCADIA_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    const analysisResult = parseAnalysisResponse(textContent.text);
    return analysisResult;
  } catch (error) {
    console.error('AI Analysis Error:', error);
    throw error;
  }
}

function buildAnalysisPrompt(deal: AnalysisInput): string {
  const docs = deal.documents || [];
  const documentSummary = docs.length > 0
    ? docs.map((d) => `- ${d.filename} (${d.type || 'unclassified'}): ${d.status}`).join('\n')
    : 'No documents uploaded';

  const financials = deal.financialPeriods || [];
  const financialSummary = financials.length > 0
    ? financials.map((fp) => `
Period: ${fp.periodStart} to ${fp.periodEnd}
Revenue: $${fp.totalRevenue?.toLocaleString() || 'Unknown'}
Labor Cost: $${fp.laborCost?.toLocaleString() || 'Unknown'}
NOI: $${fp.noi?.toLocaleString() || 'Unknown'}
Occupancy: ${fp.occupancyRate ? (fp.occupancyRate * 100).toFixed(1) + '%' : 'Unknown'}
`).join('\n')
    : 'No financial data extracted yet.';

  const askingPriceStr = deal.askingPrice
    ? typeof deal.askingPrice === 'number'
      ? deal.askingPrice.toLocaleString()
      : deal.askingPrice
    : 'Not disclosed';

  return ANALYSIS_PROMPT_TEMPLATE
    .replace('__DEAL_NAME__', deal.name)
    .replace('__ASSET_TYPE__', deal.assetType)
    .replace('__BEDS__', deal.beds?.toString() || 'Unknown')
    .replace('__STATE__', deal.primaryState || 'Unknown')
    .replace('__ASKING_PRICE__', askingPriceStr)
    .replace('__BROKER__', deal.brokerName || 'Unknown')
    .replace('__BROKER_FIRM__', deal.brokerFirm || 'Unknown')
    .replace('__DOCUMENTS__', documentSummary)
    .replace('__FINANCIALS__', financialSummary);
}

function parseAnalysisResponse(responseText: string): AnalysisResult {
  try {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try parsing the whole response as JSON
    return JSON.parse(responseText);
  } catch {
    console.warn('Failed to parse JSON response, constructing basic result');

    return {
      confidenceScore: 50,
      narrative: responseText.slice(0, 500),
      thesis: 'Analysis complete - review narrative for details.',
      financials: [],
      valuations: [
        {
          viewType: 'external',
          valueLow: 0,
          valueBase: 0,
          valueHigh: 0,
          confidenceScore: 50,
          confidenceNarrative: 'Insufficient data for confident valuation.',
        },
        {
          viewType: 'cascadia',
          valueLow: 0,
          valueBase: 0,
          valueHigh: 0,
          confidenceScore: 50,
          confidenceNarrative: 'Insufficient data for confident valuation.',
        },
      ],
      assumptions: [],
      riskFactors: [],
      partnerMatches: [],
      criticalQuestions: {
        whatMustGoRightFirst: ['Complete financial data extraction required'],
        whatCannotGoWrong: ['Data quality must be verified'],
        whatBreaksThisDeal: ['Insufficient data for analysis'],
        whatRiskIsUnderpriced: ['Unknown - requires more data'],
      },
    };
  }
}

// National cap rate lookup by asset type (flat across geography)
export function getMarketCapRates(
  assetType: string,
  state: string,
  view: 'external' | 'cascadia'
): { low: number; base: number; high: number } {
  // Cap rates are consistent nationally by asset type, not geography
  // External = conservative lender/REIT view
  // Cascadia = execution view with operational upside priced in
  const capRates: Record<string, { external: { low: number; base: number; high: number }; cascadia: { low: number; base: number; high: number } }> = {
    SNF: {
      external: { low: 0.12, base: 0.125, high: 0.13 },
      cascadia: { low: 0.105, base: 0.115, high: 0.125 },
    },
    ALF: {
      external: { low: 0.065, base: 0.07, high: 0.075 },
      cascadia: { low: 0.06, base: 0.065, high: 0.07 },
    },
    ILF: {
      external: { low: 0.055, base: 0.06, high: 0.065 },
      cascadia: { low: 0.05, base: 0.055, high: 0.06 },
    },
    HOSPICE: {
      external: { low: 0.10, base: 0.105, high: 0.11 },
      cascadia: { low: 0.09, base: 0.095, high: 0.10 },
    },
  };

  const type = assetType?.toUpperCase() || 'SNF';
  const assetData = capRates[type] || capRates['SNF'];

  return view === 'external' ? assetData.external : assetData.cascadia;
}

// Dual valuation with geography awareness
export function runDualValuation(
  financials: any,
  assetType: string,
  state: string,
  beds: number
): { external: any; cascadia: any } {
  const marketData = getStateMarketData(state);

  // External / Lender View - Conservative
  const externalCapRates = getMarketCapRates(assetType, state, 'external');
  const externalNoi = financials.noi || 0;

  const external = {
    viewType: 'external',
    noiUsed: externalNoi,
    capRateLow: externalCapRates.high,    // higher cap = lower value
    capRateBase: externalCapRates.base,
    capRateHigh: externalCapRates.low,    // lower cap = higher value
    valueLow: externalCapRates.high > 0 ? externalNoi / externalCapRates.high : 0,
    valueBase: externalCapRates.base > 0 ? externalNoi / externalCapRates.base : 0,
    valueHigh: externalCapRates.low > 0 ? externalNoi / externalCapRates.low : 0,
    pricePerBed: beds > 0 && externalCapRates.base > 0 ? (externalNoi / externalCapRates.base) / beds : 0,
    marketTier: marketData.tier,
    regionalPerBedRange: marketData.perBedRange,
  };

  // Cascadia Execution View - Opportunity-aware
  const cascadiaCapRates = getMarketCapRates(assetType, state, 'cascadia');
  const cascadiaNoi = financials.normalizedNoi || financials.noi || 0;

  const cascadia = {
    viewType: 'cascadia',
    noiUsed: cascadiaNoi,
    capRateLow: cascadiaCapRates.high,
    capRateBase: cascadiaCapRates.base,
    capRateHigh: cascadiaCapRates.low,
    valueLow: cascadiaCapRates.high > 0 ? cascadiaNoi / cascadiaCapRates.high : 0,
    valueBase: cascadiaCapRates.base > 0 ? cascadiaNoi / cascadiaCapRates.base : 0,
    valueHigh: cascadiaCapRates.low > 0 ? cascadiaNoi / cascadiaCapRates.low : 0,
    pricePerBed: beds > 0 && cascadiaCapRates.base > 0 ? (cascadiaNoi / cascadiaCapRates.base) / beds : 0,
    marketTier: marketData.tier,
    regionalPerBedRange: marketData.perBedRange,
  };

  return { external, cascadia };
}

// CapEx calculation with regional awareness
export function calculateCapEx(
  assetType: string,
  beds: number,
  yearBuilt: number,
  lastRenovation?: number
): { immediate: number; deferred: number; competitive: number; total: number; perBed: number } {
  const currentYear = new Date().getFullYear();
  const buildingAge = currentYear - yearBuilt;
  const yearsSinceReno = lastRenovation ? currentYear - lastRenovation : buildingAge;

  let immediatePerBed = 0;
  let deferredPerBed = 0;
  let competitivePerBed = 0;

  // Immediate CapEx (life safety, survey-driven)
  if (yearsSinceReno > 15) {
    immediatePerBed = 2000;
  } else if (yearsSinceReno > 10) {
    immediatePerBed = 1000;
  }

  // Deferred CapEx (systems, roofs, infrastructure)
  if (buildingAge > 30) {
    deferredPerBed = 8000;
  } else if (buildingAge > 20) {
    deferredPerBed = 5000;
  } else if (buildingAge > 10) {
    deferredPerBed = 3000;
  }

  // Competitive CapEx (market positioning)
  if (assetType === 'SNF') {
    competitivePerBed = 5000;
  } else if (assetType === 'ALF') {
    competitivePerBed = 4000;
  } else {
    competitivePerBed = 6000;
  }

  const immediate = immediatePerBed * beds;
  const deferred = deferredPerBed * beds;
  const competitive = competitivePerBed * beds;
  const total = immediate + deferred + competitive;
  const perBed = beds > 0 ? total / beds : 0;

  return { immediate, deferred, competitive, total, perBed };
}

// Partner matching with real buyer intelligence
export function simulatePartnerMatches(
  deal: any,
  partners: any[]
): any[] {
  return partners.map((partner) => {
    let matchScore = 100;
    const concerns: string[] = [];
    const strengths: string[] = [];

    // Geography match
    if (partner.geographies?.includes(deal.primaryState)) {
      strengths.push('Core geography');
    } else {
      matchScore -= 15;
      concerns.push('Outside core geography');
    }

    // Asset type match
    if (partner.assetTypes?.includes(deal.assetType)) {
      strengths.push('Target asset class');
    } else {
      matchScore -= 25;
      concerns.push('Non-target asset class');
    }

    // Deal size match
    const dealValue = deal.askingPrice || 0;
    if (dealValue >= partner.minDealSize && dealValue <= partner.maxDealSize) {
      strengths.push('Within deal size parameters');
    } else if (dealValue < partner.minDealSize) {
      matchScore -= 20;
      concerns.push('Below minimum deal size');
    } else {
      matchScore -= 10;
      concerns.push('Above typical deal size');
    }

    // Risk tolerance
    const dealRisk = assessDealRisk(deal);
    if (partner.riskTolerance === 'aggressive' ||
        (partner.riskTolerance === 'moderate' && dealRisk !== 'high') ||
        (partner.riskTolerance === 'conservative' && dealRisk === 'low')) {
      strengths.push('Risk profile aligned');
    } else {
      matchScore -= 15;
      concerns.push('Risk profile mismatch');
    }

    const probabilityOfClose = Math.min(matchScore / 100, 0.95);

    return {
      partnerId: partner.id,
      matchScore: Math.max(matchScore, 0),
      expectedYield: partner.targetYield,
      probabilityOfClose,
      concerns,
      strengths,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

function assessDealRisk(deal: any): 'low' | 'medium' | 'high' {
  let riskScore = 0;

  if (deal.assetType === 'SNF') riskScore += 2;
  if (!deal.financialPeriods?.length) riskScore += 3;

  const facilities = deal.facilities || [];
  for (const facility of facilities) {
    if (facility.isSff) riskScore += 5;
    if (facility.hasImmediateJeopardy) riskScore += 5;
    if (facility.cmsRating && facility.cmsRating <= 2) riskScore += 2;
  }

  if (riskScore >= 7) return 'high';
  if (riskScore >= 4) return 'medium';
  return 'low';
}
