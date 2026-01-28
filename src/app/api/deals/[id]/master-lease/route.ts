/**
 * Master Lease Analysis API
 *
 * POST /api/deals/[id]/master-lease
 * Calculates comprehensive master lease economics, NPV projections,
 * and buy vs lease recommendations for a portfolio.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities, financialPeriods, cmsProviderData } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import {
  calculateMasterLease,
  type PortfolioFacility,
  type MasterLeaseOptions,
} from '@/lib/analysis/master-lease-calculator';
import {
  getPartnerProfile,
  getAllPartnerProfiles,
  type PartnerProfile,
} from '@/lib/partners/partner-profiles';

interface RequestBody {
  partnerId?: string;
  customPartner?: Partial<PartnerProfile>;
  options?: Partial<MasterLeaseOptions>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body: RequestBody = await request.json();

    // Get partner profile
    let partner: PartnerProfile | undefined;

    if (body.partnerId) {
      partner = getPartnerProfile(body.partnerId);
      if (!partner) {
        return NextResponse.json(
          { error: `Partner profile '${body.partnerId}' not found` },
          { status: 400 }
        );
      }
    } else if (body.customPartner) {
      // Use first preset as base and override
      const basePartner = getAllPartnerProfiles()[0];
      partner = {
        ...basePartner,
        ...body.customPartner,
        economics: { ...basePartner.economics, ...body.customPartner.economics },
        leaseTerms: { ...basePartner.leaseTerms, ...body.customPartner.leaseTerms },
        underwriting: { ...basePartner.underwriting, ...body.customPartner.underwriting },
        assetPreferences: { ...basePartner.assetPreferences, ...body.customPartner.assetPreferences },
      } as PartnerProfile;
    } else {
      // Default to first REIT profile
      partner = getAllPartnerProfiles()[0];
    }

    // Get deal with facilities
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get facilities
    const facilityRows = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    if (facilityRows.length === 0) {
      return NextResponse.json(
        { error: 'No facilities found for this deal' },
        { status: 400 }
      );
    }

    // Get financial data for each facility
    const portfolioFacilities: PortfolioFacility[] = await Promise.all(
      facilityRows.map(async (facility) => {
        // Get latest financial period
        const [financials] = await db
          .select()
          .from(financialPeriods)
          .where(eq(financialPeriods.facilityId, facility.id))
          .orderBy(desc(financialPeriods.periodEnd))
          .limit(1);

        // Get CMS data if CCN is available
        let cmsData = null;
        if (facility.ccn) {
          [cmsData] = await db
            .select()
            .from(cmsProviderData)
            .where(eq(cmsProviderData.ccn, facility.ccn))
            .limit(1);
        }

        // Calculate TTM values - check if already annualized
        const isAnnualized = financials?.isAnnualized === true;
        const multiplier = isAnnualized ? 1 : 12;

        const ttmRevenue = financials?.totalRevenue
          ? Number(financials.totalRevenue) * multiplier
          : 0;
        const ttmExpenses = financials?.totalExpenses
          ? Number(financials.totalExpenses) * multiplier
          : 0;
        const ttmEbitdar = financials?.ebitdar
          ? Number(financials.ebitdar) * multiplier
          : ttmRevenue - ttmExpenses;
        const ttmNoi = financials?.noi
          ? Number(financials.noi) * multiplier
          : ttmEbitdar * 0.95;

        // Occupancy may be stored as decimal (0.85) or percentage (85)
        const rawOccupancy = Number(financials?.occupancyRate || 0.85);
        const occupancyRate = rawOccupancy > 1 ? rawOccupancy / 100 : rawOccupancy;

        return {
          id: facility.id,
          name: facility.name,
          beds: facility.licensedBeds || 0,
          state: facility.state || '',
          cmsRating: cmsData?.overallRating || facility.cmsRating || undefined,
          yearBuilt: facility.yearBuilt || undefined,
          ttmRevenue,
          ttmEbitdar,
          ttmNoi,
          occupancyRate,
          medicarePercent: financials?.medicarePercent
            ? Number(financials.medicarePercent) / 100
            : undefined,
          medicaidPercent: financials?.medicaidPercent
            ? Number(financials.medicaidPercent) / 100
            : undefined,
          surveyDeficiencies: cmsData?.totalDeficiencies || undefined,
          isSff: cmsData?.isSff || facility.isSff || false,
          hasImmediateJeopardy: cmsData?.hasImmediateJeopardy ||
            facility.hasImmediateJeopardy || false,
        } satisfies PortfolioFacility;
      })
    );

    // Filter out facilities with no financial data
    const validFacilities = portfolioFacilities.filter(
      (f) => f.ttmNoi > 0 && f.beds > 0
    );

    if (validFacilities.length === 0) {
      return NextResponse.json(
        { error: 'No facilities with valid financial data' },
        { status: 400 }
      );
    }

    // Calculate master lease
    const result = calculateMasterLease({
      facilities: validFacilities,
      partner,
      options: {
        isAllOrNothing: deal.isAllOrNothing ?? true,
        allowPartialExclusions: !deal.isAllOrNothing,
        maxExcludedFacilities: deal.isAllOrNothing ? 0 : 2,
        discountRate: 0.08,
        projectionYears: 20,
        includeRenewals: true,
        noiGrowthRate: 0.02,
        ...body.options,
      },
    });

    return NextResponse.json({
      dealId,
      dealName: deal.name,
      partner: {
        id: partner.id,
        name: partner.name,
        type: partner.type,
      },
      ...result,
    });
  } catch (error) {
    console.error('Master lease calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate master lease' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/deals/[id]/master-lease
 * Returns available partner profiles and their economics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const partners = getAllPartnerProfiles().map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      riskTolerance: p.riskTolerance,
      economics: p.economics,
      leaseTerms: {
        structure: p.leaseTerms.structure,
        initialTermYears: p.leaseTerms.initialTermYears,
        renewalOptions: p.leaseTerms.renewalOptions,
        renewalTermYears: p.leaseTerms.renewalTermYears,
        escalationType: p.leaseTerms.escalationType,
        fixedEscalation: p.leaseTerms.fixedEscalation,
      },
    }));

    return NextResponse.json({ partners });
  } catch (error) {
    console.error('Error fetching partner profiles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch partner profiles' },
      { status: 500 }
    );
  }
}
