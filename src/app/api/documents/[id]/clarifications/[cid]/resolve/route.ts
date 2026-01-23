/**
 * Clarification Resolution API
 *
 * Resolve a specific clarification.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { extractionClarifications, documents, fieldCorrections } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { recordCorrection } from '@/lib/agent/memory/learning-loop';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; cid: string }> }
) {
  try {
    const { id: documentId, cid: clarificationId } = await params;
    const body = await request.json();
    const { value, reason, userId } = body as {
      value: unknown;
      reason?: string;
      userId?: string;
    };

    // Get the clarification
    const [clarification] = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.id, clarificationId),
          eq(extractionClarifications.documentId, documentId)
        )
      )
      .limit(1);

    if (!clarification) {
      return NextResponse.json({ error: 'Clarification not found' }, { status: 404 });
    }

    if (clarification.status !== 'pending') {
      return NextResponse.json(
        { error: 'Clarification already resolved', status: clarification.status },
        { status: 400 }
      );
    }

    // Update clarification
    await db
      .update(extractionClarifications)
      .set({
        status: 'resolved',
        resolvedValue: typeof value === 'string' ? value : JSON.stringify(value),
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNotes: reason,
      })
      .where(eq(extractionClarifications.id, clarificationId));

    // Get document for context
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    // Record correction for learning (if value differs from extracted)
    if (
      clarification.extractedValue !== null &&
      JSON.stringify(value) !== clarification.extractedValue
    ) {
      await recordCorrection({
        documentId,
        dealId: clarification.dealId || undefined,
        documentType: document?.type || 'other',
        fieldName: clarification.fieldName,
        originalValue: clarification.extractedValue,
        correctedValue: value,
        correctionSource: 'user',
      });
    }

    // Update document pending count
    const pendingCount = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.documentId, documentId),
          eq(extractionClarifications.status, 'pending')
        )
      );

    await db
      .update(documents)
      .set({
        pendingClarifications: pendingCount.length,
        clarificationStatus: pendingCount.length > 0 ? 'pending' : 'resolved',
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json({
      success: true,
      clarificationId,
      status: 'resolved',
      resolvedValue: value,
    });
  } catch (error) {
    console.error('Error resolving clarification:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve clarification' },
      { status: 500 }
    );
  }
}
