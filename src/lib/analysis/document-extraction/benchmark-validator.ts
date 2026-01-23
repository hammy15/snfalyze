/**
 * Benchmark Validator
 *
 * Provides industry benchmarks for validating extracted financial data.
 * Used by the clarification engine to detect outliers.
 */

// ============================================================================
// Types
// ============================================================================

export interface FieldBenchmark {
  min: number;
  max: number;
  median: number;
  unit?: 'currency' | 'percent' | 'ratio' | 'count' | 'hours';
  description?: string;
}

export interface FacilityBenchmarks {
  [fieldName: string]: FieldBenchmark;
}

// ============================================================================
// SNF Benchmarks
// ============================================================================

const SNF_BENCHMARKS: FacilityBenchmarks = {
  // Revenue metrics (per bed per year)
  revenuePerBed: {
    min: 60000,
    max: 150000,
    median: 95000,
    unit: 'currency',
    description: 'Annual revenue per licensed bed',
  },
  totalRevenue: {
    min: 3000000,
    max: 50000000,
    median: 12000000,
    unit: 'currency',
    description: 'Total annual revenue',
  },

  // Payer mix (percentages)
  medicarePercent: {
    min: 0.05,
    max: 0.35,
    median: 0.15,
    unit: 'percent',
    description: 'Medicare as percent of revenue',
  },
  medicaidPercent: {
    min: 0.40,
    max: 0.85,
    median: 0.60,
    unit: 'percent',
    description: 'Medicaid as percent of revenue',
  },
  managedCarePercent: {
    min: 0.05,
    max: 0.30,
    median: 0.12,
    unit: 'percent',
    description: 'Managed care as percent of revenue',
  },
  privatePayPercent: {
    min: 0.02,
    max: 0.25,
    median: 0.08,
    unit: 'percent',
    description: 'Private pay as percent of revenue',
  },

  // Expense metrics
  laborCostPercent: {
    min: 0.45,
    max: 0.70,
    median: 0.55,
    unit: 'percent',
    description: 'Labor cost as percent of revenue',
  },
  agencyLaborPercent: {
    min: 0,
    max: 0.30,
    median: 0.08,
    unit: 'percent',
    description: 'Agency labor as percent of total labor',
  },
  managementFeePercent: {
    min: 0.03,
    max: 0.08,
    median: 0.05,
    unit: 'percent',
    description: 'Management fee as percent of revenue',
  },

  // Profitability
  noiMargin: {
    min: 0.05,
    max: 0.25,
    median: 0.12,
    unit: 'percent',
    description: 'NOI as percent of revenue',
  },
  ebitdarMargin: {
    min: 0.08,
    max: 0.30,
    median: 0.15,
    unit: 'percent',
    description: 'EBITDAR as percent of revenue',
  },

  // Operations
  occupancyRate: {
    min: 0.60,
    max: 0.98,
    median: 0.82,
    unit: 'percent',
    description: 'Average occupancy rate',
  },
  hppd: {
    min: 3.0,
    max: 5.5,
    median: 4.0,
    unit: 'hours',
    description: 'Total nursing hours per patient day',
  },
  rnHppd: {
    min: 0.4,
    max: 1.5,
    median: 0.75,
    unit: 'hours',
    description: 'RN hours per patient day',
  },

  // Facility metrics
  licensedBeds: {
    min: 30,
    max: 300,
    median: 100,
    unit: 'count',
    description: 'Number of licensed beds',
  },
  averageDailyCensus: {
    min: 20,
    max: 280,
    median: 82,
    unit: 'count',
    description: 'Average daily census',
  },

  // Valuation metrics
  pricePerBed: {
    min: 30000,
    max: 175000,
    median: 85000,
    unit: 'currency',
    description: 'Price per licensed bed',
  },
  capRate: {
    min: 0.06,
    max: 0.13,
    median: 0.085,
    unit: 'percent',
    description: 'Cap rate',
  },
};

// ============================================================================
// ALF Benchmarks
// ============================================================================

const ALF_BENCHMARKS: FacilityBenchmarks = {
  // Revenue metrics
  revenuePerBed: {
    min: 40000,
    max: 120000,
    median: 65000,
    unit: 'currency',
    description: 'Annual revenue per unit',
  },
  totalRevenue: {
    min: 2000000,
    max: 30000000,
    median: 8000000,
    unit: 'currency',
    description: 'Total annual revenue',
  },

  // Payer mix
  privatePayPercent: {
    min: 0.70,
    max: 0.95,
    median: 0.85,
    unit: 'percent',
    description: 'Private pay as percent of revenue',
  },
  medicaidPercent: {
    min: 0.02,
    max: 0.25,
    median: 0.10,
    unit: 'percent',
    description: 'Medicaid waiver as percent of revenue',
  },

  // Expense metrics
  laborCostPercent: {
    min: 0.35,
    max: 0.55,
    median: 0.45,
    unit: 'percent',
    description: 'Labor cost as percent of revenue',
  },
  managementFeePercent: {
    min: 0.04,
    max: 0.08,
    median: 0.05,
    unit: 'percent',
    description: 'Management fee as percent of revenue',
  },

  // Profitability
  noiMargin: {
    min: 0.15,
    max: 0.35,
    median: 0.25,
    unit: 'percent',
    description: 'NOI as percent of revenue',
  },

  // Operations
  occupancyRate: {
    min: 0.70,
    max: 0.98,
    median: 0.88,
    unit: 'percent',
    description: 'Average occupancy rate',
  },
  licensedBeds: {
    min: 20,
    max: 200,
    median: 80,
    unit: 'count',
    description: 'Number of units',
  },

  // Valuation
  pricePerBed: {
    min: 50000,
    max: 200000,
    median: 100000,
    unit: 'currency',
    description: 'Price per unit',
  },
  capRate: {
    min: 0.05,
    max: 0.10,
    median: 0.07,
    unit: 'percent',
    description: 'Cap rate',
  },
};

// ============================================================================
// ILF Benchmarks
// ============================================================================

const ILF_BENCHMARKS: FacilityBenchmarks = {
  // Revenue metrics
  revenuePerBed: {
    min: 25000,
    max: 80000,
    median: 45000,
    unit: 'currency',
    description: 'Annual revenue per unit',
  },
  totalRevenue: {
    min: 1500000,
    max: 20000000,
    median: 5000000,
    unit: 'currency',
    description: 'Total annual revenue',
  },

  // Payer mix
  privatePayPercent: {
    min: 0.90,
    max: 1.0,
    median: 0.98,
    unit: 'percent',
    description: 'Private pay as percent of revenue',
  },

  // Expense metrics
  laborCostPercent: {
    min: 0.25,
    max: 0.45,
    median: 0.35,
    unit: 'percent',
    description: 'Labor cost as percent of revenue',
  },
  managementFeePercent: {
    min: 0.03,
    max: 0.06,
    median: 0.04,
    unit: 'percent',
    description: 'Management fee as percent of revenue',
  },

  // Profitability
  noiMargin: {
    min: 0.20,
    max: 0.45,
    median: 0.32,
    unit: 'percent',
    description: 'NOI as percent of revenue',
  },

  // Operations
  occupancyRate: {
    min: 0.80,
    max: 0.99,
    median: 0.92,
    unit: 'percent',
    description: 'Average occupancy rate',
  },
  licensedBeds: {
    min: 30,
    max: 300,
    median: 100,
    unit: 'count',
    description: 'Number of units',
  },

  // Valuation
  pricePerBed: {
    min: 75000,
    max: 250000,
    median: 125000,
    unit: 'currency',
    description: 'Price per unit',
  },
  capRate: {
    min: 0.045,
    max: 0.085,
    median: 0.065,
    unit: 'percent',
    description: 'Cap rate',
  },
};

// ============================================================================
// Benchmark Access Functions
// ============================================================================

/**
 * Get benchmarks for a specific facility type
 */
export function getBenchmarks(facilityType: 'SNF' | 'ALF' | 'ILF'): FacilityBenchmarks {
  switch (facilityType) {
    case 'SNF':
      return SNF_BENCHMARKS;
    case 'ALF':
      return ALF_BENCHMARKS;
    case 'ILF':
      return ILF_BENCHMARKS;
    default:
      return SNF_BENCHMARKS;
  }
}

/**
 * Get a specific field benchmark
 */
export function getFieldBenchmark(
  facilityType: 'SNF' | 'ALF' | 'ILF',
  fieldName: string
): FieldBenchmark | undefined {
  const benchmarks = getBenchmarks(facilityType);
  return benchmarks[fieldName];
}

/**
 * Validate a value against its benchmark
 */
export function validateAgainstBenchmark(
  value: number,
  benchmark: FieldBenchmark
): {
  isValid: boolean;
  variance: number;
  position: 'below' | 'within' | 'above';
  severity: 'ok' | 'warning' | 'critical';
} {
  let position: 'below' | 'within' | 'above';
  let variance = 0;

  if (value < benchmark.min) {
    position = 'below';
    variance = (benchmark.min - value) / benchmark.min;
  } else if (value > benchmark.max) {
    position = 'above';
    variance = (value - benchmark.max) / benchmark.max;
  } else {
    position = 'within';
    variance = 0;
  }

  let severity: 'ok' | 'warning' | 'critical';
  if (variance === 0) {
    severity = 'ok';
  } else if (variance <= 0.20) {
    severity = 'warning';
  } else {
    severity = 'critical';
  }

  return {
    isValid: position === 'within',
    variance,
    position,
    severity,
  };
}

/**
 * Get percentile position of a value within the benchmark range
 */
export function getPercentilePosition(
  value: number,
  benchmark: FieldBenchmark
): number {
  if (value <= benchmark.min) return 0;
  if (value >= benchmark.max) return 100;

  const range = benchmark.max - benchmark.min;
  const position = (value - benchmark.min) / range;
  return Math.round(position * 100);
}

/**
 * Compare a value to market median
 */
export function compareToMedian(
  value: number,
  benchmark: FieldBenchmark
): {
  percentDifference: number;
  description: string;
} {
  const diff = (value - benchmark.median) / benchmark.median;
  const percentDiff = Math.round(diff * 100);

  let description: string;
  if (Math.abs(percentDiff) <= 5) {
    description = 'At market median';
  } else if (percentDiff > 0) {
    description = `${percentDiff}% above market median`;
  } else {
    description = `${Math.abs(percentDiff)}% below market median`;
  }

  return {
    percentDifference: percentDiff,
    description,
  };
}

// ============================================================================
// Regional Benchmark Adjustments
// ============================================================================

const REGIONAL_ADJUSTMENTS: Record<string, Record<string, number>> = {
  CA: { revenuePerBed: 1.25, laborCostPercent: 1.15, pricePerBed: 1.30 },
  NY: { revenuePerBed: 1.20, laborCostPercent: 1.10, pricePerBed: 1.25 },
  TX: { revenuePerBed: 0.90, laborCostPercent: 0.95, pricePerBed: 0.85 },
  FL: { revenuePerBed: 0.95, laborCostPercent: 1.00, pricePerBed: 0.95 },
  WA: { revenuePerBed: 1.10, laborCostPercent: 1.05, pricePerBed: 1.10 },
  OR: { revenuePerBed: 1.05, laborCostPercent: 1.05, pricePerBed: 1.05 },
};

/**
 * Get regionally adjusted benchmarks
 */
export function getRegionalBenchmarks(
  facilityType: 'SNF' | 'ALF' | 'ILF',
  state: string
): FacilityBenchmarks {
  const baseBenchmarks = getBenchmarks(facilityType);
  const adjustments = REGIONAL_ADJUSTMENTS[state.toUpperCase()];

  if (!adjustments) {
    return baseBenchmarks;
  }

  const adjustedBenchmarks: FacilityBenchmarks = {};

  for (const [fieldName, benchmark] of Object.entries(baseBenchmarks)) {
    const adjustment = adjustments[fieldName] || 1.0;
    adjustedBenchmarks[fieldName] = {
      ...benchmark,
      min: benchmark.min * adjustment,
      max: benchmark.max * adjustment,
      median: benchmark.median * adjustment,
    };
  }

  return adjustedBenchmarks;
}

export default {
  getBenchmarks,
  getFieldBenchmark,
  validateAgainstBenchmark,
  getPercentilePosition,
  compareToMedian,
  getRegionalBenchmarks,
};
