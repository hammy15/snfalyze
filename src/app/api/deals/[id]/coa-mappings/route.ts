import { NextRequest, NextResponse } from 'next/server';
import { db, dealCoaMappings, deals, documents, facilities, coaMappings } from '@/db';
import { eq, and, isNull, or, ilike, sql } from 'drizzle-orm';
import { findLearnedMatch, getLearnedSuggestions } from '@/lib/coa/mapping-learning';
import { findCOAMatch } from '@/lib/coa/coa-mapper';

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

    // Process and create mappings using the learning system
    const createdMappings = await Promise.all(
      items.map(async (item: {
        sourceLabel: string;
        sourceValue?: number;
        sourceMonth?: string;
      }) => {
        // Try to auto-map using the learning system + static rules
        let coaCode: string | null = null;
        let coaName: string | null = null;
        let mappingConfidence: number | null = null;
        let mappingMethod: 'auto' | 'suggested' | 'manual' | null = null;
        let isMapped = false;
        let proformaDestination: string | null = null;

        if (autoMap) {
          // 1. First try learned mappings (from previous manual mappings)
          const learnedMatch = await findLearnedMatch(item.sourceLabel, dealId, 0.75);

          if (learnedMatch) {
            coaCode = learnedMatch.coaCode;
            coaName = learnedMatch.coaName;
            mappingConfidence = learnedMatch.confidence;
            mappingMethod = learnedMatch.confidence >= 0.90 ? 'auto' : 'suggested';
            isMapped = learnedMatch.confidence >= 0.90;
            proformaDestination = learnedMatch.coaName;
          } else {
            // 2. Try static COA mapper rules
            const staticMatch = findCOAMatch(item.sourceLabel);

            if (staticMatch && staticMatch.confidence >= 0.75) {
              coaCode = staticMatch.coaCode;
              coaName = staticMatch.reason;
              mappingConfidence = staticMatch.confidence;
              mappingMethod = staticMatch.confidence >= 0.90 ? 'auto' : 'suggested';
              isMapped = staticMatch.confidence >= 0.90;
              proformaDestination = staticMatch.reason;
            } else if (staticMatch) {
              // Low confidence match - suggest but don't auto-map
              coaCode = staticMatch.coaCode;
              coaName = staticMatch.reason;
              mappingConfidence = staticMatch.confidence;
              mappingMethod = 'suggested';
              isMapped = false;
              proformaDestination = staticMatch.reason;
            } else {
              // 3. Get suggestions from learned patterns for review
              const suggestions = await getLearnedSuggestions(item.sourceLabel, dealId);
              if (suggestions.length > 0 && suggestions[0].confidence >= 0.50) {
                coaCode = suggestions[0].coaCode;
                coaName = suggestions[0].coaName;
                mappingConfidence = suggestions[0].confidence;
                mappingMethod = 'suggested';
                isMapped = false;
                proformaDestination = suggestions[0].coaName;
              }
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
