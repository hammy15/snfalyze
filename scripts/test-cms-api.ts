/**
 * Test script for CMS API directly (no database required)
 * Run with: npx tsx scripts/test-cms-api.ts
 */

import {
  searchProviders,
  getProviderByCCN,
  getProviderDeficiencies,
  getProviderPenalties,
  isSFF,
  isSFFCandidate,
  parseNumeric,
  parseInt as parseCMSInt,
} from '../src/lib/cms/cms-client';

// String similarity functions (copied from provider-lookup for testing)
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1;
  if (!s1 || !s2) return 0;

  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - (distance / maxLen);
}

function normalizeFacilityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(llc|inc|corp|corporation|lp|healthcare|health care|skilled nursing|nursing home|snf|facility|center|care center|rehabilitation|rehab)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function testCMSAPI() {
  console.log('='.repeat(60));
  console.log('CMS API Direct Test');
  console.log('='.repeat(60));

  // Test 1: Search for providers
  console.log('\n📍 Test 1: Search for "Valley" facilities in Texas');
  console.log('─'.repeat(60));
  try {
    const results = await searchProviders('Valley', 'TX', 10);
    console.log(`Found ${results.length} results:`);
    results.forEach((r, idx) => {
      console.log(`\n  ${idx + 1}. ${r.provider_name}`);
      console.log(`     CCN: ${r.federal_provider_number}`);
      console.log(`     Location: ${r.provider_city}, ${r.provider_state} ${r.provider_zip_code}`);
      console.log(`     Beds: ${r.number_of_certified_beds || 'N/A'}`);
      console.log(`     Overall Rating: ${r.overall_rating || 'N/A'} stars`);
      console.log(`     SFF: ${isSFF(r) ? '🔴 YES' : 'No'} | SFF Candidate: ${isSFFCandidate(r) ? '🟠 YES' : 'No'}`);
    });
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 2: Get a specific provider by CCN
  console.log('\n📍 Test 2: Lookup provider by CCN (455001 - Avir at Beaumont, TX)');
  console.log('─'.repeat(60));
  try {
    const provider = await getProviderByCCN('455001');
    if (provider) {
      console.log(`✅ Found: ${provider.provider_name}`);
      console.log(`   Address: ${provider.provider_address}`);
      console.log(`   City: ${provider.provider_city}, ${provider.provider_state} ${provider.provider_zip_code}`);
      console.log(`   Phone: ${provider.provider_phone_number || 'N/A'}`);
      console.log(`   Ownership: ${provider.ownership_type || 'N/A'}`);
      console.log(`   Beds: ${provider.number_of_certified_beds || 'N/A'}`);
      console.log(`   Avg Residents: ${provider.average_number_of_residents_per_day || 'N/A'}`);
      console.log(`\n   Ratings:`);
      console.log(`   - Overall: ${provider.overall_rating || 'N/A'} stars`);
      console.log(`   - Health Inspection: ${provider.health_inspection_rating || 'N/A'} stars`);
      console.log(`   - Staffing: ${provider.staffing_rating || 'N/A'} stars`);
      console.log(`   - Quality Measures: ${provider.quality_measure_rating || 'N/A'} stars`);
      console.log(`\n   Staffing (HPPD):`);
      console.log(`   - RN: ${provider.reported_rn_staffing_hours_per_resident_per_day || 'N/A'}`);
      console.log(`   - LPN: ${provider.reported_lpn_staffing_hours_per_resident_per_day || 'N/A'}`);
      console.log(`   - CNA: ${provider.reported_nurse_aide_staffing_hours_per_resident_per_day || 'N/A'}`);
      console.log(`   - Total: ${provider.reported_total_nurse_staffing_hours_per_resident_per_day || 'N/A'}`);
      console.log(`\n   Risk Indicators:`);
      console.log(`   - SFF Status: ${isSFF(provider) ? '🔴 YES' : 'No'}`);
      console.log(`   - SFF Candidate: ${isSFFCandidate(provider) ? '🟠 YES' : 'No'}`);
      console.log(`   - Abuse Icon: ${provider.abuse_icon?.toLowerCase() === 'yes' ? '🔴 YES' : 'No'}`);
      console.log(`   - Total Penalties: ${provider.total_number_of_penalties || '0'}`);
      console.log(`   - Total Fines: $${parseNumeric(provider.total_amount_of_fines_in_dollars)?.toLocaleString() || '0'}`);
    } else {
      console.log('❌ Provider not found');
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 3: Fuzzy matching simulation
  console.log('\n📍 Test 3: Fuzzy Name Matching Test');
  console.log('─'.repeat(60));
  const testNames = [
    { query: 'Sunrise Healthcare', actual: 'Sunrise Healthcare Center' },
    { query: 'Valley Care', actual: 'Valley Care Center' },
    { query: 'Golden Living', actual: 'Golden Living Center - Dallas' },
    { query: 'Willowbrook SNF', actual: 'Willowbrook Skilled Nursing Facility' },
  ];

  testNames.forEach(({ query, actual }) => {
    const normalizedQuery = normalizeFacilityName(query);
    const normalizedActual = normalizeFacilityName(actual);
    const similarity = stringSimilarity(normalizedQuery, normalizedActual);
    console.log(`\n  "${query}" vs "${actual}"`);
    console.log(`  Normalized: "${normalizedQuery}" vs "${normalizedActual}"`);
    console.log(`  Similarity: ${(similarity * 100).toFixed(1)}% ${similarity > 0.7 ? '✅ MATCH' : '❌ NO MATCH'}`);
  });

  // Test 4: Get deficiencies for a provider
  console.log('\n📍 Test 4: Get Deficiencies for CCN 455001');
  console.log('─'.repeat(60));
  try {
    const deficiencies = await getProviderDeficiencies('455001');
    console.log(`Found ${deficiencies.length} deficiencies`);
    if (deficiencies.length > 0) {
      console.log(`\nSample deficiencies:`);
      deficiencies.slice(0, 3).forEach((d, idx) => {
        console.log(`  ${idx + 1}. Tag: ${d.deficiency_prefix}${d.deficiency_tag_number}`);
        console.log(`     Date: ${d.survey_date}`);
        console.log(`     Severity: ${d.scope_severity_code}`);
        console.log(`     Corrected: ${d.deficiency_corrected === 'Y' ? 'Yes' : 'No'}`);
        console.log(`     ${d.deficiency_description?.substring(0, 80)}...`);
      });
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 5: Get penalties for a provider
  console.log('\n📍 Test 5: Get Penalties for CCN 455001');
  console.log('─'.repeat(60));
  try {
    const penalties = await getProviderPenalties('455001');
    console.log(`Found ${penalties.length} penalties`);
    if (penalties.length > 0) {
      const totalFines = penalties.reduce((sum, p) => sum + (parseNumeric(p.fine_amount) || 0), 0);
      console.log(`Total fines: $${totalFines.toLocaleString()}`);
      console.log(`\nSample penalties:`);
      penalties.slice(0, 3).forEach((p, idx) => {
        console.log(`  ${idx + 1}. Type: ${p.penalty_type}`);
        console.log(`     Date: ${p.penalty_date}`);
        console.log(`     Amount: $${parseNumeric(p.fine_amount)?.toLocaleString() || '0'}`);
      });
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 6: Search and match simulation
  console.log('\n📍 Test 6: Search and Match Simulation');
  console.log('─'.repeat(60));

  const facilityToMatch = {
    name: 'Valley Grande',
    city: 'Weslaco',
    state: 'TX',
    beds: 147,
  };

  console.log(`Searching for: "${facilityToMatch.name}" in ${facilityToMatch.city}, ${facilityToMatch.state}`);

  try {
    const providers = await searchProviders(facilityToMatch.name, facilityToMatch.state, 10);
    console.log(`\nFound ${providers.length} potential matches:`);

    const normalizedQuery = normalizeFacilityName(facilityToMatch.name);

    const scoredResults = providers.map(p => {
      const normalizedProvider = normalizeFacilityName(p.provider_name || '');
      const nameSimilarity = stringSimilarity(normalizedQuery, normalizedProvider);
      const cityMatch = facilityToMatch.city && p.provider_city
        ? stringSimilarity(facilityToMatch.city.toLowerCase(), p.provider_city.toLowerCase()) > 0.8
        : false;

      let bedSimilarity = 0;
      if (facilityToMatch.beds && p.number_of_certified_beds) {
        const providerBeds = parseCMSInt(p.number_of_certified_beds);
        if (providerBeds) {
          const bedDiff = Math.abs(facilityToMatch.beds - providerBeds);
          const maxBeds = Math.max(facilityToMatch.beds, providerBeds);
          bedSimilarity = 1 - (bedDiff / maxBeds);
        }
      }

      const score = nameSimilarity * 0.50 + (cityMatch ? 0.25 : 0) + bedSimilarity * 0.25;

      return {
        provider: p,
        score,
        nameSimilarity,
        cityMatch,
        bedSimilarity,
      };
    }).sort((a, b) => b.score - a.score);

    scoredResults.slice(0, 5).forEach((r, idx) => {
      console.log(`\n  ${idx + 1}. ${r.provider.provider_name}`);
      console.log(`     Location: ${r.provider.provider_city}, ${r.provider.provider_state}`);
      console.log(`     Beds: ${r.provider.number_of_certified_beds || 'N/A'}`);
      console.log(`     Score: ${(r.score * 100).toFixed(1)}%`);
      console.log(`     - Name similarity: ${(r.nameSimilarity * 100).toFixed(1)}%`);
      console.log(`     - City match: ${r.cityMatch ? 'Yes (+25%)' : 'No'}`);
      console.log(`     - Bed similarity: ${(r.bedSimilarity * 100).toFixed(1)}%`);
      console.log(`     ${r.score > 0.7 ? '✅ WOULD MATCH' : r.score > 0.5 ? '🟡 POSSIBLE' : '❌ LOW'}`);
    });

    if (scoredResults.length > 0 && scoredResults[0].score > 0.7) {
      console.log(`\n✅ Best match: ${scoredResults[0].provider.provider_name} (${(scoredResults[0].score * 100).toFixed(1)}%)`);
    } else {
      console.log('\n❌ No confident match found');
    }
  } catch (error) {
    console.log(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('Test Complete');
  console.log('='.repeat(60));
}

// Run the test
testCMSAPI().catch(console.error);
