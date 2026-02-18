import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { isValidUUID, invalidIdResponse } from '@/lib/validate-uuid';

interface FacilityScoreSummary {
  facilityId: string;
  facilityName: string;
  score: number;
  color: 'red' | 'yellow' | 'green';
  confidence: number;
}

interface DealScore {
  dealId: string;
  dealName: string;
  portfolioScore: number;
  portfolioColor: 'red' | 'yellow' | 'green';
  recommendation: 'pass' | 'reprice' | 'proceed';
  classification: 'core' | 'reprice' | 'turnaround' | 'speculative';
  confidenceScore: number;
  facilityScores: FacilityScoreSummary[];
  riskFactors: string[];
  upsidefactors: string[];
  algorithmVersion: string;
  scoredAt: string;
}

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

function getClassification(score: number, hasRegulatoryIssues: boolean): 'core' | 'reprice' | 'turnaround' | 'speculative' {
  if (hasRegulatoryIssues) return 'speculative';
  if (score >= 7.5) return 'core';
  if (score >= 6) return 'reprice';
  if (score >= 4.5) return 'turnaround';
  return 'speculative';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    if (!isValidUUID(dealId)) return invalidIdResponse();

    // Fetch deal data
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Fetch all facilities for this deal
    const dealFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    if (dealFacilities.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          dealId: deal.id,
          dealName: deal.name,
          portfolioScore: 0,
          portfolioColor: 'red' as const,
          recommendation: 'pass' as const,
          classification: 'speculative' as const,
          confidenceScore: 0,
          facilityScores: [],
          riskFactors: ['No facilities in portfolio'],
          upsidefactors: [],
          algorithmVersion: 'v1',
          scoredAt: new Date().toISOString()
        }
      });
    }

    // Score each facility by calling the facility score API internally
    const facilityScores: FacilityScoreSummary[] = [];
    const riskFactors: string[] = [];
    const upsideFactors: string[] = [];
    let hasRegulatoryIssues = false;

    for (const facility of dealFacilities) {
      // Check for regulatory issues
      if (facility.isSff || facility.isSffWatch || facility.hasImmediateJeopardy) {
        hasRegulatoryIssues = true;
        if (facility.isSff) {
          riskFactors.push(`${facility.name}: Special Focus Facility designation`);
        }
        if (facility.hasImmediateJeopardy) {
          riskFactors.push(`${facility.name}: Immediate Jeopardy history`);
        }
      }

      // Check CMS rating
      if (facility.cmsRating && facility.cmsRating <= 2) {
        riskFactors.push(`${facility.name}: Low CMS rating (${facility.cmsRating}-star)`);
      } else if (facility.cmsRating && facility.cmsRating >= 4) {
        upsideFactors.push(`${facility.name}: Strong CMS rating (${facility.cmsRating}-star)`);
      }

      // Calculate facility score (simplified for portfolio view)
      // In production, this would call the actual scoring logic
      let facilityScore = 7.0; // Base score

      // Adjust for CMS rating
      if (facility.cmsRating) {
        facilityScore += (facility.cmsRating - 3) * 0.5;
      }

      // Adjust for regulatory issues
      if (facility.isSff) facilityScore -= 2;
      if (facility.isSffWatch) facilityScore -= 1;
      if (facility.hasImmediateJeopardy) facilityScore -= 1.5;

      // Adjust for state risk (Oregon is high labor pressure)
      if (['CA', 'WA', 'NY', 'NJ', 'MA', 'OR', 'IL'].includes(facility.state || '')) {
        facilityScore -= 0.5;
      }

      facilityScore = Math.max(1, Math.min(10, facilityScore));

      facilityScores.push({
        facilityId: facility.id,
        facilityName: facility.name,
        score: Math.round(facilityScore * 10) / 10,
        color: getScoreColor(facilityScore),
        confidence: 40 // Low confidence without financial data
      });
    }

    // Calculate portfolio score (weighted by bed count if available)
    let totalBeds = 0;
    let weightedScore = 0;

    for (let i = 0; i < dealFacilities.length; i++) {
      const beds = dealFacilities[i].licensedBeds || 100;
      totalBeds += beds;
      weightedScore += facilityScores[i].score * beds;
    }

    const portfolioScore = totalBeds > 0
      ? Math.round((weightedScore / totalBeds) * 10) / 10
      : 0;

    // Calculate average confidence
    const avgConfidence = Math.round(
      facilityScores.reduce((sum, f) => sum + f.confidence, 0) / facilityScores.length
    );

    // Add common risk factors
    const states = [...new Set(dealFacilities.map(f => f.state).filter(Boolean))];
    if (states.length === 1 && ['CA', 'WA', 'NY', 'OR'].includes(states[0] || '')) {
      riskFactors.push(`Geographic concentration in high labor-cost state (${states[0]})`);
    }

    // Add upside factors
    if (dealFacilities.every(f => (f.cmsRating || 0) >= 3)) {
      upsideFactors.push('All facilities at or above 3-star CMS rating');
    }

    const score: DealScore = {
      dealId: deal.id,
      dealName: deal.name || 'Unnamed Deal',
      portfolioScore,
      portfolioColor: getScoreColor(portfolioScore),
      recommendation: getRecommendation(portfolioScore),
      classification: getClassification(portfolioScore, hasRegulatoryIssues),
      confidenceScore: avgConfidence,
      facilityScores,
      riskFactors,
      upsidefactors: upsideFactors,
      algorithmVersion: 'v1',
      scoredAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: score
    });

  } catch (error) {
    console.error('Error scoring deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to score deal' },
      { status: 500 }
    );
  }
}
