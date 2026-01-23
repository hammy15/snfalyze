import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, financialPeriods, dealCoaMappings } from '@/db';
import { eq, and, desc } from 'drizzle-orm';

// GET - Get P&L for a specific facility
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fid: string }> }
) {
  try {
    const { id: dealId, fid: facilityId } = await params;

    // Verify deal and facility exist
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    const facilityRecords = await db
      .select()
      .from(facilities)
      .where(and(eq(facilities.id, facilityId), eq(facilities.dealId, dealId)));

    if (facilityRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Facility not found' },
        { status: 404 }
      );
    }

    const facility = facilityRecords[0];

    // Get all financial periods for this facility, ordered by date
    const periods = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.facilityId, facilityId))
      .orderBy(desc(financialPeriods.periodEnd));

    // Get COA mappings for detailed line items
    const coaMappingsData = await db
      .select()
      .from(dealCoaMappings)
      .where(
        and(
          eq(dealCoaMappings.dealId, dealId),
          eq(dealCoaMappings.facilityId, facilityId)
        )
      );

    // Build P&L structure from latest period
    const latestPeriod = periods[0];

    if (!latestPeriod) {
      return NextResponse.json({
        success: true,
        data: {
          facility,
          pnl: null,
          message: 'No financial data available for this facility',
        },
      });
    }

    // Calculate days in period for annualization
    const periodStart = new Date(latestPeriod.periodStart);
    const periodEnd = new Date(latestPeriod.periodEnd);
    const daysInPeriod = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    const annualizationFactor = 365 / daysInPeriod;

    // Build P&L
    const pnl = {
      period: {
        start: latestPeriod.periodStart,
        end: latestPeriod.periodEnd,
        days: daysInPeriod,
        isAnnualized: latestPeriod.isAnnualized,
      },
      census: {
        licensedBeds: facility.licensedBeds || latestPeriod.licensedBeds,
        averageDailyCensus: Number(latestPeriod.averageDailyCensus || 0),
        occupancyRate: Number(latestPeriod.occupancyRate || 0) * 100,
      },
      revenue: {
        medicare: {
          actual: Number(latestPeriod.medicareRevenue || 0),
          annualized: Number(latestPeriod.medicareRevenue || 0) * annualizationFactor,
        },
        medicaid: {
          actual: Number(latestPeriod.medicaidRevenue || 0),
          annualized: Number(latestPeriod.medicaidRevenue || 0) * annualizationFactor,
        },
        managedCare: {
          actual: Number(latestPeriod.managedCareRevenue || 0),
          annualized: Number(latestPeriod.managedCareRevenue || 0) * annualizationFactor,
        },
        privatePay: {
          actual: Number(latestPeriod.privatePayRevenue || 0),
          annualized: Number(latestPeriod.privatePayRevenue || 0) * annualizationFactor,
        },
        other: {
          actual: Number(latestPeriod.otherRevenue || 0),
          annualized: Number(latestPeriod.otherRevenue || 0) * annualizationFactor,
        },
        total: {
          actual: Number(latestPeriod.totalRevenue || 0),
          annualized: Number(latestPeriod.totalRevenue || 0) * annualizationFactor,
        },
      },
      expenses: {
        labor: {
          coreLabor: {
            actual: Number(latestPeriod.coreLabor || 0),
            annualized: Number(latestPeriod.coreLabor || 0) * annualizationFactor,
          },
          agencyLabor: {
            actual: Number(latestPeriod.agencyLabor || 0),
            annualized: Number(latestPeriod.agencyLabor || 0) * annualizationFactor,
          },
          totalLabor: {
            actual: Number(latestPeriod.laborCost || 0),
            annualized: Number(latestPeriod.laborCost || 0) * annualizationFactor,
            percentOfRevenue:
              Number(latestPeriod.totalRevenue || 0) > 0
                ? (Number(latestPeriod.laborCost || 0) /
                    Number(latestPeriod.totalRevenue || 0)) *
                  100
                : 0,
          },
        },
        operations: {
          food: {
            actual: Number(latestPeriod.foodCost || 0),
            annualized: Number(latestPeriod.foodCost || 0) * annualizationFactor,
          },
          supplies: {
            actual: Number(latestPeriod.suppliesCost || 0),
            annualized: Number(latestPeriod.suppliesCost || 0) * annualizationFactor,
          },
          utilities: {
            actual: Number(latestPeriod.utilitiesCost || 0),
            annualized: Number(latestPeriod.utilitiesCost || 0) * annualizationFactor,
          },
          insurance: {
            actual: Number(latestPeriod.insuranceCost || 0),
            annualized: Number(latestPeriod.insuranceCost || 0) * annualizationFactor,
          },
          managementFee: {
            actual: Number(latestPeriod.managementFee || 0),
            annualized: Number(latestPeriod.managementFee || 0) * annualizationFactor,
          },
          other: {
            actual: Number(latestPeriod.otherExpenses || 0),
            annualized: Number(latestPeriod.otherExpenses || 0) * annualizationFactor,
          },
        },
        total: {
          actual: Number(latestPeriod.totalExpenses || 0),
          annualized: Number(latestPeriod.totalExpenses || 0) * annualizationFactor,
          percentOfRevenue:
            Number(latestPeriod.totalRevenue || 0) > 0
              ? (Number(latestPeriod.totalExpenses || 0) /
                  Number(latestPeriod.totalRevenue || 0)) *
                100
              : 0,
        },
      },
      profitability: {
        noi: {
          actual: Number(latestPeriod.noi || 0),
          annualized: Number(latestPeriod.noi || 0) * annualizationFactor,
          margin:
            Number(latestPeriod.totalRevenue || 0) > 0
              ? (Number(latestPeriod.noi || 0) / Number(latestPeriod.totalRevenue || 0)) * 100
              : 0,
        },
        ebitdar: {
          actual: Number(latestPeriod.ebitdar || 0),
          annualized: Number(latestPeriod.ebitdar || 0) * annualizationFactor,
          margin:
            Number(latestPeriod.totalRevenue || 0) > 0
              ? (Number(latestPeriod.ebitdar || 0) /
                  Number(latestPeriod.totalRevenue || 0)) *
                100
              : 0,
        },
        normalizedNoi: {
          actual: Number(latestPeriod.normalizedNoi || 0),
          annualized: Number(latestPeriod.normalizedNoi || 0) * annualizationFactor,
        },
      },
      kpis: {
        hppd: Number(latestPeriod.hppd || 0),
        agencyPercentage: Number(latestPeriod.agencyPercentage || 0) * 100,
      },
      lineItems: coaMappingsData.map(item => ({
        id: item.id,
        sourceLabel: item.sourceLabel,
        sourceValue: Number(item.sourceValue || 0),
        sourceMonth: item.sourceMonth,
        coaCode: item.coaCode,
        coaName: item.coaName,
        proformaDestination: item.proformaDestination,
        isMapped: item.isMapped,
        mappingConfidence: Number(item.mappingConfidence || 0),
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        facility,
        pnl,
        historicalPeriods: periods.slice(1).map(p => ({
          id: p.id,
          periodStart: p.periodStart,
          periodEnd: p.periodEnd,
          totalRevenue: Number(p.totalRevenue || 0),
          totalExpenses: Number(p.totalExpenses || 0),
          noi: Number(p.noi || 0),
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching facility P&L:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch facility P&L' },
      { status: 500 }
    );
  }
}
