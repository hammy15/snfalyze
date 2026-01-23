import { NextRequest, NextResponse } from 'next/server';
import { db, dealCoaMappings, deals, documents, facilities, coaMappings } from '@/db';
import { eq, and, isNull, or, ilike, sql } from 'drizzle-orm';

// GET - Get all COA mappings for a deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const unmappedOnly = searchParams.get('unmappedOnly') === 'true';
    const facilityId = searchParams.get('facilityId');
    const documentId = searchParams.get('documentId');

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Build query conditions
    const conditions = [eq(dealCoaMappings.dealId, dealId)];

    if (unmappedOnly) {
      conditions.push(eq(dealCoaMappings.isMapped, false));
    }

    if (facilityId) {
      conditions.push(eq(dealCoaMappings.facilityId, facilityId));
    }

    if (documentId) {
      conditions.push(eq(dealCoaMappings.documentId, documentId));
    }

    const mappings = await db
      .select()
      .from(dealCoaMappings)
      .where(and(...conditions));

    // Get summary stats
    const allMappings = await db
      .select()
      .from(dealCoaMappings)
      .where(eq(dealCoaMappings.dealId, dealId));

    const totalItems = allMappings.length;
    const mappedItems = allMappings.filter(m => m.isMapped).length;
    const unmappedItems = totalItems - mappedItems;
    const reviewedItems = allMappings.filter(m => m.reviewedAt).length;

    return NextResponse.json({
      success: true,
      data: {
        mappings,
        summary: {
          totalItems,
          mappedItems,
          unmappedItems,
          reviewedItems,
          mappingProgress: totalItems > 0 ? Math.round((mappedItems / totalItems) * 100) : 0,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching COA mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch COA mappings' },
      { status: 500 }
    );
  }
}

// POST - Create COA mapping entries from extracted data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();
    const { items, documentId, facilityId, autoMap = true } = body;

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items array is required' },
        { status: 400 }
      );
    }

    // Get existing COA mappings for auto-mapping
    const existingMappings = autoMap
      ? await db.select().from(coaMappings)
      : [];

    // Process and create mappings
    const createdMappings = await Promise.all(
      items.map(async (item: {
        sourceLabel: string;
        sourceValue?: number;
        sourceMonth?: string;
      }) => {
        // Try to auto-map using existing COA mappings
        let coaCode: string | null = null;
        let coaName: string | null = null;
        let mappingConfidence: number | null = null;
        let mappingMethod: 'auto' | 'suggested' | 'manual' | null = null;
        let isMapped = false;
        let proformaDestination: string | null = null;

        if (autoMap && existingMappings.length > 0) {
          // Try exact match first
          const exactMatch = existingMappings.find(
            m => m.externalTerm.toLowerCase() === item.sourceLabel.toLowerCase()
          );

          if (exactMatch) {
            coaCode = exactMatch.cascadiaTerm;
            coaName = exactMatch.category || exactMatch.cascadiaTerm;
            mappingConfidence = 1.0;
            mappingMethod = 'auto';
            isMapped = true;
            proformaDestination = exactMatch.subcategory || exactMatch.category;
          } else {
            // Try fuzzy match
            const normalizedLabel = item.sourceLabel.toLowerCase().replace(/[^a-z0-9]/g, '');
            const fuzzyMatch = existingMappings.find(m => {
              const normalizedTerm = m.externalTerm.toLowerCase().replace(/[^a-z0-9]/g, '');
              return normalizedTerm.includes(normalizedLabel) ||
                     normalizedLabel.includes(normalizedTerm);
            });

            if (fuzzyMatch) {
              coaCode = fuzzyMatch.cascadiaTerm;
              coaName = fuzzyMatch.category || fuzzyMatch.cascadiaTerm;
              mappingConfidence = 0.7;
              mappingMethod = 'suggested';
              proformaDestination = fuzzyMatch.subcategory || fuzzyMatch.category;
              // Don't mark as mapped for suggestions - needs review
            }
          }
        }

        const [created] = await db
          .insert(dealCoaMappings)
          .values({
            dealId,
            facilityId: facilityId || null,
            documentId: documentId || null,
            sourceLabel: item.sourceLabel,
            sourceValue: item.sourceValue?.toString() || null,
            sourceMonth: item.sourceMonth || null,
            coaCode,
            coaName,
            mappingConfidence: mappingConfidence?.toString() || null,
            mappingMethod,
            isMapped,
            proformaDestination,
          })
          .returning();

        return created;
      })
    );

    const mappedCount = createdMappings.filter(m => m.isMapped).length;
    const suggestedCount = createdMappings.filter(
      m => m.mappingMethod === 'suggested'
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        mappings: createdMappings,
        summary: {
          total: createdMappings.length,
          autoMapped: mappedCount,
          suggested: suggestedCount,
          unmapped: createdMappings.length - mappedCount - suggestedCount,
        },
      },
    });
  } catch (error) {
    console.error('Error creating COA mappings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create COA mappings' },
      { status: 500 }
    );
  }
}
