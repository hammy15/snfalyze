import { NextRequest, NextResponse } from 'next/server';
import { db, facilities, facilityCensusPeriods } from '@/db';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Fetch census periods for a facility
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: facilityId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Optional date range filters
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '12');

    // Verify facility exists
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Build query conditions
    const conditions = [eq(facilityCensusPeriods.facilityId, facilityId)];

    if (startDate) {
      conditions.push(gte(facilityCensusPeriods.periodStart, startDate));
    }
    if (endDate) {
      conditions.push(lte(facilityCensusPeriods.periodEnd, endDate));
    }

    // Fetch census periods
    const censusPeriods = await db.query.facilityCensusPeriods.findMany({
      where: and(...conditions),
      orderBy: [desc(facilityCensusPeriods.periodEnd)],
      limit,
    });

    // Calculate totals and averages
    const totalDays = censusPeriods.reduce((sum, p) => {
      const medicare = Number(p.medicarePartADays || 0) + Number(p.medicareAdvantageDays || 0);
      const medicaid = Number(p.medicaidDays || 0) + Number(p.managedMedicaidDays || 0);
      const managedCare = Number(p.managedCareDays || 0);
      const privateAndOther = Number(p.privateDays || 0) + Number(p.vaContractDays || 0) +
                             Number(p.hospiceDays || 0) + Number(p.otherDays || 0);
      return sum + medicare + medicaid + managedCare + privateAndOther;
    }, 0);

    const avgOccupancy = censusPeriods.length > 0
      ? censusPeriods.reduce((sum, p) => sum + Number(p.occupancyRate || 0), 0) / censusPeriods.length
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        facility: {
          id: facility.id,
          name: facility.name,
          totalBeds: facility.licensedBeds,
        },
        periods: censusPeriods,
        summary: {
          totalPatientDays: totalDays,
          averageOccupancy: Math.round(avgOccupancy * 100) / 100,
          periodCount: censusPeriods.length,
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

/**
 * POST - Create or update census period
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: facilityId } = await params;
    const body = await request.json();

    // Verify facility exists
    const facility = await db.query.facilities.findFirst({
      where: eq(facilities.id, facilityId),
    });

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    const {
      periodStart,
      periodEnd,
      medicarePartADays,
      medicareAdvantageDays,
      managedCareDays,
      medicaidDays,
      managedMedicaidDays,
      privateDays,
      vaContractDays,
      hospiceDays,
      otherDays,
      totalBeds,
      source = 'manual',
      notes,
    } = body;

    // Calculate total days and occupancy
    const allDays = [
      medicarePartADays, medicareAdvantageDays, managedCareDays,
      medicaidDays, managedMedicaidDays, privateDays,
      vaContractDays, hospiceDays, otherDays
    ].map(d => Number(d) || 0);

    const totalPatientDays = allDays.reduce((a, b) => a + b, 0);

    // Calculate days in period for occupancy
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const daysInPeriod = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const beds = totalBeds || facility.licensedBeds || 0;
    const maxPatientDays = beds * daysInPeriod;
    const occupancyRate = maxPatientDays > 0 ? totalPatientDays / maxPatientDays : 0;

    // Insert census period
    const [newPeriod] = await db
      .insert(facilityCensusPeriods)
      .values({
        facilityId,
        periodStart,
        periodEnd,
        medicarePartADays: medicarePartADays || 0,
        medicareAdvantageDays: medicareAdvantageDays || 0,
        managedCareDays: managedCareDays || 0,
        medicaidDays: medicaidDays || 0,
        managedMedicaidDays: managedMedicaidDays || 0,
        privateDays: privateDays || 0,
        vaContractDays: vaContractDays || 0,
        hospiceDays: hospiceDays || 0,
        otherDays: otherDays || 0,
        totalBeds: beds,
        occupancyRate: occupancyRate.toFixed(4),
        source,
        notes,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newPeriod,
    });
  } catch (error) {
    console.error('Error creating census period:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create census period' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update existing census period
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: facilityId } = await params;
    const body = await request.json();
    const { periodId, ...updateData } = body;

    if (!periodId) {
      return NextResponse.json(
        { success: false, error: 'Period ID is required' },
        { status: 400 }
      );
    }

    // Update census period
    const [updatedPeriod] = await db
      .update(facilityCensusPeriods)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(facilityCensusPeriods.id, periodId),
          eq(facilityCensusPeriods.facilityId, facilityId)
        )
      )
      .returning();

    if (!updatedPeriod) {
      return NextResponse.json(
        { success: false, error: 'Census period not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedPeriod,
    });
  } catch (error) {
    console.error('Error updating census period:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update census period' },
      { status: 500 }
    );
  }
}
