import { db } from '@/db';
import { deals, facilities, financialPeriods, proformaScenarios, valuations, dealWorkspaceStages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getGeographicCapRate, getMarketTier } from '@/lib/analysis/knowledge/benchmarks';

export interface ProFormaGeneratorInput {
  dealId: string;
  projectionYears?: number;
}

export interface ProFormaResult {
  revenueModel: RevenueModel;
  expenseModel: ExpenseModel;
  scenarios: ScenarioSet;
  valuationOutput: ValuationOutput;
}

export interface RevenueModel {
  currentRevenue: number;
  projections: YearlyProjection[];
  payerMixRevenue: PayerMixRevenue;
  enhancements: RevenueEnhancement[];
}

export interface YearlyProjection {
  year: number;
  revenue: number;
  expenses: number;
  ebitdar: number;
  ebitda: number;
  noi: number;
  occupancy: number;
  adc: number;
}

export interface PayerMixRevenue {
  medicare: { adc: number; ratePerDay: number; annualRevenue: number };
  medicaid: { adc: number; ratePerDay: number; annualRevenue: number };
  privatePay: { adc: number; ratePerDay: number; annualRevenue: number };
}

export interface RevenueEnhancement {
  id: string;
  description: string;
  annualImpact: number;
  timeline: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface ExpenseModel {
  totalExpenses: number;
  laborCost: number;
  laborPercent: number;
  agencySpend: number;
  otherOpex: number;
  categories: ExpenseCategory[];
}

export interface ExpenseCategory {
  name: string;
  amount: number;
  percentOfRevenue: number;
  benchmark: number | null;
}

export interface ScenarioSet {
  base: ScenarioProjection;
  bull: ScenarioProjection;
  bear: ScenarioProjection;
  sensitivityMatrix: SensitivityCell[];
}

export interface ScenarioProjection {
  name: string;
  type: 'baseline' | 'upside' | 'downside';
  assumptions: ScenarioAssumptions;
  yearlyProjections: YearlyProjection[];
  terminalValue: number;
  irr: number | null;
}

export interface ScenarioAssumptions {
  revenueGrowthRate: number;
  expenseGrowthRate: number;
  occupancyTarget: number;
  exitCapRate: number;
  agencyReductionPercent: number;
}

export interface SensitivityCell {
  occupancy: number;
  capRate: number;
  value: number;
}

export interface ValuationOutput {
  capRateValue: number | null;
  ebitdaMultipleValue: number | null;
  dcfValue: number | null;
  reconciledValue: number | null;
  pricePerBed: number | null;
  negotiationRange: { low: number; mid: number; high: number } | null;
  impliedCapRate: number | null;
}

// ── Main generator ──────────────────────────────────────────────────

export async function generateProForma(input: ProFormaGeneratorInput): Promise<ProFormaResult> {
  const { dealId, projectionYears = 5 } = input;

  // Load deal data
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error('Deal not found');

  const facilityList = await db.select().from(facilities).where(eq(facilities.dealId, dealId)).limit(1);
  const facility = facilityList[0] || null;

  // Load intake data from workspace
  const [intakeStage] = await db
    .select()
    .from(dealWorkspaceStages)
    .where(and(eq(dealWorkspaceStages.dealId, dealId), eq(dealWorkspaceStages.stage, 'deal_intake')));

  const intakeData = (intakeStage?.stageData || {}) as Record<string, Record<string, unknown>>;
  const fi = intakeData.facilityIdentification || {};
  const fs = intakeData.financialSnapshot || {};
  const ops = intakeData.operationalSnapshot || {};

  // Load financial periods
  const periods = await db
    .select()
    .from(financialPeriods)
    .where(eq(financialPeriods.dealId, dealId))
    .limit(3);

  const latestPeriod = periods[0] || null;

  // Extract key inputs
  const beds = (fi.licensedBeds as number) || deal.beds || 120;
  const state = (fi.state as string) || deal.primaryState || 'OH';
  const assetType = deal.assetType || 'SNF';
  const ttmRevenue = (fs.ttmRevenue as number) || (latestPeriod?.totalRevenue ? parseFloat(latestPeriod.totalRevenue) : beds * 55000);
  const ttmEbitda = (fs.ttmEbitda as number) || (latestPeriod?.ebitdar ? parseFloat(latestPeriod.ebitdar) : ttmRevenue * 0.15);
  const askingPrice = deal.askingPrice || null;
  const adc = (fs.ttmTotalCensusAdc as number) || (latestPeriod?.averageDailyCensus ? parseFloat(latestPeriod.averageDailyCensus) : beds * 0.82);
  const occupancy = adc / beds;

  const medicarePct = (fs.medicareCensusPercent as number) || 22;
  const medicaidPct = (fs.medicaidCensusPercent as number) || 58;
  const privatePct = (fs.privatePayCensusPercent as number) || 20;
  const cmi = (ops.cmi as number) || 1.0;

  // Get geographic cap rate
  const geoCapRate = getGeographicCapRate(state, assetType as 'snf' | 'alf' | 'SNF' | 'ALF');
  const baseCapRate = geoCapRate
    ? (geoCapRate.low + geoCapRate.high) / 2 / 100
    : assetType === 'ALF' ? 0.07 : 0.125;

  // ── Build Revenue Model ───────────────────────────────────────────

  const medicareAdc = adc * (medicarePct / 100);
  const medicaidAdc = adc * (medicaidPct / 100);
  const privateAdc = adc * (privatePct / 100);

  // Rate per day estimates
  const medicareRPD = assetType === 'SNF' ? 550 * cmi : 350;
  const medicaidRPD = assetType === 'SNF' ? 220 : 175;
  const privateRPD = assetType === 'SNF' ? 350 : 280;

  const payerMixRevenue: PayerMixRevenue = {
    medicare: { adc: medicareAdc, ratePerDay: medicareRPD, annualRevenue: medicareAdc * medicareRPD * 365 },
    medicaid: { adc: medicaidAdc, ratePerDay: medicaidRPD, annualRevenue: medicaidAdc * medicaidRPD * 365 },
    privatePay: { adc: privateAdc, ratePerDay: privateRPD, annualRevenue: privateAdc * privateRPD * 365 },
  };

  // Revenue enhancements
  const enhancements: RevenueEnhancement[] = [];
  if (medicarePct < 25) {
    enhancements.push({
      id: 'medicare_mix',
      description: 'Increase Medicare mix to 25% through referral development',
      annualImpact: (0.25 - medicarePct / 100) * adc * (medicareRPD - medicaidRPD) * 365,
      timeline: '12-18 months',
      confidence: 'medium',
    });
  }
  if (occupancy < 0.90) {
    enhancements.push({
      id: 'occupancy_improvement',
      description: `Improve occupancy from ${(occupancy * 100).toFixed(0)}% to 90%`,
      annualImpact: (0.90 - occupancy) * beds * 365 * (ttmRevenue / (adc * 365)),
      timeline: '6-12 months',
      confidence: 'medium',
    });
  }
  const agencyPct = (ops.agencyStaffPercent as number) || 8;
  if (agencyPct > 5) {
    enhancements.push({
      id: 'agency_reduction',
      description: `Reduce agency staffing from ${agencyPct}% to 5%`,
      annualImpact: ttmRevenue * 0.62 * ((agencyPct - 5) / 100) * 0.5, // 50% of agency premium savings
      timeline: '6-12 months',
      confidence: 'high',
    });
  }
  if (cmi < 1.2) {
    enhancements.push({
      id: 'cmi_optimization',
      description: 'PDPM case-mix optimization (clinical documentation improvement)',
      annualImpact: medicareAdc * 365 * medicareRPD * 0.08,
      timeline: '3-6 months',
      confidence: 'high',
    });
  }

  // ── Build Expense Model ───────────────────────────────────────────

  const totalExpenses = ttmRevenue - ttmEbitda;
  const laborPercent = 0.62;
  const laborCost = totalExpenses * laborPercent;
  const agencySpend = laborCost * (agencyPct / 100);

  const categories: ExpenseCategory[] = [
    { name: 'Nursing & Direct Care', amount: laborCost * 0.65, percentOfRevenue: (laborCost * 0.65 / ttmRevenue) * 100, benchmark: 40 },
    { name: 'Administrative Staff', amount: laborCost * 0.20, percentOfRevenue: (laborCost * 0.20 / ttmRevenue) * 100, benchmark: 12 },
    { name: 'Dietary & Housekeeping', amount: laborCost * 0.15, percentOfRevenue: (laborCost * 0.15 / ttmRevenue) * 100, benchmark: 9 },
    { name: 'Agency Labor', amount: agencySpend, percentOfRevenue: (agencySpend / ttmRevenue) * 100, benchmark: 3 },
    { name: 'Food & Nutrition', amount: totalExpenses * 0.06, percentOfRevenue: 6, benchmark: 5.5 },
    { name: 'Supplies & Medical', amount: totalExpenses * 0.05, percentOfRevenue: 5, benchmark: 4.5 },
    { name: 'Utilities', amount: totalExpenses * 0.04, percentOfRevenue: 4, benchmark: 3.5 },
    { name: 'Insurance', amount: totalExpenses * 0.04, percentOfRevenue: 4, benchmark: 3.5 },
    { name: 'Management Fee', amount: ttmRevenue * 0.05, percentOfRevenue: 5, benchmark: 5 },
    { name: 'Other Operating', amount: totalExpenses * 0.08, percentOfRevenue: 8, benchmark: 7 },
  ];

  // ── Build 3 Scenarios ─────────────────────────────────────────────

  const baseAssumptions: ScenarioAssumptions = {
    revenueGrowthRate: 0.03,
    expenseGrowthRate: 0.025,
    occupancyTarget: Math.min(occupancy + 0.05, 0.93),
    exitCapRate: baseCapRate,
    agencyReductionPercent: 2,
  };

  const bullAssumptions: ScenarioAssumptions = {
    revenueGrowthRate: 0.06,
    expenseGrowthRate: 0.02,
    occupancyTarget: Math.min(occupancy + 0.12, 0.95),
    exitCapRate: baseCapRate - 0.005,
    agencyReductionPercent: agencyPct > 5 ? agencyPct - 3 : 0,
  };

  const bearAssumptions: ScenarioAssumptions = {
    revenueGrowthRate: 0.01,
    expenseGrowthRate: 0.035,
    occupancyTarget: Math.max(occupancy - 0.03, 0.70),
    exitCapRate: baseCapRate + 0.01,
    agencyReductionPercent: 0,
  };

  const base = buildScenario('Base Case', 'baseline', baseAssumptions, ttmRevenue, totalExpenses, beds, adc, projectionYears, askingPrice);
  const bull = buildScenario('Bull Case', 'upside', bullAssumptions, ttmRevenue, totalExpenses, beds, adc, projectionYears, askingPrice);
  const bear = buildScenario('Bear Case', 'downside', bearAssumptions, ttmRevenue, totalExpenses, beds, adc, projectionYears, askingPrice);

  // Sensitivity matrix (occupancy × cap rate)
  const sensitivityMatrix: SensitivityCell[] = [];
  const occRates = [0.75, 0.80, 0.85, 0.90, 0.95];
  const capRates = [baseCapRate - 0.02, baseCapRate - 0.01, baseCapRate, baseCapRate + 0.01, baseCapRate + 0.02];
  for (const occ of occRates) {
    for (const cr of capRates) {
      const projRevenue = ttmRevenue * (occ / occupancy);
      const projNoi = projRevenue * (ttmEbitda / ttmRevenue);
      sensitivityMatrix.push({
        occupancy: Math.round(occ * 100),
        capRate: +(cr * 100).toFixed(1),
        value: Math.round(projNoi / cr),
      });
    }
  }

  // ── Valuation Output ──────────────────────────────────────────────

  const capRateValue = ttmEbitda / baseCapRate;
  const ebitdaMultiple = assetType === 'SNF' ? 8 : 10;
  const ebitdaMultipleValue = ttmEbitda * ebitdaMultiple;
  const dcfValue = calculateSimpleDCF(base.yearlyProjections, baseCapRate, askingPrice);
  const reconciledValue = Math.round((capRateValue * 0.4 + ebitdaMultipleValue * 0.3 + dcfValue * 0.3));
  const pricePerBed = reconciledValue / beds;
  const impliedCapRate = askingPrice ? ttmEbitda / parseFloat(askingPrice) : null;

  const valuationOutput: ValuationOutput = {
    capRateValue: Math.round(capRateValue),
    ebitdaMultipleValue: Math.round(ebitdaMultipleValue),
    dcfValue: Math.round(dcfValue),
    reconciledValue,
    pricePerBed: Math.round(pricePerBed),
    negotiationRange: {
      low: Math.round(reconciledValue * 0.85),
      mid: reconciledValue,
      high: Math.round(reconciledValue * 1.10),
    },
    impliedCapRate: impliedCapRate ? +impliedCapRate.toFixed(4) : null,
  };

  // ── Persist scenarios to DB ───────────────────────────────────────

  for (const scenario of [base, bull, bear]) {
    await db
      .insert(proformaScenarios)
      .values({
        dealId,
        name: scenario.name,
        scenarioType: scenario.type,
        projectionYears,
        assumptions: scenario.assumptions,
        revenueGrowthRate: String(scenario.assumptions.revenueGrowthRate),
        expenseGrowthRate: String(scenario.assumptions.expenseGrowthRate),
        targetOccupancy: String(scenario.assumptions.occupancyTarget),
        data: { yearlyProjections: scenario.yearlyProjections },
        isBaseCase: scenario.type === 'baseline',
        createdBy: 'workspace',
      })
      .onConflictDoNothing();
  }

  // Persist valuation
  await db
    .insert(valuations)
    .values({
      dealId,
      viewType: 'cascadia',
      method: 'cap_rate',
      valueLow: String(valuationOutput.negotiationRange?.low || 0),
      valueBase: String(reconciledValue),
      valueHigh: String(valuationOutput.negotiationRange?.high || 0),
      capRateBase: String(baseCapRate),
      noiUsed: String(ttmEbitda),
      pricePerBed: String(pricePerBed),
      suggestedOffer: String(reconciledValue),
      confidenceScore: 70,
      inputsUsed: {
        source: 'workspace_proforma',
        beds,
        state,
        assetType,
        occupancy,
        ttmRevenue,
        ttmEbitda,
      },
    })
    .onConflictDoNothing();

  return {
    revenueModel: {
      currentRevenue: ttmRevenue,
      projections: base.yearlyProjections,
      payerMixRevenue,
      enhancements,
    },
    expenseModel: {
      totalExpenses,
      laborCost,
      laborPercent: laborPercent * 100,
      agencySpend,
      otherOpex: totalExpenses - laborCost,
      categories,
    },
    scenarios: {
      base,
      bull,
      bear,
      sensitivityMatrix,
    },
    valuationOutput,
  };
}

// ── Scenario builder ────────────────────────────────────────────────

function buildScenario(
  name: string,
  type: 'baseline' | 'upside' | 'downside',
  assumptions: ScenarioAssumptions,
  baseRevenue: number,
  baseExpenses: number,
  beds: number,
  baseAdc: number,
  years: number,
  acquisitionCost: string | null
): ScenarioProjection {
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

    // Agency reduction savings
    if (assumptions.agencyReductionPercent > 0 && y <= 3) {
      const annualAgencySaving = expenses * 0.62 * (assumptions.agencyReductionPercent / 100 / 3);
      expenses -= annualAgencySaving;
    }

    const ebitdar = revenue - expenses;
    const rent = revenue * 0.08; // Estimated rent if leased
    const ebitda = ebitdar; // For owned, EBITDAR ≈ EBITDA proxy
    const noi = ebitdar * 0.92; // Reserve 8% for CapEx/misc

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

  // Terminal value at exit
  const terminalNoi = projections[projections.length - 1]?.noi || 0;
  const terminalValue = terminalNoi / assumptions.exitCapRate;

  // Simple IRR estimate
  let irr: number | null = null;
  if (acquisitionCost) {
    const cost = parseFloat(acquisitionCost);
    if (cost > 0) {
      const cashFlows = [-cost, ...projections.map(p => p.noi)];
      cashFlows[cashFlows.length - 1] += terminalValue;
      irr = estimateIRR(cashFlows);
    }
  }

  return {
    name,
    type,
    assumptions,
    yearlyProjections: projections,
    terminalValue: Math.round(terminalValue),
    irr,
  };
}

// ── Simple DCF ──────────────────────────────────────────────────────

function calculateSimpleDCF(projections: YearlyProjection[], discountRate: number, _acquisitionCost: string | null): number {
  const wacc = discountRate + 0.02; // Risk premium
  let pv = 0;
  for (const p of projections) {
    pv += p.noi / Math.pow(1 + wacc, p.year);
  }
  // Terminal value
  const terminalNoi = projections[projections.length - 1]?.noi || 0;
  const terminalValue = terminalNoi / discountRate;
  pv += terminalValue / Math.pow(1 + wacc, projections.length);
  return pv;
}

// ── IRR estimation (Newton-Raphson) ─────────────────────────────────

function estimateIRR(cashFlows: number[], guess = 0.10, maxIter = 100, tolerance = 0.0001): number | null {
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
    if (Math.abs(newRate - rate) < tolerance) return +(newRate * 100).toFixed(2);
    rate = newRate;
  }
  return rate > -1 && rate < 10 ? +(rate * 100).toFixed(2) : null;
}
