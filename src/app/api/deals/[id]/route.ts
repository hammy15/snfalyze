import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, valuations, financialPeriods, assumptions, capexItems, partnerMatches, riskFactors, documents } from '@/db';
import { eq } from 'drizzle-orm';
import { isValidUUID, invalidIdResponse } from '@/lib/validate-uuid';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: dealId } = await params;
    if (!isValidUUID(dealId)) return invalidIdResponse();

    // Fetch deal with related data
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: {
        facilities: true,
        financialPeriods: true,
        valuations: true,
        capexItems: true,
        assumptions: true,
        partnerMatches: true,
        riskFactors: true,
        documents: true,
      },
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: deal,
    });
  } catch (error) {
    console.error('Error fetching deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deal' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();

    // Update deal
    const [updatedDeal] = await db
      .update(deals)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId))
      .returning();

    if (!updatedDeal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedDeal,
    });
  } catch (error) {
    console.error('Error updating deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update deal' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: dealId } = await params;

    // Delete deal (cascades to related tables)
    const [deletedDeal] = await db
      .delete(deals)
      .where(eq(deals.id, dealId))
      .returning();

    if (!deletedDeal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: dealId },
    });
  } catch (error) {
    console.error('Error deleting deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete deal' },
      { status: 500 }
    );
  }
}
