/**
 * Agent Session API
 *
 * Create new agent sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAgent } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { dealId, userId, mode = 'chat' } = body as {
      dealId?: string;
      userId?: string;
      mode?: 'chat' | 'analysis' | 'extraction';
    };

    const agent = createAgent();

    const session = await agent.startSession({
      dealId,
      userId,
      initialContext: { metadata: { mode } } as never,
    });

    return NextResponse.json({
      sessionId: session.id,
      status: session.status,
      dealId: session.dealId,
      model: session.model,
      startedAt: session.startedAt,
    });
  } catch (error) {
    console.error('Error creating agent session:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
