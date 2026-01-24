/**
 * Streaming Per-File Extraction API
 *
 * Processes files ONE AT A TIME with detailed progress updates via SSE.
 * Each file is fully processed before moving to the next.
 */

import { NextRequest } from 'next/server';
import { db, documents, facilities } from '@/db';
import { inArray, eq } from 'drizzle-orm';
import { join } from 'path';
import { extractSingleFile, type PerFileExtractionResult } from '@/lib/extraction/per-file-extractor';
import { populateFromExtraction } from '@/lib/extraction/db-populator';

// Use /tmp on Vercel (serverless), local uploads folder in development
const getUploadsDir = () => {
  if (process.env.VERCEL) {
    return '/tmp/wizard-uploads';
  }
  return join(process.cwd(), 'uploads', 'wizard');
};

interface ProgressEvent {
  type: 'start' | 'file_start' | 'file_progress' | 'file_complete' | 'file_error' | 'complete' | 'error';
  fileIndex?: number;
  totalFiles?: number;
  filename?: string;
  documentId?: string;
  stage?: string;
  progress?: number;
  message?: string;
  result?: PerFileExtractionResult;
  summary?: {
    filesProcessed: number;
    totalFinancialPeriods: number;
    totalCensusPeriods: number;
    totalRates: number;
    totalSheets: number;
    errors: string[];
    warnings: string[];
  };
  error?: string;
}

function createSSEMessage(data: ProgressEvent): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  try {
    const body = await request.json();
    const { fileIds, dealId, facilityId } = body as {
      fileIds: string[];
      dealId?: string;
      facilityId?: string;
    };

    if (!fileIds || fileIds.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No files to process' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get documents from database
    const docs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, fileIds));

    if (docs.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No documents found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get facility if provided
    let targetFacilityId = facilityId;
    if (!targetFacilityId && dealId) {
      const [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.dealId, dealId))
        .limit(1);
      if (facility) {
        targetFacilityId = facility.id;
      }
    }

    // Create readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const uploadsDir = getUploadsDir();
        const results: PerFileExtractionResult[] = [];
        const allErrors: string[] = [];
        const allWarnings: string[] = [];
        let totalFinancialPeriods = 0;
        let totalCensusPeriods = 0;
        let totalRates = 0;
        let totalSheets = 0;

        // Send start event
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'start',
          totalFiles: docs.length,
          message: `Starting extraction of ${docs.length} file(s) - processing ONE AT A TIME`,
        })));

        // Process each file ONE AT A TIME
        for (let i = 0; i < docs.length; i++) {
          const doc = docs[i];
          const ext = doc.filename?.split('.').pop()?.toLowerCase() || 'pdf';
          const filePath = join(uploadsDir, `${doc.id}.${ext}`);
          const filename = doc.filename || `document-${i + 1}`;

          // Send file start event
          controller.enqueue(encoder.encode(createSSEMessage({
            type: 'file_start',
            fileIndex: i + 1,
            totalFiles: docs.length,
            filename,
            documentId: doc.id,
            message: `Starting extraction of "${filename}" (${i + 1}/${docs.length})`,
          })));

          try {
            // Extract single file with progress callback
            const result = await extractSingleFile(
              filePath,
              doc.id,
              filename,
              (progress) => {
                // Send progress event for this file
                controller.enqueue(encoder.encode(createSSEMessage({
                  type: 'file_progress',
                  fileIndex: i + 1,
                  totalFiles: docs.length,
                  filename,
                  documentId: doc.id,
                  stage: progress.stage,
                  progress: progress.progress,
                  message: progress.message,
                })));
              }
            );

            results.push(result);

            // Accumulate totals
            totalFinancialPeriods += result.financialData.length;
            totalCensusPeriods += result.censusData.length;
            totalRates += result.rateData.length;
            totalSheets += result.sheets.length;
            allWarnings.push(...result.warnings);

            // Populate database if facility provided
            if (targetFacilityId) {
              try {
                const popResult = await populateFromExtraction(
                  targetFacilityId,
                  result.financialData,
                  result.censusData,
                  result.rateData,
                  doc.id
                );

                if (popResult.errors.length > 0) {
                  allErrors.push(...popResult.errors);
                }
                if (popResult.warnings.length > 0) {
                  allWarnings.push(...popResult.warnings);
                }
              } catch (dbErr) {
                allWarnings.push(
                  `Failed to populate database for "${filename}": ${dbErr instanceof Error ? dbErr.message : 'Unknown'}`
                );
              }
            }

            // Update document status
            await db
              .update(documents)
              .set({
                status: 'complete',
                processedAt: new Date(),
                extractedData: {
                  sheetsCount: result.sheets.length,
                  financialPeriods: result.financialData.length,
                  censusPeriods: result.censusData.length,
                  rates: result.rateData.length,
                  confidence: result.confidence,
                  processingTimeMs: result.processingTimeMs,
                  sheets: result.sheets.map(s => ({
                    name: s.sheetName,
                    type: s.sheetType,
                    rows: s.rowCount,
                    facilities: s.facilitiesDetected,
                    periods: s.periodsDetected,
                  })),
                },
              })
              .where(eq(documents.id, doc.id));

            // Send file complete event
            controller.enqueue(encoder.encode(createSSEMessage({
              type: 'file_complete',
              fileIndex: i + 1,
              totalFiles: docs.length,
              filename,
              documentId: doc.id,
              message: `Completed "${filename}": ${result.sheets.length} sheets, ${result.financialData.length} financial periods, ${result.censusData.length} census periods, ${result.rateData.length} rates (${result.processingTimeMs}ms)`,
              result,
            })));

          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            allErrors.push(`Error processing "${filename}": ${errorMsg}`);

            // Update document with error
            await db
              .update(documents)
              .set({
                status: 'error',
                processedAt: new Date(),
                extractedData: {
                  error: errorMsg,
                },
              })
              .where(eq(documents.id, doc.id));

            // Send file error event
            controller.enqueue(encoder.encode(createSSEMessage({
              type: 'file_error',
              fileIndex: i + 1,
              totalFiles: docs.length,
              filename,
              documentId: doc.id,
              error: errorMsg,
              message: `Error processing "${filename}": ${errorMsg}`,
            })));
          }

          // Small delay between files for stability
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Send complete event with summary
        controller.enqueue(encoder.encode(createSSEMessage({
          type: 'complete',
          message: `Extraction complete: ${docs.length} files processed`,
          summary: {
            filesProcessed: docs.length,
            totalFinancialPeriods,
            totalCensusPeriods,
            totalRates,
            totalSheets,
            errors: allErrors,
            warnings: allWarnings,
          },
        })));

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start extraction',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
