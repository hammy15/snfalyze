import { NextRequest, NextResponse } from 'next/server';
import {
  db,
  wizardSessions,
  deals,
  facilities,
  documentFolders,
  analysisStages,
  saleLeaseback,
} from '@/db';
import { eq } from 'drizzle-orm';

interface WizardStageData {
  dealStructure?: {
    dealName?: string;
    dealStructure?: 'purchase' | 'sale_leaseback' | 'acquisition_financing';
    facilityCount?: number;
    specialCircumstances?: string;
    buyerPartnerId?: string;
    isAllOrNothing?: boolean;
    assetType?: 'SNF' | 'ALF' | 'ILF';
  };
  facilityIdentification?: {
    facilities?: Array<{
      slot: number;
      ccn?: string;
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      licensedBeds?: number;
      certifiedBeds?: number;
      cmsRating?: number;
      healthRating?: number;
      staffingRating?: number;
      qualityRating?: number;
      isSff?: boolean;
      isSffWatch?: boolean;
      isVerified: boolean;
      cmsData?: Record<string, unknown>;
      assetType?: 'SNF' | 'ALF' | 'ILF';
      yearBuilt?: number;
    }>;
  };
  documentOrganization?: Record<string, unknown>;
  documentExtraction?: Record<string, unknown>;
  coaMappingReview?: Record<string, unknown>;
  financialConsolidation?: Record<string, unknown>;
}

// POST - Complete wizard and create/finalize deal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch the wizard session
    const sessions = await db
      .select()
      .from(wizardSessions)
      .where(eq(wizardSessions.id, id));

    if (sessions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Wizard session not found' },
        { status: 404 }
      );
    }

    const session = sessions[0];

    if (session.isComplete) {
      // If already complete, just return the deal
      if (session.dealId) {
        const existingDeals = await db
          .select()
          .from(deals)
          .where(eq(deals.id, session.dealId));

        return NextResponse.json({
          success: true,
          data: {
            session,
            deal: existingDeals[0],
          },
          message: 'Wizard already completed',
        });
      }
    }

    const stageData = session.stageData as WizardStageData & {
      visionExtraction?: {
        facilities?: Array<{
          name: string;
          ccn?: string;
          state?: string;
          city?: string;
          beds?: number;
          periods?: unknown[];
          lineItems?: unknown[];
        }>;
        verified?: boolean;
      };
      facilityVerification?: {
        facilities?: Array<{
          id: string;
          name: string;
          ccn?: string;
          state?: string;
          city?: string;
          beds?: number;
          verified?: boolean;
          cmsData?: Record<string, unknown>;
        }>;
      };
    };

    // Try to get facilities from various sources in the wizard data
    let facilityData: Array<{
      slot: number;
      ccn?: string;
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      licensedBeds?: number;
      certifiedBeds?: number;
      cmsRating?: number;
      healthRating?: number;
      staffingRating?: number;
      qualityRating?: number;
      isSff?: boolean;
      isSffWatch?: boolean;
      isVerified: boolean;
      cmsData?: Record<string, unknown>;
      assetType?: 'SNF' | 'ALF' | 'ILF';
      yearBuilt?: number;
    }> = [];

    // Priority 1: Old wizard format (facilityIdentification)
    if (stageData.facilityIdentification?.facilities?.length) {
      facilityData = stageData.facilityIdentification.facilities;
    }
    // Priority 2: New wizard format (facilityVerification from stage 3)
    else if (stageData.facilityVerification?.facilities?.length) {
      facilityData = stageData.facilityVerification.facilities.map((f, idx) => ({
        slot: idx + 1,
        name: f.name,
        ccn: f.ccn,
        city: f.city,
        state: f.state,
        licensedBeds: f.beds,
        isVerified: f.verified ?? true, // Default to verified from stage 3
        cmsData: f.cmsData,
      }));
    }
    // Priority 3: Vision extraction facilities (from stage 1)
    else if (stageData.visionExtraction?.facilities?.length) {
      facilityData = stageData.visionExtraction.facilities.map((f, idx) => ({
        slot: idx + 1,
        name: f.name,
        ccn: f.ccn,
        city: f.city,
        state: f.state,
        licensedBeds: f.beds,
        isVerified: true, // Auto-verify from extraction
      }));
    }

    // Validate we have at least one facility
    if (!facilityData.length) {
      return NextResponse.json(
        { success: false, error: 'At least one facility is required' },
        { status: 400 }
      );
    }

    // Auto-generate deal name if not provided
    let dealName = stageData.dealStructure?.dealName;
    if (!dealName) {
      // Generate from facility names
      if (facilityData.length === 1) {
        dealName = facilityData[0].name || 'New Deal';
      } else {
        const firstFacility = facilityData[0];
        const state = firstFacility.state || '';
        const city = firstFacility.city || '';
        const location = city && state ? `${city}, ${state}` : state || city || '';
        dealName = location
          ? `${facilityData.length}-Facility ${location} Portfolio`
          : `${facilityData.length}-Facility Portfolio`;
      }
      // Add timestamp to make unique
      dealName += ` - ${new Date().toLocaleDateString()}`;
    }

    // Build deal structure with defaults
    const dealStructure = {
      ...stageData.dealStructure,
      dealName,
      dealStructure: stageData.dealStructure?.dealStructure || 'purchase',
    };

    // Calculate total beds
    const totalBeds = facilityData.reduce(
      (sum, f) => sum + (f.licensedBeds || 0),
      0
    );

    // Get primary state
    const states = facilityData.map(f => f.state).filter(Boolean);
    const primaryState = states[0] || null;

    // Determine primary asset type
    const assetType = dealStructure.assetType || facilityData[0]?.assetType || 'SNF';

    // Create or update the deal
    let dealRecord;

    if (session.dealId) {
      // Update existing deal (dealName already validated above)
      const [updated] = await db
        .update(deals)
        .set({
          name: dealStructure.dealName!,
          dealStructure: dealStructure.dealStructure || 'purchase',
          assetType,
          isAllOrNothing: dealStructure.isAllOrNothing ?? true,
          buyerPartnerId: dealStructure.buyerPartnerId || null,
          specialCircumstances: dealStructure.specialCircumstances,
          beds: totalBeds,
          primaryState,
          status: 'analyzing',
          updatedAt: new Date(),
        })
        .where(eq(deals.id, session.dealId))
        .returning();
      dealRecord = updated;
    } else {
      // Create new deal (dealName already validated above)
      const [newDeal] = await db
        .insert(deals)
        .values({
          name: dealStructure.dealName!,
          dealStructure: dealStructure.dealStructure || 'purchase',
          assetType,
          isAllOrNothing: dealStructure.isAllOrNothing ?? true,
          buyerPartnerId: dealStructure.buyerPartnerId || null,
          specialCircumstances: dealStructure.specialCircumstances,
          beds: totalBeds,
          primaryState,
          status: 'analyzing',
        })
        .returning();
      dealRecord = newDeal;
    }

    // Delete existing facilities if updating
    if (session.dealId) {
      await db.delete(facilities).where(eq(facilities.dealId, dealRecord.id));
    }

    // Create facilities
    const createdFacilities = await Promise.all(
      facilityData.map(async (f) => {
        const [facility] = await db
          .insert(facilities)
          .values({
            dealId: dealRecord.id,
            name: f.name || `Facility ${f.slot}`,
            ccn: f.ccn,
            address: f.address,
            city: f.city,
            state: f.state,
            zipCode: f.zipCode,
            assetType: f.assetType || assetType,
            licensedBeds: f.licensedBeds,
            certifiedBeds: f.certifiedBeds,
            yearBuilt: f.yearBuilt,
            cmsRating: f.cmsRating,
            healthRating: f.healthRating,
            staffingRating: f.staffingRating,
            qualityRating: f.qualityRating,
            isSff: f.isSff || false,
            isSffWatch: f.isSffWatch || false,
            isVerified: true,
            verifiedAt: new Date(),
            cmsDataSnapshot: f.cmsData || null,
          })
          .returning();
        return facility;
      })
    );

    // Create default document folders
    const defaultFolders = [
      { name: 'Financial Statements', folderType: 'financial' as const, displayOrder: 1 },
      { name: 'Census & Operations', folderType: 'census' as const, displayOrder: 2 },
      { name: 'Survey Reports', folderType: 'survey' as const, displayOrder: 3 },
      { name: 'Legal & Lease', folderType: 'legal' as const, displayOrder: 4 },
      { name: 'Other Documents', folderType: 'other' as const, displayOrder: 5 },
    ];

    const createdFolders = await Promise.all(
      defaultFolders.map(async (folder) => {
        const [created] = await db
          .insert(documentFolders)
          .values({
            dealId: dealRecord.id,
            name: folder.name,
            folderType: folder.folderType,
            displayOrder: folder.displayOrder,
          })
          .returning();
        return created;
      })
    );

    // Create analysis stages
    const wizardStageTypes = [
      'document_upload',
      'census_validation',
      'revenue_analysis',
      'expense_analysis',
      'cms_integration',
      'valuation_coverage',
    ] as const;

    // Delete existing stages if updating
    if (session.dealId) {
      await db.delete(analysisStages).where(eq(analysisStages.dealId, dealRecord.id));
    }

    await Promise.all(
      wizardStageTypes.map((stage, index) =>
        db.insert(analysisStages).values({
          dealId: dealRecord.id,
          stage,
          status: index === 0 ? 'in_progress' : 'pending',
          order: index + 1,
        })
      )
    );

    // If sale-leaseback, create placeholder records
    if (dealStructure.dealStructure === 'sale_leaseback') {
      await Promise.all(
        createdFacilities.map((facility) =>
          db.insert(saleLeaseback).values({
            dealId: dealRecord.id,
            facilityId: facility.id,
          })
        )
      );
    }

    // Mark wizard session as complete
    const [completedSession] = await db
      .update(wizardSessions)
      .set({
        dealId: dealRecord.id,
        isComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(wizardSessions.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        session: completedSession,
        deal: dealRecord,
        facilities: createdFacilities,
        folders: createdFolders,
      },
      message: `Successfully created ${dealStructure.dealStructure?.replace('_', '-') || 'purchase'} deal with ${createdFacilities.length} facilities`,
    });
  } catch (error) {
    console.error('Error completing wizard:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete wizard' },
      { status: 500 }
    );
  }
}
