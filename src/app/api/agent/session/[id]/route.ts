/**
 * Agent Session API - Individual Session
 *
 * Get session state and end sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resumeAgentSession } from '@/lib/agent';
import { getSession, endSession } from '@/lib/agent/agent-state';

// GET - Get session state
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    const session = await getSession(sessionId);

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: session.id,
      dealId: session.dealId,
      userId: session.userId,
      status: session.status,
      model: session.model,
      messageCount: session.messageCount,
      startedAt: session.startedAt,
      lastActiveAt: session.lastActiveAt,
      endedAt: session.endedAt,
    });
  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get session' },
      { status: 500 }
    );
  }
}

// DELETE - End session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    await endSession(sessionId);

    return NextResponse.json({ success: true, message: 'Session ended' });
  } catch (error) {
    console.error('Error ending session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to end session' },
      { status: 500 }
    );
  }
}
