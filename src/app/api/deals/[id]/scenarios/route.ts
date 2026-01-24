import { NextRequest, NextResponse } from 'next/server';
import { db, proformaScenarios, proformaScenarioAssumptions, facilities } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Fetch all scenarios for this deal
    const scenarios = await db.query.proformaScenarios.findMany({
      where: eq(proformaScenarios.dealId, dealId),
      orderBy: (scenarios, { asc }) => [asc(scenarios.createdAt)],
    });

    // If no scenarios exist, create a default baseline scenario based on deal facilities
    if (scenarios.length === 0) {
      // Get facilities for this deal
      const dealFacilitiesData = await db.query.facilities.findMany({
        where: eq(facilities.dealId, dealId),
      });

      // Generate sample scenarios for comparison demo
      const sampleScenarios = generateSampleScenarios(dealId, dealFacilitiesData);

      return NextResponse.json({
        success: true,
        data: sampleScenarios,
      });
    }

    // Fetch assumptions for each scenario
    const scenariosWithAssumptions = await Promise.all(
      scenarios.map(async (scenario) => {
        const assumptions = await db.query.proformaScenarioAssumptions.findMany({
          where: eq(proformaScenarioAssumptions.scenarioId, scenario.id),
        });

        // Convert assumptions array to object
        const assumptionsObj = assumptions.reduce((acc, a) => {
          acc[a.assumptionKey] = Number(a.assumptionValue) || 0;
          return acc;
        }, {} as Record<string, number>);

        // Generate projections based on assumptions
        const projections = generateProjections(scenario, assumptionsObj);

        return {
          id: scenario.id,
          name: scenario.name,
          type: scenario.scenarioType || 'baseline',
          assumptions: {
            revenueGrowth: assumptionsObj['revenue_growth_rate'] || 0.03,
            expenseGrowth: assumptionsObj['expense_growth_rate'] || 0.025,
            occupancyTarget: assumptionsObj['occupancy_target'] || 0.90,
            rentEscalation: assumptionsObj['rent_escalation'] || 0.02,
          },
          projections,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: scenariosWithAssumptions,
    });
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch scenarios' },
      { status: 500 }
    );
  }
}

// Generate sample scenarios for demonstration
function generateSampleScenarios(dealId: string, dealFacilities: any[]) {
  const baseRevenue = dealFacilities.reduce((sum, facility) => {
    return sum + (facility.licensedBeds || 100) * 365 * 0.85 * 280;
  }, 0);

  const baseExpenses = baseRevenue * 0.82;
  const baseRent = baseRevenue * 0.08;
  const baseEbitdar = baseRevenue - baseExpenses;
  const baseEbitda = baseEbitdar - baseRent;

  const scenarios = [
    {
      id: `${dealId}-baseline`,
      name: 'Base Case',
      type: 'baseline' as const,
      assumptions: {
        revenueGrowth: 0.03,
        expenseGrowth: 0.025,
        occupancyTarget: 0.88,
        rentEscalation: 0.02,
      },
    },
    {
      id: `${dealId}-upside`,
      name: 'Upside Case',
      type: 'upside' as const,
      assumptions: {
        revenueGrowth: 0.05,
        expenseGrowth: 0.02,
        occupancyTarget: 0.92,
        rentEscalation: 0.02,
      },
    },
    {
      id: `${dealId}-downside`,
      name: 'Downside Case',
      type: 'downside' as const,
      assumptions: {
        revenueGrowth: 0.015,
        expenseGrowth: 0.035,
        occupancyTarget: 0.82,
        rentEscalation: 0.02,
      },
    },
  ];

  return scenarios.map((scenario) => ({
    ...scenario,
    projections: generateProjectionsFromBase(
      baseRevenue,
      baseExpenses,
      baseRent,
      scenario.assumptions
    ),
  }));
}

function generateProjections(scenario: any, assumptions: Record<string, number>) {
  const baseData = scenario.data || {};
  const baseRevenue = baseData.revenue || 10000000;
  const baseExpenses = baseData.expenses || 8200000;
  const baseRent = baseData.rent || 800000;

  return generateProjectionsFromBase(baseRevenue, baseExpenses, baseRent, {
    revenueGrowth: assumptions['revenue_growth_rate'] || 0.03,
    expenseGrowth: assumptions['expense_growth_rate'] || 0.025,
    occupancyTarget: assumptions['occupancy_target'] || 0.90,
    rentEscalation: assumptions['rent_escalation'] || 0.02,
  });
}

function generateProjectionsFromBase(
  baseRevenue: number,
  baseExpenses: number,
  baseRent: number,
  assumptions: {
    revenueGrowth: number;
    expenseGrowth: number;
    occupancyTarget: number;
    rentEscalation: number;
  }
) {
  const projections = [];
  const currentYear = new Date().getFullYear();

  for (let i = 0; i < 5; i++) {
    const revenueGrowthFactor = Math.pow(1 + assumptions.revenueGrowth, i);
    const expenseGrowthFactor = Math.pow(1 + assumptions.expenseGrowth, i);
    const rentGrowthFactor = Math.pow(1 + assumptions.rentEscalation, i);

    // Occupancy ramp from 85% to target over 3 years
    const occupancy = i === 0
      ? 0.85
      : Math.min(
          0.85 + (assumptions.occupancyTarget - 0.85) * (i / 3),
          assumptions.occupancyTarget
        );

    const occupancyFactor = occupancy / 0.85;

    const revenue = baseRevenue * revenueGrowthFactor * occupancyFactor;
    const expenses = baseExpenses * expenseGrowthFactor * occupancyFactor * 0.98; // Slight efficiency gain
    const rent = baseRent * rentGrowthFactor;
    const ebitdar = revenue - expenses;
    const ebitda = ebitdar - rent;
    const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;

    projections.push({
      year: currentYear + i,
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      ebitdar: Math.round(ebitdar),
      rent: Math.round(rent),
      ebitda: Math.round(ebitda),
      ebitdaMargin,
      occupancy,
    });
  }

  return projections;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();

    // Create new scenario
    const [newScenario] = await db
      .insert(proformaScenarios)
      .values({
        dealId,
        name: body.name,
        scenarioType: body.type || 'custom',
        description: body.description,
        projectionYears: body.projectionYears || 5,
        revenueGrowthRate: body.assumptions?.revenueGrowth?.toString(),
        expenseGrowthRate: body.assumptions?.expenseGrowth?.toString(),
        targetOccupancy: body.assumptions?.occupancyTarget?.toString(),
        isBaseCase: body.isBaseCase || false,
      })
      .returning();

    // Insert assumptions
    if (body.assumptions) {
      const assumptionEntries = Object.entries(body.assumptions).map(([key, value]) => ({
        scenarioId: newScenario.id,
        assumptionKey: key,
        assumptionValue: String(value),
      }));

      if (assumptionEntries.length > 0) {
        await db.insert(proformaScenarioAssumptions).values(assumptionEntries);
      }
    }

    return NextResponse.json({
      success: true,
      data: newScenario,
    });
  } catch (error) {
    console.error('Error creating scenario:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create scenario' },
      { status: 500 }
    );
  }
}
