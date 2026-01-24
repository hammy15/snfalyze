/**
 * CMS Sync API Endpoint
 *
 * Syncs all facilities in a deal with CMS data.
 * - For facilities with CCN: fetches fresh CMS data (force refresh)
 * - For facilities without CCN: attempts to match by name/city/state
 * - Updates facility records with CMS data
 * - Replaces old data with fresh data on each sync
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, facilities } from '@/db';
import { eq } from 'drizzle-orm';
import {
  lookupProviderByCCN,
  matchExtractedFacilityToCMS,
  type NormalizedProviderData,
} from '@/lib/cms';

interface SyncResult {
  facilityId: string;
  facilityName: string;
  status: 'synced' | 'matched' | 'not_found' | 'error';
  ccn?: string;
  matchConfidence?: number;
  message: string;
  cmsData?: NormalizedProviderData;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Get all facilities for this deal
    const dealFacilities = await db.query.facilities.findMany({
      where: eq(facilities.dealId, dealId),
    });

    if (dealFacilities.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No facilities found for this deal' },
        { status: 404 }
      );
    }

    const results: SyncResult[] = [];
    let synced = 0;
    let matched = 0;
    let notFound = 0;
    let errors = 0;

    // Process each facility
    for (const facility of dealFacilities) {
      try {
        let cmsData: NormalizedProviderData | null = null;
        let matchConfidence = 0;
        let status: SyncResult['status'] = 'not_found';
        let message = '';

        // If facility has CCN, lookup directly
        if (facility.ccn) {
          cmsData = await lookupProviderByCCN(facility.ccn, { forceRefresh: true });
          if (cmsData) {
            status = 'synced';
            matchConfidence = 1.0;
            message = `Synced via CCN ${facility.ccn}`;
            synced++;
          } else {
            status = 'not_found';
            message = `CCN ${facility.ccn} not found in CMS database`;
            notFound++;
          }
        } else {
          // Try to match by name/city/state
          const matchResult = await matchExtractedFacilityToCMS({
            name: facility.name,
            city: facility.city || undefined,
            state: facility.state || undefined,
            licensedBeds: facility.licensedBeds || undefined,
          });

          if (matchResult.provider && matchResult.matchConfidence >= 0.70) {
            cmsData = matchResult.provider;
            matchConfidence = matchResult.matchConfidence;
            status = 'matched';
            message = `Matched with ${(matchConfidence * 100).toFixed(0)}% confidence: ${matchResult.matchReason}`;
            matched++;
          } else if (matchResult.candidates && matchResult.candidates.length > 0) {
            status = 'not_found';
            message = `No high-confidence match. Best candidate: ${matchResult.candidates[0].provider.providerName} (${(matchResult.candidates[0].confidence * 100).toFixed(0)}%)`;
            notFound++;
          } else {
            status = 'not_found';
            message = 'No matching CMS provider found. This may be a non-Medicare facility (ALF, ILF, or non-certified SNF).';
            notFound++;
          }
        }

        // Update facility with CMS data if we got a match
        if (cmsData) {
          await db
            .update(facilities)
            .set({
              ccn: cmsData.ccn,
              address: cmsData.address || facility.address,
              city: cmsData.city || facility.city,
              state: cmsData.state || facility.state,
              zipCode: cmsData.zipCode || facility.zipCode,
              certifiedBeds: cmsData.numberOfBeds || facility.certifiedBeds,
              cmsRating: cmsData.overallRating,
              healthRating: cmsData.healthInspectionRating,
              staffingRating: cmsData.staffingRating,
              qualityRating: cmsData.qualityMeasureRating,
              isSff: cmsData.isSff,
              isSffWatch: cmsData.isSffCandidate,
              isVerified: true,
              verifiedAt: new Date(),
              verifiedBy: 'CMS Sync',
              cmsDataSnapshot: cmsData,
            })
            .where(eq(facilities.id, facility.id));
        }

        results.push({
          facilityId: facility.id,
          facilityName: facility.name,
          status,
          ccn: cmsData?.ccn || facility.ccn || undefined,
          matchConfidence,
          message,
          cmsData: cmsData || undefined,
        });

        // Small delay between API calls to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (facilityError) {
        errors++;
        results.push({
          facilityId: facility.id,
          facilityName: facility.name,
          status: 'error',
          message: `Error: ${facilityError instanceof Error ? facilityError.message : 'Unknown error'}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        synced,
        matched,
        notFound,
        errors,
        totalFacilities: dealFacilities.length,
        results,
      },
    });

  } catch (error) {
    console.error('CMS sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync CMS data',
      },
      { status: 500 }
    );
  }
}
