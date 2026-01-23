import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities, capitalPartners } from '@/db/schema';
import { sql } from 'drizzle-orm';

// Cascadia Healthcare facilities from CHC Master Info
const cascadiaFacilities = [
  // OWNED FACILITIES
  { name: 'Clearwater Health', address: '1204 Shriver, Orofino, ID 83544', city: 'Orofino', state: 'ID', assetType: 'SNF' as const, licensedBeds: 60, certifiedBeds: 60 },
  { name: 'CDA', address: '2514 N 7th St., CDA, ID 83814', city: 'Coeur d\'Alene', state: 'ID', assetType: 'SNF' as const, licensedBeds: 117, certifiedBeds: 83 },
  { name: 'The Cove SNF', address: '620 N 6th St., Bellevue, ID 83313', city: 'Bellevue', state: 'ID', assetType: 'SNF' as const, licensedBeds: 32, certifiedBeds: 32 },
  { name: 'The Cove ALF', address: '620 N 6th St., Bellevue, ID 83313', city: 'Bellevue', state: 'ID', assetType: 'ALF' as const, licensedBeds: 16, certifiedBeds: 16 },
  { name: 'Grangeville Health', address: 'Grangeville, Idaho', city: 'Grangeville', state: 'ID', assetType: 'SNF' as const, licensedBeds: 60, certifiedBeds: 60 },
  { name: 'Cascadia of Lewiston', address: 'Lewiston, Idaho', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 34, certifiedBeds: 34 },
  { name: 'Libby Care', address: '308 E 3rd St., Libby, MT 59923', city: 'Libby', state: 'MT', assetType: 'SNF' as const, licensedBeds: 101, certifiedBeds: 89 },
  { name: 'Village Manor', address: '2060 NE 238th Dr., Wood Village, OR 97060', city: 'Wood Village', state: 'OR', assetType: 'SNF' as const, licensedBeds: 60, certifiedBeds: 60 },
  { name: 'Brookfield', address: '510 North Parkway Ave., Battle Ground, WA 98604', city: 'Battle Ground', state: 'WA', assetType: 'SNF' as const, licensedBeds: 83, certifiedBeds: 76 },
  { name: 'Colville Health', address: '1000 E Elep Ave, Colville, WA 99114', city: 'Colville', state: 'WA', assetType: 'SNF' as const, licensedBeds: 92, certifiedBeds: 92 },
  { name: 'Alderwood', address: '2726 Alderwood Avenue, Bellingham, WA 98225', city: 'Bellingham', state: 'WA', assetType: 'SNF' as const, licensedBeds: 102, certifiedBeds: 92 },
  { name: 'Snohomish Health', address: '800 10th Street, Snohomish, WA 98290', city: 'Snohomish', state: 'WA', assetType: 'SNF' as const, licensedBeds: 91, certifiedBeds: 91 },
  { name: 'Eagle Rock', address: '840 E Elva St, Idaho Falls, ID 83401', city: 'Idaho Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 113, certifiedBeds: 113 },
  { name: 'Silverton Health', address: '405 W 7th Street, Silverton, ID 83867', city: 'Silverton', state: 'ID', assetType: 'SNF' as const, licensedBeds: 50, certifiedBeds: 50 },
  { name: 'Paradise Creek', address: '640 N Eisenhower St, Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'SNF' as const, licensedBeds: 62, certifiedBeds: 62 },
  { name: 'Mountain View', address: '10 Mountain View Drive, Eureka, MT 59917', city: 'Eureka', state: 'MT', assetType: 'SNF' as const, licensedBeds: 49, certifiedBeds: 49 },
  { name: 'Curry Village', address: '1 Park Avenue, Brookings, OR 97415', city: 'Brookings', state: 'OR', assetType: 'SNF' as const, licensedBeds: 59, certifiedBeds: 59 },
  { name: 'Creekside', address: '3500 Hilyard Street, Eugene, OR 97405', city: 'Eugene', state: 'OR', assetType: 'SNF' as const, licensedBeds: 87, certifiedBeds: 56 },
  { name: 'Fairlawn', address: '3457 Division Street, Gresham, OR 97030', city: 'Gresham', state: 'OR', assetType: 'SNF' as const, licensedBeds: 62, certifiedBeds: 62 },
  { name: 'Spokane Valley', address: '17121 E 8th Avenue, Spokane Valley, WA 99016', city: 'Spokane Valley', state: 'WA', assetType: 'SNF' as const, licensedBeds: 97, certifiedBeds: 97 },
  { name: 'Stafholt', address: '456 C Street, Blaine, WA 98230', city: 'Blaine', state: 'WA', assetType: 'SNF' as const, licensedBeds: 57, certifiedBeds: 57 },
  { name: 'Silverton Retirement Living', address: '405 W 7th Street, Silverton, ID 83867', city: 'Silverton', state: 'ID', assetType: 'ILF' as const, licensedBeds: 21, certifiedBeds: 21 },
  { name: 'Paradise Creek Retirement', address: '640 N Eisenhower St, Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'ILF' as const, licensedBeds: 157, certifiedBeds: 157 },
  { name: 'Hillside Apartments', address: '1 Park Avenue, Brookings, OR 97415', city: 'Brookings', state: 'OR', assetType: 'ILF' as const, licensedBeds: 13, certifiedBeds: 13 },
  { name: 'Creekside Retirement Living', address: '3500 Hilyard Street, Eugene, OR 97405', city: 'Eugene', state: 'OR', assetType: 'ILF' as const, licensedBeds: 63, certifiedBeds: 63 },
  { name: 'Fairlawn Retirement', address: '1280 NE Kane Drive, Gresham, OR 97030', city: 'Gresham', state: 'OR', assetType: 'ILF' as const, licensedBeds: 119, certifiedBeds: 119 },
  { name: 'Olympus Living of Spokane', address: '17121 E 8th Avenue, Spokane Valley, WA 99016', city: 'Spokane Valley', state: 'WA', assetType: 'ILF' as const, licensedBeds: 149, certifiedBeds: 149 },
  { name: 'Boswell', address: '10601 W Santa Fe Drive, Sun City AZ 85351', city: 'Sun City', state: 'AZ', assetType: 'SNF' as const, licensedBeds: 115, certifiedBeds: 115 },
  { name: 'NorthPark', address: '2020 N 95th Ave, Phoenix, AZ 85037', city: 'Phoenix', state: 'AZ', assetType: 'SNF' as const, licensedBeds: 54, certifiedBeds: 54 },

  // LEASED FACILITIES
  { name: 'Shaw Mountain', address: '909 Reserve St., Boise, ID 83702', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 98, certifiedBeds: 98 },
  { name: 'Wellspring', address: '2105 12th Ave Rd., Nampa, ID 83686', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 120, certifiedBeds: 110 },
  { name: 'Canyon West', address: '2814 South Indiana Ave., Caldwell, ID 83605', city: 'Caldwell', state: 'ID', assetType: 'SNF' as const, licensedBeds: 103, certifiedBeds: 81 },
  { name: 'Mountain Valley', address: '601 West Cameron Ave., Kellogg, ID 83837', city: 'Kellogg', state: 'ID', assetType: 'SNF' as const, licensedBeds: 68, certifiedBeds: 68 },
  { name: 'Caldwell Care', address: '210 Cleveland Blvd., Caldwell, ID 83605', city: 'Caldwell', state: 'ID', assetType: 'SNF' as const, licensedBeds: 68, certifiedBeds: 66 },
  { name: 'Aspen Park', address: '420 Rowe St., Moscow, ID 83843', city: 'Moscow', state: 'ID', assetType: 'SNF' as const, licensedBeds: 70, certifiedBeds: 66 },
  { name: 'Lewiston Transitional', address: '3315 8th St., Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 96, certifiedBeds: 71 },
  { name: 'Weiser Care', address: '331 East Park St., Weiser, ID 83672', city: 'Weiser', state: 'ID', assetType: 'SNF' as const, licensedBeds: 71, certifiedBeds: 62 },
  { name: 'The Orchards', address: '404 North Horton St., Nampa, ID 83651', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 100, certifiedBeds: 92 },
  { name: 'Cascadia of Nampa', address: '900 N Happy Valley Rd., Nampa, ID 83687', city: 'Nampa', state: 'ID', assetType: 'SNF' as const, licensedBeds: 99, certifiedBeds: 99 },
  { name: 'Cascadia of Boise', address: '6000 W Denton St., Boise, ID 83706', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 99, certifiedBeds: 99 },
  { name: 'Twin Falls Transitional', address: '674 Eastland Drive, Twin Falls, ID 83301', city: 'Twin Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 116, certifiedBeds: 114 },
  { name: 'Arbor Valley', address: '8211 Ustick Rd, Boise, ID 83704', city: 'Boise', state: 'ID', assetType: 'SNF' as const, licensedBeds: 148, certifiedBeds: 148 },
  { name: 'Payette Health', address: '1019 3rd Avenue S., Payette, ID 83661', city: 'Payette', state: 'ID', assetType: 'SNF' as const, licensedBeds: 80, certifiedBeds: 60 },
  { name: 'Cherry Ridge', address: '501 W. Idaho Blvd., Emmett, ID 83617', city: 'Emmett', state: 'ID', assetType: 'SNF' as const, licensedBeds: 40, certifiedBeds: 38 },
  { name: 'Royal Plaza', address: '2870 Juniper Drive, Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'SNF' as const, licensedBeds: 63, certifiedBeds: 63 },
  { name: 'Royal Plaza Senior Living', address: '2870 Juniper Drive, Lewiston, ID 83501', city: 'Lewiston', state: 'ID', assetType: 'ALF' as const, licensedBeds: 110, certifiedBeds: 110 },
  { name: 'Teton Healthcare', address: '3111 Channing Way, Idaho Falls, ID 83403', city: 'Idaho Falls', state: 'ID', assetType: 'SNF' as const, licensedBeds: 88, certifiedBeds: 78 },
  { name: 'Mount Ascension', address: '2475 Winne Ave, Helena, MT 59601', city: 'Helena', state: 'MT', assetType: 'SNF' as const, licensedBeds: 108, certifiedBeds: 108 },
  { name: 'Secora Rehab', address: '10435 SE Cora St., Portland, OR 97266', city: 'Portland', state: 'OR', assetType: 'SNF' as const, licensedBeds: 53, certifiedBeds: 53 },
  { name: 'Clarkston Health', address: '1242 11th St., Clarkston, WA 99403', city: 'Clarkston', state: 'WA', assetType: 'SNF' as const, licensedBeds: 90, certifiedBeds: 87 },
  { name: 'Hudson Bay', address: '8507 NE 8th Way, Vancouver, WA 98664', city: 'Vancouver', state: 'WA', assetType: 'SNF' as const, licensedBeds: 92, certifiedBeds: 89 },
  { name: 'Colfax Health', address: '1150 W. Fairview Street, Colfax, WA 99111', city: 'Colfax', state: 'WA', assetType: 'SNF' as const, licensedBeds: 55, certifiedBeds: 55 },
  { name: 'Highland', address: '2400 Samish Way, Bellingham, WA 98229', city: 'Bellingham', state: 'WA', assetType: 'SNF' as const, licensedBeds: 44, certifiedBeds: 44 },
];

export async function POST() {
  try {
    console.log('Starting database reset for demo...');

    // Clear all deals (cascades to related tables)
    await db.delete(deals);
    console.log('Cleared deals');

    // Clear facilities
    await db.delete(facilities);
    console.log('Cleared facilities');

    // Clear capital partners
    await db.delete(capitalPartners);
    console.log('Cleared capital partners');

    // Insert Cascadia facilities
    for (const facility of cascadiaFacilities) {
      await db.insert(facilities).values(facility);
    }
    console.log(`Inserted ${cascadiaFacilities.length} Cascadia facilities`);

    // Get counts
    const facilityCount = await db.select({ count: sql<number>`count(*)` }).from(facilities);
    const dealCount = await db.select({ count: sql<number>`count(*)` }).from(deals);
    const partnerCount = await db.select({ count: sql<number>`count(*)` }).from(capitalPartners);

    return NextResponse.json({
      success: true,
      message: 'Database reset complete',
      data: {
        facilities: Number(facilityCount[0].count),
        deals: Number(dealCount[0].count),
        capitalPartners: Number(partnerCount[0].count),
      },
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset database' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to reset the database for demo. This will clear all deals, facilities (except Cascadia), and capital partners.',
    warning: 'This action cannot be undone!',
  });
}
