import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { join } from 'path';
import { type VisionExtractionResult } from '@/lib/extraction/vision-extractor';
import { getRouter } from '@/lib/ai';

// Allow up to 300s for AI extraction of multiple files (Vercel Pro)
export const maxDuration = 300;

/**
 * POST /api/extraction/vision
 *
 * Use AI to extract financial data from documents.
 * Processes files in parallel using Claude to analyze
 * spreadsheets and extract structured P&L data.
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

    console.log('='.repeat(60));
    console.log('AI VISION EXTRACTION');
    console.log(`Processing ${docs.length} files in parallel`);
    console.log('='.repeat(60));

    // Process all files in parallel
    const settled = await Promise.allSettled(
      docs.map((doc) => extractDocument(doc))
    );

    const results: VisionExtractionResult[] = [];
    const processingErrors: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i];
      const doc = docs[i];
      if (outcome.status === 'fulfilled') {
        results.push(outcome.value);
        // Update document status
        await db
          .update(documents)
          .set({
            status: 'complete',
            processedAt: new Date(),
            extractedData: {
              method: 'vision',
              facilitiesCount: outcome.value.facilities.length,
              sheetsCount: outcome.value.sheets.length,
              confidence: outcome.value.confidence,
              processingTimeMs: outcome.value.processingTimeMs,
            },
          })
          .where(eq(documents.id, doc.id));
      } else {
        const errorMsg = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
        console.error(`  ERROR [${doc.filename}]: ${errorMsg}`);
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

/**
 * Extract financial data from a single document using AI.
 */
async function extractDocument(doc: typeof documents.$inferSelect): Promise<VisionExtractionResult> {
  const ext = doc.filename?.split('.').pop()?.toLowerCase() || 'pdf';
  const start = Date.now();

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'pdf') {
    return extractFromText(doc, ext, start);
  } else if (['png', 'jpg', 'jpeg'].includes(ext)) {
    return extractFromImage(doc, ext, start);
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Extract from text-based documents (Excel, CSV, PDF) using stored rawText.
 */
async function extractFromText(
  doc: typeof documents.$inferSelect,
  ext: string,
  start: number,
): Promise<VisionExtractionResult> {
  const rawText = doc.rawText || '';
  const docExtractedData = doc.extractedData as Record<string, any> | null;

  if (!rawText || rawText.length < 20 || rawText.startsWith('[Error')) {
    throw new Error(`No parsed text available for ${doc.filename}. Raw text: ${rawText?.slice(0, 100)}`);
  }

  console.log(`  [${doc.filename}] Using stored text (${(rawText.length / 1024).toFixed(0)}KB)`);

  const router = getRouter();
  const extractionResponse = await router.route({
    taskType: 'vision_extraction',
    systemPrompt: `You are a financial data extraction specialist for healthcare facility acquisitions (SNF, ALF, ILF).
You are analyzing spreadsheet/document data that has already been parsed into text format.
Extract ALL financial data, facility names, and metrics. Return structured JSON:
{
  "facilities": [{
    "name": "Facility Name",
    "state": "XX",
    "city": "City",
    "beds": 100,
    "lineItems": [{
      "category": "revenue|expense|metric",
      "subcategory": "medicaid|medicare|private|nursing|dietary|admin|other",
      "label": "Line item label",
      "values": [{"period": "2024-01", "value": 123456.78}],
      "confidence": 0.9
    }]
  }],
  "periods": ["2024-01", "2024-02", ...],
  "confidence": 0.85
}

Rules:
- Extract EVERY revenue and expense line item you find
- Identify facility names from sheet names or headers
- Map periods to YYYY-MM format
- Include totals (Total Revenue, Total Expenses, EBITDAR, EBITDA, Net Income)
- For multi-facility files, create separate facility entries`,
    userPrompt: `Extract all financial data from this ${ext.toUpperCase()} document "${doc.filename}":\n\n${rawText.slice(0, 50000)}`,
    maxTokens: 8000,
  });

  const content = extractionResponse.content || '';
  let parsedData: any = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
  } catch {
    parsedData = { rawText: content };
  }

  const extractedFacilities = (parsedData.facilities || []).map((f: any) => ({
    name: f.name || doc.filename || 'Unknown Facility',
    state: f.state,
    city: f.city,
    beds: f.beds,
    periods: parsedData.periods || [],
    lineItems: (f.lineItems || []).map((item: any, idx: number) => ({
      category: item.category || 'metric',
      subcategory: item.subcategory || 'other',
      label: item.label || `Item ${idx + 1}`,
      values: item.values || [],
      confidence: item.confidence || 0.7,
    })),
    confidence: f.confidence || parsedData.confidence || 0.7,
  }));

  // If no facilities found, create one from the filename with raw extraction
  if (extractedFacilities.length === 0 && rawText.length > 100) {
    extractedFacilities.push({
      name: doc.filename?.replace(/\.(xlsx|xls|csv|pdf)$/i, '') || 'Unknown',
      periods: [],
      lineItems: [],
      confidence: 0.3,
    });
  }

  const processingTimeMs = Date.now() - start;
  console.log(`  [${doc.filename}] Done in ${(processingTimeMs / 1000).toFixed(1)}s — ${extractedFacilities.length} facilities`);

  return {
    documentId: doc.id,
    filename: doc.filename || `unknown.${ext}`,
    facilities: extractedFacilities,
    sheets: (docExtractedData?.sheetNames || [doc.filename]).map((name: string, idx: number) => ({
      name,
      index: idx,
      type: 'unknown' as const,
      facilitiesFound: extractedFacilities.map((f: any) => f.name),
      periodsFound: parsedData.periods || [],
      confidence: parsedData.confidence || 0.7,
    })),
    rawAnalysis: content,
    confidence: parsedData.confidence || 0.7,
    processingTimeMs,
    warnings: [],
    errors: [],
  };
}

/**
 * Extract from image files using AI vision.
 */
async function extractFromImage(
  doc: typeof documents.$inferSelect,
  ext: string,
  start: number,
): Promise<VisionExtractionResult> {
  const extractedData = doc.extractedData as Record<string, any> | null;
  let base64Data = extractedData?.imageBase64;
  const mimeType = extractedData?.imageMimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  if (!base64Data) {
    throw new Error(`No stored image data for ${doc.filename}`);
  }

  console.log(`  [${doc.filename}] Running AI vision on image (${(base64Data.length / 1024).toFixed(0)}KB)`);

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

  const content = visionResponse.content || '';
  let parsedData: any = {};
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsedData = JSON.parse(jsonMatch[0]);
  } catch {
    parsedData = { rawText: content };
  }

  const processingTimeMs = Date.now() - start;
  const facilities = (parsedData.facilities || []).map((f: any) => ({
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
  }));

  console.log(`  [${doc.filename}] Done in ${(processingTimeMs / 1000).toFixed(1)}s — ${facilities.length} facilities`);

  return {
    documentId: doc.id,
    filename: doc.filename || 'unknown.png',
    facilities,
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
    processingTimeMs,
    warnings: [],
    errors: [],
  };
}
