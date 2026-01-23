/**
 * Agent Session Message API
 *
 * Send messages to agent and receive responses.
 */

import { NextRequest, NextResponse } from 'next/server';
import { resumeAgentSession } from '@/lib/agent';
import { getSession } from '@/lib/agent/agent-state';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body = await request.json();
    const { message } = body as { message: string };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check session exists
    const session = await getSession(sessionId);
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'Session is not active', status: session.status },
        { status: 400 }
      );
    }

    // Resume agent and send message
    const { agent } = await resumeAgentSession(sessionId);
    const response = await agent.sendMessage(message);

    // Extract pending confirmations from tool executions that require confirmation
    const pendingConfirmations = response.toolExecutions
      ?.filter((te) => te.status === 'pending' && te.requiresConfirmation)
      .map((te) => ({
        executionId: te.id,
        tool: te.toolName,
        input: te.toolInput,
        description: `Execute ${te.toolName}`,
      }));

    return NextResponse.json({
      response: response.message.content,
      toolCalls: response.toolExecutions?.map((te) => ({
        id: te.id,
        tool: te.toolName,
        status: te.status,
        requiresConfirmation: te.requiresConfirmation,
      })),
      pendingConfirmations: pendingConfirmations || [],
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process message' },
      { status: 500 }
    );
  }
}
