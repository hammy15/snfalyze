/**
 * CMS Query Tool
 *
 * Allows the AI agent to query CMS/Medicare data for facilities.
 */

import { db } from '@/db';
import { cmsProviderData, mcrCostReports } from '@/db/schema';
import { eq, ilike, and, desc, or } from 'drizzle-orm';
import type { AgentTool, ToolOutput, ToolExecutionContext } from '../types';

export const queryCmsDataTool: AgentTool = {
  name: 'query_cms_data',
  description: `Query CMS (Centers for Medicare & Medicaid Services) data for skilled nursing facilities. This includes quality ratings, staffing metrics, deficiencies, fines, and Medicare Cost Reports.

Use this tool when:
- You need to verify facility quality ratings
- You want to check staffing levels (HPPD)
- You need Medicare/Medicaid cost report data
- You want to identify regulatory concerns (SFF status, deficiencies)
- Comparing facility metrics to benchmarks

Data available:
- Overall rating (1-5 stars)
- Health inspection rating
- Staffing rating
- Quality measure rating
- RN, LPN, CNA hours per patient day
- Total deficiencies
- SFF (Special Focus Facility) status
- Fines and payment denial days
- Medicare Cost Report financials`,

  inputSchema: {
    type: 'object',
    properties: {
      ccn: {
        type: 'string',
        description: 'The CMS Certification Number (CCN) of the facility',
      },
      facilityName: {
        type: 'string',
        description: 'Facility name to search for (if CCN is not known)',
      },
      state: {
        type: 'string',
        description: 'State abbreviation to filter results (e.g., "CA", "TX")',
      },
      includeCostReports: {
        type: 'boolean',
        description: 'Whether to include Medicare Cost Report data (default: true)',
      },
      costReportYears: {
        type: 'number',
        description: 'Number of recent cost report years to include (default: 3)',
      },
    },
    required: [],
  },

  requiresConfirmation: false,

  async execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolOutput> {
    const startTime = Date.now();

    const {
      ccn,
      facilityName,
      state,
      includeCostReports = true,
      costReportYears = 3,
    } = input as {
      ccn?: string;
      facilityName?: string;
      state?: string;
      includeCostReports?: boolean;
      costReportYears?: number;
    };

    if (!ccn && !facilityName) {
      return {
        success: false,
        error: 'Either CCN or facility name must be provided',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }

    try {
      let providers: (typeof cmsProviderData.$inferSelect)[] = [];

      if (ccn) {
        // Direct CCN lookup
        providers = await db
          .select()
          .from(cmsProviderData)
          .where(eq(cmsProviderData.ccn, ccn))
          .limit(1);
      } else if (facilityName) {
        // Search by name
        const conditions = state
          ? and(
              ilike(cmsProviderData.providerName, `%${facilityName}%`),
              eq(cmsProviderData.state, state.toUpperCase())
            )
          : ilike(cmsProviderData.providerName, `%${facilityName}%`);

        providers = await db
          .select()
          .from(cmsProviderData)
          .where(conditions)
          .limit(10);
      }

      if (providers.length === 0) {
        return {
          success: true,
          data: {
            found: false,
            message: ccn
              ? `No CMS data found for CCN: ${ccn}`
              : `No facilities found matching: ${facilityName}`,
          },
          metadata: { executionTimeMs: Date.now() - startTime },
        };
      }

      // Format provider data
      const formattedProviders = await Promise.all(
        providers.map(async (provider) => {
          const formattedProvider = {
            ccn: provider.ccn,
            name: provider.providerName,
            address: provider.address,
            city: provider.city,
            state: provider.state,
            zipCode: provider.zipCode,
            beds: provider.numberOfBeds,
            averageResidentsPerDay: provider.averageResidentsPerDay,
            ratings: {
              overall: provider.overallRating,
              healthInspection: provider.healthInspectionRating,
              staffing: provider.staffingRating,
              qualityMeasure: provider.qualityMeasureRating,
            },
            staffing: {
              rnHppd: provider.reportedRnHppd,
              lpnHppd: provider.reportedLpnHppd,
              cnaHppd: provider.reportedCnaHppd,
              totalNursingHppd: provider.totalNursingHppd,
            },
            deficiencies: {
              total: provider.totalDeficiencies,
              health: provider.healthDeficiencies,
              fire: provider.fireDeficiencies,
            },
            regulatoryStatus: {
              isSff: provider.isSff,
              isSffCandidate: provider.isSffCandidate,
              sffDate: provider.specialFocusFacilityDate,
              hasAbuseIcon: provider.abuseIcon,
            },
            penalties: {
              finesTotal: provider.finesTotal,
              paymentDenialDays: provider.paymentDenialDays,
            },
            ownershipType: provider.ownershipType,
            dataDate: provider.dataDate,
            costReports: [] as Record<string, unknown>[],
          };

          // Get cost reports if requested
          if (includeCostReports) {
            const costReports = await db
              .select()
              .from(mcrCostReports)
              .where(eq(mcrCostReports.ccn, provider.ccn))
              .orderBy(desc(mcrCostReports.fiscalYearEnd))
              .limit(costReportYears);

            formattedProvider.costReports = costReports.map((cr) => ({
              fiscalYear: cr.fiscalYearEnd,
              status: cr.reportStatus,
              beds: cr.totalBeds,
              patientDays: cr.totalPatientDays,
              medicareDays: cr.medicareDays,
              medicaidDays: cr.medicaidDays,
              totalCosts: cr.totalCosts,
              netPatientRevenue: cr.netPatientRevenue,
              medicareRevenue: cr.medicareRevenue,
              medicaidRevenue: cr.medicaidRevenue,
              totalSalaries: cr.totalSalaries,
              contractLaborCost: cr.contractLaborCost,
              costPerDay: cr.costPerDay,
            }));
          }

          return formattedProvider;
        })
      );

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          found: true,
          count: formattedProviders.length,
          providers: formattedProviders.length === 1 ? formattedProviders[0] : formattedProviders,
        },
        metadata: {
          executionTimeMs,
          affectedRecords: formattedProviders.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to query CMS data',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  },
};

/**
 * Get CMS benchmarks for comparison
 */
export function getCmsBenchmarks(assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE', state?: string) {
  // These are approximate national benchmarks for SNFs
  // In a production system, these would be calculated from the database
  const snfBenchmarks = {
    ratings: {
      overallMedian: 3,
      overallGood: 4,
      overallExcellent: 5,
    },
    staffing: {
      rnHppdMedian: 0.75,
      rnHppdGood: 1.0,
      totalNursingHppdMedian: 3.5,
      totalNursingHppdGood: 4.2,
    },
    deficiencies: {
      totalMedian: 7,
      totalGood: 4,
      healthMedian: 5,
    },
    occupancy: {
      median: 0.82,
      good: 0.88,
    },
  };

  // ALF and ILF don't have CMS ratings in the same way
  if (assetType !== 'SNF') {
    return {
      message: `CMS Star Ratings are only available for Skilled Nursing Facilities (SNFs). ${assetType} facilities are not included in the CMS rating system.`,
      assetType,
    };
  }

  return {
    assetType: 'SNF',
    benchmarks: snfBenchmarks,
    note: 'Benchmarks are national medians. State-specific benchmarks may vary.',
  };
}

export default queryCmsDataTool;
