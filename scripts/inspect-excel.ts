import * as XLSX from 'xlsx';
import * as fs from 'fs';

const FILES = [
  '/Users/hammy/Desktop/Sapphire.xlsx',
  '/Users/hammy/Desktop/Asset Valuation (2.9.26).xlsx',
  '/Users/hammy/Desktop/Copy of Opco Review 2026 All_Mapping.xlsx',
];

for (const filePath of FILES) {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`FILE: ${filePath.split('/').pop()}`);
  console.log(`Sheets: ${workbook.SheetNames.join(', ')}`);
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    console.log(`\n--- Sheet: ${sheetName} (${data.length} rows) ---`);
    
    // Print first 15 rows
    const maxRows = Math.min(15, data.length);
    for (let i = 0; i < maxRows; i++) {
      const row = data[i];
      if (!row) { console.log(`  Row ${i}: (empty)`); continue; }
      const cells = row.map((c: any, j: number) => `[${j}]${c === undefined || c === null ? '' : typeof c === 'number' ? c.toLocaleString() : String(c).substring(0, 30)}`);
      console.log(`  Row ${i}: ${cells.join(' | ')}`);
    }
    
    // For T13 sheet, also show rows around row 20-50 where facility data likely starts
    if (/T13|Dollars|PPD/i.test(sheetName)) {
      console.log(`\n  ... Rows 15-80 of ${sheetName}:`);
      for (let i = 15; i < Math.min(80, data.length); i++) {
        const row = data[i];
        if (!row || row.every((c: any) => c === undefined || c === null || c === '')) continue;
        const cells = row.slice(0, 12).map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          if (typeof c === 'number') return `[${j}]${c.toLocaleString()}`;
          return `[${j}]${String(c).substring(0, 25)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
    }
    
    // For Valuation sheet, show all data rows
    if (/Valuation/i.test(sheetName)) {
      console.log(`\n  ... ALL rows of ${sheetName}:`);
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.every((c: any) => c === undefined || c === null || c === '')) continue;
        const cells = row.map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          if (typeof c === 'number') return `[${j}]${c.toLocaleString()}`;
          return `[${j}]${String(c).substring(0, 30)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
    }
    
    // For Mapping sheet, show structure
    if (/Mapping/i.test(sheetName)) {
      console.log(`\n  ... Sample rows 0-5 and ~100-105 of ${sheetName}:`);
      for (let i = 0; i < Math.min(6, data.length); i++) {
        const row = data[i];
        if (!row) continue;
        const cells = row.slice(0, 10).map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          return `[${j}]${String(c).substring(0, 30)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
      for (let i = 100; i < Math.min(106, data.length); i++) {
        const row = data[i];
        if (!row) continue;
        const cells = row.slice(0, 10).map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          return `[${j}]${String(c).substring(0, 30)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
    }
    
    // For Rollup/Current State/85% sheets, show structure
    if (/Rollup|Current|85%/i.test(sheetName)) {
      console.log(`\n  ... Rows 0-50 of ${sheetName}:`);
      for (let i = 0; i < Math.min(50, data.length); i++) {
        const row = data[i];
        if (!row || row.every((c: any) => c === undefined || c === null || c === '')) continue;
        const cells = row.slice(0, 15).map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          if (typeof c === 'number') return `[${j}]${c.toLocaleString()}`;
          return `[${j}]${String(c).substring(0, 25)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
    }
    
    // For LOI sheet
    if (/LOI/i.test(sheetName)) {
      console.log(`\n  ... ALL rows of ${sheetName}:`);
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.every((c: any) => c === undefined || c === null || c === '')) continue;
        const cells = row.slice(0, 15).map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          if (typeof c === 'number') return `[${j}]${c.toLocaleString()}`;
          return `[${j}]${String(c).substring(0, 30)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
    }
    
    // For facility sheets (Ridgeview, Gateway, Firewood), show first 50 rows
    if (/Ridgeview|Gateway|Firewood|Firwood/i.test(sheetName)) {
      console.log(`\n  ... Rows 0-50 of facility sheet ${sheetName}:`);
      for (let i = 0; i < Math.min(50, data.length); i++) {
        const row = data[i];
        if (!row || row.every((c: any) => c === undefined || c === null || c === '')) continue;
        const cells = row.slice(0, 12).map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          if (typeof c === 'number') return `[${j}]${c.toLocaleString()}`;
          return `[${j}]${String(c).substring(0, 25)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
    }
    
    // For the List sheet, show all
    if (/^List$/i.test(sheetName)) {
      console.log(`\n  ... ALL rows of ${sheetName}:`);
      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        if (!row || row.every((c: any) => c === undefined || c === null || c === '')) continue;
        const cells = row.map((c: any, j: number) => {
          if (c === undefined || c === null) return `[${j}]`;
          if (typeof c === 'number') return `[${j}]${c.toLocaleString()}`;
          return `[${j}]${String(c).substring(0, 30)}`;
        });
        console.log(`  Row ${i}: ${cells.join(' | ')}`);
      }
    }
  }
}
