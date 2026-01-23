/**
 * Document Extraction Stream API
 *
 * Server-Sent Events endpoint for real-time extraction feedback.
 * Streams extraction progress, field updates, and clarification requests.
 */

import { NextRequest } from 'next/server';
import { db } from '@/db';
import { documents, extractionClarifications } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ClarificationEngine, type ExtractedField } from '@/lib/analysis/document-extraction/clarification-engine';
import { LearningService } from '@/lib/analysis/document-extraction/learning-service';

// ============================================================================
// Types
// ============================================================================

interface StreamEvent {
  type: 'progress' | 'field_extracted' | 'clarification_needed' | 'complete' | 'error';
  data: unknown;
  timestamp: string;
}

// ============================================================================
// Route Handler
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: documentId } = await params;

  // Verify document exists
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!document) {
    return new Response(JSON.stringify({ error: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: StreamEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        // Initialize services
        const clarificationEngine = new ClarificationEngine();
        const learningService = new LearningService();

        // Send initial progress
        sendEvent({
          type: 'progress',
          data: { percent: 0, stage: 'Starting extraction...' },
          timestamp: new Date().toISOString(),
        });

        // Simulate extraction process (in real implementation, this would be the actual extraction)
        const extractedData = document.extractedData as Record<string, ExtractedField> | null;

        if (!extractedData) {
          sendEvent({
            type: 'error',
            data: { message: 'No extracted data available. Please process the document first.' },
            timestamp: new Date().toISOString(),
          });
          controller.close();
          return;
        }

        const fields = Object.entries(extractedData);
        const totalFields = fields.length;
        let processedFields = 0;

        // Process each field
        for (const [fieldName, fieldData] of fields) {
          processedFields++;
          const progress = Math.round((processedFields / totalFields) * 80);

          // Send field extracted event
          sendEvent({
            type: 'field_extracted',
            data: {
              fieldName,
              value: fieldData.value,
              confidence: fieldData.confidence,
              progress,
            },
            timestamp: new Date().toISOString(),
          });

          // Apply learned patterns
          const learningResult = await learningService.applyLearnedPatterns(
            { [fieldName]: fieldData },
            document.type || 'other'
          );

          // Check for suggested corrections
          if (learningResult.suggestedCorrections.length > 0) {
            for (const suggestion of learningResult.suggestedCorrections) {
              sendEvent({
                type: 'clarification_needed',
                data: {
                  fieldName: suggestion.fieldName,
                  extractedValue: suggestion.currentValue,
                  suggestedValue: suggestion.suggestedValue,
                  confidence: suggestion.confidence,
                  reason: 'Learned pattern suggests different value',
                  type: 'low_confidence',
                },
                timestamp: new Date().toISOString(),
              });
            }
          }

          // Small delay to simulate processing and allow client to process events
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        // Send progress update
        sendEvent({
          type: 'progress',
          data: { percent: 85, stage: 'Analyzing clarifications...' },
          timestamp: new Date().toISOString(),
        });

        // Run clarification analysis
        const clarificationResult = await clarificationEngine.analyzeExtraction({
          documentId,
          dealId: document.dealId || undefined,
          extractedData,
          documentType: document.type || undefined,
        });

        // Send clarification events
        for (const clarification of clarificationResult.clarifications) {
          sendEvent({
            type: 'clarification_needed',
            data: {
              id: clarification.id,
              fieldName: clarification.fieldName,
              extractedValue: clarification.extractedValue,
              suggestedValues: clarification.suggestedValues,
              benchmarkValue: clarification.benchmarkValue,
              benchmarkRange: clarification.benchmarkRange,
              type: clarification.clarificationType,
              reason: clarification.reason,
              priority: clarification.priority,
              confidence: clarification.confidenceScore,
            },
            timestamp: new Date().toISOString(),
          });
        }

        // Send completion event
        sendEvent({
          type: 'progress',
          data: { percent: 100, stage: 'Complete' },
          timestamp: new Date().toISOString(),
        });

        sendEvent({
          type: 'complete',
          data: {
            documentId,
            totalFields: totalFields,
            clarificationsGenerated: clarificationResult.clarificationsGenerated,
            autoResolved: clarificationResult.autoResolved.length,
            overallConfidence: clarificationResult.overallConfidence,
            criticalClarifications: clarificationResult.criticalClarifications,
          },
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        sendEvent({
          type: 'error',
          data: {
            message: error instanceof Error ? error.message : 'Unknown error occurred',
          },
          timestamp: new Date().toISOString(),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

/**
 * POST handler for triggering extraction with real-time feedback
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id: documentId } = await params;
  const body = await request.json().catch(() => ({}));

  const { reprocess = false, facilityType = 'SNF' } = body as {
    reprocess?: boolean;
    facilityType?: 'SNF' | 'ALF' | 'ILF';
  };

  // Verify document exists
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!document) {
    return new Response(JSON.stringify({ error: 'Document not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Update document status
  await db
    .update(documents)
    .set({
      status: 'analyzing',
      processedAt: null,
    })
    .where(eq(documents.id, documentId));

  // Clear existing clarifications if reprocessing
  if (reprocess) {
    await db
      .delete(extractionClarifications)
      .where(eq(extractionClarifications.documentId, documentId));
  }

  return new Response(
    JSON.stringify({
      message: 'Extraction started',
      documentId,
      streamUrl: `/api/documents/${documentId}/extract/stream`,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
