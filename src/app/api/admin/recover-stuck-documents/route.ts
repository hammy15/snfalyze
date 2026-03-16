export const dynamic = 'force-dynamic'
/**
 * Admin: Recover Stuck Documents
 *
 * Marks documents stuck in intermediate processing states (parsing, normalizing,
 * analyzing, extracting) with no raw_text or extracted_data as 'error', so users
 * know to re-upload them.
 *
 * Root cause of stuck documents: the old upload route called processDocument()
 * as a fire-and-forget after returning the HTTP response. Vercel kills background
 * tasks post-response, so the function was terminated mid-execution after writing
 * the intermediate status but before writing rawText/extractedData. The outer
 * try/catch never ran to set status='error'.
 *
 * This was fixed in the upload routes (parsing now happens inline, synchronously,
 * before the response is returned). This endpoint cleans up legacy stuck documents.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { and, isNull, inArray } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    // Find documents stuck in intermediate states with no content
    const stuckDocs = await db
      .select({ id: documents.id, filename: documents.filename, status: documents.status })
      .from(documents)
      .where(
        and(
          inArray(documents.status, ['parsing', 'normalizing', 'analyzing', 'extracting'] as any[]),
          isNull(documents.rawText),
          isNull(documents.extractedData)
        )
      );

    if (stuckDocs.length === 0) {
      return NextResponse.json({
        success: true,
        data: { recovered: 0, message: 'No stuck documents found.' },
      });
    }

    // Mark them all as error with explanation
    const ids = stuckDocs.map((d) => d.id);
    await db
      .update(documents)
      .set({
        status: 'error',
        errors: [
          'Document processing interrupted: file was uploaded but background processing was killed before ' +
          'raw text extraction completed (Vercel serverless timeout). Please re-upload this file.',
        ],
      })
      .where(inArray(documents.id, ids));

    return NextResponse.json({
      success: true,
      data: {
        recovered: stuckDocs.length,
        documents: stuckDocs.map((d) => ({ id: d.id, filename: d.filename, wasStatus: d.status })),
        message: `Marked ${stuckDocs.length} stuck document(s) as error. Users should re-upload these files.`,
      },
    });
  } catch (error) {
    console.error('Error recovering stuck documents:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Just count stuck documents without modifying
    const stuckDocs = await db
      .select({ id: documents.id, filename: documents.filename, status: documents.status })
      .from(documents)
      .where(
        and(
          inArray(documents.status, ['parsing', 'normalizing', 'analyzing', 'extracting'] as any[]),
          isNull(documents.rawText),
          isNull(documents.extractedData)
        )
      );

    return NextResponse.json({
      success: true,
      data: {
        count: stuckDocs.length,
        documents: stuckDocs,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
