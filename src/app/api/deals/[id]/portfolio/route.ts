import { NextRequest, NextResponse } from 'next/server';
import { db, facilities, deals, facilityCensusPeriods, facilityPayerRates } from '@/db';
import { eq, desc } from 'drizzle-orm';
import { calculatePortfolioMetrics, calculatePayerRevenue } from '@/lib/proforma/calculations';
import type { FacilityFinancials, CensusByPayer } from '@/components/financials/types';
import { getTotalDays } from '@/components/financials/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;

    // Verify deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Fetch facilities for this deal
    const dealFacilities = await db.query.facilities.findMany({
      where: eq(facilities.dealId, dealId),
    });

    // Build facility financials for each facility
    const facilityFinancials: FacilityFinancials[] = await Promise.all(
      dealFacilities.map(async (facility) => {
        // Get latest census period
        const latestCensus = await db.query.facilityCensusPeriods.findFirst({
          where: eq(facilityCensusPeriods.facilityId, facility.id),
          orderBy: [desc(facilityCensusPeriods.periodEnd)],
        });

        // Get current payer rates
        const currentRates = await db.query.facilityPayerRates.findFirst({
          where: eq(facilityPayerRates.facilityId, facility.id),
          orderBy: [desc(facilityPayerRates.effectiveDate)],
        });

        // Build census data
        const censusByPayer: CensusByPayer = latestCensus
          ? {
              medicarePartADays: latestCensus.medicarePartADays || 0,
              medicareAdvantageDays: latestCensus.medicareAdvantageDays || 0,
              managedCareDays: latestCensus.managedCareDays || 0,
              medicaidDays: latestCensus.medicaidDays || 0,
              managedMedicaidDays: latestCensus.managedMedicaidDays || 0,
              privateDays: latestCensus.privateDays || 0,
              vaContractDays: latestCensus.vaContractDays || 0,
              hospiceDays: latestCensus.hospiceDays || 0,
              otherDays: latestCensus.otherDays || 0,
            }
          : {
              medicarePartADays: 0,
              medicareAdvantageDays: 0,
              managedCareDays: 0,
              medicaidDays: 0,
              managedMedicaidDays: 0,
              privateDays: 0,
              vaContractDays: 0,
              hospiceDays: 0,
              otherDays: 0,
            };

        // Build rates object for calculations
        const rates = currentRates
          ? {
              medicarePartAPpd: Number(currentRates.medicarePartAPpd) || 0,
              medicareAdvantagePpd: Number(currentRates.medicareAdvantagePpd) || 0,
              managedCarePpd: Number(currentRates.managedCarePpd) || 0,
              medicaidPpd: Number(currentRates.medicaidPpd) || 0,
              managedMedicaidPpd: Number(currentRates.managedMedicaidPpd) || 0,
              privatePpd: Number(currentRates.privatePpd) || 0,
              vaContractPpd: Number(currentRates.vaContractPpd) || 0,
              hospicePpd: Number(currentRates.hospicePpd) || 0,
              ancillaryRevenuePpd: Number(currentRates.ancillaryRevenuePpd) || 0,
              therapyRevenuePpd: Number(currentRates.therapyRevenuePpd) || 0,
            }
          : {};

        // Calculate revenue by payer
        const revenueByPayer = calculatePayerRevenue(censusByPayer, rates);
        const totalDays = getTotalDays(censusByPayer);
        const beds = facility.licensedBeds || 0;

        // Calculate occupancy (annualized)
        const occupancy = beds > 0 && totalDays > 0 ? (totalDays / 30) / beds : 0;

        // Calculate blended PPD
        const blendedPPD =
          totalDays > 0
            ? (revenueByPayer.total - revenueByPayer.ancillary - revenueByPayer.therapy) / totalDays
            : 0;

        // For now, estimate expenses based on industry averages
        // In a real implementation, this would come from P&L data
        const totalRevenue = revenueByPayer.total * 12; // Annualized
        const totalExpenses = totalRevenue * 0.8; // 80% expense ratio estimate
        const ebitdar = totalRevenue - totalExpenses;
        const rent = beds * 850 * 12; // $850/bed/month estimate
        const ebitda = ebitdar - rent;

        return {
          facilityId: facility.id,
          facilityName: facility.name,
          beds,
          totalDays: totalDays * 12, // Annualized
          occupancy,
          totalRevenue,
          totalExpenses,
          ebitdar,
          ebitda,
          blendedPPD,
          censusByPayer,
          revenueByPayer,
        };
      })
    );

    // Calculate portfolio metrics
    const portfolioMetrics = calculatePortfolioMetrics(facilityFinancials);

    return NextResponse.json({
      success: true,
      data: {
        deal: {
          id: deal.id,
          name: deal.name,
        },
        portfolioMetrics,
        facilities: facilityFinancials,
      },
    });
  } catch (error) {
    console.error('Error fetching portfolio data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}
