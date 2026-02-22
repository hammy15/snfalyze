import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dealWorkspaceStages, proformaScenarios } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateProForma, type ProFormaResult } from '@/lib/workspace/proforma-generator';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Deep merge utility
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// ── GET: Load pro forma state ───────────────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const [stage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    // Also load persisted scenarios
    const scenarios = await db
      .select()
      .from(proformaScenarios)
      .where(eq(proformaScenarios.dealId, dealId));

    return NextResponse.json({
      success: true,
      stageData: stage?.stageData || {},
      scenarios,
    });
  } catch (error) {
    console.error('ProForma GET error:', error);
    return NextResponse.json({ error: 'Failed to load pro forma' }, { status: 500 });
  }
}

// ── POST: Generate pro forma from deal data ─────────────────────────
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const result = await generateProForma({ dealId });

    // Transform generator output → UI-expected shape
    const transformed = transformForUI(result, dealId);

    // Store transformed result in stage data
    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: transformed as unknown as Record<string, unknown>,
        completionScore: 75,
        status: 'in_progress',
        startedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    return NextResponse.json({ success: true, ...transformed });
  } catch (error) {
    console.error('ProForma POST error:', error);
    return NextResponse.json({ error: 'Failed to generate pro forma' }, { status: 500 });
  }
}

// ── PATCH: Update pro forma assumptions/overrides ───────────────────
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
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    if (!currentStage) {
      return NextResponse.json({ error: 'Pro forma not initialized' }, { status: 404 });
    }

    const currentData = (currentStage.stageData || {}) as Record<string, unknown>;
    const merged = deepMerge(currentData, body);

    // Update scenario if specific scenario update requested
    if (body.updateScenario) {
      const { scenarioType, assumptions } = body.updateScenario;
      await db
        .update(proformaScenarios)
        .set({
          assumptions,
          revenueGrowthRate: String(assumptions.revenueGrowthRate),
          expenseGrowthRate: String(assumptions.expenseGrowthRate),
          targetOccupancy: String(assumptions.occupancyTarget),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(proformaScenarios.dealId, dealId),
            eq(proformaScenarios.scenarioType, scenarioType)
          )
        );
    }

    await db
      .update(dealWorkspaceStages)
      .set({
        stageData: merged,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(dealWorkspaceStages.dealId, dealId),
          eq(dealWorkspaceStages.stage, 'pro_forma')
        )
      );

    return NextResponse.json({ success: true, stageData: merged });
  } catch (error) {
    console.error('ProForma PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update pro forma' }, { status: 500 });
  }
}

// ── Transform generator output → UI shape ────────────────────────────

function transformForUI(result: ProFormaResult, _dealId: string) {
  const { revenueModel, expenseModel, scenarios, valuationOutput } = result;

  // Transform revenue model → censusProjections + enhancementOpportunities
  const censusProjections = revenueModel.projections.map(p => {
    const totalAdc = p.adc;
    const medicarePct = revenueModel.payerMixRevenue.medicare.adc / (revenueModel.payerMixRevenue.medicare.adc + revenueModel.payerMixRevenue.medicaid.adc + revenueModel.payerMixRevenue.privatePay.adc);
    const medicaidPct = revenueModel.payerMixRevenue.medicaid.adc / (revenueModel.payerMixRevenue.medicare.adc + revenueModel.payerMixRevenue.medicaid.adc + revenueModel.payerMixRevenue.privatePay.adc);
    return {
      year: p.year,
      occupancy: p.occupancy / 100,
      adc: p.adc,
      medicareAdc: Math.round(totalAdc * medicarePct),
      medicaidAdc: Math.round(totalAdc * medicaidPct),
      privatPayAdc: Math.round(totalAdc * (1 - medicarePct - medicaidPct)),
    };
  });

  const enhancementOpportunities = revenueModel.enhancements.map(e =>
    `${e.description} (+$${Math.round(e.annualImpact / 1000)}K/yr, ${e.timeline}, ${e.confidence} confidence)`
  );

  // Transform expense model → otherOpex
  const otherOpex = expenseModel.categories.map(c => ({
    category: c.name,
    benchmarkPercent: { low: c.benchmark ? c.benchmark - 1 : c.percentOfRevenue - 1, high: c.benchmark ? c.benchmark + 1 : c.percentOfRevenue + 1 },
    projectedAmount: Math.round(c.amount),
  }));

  // Transform scenarios → ScenarioResult shape
  const transformScenario = (s: typeof scenarios.base) => {
    const baseOcc = censusProjections[0]?.occupancy || 0.82;
    return {
      label: s.name,
      assumptions: {
        occupancyChange: s.assumptions.occupancyTarget - baseOcc,
        cmiChange: s.type === 'upside' ? 0.15 : s.type === 'downside' ? -0.05 : 0.05,
        medicaidRateChange: s.assumptions.revenueGrowthRate - 0.01,
        laborCostChange: s.assumptions.expenseGrowthRate,
      },
      year3Ebitda: s.yearlyProjections[2]?.ebitda || 0,
      year5Ebitda: s.yearlyProjections[4]?.ebitda || 0,
      impliedValue: Math.round((s.yearlyProjections[4]?.noi || 0) / s.assumptions.exitCapRate),
      irr: s.irr,
    };
  };

  // Transform valuation output
  const transformedValuation = {
    askingPrice: null as number | null,
    capRateValuation: valuationOutput.capRateValue,
    ebitdaMultipleValuation: valuationOutput.ebitdaMultipleValue,
    dcfValuation: valuationOutput.dcfValue,
    pricePerBed: valuationOutput.pricePerBed,
    cilAssessment: valuationOutput.impliedCapRate
      ? (valuationOutput.impliedCapRate > 0.14 ? 'PRICED_BELOW' : valuationOutput.impliedCapRate < 0.10 ? 'ABOVE' : 'AT')
      : 'AT' as 'PRICED_BELOW' | 'AT' | 'ABOVE',
    negotiationRange: valuationOutput.negotiationRange
      ? { low: valuationOutput.negotiationRange.low, high: valuationOutput.negotiationRange.high }
      : null,
  };

  return {
    revenueModel: {
      currentRevenue: revenueModel.currentRevenue,
      censusProjections,
      payerMixRevenue: revenueModel.payerMixRevenue,
      enhancementOpportunities,
    },
    expenseModel: {
      totalExpenses: expenseModel.totalExpenses,
      laborCost: expenseModel.laborCost,
      laborPercent: expenseModel.laborPercent,
      agencySpend: expenseModel.agencySpend,
      otherOpex,
    },
    scenarios: {
      base: transformScenario(scenarios.base),
      bull: transformScenario(scenarios.bull),
      bear: transformScenario(scenarios.bear),
    },
    valuationOutput: transformedValuation,
    sensitivityMatrix: scenarios.sensitivityMatrix,
    yearlyProjections: scenarios.base.yearlyProjections,
  };
}
