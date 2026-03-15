/**
 * CCN Auto-Matcher
 *
 * After a facility is created/updated, looks up cms_provider_data by fuzzy name + state
 * and populates: ccn, cms_rating, health_rating, staffing_rating, quality_rating,
 * is_sff, cms_data_snapshot.
 */

import { db } from '@/db';
import { cmsProviderData, facilities } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Words to strip when normalizing names for fuzzy comparison
const STRIP_WORDS = [
  'the', 'of', 'a', 'an', 'and', '&',
  'llc', 'inc', 'corp', 'ltd', 'lp',
  'nursing', 'home', 'facility', 'center', 'care', 'healthcare',
  'health', 'services', 'management', 'group', 'associates',
  'senior', 'living', 'community', 'communities', 'residence',
  'rehabilitation', 'rehab', 'convalescent', 'extended',
  'snf', 'alf', 'ilf',
];

/**
 * Normalize a facility name for comparison:
 * lowercase, remove punctuation, strip common suffixes/words
 */
export function normalizeFacilityName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\-'"/\\()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(word => word.length > 0 && !STRIP_WORDS.includes(word))
    .join(' ');
}

/**
 * Simple token overlap similarity score (0-1) between two normalized names
 */
function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(a.split(' ').filter(Boolean));
  const tokensB = new Set(b.split(' ').filter(Boolean));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) overlap++;
  }

  const unionSize = tokensA.size + tokensB.size - overlap;
  return unionSize === 0 ? 0 : overlap / unionSize;
}

export interface CCNMatchResult {
  ccn: string;
  providerName: string;
  overallRating: number | null;
  healthInspectionRating: number | null;
  staffingRating: number | null;
  qualityMeasureRating: number | null;
  isSff: boolean;
  rawData: Record<string, unknown>;
  similarity: number;
}

/**
 * Find the best CCN match for a facility by fuzzy name + state lookup.
 * Searches cms_provider_data, returns the best match above the similarity threshold.
 */
export async function findCCNMatch(
  facilityName: string,
  state: string | null,
  minSimilarity = 0.4
): Promise<CCNMatchResult | null> {
  if (!facilityName || facilityName.trim().length < 3) return null;

  const normalizedInput = normalizeFacilityName(facilityName);
  if (!normalizedInput) return null;

  // Query CMS provider data filtered by state (if available)
  const query = db.select().from(cmsProviderData);

  let providers;
  if (state && state.length === 2) {
    providers = await query.where(eq(cmsProviderData.state, state.toUpperCase()));
  } else {
    // Without state, limit to avoid full table scan
    providers = await query.limit(5000);
  }

  if (providers.length === 0) return null;

  // Score all candidates
  let bestMatch: CCNMatchResult | null = null;
  let bestScore = 0;

  for (const provider of providers) {
    if (!provider.providerName) continue;
    const normalizedProvider = normalizeFacilityName(provider.providerName);
    const score = tokenSimilarity(normalizedInput, normalizedProvider);

    if (score > bestScore && score >= minSimilarity) {
      bestScore = score;
      bestMatch = {
        ccn: provider.ccn,
        providerName: provider.providerName,
        overallRating: provider.overallRating,
        healthInspectionRating: provider.healthInspectionRating,
        staffingRating: provider.staffingRating,
        qualityMeasureRating: provider.qualityMeasureRating,
        isSff: provider.isSff ?? false,
        rawData: (provider.rawData as Record<string, unknown>) ?? {},
        similarity: score,
      };
    }
  }

  return bestMatch;
}

/**
 * Auto-populate CCN and CMS data for a facility by matching against cms_provider_data.
 * Only updates fields that are currently NULL to avoid overwriting manually-set values.
 *
 * @returns true if a match was found and applied
 */
export async function autoMatchFacilityCCN(facilityId: string): Promise<boolean> {
  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility) return false;

  // If CCN is already set, skip auto-match
  if (facility.ccn) return false;

  const match = await findCCNMatch(facility.name, facility.state);
  if (!match) return false;

  // Build update payload — only populate NULL fields to avoid overwriting user-set values
  await db
    .update(facilities)
    .set({
      ccn: match.ccn,
      cmsDataSnapshot: {
        providerName: match.providerName,
        ccn: match.ccn,
        matchSimilarity: match.similarity,
        matchedAt: new Date().toISOString(),
        ...match.rawData,
      },
      cmsRating: facility.cmsRating == null && match.overallRating != null
        ? match.overallRating : facility.cmsRating,
      healthRating: facility.healthRating == null && match.healthInspectionRating != null
        ? match.healthInspectionRating : facility.healthRating,
      staffingRating: facility.staffingRating == null && match.staffingRating != null
        ? match.staffingRating : facility.staffingRating,
      qualityRating: facility.qualityRating == null && match.qualityMeasureRating != null
        ? match.qualityMeasureRating : facility.qualityRating,
      isSff: (!facility.isSff && match.isSff) ? true : facility.isSff,
    })
    .where(eq(facilities.id, facilityId));

  return true;
}

/**
 * Auto-match CCN for all facilities in a deal that don't have a CCN yet
 */
export async function autoMatchDealFacilitiesCCN(dealId: string): Promise<{
  matched: number;
  skipped: number;
  facilityResults: Array<{ facilityId: string; name: string; matched: boolean; ccn?: string }>;
}> {
  const dealFacilities = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, dealId));

  let matched = 0;
  let skipped = 0;
  const facilityResults = [];

  for (const facility of dealFacilities) {
    if (facility.ccn) {
      skipped++;
      facilityResults.push({ facilityId: facility.id, name: facility.name, matched: false });
      continue;
    }

    const match = await findCCNMatch(facility.name, facility.state);
    if (match) {
      await autoMatchFacilityCCN(facility.id);
      matched++;
      facilityResults.push({ facilityId: facility.id, name: facility.name, matched: true, ccn: match.ccn });
    } else {
      skipped++;
      facilityResults.push({ facilityId: facility.id, name: facility.name, matched: false });
    }
  }

  return { matched, skipped, facilityResults };
}
