/**
 * Test script for P&L extraction
 * Run with: npx tsx scripts/test-pl-extraction.ts
 */

import * as XLSX from 'xlsx';
import { extractPLData } from '../src/lib/extraction/pl-extractor';

async function testExtraction() {
  const filePath = 'uploads/wizard/f51f9e27-7629-46b7-beaf-fca408cb2ee2.xlsx';

  console.log('='.repeat(80));
  console.log('Testing P&L Extraction');
  console.log('File:', filePath);
  console.log('='.repeat(80));

  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);

    console.log('\nSheets in workbook:', workbook.SheetNames);

    for (const sheetName of workbook.SheetNames) {
      console.log('\n' + '='.repeat(80));
      console.log(`Processing sheet: ${sheetName}`);
      console.log('='.repeat(80));

      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        raw: true,
        defval: null,
      }) as (string | number | null)[][];

      console.log(`Total rows: ${data.length}`);

      // Extract P&L data
      const periods = extractPLData(data, sheetName, [sheetName]);

      console.log(`\nExtracted ${periods.length} periods:`);

      for (const period of periods.slice(-5)) { // Show last 5 periods
        console.log('\n---');
        console.log(`Period: ${period.periodLabel}`);
        console.log(`  Total Revenue: $${period.totalRevenue.toLocaleString()}`);
        console.log(`  Total Expenses: $${period.totalExpenses.toLocaleString()}`);
        console.log(`  EBITDAR: $${period.ebitdar.toLocaleString()}`);
        console.log(`  Rent: $${period.rent.toLocaleString()}`);
        console.log(`  EBITDA: $${period.ebitda.toLocaleString()}`);
        console.log(`  Net Income: $${period.netIncome.toLocaleString()}`);
        console.log(`  EBITDAR Margin: ${period.ebitdarMargin?.toFixed(1)}%`);
        console.log(`  Confidence: ${(period.confidence * 100).toFixed(0)}%`);
      }

      // Verify key fields are populated
      if (periods.length > 0) {
        const lastPeriod = periods[periods.length - 1];
        const issues: string[] = [];

        if (lastPeriod.ebitdar === 0) issues.push('EBITDAR is 0');
        if (lastPeriod.ebitda === 0) issues.push('EBITDA is 0');
        if (lastPeriod.totalRevenue === 0) issues.push('Total Revenue is 0');
        if (lastPeriod.totalExpenses === 0) issues.push('Total Expenses is 0');

        if (issues.length > 0) {
          console.log('\n⚠️ ISSUES DETECTED:');
          issues.forEach(issue => console.log(`  - ${issue}`));
        } else {
          console.log('\n✅ All key financial metrics populated!');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testExtraction();
