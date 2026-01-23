/**
 * Reset database for demo/testing
 * Clears all deals, documents, capital partners
 * Seeds Cascadia Healthcare facilities from CHC Master file
 */

import { db } from '@/db';
import { deals, facilities, documents, capitalPartners, valuations, financialPeriods, capexItems, partnerMatches, assumptions, overrides, dealMemory, riskFactors, proformaScenarios, saleLeaseback, analysisStages, agentSessions, extractionClarifications, documentConflicts, fieldCorrections } from '@/db/schema';
import { sql } from 'drizzle-orm';

// Cascadia Healthcare facilities from CHC Master Info
const cascadiaFacilities = [
  // OWNED FACILITIES
  { name: 'Clearwater Health', shortName: 'Clearwater', address: '1204 Shriver, Orofino, ID 83544', city: 'Orofino', state: 'ID', assetType: 'SNF' as const, licensedBeds: 60, operationalBeds: 60, ownership: 'owned' },
  { name: 'CDA', shortName: 'CDA', address: '2514 N 7th St., CDA, ID 83814', city: 'Coeur d\'Alene', state: 'ID', assetType: 'SNF' as const, licensedBeds: 117, operationalBeds: 83, ownership: 'owned' },
  { name: 'The Cove SNF', shortName: 'The Cove', address: '620 N 6th St., Bellevue, ID 83313', city: 'Bellevue', state: 'ID', assetType: 'SNF' as const, licensedBeds: 32, operationalBeds: 32, ownership: 'owned' },
  { name: 'The Cove ALF', shortName: 'The Cove ALF', address: '620 N 6th St., Bellevue, ID 83313', city: 'Bellevue', state: 'ID', assetType: 'ALF' as const, licensedBeds: 16, operationalBeds: 16, ownership: 'owned' },
  { name: 'Grangeville Health', shortName: 'Grangeville', address: 'Grangeville, Idaho', city: 'Grangeville', state: 'ID', assetType: 'SNF' as const, licensedBeds: 60, operationalBeds: 60, ownership: 'owned' },
  { name: 'Cascadia of Lewiston', shortName: 'Cascadia of Lewiston', address: 'Lewiston, Idaho', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 34, operationalBeds: 34, ownership: 'owned' },
  { name: 'Libby Care', shortName: 'Libby', address: '308 E 3rd St., Libby, MT 59923', city: 'Libby', state: 'MT', assetType: 'SNF' as const, licensedBeds: 101, operationalBeds: 89, ownership: 'owned' },
  { name: 'Village Manor', shortName: 'Village Manor', address: '2060 NE 238th Dr., Wood Village, OR 97060', city: 'Wood Village', state: 'OR', assetType: 'SNF' as const, licensedBeds: 60, operationalBeds: 60, ownership: 'owned' },
  { name: 'Brookfield', shortName: 'Brookfield', address: '510 North Parkway Ave., Battle Ground, WA 98604', city: 'Battle Ground', state: 'WA', assetType: 'SNF' as const, licensedBeds: 83, operationalBeds: 76, ownership: 'owned' },
  { name: 'Colville Health', shortName: 'Colville', address: '1000 E Elep Ave, Colville, WA 99114', city: 'Colville', state: 'WA', assetType: 'SNF' as const, licensedBeds: 92, operationalBeds: 92, ownership: 'owned' },
  { name: 'Alderwood', shortName: 'Alderwood', address: '2726 Alderwood Avenue, Bellingham, WA 98225', city: 'Bellingham', state: 'WA', assetType: 'SNF' as const, licensedBeds: 102, operationalBeds: 92, ownership: 'owned' },
  { name: 'Snohomish Health', shortName: 'Snohomish', address: '800 10th Street, Snohomish, WA 98290', city: 'Snohomish', state: 'WA', assetType: 'SNF' as const, licensedBeds: 91, operationalBeds: 91, ownership: 'owned' },
  { name: 'Eagle Rock', shortName: 'Eagle Rock', address: '840 E Elva St, Idaho Falls, ID 83401', city: 'Idaho Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 113, operationalBeds: 113, ownership: 'owned' },
  { name: 'Silverton Health', shortName: 'Silverton', address: '405 W 7th Street, Silverton, ID 83867', city: 'Silverton', state: 'ID', assetType: 'SNF' as const, licensedBeds: 50, operationalBeds: 50, ownership: 'owned' },
  { name: 'Paradise Creek', shortName: 'Paradise Creek', address: '640 N Eisenhower St, Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'SNF' as const, licensedBeds: 62, operationalBeds: 62, ownership: 'owned' },
  { name: 'Mountain View', shortName: 'Mountain View', address: '10 Mountain View Drive, Eureka, MT 59917', city: 'Eureka', state: 'MT', assetType: 'SNF' as const, licensedBeds: 49, operationalBeds: 49, ownership: 'owned' },
  { name: 'Curry Village', shortName: 'Curry Village', address: '1 Park Avenue, Brookings, OR 97415', city: 'Brookings', state: 'OR', assetType: 'SNF' as const, licensedBeds: 59, operationalBeds: 59, ownership: 'owned' },
  { name: 'Creekside', shortName: 'Creekside', address: '3500 Hilyard Street, Eugene, OR 97405', city: 'Eugene', state: 'OR', assetType: 'SNF' as const, licensedBeds: 87, operationalBeds: 56, ownership: 'owned' },
  { name: 'Fairlawn', shortName: 'Fairlawn', address: '3457 Division Street, Gresham, OR 97030', city: 'Gresham', state: 'OR', assetType: 'SNF' as const, licensedBeds: 62, operationalBeds: 62, ownership: 'owned' },
  { name: 'Spokane Valley', shortName: 'Spokane Valley', address: '17121 E 8th Avenue, Spokane Valley, WA 99016', city: 'Spokane Valley', state: 'WA', assetType: 'SNF' as const, licensedBeds: 97, operationalBeds: 97, ownership: 'owned' },
  { name: 'Stafholt', shortName: 'Stafholt', address: '456 C Street, Blaine, WA 98230', city: 'Blaine', state: 'WA', assetType: 'SNF' as const, licensedBeds: 57, operationalBeds: 57, ownership: 'owned' },
  { name: 'Silverton Retirement Living', shortName: 'Silverton ILF', address: '405 W 7th Street, Silverton, ID 83867', city: 'Silverton', state: 'ID', assetType: 'ILF' as const, licensedBeds: 21, operationalBeds: 21, ownership: 'owned' },
  { name: 'Paradise Creek Retirement', shortName: 'Paradise Creek ILF', address: '640 N Eisenhower St, Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'ILF' as const, licensedBeds: 157, operationalBeds: 157, ownership: 'owned' },
  { name: 'Hillside Apartments', shortName: 'Curry Village ILF', address: '1 Park Avenue, Brookings, OR 97415', city: 'Brookings', state: 'OR', assetType: 'ILF' as const, licensedBeds: 13, operationalBeds: 13, ownership: 'owned' },
  { name: 'Creekside Retirement Living', shortName: 'Creekside ILF', address: '3500 Hilyard Street, Eugene, OR 97405', city: 'Eugene', state: 'OR', assetType: 'ILF' as const, licensedBeds: 63, operationalBeds: 63, ownership: 'owned' },
  { name: 'Fairlawn Retirement', shortName: 'Fairlawn ILF', address: '1280 NE Kane Drive, Gresham, OR 97030', city: 'Gresham', state: 'OR', assetType: 'ILF' as const, licensedBeds: 119, operationalBeds: 119, ownership: 'owned' },
  { name: 'Olympus Living of Spokane', shortName: 'Spokane Valley ILF', address: '17121 E 8th Avenue, Spokane Valley, WA 99016', city: 'Spokane Valley', state: 'WA', assetType: 'ILF' as const, licensedBeds: 149, operationalBeds: 149, ownership: 'owned' },
  { name: 'Boswell', shortName: 'Boswell', address: '10601 W Santa Fe Drive, Sun City AZ 85351', city: 'Sun City', state: 'AZ', assetType: 'SNF' as const, licensedBeds: 115, operationalBeds: 115, ownership: 'path_to_ownership' },
  { name: 'NorthPark', shortName: 'North Park', address: '2020 N 95th Ave, Phoenix, AZ 85037', city: 'Phoenix', state: 'AZ', assetType: 'SNF' as const, licensedBeds: 54, operationalBeds: 54, ownership: 'path_to_ownership' },

  // LEASED FACILITIES
  { name: 'Shaw Mountain', shortName: 'Shaw', address: '909 Reserve St., Boise, ID 83702', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 98, operationalBeds: 98, ownership: 'leased' },
  { name: 'Wellspring', shortName: 'Wellspring', address: '2105 12th Ave Rd., Nampa, ID 83686', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 120, operationalBeds: 110, ownership: 'leased' },
  { name: 'Canyon West', shortName: 'Canyon West', address: '2814 South Indiana Ave., Caldwell, ID 83605', city: 'Caldwell', state: 'ID', assetType: 'SNF' as const, licensedBeds: 103, operationalBeds: 81, ownership: 'leased' },
  { name: 'Mountain Valley', shortName: 'Mountain Valley', address: '601 West Cameron Ave., Kellogg, ID 83837', city: 'Kellogg', state: 'ID', assetType: 'SNF' as const, licensedBeds: 68, operationalBeds: 68, ownership: 'leased' },
  { name: 'Caldwell Care', shortName: 'Caldwell', address: '210 Cleveland Blvd., Caldwell, ID 83605', city: 'Caldwell', state: 'ID', assetType: 'SNF' as const, licensedBeds: 68, operationalBeds: 66, ownership: 'leased' },
  { name: 'Aspen Park', shortName: 'Aspen Park', address: '420 Rowe St., Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'SNF' as const, licensedBeds: 70, operationalBeds: 66, ownership: 'leased' },
  { name: 'Lewiston Transitional', shortName: 'Lewiston', address: '3315 8th St., Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 96, operationalBeds: 71, ownership: 'leased' },
  { name: 'Weiser Care', shortName: 'Weiser', address: '331 East Park St., Weiser, ID 83672', city: 'Weiser', state: 'ID', assetType: 'SNF' as const, licensedBeds: 71, operationalBeds: 62, ownership: 'leased' },
  { name: 'The Orchards', shortName: 'Orchards', address: '404 North Horton St., Nampa, ID 83651', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 100, operationalBeds: 92, ownership: 'leased' },
  { name: 'Cascadia of Nampa', shortName: 'Nampa', address: '900 N Happy Valley Rd., Nampa, ID 83687', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 99, operationalBeds: 99, ownership: 'leased' },
  { name: 'Cascadia of Boise', shortName: 'Boise', address: '6000 W Denton St., Boise, ID 83706', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 99, operationalBeds: 99, ownership: 'leased' },
  { name: 'Twin Falls Transitional', shortName: 'Twin', address: '674 Eastland Drive, Twin Falls, ID 83301', city: 'Twin Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 116, operationalBeds: 114, ownership: 'leased' },
  { name: 'Arbor Valley', shortName: 'Arbor Valley', address: '8211 Ustick Rd, Boise, ID 83704', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 148, operationalBeds: 148, ownership: 'leased' },
  { name: 'Payette Health', shortName: 'Payette', address: '1019 3rd Avenue S., Payette, ID 83661', city: 'Payette', state: 'ID', assetType: 'SNF' as const, licensedBeds: 80, operationalBeds: 60, ownership: 'leased' },
  { name: 'Cherry Ridge', shortName: 'Cherry Ridge', address: '501 W. Idaho Blvd., Emmett, ID 83617', city: 'Emmett', state: 'ID', assetType: 'SNF' as const, licensedBeds: 40, operationalBeds: 38, ownership: 'leased' },
  { name: 'Royal Plaza', shortName: 'Royal Plaza SNF', address: '2870 Juniper Drive, Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 63, operationalBeds: 63, ownership: 'leased' },
  { name: 'Royal Plaza Senior Living', shortName: 'Royal Plaza ALF', address: '2870 Juniper Drive, Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'ALF' as const, licensedBeds: 110, operationalBeds: 110, ownership: 'leased' },
  { name: 'Teton Healthcare', shortName: 'Teton', address: '3111 Channing Way, Idaho Falls, ID 83403', city: 'Idaho Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 88, operationalBeds: 78, ownership: 'leased' },
  { name: 'Mount Ascension', shortName: 'Mount Ascension', address: '2475 Winne Ave, Helena, MT 59601', city: 'Helena', state: 'MT', assetType: 'SNF' as const, licensedBeds: 108, operationalBeds: 108, ownership: 'leased' },
  { name: 'Secora Rehab', shortName: 'Secora', address: '10435 SE Cora St., Portland, OR 97266', city: 'Portland', state: 'OR', assetType: 'SNF' as const, licensedBeds: 53, operationalBeds: 53, ownership: 'leased' },
  { name: 'Clarkston Health', shortName: 'Clarkston', address: '1242 11th St., Clarkston, WA 99403', city: 'Clarkston', state: 'WA', assetType: 'SNF' as const, licensedBeds: 90, operationalBeds: 87, ownership: 'leased' },
  { name: 'Hudson Bay', shortName: 'Hudson Bay', address: '8507 NE 8th Way, Vancouver, WA 98664', city: 'Vancouver', state: 'WA', assetType: 'SNF' as const, licensedBeds: 92, operationalBeds: 89, ownership: 'leased' },
  { name: 'Colfax Health', shortName: 'Colfax', address: '1150 W. Fairview Street, Colfax, WA 99111', city: 'Colfax', state: 'WA', assetType: 'SNF' as const, licensedBeds: 55, operationalBeds: 55, ownership: 'leased' },
  { name: 'Highland', shortName: 'Highland', address: '2400 Samish Way, Bellingham, WA 98229', city: 'Bellingham', state: 'WA', assetType: 'SNF' as const, licensedBeds: 44, operationalBeds: 44, ownership: 'leased' },
];

export async function resetForDemo() {
  console.log('Starting database reset for demo...\n');

  try {
    // Clear all deals (this will cascade delete related records)
    console.log('Clearing deals and related data...');
    await db.delete(deals);
    console.log('  ✓ Deals cleared');

    // Clear facilities (non-deal linked ones)
    console.log('Clearing facilities...');
    await db.delete(facilities);
    console.log('  ✓ Facilities cleared');

    // Clear capital partners
    console.log('Clearing capital partners...');
    await db.delete(capitalPartners);
    console.log('  ✓ Capital partners cleared');

    // Insert Cascadia facilities
    console.log('\nSeeding Cascadia Healthcare facilities...');

    for (const facility of cascadiaFacilities) {
      await db.insert(facilities).values({
        name: facility.name,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        assetType: facility.assetType,
        licensedBeds: facility.licensedBeds,
        certifiedBeds: facility.operationalBeds,
      });
    }

    console.log(`  ✓ Inserted ${cascadiaFacilities.length} Cascadia facilities`);

    // Summary
    const facilityCount = await db.select({ count: sql<number>`count(*)` }).from(facilities);
    const dealCount = await db.select({ count: sql<number>`count(*)` }).from(deals);
    const partnerCount = await db.select({ count: sql<number>`count(*)` }).from(capitalPartners);

    console.log('\n=== Reset Complete ===');
    console.log(`Facilities: ${facilityCount[0].count}`);
    console.log(`Deals: ${dealCount[0].count}`);
    console.log(`Capital Partners: ${partnerCount[0].count}`);
    console.log('\nReady for first upload test!');

  } catch (error) {
    console.error('Error during reset:', error);
    throw error;
  }
}

// Run if called directly
resetForDemo()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
