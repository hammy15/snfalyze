import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, saleLeaseback, financialPeriods, capitalPartners } from '@/db';
import { eq, and, desc } from 'drizzle-orm';
import {
  saleLeasebackCalculator,
  portfolioAnalyzer,
  sensitivityAnalyzer,
  DEFAULT_CAP_RATES,
  DEFAULT_MIN_COVERAGE_RATIOS,
  type PortfolioFacility,
  type PortfolioAnalysisInput,
  type AssetType,
} from '@/lib/sale-leaseback';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Fetch sale-leaseback analysis for a deal
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;

    // Fetch deal with facilities
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: {
        facilities: true,
        buyerPartner: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    if (deal.dealStructure !== 'sale_leaseback') {
      return NextResponse.json(
        { success: false, error: 'Deal is not a sale-leaseback transaction' },
        { status: 400 }
      );
    }

    // Fetch existing sale-leaseback records
    const slbRecords = await db
      .select()
      .from(saleLeaseback)
      .where(eq(saleLeaseback.dealId, dealId));

    // Fetch latest financial data for each facility
    const facilityFinancials = await Promise.all(
      deal.facilities.map(async (facility) => {
        const periods = await db
          .select()
          .from(financialPeriods)
          .where(eq(financialPeriods.facilityId, facility.id))
          .orderBy(desc(financialPeriods.periodEnd))
          .limit(1);

        return {
          facility,
          financials: periods[0] || null,
          slbRecord: slbRecords.find((r) => r.facilityId === facility.id),
        };
      })
    );

    // Get buyer partner coverage requirements if set
    const minimumCoverageRatio = deal.buyerPartner?.minimumCoverageRatio
      ? Number(deal.buyerPartner.minimumCoverageRatio)
      : DEFAULT_MIN_COVERAGE_RATIOS[deal.assetType as AssetType];

    const buyerYieldRequirement = deal.buyerPartner?.targetYield
      ? Number(deal.buyerPartner.targetYield)
      : DEFAULT_CAP_RATES[deal.assetType as AssetType];

    return NextResponse.json({
      success: true,
      data: {
        deal: {
          id: deal.id,
          name: deal.name,
          assetType: deal.assetType,
          dealStructure: deal.dealStructure,
          isAllOrNothing: deal.isAllOrNothing,
          buyerPartner: deal.buyerPartner
            ? {
                id: deal.buyerPartner.id,
                name: deal.buyerPartner.name,
                minimumCoverageRatio: deal.buyerPartner.minimumCoverageRatio,
                targetYield: deal.buyerPartner.targetYield,
                leaseTermPreference: deal.buyerPartner.leaseTermPreference,
                rentEscalation: deal.buyerPartner.rentEscalation,
              }
            : null,
        },
        facilities: facilityFinancials.map((ff) => ({
          id: ff.facility.id,
          name: ff.facility.name,
          assetType: ff.facility.assetType,
          beds: ff.facility.licensedBeds,
          state: ff.facility.state,
          city: ff.facility.city,
          financials: ff.financials
            ? {
                totalRevenue: ff.financials.totalRevenue,
                ebitdar: ff.financials.ebitdar,
                noi: ff.financials.noi,
                normalizedNoi: ff.financials.normalizedNoi,
                occupancyRate: ff.financials.occupancyRate,
                periodStart: ff.financials.periodStart,
                periodEnd: ff.financials.periodEnd,
              }
            : null,
          saleLeasebackData: ff.slbRecord
            ? {
                propertyNoi: ff.slbRecord.propertyNoi,
                appliedCapRate: ff.slbRecord.appliedCapRate,
                purchasePrice: ff.slbRecord.purchasePrice,
                buyerYieldRequirement: ff.slbRecord.buyerYieldRequirement,
                annualRent: ff.slbRecord.annualRent,
                leaseTermYears: ff.slbRecord.leaseTermYears,
                rentEscalation: ff.slbRecord.rentEscalation,
                facilityEbitdar: ff.slbRecord.facilityEbitdar,
                coverageRatio: ff.slbRecord.coverageRatio,
                coveragePassFail: ff.slbRecord.coveragePassFail,
                operatorCashFlowAfterRent: ff.slbRecord.operatorCashFlowAfterRent,
                effectiveRentPerBed: ff.slbRecord.effectiveRentPerBed,
              }
            : null,
        })),
        defaults: {
          capRate: DEFAULT_CAP_RATES[deal.assetType as AssetType],
          minimumCoverageRatio,
          buyerYieldRequirement,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching sale-leaseback data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sale-leaseback data' },
      { status: 500 }
    );
  }
}

// POST - Run sale-leaseback calculations
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();

    const {
      facilities: facilityInputs,
      buyerYieldRequirement,
      minimumCoverageRatio,
      leaseTermYears = 15,
      rentEscalation = 0.025,
      runSensitivity = false,
    } = body;

    // Fetch deal
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Prepare portfolio facilities
    const portfolioFacilities: PortfolioFacility[] = facilityInputs.map(
      (f: {
        id: string;
        name: string;
        assetType: AssetType;
        beds: number;
        propertyNOI: number;
        facilityEbitdar: number;
        totalRevenue: number;
        capRate?: number;
        state?: string;
        city?: string;
      }) => ({
        id: f.id,
        name: f.name,
        assetType: f.assetType,
        beds: f.beds,
        propertyNOI: f.propertyNOI,
        facilityEbitdar: f.facilityEbitdar,
        totalRevenue: f.totalRevenue,
        capRate: f.capRate,
        state: f.state,
        city: f.city,
      })
    );

    // Run portfolio analysis
    const portfolioInput: PortfolioAnalysisInput = {
      facilities: portfolioFacilities,
      buyerYieldRequirement,
      minimumCoverageRatio,
      leaseTermYears,
      rentEscalation,
    };

    const portfolioResult = portfolioAnalyzer.analyzePortfolio(portfolioInput);

    // Analyze all-or-nothing scenario if applicable
    const allOrNothingAnalysis = deal.isAllOrNothing
      ? portfolioAnalyzer.analyzeAllOrNothing(portfolioResult, minimumCoverageRatio)
      : null;

    // Update sale-leaseback records for each facility
    await Promise.all(
      portfolioResult.facilityResults.map(async (fr) => {
        const facilityInput = portfolioFacilities.find((f) => f.id === fr.facilityId);
        if (!facilityInput) return;

        const capRate = facilityInput.capRate ?? DEFAULT_CAP_RATES[facilityInput.assetType];

        // Upsert sale-leaseback record
        const existing = await db
          .select()
          .from(saleLeaseback)
          .where(
            and(eq(saleLeaseback.dealId, dealId), eq(saleLeaseback.facilityId, fr.facilityId))
          )
          .limit(1);

        const slbData = {
          propertyNoi: facilityInput.propertyNOI.toString(),
          appliedCapRate: capRate.toString(),
          purchasePrice: fr.purchasePrice.toString(),
          buyerYieldRequirement: buyerYieldRequirement.toString(),
          annualRent: fr.annualRent.toString(),
          leaseTermYears,
          rentEscalation: rentEscalation.toString(),
          facilityEbitdar: facilityInput.facilityEbitdar.toString(),
          coverageRatio: fr.coverageRatio.toString(),
          coveragePassFail: fr.coveragePassFail,
          operatorCashFlowAfterRent: fr.operatorCashFlowAfterRent.toString(),
          effectiveRentPerBed: fr.effectiveRentPerBed.toString(),
          updatedAt: new Date(),
        };

        if (existing.length > 0) {
          await db
            .update(saleLeaseback)
            .set(slbData)
            .where(eq(saleLeaseback.id, existing[0].id));
        } else {
          await db.insert(saleLeaseback).values({
            dealId,
            facilityId: fr.facilityId,
            ...slbData,
          });
        }
      })
    );

    // Run sensitivity analysis if requested
    let sensitivityResults = null;
    if (runSensitivity && portfolioFacilities.length > 0) {
      const firstFacility = portfolioFacilities[0];
      const baseInput = {
        propertyNOI: firstFacility.propertyNOI,
        capRate: firstFacility.capRate ?? DEFAULT_CAP_RATES[firstFacility.assetType],
        buyerYieldRequirement,
        facilityEbitdar: firstFacility.facilityEbitdar,
        minimumCoverageRatio,
        leaseTermYears,
        rentEscalation,
        beds: firstFacility.beds,
        totalRevenue: firstFacility.totalRevenue,
        assetType: firstFacility.assetType,
      };

      const ranges = sensitivityAnalyzer.getDefaultRanges(firstFacility.assetType);

      sensitivityResults = {
        capRate: sensitivityAnalyzer.analyzeCapRateSensitivity(baseInput, ranges.capRate),
        twoWay: sensitivityAnalyzer.analyzeTwoWaySensitivity(
          baseInput,
          ranges.capRate,
          ranges.yield
        ),
        escalationScenarios: sensitivityAnalyzer.analyzeRentEscalationScenarios(
          baseInput,
          saleLeasebackCalculator.runFullAnalysis(baseInput),
          sensitivityAnalyzer.getStandardEscalationScenarios()
        ),
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        portfolio: {
          totalPurchasePrice: portfolioResult.totalPurchasePrice,
          totalAnnualRent: portfolioResult.totalAnnualRent,
          totalMonthlyRent: portfolioResult.totalMonthlyRent,
          portfolioCoverageRatio: portfolioResult.portfolioCoverageRatio,
          portfolioCoveragePassFail: portfolioResult.portfolioCoveragePassFail,
          totalOperatorCashFlowAfterRent: portfolioResult.totalOperatorCashFlowAfterRent,
          weightedAvgRentPerBed: portfolioResult.weightedAvgRentPerBed,
          weightedAvgRentAsPercentOfRevenue: portfolioResult.weightedAvgRentAsPercentOfRevenue,
          totalBeds: portfolioResult.totalBeds,
          totalEbitdar: portfolioResult.totalEbitdar,
          totalRevenue: portfolioResult.totalRevenue,
          facilitiesPassingCoverage: portfolioResult.facilitiesPassingCoverage,
          facilitiesFailingCoverage: portfolioResult.facilitiesFailingCoverage,
          blendedCapRate: portfolioResult.blendedCapRate,
          impliedPortfolioYield: portfolioResult.impliedPortfolioYield,
          diversificationScore: portfolioResult.diversificationScore,
          largestFacilityConcentration: portfolioResult.largestFacilityConcentration,
        },
        facilityResults: portfolioResult.facilityResults,
        facilityContributions: portfolioResult.facilityContributions,
        assetTypeBreakdown: portfolioResult.assetTypeBreakdown,
        geographicBreakdown: portfolioResult.geographicBreakdown,
        allOrNothingAnalysis,
        sensitivityResults,
      },
    });
  } catch (error) {
    console.error('Error running sale-leaseback calculations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run sale-leaseback calculations' },
      { status: 500 }
    );
  }
}
