import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, financialPeriods } from '@/db';
import { eq } from 'drizzle-orm';

// Industry benchmarks for PPD calculations
const BENCHMARKS = {
  SNF: {
    revenuePerPatientDay: { min: 350, median: 425, max: 550 },
    laborCostPpd: { min: 180, median: 220, max: 280 },
    foodCostPpd: { min: 15, median: 22, max: 30 },
    suppliesCostPpd: { min: 8, median: 14, max: 22 },
    utilitiesCostPpd: { min: 6, median: 10, max: 15 },
    managementFeePpd: { min: 15, median: 25, max: 40 },
    totalExpensesPpd: { min: 280, median: 350, max: 420 },
    noiPpd: { min: 30, median: 75, max: 130 },
  },
  ALF: {
    revenuePerPatientDay: { min: 200, median: 280, max: 380 },
    laborCostPpd: { min: 100, median: 140, max: 190 },
    foodCostPpd: { min: 12, median: 18, max: 25 },
    suppliesCostPpd: { min: 5, median: 10, max: 16 },
    utilitiesCostPpd: { min: 5, median: 8, max: 12 },
    managementFeePpd: { min: 12, median: 20, max: 30 },
    totalExpensesPpd: { min: 170, median: 230, max: 300 },
    noiPpd: { min: 30, median: 50, max: 80 },
  },
  ILF: {
    revenuePerPatientDay: { min: 120, median: 180, max: 260 },
    laborCostPpd: { min: 50, median: 80, max: 120 },
    foodCostPpd: { min: 10, median: 15, max: 22 },
    suppliesCostPpd: { min: 3, median: 6, max: 10 },
    utilitiesCostPpd: { min: 4, median: 7, max: 11 },
    managementFeePpd: { min: 8, median: 14, max: 22 },
    totalExpensesPpd: { min: 100, median: 150, max: 210 },
    noiPpd: { min: 20, median: 30, max: 50 },
  },
};

// GET - Calculate PPD metrics for a deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Get deal
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    const deal = dealRecords[0];
    const assetType = deal.assetType || 'SNF';
    const benchmarks = BENCHMARKS[assetType as keyof typeof BENCHMARKS] || BENCHMARKS.SNF;

    // Get facilities and financial periods
    const dealFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    const periods = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.dealId, dealId));

    // Calculate PPD for each facility
    const facilityPpd = dealFacilities.map(facility => {
      const facilityPeriods = periods.filter(p => p.facilityId === facility.id);
      const latestPeriod = facilityPeriods.sort(
        (a, b) => new Date(b.periodEnd || 0).getTime() - new Date(a.periodEnd || 0).getTime()
      )[0];

      if (!latestPeriod) {
        return {
          facilityId: facility.id,
          facilityName: facility.name,
          hasData: false,
          message: 'No financial data available',
        };
      }

      const adc = latestPeriod.averageDailyCensus
        ? Number(latestPeriod.averageDailyCensus)
        : 0;

      // Calculate days in period
      const periodStart = new Date(latestPeriod.periodStart);
      const periodEnd = new Date(latestPeriod.periodEnd);
      const daysInPeriod = Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate patient days
      const patientDays = adc * daysInPeriod;

      // Revenue PPD
      const totalRevenue = Number(latestPeriod.totalRevenue || 0);
      const revenuePpd = patientDays > 0 ? totalRevenue / patientDays : 0;

      // Expense PPDs
      const laborCost = Number(latestPeriod.laborCost || 0);
      const foodCost = Number(latestPeriod.foodCost || 0);
      const suppliesCost = Number(latestPeriod.suppliesCost || 0);
      const utilitiesCost = Number(latestPeriod.utilitiesCost || 0);
      const managementFee = Number(latestPeriod.managementFee || 0);
      const totalExpenses = Number(latestPeriod.totalExpenses || 0);
      const noi = Number(latestPeriod.noi || 0);

      const laborPpd = patientDays > 0 ? laborCost / patientDays : 0;
      const foodPpd = patientDays > 0 ? foodCost / patientDays : 0;
      const suppliesPpd = patientDays > 0 ? suppliesCost / patientDays : 0;
      const utilitiesPpd = patientDays > 0 ? utilitiesCost / patientDays : 0;
      const managementPpd = patientDays > 0 ? managementFee / patientDays : 0;
      const expensesPpd = patientDays > 0 ? totalExpenses / patientDays : 0;
      const noiPpd = patientDays > 0 ? noi / patientDays : 0;

      // Compare to benchmarks
      const compareToMedian = (value: number, benchmark: { min: number; median: number; max: number }) => {
        const variance = value - benchmark.median;
        const variancePercent = benchmark.median > 0 ? (variance / benchmark.median) * 100 : 0;
        let status: 'good' | 'warning' | 'bad' = 'good';
        if (value < benchmark.min || value > benchmark.max) {
          status = 'bad';
        } else if (Math.abs(variancePercent) > 15) {
          status = 'warning';
        }
        return {
          value: Math.round(value * 100) / 100,
          benchmark: benchmark.median,
          variance: Math.round(variance * 100) / 100,
          variancePercent: Math.round(variancePercent * 10) / 10,
          status,
        };
      };

      return {
        facilityId: facility.id,
        facilityName: facility.name,
        hasData: true,
        period: {
          start: latestPeriod.periodStart,
          end: latestPeriod.periodEnd,
          days: daysInPeriod,
        },
        census: {
          averageDailyCensus: adc,
          patientDays,
          licensedBeds: facility.licensedBeds || latestPeriod.licensedBeds,
          occupancy: Number(latestPeriod.occupancyRate || 0),
        },
        ppd: {
          revenue: compareToMedian(revenuePpd, benchmarks.revenuePerPatientDay),
          laborCost: compareToMedian(laborPpd, benchmarks.laborCostPpd),
          foodCost: compareToMedian(foodPpd, benchmarks.foodCostPpd),
          suppliesCost: compareToMedian(suppliesPpd, benchmarks.suppliesCostPpd),
          utilitiesCost: compareToMedian(utilitiesPpd, benchmarks.utilitiesCostPpd),
          managementFee: compareToMedian(managementPpd, benchmarks.managementFeePpd),
          totalExpenses: compareToMedian(expensesPpd, benchmarks.totalExpensesPpd),
          noi: compareToMedian(noiPpd, benchmarks.noiPpd),
        },
        margin: {
          operatingMargin: totalRevenue > 0 ? (noi / totalRevenue) * 100 : 0,
          laborPercent: totalRevenue > 0 ? (laborCost / totalRevenue) * 100 : 0,
        },
      };
    });

    // Calculate portfolio-level PPD
    const facilitiesWithData = facilityPpd.filter((f): f is typeof f & { hasData: true } => f.hasData);
    const totalPatientDays = facilitiesWithData.reduce(
      (sum, f) => sum + (f.census?.patientDays || 0),
      0
    );

    return NextResponse.json({
      success: true,
      data: {
        facilities: facilityPpd,
        portfolio: {
          assetType,
          totalPatientDays,
          benchmarks,
        },
      },
    });
  } catch (error) {
    console.error('Error calculating PPD:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate PPD' },
      { status: 500 }
    );
  }
}
