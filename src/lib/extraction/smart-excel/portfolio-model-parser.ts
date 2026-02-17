/**
 * Portfolio Model Parser
 *
 * Parses multi-scenario portfolio workbooks (like Sapphire.xlsx) that contain:
 * - Scenario sheets ("Current State Occupancy", "85% Occupancy")
 * - Entity group rollups (OR-SNFOwned, WA-AL/IL/MCOwned, etc.)
 * - Individual facility sheets
 * - Revenue/expense breakdowns by entity group
 */

import type { SheetExtraction } from '../excel-extractor';
import type {
  PortfolioModelResult,
  PortfolioScenario,
  PortfolioEntityGroup,
  PortfolioFinancials,
  T13FacilitySection,
  GLMappingEntry,
} from './types';
import { parseT13 } from './t13-parser';

// ============================================================================
// PATTERNS
// ============================================================================

const SCENARIO_SHEETS = [
  { pattern: /current\s*state/i, name: 'Current State' },
  { pattern: /85%?\s*occupancy/i, name: '85% Occupancy' },
  { pattern: /stabilized/i, name: 'Stabilized' },
  { pattern: /pro\s*forma/i, name: 'Pro Forma' },
];

const ENTITY_GROUP_PATTERN = /^(OR|WA|ID|MT|CA|AZ)-\s*(.+)/i;

const ROLLUP_SHEET = /rollup|roll-up|consolidated/i;

const FINANCIAL_LABELS: Record<string, RegExp> = {
  totalRevenue: /^total\s*(?:patient\s*service\s*)?revenue/i,
  totalExpenses: /^total\s*(?:operating\s*)?expenses?/i,
  ebitdar: /^ebitdar\b/i,
  ebitda: /^ebitda(?!r)\b/i,
  managementFee: /management\s*fee/i,
  leaseExpense: /lease|rent\s*expense/i,
};

// ============================================================================
// MAIN PARSER
// ============================================================================

export function parsePortfolioModel(
  sheets: SheetExtraction[],
  glMapping?: Map<string, GLMappingEntry>,
): PortfolioModelResult {
  const warnings: string[] = [];

  // Identify scenario sheets
  const scenarios: PortfolioScenario[] = [];

  for (const scenarioDef of SCENARIO_SHEETS) {
    const scenarioSheet = sheets.find(s => scenarioDef.pattern.test(s.sheetName));
    if (scenarioSheet) {
      const scenario = parseScenarioSheet(scenarioSheet, scenarioDef.name);
      if (scenario) {
        scenarios.push(scenario);
      }
    }
  }

  // Parse rollup sheet
  const rollupSheet = sheets.find(s => ROLLUP_SHEET.test(s.sheetName));
  if (rollupSheet && scenarios.length === 0) {
    const scenario = parseScenarioSheet(rollupSheet, 'Rollup');
    if (scenario) {
      scenarios.push(scenario);
    }
  }

  // Parse individual facility sheets using T13 parser
  const facilitySheetNames = sheets.filter(s => {
    // Not a scenario, rollup, or mapping sheet
    const isSpecial = SCENARIO_SHEETS.some(sc => sc.pattern.test(s.sheetName)) ||
      ROLLUP_SHEET.test(s.sheetName) ||
      /mapping|map|crosswalk/i.test(s.sheetName);
    return !isSpecial && s.rowCount > 10;
  });

  const individualFacilities = new Map<string, T13FacilitySection>();

  if (facilitySheetNames.length > 0) {
    const t13Result = parseT13(facilitySheetNames, glMapping);
    for (const fac of t13Result.facilities) {
      individualFacilities.set(fac.facilityName, fac);
    }
    warnings.push(...t13Result.warnings);
  }

  // Check for mapping sheet
  let mappingSheet: Map<string, GLMappingEntry> | undefined;
  const mapSheet = sheets.find(s => /mapping|map|crosswalk/i.test(s.sheetName));
  if (mapSheet && glMapping) {
    mappingSheet = glMapping;
  }

  if (scenarios.length === 0 && individualFacilities.size === 0) {
    warnings.push('No scenario sheets or facility data found in portfolio model');
  }

  return {
    scenarios,
    individualFacilities,
    mappingSheet,
    warnings,
  };
}

// ============================================================================
// SCENARIO SHEET PARSER
// ============================================================================

function parseScenarioSheet(
  sheet: SheetExtraction,
  scenarioName: string,
): PortfolioScenario | null {
  const { data } = sheet;
  if (!data || data.length < 5) return null;

  // Detect column structure (Label | Annual | Monthly | PPD)
  const colMap = detectScenarioColumns(data);
  if (!colMap) return null;

  // Find entity groups
  const entityGroups: PortfolioEntityGroup[] = [];
  const groupBoundaries = findEntityGroupBoundaries(data, colMap);

  for (const boundary of groupBoundaries) {
    const financials = extractGroupFinancials(data, boundary, colMap);
    if (financials) {
      entityGroups.push({
        groupName: boundary.groupName,
        financials,
      });
    }
  }

  // Extract overall totals
  const totals = extractOverallTotals(data, colMap);

  return {
    name: scenarioName,
    sheetName: sheet.sheetName,
    entityGroups,
    totals: totals || createEmptyFinancials(),
  };
}

// ============================================================================
// COLUMN DETECTION
// ============================================================================

interface ScenarioColumnMap {
  labelCol: number;
  annualCol: number;
  monthlyCol?: number;
  ppdCol?: number;
  dataStartRow: number;
}

function detectScenarioColumns(data: (string | number | null)[][]): ScenarioColumnMap | null {
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    let annualCol = -1;
    let monthlyCol: number | undefined;
    let ppdCol: number | undefined;
    let labelCol = -1;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell == null) continue;
      const text = String(cell).toLowerCase().trim();

      if (/^(annual|actual|total)\s*$/i.test(text) && annualCol === -1) annualCol = j;
      if (/^monthly/i.test(text) && !monthlyCol) monthlyCol = j;
      if (/^ppd|per\s*patient/i.test(text) && !ppdCol) ppdCol = j;
      if (/^(description|label|item|category)$/i.test(text)) labelCol = j;
    }

    if (annualCol !== -1) {
      if (labelCol === -1) labelCol = annualCol > 0 ? annualCol - 1 : 0;
      return { labelCol, annualCol, monthlyCol, ppdCol, dataStartRow: i + 1 };
    }
  }

  // Fallback: look for numeric data pattern
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    const hasText = row.some(c => typeof c === 'string' && c.length > 3);
    const hasLargeNumber = row.some(c => typeof c === 'number' && Math.abs(c) > 1000);

    if (hasText && hasLargeNumber) {
      let labelCol = 0;
      let annualCol = -1;

      for (let j = 0; j < row.length; j++) {
        if (typeof row[j] === 'string' && String(row[j]).length > 3) {
          labelCol = j;
        }
        if (typeof row[j] === 'number' && Math.abs(row[j] as number) > 1000 && annualCol === -1) {
          annualCol = j;
        }
      }

      if (annualCol !== -1) {
        return { labelCol, annualCol, dataStartRow: i };
      }
    }
  }

  return null;
}

// ============================================================================
// ENTITY GROUP DETECTION
// ============================================================================

interface GroupBoundary {
  groupName: string;
  startRow: number;
  endRow: number;
}

function findEntityGroupBoundaries(
  data: (string | number | null)[][],
  colMap: ScenarioColumnMap,
): GroupBoundary[] {
  const boundaries: GroupBoundary[] = [];
  const starts: { row: number; name: string }[] = [];

  for (let i = colMap.dataStartRow; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    // Check for entity group header
    const labelCell = row[colMap.labelCol];
    if (labelCell == null) continue;
    const text = String(labelCell).trim();

    const groupMatch = text.match(ENTITY_GROUP_PATTERN);
    if (groupMatch) {
      starts.push({ row: i, name: text });
      continue;
    }

    // Also check for standalone group identifiers
    if (/^(SNF\s*-?\s*Owned|Leased|AL\/IL|SNC|Mixed)/i.test(text)) {
      const nonEmpty = row.filter(c => c != null && c !== '' && c !== 0).length;
      if (nonEmpty <= 3) {
        starts.push({ row: i, name: text });
      }
    }
  }

  // Convert to boundaries
  for (let i = 0; i < starts.length; i++) {
    const endRow = i + 1 < starts.length ? starts[i + 1].row - 1 : data.length - 1;
    boundaries.push({
      groupName: starts[i].name,
      startRow: starts[i].row + 1,
      endRow,
    });
  }

  return boundaries;
}

// ============================================================================
// FINANCIAL EXTRACTION
// ============================================================================

function extractGroupFinancials(
  data: (string | number | null)[][],
  boundary: GroupBoundary,
  colMap: ScenarioColumnMap,
): PortfolioFinancials | null {
  const financials = createEmptyFinancials();
  const revenueItems: PortfolioFinancials['revenueBreakdown'] = [];
  const expenseItems: PortfolioFinancials['expenseBreakdown'] = [];
  let inRevenue = true;

  for (let i = boundary.startRow; i <= Math.min(boundary.endRow, data.length - 1); i++) {
    const row = data[i];
    if (!row) continue;

    const label = row[colMap.labelCol] != null ? String(row[colMap.labelCol]).trim() : '';
    if (!label) continue;

    const annual = typeof row[colMap.annualCol] === 'number' ? row[colMap.annualCol] as number : 0;
    const monthly = colMap.monthlyCol != null && typeof row[colMap.monthlyCol] === 'number'
      ? row[colMap.monthlyCol] as number : undefined;
    const ppd = colMap.ppdCol != null && typeof row[colMap.ppdCol] === 'number'
      ? row[colMap.ppdCol] as number : undefined;

    // Check for summary labels
    if (FINANCIAL_LABELS.totalRevenue.test(label)) {
      financials.totalRevenue = { annual, monthly, ppd };
      inRevenue = false;
      continue;
    }
    if (FINANCIAL_LABELS.totalExpenses.test(label)) {
      inRevenue = false;
      continue;
    }
    if (FINANCIAL_LABELS.ebitdar.test(label)) {
      financials.ebitdar = { annual, monthly, ppd };
      continue;
    }
    if (FINANCIAL_LABELS.ebitda.test(label)) {
      financials.ebitda = { annual, monthly, ppd };
      continue;
    }
    if (FINANCIAL_LABELS.managementFee.test(label)) {
      financials.managementFee = { annual };
      continue;
    }
    if (FINANCIAL_LABELS.leaseExpense.test(label)) {
      financials.leaseExpense = { annual };
      continue;
    }

    // Classify as revenue or expense
    if (annual !== 0) {
      const item = { label, annual, monthly, ppd };
      if (inRevenue) {
        revenueItems.push(item);
      } else {
        expenseItems.push(item);
      }
    }
  }

  financials.revenueBreakdown = revenueItems;
  financials.expenseBreakdown = expenseItems;

  // Compute margins
  if (financials.totalRevenue.annual > 0) {
    if (financials.ebitdar.annual) {
      financials.ebitdar.margin = financials.ebitdar.annual / financials.totalRevenue.annual;
    }
    if (financials.ebitda.annual) {
      financials.ebitda.margin = financials.ebitda.annual / financials.totalRevenue.annual;
    }
  }

  return financials;
}

function extractOverallTotals(
  data: (string | number | null)[][],
  colMap: ScenarioColumnMap,
): PortfolioFinancials | null {
  const financials = createEmptyFinancials();
  let found = false;

  // Look for grand total or portfolio total rows
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const label = row[colMap.labelCol] != null ? String(row[colMap.labelCol]).trim() : '';
    if (!label) continue;

    if (/grand\s*total|portfolio\s*total|total\s*portfolio/i.test(label)) {
      found = true;
      // This row or nearby rows contain totals
      const annual = typeof row[colMap.annualCol] === 'number' ? row[colMap.annualCol] as number : 0;
      const monthly = colMap.monthlyCol != null && typeof row[colMap.monthlyCol] === 'number'
        ? row[colMap.monthlyCol] as number : undefined;

      financials.totalRevenue = { annual, monthly };
      break;
    }
  }

  // Scan for EBITDA/EBITDAR totals
  for (let i = data.length - 30; i < data.length; i++) {
    if (i < 0) continue;
    const row = data[i];
    if (!row) continue;

    const label = row[colMap.labelCol] != null ? String(row[colMap.labelCol]).trim() : '';
    const annual = typeof row[colMap.annualCol] === 'number' ? row[colMap.annualCol] as number : 0;
    const monthly = colMap.monthlyCol != null && typeof row[colMap.monthlyCol] === 'number'
      ? row[colMap.monthlyCol] as number : undefined;

    if (/total.*ebitdar|ebitdar.*total|^ebitdar$/i.test(label)) {
      financials.ebitdar = { annual, monthly };
      found = true;
    }
    if (/total.*ebitda(?!r)|ebitda(?!r).*total|^ebitda$/i.test(label)) {
      financials.ebitda = { annual, monthly };
      found = true;
    }
  }

  return found ? financials : null;
}

// ============================================================================
// HELPERS
// ============================================================================

function createEmptyFinancials(): PortfolioFinancials {
  return {
    totalRevenue: { annual: 0 },
    revenueBreakdown: [],
    expenseBreakdown: [],
    ebitdar: { annual: 0 },
    ebitda: { annual: 0 },
  };
}
