import { NextRequest, NextResponse } from 'next/server';
import { getPipelineSession } from '@/lib/pipeline/smart-intake';
import type { ClarificationAnswer } from '@/lib/pipeline/types';

// =============================================================================
// POST — Submit clarification answers and resume pipeline
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, answers } = body as {
      sessionId: string;
      answers: ClarificationAnswer[];
    };

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID required' },
        { status: 400 }
      );
    }

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: 'Answers array required' },
        { status: 400 }
      );
    }

    const pipeline = getPipelineSession(sessionId);

    if (!pipeline) {
      return NextResponse.json(
        { success: false, error: 'Pipeline session not found or already completed' },
        { status: 404 }
      );
    }

    const session = pipeline.getSession();
    if (session.status !== 'paused_for_clarification') {
      return NextResponse.json(
        { success: false, error: `Pipeline is not paused (status: ${session.status})` },
        { status: 409 }
      );
    }

    // Resume pipeline with answers
    await pipeline.resumeAfterClarifications(answers);

    return NextResponse.json({
      success: true,
      message: `Resumed pipeline with ${answers.length} answers`,
    });
  } catch (error) {
    console.error('[Pipeline Clarify API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process clarifications' },
      { status: 500 }
    );
  }
}
