import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const DEAL_ID = 'b41c8c6b-cb78-42db-a35e-c7c76d799764';

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log('=== Financial Periods ===');
  const periods = await sql`SELECT id, "facilityId", "periodStart", "periodEnd" FROM "financialPeriods" WHERE "dealId" = ${DEAL_ID} LIMIT 5`;
  console.log('Count:', periods.length);
  console.log(periods);

  console.log('\n=== Census Periods ===');
  const census = await sql`SELECT id, "facilityId", "periodStart", "periodEnd" FROM "facilityCensusPeriods" WHERE "dealId" = ${DEAL_ID} LIMIT 5`;
  console.log('Count:', census.length);
  console.log(census);

  console.log('\n=== Facilities ===');
  const facilities = await sql`SELECT id, name, ccn FROM facilities WHERE "dealId" = ${DEAL_ID}`;
  console.log('Count:', facilities.length);
  console.log(facilities);
}

main().catch(console.error);
