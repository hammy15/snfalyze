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

    // Store results in stage data
    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: {
          transactionComps: result.transactionComps.map(c => ({
            compId: c.id,
            propertyName: c.propertyName,
            city: c.city,
            state: c.state,
            beds: c.beds,
            saleDate: c.saleDate,
            salePrice: c.salePrice,
            pricePerBed: c.pricePerBed,
            capRate: c.capRate,
            relevanceScore: c.relevanceScore,
            isSelected: c.relevanceScore >= 70,
          })),
          operatingBenchmarks: result.operatingBenchmarks,
          marketBenchmarkSummary: result.marketBenchmarkSummary,
        },
        completionScore: result.transactionComps.length > 0 ? 80 : 10,
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
      ...result,
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
