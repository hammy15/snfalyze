import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { historicalDeals, historicalDealFiles, historicalDealFacilities } from '@/db/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/learning/deals/[id] — Get full historical deal detail
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deal] = await db
      .select()
      .from(historicalDeals)
      .where(eq(historicalDeals.id, id));

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Historical deal not found' },
        { status: 404 }
      );
    }

    const files = await db
      .select()
      .from(historicalDealFiles)
      .where(eq(historicalDealFiles.historicalDealId, id));

    const facilities = await db
      .select()
      .from(historicalDealFacilities)
      .where(eq(historicalDealFacilities.historicalDealId, id));

    return NextResponse.json({
      success: true,
      data: { ...deal, files, facilities },
    });
  } catch (error) {
    console.error('Error fetching historical deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch historical deal' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/learning/deals/[id] — Update metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const [updated] = await db
      .update(historicalDeals)
      .set({
        ...body,
        updatedAt: new Date(),
      })
      .where(eq(historicalDeals.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Historical deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating historical deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update historical deal' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/learning/deals/[id] — Remove historical deal
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [deleted] = await db
      .delete(historicalDeals)
      .where(eq(historicalDeals.id, id))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Historical deal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting historical deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete historical deal' },
      { status: 500 }
    );
  }
}
