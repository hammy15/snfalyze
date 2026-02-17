/**
 * File Classifier
 *
 * Inspects Excel file content to determine which Cascadia document type it is.
 * Uses content-based heuristics, not filename matching.
 */

import type { SheetExtraction } from '../excel-extractor';
import type { CascadiaFileType, FileClassification } from './types';

// ============================================================================
// DETECTION PATTERNS
// ============================================================================

const GL_CODE_PATTERN = /^\d{6}(-\d{2})?$/; // 400110 or 400110-99
const EBITDA_LABELS = /\b(ebitda|ebitdar|ebit)\b/i;
const NET_INCOME_LABEL = /\bnet\s*(income|operating)\b/i;
const TOTAL_REVENUE_LABEL = /\btotal\s*revenue\b/i;
const PPD_HEADER = /\bppd\b|per\s*patient\s*day|per\s*diem/i;
const T13_SHEET = /t13|dollars\s*and\s*ppd/i;
const ANNUAL_MONTHLY = /\b(annual|monthly)\b/i;
const FACILITY_SECTION = /\((?:SNF|ALF|MC|IL|Opco|SNF_AL_IL)\)/i;

const VALUATION_INDICATORS = /\b(cap\s*rate|multiplier|value\s*per\s*bed|valuation)\b/i;
const LOI_SHEET = /\bloi\b/i;

const PORTFOLIO_SHEETS = /\b(current\s*state|85%?\s*occupancy|rollup|roll-up)\b/i;
const ENTITY_GROUPS = /\b(OR-|WA-|SNF\s*-?\s*Owned|Leased|AL\/IL|SNC)\b/i;

const MAPPING_INDICATORS = /\b(mapping|map|crosswalk|xref)\b/i;

// ============================================================================
// CLASSIFY SINGLE FILE
// ============================================================================

export function classifyExcelFile(
  sheets: SheetExtraction[],
  documentId: string,
  filename: string
): FileClassification {
  const scores: Record<CascadiaFileType, { score: number; indicators: string[] }> = {
    opco_review: { score: 0, indicators: [] },
    asset_valuation: { score: 0, indicators: [] },
    portfolio_model: { score: 0, indicators: [] },
    gl_mapping: { score: 0, indicators: [] },
    unknown: { score: 0, indicators: [] },
  };

  const sheetSummary: FileClassification['sheetSummary'] = [];

  for (const sheet of sheets) {
    const sheetText = flattenSheetText(sheet.data, 50);
    const sheetName = sheet.sheetName || '';
    let suggestedType = 'unknown';

    // --- OPCO REVIEW (T13) indicators ---
    if (T13_SHEET.test(sheetName)) {
      scores.opco_review.score += 30;
      scores.opco_review.indicators.push(`Sheet name matches T13: "${sheetName}"`);
      suggestedType = 'opco_t13';
    }

    const glCodeCount = countGLCodes(sheet.data);
    if (glCodeCount > 20) {
      scores.opco_review.score += 20;
      scores.opco_review.indicators.push(`${glCodeCount} GL codes detected`);
      suggestedType = 'opco_t13';
    } else if (glCodeCount > 5) {
      scores.opco_review.score += 10;
      scores.opco_review.indicators.push(`${glCodeCount} GL codes detected`);
    }

    if (EBITDA_LABELS.test(sheetText)) {
      scores.opco_review.score += 5;
      scores.opco_review.indicators.push('EBITDA/EBITDAR labels found');
    }

    if (PPD_HEADER.test(sheetText) && ANNUAL_MONTHLY.test(sheetText)) {
      scores.opco_review.score += 10;
      scores.opco_review.indicators.push('PPD + Annual/Monthly headers');
    }

    if (FACILITY_SECTION.test(sheetText)) {
      scores.opco_review.score += 10;
      scores.opco_review.indicators.push('Facility section markers (SNF/ALF/IL)');
    }

    if (sheet.rowCount > 500) {
      scores.opco_review.score += 5;
      scores.opco_review.indicators.push(`Large sheet (${sheet.rowCount} rows)`);
    }

    // --- ASSET VALUATION indicators ---
    if (VALUATION_INDICATORS.test(sheetText)) {
      scores.asset_valuation.score += 15;
      scores.asset_valuation.indicators.push('Valuation terminology found');
      if (suggestedType === 'unknown') suggestedType = 'valuation';
    }

    if (/\bvaluation\b/i.test(sheetName)) {
      scores.asset_valuation.score += 20;
      scores.asset_valuation.indicators.push(`Sheet name: "${sheetName}"`);
      suggestedType = 'valuation';
    }

    if (LOI_SHEET.test(sheetName)) {
      scores.asset_valuation.score += 15;
      scores.asset_valuation.indicators.push('LOI sheet found');
    }

    if (hasBedCountColumn(sheet.data) && sheet.rowCount < 60) {
      scores.asset_valuation.score += 10;
      scores.asset_valuation.indicators.push('Bed count column in compact sheet');
    }

    // --- PORTFOLIO MODEL indicators ---
    if (PORTFOLIO_SHEETS.test(sheetName)) {
      scores.portfolio_model.score += 20;
      scores.portfolio_model.indicators.push(`Portfolio sheet: "${sheetName}"`);
      suggestedType = 'portfolio';
    }

    if (ENTITY_GROUPS.test(sheetText)) {
      scores.portfolio_model.score += 10;
      scores.portfolio_model.indicators.push('Entity groups (OR-SNF, WA-AL/IL)');
    }

    // Check for facility-named sheets
    if (isFacilityNamedSheet(sheetName)) {
      scores.portfolio_model.score += 5;
      scores.portfolio_model.indicators.push(`Facility sheet: "${sheetName}"`);
    }

    // --- GL MAPPING indicators ---
    if (MAPPING_INDICATORS.test(sheetName)) {
      scores.gl_mapping.score += 20;
      scores.gl_mapping.indicators.push(`Mapping sheet: "${sheetName}"`);
      suggestedType = 'mapping';
    }

    if (glCodeCount > 50 && sheet.rowCount > 100 && hasMappingStructure(sheet.data)) {
      scores.gl_mapping.score += 15;
      scores.gl_mapping.indicators.push('GL code + category mapping structure');
    }

    sheetSummary.push({
      name: sheetName,
      rowCount: sheet.rowCount,
      suggestedType,
    });
  }

  // Multi-sheet bonuses
  if (sheets.length >= 5) {
    const facilitySheetCount = sheets.filter(s => isFacilityNamedSheet(s.sheetName)).length;
    if (facilitySheetCount >= 2) {
      scores.portfolio_model.score += 15;
      scores.portfolio_model.indicators.push(`${facilitySheetCount} facility-named sheets`);
    }
  }

  // Determine winner
  const ranked = (Object.entries(scores) as [CascadiaFileType, typeof scores[CascadiaFileType]][])
    .filter(([type]) => type !== 'unknown')
    .sort((a, b) => b[1].score - a[1].score);

  const best = ranked[0];
  const fileType = best && best[1].score >= 10 ? best[0] : 'unknown';
  const maxScore = best ? best[1].score : 0;
  const confidence = Math.min(maxScore / 50, 1.0);

  // Extraction priority: mapping first (0), then opco (1), then asset valuation (2), portfolio (3)
  const priorityMap: Record<CascadiaFileType, number> = {
    gl_mapping: 0,
    opco_review: 1,
    asset_valuation: 2,
    portfolio_model: 3,
    unknown: 99,
  };

  return {
    documentId,
    filename,
    fileType,
    confidence,
    indicators: best ? best[1].indicators : [],
    sheetSummary,
    extractionPriority: priorityMap[fileType],
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function flattenSheetText(data: (string | number | null)[][], maxRows: number): string {
  return data
    .slice(0, maxRows)
    .flat()
    .filter(cell => cell !== null && cell !== undefined)
    .map(cell => String(cell))
    .join(' ');
}

function countGLCodes(data: (string | number | null)[][]): number {
  let count = 0;
  for (const row of data) {
    if (!row) continue;
    for (const cell of row) {
      if (cell !== null && cell !== undefined) {
        const str = String(cell).trim();
        if (GL_CODE_PATTERN.test(str)) {
          count++;
        }
      }
    }
  }
  return count;
}

function hasBedCountColumn(data: (string | number | null)[][]): boolean {
  for (const row of data.slice(0, 15)) {
    if (!row) continue;
    for (const cell of row) {
      if (typeof cell === 'string' && /\b(beds?|total\s*beds?|licensed\s*beds?)\b/i.test(cell)) {
        return true;
      }
    }
  }
  return false;
}

function hasMappingStructure(data: (string | number | null)[][]): boolean {
  // Check if most rows have a GL code in column A and text in subsequent columns
  let mappingRows = 0;
  for (let i = 5; i < Math.min(50, data.length); i++) {
    const row = data[i];
    if (!row || row.length < 2) continue;
    const firstCell = String(row[0] || '').trim();
    if (GL_CODE_PATTERN.test(firstCell) && typeof row[1] === 'string') {
      mappingRows++;
    }
  }
  return mappingRows > 10;
}

function isFacilityNamedSheet(sheetName: string): boolean {
  // Known facility name patterns
  const facilityPatterns = [
    /gateway/i, /ridgeview/i, /firwood/i, /bridgecreek/i, /brighton/i,
    /liberty/i, /cedar/i, /gresham/i, /sapphire/i, /fernhill/i,
    /myrtle/i, /gracelen/i, /rose\s*city/i, /valley\s*view/i,
    /tigard/i, /woodway/i, /mckenzie/i, /sweet\s*home/i, /amber/i,
    /butte/i, /belmont/i, /rivers?\s*edge/i, /sheridan/i, /west\s*wind/i,
  ];
  return facilityPatterns.some(p => p.test(sheetName));
}
