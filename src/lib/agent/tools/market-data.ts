/**
 * Market Data Tool
 *
 * Allows the AI agent to fetch external market data and benchmarks.
 */

import { db } from '@/db';
import { comparableSales, cmsProviderData } from '@/db/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import type { AgentTool, ToolOutput, ToolExecutionContext } from '../types';

export const queryMarketDataTool: AgentTool = {
  name: 'query_market_data',
  description: `Fetch external market data, comparable sales, and industry benchmarks. This provides context for valuation and market analysis.

Available data:
- Comparable sales transactions (SNF/ALF/ILF)
- Market cap rate benchmarks by state/region
- Industry occupancy and performance benchmarks
- Regional market conditions
- SNF/ALF reimbursement rate trends

Use this tool when:
- Validating valuation assumptions against market
- Finding comparable transactions
- Understanding regional market dynamics
- Setting benchmark expectations
- Justifying cap rate or price-per-bed assumptions`,

  inputSchema: {
    type: 'object',
    properties: {
      dataType: {
        type: 'string',
        description: 'Type of market data to fetch',
        enum: ['comparable_sales', 'cap_rate_benchmarks', 'occupancy_benchmarks', 'market_overview', 'reimbursement_rates'],
      },
      assetType: {
        type: 'string',
        description: 'Filter by asset type',
        enum: ['SNF', 'ALF', 'ILF'],
      },
      state: {
        type: 'string',
        description: 'State abbreviation for regional data',
      },
      region: {
        type: 'string',
        description: 'Geographic region (e.g., "west", "midwest", "northeast", "south")',
      },
      minBeds: {
        type: 'number',
        description: 'Minimum beds for comparable filtering',
      },
      maxBeds: {
        type: 'number',
        description: 'Maximum beds for comparable filtering',
      },
      lookbackMonths: {
        type: 'number',
        description: 'Months to look back for sales data (default: 24)',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return',
      },
    },
    required: ['dataType'],
  },

  requiresConfirmation: false,

  async execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolOutput> {
    const startTime = Date.now();

    const {
      dataType,
      assetType,
      state,
      region,
      minBeds,
      maxBeds,
      lookbackMonths = 24,
      limit = 10,
    } = input as {
      dataType: string;
      assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
      state?: string;
      region?: string;
      minBeds?: number;
      maxBeds?: number;
      lookbackMonths?: number;
      limit?: number;
    };

    try {
      let result: Record<string, unknown>;

      switch (dataType) {
        case 'comparable_sales':
          result = await getComparableSales({
            assetType,
            state,
            minBeds,
            maxBeds,
            lookbackMonths,
            limit,
          });
          break;
        case 'cap_rate_benchmarks':
          result = getCapRateBenchmarks(assetType, state, region);
          break;
        case 'occupancy_benchmarks':
          result = await getOccupancyBenchmarks(assetType, state);
          break;
        case 'market_overview':
          result = await getMarketOverview(assetType, state, region);
          break;
        case 'reimbursement_rates':
          result = getReimbursementRates(state);
          break;
        default:
          return {
            success: false,
            error: `Unknown data type: ${dataType}`,
            metadata: { executionTimeMs: Date.now() - startTime },
          };
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          dataType,
          filters: { assetType, state, region, minBeds, maxBeds },
          ...result,
          timestamp: new Date().toISOString(),
        },
        metadata: {
          executionTimeMs,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch market data',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  },
};

async function getComparableSales(params: {
  assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  state?: string;
  minBeds?: number;
  maxBeds?: number;
  lookbackMonths: number;
  limit: number;
}): Promise<Record<string, unknown>> {
  const { assetType, state, minBeds, maxBeds, lookbackMonths, limit } = params;

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - lookbackMonths);

  const conditions = [];
  conditions.push(gte(comparableSales.saleDate, cutoffDate.toISOString().split('T')[0]));

  if (assetType) {
    conditions.push(eq(comparableSales.assetType, assetType));
  }
  if (state) {
    conditions.push(eq(comparableSales.state, state.toUpperCase()));
  }
  if (minBeds !== undefined) {
    conditions.push(gte(comparableSales.beds, minBeds));
  }
  if (maxBeds !== undefined) {
    conditions.push(lte(comparableSales.beds, maxBeds));
  }

  const sales = await db
    .select()
    .from(comparableSales)
    .where(and(...conditions))
    .orderBy(desc(comparableSales.saleDate))
    .limit(limit);

  // Calculate statistics
  const prices = sales.map((s) => Number(s.salePrice)).filter((p) => p > 0);
  const capRates = sales.map((s) => Number(s.capRate)).filter((c) => c > 0);
  const pricesPerBed = sales.map((s) => Number(s.pricePerBed)).filter((p) => p > 0);

  return {
    count: sales.length,
    sales: sales.map((s) => ({
      propertyName: s.propertyName,
      city: s.city,
      state: s.state,
      assetType: s.assetType,
      beds: s.beds,
      saleDate: s.saleDate,
      salePrice: s.salePrice,
      pricePerBed: s.pricePerBed,
      capRate: s.capRate,
      noiAtSale: s.noiAtSale,
      occupancyAtSale: s.occupancyAtSale,
      buyer: s.buyer,
      seller: s.seller,
    })),
    statistics: {
      price: {
        median: calculateMedian(prices),
        average: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
        min: prices.length > 0 ? Math.min(...prices) : null,
        max: prices.length > 0 ? Math.max(...prices) : null,
      },
      capRate: {
        median: calculateMedian(capRates),
        average: capRates.length > 0 ? capRates.reduce((a, b) => a + b, 0) / capRates.length : null,
        min: capRates.length > 0 ? Math.min(...capRates) : null,
        max: capRates.length > 0 ? Math.max(...capRates) : null,
      },
      pricePerBed: {
        median: calculateMedian(pricesPerBed),
        average: pricesPerBed.length > 0 ? pricesPerBed.reduce((a, b) => a + b, 0) / pricesPerBed.length : null,
        min: pricesPerBed.length > 0 ? Math.min(...pricesPerBed) : null,
        max: pricesPerBed.length > 0 ? Math.max(...pricesPerBed) : null,
      },
    },
  };
}

function getCapRateBenchmarks(
  assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
  state?: string,
  region?: string
): Record<string, unknown> {
  // Market cap rate benchmarks by asset type
  const benchmarks = {
    SNF: {
      national: { low: 0.075, median: 0.085, high: 0.10 },
      byQuality: {
        premium: { low: 0.065, median: 0.075, high: 0.085 },
        average: { low: 0.08, median: 0.09, high: 0.10 },
        challenged: { low: 0.10, median: 0.115, high: 0.13 },
      },
      byRegion: {
        west: { low: 0.07, median: 0.08, high: 0.09 },
        northeast: { low: 0.065, median: 0.075, high: 0.085 },
        midwest: { low: 0.08, median: 0.09, high: 0.10 },
        south: { low: 0.075, median: 0.085, high: 0.095 },
      },
    },
    ALF: {
      national: { low: 0.06, median: 0.07, high: 0.085 },
      byQuality: {
        premium: { low: 0.055, median: 0.065, high: 0.075 },
        average: { low: 0.065, median: 0.075, high: 0.085 },
        challenged: { low: 0.08, median: 0.09, high: 0.10 },
      },
      byRegion: {
        west: { low: 0.055, median: 0.065, high: 0.075 },
        northeast: { low: 0.055, median: 0.065, high: 0.075 },
        midwest: { low: 0.065, median: 0.075, high: 0.085 },
        south: { low: 0.06, median: 0.07, high: 0.08 },
      },
    },
    ILF: {
      national: { low: 0.055, median: 0.065, high: 0.08 },
      byQuality: {
        premium: { low: 0.05, median: 0.055, high: 0.065 },
        average: { low: 0.055, median: 0.065, high: 0.075 },
        challenged: { low: 0.07, median: 0.08, high: 0.09 },
      },
      byRegion: {
        west: { low: 0.05, median: 0.06, high: 0.07 },
        northeast: { low: 0.05, median: 0.06, high: 0.07 },
        midwest: { low: 0.06, median: 0.07, high: 0.08 },
        south: { low: 0.055, median: 0.065, high: 0.075 },
      },
    },
    HOSPICE: {
      national: { low: 0.10, median: 0.12, high: 0.14 },
      byQuality: {
        premium: { low: 0.08, median: 0.10, high: 0.12 },
        average: { low: 0.10, median: 0.12, high: 0.14 },
        challenged: { low: 0.12, median: 0.14, high: 0.16 },
      },
      byRegion: {
        west: { low: 0.09, median: 0.11, high: 0.13 },
        northeast: { low: 0.10, median: 0.12, high: 0.14 },
        midwest: { low: 0.11, median: 0.13, high: 0.15 },
        south: { low: 0.10, median: 0.12, high: 0.14 },
      },
    },
  };

  // State to region mapping
  const stateToRegion: Record<string, string> = {
    WA: 'west', OR: 'west', CA: 'west', NV: 'west', AZ: 'west', ID: 'west', MT: 'west',
    WY: 'west', CO: 'west', UT: 'west', NM: 'west', AK: 'west', HI: 'west',
    ND: 'midwest', SD: 'midwest', NE: 'midwest', KS: 'midwest', MN: 'midwest',
    IA: 'midwest', MO: 'midwest', WI: 'midwest', IL: 'midwest', MI: 'midwest',
    IN: 'midwest', OH: 'midwest',
    TX: 'south', OK: 'south', AR: 'south', LA: 'south', MS: 'south', AL: 'south',
    TN: 'south', KY: 'south', WV: 'south', VA: 'south', NC: 'south', SC: 'south',
    GA: 'south', FL: 'south',
    ME: 'northeast', NH: 'northeast', VT: 'northeast', MA: 'northeast', RI: 'northeast',
    CT: 'northeast', NY: 'northeast', NJ: 'northeast', PA: 'northeast', DE: 'northeast',
    MD: 'northeast', DC: 'northeast',
  };

  const effectiveRegion = region || (state ? stateToRegion[state.toUpperCase()] : null);

  if (assetType) {
    const assetBenchmarks = benchmarks[assetType];
    return {
      assetType,
      national: assetBenchmarks.national,
      byQuality: assetBenchmarks.byQuality,
      regional: effectiveRegion
        ? { region: effectiveRegion, ...assetBenchmarks.byRegion[effectiveRegion as keyof typeof assetBenchmarks.byRegion] }
        : assetBenchmarks.byRegion,
      note: 'Cap rates reflect market conditions as of 2024. Actual rates may vary based on property quality, location, and market conditions.',
    };
  }

  return {
    benchmarks,
    regionalMapping: effectiveRegion ? { state, region: effectiveRegion } : null,
    note: 'Cap rates reflect market conditions as of 2024.',
  };
}

async function getOccupancyBenchmarks(
  assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
  state?: string
): Promise<Record<string, unknown>> {
  // Get occupancy data from CMS for SNFs
  if (assetType === 'SNF' || !assetType) {
    let conditions = [];
    if (state) {
      conditions.push(eq(cmsProviderData.state, state.toUpperCase()));
    }

    const occupancyData = await db
      .select({
        avgOccupancy: sql<number>`AVG(${cmsProviderData.averageResidentsPerDay}::numeric / NULLIF(${cmsProviderData.numberOfBeds}, 0))`,
        facilityCount: sql<number>`COUNT(*)`,
        state: cmsProviderData.state,
      })
      .from(cmsProviderData)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .groupBy(cmsProviderData.state);

    const nationalBenchmarks = {
      SNF: {
        national: { average: 0.82, good: 0.88, excellent: 0.92 },
        postPandemic: { average: 0.79, recovering: 0.84, strong: 0.88 },
      },
      ALF: {
        national: { average: 0.86, good: 0.90, excellent: 0.94 },
      },
      ILF: {
        national: { average: 0.88, good: 0.92, excellent: 0.95 },
      },
    };

    return {
      benchmarks: assetType ? nationalBenchmarks[assetType] : nationalBenchmarks,
      cmsData: state
        ? occupancyData.find((d) => d.state === state.toUpperCase())
        : { summary: 'State-level data available on request' },
      note: 'SNF occupancy benchmarks reflect post-COVID recovery trends. ALF/ILF benchmarks are national averages.',
    };
  }

  return {
    benchmarks: {
      ALF: { national: { average: 0.86, good: 0.90, excellent: 0.94 } },
      ILF: { national: { average: 0.88, good: 0.92, excellent: 0.95 } },
    },
    note: 'ALF and ILF do not have CMS-reported occupancy data.',
  };
}

async function getMarketOverview(
  assetType?: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
  state?: string,
  region?: string
): Promise<Record<string, unknown>> {
  const overview: {
    marketConditions: {
      overall: string;
      transactionVolume: string;
      capRateTrend: string;
      occupancyTrend: string;
      sectorSpecific?: Record<string, string>;
    };
    keyTrends: string[];
    riskFactors: string[];
    opportunities: string[];
  } = {
    marketConditions: {
      overall: 'Recovering',
      transactionVolume: 'Moderate',
      capRateTrend: 'Stable to slightly increasing',
      occupancyTrend: 'Recovering post-pandemic',
    },
    keyTrends: [
      'Continued post-pandemic occupancy recovery',
      'Labor cost pressures remain elevated',
      'Increased focus on quality metrics',
      'Value-add opportunities in turnaround situations',
      'Agency staffing reduction as key operational focus',
    ],
    riskFactors: [
      'Medicaid rate uncertainty in some states',
      'Labor market tightness',
      'Interest rate impact on cap rates',
      'Regulatory scrutiny increasing',
    ],
    opportunities: [
      'Distressed asset acquisitions',
      'Portfolio consolidation plays',
      'Quality improvement arbitrage',
      'Managed care contract optimization',
    ],
  };

  // Add asset-type specific insights
  if (assetType === 'SNF') {
    overview.marketConditions.sectorSpecific = {
      payerMixShift: 'Continued shift toward managed care',
      qualityFocus: 'CMS rating importance increasing',
      reimbursement: 'PDPM stabilizing, state Medicaid varies',
    };
  } else if (assetType === 'ALF') {
    overview.marketConditions.sectorSpecific = {
      demandDrivers: 'Strong demographic tailwinds',
      competitionLevel: 'Increasing in major markets',
      rateGrowth: 'Moderate rate growth achievable',
    };
  }

  return overview;
}

function getReimbursementRates(state?: string): Record<string, unknown> {
  // Medicare rates are national, Medicaid varies by state
  const rates = {
    medicare: {
      pdpmNational: {
        nursingComponent: { low: 100, median: 150, high: 250 },
        nta: { low: 20, median: 40, high: 80 },
        ptOt: { low: 30, median: 60, high: 120 },
        slp: { low: 10, median: 25, high: 50 },
      },
      averageDailyRate: { low: 450, median: 550, high: 700 },
      trend: 'Stable with annual adjustments',
    },
    medicaid: {
      note: 'Medicaid rates vary significantly by state',
      nationalRange: { low: 180, median: 220, high: 280 },
      topPayingStates: ['NY', 'CA', 'MA', 'NJ', 'CT'],
      lowestPayingStates: ['MS', 'AL', 'LA', 'AR', 'WV'],
      recentTrends: 'Many states implementing rate increases post-pandemic',
    },
    managedCare: {
      typicalDiscount: '5-15% below traditional Medicare',
      trend: 'Growing proportion of SNF days',
      negotiationFactors: ['Quality scores', 'Length of stay', 'Readmission rates'],
    },
    privatePay: {
      snfRange: { low: 250, median: 350, high: 500 },
      alfRange: { low: 150, median: 200, high: 300 },
      ilfRange: { low: 80, median: 120, high: 180 },
      trend: 'Steady rate growth in quality markets',
    },
  };

  if (state) {
    const stateRates: Record<string, { medicaidDailyRate: number; rateGrade: string }> = {
      CA: { medicaidDailyRate: 280, rateGrade: 'A' },
      NY: { medicaidDailyRate: 290, rateGrade: 'A' },
      TX: { medicaidDailyRate: 210, rateGrade: 'B' },
      FL: { medicaidDailyRate: 230, rateGrade: 'B' },
      WA: { medicaidDailyRate: 260, rateGrade: 'A-' },
      OR: { medicaidDailyRate: 245, rateGrade: 'B+' },
    };

    const stateData = stateRates[state.toUpperCase()];
    if (stateData) {
      return {
        ...rates,
        stateSpecific: {
          state: state.toUpperCase(),
          ...stateData,
        },
      };
    }
  }

  return rates;
}

function calculateMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default queryMarketDataTool;
