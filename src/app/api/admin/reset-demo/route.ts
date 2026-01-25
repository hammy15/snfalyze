import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities, capitalPartners, documents, financialPeriods, valuations } from '@/db/schema';
import { sql } from 'drizzle-orm';

// Demo Deals Data
const demoDeals = [
  {
    name: 'Sunrise Senior Living Portfolio',
    status: 'due_diligence' as const,
    assetType: 'SNF' as const,
    askingPrice: '45000000',
    beds: 340,
    primaryState: 'TX',
    markets: ['Dallas-Fort Worth', 'Houston', 'Austin'],
    brokerName: 'Michael Chen',
    brokerFirm: 'Marcus & Millichap Healthcare',
    sellerName: 'Sunrise Holdings LLC',
    brokerCredibilityScore: 85,
    thesis: 'Strong regional portfolio with upside potential through operational improvements and Medicaid rate increases expected in Q2 2025.',
    confidenceScore: 78,
    analysisNarrative: 'Portfolio shows consistent 88% occupancy across facilities with room for improvement. Labor costs are 5% above market, presenting optimization opportunity. Recent Texas Medicaid rate increases will boost revenue by approximately $1.2M annually.',
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Valley Healthcare Partners',
    status: 'under_loi' as const,
    assetType: 'SNF' as const,
    askingPrice: '28000000',
    beds: 220,
    primaryState: 'FL',
    markets: ['Tampa Bay', 'Orlando'],
    brokerName: 'Sarah Johnson',
    brokerFirm: 'Blueprint Healthcare Real Estate',
    sellerName: 'Valley Health Systems Inc.',
    brokerCredibilityScore: 92,
    thesis: 'Well-maintained facilities in high-growth Florida markets with strong Medicare mix and experienced management team willing to stay post-acquisition.',
    confidenceScore: 82,
    analysisNarrative: 'Facilities benefit from Florida\'s favorable reimbursement environment. Medicare revenue represents 35% of total, well above regional average. CMS ratings of 4 and 5 stars indicate quality operations.',
    dealStructure: 'purchase' as const,
    isAllOrNothing: false,
  },
  {
    name: 'Midwest Care Centers',
    status: 'new' as const,
    assetType: 'SNF' as const,
    askingPrice: '12000000',
    beds: 95,
    primaryState: 'OH',
    markets: ['Columbus'],
    brokerName: 'David Williams',
    brokerFirm: 'Senior Living Investment Brokerage',
    sellerName: 'Private Owner',
    brokerCredibilityScore: 78,
    thesis: 'Single-facility acquisition opportunity in underserved Columbus submarket. Building needs $1.5M in deferred maintenance but location fundamentals are strong.',
    confidenceScore: 65,
    analysisNarrative: 'Facility has experienced occupancy decline from 92% to 78% over 18 months due to management transition. New ownership with operational expertise could restore census and improve margins significantly.',
    dealStructure: 'purchase' as const,
    isAllOrNothing: true,
  },
  {
    name: 'Coastal Living Group',
    status: 'closed' as const,
    assetType: 'ALF' as const,
    askingPrice: '62000000',
    beds: 480,
    primaryState: 'CA',
    markets: ['San Diego', 'Los Angeles', 'Orange County', 'Santa Barbara'],
    brokerName: 'Jennifer Martinez',
    brokerFirm: 'JLL Healthcare Capital Markets',
    sellerName: 'Coastal Senior Services Corp.',
    brokerCredibilityScore: 95,
    thesis: 'Premium ALF portfolio in high-barrier-to-entry California coastal markets. Strong private-pay resident base with average length of stay exceeding 36 months.',
    confidenceScore: 91,
    analysisNarrative: 'Closed at $58.5M after 45-day due diligence. Portfolio achieved 94% stabilized occupancy with EBITDAR margins of 28%. Sale-leaseback structure provided 7.25% yield to REIT partner.',
    dealStructure: 'sale_leaseback' as const,
    isAllOrNothing: true,
  },
];

// Demo Facilities Data (will be linked to deals)
const demoFacilities = {
  'Sunrise Senior Living Portfolio': [
    { name: 'Sunrise at Preston Hollow', address: '8350 Park Lane', city: 'Dallas', state: 'TX', zipCode: '75231', assetType: 'SNF' as const, licensedBeds: 120, certifiedBeds: 118, yearBuilt: 2008, cmsRating: 4, occupancyRate: 89 },
    { name: 'Sunrise of Katy', address: '1450 S Mason Rd', city: 'Katy', state: 'TX', zipCode: '77450', assetType: 'SNF' as const, licensedBeds: 110, certifiedBeds: 110, yearBuilt: 2012, cmsRating: 4, occupancyRate: 87 },
    { name: 'Sunrise Health Austin', address: '5600 N Lamar Blvd', city: 'Austin', state: 'TX', zipCode: '78751', assetType: 'SNF' as const, licensedBeds: 110, certifiedBeds: 108, yearBuilt: 2015, cmsRating: 3, occupancyRate: 85 },
  ],
  'Valley Healthcare Partners': [
    { name: 'Valley Tampa Rehabilitation', address: '4200 N Dale Mabry Hwy', city: 'Tampa', state: 'FL', zipCode: '33614', assetType: 'SNF' as const, licensedBeds: 120, certifiedBeds: 120, yearBuilt: 2010, cmsRating: 5, occupancyRate: 91 },
    { name: 'Valley Orlando Health Center', address: '2850 Sand Lake Rd', city: 'Orlando', state: 'FL', zipCode: '32819', assetType: 'SNF' as const, licensedBeds: 100, certifiedBeds: 98, yearBuilt: 2014, cmsRating: 4, occupancyRate: 88 },
  ],
  'Midwest Care Centers': [
    { name: 'Columbus Care & Rehabilitation', address: '1280 Bethel Rd', city: 'Columbus', state: 'OH', zipCode: '43220', assetType: 'SNF' as const, licensedBeds: 95, certifiedBeds: 90, yearBuilt: 1998, cmsRating: 3, occupancyRate: 78 },
  ],
  'Coastal Living Group': [
    { name: 'Coastal La Jolla', address: '7550 Fay Ave', city: 'La Jolla', state: 'CA', zipCode: '92037', assetType: 'ALF' as const, licensedBeds: 140, certifiedBeds: 140, yearBuilt: 2016, cmsRating: 5, occupancyRate: 95 },
    { name: 'Coastal Brentwood', address: '11900 San Vicente Blvd', city: 'Los Angeles', state: 'CA', zipCode: '90049', assetType: 'ALF' as const, licensedBeds: 120, certifiedBeds: 118, yearBuilt: 2018, cmsRating: 5, occupancyRate: 93 },
    { name: 'Coastal Newport Beach', address: '350 Newport Center Dr', city: 'Newport Beach', state: 'CA', zipCode: '92660', assetType: 'ALF' as const, licensedBeds: 110, certifiedBeds: 110, yearBuilt: 2014, cmsRating: 4, occupancyRate: 94 },
    { name: 'Coastal Santa Barbara', address: '1600 State St', city: 'Santa Barbara', state: 'CA', zipCode: '93101', assetType: 'ALF' as const, licensedBeds: 110, certifiedBeds: 108, yearBuilt: 2012, cmsRating: 4, occupancyRate: 92 },
  ],
};

// Demo Documents Data
const demoDocuments = {
  'Sunrise Senior Living Portfolio': [
    { filename: 'Sunrise_Portfolio_PL_2024.pdf', type: 'financial_statement' as const, status: 'complete' as const, periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 92 },
    { filename: 'Sunrise_Census_Report_Q4_2024.xlsx', type: 'census_report' as const, status: 'complete' as const, periodStart: '2024-10-01', periodEnd: '2024-12-31', extractionConfidence: 88 },
    { filename: 'Sunrise_Offering_Memorandum.pdf', type: 'om_package' as const, status: 'complete' as const, extractionConfidence: 95 },
  ],
  'Valley Healthcare Partners': [
    { filename: 'Valley_Healthcare_Financials_2024.pdf', type: 'financial_statement' as const, status: 'complete' as const, periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 89 },
    { filename: 'Valley_OM_Package.pdf', type: 'om_package' as const, status: 'complete' as const, extractionConfidence: 94 },
  ],
  'Midwest Care Centers': [
    { filename: 'Columbus_Care_TTM_PL.pdf', type: 'financial_statement' as const, status: 'complete' as const, periodStart: '2024-02-01', periodEnd: '2025-01-31', extractionConfidence: 78 },
    { filename: 'Columbus_Census_Monthly.xlsx', type: 'census_report' as const, status: 'complete' as const, periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 82 },
    { filename: 'Columbus_Offering_Package.pdf', type: 'om_package' as const, status: 'complete' as const, extractionConfidence: 86 },
  ],
  'Coastal Living Group': [
    { filename: 'Coastal_Living_Audited_Financials_2024.pdf', type: 'financial_statement' as const, status: 'complete' as const, periodStart: '2024-01-01', periodEnd: '2024-12-31', extractionConfidence: 96 },
    { filename: 'Coastal_Portfolio_OM.pdf', type: 'om_package' as const, status: 'complete' as const, extractionConfidence: 97 },
    { filename: 'Coastal_Appraisal_Report.pdf', type: 'appraisal' as const, status: 'complete' as const, extractionConfidence: 94 },
  ],
};

// Demo Capital Partners
const demoPartners = [
  {
    name: 'Regional Healthcare Finance',
    type: 'lender' as const,
    assetTypes: ['SNF', 'ALF'] as ('SNF' | 'ALF' | 'ILF')[],
    geographies: ['TX', 'FL', 'OH', 'CA', 'PA', 'NY'],
    minDealSize: '5000000',
    maxDealSize: '75000000',
    targetYield: '0.085',
    maxLtv: '0.75',
    preferredStructure: 'Senior Secured Loan',
    termPreference: '5-7 years',
    riskTolerance: 'moderate' as const,
    contactName: 'Robert Thompson',
    contactEmail: 'rthompson@regionalhcf.com',
    notes: 'Strong appetite for stabilized SNF portfolios. Quick close capability with dedicated healthcare underwriting team. Recently increased allocation to senior housing.',
    status: 'active',
    minimumCoverageRatio: '1.35',
    preferredDealStructures: ['purchase', 'acquisition_financing'],
    leaseTermPreference: 'N/A',
  },
  {
    name: 'Senior Housing Trust',
    type: 'reit' as const,
    assetTypes: ['SNF', 'ALF', 'ILF'] as ('SNF' | 'ALF' | 'ILF')[],
    geographies: ['CA', 'FL', 'TX', 'AZ', 'WA', 'OR'],
    minDealSize: '20000000',
    maxDealSize: '150000000',
    targetYield: '0.0725',
    preferredStructure: 'Sale-Leaseback',
    termPreference: '15-20 year triple net',
    riskTolerance: 'conservative' as const,
    contactName: 'Amanda Richards',
    contactEmail: 'arichards@seniorhousingtrust.com',
    notes: 'Public REIT focused on high-quality senior housing assets. Preference for coastal markets and Class A properties. Requires 1.5x coverage minimum.',
    status: 'active',
    minimumCoverageRatio: '1.5',
    preferredDealStructures: ['sale_leaseback'],
    leaseTermPreference: '15-20 years',
    rentEscalation: '0.025',
  },
  {
    name: 'Carebridge Capital',
    type: 'equity' as const,
    assetTypes: ['SNF', 'ALF'] as ('SNF' | 'ALF' | 'ILF')[],
    geographies: ['TX', 'FL', 'OH', 'PA', 'IL', 'GA'],
    minDealSize: '10000000',
    maxDealSize: '100000000',
    targetYield: '0.15',
    preferredStructure: 'JV Equity Partnership',
    termPreference: '5-7 year hold',
    riskTolerance: 'aggressive' as const,
    contactName: 'Marcus Johnson',
    contactEmail: 'mjohnson@carebridgecapital.com',
    notes: 'Value-add focused PE fund targeting operational turnarounds. Brings in-house management platform. Looking for 15%+ levered returns with operational upside.',
    status: 'active',
    minimumCoverageRatio: '1.1',
    preferredDealStructures: ['purchase'],
  },
  {
    name: 'MedCredit Partners',
    type: 'lender' as const,
    assetTypes: ['SNF'] as ('SNF' | 'ALF' | 'ILF')[],
    geographies: ['OH', 'PA', 'MI', 'IN', 'WI', 'IL'],
    minDealSize: '3000000',
    maxDealSize: '40000000',
    targetYield: '0.095',
    maxLtv: '0.70',
    preferredStructure: 'Bridge to HUD/Fannie',
    termPreference: '2-3 years',
    riskTolerance: 'moderate' as const,
    contactName: 'Patricia Chen',
    contactEmail: 'pchen@medcreditpartners.com',
    notes: 'Specializes in Midwest SNF lending. Bridge loan focus with pathway to permanent financing. Flexible on terms for experienced operators.',
    status: 'active',
    minimumCoverageRatio: '1.25',
    preferredDealStructures: ['acquisition_financing'],
    leaseTermPreference: 'N/A',
  },
];

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

    // Clear documents
    await db.delete(documents);
    console.log('Cleared documents');

    // Insert Cascadia facilities (standalone)
    for (const facility of cascadiaFacilities) {
      await db.insert(facilities).values(facility);
    }
    console.log(`Inserted ${cascadiaFacilities.length} Cascadia facilities`);

    // Insert demo deals and their associated facilities/documents
    const dealIdMap: Record<string, string> = {};

    for (const deal of demoDeals) {
      const [insertedDeal] = await db.insert(deals).values(deal).returning({ id: deals.id });
      dealIdMap[deal.name] = insertedDeal.id;
      console.log(`Inserted deal: ${deal.name}`);

      // Insert facilities for this deal
      const dealFacilities = demoFacilities[deal.name as keyof typeof demoFacilities];
      if (dealFacilities) {
        for (const facility of dealFacilities) {
          await db.insert(facilities).values({
            ...facility,
            dealId: insertedDeal.id,
          });
        }
        console.log(`Inserted ${dealFacilities.length} facilities for ${deal.name}`);
      }

      // Insert documents for this deal
      const dealDocs = demoDocuments[deal.name as keyof typeof demoDocuments];
      if (dealDocs) {
        for (const doc of dealDocs) {
          await db.insert(documents).values({
            ...doc,
            dealId: insertedDeal.id,
            periodStart: doc.periodStart || null,
            periodEnd: doc.periodEnd || null,
          });
        }
        console.log(`Inserted ${dealDocs.length} documents for ${deal.name}`);
      }
    }

    // Insert capital partners
    for (const partner of demoPartners) {
      await db.insert(capitalPartners).values(partner);
    }
    console.log(`Inserted ${demoPartners.length} capital partners`);

    // Get counts
    const facilityCount = await db.select({ count: sql<number>`count(*)` }).from(facilities);
    const dealCount = await db.select({ count: sql<number>`count(*)` }).from(deals);
    const partnerCount = await db.select({ count: sql<number>`count(*)` }).from(capitalPartners);
    const documentCount = await db.select({ count: sql<number>`count(*)` }).from(documents);

    return NextResponse.json({
      success: true,
      message: 'Database reset complete with demo data',
      data: {
        deals: Number(dealCount[0].count),
        facilities: Number(facilityCount[0].count),
        documents: Number(documentCount[0].count),
        capitalPartners: Number(partnerCount[0].count),
      },
    });
  } catch (error) {
    console.error('Error resetting database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset database', details: String(error) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to this endpoint to reset the database with demo data.',
    description: 'This will clear existing data and populate with demo deals, facilities, documents, and capital partners.',
    demoData: {
      deals: [
        'Sunrise Senior Living Portfolio - TX, 3 facilities, $45M, Due Diligence',
        'Valley Healthcare Partners - FL, 2 facilities, $28M, LOI',
        'Midwest Care Centers - OH, 1 facility, $12M, Target',
        'Coastal Living Group - CA, 4 facilities, $62M, Closed',
      ],
      partners: [
        'Regional Healthcare Finance (Lender)',
        'Senior Housing Trust (REIT)',
        'Carebridge Capital (Equity)',
        'MedCredit Partners (Lender)',
      ],
    },
    warning: 'This action cannot be undone!',
  });
}
