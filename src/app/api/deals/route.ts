import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, valuations, financialPeriods } from '@/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const assetType = searchParams.get('assetType');

    let query = db.select().from(deals).orderBy(desc(deals.updatedAt));

    // Apply filters if provided
    // Note: In production, use proper query building with drizzle

    const allDeals = await query;

    return NextResponse.json({
      success: true,
      data: allDeals,
    });
  } catch (error) {
    console.error('Error fetching deals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deals' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      assetType,
      askingPrice,
      beds,
      primaryState,
      brokerName,
      brokerFirm,
      sellerName,
    } = body;

    // Validate required fields
    if (!name || !assetType) {
      return NextResponse.json(
        { success: false, error: 'Name and asset type are required' },
        { status: 400 }
      );
    }

    // Create deal
    const [newDeal] = await db
      .insert(deals)
      .values({
        name,
        assetType,
        askingPrice,
        beds,
        primaryState,
        brokerName,
        brokerFirm,
        sellerName,
        status: 'new',
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newDeal,
    });
  } catch (error) {
    console.error('Error creating deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}
