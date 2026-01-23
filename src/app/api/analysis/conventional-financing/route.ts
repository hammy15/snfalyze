import { NextRequest, NextResponse } from 'next/server';
import {
  conventionalFinancingCalculator,
  DEFAULT_LTV_RANGES,
  DEFAULT_INTEREST_RATES,
  MINIMUM_DSCR,
  type ConventionalFinancingInput,
  type AssetType,
} from '@/lib/financial-models';

// GET - Get default parameters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assetType = (searchParams.get('assetType') ?? 'SNF') as AssetType;

    return NextResponse.json({
      success: true,
      data: {
        defaults: {
          ltv: DEFAULT_LTV_RANGES[assetType],
          interestRates: DEFAULT_INTEREST_RATES[assetType],
          minimumDscr: MINIMUM_DSCR[assetType],
          amortizationYears: 25,
          loanTermYears: 10,
        },
        assetType,
      },
    });
  } catch (error) {
    console.error('Error getting financing defaults:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get financing defaults' },
      { status: 500 }
    );
  }
}

// POST - Run conventional financing analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      purchasePrice,
      propertyNOI,
      facilityEbitdar,
      assetType = 'SNF',
      beds,
      loanType = 'fixed',
      ltv,
      interestRate,
      amortizationYears = 25,
      loanTermYears = 10,
      indexRate,
      spread,
      rateCap,
      rateFloor,
      originationFee,
      closingCosts,
    } = body;

    // Validate required fields
    if (!purchasePrice || !propertyNOI || !facilityEbitdar || !beds) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: purchasePrice, propertyNOI, facilityEbitdar, beds' },
        { status: 400 }
      );
    }

    // Use defaults if not provided
    const effectiveLtv = ltv ?? DEFAULT_LTV_RANGES[assetType as AssetType].typical;
    const effectiveRate = interestRate ?? DEFAULT_INTEREST_RATES[assetType as AssetType].fixed;

    const input: ConventionalFinancingInput = {
      purchasePrice,
      propertyNOI,
      facilityEbitdar,
      assetType: assetType as AssetType,
      beds,
      loanType,
      ltv: effectiveLtv,
      interestRate: effectiveRate,
      amortizationYears,
      loanTermYears,
      indexRate,
      spread,
      rateCap,
      rateFloor,
      originationFee,
      closingCosts,
    };

    const result = conventionalFinancingCalculator.runFullAnalysis(input);

    // Also calculate max loan by DSCR
    const maxLoanByDscr = conventionalFinancingCalculator.calculateMaxLoanByDSCR(
      propertyNOI,
      effectiveRate,
      amortizationYears,
      MINIMUM_DSCR[assetType as AssetType]
    );

    return NextResponse.json({
      success: true,
      data: {
        result,
        constraints: {
          maxLoanByDscr,
          maxLtvLoan: purchasePrice * DEFAULT_LTV_RANGES[assetType as AssetType].max,
          constrainingFactor: maxLoanByDscr < purchasePrice * effectiveLtv ? 'DSCR' : 'LTV',
        },
      },
    });
  } catch (error) {
    console.error('Error running financing analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run financing analysis' },
      { status: 500 }
    );
  }
}
