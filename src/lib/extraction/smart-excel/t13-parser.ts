/**
 * T13 P&L Parser
 *
 * Parses Opco Review T13 format directly from Excel cell data.
 * Extracts per-facility P&L sections with GL codes, line items, and summary metrics.
 *
 * T13 format has columns: GL Code | Label | Annual $ | Monthly $ | PPD | Budget Annual | Budget PPD
 * Facility sections are separated by header rows containing the facility name.
 */

import type { SheetExtraction } from '../excel-extractor';
import type {
  T13LineItem,
  T13FacilitySection,
  T13ParseResult,
  GLMappingEntry,
} from './types';

// ============================================================================
// PATTERNS
// ============================================================================

const GL_CODE_PATTERN = /^(\d{6})(-\d{2})?$/;
const GL_CODE_LOOSE = /(\d{6})(-\d{2})?/;

const FACILITY_HEADER_PATTERNS = [
  /^(.+?)\s*\((?:SNF|ALF|MC|IL|Opco|SNF_AL_IL|SNF_AL|AL_IL)\)/i,
  /^(.+?)\s*(?:SNF|Nursing|Healthcare|Care\s+Center|Rehab|Assisted\s+Living|Memory\s+Care)/i,
  /^(?:Location|Facility|Entity)[:\s]+(.+)/i,
];

const SUMMARY_ROW_PATTERNS: Record<string, RegExp> = {
  totalRevenue: /^total\s*(?:patient\s*service\s*)?revenue/i,
  totalExpenses: /^total\s*(?:operating\s*)?expense/i,
  ebitdar: /^ebitdar\b/i,
  ebitda: /^ebitda(?!r)\b/i,
  netIncome: /^net\s*(?:operating\s*)?income/i,
  managementFee: /^management\s*fee/i,
  leaseExpense: /^(?:lease|rent)\s*expense/i,
  providerTax: /^provider\s*tax/i,
};

const REVENUE_LABELS = /revenue|income|r&b|room.*board|patient\s*service/i;
const EXPENSE_LABELS = /expense|cost|salary|wage|payroll|fee|tax|insurance|depreciation|amortization|interest/i;
const CENSUS_LABELS = /days|census|occupancy|beds|adc/i;
const METRIC_LABELS = /ebitda|ebitdar|ebit\b|noi|net\s*(income|operating)|margin/i;

// ============================================================================
// MAIN PARSER
// ============================================================================

export function parseT13(
  sheets: SheetExtraction[],
  glMapping?: Map<string, GLMappingEntry>
): T13ParseResult {
  const warnings: string[] = [];
  const allFacilities: T13FacilitySection[] = [];
  const glCodeMapping = new Map<string, string>();
  const periods: string[] = [];

  // Find T13 sheets and facility-specific sheets
  const t13Sheets = sheets.filter(s =>
    /t13|dollars\s*and\s*ppd/i.test(s.sheetName)
  );

  // Also check for Rollup sheets
  const rollupSheets = sheets.filter(s =>
    /rollup|roll-up|consolidated|summary/i.test(s.sheetName)
  );

  // Individual facility sheets
  const facilitySheets = sheets.filter(s =>
    /\((?:SNF|ALF|MC|IL|SNF_AL_IL|SNF_AL|AL_IL)\)/i.test(s.sheetName)
  );

  // Parse T13 sheets (main consolidated data)
  for (const sheet of t13Sheets) {
    const result = parseT13Sheet(sheet, glMapping, glCodeMapping);
    allFacilities.push(...result.facilities);
    warnings.push(...result.warnings);
    periods.push(...result.periods);
  }

  // Parse facility-specific sheets
  for (const sheet of facilitySheets) {
    const result = parseT13Sheet(sheet, glMapping, glCodeMapping);
    allFacilities.push(...result.facilities);
    warnings.push(...result.warnings);
  }

  // If no T13 sheets found, try all P&L-classified sheets
  if (allFacilities.length === 0) {
    const plSheets = sheets.filter(s => s.sheetType === 'pl');
    for (const sheet of plSheets) {
      const result = parseT13Sheet(sheet, glMapping, glCodeMapping);
      allFacilities.push(...result.facilities);
      warnings.push(...result.warnings);
    }
  }

  // Parse rollup as a separate section
  let rollup: T13FacilitySection | undefined;
  if (rollupSheets.length > 0) {
    const rollupResult = parseT13Sheet(rollupSheets[0], glMapping, glCodeMapping);
    if (rollupResult.facilities.length > 0) {
      rollup = rollupResult.facilities[0];
      rollup.facilityName = 'Portfolio Rollup';
    }
  }

  // Deduplicate by facility name
  const seen = new Set<string>();
  const deduplicated: T13FacilitySection[] = [];
  for (const fac of allFacilities) {
    const key = fac.facilityName.toLowerCase().trim();
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(fac);
    }
  }

  return {
    facilities: deduplicated,
    rollup,
    glCodeMapping,
    periods: [...new Set(periods)],
    warnings,
  };
}

// ============================================================================
// PARSE SINGLE SHEET
// ============================================================================

interface SheetParseResult {
  facilities: T13FacilitySection[];
  warnings: string[];
  periods: string[];
}

function parseT13Sheet(
  sheet: SheetExtraction,
  glMapping: Map<string, GLMappingEntry> | undefined,
  glCodeMapping: Map<string, string>
): SheetParseResult {
  const { data } = sheet;
  const warnings: string[] = [];
  const periods: string[] = [];

  if (!data || data.length === 0) {
    return { facilities: [], warnings: ['Empty sheet'], periods: [] };
  }

  // Step 1: Detect column structure
  const columnMap = detectColumnStructure(data);
  if (!columnMap) {
    warnings.push(`Could not detect column structure in sheet "${sheet.sheetName}"`);
    return { facilities: [], warnings, periods };
  }

  // Step 2: Detect period headers
  periods.push(...detectPeriodHeaders(data, columnMap));

  // Step 3: Find facility section boundaries
  const sections = findFacilitySections(data, columnMap);

  if (sections.length === 0) {
    // Treat entire sheet as one facility
    const sheetFacilityName = extractFacilityNameFromSheet(sheet.sheetName, data);
    sections.push({
      facilityName: sheetFacilityName,
      facilityType: extractFacilityType(sheet.sheetName),
      startRow: columnMap.dataStartRow,
      endRow: data.length - 1,
    });
  }

  // Step 4: Parse each facility section
  const facilities: T13FacilitySection[] = [];

  for (const section of sections) {
    const lineItems: T13LineItem[] = [];
    const summaryMetrics: T13FacilitySection['summaryMetrics'] = {
      totalRevenue: 0,
      totalExpenses: 0,
      ebitdar: 0,
      ebitda: 0,
      netIncome: 0,
    };

    for (let i = section.startRow; i <= Math.min(section.endRow, data.length - 1); i++) {
      const row = data[i];
      if (!row || row.every(c => c === null || c === undefined || c === '')) continue;

      // Extract GL code
      const rawGLCode = row[columnMap.glCodeCol];
      const glCode = rawGLCode != null ? normalizeGLCode(String(rawGLCode)) : null;

      // Extract label
      const rawLabel = row[columnMap.labelCol];
      const label = rawLabel != null ? String(rawLabel).trim() : '';
      if (!label && !glCode) continue;

      // Extract values
      const annualValue = parseNumericCell(row[columnMap.annualCol]);
      const monthlyValue = columnMap.monthlyCol != null ? parseNumericCell(row[columnMap.monthlyCol]) : undefined;
      const ppdValue = columnMap.ppdCol != null ? parseNumericCell(row[columnMap.ppdCol]) : undefined;
      const budgetAnnual = columnMap.budgetAnnualCol != null ? parseNumericCell(row[columnMap.budgetAnnualCol]) : undefined;
      const budgetPpd = columnMap.budgetPpdCol != null ? parseNumericCell(row[columnMap.budgetPpdCol]) : undefined;

      // Skip rows with no meaningful values
      if (annualValue === 0 && (monthlyValue === undefined || monthlyValue === 0) && !label) continue;

      // Determine category
      const category = categorizeLineItem(label, glCode);
      const { isSubtotal, isTotal } = detectTotalRow(label);

      // Map to COA
      let coaCode: string | undefined;
      let coaName: string | undefined;

      if (glCode && glMapping?.has(glCode)) {
        const mapped = glMapping.get(glCode)!;
        coaCode = mapped.coaCode;
        coaName = mapped.label;
      }

      // Track GL codes
      if (glCode && label) {
        glCodeMapping.set(glCode, label);
      }

      const lineItem: T13LineItem = {
        rowIndex: i,
        glCode: glCode || '',
        label,
        annualValue,
        monthlyValue,
        ppdValue,
        budgetAnnual,
        budgetPpd,
        category,
        subcategory: glCode ? subcategorizeByGL(glCode) : undefined,
        coaCode,
        coaName,
        isSubtotal,
        isTotal,
        indentLevel: detectIndentLevel(label, glCode),
      };

      lineItems.push(lineItem);

      // Check for summary rows
      for (const [key, pattern] of Object.entries(SUMMARY_ROW_PATTERNS)) {
        if (pattern.test(label)) {
          const metricKey = key as keyof typeof summaryMetrics;
          if (metricKey in summaryMetrics) {
            (summaryMetrics as Record<string, number>)[metricKey] = annualValue;
          }
        }
      }
    }

    // Compute missing summary metrics from line items
    if (summaryMetrics.totalRevenue === 0) {
      summaryMetrics.totalRevenue = lineItems
        .filter(li => li.category === 'revenue' && li.isTotal)
        .reduce((sum, li) => sum + li.annualValue, 0);
    }
    if (summaryMetrics.totalExpenses === 0) {
      summaryMetrics.totalExpenses = lineItems
        .filter(li => li.category === 'expense' && li.isTotal)
        .reduce((sum, li) => sum + li.annualValue, 0);
    }

    // Extract census from metadata rows if available
    const censusData = extractCensusData(data, section.startRow, columnMap);

    if (lineItems.length > 0) {
      facilities.push({
        facilityName: section.facilityName,
        facilityType: section.facilityType,
        startRow: section.startRow,
        endRow: section.endRow,
        lineItems,
        censusData,
        summaryMetrics,
        columnMap: {
          glCodeCol: columnMap.glCodeCol,
          labelCol: columnMap.labelCol,
          annualCol: columnMap.annualCol,
          monthlyCol: columnMap.monthlyCol,
          ppdCol: columnMap.ppdCol,
          budgetAnnualCol: columnMap.budgetAnnualCol,
          budgetPpdCol: columnMap.budgetPpdCol,
        },
      });
    }
  }

  return { facilities, warnings, periods };
}

// ============================================================================
// COLUMN STRUCTURE DETECTION
// ============================================================================

interface ColumnStructure {
  glCodeCol: number;
  labelCol: number;
  annualCol: number;
  monthlyCol?: number;
  ppdCol?: number;
  budgetAnnualCol?: number;
  budgetPpdCol?: number;
  dataStartRow: number;
}

function detectColumnStructure(data: (string | number | null)[][]): ColumnStructure | null {
  // Scan first 20 rows for header patterns
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    // Look for column headers
    let annualCol = -1;
    let monthlyCol: number | undefined;
    let ppdCol: number | undefined;
    let budgetAnnualCol: number | undefined;
    let budgetPpdCol: number | undefined;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell === null || cell === undefined) continue;
      const text = String(cell).toLowerCase().trim();

      if (/^actual\s*$|^annual\s*$|actual\s*dollars/i.test(text) && annualCol === -1) {
        annualCol = j;
      }
      if (/^monthly\s*$|monthly\s*avg/i.test(text) && !monthlyCol) {
        monthlyCol = j;
      }
      if (/^ppd\s*$|per\s*patient/i.test(text) && !ppdCol) {
        ppdCol = j;
      }
      if (/^budget\s*(actual|annual)?$/i.test(text) && !budgetAnnualCol) {
        budgetAnnualCol = j;
      }
      if (/^budget\s*ppd$/i.test(text) && !budgetPpdCol) {
        budgetPpdCol = j;
      }
    }

    if (annualCol !== -1) {
      // GL code is typically column A (index 0), label is column B (index 1)
      const glCodeCol = 0;
      const labelCol = 1;

      return {
        glCodeCol,
        labelCol,
        annualCol,
        monthlyCol,
        ppdCol,
        budgetAnnualCol,
        budgetPpdCol,
        dataStartRow: i + 1,
      };
    }
  }

  // Fallback: detect by looking at data patterns
  // Find the first row with a GL code and use that to infer structure
  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell != null && GL_CODE_PATTERN.test(String(cell).trim())) {
        // Found GL code column
        const glCodeCol = j;
        const labelCol = j + 1;

        // Find the first numeric column after label
        let annualCol = -1;
        for (let k = labelCol + 1; k < row.length; k++) {
          if (typeof row[k] === 'number' && row[k] !== 0) {
            annualCol = k;
            break;
          }
        }

        if (annualCol === -1) annualCol = labelCol + 1;

        return {
          glCodeCol,
          labelCol,
          annualCol,
          monthlyCol: annualCol + 1 < row.length ? annualCol + 1 : undefined,
          ppdCol: annualCol + 2 < row.length ? annualCol + 2 : undefined,
          dataStartRow: i,
        };
      }
    }
  }

  // Last fallback for sheets without GL codes (e.g., rollup sheets)
  // Look for large numeric values in consistent columns
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    const hasLabel = typeof row[0] === 'string' || typeof row[1] === 'string';
    let numericCols = 0;
    for (const cell of row) {
      if (typeof cell === 'number' && Math.abs(cell) > 100) numericCols++;
    }

    if (hasLabel && numericCols >= 2) {
      const labelCol = typeof row[0] === 'string' ? 0 : 1;
      let annualCol = -1;
      for (let j = labelCol + 1; j < row.length; j++) {
        if (typeof row[j] === 'number') {
          annualCol = j;
          break;
        }
      }
      if (annualCol !== -1) {
        return {
          glCodeCol: labelCol === 1 ? 0 : -1, // -1 means no GL codes
          labelCol,
          annualCol,
          monthlyCol: annualCol + 1 < row.length ? annualCol + 1 : undefined,
          ppdCol: annualCol + 2 < row.length ? annualCol + 2 : undefined,
          dataStartRow: i,
        };
      }
    }
  }

  return null;
}

// ============================================================================
// FACILITY SECTION DETECTION
// ============================================================================

interface FacilitySectionBoundary {
  facilityName: string;
  facilityType?: string;
  startRow: number;
  endRow: number;
}

function findFacilitySections(
  data: (string | number | null)[][],
  columnMap: ColumnStructure
): FacilitySectionBoundary[] {
  const sections: FacilitySectionBoundary[] = [];
  const sectionStarts: { row: number; name: string; type?: string }[] = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    // Check for facility header patterns
    // These are rows that contain a facility name but NOT a GL code
    const hasGLCode = row[columnMap.glCodeCol] != null &&
      GL_CODE_LOOSE.test(String(row[columnMap.glCodeCol]).trim());

    if (hasGLCode) continue;

    // Check if any cell matches facility header pattern
    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const text = String(cell).trim();
      if (text.length < 3 || text.length > 100) continue;

      for (const pattern of FACILITY_HEADER_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
          const name = match[1]?.trim() || text.replace(/\s*\([^)]*\)\s*$/, '').trim();
          const type = extractFacilityType(text);

          // Avoid false positives: skip common non-facility labels
          if (/^(total|subtotal|grand|section|category|revenue|expense|ebitda)/i.test(name)) continue;

          sectionStarts.push({ row: i, name, type });
          break;
        }
      }
    }

    // Also check for rows that look like location/entity headers
    // (single text in first column, rest empty or mostly empty)
    const labelCell = row[columnMap.labelCol];
    if (labelCell != null && typeof labelCell === 'string') {
      const text = labelCell.trim();
      const nonEmptyCells = row.filter(c => c != null && c !== '' && c !== 0).length;
      if (nonEmptyCells <= 3 && text.length > 5 && text.length < 80) {
        // Check if it looks like a facility name (has capital letters, not a GL label)
        if (/^[A-Z]/.test(text) && !GL_CODE_PATTERN.test(text) &&
            !SUMMARY_ROW_PATTERNS.totalRevenue.test(text) &&
            !SUMMARY_ROW_PATTERNS.totalExpenses.test(text) &&
            !SUMMARY_ROW_PATTERNS.ebitdar.test(text)) {
          // Check next few rows for GL codes to confirm this is a section header
          let hasFollowingGLCodes = false;
          for (let k = i + 1; k < Math.min(i + 10, data.length); k++) {
            const nextRow = data[k];
            if (nextRow && nextRow[columnMap.glCodeCol] != null &&
                GL_CODE_LOOSE.test(String(nextRow[columnMap.glCodeCol]).trim())) {
              hasFollowingGLCodes = true;
              break;
            }
          }
          if (hasFollowingGLCodes) {
            const existing = sectionStarts.find(s => s.row === i);
            if (!existing) {
              sectionStarts.push({ row: i, name: text, type: extractFacilityType(text) });
            }
          }
        }
      }
    }
  }

  // Convert start rows to sections with boundaries
  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i];
    const endRow = i + 1 < sectionStarts.length
      ? sectionStarts[i + 1].row - 1
      : data.length - 1;

    sections.push({
      facilityName: start.name,
      facilityType: start.type,
      startRow: start.row + 1, // Data starts after header
      endRow,
    });
  }

  return sections;
}

// ============================================================================
// HELPERS
// ============================================================================

function normalizeGLCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (GL_CODE_PATTERN.test(trimmed)) return trimmed;
  const match = trimmed.match(GL_CODE_LOOSE);
  return match ? match[0] : null;
}

function parseNumericCell(cell: string | number | null | undefined): number {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === 'number') return cell;
  const cleaned = String(cell)
    .replace(/[$,\s]/g, '')
    .replace(/\(([^)]+)\)/, '-$1');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function categorizeLineItem(label: string, glCode: string | null): T13LineItem['category'] {
  if (!label && !glCode) return 'expense';

  // By GL code prefix
  if (glCode) {
    const prefix = glCode.substring(0, 1);
    if (prefix === '4') return 'revenue';
    if (prefix === '5' || prefix === '6' || prefix === '7' || prefix === '8') return 'expense';
    if (prefix === '9') return 'census';
  }

  // By label
  if (METRIC_LABELS.test(label)) return 'metric';
  if (CENSUS_LABELS.test(label)) return 'census';
  if (REVENUE_LABELS.test(label)) return 'revenue';
  if (EXPENSE_LABELS.test(label)) return 'expense';

  return 'expense';
}

function detectTotalRow(label: string): { isSubtotal: boolean; isTotal: boolean } {
  const isTotal = /^total\s/i.test(label) || /\btotal$/i.test(label);
  const isSubtotal = /^sub\s*total/i.test(label) || /^total\s+(snf|alf|il|mc|nursing|dietary|plant)/i.test(label);
  return { isSubtotal, isTotal: isTotal || isSubtotal };
}

function detectIndentLevel(label: string, glCode: string | null): number {
  if (!label) return 0;
  // Sub-items typically have longer GL codes or start with spaces
  if (glCode && glCode.includes('-')) return 2;
  if (/^total/i.test(label)) return 0;
  if (/^sub/i.test(label)) return 1;
  return 1;
}

function extractFacilityType(text: string): string | undefined {
  const match = text.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : undefined;
}

function extractFacilityNameFromSheet(sheetName: string, data: (string | number | null)[][]): string {
  // Try to extract from sheet name
  const cleaned = sheetName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (cleaned) return cleaned;

  // Try first few rows of data
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    for (const cell of row) {
      if (typeof cell === 'string' && cell.length > 5 && /^[A-Z]/.test(cell)) {
        return cell.trim();
      }
    }
  }

  return sheetName || 'Unknown Facility';
}

function subcategorizeByGL(glCode: string): string | undefined {
  const code = glCode.replace(/-\d{2}$/, '');
  const prefix4 = code.substring(0, 4);

  const map: Record<string, string> = {
    '4001': 'snf_medicare', '4002': 'snf_medicaid', '4004': 'snf_managed_care',
    '4005': 'snf_private', '4201': 'rcf_medicaid', '4202': 'alf_medicaid',
    '4204': 'alf_private', '4221': 'il_revenue', '4231': 'mc_medicaid',
    '4234': 'mc_private', '5900': 'other_revenue',
    '6000': 'administration', '6100': 'ancillary', '6110': 'therapy',
  };

  return map[prefix4];
}

function detectPeriodHeaders(data: (string | number | null)[][], columnMap: ColumnStructure): string[] {
  const periods: string[] = [];
  // Scan header area for date patterns
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    for (const cell of row) {
      if (cell == null) continue;
      const text = String(cell);
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) {
        periods.push(text.trim());
      }
      const monthMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})/i);
      if (monthMatch) {
        periods.push(text.trim());
      }
    }
  }
  return [...new Set(periods)];
}

function extractCensusData(
  data: (string | number | null)[][],
  startRow: number,
  columnMap: ColumnStructure
): T13FacilitySection['censusData'] {
  // Look near the start of the section for census metadata
  for (let i = Math.max(0, startRow - 10); i < Math.min(startRow + 5, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell == null) continue;
      const text = String(cell).toLowerCase();

      if (/census|actual\s*census|total\s*census/i.test(text)) {
        // Look for numeric value in adjacent cells
        for (let k = j + 1; k < Math.min(j + 3, row.length); k++) {
          const val = row[k];
          if (typeof val === 'number' && val > 0 && val < 100000) {
            return { totalPatientDays: val };
          }
        }
      }
    }
  }

  return undefined;
}
