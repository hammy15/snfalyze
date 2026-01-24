import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities } from '@/db';
import { eq } from 'drizzle-orm';
import {
  calculateRentSuggestion,
  calculatePortfolioRent,
  saveSLBCalculation,
  generateValuationSummary,
  generatePortfolioSummary,
  DEFAULT_ASSUMPTIONS,
  type SLBAssumptions,
} from '@/lib/sale-leaseback/auto-calculator';
import { STATE_PRICE_PER_BED } from '@/lib/proforma/proforma-template';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Get rent suggestions for a deal
 * Uses financials-based valuation when available, price per bed fallback otherwise
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;

    // Parse query params for custom assumptions
    const searchParams = request.nextUrl.searchParams;
    const capRate = searchParams.get('capRate')
      ? parseFloat(searchParams.get('capRate')!)
      : DEFAULT_ASSUMPTIONS.capRate;
    const yield_ = searchParams.get('yield')
      ? parseFloat(searchParams.get('yield')!)
      : DEFAULT_ASSUMPTIONS.yield;
    const minCoverage = searchParams.get('minCoverage')
      ? parseFloat(searchParams.get('minCoverage')!)
      : DEFAULT_ASSUMPTIONS.minCoverage;

    const assumptions: SLBAssumptions = {
      capRate,
      yield: yield_,
      minCoverage,
    };

    // Verify deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Calculate portfolio rent suggestions
    const portfolioSuggestion = await calculatePortfolioRent(dealId, assumptions);

    if (!portfolioSuggestion) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No facilities found for this deal',
          facilities: [],
          portfolio: null,
        },
      });
    }

    // Generate summaries
    const facilitySummaries = portfolioSuggestion.facilities.map((f) => ({
      ...f,
      valuationSummary: generateValuationSummary(f),
    }));

    const portfolioSummary = generatePortfolioSummary(portfolioSuggestion);

    return NextResponse.json({
      success: true,
      data: {
        deal: {
          id: deal.id,
          name: deal.name,
        },
        assumptions,
        facilities: facilitySummaries,
        portfolio: {
          ...portfolioSuggestion.portfolioTotal,
          summary: portfolioSummary,
        },
        // Reference data for UI
        statePricePerBedReference: STATE_PRICE_PER_BED,
      },
    });
  } catch (error) {
    console.error('Error fetching rent suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rent suggestions' },
      { status: 500 }
    );
  }
}

/**
 * POST - Recalculate rent suggestions with custom assumptions and optionally save
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();

    const {
      capRate = DEFAULT_ASSUMPTIONS.capRate,
      yield: yield_ = DEFAULT_ASSUMPTIONS.yield,
      minCoverage = DEFAULT_ASSUMPTIONS.minCoverage,
      save = false,
    } = body;

    const assumptions: SLBAssumptions = {
      capRate,
      yield: yield_,
      minCoverage,
    };

    // Verify deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Calculate portfolio rent suggestions
    const portfolioSuggestion = await calculatePortfolioRent(dealId, assumptions);

    if (!portfolioSuggestion) {
      return NextResponse.json({
        success: true,
        data: {
          message: 'No facilities found for this deal',
          facilities: [],
          portfolio: null,
        },
      });
    }

    // Save to database if requested
    if (save) {
      // Save individual facility calculations
      for (const suggestion of portfolioSuggestion.facilities) {
        await saveSLBCalculation(dealId, suggestion.facilityId, suggestion);
      }
      // Save portfolio-level calculation
      await saveSLBCalculation(dealId, null, portfolioSuggestion);
    }

    // Generate summaries
    const facilitySummaries = portfolioSuggestion.facilities.map((f) => ({
      ...f,
      valuationSummary: generateValuationSummary(f),
    }));

    const portfolioSummary = generatePortfolioSummary(portfolioSuggestion);

    return NextResponse.json({
      success: true,
      data: {
        deal: {
          id: deal.id,
          name: deal.name,
        },
        assumptions,
        facilities: facilitySummaries,
        portfolio: {
          ...portfolioSuggestion.portfolioTotal,
          summary: portfolioSummary,
        },
        saved: save,
      },
    });
  } catch (error) {
    console.error('Error calculating rent suggestions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate rent suggestions' },
      { status: 500 }
    );
  }
}
