/**
 * CMS Data Refresh Cron Job
 *
 * Runs nightly at 3am UTC via Vercel Cron.
 * Re-syncs all facilities with CCNs against the CMS API.
 * Updates ratings, deficiencies, SFF status, and staffing data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, facilities, cmsProviderData, dealActivities } from '@/db';
import { isNotNull, sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import { lookupProviderByCCN } from '@/lib/cms/provider-lookup';

export const maxDuration = 300; // 5 minutes max for cron

export async function GET(request: NextRequest) {
  // Verify cron secret in production
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  let refreshed = 0;
  let failed = 0;
  let unchanged = 0;
  const errors: string[] = [];

  try {
    // Get all facilities that have CCNs
    const facilitiesWithCCN = await db
      .select({
        id: facilities.id,
        dealId: facilities.dealId,
        name: facilities.name,
        ccn: facilities.ccn,
        cmsRating: facilities.cmsRating,
        isSff: facilities.isSff,
      })
      .from(facilities)
      .where(isNotNull(facilities.ccn));

    // Deduplicate CCNs (multiple facilities might share one)
    const ccnMap = new Map<string, typeof facilitiesWithCCN>();
    for (const f of facilitiesWithCCN) {
      if (!f.ccn) continue;
      const existing = ccnMap.get(f.ccn) || [];
      existing.push(f);
      ccnMap.set(f.ccn, existing);
    }

    // Process each unique CCN
    for (const [ccn, ccnFacilities] of ccnMap.entries()) {
      try {
        const cmsData = await lookupProviderByCCN(ccn, { forceRefresh: true });

        if (!cmsData) {
          unchanged++;
          continue;
        }

        // Update all facilities sharing this CCN
        for (const facility of ccnFacilities) {
          const oldRating = facility.cmsRating;
          const oldSff = facility.isSff;

          await db
            .update(facilities)
            .set({
              cmsRating: cmsData.overallRating,
              healthRating: cmsData.healthInspectionRating,
              staffingRating: cmsData.staffingRating,
              qualityRating: cmsData.qualityMeasureRating,
              isSff: cmsData.isSff,
              isSffWatch: cmsData.isSffCandidate,
              cmsDataSnapshot: cmsData as unknown as Record<string, unknown>,
            })
            .where(eq(facilities.id, facility.id));

          // Log significant changes as activities
          const changes: string[] = [];
          if (oldRating !== cmsData.overallRating) {
            changes.push(`CMS rating: ${oldRating || '?'} → ${cmsData.overallRating || '?'}`);
          }
          if (oldSff !== cmsData.isSff) {
            changes.push(cmsData.isSff ? 'Added to SFF list' : 'Removed from SFF list');
          }

          if (changes.length > 0 && facility.dealId) {
            await db.insert(dealActivities).values({
              dealId: facility.dealId!,
              type: 'cms_sync',
              title: `CMS data updated for ${facility.name}`,
              description: changes.join('; '),
              metadata: {
                ccn,
                previousRating: oldRating,
                newRating: cmsData.overallRating,
                isSff: cmsData.isSff,
              },
              userName: 'CMS Cron',
            });
          }
        }

        refreshed++;

        // Rate limit: 200ms between API calls
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        failed++;
        errors.push(`CCN ${ccn}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Update stale cache entries (older than 7 days) that aren't linked to facilities
    const staleCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await db
      .update(cmsProviderData)
      .set({ updatedAt: new Date() })
      .where(sql`${cmsProviderData.syncedAt} < ${staleCutoff}`);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      data: {
        totalCCNs: ccnMap.size,
        refreshed,
        unchanged,
        failed,
        durationMs: duration,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
    });
  } catch (error) {
    console.error('CMS refresh cron error:', error);
    return NextResponse.json(
      { success: false, error: 'CMS refresh failed' },
      { status: 500 }
    );
  }
}
