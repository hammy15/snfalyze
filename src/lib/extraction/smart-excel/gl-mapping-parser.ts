/**
 * GL Mapping Parser
 *
 * Parses GL code mapping files that map raw GL codes (400110-99) to P&L categories.
 * This mapping is used to enhance T13 parsing accuracy.
 */

import type { SheetExtraction } from '../excel-extractor';
import type { GLMappingEntry } from './types';

const GL_CODE_PATTERN = /^(\d{6})(-\d{2})?$/;

/**
 * Parse a GL mapping file into a lookup map
 */
export function parseGLMapping(sheets: SheetExtraction[]): Map<string, GLMappingEntry> {
  const mapping = new Map<string, GLMappingEntry>();

  // Find the mapping sheet
  const mappingSheet = sheets.find(s =>
    /mapping|map|crosswalk/i.test(s.sheetName)
  ) || sheets[0];

  if (!mappingSheet) return mapping;

  const { data } = mappingSheet;

  // Detect header row and column structure
  const headerInfo = detectMappingColumns(data);
  if (!headerInfo) return mapping;

  const { glCodeCol, labelCol, categoryCol, facilityColumns, startRow } = headerInfo;

  // Parse each row
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const rawCode = row[glCodeCol];
    if (rawCode === null || rawCode === undefined) continue;

    const glCode = normalizeGLCode(String(rawCode));
    if (!glCode) continue;

    const label = row[labelCol] != null ? String(row[labelCol]).trim() : '';
    const category = categoryCol != null && row[categoryCol] != null
      ? String(row[categoryCol]).trim()
      : undefined;

    // Build facility-specific mappings if columns exist
    const facilityMappings = new Map<string, string>();
    for (const { col, facilityName } of facilityColumns) {
      const val = row[col];
      if (val != null && String(val).trim()) {
        facilityMappings.set(facilityName, String(val).trim());
      }
    }

    const entry: GLMappingEntry = {
      glCode,
      label,
      category: category || categorizeByGLCode(glCode),
      subcategory: subcategorizeByGLCode(glCode),
      facilityMappings: facilityMappings.size > 0 ? facilityMappings : undefined,
    };

    mapping.set(glCode, entry);

    // Also store the base code (without -99 suffix)
    const baseCode = glCode.replace(/-\d{2}$/, '');
    if (baseCode !== glCode && !mapping.has(baseCode)) {
      mapping.set(baseCode, entry);
    }
  }

  return mapping;
}

// ============================================================================
// COLUMN DETECTION
// ============================================================================

interface MappingColumnInfo {
  glCodeCol: number;
  labelCol: number;
  categoryCol?: number;
  facilityColumns: { col: number; facilityName: string }[];
  startRow: number;
}

function detectMappingColumns(data: (string | number | null)[][]): MappingColumnInfo | null {
  // Scan first 10 rows for header patterns
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    let glCodeCol = -1;
    let labelCol = -1;
    let categoryCol: number | undefined;
    const facilityColumns: { col: number; facilityName: string }[] = [];

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell === null || cell === undefined) continue;
      const text = String(cell).toLowerCase().trim();

      // GL code column
      if (/gl\s*code|account\s*(code|number|#)|line\s*item/i.test(text)) {
        glCodeCol = j;
      }

      // Label/description column
      if (/description|label|name|account\s*name/i.test(text)) {
        labelCol = j;
      }

      // Category column
      if (/category|type|class|mapping/i.test(text) && !/facility/i.test(text)) {
        categoryCol = j;
      }

      // Facility-specific columns
      if (/\(opco\)|\bopco\b/i.test(text)) {
        const facilityName = text
          .replace(/\s*\(opco\)\s*/i, '')
          .replace(/\bopco\b/i, '')
          .trim();
        if (facilityName) {
          facilityColumns.push({ col: j, facilityName });
        }
      }
    }

    // If we didn't find explicit headers, try to detect by content
    if (glCodeCol === -1) {
      // Check if the first row of actual data has GL codes
      for (let k = i + 1; k < Math.min(i + 5, data.length); k++) {
        const dataRow = data[k];
        if (!dataRow) continue;
        for (let j = 0; j < dataRow.length; j++) {
          const val = dataRow[j];
          if (val != null && GL_CODE_PATTERN.test(String(val).trim())) {
            glCodeCol = j;
            // The label is usually the next non-empty text column
            for (let m = j + 1; m < dataRow.length; m++) {
              if (typeof dataRow[m] === 'string' && (dataRow[m] as string).trim().length > 3) {
                labelCol = m;
                break;
              }
            }
            break;
          }
        }
        if (glCodeCol !== -1) break;
      }
    }

    if (glCodeCol !== -1 && labelCol === -1) {
      // Default label col to the one after GL code
      labelCol = glCodeCol + 1;
    }

    if (glCodeCol !== -1) {
      return {
        glCodeCol,
        labelCol,
        categoryCol,
        facilityColumns,
        startRow: i + 1,
      };
    }
  }

  // Fallback: assume first column has GL codes, second has labels
  return {
    glCodeCol: 0,
    labelCol: 1,
    facilityColumns: [],
    startRow: 1,
  };
}

// ============================================================================
// GL CODE HELPERS
// ============================================================================

function normalizeGLCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (GL_CODE_PATTERN.test(trimmed)) return trimmed;

  // Try to extract a 6-digit code
  const match = trimmed.match(/(\d{6})/);
  return match ? match[1] : null;
}

/**
 * Categorize a GL code by its numeric range
 * 4xxxxx = Revenue, 5xxxxx = Operating Expense, 6xxxxx = Admin/Other
 */
function categorizeByGLCode(glCode: string): string {
  const prefix = glCode.substring(0, 1);
  const prefix2 = glCode.substring(0, 2);
  const prefix3 = glCode.substring(0, 3);

  if (prefix === '4') {
    if (prefix3 === '400') return 'SNF Revenue';
    if (prefix3 === '420') return 'ALF/RCF Revenue';
    if (prefix3 === '421') return 'ALF Revenue';
    if (prefix3 === '422') return 'IL Revenue';
    if (prefix3 === '423') return 'Memory Care Revenue';
    if (prefix3 === '590') return 'Other Revenue';
    return 'Revenue';
  }

  if (prefix === '5') return 'Operating Expense';

  if (prefix === '6') {
    if (prefix3 === '600') return 'Administration';
    if (prefix3 === '610') return 'Ancillary Expense';
    if (prefix3 === '611') return 'Therapy Expense';
    if (prefix3 === '612') return 'HMO Expense';
    if (prefix3 === '613') return 'Private Ancillary';
    return 'Expense';
  }

  if (prefix === '7') return 'Non-Operating';
  if (prefix === '8') return 'Below-the-Line';

  return 'Unknown';
}

function subcategorizeByGLCode(glCode: string): string | undefined {
  const code = glCode.replace(/-\d{2}$/, '');
  const prefix4 = code.substring(0, 4);

  // Revenue subcategories
  if (prefix4 === '4001') return 'medicare_revenue';
  if (prefix4 === '4002') return 'medicaid_revenue';
  if (prefix4 === '4004') return 'managed_care_revenue';
  if (prefix4 === '4005') return 'private_revenue';
  if (prefix4 === '4006') return 'reserve_bed_revenue';
  if (prefix4 === '4201') return 'rcf_medicaid_revenue';
  if (prefix4 === '4202') return 'alf_medicaid_revenue';
  if (prefix4 === '4204') return 'alf_private_revenue';
  if (prefix4 === '4221') return 'il_revenue';
  if (prefix4 === '4231') return 'mc_medicaid_revenue';
  if (prefix4 === '4234') return 'mc_private_revenue';

  // Expense subcategories
  if (prefix4 === '6000') return 'administration';
  if (prefix4 === '6003') return 'contract_labor';

  return undefined;
}
