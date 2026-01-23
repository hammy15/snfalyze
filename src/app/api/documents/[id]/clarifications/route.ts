/**
 * Document Clarifications API
 *
 * List pending clarifications for a document.
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
    const { id: documentId } = await params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const includeResolved = searchParams.get('includeResolved') === 'true';

    // Verify document exists
    const [document] = await db
      .select({ id: documents.id })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Build query conditions
    const conditions = [eq(extractionClarifications.documentId, documentId)];

    if (!includeResolved) {
      conditions.push(eq(extractionClarifications.status, status as 'pending'));
    }

    // Get clarifications
    const clarifications = await db
      .select()
      .from(extractionClarifications)
      .where(and(...conditions))
      .orderBy(desc(extractionClarifications.priority), desc(extractionClarifications.createdAt));

    return NextResponse.json({
      documentId,
      total: clarifications.length,
      pending: clarifications.filter((c) => c.status === 'pending').length,
      clarifications: clarifications.map((c) => ({
        id: c.id,
        fieldName: c.fieldName,
        fieldPath: c.fieldPath,
        extractedValue: c.extractedValue,
        suggestedValues: c.suggestedValues,
        benchmarkValue: c.benchmarkValue,
        benchmarkRange: c.benchmarkRange,
        clarificationType: c.clarificationType,
        status: c.status,
        confidenceScore: c.confidenceScore,
        reason: c.reason,
        priority: c.priority,
        resolvedValue: c.resolvedValue,
        resolvedBy: c.resolvedBy,
        resolvedAt: c.resolvedAt,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error getting clarifications:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get clarifications' },
      { status: 500 }
    );
  }
}
