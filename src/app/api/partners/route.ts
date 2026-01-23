import { NextRequest, NextResponse } from 'next/server';
import { db, capitalPartners } from '@/db';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const partners = await db
      .select()
      .from(capitalPartners)
      .orderBy(desc(capitalPartners.createdAt));

    return NextResponse.json({
      success: true,
      data: partners,
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch partners' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      type,
      assetTypes,
      geographies,
      minDealSize,
      maxDealSize,
      targetYield,
      maxLtv,
      preferredStructure,
      riskTolerance,
      contactName,
      contactEmail,
      notes,
    } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Create partner
    const [newPartner] = await db
      .insert(capitalPartners)
      .values({
        name,
        type,
        assetTypes,
        geographies,
        minDealSize,
        maxDealSize,
        targetYield,
        maxLtv,
        preferredStructure,
        riskTolerance,
        contactName,
        contactEmail,
        notes,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newPartner,
    });
  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create partner' },
      { status: 500 }
    );
  }
}
