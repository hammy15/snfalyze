import { NextRequest, NextResponse } from 'next/server';
import {
  db,
  deals,
  facilities,
  financialPeriods,
  dealCoaMappings,
  proformaScenarios,
} from '@/db';
import { eq, and } from 'drizzle-orm';

// GET - Get proforma preview from mapped COA items
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const facilityId = searchParams.get('facilityId');

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    const deal = dealRecords[0];

    // Get COA mappings
    const mappingsQuery = facilityId
      ? and(eq(dealCoaMappings.dealId, dealId), eq(dealCoaMappings.facilityId, facilityId))
      : eq(dealCoaMappings.dealId, dealId);

    const mappings = await db
      .select()
      .from(dealCoaMappings)
      .where(mappingsQuery);

    // Group mappings by proforma destination
    const proformaStructure: Record<string, {
      items: Array<{
        id: string;
        sourceLabel: string;
        sourceValue: number;
        coaCode: string | null;
        coaName: string | null;
        isMapped: boolean;
      }>;
      total: number;
    }> = {};

    const unmappedItems: Array<{
      id: string;
      sourceLabel: string;
      sourceValue: number;
    }> = [];

    mappings.forEach(mapping => {
      const value = Number(mapping.sourceValue || 0);

      if (!mapping.isMapped || !mapping.proformaDestination) {
        unmappedItems.push({
          id: mapping.id,
          sourceLabel: mapping.sourceLabel,
          sourceValue: value,
        });
        return;
      }

      const destination = mapping.proformaDestination;
      if (!proformaStructure[destination]) {
        proformaStructure[destination] = { items: [], total: 0 };
      }

      proformaStructure[destination].items.push({
        id: mapping.id,
        sourceLabel: mapping.sourceLabel,
        sourceValue: value,
        coaCode: mapping.coaCode,
        coaName: mapping.coaName,
        isMapped: mapping.isMapped || false,
      });
      proformaStructure[destination].total += value;
    });

    // Standard proforma categories
    const standardCategories = [
      { key: 'revenue.medicare', label: 'Medicare Revenue' },
      { key: 'revenue.medicaid', label: 'Medicaid Revenue' },
      { key: 'revenue.managed_care', label: 'Managed Care Revenue' },
      { key: 'revenue.private_pay', label: 'Private Pay Revenue' },
      { key: 'revenue.other', label: 'Other Revenue' },
      { key: 'expenses.labor.nursing', label: 'Nursing Labor' },
      { key: 'expenses.labor.dietary', label: 'Dietary Labor' },
      { key: 'expenses.labor.housekeeping', label: 'Housekeeping Labor' },
      { key: 'expenses.labor.admin', label: 'Administrative Labor' },
      { key: 'expenses.labor.agency', label: 'Agency/Contract Labor' },
      { key: 'expenses.operations.food', label: 'Food Costs' },
      { key: 'expenses.operations.supplies', label: 'Medical Supplies' },
      { key: 'expenses.operations.utilities', label: 'Utilities' },
      { key: 'expenses.operations.insurance', label: 'Insurance' },
      { key: 'expenses.operations.management', label: 'Management Fee' },
      { key: 'expenses.operations.other', label: 'Other Operating Expenses' },
    ];

    // Build preview with mapped and unmapped items
    const preview = {
      categories: standardCategories.map(cat => ({
        key: cat.key,
        label: cat.label,
        mapped: proformaStructure[cat.key] || { items: [], total: 0 },
        isRevenue: cat.key.startsWith('revenue.'),
      })),
      unmapped: unmappedItems,
      summary: {
        totalMapped: mappings.filter(m => m.isMapped).length,
        totalUnmapped: unmappedItems.length,
        mappedValue: mappings
          .filter(m => m.isMapped)
          .reduce((sum, m) => sum + Number(m.sourceValue || 0), 0),
        unmappedValue: unmappedItems.reduce((sum, item) => sum + item.sourceValue, 0),
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        deal: {
          id: deal.id,
          name: deal.name,
        },
        preview,
      },
    });
  } catch (error) {
    console.error('Error generating proforma preview:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate proforma preview' },
      { status: 500 }
    );
  }
}

// POST - Generate full proforma
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();
    const {
      scenarioName = 'Baseline',
      scenarioType = 'baseline',
      projectionYears = 5,
      revenueGrowthRate = 0.025,
      expenseGrowthRate = 0.03,
      targetOccupancy,
    } = body;

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    const deal = dealRecords[0];

    // Get facilities and their financial data
    const dealFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    const periods = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.dealId, dealId));

    // Get mapped COA items
    const mappings = await db
      .select()
      .from(dealCoaMappings)
      .where(and(eq(dealCoaMappings.dealId, dealId), eq(dealCoaMappings.isMapped, true)));

    // Calculate base year financials
    const baseFinancials = dealFacilities.map(facility => {
      const facilityPeriods = periods.filter(p => p.facilityId === facility.id);
      const latestPeriod = facilityPeriods.sort(
        (a, b) => new Date(b.periodEnd || 0).getTime() - new Date(a.periodEnd || 0).getTime()
      )[0];

      const facilityMappings = mappings.filter(m => m.facilityId === facility.id);

      return {
        facilityId: facility.id,
        facilityName: facility.name,
        beds: facility.licensedBeds || 0,
        baseRevenue: Number(latestPeriod?.totalRevenue || 0),
        baseExpenses: Number(latestPeriod?.totalExpenses || 0),
        baseNoi: Number(latestPeriod?.noi || 0),
        baseOccupancy: Number(latestPeriod?.occupancyRate || 0),
        mappedLineItems: facilityMappings.length,
      };
    });

    // Generate projection years
    const projections = [];
    const baseYear = new Date().getFullYear();

    for (let year = 0; year <= projectionYears; year++) {
      const yearData = {
        year: baseYear + year,
        isBaseYear: year === 0,
        facilities: baseFinancials.map(facility => {
          const growthFactor = Math.pow(1 + revenueGrowthRate, year);
          const expenseGrowthFactor = Math.pow(1 + expenseGrowthRate, year);

          const revenue = facility.baseRevenue * growthFactor;
          const expenses = facility.baseExpenses * expenseGrowthFactor;
          const noi = revenue - expenses;

          return {
            facilityId: facility.facilityId,
            facilityName: facility.facilityName,
            revenue,
            expenses,
            noi,
            margin: revenue > 0 ? (noi / revenue) * 100 : 0,
          };
        }),
        portfolio: {
          revenue: 0,
          expenses: 0,
          noi: 0,
          margin: 0,
        },
      };

      // Calculate portfolio totals
      yearData.portfolio.revenue = yearData.facilities.reduce((sum, f) => sum + f.revenue, 0);
      yearData.portfolio.expenses = yearData.facilities.reduce((sum, f) => sum + f.expenses, 0);
      yearData.portfolio.noi = yearData.facilities.reduce((sum, f) => sum + f.noi, 0);
      yearData.portfolio.margin =
        yearData.portfolio.revenue > 0
          ? (yearData.portfolio.noi / yearData.portfolio.revenue) * 100
          : 0;

      projections.push(yearData);
    }

    // Save proforma scenario
    const [scenario] = await db
      .insert(proformaScenarios)
      .values({
        dealId,
        name: scenarioName,
        scenarioType: scenarioType as 'baseline' | 'upside' | 'downside' | 'custom',
        projectionYears,
        revenueGrowthRate: revenueGrowthRate.toString(),
        expenseGrowthRate: expenseGrowthRate.toString(),
        targetOccupancy: targetOccupancy?.toString() || null,
        assumptions: {
          revenueGrowthRate,
          expenseGrowthRate,
          targetOccupancy,
        },
        data: {
          projections,
          baseFinancials,
          generatedAt: new Date().toISOString(),
        },
        isBaseCase: scenarioType === 'baseline',
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        scenario,
        projections,
        summary: {
          baseYear,
          projectionYears,
          assumptions: {
            revenueGrowthRate: revenueGrowthRate * 100,
            expenseGrowthRate: expenseGrowthRate * 100,
            targetOccupancy: targetOccupancy ? targetOccupancy * 100 : null,
          },
          yearOne: projections[1]?.portfolio || null,
          yearFive: projections[5]?.portfolio || null,
        },
      },
    });
  } catch (error) {
    console.error('Error generating proforma:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate proforma' },
      { status: 500 }
    );
  }
}
