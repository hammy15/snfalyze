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
export const assetTypeEnum = pgEnum('asset_type', ['SNF', 'ALF', 'ILF']);
export const dealStatusEnum = pgEnum('deal_status', [
  'new',
  'analyzing',
  'reviewed',
  'under_loi',
  'due_diligence',
  'closed',
  'passed',
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    analyzedAt: timestamp('analyzed_at', { withTimezone: true }),
    version: integer('version').default(1),
  },
  (table) => ({
    statusIdx: index('idx_deals_status').on(table.status),
    assetTypeIdx: index('idx_deals_asset_type').on(table.assetType),
    primaryStateIdx: index('idx_deals_primary_state').on(table.primaryState),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_facilities_deal_id').on(table.dealId),
    ccnIdx: index('idx_facilities_ccn').on(table.ccn),
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
  },
  (table) => ({
    dealIdIdx: index('idx_documents_deal_id').on(table.dealId),
    statusIdx: index('idx_documents_status').on(table.status),
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
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    dealIdIdx: index('idx_financial_periods_deal_id').on(table.dealId),
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
}));

export const capitalPartnersRelations = relations(capitalPartners, ({ many }) => ({
  dealHistory: many(partnerDealHistory),
  partnerMatches: many(partnerMatches),
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
// Admin Settings Tables
// ============================================================================

export const settingsCategoryEnum = pgEnum('settings_category', [
  'valuation',
  'financial',
  'risk',
  'market',
  'proforma',
  'display',
]);

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
