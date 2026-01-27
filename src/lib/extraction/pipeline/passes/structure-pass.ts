/**
 * Structure Analysis Pass
 *
 * Pass 1 of the extraction pipeline - analyzes document structure
 * to understand layout, identify facilities, periods, and data quality.
 */

import type {
  DocumentStructure,
  DocumentContent,
  SheetContent,
  SheetStructure,
  SheetType,
  DetectedPeriod,
  DetectedField,
  ContextSummary,
} from '../types';
import { AIDocumentReader } from '../ai/document-reader';
import { ExtractionContextManager } from '../context/extraction-context';

// ============================================================================
// STRUCTURE PASS EXECUTOR
// ============================================================================

export interface StructurePassResult {
  structure: DocumentStructure;
  aiUsed: boolean;
  tokensUsed: number;
  processingTimeMs: number;
}

export async function executeStructurePass(params: {
  documentId: string;
  filename: string;
  content: DocumentContent;
  contextManager: ExtractionContextManager;
  aiReader: AIDocumentReader;
  onProgress?: (progress: number, message: string) => void;
}): Promise<StructurePassResult> {
  const { documentId, filename, content, contextManager, aiReader, onProgress } = params;
  const startTime = Date.now();

  onProgress?.(0, 'Starting structure analysis...');

  // First, try rule-based structure detection (fast)
  const ruleBasedStructure = analyzeStructureWithRules(documentId, filename, content);

  onProgress?.(30, 'Rule-based analysis complete');

  // Check if we need AI analysis
  const needsAI = shouldUseAIAnalysis(ruleBasedStructure);

  let finalStructure: DocumentStructure;
  let tokensUsed = 0;

  if (needsAI) {
    onProgress?.(40, 'Using AI for detailed analysis...');

    // Get prior context for AI
    const priorContext = contextManager.getContextSummary();

    // Use AI for deeper analysis
    const aiStructure = await aiReader.analyzeStructure({
      documentId,
      filename,
      content,
      priorContext,
    });

    tokensUsed = aiReader.getTokensUsed();

    // Merge AI results with rule-based results
    finalStructure = mergeStructureResults(ruleBasedStructure, aiStructure);

    onProgress?.(90, 'AI analysis complete');
  } else {
    finalStructure = ruleBasedStructure;
    onProgress?.(90, 'Structure analysis complete');
  }

  onProgress?.(100, 'Structure pass finished');

  return {
    structure: finalStructure,
    aiUsed: needsAI,
    tokensUsed,
    processingTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// RULE-BASED STRUCTURE ANALYSIS
// ============================================================================

function analyzeStructureWithRules(
  documentId: string,
  filename: string,
  content: DocumentContent
): DocumentStructure {
  const sheets: SheetStructure[] = [];
  const allFacilities: string[] = [];
  const allPeriods: DetectedPeriod[] = [];

  if (content.type === 'excel' && content.sheets) {
    for (let i = 0; i < content.sheets.length; i++) {
      const sheet = content.sheets[i];
      const sheetStructure = analyzeSheetStructure(sheet, i);
      sheets.push(sheetStructure);

      // Collect facilities and periods
      allFacilities.push(...sheetStructure.detectedFacilities);
      allPeriods.push(...sheetStructure.detectedPeriods);
    }
  } else if (content.type === 'csv' && content.sheets?.[0]) {
    const sheet = content.sheets[0];
    const sheetStructure = analyzeSheetStructure(sheet, 0);
    sheets.push(sheetStructure);
    allFacilities.push(...sheetStructure.detectedFacilities);
    allPeriods.push(...sheetStructure.detectedPeriods);
  }

  // Deduplicate facilities
  const uniqueFacilities = [...new Set(allFacilities)];

  // Determine processing order (P&L first, then census, then rates)
  const processingOrder = determinProcessingOrder(sheets);

  // Assess overall quality
  const overallQuality = assessOverallQuality(sheets);

  return {
    documentId,
    filename,
    fileType: content.type,
    sheets,
    detectedFacilities: uniqueFacilities,
    detectedPeriods: deduplicatePeriods(allPeriods),
    suggestedProcessingOrder: processingOrder,
    overallQuality,
    analysisNotes: [],
    analyzedAt: new Date(),
  };
}

function analyzeSheetStructure(sheet: SheetContent, index: number): SheetStructure {
  // Detect sheet type from name and content
  const sheetType = detectSheetType(sheet.name, sheet.headers, sheet.rows);

  // Find header row
  const headerRow = findHeaderRow(sheet.rows);

  // Find data start row
  const dataStartRow = headerRow !== undefined ? headerRow + 1 : findDataStartRow(sheet.rows);

  // Find data end row
  const dataEndRow = findDataEndRow(sheet.rows, dataStartRow);

  // Detect facilities
  const detectedFacilities = detectFacilitiesInSheet(sheet);

  // Detect periods
  const detectedPeriods = detectPeriodsInSheet(sheet, headerRow);

  // Detect fields
  const detectedFields = detectFieldsInSheet(sheet, sheetType, dataStartRow, dataEndRow);

  // Assess data quality
  const { quality, notes } = assessSheetQuality(sheet);

  return {
    sheetIndex: index,
    sheetName: sheet.name,
    sheetType,
    confidence: calculateSheetTypeConfidence(sheetType, sheet),
    headerRow,
    dataStartRow,
    dataEndRow,
    facilityColumn: findFacilityColumn(sheet, headerRow),
    periodColumns: findPeriodColumns(sheet, headerRow),
    detectedFacilities,
    detectedPeriods,
    detectedFields,
    hasFormulas: false, // Can't detect from raw data
    hasMergedCells: detectMergedCells(sheet),
    dataQuality: quality,
    qualityNotes: notes,
  };
}

// ============================================================================
// SHEET TYPE DETECTION
// ============================================================================

function detectSheetType(
  sheetName: string,
  headers: string[],
  rows: (string | number | null)[][]
): SheetType {
  const nameLower = sheetName.toLowerCase();
  const headerStr = headers.join(' ').toLowerCase();

  // Check sheet name first
  if (/p\s*&?\s*l|profit.*loss|income\s*statement|financial/i.test(nameLower)) {
    return 'pl_statement';
  }
  if (/census|patient\s*days|occupancy/i.test(nameLower)) {
    return 'census_report';
  }
  if (/rate|ppd|per\s*diem|per\s*patient/i.test(nameLower)) {
    return 'rate_schedule';
  }
  if (/summary|dashboard|kpi/i.test(nameLower)) {
    return 'summary_dashboard';
  }
  if (/rent\s*roll|lease/i.test(nameLower)) {
    return 'rent_roll';
  }
  if (/\bar\b|aging|receivable/i.test(nameLower)) {
    return 'ar_aging';
  }
  if (/coa|chart\s*of\s*account/i.test(nameLower)) {
    return 'chart_of_accounts';
  }

  // Check headers
  if (/revenue|expense|ebitda|noi|total\s*income/i.test(headerStr)) {
    return 'pl_statement';
  }
  if (/patient\s*days|medicare\s*days|medicaid\s*days|census/i.test(headerStr)) {
    return 'census_report';
  }
  if (/ppd|rate|per\s*diem/i.test(headerStr)) {
    return 'rate_schedule';
  }

  // Check row content for patterns
  const sampleRows = rows.slice(0, 20);
  const rowText = sampleRows.flat().filter(Boolean).join(' ').toLowerCase();

  if (/total\s*revenue|operating\s*expense|ebitdar/i.test(rowText)) {
    return 'pl_statement';
  }
  if (/medicare\s*a\s*days|medicaid\s*days|total\s*patient\s*days/i.test(rowText)) {
    return 'census_report';
  }

  return 'unknown';
}

function calculateSheetTypeConfidence(sheetType: SheetType, sheet: SheetContent): number {
  if (sheetType === 'unknown') return 20;

  // Higher confidence if sheet name matches type
  const nameLower = sheet.name.toLowerCase();
  let confidence = 60;

  if (sheetType === 'pl_statement' && /p\s*&?\s*l|profit|income/i.test(nameLower)) {
    confidence += 30;
  } else if (sheetType === 'census_report' && /census|patient/i.test(nameLower)) {
    confidence += 30;
  } else if (sheetType === 'rate_schedule' && /rate|ppd/i.test(nameLower)) {
    confidence += 30;
  }

  // Check for expected patterns in content
  const headerStr = sheet.headers.join(' ').toLowerCase();
  if (sheetType === 'pl_statement' && /revenue|expense/i.test(headerStr)) {
    confidence += 10;
  }

  return Math.min(95, confidence);
}

// ============================================================================
// HEADER & DATA ROW DETECTION
// ============================================================================

function findHeaderRow(rows: (string | number | null)[][]): number | undefined {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;

    // Count string cells (likely headers)
    const stringCount = row.filter((cell) => typeof cell === 'string' && cell.trim().length > 0).length;
    const totalNonEmpty = row.filter((cell) => cell !== null && cell !== undefined && cell !== '').length;

    // Header row typically has mostly strings
    if (stringCount >= 3 && stringCount / totalNonEmpty > 0.7) {
      return i;
    }
  }

  return 0; // Default to first row
}

function findDataStartRow(rows: (string | number | null)[][]): number {
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;

    // Look for rows with numeric data
    const numericCount = row.filter(
      (cell) => typeof cell === 'number' || (typeof cell === 'string' && /^[\d,.$()-]+$/.test(cell.trim()))
    ).length;

    if (numericCount >= 2) {
      return i;
    }
  }

  return 1; // Default to second row
}

function findDataEndRow(rows: (string | number | null)[][], startRow: number): number {
  let lastDataRow = startRow;

  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    // Check if row has meaningful data
    const nonEmptyCount = row.filter((cell) => cell !== null && cell !== undefined && cell !== '').length;
    if (nonEmptyCount >= 2) {
      lastDataRow = i;
    }

    // Stop if we hit a large gap
    if (i - lastDataRow > 5) break;
  }

  return lastDataRow;
}

// ============================================================================
// FACILITY & PERIOD DETECTION
// ============================================================================

function detectFacilitiesInSheet(sheet: SheetContent): string[] {
  const facilities: Set<string> = new Set();

  // Common facility name patterns
  const facilityPatterns = [
    /^([A-Z][a-zA-Z\s]+(?:SNF|Nursing|Care|Health|Center|Home))/,
    /facility[:\s]+([^\n,]+)/i,
    /provider[:\s]+([^\n,]+)/i,
    /building[:\s]+([^\n,]+)/i,
  ];

  // Check headers
  for (const header of sheet.headers) {
    for (const pattern of facilityPatterns) {
      const match = String(header).match(pattern);
      if (match) {
        facilities.add(match[1].trim());
      }
    }
  }

  // Check first column of data rows
  for (const row of sheet.rows.slice(0, 50)) {
    if (!row[0]) continue;
    const cell = String(row[0]);
    for (const pattern of facilityPatterns) {
      const match = cell.match(pattern);
      if (match) {
        facilities.add(match[1].trim());
      }
    }
  }

  return Array.from(facilities);
}

function detectPeriodsInSheet(sheet: SheetContent, headerRow?: number): DetectedPeriod[] {
  const periods: DetectedPeriod[] = [];
  const row = headerRow !== undefined ? sheet.rows[headerRow] : sheet.headers;

  if (!row) return periods;

  const monthPattern = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})/i;
  const quarterPattern = /\b(Q[1-4]|[1-4]Q)\s*['"]?(\d{2,4})/i;
  const yearPattern = /\b(FY|CY)?\s*['"]?(20\d{2})/i;

  for (let col = 0; col < row.length; col++) {
    const cell = String(row[col] || '');

    // Check for monthly periods
    const monthMatch = cell.match(monthPattern);
    if (monthMatch) {
      periods.push({
        label: cell.trim(),
        type: 'monthly',
        columnIndex: col,
        confidence: 85,
      });
      continue;
    }

    // Check for quarterly periods
    const quarterMatch = cell.match(quarterPattern);
    if (quarterMatch) {
      periods.push({
        label: cell.trim(),
        type: 'quarterly',
        columnIndex: col,
        confidence: 85,
      });
      continue;
    }

    // Check for annual periods
    const yearMatch = cell.match(yearPattern);
    if (yearMatch) {
      periods.push({
        label: cell.trim(),
        type: 'annual',
        columnIndex: col,
        confidence: 75,
      });
    }
  }

  return periods;
}

function detectFieldsInSheet(
  sheet: SheetContent,
  sheetType: SheetType,
  startRow: number,
  endRow: number
): DetectedField[] {
  const fields: DetectedField[] = [];

  // Revenue patterns
  const revenuePatterns = [
    { pattern: /total\s*revenue/i, name: 'Total Revenue', normalized: 'totalRevenue' },
    { pattern: /medicare\s*revenue/i, name: 'Medicare Revenue', normalized: 'medicareRevenue' },
    { pattern: /medicaid\s*revenue/i, name: 'Medicaid Revenue', normalized: 'medicaidRevenue' },
    { pattern: /private\s*pay/i, name: 'Private Pay Revenue', normalized: 'privatePayRevenue' },
  ];

  // Expense patterns
  const expensePatterns = [
    { pattern: /total\s*(operating\s*)?expense/i, name: 'Total Expenses', normalized: 'totalExpenses' },
    { pattern: /salaries?\s*(and|&)?\s*wages?|payroll/i, name: 'Labor Cost', normalized: 'laborCost' },
    { pattern: /agency|contract\s*labor/i, name: 'Agency Labor', normalized: 'agencyLabor' },
  ];

  // Metric patterns
  const metricPatterns = [
    { pattern: /ebitdar/i, name: 'EBITDAR', normalized: 'ebitdar' },
    { pattern: /\bnoi\b|net\s*operating/i, name: 'NOI', normalized: 'noi' },
    { pattern: /occupancy/i, name: 'Occupancy Rate', normalized: 'occupancyRate' },
  ];

  const allPatterns = [
    ...revenuePatterns.map((p) => ({ ...p, category: 'revenue' as const })),
    ...expensePatterns.map((p) => ({ ...p, category: 'expense' as const })),
    ...metricPatterns.map((p) => ({ ...p, category: 'metric' as const })),
  ];

  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex++) {
    const row = sheet.rows[rowIndex];
    if (!row) continue;

    const firstCell = String(row[0] || '');

    for (const { pattern, name, normalized, category } of allPatterns) {
      if (pattern.test(firstCell)) {
        fields.push({
          name,
          normalizedName: normalized,
          category,
          rowIndex,
          confidence: 80,
          suggestedMapping: normalized,
        });
      }
    }
  }

  return fields;
}

// ============================================================================
// QUALITY ASSESSMENT
// ============================================================================

function assessSheetQuality(sheet: SheetContent): { quality: 'high' | 'medium' | 'low'; notes: string[] } {
  const notes: string[] = [];
  let score = 100;

  // Check for missing headers
  const emptyHeaders = sheet.headers.filter((h) => !h || String(h).trim() === '').length;
  if (emptyHeaders > 0) {
    score -= emptyHeaders * 5;
    notes.push(`${emptyHeaders} empty header cells`);
  }

  // Check for sparse data
  const totalCells = sheet.rows.length * (sheet.rows[0]?.length || 0);
  const emptyCells = sheet.rows.flat().filter((c) => c === null || c === undefined || c === '').length;
  const sparsity = emptyCells / totalCells;

  if (sparsity > 0.5) {
    score -= 20;
    notes.push('Data is sparse (>50% empty cells)');
  }

  // Check for very few rows
  if (sheet.rowCount < 5) {
    score -= 10;
    notes.push('Very few data rows');
  }

  const quality: 'high' | 'medium' | 'low' = score >= 80 ? 'high' : score >= 50 ? 'medium' : 'low';
  return { quality, notes };
}

function assessOverallQuality(sheets: SheetStructure[]): 'high' | 'medium' | 'low' {
  if (sheets.length === 0) return 'low';

  const qualities = sheets.map((s) => (s.dataQuality === 'high' ? 3 : s.dataQuality === 'medium' ? 2 : 1));
  const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;

  return avgQuality >= 2.5 ? 'high' : avgQuality >= 1.5 ? 'medium' : 'low';
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function findFacilityColumn(sheet: SheetContent, headerRow?: number): number | undefined {
  const row = headerRow !== undefined ? sheet.rows[headerRow] : sheet.headers;
  if (!row) return undefined;

  for (let i = 0; i < row.length; i++) {
    const cell = String(row[i] || '').toLowerCase();
    if (/facility|provider|building|location|name/i.test(cell)) {
      return i;
    }
  }

  return undefined;
}

function findPeriodColumns(sheet: SheetContent, headerRow?: number): number[] {
  const row = headerRow !== undefined ? sheet.rows[headerRow] : sheet.headers;
  if (!row) return [];

  const periodCols: number[] = [];
  const periodPattern = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|20\d{2})/i;

  for (let i = 0; i < row.length; i++) {
    const cell = String(row[i] || '');
    if (periodPattern.test(cell)) {
      periodCols.push(i);
    }
  }

  return periodCols;
}

function detectMergedCells(sheet: SheetContent): boolean {
  // Check for repeated values that might indicate merged cells
  for (const row of sheet.rows.slice(0, 20)) {
    if (!row) continue;
    const firstCell = row[0];
    if (firstCell === null || firstCell === undefined) {
      // Empty first cell might indicate merged header
      return true;
    }
  }
  return false;
}

function determinProcessingOrder(sheets: SheetStructure[]): number[] {
  // Priority: P&L first, then census, then rates, then others
  const priority: Record<SheetType, number> = {
    pl_statement: 1,
    census_report: 2,
    rate_schedule: 3,
    summary_dashboard: 4,
    rent_roll: 5,
    ar_aging: 6,
    chart_of_accounts: 7,
    unknown: 8,
  };

  return sheets
    .map((s, i) => ({ index: i, type: s.sheetType }))
    .sort((a, b) => priority[a.type] - priority[b.type])
    .map((s) => s.index);
}

function deduplicatePeriods(periods: DetectedPeriod[]): DetectedPeriod[] {
  const seen = new Set<string>();
  return periods.filter((p) => {
    const key = p.label.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function shouldUseAIAnalysis(structure: DocumentStructure): boolean {
  // Use AI if:
  // 1. We couldn't determine sheet types
  const unknownSheets = structure.sheets.filter((s) => s.sheetType === 'unknown').length;
  if (unknownSheets > structure.sheets.length / 2) return true;

  // 2. Low overall quality
  if (structure.overallQuality === 'low') return true;

  // 3. No facilities detected
  if (structure.detectedFacilities.length === 0) return true;

  // 4. No periods detected
  if (structure.detectedPeriods.length === 0) return true;

  return false;
}

function mergeStructureResults(
  rulesBased: DocumentStructure,
  aiBased: DocumentStructure
): DocumentStructure {
  // Prefer AI results for sheet types if AI confidence is higher
  const mergedSheets = rulesBased.sheets.map((rbSheet, i) => {
    const aiSheet = aiBased.sheets[i];
    if (!aiSheet) return rbSheet;

    // Use AI sheet type if its confidence is higher or rule-based is unknown
    if (rbSheet.sheetType === 'unknown' || aiSheet.confidence > rbSheet.confidence) {
      return { ...rbSheet, ...aiSheet, qualityNotes: [...rbSheet.qualityNotes, ...aiSheet.qualityNotes] };
    }

    return rbSheet;
  });

  // Merge facilities (union)
  const allFacilities = [
    ...new Set([...rulesBased.detectedFacilities, ...aiBased.detectedFacilities]),
  ];

  // Use AI processing order if we used AI sheet types
  const processingOrder =
    aiBased.suggestedProcessingOrder.length > 0
      ? aiBased.suggestedProcessingOrder
      : rulesBased.suggestedProcessingOrder;

  return {
    ...rulesBased,
    sheets: mergedSheets,
    detectedFacilities: allFacilities,
    detectedPeriods: deduplicatePeriods([...rulesBased.detectedPeriods, ...aiBased.detectedPeriods]),
    suggestedProcessingOrder: processingOrder,
    overallQuality:
      aiBased.overallQuality === 'high' || rulesBased.overallQuality === 'high'
        ? 'high'
        : aiBased.overallQuality === 'medium' || rulesBased.overallQuality === 'medium'
        ? 'medium'
        : 'low',
    analysisNotes: [...rulesBased.analysisNotes, ...aiBased.analysisNotes],
  };
}

export default { executeStructurePass };
