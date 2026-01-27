/**
 * Extraction Pipeline API Routes
 *
 * POST - Start a new extraction pipeline
 * GET - Get all pipeline sessions for a deal
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, documents } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import {
  startExtractionPipeline,
  getSession,
} from '@/lib/extraction/pipeline';

// ============================================================================
// POST - Start Pipeline
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Verify deal exists
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      return NextResponse.json(
        { error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { documentIds, model } = body as {
      documentIds?: string[];
      model?: string;
    };

    // Get documents to process
    let docsToProcess: { id: string }[];

    if (documentIds && documentIds.length > 0) {
      // Use specified documents
      docsToProcess = await db
        .select({ id: documents.id })
        .from(documents)
        .where(
          and(
            eq(documents.dealId, dealId),
            inArray(documents.id, documentIds)
          )
        );
    } else {
      // Use all documents for the deal
      docsToProcess = await db
        .select({ id: documents.id })
        .from(documents)
        .where(eq(documents.dealId, dealId));
    }

    if (docsToProcess.length === 0) {
      return NextResponse.json(
        { error: 'No documents found to process' },
        { status: 400 }
      );
    }

    // Start the pipeline
    const { sessionId, executePromise } = await startExtractionPipeline({
      dealId,
      documentIds: docsToProcess.map((d) => d.id),
      apiKey: process.env.ANTHROPIC_API_KEY,
      model,
    });

    // Don't await the execution - let it run in the background
    executePromise.catch((error) => {
      console.error(`Pipeline ${sessionId} failed:`, error);
    });

    return NextResponse.json({
      sessionId,
      status: 'started',
      documentCount: docsToProcess.length,
      streamUrl: `/api/deals/${dealId}/extraction/pipeline/${sessionId}/stream`,
    });
  } catch (error) {
    console.error('Error starting extraction pipeline:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start pipeline' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - List Pipeline Sessions
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // For now, we only have in-memory sessions
    // In production, you'd query a database table for pipeline_sessions

    // This is a simplified response
    return NextResponse.json({
      sessions: [],
      message: 'Session history not persisted in current implementation',
    });
  } catch (error) {
    console.error('Error listing pipeline sessions:', error);
    return NextResponse.json(
      { error: 'Failed to list sessions' },
      { status: 500 }
    );
  }
}
