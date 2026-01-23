import { NextRequest, NextResponse } from 'next/server';
import {
  proFormaGenerator,
  DEFAULT_GROWTH_ASSUMPTIONS,
  type FacilityBaseData,
  type GrowthAssumptions,
  type FinancingAssumptions,
  type AssetType,
} from '@/lib/financial-models';

// GET - Get default growth assumptions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assetType = (searchParams.get('assetType') ?? 'SNF') as AssetType;

    return NextResponse.json({
      success: true,
      data: {
        defaults: DEFAULT_GROWTH_ASSUMPTIONS[assetType],
        assetType,
      },
    });
  } catch (error) {
    console.error('Error getting pro forma defaults:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get pro forma defaults' },
      { status: 500 }
    );
  }
}

// POST - Generate pro forma
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      facilities,
      growthAssumptions,
      financingAssumptions,
      holdPeriod = 10,
      isPortfolio = false,
    } = body;

    // Validate required fields
    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one facility is required' },
        { status: 400 }
      );
    }

    // Validate facility data
    for (const facility of facilities) {
      if (!facility.facilityId || !facility.facilityName || !facility.beds) {
        return NextResponse.json(
          { success: false, error: 'Each facility must have facilityId, facilityName, and beds' },
          { status: 400 }
        );
      }
    }

    // Convert to proper format
    const facilityData: FacilityBaseData[] = facilities.map((f: Record<string, unknown>) => ({
      facilityId: f.facilityId as string,
      facilityName: f.facilityName as string,
      assetType: (f.assetType as AssetType) ?? 'SNF',
      beds: f.beds as number,
      currentOccupancy: (f.currentOccupancy as number) ?? 0.85,
      currentCensus: (f.currentCensus as number) ?? Math.floor((f.beds as number) * ((f.currentOccupancy as number) ?? 0.85)),
      currentRevenue: (f.currentRevenue as number) ?? 0,
      revenuePerPatientDay: f.revenuePerPatientDay as number | undefined,
      medicaidMix: f.medicaidMix as number | undefined,
      medicareMix: f.medicareMix as number | undefined,
      privateMix: f.privateMix as number | undefined,
      currentExpenses: (f.currentExpenses as number) ?? 0,
      laborCostPercent: f.laborCostPercent as number | undefined,
      agencyUsagePercent: f.agencyUsagePercent as number | undefined,
      currentNOI: (f.currentNOI as number) ?? 0,
      currentEBITDAR: (f.currentEBITDAR as number) ?? 0,
      managementFeePercent: f.managementFeePercent as number | undefined,
      rentExpense: f.rentExpense as number | undefined,
    }));

    // Use defaults if not provided
    const effectiveGrowthAssumptions: GrowthAssumptions = growthAssumptions ??
      DEFAULT_GROWTH_ASSUMPTIONS[facilityData[0]?.assetType ?? 'SNF'];

    const effectiveFinancingAssumptions: FinancingAssumptions = financingAssumptions ?? {
      dealStructure: 'purchase',
    };

    let result;
    if (isPortfolio && facilityData.length > 1) {
      result = proFormaGenerator.generatePortfolioProForma(
        facilityData,
        effectiveGrowthAssumptions,
        effectiveFinancingAssumptions,
        holdPeriod
      );
    } else {
      result = proFormaGenerator.generateFacilityProForma(
        facilityData[0],
        effectiveGrowthAssumptions,
        effectiveFinancingAssumptions,
        holdPeriod
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        result,
        assumptions: {
          growth: effectiveGrowthAssumptions,
          financing: effectiveFinancingAssumptions,
        },
      },
    });
  } catch (error) {
    console.error('Error generating pro forma:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate pro forma' },
      { status: 500 }
    );
  }
}
