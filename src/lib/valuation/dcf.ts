/**
 * Discounted Cash Flow (DCF) Valuation Method
 *
 * Value = Sum of discounted future cash flows + discounted terminal value
 */

import {
  ValuationInput,
  ValuationResult,
  ValuationAssumption,
  ValuationCalculation,
} from './types';

export interface DCFOptions {
  projectionYears?: number;
  discountRate?: number;
  terminalCapRate?: number;
  revenueGrowthRate?: number;
  expenseGrowthRate?: number;
  exitYear?: number;
  rentEscalation?: number;
}

// Default DCF assumptions by asset type
const DEFAULT_DCF_ASSUMPTIONS: Record<string, {
  discountRate: number;
  terminalCapRate: number;
  revenueGrowth: number;
  expenseGrowth: number;
}> = {
  SNF: {
    discountRate: 0.12,
    terminalCapRate: 0.11,
    revenueGrowth: 0.025,
    expenseGrowth: 0.03,
  },
  ALF: {
    discountRate: 0.10,
    terminalCapRate: 0.085,
    revenueGrowth: 0.03,
    expenseGrowth: 0.025,
  },
  ILF: {
    discountRate: 0.09,
    terminalCapRate: 0.075,
    revenueGrowth: 0.035,
    expenseGrowth: 0.025,
  },
};

/**
 * Project cash flows for each year
 */
function projectCashFlows(
  baseNOI: number,
  years: number,
  revenueGrowth: number,
  expenseGrowth: number,
  baseRevenue?: number,
  baseExpenses?: number
): { year: number; noi: number; revenue?: number; expenses?: number }[] {
  const cashFlows: { year: number; noi: number; revenue?: number; expenses?: number }[] = [];

  // If we have detailed data, project separately
  if (baseRevenue && baseExpenses) {
    let revenue = baseRevenue;
    let expenses = baseExpenses;

    for (let year = 1; year <= years; year++) {
      revenue *= (1 + revenueGrowth);
      expenses *= (1 + expenseGrowth);
      const noi = revenue - expenses;

      cashFlows.push({
        year,
        noi,
        revenue,
        expenses,
      });
    }
  } else {
    // Simple NOI growth projection
    // Assume expenses grow faster than revenue, so NOI growth is lower
    const noiGrowth = revenueGrowth - (expenseGrowth - revenueGrowth) * 0.5;
    let noi = baseNOI;

    for (let year = 1; year <= years; year++) {
      noi *= (1 + noiGrowth);
      cashFlows.push({ year, noi });
    }
  }

  return cashFlows;
}

/**
 * Calculate present value of a future cash flow
 */
function presentValue(futureValue: number, discountRate: number, years: number): number {
  return futureValue / Math.pow(1 + discountRate, years);
}

/**
 * Calculate terminal value using exit cap rate
 */
function calculateTerminalValue(finalYearNOI: number, terminalCapRate: number): number {
  return finalYearNOI / terminalCapRate;
}

/**
 * Calculate value using DCF method
 */
export function calculateDCFValue(
  input: ValuationInput,
  options: DCFOptions = {}
): ValuationResult {
  const assumptions: ValuationAssumption[] = [];
  const calculations: ValuationCalculation[] = [];

  // Validate required inputs
  if (!input.noi && !input.ebitdar) {
    throw new Error('DCF valuation requires NOI or EBITDAR');
  }

  // Get defaults based on asset type
  const defaults = DEFAULT_DCF_ASSUMPTIONS[input.assetType] || DEFAULT_DCF_ASSUMPTIONS.SNF;

  // Determine inputs
  const projectionYears = options.projectionYears ?? input.projectionYears ?? 10;
  const discountRate = options.discountRate ?? input.discountRate ?? defaults.discountRate;
  const terminalCapRate = options.terminalCapRate ?? input.terminalCapRate ?? defaults.terminalCapRate;
  const revenueGrowthRate = options.revenueGrowthRate ?? input.revenueGrowthRate ?? defaults.revenueGrowth;
  const expenseGrowthRate = options.expenseGrowthRate ?? input.expenseGrowthRate ?? defaults.expenseGrowth;

  // Determine base NOI
  let baseNOI = input.noi;
  if (!baseNOI && input.ebitdar && input.revenue) {
    baseNOI = input.ebitdar - (input.revenue * 0.06); // Assume 6% rent
    assumptions.push({
      field: 'baseNOI',
      value: baseNOI,
      source: 'derived',
      description: 'NOI derived from EBITDAR less estimated rent (6% of revenue)',
    });
  } else {
    assumptions.push({
      field: 'baseNOI',
      value: baseNOI!,
      source: 'provided',
      description: 'Base NOI for projections',
    });
  }

  // Log assumptions
  assumptions.push({
    field: 'projectionYears',
    value: projectionYears,
    source: options.projectionYears ? 'provided' : 'assumed',
    description: 'Number of years to project',
  });

  assumptions.push({
    field: 'discountRate',
    value: `${(discountRate * 100).toFixed(1)}%`,
    source: options.discountRate ? 'provided' : 'market',
    description: 'Required rate of return',
  });

  assumptions.push({
    field: 'terminalCapRate',
    value: `${(terminalCapRate * 100).toFixed(2)}%`,
    source: options.terminalCapRate ? 'provided' : 'market',
    description: 'Exit cap rate for terminal value',
  });

  assumptions.push({
    field: 'revenueGrowth',
    value: `${(revenueGrowthRate * 100).toFixed(1)}%`,
    source: options.revenueGrowthRate ? 'provided' : 'assumed',
    description: 'Annual revenue growth rate',
  });

  assumptions.push({
    field: 'expenseGrowth',
    value: `${(expenseGrowthRate * 100).toFixed(1)}%`,
    source: options.expenseGrowthRate ? 'provided' : 'assumed',
    description: 'Annual expense growth rate',
  });

  // Project cash flows
  const cashFlows = projectCashFlows(
    baseNOI!,
    projectionYears,
    revenueGrowthRate,
    expenseGrowthRate,
    input.revenue,
    input.revenue ? input.revenue - baseNOI! : undefined
  );

  // Calculate PV of operating cash flows
  let pvOperating = 0;
  cashFlows.forEach((cf) => {
    const pv = presentValue(cf.noi, discountRate, cf.year);
    pvOperating += pv;

    calculations.push({
      label: `Year ${cf.year} NOI`,
      formula: `PV @ ${(discountRate * 100).toFixed(0)}%`,
      value: pv,
      details: `NOI: $${Math.round(cf.noi).toLocaleString()} → PV: $${Math.round(pv).toLocaleString()}`,
    });
  });

  calculations.push({
    label: 'PV of Operating Cash Flows',
    value: pvOperating,
  });

  // Calculate terminal value
  const finalYearNOI = cashFlows[cashFlows.length - 1].noi;
  const terminalValue = calculateTerminalValue(finalYearNOI, terminalCapRate);
  const pvTerminal = presentValue(terminalValue, discountRate, projectionYears);

  calculations.push({
    label: 'Terminal Value',
    formula: `Year ${projectionYears} NOI / Exit Cap`,
    value: terminalValue,
    details: `$${Math.round(finalYearNOI).toLocaleString()} / ${(terminalCapRate * 100).toFixed(2)}% = $${Math.round(terminalValue).toLocaleString()}`,
  });

  calculations.push({
    label: 'PV of Terminal Value',
    formula: `TV / (1+r)^${projectionYears}`,
    value: pvTerminal,
  });

  // Total value
  const valueBase = pvOperating + pvTerminal;

  calculations.push({
    label: 'Total DCF Value',
    formula: 'PV(Operating) + PV(Terminal)',
    value: valueBase,
    details: `$${Math.round(pvOperating).toLocaleString()} + $${Math.round(pvTerminal).toLocaleString()}`,
  });

  // Calculate range using sensitivity
  // Low: higher discount rate, higher terminal cap
  const valueLow = presentValue(pvOperating, discountRate + 0.01, 0) +
    presentValue(calculateTerminalValue(finalYearNOI, terminalCapRate + 0.01), discountRate + 0.01, projectionYears);

  // High: lower discount rate, lower terminal cap
  const valueHigh = presentValue(pvOperating, discountRate - 0.01, 0) +
    presentValue(calculateTerminalValue(finalYearNOI, terminalCapRate - 0.01), discountRate - 0.01, projectionYears);

  // Calculate IRR check metrics
  const impliedGoingInCap = baseNOI! / valueBase;
  calculations.push({
    label: 'Implied Going-In Cap',
    value: impliedGoingInCap,
    details: `${(impliedGoingInCap * 100).toFixed(2)}%`,
  });

  const terminalValuePct = (pvTerminal / valueBase) * 100;
  calculations.push({
    label: 'Terminal Value % of Total',
    value: terminalValuePct,
    details: `${terminalValuePct.toFixed(1)}% (should be 40-60%)`,
  });

  // Calculate per-bed value
  const pricePerBed = valueBase / input.beds;
  calculations.push({
    label: 'Price Per Bed',
    value: pricePerBed,
  });

  // Confidence based on assumptions
  let confidence = 75;

  // Adjust for provided vs assumed inputs
  if (options.discountRate) confidence += 5;
  if (options.revenueGrowthRate) confidence += 5;
  if (input.revenue) confidence += 5; // Better projection quality

  // Terminal value should be 40-60% of total value
  if (terminalValuePct > 70 || terminalValuePct < 30) confidence -= 15;
  else if (terminalValuePct > 60 || terminalValuePct < 40) confidence -= 5;

  confidence = Math.max(40, Math.min(100, confidence));

  return {
    method: 'dcf',
    value: Math.round(valueBase),
    valueLow: Math.round(valueLow),
    valueHigh: Math.round(valueHigh),
    confidence,
    assumptions,
    calculations,
    notes: `${projectionYears}-year DCF with ${(discountRate * 100).toFixed(0)}% discount rate and ${(terminalCapRate * 100).toFixed(1)}% terminal cap`,
    inputsUsed: {
      noi: baseNOI!,
      beds: input.beds,
      assetType: input.assetType,
      projectionYears,
      discountRate,
      terminalCapRate,
      revenueGrowthRate,
      expenseGrowthRate,
    },
  };
}

/**
 * Run DCF sensitivity analysis
 */
export function dcfSensitivity(
  baseResult: ValuationResult,
  input: ValuationInput
): {
  discountRate: { rate: number; value: number }[];
  terminalCap: { rate: number; value: number }[];
} {
  const baseInputs = baseResult.inputsUsed;
  const results = {
    discountRate: [] as { rate: number; value: number }[],
    terminalCap: [] as { rate: number; value: number }[],
  };

  // Discount rate sensitivity
  const baseDiscount = baseInputs.discountRate || 0.10;
  for (let delta = -0.02; delta <= 0.02; delta += 0.005) {
    const rate = baseDiscount + delta;
    if (rate > 0) {
      try {
        const result = calculateDCFValue(input, {
          ...baseInputs,
          discountRate: rate,
        });
        results.discountRate.push({ rate, value: result.value });
      } catch {
        // Skip invalid
      }
    }
  }

  // Terminal cap sensitivity
  const baseTerminalCap = baseInputs.terminalCapRate || 0.10;
  for (let delta = -0.02; delta <= 0.02; delta += 0.005) {
    const rate = baseTerminalCap + delta;
    if (rate > 0) {
      try {
        const result = calculateDCFValue(input, {
          ...baseInputs,
          terminalCapRate: rate,
        });
        results.terminalCap.push({ rate, value: result.value });
      } catch {
        // Skip invalid
      }
    }
  }

  return results;
}
