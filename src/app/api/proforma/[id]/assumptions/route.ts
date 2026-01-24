import { NextRequest, NextResponse } from 'next/server';
import { db, proformaScenarioAssumptions, proformaScenarios, proformaLineOverrides } from '@/db';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = params.id;

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

    // Fetch assumptions for this scenario
    const assumptions = await db.query.proformaScenarioAssumptions.findMany({
      where: eq(proformaScenarioAssumptions.scenarioId, scenarioId),
    });

    // Fetch line overrides for this scenario
    const overrides = await db.query.proformaLineOverrides.findMany({
      where: eq(proformaLineOverrides.scenarioId, scenarioId),
    });

    return NextResponse.json({
      success: true,
      data: {
        scenarioId,
        scenarioName: scenario.name,
        assumptions,
        overrides,
      },
    });
  } catch (error) {
    console.error('Error fetching proforma assumptions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch proforma assumptions' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = params.id;
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

    const results = {
      assumptions: [] as any[],
      overrides: [] as any[],
    };

    // Handle assumptions
    if (body.assumptions && Array.isArray(body.assumptions)) {
      for (const assumption of body.assumptions) {
        const [inserted] = await db
          .insert(proformaScenarioAssumptions)
          .values({
            scenarioId,
            facilityId: assumption.facilityId || null,
            assumptionKey: assumption.key,
            assumptionValue: assumption.value?.toString(),
          })
          .returning();
        results.assumptions.push(inserted);
      }
    }

    // Handle overrides
    if (body.overrides && Array.isArray(body.overrides)) {
      for (const override of body.overrides) {
        const [inserted] = await db
          .insert(proformaLineOverrides)
          .values({
            scenarioId,
            facilityId: override.facilityId,
            coaCode: override.coaCode,
            monthIndex: override.monthIndex,
            overrideType: override.overrideType || 'fixed',
            overrideValue: override.overrideValue?.toString(),
            annualGrowthRate: override.annualGrowthRate?.toString(),
            notes: override.notes,
          })
          .returning();
        results.overrides.push(inserted);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error creating proforma data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create proforma data' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scenarioId = params.id;
    const body = await request.json();

    const results = {
      assumptions: [] as any[],
      overrides: [] as any[],
    };

    // Update assumptions
    if (body.assumptions && Array.isArray(body.assumptions)) {
      // Delete existing assumptions for this scenario
      await db
        .delete(proformaScenarioAssumptions)
        .where(eq(proformaScenarioAssumptions.scenarioId, scenarioId));

      // Insert new assumptions
      for (const assumption of body.assumptions) {
        const [inserted] = await db
          .insert(proformaScenarioAssumptions)
          .values({
            scenarioId,
            facilityId: assumption.facilityId || null,
            assumptionKey: assumption.key,
            assumptionValue: assumption.value?.toString(),
          })
          .returning();
        results.assumptions.push(inserted);
      }
    }

    // Update overrides
    if (body.overrides && Array.isArray(body.overrides)) {
      // Delete existing overrides for this scenario
      await db
        .delete(proformaLineOverrides)
        .where(eq(proformaLineOverrides.scenarioId, scenarioId));

      // Insert new overrides
      for (const override of body.overrides) {
        const [inserted] = await db
          .insert(proformaLineOverrides)
          .values({
            scenarioId,
            facilityId: override.facilityId,
            coaCode: override.coaCode,
            monthIndex: override.monthIndex,
            overrideType: override.overrideType || 'fixed',
            overrideValue: override.overrideValue?.toString(),
            annualGrowthRate: override.annualGrowthRate?.toString(),
            notes: override.notes,
          })
          .returning();
        results.overrides.push(inserted);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Error updating proforma data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update proforma data' },
      { status: 500 }
    );
  }
}
