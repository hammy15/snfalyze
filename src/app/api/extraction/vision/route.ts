import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { type VisionExtractionResult } from '@/lib/extraction/vision-extractor';
import { getRouter } from '@/lib/ai';

// Allow up to 300s for AI extraction (Vercel Pro)
export const maxDuration = 300;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Max text per AI call (~100KB). Sheets larger than this get chunked. */
const MAX_CHUNK_SIZE = 100_000;

/** Max concurrent chunk AI calls within a single file */
const CHUNK_CONCURRENCY = 3;

/** Max tokens for text extraction response */
const TEXT_MAX_TOKENS = 16384;

/** Max tokens for image extraction response */
const IMAGE_MAX_TOKENS = 8000;

// ============================================================================
// JSON PARSING UTILITIES (from vision-extractor.ts)
// ============================================================================

function extractJsonFromResponse(responseText: string): string | null {
  const trimmed = responseText.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;

  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim();
    if (extracted.startsWith('{')) return extracted;
  }

  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return null;
}

function tryFixJson(jsonStr: string): string {
  let fixed = jsonStr;
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
  fixed = fixed.replace(/'/g, '"');
  fixed = fixed.replace(/[\x00-\x1F\x7F]/g, ' ');
  fixed = fixed.replace(/\](\s*)\[/g, '],$1[');
  fixed = fixed.replace(/\}(\s*)\{/g, '},$1{');
  fixed = fixed.replace(/"(\s+)"/g, '", "');
  return fixed;
}

function tryCloseIncompleteJson(jsonStr: string): string {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const char of jsonStr) {
    if (escaped) { escaped = false; continue; }
    if (char === '\\') { escaped = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '[') openBrackets++;
    else if (char === ']') openBrackets--;
  }

  let result = jsonStr;
  if (inString) result += '"';
  while (openBrackets > 0) { result += ']'; openBrackets--; }
  while (openBraces > 0) { result += '}'; openBraces--; }
  return result;
}

/** Parse JSON from AI response with multi-stage repair */
function robustJsonParse(content: string): { data: any; warnings: string[] } {
  const warnings: string[] = [];
  const jsonStr = extractJsonFromResponse(content);
  if (!jsonStr) return { data: {}, warnings: ['No JSON found in AI response'] };

  // Attempt 1: direct parse
  try { return { data: JSON.parse(jsonStr), warnings }; } catch {}

  // Attempt 2: fix common issues
  try {
    const fixed = tryFixJson(jsonStr);
    const data = JSON.parse(fixed);
    warnings.push('JSON required minor fixes');
    return { data, warnings };
  } catch {}

  // Attempt 3: close incomplete JSON (truncated response)
  try {
    const closed = tryCloseIncompleteJson(tryFixJson(jsonStr));
    const data = JSON.parse(closed);
    warnings.push('JSON was truncated — closed brackets to parse');
    return { data, warnings };
  } catch {}

  warnings.push('Failed to parse JSON after all repair attempts');
  return { data: { rawText: content }, warnings };
}

// ============================================================================
// SHEET SPLITTING
// ============================================================================

interface SheetChunk {
  sheetName: string;
  content: string;
  chunkIndex: number;
  totalChunks: number;
}

/** Split rawText into individual sheets using === Sheet: Name === markers */
function splitIntoSheets(rawText: string): { name: string; content: string }[] {
  const sheetMarker = /^=== Sheet: (.+?) ===/gm;
  const sheets: { name: string; content: string }[] = [];
  let match: RegExpExecArray | null;
  const markers: { name: string; start: number }[] = [];

  while ((match = sheetMarker.exec(rawText)) !== null) {
    markers.push({ name: match[1], start: match.index + match[0].length });
  }

  if (markers.length === 0) {
    // No sheet markers — treat entire text as one sheet
    return [{ name: 'Sheet 1', content: rawText }];
  }

  for (let i = 0; i < markers.length; i++) {
    const start = markers[i].start;
    const end = i + 1 < markers.length ? markers[i + 1].start - `=== Sheet: ${markers[i + 1].name} ===`.length : rawText.length;
    const content = rawText.slice(start, end).trim();
    if (content.length > 20) {
      sheets.push({ name: markers[i].name, content });
    }
  }

  return sheets;
}

/** Chunk a large sheet into segments that fit within MAX_CHUNK_SIZE */
function chunkSheet(sheet: { name: string; content: string }): SheetChunk[] {
  if (sheet.content.length <= MAX_CHUNK_SIZE) {
    return [{ sheetName: sheet.name, content: sheet.content, chunkIndex: 0, totalChunks: 1 }];
  }

  // Split on line boundaries to avoid cutting mid-row
  const lines = sheet.content.split('\n');
  const chunks: SheetChunk[] = [];
  let currentChunk = '';

  for (const line of lines) {
    if (currentChunk.length + line.length + 1 > MAX_CHUNK_SIZE && currentChunk.length > 0) {
      chunks.push({
        sheetName: sheet.name,
        content: currentChunk,
        chunkIndex: chunks.length,
        totalChunks: 0, // filled in below
      });
      currentChunk = '';
    }
    currentChunk += (currentChunk ? '\n' : '') + line;
  }

  if (currentChunk.length > 20) {
    chunks.push({
      sheetName: sheet.name,
      content: currentChunk,
      chunkIndex: chunks.length,
      totalChunks: 0,
    });
  }

  // Fill in totalChunks
  for (const chunk of chunks) chunk.totalChunks = chunks.length;
  return chunks;
}

// ============================================================================
// PROMPTS
// ============================================================================

const FINANCIAL_EXTRACTION_SYSTEM = `You are a healthcare financial data extraction specialist for SNF (Skilled Nursing Facility), ALF (Assisted Living Facility), and ILF (Independent Living Facility) acquisitions.

Your job is to extract 100% of the financial data from a single spreadsheet sheet. Do NOT skip or summarize — extract every single line item, number, and metric you see.

Return a JSON object with this exact structure:
{
  "sheetType": "pl|census|rates|summary|unknown",
  "facilities": [{
    "name": "Facility Name",
    "state": "XX",
    "city": "City",
    "beds": 120,
    "periods": [
      {"label": "Jan 2024", "startDate": "2024-01-01", "endDate": "2024-01-31", "type": "monthly"}
    ],
    "lineItems": [{
      "category": "revenue|expense|metric",
      "subcategory": "see list below",
      "label": "Exact label from spreadsheet",
      "values": [{"period": "Jan 2024", "value": 123456.78}],
      "annual": 1481472,
      "ppd": 34.56,
      "percentRevenue": 45.2,
      "notes": "Any notes",
      "confidence": 0.95
    }],
    "census": {
      "periods": ["Jan 2024"],
      "medicarePartADays": [450],
      "medicareAdvantageDays": [180],
      "managedCareDays": [300],
      "medicaidDays": [1800],
      "managedMedicaidDays": [200],
      "privateDays": [360],
      "hospiceDays": [100],
      "vaContractDays": [50],
      "otherDays": [20],
      "totalDays": [3460],
      "avgDailyCensus": [111.6],
      "occupancy": [0.85],
      "beds": 120
    },
    "payerRates": {
      "effectiveDate": "2024-01-01",
      "medicarePartAPpd": 625.00,
      "medicareAdvantagePpd": 480.00,
      "managedCarePpd": 420.00,
      "medicaidPpd": 185.00,
      "managedMedicaidPpd": 195.00,
      "privatePpd": 285.00,
      "hospicePpd": 165.00,
      "vaContractPpd": 450.00,
      "blendedPpd": 291.00
    },
    "confidence": 0.9
  }],
  "warnings": [],
  "confidence": 0.9
}

RULES:
- Extract EVERY line item — revenue, expense, metric, subtotal, total. Do NOT skip any.
- Numbers in parentheses (1,234) are NEGATIVE values
- Map periods to readable format: "Jan 2024", "Q1 2024", "FY 2024", "TTM Jun 2024"
- Include ALL subtotals and totals (Total Revenue, Total Expenses, EBITDAR, EBITDA, Net Income, NOI)
- For multi-facility data in one sheet, create separate facility entries
- If you see census/patient day data, populate the census object
- If you see PPD rate data, populate the payerRates object
- Calculate annual, ppd, and percentRevenue where data allows

SUBCATEGORY MAPPINGS:
Revenue: medicare_revenue, medicaid_revenue, private_revenue, managed_care_revenue, ancillary_revenue, therapy_revenue, hospice_revenue, other_revenue, total_revenue
Expenses: labor_nursing, labor_dietary, labor_housekeeping, labor_admin, labor_therapy, labor_activities, labor_social_services, labor_agency, labor_benefits, labor_total, dietary, housekeeping, utilities, maintenance, insurance, property_tax, management_fee, rent, supplies, pharmacy, other_expense, depreciation, amortization, interest, total_expenses
Metrics: ebitdar, ebitda, noi, net_income, gross_margin, occupancy, adc, total_patient_days

Return ONLY valid JSON. No markdown, no explanation. Start with { and end with }.`;

const IMAGE_EXTRACTION_SYSTEM = `You are a document extraction specialist for healthcare facility acquisitions (SNF, ALF, ILF).
Extract ALL text, numbers, tables, and financial data from this image. Return structured JSON:
{
  "facilities": [{
    "name": "...",
    "state": "...",
    "city": "...",
    "beds": N,
    "periods": [{"label": "...", "startDate": "...", "endDate": "...", "type": "monthly|quarterly|annual"}],
    "lineItems": [{
      "category": "revenue|expense|metric",
      "subcategory": "...",
      "label": "...",
      "values": [{"period": "...", "value": 123456}],
      "confidence": 0.9
    }],
    "confidence": 0.9
  }],
  "tables": [{"headers": [...], "rows": [[...], ...]}],
  "rawText": "all visible text",
  "confidence": 0.85
}

Rules:
- Extract EVERY number and label visible
- Preserve exact table structure
- Numbers in parentheses (1,234) are NEGATIVE
- Include all financial figures, facility names, addresses, bed counts
- Return ONLY valid JSON. Start with { and end with }.`;

// ============================================================================
// POST HANDLER
// ============================================================================

/**
 * POST /api/extraction/vision
 *
 * AI-powered extraction of financial data from documents.
 * Processes files sequentially, one at a time, with sheet-by-sheet extraction.
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
    console.log('AI VISION EXTRACTION — SHEET-BY-SHEET');
    console.log(`Processing ${docs.length} file(s) sequentially`);
    console.log('='.repeat(60));

    const results: VisionExtractionResult[] = [];
    const processingErrors: string[] = [];

    // Process files ONE AT A TIME (sequential)
    for (const doc of docs) {
      console.log(`\n--- Processing: ${doc.filename} ---`);
      try {
        const result = await extractDocument(doc);
        results.push(result);

        await db
          .update(documents)
          .set({
            status: 'complete',
            processedAt: new Date(),
            extractedData: {
              method: 'vision-v2-sheet-by-sheet',
              facilitiesCount: result.facilities.length,
              sheetsCount: result.sheets.length,
              lineItemsCount: result.facilities.reduce((sum, f) => sum + f.lineItems.length, 0),
              confidence: result.confidence,
              processingTimeMs: result.processingTimeMs,
            },
          })
          .where(eq(documents.id, doc.id));

        console.log(`  DONE: ${result.facilities.length} facilities, ${result.facilities.reduce((s, f) => s + f.lineItems.length, 0)} line items, confidence ${(result.confidence * 100).toFixed(0)}%`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
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

    console.log('\n' + '='.repeat(60));
    console.log('EXTRACTION COMPLETE');
    console.log(`  Files: ${results.length}/${docs.length}`);
    console.log(`  Facilities: ${results.reduce((s, r) => s + r.facilities.length, 0)}`);
    console.log(`  Line items: ${results.reduce((s, r) => s + r.facilities.reduce((s2, f) => s2 + f.lineItems.length, 0), 0)}`);
    if (processingErrors.length > 0) console.log(`  Errors: ${processingErrors.length}`);
    console.log('='.repeat(60));

    const allFacilities = results.flatMap(r => r.facilities);
    const allSheets = results.flatMap(r => r.sheets);
    const overallConfidence = results.length > 0
      ? results.reduce((sum, r) => sum + r.confidence, 0) / results.length
      : 0;

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

// ============================================================================
// DOCUMENT-LEVEL EXTRACTION
// ============================================================================

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

// ============================================================================
// TEXT-BASED EXTRACTION (Excel, CSV, PDF) — SHEET-BY-SHEET
// ============================================================================

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

  console.log(`  [${doc.filename}] Total text: ${(rawText.length / 1024).toFixed(0)}KB`);

  // Step 1: Split into individual sheets
  const sheets = splitIntoSheets(rawText);
  console.log(`  [${doc.filename}] Found ${sheets.length} sheet(s): ${sheets.map(s => `${s.name} (${(s.content.length / 1024).toFixed(0)}KB)`).join(', ')}`);

  // Step 2: Process each sheet individually
  const allFacilities: any[] = [];
  const allSheetResults: any[] = [];
  const allWarnings: string[] = [];
  const rawAnalysisParts: string[] = [];

  for (let sheetIdx = 0; sheetIdx < sheets.length; sheetIdx++) {
    const sheet = sheets[sheetIdx];
    console.log(`  [${doc.filename}] Sheet ${sheetIdx + 1}/${sheets.length}: "${sheet.name}" (${(sheet.content.length / 1024).toFixed(0)}KB)`);

    // Chunk large sheets
    const chunks = chunkSheet(sheet);

    if (chunks.length > 1) {
      console.log(`    Chunked into ${chunks.length} segments`);
    }

    // Process chunks in parallel batches (CHUNK_CONCURRENCY at a time)
    const chunkFacilities: any[] = [];

    for (let batchStart = 0; batchStart < chunks.length; batchStart += CHUNK_CONCURRENCY) {
      const batch = chunks.slice(batchStart, batchStart + CHUNK_CONCURRENCY);
      console.log(`    Processing batch ${Math.floor(batchStart / CHUNK_CONCURRENCY) + 1} (${batch.length} chunk${batch.length > 1 ? 's' : ''} in parallel)...`);

      const batchResults = await Promise.allSettled(
        batch.map(async (chunk) => {
          const chunkLabel = chunks.length > 1
            ? `chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}`
            : 'full sheet';

          const userPrompt = chunks.length > 1
            ? `Extract all financial data from this section (${chunkLabel}) of sheet "${chunk.sheetName}" in document "${doc.filename}".\nThis is part of a larger sheet — extract everything you see in this segment.\n\n${chunk.content}`
            : `Extract all financial data from sheet "${chunk.sheetName}" in document "${doc.filename}".\n\n${chunk.content}`;

          const router = getRouter();
          const response = await router.route({
            taskType: 'vision_extraction',
            systemPrompt: FINANCIAL_EXTRACTION_SYSTEM,
            userPrompt,
            maxTokens: TEXT_MAX_TOKENS,
            responseFormat: 'json',
          });

          return { chunk, chunkLabel, content: response.content || '' };
        })
      );

      for (const outcome of batchResults) {
        if (outcome.status === 'fulfilled') {
          const { chunk, chunkLabel, content } = outcome.value;
          rawAnalysisParts.push(`--- Sheet: ${chunk.sheetName} (${chunkLabel}) ---\n${content}`);

          const { data: parsed, warnings } = robustJsonParse(content);
          allWarnings.push(...warnings);

          const facilities = parsed.facilities || [];
          chunkFacilities.push(...facilities);

          if (parsed.warnings && Array.isArray(parsed.warnings)) {
            allWarnings.push(...parsed.warnings);
          }

          console.log(`    -> ${chunkLabel}: ${facilities.length} facilities, ${facilities.reduce((s: number, f: any) => s + (f.lineItems?.length || 0), 0)} line items`);
        } else {
          const msg = outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason);
          console.error(`    ERROR in batch: ${msg}`);
          allWarnings.push(`Failed to extract chunk: ${msg}`);
        }
      }
    }

    // Merge chunk results for this sheet
    const mergedFacilities = mergeChunkFacilities(chunkFacilities);
    allFacilities.push(...mergedFacilities);

    // Build sheet result
    const sheetType = inferSheetType(sheet.name, mergedFacilities);
    allSheetResults.push({
      name: sheet.name,
      index: sheetIdx,
      type: sheetType,
      facilitiesFound: mergedFacilities.map((f: any) => f.name),
      periodsFound: mergedFacilities.flatMap((f: any) => (f.periods || []).map((p: any) => p.label || p)),
      confidence: mergedFacilities.length > 0
        ? mergedFacilities.reduce((s: number, f: any) => s + (f.confidence || 0.5), 0) / mergedFacilities.length
        : 0.3,
    });
  }

  // Step 3: Merge facilities across sheets (same facility from Valuation + LOI sheets)
  const crossSheetMerged = mergeChunkFacilities(allFacilities);

  // Step 4: Normalize facilities
  const normalizedFacilities = crossSheetMerged.map((f: any) => ({
    name: f.name || doc.filename || 'Unknown Facility',
    ccn: f.ccn,
    state: f.state,
    city: f.city,
    beds: f.beds,
    periods: (f.periods || []).map((p: any) =>
      typeof p === 'string' ? { label: p, startDate: '', endDate: '', type: 'monthly' as const } : p
    ),
    lineItems: (f.lineItems || []).map((item: any, idx: number) => ({
      category: item.category || 'metric',
      subcategory: item.subcategory || 'other',
      label: item.label || `Item ${idx + 1}`,
      values: item.values || [],
      annual: item.annual,
      ppd: item.ppd,
      percentRevenue: item.percentRevenue,
      notes: item.notes,
      confidence: item.confidence || 0.7,
    })),
    census: f.census,
    payerRates: f.payerRates,
    confidence: f.confidence || 0.7,
  }));

  // If nothing extracted, create placeholder
  if (normalizedFacilities.length === 0 && rawText.length > 100) {
    normalizedFacilities.push({
      name: doc.filename?.replace(/\.(xlsx|xls|csv|pdf)$/i, '') || 'Unknown',
      ccn: undefined,
      state: undefined,
      city: undefined,
      beds: undefined,
      periods: [],
      lineItems: [],
      census: undefined,
      payerRates: undefined,
      confidence: 0.3,
    });
  }

  const processingTimeMs = Date.now() - start;

  // Calculate confidence
  let confidence = 0.5;
  if (normalizedFacilities.length > 0) {
    const facConfs = normalizedFacilities.map(f => f.confidence || 0.5);
    confidence = facConfs.reduce((a, b) => a + b, 0) / facConfs.length;
    const hasLineItems = normalizedFacilities.some(f => f.lineItems.length > 5);
    const hasCensus = normalizedFacilities.some(f => f.census && f.census.totalDays?.length > 0);
    const hasRates = normalizedFacilities.some(f => f.payerRates && f.payerRates.medicarePartAPpd);
    if (hasLineItems) confidence = Math.min(confidence + 0.1, 1);
    if (hasCensus) confidence = Math.min(confidence + 0.1, 1);
    if (hasRates) confidence = Math.min(confidence + 0.1, 1);
  }

  console.log(`  [${doc.filename}] Total: ${normalizedFacilities.length} facilities, ${normalizedFacilities.reduce((s, f) => s + f.lineItems.length, 0)} line items in ${(processingTimeMs / 1000).toFixed(1)}s`);

  return {
    documentId: doc.id,
    filename: doc.filename || `unknown.${ext}`,
    facilities: normalizedFacilities,
    sheets: allSheetResults.length > 0
      ? allSheetResults
      : (docExtractedData?.sheetNames || [doc.filename]).map((name: string, idx: number) => ({
          name,
          index: idx,
          type: 'unknown' as const,
          facilitiesFound: normalizedFacilities.map(f => f.name),
          periodsFound: [],
          confidence: 0.5,
        })),
    rawAnalysis: rawAnalysisParts.join('\n\n'),
    confidence,
    processingTimeMs,
    warnings: allWarnings,
    errors: [],
  };
}

// ============================================================================
// IMAGE EXTRACTION
// ============================================================================

async function extractFromImage(
  doc: typeof documents.$inferSelect,
  ext: string,
  start: number,
): Promise<VisionExtractionResult> {
  const extractedData = doc.extractedData as Record<string, any> | null;
  const base64Data = extractedData?.imageBase64;
  const mimeType = extractedData?.imageMimeType || `image/${ext === 'jpg' ? 'jpeg' : ext}`;

  if (!base64Data) {
    throw new Error(`No stored image data for ${doc.filename}`);
  }

  console.log(`  [${doc.filename}] Running AI vision on image (${(base64Data.length / 1024).toFixed(0)}KB)`);

  const router = getRouter();
  const visionResponse = await router.route({
    taskType: 'vision_extraction',
    systemPrompt: IMAGE_EXTRACTION_SYSTEM,
    userPrompt: 'Extract all data from this image. Return structured JSON with facilities, tables, and raw text.',
    images: [{ data: base64Data, mimeType }],
    maxTokens: IMAGE_MAX_TOKENS,
  });

  const content = visionResponse.content || '';
  const { data: parsed, warnings } = robustJsonParse(content);

  const processingTimeMs = Date.now() - start;
  const facilities = (parsed.facilities || []).map((f: any) => ({
    name: f.name || 'Unknown Facility',
    state: f.state,
    city: f.city,
    beds: f.beds,
    periods: (f.periods || []).map((p: any) =>
      typeof p === 'string' ? { label: p, startDate: '', endDate: '', type: 'monthly' as const } : p
    ),
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
      facilitiesFound: facilities.map((f: any) => f.name),
      periodsFound: [],
      confidence: parsed.confidence || 0.7,
    }],
    rawAnalysis: content,
    confidence: parsed.confidence || 0.7,
    processingTimeMs,
    warnings,
    errors: [],
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/** Merge facilities from multiple chunks of the same sheet */
function mergeChunkFacilities(chunkFacilities: any[]): any[] {
  if (chunkFacilities.length === 0) return [];

  // Group by facility name (case-insensitive)
  const byName = new Map<string, any[]>();
  for (const f of chunkFacilities) {
    const key = (f.name || 'Unknown').toLowerCase().trim();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push(f);
  }

  const merged: any[] = [];
  for (const [, group] of byName) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }

    // Merge multiple entries for the same facility
    const base = { ...group[0] };
    const allLineItems = group.flatMap((f: any) => f.lineItems || []);
    const allPeriods = group.flatMap((f: any) => f.periods || []);

    // Deduplicate line items by label
    const seenLabels = new Set<string>();
    const dedupedItems: any[] = [];
    for (const item of allLineItems) {
      const key = `${item.category}:${item.label}`;
      if (!seenLabels.has(key)) {
        seenLabels.add(key);
        dedupedItems.push(item);
      } else {
        // Merge values from duplicate into existing
        const existing = dedupedItems.find(d => `${d.category}:${d.label}` === key);
        if (existing && item.values) {
          const existingPeriods = new Set((existing.values || []).map((v: any) => v.period));
          for (const v of item.values) {
            if (!existingPeriods.has(v.period)) {
              existing.values.push(v);
            }
          }
        }
      }
    }

    // Deduplicate periods
    const seenPeriods = new Set<string>();
    const dedupedPeriods: any[] = [];
    for (const p of allPeriods) {
      const key = typeof p === 'string' ? p : p.label;
      if (!seenPeriods.has(key)) {
        seenPeriods.add(key);
        dedupedPeriods.push(p);
      }
    }

    base.lineItems = dedupedItems;
    base.periods = dedupedPeriods;

    // Merge census: pick the one with more data
    const censusOptions = group.filter((f: any) => f.census).map((f: any) => f.census);
    if (censusOptions.length > 0) {
      base.census = censusOptions.reduce((best: any, c: any) =>
        (c.totalDays?.length || 0) > (best.totalDays?.length || 0) ? c : best
      );
    }

    // Merge payerRates: pick the one with more fields
    const rateOptions = group.filter((f: any) => f.payerRates).map((f: any) => f.payerRates);
    if (rateOptions.length > 0) {
      base.payerRates = rateOptions.reduce((best: any, r: any) =>
        Object.keys(r || {}).length > Object.keys(best || {}).length ? r : best
      );
    }

    // Confidence = average
    base.confidence = group.reduce((s: number, f: any) => s + (f.confidence || 0.5), 0) / group.length;

    merged.push(base);
  }

  return merged;
}

/** Infer the type of a sheet from its name and extracted data */
function inferSheetType(sheetName: string, facilities: any[]): 'pl' | 'census' | 'rates' | 'summary' | 'unknown' {
  const lower = sheetName.toLowerCase();

  if (/p\s*&?\s*l|profit|loss|income\s+statement|operating/i.test(lower)) return 'pl';
  if (/census|patient\s*day|occupancy|adc/i.test(lower)) return 'census';
  if (/rate|ppd|per\s*patient|per\s*diem|payer/i.test(lower)) return 'rates';
  if (/summary|overview|dashboard|kpi/i.test(lower)) return 'summary';

  // Infer from content
  if (facilities.some(f => f.census && f.census.totalDays?.length > 0)) return 'census';
  if (facilities.some(f => f.payerRates && f.payerRates.medicarePartAPpd)) return 'rates';
  if (facilities.some(f => f.lineItems?.length > 3)) return 'pl';

  return 'unknown';
}
