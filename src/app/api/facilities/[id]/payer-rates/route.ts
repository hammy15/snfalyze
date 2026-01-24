import { NextRequest, NextResponse } from 'next/server';
import { db, facilityPayerRates, facilities } from '@/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const facilityId = params.id;

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

    // Fetch payer rates for this facility, ordered by effective date
    const payerRates = await db.query.facilityPayerRates.findMany({
      where: eq(facilityPayerRates.facilityId, facilityId),
      orderBy: [desc(facilityPayerRates.effectiveDate)],
    });

    // Current rates are the most recent
    const currentRates = payerRates[0] || null;
    const historicalRates = payerRates.slice(1);

    return NextResponse.json({
      success: true,
      data: {
        facilityId,
        facilityName: facility.name,
        currentRates,
        historicalRates,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const facilityId = params.id;
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

    // Create new payer rates record
    const [inserted] = await db
      .insert(facilityPayerRates)
      .values({
        facilityId,
        effectiveDate: body.effectiveDate || new Date().toISOString().split('T')[0],
        medicarePartAPpd: body.medicarePartAPpd,
        medicareAdvantagePpd: body.medicareAdvantagePpd,
        managedCarePpd: body.managedCarePpd,
        medicaidPpd: body.medicaidPpd,
        managedMedicaidPpd: body.managedMedicaidPpd,
        privatePpd: body.privatePpd,
        vaContractPpd: body.vaContractPpd,
        hospicePpd: body.hospicePpd,
        ancillaryRevenuePpd: body.ancillaryRevenuePpd,
        therapyRevenuePpd: body.therapyRevenuePpd,
        source: body.source || 'manual',
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: inserted,
    });
  } catch (error) {
    console.error('Error creating payer rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payer rates' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const facilityId = params.id;
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'Rate ID required for update' },
        { status: 400 }
      );
    }

    // Update existing payer rates
    const [updated] = await db
      .update(facilityPayerRates)
      .set({
        medicarePartAPpd: body.medicarePartAPpd,
        medicareAdvantagePpd: body.medicareAdvantagePpd,
        managedCarePpd: body.managedCarePpd,
        medicaidPpd: body.medicaidPpd,
        managedMedicaidPpd: body.managedMedicaidPpd,
        privatePpd: body.privatePpd,
        vaContractPpd: body.vaContractPpd,
        hospicePpd: body.hospicePpd,
        ancillaryRevenuePpd: body.ancillaryRevenuePpd,
        therapyRevenuePpd: body.therapyRevenuePpd,
        source: body.source,
      })
      .where(eq(facilityPayerRates.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Payer rates not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating payer rates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update payer rates' },
      { status: 500 }
    );
  }
}
