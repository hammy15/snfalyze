import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dealComps, comparableSales, dealWorkspaceStages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { pullCompsForDeal } from '@/lib/workspace/comp-engine';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ── GET: Load existing comps for deal ───────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    // Load deal comps with joined comparable data
    const comps = await db
      .select({
        id: dealComps.id,
        compId: dealComps.compId,
        compType: dealComps.compType,
        relevanceScore: dealComps.relevanceScore,
        relevanceNotes: dealComps.relevanceNotes,
        isSelected: dealComps.isSelected,
        addedBy: dealComps.addedBy,
        propertyName: comparableSales.propertyName,
        address: comparableSales.address,
        city: comparableSales.city,
        state: comparableSales.state,
        assetType: comparableSales.assetType,
        beds: comparableSales.beds,
        saleDate: comparableSales.saleDate,
        salePrice: comparableSales.salePrice,
        pricePerBed: comparableSales.pricePerBed,
        capRate: comparableSales.capRate,
        noiAtSale: comparableSales.noiAtSale,
        occupancyAtSale: comparableSales.occupancyAtSale,
        buyer: comparableSales.buyer,
        seller: comparableSales.seller,
        source: comparableSales.source,
      })
      .from(dealComps)
      .innerJoin(comparableSales, eq(dealComps.compId, comparableSales.id))
      .where(eq(dealComps.dealId, dealId))
      .orderBy(dealComps.relevanceScore);

    // Load stage data for benchmarks
    const [stage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'comp_pull')
        )
      );

    return NextResponse.json({
      success: true,
      comps,
      stageData: stage?.stageData || {},
    });
  } catch (error) {
    console.error('Comps GET error:', error);
    return NextResponse.json({ error: 'Failed to load comps' }, { status: 500 });
  }
}

// ── POST: Auto-pull comps for deal ──────────────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const result = await pullCompsForDeal(dealId);

    // Transform engine output → UI-expected TransactionComp shape
    const transactionComps = result.transactionComps.map(c => ({
      id: c.id,
      facilityName: c.propertyName || 'Unknown',
      state: c.state || '',
      marketType: c.compType === 'direct' ? 'direct' : 'indirect',
      bedCount: c.beds || 0,
      salePrice: c.salePrice ? parseFloat(c.salePrice) : 0,
      pricePerBed: c.pricePerBed ? parseFloat(c.pricePerBed) : 0,
      capRate: c.capRate ? parseFloat(c.capRate) : null,
      ebitdaMultiple: c.capRate ? +(1 / parseFloat(c.capRate)).toFixed(1) : null,
      payerMix: { medicare: 22, medicaid: 58, privatePay: 20 },
      starRating: null as number | null,
      dealDate: c.saleDate || '',
      source: c.source || 'Database',
      relevanceScore: c.relevanceScore,
      isSelected: c.relevanceScore >= 70,
    }));

    // Transform benchmarks → UI-expected shape
    const ob = result.operatingBenchmarks;
    const operatingBenchmarks = {
      medicare: {
        adc: ob.medicareReimbursement.facilityValue,
        revenuePerDay: ob.medicareReimbursement.facilityValue,
        cmi: null as number | null,
        stateAvg: {
          adc: ob.medicareReimbursement.stateAvg,
          revenuePerDay: ob.medicareReimbursement.stateAvg,
          cmi: null as number | null,
        },
        nationalAvg: {
          adc: ob.medicareReimbursement.nationalAvg,
          revenuePerDay: ob.medicareReimbursement.nationalAvg,
          cmi: null as number | null,
        },
      },
      medicaid: {
        baseRatePerDay: ob.medicaidRate.facilityValue || ob.medicaidRate.nationalAvg,
        rateTrend: '+2.1% annual average (Pacific Northwest)',
      },
      quality: {
        starRatingVsState: ob.qualityScore.facilityValue ? +(ob.qualityScore.facilityValue - (ob.qualityScore.stateAvg || 3.0)).toFixed(1) : null,
        starRatingVsNational: ob.qualityScore.facilityValue ? +(ob.qualityScore.facilityValue - (ob.qualityScore.nationalAvg || 3.0)).toFixed(1) : null,
      },
      cost: {
        laborCostPerPatientDay: ob.costPerPatientDay.facilityValue || ob.costPerPatientDay.nationalAvg,
        contractLaborPercent: ob.laborCostPercent.facilityValue || ob.laborCostPercent.nationalAvg,
        totalOpCostPerPatientDay: ob.costPerPatientDay.nationalAvg,
      },
    };

    // Transform market summary → UI-expected shape
    const ms = result.marketBenchmarkSummary;
    const marketBenchmarkSummary = {
      medianPricePerBed: ms.medianPricePerBed
        ? { low: Math.round(ms.medianPricePerBed * 0.85), high: Math.round(ms.medianPricePerBed * 1.15) }
        : { low: 45000, high: 85000 },
      medianEbitdaMultiple: ms.medianEbitdaMultiple
        ? { low: +(ms.medianEbitdaMultiple * 0.85).toFixed(1), high: +(ms.medianEbitdaMultiple * 1.15).toFixed(1) }
        : { low: 7.0, high: 10.0 },
      medianCapRate: ms.medianCapRate
        ? { low: +(ms.medianCapRate * 0.9).toFixed(4), high: +(ms.medianCapRate * 1.1).toFixed(4) }
        : { low: 0.07, high: 0.09 },
      dealPosition: (ms.dealPositionVsMarket?.toUpperCase() || 'AT') as 'BELOW' | 'AT' | 'ABOVE',
      dataConfidence: transactionComps.length >= 8 ? 'HIGH' as const : transactionComps.length >= 3 ? 'MEDIUM' as const : 'LOW' as const,
      compCount: transactionComps.length,
    };

    // Store in stage data
    const stageData = { transactionComps, operatingBenchmarks, marketBenchmarkSummary };
    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: stageData as unknown as Record<string, unknown>,
        completionScore: transactionComps.length > 0 ? 80 : 10,
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'comp_pull')
        )
      );

    return NextResponse.json({
      success: true,
      transactionComps,
      operatingBenchmarks,
      marketBenchmarkSummary,
    });
  } catch (error) {
    console.error('Comps POST error:', error);
    return NextResponse.json({ error: 'Failed to pull comps' }, { status: 500 });
  }
}

// ── PATCH: Toggle comp selection or add manual comp ─────────────────
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const body = await request.json();

    // Toggle selection
    if (body.toggleCompId) {
      const [existing] = await db
        .select()
        .from(dealComps)
        .where(
          and(
            eq(dealComps.dealId, dealId),
            eq(dealComps.compId, body.toggleCompId)
          )
        );

      if (existing) {
        await db
          .update(dealComps)
          .set({ isSelected: !existing.isSelected })
          .where(eq(dealComps.id, existing.id));
      }

      return NextResponse.json({ success: true, toggled: body.toggleCompId });
    }

    // Add manual comp
    if (body.addCompId) {
      await db
        .insert(dealComps)
        .values({
          dealId,
          compId: body.addCompId,
          compType: 'direct',
          relevanceScore: body.relevanceScore || 50,
          relevanceNotes: 'Manually added',
          isSelected: true,
          addedBy: 'manual',
        })
        .onConflictDoNothing();

      return NextResponse.json({ success: true, added: body.addCompId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Comps PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update comps' }, { status: 500 });
  }
}
