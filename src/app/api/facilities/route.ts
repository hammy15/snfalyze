import { NextResponse } from 'next/server';
import { db } from '@/db';
import { facilities } from '@/db/schema';
import { eq, isNull } from 'drizzle-orm';

// Helper to add timeout to promises
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// GET /api/facilities - List all facilities (Cascadia portfolio - those without a dealId)
export async function GET() {
  try {
    // Get all Cascadia facilities (those without a dealId, which are portfolio holdings)
    // Add 8 second timeout to prevent hanging
    const portfolioFacilities = await withTimeout(
      db
        .select()
        .from(facilities)
        .where(isNull(facilities.dealId))
        .orderBy(facilities.state, facilities.name),
      8000
    );

    return NextResponse.json({
      success: true,
      data: portfolioFacilities,
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch facilities';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// POST /api/facilities - Create a new facility
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const [newFacility] = await db
      .insert(facilities)
      .values({
        dealId: body.dealId || null,
        name: body.name,
        ccn: body.ccn,
        address: body.address,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        assetType: body.assetType,
        licensedBeds: body.licensedBeds,
        certifiedBeds: body.certifiedBeds,
        yearBuilt: body.yearBuilt,
        lastRenovation: body.lastRenovation,
        squareFootage: body.squareFootage,
        acres: body.acres,
        cmsRating: body.cmsRating,
        healthRating: body.healthRating,
        staffingRating: body.staffingRating,
        qualityRating: body.qualityRating,
        isSff: body.isSff,
        isSffWatch: body.isSffWatch,
        hasImmediateJeopardy: body.hasImmediateJeopardy,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newFacility,
    });
  } catch (error) {
    console.error('Error creating facility:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create facility' },
      { status: 500 }
    );
  }
}
