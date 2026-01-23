import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, financialPeriods, dealPortfolioMetrics } from '@/db';
import { eq } from 'drizzle-orm';

// GET - Get portfolio rollup for a deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    const deal = dealRecords[0];

    // Get all facilities
    const dealFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    // Get all financial periods
    const allPeriods = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.dealId, dealId));

    // Calculate aggregates for each facility
    const facilityData = dealFacilities.map(facility => {
      const facilityPeriods = allPeriods.filter(p => p.facilityId === facility.id);
      const latestPeriod = facilityPeriods.sort(
        (a, b) => new Date(b.periodEnd || 0).getTime() - new Date(a.periodEnd || 0).getTime()
      )[0];

      return {
        id: facility.id,
        name: facility.name,
        state: facility.state,
        assetType: facility.assetType,
        beds: facility.licensedBeds || 0,
        latestPeriod: latestPeriod || null,
      };
    });

    // Calculate portfolio totals
    const totalBeds = facilityData.reduce((sum, f) => sum + f.beds, 0);
    const totalRevenue = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.totalRevenue || 0),
      0
    );
    const totalExpenses = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.totalExpenses || 0),
      0
    );
    const totalNoi = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.noi || 0),
      0
    );
    const totalEbitdar = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.ebitdar || 0),
      0
    );

    // Revenue breakdown
    const medicareRevenue = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.medicareRevenue || 0),
      0
    );
    const medicaidRevenue = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.medicaidRevenue || 0),
      0
    );
    const managedCareRevenue = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.managedCareRevenue || 0),
      0
    );
    const privatePayRevenue = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.privatePayRevenue || 0),
      0
    );
    const otherRevenue = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.otherRevenue || 0),
      0
    );

    // Expense breakdown
    const laborCost = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.laborCost || 0),
      0
    );
    const foodCost = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.foodCost || 0),
      0
    );
    const suppliesCost = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.suppliesCost || 0),
      0
    );
    const utilitiesCost = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.utilitiesCost || 0),
      0
    );

    // Census metrics
    const totalAdc = facilityData.reduce(
      (sum, f) => sum + Number(f.latestPeriod?.averageDailyCensus || 0),
      0
    );
    const weightedOccupancy = totalBeds > 0 ? totalAdc / totalBeds : 0;

    // State breakdown
    const stateBreakdown: Record<string, { facilities: number; beds: number; revenue: number }> = {};
    facilityData.forEach(f => {
      const state = f.state || 'Unknown';
      if (!stateBreakdown[state]) {
        stateBreakdown[state] = { facilities: 0, beds: 0, revenue: 0 };
      }
      stateBreakdown[state].facilities += 1;
      stateBreakdown[state].beds += f.beds;
      stateBreakdown[state].revenue += Number(f.latestPeriod?.totalRevenue || 0);
    });

    // Asset type breakdown
    const assetTypeBreakdown: Record<string, { facilities: number; beds: number; revenue: number }> = {};
    facilityData.forEach(f => {
      const assetType = f.assetType || 'SNF';
      if (!assetTypeBreakdown[assetType]) {
        assetTypeBreakdown[assetType] = { facilities: 0, beds: 0, revenue: 0 };
      }
      assetTypeBreakdown[assetType].facilities += 1;
      assetTypeBreakdown[assetType].beds += f.beds;
      assetTypeBreakdown[assetType].revenue += Number(f.latestPeriod?.totalRevenue || 0);
    });

    const rollup = {
      deal: {
        id: deal.id,
        name: deal.name,
        status: deal.status,
        assetType: deal.assetType,
        dealStructure: deal.dealStructure,
      },
      portfolio: {
        totalFacilities: dealFacilities.length,
        totalBeds,
        averageDailyCensus: totalAdc,
        weightedOccupancy: weightedOccupancy * 100,
      },
      financials: {
        revenue: {
          total: totalRevenue,
          byPayerMix: {
            medicare: { amount: medicareRevenue, percent: totalRevenue > 0 ? (medicareRevenue / totalRevenue) * 100 : 0 },
            medicaid: { amount: medicaidRevenue, percent: totalRevenue > 0 ? (medicaidRevenue / totalRevenue) * 100 : 0 },
            managedCare: { amount: managedCareRevenue, percent: totalRevenue > 0 ? (managedCareRevenue / totalRevenue) * 100 : 0 },
            privatePay: { amount: privatePayRevenue, percent: totalRevenue > 0 ? (privatePayRevenue / totalRevenue) * 100 : 0 },
            other: { amount: otherRevenue, percent: totalRevenue > 0 ? (otherRevenue / totalRevenue) * 100 : 0 },
          },
          perBed: totalBeds > 0 ? totalRevenue / totalBeds : 0,
        },
        expenses: {
          total: totalExpenses,
          breakdown: {
            labor: { amount: laborCost, percent: totalExpenses > 0 ? (laborCost / totalExpenses) * 100 : 0 },
            food: { amount: foodCost, percent: totalExpenses > 0 ? (foodCost / totalExpenses) * 100 : 0 },
            supplies: { amount: suppliesCost, percent: totalExpenses > 0 ? (suppliesCost / totalExpenses) * 100 : 0 },
            utilities: { amount: utilitiesCost, percent: totalExpenses > 0 ? (utilitiesCost / totalExpenses) * 100 : 0 },
          },
          percentOfRevenue: totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0,
        },
        profitability: {
          noi: totalNoi,
          noiMargin: totalRevenue > 0 ? (totalNoi / totalRevenue) * 100 : 0,
          ebitdar: totalEbitdar,
          ebitdarMargin: totalRevenue > 0 ? (totalEbitdar / totalRevenue) * 100 : 0,
          noiPerBed: totalBeds > 0 ? totalNoi / totalBeds : 0,
        },
      },
      breakdown: {
        byState: stateBreakdown,
        byAssetType: assetTypeBreakdown,
      },
      facilities: facilityData.map(f => ({
        id: f.id,
        name: f.name,
        state: f.state,
        assetType: f.assetType,
        beds: f.beds,
        revenue: Number(f.latestPeriod?.totalRevenue || 0),
        expenses: Number(f.latestPeriod?.totalExpenses || 0),
        noi: Number(f.latestPeriod?.noi || 0),
        margin: Number(f.latestPeriod?.totalRevenue || 0) > 0
          ? (Number(f.latestPeriod?.noi || 0) / Number(f.latestPeriod?.totalRevenue || 0)) * 100
          : 0,
        adc: Number(f.latestPeriod?.averageDailyCensus || 0),
        occupancy: Number(f.latestPeriod?.occupancyRate || 0) * 100,
      })),
    };

    // Update or create portfolio metrics
    const existingMetrics = await db
      .select()
      .from(dealPortfolioMetrics)
      .where(eq(dealPortfolioMetrics.dealId, dealId));

    const metricsData = {
      dealId,
      totalBeds,
      totalFacilities: dealFacilities.length,
      snfCount: assetTypeBreakdown['SNF']?.facilities || 0,
      alfCount: assetTypeBreakdown['ALF']?.facilities || 0,
      ilfCount: assetTypeBreakdown['ILF']?.facilities || 0,
      portfolioRevenue: totalRevenue.toString(),
      portfolioExpenses: totalExpenses.toString(),
      portfolioNoi: totalNoi.toString(),
      weightedOccupancy: weightedOccupancy.toString(),
      stateBreakdown,
      assetTypeBreakdown,
      calculatedAt: new Date(),
      updatedAt: new Date(),
    };

    if (existingMetrics.length > 0) {
      await db
        .update(dealPortfolioMetrics)
        .set(metricsData)
        .where(eq(dealPortfolioMetrics.dealId, dealId));
    } else {
      await db.insert(dealPortfolioMetrics).values(metricsData);
    }

    return NextResponse.json({
      success: true,
      data: rollup,
    });
  } catch (error) {
    console.error('Error calculating portfolio rollup:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate portfolio rollup' },
      { status: 500 }
    );
  }
}
