/**
 * CMS Care Compare API Client
 *
 * Uses the CMS SOCRATA API to fetch nursing home quality data.
 * Dataset: 4pq5-n9py (Provider Information)
 *
 * API Documentation: https://data.medicare.gov/developer
 */

const CMS_API_BASE = 'https://data.cms.gov/data-api/v1/dataset';
const PROVIDER_INFO_DATASET = '4pq5-n9py'; // Nursing Home Provider Information
const PENALTIES_DATASET = 'g6vv-u9sr'; // Nursing Home Penalties
const HEALTH_DEFICIENCIES_DATASET = 'r5ix-sfxw'; // Health Deficiencies

export interface CMSProviderInfo {
  federal_provider_number: string; // CCN
  provider_name: string;
  provider_address: string;
  provider_city: string;
  provider_state: string;
  provider_zip_code: string;
  provider_phone_number: string;
  ownership_type: string;
  number_of_certified_beds: string;
  number_of_residents_in_certified_beds: string;
  average_number_of_residents_per_day: string;
  provider_type: string;
  provider_resides_in_hospital: string;
  legal_business_name: string;
  overall_rating: string;
  health_inspection_rating: string;
  staffing_rating: string;
  quality_measure_rating: string;
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
}

export interface CMSPenalty {
  federal_provider_number: string;
  penalty_type: string;
  penalty_date: string;
  fine_amount: string;
}

export interface CMSDeficiency {
  federal_provider_number: string;
  survey_date: string;
  deficiency_prefix: string;
  deficiency_tag_number: string;
  deficiency_description: string;
  scope_severity_code: string;
  deficiency_corrected: string;
  correction_date: string;
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

async function fetchCMSData<T>(
  dataset: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const searchParams = new URLSearchParams(params);
  const url = `${CMS_API_BASE}/${dataset}/data?${searchParams.toString()}`;

  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
    },
    next: { revalidate: 86400 }, // Cache for 24 hours in Next.js
  });

  if (!response.ok) {
    throw new Error(`CMS API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
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
      'filter[federal_provider_number]': normalizedCCN,
      'size': '1',
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
    const params: Record<string, string> = {
      'size': limit.toString(),
    };

    // Build keyword search
    if (query) {
      params['keyword'] = query;
    }

    if (state) {
      params['filter[provider_state]'] = state.toUpperCase();
    }

    const results = await fetchCMSData<CMSProviderInfo>(PROVIDER_INFO_DATASET, params);
    setCache(cacheKey, results);
    return results;
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
      'filter[federal_provider_number]': normalizedCCN,
      'size': '100',
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
      'filter[federal_provider_number]': normalizedCCN,
      'size': '500',
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
