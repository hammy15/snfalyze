/**
 * Smart Excel Extraction — Orchestrator
 *
 * Entry point that coordinates all parsers to extract structured financial data
 * directly from Excel files without AI intermediary.
 *
 * Pipeline:
 * 1. Read Excel files with existing extractExcelFile()
 * 2. Classify each file (opco_review, asset_valuation, portfolio_model, gl_mapping)
 * 3. Parse GL mapping first (if present) to enhance subsequent parsing
 * 4. Parse T13 data with GL mapping applied
 * 5. Parse Asset Valuation data
 * 6. Parse Portfolio Model data
 * 7. Classify facilities by property type
 * 8. Run Cascadia three-method valuation
 * 9. Benchmark against knowledge base
 * 10. Return combined SmartExtractionResult
 */

import type { SheetExtraction } from '../excel-extractor';
import type {
  SmartExtractionResult,
  FileClassification,
  FacilityClassification,
  GLMappingEntry,
} from './types';

import { classifyExcelFile } from './file-classifier';
import { parseGLMapping } from './gl-mapping-parser';
import { parseT13 } from './t13-parser';
import { parseAssetValuation } from './asset-valuation-parser';
import { parsePortfolioModel } from './portfolio-model-parser';
import { classifyFacilities } from './facility-classifier';
import { runCascadiaValuation } from '../../valuation/cascadia-method';
import { benchmarkFacilities } from './benchmarks';

// Re-export the stage data adapter
export { smartResultToStageData } from './to-stage-data';
export type { SmartExtractionStageData, PLFacility, PLLineItem } from './to-stage-data';

// Re-export types
export type { SmartExtractionResult, FileClassification } from './types';

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

export interface SmartExcelInput {
  /** Pre-extracted sheet data from extractExcelFile() */
  files: {
    documentId: string;
    filename: string;
    sheets: SheetExtraction[];
  }[];
}

export async function extractSmartExcel(input: SmartExcelInput): Promise<SmartExtractionResult> {
  const startTime = performance.now();
  const warnings: string[] = [];

  // Step 1: Classify each file
  const fileClassifications: FileClassification[] = [];

  for (const file of input.files) {
    const classification = classifyExcelFile(file.sheets, file.documentId, file.filename);
    fileClassifications.push(classification);
  }

  // Sort by extraction priority (gl_mapping first → opco → asset_valuation → portfolio)
  const sortedFiles = [...input.files].sort((a, b) => {
    const classA = fileClassifications.find(c => c.documentId === a.documentId);
    const classB = fileClassifications.find(c => c.documentId === b.documentId);
    return (classA?.extractionPriority ?? 99) - (classB?.extractionPriority ?? 99);
  });

  // Step 2: Parse GL mapping first (if present)
  let glMapping: Map<string, GLMappingEntry> | undefined;

  for (const file of sortedFiles) {
    const classification = fileClassifications.find(c => c.documentId === file.documentId);
    if (classification?.fileType === 'gl_mapping') {
      glMapping = parseGLMapping(file.sheets);
      if (glMapping.size > 0) {
        warnings.push(`GL mapping loaded: ${glMapping.size} entries`);
      }
      break;
    }
  }

  // Step 3: Parse T13/Opco data
  let t13Data: SmartExtractionResult['t13Data'];
  const opcoFiles = sortedFiles.filter(f => {
    const c = fileClassifications.find(cl => cl.documentId === f.documentId);
    return c?.fileType === 'opco_review';
  });

  if (opcoFiles.length > 0) {
    // Combine all sheets from opco files
    const allSheets = opcoFiles.flatMap(f => f.sheets);
    t13Data = parseT13(allSheets, glMapping);
    warnings.push(...t13Data.warnings);
    if (t13Data.facilities.length > 0) {
      warnings.push(`T13: Parsed ${t13Data.facilities.length} facilities`);
    }
  }

  // Step 4: Parse Asset Valuation
  let assetValuation: SmartExtractionResult['assetValuation'];
  const avFiles = sortedFiles.filter(f => {
    const c = fileClassifications.find(cl => cl.documentId === f.documentId);
    return c?.fileType === 'asset_valuation';
  });

  if (avFiles.length > 0) {
    const allSheets = avFiles.flatMap(f => f.sheets);
    assetValuation = parseAssetValuation(allSheets);
    warnings.push(...assetValuation.warnings);
    if (assetValuation.entries.length > 0) {
      warnings.push(`Asset Valuation: ${assetValuation.entries.length} entries`);
    }
  }

  // Step 5: Parse Portfolio Model
  let portfolioModel: SmartExtractionResult['portfolioModel'];
  const portfolioFiles = sortedFiles.filter(f => {
    const c = fileClassifications.find(cl => cl.documentId === f.documentId);
    return c?.fileType === 'portfolio_model';
  });

  if (portfolioFiles.length > 0) {
    const allSheets = portfolioFiles.flatMap(f => f.sheets);
    portfolioModel = parsePortfolioModel(allSheets, glMapping);
    warnings.push(...portfolioModel.warnings);
    if (portfolioModel.scenarios.length > 0) {
      warnings.push(`Portfolio: ${portfolioModel.scenarios.length} scenarios`);
    }
  }

  // Step 6: Classify facilities
  const facilityClassifications: FacilityClassification[] = classifyFacilities(
    t13Data?.facilities || [],
    assetValuation?.entries || [],
  );

  if (facilityClassifications.length > 0) {
    warnings.push(`Classified ${facilityClassifications.length} facilities`);
    const typeBreakdown = new Map<string, number>();
    for (const c of facilityClassifications) {
      typeBreakdown.set(c.propertyType, (typeBreakdown.get(c.propertyType) || 0) + 1);
    }
    for (const [type, count] of typeBreakdown) {
      warnings.push(`  ${type}: ${count}`);
    }
  }

  // Step 7: Run Cascadia valuation
  let cascadiaValuation: SmartExtractionResult['cascadiaValuation'];

  if (facilityClassifications.length > 0) {
    cascadiaValuation = runCascadiaValuation({
      classifications: facilityClassifications,
      t13Facilities: t13Data?.facilities || [],
      assetValuationEntries: assetValuation?.entries,
    });

    if (cascadiaValuation.portfolioTotal.totalValue > 0) {
      warnings.push(
        `Cascadia Valuation: $${(cascadiaValuation.portfolioTotal.totalValue / 1e6).toFixed(1)}M ` +
        `(${cascadiaValuation.portfolioTotal.facilityCount} facilities, ` +
        `${cascadiaValuation.portfolioTotal.totalBeds} beds)`
      );
    }
  }

  // Calculate overall confidence
  const confidence = calculateConfidence(fileClassifications, t13Data, assetValuation, facilityClassifications);

  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    fileClassifications,
    t13Data,
    assetValuation,
    glMapping,
    portfolioModel,
    facilityClassifications,
    cascadiaValuation,
    confidence,
    extractionMethod: 'smart_excel',
    warnings,
    processingTimeMs,
  };
}

// ============================================================================
// CONFIDENCE CALCULATION
// ============================================================================

function calculateConfidence(
  fileClassifications: FileClassification[],
  t13Data: SmartExtractionResult['t13Data'],
  assetValuation: SmartExtractionResult['assetValuation'],
  facilityClassifications: FacilityClassification[],
): number {
  let score = 0;
  let factors = 0;

  // File classification confidence
  const avgFileConf = fileClassifications.length > 0
    ? fileClassifications.reduce((s, f) => s + f.confidence, 0) / fileClassifications.length
    : 0;
  score += avgFileConf;
  factors++;

  // T13 data quality
  if (t13Data && t13Data.facilities.length > 0) {
    const facilitiesWithEbitda = t13Data.facilities.filter(f => f.summaryMetrics.ebitda !== 0).length;
    const t13Conf = facilitiesWithEbitda / t13Data.facilities.length;
    score += t13Conf;
    factors++;
  }

  // Asset valuation data
  if (assetValuation && assetValuation.entries.length > 0) {
    score += 0.9;
    factors++;
  }

  // Facility classification confidence
  if (facilityClassifications.length > 0) {
    const avgClassConf = facilityClassifications.reduce((s, c) => s + c.confidence, 0) / facilityClassifications.length;
    score += avgClassConf;
    factors++;
  }

  return factors > 0 ? Math.min(score / factors, 1.0) : 0;
}

// ============================================================================
// QUICK CHECK — Does a set of sheets look like structured Excel data?
// ============================================================================

export function isStructuredExcelData(sheets: SheetExtraction[]): boolean {
  // Quick heuristic: check for GL codes, valuation columns, or known patterns
  if (!sheets || sheets.length === 0) return false;

  for (const sheet of sheets) {
    const { data } = sheet;
    if (!data || data.length < 5) continue;

    // Check for GL code patterns in first 50 rows
    let glCodeCount = 0;
    for (let i = 0; i < Math.min(50, data.length); i++) {
      const row = data[i];
      if (!row) continue;
      for (const cell of row) {
        if (cell != null && /^\d{6}(-\d{2})?$/.test(String(cell).trim())) {
          glCodeCount++;
        }
      }
    }
    if (glCodeCount >= 5) return true;

    // Check for valuation indicators
    const flatText = data.slice(0, 20).flat().filter(Boolean).map(String).join(' ');
    if (/cap\s*rate|multiplier|value\s*per\s*bed|valuation/i.test(flatText)) return true;
    if (/ebitda|ebitdar|net\s*income/i.test(flatText) && /annual|ppd|per\s*patient/i.test(flatText)) return true;
  }

  return false;
}
