import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import { type VisionExtractionResult } from '@/lib/extraction/vision-extractor';
import { getRouter } from '@/lib/ai';
import type { SheetExtraction } from '@/lib/extraction/excel-extractor';
import { extractSmartExcel, isStructuredExcelData, smartResultToStageData } from '@/lib/extraction/smart-excel';
import { extractPLData } from '@/lib/extraction/pl-extractor';
import { extractCensusData } from '@/lib/extraction/census-extractor';
import { extractRatesFromTable } from '@/lib/extraction/rate-extractor';

// Allow up to 300s for AI extraction (Vercel Pro)
export const maxDuration = 300;

// ============================================================================
// CONSTANTS
// ============================================================================

/** Max text per AI call. Smaller chunks = faster AI response times. */
const MAX_CHUNK_SIZE = 100_000;

/** Max tokens for a full sheet extraction (single chunk) */
const TEXT_MAX_TOKENS = 16384;

/** Max tokens for chunked extraction (partial sheet — less data, needs fewer tokens) */
const CHUNK_MAX_TOKENS = 8192;

/** Max tokens for image extraction response */
const IMAGE_MAX_TOKENS = 8000;

/**
 * Hard deadline in ms — abort processing before Vercel kills the function.
 * Set to 260s (40s safety margin before Vercel's 300s limit).
 */
const HARD_DEADLINE_MS = 260_000;

/** Minimum time remaining (ms) to start a new AI call */
const MIN_TIME_FOR_AI_CALL_MS = 95_000;

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

/** Compress text by removing empty/whitespace-only rows and collapsing excessive spacing */
function compressText(text: string): string {
  return text
    .split('\n')
    .filter(line => line.trim().length > 0) // Remove empty lines
    .map(line => line.replace(/\t+/g, '\t').replace(/ {3,}/g, '  ')) // Collapse tabs and spaces
    .join('\n');
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
// DIRECT EXTRACTION — Rule-based, no AI needed (instant)
// ============================================================================

/**
 * Try to extract financial data directly from stored sheet data using
 * PL/Census/Rate extractors. No AI call needed — runs in <1 second.
 * Returns null if no meaningful data could be extracted.
 */
function tryDirectExtraction(doc: typeof documents.$inferSelect): VisionExtractionResult | null {
  const start = Date.now();
  const extracted = doc.extractedData as Record<string, any> | null;
  const sheets = extracted?.sheets as Record<string, any[][]> | undefined;

  if (!sheets || Object.keys(sheets).length === 0) return null;

  const allFacilities: any[] = [];
  const allSheetResults: any[] = [];
  const allWarnings: string[] = [];
  let sheetIdx = 0;

  for (const [sheetName, sheetData] of Object.entries(sheets)) {
    if (!Array.isArray(sheetData) || sheetData.length < 3) continue;

    try {
      // Try P&L extraction
      const plData = extractPLData(sheetData, sheetName, []);
      // Try census extraction
      const censusData = extractCensusData(sheetData, sheetName, []);
      // Try rate extraction
      const rateData = extractRatesFromTable(sheetData, doc.id, []);

      if (plData.length === 0 && censusData.length === 0 && rateData.length === 0) {
        allSheetResults.push({
          name: sheetName,
          index: sheetIdx,
          type: 'unknown' as const,
          facilitiesFound: [],
          periodsFound: [],
          confidence: 0.2,
        });
        sheetIdx++;
        continue;
      }

      // Build facilities from P&L data
      const facilityMap = new Map<string, any>();

      for (const period of plData) {
        const facName = period.facilityName || doc.filename?.replace(/\.(csv|xlsx|xls)$/i, '') || 'Unknown';
        if (!facilityMap.has(facName)) {
          facilityMap.set(facName, {
            name: facName,
            state: undefined,
            city: undefined,
            beds: undefined,
            periods: [],
            lineItems: [],
            census: undefined,
            payerRates: undefined,
            confidence: 0.75,
          });
        }
        const fac = facilityMap.get(facName)!;
        fac.periods.push({
          label: period.periodLabel,
          startDate: period.periodStart.toISOString().split('T')[0],
          endDate: period.periodEnd.toISOString().split('T')[0],
          type: period.isAnnualized ? 'annual' : 'monthly',
        });

        // Map P&L fields to lineItems
        const addItem = (cat: string, subcat: string, label: string, value: number | undefined) => {
          if (value !== undefined && value !== 0) {
            fac.lineItems.push({
              category: cat,
              subcategory: subcat,
              label,
              values: [{ period: period.periodLabel, value }],
              annual: period.isAnnualized ? value : undefined,
              confidence: 0.8,
            });
          }
        };

        addItem('revenue', 'total_revenue', 'Total Revenue', period.totalRevenue);
        addItem('revenue', 'medicare_revenue', 'Medicare Revenue', period.medicareRevenue);
        addItem('revenue', 'medicaid_revenue', 'Medicaid Revenue', period.medicaidRevenue);
        addItem('revenue', 'managed_care_revenue', 'Managed Care Revenue', period.managedCareRevenue);
        addItem('revenue', 'private_revenue', 'Private Pay Revenue', period.privatePayRevenue);
        addItem('revenue', 'other_revenue', 'Other Revenue', period.otherRevenue);
        addItem('expense', 'labor_total', 'Total Labor', period.totalLaborCost);
        addItem('expense', 'labor_nursing', 'Nursing Labor', period.nursingLabor);
        addItem('expense', 'labor_agency', 'Agency Labor', period.agencyLabor);
        addItem('expense', 'labor_benefits', 'Employee Benefits', period.employeeBenefits);
        addItem('expense', 'dietary', 'Food/Dietary', period.foodCost);
        addItem('expense', 'supplies', 'Supplies', period.suppliesCost);
        addItem('expense', 'utilities', 'Utilities', period.utilitiesCost);
        addItem('expense', 'insurance', 'Insurance', period.insuranceCost);
        addItem('expense', 'property_tax', 'Property Tax', period.propertyTax);
        addItem('expense', 'management_fee', 'Management Fee', period.managementFee);
        addItem('expense', 'other_expense', 'Other Expenses', period.otherExpenses);
        addItem('expense', 'total_expenses', 'Total Expenses', period.totalExpenses);
        addItem('metric', 'ebitdar', 'EBITDAR', period.ebitdar);
        addItem('metric', 'ebitda', 'EBITDA', period.ebitda);
        addItem('metric', 'noi', 'Net Operating Income', period.noi);
        addItem('metric', 'net_income', 'Net Income', period.netIncome);
      }

      // Add census data to matching facilities
      for (const census of censusData) {
        const facName = census.facilityName || doc.filename?.replace(/\.(csv|xlsx|xls)$/i, '') || 'Unknown';
        if (!facilityMap.has(facName)) {
          facilityMap.set(facName, {
            name: facName,
            periods: [],
            lineItems: [],
            confidence: 0.7,
          });
        }
        const fac = facilityMap.get(facName)!;
        fac.census = {
          periods: [census.periodLabel],
          medicarePartADays: [census.medicarePartADays],
          medicareAdvantageDays: [census.medicareAdvantageDays],
          managedCareDays: [census.managedCareDays],
          medicaidDays: [census.medicaidDays],
          managedMedicaidDays: [census.managedMedicaidDays],
          privateDays: [census.privateDays],
          hospiceDays: [census.hospiceDays],
          vaContractDays: [census.vaContractDays],
          otherDays: [census.otherDays],
          totalDays: [census.totalPatientDays],
          avgDailyCensus: [census.avgDailyCensus],
          occupancy: [census.occupancyRate],
          beds: census.totalBeds,
        };
      }

      // Add rate data to matching facilities
      for (const rate of rateData) {
        const facName = [...facilityMap.keys()][0] || 'Unknown';
        const fac = facilityMap.get(facName);
        if (fac) {
          fac.payerRates = {
            effectiveDate: rate.effectiveDate?.toISOString()?.split('T')[0],
            medicarePartAPpd: rate.medicarePartAPpd,
            medicareAdvantagePpd: rate.medicareAdvantagePpd,
            managedCarePpd: rate.managedCarePpd,
            medicaidPpd: rate.medicaidPpd,
            managedMedicaidPpd: rate.managedMedicaidPpd,
            privatePpd: rate.privatePpd,
            hospicePpd: rate.hospicePpd,
            vaContractPpd: rate.vaContractPpd,
          };
        }
      }

      const facList = [...facilityMap.values()];
      allFacilities.push(...facList);

      // Determine sheet type
      let sheetType: 'pl' | 'census' | 'rates' | 'unknown' = 'unknown';
      if (plData.length > 0) sheetType = 'pl';
      else if (censusData.length > 0) sheetType = 'census';
      else if (rateData.length > 0) sheetType = 'rates';

      allSheetResults.push({
        name: sheetName,
        index: sheetIdx,
        type: sheetType,
        facilitiesFound: facList.map(f => f.name),
        periodsFound: facList.flatMap(f => f.periods?.map((p: any) => p.label || p) || []),
        confidence: 0.75,
      });
    } catch (err) {
      allWarnings.push(`Direct extraction error on sheet "${sheetName}": ${err instanceof Error ? err.message : 'Unknown'}`);
    }

    sheetIdx++;
  }

  // Only return if we found meaningful data
  const totalLineItems = allFacilities.reduce((sum, f) => sum + (f.lineItems?.length || 0), 0);
  if (allFacilities.length === 0 || totalLineItems < 3) return null;

  const processingTimeMs = Date.now() - start;
  const confidence = Math.min(
    0.7 + (totalLineItems > 10 ? 0.1 : 0) + (allFacilities.some(f => f.census) ? 0.1 : 0),
    0.95,
  );

  console.log(`[Direct Extraction] ${doc.filename}: ${allFacilities.length} facilities, ${totalLineItems} line items in ${processingTimeMs}ms`);

  return {
    documentId: doc.id,
    filename: doc.filename || 'unknown',
    facilities: allFacilities,
    sheets: allSheetResults,
    rawAnalysis: '',
    confidence,
    processingTimeMs,
    warnings: allWarnings,
    errors: [],
  };
}

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

    // Track time budget — abort before Vercel kills us
    const routeStartTime = Date.now();
    const getElapsed = () => Date.now() - routeStartTime;
    const getRemainingMs = () => HARD_DEADLINE_MS - getElapsed();
    const hasTimeForAiCall = () => getRemainingMs() > MIN_TIME_FOR_AI_CALL_MS;

    // ========================================================================
    // FAST PATH: Direct extraction using PL/Census/Rate extractors (no AI)
    // Works for CSV and Excel files with stored sheet data — runs in <1 second
    // ========================================================================
    const directResults: VisionExtractionResult[] = [];
    const docsNeedingAi: typeof docs = [];

    for (const doc of docs) {
      const ext = doc.filename?.split('.').pop()?.toLowerCase();
      if ((ext === 'csv' || ext === 'xlsx' || ext === 'xls') && (doc.extractedData as any)?.sheets) {
        const directResult = tryDirectExtraction(doc);
        if (directResult && directResult.facilities.some(f => f.lineItems?.length >= 3)) {
          directResults.push(directResult);
          console.log(`[Fast Path] ${doc.filename}: Direct extraction succeeded — ${directResult.facilities.length} facilities, ${directResult.facilities.reduce((s, f) => s + (f.lineItems?.length || 0), 0)} line items`);

          // Update doc status
          await db.update(documents).set({
            status: 'complete',
            processedAt: new Date(),
            extractedData: {
              ...(doc.extractedData as Record<string, any>),
              method: 'direct_extraction',
              facilitiesCount: directResult.facilities.length,
              confidence: directResult.confidence,
              processingTimeMs: directResult.processingTimeMs,
            },
          }).where(eq(documents.id, doc.id));

          continue;
        }
      }
      docsNeedingAi.push(doc);
    }

    // If ALL docs were handled by direct extraction, return immediately
    if (docsNeedingAi.length === 0 && directResults.length > 0) {
      const allFacilities = directResults.flatMap(r => r.facilities);
      const allSheets = directResults.flatMap(r => r.sheets);
      const overallConfidence = directResults.reduce((sum, r) => sum + r.confidence, 0) / directResults.length;

      return NextResponse.json({
        success: true,
        extractionMethod: 'direct',
        data: {
          facilities: allFacilities,
          sheets: allSheets,
          summary: {
            totalFacilities: allFacilities.length,
            totalLineItems: allFacilities.reduce((sum, f) => sum + f.lineItems.length, 0),
            totalSheets: allSheets.length,
            overallConfidence,
            processingTimeMs: directResults.reduce((sum, r) => sum + r.processingTimeMs, 0),
            hasCensusData: allFacilities.some(f => f.census && f.census.totalDays?.length > 0),
            hasPayerRates: allFacilities.some(f => f.payerRates && f.payerRates.medicarePartAPpd),
          },
          warnings: directResults.flatMap(r => r.warnings),
          errors: [],
        },
      });
    }

    // For remaining docs, continue with smart extraction and AI fallback
    const docs_for_extraction = docsNeedingAi.length > 0 ? docsNeedingAi : docs;

    // ========================================================================
    // SMART EXTRACTION — Try structured parsing first for Excel AND CSV files
    // ========================================================================
    const structuredDocs = docs_for_extraction.filter(d => {
      const ext = d.filename?.split('.').pop()?.toLowerCase();
      return (ext === 'xlsx' || ext === 'xls' || ext === 'csv') && (d.extractedData || d.rawText);
    });

    if (structuredDocs.length > 0) {
      try {
        console.log('='.repeat(60));
        console.log('SMART EXTRACTION — Direct structured parsing');
        console.log(`Attempting structured extraction on ${structuredDocs.length} file(s)`);
        console.log('='.repeat(60));

        // Convert stored sheet data to SheetExtraction format
        const smartFiles = structuredDocs.map(doc => {
          const ext = doc.filename?.split('.').pop()?.toLowerCase();
          const extracted = doc.extractedData as Record<string, any>;

          if (ext === 'csv') {
            // CSV: parse rawText into rows
            const rawText = doc.rawText || '';
            const lines = rawText.split('\n').filter(l => l.trim().length > 0);
            const data: (string | number | null)[][] = lines.map(line => {
              // Handle CSV parsing (respect quoted fields)
              const cells: (string | number | null)[] = [];
              let current = '';
              let inQuotes = false;
              for (let i = 0; i < line.length; i++) {
                const ch = line[i];
                if (ch === '"') {
                  inQuotes = !inQuotes;
                } else if (ch === ',' && !inQuotes) {
                  const val = current.trim();
                  const num = val.replace(/[$,()%]/g, '').trim();
                  const parsed = num ? Number(num) : NaN;
                  cells.push(!isNaN(parsed) && num.length > 0 && !/^[A-Za-z]/.test(val) ? parsed : val || null);
                  current = '';
                } else {
                  current += ch;
                }
              }
              // Push last cell
              const val = current.trim();
              const num = val.replace(/[$,()%]/g, '').trim();
              const parsed = num ? Number(num) : NaN;
              cells.push(!isNaN(parsed) && num.length > 0 && !/^[A-Za-z]/.test(val) ? parsed : val || null);
              return cells;
            });

            const headers = data.length > 0
              ? data[0].map(c => c != null ? String(c) : '')
              : [];

            const sheet: SheetExtraction = {
              sheetName: doc.filename?.replace(/\.csv$/i, '') || 'Sheet 1',
              sheetType: 'unknown' as const,
              rowCount: data.length,
              columnCount: headers.length,
              headers,
              data,
              facilitiesDetected: [],
              periodsDetected: [],
              metadata: { hasFormulas: false, hasMergedCells: false, firstDataRow: 1 },
            };

            return { documentId: doc.id, filename: doc.filename || 'unknown.csv', sheets: [sheet] };
          }

          // Excel: use stored sheet data
          const sheetsData = extracted?.sheets || {};
          const sheetNames = extracted?.sheetNames || Object.keys(sheetsData);

          const sheets: SheetExtraction[] = sheetNames.map((name: string) => {
            const data = (sheetsData[name] || []) as (string | number | null)[][];
            const headers = data.length > 0
              ? data[0].map(c => c != null ? String(c) : '')
              : [];

            return {
              sheetName: name,
              sheetType: 'unknown' as const,
              rowCount: data.length,
              columnCount: headers.length,
              headers,
              data,
              facilitiesDetected: [],
              periodsDetected: [],
              metadata: { hasFormulas: false, hasMergedCells: false, firstDataRow: 1 },
            };
          });

          return { documentId: doc.id, filename: doc.filename || 'unknown.xlsx', sheets };
        });

        // Check if any file has structured financial data
        const hasStructuredData = smartFiles.some(f => isStructuredExcelData(f.sheets));

        if (hasStructuredData) {
          const smartResult = await extractSmartExcel({ files: smartFiles });

          console.log(`Smart extraction: confidence=${(smartResult.confidence * 100).toFixed(0)}%, ` +
            `facilities=${smartResult.facilityClassifications.length}, ` +
            `method=${smartResult.extractionMethod}`);
          console.log(`Warnings: ${smartResult.warnings.join('; ')}`);

          if (smartResult.confidence >= 0.3 && smartResult.facilityClassifications.length > 0) {
            console.log('Smart extraction succeeded — returning structured data');

            // Convert to stage data format
            const stageData = smartResultToStageData(smartResult);

            // Update doc status
            for (const doc of structuredDocs) {
              await db
                .update(documents)
                .set({
                  status: 'complete',
                  processedAt: new Date(),
                  extractedData: {
                    ...(doc.extractedData as Record<string, any>),
                    method: 'smart_excel',
                    facilitiesCount: smartResult.facilityClassifications.length,
                    confidence: smartResult.confidence,
                    processingTimeMs: smartResult.processingTimeMs,
                  },
                })
                .where(eq(documents.id, doc.id));
            }

            return NextResponse.json({
              success: true,
              extractionMethod: 'smart_excel',
              data: {
                facilities: stageData.visionExtraction.facilities.map(f => ({
                  name: f.name,
                  state: f.state,
                  city: f.city,
                  beds: f.beds,
                  periods: f.periods.map(p => ({
                    label: p, startDate: '', endDate: '', type: 'annual' as const,
                  })),
                  lineItems: f.lineItems.map(li => ({
                    category: li.category,
                    subcategory: li.subcategory,
                    label: li.label,
                    values: li.values,
                    annual: li.annual,
                    ppd: li.ppd,
                    percentRevenue: li.percentRevenue,
                    confidence: li.confidence,
                  })),
                  census: f.census,
                  confidence: f.confidence,
                })),
                sheets: smartFiles.flatMap(f => f.sheets.map((s, i) => ({
                  name: s.sheetName,
                  index: i,
                  type: s.sheetType,
                  facilitiesFound: s.facilitiesDetected,
                  periodsFound: s.periodsDetected,
                  confidence: smartResult.confidence,
                }))),
                summary: {
                  totalFacilities: stageData.visionExtraction.facilities.length,
                  totalLineItems: stageData.visionExtraction.facilities.reduce(
                    (sum, f) => sum + f.lineItems.length, 0
                  ),
                  totalSheets: smartFiles.reduce((sum, f) => sum + f.sheets.length, 0),
                  overallConfidence: smartResult.confidence,
                  processingTimeMs: smartResult.processingTimeMs,
                  hasCensusData: stageData.visionExtraction.facilities.some(f => !!f.census),
                  hasPayerRates: false,
                },
                warnings: smartResult.warnings,
                errors: [],
              },
              // Include full smart extraction data for downstream use
              smartExtraction: stageData,
            });
          } else {
            console.log(`Smart extraction low confidence (${(smartResult.confidence * 100).toFixed(0)}%) — falling through to AI extraction`);
          }
        }
      } catch (smartError) {
        console.warn('Smart extraction failed, falling through to AI extraction:', smartError);
      }
    }

    // ========================================================================
    // AI VISION EXTRACTION — Fallback for non-Excel or low-confidence Excel
    // ========================================================================

    console.log('='.repeat(60));
    console.log('AI VISION EXTRACTION — SHEET-BY-SHEET (with time budget)');
    console.log(`Processing ${docs_for_extraction.length} file(s) sequentially`);
    console.log(`Time budget: ${(getRemainingMs() / 1000).toFixed(0)}s remaining`);
    console.log('='.repeat(60));

    const results: VisionExtractionResult[] = [];
    const processingErrors: string[] = [];

    // Process files ONE AT A TIME (sequential) with time budget
    for (const doc of docs_for_extraction) {
      // Check time budget before starting a new file
      if (!hasTimeForAiCall()) {
        console.warn(`[Time Budget] Only ${(getRemainingMs() / 1000).toFixed(0)}s remaining — skipping ${doc.filename}`);
        processingErrors.push(`${doc.filename}: Skipped — insufficient time budget (${(getRemainingMs() / 1000).toFixed(0)}s remaining)`);
        continue;
      }

      console.log(`\n--- Processing: ${doc.filename} (${(getRemainingMs() / 1000).toFixed(0)}s remaining) ---`);
      try {
        const result = await extractDocument(doc, routeStartTime);
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
        // Preserve existing extractedData (e.g. imageBase64) — only add error field
        const existingData = (doc.extractedData as Record<string, any>) || {};
        await db
          .update(documents)
          .set({
            status: 'error',
            processedAt: new Date(),
            extractedData: { ...existingData, error: errorMsg },
          })
          .where(eq(documents.id, doc.id));
      }
    }

    // Cross-document merge: combine direct extraction results with AI results
    const allResults = [...directResults, ...results];

    console.log('\n' + '='.repeat(60));
    console.log('EXTRACTION COMPLETE');
    console.log(`  AI Files: ${results.length}/${docs_for_extraction.length}, Direct: ${directResults.length}`);
    const totalFacs = allResults.reduce((s, r) => s + r.facilities.length, 0);
    const totalItems = allResults.reduce((s, r) => s + r.facilities.reduce((s2, f) => s2 + f.lineItems.length, 0), 0);
    console.log(`  Facilities: ${totalFacs}`);
    console.log(`  Line items: ${totalItems}`);
    if (processingErrors.length > 0) console.log(`  Errors: ${processingErrors.length}`);
    console.log('='.repeat(60));
    const allFacilitiesRaw = allResults.flatMap(r => r.facilities);
    const allFacilities = mergeChunkFacilities(allFacilitiesRaw, 'cross-sheet');
    const allSheets = allResults.flatMap(r => r.sheets);
    const overallConfidence = allResults.length > 0
      ? allResults.reduce((sum, r) => sum + r.confidence, 0) / allResults.length
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

async function extractDocument(doc: typeof documents.$inferSelect, routeStartTime: number): Promise<VisionExtractionResult> {
  const ext = doc.filename?.split('.').pop()?.toLowerCase() || 'pdf';
  const start = Date.now();

  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'pdf') {
    return extractFromText(doc, ext, start, routeStartTime);
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
  routeStartTime: number,
): Promise<VisionExtractionResult> {
  const rawText = doc.rawText || '';
  const docExtractedData = doc.extractedData as Record<string, any> | null;

  // Time budget helpers
  const getRouteElapsed = () => Date.now() - routeStartTime;
  const getRouteRemaining = () => HARD_DEADLINE_MS - getRouteElapsed();
  const canStartAiCall = () => getRouteRemaining() > MIN_TIME_FOR_AI_CALL_MS;

  if (!rawText || rawText.length < 20 || rawText.startsWith('[Error')) {
    throw new Error(`No parsed text available for ${doc.filename}. Raw text: ${rawText?.slice(0, 100)}`);
  }

  console.log(`  [${doc.filename}] Total text: ${(rawText.length / 1024).toFixed(0)}KB, time remaining: ${(getRouteRemaining() / 1000).toFixed(0)}s`);

  // Step 1: Split into individual sheets
  const sheets = splitIntoSheets(rawText);
  console.log(`  [${doc.filename}] Found ${sheets.length} sheet(s): ${sheets.map(s => `${s.name} (${(s.content.length / 1024).toFixed(0)}KB)`).join(', ')}`);

  // Step 2: Process each sheet individually
  const allFacilities: any[] = [];
  const allSheetResults: any[] = [];
  const allWarnings: string[] = [];
  const rawAnalysisParts: string[] = [];

  for (let sheetIdx = 0; sheetIdx < sheets.length; sheetIdx++) {
    // Time budget check before each sheet
    if (!canStartAiCall()) {
      console.warn(`  [${doc.filename}] Time budget exhausted (${(getRouteRemaining() / 1000).toFixed(0)}s left) — skipping sheet ${sheetIdx + 1}/${sheets.length}`);
      allWarnings.push(`Sheet "${sheets[sheetIdx].name}" skipped — time budget exhausted`);
      break;
    }

    const sheet = sheets[sheetIdx];

    // Compress text to remove empty rows and excessive whitespace
    const originalSize = sheet.content.length;
    sheet.content = compressText(sheet.content);
    const compressedSize = sheet.content.length;
    const saved = ((1 - compressedSize / originalSize) * 100).toFixed(0);

    console.log(`  [${doc.filename}] Sheet ${sheetIdx + 1}/${sheets.length}: "${sheet.name}" (${(originalSize / 1024).toFixed(0)}KB -> ${(compressedSize / 1024).toFixed(0)}KB, ${saved}% compressed) [${(getRouteRemaining() / 1000).toFixed(0)}s remaining]`);

    // Chunk large sheets
    const chunks = chunkSheet(sheet);

    if (chunks.length > 1) {
      console.log(`    Chunked into ${chunks.length} segments`);
    }

    // Process chunks SEQUENTIALLY with time budget checks between each
    // (parallel was causing multiple slow AI calls to stack and exceed deadline)
    const chunkFacilities: any[] = [];

    console.log(`    Processing ${chunks.length} chunk(s) sequentially with time budget...`);

    for (const chunk of chunks) {
      // Time budget check before each chunk
      if (!canStartAiCall()) {
        console.warn(`    Time budget exhausted (${(getRouteRemaining() / 1000).toFixed(0)}s left) — skipping remaining chunks`);
        allWarnings.push(`Sheet "${chunk.sheetName}" chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks} skipped — time budget`);
        break;
      }

      const chunkLabel = chunks.length > 1
        ? `chunk ${chunk.chunkIndex + 1}/${chunk.totalChunks}`
        : 'full sheet';

      try {
        const userPrompt = chunks.length > 1
          ? `Extract all financial data from this section (${chunkLabel}) of sheet "${chunk.sheetName}" in document "${doc.filename}".\nThis is part of a larger sheet — extract everything you see in this segment.\n\n${chunk.content}`
          : `Extract all financial data from sheet "${chunk.sheetName}" in document "${doc.filename}".\n\n${chunk.content}`;

        const isChunked = chunks.length > 1;
        const router = getRouter();

        // Race the AI call against our own time budget (slightly shorter than provider timeout)
        const budgetTimeoutMs = Math.min(getRouteRemaining() - 5_000, 90_000);
        const response = await Promise.race([
          router.route({
            taskType: 'vision_extraction',
            systemPrompt: FINANCIAL_EXTRACTION_SYSTEM,
            userPrompt,
            maxTokens: isChunked ? CHUNK_MAX_TOKENS : TEXT_MAX_TOKENS,
            responseFormat: 'json',
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Time budget exceeded (${(getRouteRemaining() / 1000).toFixed(0)}s remaining)`)), budgetTimeoutMs)
          ),
        ]);

        const content = response.content || '';
        rawAnalysisParts.push(`--- Sheet: ${chunk.sheetName} (${chunkLabel}) ---\n${content}`);

        const { data: parsed, warnings } = robustJsonParse(content);
        allWarnings.push(...warnings);

        const facilities = parsed.facilities || [];
        chunkFacilities.push(...facilities);

        if (parsed.warnings && Array.isArray(parsed.warnings)) {
          allWarnings.push(...parsed.warnings);
        }

        console.log(`    -> ${chunkLabel}: ${facilities.length} facilities, ${facilities.reduce((s: number, f: any) => s + (f.lineItems?.length || 0), 0)} line items [${(getRouteRemaining() / 1000).toFixed(0)}s remaining]`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`    ERROR [${chunkLabel}]: ${msg}`);
        allWarnings.push(`Failed to extract ${chunkLabel}: ${msg}`);
        // If time budget error, break out of chunk loop
        if (msg.includes('Time budget')) break;
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
function mergeChunkFacilities(chunkFacilities: any[], mode: 'within-sheet' | 'cross-sheet' = 'within-sheet'): any[] {
  if (chunkFacilities.length === 0) return [];

  // Filter out summary/aggregate rows that aren't real facilities
  const SUMMARY_PATTERNS = /^(total\s+portfolio|snf\s*[-\/]|alf\s*[-\/]|all\s+facilities|grand\s+total|subtotal|combined|consolidated|total\s+(?:owned|leased|managed))/i;
  const filtered = chunkFacilities.filter((f) => {
    const name = (f.name || '').trim();
    if (!name || SUMMARY_PATTERNS.test(name)) return false;
    return true;
  });

  // Group by facility identity
  // within-sheet: merge by name only (same facility from different chunks)
  // cross-sheet: merge by name (same doc's sheets often have different detail levels)
  //   but prefer entries with more location/line item data
  const byIdentity = new Map<string, any[]>();
  for (const f of filtered) {
    let key: string;
    if (f.ccn && f.ccn.trim()) {
      key = `ccn:${f.ccn.trim()}`;
    } else {
      // Always group by normalized name — within a single document,
      // the same facility appears across P&L, Census, and Valuation sheets
      const name = (f.name || 'Unknown').toLowerCase().trim();
      key = `name:${name}`;
    }
    if (!byIdentity.has(key)) byIdentity.set(key, []);
    byIdentity.get(key)!.push(f);
  }

  const merged: any[] = [];
  for (const [, group] of byIdentity) {
    if (group.length === 1) {
      merged.push(group[0]);
      continue;
    }

    // Merge multiple entries for the same facility
    // Pick the entry with the most data as base (prefer one with city, more line items)
    const ranked = [...group].sort((a, b) => {
      const scoreA = (a.lineItems?.length || 0) * 10 + (a.city && a.city !== 'Unknown' ? 5 : 0) + (a.state ? 2 : 0) + (a.beds ? 1 : 0);
      const scoreB = (b.lineItems?.length || 0) * 10 + (b.city && b.city !== 'Unknown' ? 5 : 0) + (b.state ? 2 : 0) + (b.beds ? 1 : 0);
      return scoreB - scoreA;
    });
    const base = { ...ranked[0] };
    // Fill in missing location data from other entries
    for (const entry of ranked) {
      if (!base.city || base.city === 'Unknown') base.city = entry.city;
      if (!base.state) base.state = entry.state;
      if (!base.beds && entry.beds) base.beds = entry.beds;
      if (!base.ccn && entry.ccn) base.ccn = entry.ccn;
    }
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
