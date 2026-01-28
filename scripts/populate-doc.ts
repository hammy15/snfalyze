/**
 * Script to directly populate a document with extracted Excel data
 * Bypasses the blocking AI analysis
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { documents } from '../src/db/schema';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

// Load env
dotenv.config({ path: '.env.local' });

const DOC_ID = 'c8b304fd-fb2c-4689-ada7-41082034c02d';
const FILE_PATH = '/Users/hammy/Desktop/Deal Tracker Files/Avemere/T36 P&L - Owned Assets 06.30.25.xlsx';

async function main() {
  // Setup database connection
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  console.log('Reading Excel file...');
  const buffer = fs.readFileSync(FILE_PATH);
  const workbook = XLSX.read(buffer, { type: 'buffer' });

  // Convert to SheetContent[] format expected by the pipeline
  const sheets: Array<{
    name: string;
    headers: string[];
    rows: (string | number | null)[][];
    rowCount: number;
    columnCount: number;
  }> = [];
  const textParts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

    // Find headers (first non-empty row with multiple cells)
    let headerRow: string[] = [];
    let dataStartIdx = 0;
    for (let i = 0; i < Math.min(15, data.length); i++) {
      const row = data[i];
      if (row && row.filter(c => c != null && c !== '').length > 3) {
        headerRow = row.map(c => c != null ? String(c) : '');
        dataStartIdx = i + 1;
        break;
      }
    }

    const maxCols = Math.max(...data.map(r => r ? r.length : 0));

    sheets.push({
      name: sheetName,
      headers: headerRow,
      rows: data.slice(dataStartIdx),
      rowCount: data.length,
      columnCount: maxCols,
    });

    textParts.push(`=== Sheet: ${sheetName} ===`);
    for (const row of data) {
      if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
        textParts.push(row.map(cell => cell ?? '').join('\t'));
      }
    }
  }

  const rawText = textParts.join('\n');
  const extractedData = {
    sheets,  // Now an array of SheetContent
    sheetNames: workbook.SheetNames,
    documentType: 'financial_statement',
  };

  console.log(`Extracted ${workbook.SheetNames.length} sheets, ${rawText.length} chars of text`);

  console.log('Updating document in database...');
  await db
    .update(documents)
    .set({
      status: 'complete',
      rawText,
      extractedData,
      processedAt: new Date(),
      type: 'financial_statement',
    })
    .where(eq(documents.id, DOC_ID));

  console.log('Done!');
  process.exit(0);
}

main().catch(console.error);
