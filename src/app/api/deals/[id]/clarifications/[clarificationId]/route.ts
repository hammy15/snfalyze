/**
 * Individual Clarification API
 *
 * GET - Get single clarification
 * PATCH - Update/resolve clarification
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { extractionClarifications, fieldCorrections } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clarificationId: string }> }
) {
  try {
    const { id: dealId, clarificationId } = await params;

    const [clarification] = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.id, clarificationId),
          eq(extractionClarifications.dealId, dealId)
        )
      )
      .limit(1);

    if (!clarification) {
      return NextResponse.json(
        { success: false, error: 'Clarification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: clarification,
    });
  } catch (error) {
    console.error('Error fetching clarification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch clarification' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clarificationId: string }> }
) {
  try {
    const { id: dealId, clarificationId } = await params;
    const body = await request.json();
    const { status, resolvedValue, resolvedNote, resolvedBy } = body;

    // Verify clarification exists
    const [existing] = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.id, clarificationId),
          eq(extractionClarifications.dealId, dealId)
        )
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Clarification not found' },
        { status: 404 }
      );
    }

    // Build update object
    const updates: Record<string, any> = {};

    if (status) {
      updates.status = status;
    }

    if (resolvedValue !== undefined) {
      updates.resolvedValue = String(resolvedValue);
    }

    if (resolvedNote) {
      updates.resolutionNotes = resolvedNote;
    }

    if (status === 'resolved' || status === 'skipped') {
      updates.resolvedAt = new Date();
      updates.resolvedBy = resolvedBy || 'user';
    }

    // Update clarification
    const [updated] = await db
      .update(extractionClarifications)
      .set(updates)
      .where(eq(extractionClarifications.id, clarificationId))
      .returning();

    // If resolved with a value, create a field correction for learning
    if (status === 'resolved' && resolvedValue !== undefined && existing.extractedValue !== resolvedValue) {
      try {
        await db.insert(fieldCorrections).values({
          dealId,
          documentId: existing.documentId,
          fieldName: existing.fieldPath || existing.fieldName,
          originalValue: existing.extractedValue || '',
          correctedValue: String(resolvedValue),
          correctionSource: 'user',
          correctedBy: resolvedBy || 'user',
          contextSnippet: resolvedNote,
        });
      } catch (err) {
        // Field corrections are for learning - don't fail the main operation
        console.warn('Failed to record field correction:', err);
      }
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error updating clarification:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update clarification' },
      { status: 500 }
    );
  }
}
