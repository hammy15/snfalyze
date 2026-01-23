import { NextRequest, NextResponse } from 'next/server';
import { db, wizardSessions, deals } from '@/db';
import { eq, desc, isNull } from 'drizzle-orm';

// Type for wizard stage data
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
      beds?: number;
      cmsRating?: number;
      isSff?: boolean;
      isVerified: boolean;
      cmsData?: Record<string, unknown>;
    }>;
  };
  documentOrganization?: {
    folders?: Array<{
      id: string;
      name: string;
      type: string;
      documentIds: string[];
    }>;
    documents?: Array<{
      id: string;
      filename: string;
      type?: string;
      confirmedType?: boolean;
      facilityId?: string;
    }>;
  };
  documentExtraction?: {
    documents?: Array<{
      id: string;
      status: 'pending' | 'in_progress' | 'review_needed' | 'complete';
      extractedFields?: number;
      clarificationsCount?: number;
      clarificationsResolved?: number;
    }>;
  };
  coaMappingReview?: {
    totalItems?: number;
    mappedItems?: number;
    unmappedItems?: number;
    reviewedItems?: number;
  };
  financialConsolidation?: {
    censusVerified?: boolean;
    ppdCalculated?: boolean;
    facilityPnlGenerated?: boolean;
    portfolioRollupGenerated?: boolean;
    proformaGenerated?: boolean;
  };
}

// GET - List all active wizard sessions or get incomplete sessions
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeComplete = searchParams.get('includeComplete') === 'true';
    const dealId = searchParams.get('dealId');

    let query = db.select().from(wizardSessions).orderBy(desc(wizardSessions.updatedAt));

    const sessions = await query;

    // Filter based on parameters
    let filteredSessions = sessions;

    if (!includeComplete) {
      filteredSessions = filteredSessions.filter(s => !s.isComplete);
    }

    if (dealId) {
      filteredSessions = filteredSessions.filter(s => s.dealId === dealId);
    }

    return NextResponse.json({
      success: true,
      data: filteredSessions.map(session => ({
        ...session,
        stageData: session.stageData as WizardStageData,
      })),
    });
  } catch (error) {
    console.error('Error fetching wizard sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch wizard sessions' },
      { status: 500 }
    );
  }
}

// POST - Create a new wizard session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, initialStageData } = body;

    // If dealId is provided, check if deal exists and doesn't have an active session
    if (dealId) {
      const existingDeal = await db.select().from(deals).where(eq(deals.id, dealId));
      if (existingDeal.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Deal not found' },
          { status: 404 }
        );
      }

      // Check for existing incomplete session
      const existingSessions = await db
        .select()
        .from(wizardSessions)
        .where(eq(wizardSessions.dealId, dealId));

      const incompleteSession = existingSessions.find(s => !s.isComplete);
      if (incompleteSession) {
        return NextResponse.json({
          success: true,
          data: {
            ...incompleteSession,
            stageData: incompleteSession.stageData as WizardStageData,
            resumed: true,
          },
          message: 'Resumed existing wizard session',
        });
      }
    }

    // Create new session
    const [newSession] = await db
      .insert(wizardSessions)
      .values({
        dealId: dealId || null,
        currentStage: 'document_upload',
        stageData: initialStageData || {},
        isComplete: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        ...newSession,
        stageData: newSession.stageData as WizardStageData,
      },
      message: 'Created new wizard session',
    });
  } catch (error) {
    console.error('Error creating wizard session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create wizard session' },
      { status: 500 }
    );
  }
}
