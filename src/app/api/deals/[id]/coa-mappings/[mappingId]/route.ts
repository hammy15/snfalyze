import { NextRequest, NextResponse } from 'next/server';
import { db, dealCoaMappings, deals, coaMappings } from '@/db';
import { eq, and } from 'drizzle-orm';
import { learnFromMapping, normalizeLabel } from '@/lib/coa/mapping-learning';

// GET - Get a specific COA mapping
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    const { id: dealId, mappingId } = await params;

    const mappings = await db
      .select()
      .from(dealCoaMappings)
      .where(
        and(
          eq(dealCoaMappings.dealId, dealId),
          eq(dealCoaMappings.id, mappingId)
        )
      );

    if (mappings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'COA mapping not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: mappings[0],
    });
  } catch (error) {
    console.error('Error fetching COA mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch COA mapping' },
      { status: 500 }
    );
  }
}

// PATCH - Resolve/update a COA mapping
// Also learns from manual mappings for future suggestions
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    const { id: dealId, mappingId } = await params;
    const body = await request.json();
    const { coaCode, coaName, proformaDestination, reviewedBy } = body;

    // Verify mapping exists
    const existingMappings = await db
      .select()
      .from(dealCoaMappings)
      .where(
        and(
          eq(dealCoaMappings.dealId, dealId),
          eq(dealCoaMappings.id, mappingId)
        )
      );

    if (existingMappings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'COA mapping not found' },
        { status: 404 }
      );
    }

    const existing = existingMappings[0];
    const finalCoaCode = coaCode || existing.coaCode;
    const finalCoaName = coaName || existing.coaName;

    // Update the mapping
    const [updated] = await db
      .update(dealCoaMappings)
      .set({
        coaCode: finalCoaCode,
        coaName: finalCoaName,
        proformaDestination: proformaDestination || existing.proformaDestination,
        mappingMethod: 'manual',
        mappingConfidence: '1.0',
        isMapped: true,
        reviewedBy: reviewedBy || 'user',
        reviewedAt: new Date(),
      })
      .where(eq(dealCoaMappings.id, mappingId))
      .returning();

    // Learn from this manual mapping for future suggestions
    // This stores the mapping in the global coaMappings table
    if (finalCoaCode && existing.sourceLabel) {
      try {
        await learnFromMapping({
          dealId,
          facilityId: existing.facilityId || undefined,
          documentId: existing.documentId || undefined,
          sourceLabel: existing.sourceLabel,
          coaCode: finalCoaCode,
          coaName: finalCoaName || finalCoaCode,
          reviewedBy: reviewedBy || 'user',
        });
        console.log(`Learned mapping: "${existing.sourceLabel}" → ${finalCoaCode}`);
      } catch (learnError) {
        // Don't fail the request if learning fails
        console.error('Failed to learn from mapping:', learnError);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating COA mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update COA mapping' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a COA mapping
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mappingId: string }> }
) {
  try {
    const { id: dealId, mappingId } = await params;

    const existingMappings = await db
      .select()
      .from(dealCoaMappings)
      .where(
        and(
          eq(dealCoaMappings.dealId, dealId),
          eq(dealCoaMappings.id, mappingId)
        )
      );

    if (existingMappings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'COA mapping not found' },
        { status: 404 }
      );
    }

    await db.delete(dealCoaMappings).where(eq(dealCoaMappings.id, mappingId));

    return NextResponse.json({
      success: true,
      message: 'COA mapping deleted',
    });
  } catch (error) {
    console.error('Error deleting COA mapping:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete COA mapping' },
      { status: 500 }
    );
  }
}
