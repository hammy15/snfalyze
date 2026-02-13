import { NextRequest, NextResponse } from 'next/server';
import { SmartIntakePipeline, createPipelineSSEResponse } from '@/lib/pipeline/smart-intake';

// =============================================================================
// POST — Start Smart Intake Pipeline with SSE streaming
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // Convert files to buffers
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        name: file.name,
        buffer: Buffer.from(await file.arrayBuffer()),
        type: file.type,
      }))
    );

    // Create pipeline
    const pipeline = new SmartIntakePipeline();
    const emitter = pipeline.getEmitter();

    // Start execution (non-blocking — streams results)
    pipeline.execute(fileBuffers).catch((err) => {
      console.error('[Pipeline API] Execution error:', err);
    });

    // Return SSE stream
    const stream = createPipelineSSEResponse(emitter);

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Pipeline-Session-Id': pipeline.getSessionId(),
      },
    });
  } catch (error) {
    console.error('[Pipeline API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start pipeline' },
      { status: 500 }
    );
  }
}
