/**
 * Pipeline Clarifications API Routes
 *
 * GET - Get pending clarifications for a session
 * POST - Resolve a clarification
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  getSessionContext,
  resolveClarification,
  continuePipelineAfterClarifications,
} from '@/lib/extraction/pipeline';

// ============================================================================
// GET - Get Clarifications
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const contextManager = getSessionContext(sessionId);
    if (!contextManager) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    const pending = contextManager.getPendingClarifications();

    return NextResponse.json({
      clarifications: pending.map((c) => ({
        id: c.id,
        fieldPath: c.fieldPath,
        fieldLabel: c.fieldLabel,
        clarificationType: c.clarificationType,
        priority: c.priority,
        extractedValue: c.extractedValue,
        extractedConfidence: c.extractedConfidence,
        suggestedValues: c.suggestedValues,
        benchmarkRange: c.benchmarkRange,
        context: c.context,
        status: c.status,
        createdAt: c.createdAt,
      })),
      highPriorityCount: pending.filter((c) => c.priority >= 8).length,
      totalCount: pending.length,
    });
  } catch (error) {
    console.error('Error getting clarifications:', error);
    return NextResponse.json(
      { error: 'Failed to get clarifications' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Resolve Clarification
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const body = await request.json();
    const {
      clarificationId,
      resolvedValue,
      resolvedBy,
      note,
      continueAfterResolution,
    } = body as {
      clarificationId: string;
      resolvedValue: number | string;
      resolvedBy: string;
      note?: string;
      continueAfterResolution?: boolean;
    };

    if (!clarificationId || resolvedValue === undefined || !resolvedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: clarificationId, resolvedValue, resolvedBy' },
        { status: 400 }
      );
    }

    const success = resolveClarification(
      sessionId,
      clarificationId,
      resolvedValue,
      resolvedBy,
      note
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Session or clarification not found' },
        { status: 404 }
      );
    }

    // Check if we should continue the pipeline
    if (continueAfterResolution) {
      const session = await continuePipelineAfterClarifications(sessionId);
      if (session) {
        return NextResponse.json({
          success: true,
          clarificationId,
          pipelineStatus: session.status,
          pipelineContinued: session.status !== 'awaiting_clarifications',
        });
      }
    }

    // Get remaining clarifications
    const contextManager = getSessionContext(sessionId);
    const remaining = contextManager?.getPendingClarifications() || [];

    return NextResponse.json({
      success: true,
      clarificationId,
      remainingClarifications: remaining.length,
      highPriorityRemaining: remaining.filter((c) => c.priority >= 8).length,
    });
  } catch (error) {
    console.error('Error resolving clarification:', error);
    return NextResponse.json(
      { error: 'Failed to resolve clarification' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - Bulk Resolve Clarifications
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const body = await request.json();
    const {
      resolutions,
      resolvedBy,
      continueAfterResolution,
    } = body as {
      resolutions: { clarificationId: string; resolvedValue: number | string; note?: string }[];
      resolvedBy: string;
      continueAfterResolution?: boolean;
    };

    if (!resolutions || !Array.isArray(resolutions) || !resolvedBy) {
      return NextResponse.json(
        { error: 'Missing required fields: resolutions array, resolvedBy' },
        { status: 400 }
      );
    }

    const results: { clarificationId: string; success: boolean }[] = [];

    for (const resolution of resolutions) {
      const success = resolveClarification(
        sessionId,
        resolution.clarificationId,
        resolution.resolvedValue,
        resolvedBy,
        resolution.note
      );
      results.push({ clarificationId: resolution.clarificationId, success });
    }

    // Check if we should continue the pipeline
    let pipelineStatus: string | undefined;
    let pipelineContinued = false;

    if (continueAfterResolution) {
      const session = await continuePipelineAfterClarifications(sessionId);
      if (session) {
        pipelineStatus = session.status;
        pipelineContinued = session.status !== 'awaiting_clarifications';
      }
    }

    // Get remaining clarifications
    const contextManager = getSessionContext(sessionId);
    const remaining = contextManager?.getPendingClarifications() || [];

    return NextResponse.json({
      success: true,
      resolvedCount: results.filter((r) => r.success).length,
      results,
      remainingClarifications: remaining.length,
      highPriorityRemaining: remaining.filter((c) => c.priority >= 8).length,
      pipelineStatus,
      pipelineContinued,
    });
  } catch (error) {
    console.error('Error bulk resolving clarifications:', error);
    return NextResponse.json(
      { error: 'Failed to resolve clarifications' },
      { status: 500 }
    );
  }
}
