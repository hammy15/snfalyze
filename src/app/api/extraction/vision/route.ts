import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { join } from 'path';
import { extractWithVision, extractPDFWithVision, type VisionExtractionResult } from '@/lib/extraction/vision-extractor';
import { getRouter } from '@/lib/ai';

// Use /tmp on Vercel (serverless), local uploads folder in development
const getUploadsDir = () => {
  if (process.env.VERCEL) {
    return '/tmp/wizard-uploads';
  }
  return join(process.cwd(), 'uploads', 'wizard');
};

/**
 * POST /api/extraction/vision
 *
 * Use AI Vision to extract financial data from documents.
 * This endpoint processes files one at a time using Claude to visually
 * analyze spreadsheets and extract structured P&L data.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileIds, dealId, includeRawAnalysis = false } = body as {
      fileIds: string[];
      dealId?: string;
      includeRawAnalysis?: boolean;
    };

    if (!fileIds || fileIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files to analyze' },
        { status: 400 }
      );
    }

    // Get documents from database
    const docs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, fileIds));

    if (docs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No documents found' },
        { status: 404 }
      );
    }

    const uploadsDir = getUploadsDir();
    const results: VisionExtractionResult[] = [];
    const processingErrors: string[] = [];

    console.log('='.repeat(60));
    console.log('AI VISION EXTRACTION');
    console.log(`Processing ${docs.length} files with Claude Vision`);
    console.log('='.repeat(60));

    // Process each file one at a time
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      const ext = doc.filename?.split('.').pop()?.toLowerCase() || 'pdf';
      const filePath = join(uploadsDir, `${doc.id}.${ext}`);

      console.log('');
      console.log(`[${i + 1}/${docs.length}] Processing: ${doc.filename}`);

      try {
        let result: VisionExtractionResult;

        if (ext === 'xlsx' || ext === 'xls') {
          result = await extractWithVision(
            filePath,
            doc.id,
            doc.filename || 'unknown.xlsx',
            (progress) => {
              console.log(`  [${progress.stage.toUpperCase()}] ${progress.progress}% - ${progress.message}`);
            }
          );
        } else if (ext === 'pdf') {
          result = await extractPDFWithVision(
            filePath,
            doc.id,
            doc.filename || 'unknown.pdf',
            (progress) => {
              console.log(`  [${progress.stage.toUpperCase()}] ${progress.progress}% - ${progress.message}`);
            }
          );
        } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
          // Image file — use stored base64 from upload or read from disk
          const extractedData = doc.extractedData as Record<string, any> | null;
          let base64Data = extractedData?.imageBase64;
          const mimeType = extractedData?.imageMimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

          if (!base64Data) {
            // Try reading from disk as fallback
            const fs = await import('fs/promises');
            try {
              const imgBuffer = await fs.readFile(filePath);
              base64Data = imgBuffer.toString('base64');
            } catch {
              throw new Error(`Image file not found and no stored base64 data`);
            }
          }

          console.log(`  Running AI vision on image (${(base64Data.length / 1024).toFixed(0)}KB base64)`);

          const router = getRouter();
          const visionResponse = await router.route({
            taskType: 'vision_extraction',
            systemPrompt: `You are a document extraction specialist for healthcare facility acquisitions (SNF, ALF, ILF).
Extract ALL text, numbers, tables, and data from this image. Return structured JSON:
{
  "facilities": [{ "name": "...", "state": "...", "beds": N, "lineItems": [...] }],
  "tables": [{ "headers": [...], "rows": [[...], ...] }],
  "rawText": "all visible text",
  "confidence": 0.0-1.0
}
For tables, preserve exact structure. Include all financial figures, facility names, addresses, bed counts.`,
            userPrompt: 'Extract all data from this image. Return structured JSON with facilities, tables, and raw text.',
            images: [{ data: base64Data, mimeType }],
            maxTokens: 4000,
          });

          // Parse the vision response into VisionExtractionResult format
          const content = visionResponse.content || '';
          let parsedData: any = {};
          try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
          } catch {
            parsedData = { rawText: content };
          }

          result = {
            documentId: doc.id,
            filename: doc.filename || 'unknown.png',
            facilities: (parsedData.facilities || []).map((f: any) => ({
              name: f.name || 'Unknown Facility',
              state: f.state,
              city: f.city,
              beds: f.beds,
              periods: [],
              lineItems: (f.lineItems || []).map((item: any, idx: number) => ({
                category: item.category || 'metric',
                subcategory: item.subcategory || 'other',
                label: item.label || `Item ${idx + 1}`,
                values: item.values || [],
                confidence: item.confidence || 0.7,
              })),
              confidence: f.confidence || 0.7,
            })),
            sheets: [{
              name: doc.filename || 'Image',
              index: 0,
              type: 'unknown' as const,
              facilitiesFound: parsedData.facilities?.map((f: any) => f.name) || [],
              periodsFound: [],
              confidence: parsedData.confidence || 0.7,
            }],
            rawAnalysis: content,
            confidence: parsedData.confidence || 0.7,
            processingTimeMs: 0,
            warnings: [],
            errors: [],
          };
        } else {
          throw new Error(`Unsupported file type: ${ext}`);
        }

        results.push(result);

        // Log extraction summary
        console.log('');
        console.log(`  Extraction Results:`);
        console.log(`    Facilities found: ${result.facilities.length}`);
        result.facilities.forEach(f => {
          console.log(`      - ${f.name}: ${f.lineItems.length} line items, confidence ${(f.confidence * 100).toFixed(0)}%`);
          if (f.census) {
            console.log(`        Census data: ${f.census.periods.length} periods`);
          }
          if (f.payerRates) {
            console.log(`        Payer rates found`);
          }
        });
        console.log(`    Sheets analyzed: ${result.sheets.length}`);
        console.log(`    Overall confidence: ${(result.confidence * 100).toFixed(0)}%`);
        console.log(`    Processing time: ${result.processingTimeMs}ms`);

        if (result.warnings.length > 0) {
          console.log(`    Warnings: ${result.warnings.join('; ')}`);
        }
        if (result.errors.length > 0) {
          console.log(`    Errors: ${result.errors.join('; ')}`);
        }

        // Update document status
        await db
          .update(documents)
          .set({
            status: result.errors.length === 0 ? 'complete' : 'error',
            processedAt: new Date(),
            extractedData: {
              method: 'vision',
              facilitiesCount: result.facilities.length,
              sheetsCount: result.sheets.length,
              confidence: result.confidence,
              processingTimeMs: result.processingTimeMs,
            },
          })
          .where(eq(documents.id, doc.id));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ERROR: ${errorMsg}`);
        processingErrors.push(`${doc.filename}: ${errorMsg}`);

        await db
          .update(documents)
          .set({
            status: 'error',
            processedAt: new Date(),
            extractedData: { error: errorMsg },
          })
          .where(eq(documents.id, doc.id));
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('AI VISION EXTRACTION COMPLETE');
    console.log(`  Files processed: ${results.length}/${docs.length}`);
    console.log(`  Total facilities: ${results.reduce((sum, r) => sum + r.facilities.length, 0)}`);
    if (processingErrors.length > 0) {
      console.log(`  Errors: ${processingErrors.length}`);
    }
    console.log('='.repeat(60));

    // Aggregate all facilities and line items
    const allFacilities = results.flatMap(r => r.facilities);
    const allSheets = results.flatMap(r => r.sheets);

    // Calculate overall confidence
    const overallConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0;

    // Build response
    const response: {
      success: boolean;
      data: {
        facilities: VisionExtractionResult['facilities'];
        sheets: VisionExtractionResult['sheets'];
        summary: {
          totalFacilities: number;
          totalLineItems: number;
          totalSheets: number;
          overallConfidence: number;
          processingTimeMs: number;
          hasCensusData: boolean;
          hasPayerRates: boolean;
        };
        warnings: string[];
        errors: string[];
        rawAnalysis?: string[];
      };
    } = {
      success: true,
      data: {
        facilities: allFacilities,
        sheets: allSheets,
        summary: {
          totalFacilities: allFacilities.length,
          totalLineItems: allFacilities.reduce((sum, f) => sum + f.lineItems.length, 0),
          totalSheets: allSheets.length,
          overallConfidence,
          processingTimeMs: results.reduce((sum, r) => sum + r.processingTimeMs, 0),
          hasCensusData: allFacilities.some(f => f.census && f.census.totalDays.length > 0),
          hasPayerRates: allFacilities.some(f => f.payerRates && f.payerRates.medicarePartAPpd),
        },
        warnings: results.flatMap(r => r.warnings),
        errors: processingErrors,
      },
    };

    // Optionally include raw AI analysis
    if (includeRawAnalysis) {
      response.data.rawAnalysis = results.map(r => r.rawAnalysis);
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in vision extraction:', error);
    return NextResponse.json(
      { success: false, error: `Vision extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
