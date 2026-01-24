/**
 * Per-File Extraction Pipeline
 *
 * Processes files ONE AT A TIME for deep extraction of:
 * - Financial data (P&L, income statements)
 * - Census data by payer type
 * - PPD rates from rate letters
 *
 * Each file is fully processed before moving to the next.
 */

import { extractExcelFile, type SheetExtraction } from './excel-extractor';
import { extractPDFFile } from './pdf-extractor';
import { extractCensusData, type CensusPeriod } from './census-extractor';
import { extractRatesFromText, type PayerRate } from './rate-extractor';
import { extractPLData, type FinancialPeriod } from './pl-extractor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PerFileExtractionResult {
  documentId: string;
  filename: string;
  fileType: 'excel' | 'pdf' | 'csv' | 'image';
  sheets: SheetExtraction[];
  financialData: FinancialPeriod[];
  censusData: CensusPeriod[];
  rateData: PayerRate[];
  rawText?: string;
  confidence: number;
  warnings: string[];
  processingTimeMs: number;
}

export interface ExtractionProgress {
  documentId: string;
  filename: string;
  stage: 'reading' | 'classifying' | 'extracting' | 'populating' | 'complete' | 'error';
  progress: number;
  message: string;
}

// ============================================================================
// MAIN EXTRACTION ENTRY POINT
// ============================================================================

/**
 * Process a single file completely before returning
 * This is the main entry point for per-file extraction
 */
export async function extractSingleFile(
  filePath: string,
  documentId: string,
  filename: string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<PerFileExtractionResult> {
  const startTime = Date.now();
  const ext = filename.split('.').pop()?.toLowerCase();
  const warnings: string[] = [];

  const reportProgress = (stage: ExtractionProgress['stage'], progress: number, message: string) => {
    onProgress?.({
      documentId,
      filename,
      stage,
      progress,
      message,
    });
  };

  try {
    reportProgress('reading', 10, `Reading ${filename}...`);

    switch (ext) {
      case 'xlsx':
      case 'xls':
        return await processExcelFile(filePath, documentId, filename, startTime, reportProgress);

      case 'pdf':
        return await processPDFFile(filePath, documentId, filename, startTime, reportProgress);

      case 'csv':
        return await processCSVFile(filePath, documentId, filename, startTime, reportProgress);

      default:
        throw new Error(`Unsupported file type: ${ext}`);
    }
  } catch (error) {
    reportProgress('error', 0, `Error processing ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

/**
 * Process an Excel file - read ALL sheets, ALL rows
 */
async function processExcelFile(
  filePath: string,
  documentId: string,
  filename: string,
  startTime: number,
  reportProgress: (stage: ExtractionProgress['stage'], progress: number, message: string) => void
): Promise<PerFileExtractionResult> {
  reportProgress('reading', 20, 'Reading Excel workbook...');

  // Extract all sheets and rows using ExcelJS
  const excelResult = await extractExcelFile(filePath, documentId, filename);

  reportProgress('classifying', 40, `Found ${excelResult.sheets.length} sheets, classifying...`);

  const financialData: FinancialPeriod[] = [];
  const censusData: CensusPeriod[] = [];
  const rateData: PayerRate[] = [];
  const warnings: string[] = [];

  // Process each sheet based on its classification
  for (let i = 0; i < excelResult.sheets.length; i++) {
    const sheet = excelResult.sheets[i];
    const progressPct = 40 + Math.floor((i / excelResult.sheets.length) * 40);

    reportProgress('extracting', progressPct, `Processing sheet: ${sheet.sheetName} (${sheet.sheetType})`);

    try {
      switch (sheet.sheetType) {
        case 'pl':
          const plData = extractPLData(sheet.data, sheet.sheetName, sheet.facilitiesDetected);
          financialData.push(...plData);
          break;

        case 'census':
          const cenData = extractCensusData(sheet.data, sheet.sheetName, sheet.facilitiesDetected);
          censusData.push(...cenData);
          break;

        case 'rates':
          const rtData = extractRatesFromText(
            sheet.data.map(row => row.join(' ')).join('\n'),
            documentId,
            sheet.facilitiesDetected
          );
          rateData.push(...rtData);
          break;

        case 'summary':
          // Summary sheets might contain multiple data types
          const summaryPL = extractPLData(sheet.data, sheet.sheetName, sheet.facilitiesDetected);
          const summaryCensus = extractCensusData(sheet.data, sheet.sheetName, sheet.facilitiesDetected);
          financialData.push(...summaryPL);
          censusData.push(...summaryCensus);
          break;

        default:
          // Try to extract any recognizable data
          const unknownPL = extractPLData(sheet.data, sheet.sheetName, sheet.facilitiesDetected);
          const unknownCensus = extractCensusData(sheet.data, sheet.sheetName, sheet.facilitiesDetected);
          if (unknownPL.length > 0) financialData.push(...unknownPL);
          if (unknownCensus.length > 0) censusData.push(...unknownCensus);
          break;
      }
    } catch (err) {
      warnings.push(`Error processing sheet ${sheet.sheetName}: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  reportProgress('complete', 100, `Extracted ${financialData.length} financial periods, ${censusData.length} census periods, ${rateData.length} rates`);

  return {
    documentId,
    filename,
    fileType: 'excel',
    sheets: excelResult.sheets,
    financialData,
    censusData,
    rateData,
    confidence: calculateConfidence(financialData, censusData, rateData),
    warnings: [...excelResult.warnings, ...warnings],
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Process a PDF file - extract text and parse for financial/rate data
 */
async function processPDFFile(
  filePath: string,
  documentId: string,
  filename: string,
  startTime: number,
  reportProgress: (stage: ExtractionProgress['stage'], progress: number, message: string) => void
): Promise<PerFileExtractionResult> {
  reportProgress('reading', 20, 'Reading PDF file...');

  const pdfResult = await extractPDFFile(filePath, documentId, filename);

  reportProgress('extracting', 50, 'Extracting data from PDF text...');

  // PDFs are typically rate letters or supplementary documents
  // Extract rates from the raw text
  const rateData = extractRatesFromText(pdfResult.rawText, documentId, []);

  // Try to extract any financial data from tables in PDF
  const financialData: FinancialPeriod[] = [];
  const censusData: CensusPeriod[] = [];

  reportProgress('complete', 100, `Extracted ${rateData.length} rates from PDF`);

  return {
    documentId,
    filename,
    fileType: 'pdf',
    sheets: [],
    financialData,
    censusData,
    rateData,
    rawText: pdfResult.rawText,
    confidence: rateData.length > 0 ? 0.7 : 0.3,
    warnings: pdfResult.warnings,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Process a CSV file
 */
async function processCSVFile(
  filePath: string,
  documentId: string,
  filename: string,
  startTime: number,
  reportProgress: (stage: ExtractionProgress['stage'], progress: number, message: string) => void
): Promise<PerFileExtractionResult> {
  reportProgress('reading', 20, 'Reading CSV file...');

  // For now, convert CSV to a single sheet structure and process
  // TODO: Implement dedicated CSV extraction
  const { readFile } = await import('fs/promises');
  const Papa = await import('papaparse');

  const content = await readFile(filePath, 'utf-8');
  const parsed = Papa.parse(content, { header: false });

  const data = parsed.data as string[][];

  reportProgress('extracting', 50, 'Extracting data from CSV...');

  const financialData = extractPLData(data, filename, []);
  const censusData = extractCensusData(data, filename, []);

  reportProgress('complete', 100, 'CSV processing complete');

  return {
    documentId,
    filename,
    fileType: 'csv',
    sheets: [{
      sheetName: filename,
      sheetType: 'unknown',
      rowCount: data.length,
      columnCount: data[0]?.length || 0,
      headers: data[0] || [],
      data,
      facilitiesDetected: [],
      periodsDetected: [],
      metadata: {
        hasFormulas: false,
        hasMergedCells: false,
        firstDataRow: 1,
      },
    }],
    financialData,
    censusData,
    rateData: [],
    confidence: financialData.length > 0 ? 0.6 : 0.3,
    warnings: [],
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Calculate overall confidence score based on extracted data
 */
function calculateConfidence(
  financialData: FinancialPeriod[],
  censusData: CensusPeriod[],
  rateData: PayerRate[]
): number {
  let score = 0;
  let factors = 0;

  // Financial data quality
  if (financialData.length > 0) {
    const avgFinancialConfidence = financialData.reduce((sum, d) => sum + (d.confidence || 0.5), 0) / financialData.length;
    score += avgFinancialConfidence * 0.5;
    factors += 0.5;
  }

  // Census data completeness
  if (censusData.length > 0) {
    const hasPayerBreakdown = censusData.some(c =>
      c.medicarePartADays > 0 || c.medicaidDays > 0 || c.privateDays > 0
    );
    score += hasPayerBreakdown ? 0.3 : 0.15;
    factors += 0.3;
  }

  // Rate data presence
  if (rateData.length > 0) {
    score += 0.2;
    factors += 0.2;
  }

  return factors > 0 ? score / factors : 0.5;
}

// Re-export types for convenience
export type { SheetExtraction } from './excel-extractor';
export type { CensusPeriod } from './census-extractor';
export type { PayerRate } from './rate-extractor';
export type { FinancialPeriod } from './pl-extractor';
