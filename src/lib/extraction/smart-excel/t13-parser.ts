/**
 * T13 P&L Parser
 *
 * Parses Opco Review T13 format from Excel cell data.
 * Handles multiple data layouts:
 *
 * 1. **Flat T13 table** (primary): 10,000+ row table where col 0 = facility name
 *    on every row, col 7 = GL code+label, col 8 = actual value.
 *    Grouped by facility name in col 0.
 *
 * 2. **Current State / 85% Occupancy summary** (most accurate):
 *    Per-facility summary in cols 56-64 with Revenue, EBITDAR, Net Income.
 *    Used as authoritative source for summary metrics.
 *
 * 3. **Mapping sheet**: Cols 22-30 with facility metadata (beds, lease/owned,
 *    business line, property name crosswalk to AV file).
 *
 * 4. **Per-facility sheets** (e.g., "Gateway (SNF_AL_IL)", "Ridgeview (ALF)"):
 *    Individual facility P&L with GL code in col 0, values in col 1.
 */

import type { SheetExtraction } from '../excel-extractor';
import type {
  T13LineItem,
  T13FacilitySection,
  T13ParseResult,
  GLMappingEntry,
  FacilityMappingEntry,
} from './types';

// ============================================================================
// PATTERNS
// ============================================================================

const GL_CODE_PATTERN = /^(\d{6})(-\d{2})?$/;
const GL_CODE_LOOSE = /(\d{6})(-\d{2})?/;
const GL_CODE_IN_LABEL = /^\s*(\d{6}(?:-\d{2})?)\s*[-–—]\s*(.+)/;

const SUMMARY_ROW_PATTERNS: Record<string, RegExp> = {
  totalRevenue: /^total\s*(?:operating\s*)?revenue/i,
  totalExpenses: /^total\s*(?:operating\s*)?expense/i,
  ebitdar: /^ebitdar\b/i,
  ebitda: /^ebitda(?!r)\b/i,
  netIncome: /^net\s*(?:operating\s*)?income/i,
  managementFee: /management\s*fee/i,
  leaseExpense: /^(?:lease|rent)\s*expense/i,
  providerTax: /^provider\s*tax/i,
};

const REVENUE_LABELS = /revenue|income|r&b|room.*board|patient\s*service/i;
const EXPENSE_LABELS = /expense|cost|salary|wage|payroll|fee|tax|insurance|depreciation|amortization|interest/i;
const CENSUS_LABELS = /days|census|occupancy|beds|adc/i;
const METRIC_LABELS = /ebitda|ebitdar|ebit\b|noi|net\s*(income|operating)|margin/i;

const FACILITY_HEADER_PATTERNS = [
  /^(.+?)\s*\((?:SNF|ALF|MC|IL|Opco|SNF_AL_IL|SNF_AL|AL_IL)\)/i,
  /^(.+?)\s*(?:SNF|Nursing|Healthcare|Care\s+Center|Rehab|Assisted\s+Living|Memory\s+Care)/i,
  /^(?:Location|Facility|Entity)[:\s]+(.+)/i,
];

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

  // Step 1: Parse Mapping sheet for facility metadata
  const mappingSheet = sheets.find(s => /^mapping$/i.test(s.sheetName));
  let facilityMapping: Map<string, FacilityMappingEntry> | undefined;
  if (mappingSheet) {
    facilityMapping = parseFacilityMappingSheet(mappingSheet);
    if (facilityMapping.size > 0) {
      warnings.push(`Mapping: ${facilityMapping.size} facilities with metadata`);
    }
  }

  // Step 2: Parse Current State / 85% Occupancy summary data
  const summarySheets = sheets.filter(s =>
    /current\s*state|85%?\s*occupancy/i.test(s.sheetName)
  );
  const summaryFacilities = new Map<string, {
    opcoName: string;
    revenue: number;
    ebitdar: number;
    netIncome: number;
    nonskilledDays?: number;
    skilledDays?: number;
    ventDays?: number;
    skilledMix?: number;
    sncRevenue?: number;
  }>();

  for (const sheet of summarySheets) {
    const summaryData = parseCurrentStateSummary(sheet);
    for (const [name, data] of summaryData) {
      if (!summaryFacilities.has(name)) {
        summaryFacilities.set(name, data);
      }
    }
  }

  if (summaryFacilities.size > 0) {
    warnings.push(`Current State summary: ${summaryFacilities.size} facilities`);
  }

  // Step 3: Parse flat T13 sheet
  const t13Sheets = sheets.filter(s =>
    /t13|dollars\s*and\s*ppd/i.test(s.sheetName)
  );

  for (const sheet of t13Sheets) {
    if (isFlatT13Format(sheet)) {
      const result = parseFlatT13Sheet(sheet, glMapping, glCodeMapping);
      allFacilities.push(...result.facilities);
      warnings.push(...result.warnings);
      periods.push(...result.periods);
    } else {
      const result = parseT13Sheet(sheet, glMapping, glCodeMapping);
      allFacilities.push(...result.facilities);
      warnings.push(...result.warnings);
      periods.push(...result.periods);
    }
  }

  // Step 4: Parse individual facility sheets — but only if flat T13 didn't
  // produce results. Individual sheets (e.g., "Gateway (SNF_AL_IL)") contain
  // sub-sections (General, Specific Needs, Memory Care) that would create
  // phantom facility entries if added alongside the flat T13 data.
  if (allFacilities.length === 0) {
    const facilitySheets = sheets.filter(s =>
      /\((?:SNF|ALF|MC|IL|SNF_AL_IL|SNF_AL|AL_IL)\)/i.test(s.sheetName)
    );
    for (const sheet of facilitySheets) {
      const result = parseT13Sheet(sheet, glMapping, glCodeMapping);
      allFacilities.push(...result.facilities);
      warnings.push(...result.warnings);
    }
  }

  // Step 5: Parse rollup sheet
  let rollup: T13FacilitySection | undefined;
  const rollupSheets = sheets.filter(s =>
    /rollup|roll-up|consolidated/i.test(s.sheetName)
  );
  if (rollupSheets.length > 0) {
    const rollupResult = parseT13Sheet(rollupSheets[0], glMapping, glCodeMapping);
    if (rollupResult.facilities.length > 0) {
      rollup = rollupResult.facilities[0];
      rollup.facilityName = 'Portfolio Rollup';
    }
  }

  // Step 6: If no T13/facility sheets found, try P&L-classified sheets
  if (allFacilities.length === 0) {
    const plSheets = sheets.filter(s => s.sheetType === 'pl');
    for (const sheet of plSheets) {
      const result = parseT13Sheet(sheet, glMapping, glCodeMapping);
      allFacilities.push(...result.facilities);
      warnings.push(...result.warnings);
    }
  }

  // Step 7: Build facilities from Current State summary if T13 parsing
  // didn't produce them. This ensures we get all 22 facilities even if
  // the flat T13 parsing failed or was incomplete.
  for (const [opcoName, summary] of summaryFacilities) {
    const alreadyParsed = allFacilities.some(f =>
      f.facilityName.toLowerCase() === opcoName.toLowerCase() ||
      f.facilityName.toLowerCase().includes(opcoName.toLowerCase().replace(/\s*\(opco\)/i, ''))
    );

    if (!alreadyParsed) {
      const mapping = facilityMapping?.get(opcoName);
      // Use property name from mapping for better AV matching
      const displayName = mapping?.propertyName || opcoName.replace(/\s*\(Opco\)/i, '');

      allFacilities.push({
        facilityName: displayName,
        facilityType: mapping?.businessLineDetail,
        startRow: 0,
        endRow: 0,
        lineItems: [],
        censusData: {
          beds: mapping?.beds,
        },
        summaryMetrics: {
          totalRevenue: summary.revenue,
          totalExpenses: summary.revenue - summary.ebitdar, // Revenue - EBITDAR = Expenses (approx)
          ebitdar: summary.ebitdar,
          ebitda: 0, // Will be filled from AV data
          netIncome: summary.netIncome,
        },
        columnMap: { glCodeCol: 0, labelCol: 1, annualCol: 2 },
      });
    }
  }

  // Step 8: Enrich facilities with Mapping sheet data and Current State summary
  for (const fac of allFacilities) {
    // Try to find mapping entry
    const mappingEntry = findMappingEntry(fac.facilityName, facilityMapping);
    if (mappingEntry) {
      if (!fac.censusData?.beds && mappingEntry.beds > 0) {
        fac.censusData = { ...fac.censusData, beds: mappingEntry.beds };
      }
      if (!fac.facilityType) {
        fac.facilityType = mappingEntry.businessLineDetail;
      }
      // Update facility name to property name for better AV matching
      if (fac.facilityName.includes('(Opco)') && mappingEntry.propertyName) {
        fac.facilityName = mappingEntry.propertyName;
      }
    }

    // Try to fill in summary metrics from Current State
    const summaryEntry = findSummaryEntry(fac.facilityName, summaryFacilities, facilityMapping);
    if (summaryEntry) {
      if (fac.summaryMetrics.totalRevenue === 0 && summaryEntry.revenue > 0) {
        fac.summaryMetrics.totalRevenue = summaryEntry.revenue;
      }
      if (fac.summaryMetrics.ebitdar === 0 && summaryEntry.ebitdar > 0) {
        fac.summaryMetrics.ebitdar = summaryEntry.ebitdar;
      }
      if (fac.summaryMetrics.netIncome === 0 && summaryEntry.netIncome !== 0) {
        fac.summaryMetrics.netIncome = summaryEntry.netIncome;
      }
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
    facilityMapping,
    periods: [...new Set(periods)],
    warnings,
  };
}

// ============================================================================
// FLAT T13 FORMAT DETECTION & PARSING
// ============================================================================

function isFlatT13Format(sheet: SheetExtraction): boolean {
  const { data } = sheet;
  if (data.length < 100) return false;

  // Check if col 0 has repeated facility names (same name across 10+ rows)
  const names = new Map<string, number>();
  for (let i = 8; i < Math.min(50, data.length); i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    if (name.length > 3) {
      names.set(name, (names.get(name) || 0) + 1);
    }
  }

  // If any name appears 10+ times, it's a flat table format
  return [...names.values()].some(count => count >= 10);
}

interface FlatT13Result {
  facilities: T13FacilitySection[];
  warnings: string[];
  periods: string[];
}

function parseFlatT13Sheet(
  sheet: SheetExtraction,
  glMapping: Map<string, GLMappingEntry> | undefined,
  glCodeMapping: Map<string, string>
): FlatT13Result {
  const { data } = sheet;
  const warnings: string[] = [];
  const periods: string[] = [];

  // Detect header row (usually row 8)
  let headerRow = -1;
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    if (String(row[0] || '').trim().toLowerCase() === 'facility') {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) headerRow = 8; // Default

  // Detect period from header area
  for (let i = 0; i < headerRow; i++) {
    const row = data[i];
    if (!row) continue;
    for (const cell of row) {
      if (cell == null) continue;
      const text = String(cell);
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) periods.push(text.trim());
    }
  }

  // Group rows by facility name (col 0)
  const facilityRows = new Map<string, number[]>();
  const facilityMeta = new Map<string, {
    state: string;
    leaseSplit: string;
    businessLine: string;
  }>();

  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || !row[0]) continue;
    const name = String(row[0]).trim();
    if (!name || name.length < 3) continue;

    if (!facilityRows.has(name)) {
      facilityRows.set(name, []);
      // Capture metadata from first row
      facilityMeta.set(name, {
        state: String(row[3] || '').trim(),
        leaseSplit: String(row[4] || '').trim(),
        businessLine: String(row[5] || '').trim(),
      });
    }
    facilityRows.get(name)!.push(i);
  }

  // Parse each facility's rows
  const facilities: T13FacilitySection[] = [];

  for (const [facName, rowIndices] of facilityRows) {
    const lineItems: T13LineItem[] = [];
    const summaryMetrics: T13FacilitySection['summaryMetrics'] = {
      totalRevenue: 0,
      totalExpenses: 0,
      ebitdar: 0,
      ebitda: 0,
      netIncome: 0,
    };

    for (const rowIdx of rowIndices) {
      const row = data[rowIdx];
      if (!row) continue;

      // Col 7: GL code + label (e.g., "    400110-99 - SNF Medicare Days")
      const glCell = row[7] != null ? String(row[7]).trim() : '';
      if (!glCell) continue;

      // Extract GL code and label from combined text
      const glMatch = glCell.match(GL_CODE_IN_LABEL);
      let glCode = '';
      let label = glCell;

      if (glMatch) {
        glCode = glMatch[1];
        label = glMatch[2].trim();
      } else {
        // Check if it's a summary row (Total Operating Revenue, EBITDAR, etc.)
        label = glCell;
      }

      // Col 8: Actual value
      const annualValue = parseNumericCell(row[8]);
      // Col 9: PPD
      const ppdValue = parseNumericCell(row[9]);
      // Col 10: Budget
      const budgetAnnual = parseNumericCell(row[10]);
      // Col 11: Budget PPD
      const budgetPpd = parseNumericCell(row[11]);

      // Categorize
      const category = categorizeLineItem(label, glCode || null);
      const { isSubtotal, isTotal } = detectTotalRow(label);

      // Map GL code
      let coaCode: string | undefined;
      let coaName: string | undefined;
      if (glCode && glMapping?.has(glCode)) {
        const mapped = glMapping.get(glCode)!;
        coaCode = mapped.coaCode;
        coaName = mapped.label;
      }
      if (glCode && label) {
        glCodeMapping.set(glCode, label);
      }

      lineItems.push({
        rowIndex: rowIdx,
        glCode,
        label,
        annualValue,
        ppdValue: ppdValue || undefined,
        budgetAnnual: budgetAnnual || undefined,
        budgetPpd: budgetPpd || undefined,
        category,
        subcategory: glCode ? subcategorizeByGL(glCode) : undefined,
        coaCode,
        coaName,
        isSubtotal,
        isTotal,
        indentLevel: detectIndentLevel(label, glCode || null),
      });

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

    // Also check for management fee to compute EBITDA
    if (summaryMetrics.ebitdar && !summaryMetrics.ebitda) {
      const mgmtFee = lineItems.find(li =>
        /management\s*fee/i.test(li.label) && li.annualValue !== 0
      );
      if (mgmtFee) {
        summaryMetrics.managementFee = mgmtFee.annualValue;
        summaryMetrics.ebitda = summaryMetrics.ebitdar - Math.abs(mgmtFee.annualValue);
      }
    }

    const meta = facilityMeta.get(facName);

    if (lineItems.length > 0) {
      facilities.push({
        facilityName: facName,
        facilityType: meta?.businessLine,
        startRow: rowIndices[0],
        endRow: rowIndices[rowIndices.length - 1],
        lineItems,
        summaryMetrics,
        columnMap: {
          glCodeCol: 7,
          labelCol: 7,
          annualCol: 8,
          ppdCol: 9,
          budgetAnnualCol: 10,
          budgetPpdCol: 11,
        },
      });
    }
  }

  warnings.push(`Flat T13: ${facilities.length} facilities from ${data.length} rows`);
  return { facilities, warnings, periods };
}

// ============================================================================
// CURRENT STATE SUMMARY PARSER
// ============================================================================

function parseCurrentStateSummary(sheet: SheetExtraction): Map<string, {
  opcoName: string;
  revenue: number;
  ebitdar: number;
  netIncome: number;
  nonskilledDays?: number;
  skilledDays?: number;
  ventDays?: number;
  skilledMix?: number;
  sncRevenue?: number;
}> {
  const { data } = sheet;
  const result = new Map<string, {
    opcoName: string;
    revenue: number;
    ebitdar: number;
    netIncome: number;
    nonskilledDays?: number;
    skilledDays?: number;
    ventDays?: number;
    skilledMix?: number;
    sncRevenue?: number;
  }>();

  // The summary data is in cols 56-64:
  // Col 56: Facility name
  // Col 57: Total Operating Revenue
  // Col 58: EBITDAR
  // Col 59: Net Income
  // Col 60: Non-Skilled Days
  // Col 61: Skilled Days
  // Col 62: Vent Days
  // Col 63: Skilled Mix
  // Col 64: SNC Revenue
  //
  // Data starts around row 5 (after headers in rows 0-4)

  // First, detect the summary columns by finding the header row
  let nameCol = 56;
  let revenueCol = 57;
  let ebitdarCol = 58;
  let niCol = 59;
  let startRow = 5;

  // Scan for header
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (let j = 50; j < Math.min(70, row.length); j++) {
      const cell = row[j];
      if (cell == null) continue;
      const text = String(cell).toLowerCase().trim();
      if (/total\s*operating\s*revenue/i.test(text)) {
        revenueCol = j;
        nameCol = j - 1;
        ebitdarCol = j + 1;
        niCol = j + 2;
        startRow = i + 2; // Data starts 2 rows after header
        break;
      }
    }
  }

  // Parse facility rows
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const name = row[nameCol] != null ? String(row[nameCol]).trim() : '';
    if (!name || name.length < 3) continue;
    if (/total|grand|portfolio/i.test(name)) continue;

    const revenue = typeof row[revenueCol] === 'number' ? row[revenueCol] as number : 0;
    const ebitdar = typeof row[ebitdarCol] === 'number' ? row[ebitdarCol] as number : 0;
    const netIncome = typeof row[niCol] === 'number' ? row[niCol] as number : 0;

    if (revenue === 0 && ebitdar === 0 && netIncome === 0) continue;

    result.set(name, {
      opcoName: name,
      revenue,
      ebitdar,
      netIncome,
      nonskilledDays: typeof row[nameCol + 4] === 'number' ? row[nameCol + 4] as number : undefined,
      skilledDays: typeof row[nameCol + 5] === 'number' ? row[nameCol + 5] as number : undefined,
      ventDays: typeof row[nameCol + 6] === 'number' ? row[nameCol + 6] as number : undefined,
      skilledMix: typeof row[nameCol + 7] === 'number' ? row[nameCol + 7] as number : undefined,
      sncRevenue: typeof row[nameCol + 8] === 'number' ? row[nameCol + 8] as number : undefined,
    });
  }

  return result;
}

// ============================================================================
// FACILITY MAPPING SHEET PARSER
// ============================================================================

function parseFacilityMappingSheet(sheet: SheetExtraction): Map<string, FacilityMappingEntry> {
  const { data } = sheet;
  const result = new Map<string, FacilityMappingEntry>();

  // The mapping data is in cols 22-30:
  // Col 22: Opco name (e.g., "Gateway (Opco)")
  // Col 23: Property name (e.g., "Gateway Care and Retirement Center")
  // Col 24: State-BL (e.g., "OR-Split")
  // Col 25: Lease/Owned (e.g., "Leased" or "Owned")
  // Col 26: Full group (e.g., "OR-SplitLeased")
  // Col 27: Total Beds/Units (number)
  // Col 28: Business Line (e.g., "SNF/IL", "AL/IL/MC")
  // Col 29: Business Line detail (e.g., "SNF/IL", "ALF/MC", "MC")

  // Detect column layout
  let opcoCol = 22;
  let propCol = 23;
  let stateCol = 24;
  let leaseCol = 25;
  let groupCol = 26;
  let bedsCol = 27;
  let blCol = 28;
  let blDetailCol = 29;

  // Check header row
  for (let i = 0; i < Math.min(5, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    for (let j = 15; j < Math.min(35, row.length); j++) {
      const cell = row[j];
      if (cell == null) continue;
      const text = String(cell).toLowerCase().trim();
      if (text === 'facility') {
        opcoCol = j;
        propCol = j + 1;
        stateCol = j + 2;
        leaseCol = j + 3;
        groupCol = j + 4;
        bedsCol = j + 5;
        blCol = j + 6;
        blDetailCol = j + 7;
        break;
      }
    }
  }

  // Parse facility rows (skip header, start from row 2)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const opcoName = row[opcoCol] != null ? String(row[opcoCol]).trim() : '';
    if (!opcoName || opcoName.length < 3) continue;
    if (/^facility$/i.test(opcoName)) continue;

    const propertyName = row[propCol] != null ? String(row[propCol]).trim() : opcoName;
    const beds = typeof row[bedsCol] === 'number' ? row[bedsCol] as number : 0;

    result.set(opcoName, {
      opcoName,
      propertyName,
      stateBL: row[stateCol] != null ? String(row[stateCol]).trim() : '',
      leaseOwned: row[leaseCol] != null ? String(row[leaseCol]).trim() : '',
      group: row[groupCol] != null ? String(row[groupCol]).trim() : '',
      beds,
      businessLine: row[blCol] != null ? String(row[blCol]).trim() : '',
      businessLineDetail: row[blDetailCol] != null ? String(row[blDetailCol]).trim() : '',
    });
  }

  return result;
}

// ============================================================================
// MATCHING HELPERS
// ============================================================================

function findMappingEntry(
  facilityName: string,
  mapping?: Map<string, FacilityMappingEntry>,
): FacilityMappingEntry | undefined {
  if (!mapping) return undefined;

  // Direct match
  const direct = mapping.get(facilityName);
  if (direct) return direct;

  // Fuzzy match on opco name or property name
  const normalized = facilityName.toLowerCase().trim();
  for (const [, entry] of mapping) {
    const opcoNorm = entry.opcoName.toLowerCase().trim();
    const propNorm = entry.propertyName.toLowerCase().trim();

    if (opcoNorm === normalized || propNorm === normalized) return entry;

    // Partial match (first 8 chars)
    const facShort = normalized.substring(0, 8);
    if (opcoNorm.includes(facShort) || propNorm.includes(facShort)) return entry;

    const opcoShort = opcoNorm.replace(/\s*\(opco\)/i, '').substring(0, 8);
    if (normalized.includes(opcoShort)) return entry;
  }

  return undefined;
}

function findSummaryEntry(
  facilityName: string,
  summaryFacilities: Map<string, { opcoName: string; revenue: number; ebitdar: number; netIncome: number }>,
  facilityMapping?: Map<string, FacilityMappingEntry>,
): { opcoName: string; revenue: number; ebitdar: number; netIncome: number } | undefined {
  // Direct match
  for (const [opcoName, data] of summaryFacilities) {
    if (opcoName.toLowerCase() === facilityName.toLowerCase()) return data;
  }

  // Try via mapping: facilityName (property name) → opcoName
  if (facilityMapping) {
    for (const [, entry] of facilityMapping) {
      if (entry.propertyName.toLowerCase() === facilityName.toLowerCase()) {
        return summaryFacilities.get(entry.opcoName);
      }
    }
  }

  // Fuzzy
  const normalized = facilityName.toLowerCase().trim();
  for (const [opcoName, data] of summaryFacilities) {
    const opcoShort = opcoName.toLowerCase().replace(/\s*\(opco\)/i, '').trim();
    if (normalized.includes(opcoShort.substring(0, 8)) || opcoShort.includes(normalized.substring(0, 8))) {
      return data;
    }
  }

  return undefined;
}

// ============================================================================
// LEGACY: PARSE SINGLE SHEET (for per-facility sheets and non-flat formats)
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

  // Detect column structure
  const columnMap = detectColumnStructure(data);
  if (!columnMap) {
    warnings.push(`Could not detect column structure in sheet "${sheet.sheetName}"`);
    return { facilities: [], warnings, periods };
  }

  // Detect period headers
  periods.push(...detectPeriodHeaders(data, columnMap));

  // Find facility section boundaries
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

  // Parse each section
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

      const rawGLCode = row[columnMap.glCodeCol];
      const glCode = rawGLCode != null ? normalizeGLCode(String(rawGLCode)) : null;

      const rawLabel = row[columnMap.labelCol];
      const label = rawLabel != null ? String(rawLabel).trim() : '';
      if (!label && !glCode) continue;

      const annualValue = parseNumericCell(row[columnMap.annualCol]);
      const monthlyValue = columnMap.monthlyCol != null ? parseNumericCell(row[columnMap.monthlyCol]) : undefined;
      const ppdValue = columnMap.ppdCol != null ? parseNumericCell(row[columnMap.ppdCol]) : undefined;
      const budgetAnnual = columnMap.budgetAnnualCol != null ? parseNumericCell(row[columnMap.budgetAnnualCol]) : undefined;
      const budgetPpd = columnMap.budgetPpdCol != null ? parseNumericCell(row[columnMap.budgetPpdCol]) : undefined;

      if (annualValue === 0 && (monthlyValue === undefined || monthlyValue === 0) && !label) continue;

      const category = categorizeLineItem(label, glCode);
      const { isSubtotal, isTotal } = detectTotalRow(label);

      let coaCode: string | undefined;
      let coaName: string | undefined;
      if (glCode && glMapping?.has(glCode)) {
        const mapped = glMapping.get(glCode)!;
        coaCode = mapped.coaCode;
        coaName = mapped.label;
      }
      if (glCode && label) {
        glCodeMapping.set(glCode, label);
      }

      lineItems.push({
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
      });

      for (const [key, pattern] of Object.entries(SUMMARY_ROW_PATTERNS)) {
        if (pattern.test(label)) {
          const metricKey = key as keyof typeof summaryMetrics;
          if (metricKey in summaryMetrics) {
            (summaryMetrics as Record<string, number>)[metricKey] = annualValue;
          }
        }
      }
    }

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

    if (lineItems.length > 0) {
      facilities.push({
        facilityName: section.facilityName,
        facilityType: section.facilityType,
        startRow: section.startRow,
        endRow: section.endRow,
        lineItems,
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

  // Fallback: detect by GL code pattern
  for (let i = 0; i < Math.min(30, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell != null && GL_CODE_PATTERN.test(String(cell).trim())) {
        const glCodeCol = j;
        const labelCol = j + 1;

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

  // Fallback for per-facility sheets: GL in col 0, value in col 1
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
          glCodeCol: labelCol === 1 ? 0 : -1,
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
// FACILITY SECTION DETECTION (for non-flat sheets)
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

    const hasGLCode = row[columnMap.glCodeCol] != null &&
      GL_CODE_LOOSE.test(String(row[columnMap.glCodeCol]).trim());
    if (hasGLCode) continue;

    for (const cell of row) {
      if (cell === null || cell === undefined) continue;
      const text = String(cell).trim();
      if (text.length < 3 || text.length > 100) continue;

      for (const pattern of FACILITY_HEADER_PATTERNS) {
        const match = text.match(pattern);
        if (match) {
          const name = match[1]?.trim() || text.replace(/\s*\([^)]*\)\s*$/, '').trim();
          const type = extractFacilityType(text);

          if (/^(total|subtotal|grand|section|category|revenue|expense|ebitda)/i.test(name)) continue;

          sectionStarts.push({ row: i, name, type });
          break;
        }
      }
    }
  }

  for (let i = 0; i < sectionStarts.length; i++) {
    const start = sectionStarts[i];
    const endRow = i + 1 < sectionStarts.length
      ? sectionStarts[i + 1].row - 1
      : data.length - 1;

    sections.push({
      facilityName: start.name,
      facilityType: start.type,
      startRow: start.row + 1,
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

  if (glCode) {
    const prefix = glCode.substring(0, 1);
    if (prefix === '4') return 'revenue';
    if (prefix === '5' || prefix === '6' || prefix === '7' || prefix === '8') return 'expense';
    if (prefix === '9') return 'census';
  }

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
  const cleaned = sheetName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (cleaned) return cleaned;

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

function detectPeriodHeaders(data: (string | number | null)[][], _columnMap: ColumnStructure): string[] {
  const periods: string[] = [];
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;
    for (const cell of row) {
      if (cell == null) continue;
      const text = String(cell);
      const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dateMatch) periods.push(text.trim());
      const monthMatch = text.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})/i);
      if (monthMatch) periods.push(text.trim());
    }
  }
  return [...new Set(periods)];
}
