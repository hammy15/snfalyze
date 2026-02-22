import { z } from 'zod';

// ── Section 1: Facility Identification ──────────────────────────────
export const facilityIdentificationSchema = z.object({
  facilityName: z.string().min(1, 'Facility name is required'),
  ccn: z.string().optional().default(''),
  npiNumber: z.string().optional().default(''),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().max(2).optional().default(''),
  zipCode: z.string().optional().default(''),
  facilityType: z.enum(['SNF', 'ALF', 'CCRC', 'SNF_ALF_COMBO']).optional(),
  licensedBeds: z.number().int().positive().nullable().optional().default(null),
  medicareCertifiedBeds: z.number().int().nullable().optional().default(null),
  medicaidCertifiedBeds: z.number().int().nullable().optional().default(null),
});

// ── Section 2: Ownership & Deal Structure ───────────────────────────
export const ownershipDealStructureSchema = z.object({
  currentOwnerName: z.string().optional().default(''),
  ownerType: z.enum(['individual', 'llc', 'pe_backed', 'reit', 'non_profit']).optional(),
  yearsUnderCurrentOwnership: z.number().nullable().optional().default(null),
  askingPrice: z.number().positive().nullable().optional().default(null),
  dealStructure: z.enum(['asset_sale', 'stock_sale', 'lease', 'jv']).optional(),
  realEstateIncluded: z.boolean().optional().default(false),
  sellerFinancingAvailable: z.boolean().optional().default(false),
  estimatedClosingTimeline: z.enum(['<30_days', '30_60', '60_90', '90_plus', '']).optional().default(''),
  sourceOfDeal: z.enum(['broker', 'direct', 'auction', 'relationship']).optional(),
  brokerName: z.string().optional().default(''),
});

// ── Section 3: Financial Snapshot ───────────────────────────────────
export const financialSnapshotSchema = z.object({
  ttmRevenue: z.number().nullable().optional().default(null),
  ttmEbitda: z.number().nullable().optional().default(null),
  normalizedEbitda: z.number().nullable().optional().default(null),
  managementFeeStructure: z.string().optional().default(''),
  ttmTotalCensusAdc: z.number().nullable().optional().default(null),
  medicareCensusPercent: z.number().min(0).max(100).nullable().optional().default(null),
  medicaidCensusPercent: z.number().min(0).max(100).nullable().optional().default(null),
  privatePayCensusPercent: z.number().min(0).max(100).nullable().optional().default(null),
  revenueYear1: z.number().nullable().optional().default(null),
  revenueYear2: z.number().nullable().optional().default(null),
  revenueYear3: z.number().nullable().optional().default(null),
  ebitdaYear1: z.number().nullable().optional().default(null),
  ebitdaYear2: z.number().nullable().optional().default(null),
  ebitdaYear3: z.number().nullable().optional().default(null),
});

// ── Section 4: Operational Snapshot ─────────────────────────────────
export const operationalSnapshotSchema = z.object({
  cmsOverallRating: z.number().int().min(1).max(5).nullable().optional().default(null),
  cmsStaffingStar: z.number().int().min(1).max(5).nullable().optional().default(null),
  cmsQualityStar: z.number().int().min(1).max(5).nullable().optional().default(null),
  cmsInspectionStar: z.number().int().min(1).max(5).nullable().optional().default(null),
  administratorName: z.string().optional().default(''),
  donName: z.string().optional().default(''),
  totalStaffingFte: z.number().nullable().optional().default(null),
  agencyStaffPercent: z.number().min(0).max(100).nullable().optional().default(null),
  lastSurveyDate: z.string().optional().default(''),
  ijCitationsLast3Years: z.number().int().nullable().optional().default(null),
  cmi: z.number().nullable().optional().default(null),
});

// ── Section 5: Market Context ───────────────────────────────────────
export const marketContextSchema = z.object({
  primaryMarketArea: z.string().optional().default(''),
  marketType: z.enum(['urban', 'suburban', 'rural']).optional(),
  population65Plus: z.number().int().nullable().optional().default(null),
  knownCompetitors: z.string().optional().default(''),
  marketOccupancyRate: z.number().min(0).max(100).nullable().optional().default(null),
  isCONState: z.boolean().optional().default(false),
});

// ── Full Intake Data Schema ─────────────────────────────────────────
export const intakeStageDataSchema = z.object({
  facilityIdentification: facilityIdentificationSchema.optional(),
  ownershipDealStructure: ownershipDealStructureSchema.optional(),
  financialSnapshot: financialSnapshotSchema.optional(),
  operationalSnapshot: operationalSnapshotSchema.optional(),
  marketContext: marketContextSchema.optional(),
});

export type ValidatedIntakeData = z.infer<typeof intakeStageDataSchema>;

// ── Section completeness calculators ────────────────────────────────

const REQUIRED_FIELDS: Record<string, string[]> = {
  facilityIdentification: ['facilityName', 'state', 'facilityType', 'licensedBeds'],
  ownershipDealStructure: ['askingPrice', 'dealStructure'],
  financialSnapshot: ['ttmRevenue', 'ttmEbitda'],
  operationalSnapshot: ['cmsOverallRating'],
  marketContext: ['primaryMarketArea', 'marketType'],
};

function countFilledFields(obj: Record<string, unknown>): { filled: number; total: number } {
  const keys = Object.keys(obj);
  const filled = keys.filter(k => {
    const v = obj[k];
    return v !== null && v !== undefined && v !== '' && v !== false;
  }).length;
  return { filled, total: keys.length };
}

export function calculateSectionCompleteness(sectionId: string, data: Record<string, unknown>): number {
  if (!data || Object.keys(data).length === 0) return 0;
  const { filled, total } = countFilledFields(data);
  return total > 0 ? Math.round((filled / total) * 100) : 0;
}

export function calculateOverallCompleteness(intakeData: Partial<ValidatedIntakeData>): number {
  const sections = ['facilityIdentification', 'ownershipDealStructure', 'financialSnapshot', 'operationalSnapshot', 'marketContext'] as const;
  let totalFilled = 0;
  let totalFields = 0;
  for (const section of sections) {
    const sectionData = intakeData[section] as Record<string, unknown> | undefined;
    if (sectionData) {
      const { filled, total } = countFilledFields(sectionData);
      totalFilled += filled;
      totalFields += total;
    }
  }
  return totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;
}

export function getValidationErrors(intakeData: Partial<ValidatedIntakeData>): string[] {
  const errors: string[] = [];
  for (const [section, fields] of Object.entries(REQUIRED_FIELDS)) {
    const sectionData = (intakeData as Record<string, Record<string, unknown>>)[section];
    if (!sectionData) {
      errors.push(`${section}: section is empty`);
      continue;
    }
    for (const field of fields) {
      const val = sectionData[field];
      if (val === null || val === undefined || val === '') {
        errors.push(`${section}.${field} is required`);
      }
    }
  }
  return errors;
}
