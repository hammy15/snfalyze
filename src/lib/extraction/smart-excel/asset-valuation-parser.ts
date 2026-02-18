/**
 * Asset Valuation Parser
 *
 * Parses asset valuation sheets that contain per-facility valuations
 * with cap rates, multipliers, bed counts, and SNC percentages.
 *
 * Key design decisions:
 * - Section subtotals appear AFTER entries (e.g., "SNF - Owned" row comes
 *   after the 6 SNF entries), so we use two-pass parsing:
 *   Phase 1: Collect entries and section boundary rows
 *   Phase 2: Assign property types retroactively — each entry gets the type
 *   of the NEXT section boundary after it
 * - The same column holds EBITDA (for owned) or NI (for leased); we detect
 *   this from cap rate vs multiplier values
 * - Values may be in thousands (common in institutional spreadsheets);
 *   we auto-detect and scale by 1000 when detected
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
const PORTFOLIO_TOTAL_PATTERN = /total\s*portfolio/i;
const HEADER_ROW_PATTERN = /^(property|facility|name|#)\s*$/i;
const HEADER_CONTENT_PATTERN = /^(ebitda|cap\s*rate|multiplier|value\s*per|net\s*income|\bni\b|total\s*value|value\s*per\s*bed)/i;

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
    return emptyResult(['No valuation sheet found']);
  }

  const { data } = valuationSheet;

  // Detect column structure
  const columns = detectValuationColumns(data);
  if (!columns) {
    warnings.push('Could not detect valuation column structure');
    return emptyResult(warnings);
  }

  // ========================================================================
  // PHASE 1: Parse all rows, collecting entries and section boundaries
  // ========================================================================

  const rawEntries: { rowIndex: number; entry: AssetValuationEntry }[] = [];
  const sectionBoundaries: { rowIndex: number; type: CascadiaPropertyType }[] = [];

  for (let i = columns.dataStartRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every(c => c == null || c === '')) continue;

    // Only use the label columns (before beds) for section header matching —
    // NOT the full row, which includes notes columns with "SNC:", "leased", etc.
    // that cause false positive boundary detection.
    const nameCell = row[columns.nameCol];
    const nameText = nameCell != null ? String(nameCell).trim() : '';

    // Build label text from columns before the beds column (the structured label area)
    const labelEndCol = Math.max(columns.bedsCol, (columns.nameCol || 0) + 1);
    const labelText = row.slice(0, labelEndCol)
      .map(c => c != null ? String(c) : '').join(' ');

    // Skip "Total Portfolio" row
    if (PORTFOLIO_TOTAL_PATTERN.test(labelText)) continue;

    // Check for section boundary (subtotal that names a property type)
    // Only match against label columns to avoid false positives from notes
    const sectionMatch = SECTION_HEADERS.find(s => s.pattern.test(labelText));
    if (sectionMatch) {
      // Extra validation: section boundary rows are subtotal rows — they typically
      // have aggregated values but no individual facility name pattern.
      // If a row has a normal facility name AND a bed count, it's a data row not a boundary.
      const hasBeds = parseNum(row[columns.bedsCol]) > 0;
      const looksLikeFacility = nameText.length > 5 && !/^(subtotal|total|snf|alf|al\/|leased|owned|specific)/i.test(nameText);
      if (!looksLikeFacility || !hasBeds) {
        sectionBoundaries.push({ rowIndex: i, type: sectionMatch.type });
        continue;
      }
    }
    // Skip subtotal rows
    if (SUBTOTAL_PATTERN.test(nameText)) continue;

    // Extract facility name
    const name = nameText;
    if (!name || name.length < 3) continue;

    // Skip header rows
    if (HEADER_ROW_PATTERN.test(name)) continue;
    // Skip secondary header rows (e.g., "2025 NI | Multiplier | ...")
    if (HEADER_CONTENT_PATTERN.test(name)) continue;

    // Extract numeric fields
    const beds = parseNum(row[columns.bedsCol]);
    if (beds <= 0) continue; // Must have bed count

    const sncPercent = columns.sncCol != null ? parseNum(row[columns.sncCol]) : undefined;

    // Read the "metric" column — could be EBITDA or NI depending on section
    const rawMetric2025 = columns.ebitda2025Col != null ? parseNum(row[columns.ebitda2025Col]) : 0;
    const rawMetric2026 = columns.ebitda2026Col != null ? parseNum(row[columns.ebitda2026Col]) : 0;

    // Cap rate or multiplier (same column position, differentiated by value)
    const rawRate = columns.capRateCol != null ? parseNum(row[columns.capRateCol]) : 0;

    // Skip metadata rows that have beds but no financial data at all
    // (e.g., "SNC Beds" row with only a bed count)
    if (rawMetric2025 === 0 && rawMetric2026 === 0 && rawRate === 0) continue;

    // Value columns
    const value2025 = columns.value2025Col != null ? parseNum(row[columns.value2025Col]) : undefined;
    const value2026 = columns.value2026Col != null ? parseNum(row[columns.value2026Col]) : undefined;
    const vpb2025 = columns.vpb2025Col != null ? parseNum(row[columns.vpb2025Col]) : undefined;
    const vpb2026 = columns.vpb2026Col != null ? parseNum(row[columns.vpb2026Col]) : undefined;

    // Determine if this is EBITDA/cap rate or NI/multiplier based on the rate value
    let ebitda2025: number | undefined;
    let ebitda2026: number | undefined;
    let ni2025: number | undefined;
    let ni2026: number | undefined;
    let capRate: number | undefined;
    let multiplier: number | undefined;

    if (rawRate > 1) {
      // Rate > 1 means it's a multiplier → NI-based entry (Leased)
      multiplier = rawRate;
      ni2025 = rawMetric2025 || undefined;
      ni2026 = rawMetric2026 || undefined;
    } else if (rawRate > 0) {
      // Rate between 0 and 1 means it's a cap rate → EBITDA-based entry
      capRate = rawRate;
      ebitda2025 = rawMetric2025 || undefined;
      ebitda2026 = rawMetric2026 || undefined;
    } else {
      // No rate detected — assign to EBITDA by default
      ebitda2025 = rawMetric2025 || undefined;
      ebitda2026 = rawMetric2026 || undefined;
    }

    // Read notes from any text column after the main data
    let notes: string | undefined;
    for (let j = 15; j < row.length; j++) {
      if (typeof row[j] === 'string' && (row[j] as string).length > 5) {
        notes = String(row[j]).substring(0, 200);
        break;
      }
    }

    rawEntries.push({
      rowIndex: i,
      entry: {
        facilityName: name,
        propertyType: 'SNF-Owned', // Placeholder — assigned in Phase 2
        beds,
        sncPercent: sncPercent != null && sncPercent > 0 ? sncPercent : undefined,
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
        notes,
      },
    });
  }

  // ========================================================================
  // PHASE 2: Assign property types using section boundaries
  //
  // Section subtotals appear AFTER their entries:
  //   Rows 6-11  → entries (SNF-Owned)
  //   Row 12     → "SNF - Owned" subtotal
  //   Rows 15-19 → entries (Leased)
  //   Row 20     → "SNF/AL/IL - Leased" subtotal
  //   Rows 22-33 → entries (ALF/SNC-Owned)
  //   Row 34     → "ALF / Specific Needs - Owned" subtotal
  //
  // Each entry gets the type of the NEXT boundary that follows it.
  // ========================================================================

  for (const re of rawEntries) {
    const nextBoundary = sectionBoundaries.find(b => b.rowIndex > re.rowIndex);
    if (nextBoundary) {
      re.entry.propertyType = nextBoundary.type;
    } else {
      // After all boundaries — auto-detect from cap rate/multiplier
      re.entry.propertyType = autoDetectPropertyType(re.entry);
    }
  }

  const entries = rawEntries.map(r => r.entry);

  // ========================================================================
  // PHASE 3: Detect and apply values-in-thousands scaling
  //
  // Institutional spreadsheets often show values in thousands.
  // Detection: if average value-per-bed < $5,000, values are in thousands
  // (real VPB is $100K-$700K; in thousands notation that's 100-700).
  // ========================================================================

  scaleIfThousands(entries, warnings);

  // Enrich with LOI sheet data (city/state)
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
    const totalValue = list.reduce((s, e) => s + (e.value2026 || e.value2025 || 0), 0);
    return {
      category: type,
      facilityCount: list.length,
      totalBeds,
      totalValue,
      avgValuePerBed: totalBeds > 0 ? totalValue / totalBeds : 0,
      valuationMethod: type === 'Leased' ? 'EBIT × Multiplier' : 'EBITDAR / Cap Rate',
    };
  });

  const portfolioTotal = {
    facilityCount: entries.length,
    totalBeds: entries.reduce((s, e) => s + e.beds, 0),
    totalValue: entries.reduce((s, e) => s + (e.value2026 || e.value2025 || 0), 0),
    avgValuePerBed: 0,
  };
  portfolioTotal.avgValuePerBed = portfolioTotal.totalBeds > 0
    ? portfolioTotal.totalValue / portfolioTotal.totalBeds
    : 0;

  if (entries.length > 0) {
    warnings.push(`Parsed ${entries.length} entries from asset valuation`);
    warnings.push(`Portfolio: ${portfolioTotal.totalBeds} beds, $${(portfolioTotal.totalValue / 1e6).toFixed(1)}M`);
  }

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
  capRateCol?: number;
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
    let capRateCol: number | undefined;
    let valueCols: number[] = [];
    let vpbCols: number[] = [];

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell == null) continue;
      const text = String(cell).toLowerCase().trim();

      if (/^(property|facility|name)$/i.test(text) && nameCol === -1) nameCol = j;
      // Broader beds matching: "Total Beds / Units", "Beds", "Licensed Beds", etc.
      if (/\bbeds?\b|\blicensed\b|\bunits?\b/i.test(text) && bedsCol === -1) bedsCol = j;
      if (/snc|specific\s*need/i.test(text)) sncCol = j;
      if (/ebitda/i.test(text)) ebitdaCols.push(j);
      if (/\bni\b|net\s*income/i.test(text)) ebitdaCols.push(j); // NI uses same column position
      if (/cap\s*rate|multiplier|multiple/i.test(text) && !capRateCol) capRateCol = j;
      if (/^value$|total\s*value/i.test(text)) valueCols.push(j);
      if (/\$\/bed|value\s*per\s*bed|per\s*bed/i.test(text)) vpbCols.push(j);
    }

    if (nameCol === -1) {
      // Try to find name column from next row's content
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
      // Look for a column with small integers (20-500 range) in the next row
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
        capRateCol,
        value2025Col: valueCols[0],
        value2026Col: valueCols.length > 1 ? valueCols[1] : valueCols[0],
        vpb2025Col: vpbCols[0],
        vpb2026Col: vpbCols.length > 1 ? vpbCols[1] : vpbCols[0],
        dataStartRow: i + 1,
      };
    }
  }

  // Fallback: assume Sapphire-style layout
  return {
    nameCol: 2,
    bedsCol: 3,
    sncCol: 4,
    ebitda2025Col: 6,
    capRateCol: 7,
    value2025Col: 8,
    vpb2025Col: 9,
    ebitda2026Col: 11,
    value2026Col: 13,
    vpb2026Col: 14,
    dataStartRow: 6,
  };
}

// ============================================================================
// AUTO-DETECT PROPERTY TYPE
// ============================================================================

function autoDetectPropertyType(entry: AssetValuationEntry): CascadiaPropertyType {
  if (entry.multiplier && entry.multiplier > 1) return 'Leased';
  if (entry.capRate) {
    if (entry.capRate >= 0.11 && entry.capRate <= 0.14) return 'SNF-Owned';
    if (entry.capRate >= 0.07 && entry.capRate <= 0.13) return 'ALF/SNC-Owned';
  }
  return 'SNF-Owned';
}

// ============================================================================
// VALUES-IN-THOUSANDS DETECTION & SCALING
// ============================================================================

function scaleIfThousands(entries: AssetValuationEntry[], warnings: string[]): void {
  if (entries.length === 0) return;

  // Calculate average value per bed across all entries
  let totalValue = 0;
  let totalBeds = 0;

  for (const e of entries) {
    const val = e.value2026 || e.value2025 || 0;
    if (val > 0 && e.beds > 0) {
      totalValue += val;
      totalBeds += e.beds;
    }
  }

  if (totalBeds === 0) return;

  const avgVPB = totalValue / totalBeds;

  // Real value per bed is typically $100K-$700K
  // In thousands notation, that's 100-700 (avgVPB < 5000)
  // If avgVPB is already > $5,000, values are likely in actual dollars
  if (avgVPB < 5000) {
    const scale = 1000;
    warnings.push(`Values detected in thousands — scaling by ${scale}x`);

    for (const e of entries) {
      if (e.ebitda2025 != null) e.ebitda2025 *= scale;
      if (e.ebitda2026 != null) e.ebitda2026 *= scale;
      if (e.netIncome2025 != null) e.netIncome2025 *= scale;
      if (e.netIncome2026 != null) e.netIncome2026 *= scale;
      if (e.value2025 != null) e.value2025 *= scale;
      if (e.value2026 != null) e.value2026 *= scale;
      if (e.valuePerBed2025 != null) e.valuePerBed2025 *= scale;
      if (e.valuePerBed2026 != null) e.valuePerBed2026 *= scale;
    }
  }
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

function emptyResult(warnings: string[]): AssetValuationResult {
  return {
    entries: [],
    categoryTotals: [],
    portfolioTotal: { facilityCount: 0, totalBeds: 0, totalValue: 0, avgValuePerBed: 0 },
    warnings,
  };
}

function enrichWithLOIData(entries: AssetValuationEntry[], loiSheet: SheetExtraction): void {
  const { data } = loiSheet;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (typeof cell !== 'string' || cell.length < 5) continue;

      const entry = entries.find(e =>
        cell.toLowerCase().includes(e.facilityName.toLowerCase().substring(0, 10))
      );

      if (entry) {
        for (let k = j + 1; k < Math.min(j + 5, row.length); k++) {
          const val = row[k];
          if (typeof val !== 'string') continue;
          const text = val.trim();

          if (/^[A-Z]{2}$/.test(text) && !entry.state) {
            entry.state = text;
          }
          if (/^[A-Z][a-z]/.test(text) && text.length > 3 && !entry.city) {
            entry.city = text;
          }
        }
      }
    }
  }
}
