/**
 * Test script for CMS facility matching
 * Run with: npx tsx scripts/test-cms-match.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { matchExtractedFacilityToCMS, searchProvidersByName } from '../src/lib/cms';

async function testCMSMatching() {
  console.log('='.repeat(60));
  console.log('CMS Facility Matching Test');
  console.log('='.repeat(60));

  // Test cases with real facility names from CMS database
  const testFacilities = [
    // Test 1: Real facility with exact name, city, state, beds
    {
      name: 'Valley Grande Manor',
      city: 'Weslaco',
      state: 'TX',
      licensedBeds: 147,
    },
    // Test 2: Real facility with partial name match
    {
      name: 'Avir Beaumont',
      city: 'Beaumont',
      state: 'TX',
      licensedBeds: 214,
    },
    // Test 3: Real facility name, different state
    {
      name: 'Colonial Manor',
      state: 'TX',
    },
    // Test 4: Partial name match test
    {
      name: 'Evergreen Post Acute',
      state: 'OR',
    },
    // Test 5: Fuzzy match test - slight name variation
    {
      name: 'Guadalupe Valley Nursing',
      city: 'Seguin',
      state: 'TX',
    },
  ];

  for (let i = 0; i < testFacilities.length; i++) {
    const facility = testFacilities[i];
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Test ${i + 1}: ${facility.name}`);
    console.log(`Location: ${facility.city || 'N/A'}, ${facility.state || 'N/A'}`);
    console.log(`Beds: ${facility.licensedBeds || 'N/A'}`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      const result = await matchExtractedFacilityToCMS(facility);
      const elapsed = Date.now() - startTime;

      if (result.provider) {
        console.log(`✅ MATCH FOUND (${elapsed}ms)`);
        console.log(`   Confidence: ${(result.matchConfidence * 100).toFixed(1)}%`);
        console.log(`   Reason: ${result.matchReason}`);
        console.log(`   Auto-verify: ${result.matchConfidence > 0.90 ? 'Yes' : 'No'}`);
        console.log(`\n   Provider Details:`);
        console.log(`   - Name: ${result.provider.providerName}`);
        console.log(`   - CCN: ${result.provider.ccn}`);
        console.log(`   - Address: ${result.provider.address}`);
        console.log(`   - City: ${result.provider.city}, ${result.provider.state} ${result.provider.zipCode}`);
        console.log(`   - Beds: ${result.provider.numberOfBeds}`);
        console.log(`   - Overall Rating: ${result.provider.overallRating || 'N/A'} stars`);
        console.log(`   - Health Rating: ${result.provider.healthInspectionRating || 'N/A'} stars`);
        console.log(`   - SFF Status: ${result.provider.isSff ? '🔴 YES' : 'No'}`);
        console.log(`   - SFF Candidate: ${result.provider.isSffCandidate ? '🟠 YES' : 'No'}`);
        console.log(`   - Abuse Icon: ${result.provider.abuseIcon ? '🔴 YES' : 'No'}`);
        console.log(`   - Total Fines: $${result.provider.finesTotal?.toLocaleString() || '0'}`);

        if (result.candidates && result.candidates.length > 0) {
          console.log(`\n   Other candidates (${result.candidates.length}):`);
          result.candidates.slice(0, 2).forEach((c, idx) => {
            console.log(`   ${idx + 1}. ${c.provider.providerName} (${(c.confidence * 100).toFixed(1)}%)`);
          });
        }
      } else {
        console.log(`❌ NO MATCH (${elapsed}ms)`);
        console.log(`   Reason: ${result.matchReason}`);
        if (result.candidates && result.candidates.length > 0) {
          console.log(`\n   Possible candidates (${result.candidates.length}):`);
          result.candidates.slice(0, 3).forEach((c, idx) => {
            console.log(`   ${idx + 1}. ${c.provider.providerName} - ${c.provider.city}, ${c.provider.state}`);
            console.log(`      Confidence: ${(c.confidence * 100).toFixed(1)}% - ${c.reason}`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Test direct search functionality
  console.log(`\n${'='.repeat(60)}`);
  console.log('Direct Search Test');
  console.log('='.repeat(60));

  try {
    console.log('\nSearching for "Valley" in Texas...');
    const searchResults = await searchProvidersByName('Valley', 'TX', 5);
    console.log(`Found ${searchResults.length} results:`);
    searchResults.forEach((r, idx) => {
      console.log(`  ${idx + 1}. ${r.name} (CCN: ${r.ccn})`);
      console.log(`     ${r.city}, ${r.state} - ${r.beds} beds - ${r.overallRating || 'N/A'} stars`);
    });
  } catch (error) {
    console.log(`❌ Search error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Complete');
  console.log('='.repeat(60));
}

// Run the test
testCMSMatching().catch(console.error);
