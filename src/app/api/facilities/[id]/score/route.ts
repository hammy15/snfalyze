import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { facilities, financialPeriods } from '@/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

interface ScoreBreakdown {
  category: string;
  score: number;
  weight: number;
  weightedScore: number;
  details: string;
}

interface FacilityScore {
  facilityId: string;
  facilityName: string;
  finalScore: number;
  color: 'red' | 'yellow' | 'green';
  recommendation: 'pass' | 'reprice' | 'proceed';
  confidenceScore: number;
  breakdown: ScoreBreakdown[];
  algorithmVersion: string;
  scoredAt: string;
}

// Score thresholds per the unified system prompt
function getScoreColor(score: number): 'red' | 'yellow' | 'green' {
  if (score >= 7) return 'green';
  if (score >= 5) return 'yellow';
  return 'red';
}

function getRecommendation(score: number): 'pass' | 'reprice' | 'proceed' {
  if (score >= 7) return 'proceed';
  if (score >= 5) return 'reprice';
  return 'pass';
}

// Individual scoring functions (matching database functions)
function scoreEbitdarMargin(ebitdar: number, revenue: number): { score: number; details: string } {
  const pct = revenue > 0 ? ebitdar / revenue : 0;
  let score: number;
  if (pct >= 0.22) score = 10;
  else if (pct >= 0.18) score = 8.5;
  else if (pct >= 0.15) score = 6.5;
  else if (pct >= 0.12) score = 4.5;
  else score = 2;

  return {
    score,
    details: `EBITDAR margin: ${(pct * 100).toFixed(1)}% (target: ≥18%)`
  };
}

function scoreRentCoverage(ebitdar: number, rent: number): { score: number; details: string } {
  const coverage = rent > 0 ? ebitdar / rent : 0;
  let score: number;
  if (coverage >= 1.5) score = 10;
  else if (coverage >= 1.35) score = 8.5;
  else if (coverage >= 1.25) score = 7;
  else if (coverage >= 1.15) score = 5;
  else if (coverage >= 1.0) score = 3;
  else score = 1;

  return {
    score,
    details: `Rent coverage: ${coverage.toFixed(2)}x (target: ≥1.25x)`
  };
}

function scoreLabor(laborPct: number, agencyPct: number): { score: number; details: string } {
  let score: number;
  if (laborPct <= 0.50) score = 10;
  else if (laborPct <= 0.55) score = 8.5;
  else if (laborPct <= 0.60) score = 7;
  else if (laborPct <= 0.65) score = 5;
  else score = 3;

  // Agency penalty
  if (agencyPct >= 0.10) score = Math.max(2, score - 3);
  else if (agencyPct >= 0.05) score = Math.max(2, score - 1.5);

  return {
    score,
    details: `Labor: ${(laborPct * 100).toFixed(1)}% of revenue, Agency: ${(agencyPct * 100).toFixed(1)}% (targets: labor ≤55%, agency <5%)`
  };
}

function scoreCensus(censusPct: number): { score: number; details: string } {
  let score: number;
  if (censusPct >= 0.92) score = 10;
  else if (censusPct >= 0.88) score = 9;
  else if (censusPct >= 0.85) score = 7.5;
  else if (censusPct >= 0.80) score = 6;
  else if (censusPct >= 0.75) score = 4;
  else score = 2;

  return {
    score,
    details: `Occupancy: ${(censusPct * 100).toFixed(1)}% (target: ≥85%)`
  };
}

function scoreMarket(state: string): { score: number; details: string } {
  // High-risk labor states per system prompt
  const highRiskStates = ['CA', 'WA', 'NY', 'NJ', 'MA', 'OR', 'IL'];
  const moderateRiskStates = ['FL', 'TX', 'PA', 'OH', 'AZ', 'CO'];

  let score: number;
  let riskLevel: string;

  if (highRiskStates.includes(state)) {
    score = 6.5;
    riskLevel = 'high labor pressure';
  } else if (moderateRiskStates.includes(state)) {
    score = 8;
    riskLevel = 'moderate labor pressure';
  } else {
    score = 9;
    riskLevel = 'favorable labor market';
  }

  return {
    score,
    details: `State: ${state} (${riskLevel})`
  };
}

function scoreRevenueQuality(assetType: string, medicarePct: number): { score: number; details: string } {
  let score: number;

  if (assetType === 'SNF') {
    if (medicarePct >= 0.20) score = 9;
    else if (medicarePct >= 0.15) score = 7.5;
    else if (medicarePct >= 0.10) score = 6;
    else score = 4;
  } else {
    // AL/IL - private pay is preferred
    score = 8; // Default for non-SNF
  }

  return {
    score,
    details: `${assetType} with ${(medicarePct * 100).toFixed(1)}% Medicare mix (target: ≥15%)`
  };
}

function scoreDataQuality(hasFinancials: boolean, hasCensus: boolean, hasRates: boolean): { score: number; details: string } {
  let score = 10;
  const missing: string[] = [];

  if (!hasFinancials) { score -= 4; missing.push('financials'); }
  if (!hasCensus) { score -= 3; missing.push('census'); }
  if (!hasRates) { score -= 3; missing.push('payer rates'); }

  return {
    score: Math.max(2, score),
    details: missing.length > 0 ? `Missing: ${missing.join(', ')}` : 'Complete data set'
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;

    // Fetch facility data
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Fetch latest financial period
    const [latestFinancials] = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.facilityId, facilityId))
      .orderBy(desc(financialPeriods.periodEnd))
      .limit(1);

    // Check for census and payer rate data
    const censusResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM facility_census_periods WHERE facility_id = ${facilityId}
    `);
    const hasCensus = (censusResult.rows[0] as any)?.count > 0;

    const ratesResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM facility_payer_rates WHERE facility_id = ${facilityId}
    `);
    const hasRates = (ratesResult.rows[0] as any)?.count > 0;

    // Get scoring weights
    const weightsResult = await db.execute(sql`
      SELECT category, weight FROM scoring_weights WHERE algorithm_version = 'v1'
    `);
    const weights = Object.fromEntries(
      (weightsResult.rows as any[]).map(r => [r.category, parseFloat(r.weight)])
    );

    // Default weights if not in DB
    const defaultWeights = {
      ebitdar_margin: 0.25,
      rent_coverage: 0.15,
      labor_efficiency: 0.20,
      census: 0.15,
      market_risk: 0.10,
      revenue_quality: 0.10,
      data_quality: 0.05
    };

    const finalWeights = { ...defaultWeights, ...weights };

    // Calculate scores
    const breakdown: ScoreBreakdown[] = [];

    // Use financial data if available, otherwise use defaults
    const revenue = latestFinancials?.totalRevenue ? Number(latestFinancials.totalRevenue) : 0;
    const ebitdar = latestFinancials?.ebitdar ? Number(latestFinancials.ebitdar) : 0;
    // Rent would come from sale_leaseback table or proforma - use 15% of revenue as default
    const rent = revenue > 0 ? revenue * 0.08 : 0; // Approximate rent at 8% of revenue
    const laborCost = latestFinancials?.laborCost ? Number(latestFinancials.laborCost) : 0;
    const laborPct = revenue > 0 ? laborCost / revenue : 0.55; // Default to 55%
    const agencyLabor = latestFinancials?.agencyLabor ? Number(latestFinancials.agencyLabor) : 0;
    const agencyPct = laborCost > 0 ? agencyLabor / laborCost : 0.03; // Default 3% agency
    const censusPct = latestFinancials?.occupancyRate ? Number(latestFinancials.occupancyRate) : 0.85;
    // Medicare pct from revenue breakdown
    const medicareRevenue = latestFinancials?.medicareRevenue ? Number(latestFinancials.medicareRevenue) : 0;
    const medicarePct = revenue > 0 ? medicareRevenue / revenue : 0.15;

    // 1. EBITDAR Margin (25%)
    const ebitdarScore = scoreEbitdarMargin(ebitdar, revenue);
    breakdown.push({
      category: 'EBITDAR Margin',
      score: ebitdarScore.score,
      weight: finalWeights.ebitdar_margin,
      weightedScore: ebitdarScore.score * finalWeights.ebitdar_margin,
      details: ebitdarScore.details
    });

    // 2. Rent Coverage (15%)
    const rentScore = scoreRentCoverage(ebitdar, rent);
    breakdown.push({
      category: 'Rent Coverage',
      score: rentScore.score,
      weight: finalWeights.rent_coverage,
      weightedScore: rentScore.score * finalWeights.rent_coverage,
      details: rentScore.details
    });

    // 3. Labor Efficiency (20%)
    const laborScore = scoreLabor(laborPct, agencyPct);
    breakdown.push({
      category: 'Labor Efficiency',
      score: laborScore.score,
      weight: finalWeights.labor_efficiency,
      weightedScore: laborScore.score * finalWeights.labor_efficiency,
      details: laborScore.details
    });

    // 4. Census (15%)
    const censusScore = scoreCensus(censusPct);
    breakdown.push({
      category: 'Census/Occupancy',
      score: censusScore.score,
      weight: finalWeights.census,
      weightedScore: censusScore.score * finalWeights.census,
      details: censusScore.details
    });

    // 5. Market Risk (10%)
    const marketScore = scoreMarket(facility.state || 'TX');
    breakdown.push({
      category: 'Market Risk',
      score: marketScore.score,
      weight: finalWeights.market_risk,
      weightedScore: marketScore.score * finalWeights.market_risk,
      details: marketScore.details
    });

    // 6. Revenue Quality (10%)
    const revenueScore = scoreRevenueQuality(facility.assetType, medicarePct);
    breakdown.push({
      category: 'Revenue Quality',
      score: revenueScore.score,
      weight: finalWeights.revenue_quality,
      weightedScore: revenueScore.score * finalWeights.revenue_quality,
      details: revenueScore.details
    });

    // 7. Data Quality (5%)
    const dataScore = scoreDataQuality(!!latestFinancials, hasCensus, hasRates);
    breakdown.push({
      category: 'Data Quality',
      score: dataScore.score,
      weight: finalWeights.data_quality,
      weightedScore: dataScore.score * finalWeights.data_quality,
      details: dataScore.details
    });

    // Calculate final weighted score
    const finalScore = Math.round(
      breakdown.reduce((sum, b) => sum + b.weightedScore, 0) * 10
    ) / 10;

    // Calculate confidence score based on data availability
    let confidenceScore = 100;
    if (!latestFinancials) confidenceScore -= 30;
    if (!hasCensus) confidenceScore -= 15;
    if (!hasRates) confidenceScore -= 15;
    // Inference penalty
    if (revenue === 0) confidenceScore -= 20;

    const score: FacilityScore = {
      facilityId: facility.id,
      facilityName: facility.name,
      finalScore,
      color: getScoreColor(finalScore),
      recommendation: getRecommendation(finalScore),
      confidenceScore: Math.max(0, confidenceScore),
      breakdown,
      algorithmVersion: 'v1',
      scoredAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: score
    });

  } catch (error) {
    console.error('Error scoring facility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to score facility' },
      { status: 500 }
    );
  }
}
