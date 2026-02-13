import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  timestamp,
  date,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const assetTypeEnum = pgEnum('asset_type', ['SNF', 'ALF', 'ILF', 'HOSPICE']);
export const hospiceTypeEnum = pgEnum('hospice_type', ['freestanding', 'hospital_based', 'home_health_based']);
export const dealStatusEnum = pgEnum('deal_status', [
  'new',
  'analyzing',
  'reviewed',
  'under_loi',
  'due_diligence',
  'closed',
  'passed',
]);

// AI Agent Enums
export const agentSessionStatusEnum = pgEnum('agent_session_status', [
  'active',
  'paused',
  'completed',
  'error',
]);
export const agentToolStatusEnum = pgEnum('agent_tool_status', [
  'pending',
  'approved',
  'rejected',
  'executing',
  'completed',
  'failed',
]);
export const clarificationStatusEnum = pgEnum('clarification_status', [
  'pending',
  'resolved',
  'skipped',
  'auto_resolved',
]);
export const clarificationTypeEnum = pgEnum('clarification_type', [
  'low_confidence',
  'out_of_range',
  'conflict',
  'missing',
  'validation_error',
]);
export const conflictResolutionEnum = pgEnum('conflict_resolution', [
  'pending',
  'use_first',
  'use_second',
  'use_average',
  'manual_value',
  'ignored',
]);
export const patternTypeEnum = pgEnum('pattern_type', [
  'extraction',
  'normalization',
  'validation',
  'classification',
]);
export const suggestionStatusEnum = pgEnum('suggestion_status', [
  'pending',
  'accepted',
  'rejected',
  'expired',
]);
export const documentTypeEnum = pgEnum('document_type', [
  'financial_statement',
  'rent_roll',
  'census_report',
  'staffing_report',
  'survey_report',
  'cost_report',
  'om_package',
  'lease_agreement',
  'appraisal',
  'environmental',
  'other',
]);
export const documentStatusEnum = pgEnum('document_status', [
  'uploaded',
  'parsing',
  'extracting',
  'normalizing',
  'analyzing',
  'complete',
  'error',
]);
export const capexCategoryEnum = pgEnum('capex_category', ['immediate', 'deferred', 'competitive']);
export const partnerTypeEnum = pgEnum('partner_type', ['lender', 'reit', 'equity']);
export const riskToleranceEnum = pgEnum('risk_tolerance', ['conservative', 'moderate', 'aggressive']);
export const assumptionCategoryEnum = pgEnum('assumption_category', ['minor', 'census', 'labor', 'regulatory']);
export const valuationMethodEnum = pgEnum('valuation_method', [
  'cap_rate',
  'price_per_bed',
  'comparable_sales',
  'dcf',
  'noi_multiple',
  'proprietary',
]);
export const scenarioTypeEnum = pgEnum('scenario_type', [
  'baseline',
  'upside',
  'downside',
  'custom',
]);

// Sale-Leaseback Enums
export const dealStructureEnum = pgEnum('deal_structure', [
  'purchase',
  'lease',
  'sale_leaseback',
  'acquisition_financing',
]);

export const analysisStageTypeEnum = pgEnum('analysis_stage_type', [
  'document_upload',
  'census_validation',
  'revenue_analysis',
  'expense_analysis',
  'cms_integration',
  'valuation_coverage',
]);

// Enhanced Wizard Stage Types
export const wizardStageTypeEnum = pgEnum('wizard_stage_type', [
  'document_upload',
  'review_analysis',
  'facility_verification',
  'document_extraction',
  'coa_mapping_review',
  'financial_consolidation',
]);

// Document Folder Types
export const folderTypeEnum = pgEnum('folder_type', [
  'financial',
  'census',
  'survey',
  'legal',
  'other',
]);

// Extraction Stage Types
export const extractionStageEnum = pgEnum('extraction_stage', [
  'pending',
  'in_progress',
  'review_needed',
  'complete',
]);

// COA Mapping Methods
export const mappingMethodEnum = pgEnum('mapping_method', [
  'auto',
  'suggested',
  'manual',
]);

export const analysisStageStatusEnum = pgEnum('analysis_stage_status', [
  'pending',
  'in_progress',
  'completed',
  'blocked',
]);

// Tables
export const deals = pgTable(
  'deals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    status: dealStatusEnum('status').default('new'),
    assetType: assetTypeEnum('asset_type').notNull(),
    askingPrice: decimal('asking_price', { precision: 15, scale: 2 }),
    beds: integer('beds'),
    primaryState: varchar('primary_state', { length: 2 }),
    markets: text('markets').array(),
    brokerName: varchar('broker_name', { length: 255 }),
    brokerFirm: varchar('broker_firm', { length: 255 }),
    sellerName: varchar('seller_name', { length: 255 }),
    brokerCredibilityScore: integer('broker_credibility_score'),
    thesis: text('thesis'),
    confidenceScore: integer('confidence_score'),
    analysisNarrative: text('analysis_narrative'),
    // AI Platform Enhancement Fields
    extractionQualityScore: integer('extraction_quality_score'),
    hasUnresolvedConflicts: boolean('has_unresolved_conflicts').default(false),
    // Sale-Leaseback Fields
    dealStructure: dealStructureEnum('deal_structure').default('purchase'),
    isAllOrNothing: boolean('is_all_or_nothing').default(true),
    buyerPartnerId: uuid('buyer_partner_id'),
    specialCircumstances: text('special_circumstances'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    analyzedAt: timestamp('analyzed_at', { withTimezone: true }),
    version: integer('version').default(1),
  },
  (table) => ({
    statusIdx: index('idx_deals_status').on(table.status),
    assetTypeIdx: index('idx_deals_asset_type').on(table.assetType),
    primaryStateIdx: index('idx_deals_primary_state').on(table.primaryState),
    dealStructureIdx: index('idx_deals_deal_structure').on(table.dealStructure),
  })
);

export const facilities = pgTable(
  'facilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    ccn: varchar('ccn', { length: 20 }), // CMS Certification Number for linking to CMS data
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 2 }),
    zipCode: varchar('zip_code', { length: 10 }),
    assetType: assetTypeEnum('asset_type').notNull(),
    licensedBeds: integer('licensed_beds'),
    certifiedBeds: integer('certified_beds'),
    yearBuilt: integer('year_built'),
    lastRenovation: integer('last_renovation'),
    squareFootage: integer('square_footage'),
    acres: decimal('acres', { precision: 10, scale: 2 }),
    cmsRating: integer('cms_rating'),
    healthRating: integer('health_rating'),
    staffingRating: integer('staffing_rating'),
    qualityRating: integer('quality_rating'),
    isSff: boolean('is_sff').default(false),
    isSffWatch: boolean('is_sff_watch').default(false),
    hasImmediateJeopardy: boolean('has_immediate_jeopardy').default(false),
    // Wizard Enhancement Fields
    isVerified: boolean('is_verified').default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: varchar('verified_by', { length: 255 }),
    cmsDataSnapshot: jsonb('cms_data_snapshot'),
    // Hospice-Specific Fields
    hospiceType: hospiceTypeEnum('hospice_type'),
    averageDailyPatientCensus: decimal('average_daily_patient_census', { precision: 10, scale: 2 }),
    hospiceAdmissionsPerMonth: integer('hospice_admissions_per_month'),
    averageLengthOfStay: decimal('average_length_of_stay', { precision: 10, scale: 2 }), // days
    liveDischargeRate: decimal('live_discharge_rate', { precision: 5, scale: 4 }), // percentage
    capPerPatientDay: decimal('cap_per_patient_day', { precision: 10, scale: 2 }), // Medicare cap
    routineHomeCareRevenue: decimal('routine_home_care_revenue', { precision: 15, scale: 2 }),
    continuousHomeCareRevenue: decimal('continuous_home_care_revenue', { precision: 15, scale: 2 }),
    generalInpatientRevenue: decimal('general_inpatient_revenue', { precision: 15, scale: 2 }),
    respiteCareRevenue: decimal('respite_care_revenue', { precision: 15, scale: 2 }),
    serviceAreaCounties: text('service_area_counties').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_facilities_deal_id').on(table.dealId),
    ccnIdx: index('idx_facilities_ccn').on(table.ccn),
    isVerifiedIdx: index('idx_facilities_is_verified').on(table.isVerified),
  })
);

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    filename: varchar('filename', { length: 255 }).notNull(),
    type: documentTypeEnum('type'),
    status: documentStatusEnum('status').default('uploaded'),
    periodStart: date('period_start'),
    periodEnd: date('period_end'),
    facilityId: uuid('facility_id').references(() => facilities.id),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    extractedData: jsonb('extracted_data'),
    rawText: text('raw_text'),
    errors: text('errors').array(),
    // AI Platform Enhancement Fields
    clarificationStatus: clarificationStatusEnum('clarification_status'),
    pendingClarifications: integer('pending_clarifications').default(0),
    extractionConfidence: integer('extraction_confidence'),
    // Wizard Enhancement Fields
    folderId: uuid('folder_id'),
    userConfirmedType: boolean('user_confirmed_type').default(false),
    extractionStage: extractionStageEnum('extraction_stage'),
    ocrQualityScore: integer('ocr_quality_score'),
    // Document Intelligence Fields (Phase 4)
    aiSummary: text('ai_summary'),
    aiKeyFindings: jsonb('ai_key_findings'),
  },
  (table) => ({
    dealIdIdx: index('idx_documents_deal_id').on(table.dealId),
    statusIdx: index('idx_documents_status').on(table.status),
    clarificationStatusIdx: index('idx_documents_clarification_status').on(table.clarificationStatus),
    folderIdIdx: index('idx_documents_folder_id').on(table.folderId),
    extractionStageIdx: index('idx_documents_extraction_stage').on(table.extractionStage),
  })
);

export const financialPeriods = pgTable(
  'financial_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id').references(() => facilities.id),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    isAnnualized: boolean('is_annualized').default(false),
    totalRevenue: decimal('total_revenue', { precision: 15, scale: 2 }),
    medicareRevenue: decimal('medicare_revenue', { precision: 15, scale: 2 }),
    medicaidRevenue: decimal('medicaid_revenue', { precision: 15, scale: 2 }),
    managedCareRevenue: decimal('managed_care_revenue', { precision: 15, scale: 2 }),
    privatePayRevenue: decimal('private_pay_revenue', { precision: 15, scale: 2 }),
    otherRevenue: decimal('other_revenue', { precision: 15, scale: 2 }),
    totalExpenses: decimal('total_expenses', { precision: 15, scale: 2 }),
    laborCost: decimal('labor_cost', { precision: 15, scale: 2 }),
    coreLabor: decimal('core_labor', { precision: 15, scale: 2 }),
    agencyLabor: decimal('agency_labor', { precision: 15, scale: 2 }),
    foodCost: decimal('food_cost', { precision: 15, scale: 2 }),
    suppliesCost: decimal('supplies_cost', { precision: 15, scale: 2 }),
    utilitiesCost: decimal('utilities_cost', { precision: 15, scale: 2 }),
    insuranceCost: decimal('insurance_cost', { precision: 15, scale: 2 }),
    managementFee: decimal('management_fee', { precision: 15, scale: 2 }),
    otherExpenses: decimal('other_expenses', { precision: 15, scale: 2 }),
    noi: decimal('noi', { precision: 15, scale: 2 }),
    ebitdar: decimal('ebitdar', { precision: 15, scale: 2 }),
    normalizedNoi: decimal('normalized_noi', { precision: 15, scale: 2 }),
    licensedBeds: integer('licensed_beds'),
    averageDailyCensus: decimal('average_daily_census', { precision: 10, scale: 2 }),
    occupancyRate: decimal('occupancy_rate', { precision: 5, scale: 4 }),
    hppd: decimal('hppd', { precision: 5, scale: 2 }),
    agencyPercentage: decimal('agency_percentage', { precision: 5, scale: 4 }),
    confidenceScore: integer('confidence_score'),
    source: varchar('source', { length: 50 }), // 'extracted', 'manual', 'imported'
    sourceDocumentId: uuid('source_document_id').references(() => documents.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_financial_periods_deal_id').on(table.dealId),
    facilityIdIdx: index('idx_financial_periods_facility_id').on(table.facilityId),
  })
);

export const valuations = pgTable(
  'valuations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id').references(() => facilities.id),
    viewType: varchar('view_type', { length: 20 }).notNull(),
    method: valuationMethodEnum('method').default('cap_rate'),
    valueLow: decimal('value_low', { precision: 15, scale: 2 }),
    valueBase: decimal('value_base', { precision: 15, scale: 2 }),
    valueHigh: decimal('value_high', { precision: 15, scale: 2 }),
    capRateLow: decimal('cap_rate_low', { precision: 5, scale: 4 }),
    capRateBase: decimal('cap_rate_base', { precision: 5, scale: 4 }),
    capRateHigh: decimal('cap_rate_high', { precision: 5, scale: 4 }),
    noiUsed: decimal('noi_used', { precision: 15, scale: 2 }),
    pricePerBed: decimal('price_per_bed', { precision: 15, scale: 2 }),
    suggestedOffer: decimal('suggested_offer', { precision: 15, scale: 2 }),
    walkAwayThreshold: decimal('walk_away_threshold', { precision: 15, scale: 2 }),
    upsideScenario: jsonb('upside_scenario'),
    inputsUsed: jsonb('inputs_used'),
    comparableSaleIds: uuid('comparable_sale_ids').array(),
    confidenceScore: integer('confidence_score'),
    confidenceNarrative: text('confidence_narrative'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_valuations_deal_id').on(table.dealId),
    viewTypeIdx: index('idx_valuations_view_type').on(table.viewType),
    methodIdx: index('idx_valuations_method').on(table.method),
  })
);

export const capexItems = pgTable(
  'capex_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id').references(() => facilities.id),
    category: capexCategoryEnum('category').notNull(),
    description: text('description'),
    estimatedCost: decimal('estimated_cost', { precision: 15, scale: 2 }),
    perBedCost: decimal('per_bed_cost', { precision: 15, scale: 2 }),
    timeline: varchar('timeline', { length: 100 }),
    priority: varchar('priority', { length: 20 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_capex_items_deal_id').on(table.dealId),
  })
);

export const capitalPartners = pgTable('capital_partners', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  type: partnerTypeEnum('type').notNull(),
  assetTypes: assetTypeEnum('asset_types').array(),
  geographies: text('geographies').array(),
  minDealSize: decimal('min_deal_size', { precision: 15, scale: 2 }),
  maxDealSize: decimal('max_deal_size', { precision: 15, scale: 2 }),
  targetYield: decimal('target_yield', { precision: 5, scale: 4 }),
  maxLtv: decimal('max_ltv', { precision: 5, scale: 4 }),
  preferredStructure: varchar('preferred_structure', { length: 100 }),
  termPreference: varchar('term_preference', { length: 100 }),
  riskTolerance: riskToleranceEnum('risk_tolerance'),
  contactName: varchar('contact_name', { length: 255 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('active'),
  // Sale-Leaseback Partner Fields
  minimumCoverageRatio: decimal('minimum_coverage_ratio', { precision: 5, scale: 4 }),
  preferredDealStructures: text('preferred_deal_structures').array(),
  leaseTermPreference: varchar('lease_term_preference', { length: 50 }),
  rentEscalation: decimal('rent_escalation', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const partnerDealHistory = pgTable('partner_deal_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  partnerId: uuid('partner_id').references(() => capitalPartners.id, { onDelete: 'cascade' }),
  dealName: varchar('deal_name', { length: 255 }),
  dealDate: date('deal_date'),
  dealSize: decimal('deal_size', { precision: 15, scale: 2 }),
  outcome: varchar('outcome', { length: 50 }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const assumptions = pgTable(
  'assumptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    financialPeriodId: uuid('financial_period_id').references(() => financialPeriods.id, {
      onDelete: 'cascade',
    }),
    valuationId: uuid('valuation_id').references(() => valuations.id, { onDelete: 'cascade' }),
    field: varchar('field', { length: 255 }).notNull(),
    originalValue: text('original_value'),
    assumedValue: text('assumed_value').notNull(),
    reason: text('reason'),
    confidenceImpact: integer('confidence_impact'),
    category: assumptionCategoryEnum('category'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_assumptions_deal_id').on(table.dealId),
  })
);

export const overrides = pgTable(
  'overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    field: varchar('field', { length: 255 }).notNull(),
    originalValue: jsonb('original_value'),
    overrideValue: jsonb('override_value').notNull(),
    rationale: text('rationale').notNull(),
    overriddenBy: varchar('overridden_by', { length: 255 }),
    overriddenAt: timestamp('overridden_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_overrides_deal_id').on(table.dealId),
  })
);

export const partnerMatches = pgTable(
  'partner_matches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    partnerId: uuid('partner_id').references(() => capitalPartners.id, { onDelete: 'cascade' }),
    matchScore: integer('match_score'),
    expectedYield: decimal('expected_yield', { precision: 5, scale: 4 }),
    probabilityOfClose: decimal('probability_of_close', { precision: 5, scale: 4 }),
    concerns: text('concerns').array(),
    strengths: text('strengths').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_partner_matches_deal_id').on(table.dealId),
  })
);

export const dealMemory = pgTable(
  'deal_memory',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    snapshotData: jsonb('snapshot_data').notNull(),
    thesis: text('thesis'),
    outcome: varchar('outcome', { length: 100 }),
    outcomeNotes: text('outcome_notes'),
    postMortem: text('post_mortem'),
    analogDealIds: uuid('analog_deal_ids').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    createdBy: varchar('created_by', { length: 255 }),
  },
  (table) => ({
    dealIdIdx: index('idx_deal_memory_deal_id').on(table.dealId),
  })
);

export const surveyDeficiencies = pgTable('survey_deficiencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
  tag: varchar('tag', { length: 20 }),
  scope: varchar('scope', { length: 50 }),
  severity: varchar('severity', { length: 50 }),
  description: text('description'),
  correctionDate: date('correction_date'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const riskFactors = pgTable('risk_factors', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description').notNull(),
  severity: varchar('severity', { length: 20 }),
  mitigationStrategy: text('mitigation_strategy'),
  isUnderpriced: boolean('is_underpriced').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const coaMappings = pgTable(
  'coa_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalTerm: varchar('external_term', { length: 255 }).notNull(),
    cascadiaTerm: varchar('cascadia_term', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }),
    subcategory: varchar('subcategory', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    uniqueMapping: uniqueIndex('idx_coa_unique').on(table.externalTerm, table.cascadiaTerm),
  })
);

// ============================================================================
// CMS/Medicare Integration Tables
// ============================================================================

export const cmsProviderData = pgTable(
  'cms_provider_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ccn: varchar('ccn', { length: 20 }).notNull().unique(),
    providerName: varchar('provider_name', { length: 255 }),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 2 }),
    zipCode: varchar('zip_code', { length: 10 }),
    phoneNumber: varchar('phone_number', { length: 20 }),
    ownershipType: varchar('ownership_type', { length: 50 }),
    numberOfBeds: integer('number_of_beds'),
    averageResidentsPerDay: decimal('average_residents_per_day', { precision: 10, scale: 2 }),
    overallRating: integer('overall_rating'),
    healthInspectionRating: integer('health_inspection_rating'),
    staffingRating: integer('staffing_rating'),
    qualityMeasureRating: integer('quality_measure_rating'),
    reportedRnHppd: decimal('reported_rn_hppd', { precision: 5, scale: 2 }),
    reportedLpnHppd: decimal('reported_lpn_hppd', { precision: 5, scale: 2 }),
    reportedCnaHppd: decimal('reported_cna_hppd', { precision: 5, scale: 2 }),
    totalNursingHppd: decimal('total_nursing_hppd', { precision: 5, scale: 2 }),
    totalDeficiencies: integer('total_deficiencies'),
    healthDeficiencies: integer('health_deficiencies'),
    fireDeficiencies: integer('fire_deficiencies'),
    isSff: boolean('is_sff').default(false),
    isSffCandidate: boolean('is_sff_candidate').default(false),
    specialFocusFacilityDate: date('special_focus_facility_date'),
    abuseIcon: boolean('abuse_icon').default(false),
    incidentDate: date('incident_date'),
    finesTotal: decimal('fines_total', { precision: 15, scale: 2 }),
    paymentDenialDays: integer('payment_denial_days'),
    dataDate: date('data_date'),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow(),
    rawData: jsonb('raw_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    ccnIdx: uniqueIndex('idx_cms_provider_ccn').on(table.ccn),
    stateIdx: index('idx_cms_provider_state').on(table.state),
    overallRatingIdx: index('idx_cms_provider_overall_rating').on(table.overallRating),
  })
);

export const mcrCostReports = pgTable(
  'mcr_cost_reports',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ccn: varchar('ccn', { length: 20 }).notNull(),
    providerName: varchar('provider_name', { length: 255 }),
    fiscalYearBegin: date('fiscal_year_begin'),
    fiscalYearEnd: date('fiscal_year_end'),
    reportStatus: varchar('report_status', { length: 50 }),
    totalBeds: integer('total_beds'),
    totalPatientDays: integer('total_patient_days'),
    medicareDays: integer('medicare_days'),
    medicaidDays: integer('medicaid_days'),
    totalCosts: decimal('total_costs', { precision: 15, scale: 2 }),
    netPatientRevenue: decimal('net_patient_revenue', { precision: 15, scale: 2 }),
    medicareRevenue: decimal('medicare_revenue', { precision: 15, scale: 2 }),
    medicaidRevenue: decimal('medicaid_revenue', { precision: 15, scale: 2 }),
    totalSalaries: decimal('total_salaries', { precision: 15, scale: 2 }),
    contractLaborCost: decimal('contract_labor_cost', { precision: 15, scale: 2 }),
    rentCost: decimal('rent_cost', { precision: 15, scale: 2 }),
    depreciationCost: decimal('depreciation_cost', { precision: 15, scale: 2 }),
    costPerDay: decimal('cost_per_day', { precision: 10, scale: 2 }),
    rawData: jsonb('raw_data'),
    syncedAt: timestamp('synced_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    ccnIdx: index('idx_mcr_ccn').on(table.ccn),
    fiscalYearIdx: index('idx_mcr_fiscal_year').on(table.fiscalYearEnd),
    ccnFiscalIdx: uniqueIndex('idx_mcr_ccn_fiscal').on(table.ccn, table.fiscalYearEnd),
  })
);

// ============================================================================
// Valuation Enhancement Tables
// ============================================================================

export const comparableSales = pgTable(
  'comparable_sales',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    propertyName: varchar('property_name', { length: 255 }).notNull(),
    address: text('address'),
    city: varchar('city', { length: 100 }),
    state: varchar('state', { length: 2 }),
    assetType: assetTypeEnum('asset_type'),
    beds: integer('beds'),
    squareFootage: integer('square_footage'),
    saleDate: date('sale_date'),
    salePrice: decimal('sale_price', { precision: 15, scale: 2 }),
    pricePerBed: decimal('price_per_bed', { precision: 15, scale: 2 }),
    capRate: decimal('cap_rate', { precision: 5, scale: 4 }),
    noiAtSale: decimal('noi_at_sale', { precision: 15, scale: 2 }),
    occupancyAtSale: decimal('occupancy_at_sale', { precision: 5, scale: 4 }),
    buyer: varchar('buyer', { length: 255 }),
    seller: varchar('seller', { length: 255 }),
    broker: varchar('broker', { length: 255 }),
    source: varchar('source', { length: 100 }),
    notes: text('notes'),
    verified: boolean('verified').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    stateIdx: index('idx_comparable_sales_state').on(table.state),
    assetTypeIdx: index('idx_comparable_sales_asset_type').on(table.assetType),
    saleDateIdx: index('idx_comparable_sales_date').on(table.saleDate),
  })
);

// ============================================================================
// Proforma Scenarios Tables
// ============================================================================

export const proformaScenarios = pgTable(
  'proforma_scenarios',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    scenarioType: scenarioTypeEnum('scenario_type').default('baseline'),
    description: text('description'),
    startDate: date('start_date'),
    endDate: date('end_date'),
    projectionYears: integer('projection_years').default(5),
    assumptions: jsonb('assumptions'),
    revenueGrowthRate: decimal('revenue_growth_rate', { precision: 5, scale: 4 }),
    expenseGrowthRate: decimal('expense_growth_rate', { precision: 5, scale: 4 }),
    targetOccupancy: decimal('target_occupancy', { precision: 5, scale: 4 }),
    data: jsonb('data'),
    isBaseCase: boolean('is_base_case').default(false),
    createdBy: varchar('created_by', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_proforma_scenarios_deal_id').on(table.dealId),
    facilityIdIdx: index('idx_proforma_scenarios_facility_id').on(table.facilityId),
  })
);

// ============================================================================
// Sale-Leaseback Tables
// ============================================================================

export const saleLeaseback = pgTable(
  'sale_leaseback',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'cascade' }),

    // Purchase calculation
    propertyNoi: decimal('property_noi', { precision: 15, scale: 2 }),
    appliedCapRate: decimal('applied_cap_rate', { precision: 5, scale: 4 }),
    purchasePrice: decimal('purchase_price', { precision: 15, scale: 2 }),

    // Lease terms
    buyerYieldRequirement: decimal('buyer_yield_requirement', { precision: 5, scale: 4 }),
    annualRent: decimal('annual_rent', { precision: 15, scale: 2 }),
    leaseTermYears: integer('lease_term_years'),
    rentEscalation: decimal('rent_escalation', { precision: 5, scale: 4 }),

    // Coverage analysis
    facilityEbitdar: decimal('facility_ebitdar', { precision: 15, scale: 2 }),
    coverageRatio: decimal('coverage_ratio', { precision: 5, scale: 4 }),
    coveragePassFail: boolean('coverage_pass_fail'),

    // Operator economics
    operatorCashFlowAfterRent: decimal('operator_cash_flow_after_rent', { precision: 15, scale: 2 }),
    effectiveRentPerBed: decimal('effective_rent_per_bed', { precision: 10, scale: 2 }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_sale_leaseback_deal_id').on(table.dealId),
    facilityIdIdx: index('idx_sale_leaseback_facility_id').on(table.facilityId),
  })
);

export const analysisStages = pgTable(
  'analysis_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    stage: analysisStageTypeEnum('stage').notNull(),
    status: analysisStageStatusEnum('status').default('pending'),
    order: integer('order').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    pendingClarifications: integer('pending_clarifications').default(0),
    stageData: jsonb('stage_data'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_analysis_stages_deal_id').on(table.dealId),
    stageIdx: index('idx_analysis_stages_stage').on(table.stage),
    statusIdx: index('idx_analysis_stages_status').on(table.status),
  })
);

// ============================================================================
// Portfolio Metrics Tables
// ============================================================================

export const dealPortfolioMetrics = pgTable(
  'deal_portfolio_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }).unique(),
    totalBeds: integer('total_beds'),
    totalFacilities: integer('total_facilities'),
    snfCount: integer('snf_count').default(0),
    alfCount: integer('alf_count').default(0),
    ilfCount: integer('ilf_count').default(0),
    hospiceCount: integer('hospice_count').default(0),
    portfolioRevenue: decimal('portfolio_revenue', { precision: 15, scale: 2 }),
    portfolioExpenses: decimal('portfolio_expenses', { precision: 15, scale: 2 }),
    portfolioNoi: decimal('portfolio_noi', { precision: 15, scale: 2 }),
    portfolioValue: decimal('portfolio_value', { precision: 15, scale: 2 }),
    blendedCapRate: decimal('blended_cap_rate', { precision: 5, scale: 4 }),
    weightedOccupancy: decimal('weighted_occupancy', { precision: 5, scale: 4 }),
    totalSquareFootage: integer('total_square_footage'),
    averagePricePerBed: decimal('average_price_per_bed', { precision: 15, scale: 2 }),
    stateBreakdown: jsonb('state_breakdown'),
    assetTypeBreakdown: jsonb('asset_type_breakdown'),
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: uniqueIndex('idx_portfolio_metrics_deal_id').on(table.dealId),
  })
);

// ============================================================================
// AI Agent Tables
// ============================================================================

export const agentSessions = pgTable(
  'agent_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    userId: varchar('user_id', { length: 255 }),
    status: agentSessionStatusEnum('status').default('active'),
    context: jsonb('context'), // Accumulated context from conversation
    systemPrompt: text('system_prompt'),
    model: varchar('model', { length: 100 }).default('claude-sonnet-4-20250514'),
    totalTokensUsed: integer('total_tokens_used').default(0),
    messageCount: integer('message_count').default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    metadata: jsonb('metadata'),
  },
  (table) => ({
    dealIdIdx: index('idx_agent_sessions_deal_id').on(table.dealId),
    userIdIdx: index('idx_agent_sessions_user_id').on(table.userId),
    statusIdx: index('idx_agent_sessions_status').on(table.status),
  })
);

export const agentMessages = pgTable(
  'agent_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .references(() => agentSessions.id, { onDelete: 'cascade' })
      .notNull(),
    role: varchar('role', { length: 20 }).notNull(), // 'user', 'assistant', 'system', 'tool'
    content: text('content').notNull(),
    toolCalls: jsonb('tool_calls'), // Array of tool calls made by assistant
    toolResults: jsonb('tool_results'), // Results from tool execution
    tokensUsed: integer('tokens_used'),
    latencyMs: integer('latency_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('idx_agent_messages_session_id').on(table.sessionId),
    roleIdx: index('idx_agent_messages_role').on(table.role),
    createdAtIdx: index('idx_agent_messages_created_at').on(table.createdAt),
  })
);

export const agentToolExecutions = pgTable(
  'agent_tool_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .references(() => agentSessions.id, { onDelete: 'cascade' })
      .notNull(),
    messageId: uuid('message_id').references(() => agentMessages.id, { onDelete: 'cascade' }),
    toolName: varchar('tool_name', { length: 100 }).notNull(),
    toolInput: jsonb('tool_input').notNull(),
    toolOutput: jsonb('tool_output'),
    status: agentToolStatusEnum('status').default('pending'),
    requiresConfirmation: boolean('requires_confirmation').default(false),
    confirmedBy: varchar('confirmed_by', { length: 255 }),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    errorMessage: text('error_message'),
    executionTimeMs: integer('execution_time_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    sessionIdIdx: index('idx_tool_executions_session_id').on(table.sessionId),
    toolNameIdx: index('idx_tool_executions_tool_name').on(table.toolName),
    statusIdx: index('idx_tool_executions_status').on(table.status),
  })
);

// ============================================================================
// Clarification Tables
// ============================================================================

export const extractionClarifications = pgTable(
  'extraction_clarifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    fieldName: varchar('field_name', { length: 255 }).notNull(),
    fieldPath: varchar('field_path', { length: 500 }), // JSON path to field
    extractedValue: text('extracted_value'),
    suggestedValues: jsonb('suggested_values'), // Array of possible values
    benchmarkValue: text('benchmark_value'),
    benchmarkRange: jsonb('benchmark_range'), // { min, max, median }
    clarificationType: clarificationTypeEnum('clarification_type').notNull(),
    status: clarificationStatusEnum('status').default('pending'),
    confidenceScore: integer('confidence_score'),
    reason: text('reason'), // Why clarification is needed
    resolvedValue: text('resolved_value'),
    resolvedBy: varchar('resolved_by', { length: 255 }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionNotes: text('resolution_notes'),
    priority: integer('priority').default(5), // 1-10, 10 being highest
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    documentIdIdx: index('idx_clarifications_document_id').on(table.documentId),
    dealIdIdx: index('idx_clarifications_deal_id').on(table.dealId),
    statusIdx: index('idx_clarifications_status').on(table.status),
    priorityIdx: index('idx_clarifications_priority').on(table.priority),
  })
);

export const documentConflicts = pgTable(
  'document_conflicts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    document1Id: uuid('document1_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    document2Id: uuid('document2_id')
      .references(() => documents.id, { onDelete: 'cascade' })
      .notNull(),
    fieldName: varchar('field_name', { length: 255 }).notNull(),
    value1: text('value1'),
    value2: text('value2'),
    variancePercent: decimal('variance_percent', { precision: 10, scale: 4 }),
    resolution: conflictResolutionEnum('resolution').default('pending'),
    resolvedValue: text('resolved_value'),
    resolvedBy: varchar('resolved_by', { length: 255 }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    resolutionRationale: text('resolution_rationale'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_conflicts_deal_id').on(table.dealId),
    resolutionIdx: index('idx_conflicts_resolution').on(table.resolution),
  })
);

export const fieldCorrections = pgTable(
  'field_corrections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    documentType: documentTypeEnum('document_type'),
    fieldName: varchar('field_name', { length: 255 }).notNull(),
    originalValue: text('original_value'),
    correctedValue: text('corrected_value').notNull(),
    correctionSource: varchar('correction_source', { length: 100 }), // 'user', 'benchmark', 'cross_doc'
    correctedBy: varchar('corrected_by', { length: 255 }),
    correctedAt: timestamp('corrected_at', { withTimezone: true }).defaultNow(),
    contextSnippet: text('context_snippet'), // Surrounding text for learning
    wasPatternLearned: boolean('was_pattern_learned').default(false),
    learnedPatternId: uuid('learned_pattern_id'),
  },
  (table) => ({
    documentIdIdx: index('idx_corrections_document_id').on(table.documentId),
    dealIdIdx: index('idx_corrections_deal_id').on(table.dealId),
    fieldNameIdx: index('idx_corrections_field_name').on(table.fieldName),
    documentTypeIdx: index('idx_corrections_document_type').on(table.documentType),
  })
);

// ============================================================================
// Learning Tables
// ============================================================================

export const learnedPatterns = pgTable(
  'learned_patterns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patternType: patternTypeEnum('pattern_type').notNull(),
    documentType: documentTypeEnum('document_type'),
    fieldName: varchar('field_name', { length: 255 }),
    pattern: text('pattern').notNull(), // Regex or semantic pattern
    confidence: decimal('confidence', { precision: 5, scale: 4 }).default('0.5'),
    occurrenceCount: integer('occurrence_count').default(1),
    successCount: integer('success_count').default(0),
    failureCount: integer('failure_count').default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    exampleInputs: jsonb('example_inputs'), // Array of example inputs
    exampleOutputs: jsonb('example_outputs'), // Corresponding outputs
    metadata: jsonb('metadata'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    patternTypeIdx: index('idx_patterns_pattern_type').on(table.patternType),
    documentTypeIdx: index('idx_patterns_document_type').on(table.documentType),
    fieldNameIdx: index('idx_patterns_field_name').on(table.fieldName),
    confidenceIdx: index('idx_patterns_confidence').on(table.confidence),
  })
);

export const extractionMetrics = pgTable(
  'extraction_metrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentType: documentTypeEnum('document_type').notNull(),
    fieldName: varchar('field_name', { length: 255 }).notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    totalExtractions: integer('total_extractions').default(0),
    correctExtractions: integer('correct_extractions').default(0),
    averageConfidence: decimal('average_confidence', { precision: 5, scale: 4 }),
    clarificationsGenerated: integer('clarifications_generated').default(0),
    clarificationsResolved: integer('clarifications_resolved').default(0),
    correctionsApplied: integer('corrections_applied').default(0),
    accuracyRate: decimal('accuracy_rate', { precision: 5, scale: 4 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    documentTypeFieldIdx: uniqueIndex('idx_metrics_doc_field_period').on(
      table.documentType,
      table.fieldName,
      table.periodStart
    ),
  })
);

export const dealEmbeddings = pgTable(
  'deal_embeddings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    embeddingType: varchar('embedding_type', { length: 50 }).notNull(), // 'deal_summary', 'financials', 'risk_profile'
    embedding: jsonb('embedding').notNull(), // Vector as JSON array (for non-pgvector setups)
    embeddingModel: varchar('embedding_model', { length: 100 }),
    textContent: text('text_content'), // Original text that was embedded
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_embeddings_deal_id').on(table.dealId),
    typeIdx: index('idx_embeddings_type').on(table.embeddingType),
  })
);

// ============================================================================
// Algorithm Override Tables
// ============================================================================

export const settingsCategoryEnum = pgEnum('settings_category', [
  'valuation',
  'financial',
  'risk',
  'market',
  'proforma',
  'display',
]);

export const dealAlgorithmOverrides = pgTable(
  'deal_algorithm_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    category: settingsCategoryEnum('category').notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    overrideValue: jsonb('override_value').notNull(),
    originalValue: jsonb('original_value'),
    reason: text('reason'),
    source: varchar('source', { length: 50 }).default('manual'), // 'manual', 'ai_suggestion', 'preset'
    suggestedBy: varchar('suggested_by', { length: 255 }),
    appliedBy: varchar('applied_by', { length: 255 }),
    appliedAt: timestamp('applied_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_overrides_new_deal_id').on(table.dealId),
    categoryKeyIdx: index('idx_overrides_category_key').on(table.category, table.key),
    activeIdx: index('idx_overrides_active').on(table.isActive),
  })
);

export const algorithmPresets = pgTable(
  'algorithm_presets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    presetType: varchar('preset_type', { length: 50 }).notNull(), // 'market', 'risk_profile', 'asset_type', 'custom'
    applicableAssetTypes: assetTypeEnum('applicable_asset_types').array(),
    applicableStates: text('applicable_states').array(),
    settings: jsonb('settings').notNull(), // Full settings object
    usageCount: integer('usage_count').default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 255 }),
    isPublic: boolean('is_public').default(false),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    nameIdx: index('idx_presets_name').on(table.name),
    presetTypeIdx: index('idx_presets_type').on(table.presetType),
    publicIdx: index('idx_presets_public').on(table.isPublic),
  })
);

export const aiAdjustmentSuggestions = pgTable(
  'ai_adjustment_suggestions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    sessionId: uuid('session_id').references(() => agentSessions.id, { onDelete: 'set null' }),
    suggestionType: varchar('suggestion_type', { length: 50 }).notNull(), // 'cap_rate', 'discount_rate', 'growth_rate', etc.
    currentValue: jsonb('current_value'),
    suggestedValue: jsonb('suggested_value').notNull(),
    reasoning: text('reasoning').notNull(),
    confidenceScore: integer('confidence_score'),
    basedOnDeals: uuid('based_on_deals').array(), // Similar deals used for suggestion
    marketFactors: jsonb('market_factors'), // External factors considered
    status: suggestionStatusEnum('status').default('pending'),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNotes: text('review_notes'),
    impactEstimate: jsonb('impact_estimate'), // { valuation_change_percent, confidence_change }
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => ({
    dealIdIdx: index('idx_suggestions_deal_id').on(table.dealId),
    statusIdx: index('idx_suggestions_status').on(table.status),
    typeIdx: index('idx_suggestions_type').on(table.suggestionType),
  })
);

// Document Activity (Phase 5)
export const documentActivity = pgTable(
  'document_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'cascade' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    userName: varchar('user_name', { length: 255 }),
    action: varchar('action', { length: 50 }).notNull(),
    description: text('description'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_doc_activity_deal_id').on(table.dealId),
    createdAtIdx: index('idx_doc_activity_created_at').on(table.createdAt),
  })
);

// Relations
export const dealsRelations = relations(deals, ({ one, many }) => ({
  facilities: many(facilities),
  documents: many(documents),
  financialPeriods: many(financialPeriods),
  valuations: many(valuations),
  capexItems: many(capexItems),
  assumptions: many(assumptions),
  overrides: many(overrides),
  partnerMatches: many(partnerMatches),
  dealMemory: many(dealMemory),
  riskFactors: many(riskFactors),
  proformaScenarios: many(proformaScenarios),
  portfolioMetrics: one(dealPortfolioMetrics, {
    fields: [deals.id],
    references: [dealPortfolioMetrics.dealId],
  }),
  // AI Platform Enhancement Relations
  agentSessions: many(agentSessions),
  extractionClarifications: many(extractionClarifications),
  documentConflicts: many(documentConflicts),
  fieldCorrections: many(fieldCorrections),
  dealEmbeddings: many(dealEmbeddings),
  algorithmOverrides: many(dealAlgorithmOverrides),
  aiSuggestions: many(aiAdjustmentSuggestions),
  // Sale-Leaseback Relations
  saleLeasebackRecords: many(saleLeaseback),
  analysisStages: many(analysisStages),
  buyerPartner: one(capitalPartners, {
    fields: [deals.buyerPartnerId],
    references: [capitalPartners.id],
  }),
  // Wizard Enhancement Relations
  wizardSessions: many(wizardSessions),
  documentFolders: many(documentFolders),
  coaMappings: many(dealCoaMappings),
}));

export const facilitiesRelations = relations(facilities, ({ one, many }) => ({
  deal: one(deals, {
    fields: [facilities.dealId],
    references: [deals.id],
  }),
  documents: many(documents),
  financialPeriods: many(financialPeriods),
  valuations: many(valuations),
  capexItems: many(capexItems),
  surveyDeficiencies: many(surveyDeficiencies),
  proformaScenarios: many(proformaScenarios),
  saleLeasebackRecords: many(saleLeaseback),
  censusPeriods: many(facilityCensusPeriods),
  payerRates: many(facilityPayerRates),
  proformaLineOverrides: many(proformaLineOverrides),
}));

export const capitalPartnersRelations = relations(capitalPartners, ({ many }) => ({
  dealHistory: many(partnerDealHistory),
  partnerMatches: many(partnerMatches),
}));

export const financialPeriodsRelations = relations(financialPeriods, ({ one }) => ({
  deal: one(deals, {
    fields: [financialPeriods.dealId],
    references: [deals.id],
  }),
  facility: one(facilities, {
    fields: [financialPeriods.facilityId],
    references: [facilities.id],
  }),
}));

export const valuationsRelations = relations(valuations, ({ one }) => ({
  deal: one(deals, {
    fields: [valuations.dealId],
    references: [deals.id],
  }),
  facility: one(facilities, {
    fields: [valuations.facilityId],
    references: [facilities.id],
  }),
}));

export const capexItemsRelations = relations(capexItems, ({ one }) => ({
  deal: one(deals, {
    fields: [capexItems.dealId],
    references: [deals.id],
  }),
  facility: one(facilities, {
    fields: [capexItems.facilityId],
    references: [facilities.id],
  }),
}));

export const assumptionsRelations = relations(assumptions, ({ one }) => ({
  deal: one(deals, {
    fields: [assumptions.dealId],
    references: [deals.id],
  }),
}));

export const partnerMatchesRelations = relations(partnerMatches, ({ one }) => ({
  deal: one(deals, {
    fields: [partnerMatches.dealId],
    references: [deals.id],
  }),
  partner: one(capitalPartners, {
    fields: [partnerMatches.partnerId],
    references: [capitalPartners.id],
  }),
}));

export const riskFactorsRelations = relations(riskFactors, ({ one }) => ({
  deal: one(deals, {
    fields: [riskFactors.dealId],
    references: [deals.id],
  }),
}));

export const cmsProviderDataRelations = relations(cmsProviderData, ({ many }) => ({
  mcrCostReports: many(mcrCostReports),
}));

export const mcrCostReportsRelations = relations(mcrCostReports, ({ one }) => ({
  provider: one(cmsProviderData, {
    fields: [mcrCostReports.ccn],
    references: [cmsProviderData.ccn],
  }),
}));

export const proformaScenariosRelations = relations(proformaScenarios, ({ one }) => ({
  deal: one(deals, {
    fields: [proformaScenarios.dealId],
    references: [deals.id],
  }),
  facility: one(facilities, {
    fields: [proformaScenarios.facilityId],
    references: [facilities.id],
  }),
}));

export const dealPortfolioMetricsRelations = relations(dealPortfolioMetrics, ({ one }) => ({
  deal: one(deals, {
    fields: [dealPortfolioMetrics.dealId],
    references: [deals.id],
  }),
}));

// ============================================================================
// AI Platform Enhancement Relations
// ============================================================================

export const agentSessionsRelations = relations(agentSessions, ({ one, many }) => ({
  deal: one(deals, {
    fields: [agentSessions.dealId],
    references: [deals.id],
  }),
  messages: many(agentMessages),
  toolExecutions: many(agentToolExecutions),
  suggestions: many(aiAdjustmentSuggestions),
}));

export const agentMessagesRelations = relations(agentMessages, ({ one, many }) => ({
  session: one(agentSessions, {
    fields: [agentMessages.sessionId],
    references: [agentSessions.id],
  }),
  toolExecutions: many(agentToolExecutions),
}));

export const agentToolExecutionsRelations = relations(agentToolExecutions, ({ one }) => ({
  session: one(agentSessions, {
    fields: [agentToolExecutions.sessionId],
    references: [agentSessions.id],
  }),
  message: one(agentMessages, {
    fields: [agentToolExecutions.messageId],
    references: [agentMessages.id],
  }),
}));

export const extractionClarificationsRelations = relations(extractionClarifications, ({ one }) => ({
  document: one(documents, {
    fields: [extractionClarifications.documentId],
    references: [documents.id],
  }),
  deal: one(deals, {
    fields: [extractionClarifications.dealId],
    references: [deals.id],
  }),
}));

export const documentConflictsRelations = relations(documentConflicts, ({ one }) => ({
  deal: one(deals, {
    fields: [documentConflicts.dealId],
    references: [deals.id],
  }),
  document1: one(documents, {
    fields: [documentConflicts.document1Id],
    references: [documents.id],
    relationName: 'document1',
  }),
  document2: one(documents, {
    fields: [documentConflicts.document2Id],
    references: [documents.id],
    relationName: 'document2',
  }),
}));

export const fieldCorrectionsRelations = relations(fieldCorrections, ({ one }) => ({
  document: one(documents, {
    fields: [fieldCorrections.documentId],
    references: [documents.id],
  }),
  deal: one(deals, {
    fields: [fieldCorrections.dealId],
    references: [deals.id],
  }),
  learnedPattern: one(learnedPatterns, {
    fields: [fieldCorrections.learnedPatternId],
    references: [learnedPatterns.id],
  }),
}));

export const learnedPatternsRelations = relations(learnedPatterns, ({ many }) => ({
  corrections: many(fieldCorrections),
}));

export const dealEmbeddingsRelations = relations(dealEmbeddings, ({ one }) => ({
  deal: one(deals, {
    fields: [dealEmbeddings.dealId],
    references: [deals.id],
  }),
}));

export const dealAlgorithmOverridesRelations = relations(dealAlgorithmOverrides, ({ one }) => ({
  deal: one(deals, {
    fields: [dealAlgorithmOverrides.dealId],
    references: [deals.id],
  }),
}));

export const aiAdjustmentSuggestionsRelations = relations(aiAdjustmentSuggestions, ({ one }) => ({
  deal: one(deals, {
    fields: [aiAdjustmentSuggestions.dealId],
    references: [deals.id],
  }),
  session: one(agentSessions, {
    fields: [aiAdjustmentSuggestions.sessionId],
    references: [agentSessions.id],
  }),
}));

// ============================================================================
// Sale-Leaseback Relations
// ============================================================================

export const saleLeasebackRelations = relations(saleLeaseback, ({ one }) => ({
  deal: one(deals, {
    fields: [saleLeaseback.dealId],
    references: [deals.id],
  }),
  facility: one(facilities, {
    fields: [saleLeaseback.facilityId],
    references: [facilities.id],
  }),
}));

export const analysisStagesRelations = relations(analysisStages, ({ one }) => ({
  deal: one(deals, {
    fields: [analysisStages.dealId],
    references: [deals.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  deal: one(deals, {
    fields: [documents.dealId],
    references: [deals.id],
  }),
  facility: one(facilities, {
    fields: [documents.facilityId],
    references: [facilities.id],
  }),
  folder: one(documentFolders, {
    fields: [documents.folderId],
    references: [documentFolders.id],
  }),
  clarifications: many(extractionClarifications),
  corrections: many(fieldCorrections),
  coaMappings: many(dealCoaMappings),
}));

// ============================================================================
// Admin Settings Tables
// ============================================================================

export const algorithmSettings = pgTable(
  'algorithm_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    version: varchar('version', { length: 50 }).notNull(),
    category: settingsCategoryEnum('category').notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    value: jsonb('value').notNull(),
    description: text('description'),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    updatedBy: varchar('updated_by', { length: 255 }),
  },
  (table) => ({
    categoryKeyIdx: uniqueIndex('idx_settings_category_key').on(table.category, table.key),
    activeIdx: index('idx_settings_active').on(table.isActive),
  })
);

export const settingsAuditLog = pgTable(
  'settings_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    settingId: uuid('setting_id').references(() => algorithmSettings.id),
    category: settingsCategoryEnum('category').notNull(),
    key: varchar('key', { length: 255 }).notNull(),
    previousValue: jsonb('previous_value'),
    newValue: jsonb('new_value').notNull(),
    changeReason: text('change_reason'),
    changedBy: varchar('changed_by', { length: 255 }).notNull(),
    changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    settingIdIdx: index('idx_audit_setting_id').on(table.settingId),
    changedAtIdx: index('idx_audit_changed_at').on(table.changedAt),
  })
);

export const settingsSnapshots = pgTable(
  'settings_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    settings: jsonb('settings').notNull(),
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    nameIdx: index('idx_snapshot_name').on(table.name),
  })
);

// ============================================================================
// Enhanced Deal Wizard Tables
// ============================================================================

export const wizardSessions = pgTable(
  'wizard_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id').references(() => deals.id, { onDelete: 'set null' }),
    currentStage: wizardStageTypeEnum('current_stage').default('document_upload').notNull(),
    stageData: jsonb('stage_data').default('{}'),
    isComplete: boolean('is_complete').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_wizard_sessions_deal_id').on(table.dealId),
    stageIdx: index('idx_wizard_sessions_stage').on(table.currentStage),
  })
);

export const documentFolders = pgTable(
  'document_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    folderType: folderTypeEnum('folder_type').notNull(),
    displayOrder: integer('display_order').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_document_folders_deal_id').on(table.dealId),
    folderTypeIdx: index('idx_document_folders_type').on(table.folderType),
  })
);

export const dealCoaMappings = pgTable(
  'deal_coa_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    dealId: uuid('deal_id')
      .references(() => deals.id, { onDelete: 'cascade' })
      .notNull(),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'set null' }),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'set null' }),
    sourceLabel: varchar('source_label', { length: 500 }).notNull(),
    sourceValue: decimal('source_value', { precision: 15, scale: 2 }),
    sourceMonth: varchar('source_month', { length: 20 }),
    coaCode: varchar('coa_code', { length: 20 }),
    coaName: varchar('coa_name', { length: 255 }),
    mappingConfidence: decimal('mapping_confidence', { precision: 5, scale: 4 }),
    mappingMethod: mappingMethodEnum('mapping_method'),
    isMapped: boolean('is_mapped').default(false),
    proformaDestination: varchar('proforma_destination', { length: 100 }),
    reviewedBy: varchar('reviewed_by', { length: 255 }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_deal_coa_mappings_deal_id').on(table.dealId),
    facilityIdIdx: index('idx_deal_coa_mappings_facility_id').on(table.facilityId),
    documentIdIdx: index('idx_deal_coa_mappings_document_id').on(table.documentId),
    isMappedIdx: index('idx_deal_coa_mappings_is_mapped').on(table.isMapped),
    coaCodeIdx: index('idx_deal_coa_mappings_coa_code').on(table.coaCode),
  })
);

// ============================================================================
// Wizard Relations
// ============================================================================

export const wizardSessionsRelations = relations(wizardSessions, ({ one }) => ({
  deal: one(deals, {
    fields: [wizardSessions.dealId],
    references: [deals.id],
  }),
}));

export const documentFoldersRelations = relations(documentFolders, ({ one, many }) => ({
  deal: one(deals, {
    fields: [documentFolders.dealId],
    references: [deals.id],
  }),
  documents: many(documents),
}));

export const dealCoaMappingsRelations = relations(dealCoaMappings, ({ one }) => ({
  deal: one(deals, {
    fields: [dealCoaMappings.dealId],
    references: [deals.id],
  }),
  facility: one(facilities, {
    fields: [dealCoaMappings.facilityId],
    references: [facilities.id],
  }),
  document: one(documents, {
    fields: [dealCoaMappings.documentId],
    references: [documents.id],
  }),
}));

// ============================================================================
// Per-Building Financial Analysis Tables
// ============================================================================

// Census by Payer Period - Detailed patient days tracking by payer type
export const facilityCensusPeriods = pgTable(
  'facility_census_periods',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .references(() => facilities.id, { onDelete: 'cascade' })
      .notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),

    // Skilled Census (higher PPD)
    medicarePartADays: integer('medicare_part_a_days').default(0),
    medicareAdvantageDays: integer('medicare_advantage_days').default(0),
    managedCareDays: integer('managed_care_days').default(0),

    // Non-Skilled Census (lower PPD)
    medicaidDays: integer('medicaid_days').default(0),
    managedMedicaidDays: integer('managed_medicaid_days').default(0),
    privateDays: integer('private_days').default(0),
    vaContractDays: integer('va_contract_days').default(0),
    hospiceDays: integer('hospice_days').default(0),
    otherDays: integer('other_days').default(0),

    totalBeds: integer('total_beds'),
    occupancyRate: decimal('occupancy_rate', { precision: 5, scale: 2 }),
    source: varchar('source', { length: 50 }), // 'extracted', 'manual', 'projected'
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    facilityIdIdx: index('idx_census_periods_facility_id').on(table.facilityId),
    periodIdx: index('idx_census_periods_period').on(table.periodStart, table.periodEnd),
  })
);

// PPD Rates by Payer - Revenue per patient day rates for each payer type
export const facilityPayerRates = pgTable(
  'facility_payer_rates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facilityId: uuid('facility_id')
      .references(() => facilities.id, { onDelete: 'cascade' })
      .notNull(),
    effectiveDate: date('effective_date').notNull(),

    // Skilled PPD Rates
    medicarePartAPpd: decimal('medicare_part_a_ppd', { precision: 10, scale: 2 }),
    medicareAdvantagePpd: decimal('medicare_advantage_ppd', { precision: 10, scale: 2 }),
    managedCarePpd: decimal('managed_care_ppd', { precision: 10, scale: 2 }),

    // Non-Skilled PPD Rates
    medicaidPpd: decimal('medicaid_ppd', { precision: 10, scale: 2 }),
    managedMedicaidPpd: decimal('managed_medicaid_ppd', { precision: 10, scale: 2 }),
    privatePpd: decimal('private_ppd', { precision: 10, scale: 2 }),
    vaContractPpd: decimal('va_contract_ppd', { precision: 10, scale: 2 }),
    hospicePpd: decimal('hospice_ppd', { precision: 10, scale: 2 }),

    // Ancillary Revenue
    ancillaryRevenuePpd: decimal('ancillary_revenue_ppd', { precision: 10, scale: 2 }),
    therapyRevenuePpd: decimal('therapy_revenue_ppd', { precision: 10, scale: 2 }),

    source: varchar('source', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    facilityIdIdx: index('idx_payer_rates_facility_id').on(table.facilityId),
    effectiveDateIdx: index('idx_payer_rates_effective_date').on(table.effectiveDate),
  })
);

// Pro Forma Line Overrides - Cell-level overrides for pro forma editor
export const proformaLineOverrides = pgTable(
  'proforma_line_overrides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scenarioId: uuid('scenario_id')
      .references(() => proformaScenarios.id, { onDelete: 'cascade' })
      .notNull(),
    facilityId: uuid('facility_id')
      .references(() => facilities.id, { onDelete: 'cascade' })
      .notNull(),
    coaCode: varchar('coa_code', { length: 20 }).notNull(),
    monthIndex: integer('month_index').notNull(), // 0-59 for 5-year pro forma
    overrideType: varchar('override_type', { length: 20 }).notNull(), // 'fixed', 'ppd', 'percent_revenue'
    overrideValue: decimal('override_value', { precision: 15, scale: 2 }),
    annualGrowthRate: decimal('annual_growth_rate', { precision: 5, scale: 4 }),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    scenarioIdIdx: index('idx_proforma_overrides_scenario_id').on(table.scenarioId),
    facilityIdIdx: index('idx_proforma_overrides_facility_id').on(table.facilityId),
    coaMonthIdx: index('idx_proforma_overrides_coa_month').on(table.coaCode, table.monthIndex),
  })
);

// Pro Forma Assumptions - Editable assumptions for scenario modeling
export const proformaScenarioAssumptions = pgTable(
  'proforma_scenario_assumptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scenarioId: uuid('scenario_id')
      .references(() => proformaScenarios.id, { onDelete: 'cascade' })
      .notNull(),
    facilityId: uuid('facility_id').references(() => facilities.id, { onDelete: 'set null' }),
    assumptionKey: varchar('assumption_key', { length: 50 }).notNull(),
    assumptionValue: decimal('assumption_value', { precision: 15, scale: 4 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    scenarioIdIdx: index('idx_scenario_assumptions_scenario_id').on(table.scenarioId),
    facilityIdIdx: index('idx_scenario_assumptions_facility_id').on(table.facilityId),
    keyIdx: index('idx_scenario_assumptions_key').on(table.assumptionKey),
  })
);

// ============================================================================
// Per-Building Financial Analysis Relations
// ============================================================================

export const facilityCensusPeriodsRelations = relations(facilityCensusPeriods, ({ one }) => ({
  facility: one(facilities, {
    fields: [facilityCensusPeriods.facilityId],
    references: [facilities.id],
  }),
}));

export const facilityPayerRatesRelations = relations(facilityPayerRates, ({ one }) => ({
  facility: one(facilities, {
    fields: [facilityPayerRates.facilityId],
    references: [facilities.id],
  }),
}));

export const proformaLineOverridesRelations = relations(proformaLineOverrides, ({ one }) => ({
  scenario: one(proformaScenarios, {
    fields: [proformaLineOverrides.scenarioId],
    references: [proformaScenarios.id],
  }),
  facility: one(facilities, {
    fields: [proformaLineOverrides.facilityId],
    references: [facilities.id],
  }),
}));

export const proformaScenarioAssumptionsRelations = relations(proformaScenarioAssumptions, ({ one }) => ({
  scenario: one(proformaScenarios, {
    fields: [proformaScenarioAssumptions.scenarioId],
    references: [proformaScenarios.id],
  }),
  facility: one(facilities, {
    fields: [proformaScenarioAssumptions.facilityId],
    references: [facilities.id],
  }),
}));

// ============================================================
// RBAC: Users, Assignments, Activity Log
// ============================================================

export const userRoleEnum = pgEnum('user_role', ['admin', 'vp', 'analyst', 'viewer']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull().default('analyst'),
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  lastLoginAt: timestamp('last_login_at'),
});

export const dealAssignments = pgTable('deal_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id').references(() => deals.id),
  userId: uuid('user_id').references(() => users.id),
  role: varchar('role', { length: 50 }).default('analyst'),
  assignedAt: timestamp('assigned_at').defaultNow(),
  assignedBy: uuid('assigned_by').references(() => users.id),
});

export const userActivityLog = pgTable('user_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  dealId: uuid('deal_id').references(() => deals.id),
  action: varchar('action', { length: 100 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow(),
});
