import { NextRequest, NextResponse } from 'next/server';
import { dealComparisonAnalyzer, type DealComparisonInput } from '@/lib/financial-models';

// POST - Run deal structure comparison
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      facilities,
      purchasePrice,
      closingCosts,
      cashPurchase,
      conventionalFinancing,
      saleLeaseback,
      reitLeaseback,
      leaseBuyout,
      holdPeriodYears = 10,
      discountRate = 0.10,
      exitCapRate,
      noiGrowthRate = 0.02,
    } = body;

    // Validate required fields
    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one facility is required' },
        { status: 400 }
      );
    }

    if (!purchasePrice) {
      return NextResponse.json(
        { success: false, error: 'Purchase price is required' },
        { status: 400 }
      );
    }

    // Ensure at least one structure is enabled
    const hasEnabledStructure =
      cashPurchase?.enabled !== false ||
      conventionalFinancing?.enabled ||
      saleLeaseback?.enabled ||
      reitLeaseback?.enabled ||
      leaseBuyout?.enabled;

    if (!hasEnabledStructure) {
      return NextResponse.json(
        { success: false, error: 'At least one deal structure must be enabled' },
        { status: 400 }
      );
    }

    const input: DealComparisonInput = {
      facilities,
      purchasePrice,
      closingCosts,
      cashPurchase,
      conventionalFinancing,
      saleLeaseback,
      reitLeaseback,
      leaseBuyout,
      holdPeriodYears,
      discountRate,
      exitCapRate,
      noiGrowthRate,
    };

    const result = dealComparisonAnalyzer.runComparison(input);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error running deal comparison:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run deal comparison' },
      { status: 500 }
    );
  }
}
