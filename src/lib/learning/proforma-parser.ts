/**
 * Proforma Parser
 *
 * Parses user's completed proforma spreadsheets to extract facility-level
 * financial data and assumptions. Handles both Cascadia's internal format
 * and external broker formats.
 */

import type {
  ProformaParseResult,
  ProformaFacilityData,
  ProformaLineItem,
  ProformaAssumptions,
} from './types';

// Common proforma section labels (case-insensitive matching)
const REVENUE_INDICATORS = [
  'revenue', 'total revenue', 'gross revenue', 'net revenue',
  'patient revenue', 'resident revenue', 'net patient revenue',
];

const EXPENSE_INDICATORS = [
  'expense', 'total expense', 'total expenses', 'operating expense',
  'total operating', 'operating costs',
];

const EBITDAR_INDICATORS = ['ebitdar', 'ebitdar margin'];
const EBITDA_INDICATORS = ['ebitda', 'ebitda margin'];
const NET_INCOME_INDICATORS = ['net income', 'net operating income', 'noi', 'net income (loss)'];

const MGMT_FEE_INDICATORS = ['management fee', 'mgmt fee', 'management', 'admin fee'];
const AGENCY_INDICATORS = ['agency', 'contract labor', 'agency nursing', 'temp labor'];
const RENT_INDICATORS = ['rent', 'lease expense', 'facility rent', 'building rent'];
const OCCUPANCY_INDICATORS = ['occupancy', 'occupancy rate', 'avg occupancy', 'census'];

/**
 * Parse a completed proforma from sheet data
 */
export function parseCompletedProforma(
  sheets: Array<{ name: string; data: (string | number | null)[][] }>
): ProformaParseResult {
  const warnings: string[] = [];
  const facilities: ProformaFacilityData[] = [];

  // Detect T12/T24/T36 format: multiple sheets named after facilities/locations
  const isMultiSheetPortfolio = sheets.length > 1 &&
    sheets.some(s => s.name.toLowerCase() === 'rollup' || s.name.toLowerCase() === 'summary' || s.name.toLowerCase() === 'consolidated');

  for (const sheet of sheets) {
    // Skip sheets that are clearly not proformas
    const sheetNameLower = sheet.name.toLowerCase();
    if (sheetNameLower.includes('mapping') || sheetNameLower.includes('instructions')) {
      continue;
    }

    // Skip rollup/summary sheets when we have individual facility sheets
    if (isMultiSheetPortfolio && (sheetNameLower === 'rollup' || sheetNameLower === 'summary' || sheetNameLower === 'consolidated')) {
      continue;
    }

    // For multi-sheet portfolios (T12/T24/T36), each sheet IS a facility
    if (isMultiSheetPortfolio) {
      const singleFacility = parseSingleFacilitySheet(sheet.data, sheet.name);
      if (singleFacility) {
        facilities.push(singleFacility);
      }
      continue;
    }

    // Try to parse as multi-facility proforma first
    const multiFacility = parseMultiFacilitySheet(sheet.data, sheet.name);
    if (multiFacility.length > 0) {
      facilities.push(...multiFacility);
      continue;
    }

    // Try as single-facility sheet (tab = facility)
    const singleFacility = parseSingleFacilitySheet(sheet.data, sheet.name);
    if (singleFacility) {
      facilities.push(singleFacility);
    }
  }

  // Calculate portfolio summary
  const portfolioSummary = facilities.length > 0
    ? {
        totalRevenue: facilities.reduce((s, f) => s + f.revenue, 0),
        totalExpenses: facilities.reduce((s, f) => s + f.expenses, 0),
        totalEbitdar: facilities.reduce((s, f) => s + f.ebitdar, 0),
        totalBeds: facilities.reduce((s, f) => s + (f.beds || 0), 0),
      }
    : undefined;

  // Extract assumptions if detectable
  const assumptions = detectAssumptions(sheets);

  return {
    facilities,
    portfolioSummary,
    assumptions,
    confidence: facilities.length > 0 ? Math.min(0.9, 0.5 + facilities.length * 0.05) : 0.1,
    warnings,
  };
}

/**
 * Parse a sheet that contains multiple facility sections
 */
function parseMultiFacilitySheet(
  data: (string | number | null)[][],
  _sheetName: string
): ProformaFacilityData[] {
  const facilities: ProformaFacilityData[] = [];

  // Look for facility section boundaries
  const sectionBoundaries: { row: number; name: string }[] = [];

  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length === 0) continue;

    // A facility section header: text in first cell, few other cells populated
    const firstCell = String(row[0] || '').trim();
    if (!firstCell) continue;

    // Check if this row looks like a facility header (not a line item)
    const isSectionHeader =
      firstCell.length > 3 &&
      firstCell.length < 80 &&
      !isFinancialLineItem(firstCell) &&
      !isNumericValue(row[1]) &&
      looksLikeFacilityName(firstCell);

    if (isSectionHeader) {
      sectionBoundaries.push({ row: r, name: firstCell });
    }
  }

  // Parse each section
  for (let i = 0; i < sectionBoundaries.length; i++) {
    const startRow = sectionBoundaries[i].row;
    const endRow = i + 1 < sectionBoundaries.length
      ? sectionBoundaries[i + 1].row
      : data.length;

    const sectionData = data.slice(startRow, endRow);
    const facility = parseFacilitySection(sectionData, sectionBoundaries[i].name);
    if (facility && (facility.revenue > 0 || facility.expenses > 0)) {
      facilities.push(facility);
    }
  }

  return facilities;
}

/**
 * Parse a single sheet as one facility's proforma
 */
function parseSingleFacilitySheet(
  data: (string | number | null)[][],
  sheetName: string
): ProformaFacilityData | null {
  const facility = parseFacilitySection(data, sheetName);
  if (facility && (facility.revenue > 0 || facility.expenses > 0)) {
    return facility;
  }
  return null;
}

/**
 * Parse a section of rows as a facility's P&L data
 */
function parseFacilitySection(
  data: (string | number | null)[][],
  facilityName: string
): ProformaFacilityData | null {
  const lineItems: ProformaLineItem[] = [];
  let revenue = 0;
  let expenses = 0;
  let ebitdar = 0;
  let ebitda = 0;
  let netIncome = 0;
  let occupancy: number | undefined;
  let beds: number | undefined;

  // Find the value column (first column with numeric data)
  const valueCol = findValueColumn(data);
  if (valueCol < 0) return null;

  let mgmtFee = 0;
  let agencyExpense = 0;
  let rentExpense = 0;

  for (const row of data) {
    if (!row || row.length === 0) continue;

    const rawLabel = String(row[0] || '').trim();
    const label = rawLabel.toLowerCase();
    if (!label) continue;

    const value = parseNumericValue(row[valueCol]);
    if (value === null) continue;

    // Classify the line item — use trimmed labels for specificity
    // For T12/T36 hierarchical format, prefer "Total Operating Revenue/Expense"
    const stripped = label.replace(/^\s+/, '');
    if (stripped.startsWith('total operating revenue') || stripped === 'total revenue' || stripped === 'net revenue' || stripped === 'gross revenue') {
      revenue = value;
    } else if (stripped.startsWith('total operating expense') || stripped === 'total expenses' || stripped === 'total expense') {
      expenses = Math.abs(value);
    } else if (stripped === 'ebitdar' || stripped.startsWith('total ebitdar')) {
      ebitdar = value;
    } else if (stripped === 'ebitda' || stripped.startsWith('total ebitda')) {
      ebitda = value;
    } else if (stripped === 'net income' || stripped.startsWith('net income') || stripped === 'noi' || stripped === 'net operating income') {
      netIncome = value;
    } else if (matchesAny(stripped, OCCUPANCY_INDICATORS)) {
      occupancy = value > 1 ? value / 100 : value;
    }

    // Track specific expense line items for normalization detection
    if (matchesAny(stripped, MGMT_FEE_INDICATORS) && stripped.startsWith('total ')) {
      mgmtFee = Math.abs(value);
    } else if (matchesAny(stripped, AGENCY_INDICATORS) && !stripped.includes('salary')) {
      agencyExpense = Math.abs(value);
    } else if (matchesAny(stripped, RENT_INDICATORS) && stripped.startsWith('total ')) {
      rentExpense = Math.abs(value);
    }

    // Determine line item category
    const category = categorizeLineItem(label);
    if (category) {
      lineItems.push({
        label: rawLabel,
        category,
        annualValue: value,
      });
    }
  }

  // Derive missing metrics
  if (!ebitdar && revenue > 0 && expenses > 0) {
    ebitdar = revenue - expenses;
  }
  if (!ebitda && ebitdar) {
    ebitda = ebitdar; // Approximate if no rent deduction visible
  }
  if (!netIncome && ebitda) {
    netIncome = ebitda;
  }

  if (revenue === 0 && expenses === 0) return null;

  return {
    facilityName: cleanFacilityName(facilityName),
    revenue,
    expenses,
    ebitdar,
    ebitda,
    netIncome,
    occupancy,
    beds,
    lineItems,
  };
}

/**
 * Detect proforma assumptions from sheets
 */
function detectAssumptions(
  sheets: Array<{ name: string; data: (string | number | null)[][] }>
): ProformaAssumptions | undefined {
  const assumptions: ProformaAssumptions = {};
  let found = false;

  for (const sheet of sheets) {
    for (const row of sheet.data) {
      if (!row || row.length < 2) continue;

      const label = String(row[0] || '').trim().toLowerCase();
      const value = parseNumericValue(row[1]);

      if (value === null) continue;

      if (label.includes('revenue growth') || label.includes('rev growth')) {
        assumptions.revenueGrowthRate = value > 1 ? value / 100 : value;
        found = true;
      } else if (label.includes('expense growth') || label.includes('exp growth')) {
        assumptions.expenseGrowthRate = value > 1 ? value / 100 : value;
        found = true;
      } else if (label.includes('target occupancy') || label.includes('stabilized occ')) {
        assumptions.targetOccupancy = value > 1 ? value / 100 : value;
        found = true;
      } else if (matchesAny(label, MGMT_FEE_INDICATORS) && label.includes('%')) {
        assumptions.managementFeePercent = value > 1 ? value / 100 : value;
        found = true;
      }
    }
  }

  return found ? assumptions : undefined;
}

// ============================================================================
// Helpers
// ============================================================================

function findValueColumn(data: (string | number | null)[][]): number {
  // Find max column width from the data
  let maxCols = 0;
  for (let r = 0; r < Math.min(50, data.length); r++) {
    if (data[r]) maxCols = Math.max(maxCols, data[r].length);
  }

  // For multi-column files (T12/T24/T36), prefer the LAST column with data
  // This gives us the most recent trailing period
  if (maxCols > 5) {
    for (let col = maxCols - 1; col >= 1; col--) {
      let numericCount = 0;
      for (let r = 0; r < Math.min(50, data.length); r++) {
        if (data[r] && parseNumericValue(data[r][col]) !== null) {
          numericCount++;
        }
      }
      if (numericCount >= 3) return col;
    }
  }

  // For narrow files, scan left-to-right for first numeric column
  for (let col = 1; col < Math.min(20, maxCols); col++) {
    let numericCount = 0;
    for (let r = 0; r < Math.min(20, data.length); r++) {
      if (data[r] && parseNumericValue(data[r][col]) !== null) {
        numericCount++;
      }
    }
    if (numericCount >= 3) return col;
  }
  return -1;
}

function parseNumericValue(cell: string | number | null | undefined): number | null {
  if (cell === null || cell === undefined || cell === '') return null;
  if (typeof cell === 'number') return cell;

  const cleaned = String(cell).replace(/[$,\s()]/g, '').replace(/^\((.+)\)$/, '-$1');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function matchesAny(label: string, indicators: string[]): boolean {
  return indicators.some(ind => label.includes(ind));
}

function isFinancialLineItem(text: string): boolean {
  const lower = text.toLowerCase();
  return REVENUE_INDICATORS.some(r => lower.includes(r)) ||
    EXPENSE_INDICATORS.some(e => lower.includes(e)) ||
    EBITDAR_INDICATORS.some(e => lower.includes(e)) ||
    EBITDA_INDICATORS.some(e => lower.includes(e)) ||
    NET_INCOME_INDICATORS.some(e => lower.includes(e)) ||
    lower.includes('salary') || lower.includes('wage') ||
    lower.includes('insurance') || lower.includes('tax') ||
    lower.includes('resident care') || lower.includes('nursing') ||
    lower.includes('dietary') || lower.includes('pharmacy') ||
    lower.includes('therapy') || lower.includes('ancillary') ||
    lower.includes('medicare') || lower.includes('medicaid') ||
    lower.includes('depreciation') || lower.includes('rent') ||
    lower.includes('interest') || lower.includes('total ');
}

function isNumericValue(cell: string | number | null | undefined): boolean {
  return parseNumericValue(cell) !== null;
}

function looksLikeFacilityName(text: string): boolean {
  const lower = text.toLowerCase().trim();

  // Exclude P&L line items, section headers, and financial categories
  const excludePatterns = [
    'resident care', 'snf', 'alf', 'medicare', 'medicaid', 'hmo', 'private',
    'ancillary', 'revenue', 'expense', 'salary', 'payroll', 'operating',
    'total ', 'net income', 'ebitda', 'ebitdar', 'depreciation', 'rent ',
    'interest', 'dietary', 'laundry', 'housekeeping', 'plant operation',
    'social service', 'medical record', 'activit', 'administration',
    'management fee', 'nursing -', 'pharmacy', 'therapy', 'laboratory',
    'x-ray', 'physician', 'cost report', 'covid', 'miscellaneous',
    'supplies', 'insurance', 'profit & loss', 'reporting book',
    'as of ', 'entity group', 'month ending', 'actual', 'budget',
    'rental income', 'va -', 'veteran', 'commercial', 'bariatr',
    'hospice', 'complex', 'restorative', 'oxygen', 'iv solution',
    'equipment rental', 'otc ', 'non-operating',
  ];
  if (excludePatterns.some(p => lower.includes(p))) return false;

  // Facility names typically contain location-related words or proper nouns
  const indicators = [
    'center', 'living', 'health', 'manor', 'gardens',
    'court', 'place', 'village', 'ridge', 'pointe', 'crossing',
    'sapphire', 'gateway', 'firwood', 'bridgecreek', 'brighton', 'cedar',
    'liberty', 'gresham', 'ridgeview', 'opco', 'propco',
  ];
  return indicators.some(ind => lower.includes(ind)) ||
    /^[A-Z][a-z]+ (at |of |at the )?[A-Z]/.test(text);
}

function categorizeLineItem(label: string): 'revenue' | 'expense' | 'metric' | null {
  const lower = label.toLowerCase();

  // Revenue indicators
  if (lower.includes('revenue') || lower.includes('income') && !lower.includes('net income')) {
    return 'revenue';
  }

  // Expense indicators
  if (lower.includes('expense') || lower.includes('cost') || lower.includes('salary') ||
      lower.includes('wage') || lower.includes('fee') || lower.includes('insurance') ||
      lower.includes('rent') || lower.includes('utilit') || lower.includes('supplies') ||
      lower.includes('agency') || lower.includes('dietary') || lower.includes('laundry')) {
    return 'expense';
  }

  // Metrics
  if (lower.includes('occupancy') || lower.includes('beds') || lower.includes('census') ||
      lower.includes('margin') || lower.includes('ebitda') || lower.includes('noi')) {
    return 'metric';
  }

  return null;
}

function cleanFacilityName(name: string): string {
  return name
    .replace(/\(SNF.*?\)/gi, '')
    .replace(/\(ALF.*?\)/gi, '')
    .replace(/\(MC.*?\)/gi, '')
    .replace(/\(IL.*?\)/gi, '')
    .replace(/\s*Opco\/Propco\s*/gi, '')
    .replace(/\s*opco\s*/gi, '')
    .replace(/\s*propco\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}
