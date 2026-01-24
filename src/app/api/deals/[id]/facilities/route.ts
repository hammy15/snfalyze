import { NextRequest, NextResponse } from 'next/server';
import { db, facilities, deals, facilityCensusPeriods, facilityPayerRates } from '@/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;

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

    // Fetch facilities for this deal with related data
    const dealFacilities = await db.query.facilities.findMany({
      where: eq(facilities.dealId, dealId),
    });

    // Enhance facilities with census and financial data
    const enhancedFacilities = await Promise.all(
      dealFacilities.map(async (facility) => {
        // Get latest census period
        const latestCensus = await db.query.facilityCensusPeriods.findFirst({
          where: eq(facilityCensusPeriods.facilityId, facility.id),
          orderBy: [desc(facilityCensusPeriods.periodEnd)],
        });

        // Get current payer rates
        const currentRates = await db.query.facilityPayerRates.findFirst({
          where: eq(facilityPayerRates.facilityId, facility.id),
          orderBy: [desc(facilityPayerRates.effectiveDate)],
        });

        // Calculate current occupancy from census if available
        let currentOccupancy = 0;
        if (latestCensus && facility.licensedBeds) {
          const totalDays =
            (latestCensus.medicarePartADays || 0) +
            (latestCensus.medicareAdvantageDays || 0) +
            (latestCensus.managedCareDays || 0) +
            (latestCensus.medicaidDays || 0) +
            (latestCensus.managedMedicaidDays || 0) +
            (latestCensus.privateDays || 0) +
            (latestCensus.vaContractDays || 0) +
            (latestCensus.hospiceDays || 0) +
            (latestCensus.otherDays || 0);

          // Assume the period is monthly (~30 days)
          const avgDailyCensus = totalDays / 30;
          currentOccupancy = avgDailyCensus / facility.licensedBeds;
        }

        return {
          ...facility,
          currentOccupancy,
          latestCensus,
          currentRates,
          // Placeholder for TTM EBITDA - would come from financial data
          trailingTwelveMonthEbitda: 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enhancedFacilities,
    });
  } catch (error) {
    console.error('Error fetching deal facilities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch facilities' },
      { status: 500 }
    );
  }
}
