/**
 * Risk-Adjusted Valuation API
 *
 * POST /api/deals/[id]/risk-valuation
 * Calculates risk-adjusted cap rates and valuations based on
 * CMS quality, compliance, operations, and market data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities, financialPeriods, cmsProviderData } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  calculateRiskAdjustedValuation,
  calculatePortfolioRiskValuation,
  type RiskAdjustedValuationInput,
} from '@/lib/analysis/risk-adjusted-valuation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();

    // Get deal
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get facilities
    const facilityRows = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    if (facilityRows.length === 0) {
      return NextResponse.json(
        { error: 'No facilities found for this deal' },
        { status: 400 }
      );
    }

    // Build valuation inputs for each facility
    const valuationInputs: RiskAdjustedValuationInput[] = await Promise.all(
      facilityRows.map(async (facility) => {
        // Get latest financial period
        const [financials] = await db
          .select()
          .from(financialPeriods)
          .where(eq(financialPeriods.facilityId, facility.id))
          .orderBy(desc(financialPeriods.periodEnd))
          .limit(1);

        // Get CMS data
        let cmsData = null;
        if (facility.ccn) {
          [cmsData] = await db
            .select()
            .from(cmsProviderData)
            .where(eq(cmsProviderData.ccn, facility.ccn))
            .limit(1);
        }

        // Calculate annualized values - check if already annualized
        const isAnnualized = financials?.isAnnualized === true;
        const multiplier = isAnnualized ? 1 : 12;

        const ttmRevenue = financials?.totalRevenue
          ? Number(financials.totalRevenue) * multiplier
          : 0;
        const ttmEbitdar = financials?.ebitdar
          ? Number(financials.ebitdar) * multiplier
          : 0;
        const ttmNoi = financials?.noi
          ? Number(financials.noi) * multiplier
          : ttmEbitdar * 0.95;

        return {
          facilityId: facility.id,
          facilityName: facility.name,
          beds: facility.licensedBeds || facility.certifiedBeds || 100,
          yearBuilt: facility.yearBuilt || 1990,
          state: facility.state || 'TX',
          locationType: 'suburban' as const,  // Would determine from data

          ttmNoi,
          ttmEbitdar,
          ttmRevenue,

          cmsRating: cmsData?.overallRating ?? facility.cmsRating ?? undefined,
          healthRating: cmsData?.healthInspectionRating ?? facility.healthRating ?? undefined,
          staffingRating: cmsData?.staffingRating ?? facility.staffingRating ?? undefined,
          qualityRating: cmsData?.qualityMeasureRating ?? facility.qualityRating ?? undefined,

          // Occupancy may be stored as decimal (0.85) or percentage (85)
          occupancyRate: (() => {
            const raw = Number(financials?.occupancyRate || 0.85);
            return raw > 1 ? raw / 100 : raw;
          })(),
          // Calculate payer percentages from revenue if available
          medicarePercent: financials?.medicareRevenue && financials?.totalRevenue
            ? Number(financials.medicareRevenue) / Number(financials.totalRevenue)
            : undefined,
          medicaidPercent: financials?.medicaidRevenue && financials?.totalRevenue
            ? Number(financials.medicaidRevenue) / Number(financials.totalRevenue)
            : undefined,

          staffing: cmsData ? {
            totalHppd: Number(cmsData.totalNursingHppd) || 3.5,
            rnHppd: Number(cmsData.reportedRnHppd) || 0.5,
            agencyPercent: Number(financials?.agencyPercentage) || 0.10,
          } : undefined,

          survey: cmsData ? {
            totalDeficiencies: cmsData.totalDeficiencies || 0,
            hasImmediateJeopardy: facility.hasImmediateJeopardy ?? false,
            isSff: cmsData.isSff ?? false,
            lastSurveyDate: cmsData.dataDate ? String(cmsData.dataDate) : '',
          } : undefined,

          capex: body.capexData?.[facility.id] ? {
            immediateNeeds: body.capexData[facility.id].immediate || 0,
            totalNeeds: body.capexData[facility.id].total || 0,
          } : undefined,

          market: facility.state && body.marketData?.[facility.state] ? {
            medicaidRate: body.marketData[facility.state].medicaidRate || 200,
            competitorOccupancy: body.marketData[facility.state].occupancy || 0.85,
            supplyGrowthRate: body.marketData[facility.state].supplyGrowth || 0.02,
          } : undefined,
        } satisfies RiskAdjustedValuationInput;
      })
    );

    // Filter facilities with valid NOI
    const validInputs = valuationInputs.filter(v => v.ttmNoi > 0);

    if (validInputs.length === 0) {
      return NextResponse.json(
        { error: 'No facilities with valid NOI data' },
        { status: 400 }
      );
    }

    // Calculate portfolio risk valuation
    const result = calculatePortfolioRiskValuation(validInputs);

    // Format response
    return NextResponse.json({
      dealId,
      dealName: deal.name,
      assetType: deal.assetType,

      // Portfolio summary
      portfolio: {
        totalFacilities: result.facilities.length,
        totalBeds: validInputs.reduce((sum, f) => sum + f.beds, 0),
        totalBaseValue: result.totalBaseValue,
        totalRiskAdjustedValue: result.totalRiskAdjustedValue,
        valueImpact: result.totalRiskAdjustedValue - result.totalBaseValue,
        portfolioRiskPremium: result.portfolioRiskPremium,
        weightedCapRate: result.weightedCapRate,
        weightedRiskAdjustedCapRate: result.weightedRiskAdjustedCapRate,
        diversificationBenefit: result.diversificationBenefit,
      },

      // Portfolio risk profile
      riskProfile: result.portfolioRiskProfile,

      // Individual facility valuations
      facilities: result.facilities.map(f => ({
        id: f.id,
        name: f.name,
        baseCapRate: f.valuation.baseCapRate,
        baseValue: f.valuation.baseValue,
        riskAdjustedCapRate: f.valuation.riskAdjustedCapRate,
        riskAdjustedValue: f.valuation.riskAdjustedValue,
        totalRiskPremium: f.valuation.totalRiskPremium,
        pricePerBed: f.valuation.riskAdjustedPricePerBed,
        confidence: f.valuation.confidence,
        riskProfile: f.valuation.riskProfile,
        adjustments: f.valuation.riskAdjustments,
      })),

      // Recommendations
      recommendations: generateRecommendations(result),
    });
  } catch (error) {
    console.error('Risk valuation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate risk valuation' },
      { status: 500 }
    );
  }
}

function generateRecommendations(result: ReturnType<typeof calculatePortfolioRiskValuation>): string[] {
  const recommendations: string[] = [];

  // Portfolio-level recommendations
  if (result.portfolioRiskProfile.overallRisk === 'critical') {
    recommendations.push('Portfolio carries critical risk - extensive due diligence required');
  } else if (result.portfolioRiskProfile.overallRisk === 'high') {
    recommendations.push('Portfolio carries elevated risk - recommend risk-adjusted pricing');
  }

  if (result.portfolioRiskProfile.concentrationRisk > 0.30) {
    recommendations.push(
      `High concentration risk: largest facility is ${(result.portfolioRiskProfile.concentrationRisk * 100).toFixed(0)}% of portfolio value`
    );
  }

  if (result.portfolioRiskProfile.geographicDiversification < 2) {
    recommendations.push('Limited geographic diversification - all facilities in single state');
  }

  if (result.diversificationBenefit > 30) {
    recommendations.push(
      `Portfolio diversification provides ${result.diversificationBenefit} bps cap rate benefit`
    );
  }

  // Quality distribution
  const lowRatedCount = result.portfolioRiskProfile.qualityDistribution
    .filter(q => q.rating <= 2)
    .reduce((sum, q) => sum + q.count, 0);

  if (lowRatedCount > 0) {
    recommendations.push(
      `${lowRatedCount} facilities have 2-star or below rating - operational improvement needed`
    );
  }

  // Price guidance
  const valueDiscount = (result.totalBaseValue - result.totalRiskAdjustedValue) / result.totalBaseValue;
  if (valueDiscount > 0.10) {
    recommendations.push(
      `Risk factors warrant ${(valueDiscount * 100).toFixed(0)}% price discount from base valuation`
    );
  }

  return recommendations;
}
