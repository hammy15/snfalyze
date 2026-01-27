/**
 * Pipeline SSE Stream Route
 *
 * GET - Stream real-time progress events via Server-Sent Events
 */

import { NextRequest } from 'next/server';
import {
  getSessionEmitter,
  createSSEResponse,
} from '@/lib/extraction/pipeline';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  const { sessionId } = await params;

  const emitter = getSessionEmitter(sessionId);
  if (!emitter) {
    return new Response(
      JSON.stringify({ error: 'Session not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Create SSE response stream
  const stream = createSSEResponse(emitter);

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Disable body parsing for SSE
export const dynamic = 'force-dynamic';
