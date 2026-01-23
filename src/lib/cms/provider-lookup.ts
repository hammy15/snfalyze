/**
 * CMS Provider Lookup Service
 *
 * Provides a unified interface for looking up CMS provider data,
 * managing cache, and syncing with the local database.
 */

import { db, cmsProviderData } from '@/db';
import { eq } from 'drizzle-orm';
import {
  getProviderByCCN,
  searchProviders,
  getProviderPenalties,
  getProviderDeficiencies,
  parseNumeric,
  parseInt as parseCMSInt,
  isSFF,
  isSFFCandidate,
  type CMSProviderInfo,
} from './cms-client';

export interface NormalizedProviderData {
  ccn: string;
  providerName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  ownershipType: string;
  numberOfBeds: number | null;
  averageResidentsPerDay: number | null;
  overallRating: number | null;
  healthInspectionRating: number | null;
  staffingRating: number | null;
  qualityMeasureRating: number | null;
  reportedRnHppd: number | null;
  reportedLpnHppd: number | null;
  reportedCnaHppd: number | null;
  totalNursingHppd: number | null;
  totalDeficiencies: number | null;
  healthDeficiencies: number | null;
  isSff: boolean;
  isSffCandidate: boolean;
  abuseIcon: boolean;
  finesTotal: number | null;
  dataDate: string | null;
  rawData: CMSProviderInfo;
}

export interface ProviderSearchResult {
  ccn: string;
  name: string;
  city: string;
  state: string;
  beds: number | null;
  overallRating: number | null;
  isSff: boolean;
}

/**
 * Normalize CMS API response to our internal format
 */
function normalizeProviderData(provider: CMSProviderInfo): NormalizedProviderData {
  return {
    ccn: provider.federal_provider_number,
    providerName: provider.provider_name || '',
    address: provider.provider_address || '',
    city: provider.provider_city || '',
    state: provider.provider_state || '',
    zipCode: provider.provider_zip_code || '',
    phoneNumber: provider.provider_phone_number || '',
    ownershipType: provider.ownership_type || '',
    numberOfBeds: parseCMSInt(provider.number_of_certified_beds),
    averageResidentsPerDay: parseNumeric(provider.average_number_of_residents_per_day),
    overallRating: parseCMSInt(provider.overall_rating),
    healthInspectionRating: parseCMSInt(provider.health_inspection_rating),
    staffingRating: parseCMSInt(provider.staffing_rating),
    qualityMeasureRating: parseCMSInt(provider.quality_measure_rating),
    reportedRnHppd: parseNumeric(provider.reported_rn_staffing_hours_per_resident_per_day),
    reportedLpnHppd: parseNumeric(provider.reported_lpn_staffing_hours_per_resident_per_day),
    reportedCnaHppd: parseNumeric(provider.reported_nurse_aide_staffing_hours_per_resident_per_day),
    totalNursingHppd: parseNumeric(provider.reported_total_nurse_staffing_hours_per_resident_per_day),
    totalDeficiencies: parseCMSInt(provider.total_number_of_penalties),
    healthDeficiencies: null, // Would need separate API call
    isSff: isSFF(provider),
    isSffCandidate: isSFFCandidate(provider),
    abuseIcon: provider.abuse_icon?.toLowerCase() === 'yes',
    finesTotal: parseNumeric(provider.total_amount_of_fines_in_dollars),
    dataDate: provider.processing_date || null,
    rawData: provider,
  };
}

/**
 * Look up a provider by CCN, checking local cache first, then CMS API
 */
export async function lookupProviderByCCN(
  ccn: string,
  options: { forceRefresh?: boolean } = {}
): Promise<NormalizedProviderData | null> {
  const normalizedCCN = ccn.replace(/\D/g, '').padStart(6, '0');

  // Check database cache first (unless force refresh)
  if (!options.forceRefresh) {
    try {
      const cached = await db.query.cmsProviderData.findFirst({
        where: eq(cmsProviderData.ccn, normalizedCCN),
      });

      if (cached) {
        // Check if cache is still valid (7 days)
        const cacheAge = Date.now() - new Date(cached.syncedAt!).getTime();
        if (cacheAge < 7 * 24 * 60 * 60 * 1000) {
          return {
            ccn: cached.ccn,
            providerName: cached.providerName || '',
            address: cached.address || '',
            city: cached.city || '',
            state: cached.state || '',
            zipCode: cached.zipCode || '',
            phoneNumber: cached.phoneNumber || '',
            ownershipType: cached.ownershipType || '',
            numberOfBeds: cached.numberOfBeds,
            averageResidentsPerDay: cached.averageResidentsPerDay ? Number(cached.averageResidentsPerDay) : null,
            overallRating: cached.overallRating,
            healthInspectionRating: cached.healthInspectionRating,
            staffingRating: cached.staffingRating,
            qualityMeasureRating: cached.qualityMeasureRating,
            reportedRnHppd: cached.reportedRnHppd ? Number(cached.reportedRnHppd) : null,
            reportedLpnHppd: cached.reportedLpnHppd ? Number(cached.reportedLpnHppd) : null,
            reportedCnaHppd: cached.reportedCnaHppd ? Number(cached.reportedCnaHppd) : null,
            totalNursingHppd: cached.totalNursingHppd ? Number(cached.totalNursingHppd) : null,
            totalDeficiencies: cached.totalDeficiencies,
            healthDeficiencies: cached.healthDeficiencies,
            isSff: cached.isSff || false,
            isSffCandidate: cached.isSffCandidate || false,
            abuseIcon: cached.abuseIcon || false,
            finesTotal: cached.finesTotal ? Number(cached.finesTotal) : null,
            dataDate: cached.dataDate?.toString() || null,
            rawData: cached.rawData as CMSProviderInfo,
          };
        }
      }
    } catch (error) {
      // Database error, continue to API lookup
      console.warn('Database lookup failed, falling back to API:', error);
    }
  }

  // Fetch from CMS API
  const provider = await getProviderByCCN(normalizedCCN);
  if (!provider) return null;

  const normalized = normalizeProviderData(provider);

  // Store in database cache
  try {
    await db
      .insert(cmsProviderData)
      .values({
        ccn: normalized.ccn,
        providerName: normalized.providerName,
        address: normalized.address,
        city: normalized.city,
        state: normalized.state,
        zipCode: normalized.zipCode,
        phoneNumber: normalized.phoneNumber,
        ownershipType: normalized.ownershipType,
        numberOfBeds: normalized.numberOfBeds,
        averageResidentsPerDay: normalized.averageResidentsPerDay?.toString(),
        overallRating: normalized.overallRating,
        healthInspectionRating: normalized.healthInspectionRating,
        staffingRating: normalized.staffingRating,
        qualityMeasureRating: normalized.qualityMeasureRating,
        reportedRnHppd: normalized.reportedRnHppd?.toString(),
        reportedLpnHppd: normalized.reportedLpnHppd?.toString(),
        reportedCnaHppd: normalized.reportedCnaHppd?.toString(),
        totalNursingHppd: normalized.totalNursingHppd?.toString(),
        totalDeficiencies: normalized.totalDeficiencies,
        isSff: normalized.isSff,
        isSffCandidate: normalized.isSffCandidate,
        abuseIcon: normalized.abuseIcon,
        finesTotal: normalized.finesTotal?.toString(),
        dataDate: normalized.dataDate,
        rawData: normalized.rawData,
        syncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: cmsProviderData.ccn,
        set: {
          providerName: normalized.providerName,
          address: normalized.address,
          city: normalized.city,
          state: normalized.state,
          zipCode: normalized.zipCode,
          phoneNumber: normalized.phoneNumber,
          ownershipType: normalized.ownershipType,
          numberOfBeds: normalized.numberOfBeds,
          averageResidentsPerDay: normalized.averageResidentsPerDay?.toString(),
          overallRating: normalized.overallRating,
          healthInspectionRating: normalized.healthInspectionRating,
          staffingRating: normalized.staffingRating,
          qualityMeasureRating: normalized.qualityMeasureRating,
          reportedRnHppd: normalized.reportedRnHppd?.toString(),
          reportedLpnHppd: normalized.reportedLpnHppd?.toString(),
          reportedCnaHppd: normalized.reportedCnaHppd?.toString(),
          totalNursingHppd: normalized.totalNursingHppd?.toString(),
          totalDeficiencies: normalized.totalDeficiencies,
          isSff: normalized.isSff,
          isSffCandidate: normalized.isSffCandidate,
          abuseIcon: normalized.abuseIcon,
          finesTotal: normalized.finesTotal?.toString(),
          dataDate: normalized.dataDate,
          rawData: normalized.rawData,
          syncedAt: new Date(),
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    // Log but don't fail - we still have the data
    console.warn('Failed to cache provider data:', error);
  }

  return normalized;
}

/**
 * Search for providers by name and optionally filter by state
 */
export async function searchProvidersByName(
  query: string,
  state?: string,
  limit = 20
): Promise<ProviderSearchResult[]> {
  const providers = await searchProviders(query, state, limit);

  return providers.map((p) => ({
    ccn: p.federal_provider_number,
    name: p.provider_name || '',
    city: p.provider_city || '',
    state: p.provider_state || '',
    beds: parseCMSInt(p.number_of_certified_beds),
    overallRating: parseCMSInt(p.overall_rating),
    isSff: isSFF(p),
  }));
}

/**
 * Get provider with all related data (deficiencies, penalties)
 */
export async function getFullProviderProfile(ccn: string) {
  const [provider, penalties, deficiencies] = await Promise.all([
    lookupProviderByCCN(ccn),
    getProviderPenalties(ccn),
    getProviderDeficiencies(ccn),
  ]);

  if (!provider) return null;

  return {
    ...provider,
    penalties: penalties.map((p) => ({
      type: p.penalty_type,
      date: p.penalty_date,
      amount: parseNumeric(p.fine_amount),
    })),
    deficiencies: deficiencies.map((d) => ({
      surveyDate: d.survey_date,
      tag: `${d.deficiency_prefix}${d.deficiency_tag_number}`,
      description: d.deficiency_description,
      scopeSeverity: d.scope_severity_code,
      corrected: d.deficiency_corrected === 'Y',
      correctionDate: d.correction_date,
    })),
  };
}
