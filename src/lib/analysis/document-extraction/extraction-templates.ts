// =============================================================================
// EXTRACTION TEMPLATES - Define field extraction schemas for each document type
// =============================================================================

import type { DocumentType, ExtractionTemplate, ExtractionField } from '../types';

// =============================================================================
// TEMPLATE DEFINITIONS
// =============================================================================

const OFFERING_MEMORANDUM_TEMPLATE: ExtractionTemplate = {
  documentType: 'offering_memorandum',
  fields: [
    // Property Identification
    { name: 'propertyName', type: 'string', required: true, aliases: ['Facility Name', 'Property', 'Asset Name'] },
    { name: 'address.street', type: 'string', required: true, aliases: ['Street Address', 'Address'] },
    { name: 'address.city', type: 'string', required: true, aliases: ['City'] },
    { name: 'address.state', type: 'string', required: true, aliases: ['State'] },
    { name: 'address.zip', type: 'string', required: true, aliases: ['Zip', 'Zip Code', 'Postal Code'] },
    { name: 'address.county', type: 'string', required: false, aliases: ['County'] },

    // Licensing & Certifications
    { name: 'ccn', type: 'string', required: false, aliases: ['CMS Number', 'Medicare Number', 'Provider Number', 'CCN'] },
    { name: 'npi', type: 'string', required: false, aliases: ['NPI', 'National Provider Identifier'] },
    { name: 'stateId', type: 'string', required: false, aliases: ['State License', 'License Number'] },

    // Physical Characteristics
    { name: 'beds.licensed', type: 'number', required: true, aliases: ['Licensed Beds', 'Total Beds'], validation: { min: 1, max: 1000 } },
    { name: 'beds.certified', type: 'number', required: false, aliases: ['Certified Beds', 'Medicare Beds'] },
    { name: 'beds.operational', type: 'number', required: false, aliases: ['Operational Beds', 'Operating Beds'] },
    { name: 'squareFootage', type: 'number', required: false, aliases: ['SF', 'Square Feet', 'Building Size', 'GBA'] },
    { name: 'acres', type: 'number', required: false, aliases: ['Acres', 'Land Area', 'Lot Size'] },
    { name: 'yearBuilt', type: 'number', required: true, aliases: ['Built', 'Year Built', 'Construction Date'], validation: { min: 1900, max: 2030 } },
    { name: 'yearRenovated', type: 'number', required: false, aliases: ['Renovated', 'Last Renovation', 'Year Renovated'] },
    { name: 'stories', type: 'number', required: false, aliases: ['Floors', 'Stories', 'Levels'], validation: { min: 1, max: 20 } },
    { name: 'buildingCount', type: 'number', required: false, aliases: ['Buildings', 'Number of Buildings'] },

    // Room Configuration
    { name: 'roomConfiguration.private', type: 'number', required: false, aliases: ['Private Rooms'] },
    { name: 'roomConfiguration.semiPrivate', type: 'number', required: false, aliases: ['Semi-Private Rooms', 'Semi Private'] },

    // Financial Highlights
    { name: 'askingPrice', type: 'currency', required: false, aliases: ['Asking Price', 'List Price', 'Price'] },
    { name: 'pricePerBed', type: 'currency', required: false, aliases: ['Price Per Bed', 'Per Bed'] },
    { name: 'capRate', type: 'percentage', required: false, aliases: ['Cap Rate', 'Capitalization Rate', 'Going-In Cap'] },
    { name: 'noi', type: 'currency', required: false, aliases: ['NOI', 'Net Operating Income'] },
    { name: 'revenue', type: 'currency', required: false, aliases: ['Total Revenue', 'Gross Revenue', 'Revenue'] },
    { name: 'ebitdar', type: 'currency', required: false, aliases: ['EBITDAR'] },

    // Operating Metrics
    { name: 'occupancy', type: 'percentage', required: false, aliases: ['Occupancy', 'Occupancy Rate', 'Current Occupancy'] },
    { name: 'census', type: 'number', required: false, aliases: ['Census', 'Current Census', 'ADC'] },

    // Payer Mix
    { name: 'payerMix.medicare', type: 'percentage', required: false, aliases: ['Medicare %', 'Medicare Mix'] },
    { name: 'payerMix.medicaid', type: 'percentage', required: false, aliases: ['Medicaid %', 'Medicaid Mix'] },
    { name: 'payerMix.privatePay', type: 'percentage', required: false, aliases: ['Private Pay %', 'Private %'] },

    // Quality
    { name: 'cmsRating', type: 'number', required: false, aliases: ['CMS Rating', 'Star Rating', 'Overall Rating'], validation: { min: 1, max: 5 } },

    // Ownership
    { name: 'ownershipType', type: 'string', required: false, aliases: ['Ownership', 'Owner Type'] },
    { name: 'operator', type: 'string', required: false, aliases: ['Operator', 'Management Company'] },
    { name: 'owner', type: 'string', required: false, aliases: ['Owner', 'Current Owner', 'Seller'] },
  ],
};

const RENT_ROLL_TEMPLATE: ExtractionTemplate = {
  documentType: 'rent_roll',
  fields: [
    { name: 'effectiveDate', type: 'date', required: true, aliases: ['As Of Date', 'Date', 'Effective'] },
    { name: 'totalUnits', type: 'number', required: true, aliases: ['Total Units', 'Total Beds'] },
    { name: 'occupiedUnits', type: 'number', required: false, aliases: ['Occupied Units', 'Occupied Beds'] },
    { name: 'occupancyRate', type: 'percentage', required: false, aliases: ['Occupancy', 'Occupancy Rate'] },
    { name: 'totalMonthlyRevenue', type: 'currency', required: false, aliases: ['Total Monthly', 'Monthly Revenue'] },
    { name: 'averageRate', type: 'currency', required: false, aliases: ['Average Rate', 'Average Rent', 'Avg Rate'] },
    // Unit-level data is handled separately as arrays
  ],
};

const TRAILING_12_TEMPLATE: ExtractionTemplate = {
  documentType: 'trailing_12',
  fields: [
    // Period
    { name: 'periodStart', type: 'date', required: false, aliases: ['Period Start', 'From'] },
    { name: 'periodEnd', type: 'date', required: true, aliases: ['Period End', 'Through', 'As Of'] },

    // Revenue
    { name: 'revenue.medicarePartA', type: 'currency', required: false, aliases: ['Medicare A', 'Medicare Part A', 'Skilled Nursing Revenue'] },
    { name: 'revenue.medicarePartB', type: 'currency', required: false, aliases: ['Medicare B', 'Medicare Part B', 'Therapy Revenue'] },
    { name: 'revenue.medicareAdvantage', type: 'currency', required: false, aliases: ['Medicare Advantage', 'MA Revenue', 'Managed Medicare'] },
    { name: 'revenue.medicaid', type: 'currency', required: false, aliases: ['Medicaid', 'Medicaid Revenue'] },
    { name: 'revenue.privatePay', type: 'currency', required: false, aliases: ['Private Pay', 'Self Pay', 'Private Revenue'] },
    { name: 'revenue.managedCare', type: 'currency', required: false, aliases: ['Managed Care', 'Insurance', 'Commercial'] },
    { name: 'revenue.vaContract', type: 'currency', required: false, aliases: ['VA', 'Veterans', 'VA Contract'] },
    { name: 'revenue.hospice', type: 'currency', required: false, aliases: ['Hospice', 'Hospice Revenue'] },
    { name: 'revenue.ancillary', type: 'currency', required: false, aliases: ['Ancillary', 'Ancillary Revenue', 'Other Revenue'] },
    { name: 'revenue.total', type: 'currency', required: true, aliases: ['Total Revenue', 'Gross Revenue'] },

    // Expenses - Labor
    { name: 'expenses.nursingLabor', type: 'currency', required: false, aliases: ['Nursing', 'Nursing Salaries', 'Nursing Wages'] },
    { name: 'expenses.agencyLabor', type: 'currency', required: false, aliases: ['Agency', 'Contract Labor', 'Agency Nursing'] },
    { name: 'expenses.dietaryLabor', type: 'currency', required: false, aliases: ['Dietary', 'Food Service Labor'] },
    { name: 'expenses.housekeepingLabor', type: 'currency', required: false, aliases: ['Housekeeping', 'Environmental Services'] },
    { name: 'expenses.adminLabor', type: 'currency', required: false, aliases: ['Administrative', 'Admin Salaries', 'G&A Salaries'] },
    { name: 'expenses.benefits', type: 'currency', required: false, aliases: ['Benefits', 'Employee Benefits', 'Fringe Benefits'] },
    { name: 'expenses.payrollTaxes', type: 'currency', required: false, aliases: ['Payroll Taxes', 'Employer Taxes'] },
    { name: 'expenses.totalLabor', type: 'currency', required: false, aliases: ['Total Labor', 'Total Payroll'] },

    // Expenses - Operating
    { name: 'expenses.dietaryCost', type: 'currency', required: false, aliases: ['Food Cost', 'Raw Food', 'Dietary Supplies'] },
    { name: 'expenses.medicalSupplies', type: 'currency', required: false, aliases: ['Medical Supplies', 'Nursing Supplies'] },
    { name: 'expenses.utilities', type: 'currency', required: false, aliases: ['Utilities', 'Electric', 'Gas', 'Water'] },
    { name: 'expenses.insurance', type: 'currency', required: false, aliases: ['Insurance', 'Liability Insurance', 'Property Insurance'] },
    { name: 'expenses.propertyTax', type: 'currency', required: false, aliases: ['Property Tax', 'Real Estate Tax'] },
    { name: 'expenses.managementFee', type: 'currency', required: false, aliases: ['Management Fee', 'Mgmt Fee'] },
    { name: 'expenses.maintenance', type: 'currency', required: false, aliases: ['Maintenance', 'Repairs', 'R&M'] },
    { name: 'expenses.marketing', type: 'currency', required: false, aliases: ['Marketing', 'Advertising'] },
    { name: 'expenses.other', type: 'currency', required: false, aliases: ['Other Expenses', 'Miscellaneous'] },
    { name: 'expenses.totalOperating', type: 'currency', required: true, aliases: ['Total Operating', 'Total Expenses'] },

    // Calculated Metrics
    { name: 'noi', type: 'currency', required: false, aliases: ['NOI', 'Net Operating Income'] },
    { name: 'ebitdar', type: 'currency', required: false, aliases: ['EBITDAR'] },
    { name: 'ebitda', type: 'currency', required: false, aliases: ['EBITDA'] },
    { name: 'netIncome', type: 'currency', required: false, aliases: ['Net Income', 'Net Profit'] },

    // Operational Stats
    { name: 'patientDays', type: 'number', required: false, aliases: ['Patient Days', 'Resident Days'] },
    { name: 'averageCensus', type: 'number', required: false, aliases: ['Average Census', 'ADC'] },
    { name: 'occupancy', type: 'percentage', required: false, aliases: ['Occupancy', 'Average Occupancy'] },
  ],
};

const HISTORICAL_PNL_TEMPLATE: ExtractionTemplate = {
  documentType: 'historical_pnl',
  fields: [
    // Similar to T12 but with multi-year support
    ...TRAILING_12_TEMPLATE.fields,
    { name: 'years', type: 'array', required: true, aliases: ['Years', 'Fiscal Years', 'Periods'] },
  ],
};

const MEDICARE_COST_REPORT_TEMPLATE: ExtractionTemplate = {
  documentType: 'medicare_cost_report',
  fields: [
    { name: 'ccn', type: 'string', required: true, aliases: ['Provider Number', 'CCN', 'Medicare Number'] },
    { name: 'providerName', type: 'string', required: true, aliases: ['Provider Name', 'Facility Name'] },
    { name: 'fiscalYearBegin', type: 'date', required: true, aliases: ['FYB', 'Fiscal Year Begin'] },
    { name: 'fiscalYearEnd', type: 'date', required: true, aliases: ['FYE', 'Fiscal Year End'] },

    // Worksheet S-3 - Statistical Data
    { name: 'beds.total', type: 'number', required: false, aliases: ['Total Beds', 'Licensed Beds'] },
    { name: 'beds.snf', type: 'number', required: false, aliases: ['SNF Beds'] },
    { name: 'patientDays.total', type: 'number', required: false, aliases: ['Total Patient Days'] },
    { name: 'patientDays.medicare', type: 'number', required: false, aliases: ['Medicare Days'] },
    { name: 'patientDays.medicaid', type: 'number', required: false, aliases: ['Medicaid Days'] },
    { name: 'discharges.total', type: 'number', required: false, aliases: ['Total Discharges'] },
    { name: 'discharges.medicare', type: 'number', required: false, aliases: ['Medicare Discharges'] },

    // Worksheet A - Cost Data
    { name: 'costs.nursingService', type: 'currency', required: false, aliases: ['Nursing Service Cost'] },
    { name: 'costs.dietaryService', type: 'currency', required: false, aliases: ['Dietary Cost'] },
    { name: 'costs.administrative', type: 'currency', required: false, aliases: ['Administrative Cost', 'A&G'] },
    { name: 'costs.capitalRelated', type: 'currency', required: false, aliases: ['Capital Related', 'Building & Fixtures'] },
    { name: 'costs.total', type: 'currency', required: true, aliases: ['Total Costs'] },

    // Worksheet G - Revenue
    { name: 'revenue.netPatientRevenue', type: 'currency', required: false, aliases: ['Net Patient Revenue'] },
    { name: 'revenue.otherRevenue', type: 'currency', required: false, aliases: ['Other Operating Revenue'] },
  ],
};

const SURVEY_REPORT_TEMPLATE: ExtractionTemplate = {
  documentType: 'survey_report',
  fields: [
    { name: 'surveyDate', type: 'date', required: true, aliases: ['Survey Date', 'Inspection Date'] },
    { name: 'surveyType', type: 'string', required: false, aliases: ['Survey Type', 'Inspection Type'] },
    { name: 'totalDeficiencies', type: 'number', required: false, aliases: ['Total Deficiencies', 'Number of Deficiencies'] },
    { name: 'healthDeficiencies', type: 'number', required: false, aliases: ['Health Deficiencies'] },
    { name: 'fireDeficiencies', type: 'number', required: false, aliases: ['Fire Safety Deficiencies', 'LSC Deficiencies'] },
    { name: 'scopeSeverity.immediate', type: 'number', required: false, aliases: ['Immediate Jeopardy', 'J/K/L'] },
    { name: 'scopeSeverity.actualHarm', type: 'number', required: false, aliases: ['Actual Harm', 'G/H/I'] },
    { name: 'scopeSeverity.potential', type: 'number', required: false, aliases: ['Potential for Harm', 'D/E/F'] },
    { name: 'scopeSeverity.minimal', type: 'number', required: false, aliases: ['Minimal Harm', 'A/B/C'] },
    { name: 'complaints', type: 'number', required: false, aliases: ['Complaints', 'Complaint Investigations'] },
    { name: 'substantiatedComplaints', type: 'number', required: false, aliases: ['Substantiated Complaints'] },
  ],
};

const LEASE_ABSTRACT_TEMPLATE: ExtractionTemplate = {
  documentType: 'lease_abstract',
  fields: [
    { name: 'landlord', type: 'string', required: true, aliases: ['Landlord', 'Lessor', 'Owner'] },
    { name: 'tenant', type: 'string', required: true, aliases: ['Tenant', 'Lessee', 'Operator'] },
    { name: 'commencementDate', type: 'date', required: true, aliases: ['Commencement', 'Start Date', 'Lease Start'] },
    { name: 'expirationDate', type: 'date', required: true, aliases: ['Expiration', 'End Date', 'Lease End'] },
    { name: 'termYears', type: 'number', required: false, aliases: ['Term', 'Lease Term', 'Initial Term'] },
    { name: 'baseRent', type: 'currency', required: true, aliases: ['Base Rent', 'Annual Rent', 'Monthly Rent'] },
    { name: 'rentEscalation', type: 'percentage', required: false, aliases: ['Escalation', 'Annual Increase', 'CPI'] },
    { name: 'renewalOptions', type: 'number', required: false, aliases: ['Renewal Options', 'Extension Options'] },
    { name: 'renewalTermYears', type: 'number', required: false, aliases: ['Renewal Term', 'Extension Term'] },
    { name: 'securityDeposit', type: 'currency', required: false, aliases: ['Security Deposit', 'Deposit'] },
    { name: 'tripleNet', type: 'boolean', required: false, aliases: ['Triple Net', 'NNN', 'Absolute Net'] },
  ],
};

const ENVIRONMENTAL_REPORT_TEMPLATE: ExtractionTemplate = {
  documentType: 'environmental_report',
  fields: [
    { name: 'assessmentDate', type: 'date', required: true, aliases: ['Assessment Date', 'Report Date'] },
    { name: 'phaseType', type: 'string', required: true, aliases: ['Phase', 'Assessment Type'] },
    { name: 'preparedBy', type: 'string', required: false, aliases: ['Prepared By', 'Consultant'] },
    { name: 'recsIdentified', type: 'boolean', required: false, aliases: ['RECs Identified', 'Conditions Found'] },
    { name: 'recCount', type: 'number', required: false, aliases: ['Number of RECs', 'REC Count'] },
    { name: 'hrecsIdentified', type: 'boolean', required: false, aliases: ['HRECs Identified'] },
    { name: 'crecsIdentified', type: 'boolean', required: false, aliases: ['CRECs Identified'] },
    { name: 'recommendation', type: 'string', required: false, aliases: ['Recommendation', 'Conclusion'] },
  ],
};

const APPRAISAL_TEMPLATE: ExtractionTemplate = {
  documentType: 'appraisal',
  fields: [
    { name: 'effectiveDate', type: 'date', required: true, aliases: ['Effective Date', 'Valuation Date', 'As Of Date'] },
    { name: 'appraiser', type: 'string', required: false, aliases: ['Appraiser', 'Prepared By'] },
    { name: 'marketValue', type: 'currency', required: true, aliases: ['Market Value', 'Appraised Value', 'Value Conclusion'] },
    { name: 'incomeApproachValue', type: 'currency', required: false, aliases: ['Income Approach', 'Income Value'] },
    { name: 'salesComparisonValue', type: 'currency', required: false, aliases: ['Sales Comparison', 'Comparable Sales Value'] },
    { name: 'costApproachValue', type: 'currency', required: false, aliases: ['Cost Approach', 'Replacement Cost'] },
    { name: 'capRateUsed', type: 'percentage', required: false, aliases: ['Cap Rate', 'Capitalization Rate'] },
    { name: 'noiUsed', type: 'currency', required: false, aliases: ['NOI', 'Net Operating Income'] },
    { name: 'pricePerBed', type: 'currency', required: false, aliases: ['Price Per Bed', 'Value Per Bed'] },
  ],
};

const CAPITAL_EXPENDITURE_TEMPLATE: ExtractionTemplate = {
  documentType: 'capital_expenditure',
  fields: [
    { name: 'totalBudget', type: 'currency', required: true, aliases: ['Total Budget', 'Total CapEx', 'Project Total'] },
    { name: 'year1Budget', type: 'currency', required: false, aliases: ['Year 1', 'First Year'] },
    { name: 'year2Budget', type: 'currency', required: false, aliases: ['Year 2', 'Second Year'] },
    { name: 'year3Budget', type: 'currency', required: false, aliases: ['Year 3', 'Third Year'] },
    { name: 'immediateNeeds', type: 'currency', required: false, aliases: ['Immediate Needs', 'Critical Items'] },
    { name: 'deferredMaintenance', type: 'currency', required: false, aliases: ['Deferred Maintenance'] },
    { name: 'roofBudget', type: 'currency', required: false, aliases: ['Roof', 'Roofing'] },
    { name: 'hvacBudget', type: 'currency', required: false, aliases: ['HVAC', 'Mechanical'] },
    { name: 'plumbingBudget', type: 'currency', required: false, aliases: ['Plumbing'] },
    { name: 'electricalBudget', type: 'currency', required: false, aliases: ['Electrical'] },
    { name: 'interiorBudget', type: 'currency', required: false, aliases: ['Interior', 'Finishes'] },
    { name: 'exteriorBudget', type: 'currency', required: false, aliases: ['Exterior', 'Facade'] },
  ],
};

const CENSUS_REPORT_TEMPLATE: ExtractionTemplate = {
  documentType: 'census_report',
  fields: [
    { name: 'reportDate', type: 'date', required: true, aliases: ['Report Date', 'As Of', 'Date'] },
    { name: 'totalBeds', type: 'number', required: true, aliases: ['Total Beds', 'Licensed Beds'] },
    { name: 'currentCensus', type: 'number', required: true, aliases: ['Census', 'Current Census', 'Residents'] },
    { name: 'occupancyRate', type: 'percentage', required: false, aliases: ['Occupancy', 'Occupancy Rate'] },
    { name: 'admissions', type: 'number', required: false, aliases: ['Admissions', 'New Admissions'] },
    { name: 'discharges', type: 'number', required: false, aliases: ['Discharges'] },
    { name: 'medicareADays', type: 'number', required: false, aliases: ['Medicare A Days', 'Part A Days'] },
    { name: 'medicaidDays', type: 'number', required: false, aliases: ['Medicaid Days'] },
    { name: 'privatePayDays', type: 'number', required: false, aliases: ['Private Pay Days', 'Self Pay Days'] },
    { name: 'averageLOS', type: 'number', required: false, aliases: ['Average LOS', 'Average Length of Stay'] },
  ],
};

const STAFFING_REPORT_TEMPLATE: ExtractionTemplate = {
  documentType: 'staffing_report',
  fields: [
    { name: 'reportPeriod', type: 'string', required: false, aliases: ['Period', 'Report Period'] },
    { name: 'rnHPPD', type: 'number', required: false, aliases: ['RN HPPD', 'RN Hours'], validation: { min: 0, max: 5 } },
    { name: 'lpnHPPD', type: 'number', required: false, aliases: ['LPN HPPD', 'LVN HPPD'], validation: { min: 0, max: 5 } },
    { name: 'cnaHPPD', type: 'number', required: false, aliases: ['CNA HPPD', 'NA HPPD'], validation: { min: 0, max: 10 } },
    { name: 'totalHPPD', type: 'number', required: true, aliases: ['Total HPPD', 'Total Nursing HPPD'], validation: { min: 0, max: 15 } },
    { name: 'rnFTE', type: 'number', required: false, aliases: ['RN FTE', 'RN Staff'] },
    { name: 'lpnFTE', type: 'number', required: false, aliases: ['LPN FTE', 'LPN Staff'] },
    { name: 'cnaFTE', type: 'number', required: false, aliases: ['CNA FTE', 'CNA Staff'] },
    { name: 'agencyPercent', type: 'percentage', required: false, aliases: ['Agency %', 'Agency Usage'] },
    { name: 'turnoverRate', type: 'percentage', required: false, aliases: ['Turnover', 'Turnover Rate'] },
  ],
};

const QUALITY_REPORT_TEMPLATE: ExtractionTemplate = {
  documentType: 'quality_report',
  fields: [
    { name: 'reportDate', type: 'date', required: false, aliases: ['Report Date', 'As Of'] },
    { name: 'overallRating', type: 'number', required: false, aliases: ['Overall Rating', 'Star Rating'], validation: { min: 1, max: 5 } },
    { name: 'healthInspectionRating', type: 'number', required: false, aliases: ['Health Inspection Rating', 'Survey Rating'], validation: { min: 1, max: 5 } },
    { name: 'staffingRating', type: 'number', required: false, aliases: ['Staffing Rating'], validation: { min: 1, max: 5 } },
    { name: 'qualityRating', type: 'number', required: false, aliases: ['Quality Rating', 'QM Rating'], validation: { min: 1, max: 5 } },
    { name: 'shortStayRehospRate', type: 'percentage', required: false, aliases: ['Short Stay Rehospitalization', 'Rehosp Rate'] },
    { name: 'longStayFallsRate', type: 'percentage', required: false, aliases: ['Falls Rate', 'Falls with Injury'] },
    { name: 'longStayPressureUlcers', type: 'percentage', required: false, aliases: ['Pressure Ulcers', 'Bed Sores'] },
    { name: 'antipsychoticUse', type: 'percentage', required: false, aliases: ['Antipsychotic Use', 'Antipsychotic %'] },
  ],
};

const OTHER_TEMPLATE: ExtractionTemplate = {
  documentType: 'other',
  fields: [
    { name: 'documentTitle', type: 'string', required: false, aliases: ['Title', 'Document Name'] },
    { name: 'documentDate', type: 'date', required: false, aliases: ['Date', 'Document Date'] },
    { name: 'preparedBy', type: 'string', required: false, aliases: ['Prepared By', 'Author'] },
    { name: 'preparedFor', type: 'string', required: false, aliases: ['Prepared For', 'Client'] },
  ],
};

// =============================================================================
// TEMPLATE REGISTRY
// =============================================================================

const TEMPLATES: Record<DocumentType, ExtractionTemplate> = {
  offering_memorandum: OFFERING_MEMORANDUM_TEMPLATE,
  rent_roll: RENT_ROLL_TEMPLATE,
  trailing_12: TRAILING_12_TEMPLATE,
  historical_pnl: HISTORICAL_PNL_TEMPLATE,
  medicare_cost_report: MEDICARE_COST_REPORT_TEMPLATE,
  survey_report: SURVEY_REPORT_TEMPLATE,
  lease_abstract: LEASE_ABSTRACT_TEMPLATE,
  environmental_report: ENVIRONMENTAL_REPORT_TEMPLATE,
  appraisal: APPRAISAL_TEMPLATE,
  capital_expenditure: CAPITAL_EXPENDITURE_TEMPLATE,
  census_report: CENSUS_REPORT_TEMPLATE,
  staffing_report: STAFFING_REPORT_TEMPLATE,
  quality_report: QUALITY_REPORT_TEMPLATE,
  other: OTHER_TEMPLATE,
};

// =============================================================================
// EXPORTED FUNCTIONS
// =============================================================================

/**
 * Get extraction template for document type
 */
export function getTemplate(documentType: DocumentType): ExtractionTemplate | null {
  return TEMPLATES[documentType] || null;
}

/**
 * Get all available templates
 */
export function getAllTemplates(): ExtractionTemplate[] {
  return Object.values(TEMPLATES);
}

/**
 * Get required fields for document type
 */
export function getRequiredFields(documentType: DocumentType): ExtractionField[] {
  const template = TEMPLATES[documentType];
  if (!template) return [];
  return template.fields.filter((f) => f.required);
}

/**
 * Get optional fields for document type
 */
export function getOptionalFields(documentType: DocumentType): ExtractionField[] {
  const template = TEMPLATES[documentType];
  if (!template) return [];
  return template.fields.filter((f) => !f.required);
}

/**
 * Get field by name from template
 */
export function getField(documentType: DocumentType, fieldName: string): ExtractionField | null {
  const template = TEMPLATES[documentType];
  if (!template) return null;
  return template.fields.find((f) => f.name === fieldName) || null;
}

/**
 * Merge custom fields with template
 */
export function extendTemplate(
  documentType: DocumentType,
  additionalFields: ExtractionField[]
): ExtractionTemplate {
  const base = TEMPLATES[documentType] || OTHER_TEMPLATE;
  return {
    ...base,
    fields: [...base.fields, ...additionalFields],
  };
}

/**
 * Create custom template
 */
export function createTemplate(
  documentType: DocumentType,
  fields: ExtractionField[]
): ExtractionTemplate {
  return {
    documentType,
    fields,
  };
}
