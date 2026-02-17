/**
 * Asset Valuation Parser
 *
 * Parses asset valuation sheets that contain per-facility valuations
 * with cap rates, multipliers, bed counts, and SNC percentages.
 */

import type { SheetExtraction } from '../excel-extractor';
import type {
  AssetValuationEntry,
  AssetValuationResult,
  CascadiaPropertyType,
} from './types';

// ============================================================================
// PATTERNS
// ============================================================================

const SECTION_HEADERS: { pattern: RegExp; type: CascadiaPropertyType }[] = [
  { pattern: /snf\s*[-–—]\s*owned/i, type: 'SNF-Owned' },
  { pattern: /leased/i, type: 'Leased' },
  { pattern: /alf|al\/il|assisted\s*living|specific\s*needs|snc/i, type: 'ALF/SNC-Owned' },
];

const SUBTOTAL_PATTERN = /^(subtotal|total|grand\s*total)/i;
const NUMERIC_THRESHOLD = 0.01; // Min value to consider non-zero

// ============================================================================
// MAIN PARSER
// ============================================================================

export function parseAssetValuation(sheets: SheetExtraction[]): AssetValuationResult {
  const warnings: string[] = [];

  // Find the valuation sheet
  const valuationSheet = sheets.find(s =>
    /valuation/i.test(s.sheetName)
  ) || sheets.find(s =>
    s.sheetType === 'summary' || /summary|overview/i.test(s.sheetName)
  ) || sheets[0];

  if (!valuationSheet) {
    return { entries: [], categoryTotals: [], portfolioTotal: { facilityCount: 0, totalBeds: 0, totalValue: 0, avgValuePerBed: 0 }, warnings: ['No valuation sheet found'] };
  }

  const { data } = valuationSheet;

  // Detect column structure
  const columns = detectValuationColumns(data);
  if (!columns) {
    warnings.push('Could not detect valuation column structure');
    return { entries: [], categoryTotals: [], portfolioTotal: { facilityCount: 0, totalBeds: 0, totalValue: 0, avgValuePerBed: 0 }, warnings };
  }

  // Parse entries
  const entries: AssetValuationEntry[] = [];
  let currentType: CascadiaPropertyType = 'SNF-Owned';

  for (let i = columns.dataStartRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(c => c == null || c === '')) continue;

    // Check for section header
    const rowText = row.map(c => c != null ? String(c) : '').join(' ');
    const sectionMatch = SECTION_HEADERS.find(s => s.pattern.test(rowText));
    if (sectionMatch) {
      currentType = sectionMatch.type;
      continue;
    }

    // Skip subtotal rows
    const nameCell = row[columns.nameCol];
    if (nameCell != null && SUBTOTAL_PATTERN.test(String(nameCell).trim())) continue;

    // Extract facility name
    const name = nameCell != null ? String(nameCell).trim() : '';
    if (!name || name.length < 3) continue;

    // Skip if it looks like a header row
    if (/^(property|facility|name|#)\s*$/i.test(name)) continue;

    // Extract numeric fields
    const beds = parseNum(row[columns.bedsCol]);
    if (beds <= 0) continue; // Must have bed count

    const sncPercent = columns.sncCol != null ? parseNum(row[columns.sncCol]) : undefined;

    // EBITDA / NI values (try 2026 first, then 2025)
    let ebitda2026 = columns.ebitda2026Col != null ? parseNum(row[columns.ebitda2026Col]) : undefined;
    let ebitda2025 = columns.ebitda2025Col != null ? parseNum(row[columns.ebitda2025Col]) : undefined;
    let ni2026 = columns.ni2026Col != null ? parseNum(row[columns.ni2026Col]) : undefined;
    let ni2025 = columns.ni2025Col != null ? parseNum(row[columns.ni2025Col]) : undefined;

    // Cap rate or multiplier
    let capRate = columns.capRateCol != null ? parseNum(row[columns.capRateCol]) : undefined;
    let multiplier = columns.multiplierCol != null ? parseNum(row[columns.multiplierCol]) : undefined;

    // Auto-detect: if rate > 1, it's a multiplier; if < 1, it's a cap rate
    if (capRate && capRate > 1) {
      multiplier = capRate;
      capRate = undefined;
    }

    // Value columns
    const value2026 = columns.value2026Col != null ? parseNum(row[columns.value2026Col]) : undefined;
    const value2025 = columns.value2025Col != null ? parseNum(row[columns.value2025Col]) : undefined;
    const vpb2026 = columns.vpb2026Col != null ? parseNum(row[columns.vpb2026Col]) : undefined;
    const vpb2025 = columns.vpb2025Col != null ? parseNum(row[columns.vpb2025Col]) : undefined;

    entries.push({
      facilityName: name,
      propertyType: currentType,
      beds,
      sncPercent: sncPercent != null ? sncPercent : undefined,
      capRate,
      multiplier,
      ebitda2025,
      ebitda2026,
      netIncome2025: ni2025,
      netIncome2026: ni2026,
      value2025,
      value2026,
      valuePerBed2025: vpb2025,
      valuePerBed2026: vpb2026,
    });
  }

  // Also try to parse LOI sheet for city/state data
  const loiSheet = sheets.find(s => /loi/i.test(s.sheetName));
  if (loiSheet) {
    enrichWithLOIData(entries, loiSheet);
  }

  // Build category totals
  const categoryMap = new Map<CascadiaPropertyType, AssetValuationEntry[]>();
  for (const entry of entries) {
    const list = categoryMap.get(entry.propertyType) || [];
    list.push(entry);
    categoryMap.set(entry.propertyType, list);
  }

  const categoryTotals = Array.from(categoryMap.entries()).map(([type, list]) => {
    const totalBeds = list.reduce((s, e) => s + e.beds, 0);
    const totalValue = list.reduce((s, e) => s + (e.value2026 || 0), 0);
    return {
      category: type,
      facilityCount: list.length,
      totalBeds,
      totalValue,
      avgValuePerBed: totalBeds > 0 ? totalValue / totalBeds : 0,
      valuationMethod: type === 'Leased' ? 'NI × Multiplier' : 'EBITDA / Cap Rate',
    };
  });

  const portfolioTotal = {
    facilityCount: entries.length,
    totalBeds: entries.reduce((s, e) => s + e.beds, 0),
    totalValue: entries.reduce((s, e) => s + (e.value2026 || 0), 0),
    avgValuePerBed: 0,
  };
  portfolioTotal.avgValuePerBed = portfolioTotal.totalBeds > 0
    ? portfolioTotal.totalValue / portfolioTotal.totalBeds
    : 0;

  return { entries, categoryTotals, portfolioTotal, warnings };
}

// ============================================================================
// COLUMN DETECTION
// ============================================================================

interface ValuationColumns {
  nameCol: number;
  bedsCol: number;
  sncCol?: number;
  ebitda2025Col?: number;
  ebitda2026Col?: number;
  ni2025Col?: number;
  ni2026Col?: number;
  capRateCol?: number;
  multiplierCol?: number;
  value2025Col?: number;
  value2026Col?: number;
  vpb2025Col?: number;
  vpb2026Col?: number;
  dataStartRow: number;
}

function detectValuationColumns(data: (string | number | null)[][]): ValuationColumns | null {
  // Scan first 10 rows for headers
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    let nameCol = -1;
    let bedsCol = -1;
    let sncCol: number | undefined;
    let ebitdaCols: number[] = [];
    let niCols: number[] = [];
    let capRateCol: number | undefined;
    let multiplierCol: number | undefined;
    let valueCols: number[] = [];
    let vpbCols: number[] = [];

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell == null) continue;
      const text = String(cell).toLowerCase().trim();

      if (/^(property|facility|name)$/i.test(text) && nameCol === -1) nameCol = j;
      if (/^(beds?|total\s*beds?|licensed)$/i.test(text) && bedsCol === -1) bedsCol = j;
      if (/snc|specific\s*need/i.test(text)) sncCol = j;
      if (/ebitda/i.test(text)) ebitdaCols.push(j);
      if (/\bni\b|net\s*income/i.test(text)) niCols.push(j);
      if (/cap\s*rate/i.test(text)) capRateCol = j;
      if (/multiplier|multiple/i.test(text)) multiplierCol = j;
      if (/^value$|total\s*value/i.test(text)) valueCols.push(j);
      if (/\$\/bed|value\s*per\s*bed|per\s*bed/i.test(text)) vpbCols.push(j);
    }

    if (nameCol === -1) {
      // Try to find name column by looking at next row's content
      const nextRow = data[i + 1];
      if (nextRow) {
        for (let j = 0; j < nextRow.length; j++) {
          if (typeof nextRow[j] === 'string' && (nextRow[j] as string).length > 5) {
            nameCol = j;
            break;
          }
        }
      }
    }

    if (bedsCol === -1) {
      // Look for a column with small integers (20-200 range)
      const nextRow = data[i + 1];
      if (nextRow) {
        for (let j = 0; j < nextRow.length; j++) {
          if (typeof nextRow[j] === 'number' && (nextRow[j] as number) >= 10 && (nextRow[j] as number) <= 500) {
            bedsCol = j;
            break;
          }
        }
      }
    }

    if (nameCol !== -1 && bedsCol !== -1) {
      return {
        nameCol,
        bedsCol,
        sncCol,
        ebitda2025Col: ebitdaCols[0],
        ebitda2026Col: ebitdaCols.length > 1 ? ebitdaCols[1] : ebitdaCols[0],
        ni2025Col: niCols[0],
        ni2026Col: niCols.length > 1 ? niCols[1] : niCols[0],
        capRateCol: capRateCol ?? multiplierCol, // Same column, differentiated by value
        multiplierCol,
        value2025Col: valueCols[0],
        value2026Col: valueCols.length > 1 ? valueCols[1] : valueCols[0],
        vpb2025Col: vpbCols[0],
        vpb2026Col: vpbCols.length > 1 ? vpbCols[1] : vpbCols[0],
        dataStartRow: i + 1,
      };
    }
  }

  // Fallback: assume standard layout
  // Property | Beds | SNC% | blank | 2025 EBITDA | Cap Rate | 2025 Value | 2025 $/Bed | blank | 2026 EBITDA | Cap Rate | 2026 Value | 2026 $/Bed
  return {
    nameCol: 1,
    bedsCol: 2,
    sncCol: 3,
    ebitda2025Col: 6,
    capRateCol: 7,
    value2025Col: 8,
    vpb2025Col: 9,
    ebitda2026Col: 11,
    value2026Col: 13,
    vpb2026Col: 14,
    dataStartRow: 7,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function parseNum(cell: string | number | null | undefined): number {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === 'number') return cell;
  const cleaned = String(cell).replace(/[$,\s%]/g, '').replace(/\(([^)]+)\)/, '-$1');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function enrichWithLOIData(entries: AssetValuationEntry[], loiSheet: SheetExtraction): void {
  const { data } = loiSheet;

  // Build a name-to-row map from LOI sheet
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    // Look for facility name
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (typeof cell !== 'string' || cell.length < 5) continue;

      // Try to match against known entries
      const entry = entries.find(e =>
        cell.toLowerCase().includes(e.facilityName.toLowerCase().substring(0, 10))
      );

      if (entry) {
        // Look for city/state in adjacent cells
        for (let k = j + 1; k < Math.min(j + 5, row.length); k++) {
          const val = row[k];
          if (typeof val !== 'string') continue;
          const text = val.trim();

          // Check for state abbreviation
          if (/^[A-Z]{2}$/.test(text) && !entry.state) {
            entry.state = text;
          }
          // Check for city (capitalized word, not a state)
          if (/^[A-Z][a-z]/.test(text) && text.length > 3 && !entry.city) {
            entry.city = text;
          }
        }
      }
    }
  }
}
