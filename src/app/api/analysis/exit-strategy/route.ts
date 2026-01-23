import { NextRequest, NextResponse } from 'next/server';
import {
  exitStrategyAnalyzer,
  DEFAULT_EXIT_CAP_RATES,
  type ExitAnalysisInput,
  type AssetType,
} from '@/lib/financial-models';

// GET - Get default exit assumptions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const assetType = (searchParams.get('assetType') ?? 'SNF') as AssetType;

    return NextResponse.json({
      success: true,
      data: {
        defaults: {
          exitCapRate: DEFAULT_EXIT_CAP_RATES[assetType],
          sellingCosts: 0.02,
          refinanceLtv: 0.70,
          refinanceRate: 0.07,
        },
        assetType,
      },
    });
  } catch (error) {
    console.error('Error getting exit defaults:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get exit defaults' },
      { status: 500 }
    );
  }
}

// POST - Run exit strategy analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      property,
      currentFinancing,
      equity,
      exitYear,
      saleAssumptions,
      refinanceAssumptions,
      holdAssumptions,
      compareAll = true,
    } = body;

    // Validate required fields
    if (!property || !currentFinancing || !equity || !exitYear) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: property, currentFinancing, equity, exitYear' },
        { status: 400 }
      );
    }

    const input: ExitAnalysisInput = {
      property,
      currentFinancing,
      equity,
      exitYear,
      saleAssumptions,
      refinanceAssumptions,
      holdAssumptions,
    };

    if (compareAll) {
      const result = exitStrategyAnalyzer.compareExitStrategies(input);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    // Run individual analyses based on provided assumptions
    const results: Record<string, unknown> = {};

    if (saleAssumptions) {
      results.sale = exitStrategyAnalyzer.analyzeSaleExit(input, saleAssumptions);
    }

    if (refinanceAssumptions) {
      results.refinance = exitStrategyAnalyzer.analyzeRefinance(input, refinanceAssumptions);
    }

    if (holdAssumptions) {
      const exitCapRate = saleAssumptions?.exitCapRate ?? DEFAULT_EXIT_CAP_RATES[property.assetType as AssetType];
      results.hold = exitStrategyAnalyzer.analyzeHold(input, holdAssumptions, exitCapRate);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error running exit analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run exit analysis' },
      { status: 500 }
    );
  }
}
