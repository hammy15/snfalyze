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

  for (const sheet of sheets) {
    // Skip sheets that are clearly not proformas
    const sheetNameLower = sheet.name.toLowerCase();
    if (sheetNameLower.includes('mapping') || sheetNameLower.includes('instructions')) {
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

  for (const row of data) {
    if (!row || row.length === 0) continue;

    const label = String(row[0] || '').trim().toLowerCase();
    if (!label) continue;

    const value = parseNumericValue(row[valueCol]);
    if (value === null) continue;

    // Classify the line item
    if (matchesAny(label, REVENUE_INDICATORS)) {
      revenue = value;
    } else if (matchesAny(label, EXPENSE_INDICATORS)) {
      expenses = Math.abs(value);
    } else if (matchesAny(label, EBITDAR_INDICATORS)) {
      ebitdar = value;
    } else if (matchesAny(label, EBITDA_INDICATORS)) {
      ebitda = value;
    } else if (matchesAny(label, NET_INCOME_INDICATORS)) {
      netIncome = value;
    } else if (matchesAny(label, OCCUPANCY_INDICATORS)) {
      occupancy = value > 1 ? value / 100 : value; // Normalize to decimal
    }

    // Determine line item category
    const category = categorizeLineItem(label);
    if (category) {
      lineItems.push({
        label: String(row[0] || '').trim(),
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
  // Scan first 20 rows to find the first column with numeric values
  for (let col = 1; col < 20; col++) {
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
    lower.includes('salary') || lower.includes('wage') ||
    lower.includes('insurance') || lower.includes('tax');
}

function isNumericValue(cell: string | number | null | undefined): boolean {
  return parseNumericValue(cell) !== null;
}

function looksLikeFacilityName(text: string): boolean {
  // Facility names typically contain location-related words or proper nouns
  const indicators = [
    'center', 'care', 'living', 'health', 'nursing', 'manor', 'gardens',
    'home', 'court', 'place', 'village', 'ridge', 'pointe', 'crossing',
    'sapphire', 'gateway', 'firwood', 'bridgecreek', 'brighton', 'cedar',
    'liberty', 'gresham', 'ridgeview',
  ];
  const lower = text.toLowerCase();
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
    .replace(/\s+/g, ' ')
    .trim();
}
