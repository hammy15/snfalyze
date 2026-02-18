import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, financialPeriods, facilityCensusPeriods, dealCoaMappings } from '@/db';
import { eq, desc, and } from 'drizzle-orm';
import { isValidUUID, invalidIdResponse } from '@/lib/validate-uuid';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface WalkthroughMetrics {
  agencyPercentage: number;
  occupancyTrend: 'up' | 'down' | 'stable';
  coverageRatio: number;
  unmappedItemCount: number;
}

/**
 * GET - Calculate metrics for stage walkthrough warnings
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;
    if (!isValidUUID(dealId)) return invalidIdResponse();

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

    // Get all facilities for this deal
    const dealFacilities = await db.query.facilities.findMany({
      where: eq(facilities.dealId, dealId),
    });

    if (dealFacilities.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          agencyPercentage: 0,
          occupancyTrend: 'stable',
          coverageRatio: 0,
          unmappedItemCount: 0,
        } as WalkthroughMetrics,
      });
    }

    // Calculate agency percentage from financials
    let totalAgencyLabor = 0;
    let totalLaborCost = 0;
    let totalEbitdar = 0;

    for (const facility of dealFacilities) {
      const latestFinancials = await db.query.financialPeriods.findFirst({
        where: eq(financialPeriods.facilityId, facility.id),
        orderBy: [desc(financialPeriods.periodEnd)],
      });

      if (latestFinancials) {
        totalAgencyLabor += parseFloat(String(latestFinancials.agencyLabor || 0));
        totalLaborCost += parseFloat(String(latestFinancials.laborCost || 0));
        totalEbitdar += parseFloat(String(latestFinancials.ebitdar || 0));
      }
    }

    const agencyPercentage = totalLaborCost > 0
      ? (totalAgencyLabor / totalLaborCost) * 100
      : 0;

    // Calculate occupancy trend from census data
    let occupancyTrend: 'up' | 'down' | 'stable' = 'stable';
    const occupancyHistory: number[] = [];

    for (const facility of dealFacilities) {
      const censusPeriods = await db.query.facilityCensusPeriods.findMany({
        where: eq(facilityCensusPeriods.facilityId, facility.id),
        orderBy: [desc(facilityCensusPeriods.periodEnd)],
        limit: 4, // Last 4 periods
      });

      if (censusPeriods.length >= 2) {
        for (const period of censusPeriods) {
          const occupancy = parseFloat(String(period.occupancyRate || 0));
          if (occupancy > 0) {
            occupancyHistory.push(occupancy);
          }
        }
      }
    }

    if (occupancyHistory.length >= 2) {
      // Compare most recent to average of older periods
      const recent = occupancyHistory[0];
      const olderAvg = occupancyHistory.slice(1).reduce((a, b) => a + b, 0) / (occupancyHistory.length - 1);

      if (recent > olderAvg * 1.03) {
        occupancyTrend = 'up';
      } else if (recent < olderAvg * 0.97) {
        occupancyTrend = 'down';
      }
    }

    // Calculate coverage ratio (EBITDAR / Annual Rent)
    // For now, use asking price × yield as proxy for rent if no specific rent data
    let coverageRatio = 0;
    const askingPrice = parseFloat(String(deal.askingPrice || 0));
    const estimatedAnnualRent = askingPrice > 0
      ? askingPrice * 0.085 // 8.5% yield assumption
      : 0;

    if (estimatedAnnualRent > 0 && totalEbitdar > 0) {
      coverageRatio = totalEbitdar / estimatedAnnualRent;
    }

    // Count unmapped COA items
    const unmappedItems = await db.query.dealCoaMappings.findMany({
      where: and(
        eq(dealCoaMappings.dealId, dealId),
        eq(dealCoaMappings.isMapped, false)
      ),
    });

    const unmappedItemCount = unmappedItems.length;

    const metrics: WalkthroughMetrics = {
      agencyPercentage: Math.round(agencyPercentage * 10) / 10, // 1 decimal place
      occupancyTrend,
      coverageRatio: Math.round(coverageRatio * 100) / 100, // 2 decimal places
      unmappedItemCount,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error('Error fetching walkthrough metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch walkthrough metrics' },
      { status: 500 }
    );
  }
}
