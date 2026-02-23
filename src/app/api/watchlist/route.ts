/**
 * Facility Watchlist API
 *
 * GET: List all watched facilities with recent alerts
 * POST: Add a facility to the watchlist by CCN
 * DELETE: Remove a facility from the watchlist
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, facilityWatchlist, facilityAlerts } from '@/db';
import { eq, desc, and } from 'drizzle-orm';
import { lookupProviderByCCN } from '@/lib/cms/provider-lookup';

export async function GET() {
  try {
    const entries = await db
      .select()
      .from(facilityWatchlist)
      .where(eq(facilityWatchlist.isActive, true))
      .orderBy(desc(facilityWatchlist.createdAt));

    // Fetch recent alerts for each entry
    const entriesWithAlerts = await Promise.all(
      entries.map(async (entry) => {
        const alerts = await db
          .select()
          .from(facilityAlerts)
          .where(eq(facilityAlerts.watchlistId, entry.id))
          .orderBy(desc(facilityAlerts.createdAt))
          .limit(5);

        const unreadCount = alerts.filter(a => !a.isRead).length;

        return {
          ...entry,
          alerts,
          unreadAlertCount: unreadCount,
        };
      })
    );

    // Also get global unread alert count
    const allUnread = await db
      .select()
      .from(facilityAlerts)
      .where(eq(facilityAlerts.isRead, false));

    return NextResponse.json({
      success: true,
      data: {
        entries: entriesWithAlerts,
        totalWatched: entries.length,
        totalUnreadAlerts: allUnread.length,
      },
    });
  } catch (error) {
    console.error('Watchlist GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch watchlist' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ccn, notes } = body;

    if (!ccn) {
      return NextResponse.json({ error: 'CCN is required' }, { status: 400 });
    }

    const normalizedCCN = ccn.replace(/\D/g, '').padStart(6, '0');

    // Look up facility data from CMS
    const cmsData = await lookupProviderByCCN(normalizedCCN);

    // Create watchlist entry
    const [entry] = await db
      .insert(facilityWatchlist)
      .values({
        ccn: normalizedCCN,
        facilityName: cmsData?.providerName || null,
        state: cmsData?.state || null,
        beds: cmsData?.numberOfBeds || null,
        lastKnownRating: cmsData?.overallRating || null,
        lastKnownSff: cmsData?.isSff || false,
        notes: notes || null,
        lastCheckedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: facilityWatchlist.ccn,
        set: {
          isActive: true,
          facilityName: cmsData?.providerName || undefined,
          lastKnownRating: cmsData?.overallRating || undefined,
          lastKnownSff: cmsData?.isSff || false,
          lastCheckedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        entry,
        cmsData: cmsData ? {
          name: cmsData.providerName,
          rating: cmsData.overallRating,
          beds: cmsData.numberOfBeds,
          isSff: cmsData.isSff,
          state: cmsData.state,
        } : null,
      },
    });
  } catch (error) {
    console.error('Watchlist POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add to watchlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ccn = searchParams.get('ccn');

    if (!id && !ccn) {
      return NextResponse.json({ error: 'ID or CCN is required' }, { status: 400 });
    }

    if (id) {
      await db
        .update(facilityWatchlist)
        .set({ isActive: false })
        .where(eq(facilityWatchlist.id, id));
    } else if (ccn) {
      await db
        .update(facilityWatchlist)
        .set({ isActive: false })
        .where(eq(facilityWatchlist.ccn, ccn.replace(/\D/g, '').padStart(6, '0')));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Watchlist DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove from watchlist' },
      { status: 500 }
    );
  }
}
