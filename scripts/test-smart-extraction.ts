#!/usr/bin/env npx tsx
/**
 * Smart Excel Extraction — Consistency Test
 *
 * Reads the three actual Excel files from Desktop, converts them to SheetExtraction
 * format (same as the upload route does), runs extractSmartExcel() twice,
 * and compares results for determinism.
 *
 * Usage: npx tsx scripts/test-smart-extraction.ts
 */

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// We need to use the same types as the codebase
import type { SheetExtraction } from '../src/lib/extraction/excel-extractor';

// Import the smart extraction pipeline
import { extractSmartExcel, isStructuredExcelData } from '../src/lib/extraction/smart-excel/index';
import { smartResultToStageData } from '../src/lib/extraction/smart-excel/to-stage-data';
import type { SmartExtractionResult } from '../src/lib/extraction/smart-excel/types';

// ============================================================================
// CONFIG
// ============================================================================

const FILES = [
  { path: '/Users/hammy/Desktop/Sapphire.xlsx', id: 'sapphire-001' },
  { path: '/Users/hammy/Desktop/Asset Valuation (2.9.26).xlsx', id: 'asset-val-001' },
  { path: '/Users/hammy/Desktop/Copy of Opco Review 2026 All_Mapping.xlsx', id: 'opco-mapping-001' },
];

// ============================================================================
// FILE READING (mirrors upload route logic)
// ============================================================================

function readExcelToSheetExtractions(filePath: string): SheetExtraction[] {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number | null)[][];
    const headers = data.length > 0
      ? (data[0] || []).map((c: any) => c != null ? String(c) : '')
      : [];

    return {
      sheetName: name,
      sheetType: 'unknown' as const,
      rowCount: data.length,
      columnCount: headers.length,
      headers,
      data,
      facilitiesDetected: [],
      periodsDetected: [],
      metadata: { hasFormulas: false, hasMergedCells: false, firstDataRow: 1 },
    };
  });
}

// ============================================================================
// COMPARISON UTILITIES
// ============================================================================

interface ComparisonResult {
  identical: boolean;
  differences: string[];
  summary: {
    run1: RunSummary;
    run2: RunSummary;
  };
}

interface RunSummary {
  confidence: number;
  processingTimeMs: number;
  fileClassifications: { filename: string; type: string; confidence: number }[];
  t13FacilityCount: number;
  t13FacilityNames: string[];
  assetValuationEntryCount: number;
  facilityClassificationCount: number;
  classificationBreakdown: Record<string, number>;
  cascadiaPortfolioTotal: number;
  cascadiaTotalBeds: number;
  cascadiaFacilityCount: number;
  cascadiaFacilityValues: { name: string; value: number; type: string; beds: number }[];
  warningCount: number;
}

function summarizeResult(result: SmartExtractionResult): RunSummary {
  const classificationBreakdown: Record<string, number> = {};
  for (const c of result.facilityClassifications) {
    classificationBreakdown[c.propertyType] = (classificationBreakdown[c.propertyType] || 0) + 1;
  }

  return {
    confidence: result.confidence,
    processingTimeMs: result.processingTimeMs,
    fileClassifications: result.fileClassifications.map(f => ({
      filename: f.filename,
      type: f.fileType,
      confidence: f.confidence,
    })),
    t13FacilityCount: result.t13Data?.facilities.length || 0,
    t13FacilityNames: (result.t13Data?.facilities || []).map(f => f.facilityName).sort(),
    assetValuationEntryCount: result.assetValuation?.entries.length || 0,
    facilityClassificationCount: result.facilityClassifications.length,
    classificationBreakdown,
    cascadiaPortfolioTotal: result.cascadiaValuation?.portfolioTotal.totalValue || 0,
    cascadiaTotalBeds: result.cascadiaValuation?.portfolioTotal.totalBeds || 0,
    cascadiaFacilityCount: result.cascadiaValuation?.portfolioTotal.facilityCount || 0,
    cascadiaFacilityValues: (result.cascadiaValuation?.facilities || [])
      .map(f => ({ name: f.facilityName, value: f.facilityValue, type: f.propertyType, beds: f.beds }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    warningCount: result.warnings.length,
  };
}

function compareResults(r1: SmartExtractionResult, r2: SmartExtractionResult): ComparisonResult {
  const s1 = summarizeResult(r1);
  const s2 = summarizeResult(r2);
  const differences: string[] = [];

  // Compare scalar values
  if (s1.confidence !== s2.confidence) {
    differences.push(`Confidence: ${s1.confidence} vs ${s2.confidence}`);
  }
  if (s1.t13FacilityCount !== s2.t13FacilityCount) {
    differences.push(`T13 Facility Count: ${s1.t13FacilityCount} vs ${s2.t13FacilityCount}`);
  }
  if (s1.assetValuationEntryCount !== s2.assetValuationEntryCount) {
    differences.push(`Asset Valuation Entries: ${s1.assetValuationEntryCount} vs ${s2.assetValuationEntryCount}`);
  }
  if (s1.facilityClassificationCount !== s2.facilityClassificationCount) {
    differences.push(`Facility Classifications: ${s1.facilityClassificationCount} vs ${s2.facilityClassificationCount}`);
  }
  if (s1.cascadiaPortfolioTotal !== s2.cascadiaPortfolioTotal) {
    differences.push(`Cascadia Portfolio Total: $${fmt(s1.cascadiaPortfolioTotal)} vs $${fmt(s2.cascadiaPortfolioTotal)}`);
  }
  if (s1.cascadiaTotalBeds !== s2.cascadiaTotalBeds) {
    differences.push(`Total Beds: ${s1.cascadiaTotalBeds} vs ${s2.cascadiaTotalBeds}`);
  }

  // Compare file classifications
  for (let i = 0; i < Math.max(s1.fileClassifications.length, s2.fileClassifications.length); i++) {
    const f1 = s1.fileClassifications[i];
    const f2 = s2.fileClassifications[i];
    if (f1 && f2) {
      if (f1.type !== f2.type) {
        differences.push(`File "${f1.filename}" classified as ${f1.type} vs ${f2.type}`);
      }
    }
  }

  // Compare classification breakdowns
  const allTypes = new Set([...Object.keys(s1.classificationBreakdown), ...Object.keys(s2.classificationBreakdown)]);
  for (const type of allTypes) {
    const c1 = s1.classificationBreakdown[type] || 0;
    const c2 = s2.classificationBreakdown[type] || 0;
    if (c1 !== c2) {
      differences.push(`${type} count: ${c1} vs ${c2}`);
    }
  }

  // Compare T13 facility names
  if (JSON.stringify(s1.t13FacilityNames) !== JSON.stringify(s2.t13FacilityNames)) {
    differences.push(`T13 facility names differ`);
    const only1 = s1.t13FacilityNames.filter(n => !s2.t13FacilityNames.includes(n));
    const only2 = s2.t13FacilityNames.filter(n => !s1.t13FacilityNames.includes(n));
    if (only1.length) differences.push(`  Only in Run 1: ${only1.join(', ')}`);
    if (only2.length) differences.push(`  Only in Run 2: ${only2.join(', ')}`);
  }

  // Compare per-facility valuations
  for (let i = 0; i < Math.max(s1.cascadiaFacilityValues.length, s2.cascadiaFacilityValues.length); i++) {
    const v1 = s1.cascadiaFacilityValues[i];
    const v2 = s2.cascadiaFacilityValues[i];
    if (v1 && v2 && v1.name === v2.name) {
      if (Math.abs(v1.value - v2.value) > 0.01) {
        differences.push(`Facility "${v1.name}" value: $${fmt(v1.value)} vs $${fmt(v2.value)}`);
      }
      if (v1.type !== v2.type) {
        differences.push(`Facility "${v1.name}" type: ${v1.type} vs ${v2.type}`);
      }
      if (v1.beds !== v2.beds) {
        differences.push(`Facility "${v1.name}" beds: ${v1.beds} vs ${v2.beds}`);
      }
    } else if (v1 && !v2) {
      differences.push(`Facility "${v1.name}" only in Run 1`);
    } else if (!v1 && v2) {
      differences.push(`Facility "${v2.name}" only in Run 2`);
    }
  }

  // Compare T13 financial metrics
  if (r1.t13Data && r2.t13Data) {
    for (let i = 0; i < Math.min(r1.t13Data.facilities.length, r2.t13Data.facilities.length); i++) {
      const f1 = r1.t13Data.facilities[i];
      const f2 = r2.t13Data.facilities[i];
      if (f1.facilityName === f2.facilityName) {
        const m1 = f1.summaryMetrics;
        const m2 = f2.summaryMetrics;
        if (Math.abs(m1.totalRevenue - m2.totalRevenue) > 0.01) {
          differences.push(`T13 "${f1.facilityName}" revenue: $${fmt(m1.totalRevenue)} vs $${fmt(m2.totalRevenue)}`);
        }
        if (Math.abs(m1.ebitda - m2.ebitda) > 0.01) {
          differences.push(`T13 "${f1.facilityName}" EBITDA: $${fmt(m1.ebitda)} vs $${fmt(m2.ebitda)}`);
        }
        if (Math.abs(m1.netIncome - m2.netIncome) > 0.01) {
          differences.push(`T13 "${f1.facilityName}" NI: $${fmt(m1.netIncome)} vs $${fmt(m2.netIncome)}`);
        }
        if (f1.lineItems.length !== f2.lineItems.length) {
          differences.push(`T13 "${f1.facilityName}" line items: ${f1.lineItems.length} vs ${f2.lineItems.length}`);
        }
      }
    }
  }

  return {
    identical: differences.length === 0,
    differences,
    summary: { run1: s1, run2: s2 },
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

function fmt(n: number): string {
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(2);
}

function printRunDetails(label: string, result: SmartExtractionResult, summary: RunSummary): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${label}`);
  console.log(`${'='.repeat(70)}`);

  console.log(`\n  Processing Time: ${summary.processingTimeMs}ms`);
  console.log(`  Overall Confidence: ${(summary.confidence * 100).toFixed(1)}%`);
  console.log(`  Warnings: ${summary.warningCount}`);

  console.log(`\n  FILE CLASSIFICATIONS:`);
  for (const f of summary.fileClassifications) {
    console.log(`    ${f.filename} → ${f.type} (${(f.confidence * 100).toFixed(0)}% conf)`);
  }

  console.log(`\n  T13 DATA:`);
  console.log(`    Facilities parsed: ${summary.t13FacilityCount}`);
  if (result.t13Data) {
    for (const fac of result.t13Data.facilities) {
      const m = fac.summaryMetrics;
      console.log(`    ${fac.facilityName}: Rev=$${fmt(m.totalRevenue)}, Exp=$${fmt(m.totalExpenses)}, EBITDA=$${fmt(m.ebitda)}, NI=$${fmt(m.netIncome)}, Items=${fac.lineItems.length}`);
    }
  }

  console.log(`\n  ASSET VALUATION:`);
  console.log(`    Entries: ${summary.assetValuationEntryCount}`);
  if (result.assetValuation) {
    for (const cat of result.assetValuation.categoryTotals) {
      console.log(`    ${cat.category}: ${cat.facilityCount} facilities, ${cat.totalBeds} beds, $${fmt(cat.totalValue)}`);
    }
    const pt = result.assetValuation.portfolioTotal;
    console.log(`    TOTAL: ${pt.facilityCount} facilities, ${pt.totalBeds} beds, $${fmt(pt.totalValue)}`);
  }

  console.log(`\n  FACILITY CLASSIFICATIONS:`);
  console.log(`    Total: ${summary.facilityClassificationCount}`);
  for (const [type, count] of Object.entries(summary.classificationBreakdown)) {
    console.log(`    ${type}: ${count}`);
  }

  console.log(`\n  CASCADIA VALUATION:`);
  if (result.cascadiaValuation) {
    for (const cat of result.cascadiaValuation.categories) {
      console.log(`    ${cat.category} (${cat.propertyType}): ${cat.facilityCount} fac, ${cat.totalBeds} beds, $${fmt(cat.totalValue)}, method=${cat.valuationMethod}`);
    }
    const pt = result.cascadiaValuation.portfolioTotal;
    console.log(`    PORTFOLIO TOTAL: $${fmt(pt.totalValue)} (${pt.facilityCount} fac, ${pt.totalBeds} beds, $${fmt(pt.avgValuePerBed)}/bed)`);

    if (result.cascadiaValuation.dualView) {
      const dv = result.cascadiaValuation.dualView;
      console.log(`    Dual View: Cascadia=$${fmt(dv.cascadiaValue)}, External=$${fmt(dv.externalValue)}`);
    }

    console.log(`\n    Per-Facility Values:`);
    for (const fv of result.cascadiaValuation.facilities) {
      console.log(`      ${fv.facilityName}: ${fv.propertyType}, ${fv.beds} beds, ${fv.metricUsed}=$${fmt(fv.metricValue)}, ${fv.rateLabel}, Value=$${fmt(fv.facilityValue)} ($${fmt(fv.valuePerBed)}/bed)`);
    }
  } else {
    console.log(`    (none)`);
  }

  // Show stage data conversion
  const stageData = smartResultToStageData(result);
  console.log(`\n  STAGE DATA CONVERSION:`);
  console.log(`    PLFacilities: ${stageData.visionExtraction.facilities.length}`);
  console.log(`    Valuations: ${stageData.analysisResult.valuations.length}`);
  console.log(`    Financial Summary: Rev=$${fmt(stageData.analysisResult.financialSummary.totalRevenue)}, Exp=$${fmt(stageData.analysisResult.financialSummary.totalExpenses)}, NOI=$${fmt(stageData.analysisResult.financialSummary.noi)}`);
  if (stageData.analysisResult.purchaseRecommendation) {
    const pr = stageData.analysisResult.purchaseRecommendation;
    console.log(`    Purchase Rec: $${fmt(pr.recommended)} (Low=$${fmt(pr.low)}, High=$${fmt(pr.high)}, $${fmt(pr.perBed)}/bed)`);
  }
  if (stageData.facilityIdentification) {
    console.log(`    Facility IDs: ${stageData.facilityIdentification.facilities.length}`);
  }

  console.log(`\n  WARNINGS:`);
  for (const w of result.warnings) {
    console.log(`    - ${w}`);
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
  console.log('='.repeat(70));
  console.log('  SMART EXCEL EXTRACTION — CONSISTENCY TEST');
  console.log('='.repeat(70));

  // Step 1: Read all files
  console.log('\nStep 1: Reading Excel files...');
  const fileInputs: { documentId: string; filename: string; sheets: SheetExtraction[] }[] = [];

  for (const file of FILES) {
    if (!fs.existsSync(file.path)) {
      console.error(`  FILE NOT FOUND: ${file.path}`);
      process.exit(1);
    }
    const filename = path.basename(file.path);
    console.log(`  Reading: ${filename}`);
    const sheets = readExcelToSheetExtractions(file.path);
    console.log(`    Sheets: ${sheets.map(s => `${s.sheetName} (${s.rowCount} rows)`).join(', ')}`);
    fileInputs.push({ documentId: file.id, filename, sheets });
  }

  // Step 2: Check structured data detection
  console.log('\nStep 2: Checking isStructuredExcelData...');
  for (const file of fileInputs) {
    const isStructured = isStructuredExcelData(file.sheets);
    console.log(`  ${file.filename}: ${isStructured ? 'YES — structured' : 'NO — not structured'}`);
  }

  // Step 3: Run extraction — Run 1
  console.log('\nStep 3: Running extraction (Run 1)...');
  const t1Start = performance.now();
  const result1 = await extractSmartExcel({ files: fileInputs });
  const t1End = performance.now();
  console.log(`  Done in ${Math.round(t1End - t1Start)}ms`);

  // Step 4: Run extraction — Run 2
  console.log('\nStep 4: Running extraction (Run 2)...');
  const t2Start = performance.now();
  const result2 = await extractSmartExcel({ files: fileInputs });
  const t2End = performance.now();
  console.log(`  Done in ${Math.round(t2End - t2Start)}ms`);

  // Step 5: Print detailed results
  const summary1 = summarizeResult(result1);
  const summary2 = summarizeResult(result2);
  printRunDetails('RUN 1', result1, summary1);
  printRunDetails('RUN 2', result2, summary2);

  // Step 6: Compare
  console.log(`\n${'='.repeat(70)}`);
  console.log('  CONSISTENCY COMPARISON');
  console.log(`${'='.repeat(70)}`);

  const comparison = compareResults(result1, result2);

  if (comparison.identical) {
    console.log('\n  ✓ RESULTS ARE IDENTICAL — All values match between Run 1 and Run 2');
  } else {
    console.log(`\n  ✗ DIFFERENCES FOUND (${comparison.differences.length}):`);
    for (const diff of comparison.differences) {
      console.log(`    - ${diff}`);
    }
  }

  // Step 7: Validation checks
  console.log(`\n${'='.repeat(70)}`);
  console.log('  VALIDATION CHECKS');
  console.log(`${'='.repeat(70)}`);

  const checks: { name: string; pass: boolean; detail: string }[] = [];

  // Check 1: File classification
  checks.push({
    name: 'File Classification',
    pass: summary1.fileClassifications.some(f => f.type === 'opco_review' || f.type === 'gl_mapping') &&
          summary1.fileClassifications.some(f => f.type === 'asset_valuation' || f.type === 'portfolio_model'),
    detail: summary1.fileClassifications.map(f => `${f.filename}=${f.type}`).join(', '),
  });

  // Check 2: Facilities found
  checks.push({
    name: 'Facilities Parsed',
    pass: summary1.facilityClassificationCount > 0,
    detail: `${summary1.facilityClassificationCount} facilities classified`,
  });

  // Check 3: T13 data
  checks.push({
    name: 'T13 Data Parsed',
    pass: summary1.t13FacilityCount > 0,
    detail: `${summary1.t13FacilityCount} T13 facilities`,
  });

  // Check 4: Asset valuation
  checks.push({
    name: 'Asset Valuation Parsed',
    pass: summary1.assetValuationEntryCount > 0,
    detail: `${summary1.assetValuationEntryCount} entries`,
  });

  // Check 5: Cascadia valuation produced
  checks.push({
    name: 'Cascadia Valuation',
    pass: summary1.cascadiaPortfolioTotal > 0,
    detail: `$${fmt(summary1.cascadiaPortfolioTotal)} total`,
  });

  // Check 6: Multiple property types classified
  const typeCount = Object.keys(summary1.classificationBreakdown).length;
  checks.push({
    name: 'Property Type Diversity',
    pass: typeCount >= 2,
    detail: `${typeCount} types: ${Object.entries(summary1.classificationBreakdown).map(([t,c]) => `${t}(${c})`).join(', ')}`,
  });

  // Check 7: Stage data conversion
  const stageData = smartResultToStageData(result1);
  checks.push({
    name: 'Stage Data Conversion',
    pass: stageData.visionExtraction.facilities.length > 0,
    detail: `${stageData.visionExtraction.facilities.length} PLFacilities, ${stageData.analysisResult.valuations.length} valuations`,
  });

  // Check 8: Deterministic
  checks.push({
    name: 'Deterministic (Consistent)',
    pass: comparison.identical,
    detail: comparison.identical ? 'Identical' : `${comparison.differences.length} differences`,
  });

  // Check 9: Expected ~22 facilities (Sapphire portfolio)
  checks.push({
    name: 'Expected ~22 Facilities',
    pass: summary1.facilityClassificationCount >= 15 && summary1.facilityClassificationCount <= 30,
    detail: `Got ${summary1.facilityClassificationCount} (expected ~22)`,
  });

  // Check 10: Confidence threshold
  checks.push({
    name: 'Confidence ≥ 50%',
    pass: summary1.confidence >= 0.5,
    detail: `${(summary1.confidence * 100).toFixed(1)}%`,
  });

  console.log('');
  let passed = 0;
  let failed = 0;
  for (const check of checks) {
    const icon = check.pass ? '✓' : '✗';
    const status = check.pass ? 'PASS' : 'FAIL';
    console.log(`  ${icon} ${status}: ${check.name} — ${check.detail}`);
    if (check.pass) passed++; else failed++;
  }

  console.log(`\n  Score: ${passed}/${checks.length} passed, ${failed} failed`);

  console.log(`\n${'='.repeat(70)}`);
  console.log('  TEST COMPLETE');
  console.log(`${'='.repeat(70)}\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('FATAL ERROR:', err);
  process.exit(1);
});
