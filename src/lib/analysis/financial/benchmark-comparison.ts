// =============================================================================
// BENCHMARK COMPARISON - Compare facility metrics against industry benchmarks
// =============================================================================

import type { AssetType } from '@/lib/admin/algorithm-settings';
import type {
  FinancialStatement,
  OperatingMetrics,
  FacilityProfile,
  CMSData,
} from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface BenchmarkSet {
  assetType: AssetType;
  region?: string;
  source: string;
  effectiveDate: string;
  benchmarks: Benchmark[];
}

export interface Benchmark {
  metric: string;
  name: string;
  category: 'financial' | 'operational' | 'quality' | 'staffing';
  unit: 'currency' | 'percentage' | 'number' | 'ratio';
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  mean: number;
  description?: string;
}

export interface BenchmarkComparison {
  metric: string;
  name: string;
  actualValue: number;
  benchmarkP50: number;
  percentile: number;
  rating: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  variance: number;
  variancePercent: number;
}

export interface FacilityBenchmarkReport {
  facility: {
    id: string;
    name: string;
    assetType: AssetType;
  };
  reportDate: string;
  comparisons: {
    financial: BenchmarkComparison[];
    operational: BenchmarkComparison[];
    quality: BenchmarkComparison[];
    staffing: BenchmarkComparison[];
  };
  overallScore: number;
  overallRating: 'excellent' | 'good' | 'average' | 'below_average' | 'poor';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

// =============================================================================
// BENCHMARK DATA - Industry averages for SNF/ALF/ILF
// =============================================================================

export const SNF_BENCHMARKS: BenchmarkSet = {
  assetType: 'SNF',
  source: 'Industry Composite 2024',
  effectiveDate: '2024-12-31',
  benchmarks: [
    // Financial Benchmarks
    {
      metric: 'revenue_per_patient_day',
      name: 'Revenue Per Patient Day',
      category: 'financial',
      unit: 'currency',
      percentiles: { p10: 280, p25: 310, p50: 350, p75: 400, p90: 475 },
      mean: 355,
    },
    {
      metric: 'revenue_per_bed',
      name: 'Revenue Per Bed',
      category: 'financial',
      unit: 'currency',
      percentiles: { p10: 85000, p25: 95000, p50: 110000, p75: 130000, p90: 160000 },
      mean: 115000,
    },
    {
      metric: 'ebitdar_margin',
      name: 'EBITDAR Margin',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.04, p25: 0.08, p50: 0.12, p75: 0.16, p90: 0.22 },
      mean: 0.12,
    },
    {
      metric: 'noi_margin',
      name: 'NOI Margin',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.02, p25: 0.05, p50: 0.09, p75: 0.13, p90: 0.18 },
      mean: 0.09,
    },
    {
      metric: 'labor_cost_percent',
      name: 'Labor Cost %',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.48, p25: 0.52, p50: 0.56, p75: 0.62, p90: 0.68 },
      mean: 0.56,
    },
    {
      metric: 'agency_percent',
      name: 'Agency Labor %',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.01, p25: 0.02, p50: 0.05, p75: 0.10, p90: 0.18 },
      mean: 0.06,
    },

    // Operational Benchmarks
    {
      metric: 'occupancy_rate',
      name: 'Occupancy Rate',
      category: 'operational',
      unit: 'percentage',
      percentiles: { p10: 0.68, p25: 0.75, p50: 0.82, p75: 0.88, p90: 0.93 },
      mean: 0.81,
    },
    {
      metric: 'medicare_mix',
      name: 'Medicare Mix %',
      category: 'operational',
      unit: 'percentage',
      percentiles: { p10: 0.08, p25: 0.12, p50: 0.18, p75: 0.25, p90: 0.35 },
      mean: 0.19,
    },
    {
      metric: 'medicaid_mix',
      name: 'Medicaid Mix %',
      category: 'operational',
      unit: 'percentage',
      percentiles: { p10: 0.35, p25: 0.45, p50: 0.55, p75: 0.65, p90: 0.75 },
      mean: 0.55,
    },
    {
      metric: 'private_pay_mix',
      name: 'Private Pay Mix %',
      category: 'operational',
      unit: 'percentage',
      percentiles: { p10: 0.05, p25: 0.10, p50: 0.18, p75: 0.28, p90: 0.40 },
      mean: 0.19,
    },

    // Quality Benchmarks
    {
      metric: 'cms_overall_rating',
      name: 'CMS Overall Rating',
      category: 'quality',
      unit: 'number',
      percentiles: { p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 },
      mean: 3.0,
    },
    {
      metric: 'health_inspection_rating',
      name: 'Health Inspection Rating',
      category: 'quality',
      unit: 'number',
      percentiles: { p10: 1, p25: 2, p50: 3, p75: 4, p90: 5 },
      mean: 2.9,
    },
    {
      metric: 'total_deficiencies',
      name: 'Total Deficiencies',
      category: 'quality',
      unit: 'number',
      percentiles: { p10: 2, p25: 4, p50: 7, p75: 12, p90: 18 },
      mean: 8.2,
    },

    // Staffing Benchmarks
    {
      metric: 'rn_hppd',
      name: 'RN Hours Per Patient Day',
      category: 'staffing',
      unit: 'number',
      percentiles: { p10: 0.30, p25: 0.40, p50: 0.55, p75: 0.75, p90: 1.00 },
      mean: 0.58,
    },
    {
      metric: 'total_nursing_hppd',
      name: 'Total Nursing HPPD',
      category: 'staffing',
      unit: 'number',
      percentiles: { p10: 3.2, p25: 3.6, p50: 4.0, p75: 4.5, p90: 5.2 },
      mean: 4.1,
    },
    {
      metric: 'turnover_rate',
      name: 'Staff Turnover Rate',
      category: 'staffing',
      unit: 'percentage',
      percentiles: { p10: 0.25, p25: 0.35, p50: 0.50, p75: 0.65, p90: 0.80 },
      mean: 0.52,
    },
  ],
};

export const ALF_BENCHMARKS: BenchmarkSet = {
  assetType: 'ALF',
  source: 'Industry Composite 2024',
  effectiveDate: '2024-12-31',
  benchmarks: [
    // Financial Benchmarks
    {
      metric: 'revenue_per_unit',
      name: 'Revenue Per Unit',
      category: 'financial',
      unit: 'currency',
      percentiles: { p10: 40000, p25: 48000, p50: 58000, p75: 72000, p90: 90000 },
      mean: 60000,
    },
    {
      metric: 'monthly_rate',
      name: 'Average Monthly Rate',
      category: 'financial',
      unit: 'currency',
      percentiles: { p10: 3500, p25: 4200, p50: 5000, p75: 6200, p90: 8000 },
      mean: 5200,
    },
    {
      metric: 'ebitdar_margin',
      name: 'EBITDAR Margin',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.15, p25: 0.20, p50: 0.28, p75: 0.35, p90: 0.42 },
      mean: 0.28,
    },
    {
      metric: 'labor_cost_percent',
      name: 'Labor Cost %',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.35, p25: 0.40, p50: 0.45, p75: 0.52, p90: 0.58 },
      mean: 0.46,
    },

    // Operational Benchmarks
    {
      metric: 'occupancy_rate',
      name: 'Occupancy Rate',
      category: 'operational',
      unit: 'percentage',
      percentiles: { p10: 0.72, p25: 0.80, p50: 0.87, p75: 0.92, p90: 0.96 },
      mean: 0.86,
    },
    {
      metric: 'average_length_of_stay',
      name: 'Average Length of Stay (months)',
      category: 'operational',
      unit: 'number',
      percentiles: { p10: 18, p25: 24, p50: 30, p75: 38, p90: 48 },
      mean: 31,
    },
  ],
};

export const ILF_BENCHMARKS: BenchmarkSet = {
  assetType: 'ILF',
  source: 'Industry Composite 2024',
  effectiveDate: '2024-12-31',
  benchmarks: [
    // Financial Benchmarks
    {
      metric: 'revenue_per_unit',
      name: 'Revenue Per Unit',
      category: 'financial',
      unit: 'currency',
      percentiles: { p10: 24000, p25: 30000, p50: 38000, p75: 48000, p90: 65000 },
      mean: 40000,
    },
    {
      metric: 'monthly_rate',
      name: 'Average Monthly Rate',
      category: 'financial',
      unit: 'currency',
      percentiles: { p10: 2000, p25: 2500, p50: 3200, p75: 4200, p90: 5500 },
      mean: 3400,
    },
    {
      metric: 'ebitdar_margin',
      name: 'EBITDAR Margin',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.25, p25: 0.32, p50: 0.40, p75: 0.48, p90: 0.55 },
      mean: 0.40,
    },
    {
      metric: 'labor_cost_percent',
      name: 'Labor Cost %',
      category: 'financial',
      unit: 'percentage',
      percentiles: { p10: 0.18, p25: 0.22, p50: 0.28, p75: 0.35, p90: 0.42 },
      mean: 0.29,
    },

    // Operational Benchmarks
    {
      metric: 'occupancy_rate',
      name: 'Occupancy Rate',
      category: 'operational',
      unit: 'percentage',
      percentiles: { p10: 0.78, p25: 0.85, p50: 0.91, p75: 0.95, p90: 0.98 },
      mean: 0.90,
    },
  ],
};

// =============================================================================
// BENCHMARK COMPARISON CLASS
// =============================================================================

export class BenchmarkComparator {
  private benchmarks: Map<AssetType, BenchmarkSet>;

  constructor() {
    this.benchmarks = new Map([
      ['SNF', SNF_BENCHMARKS],
      ['ALF', ALF_BENCHMARKS],
      ['ILF', ILF_BENCHMARKS],
    ]);
  }

  /**
   * Generate a full benchmark report for a facility
   */
  generateReport(
    facility: FacilityProfile,
    financials: FinancialStatement,
    operations?: OperatingMetrics,
    cmsData?: CMSData
  ): FacilityBenchmarkReport {
    const benchmarkSet = this.benchmarks.get(facility.assetType);
    if (!benchmarkSet) {
      throw new Error(`No benchmarks available for asset type: ${facility.assetType}`);
    }

    const comparisons: FacilityBenchmarkReport['comparisons'] = {
      financial: [],
      operational: [],
      quality: [],
      staffing: [],
    };

    // Extract actual values
    const actualValues = this.extractActualValues(facility, financials, operations, cmsData);

    // Compare each metric
    for (const benchmark of benchmarkSet.benchmarks) {
      const actualValue = actualValues[benchmark.metric];
      if (actualValue !== undefined) {
        const comparison = this.compareTobenchmark(actualValue, benchmark);
        comparisons[benchmark.category].push(comparison);
      }
    }

    // Calculate overall score (weighted average of percentiles)
    const allComparisons = [
      ...comparisons.financial,
      ...comparisons.operational,
      ...comparisons.quality,
      ...comparisons.staffing,
    ];

    const overallScore = this.calculateOverallScore(allComparisons);
    const overallRating = this.percentileToRating(overallScore);

    // Generate insights
    const { strengths, weaknesses, recommendations } = this.generateInsights(comparisons);

    return {
      facility: {
        id: facility.id,
        name: facility.name,
        assetType: facility.assetType,
      },
      reportDate: new Date().toISOString(),
      comparisons,
      overallScore,
      overallRating,
      strengths,
      weaknesses,
      recommendations,
    };
  }

  /**
   * Compare a single value to its benchmark
   */
  compareTobenchmark(actualValue: number, benchmark: Benchmark): BenchmarkComparison {
    const { percentiles, mean } = benchmark;
    const percentile = this.calculatePercentile(actualValue, percentiles, benchmark.metric);

    // Some metrics are "lower is better" (deficiencies, labor cost, etc.)
    const lowerIsBetter = this.isLowerBetter(benchmark.metric);
    const effectivePercentile = lowerIsBetter ? 100 - percentile : percentile;

    return {
      metric: benchmark.metric,
      name: benchmark.name,
      actualValue,
      benchmarkP50: percentiles.p50,
      percentile: effectivePercentile,
      rating: this.percentileToRating(effectivePercentile),
      variance: actualValue - percentiles.p50,
      variancePercent: percentiles.p50 !== 0 ? (actualValue - percentiles.p50) / percentiles.p50 : 0,
    };
  }

  /**
   * Get benchmark for specific metric
   */
  getBenchmark(assetType: AssetType, metric: string): Benchmark | null {
    const benchmarkSet = this.benchmarks.get(assetType);
    if (!benchmarkSet) return null;
    return benchmarkSet.benchmarks.find((b) => b.metric === metric) || null;
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Extract actual values from facility data
   */
  private extractActualValues(
    facility: FacilityProfile,
    financials: FinancialStatement,
    operations?: OperatingMetrics,
    cmsData?: CMSData
  ): Record<string, number> {
    const values: Record<string, number> = {};

    // Financial metrics
    values.revenue_per_patient_day = financials.metrics.revenuePerPatientDay;
    values.revenue_per_bed = financials.metrics.revenuePerBed;
    values.ebitdar_margin = financials.metrics.ebitdarMargin;
    values.noi_margin = financials.metrics.noiMargin;
    values.labor_cost_percent = financials.metrics.laborCostPercent;

    // Calculate agency percent from expenses
    const agencyExpense = financials.expenses.items.find((i) => i.category === 'agency_nursing');
    if (agencyExpense && financials.expenses.totalLaborExpense > 0) {
      values.agency_percent = agencyExpense.amount / financials.expenses.totalLaborExpense;
    }

    // Operational metrics
    if (operations) {
      values.occupancy_rate = operations.occupancyRate / 100;
      values.medicare_mix = (operations.payerMix.medicareA + operations.payerMix.medicareAdvantage) / 100;
      values.medicaid_mix = operations.payerMix.medicaid / 100;
      values.private_pay_mix = operations.payerMix.privatePay / 100;
    }

    // CMS data
    if (cmsData) {
      values.cms_overall_rating = cmsData.overallRating;
      values.health_inspection_rating = cmsData.healthInspectionRating;
      values.total_deficiencies = cmsData.totalDeficiencies;
      values.rn_hppd = cmsData.reportedRNStaffingHoursPerResidentDay;
      values.total_nursing_hppd = cmsData.reportedTotalNurseStaffingHoursPerResidentDay;
    }

    // Staffing from operations
    if (operations?.staffing) {
      values.rn_hppd = values.rn_hppd || operations.staffing.rnHPPD;
      values.total_nursing_hppd = values.total_nursing_hppd || operations.staffing.totalHPPD;
      values.turnover_rate = operations.staffing.turnoverRate / 100;
    }

    return values;
  }

  /**
   * Calculate percentile for a value
   */
  private calculatePercentile(
    value: number,
    percentiles: Benchmark['percentiles'],
    metric: string
  ): number {
    const { p10, p25, p50, p75, p90 } = percentiles;

    // Linear interpolation between percentile points
    if (value <= p10) return 10 * (value / p10);
    if (value <= p25) return 10 + 15 * ((value - p10) / (p25 - p10));
    if (value <= p50) return 25 + 25 * ((value - p25) / (p50 - p25));
    if (value <= p75) return 50 + 25 * ((value - p50) / (p75 - p50));
    if (value <= p90) return 75 + 15 * ((value - p75) / (p90 - p75));
    return Math.min(100, 90 + 10 * ((value - p90) / (p90 - p75)));
  }

  /**
   * Determine if lower values are better for a metric
   */
  private isLowerBetter(metric: string): boolean {
    const lowerIsBetterMetrics = [
      'labor_cost_percent',
      'agency_percent',
      'total_deficiencies',
      'turnover_rate',
      'medicaid_mix', // Generally lower is better for financial performance
    ];
    return lowerIsBetterMetrics.includes(metric);
  }

  /**
   * Convert percentile to rating
   */
  private percentileToRating(
    percentile: number
  ): 'excellent' | 'good' | 'average' | 'below_average' | 'poor' {
    if (percentile >= 75) return 'excellent';
    if (percentile >= 55) return 'good';
    if (percentile >= 35) return 'average';
    if (percentile >= 15) return 'below_average';
    return 'poor';
  }

  /**
   * Calculate overall score from comparisons
   */
  private calculateOverallScore(comparisons: BenchmarkComparison[]): number {
    if (comparisons.length === 0) return 50;

    // Weight categories differently
    const categoryWeights: Record<string, number> = {
      financial: 0.35,
      operational: 0.30,
      quality: 0.20,
      staffing: 0.15,
    };

    let totalWeight = 0;
    let weightedSum = 0;

    for (const comparison of comparisons) {
      // Determine category from metric name patterns
      let category = 'operational';
      if (comparison.metric.includes('margin') || comparison.metric.includes('cost') || comparison.metric.includes('revenue')) {
        category = 'financial';
      } else if (comparison.metric.includes('rating') || comparison.metric.includes('deficien')) {
        category = 'quality';
      } else if (comparison.metric.includes('hppd') || comparison.metric.includes('turnover') || comparison.metric.includes('agency')) {
        category = 'staffing';
      }

      const weight = categoryWeights[category] || 0.25;
      totalWeight += weight;
      weightedSum += comparison.percentile * weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 50;
  }

  /**
   * Generate insights from comparisons
   */
  private generateInsights(comparisons: FacilityBenchmarkReport['comparisons']): {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    const allComparisons = [
      ...comparisons.financial.map((c) => ({ ...c, category: 'financial' })),
      ...comparisons.operational.map((c) => ({ ...c, category: 'operational' })),
      ...comparisons.quality.map((c) => ({ ...c, category: 'quality' })),
      ...comparisons.staffing.map((c) => ({ ...c, category: 'staffing' })),
    ];

    // Identify strengths (top performers)
    for (const comparison of allComparisons) {
      if (comparison.rating === 'excellent') {
        strengths.push(`${comparison.name} performing in top quartile (${comparison.percentile.toFixed(0)}th percentile)`);
      } else if (comparison.rating === 'good') {
        strengths.push(`${comparison.name} performing above average`);
      }
    }

    // Identify weaknesses
    for (const comparison of allComparisons) {
      if (comparison.rating === 'poor') {
        weaknesses.push(
          `${comparison.name} significantly below benchmark (${comparison.variancePercent > 0 ? '+' : ''}${(comparison.variancePercent * 100).toFixed(1)}% vs median)`
        );
        recommendations.push(this.getRecommendation(comparison.metric, comparison.variancePercent));
      } else if (comparison.rating === 'below_average') {
        weaknesses.push(`${comparison.name} below industry average`);
      }
    }

    return {
      strengths: strengths.slice(0, 5),
      weaknesses: weaknesses.slice(0, 5),
      recommendations: recommendations.filter((r) => r).slice(0, 5),
    };
  }

  /**
   * Get recommendation for underperforming metric
   */
  private getRecommendation(metric: string, variance: number): string {
    const recommendations: Record<string, string> = {
      occupancy_rate: 'Focus on census building through enhanced marketing and referral relationships',
      labor_cost_percent: 'Review staffing patterns and consider operational efficiency improvements',
      agency_percent: 'Invest in recruitment and retention programs to reduce agency dependency',
      ebitdar_margin: 'Analyze revenue enhancement opportunities and cost control measures',
      cms_overall_rating: 'Implement quality improvement initiatives to address deficiency patterns',
      total_deficiencies: 'Conduct mock surveys and enhance compliance monitoring systems',
      rn_hppd: 'Evaluate RN staffing levels against acuity requirements',
      turnover_rate: 'Improve employee engagement and competitive compensation packages',
    };

    return recommendations[metric] || '';
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const benchmarkComparator = new BenchmarkComparator();
