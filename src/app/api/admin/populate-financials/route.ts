import { NextResponse } from 'next/server';
import { db } from '@/db';
import { facilities, facilityCensusPeriods, facilityPayerRates, financialPeriods } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

// Industry standard SNF expense ratios (as % of revenue)
const EXPENSE_RATIOS = {
  laborCost: 0.52,        // 52% - largest expense
  agencyLabor: 0.03,      // 3% - contract/agency staffing
  foodCost: 0.05,         // 5% - dietary
  suppliesCost: 0.04,     // 4% - medical supplies
  utilitiesCost: 0.025,   // 2.5% - utilities
  insuranceCost: 0.025,   // 2.5% - insurance
  managementFee: 0.05,    // 5% - management fee
  otherExpenses: 0.08,    // 8% - other operating
};

interface CensusData {
  medicarePartADays: number;
  medicareAdvantageDays: number;
  managedCareDays: number;
  medicaidDays: number;
  managedMedicaidDays: number;
  privateDays: number;
  vaContractDays: number;
  hospiceDays: number;
  otherDays: number;
}

interface PayerRates {
  medicarePartAPpd: number;
  medicareAdvantagePpd: number;
  managedCarePpd: number;
  medicaidPpd: number;
  managedMedicaidPpd: number;
  privatePpd: number;
  vaContractPpd: number;
  hospicePpd: number;
  ancillaryRevenuePpd: number;
  therapyRevenuePpd: number;
}

function calculateRevenue(census: CensusData, rates: PayerRates) {
  const medicareRevenue =
    (census.medicarePartADays * rates.medicarePartAPpd) +
    (census.medicareAdvantageDays * rates.medicareAdvantagePpd);

  const medicaidRevenue =
    (census.medicaidDays * rates.medicaidPpd) +
    (census.managedMedicaidDays * rates.managedMedicaidPpd);

  const managedCareRevenue = census.managedCareDays * rates.managedCarePpd;

  const privatePayRevenue = census.privateDays * rates.privatePpd;

  const otherRevenue =
    (census.vaContractDays * rates.vaContractPpd) +
    (census.hospiceDays * rates.hospicePpd) +
    (census.otherDays * ((rates.medicaidPpd + rates.privatePpd) / 2));

  const totalDays = Object.values(census).reduce((a, b) => a + b, 0);

  const ancillaryRevenue = totalDays * (rates.ancillaryRevenuePpd || 15);
  const therapyRevenue = totalDays * (rates.therapyRevenuePpd || 8);

  const totalRevenue = medicareRevenue + medicaidRevenue + managedCareRevenue +
                       privatePayRevenue + otherRevenue + ancillaryRevenue + therapyRevenue;

  return {
    totalRevenue,
    medicareRevenue,
    medicaidRevenue,
    managedCareRevenue,
    privatePayRevenue,
    otherRevenue: otherRevenue + ancillaryRevenue + therapyRevenue,
  };
}

function calculateExpenses(totalRevenue: number) {
  const laborCost = totalRevenue * EXPENSE_RATIOS.laborCost;
  const agencyLabor = totalRevenue * EXPENSE_RATIOS.agencyLabor;
  const coreLabor = laborCost - agencyLabor;
  const foodCost = totalRevenue * EXPENSE_RATIOS.foodCost;
  const suppliesCost = totalRevenue * EXPENSE_RATIOS.suppliesCost;
  const utilitiesCost = totalRevenue * EXPENSE_RATIOS.utilitiesCost;
  const insuranceCost = totalRevenue * EXPENSE_RATIOS.insuranceCost;
  const managementFee = totalRevenue * EXPENSE_RATIOS.managementFee;
  const otherExpenses = totalRevenue * EXPENSE_RATIOS.otherExpenses;

  const totalExpenses = laborCost + agencyLabor + foodCost + suppliesCost +
                        utilitiesCost + insuranceCost + managementFee + otherExpenses;

  return {
    totalExpenses,
    laborCost,
    coreLabor,
    agencyLabor,
    foodCost,
    suppliesCost,
    utilitiesCost,
    insuranceCost,
    managementFee,
    otherExpenses,
  };
}

export async function POST() {
  try {
    const results: any[] = [];

    // Get all facilities
    const allFacilities = await db.select().from(facilities);

    for (const facility of allFacilities) {
      const facilityResult = {
        facilityId: facility.id,
        facilityName: facility.name,
        periodsCreated: 0,
        latestRevenue: 0,
        latestEbitdar: 0,
        latestEbitdarMargin: 0,
      };

      // Get all census periods for this facility
      const censusPeriods = await db
        .select()
        .from(facilityCensusPeriods)
        .where(eq(facilityCensusPeriods.facilityId, facility.id))
        .orderBy(desc(facilityCensusPeriods.periodEnd));

      if (censusPeriods.length === 0) {
        results.push({ ...facilityResult, error: 'No census data' });
        continue;
      }

      // Get latest payer rates
      const payerRatesRecords = await db
        .select()
        .from(facilityPayerRates)
        .where(eq(facilityPayerRates.facilityId, facility.id))
        .orderBy(desc(facilityPayerRates.effectiveDate))
        .limit(1);

      if (payerRatesRecords.length === 0) {
        results.push({ ...facilityResult, error: 'No payer rates' });
        continue;
      }

      const rates: PayerRates = {
        medicarePartAPpd: parseFloat(payerRatesRecords[0].medicarePartAPpd?.toString() || '0'),
        medicareAdvantagePpd: parseFloat(payerRatesRecords[0].medicareAdvantagePpd?.toString() || '0'),
        managedCarePpd: parseFloat(payerRatesRecords[0].managedCarePpd?.toString() || '0'),
        medicaidPpd: parseFloat(payerRatesRecords[0].medicaidPpd?.toString() || '0'),
        managedMedicaidPpd: parseFloat(payerRatesRecords[0].managedMedicaidPpd?.toString() || '0'),
        privatePpd: parseFloat(payerRatesRecords[0].privatePpd?.toString() || '0'),
        vaContractPpd: parseFloat(payerRatesRecords[0].vaContractPpd?.toString() || '0'),
        hospicePpd: parseFloat(payerRatesRecords[0].hospicePpd?.toString() || '0'),
        ancillaryRevenuePpd: parseFloat(payerRatesRecords[0].ancillaryRevenuePpd?.toString() || '15'),
        therapyRevenuePpd: parseFloat(payerRatesRecords[0].therapyRevenuePpd?.toString() || '8'),
      };

      for (const census of censusPeriods) {
        const censusData: CensusData = {
          medicarePartADays: census.medicarePartADays || 0,
          medicareAdvantageDays: census.medicareAdvantageDays || 0,
          managedCareDays: census.managedCareDays || 0,
          medicaidDays: census.medicaidDays || 0,
          managedMedicaidDays: census.managedMedicaidDays || 0,
          privateDays: census.privateDays || 0,
          vaContractDays: census.vaContractDays || 0,
          hospiceDays: census.hospiceDays || 0,
          otherDays: census.otherDays || 0,
        };

        const revenue = calculateRevenue(censusData, rates);
        const expenses = calculateExpenses(revenue.totalRevenue);

        const ebitdar = revenue.totalRevenue - expenses.totalExpenses;
        const noi = ebitdar * 0.95;
        const ebitda = ebitdar * 0.80;

        const totalDays = Object.values(censusData).reduce((a, b) => a + b, 0);
        const beds = facility.licensedBeds || facility.certifiedBeds || 100;
        const periodStart = new Date(census.periodStart);
        const periodEnd = new Date(census.periodEnd);
        const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const avgDailyCensus = totalDays / daysInPeriod;
        const occupancyRate = avgDailyCensus / beds;

        try {
          await db.insert(financialPeriods).values({
            dealId: facility.dealId,
            facilityId: facility.id,
            periodStart: census.periodStart,
            periodEnd: census.periodEnd,
            isAnnualized: false,
            totalRevenue: revenue.totalRevenue.toFixed(2),
            medicareRevenue: revenue.medicareRevenue.toFixed(2),
            medicaidRevenue: revenue.medicaidRevenue.toFixed(2),
            managedCareRevenue: revenue.managedCareRevenue.toFixed(2),
            privatePayRevenue: revenue.privatePayRevenue.toFixed(2),
            otherRevenue: revenue.otherRevenue.toFixed(2),
            totalExpenses: expenses.totalExpenses.toFixed(2),
            laborCost: expenses.laborCost.toFixed(2),
            coreLabor: expenses.coreLabor.toFixed(2),
            agencyLabor: expenses.agencyLabor.toFixed(2),
            foodCost: expenses.foodCost.toFixed(2),
            suppliesCost: expenses.suppliesCost.toFixed(2),
            utilitiesCost: expenses.utilitiesCost.toFixed(2),
            insuranceCost: expenses.insuranceCost.toFixed(2),
            managementFee: expenses.managementFee.toFixed(2),
            otherExpenses: expenses.otherExpenses.toFixed(2),
            noi: noi.toFixed(2),
            ebitdar: ebitdar.toFixed(2),
            licensedBeds: beds,
            averageDailyCensus: avgDailyCensus.toFixed(2),
            occupancyRate: occupancyRate.toFixed(4),
            source: 'calculated',
          });
          facilityResult.periodsCreated++;

          // Track latest values
          if (facilityResult.latestRevenue === 0) {
            facilityResult.latestRevenue = revenue.totalRevenue;
            facilityResult.latestEbitdar = ebitdar;
            facilityResult.latestEbitdarMargin = (ebitdar / revenue.totalRevenue) * 100;
          }
        } catch (err: any) {
          // Skip duplicates
          if (err.code !== '23505') {
            console.error(`Error inserting financial period:`, err);
          }
        }
      }

      results.push(facilityResult);
    }

    return NextResponse.json({
      success: true,
      message: 'Financial periods populated',
      results,
      summary: {
        facilitiesProcessed: results.length,
        totalPeriodsCreated: results.reduce((sum, r) => sum + r.periodsCreated, 0),
      },
    });
  } catch (error) {
    console.error('Error populating financials:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to populate financials' },
      { status: 500 }
    );
  }
}
