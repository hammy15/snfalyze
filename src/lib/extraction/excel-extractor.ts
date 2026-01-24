/**
 * Excel Deep Extractor
 *
 * Uses ExcelJS to read EVERY sheet and EVERY row from Excel files.
 * Classifies each sheet by content type (P&L, Census, Rates, etc.)
 *
 * Key principle: Never truncate data. Extract everything.
 */

import ExcelJS from 'exceljs';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SheetType = 'pl' | 'census' | 'rates' | 'summary' | 'rent_roll' | 'unknown';

export interface SheetExtraction {
  sheetName: string;
  sheetType: SheetType;
  rowCount: number;
  columnCount: number;
  headers: string[];
  data: (string | number | null)[][];
  facilitiesDetected: string[];
  periodsDetected: string[];
  metadata: {
    hasFormulas: boolean;
    hasMergedCells: boolean;
    firstDataRow: number;
  };
}

export interface ExcelExtractionResult {
  documentId: string;
  filename: string;
  sheets: SheetExtraction[];
  warnings: string[];
}

// ============================================================================
// SHEET CLASSIFICATION
// ============================================================================

/**
 * Classify a sheet based on its content
 */
function classifySheet(data: (string | number | null)[][]): SheetType {
  // Combine first 30 rows into searchable text
  const headerText = data
    .slice(0, 30)
    .flat()
    .filter(cell => cell !== null && cell !== undefined)
    .map(cell => String(cell).toLowerCase())
    .join(' ');

  // P&L / Income Statement indicators
  const plIndicators = [
    'revenue', 'expense', 'income statement', 'p&l', 'profit', 'loss',
    'ebitda', 'ebitdar', 'net operating', 'operating income', 'gross margin',
    'total revenue', 'total expense', 'operating expense', 'net income',
    'room & board', 'patient service', 'salary', 'wages', 'payroll',
    'dietary', 'housekeeping', 'nursing', 'administrative', 'supplies'
  ];

  // Census indicators
  const censusIndicators = [
    'patient days', 'census', 'resident days', 'occupancy',
    'medicare days', 'medicaid days', 'private days', 'managed care days',
    'adc', 'average daily census', 'payer mix', 'payor mix',
    'skilled days', 'custodial days', 'total days'
  ];

  // Rate indicators
  const rateIndicators = [
    'ppd', 'per diem', 'daily rate', 'rate sheet', 'rate letter',
    'medicare rate', 'medicaid rate', 'private rate', 'reimbursement rate',
    'effective rate', 'contracted rate', 'rate schedule'
  ];

  // Rent roll indicators
  const rentRollIndicators = [
    'rent roll', 'tenant', 'lease', 'unit', 'monthly rent',
    'rent schedule', 'tenant list'
  ];

  // Summary indicators
  const summaryIndicators = [
    'summary', 'consolidated', 'rollup', 'roll-up', 'portfolio',
    'all facilities', 'combined', 'total portfolio'
  ];

  // Count matches for each type
  const plScore = plIndicators.filter(ind => headerText.includes(ind)).length;
  const censusScore = censusIndicators.filter(ind => headerText.includes(ind)).length;
  const rateScore = rateIndicators.filter(ind => headerText.includes(ind)).length;
  const rentRollScore = rentRollIndicators.filter(ind => headerText.includes(ind)).length;
  const summaryScore = summaryIndicators.filter(ind => headerText.includes(ind)).length;

  // Determine type by highest score
  const scores = [
    { type: 'pl' as SheetType, score: plScore },
    { type: 'census' as SheetType, score: censusScore },
    { type: 'rates' as SheetType, score: rateScore },
    { type: 'rent_roll' as SheetType, score: rentRollScore },
    { type: 'summary' as SheetType, score: summaryScore },
  ];

  const best = scores.sort((a, b) => b.score - a.score)[0];

  // Require minimum score to classify
  if (best.score >= 2) {
    return best.type;
  }

  // Additional heuristics for common cases
  // If we see dollar amounts and percentages, likely P&L
  const hasDollarAmounts = data.some(row =>
    row.some(cell => {
      if (typeof cell === 'number' && Math.abs(cell) > 1000) return true;
      if (typeof cell === 'string' && /\$[\d,]+/.test(cell)) return true;
      return false;
    })
  );

  if (hasDollarAmounts && headerText.includes('total')) {
    return 'pl';
  }

  return 'unknown';
}

/**
 * Detect facility names from sheet content
 */
function detectFacilities(data: (string | number | null)[][]): string[] {
  const facilities: Set<string> = new Set();

  // Common facility name patterns
  const facilityPatterns = [
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:SNF|Nursing|Healthcare|Care\s+Center|Rehab)/i,
    /facility[:\s]+([A-Z][a-zA-Z\s]+)/i,
    /provider[:\s]+([A-Z][a-zA-Z\s]+)/i,
    /location[:\s]+([A-Z][a-zA-Z\s]+)/i,
  ];

  // Check first 20 rows for facility names
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (const cell of row) {
      if (typeof cell !== 'string') continue;
      const text = cell.trim();

      for (const pattern of facilityPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          facilities.add(match[1].trim());
        }
      }

      // Also check for CCN patterns (XXXXXX format)
      const ccnMatch = text.match(/CCN[:\s]*(\d{6})/i);
      if (ccnMatch) {
        // We found a CCN, look for facility name nearby
        const idx = row.indexOf(cell);
        for (let j = Math.max(0, idx - 2); j < Math.min(row.length, idx + 3); j++) {
          const nearby = row[j];
          if (typeof nearby === 'string' && nearby.length > 5 && !/\d{6}/.test(nearby)) {
            facilities.add(nearby.trim());
            break;
          }
        }
      }
    }
  }

  // If no facilities found, use sheet name if it looks like a facility
  return Array.from(facilities);
}

/**
 * Detect date periods from sheet content
 */
function detectPeriods(data: (string | number | null)[][]): string[] {
  const periods: Set<string> = new Set();

  // Date patterns to match
  const datePatterns = [
    // MM/DD/YYYY or M/D/YY
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/,
    // Month YYYY or Mon YYYY
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})/i,
    // YYYY-MM
    /(\d{4})-(\d{2})/,
    // Q1 2024, Q2 2024, etc
    /Q([1-4])\s*['"]?(\d{4})/i,
  ];

  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };

  // Check header rows (first 15 rows typically)
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const text = String(cell);

      // Try each pattern
      let match = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (match) {
        const year = match[3].length === 2 ? `20${match[3]}` : match[3];
        const month = match[1].padStart(2, '0');
        periods.add(`${year}-${month}`);
        continue;
      }

      match = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})/i);
      if (match) {
        const year = match[2].length === 2 ? `20${match[2]}` : match[2];
        const month = monthMap[match[1].toLowerCase().substring(0, 3)];
        if (month) {
          periods.add(`${year}-${month}`);
        }
        continue;
      }

      match = text.match(/(\d{4})-(\d{2})/);
      if (match) {
        periods.add(text);
      }
    }
  }

  // Sort periods chronologically
  return Array.from(periods).sort();
}

/**
 * Find the first row that contains actual data (not headers or empty rows)
 */
function findFirstDataRow(data: (string | number | null)[][]): number {
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    // Check if row has numeric values (indicates data, not headers)
    const hasNumericValues = row.some(cell => {
      if (typeof cell === 'number') return true;
      if (typeof cell === 'string') {
        const cleaned = cell.replace(/[$,()%]/g, '');
        return !isNaN(parseFloat(cleaned)) && cleaned.length > 0;
      }
      return false;
    });

    // Also needs a text label in first column typically
    const hasLabel = typeof row[0] === 'string' && row[0].length > 0;

    if (hasNumericValues && hasLabel) {
      return i;
    }
  }

  return 0;
}

// ============================================================================
// MAIN EXTRACTION FUNCTION
// ============================================================================

/**
 * Extract all data from an Excel file using ExcelJS
 * Reads EVERY sheet and EVERY row - no truncation
 */
export async function extractExcelFile(
  filePath: string,
  documentId: string,
  filename: string
): Promise<ExcelExtractionResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheets: SheetExtraction[] = [];
  const warnings: string[] = [];

  // Process each worksheet
  for (const worksheet of workbook.worksheets) {
    try {
      // Read ALL rows from this sheet
      const data: (string | number | null)[][] = [];
      let hasFormulas = false;
      let hasMergedCells = false;
      let maxColumns = 0;

      // Track merged cells
      if (worksheet.model.merges && worksheet.model.merges.length > 0) {
        hasMergedCells = true;
      }

      // Iterate through all rows
      worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
        const rowData: (string | number | null)[] = [];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          // Expand rowData if needed
          while (rowData.length < colNumber - 1) {
            rowData.push(null);
          }

          // Check for formulas
          if (cell.formula) {
            hasFormulas = true;
          }

          // Extract cell value
          let value: string | number | null = null;

          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'object') {
              // Handle rich text, dates, etc.
              if ('richText' in cell.value) {
                value = (cell.value.richText as Array<{text: string}>).map(rt => rt.text).join('');
              } else if ('result' in cell.value) {
                // Formula result
                value = cell.value.result as string | number;
              } else if (cell.value instanceof Date) {
                value = cell.value.toISOString().split('T')[0];
              } else {
                value = String(cell.value);
              }
            } else {
              value = cell.value as string | number;
            }
          }

          rowData[colNumber - 1] = value;
        });

        maxColumns = Math.max(maxColumns, rowData.length);
        data.push(rowData);
      });

      // Skip empty sheets
      if (data.length === 0) {
        warnings.push(`Sheet "${worksheet.name}" is empty, skipping.`);
        continue;
      }

      // Classify the sheet
      const sheetType = classifySheet(data);

      // Detect facilities and periods
      const facilitiesDetected = detectFacilities(data);
      const periodsDetected = detectPeriods(data);

      // Extract headers (first non-empty row or detected header row)
      let headers: string[] = [];
      for (const row of data.slice(0, 10)) {
        if (row && row.some(cell => cell !== null)) {
          headers = row.map(cell => cell !== null ? String(cell) : '');
          break;
        }
      }

      // Find first data row
      const firstDataRow = findFirstDataRow(data);

      sheets.push({
        sheetName: worksheet.name,
        sheetType,
        rowCount: data.length,
        columnCount: maxColumns,
        headers,
        data,
        facilitiesDetected,
        periodsDetected,
        metadata: {
          hasFormulas,
          hasMergedCells,
          firstDataRow,
        },
      });

    } catch (err) {
      warnings.push(`Error processing sheet "${worksheet.name}": ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return {
    documentId,
    filename,
    sheets,
    warnings,
  };
}
