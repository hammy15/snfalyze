/**
 * CMS Care Compare API Client
 *
 * Uses the CMS Provider Data API to fetch nursing home quality data.
 * Dataset: 4pq5-n9py (Provider Information)
 *
 * API Documentation: https://data.cms.gov/provider-data/
 */

const CMS_API_BASE = 'https://data.cms.gov/provider-data/api/1/datastore/query';
const PROVIDER_INFO_DATASET = '4pq5-n9py'; // Nursing Home Provider Information
const PENALTIES_DATASET = 'g6vv-u9sr'; // Nursing Home Penalties
const HEALTH_DEFICIENCIES_DATASET = 'r5ix-sfxw'; // Health Deficiencies

export interface CMSProviderInfo {
  // New API field names
  cms_certification_number_ccn: string; // CCN
  provider_name: string;
  provider_address: string;
  citytown: string; // was provider_city
  state: string; // was provider_state
  zip_code: string; // was provider_zip_code
  telephone_number: string; // was provider_phone_number
  ownership_type: string;
  number_of_certified_beds: string;
  average_number_of_residents_per_day: string;
  provider_type: string;
  provider_resides_in_hospital: string;
  legal_business_name: string;
  overall_rating: string;
  health_inspection_rating: string;
  staffing_rating: string;
  qm_rating: string; // was quality_measure_rating
  location?: string;
  processing_date: string;
  // Staffing hours
  reported_nurse_aide_staffing_hours_per_resident_per_day: string;
  reported_lpn_staffing_hours_per_resident_per_day: string;
  reported_rn_staffing_hours_per_resident_per_day: string;
  reported_licensed_staffing_hours_per_resident_per_day: string;
  reported_total_nurse_staffing_hours_per_resident_per_day: string;
  reported_physical_therapist_staffing_hours_per_resident_per_day: string;
  // Quality measures
  number_of_facility_reported_incidents: string;
  number_of_substantiated_complaints: string;
  total_amount_of_fines_in_dollars: string;
  number_of_payment_denials: string;
  total_number_of_penalties: string;
  // SFF status
  with_a_resident_and_family_council: string;
  special_focus_status: string;
  abuse_icon: string;
  // Additional useful fields
  chain_name?: string;
  chain_id?: string;
  countyparish?: string;
  latitude?: string;
  longitude?: string;
  // Deficiency scores
  rating_cycle_1_total_number_of_health_deficiencies?: string;
  rating_cycle_1_standard_survey_health_date?: string;

  // Legacy field aliases for backward compatibility
  federal_provider_number?: string;
  provider_city?: string;
  provider_state?: string;
  provider_zip_code?: string;
  provider_phone_number?: string;
  quality_measure_rating?: string;
}

export interface CMSPenalty {
  cms_certification_number_ccn: string;
  penalty_type: string;
  penalty_date: string;
  fine_amount: string;
  payment_denial_length_in_days?: string;
  payment_denial_start_date?: string;
  provider_name?: string;
  // Legacy alias
  federal_provider_number?: string;
}

export interface CMSDeficiency {
  cms_certification_number_ccn: string;
  survey_date: string;
  deficiency_prefix: string;
  deficiency_tag_number: string;
  deficiency_description: string;
  scope_severity_code: string;
  deficiency_corrected: string;
  correction_date: string;
  deficiency_category?: string;
  complaint_deficiency?: string;
  standard_deficiency?: string;
  survey_type?: string;
  inspection_cycle?: string;
  provider_name?: string;
  // Legacy alias
  federal_provider_number?: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

interface CMSQueryCondition {
  property: string;
  value: string;
  operator?: '=' | '!=' | '<' | '>' | '<=' | '>=';
}

interface CMSQueryParams {
  conditions?: CMSQueryCondition[];
  limit?: number;
  offset?: number;
  fulltext?: string;
}

interface CMSApiResponse<T> {
  results: T[];
  count: number;
  schema?: Record<string, unknown>;
  query?: Record<string, unknown>;
}

async function fetchCMSData<T>(
  dataset: string,
  params: CMSQueryParams = {}
): Promise<T[]> {
  const url = `${CMS_API_BASE}/${dataset}/0`;

  const body: Record<string, unknown> = {
    limit: params.limit || 100,
  };

  if (params.offset) {
    body.offset = params.offset;
  }

  if (params.conditions && params.conditions.length > 0) {
    body.conditions = params.conditions;
  }

  if (params.fulltext) {
    body.fulltext = params.fulltext;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    next: { revalidate: 86400 }, // Cache for 24 hours in Next.js
  });

  if (!response.ok) {
    throw new Error(`CMS API error: ${response.status} ${response.statusText}`);
  }

  const data: CMSApiResponse<T> = await response.json();

  // Add backward compatibility field aliases
  return data.results.map(item => addLegacyFields(item as Record<string, unknown>) as T);
}

/**
 * Add legacy field aliases for backward compatibility
 */
function addLegacyFields(item: Record<string, unknown>): Record<string, unknown> {
  return {
    ...item,
    // Legacy field aliases
    federal_provider_number: item.cms_certification_number_ccn,
    provider_city: item.citytown,
    provider_state: item.state,
    provider_zip_code: item.zip_code,
    provider_phone_number: item.telephone_number,
    quality_measure_rating: item.qm_rating,
  };
}

/**
 * Fetch provider information by CCN (CMS Certification Number)
 */
export async function getProviderByCCN(ccn: string): Promise<CMSProviderInfo | null> {
  const cacheKey = `provider:${ccn}`;
  const cached = getCached<CMSProviderInfo>(cacheKey);
  if (cached) return cached;

  const normalizedCCN = ccn.replace(/\D/g, '').padStart(6, '0');

  try {
    const results = await fetchCMSData<CMSProviderInfo>(PROVIDER_INFO_DATASET, {
      conditions: [
        { property: 'cms_certification_number_ccn', value: normalizedCCN, operator: '=' }
      ],
      limit: 1,
    });

    if (results.length === 0) return null;

    const provider = results[0];
    setCache(cacheKey, provider);
    return provider;
  } catch (error) {
    console.error('Error fetching provider by CCN:', error);
    return null;
  }
}

/**
 * Search providers by name and/or state
 * Uses state filter + local name filtering since the API's fulltext search
 * doesn't reliably match provider names
 */
export async function searchProviders(
  query: string,
  state?: string,
  limit = 20
): Promise<CMSProviderInfo[]> {
  const cacheKey = `search:${query}:${state || 'all'}:${limit}`;
  const cached = getCached<CMSProviderInfo[]>(cacheKey);
  if (cached) return cached;

  try {
    const conditions: CMSQueryCondition[] = [];

    if (state) {
      conditions.push({ property: 'state', value: state.toUpperCase(), operator: '=' });
    }

    // Fetch a larger set to filter locally (API fulltext search is unreliable for names)
    const fetchLimit = query ? Math.max(limit * 10, 200) : limit;

    const results = await fetchCMSData<CMSProviderInfo>(PROVIDER_INFO_DATASET, {
      conditions: conditions.length > 0 ? conditions : undefined,
      limit: fetchLimit,
    });

    // Filter by name locally if query provided
    let filtered = results;
    if (query) {
      const queryLower = query.toLowerCase();
      filtered = results.filter(p =>
        p.provider_name?.toLowerCase().includes(queryLower)
      );
    }

    // Sort by name similarity (exact matches first, then starts-with, then contains)
    if (query) {
      const queryLower = query.toLowerCase();
      filtered.sort((a, b) => {
        const aName = a.provider_name?.toLowerCase() || '';
        const bName = b.provider_name?.toLowerCase() || '';

        const aExact = aName === queryLower;
        const bExact = bName === queryLower;
        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;

        const aStarts = aName.startsWith(queryLower);
        const bStarts = bName.startsWith(queryLower);
        if (aStarts && !bStarts) return -1;
        if (bStarts && !aStarts) return 1;

        return aName.localeCompare(bName);
      });
    }

    const finalResults = filtered.slice(0, limit);
    setCache(cacheKey, finalResults);
    return finalResults;
  } catch (error) {
    console.error('Error searching providers:', error);
    return [];
  }
}

/**
 * Fetch penalties for a provider
 */
export async function getProviderPenalties(ccn: string): Promise<CMSPenalty[]> {
  const cacheKey = `penalties:${ccn}`;
  const cached = getCached<CMSPenalty[]>(cacheKey);
  if (cached) return cached;

  const normalizedCCN = ccn.replace(/\D/g, '').padStart(6, '0');

  try {
    const results = await fetchCMSData<CMSPenalty>(PENALTIES_DATASET, {
      conditions: [
        { property: 'cms_certification_number_ccn', value: normalizedCCN, operator: '=' }
      ],
      limit: 100,
    });

    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error fetching penalties:', error);
    return [];
  }
}

/**
 * Fetch health deficiencies for a provider
 */
export async function getProviderDeficiencies(ccn: string): Promise<CMSDeficiency[]> {
  const cacheKey = `deficiencies:${ccn}`;
  const cached = getCached<CMSDeficiency[]>(cacheKey);
  if (cached) return cached;

  const normalizedCCN = ccn.replace(/\D/g, '').padStart(6, '0');

  try {
    const results = await fetchCMSData<CMSDeficiency>(HEALTH_DEFICIENCIES_DATASET, {
      conditions: [
        { property: 'cms_certification_number_ccn', value: normalizedCCN, operator: '=' }
      ],
      limit: 500,
    });

    setCache(cacheKey, results);
    return results;
  } catch (error) {
    console.error('Error fetching deficiencies:', error);
    return [];
  }
}

/**
 * Clear the cache (useful for testing or forcing refresh)
 */
export function clearCMSCache(): void {
  cache.clear();
}

/**
 * Parse numeric value from CMS data (handles missing/invalid values)
 */
export function parseNumeric(value: string | undefined): number | null {
  if (!value || value === '' || value === 'N/A') return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse integer value from CMS data
 */
export function parseInt(value: string | undefined): number | null {
  if (!value || value === '' || value === 'N/A') return null;
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Determine if provider is in Special Focus Facility program
 */
export function isSFF(provider: CMSProviderInfo): boolean {
  return provider.special_focus_status?.toLowerCase().includes('sff') || false;
}

/**
 * Determine if provider is SFF candidate
 */
export function isSFFCandidate(provider: CMSProviderInfo): boolean {
  return provider.special_focus_status?.toLowerCase().includes('candidate') || false;
}
