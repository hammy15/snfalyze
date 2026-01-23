import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, financialPeriods, cmsProviderData } from '@/db';
import { eq } from 'drizzle-orm';

// GET - Get census data for a deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Get deal and facilities
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    const deal = dealRecords[0];
    const dealFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    // Get financial periods for census data
    const periods = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.dealId, dealId));

    // Build census data per facility
    const censusData = await Promise.all(
      dealFacilities.map(async (facility) => {
        // Get CMS data if CCN exists
        let cmsData = null;
        if (facility.ccn) {
          const cmsRecords = await db
            .select()
            .from(cmsProviderData)
            .where(eq(cmsProviderData.ccn, facility.ccn));
          cmsData = cmsRecords[0] || null;
        }

        // Get facility financial periods
        const facilityPeriods = periods.filter(p => p.facilityId === facility.id);
        const latestPeriod = facilityPeriods.sort(
          (a, b) => new Date(b.periodEnd || 0).getTime() - new Date(a.periodEnd || 0).getTime()
        )[0];

        const licensedBeds = facility.licensedBeds || latestPeriod?.licensedBeds || 0;
        const adc = latestPeriod?.averageDailyCensus
          ? Number(latestPeriod.averageDailyCensus)
          : cmsData?.averageResidentsPerDay
          ? Number(cmsData.averageResidentsPerDay)
          : 0;
        const occupancy = licensedBeds > 0 ? adc / licensedBeds : 0;

        return {
          facilityId: facility.id,
          facilityName: facility.name,
          ccn: facility.ccn,
          state: facility.state,
          licensedBeds,
          certifiedBeds: facility.certifiedBeds || licensedBeds,
          averageDailyCensus: adc,
          occupancyRate: occupancy,
          cmsAdc: cmsData?.averageResidentsPerDay
            ? Number(cmsData.averageResidentsPerDay)
            : null,
          cmsOccupancy: cmsData?.averageResidentsPerDay && cmsData?.numberOfBeds
            ? Number(cmsData.averageResidentsPerDay) / cmsData.numberOfBeds
            : null,
          varianceFromCms: cmsData?.averageResidentsPerDay
            ? adc - Number(cmsData.averageResidentsPerDay)
            : null,
          period: latestPeriod
            ? {
                start: latestPeriod.periodStart,
                end: latestPeriod.periodEnd,
              }
            : null,
          isVerified: facility.isVerified,
        };
      })
    );

    // Calculate portfolio totals
    const totalBeds = censusData.reduce((sum, f) => sum + f.licensedBeds, 0);
    const totalAdc = censusData.reduce((sum, f) => sum + f.averageDailyCensus, 0);
    const portfolioOccupancy = totalBeds > 0 ? totalAdc / totalBeds : 0;

    return NextResponse.json({
      success: true,
      data: {
        facilities: censusData,
        portfolio: {
          totalFacilities: censusData.length,
          totalBeds,
          totalAdc,
          occupancyRate: portfolioOccupancy,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching census data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch census data' },
      { status: 500 }
    );
  }
}

// POST - Verify/update census data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();
    const { facilityId, licensedBeds, averageDailyCensus, verified } = body;

    // Verify deal and facility exist
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    if (facilityId) {
      const facilityRecords = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, facilityId));

      if (facilityRecords.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Facility not found' },
          { status: 404 }
        );
      }

      // Update facility with verified census
      await db
        .update(facilities)
        .set({
          licensedBeds: licensedBeds || facilityRecords[0].licensedBeds,
          isVerified: verified ?? facilityRecords[0].isVerified,
          verifiedAt: verified ? new Date() : facilityRecords[0].verifiedAt,
        })
        .where(eq(facilities.id, facilityId));

      // Update or create financial period with ADC
      if (averageDailyCensus !== undefined) {
        const existingPeriods = await db
          .select()
          .from(financialPeriods)
          .where(eq(financialPeriods.facilityId, facilityId));

        if (existingPeriods.length > 0) {
          // Update latest period
          const latestPeriod = existingPeriods.sort(
            (a, b) =>
              new Date(b.periodEnd || 0).getTime() - new Date(a.periodEnd || 0).getTime()
          )[0];

          await db
            .update(financialPeriods)
            .set({
              averageDailyCensus: averageDailyCensus.toString(),
              licensedBeds: licensedBeds || latestPeriod.licensedBeds,
              occupancyRate:
                licensedBeds || latestPeriod.licensedBeds
                  ? (
                      averageDailyCensus /
                      (licensedBeds || latestPeriod.licensedBeds!)
                    ).toString()
                  : null,
            })
            .where(eq(financialPeriods.id, latestPeriod.id));
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Census data verified',
    });
  } catch (error) {
    console.error('Error verifying census:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify census' },
      { status: 500 }
    );
  }
}
