import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities, financialPeriods, dealWorkspaceStages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { lookupProviderByCCN } from '@/lib/cms/provider-lookup';
import {
  intakeStageDataSchema,
  calculateOverallCompleteness,
  getValidationErrors,
} from '@/lib/workspace/intake-validation';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Deep merge utility for nested objects
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ── POST: Initialize or fully set intake data ───────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = intakeStageDataSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const intakeData = parsed.data;
    const completionScore = calculateOverallCompleteness(intakeData);
    const validationErrors = getValidationErrors(intakeData);

    // Update workspace stage
    const [stage] = await db
      .update(dealWorkspaceStages)
      .set({
        stageData: intakeData as Record<string, unknown>,
        completionScore,
        validationErrors,
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'deal_intake')
        )
      )
      .returning();

    // Sync key fields to canonical tables
    await syncToCanonicalTables(dealId, intakeData);

    // If CCN provided, auto-lookup CMS data
    let cmsData = null;
    if (intakeData.facilityIdentification?.ccn) {
      try {
        cmsData = await lookupProviderByCCN(intakeData.facilityIdentification.ccn);
      } catch {
        // CMS lookup is best-effort
      }
    }

    return NextResponse.json({
      success: true,
      stage,
      completionScore,
      validationErrors,
      cmsData,
    });
  } catch (error) {
    console.error('Intake POST error:', error);
    return NextResponse.json({ error: 'Failed to save intake data' }, { status: 500 });
  }
}

// ── PATCH: Partial update intake data (section-level merge) ─────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const body = await request.json();

    // Load current stage data
    const [currentStage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'deal_intake')
        )
      );

    if (!currentStage) {
      return NextResponse.json({ error: 'Workspace not initialized' }, { status: 404 });
    }

    const currentData = (currentStage.stageData || {}) as Record<string, unknown>;
    const merged = deepMerge(currentData, body);

    // Validate merged result
    const parsed = intakeStageDataSchema.safeParse(merged);
    const intakeData = parsed.success ? parsed.data : merged;

    const completionScore = calculateOverallCompleteness(intakeData as Record<string, Record<string, unknown>>);
    const validationErrors = getValidationErrors(intakeData as Record<string, Record<string, unknown>>);

    // Update stage
    const [stage] = await db
      .update(dealWorkspaceStages)
      .set({
        stageData: intakeData as Record<string, unknown>,
        completionScore,
        validationErrors,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'deal_intake')
        )
      )
      .returning();

    // Sync to canonical tables on each save
    await syncToCanonicalTables(dealId, intakeData as Record<string, Record<string, unknown>>);

    // If CCN was updated in this patch, trigger CMS lookup
    let cmsData = null;
    if (body.facilityIdentification?.ccn) {
      try {
        cmsData = await lookupProviderByCCN(body.facilityIdentification.ccn);

        // Auto-fill operational snapshot from CMS data
        if (cmsData) {
          const cmsAutoFill: Record<string, unknown> = {};
          if (cmsData.overallRating) cmsAutoFill.cmsOverallRating = cmsData.overallRating;
          if (cmsData.staffingRating) cmsAutoFill.cmsStaffingStar = cmsData.staffingRating;
          if (cmsData.qualityMeasureRating) cmsAutoFill.cmsQualityStar = cmsData.qualityMeasureRating;
          if (cmsData.healthInspectionRating) cmsAutoFill.cmsInspectionStar = cmsData.healthInspectionRating;

          if (Object.keys(cmsAutoFill).length > 0) {
            const currentOps = (intakeData as Record<string, Record<string, unknown>>).operationalSnapshot || {};
            const mergedOps = { ...currentOps, ...cmsAutoFill };

            // Also auto-fill facility identification from CMS
            const facilityAutoFill: Record<string, unknown> = {};
            if (cmsData.providerName) facilityAutoFill.facilityName = cmsData.providerName;
            if (cmsData.address) facilityAutoFill.address = cmsData.address;
            if (cmsData.city) facilityAutoFill.city = cmsData.city;
            if (cmsData.state) facilityAutoFill.state = cmsData.state;
            if (cmsData.zipCode) facilityAutoFill.zipCode = cmsData.zipCode;
            if (cmsData.numberOfBeds) facilityAutoFill.licensedBeds = cmsData.numberOfBeds;

            const currentFacility = (intakeData as Record<string, Record<string, unknown>>).facilityIdentification || {};
            const mergedFacility = { ...currentFacility, ...facilityAutoFill };

            const finalData = deepMerge(intakeData as Record<string, unknown>, {
              operationalSnapshot: mergedOps,
              facilityIdentification: mergedFacility,
            });

            const finalCompletion = calculateOverallCompleteness(finalData as Record<string, Record<string, unknown>>);

            await db
              .update(dealWorkspaceStages)
              .set({
                stageData: finalData,
                completionScore: finalCompletion,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(dealWorkspaceStages.dealId, dealId),
                  eq(dealWorkspaceStages.stage, 'deal_intake')
                )
              );
          }

          // Update facility record with CMS snapshot
          const existingFacility = await db
            .select()
            .from(facilities)
            .where(eq(facilities.dealId, dealId))
            .limit(1);

          if (existingFacility.length > 0) {
            await db
              .update(facilities)
              .set({
                ccn: body.facilityIdentification.ccn,
                cmsRating: cmsData.overallRating,
                healthRating: cmsData.healthInspectionRating,
                staffingRating: cmsData.staffingRating,
                qualityRating: cmsData.qualityMeasureRating,
                isSff: cmsData.isSff,
                isSffWatch: cmsData.isSffCandidate,
                cmsDataSnapshot: cmsData as unknown as Record<string, unknown>,
              })
              .where(eq(facilities.id, existingFacility[0].id));
          }
        }
      } catch {
        // CMS lookup is best-effort
      }
    }

    return NextResponse.json({
      success: true,
      stage,
      completionScore,
      validationErrors,
      cmsData,
    });
  } catch (error) {
    console.error('Intake PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update intake data' }, { status: 500 });
  }
}

// ── Sync intake data to canonical tables ────────────────────────────
async function syncToCanonicalTables(
  dealId: string,
  intakeData: Record<string, Record<string, unknown>>
) {
  const fi = intakeData.facilityIdentification || {};
  const ods = intakeData.ownershipDealStructure || {};
  const fs = intakeData.financialSnapshot || {};

  // Update deals table with key fields
  const dealUpdates: Record<string, unknown> = { updatedAt: new Date() };
  if (fi.facilityName) dealUpdates.name = fi.facilityName;
  if (fi.state) dealUpdates.primaryState = fi.state;
  if (fi.facilityType) {
    const typeMap: Record<string, string> = {
      SNF: 'SNF',
      ALF: 'ALF',
      CCRC: 'ILF',
      SNF_ALF_COMBO: 'SNF',
    };
    dealUpdates.assetType = typeMap[fi.facilityType as string] || 'SNF';
  }
  if (ods.askingPrice) dealUpdates.askingPrice = String(ods.askingPrice);
  if (ods.dealStructure) {
    const structureMap: Record<string, string> = {
      asset_sale: 'purchase',
      stock_sale: 'purchase',
      lease: 'lease',
      jv: 'purchase',
    };
    dealUpdates.dealStructure = structureMap[ods.dealStructure as string] || 'purchase';
  }
  if (ods.currentOwnerName) dealUpdates.sellerName = ods.currentOwnerName;
  if (ods.brokerName) dealUpdates.brokerName = ods.brokerName;
  if (fi.licensedBeds) dealUpdates.beds = fi.licensedBeds;

  await db.update(deals).set(dealUpdates).where(eq(deals.id, dealId));

  // Upsert facility record
  const existingFacility = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, dealId))
    .limit(1);

  const facilityData = {
    name: (fi.facilityName as string) || 'Unnamed Facility',
    ccn: (fi.ccn as string) || null,
    address: (fi.address as string) || null,
    city: (fi.city as string) || null,
    state: (fi.state as string) || null,
    zipCode: (fi.zipCode as string) || null,
    assetType: (fi.facilityType === 'ALF' ? 'ALF' : fi.facilityType === 'CCRC' ? 'ILF' : 'SNF') as 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
    licensedBeds: (fi.licensedBeds as number) || null,
    certifiedBeds: (fi.medicareCertifiedBeds as number) || null,
  };

  if (existingFacility.length > 0) {
    await db
      .update(facilities)
      .set(facilityData)
      .where(eq(facilities.id, existingFacility[0].id));
  } else {
    await db.insert(facilities).values({
      dealId,
      ...facilityData,
    });
  }

  // Sync financial periods (TTM)
  if (fs.ttmRevenue || fs.ttmEbitda) {
    const now = new Date();
    const yearAgo = new Date(now);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const existingPeriod = await db
      .select()
      .from(financialPeriods)
      .where(
        and(
          eq(financialPeriods.dealId, dealId),
          eq(financialPeriods.source, 'manual')
        )
      )
      .limit(1);

    const periodData = {
      totalRevenue: fs.ttmRevenue ? String(fs.ttmRevenue) : null,
      ebitdar: fs.ttmEbitda ? String(fs.ttmEbitda) : null,
      normalizedNoi: fs.normalizedEbitda ? String(fs.normalizedEbitda) : null,
      averageDailyCensus: fs.ttmTotalCensusAdc ? String(fs.ttmTotalCensusAdc) : null,
      licensedBeds: (fi.licensedBeds as number) || null,
      occupancyRate: fs.ttmTotalCensusAdc && fi.licensedBeds
        ? String((fs.ttmTotalCensusAdc as number) / (fi.licensedBeds as number))
        : null,
      isAnnualized: true,
      source: 'manual' as const,
    };

    if (existingPeriod.length > 0) {
      await db
        .update(financialPeriods)
        .set(periodData)
        .where(eq(financialPeriods.id, existingPeriod[0].id));
    } else {
      await db.insert(financialPeriods).values({
        dealId,
        periodStart: yearAgo.toISOString().split('T')[0],
        periodEnd: now.toISOString().split('T')[0],
        ...periodData,
      });
    }
  }
}
