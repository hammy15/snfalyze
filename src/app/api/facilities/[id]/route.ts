import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { facilities, financialPeriods, facilityCensusPeriods, facilityPayerRates } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;

    // Get facility info
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Get latest financial data (TTM - trailing twelve months)
    const financialData = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.facilityId, facilityId))
      .orderBy(desc(financialPeriods.periodEnd))
      .limit(12);

    // Calculate TTM totals
    const ttmFinancials = financialData.reduce(
      (acc, period) => {
        const revenue = parseFloat(period.totalRevenue?.toString() || '0');
        const expenses = parseFloat(period.totalExpenses?.toString() || '0');
        const noi = parseFloat(period.noi?.toString() || '0');
        const ebitdar = parseFloat(period.ebitdar?.toString() || '0');
        // Estimate EBITDA as EBITDAR minus 8% rent (industry standard)
        const estimatedRent = revenue * 0.08;
        const ebitda = ebitdar - estimatedRent;

        return {
          revenue: acc.revenue + revenue,
          expenses: acc.expenses + expenses,
          noi: acc.noi + noi,
          ebitdar: acc.ebitdar + ebitdar,
          ebitda: acc.ebitda + ebitda,
        };
      },
      { revenue: 0, expenses: 0, noi: 0, ebitdar: 0, ebitda: 0 }
    );

    // Get latest census data
    const latestCensus = await db
      .select()
      .from(facilityCensusPeriods)
      .where(eq(facilityCensusPeriods.facilityId, facilityId))
      .orderBy(desc(facilityCensusPeriods.periodEnd))
      .limit(1);

    // Get latest payer rates
    const latestRates = await db
      .select()
      .from(facilityPayerRates)
      .where(eq(facilityPayerRates.facilityId, facilityId))
      .orderBy(desc(facilityPayerRates.effectiveDate))
      .limit(1);

    // Calculate market data (estimates based on financials)
    const marketData = ttmFinancials.noi > 0
      ? {
          marketCapRate: 0.095, // Default market cap rate
          marketPricePerBed: facility.licensedBeds
            ? Math.round((ttmFinancials.noi / 0.095) / facility.licensedBeds)
            : 0,
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        ...facility,
        financials: ttmFinancials.revenue > 0 ? ttmFinancials : null,
        census: latestCensus[0] || null,
        payerRates: latestRates[0] || null,
        marketData,
      },
    });
  } catch (error) {
    console.error('Error fetching facility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch facility' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;
    const body = await request.json();

    // Update facility
    const [updated] = await db
      .update(facilities)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(facilities.id, facilityId))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating facility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update facility' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;

    const [deleted] = await db
      .delete(facilities)
      .where(eq(facilities.id, facilityId))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Facility deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting facility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete facility' },
      { status: 500 }
    );
  }
}
