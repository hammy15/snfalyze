import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { financialPeriods, facilities } from '@/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: facilityId } = await params;
    const { searchParams } = new URL(request.url);
    const months = parseInt(searchParams.get('months') || '12');

    // Get facility info
    const [facility] = await db
      .select()
      .from(facilities)
      .where(eq(facilities.id, facilityId))
      .limit(1);

    if (!facility) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    // Get financial periods for this facility
    const periods = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.facilityId, facilityId))
      .orderBy(desc(financialPeriods.periodEnd))
      .limit(months);

    if (periods.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          facilityId,
          facilityName: facility.name,
          periods: [],
          plLineItems: [],
          totalPatientDays: 0,
          periodStart: null,
          periodEnd: null,
        },
      });
    }

    // Calculate totals across all periods
    const totals = periods.reduce(
      (acc, p) => {
        acc.totalRevenue += parseFloat(p.totalRevenue?.toString() || '0');
        acc.medicareRevenue += parseFloat(p.medicareRevenue?.toString() || '0');
        acc.medicaidRevenue += parseFloat(p.medicaidRevenue?.toString() || '0');
        acc.managedCareRevenue += parseFloat(p.managedCareRevenue?.toString() || '0');
        acc.privatePayRevenue += parseFloat(p.privatePayRevenue?.toString() || '0');
        acc.otherRevenue += parseFloat(p.otherRevenue?.toString() || '0');
        acc.totalExpenses += parseFloat(p.totalExpenses?.toString() || '0');
        acc.laborCost += parseFloat(p.laborCost?.toString() || '0');
        acc.coreLabor += parseFloat(p.coreLabor?.toString() || '0');
        acc.agencyLabor += parseFloat(p.agencyLabor?.toString() || '0');
        acc.foodCost += parseFloat(p.foodCost?.toString() || '0');
        acc.suppliesCost += parseFloat(p.suppliesCost?.toString() || '0');
        acc.utilitiesCost += parseFloat(p.utilitiesCost?.toString() || '0');
        acc.insuranceCost += parseFloat(p.insuranceCost?.toString() || '0');
        acc.managementFee += parseFloat(p.managementFee?.toString() || '0');
        acc.otherExpenses += parseFloat(p.otherExpenses?.toString() || '0');
        acc.noi += parseFloat(p.noi?.toString() || '0');
        acc.ebitdar += parseFloat(p.ebitdar?.toString() || '0');
        acc.patientDays +=
          (parseFloat(p.averageDailyCensus?.toString() || '0') *
            getDaysInPeriod(p.periodStart, p.periodEnd));
        return acc;
      },
      {
        totalRevenue: 0,
        medicareRevenue: 0,
        medicaidRevenue: 0,
        managedCareRevenue: 0,
        privatePayRevenue: 0,
        otherRevenue: 0,
        totalExpenses: 0,
        laborCost: 0,
        coreLabor: 0,
        agencyLabor: 0,
        foodCost: 0,
        suppliesCost: 0,
        utilitiesCost: 0,
        insuranceCost: 0,
        managementFee: 0,
        otherExpenses: 0,
        noi: 0,
        ebitdar: 0,
        patientDays: 0,
      }
    );

    const totalDays = totals.patientDays || 1; // Avoid division by zero

    // Convert to PLLineItem format for the Income Statement component
    // COA codes must match DEFAULT_COA_STRUCTURE in income-statement.tsx
    const plLineItems = [
      // Revenue section (codes: 4100, 4200, 4300, 4400, subtotal 4000)
      {
        coaCode: '4100',
        label: 'Room & Board',
        category: 'revenue',
        actual: totals.medicareRevenue + totals.medicaidRevenue + totals.managedCareRevenue + totals.privatePayRevenue,
        ppd: (totals.medicareRevenue + totals.medicaidRevenue + totals.managedCareRevenue + totals.privatePayRevenue) / totalDays,
      },
      {
        coaCode: '4200',
        label: 'Ancillary Revenue',
        category: 'revenue',
        actual: totals.otherRevenue * 0.6, // Assume 60% of other is ancillary
        ppd: (totals.otherRevenue * 0.6) / totalDays,
      },
      {
        coaCode: '4300',
        label: 'Therapy Revenue',
        category: 'revenue',
        actual: totals.otherRevenue * 0.4, // Assume 40% of other is therapy
        ppd: (totals.otherRevenue * 0.4) / totalDays,
      },
      {
        coaCode: '4400',
        label: 'Other Revenue',
        category: 'revenue',
        actual: 0,
        ppd: 0,
      },
      // Nursing Expenses (codes: 5110, 5120, 5130, 5140, subtotal 5100)
      {
        coaCode: '5110',
        label: 'Salaries & Wages',
        category: 'expense',
        subcategory: 'nursing',
        actual: totals.coreLabor,
        ppd: totals.coreLabor / totalDays,
      },
      {
        coaCode: '5120',
        label: 'Employee Benefits',
        category: 'expense',
        subcategory: 'nursing',
        actual: totals.laborCost * 0.2, // Estimate benefits as 20% of labor
        ppd: (totals.laborCost * 0.2) / totalDays,
      },
      {
        coaCode: '5130',
        label: 'Contract Labor',
        category: 'expense',
        subcategory: 'nursing',
        actual: totals.agencyLabor,
        ppd: totals.agencyLabor / totalDays,
      },
      {
        coaCode: '5140',
        label: 'Supplies',
        category: 'expense',
        subcategory: 'nursing',
        actual: totals.suppliesCost,
        ppd: totals.suppliesCost / totalDays,
      },
      // Dietary Expenses (codes: 5210, 5220, subtotal 5200)
      {
        coaCode: '5210',
        label: 'Dietary Wages',
        category: 'expense',
        subcategory: 'dietary',
        actual: totals.foodCost * 0.5,
        ppd: (totals.foodCost * 0.5) / totalDays,
      },
      {
        coaCode: '5220',
        label: 'Food & Supplies',
        category: 'expense',
        subcategory: 'dietary',
        actual: totals.foodCost * 0.5,
        ppd: (totals.foodCost * 0.5) / totalDays,
      },
      // Plant & Utilities (codes: 5310, 5320, 5330, subtotal 5300)
      {
        coaCode: '5310',
        label: 'Utilities',
        category: 'expense',
        subcategory: 'plant',
        actual: totals.utilitiesCost,
        ppd: totals.utilitiesCost / totalDays,
      },
      {
        coaCode: '5320',
        label: 'Maintenance & Repairs',
        category: 'expense',
        subcategory: 'plant',
        actual: totals.otherExpenses * 0.3,
        ppd: (totals.otherExpenses * 0.3) / totalDays,
      },
      {
        coaCode: '5330',
        label: 'Housekeeping',
        category: 'expense',
        subcategory: 'plant',
        actual: totals.otherExpenses * 0.2,
        ppd: (totals.otherExpenses * 0.2) / totalDays,
      },
      // Administrative (codes: 5410, 5420, 5430, 5440, subtotal 5400)
      {
        coaCode: '5410',
        label: 'Admin Salaries',
        category: 'expense',
        subcategory: 'admin',
        actual: totals.managementFee * 0.5,
        ppd: (totals.managementFee * 0.5) / totalDays,
      },
      {
        coaCode: '5420',
        label: 'Insurance',
        category: 'expense',
        subcategory: 'admin',
        actual: totals.insuranceCost,
        ppd: totals.insuranceCost / totalDays,
      },
      {
        coaCode: '5430',
        label: 'Professional Fees',
        category: 'expense',
        subcategory: 'admin',
        actual: totals.otherExpenses * 0.2,
        ppd: (totals.otherExpenses * 0.2) / totalDays,
      },
      {
        coaCode: '5440',
        label: 'Other G&A',
        category: 'expense',
        subcategory: 'admin',
        actual: totals.otherExpenses * 0.1,
        ppd: (totals.otherExpenses * 0.1) / totalDays,
      },
      // Other Operating (codes: 5510, 5520, 5530, subtotal 5500)
      {
        coaCode: '5510',
        label: 'Property Tax',
        category: 'expense',
        subcategory: 'other',
        actual: totals.otherExpenses * 0.15,
        ppd: (totals.otherExpenses * 0.15) / totalDays,
      },
      {
        coaCode: '5520',
        label: 'Management Fee',
        category: 'expense',
        subcategory: 'other',
        actual: totals.managementFee,
        ppd: totals.managementFee / totalDays,
      },
      {
        coaCode: '5530',
        label: 'Other Operating',
        category: 'expense',
        subcategory: 'other',
        actual: totals.otherExpenses * 0.05,
        ppd: (totals.otherExpenses * 0.05) / totalDays,
      },
      // Totals
      {
        coaCode: '5999',
        label: 'TOTAL OPERATING EXPENSES',
        category: 'subtotal',
        actual: totals.totalExpenses,
        ppd: totals.totalExpenses / totalDays,
      },
      {
        coaCode: '6000',
        label: 'EBITDAR',
        category: 'total',
        actual: totals.ebitdar,
        ppd: totals.ebitdar / totalDays,
        isHighlighted: true,
        margin: (totals.ebitdar / totals.totalRevenue) * 100,
      },
      {
        coaCode: '6100',
        label: 'Rent/Lease',
        category: 'expense',
        actual: 0, // Would come from SLB data
        ppd: 0,
      },
      {
        coaCode: '6999',
        label: 'EBITDA',
        category: 'total',
        actual: totals.ebitdar, // Same as EBITDAR since no rent
        ppd: totals.ebitdar / totalDays,
        isHighlighted: true,
        margin: (totals.ebitdar / totals.totalRevenue) * 100,
      },
    ];

    // Get date range
    const periodEnd = periods[0]?.periodEnd;
    const periodStart = periods[periods.length - 1]?.periodStart;

    return NextResponse.json({
      success: true,
      data: {
        facilityId,
        facilityName: facility.name,
        periods: periods.map((p) => ({
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          totalRevenue: parseFloat(p.totalRevenue?.toString() || '0'),
          totalExpenses: parseFloat(p.totalExpenses?.toString() || '0'),
          ebitdar: parseFloat(p.ebitdar?.toString() || '0'),
          occupancyRate: parseFloat(p.occupancyRate?.toString() || '0'),
        })),
        plLineItems,
        totals,
        totalPatientDays: totalDays,
        periodStart,
        periodEnd,
      },
    });
  } catch (error) {
    console.error('Error fetching facility financial data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch financial data' },
      { status: 500 }
    );
  }
}

function getDaysInPeriod(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}
