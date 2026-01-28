/**
 * P&L / Income Statement Extractor
 *
 * UPDATED: Handles hierarchical accounting P&L format where:
 * - EBITDAR, EBITDA, Net Income appear as category headers at TOP (no values)
 * - Actual calculated values appear at the BOTTOM of the sheet
 * - Summary rows like "Total Operating Revenue", "Total Operating Expense" have values
 *
 * Extraction strategy:
 * 1. Find date columns by scanning first 20 rows for date patterns
 * 2. Scan ENTIRE sheet for rows that have BOTH matching labels AND numeric values
 * 3. Prioritize rows at the BOTTOM of the sheet for calculated metrics
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FinancialPeriod {
  facilityName: string;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  isAnnualized: boolean;

  // Revenue
  totalRevenue: number;
  medicareRevenue: number;
  medicaidRevenue: number;
  managedCareRevenue: number;
  privatePayRevenue: number;
  ancillaryRevenue: number;
  otherRevenue: number;

  // Labor Expenses
  totalLaborCost: number;
  nursingLabor: number;
  dietaryLabor: number;
  housekeepingLabor: number;
  administrationLabor: number;
  therapyLabor: number;
  agencyLabor: number;
  employeeBenefits: number;

  // Non-Labor Operating Expenses
  foodCost: number;
  suppliesCost: number;
  utilitiesCost: number;
  insuranceCost: number;
  propertyTax: number;
  managementFee: number;
  otherExpenses: number;

  // Totals
  totalExpenses: number;

  // Calculated Metrics
  ebitdar: number;
  rent: number;
  ebitda: number;
  netIncome: number;
  noi: number;

  // Per-Day Metrics
  totalPatientDays?: number;
  revenuePpd?: number;
  expensePpd?: number;
  laborPpd?: number;
  ebitdarPpd?: number;

  // Margins
  ebitdarMargin?: number;
  ebitdaMargin?: number;
  laborPercentOfRevenue?: number;
  agencyPercentOfLabor?: number;

  // Metadata
  source: 'extracted' | 'manual' | 'projected';
  confidence: number;
}

// ============================================================================
// SUMMARY ROW PATTERNS (for rows at bottom of sheet with totals)
// ============================================================================

interface SummaryPattern {
  field: keyof FinancialPeriod;
  patterns: RegExp[];
  priority: 'high' | 'medium' | 'low';  // higher priority overrides lower
}

// These patterns match summary rows that have ACTUAL values
const SUMMARY_PATTERNS: SummaryPattern[] = [
  // EBITDAR - look for exact match or variations
  {
    field: 'ebitdar',
    patterns: [
      /^ebitdar$/i,
      /^total\s+ebitdar$/i,
      /ebitdar\s*[:\-\|]\s*$/i,
      /net\s+operating\s+income\s+before\s+rent/i,
      /operating\s+income\s+before\s+rent/i,
    ],
    priority: 'high',
  },
  // EBITDA
  {
    field: 'ebitda',
    patterns: [
      /^ebitda$/i,
      /^total\s+ebitda$/i,
      /ebitda\s*[:\-\|]\s*$/i,
      /net\s+operating\s+income\s+after\s+rent/i,
      /operating\s+income\s+after\s+rent/i,
    ],
    priority: 'high',
  },
  // Net Income
  {
    field: 'netIncome',
    patterns: [
      /^net\s+income$/i,
      /^total\s+net\s+income$/i,
      /net\s+income\s*[:\-\|]\s*$/i,
      /^income\s+\(loss\)$/i,
      /net\s+profit/i,
    ],
    priority: 'high',
  },
  // Total Operating Revenue
  {
    field: 'totalRevenue',
    patterns: [
      /^total\s+operating\s+revenue$/i,
      /^total\s+revenue$/i,
      /^total\s+net\s+revenue$/i,
      /^total\s+patient\s+revenue$/i,
      /^gross\s+revenue$/i,
      /^net\s+patient\s+revenue$/i,
      /total\s+revenue\s*[:\-\|]\s*$/i,
    ],
    priority: 'high',
  },
  // Total Operating Expense
  {
    field: 'totalExpenses',
    patterns: [
      /^total\s+operating\s+expense$/i,
      /^total\s+expense(s)?$/i,
      /^total\s+operating\s+cost$/i,
      /^total\s+cost$/i,
      /total\s+expense\s*[:\-\|]\s*$/i,
    ],
    priority: 'high',
  },
  // Total Rent Expense
  {
    field: 'rent',
    patterns: [
      /^total\s+rent\s+expense$/i,
      /^rent\s+expense$/i,
      /^building\s+rent$/i,
      /^facility\s+rent$/i,
      /^lease\s+expense$/i,
      /rent\s*[:\-\|]\s*$/i,
    ],
    priority: 'high',
  },
  // Medicare Revenue
  {
    field: 'medicareRevenue',
    patterns: [
      /medicare\s+(part\s+a\s+)?revenue/i,
      /^medicare$/i,
      /skilled\s+nursing\s+medicare/i,
    ],
    priority: 'medium',
  },
  // Medicaid Revenue
  {
    field: 'medicaidRevenue',
    patterns: [
      /medicaid\s+revenue/i,
      /^medicaid$/i,
      /state\s+medicaid/i,
    ],
    priority: 'medium',
  },
  // Private Pay Revenue
  {
    field: 'privatePayRevenue',
    patterns: [
      /private\s+(pay\s+)?revenue/i,
      /^private$/i,
      /self[\s-]?pay/i,
    ],
    priority: 'medium',
  },
  // Managed Care Revenue
  {
    field: 'managedCareRevenue',
    patterns: [
      /managed\s+care/i,
      /^hmo$/i,
      /commercial\s+insurance/i,
    ],
    priority: 'medium',
  },
  // Total Labor
  {
    field: 'totalLaborCost',
    patterns: [
      /^total\s+(labor|salaries|wages|payroll)/i,
      /^labor\s+expense$/i,
      /^personnel\s+expense$/i,
      /^total\s+personnel$/i,
    ],
    priority: 'medium',
  },
  // Nursing Labor
  {
    field: 'nursingLabor',
    patterns: [
      /nursing\s+(department|expense|labor|salaries)/i,
      /direct\s+care\s+labor/i,
      /^nursing$/i,
    ],
    priority: 'medium',
  },
  // Dietary
  {
    field: 'dietaryLabor',
    patterns: [
      /dietary\s+(department|expense|labor)/i,
      /food\s+service\s+labor/i,
    ],
    priority: 'medium',
  },
  // Agency/Contract Labor
  {
    field: 'agencyLabor',
    patterns: [
      /agency\s+(staff|labor|expense)/i,
      /contract\s+labor/i,
      /registry\s+expense/i,
      /temp\s+staff/i,
    ],
    priority: 'medium',
  },
  // Employee Benefits
  {
    field: 'employeeBenefits',
    patterns: [
      /employee\s+benefits?/i,
      /benefits?\s+expense/i,
      /payroll\s+taxes?/i,
    ],
    priority: 'medium',
  },
  // Utilities
  {
    field: 'utilitiesCost',
    patterns: [
      /^utilities?$/i,
      /utilities?\s+expense/i,
    ],
    priority: 'low',
  },
  // Insurance
  {
    field: 'insuranceCost',
    patterns: [
      /insurance\s+expense/i,
      /liability\s+insurance/i,
      /property\s+insurance/i,
    ],
    priority: 'low',
  },
  // Property Tax
  {
    field: 'propertyTax',
    patterns: [
      /property\s+tax(es)?/i,
      /real\s+estate\s+tax/i,
    ],
    priority: 'low',
  },
  // Management Fee
  {
    field: 'managementFee',
    patterns: [
      /management\s+fee/i,
      /mgmt\s+fee/i,
      /admin(istrative)?\s+fee/i,
    ],
    priority: 'low',
  },
  // Patient Days
  {
    field: 'totalPatientDays',
    patterns: [
      /total\s+patient\s+days/i,
      /resident\s+days/i,
      /census\s+days/i,
    ],
    priority: 'medium',
  },
];

// ============================================================================
// PARSING UTILITIES
// ============================================================================

/**
 * Parse numeric value from cell - handles accounting formats
 */
function parseNumericValue(cell: string | number | null | undefined): number {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === 'number') return cell;

  const str = String(cell).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === '#N/A' || str === '#VALUE!') return 0;

  // Remove currency symbols and thousands separators
  let cleaned = str.replace(/[$,]/g, '');

  // Handle accounting negative format: (123) or -123
  const isNegative = cleaned.includes('(') && cleaned.includes(')') || cleaned.startsWith('-');
  cleaned = cleaned.replace(/[()]/g, '').replace(/^-/, '');
  cleaned = cleaned.replace(/%/g, '');

  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;

  return isNegative ? -num : num;
}

/**
 * Check if cell has a meaningful numeric value
 */
function hasNumericValue(cell: string | number | null | undefined): boolean {
  const value = parseNumericValue(cell);
  return value !== 0;
}

/**
 * Parse date from various formats
 */
function parseDateFromCell(cell: string | number | null): Date | null {
  if (cell === null || cell === undefined) return null;

  const str = String(cell).trim();

  // Format: "01/31/2022" or "1/31/22"
  const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]) - 1;
    const day = parseInt(slashMatch[2]);
    let year = parseInt(slashMatch[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  // Format: "2022-01-31"
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // Format: "Jan 2022" or "January 2022"
  const monthYearMatch = str.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})$/i);
  if (monthYearMatch) {
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = monthMap[monthYearMatch[1].toLowerCase().substring(0, 3)];
    let year = parseInt(monthYearMatch[2]);
    if (year < 100) year += 2000;
    // Return end of month
    return new Date(year, month + 1, 0);
  }

  // Try Excel date number
  if (typeof cell === 'number' && cell > 10000 && cell < 100000) {
    // Excel date serial number
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + cell * 24 * 60 * 60 * 1000);
  }

  return null;
}

/**
 * Get period start from period end (assume monthly)
 */
function getPeriodStart(periodEnd: Date): Date {
  return new Date(periodEnd.getFullYear(), periodEnd.getMonth(), 1);
}

/**
 * Format date as period label
 */
function formatPeriodLabel(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

interface DateColumn {
  colIdx: number;
  date: Date;
  label: string;
}

/**
 * Find date columns by scanning first N rows for date patterns
 */
function findDateColumns(data: (string | number | null)[][]): DateColumn[] {
  const columns: DateColumn[] = [];
  const foundCols = new Set<number>();
  const foundDates = new Set<string>(); // Track unique dates to avoid duplicates

  // Scan first 20 rows for date patterns
  for (let rowIdx = 0; rowIdx < Math.min(20, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    for (let colIdx = 1; colIdx < row.length; colIdx++) {
      if (foundCols.has(colIdx)) continue;

      const cell = row[colIdx];
      const date = parseDateFromCell(cell);

      if (date && date.getFullYear() >= 2015 && date.getFullYear() <= 2030) {
        // Create unique date key to avoid duplicate periods
        const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        // Only add if we haven't seen this date yet
        if (!foundDates.has(dateKey)) {
          columns.push({
            colIdx,
            date,
            label: formatPeriodLabel(date),
          });
          foundCols.add(colIdx);
          foundDates.add(dateKey);
        }
      }
    }
  }

  // Also check for "Month Ending" or similar header row
  for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    const label = String(row[0] || '').toLowerCase();
    if (label.includes('month') || label.includes('period') || label.includes('ending')) {
      // This row contains period labels, scan it for dates
      for (let colIdx = 1; colIdx < row.length; colIdx++) {
        if (foundCols.has(colIdx)) continue;

        const cell = row[colIdx];
        const date = parseDateFromCell(cell);

        if (date && date.getFullYear() >= 2015 && date.getFullYear() <= 2030) {
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

          if (!foundDates.has(dateKey)) {
            columns.push({
              colIdx,
              date,
              label: formatPeriodLabel(date),
            });
            foundCols.add(colIdx);
            foundDates.add(dateKey);
          }
        }
      }
    }
  }

  // Sort by date ascending
  return columns.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Check if row label matches any summary pattern
 */
function matchSummaryPattern(label: string): SummaryPattern | null {
  const cleanLabel = label.trim();

  for (const pattern of SUMMARY_PATTERNS) {
    if (pattern.patterns.some(p => p.test(cleanLabel))) {
      return pattern;
    }
  }
  return null;
}

/**
 * Check if a row has any numeric values in the data columns
 */
function rowHasValues(row: (string | number | null)[], dateColumns: DateColumn[]): boolean {
  for (const { colIdx } of dateColumns) {
    if (hasNumericValue(row[colIdx])) {
      return true;
    }
  }
  return false;
}

/**
 * Main extraction function - scans entire sheet for summary rows with values
 */
export function extractPLData(
  data: (string | number | null)[][],
  sheetName: string,
  facilitiesDetected: string[]
): FinancialPeriod[] {
  console.log(`[PL Extractor] Processing sheet: ${sheetName}, rows: ${data.length}`);

  // Step 1: Find date columns
  const dateColumns = findDateColumns(data);
  console.log(`[PL Extractor] Found ${dateColumns.length} date columns:`, dateColumns.map(c => c.label));

  if (dateColumns.length === 0) {
    console.log(`[PL Extractor] No date columns found, trying fallback extraction`);
    return extractFallbackPL(data, sheetName, facilitiesDetected);
  }

  // Step 2: Initialize periods for each date column
  const periods: Map<number, FinancialPeriod> = new Map();
  for (const { colIdx, date, label } of dateColumns) {
    periods.set(colIdx, createEmptyFinancialPeriod(
      facilitiesDetected[0] || sheetName,
      {
        start: getPeriodStart(date),
        end: date,
        label,
      }
    ));
  }

  // Step 3: Scan ENTIRE sheet for matching rows (bottom-up to prioritize summary rows at end)
  const matchedRows: { rowIdx: number; pattern: SummaryPattern; label: string }[] = [];

  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[0]) continue;

    const label = String(row[0]).trim();
    const pattern = matchSummaryPattern(label);

    if (pattern && rowHasValues(row, dateColumns)) {
      matchedRows.push({ rowIdx, pattern, label });
    }
  }

  console.log(`[PL Extractor] Found ${matchedRows.length} matching rows with values`);

  // Step 4: Process matched rows, prioritizing later rows (which have actual totals)
  // Group by field and take the one from the latest row (closest to bottom)
  const fieldToRows = new Map<keyof FinancialPeriod, { rowIdx: number; pattern: SummaryPattern; label: string }[]>();

  for (const match of matchedRows) {
    const existing = fieldToRows.get(match.pattern.field) || [];
    existing.push(match);
    fieldToRows.set(match.pattern.field, existing);
  }

  // For each field, pick the best row (prioritize high priority patterns and later rows)
  for (const [field, rows] of fieldToRows) {
    // Sort by priority (high first) then by row index (later first)
    rows.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.pattern.priority] - priorityOrder[b.pattern.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.rowIdx - a.rowIdx; // Later row wins
    });

    const bestMatch = rows[0];
    const row = data[bestMatch.rowIdx];

    console.log(`[PL Extractor] Field "${field}" matched at row ${bestMatch.rowIdx}: "${bestMatch.label}"`);

    // Extract values for each period
    for (const { colIdx } of dateColumns) {
      const value = parseNumericValue(row[colIdx]);
      const period = periods.get(colIdx);

      if (period && value !== 0) {
        setFinancialField(period, field, value);
      }
    }
  }

  // Step 5: Calculate derived metrics
  const result: FinancialPeriod[] = [];
  for (const period of periods.values()) {
    calculateDerivedMetrics(period);

    // Only include periods with meaningful data
    if (period.totalRevenue > 0 || period.ebitdar !== 0 || period.ebitda !== 0) {
      result.push(period);
    }
  }

  console.log(`[PL Extractor] Returning ${result.length} periods`);

  // Log summary of what was extracted
  if (result.length > 0) {
    const sample = result[result.length - 1];
    console.log(`[PL Extractor] Sample period (${sample.periodLabel}): Revenue=${sample.totalRevenue}, Expenses=${sample.totalExpenses}, EBITDAR=${sample.ebitdar}, EBITDA=${sample.ebitda}`);
  }

  return result.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
}

/**
 * Fallback extraction when no date columns found
 */
function extractFallbackPL(
  data: (string | number | null)[][],
  sheetName: string,
  facilitiesDetected: string[]
): FinancialPeriod[] {
  // Look for a "Total" or "Annual" column
  let valueColIdx = -1;

  for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    for (let colIdx = 1; colIdx < row.length; colIdx++) {
      const cell = row[colIdx];
      if (cell === null) continue;
      const label = String(cell).toLowerCase();

      if (label.includes('total') || label.includes('annual') || label.includes('ytd') || label.includes('ttm')) {
        valueColIdx = colIdx;
        break;
      }
    }
    if (valueColIdx >= 0) break;
  }

  // Default to second column if no header found
  if (valueColIdx < 0) valueColIdx = 1;

  const currentYear = new Date().getFullYear();
  const period = createEmptyFinancialPeriod(
    facilitiesDetected[0] || sheetName,
    {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
      label: 'Annual',
    }
  );
  period.isAnnualized = true;

  // Scan for summary rows
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[0]) continue;

    const label = String(row[0]).trim();
    const pattern = matchSummaryPattern(label);

    if (pattern) {
      const value = parseNumericValue(row[valueColIdx]);
      if (value !== 0) {
        setFinancialField(period, pattern.field, value);
      }
    }
  }

  calculateDerivedMetrics(period);

  if (period.totalRevenue > 0 || period.ebitdar !== 0) {
    return [period];
  }

  return [];
}

/**
 * Create empty financial period
 */
function createEmptyFinancialPeriod(
  facilityName: string,
  period: { start: Date; end: Date; label: string }
): FinancialPeriod {
  return {
    facilityName,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
    isAnnualized: false,
    totalRevenue: 0,
    medicareRevenue: 0,
    medicaidRevenue: 0,
    managedCareRevenue: 0,
    privatePayRevenue: 0,
    ancillaryRevenue: 0,
    otherRevenue: 0,
    totalLaborCost: 0,
    nursingLabor: 0,
    dietaryLabor: 0,
    housekeepingLabor: 0,
    administrationLabor: 0,
    therapyLabor: 0,
    agencyLabor: 0,
    employeeBenefits: 0,
    foodCost: 0,
    suppliesCost: 0,
    utilitiesCost: 0,
    insuranceCost: 0,
    propertyTax: 0,
    managementFee: 0,
    otherExpenses: 0,
    totalExpenses: 0,
    ebitdar: 0,
    rent: 0,
    ebitda: 0,
    netIncome: 0,
    noi: 0,
    source: 'extracted',
    confidence: 0.7,
  };
}

/**
 * Type-safe setter for financial period fields
 */
function setFinancialField(period: FinancialPeriod, field: keyof FinancialPeriod, value: number): void {
  switch (field) {
    case 'totalRevenue': period.totalRevenue = value; break;
    case 'medicareRevenue': period.medicareRevenue = value; break;
    case 'medicaidRevenue': period.medicaidRevenue = value; break;
    case 'managedCareRevenue': period.managedCareRevenue = value; break;
    case 'privatePayRevenue': period.privatePayRevenue = value; break;
    case 'ancillaryRevenue': period.ancillaryRevenue = value; break;
    case 'otherRevenue': period.otherRevenue = value; break;
    case 'totalLaborCost': period.totalLaborCost = value; break;
    case 'nursingLabor': period.nursingLabor = value; break;
    case 'dietaryLabor': period.dietaryLabor = value; break;
    case 'housekeepingLabor': period.housekeepingLabor = value; break;
    case 'administrationLabor': period.administrationLabor = value; break;
    case 'therapyLabor': period.therapyLabor = value; break;
    case 'agencyLabor': period.agencyLabor = value; break;
    case 'employeeBenefits': period.employeeBenefits = value; break;
    case 'foodCost': period.foodCost = value; break;
    case 'suppliesCost': period.suppliesCost = value; break;
    case 'utilitiesCost': period.utilitiesCost = value; break;
    case 'insuranceCost': period.insuranceCost = value; break;
    case 'propertyTax': period.propertyTax = value; break;
    case 'managementFee': period.managementFee = value; break;
    case 'otherExpenses': period.otherExpenses = value; break;
    case 'totalExpenses': period.totalExpenses = value; break;
    case 'ebitdar': period.ebitdar = value; break;
    case 'rent': period.rent = value; break;
    case 'ebitda': period.ebitda = value; break;
    case 'netIncome': period.netIncome = value; break;
    case 'noi': period.noi = value; break;
    case 'totalPatientDays': period.totalPatientDays = value; break;
    default: break;
  }
}

/**
 * Calculate derived metrics after extraction
 */
function calculateDerivedMetrics(fp: FinancialPeriod): void {
  // If we have EBITDAR directly from extraction, use it
  // Otherwise calculate from revenue - expenses
  if (fp.ebitdar === 0 && fp.totalRevenue > 0 && fp.totalExpenses > 0) {
    fp.ebitdar = fp.totalRevenue - fp.totalExpenses;
  }

  // If we have EBITDA directly, use it
  // Otherwise calculate from EBITDAR - rent
  if (fp.ebitda === 0 && fp.ebitdar !== 0) {
    fp.ebitda = fp.ebitdar - fp.rent;
  }

  // If we have rent but EBITDAR = 0 and EBITDA is set, calculate EBITDAR
  if (fp.ebitdar === 0 && fp.ebitda !== 0 && fp.rent > 0) {
    fp.ebitdar = fp.ebitda + fp.rent;
  }

  // Set NOI = EBITDA if not separately provided
  if (fp.noi === 0 && fp.ebitda !== 0) {
    fp.noi = fp.ebitda;
  }

  // Calculate labor from components if total not provided
  const laborFromComponents =
    fp.nursingLabor +
    fp.dietaryLabor +
    fp.housekeepingLabor +
    fp.administrationLabor +
    fp.therapyLabor +
    fp.agencyLabor +
    fp.employeeBenefits;

  if (fp.totalLaborCost === 0 && laborFromComponents > 0) {
    fp.totalLaborCost = laborFromComponents;
  }

  // Calculate revenue from components if total not provided
  const revenueFromComponents =
    fp.medicareRevenue +
    fp.medicaidRevenue +
    fp.managedCareRevenue +
    fp.privatePayRevenue +
    fp.ancillaryRevenue +
    fp.otherRevenue;

  if (fp.totalRevenue === 0 && revenueFromComponents > 0) {
    fp.totalRevenue = revenueFromComponents;
  }

  // Calculate margins
  if (fp.totalRevenue > 0) {
    fp.ebitdarMargin = (fp.ebitdar / fp.totalRevenue) * 100;
    fp.ebitdaMargin = (fp.ebitda / fp.totalRevenue) * 100;

    if (fp.totalLaborCost > 0) {
      fp.laborPercentOfRevenue = (fp.totalLaborCost / fp.totalRevenue) * 100;
    }
  }

  // Calculate agency percentage
  if (fp.totalLaborCost > 0 && fp.agencyLabor > 0) {
    fp.agencyPercentOfLabor = (fp.agencyLabor / fp.totalLaborCost) * 100;
  }

  // Calculate PPD metrics if patient days available
  if (fp.totalPatientDays && fp.totalPatientDays > 0) {
    fp.revenuePpd = fp.totalRevenue / fp.totalPatientDays;
    fp.expensePpd = fp.totalExpenses / fp.totalPatientDays;
    fp.laborPpd = fp.totalLaborCost / fp.totalPatientDays;
    fp.ebitdarPpd = fp.ebitdar / fp.totalPatientDays;
  }

  // Adjust confidence based on data completeness
  const criticalFields = [
    fp.totalRevenue !== 0,
    fp.totalExpenses !== 0,
    fp.ebitdar !== 0,
    fp.ebitda !== 0,
    fp.rent > 0,
  ];
  const filledCount = criticalFields.filter(Boolean).length;
  fp.confidence = 0.4 + (filledCount / criticalFields.length) * 0.5;
}

// Export additional types for use by other modules
export type { DateColumn, SummaryPattern };
