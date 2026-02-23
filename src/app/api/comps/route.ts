import { NextRequest, NextResponse } from 'next/server';
import { db, comparableSales } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const results = await db
      .select()
      .from(comparableSales)
      .orderBy(desc(comparableSales.saleDate));

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error('Comps GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch comps' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const [entry] = await db
      .insert(comparableSales)
      .values({
        propertyName: body.propertyName,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        assetType: body.assetType || null,
        beds: body.beds || null,
        saleDate: body.saleDate || null,
        salePrice: body.salePrice?.toString() || null,
        pricePerBed: body.pricePerBed?.toString() || null,
        capRate: body.capRate?.toString() || null,
        noiAtSale: body.noiAtSale?.toString() || null,
        occupancyAtSale: body.occupancyAtSale?.toString() || null,
        buyer: body.buyer || null,
        seller: body.seller || null,
        broker: body.broker || null,
        source: body.source || 'manual_entry',
        notes: body.notes || null,
        verified: false,
      })
      .returning();

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error('Comps POST error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add comp' }, { status: 500 });
  }
}
