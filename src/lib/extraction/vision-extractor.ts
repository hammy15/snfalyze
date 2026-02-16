/**
 * AI Vision Document Extractor
 *
 * Uses Claude's vision capabilities to read spreadsheets and documents
 * like a human analyst would - understanding context, structure, and relationships.
 *
 * This provides more reliable extraction than programmatic parsing because:
 * 1. Understands merged cells and irregular layouts
 * 2. Infers meaning from context and labels
 * 3. Handles various date formats and number notations
 * 4. Identifies facility boundaries in multi-building files
 */

import { getRouter } from '@/lib/ai';
import * as ExcelJS from 'exceljs';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// ============================================================================
// TYPES
// ============================================================================

export interface VisionExtractionResult {
  documentId: string;
  filename: string;
  facilities: VisionExtractedFacility[];
  sheets: VisionExtractedSheet[];
  rawAnalysis: string;
  confidence: number;
  processingTimeMs: number;
  warnings: string[];
  errors: string[];
}

export interface VisionExtractedFacility {
  name: string;
  ccn?: string;
  state?: string;
  city?: string;
  beds?: number;
  periods: VisionExtractedPeriod[];
  lineItems: VisionExtractedLineItem[];
  census?: VisionExtractedCensus;
  payerRates?: VisionExtractedRates;
  confidence: number;
}

export interface VisionExtractedPeriod {
  label: string;
  startDate: string;
  endDate: string;
  type: 'monthly' | 'quarterly' | 'annual' | 'ttm';
}

export interface VisionExtractedLineItem {
  category: 'revenue' | 'expense' | 'metric';
  subcategory: string;
  label: string;
  values: { period: string; value: number }[];
  annual?: number;
  ppd?: number;
  percentRevenue?: number;
  notes?: string;
  confidence: number;
}

export interface VisionExtractedCensus {
  periods: string[];
  medicarePartADays: number[];
  medicareAdvantageDays: number[];
  managedCareDays: number[];
  medicaidDays: number[];
  managedMedicaidDays: number[];
  privateDays: number[];
  hospiceDays: number[];
  vaContractDays: number[];
  otherDays: number[];
  totalDays: number[];
  avgDailyCensus: number[];
  occupancy: number[];
  beds?: number;
}

export interface VisionExtractedRates {
  effectiveDate?: string;
  medicarePartAPpd?: number;
  medicareAdvantagePpd?: number;
  managedCarePpd?: number;
  medicaidPpd?: number;
  managedMedicaidPpd?: number;
  privatePpd?: number;
  hospicePpd?: number;
  vaContractPpd?: number;
  ancillaryPpd?: number;
  therapyPpd?: number;
  blendedPpd?: number;
}

export interface VisionExtractedSheet {
  name: string;
  index: number;
  type: 'pl' | 'census' | 'rates' | 'summary' | 'unknown';
  facilitiesFound: string[];
  periodsFound: string[];
  imageBase64?: string;
  confidence: number;
}

export interface ExtractionProgress {
  stage: 'reading' | 'converting' | 'analyzing' | 'structuring' | 'complete' | 'error';
  progress: number;
  message: string;
  sheetIndex?: number;
  totalSheets?: number;
}

// ============================================================================
// EXCEL TO IMAGE CONVERSION
// ============================================================================

/**
 * Convert Excel sheet to a visual representation for Claude to analyze
 * We create a text-based representation since canvas may not be available
 */
async function convertSheetToText(
  workbook: ExcelJS.Workbook,
  worksheet: ExcelJS.Worksheet,
  sheetIndex: number
): Promise<string> {
  const rows: string[][] = [];

  // Get used range
  const rowCount = Math.min(worksheet.rowCount, 100); // Limit to 100 rows
  const colCount = Math.min(worksheet.columnCount, 20); // Limit to 20 columns

  for (let rowNum = 1; rowNum <= rowCount; rowNum++) {
    const row = worksheet.getRow(rowNum);
    const rowData: string[] = [];

    for (let colNum = 1; colNum <= colCount; colNum++) {
      const cell = row.getCell(colNum);
      let value = '';

      if (cell.value !== null && cell.value !== undefined) {
        if (typeof cell.value === 'object' && 'result' in cell.value) {
          // Formula cell - use the result
          value = String(cell.value.result || '');
        } else if (cell.value instanceof Date) {
          value = cell.value.toLocaleDateString();
        } else {
          value = String(cell.value);
        }
      }

      rowData.push(value.trim());
    }

    // Only add row if it has content
    if (rowData.some(cell => cell.length > 0)) {
      rows.push(rowData);
    }
  }

  // Convert to markdown table format for better structure
  if (rows.length === 0) return '';

  let table = `## Sheet: ${worksheet.name}\n\n`;

  // Format as aligned text columns
  const colWidths = rows[0].map((_, colIdx) =>
    Math.min(30, Math.max(8, ...rows.map(row => (row[colIdx] || '').length)))
  );

  for (const row of rows) {
    const formattedRow = row.map((cell, idx) =>
      (cell || '').padEnd(colWidths[idx]).substring(0, colWidths[idx])
    ).join(' | ');
    table += formattedRow + '\n';

    // Add separator after first row (header)
    if (row === rows[0]) {
      table += colWidths.map(w => '-'.repeat(w)).join('-+-') + '\n';
    }
  }

  return table;
}

// ============================================================================
// AI VISION ANALYSIS
// ============================================================================

const EXTRACTION_PROMPT = `You are a healthcare financial analyst expert at reading SNF (Skilled Nursing Facility) and ALF (Assisted Living Facility) financial documents.

Analyze this spreadsheet data and extract ALL financial information in a structured JSON format.

IMPORTANT GUIDELINES:
1. Extract EVERY line item you see - do not skip anything
2. Identify each facility/building separately
3. Recognize monthly columns by date patterns (Jan, Feb, etc. or 1/31/24, 2/28/24 format)
4. Numbers in parentheses like (1,234) are NEGATIVE
5. Calculate annualized values where monthly data exists
6. Calculate PPD (Per Patient Day) when census data is available
7. Calculate % of Revenue for expense items
8. Watch for:
   - Medicare Part A vs Medicare Advantage (MA) - different payer types
   - Managed Medicaid vs Traditional Medicaid
   - Agency/Contract labor vs Core labor (important distinction)
   - EBITDAR (before rent) vs EBITDA (after rent)

EXTRACT INTO THIS EXACT JSON STRUCTURE:
{
  "facilities": [
    {
      "name": "Facility Name",
      "ccn": "123456 if found",
      "state": "OR",
      "city": "City Name",
      "beds": 120,
      "periods": [
        { "label": "Jan 2024", "startDate": "2024-01-01", "endDate": "2024-01-31", "type": "monthly" }
      ],
      "lineItems": [
        {
          "category": "revenue|expense|metric",
          "subcategory": "patient_revenue|ancillary|labor|occupancy|admin|etc",
          "label": "Original Label from spreadsheet",
          "values": [
            { "period": "Jan 2024", "value": 123456 }
          ],
          "annual": 1481472,
          "ppd": 34.56,
          "percentRevenue": 45.2,
          "notes": "Any special notes about this item",
          "confidence": 0.95
        }
      ],
      "census": {
        "periods": ["Jan 2024", "Feb 2024"],
        "medicarePartADays": [450, 480],
        "medicareAdvantageDays": [180, 200],
        "managedCareDays": [300, 290],
        "medicaidDays": [1800, 1850],
        "managedMedicaidDays": [200, 210],
        "privateDays": [360, 340],
        "hospiceDays": [100, 110],
        "vaContractDays": [50, 55],
        "otherDays": [20, 25],
        "totalDays": [3460, 3560],
        "avgDailyCensus": [111.6, 123.4],
        "occupancy": [0.85, 0.88],
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
        "ancillaryPpd": 20.00,
        "therapyPpd": 15.00,
        "blendedPpd": 291.00
      },
      "confidence": 0.9
    }
  ],
  "sheets": [
    {
      "name": "Sheet Name",
      "index": 0,
      "type": "pl|census|rates|summary|unknown",
      "facilitiesFound": ["Facility 1"],
      "periodsFound": ["Jan 2024", "Feb 2024"],
      "confidence": 0.85
    }
  ],
  "warnings": ["Any data quality warnings"],
  "rawNotes": "Any additional observations about the data"
}

COMMON SNF LINE ITEM MAPPINGS:
Revenue:
- Room & Board, Patient Service Revenue → patient_revenue
- Medicare Revenue, Skilled Medicare → medicare_revenue
- Medicaid Revenue → medicaid_revenue
- Private Pay Revenue → private_revenue
- Ancillary Revenue, Other Patient Revenue → ancillary_revenue
- Therapy Revenue, PT/OT/SLP → therapy_revenue

Expenses:
- Salaries & Wages, Payroll → labor_total
- Nursing Salaries, Nursing Labor → labor_nursing
- Agency/Contract Labor → labor_agency (IMPORTANT: track separately)
- Employee Benefits, Payroll Taxes → labor_benefits
- Dietary/Food Service → dietary
- Housekeeping/Laundry → housekeeping
- Utilities → utilities
- Repairs & Maintenance → maintenance
- Insurance → insurance
- Property Tax → property_tax
- Management Fee → management_fee
- Rent/Lease → rent

Metrics:
- EBITDAR → ebitdar (Earnings Before Interest, Taxes, Depreciation, Amortization, and Rent)
- EBITDA → ebitda
- NOI → noi (Net Operating Income)
- Gross Margin → gross_margin

Now analyze the following spreadsheet data:

`;

/**
 * Clean and extract JSON from AI response
 * Handles various response formats: raw JSON, markdown code blocks, etc.
 */
function extractJsonFromResponse(responseText: string): string | null {
  // Try 1: Check if it's already clean JSON
  const trimmed = responseText.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  // Try 2: Extract from markdown code block ```json ... ```
  const jsonCodeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonCodeBlockMatch) {
    const extracted = jsonCodeBlockMatch[1].trim();
    if (extracted.startsWith('{')) {
      return extracted;
    }
  }

  // Try 3: Find JSON object pattern anywhere in response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return null;
}

/**
 * Attempt to fix common JSON issues
 */
function tryFixJson(jsonStr: string): string {
  let fixed = jsonStr;

  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

  // Fix unquoted keys (basic)
  fixed = fixed.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');

  // Fix single quotes to double quotes (but not inside strings - basic approach)
  fixed = fixed.replace(/'/g, '"');

  // Remove control characters
  fixed = fixed.replace(/[\x00-\x1F\x7F]/g, ' ');

  // Fix missing commas between array elements: ]["  or  }{ patterns
  fixed = fixed.replace(/\](\s*)\[/g, '],$1[');
  fixed = fixed.replace(/\}(\s*)\{/g, '},$1{');

  // Fix missing commas between string elements in arrays: "value" "value"
  fixed = fixed.replace(/"(\s+)"/g, '", "');

  // Fix missing commas after numbers before strings: 123 "value"
  fixed = fixed.replace(/(\d)(\s+)"/g, '$1, "');

  // Fix missing commas after strings before numbers: "value" 123
  fixed = fixed.replace(/"(\s+)(\d)/g, '", $2');

  // Fix missing commas after booleans/nulls: true "value" or false { or null [
  fixed = fixed.replace(/(true|false|null)(\s+)(["\[{])/g, '$1, $3');

  return fixed;
}

/**
 * Try to close incomplete JSON by adding missing brackets
 */
function tryCloseIncompleteJson(jsonStr: string): string {
  // Count open/close brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;

  for (const char of jsonStr) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') openBraces++;
    else if (char === '}') openBraces--;
    else if (char === '[') openBrackets++;
    else if (char === ']') openBrackets--;
  }

  // If we're still in a string, close it
  if (inString) {
    jsonStr += '"';
  }

  // Close any open brackets/braces
  let result = jsonStr;
  while (openBrackets > 0) {
    result += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    result += '}';
    openBraces--;
  }

  return result;
}

/**
 * Use Claude Vision to analyze spreadsheet content
 */
async function analyzeWithVision(
  sheetContents: string[],
  filename: string,
  retryCount = 0
): Promise<{
  facilities: VisionExtractedFacility[];
  sheets: VisionExtractedSheet[];
  warnings: string[];
  rawAnalysis: string;
}> {
  const combinedContent = sheetContents.join('\n\n---\n\n');
  const warnings: string[] = [];

  try {
    const router = getRouter();
    const message = await router.route({
      taskType: 'vision_extraction',
      systemPrompt: '',
      userPrompt: EXTRACTION_PROMPT + combinedContent + `\n\nFilename: ${filename}\n\nIMPORTANT: Return ONLY valid JSON. No markdown formatting, no code blocks, no explanatory text. Start your response with { and end with }.`,
      maxTokens: 16000,
      responseFormat: 'json',
    });

    const responseText = message.content;

    // Log response for debugging
    console.log(`[Vision] Response length: ${responseText.length} chars`);
    console.log(`[Vision] Response preview: ${responseText.substring(0, 200)}...`);

    // Extract JSON from response
    let jsonStr = extractJsonFromResponse(responseText);

    if (!jsonStr) {
      console.error('[Vision] No JSON found in response');
      console.error('[Vision] Full response:', responseText);

      // Retry once if no JSON found
      if (retryCount < 1) {
        console.log('[Vision] Retrying extraction...');
        warnings.push('First extraction attempt returned no JSON, retrying...');
        return analyzeWithVision(sheetContents, filename, retryCount + 1);
      }

      return {
        facilities: [],
        sheets: [],
        warnings: [...warnings, 'AI response did not contain valid JSON structure'],
        rawAnalysis: responseText,
      };
    }

    // Try to parse the JSON
    let parsed: any;

    try {
      parsed = JSON.parse(jsonStr);
    } catch (firstError) {
      // Try fixing common JSON issues
      console.log('[Vision] First parse failed, attempting to fix JSON...');
      console.log('[Vision] Error:', firstError instanceof Error ? firstError.message : firstError);
      const fixedJson = tryFixJson(jsonStr);

      try {
        parsed = JSON.parse(fixedJson);
        warnings.push('JSON required minor fixes to parse');
      } catch (secondError) {
        // Try closing incomplete JSON (truncated response)
        console.log('[Vision] Second parse failed, attempting to close incomplete JSON...');
        const closedJson = tryCloseIncompleteJson(tryFixJson(jsonStr));

        try {
          parsed = JSON.parse(closedJson);
          warnings.push('JSON was truncated and required closing brackets');
        } catch (thirdError) {
          console.error('[Vision] Failed to parse JSON even after all fixes');
          console.error('[Vision] Original JSON length:', jsonStr.length);
          console.error('[Vision] JSON start:', jsonStr.substring(0, 300));
          console.error('[Vision] JSON end:', jsonStr.substring(Math.max(0, jsonStr.length - 300)));
          console.error('[Vision] Parse error:', thirdError);

          // Retry once if parsing fails
          if (retryCount < 1) {
            console.log('[Vision] Retrying extraction due to parse error...');
            warnings.push('JSON parsing failed, retrying extraction...');
            return analyzeWithVision(sheetContents, filename, retryCount + 1);
          }

          return {
            facilities: [],
            sheets: [],
            warnings: [...warnings, `Failed to parse AI response: ${thirdError instanceof Error ? thirdError.message : 'Unknown error'}`],
            rawAnalysis: responseText,
          };
        }
      }
    }

    // Validate the parsed structure
    if (!parsed || typeof parsed !== 'object') {
      warnings.push('Parsed JSON is not an object');
      return {
        facilities: [],
        sheets: [],
        warnings,
        rawAnalysis: responseText,
      };
    }

    // Extract facilities with validation
    const facilities = Array.isArray(parsed.facilities)
      ? parsed.facilities.filter((f: any) => f && typeof f === 'object' && f.name)
      : [];

    if (parsed.facilities && !Array.isArray(parsed.facilities)) {
      warnings.push('facilities field is not an array');
    }

    // Extract sheets with validation
    const sheets = Array.isArray(parsed.sheets)
      ? parsed.sheets.filter((s: any) => s && typeof s === 'object')
      : [];

    // Add any warnings from the AI response
    if (Array.isArray(parsed.warnings)) {
      warnings.push(...parsed.warnings);
    }

    console.log(`[Vision] Successfully extracted ${facilities.length} facilities, ${sheets.length} sheets`);

    return {
      facilities,
      sheets,
      warnings,
      rawAnalysis: responseText,
    };

  } catch (apiError) {
    console.error('[Vision] API call failed:', apiError);

    // Retry once on API errors
    if (retryCount < 1) {
      console.log('[Vision] Retrying after API error...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      return analyzeWithVision(sheetContents, filename, retryCount + 1);
    }

    return {
      facilities: [],
      sheets: [],
      warnings: [`API error: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`],
      rawAnalysis: '',
    };
  }
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract financial data from a document using AI Vision
 */
export async function extractWithVision(
  filePath: string,
  documentId: string,
  filename: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<VisionExtractionResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  const reportProgress = (
    stage: ExtractionProgress['stage'],
    progress: number,
    message: string,
    extra?: Partial<ExtractionProgress>
  ) => {
    onProgress?.({ stage, progress, message, ...extra });
  };

  try {
    const ext = filename.split('.').pop()?.toLowerCase();

    if (ext !== 'xlsx' && ext !== 'xls') {
      throw new Error(`Vision extraction currently supports Excel files only. Got: ${ext}`);
    }

    // Step 1: Read Excel file
    reportProgress('reading', 10, `Reading ${filename}...`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const totalSheets = workbook.worksheets.length;
    reportProgress('reading', 20, `Found ${totalSheets} sheets`);

    // Step 2: Convert each sheet to text for AI analysis
    reportProgress('converting', 30, 'Converting sheets for AI analysis...');

    const sheetContents: string[] = [];

    for (let i = 0; i < workbook.worksheets.length; i++) {
      const worksheet = workbook.worksheets[i];
      const progressPct = 30 + Math.floor((i / totalSheets) * 20);

      reportProgress('converting', progressPct, `Converting sheet: ${worksheet.name}`, {
        sheetIndex: i,
        totalSheets,
      });

      try {
        const textContent = await convertSheetToText(workbook, worksheet, i);
        if (textContent) {
          sheetContents.push(textContent);
        }
      } catch (convErr) {
        warnings.push(`Failed to convert sheet ${worksheet.name}: ${convErr instanceof Error ? convErr.message : 'Unknown'}`);
      }
    }

    if (sheetContents.length === 0) {
      throw new Error('No readable content found in the Excel file');
    }

    // Step 3: Send to Claude for analysis
    reportProgress('analyzing', 55, 'AI analyzing document content...');

    const analysisResult = await analyzeWithVision(sheetContents, filename);

    warnings.push(...analysisResult.warnings);

    // Step 4: Structure and validate results
    reportProgress('structuring', 85, 'Structuring extracted data...');

    // Calculate confidence based on extraction quality
    let confidence = 0.5;
    if (analysisResult.facilities.length > 0) {
      const facilityConfidences = analysisResult.facilities.map(f => f.confidence || 0.5);
      confidence = facilityConfidences.reduce((a, b) => a + b, 0) / facilityConfidences.length;

      // Boost confidence if we have good data
      const hasLineItems = analysisResult.facilities.some(f => f.lineItems.length > 5);
      const hasCensus = analysisResult.facilities.some(f => f.census && f.census.totalDays.length > 0);
      const hasRates = analysisResult.facilities.some(f => f.payerRates && f.payerRates.medicarePartAPpd);

      if (hasLineItems) confidence = Math.min(confidence + 0.1, 1);
      if (hasCensus) confidence = Math.min(confidence + 0.1, 1);
      if (hasRates) confidence = Math.min(confidence + 0.1, 1);
    }

    reportProgress('complete', 100, 'Extraction complete');

    return {
      documentId,
      filename,
      facilities: analysisResult.facilities,
      sheets: analysisResult.sheets,
      rawAnalysis: analysisResult.rawAnalysis,
      confidence,
      processingTimeMs: Date.now() - startTime,
      warnings,
      errors,
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMsg);

    reportProgress('error', 0, `Extraction failed: ${errorMsg}`);

    return {
      documentId,
      filename,
      facilities: [],
      sheets: [],
      rawAnalysis: '',
      confidence: 0,
      processingTimeMs: Date.now() - startTime,
      warnings,
      errors,
    };
  }
}

/**
 * Extract from PDF using AI Vision
 */
export async function extractPDFWithVision(
  filePath: string,
  documentId: string,
  filename: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<VisionExtractionResult> {
  const startTime = Date.now();

  onProgress?.({ stage: 'reading', progress: 10, message: 'Reading PDF...' });

  // For PDFs, we'll use text extraction and send to Claude
  // In the future, we could convert PDF pages to images for true vision
  const pdfParse = await import('pdf-parse');
  const pdfBuffer = await readFile(filePath);
  const pdfData = await pdfParse.default(pdfBuffer);

  onProgress?.({ stage: 'analyzing', progress: 50, message: 'AI analyzing PDF content...' });

  const result = await analyzeWithVision(
    [`## PDF Document: ${filename}\n\n${pdfData.text}`],
    filename
  );

  onProgress?.({ stage: 'complete', progress: 100, message: 'Extraction complete' });

  return {
    documentId,
    filename,
    facilities: result.facilities,
    sheets: result.sheets,
    rawAnalysis: result.rawAnalysis,
    confidence: result.facilities.length > 0 ? 0.7 : 0.3,
    processingTimeMs: Date.now() - startTime,
    warnings: result.warnings,
    errors: [],
  };
}
