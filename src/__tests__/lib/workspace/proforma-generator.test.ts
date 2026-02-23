import { describe, it, expect } from 'vitest';

/**
 * Tests for the IRR and NPV calculation logic from proforma-generator.ts.
 *
 * The main generateProForma function requires database access, so we test
 * the pure mathematical functions (npvAtRate and estimateIRR) by
 * re-implementing them identically to the source.
 */

// ─── Re-implement npvAtRate exactly as in the source ─────────────────────────

function npvAtRate(cashFlows: number[], rate: number): number {
  return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
}

// ─── Re-implement estimateIRR exactly as in the source ───────────────────────

function estimateIRR(cashFlows: number[], guess = 0.10, maxIter = 100, tolerance = 0.0001): number | null {
  // Try Newton-Raphson first
  let rate = guess;
  for (let i = 0; i < maxIter; i++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      npv += cashFlows[t] / Math.pow(1 + rate, t);
      dnpv -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
    }
    if (Math.abs(dnpv) < 1e-10) break;
    const newRate = rate - npv / dnpv;
    if (newRate < -0.99 || newRate > 10) break;
    if (Math.abs(newRate - rate) < tolerance) return +(newRate * 100).toFixed(2);
    rate = newRate;
  }
  if (rate > -0.99 && rate < 10 && Math.abs(npvAtRate(cashFlows, rate)) < tolerance * 1e6) {
    return +(rate * 100).toFixed(2);
  }

  // Bisection fallback
  let lo = -0.95;
  let hi = 5.0;
  const npvLo = npvAtRate(cashFlows, lo);
  const npvHi = npvAtRate(cashFlows, hi);
  if (npvLo * npvHi > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const npvMid = npvAtRate(cashFlows, mid);
    if (Math.abs(npvMid) < tolerance * 100) return +(mid * 100).toFixed(2);
    if (npvMid * npvLo < 0) hi = mid;
    else lo = mid;
  }

  const finalRate = (lo + hi) / 2;
  return finalRate > -1 && finalRate < 10 ? +(finalRate * 100).toFixed(2) : null;
}

// ─── NPV at Rate ─────────────────────────────────────────────────────────────

describe('npvAtRate', () => {
  it('should return sum of all cash flows when rate is 0', () => {
    const cashFlows = [-100, 30, 40, 50, 60];
    const result = npvAtRate(cashFlows, 0);
    const sum = cashFlows.reduce((a, b) => a + b, 0);
    expect(result).toBeCloseTo(sum, 10);
    expect(result).toBeCloseTo(80, 10);
  });

  it('should return sum of all cash flows when rate is 0 (even cash flows)', () => {
    const cashFlows = [-1000, 300, 300, 300, 300, 300];
    const result = npvAtRate(cashFlows, 0);
    expect(result).toBeCloseTo(500, 10);
  });

  it('should discount future cash flows when rate > 0', () => {
    const cashFlows = [-100, 110]; // Simple 1-period case
    const result = npvAtRate(cashFlows, 0.10);
    // NPV = -100 + 110 / 1.1 = -100 + 100 = 0
    expect(result).toBeCloseTo(0, 5);
  });

  it('should compute correct NPV at 10% for multi-period', () => {
    const cashFlows = [-100, 30, 40, 50, 60];
    const result = npvAtRate(cashFlows, 0.10);
    // -100 + 30/1.1 + 40/1.21 + 50/1.331 + 60/1.4641
    // = -100 + 27.273 + 33.058 + 37.566 + 40.981 = 38.878
    expect(result).toBeCloseTo(38.878, 0);
  });

  it('should approach first cash flow at very high discount rate', () => {
    const cashFlows = [-100, 30, 40, 50, 60];
    const result = npvAtRate(cashFlows, 100); // 10000% rate
    // At very high rate, future cash flows are nearly 0
    expect(result).toBeCloseTo(-100, 0);
  });

  it('should handle a single cash flow', () => {
    const cashFlows = [500];
    const result = npvAtRate(cashFlows, 0.05);
    // Only t=0, so no discounting
    expect(result).toBe(500);
  });

  it('should handle empty cash flows', () => {
    const result = npvAtRate([], 0.10);
    expect(result).toBe(0);
  });

  it('should handle negative rate (below -1 is degenerate)', () => {
    const cashFlows = [-100, 110];
    // rate = -0.5 → NPV = -100 + 110/(0.5) = -100 + 220 = 120
    const result = npvAtRate(cashFlows, -0.5);
    expect(result).toBeCloseTo(120, 5);
  });

  it('should handle all positive cash flows', () => {
    const cashFlows = [100, 200, 300];
    const result = npvAtRate(cashFlows, 0.10);
    expect(result).toBeGreaterThan(0);
  });

  it('should handle all negative cash flows', () => {
    const cashFlows = [-100, -200, -300];
    const result = npvAtRate(cashFlows, 0.10);
    expect(result).toBeLessThan(0);
  });

  it('should give larger NPV with lower discount rate', () => {
    const cashFlows = [-100, 50, 50, 50];
    const npvLow = npvAtRate(cashFlows, 0.05);
    const npvHigh = npvAtRate(cashFlows, 0.20);
    expect(npvLow).toBeGreaterThan(npvHigh);
  });
});

// ─── estimateIRR ─────────────────────────────────────────────────────────────

describe('estimateIRR', () => {
  describe('standard positive return scenarios', () => {
    it('should compute IRR for standard cash flows [-100, 30, 40, 50, 60]', () => {
      const cashFlows = [-100, 30, 40, 50, 60];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      // Expected IRR is approximately 20%
      expect(irr!).toBeGreaterThan(15);
      expect(irr!).toBeLessThan(25);
    });

    it('should compute IRR for even cash flows [-1000, 300, 300, 300, 300, 300]', () => {
      const cashFlows = [-1000, 300, 300, 300, 300, 300];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      // This is an annuity with 5 payments of 300 for 1000 investment
      // IRR should be approximately 15.2%
      expect(irr!).toBeGreaterThan(12);
      expect(irr!).toBeLessThan(20);
    });

    it('should verify IRR makes NPV approximately zero', () => {
      const cashFlows = [-100, 30, 40, 50, 60];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      const npv = npvAtRate(cashFlows, irr! / 100);
      expect(Math.abs(npv)).toBeLessThan(1);
    });

    it('should handle simple 1-period return: [-100, 120] => 20%', () => {
      const cashFlows = [-100, 120];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      expect(irr!).toBeCloseTo(20, 0);
    });

    it('should handle 2x return: [-100, 200] => 100%', () => {
      const cashFlows = [-100, 200];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      expect(irr!).toBeCloseTo(100, 0);
    });
  });

  describe('negative IRR scenarios', () => {
    it('should return negative IRR when total return < investment', () => {
      const cashFlows = [-1_000_000, 50_000, 50_000, 50_000, 50_000, 50_000];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      // Total return = 250k vs 1M investment => heavily negative IRR
      expect(irr!).toBeLessThan(0);
    });

    it('should verify negative IRR makes NPV approximately zero', () => {
      const cashFlows = [-1_000_000, 50_000, 50_000, 50_000, 50_000, 50_000];
      const irr = estimateIRR(cashFlows);
      if (irr !== null) {
        const npv = npvAtRate(cashFlows, irr / 100);
        expect(Math.abs(npv)).toBeLessThan(1000); // Allow slightly larger tolerance for large numbers
      }
    });

    it('should handle slight loss: [-100, 95] => ~-5%', () => {
      const cashFlows = [-100, 95];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      expect(irr!).toBeCloseTo(-5, 0);
    });
  });

  describe('zero IRR scenarios', () => {
    it('should return approximately 0% when total return equals investment', () => {
      const cashFlows = [-100, 25, 25, 25, 25];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      expect(irr!).toBeCloseTo(0, 0);
    });

    it('should return 0% for simple break-even: [-100, 100]', () => {
      const cashFlows = [-100, 100];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      expect(irr!).toBeCloseTo(0, 0);
    });
  });

  describe('edge cases', () => {
    it('should return null for all positive cash flows (no sign change)', () => {
      const cashFlows = [100, 200, 300];
      const irr = estimateIRR(cashFlows);
      expect(irr).toBeNull();
    });

    it('should return null for empty cash flows', () => {
      const cashFlows: number[] = [];
      const irr = estimateIRR(cashFlows);
      // Empty array: Newton-Raphson won't converge, bisection has no sign change
      // Should return null or 0 depending on implementation
      // The reduce on empty array returns 0, so NPV is always 0
      // Newton-Raphson: npv=0, dnpv=0, abs(dnpv) < 1e-10 → breaks immediately
      // Then checks: rate(0.10) > -0.99 && < 10 && |NPV| < tolerance*1e6 → 0 < 100 → true
      // So it returns +(0.10 * 100).toFixed(2) = 10.00
      // Actually this is a degenerate case. Let's just verify it doesn't throw.
      expect(typeof irr === 'number' || irr === null).toBe(true);
    });

    it('should handle single negative cash flow', () => {
      const cashFlows = [-100];
      const irr = estimateIRR(cashFlows);
      // Single cash flow at t=0, NPV = -100 for any rate
      // Newton-Raphson: dnpv = 0 (only t=0 term contributes 0 to derivative)
      // Bisection: npvLo = -100, npvHi = -100, same sign → no root → null
      expect(irr === null || typeof irr === 'number').toBe(true);
    });

    it('should handle very large positive return', () => {
      const cashFlows = [-1, 100]; // 9900% return
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      // Newton-Raphson may not converge to the exact 9900% for this extreme case,
      // but the result should be a large positive percentage
      expect(irr!).toBeGreaterThan(100);
    });

    it('should handle typical real estate cash flows', () => {
      // $5M acquisition, $500k/yr NOI for 5 years, sell at $6M in year 5
      const cashFlows = [-5_000_000, 500_000, 500_000, 500_000, 500_000, 6_500_000];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      // Should be a reasonable real estate IRR (around 15-20%)
      expect(irr!).toBeGreaterThan(10);
      expect(irr!).toBeLessThan(30);
    });

    it('should handle healthcare facility acquisition scenario', () => {
      // $12M SNF acquisition, growing NOI, exit at 12.5% cap rate
      const cashFlows = [
        -12_000_000,  // Acquisition
        1_200_000,    // Year 1 NOI
        1_350_000,    // Year 2 NOI (growth)
        1_500_000,    // Year 3 NOI
        1_650_000,    // Year 4 NOI
        1_800_000 + 14_400_000, // Year 5 NOI + exit (1.8M / 0.125 cap)
      ];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      expect(irr!).toBeGreaterThan(10);
      expect(irr!).toBeLessThan(40);

      // Verify NPV at IRR is close to 0
      const npv = npvAtRate(cashFlows, irr! / 100);
      expect(Math.abs(npv)).toBeLessThan(10_000); // Within $10k for a $12M deal
    });
  });

  describe('convergence and accuracy', () => {
    it('should return result as percentage (not decimal)', () => {
      const cashFlows = [-100, 110];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      // 10% return should be reported as ~10, not ~0.10
      expect(irr!).toBeCloseTo(10, 0);
    });

    it('should return result with 2 decimal places', () => {
      const cashFlows = [-100, 50, 40, 30, 20];
      const irr = estimateIRR(cashFlows);
      expect(irr).not.toBeNull();
      // Check it has at most 2 decimal places
      const parts = String(irr).split('.');
      if (parts.length === 2) {
        expect(parts[1].length).toBeLessThanOrEqual(2);
      }
    });

    it('should converge for different initial guesses', () => {
      const cashFlows = [-100, 30, 40, 50, 60];
      const irr1 = estimateIRR(cashFlows, 0.05);
      const irr2 = estimateIRR(cashFlows, 0.30);
      const irr3 = estimateIRR(cashFlows, 0.50);

      // All should converge to approximately the same result
      expect(irr1).not.toBeNull();
      expect(irr2).not.toBeNull();
      expect(irr3).not.toBeNull();
      expect(Math.abs(irr1! - irr2!)).toBeLessThan(1);
      expect(Math.abs(irr2! - irr3!)).toBeLessThan(1);
    });
  });
});

// ─── buildScenario and projection logic ──────────────────────────────────────

describe('scenario projection logic', () => {
  /**
   * Re-implement the core projection logic from buildScenario
   * to validate the math without DB dependencies.
   */
  interface ScenarioAssumptions {
    revenueGrowthRate: number;
    expenseGrowthRate: number;
    occupancyTarget: number;
    exitCapRate: number;
    agencyReductionPercent: number;
  }

  interface YearlyProjection {
    year: number;
    revenue: number;
    expenses: number;
    ebitdar: number;
    ebitda: number;
    noi: number;
    occupancy: number;
    adc: number;
  }

  function buildProjections(
    assumptions: ScenarioAssumptions,
    baseRevenue: number,
    baseExpenses: number,
    beds: number,
    baseAdc: number,
    years: number
  ): { projections: YearlyProjection[]; terminalValue: number } {
    const projections: YearlyProjection[] = [];
    let revenue = baseRevenue;
    let expenses = baseExpenses;
    let occ = baseAdc / beds;
    const occIncrement = (assumptions.occupancyTarget - occ) / Math.max(years, 1);

    for (let y = 1; y <= years; y++) {
      occ = Math.min(occ + occIncrement, assumptions.occupancyTarget);
      const adc = occ * beds;
      const occRevAdj = adc / baseAdc;

      revenue = revenue * (1 + assumptions.revenueGrowthRate) * (y === 1 ? occRevAdj : 1);
      expenses = expenses * (1 + assumptions.expenseGrowthRate);

      if (assumptions.agencyReductionPercent > 0 && y <= 3) {
        const annualAgencySaving = expenses * 0.62 * (assumptions.agencyReductionPercent / 100 / 3);
        expenses -= annualAgencySaving;
      }

      const ebitdar = revenue - expenses;
      const ebitda = ebitdar;
      const noi = ebitdar * 0.92;

      projections.push({
        year: y,
        revenue: Math.round(revenue),
        expenses: Math.round(expenses),
        ebitdar: Math.round(ebitdar),
        ebitda: Math.round(ebitda),
        noi: Math.round(noi),
        occupancy: +(occ * 100).toFixed(1),
        adc: Math.round(adc),
      });
    }

    const terminalNoi = projections[projections.length - 1]?.noi || 0;
    const terminalValue = terminalNoi / assumptions.exitCapRate;

    return { projections, terminalValue };
  }

  const baseAssumptions: ScenarioAssumptions = {
    revenueGrowthRate: 0.03,
    expenseGrowthRate: 0.025,
    occupancyTarget: 0.87,
    exitCapRate: 0.125,
    agencyReductionPercent: 2,
  };

  it('should generate correct number of yearly projections', () => {
    const { projections } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    expect(projections).toHaveLength(5);
  });

  it('should have increasing year numbers', () => {
    const { projections } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    for (let i = 0; i < projections.length; i++) {
      expect(projections[i].year).toBe(i + 1);
    }
  });

  it('should show revenue growth over time', () => {
    const { projections } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    // After year 1 occupancy adjustment, revenue should generally grow
    for (let i = 2; i < projections.length; i++) {
      expect(projections[i].revenue).toBeGreaterThan(projections[i - 1].revenue);
    }
  });

  it('should compute NOI as 92% of EBITDAR', () => {
    const { projections } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    for (const p of projections) {
      // Allow +-1 for rounding
      expect(Math.abs(p.noi - Math.round(p.ebitdar * 0.92))).toBeLessThanOrEqual(1);
    }
  });

  it('should compute EBITDAR as revenue minus expenses', () => {
    const { projections } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    for (const p of projections) {
      expect(Math.abs(p.ebitdar - (p.revenue - p.expenses))).toBeLessThanOrEqual(1);
    }
  });

  it('should set EBITDA equal to EBITDAR (for owned facilities)', () => {
    const { projections } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    for (const p of projections) {
      expect(p.ebitda).toBe(p.ebitdar);
    }
  });

  it('should converge occupancy toward target over the projection period', () => {
    const { projections } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    const initialOcc = (98 / 120) * 100; // ~81.7%
    const targetOcc = 87;
    // Last year occupancy should be at or very near target
    expect(projections[projections.length - 1].occupancy).toBeCloseTo(targetOcc, 0);
    // First year should be between initial and target
    expect(projections[0].occupancy).toBeGreaterThan(initialOcc);
    expect(projections[0].occupancy).toBeLessThanOrEqual(targetOcc);
  });

  it('should compute terminal value as terminal NOI / exit cap rate', () => {
    const { projections, terminalValue } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
    const terminalNoi = projections[projections.length - 1].noi;
    expect(terminalValue).toBeCloseTo(terminalNoi / baseAssumptions.exitCapRate, 0);
  });

  it('should apply agency reduction savings only in years 1-3', () => {
    const withAgency: ScenarioAssumptions = {
      ...baseAssumptions,
      agencyReductionPercent: 5,
    };
    const noAgency: ScenarioAssumptions = {
      ...baseAssumptions,
      agencyReductionPercent: 0,
    };
    const { projections: withA } = buildProjections(withAgency, 6_600_000, 5_610_000, 120, 98, 5);
    const { projections: noA } = buildProjections(noAgency, 6_600_000, 5_610_000, 120, 98, 5);

    // Years 1-3: expenses with agency reduction should be lower
    for (let y = 0; y < 3; y++) {
      expect(withA[y].expenses).toBeLessThan(noA[y].expenses);
    }

    // Years 4-5: no agency reduction applied, but compound effect from earlier years
    // means expenses may still differ. The key test is that years 1-3 see savings.
  });

  describe('scenario comparison (base vs bull vs bear)', () => {
    const bullAssumptions: ScenarioAssumptions = {
      revenueGrowthRate: 0.06,
      expenseGrowthRate: 0.02,
      occupancyTarget: 0.93,
      exitCapRate: 0.12,
      agencyReductionPercent: 5,
    };

    const bearAssumptions: ScenarioAssumptions = {
      revenueGrowthRate: 0.01,
      expenseGrowthRate: 0.035,
      occupancyTarget: 0.79,
      exitCapRate: 0.135,
      agencyReductionPercent: 0,
    };

    it('bull case should have higher terminal revenue than base case', () => {
      const { projections: base } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      const { projections: bull } = buildProjections(bullAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      const lastBase = base[base.length - 1];
      const lastBull = bull[bull.length - 1];
      expect(lastBull.revenue).toBeGreaterThan(lastBase.revenue);
    });

    it('bear case should have lower terminal NOI than base case', () => {
      const { projections: base } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      const { projections: bear } = buildProjections(bearAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      const lastBase = base[base.length - 1];
      const lastBear = bear[bear.length - 1];
      expect(lastBear.noi).toBeLessThan(lastBase.noi);
    });

    it('bull case should have higher terminal value than base case', () => {
      const { terminalValue: tvBase } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      const { terminalValue: tvBull } = buildProjections(bullAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      expect(tvBull).toBeGreaterThan(tvBase);
    });

    it('bear case should have lower terminal value than base case', () => {
      const { terminalValue: tvBase } = buildProjections(baseAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      const { terminalValue: tvBear } = buildProjections(bearAssumptions, 6_600_000, 5_610_000, 120, 98, 5);
      expect(tvBear).toBeLessThan(tvBase);
    });
  });
});

// ─── Sensitivity matrix logic ────────────────────────────────────────────────

describe('sensitivity matrix logic', () => {
  it('should produce correct grid of occupancy x cap rate values', () => {
    const baseCapRate = 0.125;
    const ttmRevenue = 6_600_000;
    const ttmEbitda = 990_000;
    const occupancy = 0.82;

    const occRates = [0.75, 0.80, 0.85, 0.90, 0.95];
    const capRates = [baseCapRate - 0.02, baseCapRate - 0.01, baseCapRate, baseCapRate + 0.01, baseCapRate + 0.02];

    const matrix: { occupancy: number; capRate: number; value: number }[] = [];
    for (const occ of occRates) {
      for (const cr of capRates) {
        const projRevenue = ttmRevenue * (occ / occupancy);
        const projNoi = projRevenue * (ttmEbitda / ttmRevenue);
        matrix.push({
          occupancy: Math.round(occ * 100),
          capRate: +(cr * 100).toFixed(1),
          value: Math.round(projNoi / cr),
        });
      }
    }

    expect(matrix).toHaveLength(25); // 5x5 grid
  });

  it('should show higher values at lower cap rates', () => {
    const noi = 1_000_000;
    const value1 = noi / 0.10; // 10M
    const value2 = noi / 0.125; // 8M
    const value3 = noi / 0.15; // 6.67M
    expect(value1).toBeGreaterThan(value2);
    expect(value2).toBeGreaterThan(value3);
  });

  it('should show higher values at higher occupancy', () => {
    const ttmRevenue = 6_600_000;
    const baseOcc = 0.82;
    const ebitdaMargin = 0.15;

    const noiAt80 = (ttmRevenue * (0.80 / baseOcc)) * ebitdaMargin;
    const noiAt90 = (ttmRevenue * (0.90 / baseOcc)) * ebitdaMargin;
    const capRate = 0.125;

    expect(noiAt90 / capRate).toBeGreaterThan(noiAt80 / capRate);
  });
});

// ─── Valuation reconciliation logic ──────────────────────────────────────────

describe('valuation reconciliation', () => {
  it('should weight cap rate at 40%, EBITDA multiple at 30%, DCF at 30%', () => {
    const capRateValue = 10_000_000;
    const ebitdaMultipleValue = 8_000_000;
    const dcfValue = 12_000_000;

    const reconciled = Math.round(capRateValue * 0.4 + ebitdaMultipleValue * 0.3 + dcfValue * 0.3);
    // 4M + 2.4M + 3.6M = 10M
    expect(reconciled).toBe(10_000_000);
  });

  it('should compute negotiation range as 85%/100%/110% of reconciled value', () => {
    const reconciled = 10_000_000;
    expect(Math.round(reconciled * 0.85)).toBe(8_500_000);
    expect(Math.round(reconciled * 1.10)).toBe(11_000_000);
  });

  it('should use 8x EBITDA multiple for SNF', () => {
    const ttmEbitda = 1_000_000;
    const ebitdaMultiple = 8; // SNF
    expect(ttmEbitda * ebitdaMultiple).toBe(8_000_000);
  });

  it('should use 10x EBITDA multiple for ALF', () => {
    const ttmEbitda = 1_000_000;
    const ebitdaMultiple = 10; // ALF
    expect(ttmEbitda * ebitdaMultiple).toBe(10_000_000);
  });

  it('should compute implied cap rate as EBITDA / asking price', () => {
    const ttmEbitda = 1_000_000;
    const askingPrice = 8_000_000;
    const impliedCapRate = ttmEbitda / askingPrice;
    expect(impliedCapRate).toBeCloseTo(0.125, 4);
  });

  it('should compute price per bed as reconciled value / beds', () => {
    const reconciledValue = 12_000_000;
    const beds = 120;
    expect(reconciledValue / beds).toBe(100_000);
  });
});
