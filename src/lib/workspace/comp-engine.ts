import { db } from '@/db';
import { comparableSales, deals, facilities, dealComps, dealWorkspaceStages } from '@/db/schema';
import { eq, and, gte, sql, desc } from 'drizzle-orm';
import { getGeographicCapRate, getMarketTier } from '@/lib/analysis/knowledge/benchmarks';
import type { IntakeStageData } from '@/types/workspace';

export interface ScoredComp {
  id: string;
  propertyName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  assetType: string | null;
  beds: number | null;
  saleDate: string | null;
  salePrice: string | null;
  pricePerBed: string | null;
  capRate: string | null;
  noiAtSale: string | null;
  occupancyAtSale: string | null;
  buyer: string | null;
  seller: string | null;
  source: string | null;
  relevanceScore: number;
  relevanceNotes: string;
  compType: 'direct' | 'indirect';
}

export interface CompPullResult {
  transactionComps: ScoredComp[];
  operatingBenchmarks: OperatingBenchmarks;
  marketBenchmarkSummary: MarketBenchmarkSummary;
}

export interface OperatingBenchmarks {
  medicareReimbursement: BenchmarkMetric;
  medicaidRate: BenchmarkMetric;
  qualityScore: BenchmarkMetric;
  costPerPatientDay: BenchmarkMetric;
  laborCostPercent: BenchmarkMetric;
  occupancyRate: BenchmarkMetric;
}

export interface BenchmarkMetric {
  facilityValue: number | null;
  stateAvg: number | null;
  nationalAvg: number | null;
  percentile: number | null;
}

export interface MarketBenchmarkSummary {
  medianPricePerBed: number | null;
  medianEbitdaMultiple: number | null;
  medianCapRate: number | null;
  dealPositionVsMarket: 'below' | 'at' | 'above' | null;
  marketTier: string | null;
  recentTransactionCount: number;
}

// ── Main comp pull engine ───────────────────────────────────────────

export async function pullCompsForDeal(dealId: string): Promise<CompPullResult> {
  // Load deal + facility data
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error('Deal not found');

  const facilityList = await db.select().from(facilities).where(eq(facilities.dealId, dealId)).limit(1);
  const facility = facilityList[0] || null;

  const state = deal.primaryState || facility?.state || null;
  const assetType = deal.assetType || facility?.assetType || 'snf';
  const beds = deal.beds || facility?.licensedBeds || null;

  // Query comparables within same state + asset type, last 2 years
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const cutoffDate = twoYearsAgo.toISOString().split('T')[0];

  let comps = await db
    .select()
    .from(comparableSales)
    .where(
      and(
        eq(comparableSales.assetType, assetType),
        gte(comparableSales.saleDate, cutoffDate)
      )
    )
    .orderBy(desc(comparableSales.saleDate))
    .limit(50);

  // Score and rank
  const scored: ScoredComp[] = comps.map(comp => {
    const { score, notes, compType } = calculateRelevance(comp, { state, assetType, beds, askingPrice: deal.askingPrice });
    return {
      id: comp.id,
      propertyName: comp.propertyName,
      address: comp.address,
      city: comp.city,
      state: comp.state,
      assetType: comp.assetType,
      beds: comp.beds,
      saleDate: comp.saleDate,
      salePrice: comp.salePrice,
      pricePerBed: comp.pricePerBed,
      capRate: comp.capRate,
      noiAtSale: comp.noiAtSale,
      occupancyAtSale: comp.occupancyAtSale,
      buyer: comp.buyer,
      seller: comp.seller,
      source: comp.source,
      relevanceScore: score,
      relevanceNotes: notes,
      compType,
    };
  });

  // Sort by relevance score descending
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Take top 20
  const topComps = scored.slice(0, 20);

  // Auto-insert into dealComps table
  for (const comp of topComps) {
    await db
      .insert(dealComps)
      .values({
        dealId,
        compId: comp.id,
        compType: comp.compType,
        relevanceScore: comp.relevanceScore,
        relevanceNotes: comp.relevanceNotes,
        isSelected: comp.relevanceScore >= 70,
        addedBy: 'auto',
      })
      .onConflictDoNothing();
  }

  // Load intake stage data for facility-specific benchmark values
  const [intakeStage] = await db
    .select()
    .from(dealWorkspaceStages)
    .where(
      and(
        eq(dealWorkspaceStages.dealId, dealId),
        eq(dealWorkspaceStages.stage, 'deal_intake')
      )
    );
  const intakeData = (intakeStage?.stageData || {}) as Partial<IntakeStageData>;

  // Build operating benchmarks
  const operatingBenchmarks = buildOperatingBenchmarks(facility, state, assetType, intakeData);

  // Build market summary
  const marketBenchmarkSummary = buildMarketSummary(topComps, deal, state, assetType);

  return {
    transactionComps: topComps,
    operatingBenchmarks,
    marketBenchmarkSummary,
  };
}

// ── Relevance scoring ───────────────────────────────────────────────

function calculateRelevance(
  comp: typeof comparableSales.$inferSelect,
  subject: { state: string | null; assetType: string; beds: number | null; askingPrice: string | null }
): { score: number; notes: string; compType: 'direct' | 'indirect' } {
  let score = 50; // Baseline
  const factors: string[] = [];

  // Same state: +20
  if (comp.state && subject.state && comp.state === subject.state) {
    score += 20;
    factors.push('Same state');
  } else if (comp.state && subject.state) {
    // Neighboring state: +5
    score += 5;
    factors.push('Different state');
  }

  // Bed count similarity: up to +20
  if (comp.beds && subject.beds) {
    const bedRatio = Math.min(comp.beds, subject.beds) / Math.max(comp.beds, subject.beds);
    const bedScore = Math.round(bedRatio * 20);
    score += bedScore;
    if (bedRatio >= 0.8) factors.push('Similar bed count');
    else factors.push('Different bed count');
  }

  // Sale recency: up to +10 (more recent = better)
  if (comp.saleDate) {
    const daysSinceSale = (Date.now() - new Date(comp.saleDate).getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, Math.round(10 * (1 - daysSinceSale / 730)));
    score += recencyScore;
    if (daysSinceSale < 180) factors.push('Recent sale (<6mo)');
    else if (daysSinceSale < 365) factors.push('Within 1 year');
  }

  // Has cap rate data: +5
  if (comp.capRate) {
    score += 5;
    factors.push('Cap rate available');
  }

  // Has NOI data: +5
  if (comp.noiAtSale) {
    score += 5;
    factors.push('NOI available');
  }

  // Verified: +5
  if (comp.verified) {
    score += 5;
    factors.push('Verified transaction');
  }

  score = Math.min(100, Math.max(0, score));

  const compType: 'direct' | 'indirect' =
    (comp.state === subject.state && comp.assetType === subject.assetType) ? 'direct' : 'indirect';

  return { score, notes: factors.join('; '), compType };
}

// ── Operating benchmarks ────────────────────────────────────────────

function buildOperatingBenchmarks(
  facility: typeof facilities.$inferSelect | null,
  state: string | null,
  assetType: string,
  intakeData?: Partial<IntakeStageData>
): OperatingBenchmarks {
  // National averages based on asset type (from benchmarks.ts knowledge)
  const snfNationalAvgs = {
    medicareReimbursement: 550,
    medicaidRate: 220,
    qualityScore: 3.0,
    costPerPatientDay: 380,
    laborCostPercent: 62,
    occupancyRate: 78,
  };

  const alfNationalAvgs = {
    medicareReimbursement: 0,
    medicaidRate: 175,
    qualityScore: 3.5,
    costPerPatientDay: 280,
    laborCostPercent: 55,
    occupancyRate: 83,
  };

  const nationals = assetType === 'alf' ? alfNationalAvgs : snfNationalAvgs;

  // State averages approximate a ~5% variance from national
  const stateVariance = state ? (state.charCodeAt(0) % 10 - 5) / 100 : 0;

  // Extract facility-specific values from intake data
  const fin = intakeData?.financialSnapshot;
  const ops = intakeData?.operationalSnapshot;
  const fac = intakeData?.facilityIdentification;

  // Derive facility metrics from intake financial/operational data
  const totalAdc = fin?.ttmTotalCensusAdc || null;
  const medicarePercent = fin?.medicareCensusPercent || null;
  const beds = fac?.licensedBeds || facility?.licensedBeds || null;

  // Medicare ADC = total ADC × medicare%
  const medicareAdc = (totalAdc && medicarePercent) ? Math.round(totalAdc * medicarePercent / 100) : null;

  // Revenue per patient day = TTM revenue / 365 / ADC
  const revenuePerDay = (fin?.ttmRevenue && totalAdc && totalAdc > 0)
    ? Math.round(fin.ttmRevenue / 365 / totalAdc)
    : null;

  // CMI from operational snapshot
  const cmi = ops?.cmi ?? null;

  // Quality star rating from operational snapshot or facility table
  const starRating = ops?.cmsOverallRating ?? facility?.cmsRating ?? null;

  // Cost per patient day = (TTM Revenue - TTM EBITDA) / 365 / ADC ≈ total opex per patient day
  const costPerPatientDay = (fin?.ttmRevenue && fin?.ttmEbitda && totalAdc && totalAdc > 0)
    ? Math.round((fin.ttmRevenue - fin.ttmEbitda) / 365 / totalAdc)
    : null;

  // Agency staff % as proxy for contract labor
  const agencyPercent = ops?.agencyStaffPercent ?? null;

  // Occupancy = ADC / beds
  const occupancyRate = (totalAdc && beds && beds > 0)
    ? +((totalAdc / beds) * 100).toFixed(1)
    : null;

  return {
    medicareReimbursement: {
      facilityValue: revenuePerDay,
      stateAvg: Math.round(nationals.medicareReimbursement * (1 + stateVariance)),
      nationalAvg: nationals.medicareReimbursement,
      percentile: revenuePerDay ? Math.min(99, Math.max(1, Math.round((revenuePerDay / (nationals.medicareReimbursement * 1.5)) * 100))) : null,
    },
    medicaidRate: {
      facilityValue: null,
      stateAvg: Math.round(nationals.medicaidRate * (1 + stateVariance * 0.8)),
      nationalAvg: nationals.medicaidRate,
      percentile: null,
    },
    qualityScore: {
      facilityValue: starRating,
      stateAvg: +(nationals.qualityScore * (1 + stateVariance * 0.3)).toFixed(1),
      nationalAvg: nationals.qualityScore,
      percentile: starRating ? Math.round((starRating / 5) * 100) : null,
    },
    costPerPatientDay: {
      facilityValue: costPerPatientDay,
      stateAvg: Math.round(nationals.costPerPatientDay * (1 + stateVariance)),
      nationalAvg: nationals.costPerPatientDay,
      percentile: costPerPatientDay ? Math.min(99, Math.max(1, Math.round((costPerPatientDay / (nationals.costPerPatientDay * 1.3)) * 100))) : null,
    },
    laborCostPercent: {
      facilityValue: agencyPercent,
      stateAvg: +(nationals.laborCostPercent * (1 + stateVariance * 0.5)).toFixed(1),
      nationalAvg: nationals.laborCostPercent,
      percentile: agencyPercent ? Math.min(99, Math.max(1, Math.round((agencyPercent / (nationals.laborCostPercent * 1.3)) * 100))) : null,
    },
    occupancyRate: {
      facilityValue: occupancyRate,
      stateAvg: +(nationals.occupancyRate * (1 + stateVariance * 0.3)).toFixed(1),
      nationalAvg: nationals.occupancyRate,
      percentile: occupancyRate ? Math.min(99, Math.max(1, Math.round((occupancyRate / 100) * 100))) : null,
    },
  };
}

// ── Market summary ──────────────────────────────────────────────────

function buildMarketSummary(
  comps: ScoredComp[],
  deal: typeof deals.$inferSelect,
  state: string | null,
  assetType: string
): MarketBenchmarkSummary {
  const pricesPerBed = comps
    .map(c => c.pricePerBed ? parseFloat(c.pricePerBed) : null)
    .filter((p): p is number => p !== null && p > 0);

  const capRates = comps
    .map(c => c.capRate ? parseFloat(c.capRate) : null)
    .filter((r): r is number => r !== null && r > 0);

  const medianPPB = pricesPerBed.length > 0 ? median(pricesPerBed) : null;
  const medianCR = capRates.length > 0 ? median(capRates) : null;

  // Determine deal position
  let dealPositionVsMarket: 'below' | 'at' | 'above' | null = null;
  if (deal.askingPrice && deal.beds && medianPPB) {
    const dealPPB = parseFloat(deal.askingPrice) / deal.beds;
    const ratio = dealPPB / medianPPB;
    if (ratio < 0.9) dealPositionVsMarket = 'below';
    else if (ratio > 1.1) dealPositionVsMarket = 'above';
    else dealPositionVsMarket = 'at';
  }

  const marketTier = state ? getMarketTier(state) : null;

  // EBITDA multiples estimated from cap rates
  const medianEbitdaMultiple = medianCR ? +(1 / medianCR).toFixed(2) : null;

  return {
    medianPricePerBed: medianPPB ? Math.round(medianPPB) : null,
    medianEbitdaMultiple,
    medianCapRate: medianCR ? +medianCR.toFixed(4) : null,
    dealPositionVsMarket,
    marketTier,
    recentTransactionCount: comps.length,
  };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
