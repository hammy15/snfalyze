/**
 * Database Populator
 *
 * Inserts extracted data into the database tables:
 * - financial_periods
 * - facility_census_periods
 * - facility_payer_rates
 *
 * Automatically triggers SLB recalculation after population.
 */

import { db } from '@/db';
import {
  financialPeriods,
  facilityCensusPeriods,
  facilityPayerRates,
  facilities,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { CensusPeriod } from './census-extractor';
import type { PayerRate } from './rate-extractor';
import type { FinancialPeriod } from './pl-extractor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PopulationResult {
  facilityId: string;
  financialPeriodsInserted: number;
  censusPeriodsInserted: number;
  payerRatesInserted: number;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// POPULATION FUNCTIONS
// ============================================================================

/**
 * Populate database from extracted data for a single facility
 */
export async function populateFromExtraction(
  facilityId: string,
  financialData: FinancialPeriod[],
  censusData: CensusPeriod[],
  rateData: PayerRate[],
  documentId: string
): Promise<PopulationResult> {
  const result: PopulationResult = {
    facilityId,
    financialPeriodsInserted: 0,
    censusPeriodsInserted: 0,
    payerRatesInserted: 0,
    errors: [],
    warnings: [],
  };

  // Get the facility to get the dealId
  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  if (!facility) {
    result.errors.push(`Facility ${facilityId} not found`);
    return result;
  }

  // 1. Insert financial periods
  if (financialData.length > 0) {
    for (const period of financialData) {
      try {
        await db
          .insert(financialPeriods)
          .values({
            dealId: facility.dealId!,
            facilityId,
            periodStart: period.periodStart.toISOString().split('T')[0],
            periodEnd: period.periodEnd.toISOString().split('T')[0],
            isAnnualized: period.isAnnualized,
            totalRevenue: period.totalRevenue.toString(),
            medicareRevenue: period.medicareRevenue.toString(),
            medicaidRevenue: period.medicaidRevenue.toString(),
            managedCareRevenue: period.managedCareRevenue.toString(),
            privatePayRevenue: period.privatePayRevenue.toString(),
            otherRevenue: (period.ancillaryRevenue + period.otherRevenue).toString(),
            totalExpenses: period.totalExpenses.toString(),
            laborCost: period.totalLaborCost.toString(),
            coreLabor: (period.totalLaborCost - period.agencyLabor).toString(),
            agencyLabor: period.agencyLabor.toString(),
            foodCost: period.foodCost.toString(),
            suppliesCost: period.suppliesCost.toString(),
            utilitiesCost: period.utilitiesCost.toString(),
            insuranceCost: period.insuranceCost.toString(),
            managementFee: period.managementFee.toString(),
            otherExpenses: (period.propertyTax + period.otherExpenses).toString(),
            noi: period.noi.toString(),
            ebitdar: period.ebitdar.toString(),
            normalizedNoi: period.noi.toString(),
            averageDailyCensus: period.totalPatientDays
              ? (period.totalPatientDays / 30).toString()
              : null,
            occupancyRate: period.ebitdarMargin
              ? (period.ebitdarMargin / 100).toString()
              : null,
            confidenceScore: Math.round(period.confidence * 100),
          })
          .onConflictDoNothing();

        result.financialPeriodsInserted++;
      } catch (err) {
        result.warnings.push(
          `Failed to insert financial period ${period.periodLabel}: ${err instanceof Error ? err.message : 'Unknown'}`
        );
      }
    }
  }

  // 2. Insert census periods
  if (censusData.length > 0) {
    for (const census of censusData) {
      try {
        await db
          .insert(facilityCensusPeriods)
          .values({
            facilityId,
            periodStart: census.periodStart.toISOString().split('T')[0],
            periodEnd: census.periodEnd.toISOString().split('T')[0],
            medicarePartADays: census.medicarePartADays,
            medicareAdvantageDays: census.medicareAdvantageDays,
            managedCareDays: census.managedCareDays,
            medicaidDays: census.medicaidDays,
            managedMedicaidDays: census.managedMedicaidDays,
            privateDays: census.privateDays,
            vaContractDays: census.vaContractDays,
            hospiceDays: census.hospiceDays,
            otherDays: census.otherDays,
            totalBeds: census.totalBeds,
            occupancyRate: census.occupancyRate.toString(),
            source: census.source,
          })
          .onConflictDoNothing();

        result.censusPeriodsInserted++;
      } catch (err) {
        result.warnings.push(
          `Failed to insert census period ${census.periodLabel}: ${err instanceof Error ? err.message : 'Unknown'}`
        );
      }
    }
  }

  // 3. Insert payer rates
  if (rateData.length > 0) {
    for (const rate of rateData) {
      try {
        await db
          .insert(facilityPayerRates)
          .values({
            facilityId,
            effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
            medicarePartAPpd: rate.medicarePartAPpd?.toString(),
            medicareAdvantagePpd: rate.medicareAdvantagePpd?.toString(),
            managedCarePpd: rate.managedCarePpd?.toString(),
            medicaidPpd: rate.medicaidPpd?.toString(),
            managedMedicaidPpd: rate.managedMedicaidPpd?.toString(),
            privatePpd: rate.privatePpd?.toString(),
            vaContractPpd: rate.vaContractPpd?.toString(),
            hospicePpd: rate.hospicePpd?.toString(),
            ancillaryRevenuePpd: rate.ancillaryRevenuePpd?.toString(),
            therapyRevenuePpd: rate.therapyRevenuePpd?.toString(),
            source: rate.source,
          })
          .onConflictDoNothing();

        result.payerRatesInserted++;
      } catch (err) {
        result.warnings.push(
          `Failed to insert payer rate: ${err instanceof Error ? err.message : 'Unknown'}`
        );
      }
    }
  }

  return result;
}

/**
 * Get latest financial data for a facility
 */
export async function getLatestFinancials(facilityId: string) {
  const periods = await db
    .select()
    .from(financialPeriods)
    .where(eq(financialPeriods.facilityId, facilityId))
    .orderBy(financialPeriods.periodEnd)
    .limit(12);

  if (periods.length === 0) {
    return null;
  }

  // Calculate TTM (trailing twelve months) totals
  const ttm = {
    totalRevenue: 0,
    totalExpenses: 0,
    ebitdar: 0,
    ebitda: 0,
    noi: 0,
    laborCost: 0,
    agencyLabor: 0,
    periodCount: periods.length,
  };

  for (const p of periods) {
    ttm.totalRevenue += parseFloat(p.totalRevenue?.toString() || '0');
    ttm.totalExpenses += parseFloat(p.totalExpenses?.toString() || '0');
    ttm.ebitdar += parseFloat(p.ebitdar?.toString() || '0');
    ttm.noi += parseFloat(p.noi?.toString() || '0');
    ttm.laborCost += parseFloat(p.laborCost?.toString() || '0');
    ttm.agencyLabor += parseFloat(p.agencyLabor?.toString() || '0');
  }

  // Annualize if less than 12 months
  const annualizationFactor = 12 / ttm.periodCount;
  if (ttm.periodCount < 12) {
    ttm.totalRevenue *= annualizationFactor;
    ttm.totalExpenses *= annualizationFactor;
    ttm.ebitdar *= annualizationFactor;
    ttm.noi *= annualizationFactor;
    ttm.laborCost *= annualizationFactor;
    ttm.agencyLabor *= annualizationFactor;
  }

  // Get facility name
  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.id, facilityId))
    .limit(1);

  return {
    facilityId,
    facilityName: facility?.name || 'Unknown',
    ...ttm,
    ebitda: ttm.ebitdar, // Assuming no rent deduction here
    latestPeriod: periods[periods.length - 1],
  };
}

/**
 * Get latest census data for a facility
 */
export async function getLatestCensus(facilityId: string) {
  const censusRecords = await db
    .select()
    .from(facilityCensusPeriods)
    .where(eq(facilityCensusPeriods.facilityId, facilityId))
    .orderBy(facilityCensusPeriods.periodEnd)
    .limit(12);

  if (censusRecords.length === 0) {
    return null;
  }

  // Calculate TTM census totals
  const ttm = {
    medicarePartADays: 0,
    medicareAdvantageDays: 0,
    managedCareDays: 0,
    medicaidDays: 0,
    managedMedicaidDays: 0,
    privateDays: 0,
    vaContractDays: 0,
    hospiceDays: 0,
    otherDays: 0,
    totalDays: 0,
    periodCount: censusRecords.length,
    totalBeds: censusRecords[0].totalBeds || 0,
  };

  for (const c of censusRecords) {
    ttm.medicarePartADays += c.medicarePartADays || 0;
    ttm.medicareAdvantageDays += c.medicareAdvantageDays || 0;
    ttm.managedCareDays += c.managedCareDays || 0;
    ttm.medicaidDays += c.medicaidDays || 0;
    ttm.managedMedicaidDays += c.managedMedicaidDays || 0;
    ttm.privateDays += c.privateDays || 0;
    ttm.vaContractDays += c.vaContractDays || 0;
    ttm.hospiceDays += c.hospiceDays || 0;
    ttm.otherDays += c.otherDays || 0;
  }

  ttm.totalDays =
    ttm.medicarePartADays +
    ttm.medicareAdvantageDays +
    ttm.managedCareDays +
    ttm.medicaidDays +
    ttm.managedMedicaidDays +
    ttm.privateDays +
    ttm.vaContractDays +
    ttm.hospiceDays +
    ttm.otherDays;

  return ttm;
}

/**
 * Get latest payer rates for a facility
 */
export async function getLatestPayerRates(facilityId: string) {
  const [rates] = await db
    .select()
    .from(facilityPayerRates)
    .where(eq(facilityPayerRates.facilityId, facilityId))
    .orderBy(facilityPayerRates.effectiveDate)
    .limit(1);

  if (!rates) {
    return null;
  }

  return {
    medicarePartAPpd: parseFloat(rates.medicarePartAPpd?.toString() || '0'),
    medicareAdvantagePpd: parseFloat(rates.medicareAdvantagePpd?.toString() || '0'),
    managedCarePpd: parseFloat(rates.managedCarePpd?.toString() || '0'),
    medicaidPpd: parseFloat(rates.medicaidPpd?.toString() || '0'),
    managedMedicaidPpd: parseFloat(rates.managedMedicaidPpd?.toString() || '0'),
    privatePpd: parseFloat(rates.privatePpd?.toString() || '0'),
    vaContractPpd: parseFloat(rates.vaContractPpd?.toString() || '0'),
    hospicePpd: parseFloat(rates.hospicePpd?.toString() || '0'),
    ancillaryRevenuePpd: parseFloat(rates.ancillaryRevenuePpd?.toString() || '0'),
    therapyRevenuePpd: parseFloat(rates.therapyRevenuePpd?.toString() || '0'),
    effectiveDate: rates.effectiveDate,
  };
}
