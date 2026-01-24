import { NextRequest, NextResponse } from 'next/server';
import { db, facilities, deals, facilityCensusPeriods, facilityPayerRates, financialPeriods } from '@/db';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

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

    // Enhance facilities with census, CMS, and financial data
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

        // Calculate actual days in the period for accurate occupancy
        let currentOccupancy = 0;
        let avgDailyCensus = 0;
        const bedCount = facility.certifiedBeds || facility.licensedBeds || 0;

        if (latestCensus && bedCount > 0) {
          const totalPatientDays =
            (latestCensus.medicarePartADays || 0) +
            (latestCensus.medicareAdvantageDays || 0) +
            (latestCensus.managedCareDays || 0) +
            (latestCensus.medicaidDays || 0) +
            (latestCensus.managedMedicaidDays || 0) +
            (latestCensus.privateDays || 0) +
            (latestCensus.vaContractDays || 0) +
            (latestCensus.hospiceDays || 0) +
            (latestCensus.otherDays || 0);

          // Calculate actual days in period
          const periodStart = new Date(latestCensus.periodStart);
          const periodEnd = new Date(latestCensus.periodEnd);
          const daysInPeriod = Math.max(1, Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          // Calculate average daily census
          avgDailyCensus = totalPatientDays / daysInPeriod;

          // Occupancy = ADC / Beds (as decimal, e.g., 0.85 for 85%)
          currentOccupancy = avgDailyCensus / bedCount;
        }

        // Get T12 EBITDA from financial periods
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

        const t12Financials = await db.query.financialPeriods.findMany({
          where: and(
            eq(financialPeriods.facilityId, facility.id),
            gte(financialPeriods.periodEnd, twelveMonthsAgo.toISOString().split('T')[0])
          ),
          orderBy: [desc(financialPeriods.periodEnd)],
        });

        // Sum up T12 EBITDAR (using ebitdar field from schema)
        const trailingTwelveMonthEbitda = t12Financials.reduce((sum, period) => {
          return sum + (parseFloat(String(period.ebitdar || 0)));
        }, 0);

        const trailingTwelveMonthRevenue = t12Financials.reduce((sum, period) => {
          return sum + (parseFloat(String(period.totalRevenue || 0)));
        }, 0);

        // Extract CMS data from facility record
        const cmsData = facility.cmsDataSnapshot as Record<string, unknown> | null;

        return {
          id: facility.id,
          dealId: facility.dealId,
          name: facility.name,
          assetType: facility.assetType,
          ccn: facility.ccn,
          address: facility.address,
          city: facility.city,
          state: facility.state,
          zipCode: facility.zipCode,
          licensedBeds: facility.licensedBeds,
          certifiedBeds: facility.certifiedBeds,
          yearBuilt: facility.yearBuilt,
          isVerified: facility.isVerified,
          verifiedAt: facility.verifiedAt,
          verifiedBy: facility.verifiedBy,

          // CMS Data - directly from facility record
          cmsRating: facility.cmsRating,
          healthRating: facility.healthRating,
          staffingRating: facility.staffingRating,
          qualityRating: facility.qualityRating,
          isSff: facility.isSff,
          isSffWatch: facility.isSffWatch,
          cmsDataSnapshot: cmsData,

          // Calculated metrics
          currentOccupancy,
          avgDailyCensus,
          latestCensus,
          currentRates,
          trailingTwelveMonthEbitda,
          trailingTwelveMonthRevenue,

          // If CMS data has additional info, include it
          providerName: cmsData?.providerName || facility.name,
          phoneNumber: cmsData?.phoneNumber,
          ownershipType: cmsData?.ownershipType,
          numberOfResidentsInCertifiedBeds: cmsData?.numberOfResidentsInCertifiedBeds,
          averageNumberOfResidentsPerDay: cmsData?.averageNumberOfResidentsPerDay,
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
