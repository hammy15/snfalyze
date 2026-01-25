import { NextRequest, NextResponse } from 'next/server';
import { db, facilities, facilityPayerRates, facilityCensusPeriods } from '@/db';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Fetch payer rates for a facility
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: facilityId } = await params;
    const searchParams = request.nextUrl.searchParams;

    // Optional date filter
    const asOfDate = searchParams.get('asOfDate');
    const includeHistory = searchParams.get('includeHistory') === 'true';

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

    // Build query - either get latest or all history
    let rates;
    if (includeHistory) {
      rates = await db.query.facilityPayerRates.findMany({
        where: eq(facilityPayerRates.facilityId, facilityId),
        orderBy: [desc(facilityPayerRates.effectiveDate)],
      });
    } else {
      // Get most recent rates
      rates = await db.query.facilityPayerRates.findFirst({
        where: eq(facilityPayerRates.facilityId, facilityId),
        orderBy: [desc(facilityPayerRates.effectiveDate)],
      });
      rates = rates ? [rates] : [];
    }

    // Calculate blended PPD if we have census data
    const latestCensus = await db.query.facilityCensusPeriods.findFirst({
      where: eq(facilityCensusPeriods.facilityId, facilityId),
      orderBy: [desc(facilityCensusPeriods.periodEnd)],
    });

    let blendedPpd = 0;
    if (rates.length > 0 && latestCensus) {
      const r = rates[0];
      const totalDays =
        Number(latestCensus.medicarePartADays || 0) +
        Number(latestCensus.medicareAdvantageDays || 0) +
        Number(latestCensus.managedCareDays || 0) +
        Number(latestCensus.medicaidDays || 0) +
        Number(latestCensus.managedMedicaidDays || 0) +
        Number(latestCensus.privateDays || 0) +
        Number(latestCensus.vaContractDays || 0) +
        Number(latestCensus.hospiceDays || 0) +
        Number(latestCensus.otherDays || 0);

      if (totalDays > 0) {
        blendedPpd =
          (Number(latestCensus.medicarePartADays || 0) * Number(r.medicarePartAPpd || 0) +
           Number(latestCensus.medicareAdvantageDays || 0) * Number(r.medicareAdvantagePpd || 0) +
           Number(latestCensus.managedCareDays || 0) * Number(r.managedCarePpd || 0) +
           Number(latestCensus.medicaidDays || 0) * Number(r.medicaidPpd || 0) +
           Number(latestCensus.managedMedicaidDays || 0) * Number(r.managedMedicaidPpd || 0) +
           Number(latestCensus.privateDays || 0) * Number(r.privatePpd || 0) +
           Number(latestCensus.vaContractDays || 0) * Number(r.vaContractPpd || 0) +
           Number(latestCensus.hospiceDays || 0) * Number(r.hospicePpd || 0)) / totalDays;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        facility: {
          id: facility.id,
          name: facility.name,
        },
        rates: rates,
        blendedPpd: Math.round(blendedPpd * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error fetching payer rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payer rates' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create new payer rate record
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
      effectiveDate,
      medicarePartAPpd,
      medicareAdvantagePpd,
      managedCarePpd,
      medicaidPpd,
      managedMedicaidPpd,
      privatePpd,
      vaContractPpd,
      hospicePpd,
      ancillaryRevenuePpd,
      therapyRevenuePpd,
      source = 'manual',
    } = body;

    // Insert new rate record
    const [newRate] = await db
      .insert(facilityPayerRates)
      .values({
        facilityId,
        effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
        medicarePartAPpd,
        medicareAdvantagePpd,
        managedCarePpd,
        medicaidPpd,
        managedMedicaidPpd,
        privatePpd,
        vaContractPpd,
        hospicePpd,
        ancillaryRevenuePpd,
        therapyRevenuePpd,
        source,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newRate,
    });
  } catch (error) {
    console.error('Error creating payer rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payer rates' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update existing payer rate record
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: facilityId } = await params;
    const body = await request.json();
    const { rateId, ...updateData } = body;

    if (!rateId) {
      return NextResponse.json(
        { success: false, error: 'Rate ID is required' },
        { status: 400 }
      );
    }

    // Update rate record
    const [updatedRate] = await db
      .update(facilityPayerRates)
      .set(updateData)
      .where(
        and(
          eq(facilityPayerRates.id, rateId),
          eq(facilityPayerRates.facilityId, facilityId)
        )
      )
      .returning();

    if (!updatedRate) {
      return NextResponse.json(
        { success: false, error: 'Payer rate record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedRate,
    });
  } catch (error) {
    console.error('Error updating payer rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payer rates' },
      { status: 500 }
    );
  }
}
