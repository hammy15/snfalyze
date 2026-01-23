import Anthropic from '@anthropic-ai/sdk';
import { CASCADIA_SYSTEM_PROMPT, ANALYSIS_PROMPT_TEMPLATE } from './prompts';
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
  financials: any[];
  valuations: any[];
  assumptions: any[];
  riskFactors: any[];
  partnerMatches: any[];
  criticalQuestions: {
    whatMustGoRightFirst: string[];
    whatCannotGoWrong: string[];
    whatBreaksThisDeal: string[];
    whatRiskIsUnderpriced: string[];
  };
}

export async function analyzeDeal(deal: AnalysisInput): Promise<AnalysisResult> {
  // Build the analysis prompt with deal data
  const prompt = buildAnalysisPrompt(deal);

  try {
    // Call Claude API
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

    // Extract text content from response
    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in response');
    }

    // Parse the structured response
    const analysisResult = parseAnalysisResponse(textContent.text);

    return analysisResult;
  } catch (error) {
    console.error('AI Analysis Error:', error);
    throw error;
  }
}

function buildAnalysisPrompt(deal: AnalysisInput): string {
  // Build a comprehensive prompt with all deal data
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
  // Parse the JSON response from Claude
  // The response should be structured JSON based on our prompt

  try {
    // Try to extract JSON from the response
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try parsing the whole response as JSON
    return JSON.parse(responseText);
  } catch {
    // If parsing fails, construct a basic result from the text
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

// Function to run valuation models
export function runDualValuation(
  financials: any,
  assetType: string,
  state: string,
  beds: number
): { external: any; cascadia: any } {
  // External / Lender View - Conservative
  const externalCapRates = getMarketCapRates(assetType, state, 'external');
  const externalNoi = financials.noi || 0;

  const external = {
    viewType: 'external',
    noiUsed: externalNoi,
    capRateLow: externalCapRates.high,
    capRateBase: externalCapRates.base,
    capRateHigh: externalCapRates.low,
    valueLow: externalNoi / externalCapRates.high,
    valueBase: externalNoi / externalCapRates.base,
    valueHigh: externalNoi / externalCapRates.low,
    pricePerBed: (externalNoi / externalCapRates.base) / beds,
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
    valueLow: cascadiaNoi / cascadiaCapRates.high,
    valueBase: cascadiaNoi / cascadiaCapRates.base,
    valueHigh: cascadiaNoi / cascadiaCapRates.low,
    pricePerBed: (cascadiaNoi / cascadiaCapRates.base) / beds,
  };

  return { external, cascadia };
}

function getMarketCapRates(
  assetType: string,
  state: string,
  view: 'external' | 'cascadia'
): { low: number; base: number; high: number } {
  // SNF cap rates from Artifact A
  const snfExternal = { low: 0.12, base: 0.125, high: 0.14 };
  const snfCascadia = { low: 0.105, base: 0.11, high: 0.12 };

  // ALF cap rates (generally tighter)
  const alfExternal = { low: 0.08, base: 0.085, high: 0.10 };
  const alfCascadia = { low: 0.07, base: 0.075, high: 0.085 };

  // ILF cap rates (hospitality-forward)
  const ilfExternal = { low: 0.065, base: 0.07, high: 0.08 };
  const ilfCascadia = { low: 0.055, base: 0.06, high: 0.07 };

  if (assetType === 'SNF') {
    return view === 'external' ? snfExternal : snfCascadia;
  } else if (assetType === 'ALF') {
    return view === 'external' ? alfExternal : alfCascadia;
  } else {
    return view === 'external' ? ilfExternal : ilfCascadia;
  }
}

// Function to calculate CapEx requirements
export function calculateCapEx(
  assetType: string,
  beds: number,
  yearBuilt: number,
  lastRenovation?: number
): { immediate: number; deferred: number; competitive: number; total: number; perBed: number } {
  const currentYear = new Date().getFullYear();
  const buildingAge = currentYear - yearBuilt;
  const yearsSinceReno = lastRenovation ? currentYear - lastRenovation : buildingAge;

  // Per-bed benchmarks from Artifact A
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
    competitivePerBed = 5000; // Private room conversions, etc.
  } else if (assetType === 'ALF') {
    competitivePerBed = 4000;
  } else {
    competitivePerBed = 6000; // ILF requires more hospitality upgrades
  }

  const immediate = immediatePerBed * beds;
  const deferred = deferredPerBed * beds;
  const competitive = competitivePerBed * beds;
  const total = immediate + deferred + competitive;
  const perBed = total / beds;

  return { immediate, deferred, competitive, total, perBed };
}

// Function to simulate capital partner matches
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

    // Risk tolerance assessment
    const dealRisk = assessDealRisk(deal);
    if (partner.riskTolerance === 'aggressive' ||
        (partner.riskTolerance === 'moderate' && dealRisk !== 'high') ||
        (partner.riskTolerance === 'conservative' && dealRisk === 'low')) {
      strengths.push('Risk profile aligned');
    } else {
      matchScore -= 15;
      concerns.push('Risk profile mismatch');
    }

    // Calculate probability of close
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
  // Simple risk assessment based on available data
  let riskScore = 0;

  if (deal.assetType === 'SNF') riskScore += 2;
  if (!deal.financialPeriods?.length) riskScore += 3;

  // Check for regulatory issues
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
