import { NextRequest, NextResponse } from 'next/server';
import { db, comparableSales } from '@/db';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.propertyName !== undefined) updateData.propertyName = body.propertyName;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.state !== undefined) updateData.state = body.state;
    if (body.assetType !== undefined) updateData.assetType = body.assetType;
    if (body.beds !== undefined) updateData.beds = body.beds;
    if (body.saleDate !== undefined) updateData.saleDate = body.saleDate;
    if (body.salePrice !== undefined) updateData.salePrice = body.salePrice?.toString();
    if (body.pricePerBed !== undefined) updateData.pricePerBed = body.pricePerBed?.toString();
    if (body.capRate !== undefined) updateData.capRate = body.capRate?.toString();
    if (body.noiAtSale !== undefined) updateData.noiAtSale = body.noiAtSale?.toString();
    if (body.occupancyAtSale !== undefined) updateData.occupancyAtSale = body.occupancyAtSale?.toString();
    if (body.buyer !== undefined) updateData.buyer = body.buyer;
    if (body.seller !== undefined) updateData.seller = body.seller;
    if (body.broker !== undefined) updateData.broker = body.broker;
    if (body.source !== undefined) updateData.source = body.source;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.verified !== undefined) updateData.verified = body.verified;

    const [updated] = await db
      .update(comparableSales)
      .set(updateData)
      .where(eq(comparableSales.id, id))
      .returning();

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Comps PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update comp' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.delete(comparableSales).where(eq(comparableSales.id, id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Comps DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete comp' }, { status: 500 });
  }
}
