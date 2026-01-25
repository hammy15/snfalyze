import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, valuations, financialPeriods } from '@/db';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const assetType = searchParams.get('assetType');

    // Fetch all deals
    const allDeals = await db.select().from(deals).orderBy(desc(deals.updatedAt));

    // Fetch facilities for each deal
    const dealsWithFacilities = await Promise.all(
      allDeals.map(async (deal) => {
        const dealFacilities = await db
          .select({
            id: facilities.id,
            name: facilities.name,
            licensedBeds: facilities.licensedBeds,
            city: facilities.city,
            state: facilities.state,
            assetType: facilities.assetType,
          })
          .from(facilities)
          .where(eq(facilities.dealId, deal.id));

        return {
          ...deal,
          facilities: dealFacilities,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: dealsWithFacilities,
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
      assetTypes, // Support both singular and array format
      askingPrice,
      beds,
      primaryState,
      brokerName,
      brokerFirm,
      sellerName,
      status,
    } = body;

    // Handle asset type - accept either singular or array
    const resolvedAssetType = assetType || (Array.isArray(assetTypes) ? assetTypes[0] : assetTypes);

    // Validate required fields
    if (!name || !resolvedAssetType) {
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
        assetType: resolvedAssetType,
        askingPrice,
        beds,
        primaryState,
        brokerName,
        brokerFirm,
        sellerName,
        status: status || 'new',
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
