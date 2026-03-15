// Cranium Intelligence Dashboard — SNF + ALF/IL Mock Data
// 3 demo facilities with realistic operational intelligence

export interface Facility {
  id: string
  name: string
  state: string
  snfBeds: number
  alfUnits: number
}

export const FACILITIES: Facility[] = [
  { id: 'sunrise', name: 'Sunrise Senior Care', state: 'WA', snfBeds: 120, alfUnits: 45 },
  { id: 'meadowbrook', name: 'Meadowbrook Health Center', state: 'OR', snfBeds: 95, alfUnits: 32 },
  { id: 'cedarridge', name: 'Cedar Ridge Living', state: 'CA', snfBeds: 84, alfUnits: 58 },
]

// ─── SNF TYPES ───────────────────────────────────────────────────────────────

export interface PayerCensus {
  name: string; beds: number; pct: number; rpd: number
}
export interface CensusByPayerData {
  totalBeds: number; occupiedBeds: number; occupancyPct: number; wowTrend: number; payers: PayerCensus[]
}
export interface ShiftHPPD { actual: number; target: number }
export interface HPPDByShiftData {
  benchmark: number; total: number
  morning: ShiftHPPD; afternoon: ShiftHPPD; night: ShiftHPPD
}
export interface MDSAssessment {
  residentId: string; residentName: string; assessmentType: string; dueDate: string
  status: 'overdue' | 'due_soon' | 'on_track'
}
export interface MDSARDTimingData {
  dueSoon: number; overdue: number; onTrack: number; assessments: MDSAssessment[]
}
export interface PDPMAccuracyData {
  actualCMI: number; expectedCMI: number; revenueAtRisk: number; captureRate: number
  components: { pt: number; ot: number; slp: number; nursing: number; nta: number }
}
export interface AgencyFlagData { agencyHoursPct: number; trend: number[]; weeklyChange: number }
export interface SurveyRisk { area: string; severity: 'high' | 'medium' | 'low'; detail: string }
export interface SurveyReadinessData { score: number; daysSinceLast: number; risks: SurveyRisk[] }
export interface PayerMixDriftData {
  now: { medicare: number; ma: number; medicaid: number; privatePay: number }
  ago90: { medicare: number; ma: number; medicaid: number; privatePay: number }
  rpdImpact: number
}
export interface StarRating { stars: number; trend: 'up' | 'down' | 'flat' }
export interface FiveStarData { staffing: StarRating; quality: StarRating; survey: StarRating; overall: StarRating }
export interface IncidentMetric { per1000: number; trend: 'up' | 'down' | 'flat'; thisMonth: number }
export interface IncidentLogData { falls: IncidentMetric; pressureInjuries: IncidentMetric; infections: IncidentMetric }
export interface ARBucket { bucket: string; medicare: number; medicaid: number; privatePay: number; total: number }
export interface ARAgingData { buckets: ARBucket[]; totalAR: number; over90Pct: number }
export interface SNFData {
  censusByPayer: CensusByPayerData; hppdByShift: HPPDByShiftData; mdsARDTiming: MDSARDTimingData
  pdpmAccuracy: PDPMAccuracyData; agencyFlag: AgencyFlagData; surveyReadiness: SurveyReadinessData
  payerMixDrift: PayerMixDriftData; fiveStar: FiveStarData; incidentLog: IncidentLogData; arAging: ARAgingData
}

// ─── ALF TYPES ───────────────────────────────────────────────────────────────

export interface CareLevelUnit { units: number; occupied: number; pct: number }
export interface ALFOccupancyData {
  il: CareLevelUnit; al1: CareLevelUnit; al2: CareLevelUnit; memoryCare: CareLevelUnit; totalOccupancy: number
}
export interface WaitlistEntry { careLevel: string; waitlistCount: number; avgWaitWeeks: number; status: 'healthy' | 'warning' | 'critical' }
export interface WaitlistDepthData { entries: WaitlistEntry[] }
export interface TourConversionData {
  conversionRate: number; industryBenchmark: number; toursThisMonth: number; moveInsThisMonth: number; trend: number[]
}
export interface MoveinSource { source: string; thisMonth: number; lastMonth: number }
export interface MoveinVelocityData { sources: MoveinSource[]; totalThisMonth: number; totalLastMonth: number }
export interface MigrationFlow { from: string; to: string; count: number }
export interface CareLevelMigrationData { flows: MigrationFlow[]; netHigherAcuity: number }
export interface AncillaryRevenueData { perUnit: number; trend: number[]; momChange: number; categories: { name: string; revenue: number }[] }
export interface Activity { name: string; satisfactionScore: number; participationRate: number }
export interface ActivitySatisfactionData { top3: Activity[]; bottom3: Activity[]; overallScore: number }
export interface ComplianceItem { deadline: string; daysUntil: number; description: string; status: 'overdue' | 'due_soon' | 'upcoming' }
export interface StateComplianceData { state: string; nextDeadline: ComplianceItem; upcoming: ComplianceItem[] }
export interface ALFData {
  occupancyByCareLevel: ALFOccupancyData; waitlistDepth: WaitlistDepthData; tourConversion: TourConversionData
  moveinVelocity: MoveinVelocityData; careLevelMigration: CareLevelMigrationData; ancillaryRevenue: AncillaryRevenueData
  activitySatisfaction: ActivitySatisfactionData; stateCompliance: StateComplianceData
}

// ─── SUNRISE SENIOR CARE (WA) — Mid performer, ~88% occ ─────────────────────

const SUNRISE_SNF: SNFData = {
  censusByPayer: {
    totalBeds: 120, occupiedBeds: 106, occupancyPct: 88.3, wowTrend: 1.2,
    payers: [
      { name: 'Medicare-A', beds: 28, pct: 26.4, rpd: 725 },
      { name: 'MA', beds: 18, pct: 17.0, rpd: 485 },
      { name: 'Medicaid', beds: 52, pct: 49.1, rpd: 195 },
      { name: 'Private Pay', beds: 6, pct: 5.7, rpd: 340 },
      { name: 'VA', beds: 2, pct: 1.9, rpd: 410 },
    ],
  },
  hppdByShift: {
    benchmark: 3.5, total: 3.32,
    morning: { actual: 1.42, target: 1.5 },
    afternoon: { actual: 1.18, target: 1.2 },
    night: { actual: 0.72, target: 0.8 },
  },
  mdsARDTiming: {
    dueSoon: 8, overdue: 2, onTrack: 24,
    assessments: [
      { residentId: 'R001', residentName: 'Eleanor Thompson', assessmentType: '5-Day', dueDate: '2026-03-05', status: 'overdue' },
      { residentId: 'R002', residentName: 'Harold Jenkins', assessmentType: '14-Day', dueDate: '2026-03-06', status: 'overdue' },
      { residentId: 'R003', residentName: 'Martha Swenson', assessmentType: 'Quarterly', dueDate: '2026-03-08', status: 'due_soon' },
      { residentId: 'R004', residentName: 'Robert Callahan', assessmentType: '30-Day', dueDate: '2026-03-10', status: 'due_soon' },
      { residentId: 'R005', residentName: 'Dorothy Kim', assessmentType: 'Annual', dueDate: '2026-03-15', status: 'due_soon' },
      { residentId: 'R006', residentName: 'James Okonkwo', assessmentType: '60-Day', dueDate: '2026-03-18', status: 'on_track' },
    ],
  },
  pdpmAccuracy: {
    actualCMI: 1.42, expectedCMI: 1.58, revenueAtRisk: 12400, captureRate: 89.9,
    components: { pt: 0.28, ot: 0.24, slp: 0.08, nursing: 0.67, nta: 0.15 },
  },
  agencyFlag: { agencyHoursPct: 14.2, trend: [11.8, 12.4, 13.1, 14.0, 13.8, 14.2], weeklyChange: 0.4 },
  surveyReadiness: {
    score: 72, daysSinceLast: 248,
    risks: [
      { area: 'Infection Control', severity: 'high', detail: 'Hand hygiene audit: 2 deficiencies noted last round' },
      { area: 'MDS Timing', severity: 'medium', detail: '2 ARDs overdue — may trigger F-tag 641' },
      { area: 'Staffing Documentation', severity: 'medium', detail: 'PBJ reporting gaps on 3 days last quarter' },
    ],
  },
  payerMixDrift: {
    now: { medicare: 26.4, ma: 17.0, medicaid: 49.1, privatePay: 7.5 },
    ago90: { medicare: 31.2, ma: 14.8, medicaid: 47.0, privatePay: 7.0 },
    rpdImpact: -4800,
  },
  fiveStar: {
    staffing: { stars: 3, trend: 'flat' }, quality: { stars: 4, trend: 'up' },
    survey: { stars: 3, trend: 'down' }, overall: { stars: 3, trend: 'flat' },
  },
  incidentLog: {
    falls: { per1000: 2.8, trend: 'down', thisMonth: 7 },
    pressureInjuries: { per1000: 0.9, trend: 'flat', thisMonth: 2 },
    infections: { per1000: 3.4, trend: 'up', thisMonth: 9 },
  },
  arAging: {
    buckets: [
      { bucket: '0–30', medicare: 84000, medicaid: 31000, privatePay: 8200, total: 123200 },
      { bucket: '31–60', medicare: 42000, medicaid: 18000, privatePay: 4100, total: 64100 },
      { bucket: '61–90', medicare: 18000, medicaid: 11000, privatePay: 2800, total: 31800 },
      { bucket: '90+', medicare: 9000, medicaid: 6000, privatePay: 3400, total: 18400 },
    ],
    totalAR: 237500, over90Pct: 7.7,
  },
}

const SUNRISE_ALF: ALFData = {
  occupancyByCareLevel: {
    il: { units: 20, occupied: 18, pct: 90.0 }, al1: { units: 12, occupied: 11, pct: 91.7 },
    al2: { units: 8, occupied: 7, pct: 87.5 }, memoryCare: { units: 5, occupied: 4, pct: 80.0 }, totalOccupancy: 88.9,
  },
  waitlistDepth: {
    entries: [
      { careLevel: 'IL', waitlistCount: 6, avgWaitWeeks: 5.2, status: 'healthy' },
      { careLevel: 'AL1', waitlistCount: 3, avgWaitWeeks: 3.1, status: 'healthy' },
      { careLevel: 'AL2', waitlistCount: 1, avgWaitWeeks: 2.4, status: 'warning' },
      { careLevel: 'Memory Care', waitlistCount: 0, avgWaitWeeks: 0, status: 'critical' },
    ],
  },
  tourConversion: { conversionRate: 24.8, industryBenchmark: 22.0, toursThisMonth: 18, moveInsThisMonth: 4, trend: [19.2, 21.4, 22.8, 20.1, 23.5, 24.8] },
  moveinVelocity: {
    sources: [
      { source: 'Hospital Discharge', thisMonth: 2, lastMonth: 1 },
      { source: 'Referral — MD', thisMonth: 1, lastMonth: 2 },
      { source: 'Online Inquiry', thisMonth: 1, lastMonth: 0 },
      { source: 'Walk-In', thisMonth: 0, lastMonth: 1 },
    ],
    totalThisMonth: 4, totalLastMonth: 4,
  },
  careLevelMigration: {
    flows: [{ from: 'IL', to: 'AL1', count: 1 }, { from: 'AL1', to: 'AL2', count: 2 }, { from: 'AL2', to: 'Memory Care', count: 1 }],
    netHigherAcuity: 4,
  },
  ancillaryRevenue: {
    perUnit: 182, trend: [155, 162, 171, 168, 175, 182], momChange: 4.0,
    categories: [{ name: 'Therapy', revenue: 2840 }, { name: 'Medication Mgmt', revenue: 1980 }, { name: 'Incontinence Care', revenue: 1240 }, { name: 'Transportation', revenue: 720 }],
  },
  activitySatisfaction: {
    top3: [
      { name: 'Music Therapy', satisfactionScore: 94, participationRate: 78 },
      { name: 'Bingo & Games', satisfactionScore: 91, participationRate: 85 },
      { name: 'Garden Club', satisfactionScore: 89, participationRate: 62 },
    ],
    bottom3: [
      { name: 'Fitness Classes', satisfactionScore: 62, participationRate: 31 },
      { name: 'Craft Hour', satisfactionScore: 67, participationRate: 44 },
      { name: 'Movie Night', satisfactionScore: 71, participationRate: 55 },
    ],
    overallScore: 82,
  },
  stateCompliance: {
    state: 'WA',
    nextDeadline: { deadline: '2026-03-15', daysUntil: 11, description: 'WA DSHS Annual Facility Inspection Report', status: 'due_soon' },
    upcoming: [
      { deadline: '2026-03-10', daysUntil: 6, description: 'Staff Training Hours Certification', status: 'due_soon' },
      { deadline: '2026-02-28', daysUntil: -5, description: 'LEIE Exclusion Check Documentation', status: 'overdue' },
      { deadline: '2026-04-01', daysUntil: 28, description: 'Q1 Incident Report Submission', status: 'upcoming' },
    ],
  },
}

// ─── MEADOWBROOK HEALTH CENTER (OR) — Underperformer, ~85% occ ───────────────

const MEADOWBROOK_SNF: SNFData = {
  censusByPayer: {
    totalBeds: 95, occupiedBeds: 81, occupancyPct: 85.3, wowTrend: -0.8,
    payers: [
      { name: 'Medicare-A', beds: 22, pct: 27.2, rpd: 710 },
      { name: 'MA', beds: 12, pct: 14.8, rpd: 472 },
      { name: 'Medicaid', beds: 41, pct: 50.6, rpd: 188 },
      { name: 'Private Pay', beds: 5, pct: 6.2, rpd: 325 },
      { name: 'VA', beds: 1, pct: 1.2, rpd: 400 },
    ],
  },
  hppdByShift: {
    benchmark: 3.5, total: 3.08,
    morning: { actual: 1.31, target: 1.5 },
    afternoon: { actual: 1.06, target: 1.2 },
    night: { actual: 0.71, target: 0.8 },
  },
  mdsARDTiming: {
    dueSoon: 5, overdue: 4, onTrack: 18,
    assessments: [
      { residentId: 'M001', residentName: 'Agnes Müller', assessmentType: '5-Day', dueDate: '2026-03-03', status: 'overdue' },
      { residentId: 'M002', residentName: 'William Bradford', assessmentType: '14-Day', dueDate: '2026-03-03', status: 'overdue' },
      { residentId: 'M003', residentName: 'Susan Park', assessmentType: '30-Day', dueDate: '2026-03-04', status: 'overdue' },
      { residentId: 'M004', residentName: 'George Reyes', assessmentType: 'Quarterly', dueDate: '2026-03-04', status: 'overdue' },
      { residentId: 'M005', residentName: 'Florence Webb', assessmentType: '60-Day', dueDate: '2026-03-08', status: 'due_soon' },
      { residentId: 'M006', residentName: 'Albert Nguyen', assessmentType: 'Annual', dueDate: '2026-03-12', status: 'due_soon' },
    ],
  },
  pdpmAccuracy: {
    actualCMI: 1.28, expectedCMI: 1.52, revenueAtRisk: 19800, captureRate: 84.2,
    components: { pt: 0.24, ot: 0.19, slp: 0.06, nursing: 0.62, nta: 0.17 },
  },
  agencyFlag: { agencyHoursPct: 22.1, trend: [17.4, 18.9, 20.2, 21.0, 21.8, 22.1], weeklyChange: 0.3 },
  surveyReadiness: {
    score: 54, daysSinceLast: 387,
    risks: [
      { area: 'Staffing Levels', severity: 'high', detail: 'Below HPPD minimum for 6 of last 14 days' },
      { area: 'MDS Compliance', severity: 'high', detail: '4 ARDs overdue — pattern triggers survey flag' },
      { area: 'Abuse Reporting', severity: 'medium', detail: 'One incident report filed 3 days late' },
    ],
  },
  payerMixDrift: {
    now: { medicare: 27.2, ma: 14.8, medicaid: 50.6, privatePay: 7.4 },
    ago90: { medicare: 29.8, ma: 13.1, medicaid: 50.2, privatePay: 6.9 },
    rpdImpact: -2200,
  },
  fiveStar: {
    staffing: { stars: 2, trend: 'down' }, quality: { stars: 3, trend: 'flat' },
    survey: { stars: 2, trend: 'down' }, overall: { stars: 2, trend: 'down' },
  },
  incidentLog: {
    falls: { per1000: 4.1, trend: 'up', thisMonth: 9 },
    pressureInjuries: { per1000: 1.8, trend: 'up', thisMonth: 4 },
    infections: { per1000: 5.2, trend: 'up', thisMonth: 11 },
  },
  arAging: {
    buckets: [
      { bucket: '0–30', medicare: 68000, medicaid: 24000, privatePay: 6500, total: 98500 },
      { bucket: '31–60', medicare: 38000, medicaid: 14000, privatePay: 3200, total: 55200 },
      { bucket: '61–90', medicare: 22000, medicaid: 9000, privatePay: 2100, total: 33100 },
      { bucket: '90+', medicare: 14000, medicaid: 8000, privatePay: 4200, total: 26200 },
    ],
    totalAR: 213000, over90Pct: 12.3,
  },
}

const MEADOWBROOK_ALF: ALFData = {
  occupancyByCareLevel: {
    il: { units: 14, occupied: 11, pct: 78.6 }, al1: { units: 10, occupied: 9, pct: 90.0 },
    al2: { units: 5, occupied: 5, pct: 100.0 }, memoryCare: { units: 3, occupied: 2, pct: 66.7 }, totalOccupancy: 84.4,
  },
  waitlistDepth: {
    entries: [
      { careLevel: 'IL', waitlistCount: 1, avgWaitWeeks: 2.1, status: 'warning' },
      { careLevel: 'AL1', waitlistCount: 3, avgWaitWeeks: 3.8, status: 'healthy' },
      { careLevel: 'AL2', waitlistCount: 4, avgWaitWeeks: 5.1, status: 'healthy' },
      { careLevel: 'Memory Care', waitlistCount: 2, avgWaitWeeks: 4.0, status: 'healthy' },
    ],
  },
  tourConversion: { conversionRate: 18.4, industryBenchmark: 22.0, toursThisMonth: 14, moveInsThisMonth: 2, trend: [22.1, 20.8, 19.5, 18.9, 18.1, 18.4] },
  moveinVelocity: {
    sources: [
      { source: 'Hospital Discharge', thisMonth: 1, lastMonth: 2 },
      { source: 'Referral — MD', thisMonth: 1, lastMonth: 1 },
      { source: 'Online Inquiry', thisMonth: 0, lastMonth: 1 },
      { source: 'Walk-In', thisMonth: 0, lastMonth: 0 },
    ],
    totalThisMonth: 2, totalLastMonth: 4,
  },
  careLevelMigration: {
    flows: [{ from: 'IL', to: 'AL1', count: 2 }, { from: 'AL1', to: 'AL2', count: 1 }, { from: 'AL2', to: 'Memory Care', count: 0 }],
    netHigherAcuity: 3,
  },
  ancillaryRevenue: {
    perUnit: 148, trend: [162, 158, 151, 149, 145, 148], momChange: 2.1,
    categories: [{ name: 'Therapy', revenue: 1820 }, { name: 'Medication Mgmt', revenue: 1540 }, { name: 'Incontinence Care', revenue: 980 }, { name: 'Transportation', revenue: 400 }],
  },
  activitySatisfaction: {
    top3: [
      { name: 'Trivia Night', satisfactionScore: 88, participationRate: 72 },
      { name: 'Art Class', satisfactionScore: 85, participationRate: 58 },
      { name: 'Chair Yoga', satisfactionScore: 83, participationRate: 64 },
    ],
    bottom3: [
      { name: 'Technology Help', satisfactionScore: 55, participationRate: 22 },
      { name: 'Book Club', satisfactionScore: 61, participationRate: 30 },
      { name: 'Board Games', satisfactionScore: 68, participationRate: 48 },
    ],
    overallScore: 76,
  },
  stateCompliance: {
    state: 'OR',
    nextDeadline: { deadline: '2026-02-28', daysUntil: -5, description: 'OR DHS Quarterly Activities Report', status: 'overdue' },
    upcoming: [
      { deadline: '2026-03-15', daysUntil: 11, description: 'Fire Safety Drill Certification', status: 'due_soon' },
      { deadline: '2026-03-31', daysUntil: 27, description: 'Staff Vaccination Documentation', status: 'upcoming' },
    ],
  },
}

// ─── CEDAR RIDGE LIVING (CA) — High performer, ~91% occ ─────────────────────

const CEDARRIDGE_SNF: SNFData = {
  censusByPayer: {
    totalBeds: 84, occupiedBeds: 76, occupancyPct: 90.5, wowTrend: 2.1,
    payers: [
      { name: 'Medicare-A', beds: 24, pct: 31.6, rpd: 740 },
      { name: 'MA', beds: 14, pct: 18.4, rpd: 498 },
      { name: 'Medicaid', beds: 32, pct: 42.1, rpd: 208 },
      { name: 'Private Pay', beds: 5, pct: 6.6, rpd: 380 },
      { name: 'VA', beds: 1, pct: 1.3, rpd: 425 },
    ],
  },
  hppdByShift: {
    benchmark: 3.5, total: 3.68,
    morning: { actual: 1.54, target: 1.5 },
    afternoon: { actual: 1.26, target: 1.2 },
    night: { actual: 0.88, target: 0.8 },
  },
  mdsARDTiming: {
    dueSoon: 4, overdue: 0, onTrack: 22,
    assessments: [
      { residentId: 'C001', residentName: 'Patricia Nguyen', assessmentType: '14-Day', dueDate: '2026-03-09', status: 'due_soon' },
      { residentId: 'C002', residentName: 'Richard Torres', assessmentType: 'Quarterly', dueDate: '2026-03-11', status: 'due_soon' },
      { residentId: 'C003', residentName: 'Barbara Chen', assessmentType: '30-Day', dueDate: '2026-03-12', status: 'due_soon' },
      { residentId: 'C004', residentName: 'Thomas Walsh', assessmentType: '60-Day', dueDate: '2026-03-14', status: 'due_soon' },
    ],
  },
  pdpmAccuracy: {
    actualCMI: 1.61, expectedCMI: 1.65, revenueAtRisk: 3200, captureRate: 97.6,
    components: { pt: 0.32, ot: 0.28, slp: 0.11, nursing: 0.72, nta: 0.18 },
  },
  agencyFlag: { agencyHoursPct: 7.8, trend: [9.4, 8.8, 8.2, 8.1, 7.9, 7.8], weeklyChange: -0.1 },
  surveyReadiness: {
    score: 88, daysSinceLast: 142,
    risks: [
      { area: 'Advance Directives', severity: 'medium', detail: '2 new admits missing updated POLST forms' },
      { area: 'Therapy Documentation', severity: 'low', detail: 'Minor SLP notes missing dates in 3 records' },
      { area: 'Dietary Compliance', severity: 'low', detail: 'Weight monitoring form missing for 1 resident' },
    ],
  },
  payerMixDrift: {
    now: { medicare: 31.6, ma: 18.4, medicaid: 42.1, privatePay: 7.9 },
    ago90: { medicare: 28.4, ma: 17.2, medicaid: 46.8, privatePay: 7.6 },
    rpdImpact: 6100,
  },
  fiveStar: {
    staffing: { stars: 5, trend: 'up' }, quality: { stars: 4, trend: 'up' },
    survey: { stars: 5, trend: 'flat' }, overall: { stars: 5, trend: 'up' },
  },
  incidentLog: {
    falls: { per1000: 1.4, trend: 'down', thisMonth: 2 },
    pressureInjuries: { per1000: 0.4, trend: 'down', thisMonth: 1 },
    infections: { per1000: 1.8, trend: 'down', thisMonth: 3 },
  },
  arAging: {
    buckets: [
      { bucket: '0–30', medicare: 72000, medicaid: 18000, privatePay: 7400, total: 97400 },
      { bucket: '31–60', medicare: 31000, medicaid: 8000, privatePay: 2800, total: 41800 },
      { bucket: '61–90', medicare: 11000, medicaid: 4000, privatePay: 1200, total: 16200 },
      { bucket: '90+', medicare: 4000, medicaid: 2000, privatePay: 800, total: 6800 },
    ],
    totalAR: 162200, over90Pct: 4.2,
  },
}

const CEDARRIDGE_ALF: ALFData = {
  occupancyByCareLevel: {
    il: { units: 24, occupied: 22, pct: 91.7 }, al1: { units: 18, occupied: 17, pct: 94.4 },
    al2: { units: 10, occupied: 9, pct: 90.0 }, memoryCare: { units: 6, occupied: 6, pct: 100.0 }, totalOccupancy: 93.1,
  },
  waitlistDepth: {
    entries: [
      { careLevel: 'IL', waitlistCount: 9, avgWaitWeeks: 7.4, status: 'healthy' },
      { careLevel: 'AL1', waitlistCount: 5, avgWaitWeeks: 5.2, status: 'healthy' },
      { careLevel: 'AL2', waitlistCount: 3, avgWaitWeeks: 4.1, status: 'healthy' },
      { careLevel: 'Memory Care', waitlistCount: 4, avgWaitWeeks: 6.8, status: 'healthy' },
    ],
  },
  tourConversion: { conversionRate: 27.3, industryBenchmark: 22.0, toursThisMonth: 22, moveInsThisMonth: 6, trend: [23.1, 24.5, 25.8, 26.2, 26.9, 27.3] },
  moveinVelocity: {
    sources: [
      { source: 'Hospital Discharge', thisMonth: 3, lastMonth: 2 },
      { source: 'Referral — MD', thisMonth: 2, lastMonth: 1 },
      { source: 'Online Inquiry', thisMonth: 1, lastMonth: 2 },
      { source: 'Walk-In', thisMonth: 0, lastMonth: 1 },
    ],
    totalThisMonth: 6, totalLastMonth: 6,
  },
  careLevelMigration: {
    flows: [{ from: 'IL', to: 'AL1', count: 1 }, { from: 'AL1', to: 'AL2', count: 1 }, { from: 'AL2', to: 'Memory Care', count: 2 }],
    netHigherAcuity: 4,
  },
  ancillaryRevenue: {
    perUnit: 221, trend: [196, 202, 208, 214, 218, 221], momChange: 1.4,
    categories: [{ name: 'Therapy', revenue: 3840 }, { name: 'Medication Mgmt', revenue: 2680 }, { name: 'Incontinence Care', revenue: 1580 }, { name: 'Transportation', revenue: 1040 }],
  },
  activitySatisfaction: {
    top3: [
      { name: 'Live Music Events', satisfactionScore: 97, participationRate: 88 },
      { name: 'Cooking Class', satisfactionScore: 93, participationRate: 74 },
      { name: 'Outdoor Walks', satisfactionScore: 91, participationRate: 79 },
    ],
    bottom3: [
      { name: 'Puzzles Corner', satisfactionScore: 72, participationRate: 42 },
      { name: 'Writing Workshop', satisfactionScore: 75, participationRate: 35 },
      { name: 'Watercolor Art', satisfactionScore: 78, participationRate: 48 },
    ],
    overallScore: 89,
  },
  stateCompliance: {
    state: 'CA',
    nextDeadline: { deadline: '2026-03-20', daysUntil: 16, description: 'CA CDPH Resident Rights Training Attestation', status: 'upcoming' },
    upcoming: [
      { deadline: '2026-03-31', daysUntil: 27, description: 'Q1 Grievance Log Submission', status: 'upcoming' },
      { deadline: '2026-04-15', daysUntil: 42, description: 'Annual License Renewal Application', status: 'upcoming' },
    ],
  },
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────

export const ALL_DATA: Record<string, { snf: SNFData; alf: ALFData }> = {
  sunrise: { snf: SUNRISE_SNF, alf: SUNRISE_ALF },
  meadowbrook: { snf: MEADOWBROOK_SNF, alf: MEADOWBROOK_ALF },
  cedarridge: { snf: CEDARRIDGE_SNF, alf: CEDARRIDGE_ALF },
}
