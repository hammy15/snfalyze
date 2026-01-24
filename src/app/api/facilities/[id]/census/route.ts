import { NextRequest, NextResponse } from 'next/server';
import { db, facilityCensusPeriods, facilities } from '@/db';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;

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

    // Fetch census periods for this facility
    const censusPeriods = await db.query.facilityCensusPeriods.findMany({
      where: eq(facilityCensusPeriods.facilityId, facilityId),
      orderBy: [desc(facilityCensusPeriods.periodEnd)],
    });

    return NextResponse.json({
      success: true,
      data: {
        facilityId,
        facilityName: facility.name,
        totalBeds: facility.licensedBeds,
        censusPeriods,
      },
    });
  } catch (error) {
    console.error('Error fetching census periods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch census periods' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Handle batch insert/update
    const periods = Array.isArray(body) ? body : [body];
    const results = [];

    for (const period of periods) {
      const [inserted] = await db
        .insert(facilityCensusPeriods)
        .values({
          facilityId,
          periodStart: period.periodStart,
          periodEnd: period.periodEnd,
          medicarePartADays: period.medicarePartADays || 0,
          medicareAdvantageDays: period.medicareAdvantageDays || 0,
          managedCareDays: period.managedCareDays || 0,
          medicaidDays: period.medicaidDays || 0,
          managedMedicaidDays: period.managedMedicaidDays || 0,
          privateDays: period.privateDays || 0,
          vaContractDays: period.vaContractDays || 0,
          hospiceDays: period.hospiceDays || 0,
          otherDays: period.otherDays || 0,
          totalBeds: period.totalBeds || facility.licensedBeds,
          occupancyRate: period.occupancyRate,
          source: period.source || 'manual',
          notes: period.notes,
        })
        .returning();

      results.push(inserted);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error creating census periods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create census periods' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;
    const body = await request.json();

    // Handle batch update
    const periods = Array.isArray(body) ? body : [body];
    const results = [];

    for (const period of periods) {
      if (!period.id) {
        // Create new period
        const [inserted] = await db
          .insert(facilityCensusPeriods)
          .values({
            facilityId,
            ...period,
            source: period.source || 'manual',
          })
          .returning();
        results.push(inserted);
      } else {
        // Update existing period
        const [updated] = await db
          .update(facilityCensusPeriods)
          .set({
            ...period,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(facilityCensusPeriods.id, period.id),
              eq(facilityCensusPeriods.facilityId, facilityId)
            )
          )
          .returning();
        if (updated) results.push(updated);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error updating census periods:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update census periods' },
      { status: 500 }
    );
  }
}
