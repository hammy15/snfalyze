/**
 * Deal Decision Engine API
 *
 * POST /api/deals/[id]/decision
 * Comprehensive buy vs lease analysis with pricing recommendations.
 * Brings together all analysis modules for a final decision.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities, financialPeriods, cmsProviderData } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  calculateMasterLease,
  type PortfolioFacility,
} from '@/lib/analysis/master-lease-calculator';
import {
  calculatePortfolioRiskValuation,
  type RiskAdjustedValuationInput,
} from '@/lib/analysis/risk-adjusted-valuation';
import {
  getPartnerProfile,
  getAllPartnerProfiles,
  checkUnderwritingCriteria,
} from '@/lib/partners/partner-profiles';
import {
  getStateMedicaidData,
  getRateTrendAnalysis,
} from '@/lib/market-data/medicaid-rates';

interface DecisionRequest {
  partnerId?: string;
  targetCapRate?: number;
  targetYield?: number;
  targetCoverage?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body: DecisionRequest = await request.json();

    // Get deal
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get partner profile
    const partner = body.partnerId
      ? getPartnerProfile(body.partnerId)
      : getAllPartnerProfiles()[0];

    if (!partner) {
      return NextResponse.json({ error: 'Partner profile not found' }, { status: 400 });
    }

    // Get facilities with all data
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

    // Build comprehensive facility data
    const facilityData = await Promise.all(
      facilityRows.map(async (facility) => {
        const [financials] = await db
          .select()
          .from(financialPeriods)
          .where(eq(financialPeriods.facilityId, facility.id))
          .orderBy(desc(financialPeriods.periodEnd))
          .limit(1);

        let cmsData = null;
        if (facility.ccn) {
          [cmsData] = await db
            .select()
            .from(cmsProviderData)
            .where(eq(cmsProviderData.ccn, facility.ccn))
            .limit(1);
        }

        const multiplier = financials?.periodType === 'monthly' ? 12 :
                          financials?.periodType === 'quarterly' ? 4 : 1;

        const ttmRevenue = Number(financials?.totalRevenue || 0) * multiplier;
        const ttmEbitdar = Number(financials?.ebitdar || 0) * multiplier;
        const ttmNoi = Number(financials?.noi || 0) * multiplier || ttmEbitdar * 0.95;
        // Occupancy may be stored as decimal (0.85) or percentage (85)
        const rawOccupancy = Number(financials?.occupancyRate || 0.85);
        const occupancyRate = rawOccupancy > 1 ? rawOccupancy / 100 : rawOccupancy;

        return {
          facility,
          financials,
          cmsData,
          ttmRevenue,
          ttmEbitdar,
          ttmNoi,
          occupancyRate,
        };
      })
    );

    // Filter valid facilities
    const validFacilities = facilityData.filter(f => f.ttmNoi > 0);

    if (validFacilities.length === 0) {
      return NextResponse.json(
        { error: 'No facilities with valid financial data' },
        { status: 400 }
      );
    }

    // Calculate risk-adjusted valuation
    const riskInputs: RiskAdjustedValuationInput[] = validFacilities.map(f => ({
      facilityId: f.facility.id,
      facilityName: f.facility.name,
      beds: f.facility.licensedBeds || 100,
      yearBuilt: f.facility.yearBuilt || 1990,
      state: f.facility.state || 'TX',
      locationType: 'suburban' as const,
      ttmNoi: f.ttmNoi,
      ttmEbitdar: f.ttmEbitdar,
      ttmRevenue: f.ttmRevenue,
      cmsRating: f.cmsData?.overallRating || f.facility.cmsRating,
      staffingRating: f.cmsData?.staffingRating || f.facility.staffingRating,
      qualityRating: f.cmsData?.qualityRating || f.facility.qualityRating,
      occupancyRate: f.occupancyRate,
      staffing: f.cmsData ? {
        totalHppd: Number(f.cmsData.totalNursingHppd) || 3.5,
        rnHppd: Number(f.cmsData.rnHppd) || 0.5,
        agencyPercent: 0.10,
      } : undefined,
      survey: f.cmsData ? {
        totalDeficiencies: f.cmsData.totalDeficiencies || 0,
        hasImmediateJeopardy: f.cmsData.hasImmediateJeopardy || false,
        isSff: f.cmsData.isSff || false,
        lastSurveyDate: '',
      } : undefined,
    }));

    const riskValuation = calculatePortfolioRiskValuation(riskInputs);

    // Calculate master lease
    const portfolioFacilities: PortfolioFacility[] = validFacilities.map(f => ({
      id: f.facility.id,
      name: f.facility.name,
      beds: f.facility.licensedBeds || 100,
      state: f.facility.state || 'TX',
      cmsRating: f.cmsData?.overallRating || f.facility.cmsRating,
      yearBuilt: f.facility.yearBuilt,
      ttmRevenue: f.ttmRevenue,
      ttmEbitdar: f.ttmEbitdar,
      ttmNoi: f.ttmNoi,
      occupancyRate: f.occupancyRate,
      surveyDeficiencies: f.cmsData?.totalDeficiencies,
      isSff: f.cmsData?.isSff || f.facility.isSff || false,
      hasImmediateJeopardy: f.cmsData?.hasImmediateJeopardy || f.facility.hasImmediateJeopardy || false,
    }));

    const masterLease = calculateMasterLease({
      facilities: portfolioFacilities,
      partner,
      options: {
        isAllOrNothing: deal.isAllOrNothing ?? true,
        allowPartialExclusions: false,
        maxExcludedFacilities: 0,
        discountRate: 0.08,
        projectionYears: 20,
        includeRenewals: true,
        noiGrowthRate: 0.02,
        customCapRate: body.targetCapRate,
        customYield: body.targetYield,
      },
    });

    // Get market data for primary state
    const primaryState = deal.primaryState || validFacilities[0].facility.state || 'TX';
    const medicaidData = getStateMedicaidData(primaryState);
    const rateTrend = getRateTrendAnalysis(primaryState);

    // Check underwriting for all facilities
    const underwritingResults = validFacilities.map(f => ({
      facilityId: f.facility.id,
      facilityName: f.facility.name,
      result: checkUnderwritingCriteria(partner, {
        cmsRating: f.cmsData?.overallRating || f.facility.cmsRating,
        occupancyRate: f.occupancyRate,
        ebitdarMargin: f.ttmEbitdar / f.ttmRevenue,
        surveyDeficiencies: f.cmsData?.totalDeficiencies,
        isSff: f.cmsData?.isSff || f.facility.isSff,
        hasImmediateJeopardy: f.cmsData?.hasImmediateJeopardy || f.facility.hasImmediateJeopardy,
        beds: f.facility.licensedBeds,
        yearBuilt: f.facility.yearBuilt,
        state: f.facility.state,
      }),
    }));

    // Generate final decision
    const decision = generateFinalDecision({
      deal,
      partner,
      riskValuation,
      masterLease,
      underwritingResults,
      medicaidData,
      rateTrend,
      targetCoverage: body.targetCoverage,
    });

    return NextResponse.json({
      dealId,
      dealName: deal.name,
      assetType: deal.assetType,
      askingPrice: deal.askingPrice ? Number(deal.askingPrice) : null,

      // Partner context
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
        targetCapRate: partner.economics.targetCapRate,
        targetYield: partner.economics.targetYield,
        targetCoverage: partner.economics.targetCoverageRatio,
      },

      // Risk-adjusted valuation
      valuation: {
        baseValue: riskValuation.totalBaseValue,
        riskAdjustedValue: riskValuation.totalRiskAdjustedValue,
        valueDiscount: (riskValuation.totalBaseValue - riskValuation.totalRiskAdjustedValue) / riskValuation.totalBaseValue,
        riskPremium: riskValuation.portfolioRiskPremium,
        portfolioRisk: riskValuation.portfolioRiskProfile.overallRisk,
      },

      // Master lease summary
      lease: {
        purchasePrice: masterLease.summary.totalPurchasePrice,
        annualRent: masterLease.summary.totalAnnualRent,
        coverage: masterLease.summary.portfolioCoverageRatio,
        coverageStatus: masterLease.summary.coverageStatus,
        leaseNpv: masterLease.leaseProjection.leaseNpv,
        totalLeaseObligation: masterLease.leaseProjection.totalLeaseObligation,
      },

      // Market context
      market: {
        state: primaryState,
        medicaidRate: medicaidData.currentDailyRate,
        rateTrend: rateTrend.trend,
        reimbursementRisk: rateTrend.reimbursementRisk,
      },

      // Underwriting summary
      underwriting: {
        passingFacilities: underwritingResults.filter(u => u.result.passes).length,
        totalFacilities: underwritingResults.length,
        avgScore: underwritingResults.reduce((sum, u) => sum + u.result.score, 0) / underwritingResults.length,
        blockers: underwritingResults.flatMap(u =>
          u.result.issues.map(i => `${u.facilityName}: ${i.field} - ${i.requirement} (actual: ${i.actual})`)
        ),
      },

      // Final decision
      decision,

      // Detailed breakdowns
      facilityDetails: validFacilities.map(f => ({
        id: f.facility.id,
        name: f.facility.name,
        beds: f.facility.licensedBeds,
        state: f.facility.state,
        cmsRating: f.cmsData?.overallRating || f.facility.cmsRating,
        ttmNoi: f.ttmNoi,
        ttmEbitdar: f.ttmEbitdar,
        occupancy: f.occupancyRate,
      })),
    });
  } catch (error) {
    console.error('Decision engine error:', error);
    return NextResponse.json(
      { error: 'Failed to generate decision' },
      { status: 500 }
    );
  }
}

interface DecisionInputs {
  deal: any;
  partner: ReturnType<typeof getPartnerProfile>;
  riskValuation: ReturnType<typeof calculatePortfolioRiskValuation>;
  masterLease: ReturnType<typeof calculateMasterLease>;
  underwritingResults: any[];
  medicaidData: ReturnType<typeof getStateMedicaidData>;
  rateTrend: ReturnType<typeof getRateTrendAnalysis>;
  targetCoverage?: number;
}

function generateFinalDecision(inputs: DecisionInputs) {
  const {
    deal,
    partner,
    riskValuation,
    masterLease,
    underwritingResults,
    medicaidData,
    rateTrend,
    targetCoverage,
  } = inputs;

  const targetCov = targetCoverage || partner!.economics.targetCoverageRatio;

  // Scoring factors
  let score = 0;
  const strengths: string[] = [];
  const concerns: string[] = [];
  const dealBreakers: string[] = [];

  // Coverage analysis
  const coverage = masterLease.summary.portfolioCoverageRatio;
  if (coverage >= targetCov) {
    score += 25;
    strengths.push(`Coverage ratio of ${coverage.toFixed(2)}x exceeds target of ${targetCov.toFixed(2)}x`);
  } else if (coverage >= partner!.economics.minCoverageRatio) {
    score += 10;
    concerns.push(`Coverage ratio of ${coverage.toFixed(2)}x below target of ${targetCov.toFixed(2)}x`);
  } else {
    score -= 20;
    dealBreakers.push(`Coverage ratio of ${coverage.toFixed(2)}x below minimum of ${partner!.economics.minCoverageRatio.toFixed(2)}x`);
  }

  // Risk profile
  const risk = riskValuation.portfolioRiskProfile.overallRisk;
  if (risk === 'low') {
    score += 20;
    strengths.push('Low overall portfolio risk');
  } else if (risk === 'moderate') {
    score += 10;
  } else if (risk === 'high') {
    score -= 10;
    concerns.push('High portfolio risk requires careful structuring');
  } else {
    score -= 25;
    dealBreakers.push('Critical portfolio risk level');
  }

  // Underwriting
  const passingPct = underwritingResults.filter(u => u.result.passes).length / underwritingResults.length;
  if (passingPct >= 0.90) {
    score += 15;
    strengths.push('All facilities meet underwriting criteria');
  } else if (passingPct >= 0.70) {
    score += 5;
    concerns.push(`${((1 - passingPct) * 100).toFixed(0)}% of facilities have underwriting issues`);
  } else {
    score -= 15;
    dealBreakers.push('Majority of facilities fail underwriting');
  }

  // Quality metrics
  const avgCms = masterLease.summary.avgCmsRating;
  if (avgCms >= 4) {
    score += 15;
    strengths.push(`High quality portfolio with ${avgCms.toFixed(1)} average CMS rating`);
  } else if (avgCms >= 3) {
    score += 5;
  } else if (avgCms >= 2) {
    concerns.push(`Below average quality with ${avgCms.toFixed(1)} CMS rating`);
  } else {
    score -= 10;
    concerns.push(`Low quality portfolio requires operational turnaround`);
  }

  // Market/reimbursement
  if (rateTrend.reimbursementRisk === 'low') {
    score += 10;
    strengths.push(`Strong Medicaid rate environment in ${deal.primaryState || 'primary state'}`);
  } else if (rateTrend.reimbursementRisk === 'high') {
    score -= 10;
    concerns.push('Weak Medicaid rate trend poses reimbursement risk');
  }

  // Price analysis (if asking price provided)
  const askingPrice = deal.askingPrice ? Number(deal.askingPrice) : null;
  const riskAdjustedValue = riskValuation.totalRiskAdjustedValue;
  let priceAssessment: 'attractive' | 'fair' | 'expensive' | 'unknown' = 'unknown';

  if (askingPrice) {
    const priceToValue = askingPrice / riskAdjustedValue;
    if (priceToValue <= 0.90) {
      score += 15;
      strengths.push(`Asking price ${((1 - priceToValue) * 100).toFixed(0)}% below risk-adjusted value`);
      priceAssessment = 'attractive';
    } else if (priceToValue <= 1.05) {
      score += 5;
      priceAssessment = 'fair';
    } else {
      score -= 10;
      concerns.push(`Asking price ${((priceToValue - 1) * 100).toFixed(0)}% above risk-adjusted value`);
      priceAssessment = 'expensive';
    }
  }

  // Determine recommendation
  let recommendation: 'strong_buy' | 'buy' | 'negotiate' | 'pass';
  let confidence: 'high' | 'medium' | 'low';

  if (dealBreakers.length > 0) {
    recommendation = 'pass';
    confidence = 'high';
  } else if (score >= 60) {
    recommendation = 'strong_buy';
    confidence = 'high';
  } else if (score >= 35) {
    recommendation = 'buy';
    confidence = score >= 50 ? 'high' : 'medium';
  } else if (score >= 10) {
    recommendation = 'negotiate';
    confidence = 'medium';
  } else {
    recommendation = 'pass';
    confidence = 'medium';
  }

  // Price guidance
  const ebitdar = masterLease.summary.totalEbitdar;
  const targetRent = ebitdar / targetCov;
  const targetPrice = targetRent / partner!.economics.targetYield;
  const minPrice = (ebitdar / partner!.economics.minCoverageRatio) / partner!.economics.maxYield;
  const maxPrice = (ebitdar / (targetCov + 0.10)) / partner!.economics.minYield;

  return {
    recommendation,
    confidence,
    score,
    priceAssessment,

    strengths,
    concerns,
    dealBreakers,

    pricing: {
      askingPrice,
      riskAdjustedValue,
      suggestedPrice: {
        min: minPrice,
        target: targetPrice,
        max: maxPrice,
      },
      suggestedRent: {
        atMinPrice: minPrice * partner!.economics.targetYield,
        atTargetPrice: targetRent,
        atMaxPrice: maxPrice * partner!.economics.minYield,
      },
      impliedMetrics: {
        atTargetPrice: {
          capRate: masterLease.summary.totalNoi / targetPrice,
          coverage: ebitdar / targetRent,
          pricePerBed: targetPrice / masterLease.summary.totalBeds,
        },
      },
    },

    // Structure recommendation
    structure: masterLease.decision.buyVsLeaseAnalysis.recommendation === 'purchase'
      ? {
          type: 'purchase',
          rationale: 'Strong returns support outright acquisition',
          equityRequired: targetPrice * 0.30,
          debtAmount: targetPrice * 0.70,
        }
      : {
          type: 'sale_leaseback',
          rationale: 'Sale-leaseback structure provides appropriate risk allocation',
          initialTerm: partner!.leaseTerms.initialTermYears,
          renewals: partner!.leaseTerms.renewalOptions,
          escalation: partner!.leaseTerms.fixedEscalation,
        },

    // Next steps
    nextSteps: generateNextSteps(recommendation, dealBreakers, concerns),
  };
}

function generateNextSteps(
  recommendation: string,
  dealBreakers: string[],
  concerns: string[]
): string[] {
  const steps: string[] = [];

  if (recommendation === 'pass') {
    steps.push('Communicate pass decision to broker');
    if (dealBreakers.length > 0) {
      steps.push('Document deal breakers for future reference');
    }
    return steps;
  }

  if (recommendation === 'strong_buy' || recommendation === 'buy') {
    steps.push('Submit Letter of Intent at target price');
    steps.push('Request access to data room for due diligence');
    steps.push('Schedule facility tours');
    steps.push('Order third-party reports (environmental, PCA, appraisal)');
  }

  if (recommendation === 'negotiate') {
    steps.push('Submit initial indication of interest below asking');
    steps.push('Request additional operating data to address concerns');
    if (concerns.some(c => c.includes('underwriting'))) {
      steps.push('Negotiate exclusion or price adjustment for problem facilities');
    }
    if (concerns.some(c => c.includes('Coverage'))) {
      steps.push('Request rent concessions or lower purchase price');
    }
  }

  steps.push('Confirm partner appetite and allocation');
  steps.push('Review with investment committee');

  return steps;
}
