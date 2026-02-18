import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { historicalDeals } from '@/db/schema';
import { desc } from 'drizzle-orm';

/**
 * GET /api/learning/deals — List all historical deals
 */
export async function GET() {
  try {
    const deals = await db
      .select()
      .from(historicalDeals)
      .orderBy(desc(historicalDeals.createdAt));

    return NextResponse.json({ success: true, data: deals });
  } catch (error) {
    console.error('Error fetching historical deals:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch historical deals' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/learning/deals — Create a new historical deal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, assetType, primaryState, dealDate, askingPrice, finalPrice, beds, facilityCount, dealStructure, notes, tags } = body;

    if (!name || !assetType) {
      return NextResponse.json(
        { success: false, error: 'name and assetType are required' },
        { status: 400 }
      );
    }

    const [deal] = await db
      .insert(historicalDeals)
      .values({
        name,
        assetType,
        primaryState,
        dealDate,
        askingPrice: askingPrice?.toString(),
        finalPrice: finalPrice?.toString(),
        beds,
        facilityCount: facilityCount || 1,
        dealStructure: dealStructure || 'purchase',
        notes,
        tags,
        status: 'uploading',
      })
      .returning();

    return NextResponse.json({ success: true, data: deal });
  } catch (error) {
    console.error('Error creating historical deal:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create historical deal' },
      { status: 500 }
    );
  }
}
