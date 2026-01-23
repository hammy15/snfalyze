/**
 * Bulk Clarification Resolution API
 *
 * Resolve multiple clarifications at once.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { extractionClarifications, documents } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { recordCorrection } from '@/lib/agent/memory/learning-loop';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const body = await request.json();
    const { resolutions, userId } = body as {
      resolutions: Array<{
        clarificationId: string;
        value: unknown;
        reason?: string;
      }>;
      userId?: string;
    };

    if (!resolutions || !Array.isArray(resolutions) || resolutions.length === 0) {
      return NextResponse.json({ error: 'Resolutions array is required' }, { status: 400 });
    }

    // Verify document exists
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Get all clarifications to resolve
    const clarificationIds = resolutions.map((r) => r.clarificationId);
    const clarifications = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.documentId, documentId),
          inArray(extractionClarifications.id, clarificationIds)
        )
      );

    // Build resolution map
    const resolutionMap = new Map(resolutions.map((r) => [r.clarificationId, r]));

    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    // Process each clarification
    for (const clarification of clarifications) {
      const resolution = resolutionMap.get(clarification.id);
      if (!resolution) continue;

      if (clarification.status !== 'pending') {
        results.push({ id: clarification.id, success: false, error: 'Already resolved' });
        continue;
      }

      try {
        // Update clarification
        await db
          .update(extractionClarifications)
          .set({
            status: 'resolved',
            resolvedValue:
              typeof resolution.value === 'string'
                ? resolution.value
                : JSON.stringify(resolution.value),
            resolvedBy: userId,
            resolvedAt: new Date(),
            resolutionNotes: resolution.reason,
          })
          .where(eq(extractionClarifications.id, clarification.id));

        // Record correction for learning
        if (
          clarification.extractedValue !== null &&
          JSON.stringify(resolution.value) !== clarification.extractedValue
        ) {
          await recordCorrection({
            documentId,
            dealId: clarification.dealId || undefined,
            documentType: document.type || 'other',
            fieldName: clarification.fieldName,
            originalValue: clarification.extractedValue,
            correctedValue: resolution.value,
            correctionSource: 'user',
          });
        }

        results.push({ id: clarification.id, success: true });
      } catch (error) {
        results.push({
          id: clarification.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
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

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      success: failCount === 0,
      total: resolutions.length,
      resolved: successCount,
      failed: failCount,
      results,
      pendingRemaining: pendingCount.length,
    });
  } catch (error) {
    console.error('Error bulk resolving clarifications:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to bulk resolve clarifications' },
      { status: 500 }
    );
  }
}
