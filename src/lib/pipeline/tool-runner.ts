/**
 * Tool Auto-Runner
 *
 * Automatically executes relevant financial tools based on available extracted data.
 * Called during Phase 6 of the Smart Intake Pipeline.
 */

import type { ToolResult, ExtractedFinancialPeriod } from './types';

interface DealData {
  noi?: number;
  askingPrice?: number;
  totalRevenue?: number;
  totalExpenses?: number;
  occupancy?: number;
  beds: number;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  financialPeriods: ExtractedFinancialPeriod[];
}

type ToolCallback = (toolName: string, result: Record<string, unknown>) => void;

// ============================================================================
// MAIN RUNNER
// ============================================================================

export async function autoRunTools(
  dealData: DealData,
  onToolExecuted?: ToolCallback
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  // Cap Rate Calculator
  const capRateResult = runCapRate(dealData);
  results.push(capRateResult);
  if (capRateResult.status === 'success') {
    onToolExecuted?.('cap_rate', capRateResult.result || {});
  }

  // Debt Service Coverage
  const debtServiceResult = runDebtService(dealData);
  results.push(debtServiceResult);
  if (debtServiceResult.status === 'success') {
    onToolExecuted?.('debt_service', debtServiceResult.result || {});
  }

  // Price Per Bed
  const ppbResult = runPricePerBed(dealData);
  results.push(ppbResult);
  if (ppbResult.status === 'success') {
    onToolExecuted?.('price_per_bed', ppbResult.result || {});
  }

  // Sensitivity Analysis
  const sensitivityResult = runSensitivity(dealData);
  results.push(sensitivityResult);
  if (sensitivityResult.status === 'success') {
    onToolExecuted?.('sensitivity', sensitivityResult.result || {});
  }

  // Pro Forma Projection
  const proFormaResult = runProForma(dealData);
  results.push(proFormaResult);
  if (proFormaResult.status === 'success') {
    onToolExecuted?.('pro_forma', proFormaResult.result || {});
  }

  return results;
}

// ============================================================================
// CAP RATE CALCULATOR
// ============================================================================

function runCapRate(data: DealData): ToolResult {
  if (!data.noi || !data.askingPrice || data.askingPrice <= 0) {
    return {
      toolName: 'cap_rate',
      toolLabel: 'Cap Rate Calculator',
      status: 'skipped',
      reason: 'Missing NOI or asking price',
    };
  }

  const capRate = (data.noi / data.askingPrice) * 100;

  // SNF benchmark ranges
  const benchmarks: Record<string, { min: number; max: number; median: number }> = {
    SNF: { min: 7.5, max: 12.5, median: 10.0 },
    ALF: { min: 5.5, max: 7.5, median: 6.5 },
    ILF: { min: 5.0, max: 6.5, median: 5.75 },
    HOSPICE: { min: 9.0, max: 11.0, median: 10.0 },
  };

  const benchmark = benchmarks[data.assetType] || benchmarks.SNF;
  const isWithinRange = capRate >= benchmark.min && capRate <= benchmark.max;

  return {
    toolName: 'cap_rate',
    toolLabel: 'Cap Rate Calculator',
    status: 'success',
    result: {
      capRate: Math.round(capRate * 100) / 100,
      noi: data.noi,
      value: data.askingPrice,
      benchmark,
      isWithinRange,
      headline: `Cap rate: ${capRate.toFixed(2)}% (${isWithinRange ? 'within' : 'outside'} ${data.assetType} range)`,
    },
  };
}

// ============================================================================
// DEBT SERVICE COVERAGE
// ============================================================================

function runDebtService(data: DealData): ToolResult {
  if (!data.noi || !data.askingPrice) {
    return {
      toolName: 'debt_service',
      toolLabel: 'Debt Service Analysis',
      status: 'skipped',
      reason: 'Missing NOI or asking price',
    };
  }

  // Standard assumptions
  const ltv = 0.70;
  const interestRate = 0.065;
  const amortizationYears = 25;
  const loanAmount = data.askingPrice * ltv;

  // Monthly payment calculation (fixed-rate amortizing)
  const monthlyRate = interestRate / 12;
  const numPayments = amortizationYears * 12;
  const monthlyPayment =
    loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const annualDebtService = monthlyPayment * 12;
  const dscr = data.noi / annualDebtService;

  const isHealthy = dscr >= 1.25;

  return {
    toolName: 'debt_service',
    toolLabel: 'Debt Service Analysis',
    status: 'success',
    result: {
      loanAmount: Math.round(loanAmount),
      ltv,
      interestRate,
      amortizationYears,
      annualDebtService: Math.round(annualDebtService),
      dscr: Math.round(dscr * 100) / 100,
      isHealthy,
      headline: `DSCR: ${dscr.toFixed(2)}x at ${(ltv * 100).toFixed(0)}% LTV (${isHealthy ? 'healthy' : 'below 1.25x target'})`,
    },
  };
}

// ============================================================================
// PRICE PER BED
// ============================================================================

function runPricePerBed(data: DealData): ToolResult {
  if (!data.askingPrice || !data.beds || data.beds <= 0) {
    return {
      toolName: 'price_per_bed',
      toolLabel: 'Price Per Bed',
      status: 'skipped',
      reason: 'Missing asking price or bed count',
    };
  }

  const pricePerBed = data.askingPrice / data.beds;

  // Regional benchmarks (simplified national)
  const benchmarks: Record<string, { low: number; mid: number; high: number }> = {
    SNF: { low: 40000, mid: 75000, high: 120000 },
    ALF: { low: 75000, mid: 125000, high: 200000 },
    ILF: { low: 80000, mid: 150000, high: 250000 },
    HOSPICE: { low: 30000, mid: 60000, high: 100000 },
  };

  const benchmark = benchmarks[data.assetType] || benchmarks.SNF;
  const position =
    pricePerBed <= benchmark.low ? 'below market' :
    pricePerBed >= benchmark.high ? 'above market' : 'within market';

  return {
    toolName: 'price_per_bed',
    toolLabel: 'Price Per Bed',
    status: 'success',
    result: {
      pricePerBed: Math.round(pricePerBed),
      beds: data.beds,
      askingPrice: data.askingPrice,
      benchmark,
      position,
      headline: `$${Math.round(pricePerBed / 1000)}K/bed — ${position} range for ${data.assetType}`,
    },
  };
}

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

function runSensitivity(data: DealData): ToolResult {
  if (!data.noi || !data.askingPrice) {
    return {
      toolName: 'sensitivity',
      toolLabel: 'Sensitivity Analysis',
      status: 'skipped',
      reason: 'Missing NOI or asking price',
    };
  }

  // Cap rate sensitivity
  const capRates = [7, 8, 9, 10, 11, 12, 13];
  const capRateSensitivity = capRates.map((cr) => ({
    capRate: cr,
    impliedValue: Math.round(data.noi! / (cr / 100)),
    delta: Math.round(data.noi! / (cr / 100) - data.askingPrice!),
    deltaPercent: Math.round(((data.noi! / (cr / 100) - data.askingPrice!) / data.askingPrice!) * 100),
  }));

  // NOI sensitivity
  const noiDeltas = [-20, -10, -5, 0, 5, 10, 20];
  const baseCapRate = (data.noi / data.askingPrice) * 100;
  const noiSensitivity = noiDeltas.map((delta) => {
    const adjustedNoi = data.noi! * (1 + delta / 100);
    return {
      noiDelta: delta,
      adjustedNoi: Math.round(adjustedNoi),
      impliedCapRate: Math.round((adjustedNoi / data.askingPrice!) * 10000) / 100,
      impliedValue: Math.round(adjustedNoi / (baseCapRate / 100)),
    };
  });

  return {
    toolName: 'sensitivity',
    toolLabel: 'Sensitivity Analysis',
    status: 'success',
    result: {
      capRateSensitivity,
      noiSensitivity,
      baseCapRate: Math.round(baseCapRate * 100) / 100,
      baseNoi: data.noi,
      headline: `Sensitivity matrix: Value ranges $${Math.round(capRateSensitivity[capRateSensitivity.length - 1].impliedValue / 1_000_000)}M–$${Math.round(capRateSensitivity[0].impliedValue / 1_000_000)}M`,
    },
  };
}

// ============================================================================
// PRO FORMA PROJECTION
// ============================================================================

function runProForma(data: DealData): ToolResult {
  if (data.financialPeriods.length === 0 && !data.totalRevenue) {
    return {
      toolName: 'pro_forma',
      toolLabel: 'Pro Forma Projection',
      status: 'skipped',
      reason: 'No financial period data available',
    };
  }

  // Use most recent period or aggregated data
  const baseRevenue = data.totalRevenue ||
    (data.financialPeriods.length > 0 ? data.financialPeriods[data.financialPeriods.length - 1].revenue : 0);
  const baseExpenses = data.totalExpenses ||
    (data.financialPeriods.length > 0 ? data.financialPeriods[data.financialPeriods.length - 1].revenue - data.financialPeriods[data.financialPeriods.length - 1].noi : 0);

  if (!baseRevenue || baseRevenue <= 0) {
    return {
      toolName: 'pro_forma',
      toolLabel: 'Pro Forma Projection',
      status: 'skipped',
      reason: 'Revenue data is zero or unavailable',
    };
  }

  // Project 5 years with growth assumptions
  const revenueGrowth = 0.03; // 3% annual
  const expenseGrowth = 0.035; // 3.5% annual (labor pressure)

  const projections = Array.from({ length: 5 }, (_, i) => {
    const year = i + 1;
    const revenue = baseRevenue * Math.pow(1 + revenueGrowth, year);
    const expenses = baseExpenses * Math.pow(1 + expenseGrowth, year);
    const noi = revenue - expenses;
    return {
      year,
      revenue: Math.round(revenue),
      expenses: Math.round(expenses),
      noi: Math.round(noi),
      noiMargin: Math.round((noi / revenue) * 10000) / 100,
    };
  });

  return {
    toolName: 'pro_forma',
    toolLabel: 'Pro Forma Projection',
    status: 'success',
    result: {
      baseRevenue: Math.round(baseRevenue),
      baseExpenses: Math.round(baseExpenses),
      baseNoi: Math.round(baseRevenue - baseExpenses),
      assumptions: { revenueGrowth, expenseGrowth },
      projections,
      headline: `Year 5 NOI: $${Math.round(projections[4].noi / 1000)}K (${projections[4].noiMargin}% margin)`,
    },
  };
}
