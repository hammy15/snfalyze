// Cranium synthesis layer — mock data
// Mock data: 3 active deals, 12 held assets, 57 portfolio buildings

export const PORTFOLIO_SUMMARY = {
  activeDeals: 3,
  heldAssets: 12,
  portfolioBuildings: 57,
  avgCostPerBed: -220000,
  capRateRange: { min: 8, max: 12 },
}

export const ACTIVE_DEALS = [
  {
    id: 'd1',
    name: 'Pacific NW Portfolio',
    shortName: 'Pacific NW',
    beds: 320,
    state: 'WA',
    type: 'SNF',
    priceBed: 195000,
    opsCostBed: 42000,
    allInCostBed: 237000,
    adjReturn: 8.8,
    capRate: 9.2,
    status: 'due_diligence',
    uwMedicarePct: 52,
    regressionMedicarePct: 46,
    projectedSynergy: 2800000,
    integrationCost: 1800000,
    targetExitMultiple: 11.5,
    targetTimeline: 36,
    projectedTimeline: 38,
    marketOpportunityScore: 8.5,
    buildingConditionRisk: 4.2,
    rmBandwidth: 0.9,
  },
  {
    id: 'd2',
    name: 'Nevada ALF Acquisition',
    shortName: 'Nevada ALF',
    beds: 180,
    state: 'NV',
    type: 'ALF',
    priceBed: 248000,
    opsCostBed: 38000,
    allInCostBed: 286000,
    adjReturn: 7.2,
    capRate: 8.1,
    status: 'under_loi',
    uwMedicarePct: 38,
    regressionMedicarePct: 35,
    projectedSynergy: 1900000,
    integrationCost: 700000,
    targetExitMultiple: 10.0,
    targetTimeline: 24,
    projectedTimeline: 31,
    marketOpportunityScore: 6.8,
    buildingConditionRisk: 7.8,
    rmBandwidth: 0.6,
  },
  {
    id: 'd3',
    name: 'Colorado SNF Portfolio',
    shortName: 'Colorado SNF',
    beds: 410,
    state: 'CO',
    type: 'SNF',
    priceBed: 185000,
    opsCostBed: 55000,
    allInCostBed: 240000,
    adjReturn: 9.4,
    capRate: 10.4,
    status: 'analyzing',
    uwMedicarePct: 48,
    regressionMedicarePct: 42,
    projectedSynergy: 4200000,
    integrationCost: 1600000,
    targetExitMultiple: 12.0,
    targetTimeline: 48,
    projectedTimeline: 44,
    marketOpportunityScore: 9.1,
    buildingConditionRisk: 2.9,
    rmBandwidth: 1.2,
  },
]

export const HELD_ASSETS = [
  { id: 'h1', name: 'Olympia Gardens SNF', beds: 120, state: 'WA', marketOpportunityScore: 4.8, buildingConditionRisk: 3.2 },
  { id: 'h2', name: 'Reno Sunrise ALF', beds: 90, state: 'NV', marketOpportunityScore: 7.2, buildingConditionRisk: 6.1 },
  { id: 'h3', name: 'Salem Oak SNF', beds: 145, state: 'OR', marketOpportunityScore: 5.5, buildingConditionRisk: 5.8 },
  { id: 'h4', name: 'Boise Ridge SNF', beds: 110, state: 'ID', marketOpportunityScore: 3.1, buildingConditionRisk: 2.4 },
  { id: 'h5', name: 'Phoenix Desert ALF', beds: 200, state: 'AZ', marketOpportunityScore: 8.8, buildingConditionRisk: 7.4 },
]

export const PIPELINE_CAPACITY = {
  activeDeals: 3,
  nearTermPipeline: 8,
  totalPipeline: 11,
  rmCount: 2,
  dealsPerRM: 4.5,
  maxCapacity: 9,
  utilizationPct: 122,
  regions: [
    { name: 'PNW', activeDeals: 2, capacity: 4, util: 50 },
    { name: 'Southwest', activeDeals: 4, capacity: 3, util: 133 },
    { name: 'Mountain', activeDeals: 3, capacity: 2, util: 150 },
    { name: 'Southeast', activeDeals: 2, capacity: 3, util: 67 },
  ],
}

export const PATIENT_FLOW = {
  markets: ['WA', 'OR', 'NV', 'CO', 'AZ'],
  snfDischarges: 2840,
  hhConversions: 1420,
  hhLeakage: 980,
  hospiceConversions: 610,
  hospiceLeakage: 520,
  alfConversions: 180,
  revenueCapured: 8420000,
  revenueLost: 5650000,
  leakageRate: 40.2,
}

export const REVENUE_EPISODES = [
  { service: 'SNF Only', revenue: 42000, patients: 100, color: '#14b8a6' },
  { service: 'HH Only', revenue: 8200, patients: 100, color: '#6366f1' },
  { service: 'Hospice Only', revenue: 18500, patients: 100, color: '#f97316' },
  { service: 'SNF + HH', revenue: 49500, patients: 100, color: '#14b8a6' },
  { service: 'SNF + Hospice', revenue: 57200, patients: 100, color: '#10b981' },
  { service: 'Full Episode', revenue: 71400, patients: 100, color: '#8b5cf6' },
]

export const PIPE_COVERAGE = [
  { market: 'Seattle', snf: true, hh: true, hospice: false, alf: false, revGap: 2800000 },
  { market: 'Portland', snf: true, hh: true, hospice: true, alf: false, revGap: 1200000 },
  { market: 'Las Vegas', snf: false, hh: true, hospice: true, alf: true, revGap: 3400000 },
  { market: 'Denver', snf: true, hh: false, hospice: false, alf: false, revGap: 4100000 },
  { market: 'Phoenix', snf: true, hh: true, hospice: false, alf: true, revGap: 1800000 },
]

export const HOSPITAL_PARTNERSHIPS = [
  { name: 'PeaceHealth St. Joe', dischargeVol: 420, preferredStatus: true, tenureYears: 4.2, riskScore: 18 },
  { name: 'UCHealth Aurora', dischargeVol: 380, preferredStatus: true, tenureYears: 2.8, riskScore: 24 },
  { name: 'Banner Health', dischargeVol: 290, preferredStatus: false, tenureYears: 1.1, riskScore: 51 },
  { name: 'Providence Oregon', dischargeVol: 510, preferredStatus: true, tenureYears: 6.0, riskScore: 12 },
  { name: 'Valley Medical NV', dischargeVol: 185, preferredStatus: false, tenureYears: 0.7, riskScore: 68 },
]

export const REFERRAL_LEAKAGE = [
  { facility: 'Olympia Gardens', snfHhLeakage: 820000, hhHospiceLeakage: 340000, total: 1160000 },
  { facility: 'Salem Oak', snfHhLeakage: 590000, hhHospiceLeakage: 210000, total: 800000 },
  { facility: 'Pacific NW (target)', snfHhLeakage: 1240000, hhHospiceLeakage: 480000, total: 1720000 },
  { facility: 'Colorado SNF (target)', snfHhLeakage: 1680000, hhHospiceLeakage: 620000, total: 2300000 },
]

export const VERTINT_ROI = Array.from({ length: 13 }, (_, i) => ({
  month: i,
  siloed: 420000 * i,
  integrated: i === 0 ? -180000 : (420000 * i) + (i * i * 8200) - 180000,
  addedServiceLine: i === 0 ? -320000 : (420000 * i) + (i * i * 18500) - 320000,
}))

// Therapy
export const THERAPY_MIX = [
  { facility: 'Olympia Gardens', census: 98, pct: 52, inHouse: 51, contract: 49, pt: 58, ot: 46, slp: 42, rpd: 0, breakeven: false },
  { facility: 'Salem Oak', census: 112, pct: 68, inHouse: 68, contract: 32, pt: 72, ot: 64, slp: 68, rpd: 9.4, breakeven: true },
  { facility: 'Boise Ridge', census: 88, pct: 35, inHouse: 35, contract: 65, pt: 40, ot: 32, slp: 33, rpd: -3.2, breakeven: false },
  { facility: 'Pacific NW (target)', census: 186, pct: 14, inHouse: 14, contract: 86, pt: 18, ot: 12, slp: 12, rpd: -5.8, breakeven: false },
  { facility: 'Colorado SNF (target)', census: 245, pct: 0, inHouse: 0, contract: 100, pt: 0, ot: 0, slp: 0, rpd: -8.1, breakeven: false },
  { facility: 'Nevada ALF (target)', census: 72, pct: 44, inHouse: 44, contract: 56, pt: 48, ot: 40, slp: 44, rpd: 4.2, breakeven: false },
]

export const THERAPY_MINUTES = [
  { segment: 'Medicare A', pt: 92, ot: 76, slp: 34, optimalPt: [85, 110], optimalOt: [65, 90], optimalSlp: [28, 45] },
  { segment: 'Medicare Adv', pt: 68, ot: 54, slp: 22, optimalPt: [65, 85], optimalOt: [50, 70], optimalSlp: [20, 35] },
  { segment: 'Medicaid', pt: 44, ot: 36, slp: 14, optimalPt: [40, 60], optimalOt: [30, 50], optimalSlp: [12, 22] },
]

export const RPD_DATA = [
  { facility: 'Olympia Gardens', inHouseRPD: 312, contractRPD: 288, premium: 8.3 },
  { facility: 'Salem Oak', inHouseRPD: 328, contractRPD: 295, premium: 11.2 },
  { facility: 'Boise Ridge', inHouseRPD: 298, contractRPD: 278, premium: 7.2 },
  { facility: 'Pacific NW (target)', inHouseRPD: 0, contractRPD: 305, premium: 0 },
  { facility: 'Colorado (target)', inHouseRPD: 0, contractRPD: 318, premium: 0 },
]

export const THERAPY_OUTCOMES = [
  { metric: 'Discharge to Home', inHouse: 72, contract: 61, benchmark: 68 },
  { metric: 'Functional Improvement', inHouse: 84, contract: 74, benchmark: 78 },
  { metric: '30-Day Readmit', inHouse: 14, contract: 19, benchmark: 17 },
  { metric: 'PT Goal Achievement', inHouse: 79, contract: 68, benchmark: 72 },
]

export const COST_EFFICIENCY = [
  { discipline: 'PT', inHouseCostPerMin: 1.42, contractCostPerMin: 1.88 },
  { discipline: 'OT', inHouseCostPerMin: 1.38, contractCostPerMin: 1.82 },
  { discipline: 'SLP', inHouseCostPerMin: 1.65, contractCostPerMin: 2.14 },
]
