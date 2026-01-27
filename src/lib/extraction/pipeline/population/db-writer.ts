/**
 * Database Writer
 *
 * Writes normalized extraction results to the database with upsert logic.
 */

import { db } from '@/db';
import {
  financialPeriods,
  facilityCensusPeriods,
  facilityPayerRates,
  facilities,
  extractionClarifications,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type {
  ExtractionContext,
  NormalizedFinancialPeriod,
  NormalizedCensusPeriod,
  NormalizedPayerRate,
  PipelineClarification,
  ClarificationType,
} from '../types';
import { ExtractionContextManager } from '../context/extraction-context';

// ============================================================================
// DATABASE WRITER
// ============================================================================

export interface PopulationResult {
  financialPeriodsWritten: number;
  censusPeriodsWritten: number;
  payerRatesWritten: number;
  clarificationsWritten: number;
  facilitiesUpdated: number;
  errors: string[];
  warnings: string[];
}

/**
 * Write all extracted data from context to database
 */
export async function writeToDatabase(params: {
  contextManager: ExtractionContextManager;
  onProgress?: (progress: number, message: string) => void;
}): Promise<PopulationResult> {
  const { contextManager, onProgress } = params;
  const context = contextManager.getContext();

  const result: PopulationResult = {
    financialPeriodsWritten: 0,
    censusPeriodsWritten: 0,
    payerRatesWritten: 0,
    clarificationsWritten: 0,
    facilitiesUpdated: 0,
    errors: [],
    warnings: [],
  };

  onProgress?.(0, 'Starting database population...');

  // 1. Get facility mappings (context IDs to database IDs)
  onProgress?.(10, 'Resolving facility mappings...');
  const facilityMappings = await resolveFacilityMappings(context, result);

  // 2. Write financial periods
  onProgress?.(20, 'Writing financial periods...');
  await writeFinancialPeriods(context.extractedPeriods, facilityMappings, context.dealId, result);

  // 3. Write census periods
  onProgress?.(40, 'Writing census periods...');
  await writeCensusPeriods(context.extractedCensus, facilityMappings, result);

  // 4. Write payer rates
  onProgress?.(60, 'Writing payer rates...');
  await writePayerRates(context.extractedRates, facilityMappings, result);

  // 5. Write clarifications
  onProgress?.(80, 'Writing clarification requests...');
  await writeClarifications(context.pendingClarifications, context.dealId, result);

  onProgress?.(100, 'Database population complete');

  return result;
}

// ============================================================================
// FACILITY MAPPING
// ============================================================================

async function resolveFacilityMappings(
  context: ExtractionContext,
  result: PopulationResult
): Promise<Map<string, string>> {
  const mappings = new Map<string, string>();

  // Get all facilities for this deal
  const dealFacilities = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, context.dealId));

  // Create a mapping from context facility ID to database facility ID
  for (const [contextId, profile] of context.facilityProfiles) {
    // Try to match by name or CCN
    let dbFacility = dealFacilities.find(
      (f) =>
        f.name?.toLowerCase() === profile.name.toLowerCase() ||
        (profile.ccn && f.ccn === profile.ccn)
    );

    // Try matching by alias
    if (!dbFacility) {
      dbFacility = dealFacilities.find((f) =>
        profile.aliases.some((alias) => f.name?.toLowerCase() === alias.toLowerCase())
      );
    }

    if (dbFacility) {
      mappings.set(contextId, dbFacility.id);

      // Update facility with any new info from extraction
      const updates: Record<string, unknown> = {};
      if (profile.ccn && !dbFacility.ccn) updates.ccn = profile.ccn;
      if (profile.licensedBeds && !dbFacility.licensedBeds) updates.licensedBeds = profile.licensedBeds;
      if (profile.certifiedBeds && !dbFacility.certifiedBeds) updates.certifiedBeds = profile.certifiedBeds;

      if (Object.keys(updates).length > 0) {
        await db
          .update(facilities)
          .set(updates)
          .where(eq(facilities.id, dbFacility.id));
        result.facilitiesUpdated++;
      }
    } else {
      // Facility not found in database - create it
      try {
        const [newFacility] = await db
          .insert(facilities)
          .values({
            dealId: context.dealId,
            name: profile.name,
            assetType: profile.facilityType === 'SNF' ? 'SNF' : profile.facilityType === 'ALF' ? 'ALF' : profile.facilityType === 'ILF' ? 'ILF' : 'SNF',
            ccn: profile.ccn,
            licensedBeds: profile.licensedBeds,
            certifiedBeds: profile.certifiedBeds,
            address: profile.address?.street,
            city: profile.address?.city,
            state: profile.address?.state,
            zipCode: profile.address?.zip,
          })
          .returning();

        mappings.set(contextId, newFacility.id);
        result.facilitiesUpdated++;
      } catch (error) {
        result.errors.push(`Failed to create facility ${profile.name}: ${error}`);
      }
    }
  }

  return mappings;
}

// ============================================================================
// FINANCIAL PERIODS
// ============================================================================

async function writeFinancialPeriods(
  periods: NormalizedFinancialPeriod[],
  facilityMappings: Map<string, string>,
  dealId: string,
  result: PopulationResult
): Promise<void> {
  for (const period of periods) {
    const dbFacilityId = facilityMappings.get(period.facilityId);
    if (!dbFacilityId) {
      result.warnings.push(`No database facility found for ${period.facilityName}`);
      continue;
    }

    try {
      // Check for existing period
      const existing = await db
        .select()
        .from(financialPeriods)
        .where(
          and(
            eq(financialPeriods.facilityId, dbFacilityId),
            eq(financialPeriods.periodStart, period.periodStart.toISOString().split('T')[0]),
            eq(financialPeriods.periodEnd, period.periodEnd.toISOString().split('T')[0])
          )
        )
        .limit(1);

      const values = {
        dealId,
        facilityId: dbFacilityId,
        periodStart: period.periodStart.toISOString().split('T')[0],
        periodEnd: period.periodEnd.toISOString().split('T')[0],
        isAnnualized: period.isAnnualized,
        totalRevenue: period.revenue.total.toString(),
        medicareRevenue: (period.revenue.byPayer.medicarePartA + period.revenue.byPayer.medicareAdvantage).toString(),
        medicaidRevenue: (period.revenue.byPayer.medicaid + period.revenue.byPayer.managedMedicaid).toString(),
        managedCareRevenue: period.revenue.byPayer.managedCare.toString(),
        privatePayRevenue: period.revenue.byPayer.private.toString(),
        otherRevenue: (period.revenue.byPayer.va + period.revenue.byPayer.hospice + period.revenue.byPayer.other).toString(),
        totalExpenses: period.expenses.total.toString(),
        laborCost: period.expenses.labor.total.toString(),
        coreLabor: period.expenses.labor.core.toString(),
        agencyLabor: period.expenses.labor.agency.toString(),
        foodCost: period.expenses.operating.dietary.toString(),
        suppliesCost: period.expenses.operating.supplies.toString(),
        utilitiesCost: period.expenses.operating.utilities.toString(),
        insuranceCost: period.expenses.fixed.insurance.toString(),
        managementFee: period.expenses.fixed.managementFee.toString(),
        otherExpenses: (
          period.expenses.operating.housekeeping +
          period.expenses.operating.maintenance +
          period.expenses.operating.other +
          period.expenses.fixed.propertyTax +
          period.expenses.fixed.other
        ).toString(),
        noi: period.metrics.noi.toString(),
        ebitdar: period.metrics.ebitdar.toString(),
        normalizedNoi: period.metrics.noi.toString(),
        averageDailyCensus: period.census?.avgDailyCensus?.toString() || null,
        occupancyRate: period.census?.occupancyRate?.toString() || null,
        confidenceScore: Math.round(period.confidence),
        source: 'extracted' as const,
        sourceDocumentId: period.sources[0]?.documentId || null,
      };

      if (existing.length > 0) {
        // Update if new confidence is higher
        if (period.confidence >= (existing[0].confidenceScore || 0)) {
          await db
            .update(financialPeriods)
            .set(values)
            .where(eq(financialPeriods.id, existing[0].id));
          result.financialPeriodsWritten++;
        }
      } else {
        // Insert new
        await db.insert(financialPeriods).values(values);
        result.financialPeriodsWritten++;
      }
    } catch (error) {
      result.errors.push(
        `Failed to write financial period for ${period.facilityName}: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }
}

// ============================================================================
// CENSUS PERIODS
// ============================================================================

async function writeCensusPeriods(
  censusData: NormalizedCensusPeriod[],
  facilityMappings: Map<string, string>,
  result: PopulationResult
): Promise<void> {
  for (const census of censusData) {
    const dbFacilityId = facilityMappings.get(census.facilityId);
    if (!dbFacilityId) {
      result.warnings.push(`No database facility found for census: ${census.facilityName}`);
      continue;
    }

    try {
      // Check for existing period
      const existing = await db
        .select()
        .from(facilityCensusPeriods)
        .where(
          and(
            eq(facilityCensusPeriods.facilityId, dbFacilityId),
            eq(facilityCensusPeriods.periodStart, census.periodStart.toISOString().split('T')[0]),
            eq(facilityCensusPeriods.periodEnd, census.periodEnd.toISOString().split('T')[0])
          )
        )
        .limit(1);

      const values = {
        facilityId: dbFacilityId,
        periodStart: census.periodStart.toISOString().split('T')[0],
        periodEnd: census.periodEnd.toISOString().split('T')[0],
        medicarePartADays: census.patientDays.medicarePartA,
        medicareAdvantageDays: census.patientDays.medicareAdvantage,
        managedCareDays: census.patientDays.managedCare,
        medicaidDays: census.patientDays.medicaid,
        managedMedicaidDays: census.patientDays.managedMedicaid,
        privateDays: census.patientDays.private,
        vaContractDays: census.patientDays.va,
        hospiceDays: census.patientDays.hospice,
        otherDays: census.patientDays.other,
        totalBeds: census.totalBeds,
        occupancyRate: census.occupancyRate.toString(),
        source: 'extracted' as const,
      };

      if (existing.length > 0) {
        // Update
        await db
          .update(facilityCensusPeriods)
          .set(values)
          .where(eq(facilityCensusPeriods.id, existing[0].id));
        result.censusPeriodsWritten++;
      } else {
        // Insert
        await db.insert(facilityCensusPeriods).values(values);
        result.censusPeriodsWritten++;
      }
    } catch (error) {
      result.errors.push(
        `Failed to write census period for ${census.facilityName}: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }
}

// ============================================================================
// PAYER RATES
// ============================================================================

async function writePayerRates(
  rates: NormalizedPayerRate[],
  facilityMappings: Map<string, string>,
  result: PopulationResult
): Promise<void> {
  for (const rate of rates) {
    const dbFacilityId = facilityMappings.get(rate.facilityId);
    if (!dbFacilityId) {
      result.warnings.push(`No database facility found for rates: ${rate.facilityName}`);
      continue;
    }

    try {
      // Check for existing rate
      const existing = await db
        .select()
        .from(facilityPayerRates)
        .where(
          and(
            eq(facilityPayerRates.facilityId, dbFacilityId),
            eq(facilityPayerRates.effectiveDate, rate.effectiveDate.toISOString().split('T')[0])
          )
        )
        .limit(1);

      const values = {
        facilityId: dbFacilityId,
        effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
        medicarePartAPpd: rate.rates.medicarePartA?.toString() || null,
        medicareAdvantagePpd: rate.rates.medicareAdvantage?.toString() || null,
        managedCarePpd: rate.rates.managedCare?.toString() || null,
        medicaidPpd: rate.rates.medicaid?.toString() || null,
        managedMedicaidPpd: rate.rates.managedMedicaid?.toString() || null,
        privatePpd: rate.rates.private?.toString() || null,
        vaContractPpd: rate.rates.va?.toString() || null,
        hospicePpd: rate.rates.hospice?.toString() || null,
        ancillaryRevenuePpd: rate.ancillaryPpd?.toString() || null,
        therapyRevenuePpd: rate.therapyPpd?.toString() || null,
        source: 'extracted' as const,
      };

      if (existing.length > 0) {
        // Update
        await db
          .update(facilityPayerRates)
          .set(values)
          .where(eq(facilityPayerRates.id, existing[0].id));
        result.payerRatesWritten++;
      } else {
        // Insert
        await db.insert(facilityPayerRates).values(values);
        result.payerRatesWritten++;
      }
    } catch (error) {
      result.errors.push(
        `Failed to write payer rates for ${rate.facilityName}: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }
}

// ============================================================================
// CLARIFICATIONS
// ============================================================================

// Database clarification types: 'low_confidence' | 'out_of_range' | 'conflict' | 'missing' | 'validation_error'
type DbClarificationType = 'low_confidence' | 'out_of_range' | 'conflict' | 'missing' | 'validation_error';

function mapClarificationTypeToDb(type: ClarificationType): DbClarificationType {
  switch (type) {
    case 'low_confidence':
      return 'low_confidence';
    case 'out_of_range':
      return 'out_of_range';
    case 'conflict':
      return 'conflict';
    case 'missing_critical':
      return 'missing';
    case 'revenue_mismatch':
      return 'validation_error';
    case 'validation_error':
      return 'validation_error';
    default:
      return 'validation_error';
  }
}

async function writeClarifications(
  clarifications: PipelineClarification[],
  dealId: string,
  result: PopulationResult
): Promise<void> {
  for (const clarification of clarifications) {
    if (clarification.status !== 'pending') continue;

    try {
      await db.insert(extractionClarifications).values({
        documentId: clarification.context.documentName, // Note: might need proper doc ID
        fieldName: clarification.fieldPath.split('.').pop() || clarification.fieldPath,
        fieldPath: clarification.fieldPath,
        extractedValue: clarification.extractedValue?.toString() || null,
        suggestedValues: clarification.suggestedValues.map((s) => String(s.value)),
        benchmarkValue: clarification.benchmarkRange?.median.toString() || null,
        benchmarkRange: clarification.benchmarkRange || null,
        clarificationType: mapClarificationTypeToDb(clarification.clarificationType),
        status: 'pending',
        confidenceScore: clarification.extractedConfidence,
        priority: clarification.priority,
        reason: clarification.context.aiExplanation || `${clarification.clarificationType} for ${clarification.fieldLabel}`,
      });

      result.clarificationsWritten++;
    } catch (error) {
      result.warnings.push(
        `Failed to write clarification for ${clarification.fieldLabel}: ${error instanceof Error ? error.message : 'Unknown'}`
      );
    }
  }
}

export default {
  writeToDatabase,
};
