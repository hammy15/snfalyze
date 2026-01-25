import { NextRequest, NextResponse } from 'next/server';
import { db, proformaScenarios, proformaScenarioAssumptions } from '@/db';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Default assumptions for proforma
const DEFAULT_ASSUMPTIONS = {
  revenue_growth_rate: 0.025, // 2.5%
  expense_inflation_rate: 0.03, // 3%
  occupancy_target: 0.92, // 92%
  medicare_rate_increase: 0.03, // 3%
  medicaid_rate_increase: 0.015, // 1.5%
  private_rate_increase: 0.04, // 4%
  wage_increase: 0.035, // 3.5%
  benefits_increase: 0.05, // 5%
  rent_escalation: 0.02, // 2%
  cap_rate: 0.075, // 7.5%
  yield_requirement: 0.085, // 8.5%
  min_coverage_ratio: 1.4, // 1.40x
  discount_rate: 0.08, // 8%
  terminal_cap_rate: 0.08, // 8%
};

/**
 * GET - Fetch assumptions for a proforma scenario
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: scenarioId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');

    // Verify scenario exists
    const scenario = await db.query.proformaScenarios.findFirst({
      where: eq(proformaScenarios.id, scenarioId),
    });

    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    // Fetch assumptions
    const conditions = [eq(proformaScenarioAssumptions.scenarioId, scenarioId)];
    if (facilityId) {
      conditions.push(eq(proformaScenarioAssumptions.facilityId, facilityId));
    }

    const assumptions = await db.query.proformaScenarioAssumptions.findMany({
      where: and(...conditions),
    });

    // Convert to key-value object with defaults
    const assumptionMap = { ...DEFAULT_ASSUMPTIONS };
    for (const a of assumptions) {
      if (a.assumptionKey) {
        assumptionMap[a.assumptionKey as keyof typeof DEFAULT_ASSUMPTIONS] = 
          Number(a.assumptionValue) || DEFAULT_ASSUMPTIONS[a.assumptionKey as keyof typeof DEFAULT_ASSUMPTIONS];
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        scenario: {
          id: scenario.id,
          name: scenario.name,
          type: scenario.scenarioType,
        },
        assumptions: assumptionMap,
        raw: assumptions,
      },
    });
  } catch (error) {
    console.error('Error fetching proforma assumptions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assumptions' },
      { status: 500 }
    );
  }
}

/**
 * POST - Create or update assumptions for a proforma scenario
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: scenarioId } = await params;
    const body = await request.json();

    // Verify scenario exists
    const scenario = await db.query.proformaScenarios.findFirst({
      where: eq(proformaScenarios.id, scenarioId),
    });

    if (!scenario) {
      return NextResponse.json(
        { success: false, error: 'Scenario not found' },
        { status: 404 }
      );
    }

    const { facilityId, assumptions } = body;

    if (!assumptions || typeof assumptions !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Assumptions object is required' },
        { status: 400 }
      );
    }

    // Upsert each assumption
    const results = [];
    for (const [key, value] of Object.entries(assumptions)) {
      if (value !== null && value !== undefined) {
        // Check if assumption exists
        const existing = await db.query.proformaScenarioAssumptions.findFirst({
          where: and(
            eq(proformaScenarioAssumptions.scenarioId, scenarioId),
            eq(proformaScenarioAssumptions.assumptionKey, key),
            facilityId 
              ? eq(proformaScenarioAssumptions.facilityId, facilityId)
              : eq(proformaScenarioAssumptions.facilityId, null as any)
          ),
        });

        if (existing) {
          // Update
          const [updated] = await db
            .update(proformaScenarioAssumptions)
            .set({ assumptionValue: String(value) })
            .where(eq(proformaScenarioAssumptions.id, existing.id))
            .returning();
          results.push(updated);
        } else {
          // Insert
          const [inserted] = await db
            .insert(proformaScenarioAssumptions)
            .values({
              scenarioId,
              facilityId: facilityId || null,
              assumptionKey: key,
              assumptionValue: String(value),
            })
            .returning();
          results.push(inserted);
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error saving proforma assumptions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save assumptions' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove specific assumptions
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: scenarioId } = await params;
    const body = await request.json();
    const { assumptionIds } = body;

    if (!assumptionIds || !Array.isArray(assumptionIds)) {
      return NextResponse.json(
        { success: false, error: 'assumptionIds array is required' },
        { status: 400 }
      );
    }

    // Delete each assumption
    for (const id of assumptionIds) {
      await db
        .delete(proformaScenarioAssumptions)
        .where(
          and(
            eq(proformaScenarioAssumptions.id, id),
            eq(proformaScenarioAssumptions.scenarioId, scenarioId)
          )
        );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: assumptionIds.length },
    });
  } catch (error) {
    console.error('Error deleting assumptions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete assumptions' },
      { status: 500 }
    );
  }
}
