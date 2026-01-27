/**
 * Deal Clarifications API
 *
 * GET - List clarifications for a deal
 * POST - Batch operations on clarifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { extractionClarifications, documents } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, resolved, skipped, all

    // Build query
    let query = db
      .select({
        id: extractionClarifications.id,
        documentId: extractionClarifications.documentId,
        fieldName: extractionClarifications.fieldName,
        fieldPath: extractionClarifications.fieldPath,
        extractedValue: extractionClarifications.extractedValue,
        suggestedValues: extractionClarifications.suggestedValues,
        benchmarkValue: extractionClarifications.benchmarkValue,
        benchmarkRange: extractionClarifications.benchmarkRange,
        clarificationType: extractionClarifications.clarificationType,
        status: extractionClarifications.status,
        confidenceScore: extractionClarifications.confidenceScore,
        priority: extractionClarifications.priority,
        reason: extractionClarifications.reason,
        resolvedValue: extractionClarifications.resolvedValue,
        resolvedBy: extractionClarifications.resolvedBy,
        resolvedAt: extractionClarifications.resolvedAt,
        createdAt: extractionClarifications.createdAt,
        document: {
          id: documents.id,
          filename: documents.filename,
          type: documents.type,
        },
      })
      .from(extractionClarifications)
      .leftJoin(documents, eq(extractionClarifications.documentId, documents.id))
      .where(eq(extractionClarifications.dealId, dealId))
      .orderBy(desc(extractionClarifications.priority), desc(extractionClarifications.createdAt));

    const clarifications = await query;

    // Filter by status if specified
    const filtered = status && status !== 'all'
      ? clarifications.filter(c => c.status === status)
      : clarifications;

    return NextResponse.json({
      success: true,
      data: filtered,
      meta: {
        total: clarifications.length,
        pending: clarifications.filter(c => c.status === 'pending').length,
        resolved: clarifications.filter(c => c.status === 'resolved').length,
        skipped: clarifications.filter(c => c.status === 'skipped').length,
      },
    });
  } catch (error) {
    console.error('Error fetching clarifications:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clarifications' },
      { status: 500 }
    );
  }
}
