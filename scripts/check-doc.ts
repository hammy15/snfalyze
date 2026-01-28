import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import { documents } from '../src/db/schema';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DOC_ID = 'c8b304fd-fb2c-4689-ada7-41082034c02d';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, DOC_ID))
    .limit(1);

  if (!doc) {
    console.log('Document not found');
    return;
  }

  console.log('=== Document Status ===');
  console.log('ID:', doc.id);
  console.log('Filename:', doc.filename);
  console.log('Status:', doc.status);
  console.log('RawText length:', doc.rawText?.length || 0);

  console.log('\n=== Extracted Data Structure ===');
  const data = doc.extractedData as any;
  if (data) {
    console.log('Keys:', Object.keys(data));
    console.log('sheets is array?', Array.isArray(data.sheets));
    if (data.sheets) {
      console.log('sheets length:', Array.isArray(data.sheets) ? data.sheets.length : 'not array');
      if (Array.isArray(data.sheets) && data.sheets.length > 0) {
        console.log('First sheet keys:', Object.keys(data.sheets[0]));
        console.log('First sheet name:', data.sheets[0].name);
        console.log('First sheet rows:', data.sheets[0].rows?.length);
      }
    }
  } else {
    console.log('No extractedData');
  }

  process.exit(0);
}

main().catch(console.error);
