import { NextRequest, NextResponse } from 'next/server';
import {
  waterfallCalculator,
  STANDARD_WATERFALL_STRUCTURES,
  type WaterfallInput,
} from '@/lib/financial-models';

// GET - Get standard waterfall structures
export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: {
        structures: STANDARD_WATERFALL_STRUCTURES,
        descriptions: {
          simple_preferred: 'Simple 8% preferred return with 80/20 promote split',
          institutional: 'Institutional structure with GP catch-up and tiered promotes',
          aggressive: 'Aggressive promote structure with lower pref and higher GP splits',
        },
      },
    });
  } catch (error) {
    console.error('Error getting waterfall structures:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get waterfall structures' },
      { status: 500 }
    );
  }
}

// POST - Run waterfall distribution analysis
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      partners,
      tiers,
      structureType, // Use predefined structure if specified
      totalEquity,
      preferredReturn = 0.08,
      cashFlows,
      projectStartDate,
      holdPeriod = 10,
    } = body;

    // Validate required fields
    if (!partners || !Array.isArray(partners) || partners.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one partner is required' },
        { status: 400 }
      );
    }

    if (!cashFlows || !Array.isArray(cashFlows) || cashFlows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Cash flows are required' },
        { status: 400 }
      );
    }

    // Use predefined structure or custom tiers
    let effectiveTiers = tiers;
    if (structureType && STANDARD_WATERFALL_STRUCTURES[structureType]) {
      effectiveTiers = STANDARD_WATERFALL_STRUCTURES[structureType];
    }

    if (!effectiveTiers || effectiveTiers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Waterfall tiers are required (provide tiers or structureType)' },
        { status: 400 }
      );
    }

    // Calculate total equity if not provided
    const effectiveTotalEquity = totalEquity ?? partners.reduce(
      (sum: number, p: { capitalContributed: number }) => sum + p.capitalContributed,
      0
    );

    const input: WaterfallInput = {
      partners,
      tiers: effectiveTiers,
      totalEquity: effectiveTotalEquity,
      preferredReturn,
      cashFlows,
      projectStartDate: projectStartDate ? new Date(projectStartDate) : undefined,
      holdPeriod,
    };

    const result = waterfallCalculator.runFullAnalysis(input);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error running waterfall analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run waterfall analysis' },
      { status: 500 }
    );
  }
}
