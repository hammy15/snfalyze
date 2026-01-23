/**
 * Document Extraction API
 *
 * Triggers document extraction and returns results.
 * Used by the wizard for batch document processing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents, extractionClarifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ClarificationEngine, type ExtractedField } from '@/lib/analysis/document-extraction/clarification-engine';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { dealId, deep = false } = body as { dealId?: string; deep?: boolean };

    // Verify document exists
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get extracted data
    const extractedData = document.extractedData as Record<string, ExtractedField> | null;

    if (!extractedData || Object.keys(extractedData).length === 0) {
      // Document hasn't been processed yet
      // For now, return a placeholder response
      // In production, this would trigger actual extraction
      return NextResponse.json({
        success: true,
        data: {
          documentId,
          fieldsExtracted: 0,
          clarifications: [],
          confidence: 0,
          status: 'pending',
          message: 'Document needs processing. Upload and initial analysis required.',
        },
      });
    }

    // Run clarification analysis if deep extraction requested
    let clarifications: Array<{
      id: string;
      fieldName: string;
      type: string;
      reason: string;
    }> = [];

    if (deep) {
      const clarificationEngine = new ClarificationEngine();
      const clarificationResult = await clarificationEngine.analyzeExtraction({
        documentId,
        dealId,
        extractedData,
        documentType: document.type || undefined,
      });

      clarifications = clarificationResult.clarifications.map((c) => ({
        id: c.id,
        fieldName: c.fieldName,
        type: c.clarificationType,
        reason: c.reason,
      }));
    }

    // Calculate overall confidence
    const fieldValues = Object.values(extractedData);
    const totalConfidence = fieldValues.reduce(
      (sum, field) => sum + (field.confidence || 0),
      0
    );
    const averageConfidence =
      fieldValues.length > 0 ? totalConfidence / fieldValues.length : 0;

    // Update document status
    await db
      .update(documents)
      .set({
        status: clarifications.length > 0 ? 'needs_review' : 'completed',
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        fieldsExtracted: Object.keys(extractedData).length,
        clarifications,
        confidence: averageConfidence,
        status: clarifications.length > 0 ? 'review_needed' : 'complete',
      },
    });
  } catch (error) {
    console.error('Error extracting document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to extract document' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;

    // Get document with extraction data
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // Get clarifications
    const clarificationsList = await db
      .select()
      .from(extractionClarifications)
      .where(eq(extractionClarifications.documentId, documentId));

    const extractedData = document.extractedData as Record<string, ExtractedField> | null;
    const fieldCount = extractedData ? Object.keys(extractedData).length : 0;
    const resolvedCount = clarificationsList.filter((c) => c.status === 'resolved').length;

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        status: document.status,
        fieldsExtracted: fieldCount,
        clarificationsCount: clarificationsList.length,
        clarificationsResolved: resolvedCount,
        extractedData,
      },
    });
  } catch (error) {
    console.error('Error getting extraction status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get extraction status' },
      { status: 500 }
    );
  }
}
