/**
 * Pro Forma Template
 *
 * Standard template based on Anacortes Proforma format.
 * Used for generating consistent pro formas across all deals.
 */

// ============================================================================
// REVENUE LINE ITEMS
// ============================================================================

export const REVENUE_LINE_ITEMS = {
  nonSkilledRevenue: {
    label: 'Non-Skilled Revenue',
    isHeader: true,
    items: [
      { code: 'MEDICAID_REV', label: 'Medicaid Revenue', driverCol: 'Medicaid Days', department: 'All Departments' },
      { code: 'MANAGED_MEDICAID_REV', label: 'Managed Medicaid Revenue', driverCol: 'Managed Medicaid Days', department: 'All Departments' },
      { code: 'PRIVATE_REV', label: 'Private Revenue', driverCol: 'Private Days', department: 'All Departments' },
      { code: 'VETERANS_REV', label: 'Veterans Revenue', driverCol: 'Veterans Days', department: 'All Departments' },
      { code: 'HOSPICE_REV', label: 'Hospice Revenue', driverCol: 'Hospice Days', department: 'All Departments' },
    ],
    totalCode: 'TOTAL_NON_SKILLED_REV',
    totalLabel: 'Total Non-Skilled Revenue',
    driverCol: 'Total Non-Skilled Days',
  },
  skilledRevenue: {
    label: 'Skilled Revenue',
    isHeader: true,
    items: [
      { code: 'MANAGED_MEDICAID_SKILLED_REV', label: 'Managed Medicaid Revenue - Skilled', driverCol: 'Managed Medicaid Skilled Days', department: 'All Departments' },
      { code: 'MEDICAID_COMPLEX_REV', label: 'Medicaid Complex Revenue', driverCol: 'Medicaid Complex Days', department: 'All Departments' },
      { code: 'MEDICAID_BARIATRIC_REV', label: 'Medicaid Bariatric Revenue', driverCol: 'Medicaid Bariatric Days', department: 'All Departments' },
      { code: 'MEDICARE_REV', label: 'Medicare Revenue', driverCol: 'Medicare Days', department: 'All Departments' },
      { code: 'VETERANS_SKILLED_REV', label: 'Veterans Revenue - Skilled', driverCol: 'Veterans Skilled Days', department: 'All Departments' },
      { code: 'HMO_REV', label: 'HMO Revenue', driverCol: 'HMO Days', department: 'All Departments' },
      { code: 'ISNP_REV', label: 'ISNP Revenue', driverCol: 'ISNP Days', department: 'All Departments' },
    ],
    totalCode: 'TOTAL_SKILLED_REV',
    totalLabel: 'Total Skilled Revenue',
    driverCol: 'Total Skilled Days',
  },
  ventRevenue: {
    label: 'Vent Revenue',
    isHeader: true,
    items: [
      { code: 'MEDICAID_VENT_REV', label: 'Medicaid Revenue - Vent', driverCol: 'Medicaid Days - Vent', department: 'All Departments' },
      { code: 'MANAGED_MEDICAID_VENT_REV', label: 'Managed Medicaid Revenue - Vent', driverCol: 'Managed Medicaid Days - Vent', department: 'All Departments' },
      { code: 'PRIVATE_VENT_REV', label: 'Private Revenue - Vent', driverCol: 'Private Days - Vent', department: 'All Departments' },
      { code: 'VETERANS_VENT_REV', label: 'Veterans Revenue - Vent', driverCol: 'Veterans Days - Vent', department: 'All Departments' },
      { code: 'HOSPICE_VENT_REV', label: 'Hospice Revenue - Vent', driverCol: 'Hospice Days - Vent', department: 'All Departments' },
      { code: 'MEDICARE_VENT_REV', label: 'Medicare Revenue - Vent', driverCol: 'Medicare Days - Vent', department: 'All Departments' },
      { code: 'HMO_VENT_REV', label: 'HMO Revenue - Vent', driverCol: 'HMO Days - Vent', department: 'All Departments' },
    ],
    totalCode: 'TOTAL_VENT_REV',
    totalLabel: 'Total Vent Revenue',
    driverCol: 'Total Vent Days',
  },
  otherRevenue: {
    label: 'Other Revenue',
    isHeader: true,
    items: [
      { code: 'MED_B_REV', label: 'Med B', driverCol: 'Total Patient Days', department: 'All Departments' },
      { code: 'TELEHEALTH_REV', label: 'Telehealth Rev - MCR B', driverCol: 'Total Patient Days', department: 'All Departments' },
      { code: 'COVID_REIMBURSEMENT', label: 'Covid Expense Reimbursement', driverCol: 'Total Patient Days', department: 'All Departments' },
      { code: 'STATE_COVID_REIMBURSEMENT', label: 'State Covid Reimbursement', driverCol: 'Total Patient Days', department: 'All Departments' },
      { code: 'UPL_REV', label: 'UPL', driverCol: 'Total Patient Days', department: 'All Departments' },
      { code: 'OTHER_REV', label: 'Revenue - Other', driverCol: 'Total Patient Days', department: 'All Departments' },
    ],
    totalCode: 'TOTAL_OTHER_REV',
    totalLabel: 'Total Other Revenue',
    driverCol: 'Total Patient Days',
  },
};

// ============================================================================
// EXPENSE LINE ITEMS
// ============================================================================

export const EXPENSE_LINE_ITEMS = {
  ancillaryExpenses: {
    label: 'Ancillary Expenses',
    isHeader: true,
    subSections: [
      {
        label: 'Therapy Expenses',
        department: '683 (Therapy)',
        driverCol: 'Total Skilled Days',
        items: [
          { code: 'THERAPY_WAGES', label: 'Therapy Wages', account: 'Wages' },
          { code: 'THERAPY_BENEFITS', label: 'Therapy Benefits', account: 'Benefits' },
          { code: 'THERAPY_OTHER', label: 'Therapy Other', account: 'Other' },
        ],
        totalCode: 'TOTAL_THERAPY_EXP',
        totalLabel: 'Total Therapy Expenses',
      },
      {
        label: 'Non-Therapy Expenses',
        department: '700 (Ancillary)',
        driverCol: 'Total Skilled Days',
        items: [
          { code: 'PHARMACY_EXP', label: 'Pharmacy', account: 'Pharmacy' },
          { code: 'LAB_EXP', label: 'Lab', account: 'Lab' },
          { code: 'RADIOLOGY_EXP', label: 'Radiology', account: 'Radiology' },
          { code: 'NON_THERAPY_OTHER', label: 'Non-Therapy Other', account: 'Non-Therapy Other-CM' },
        ],
        totalCode: 'TOTAL_NON_THERAPY_EXP',
        totalLabel: 'Total Non-Therapy Expenses',
      },
    ],
    totalCode: 'TOTAL_ANCILLARY_EXP',
    totalLabel: 'Total Ancillary Expenses',
  },
  nursingExpenses: {
    label: 'Nursing Expenses',
    isHeader: true,
    department: '711 (Nursing)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'NURSING_WAGES', label: 'Nursing Wages', account: 'Wages' },
      { code: 'NURSING_BENEFITS', label: 'Nursing Benefits', account: 'Benefits' },
      { code: 'NURSING_AGENCY', label: 'Nursing Agency/Contract', account: 'Agency/Contract' },
      { code: 'NURSING_PURCHASED_SERVICES', label: 'Nursing Purchased Services/Consulting', account: 'Purchased Services/Consulting' },
      { code: 'NURSING_SUPPLIES', label: 'Nursing Patient Supplies', account: 'Patient Supplies' },
      { code: 'NURSING_RESOURCE_FEE', label: 'Nursing Resource Fee', account: 'Resource Fee' },
      { code: 'NURSING_OTHER', label: 'Nursing Other', account: 'Nursing Other-CM' },
    ],
    totalCode: 'TOTAL_NURSING_EXP',
    totalLabel: 'Total Nursing Expenses',
  },
  ventExpenses: {
    label: 'Vent Expenses',
    isHeader: true,
    department: '721 (Vent)',
    driverCol: 'Total Vent Days',
    items: [
      { code: 'VENT_WAGES', label: 'Vent Wages', account: 'Wages' },
      { code: 'VENT_BENEFITS', label: 'Vent Benefits', account: 'Benefits' },
      { code: 'VENT_PURCHASED_SERVICES', label: 'Vent Purchased Services/Consulting', account: 'Purchased Services/Consulting' },
      { code: 'VENT_SUPPLIES', label: 'Vent Patient Supplies', account: 'Patient Supplies' },
      { code: 'VENT_OTHER', label: 'Vent Other', account: 'Vent Other-CM' },
    ],
    totalCode: 'TOTAL_VENT_EXP',
    totalLabel: 'Total Vent Expenses',
  },
  plantExpenses: {
    label: 'Plant Expenses',
    isHeader: true,
    department: '821 (Plant)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'PLANT_WAGES', label: 'Plant Wages', account: 'Wages' },
      { code: 'PLANT_BENEFITS', label: 'Plant Benefits', account: 'Benefits' },
      { code: 'PLANT_UTILITIES', label: 'Plant Utilities', account: 'Utilities' },
      { code: 'PLANT_RM', label: 'Plant Minor Equip/R&M', account: 'Minor Equip/R&M' },
      { code: 'PLANT_OTHER', label: 'Plant Other', account: 'Plant Other-CM' },
    ],
    totalCode: 'TOTAL_PLANT_EXP',
    totalLabel: 'Total Plant Expenses',
  },
  housekeepingExpenses: {
    label: 'Housekeeping Expenses',
    isHeader: true,
    department: '851 (Housekeeping)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'HOUSEKEEPING_WAGES', label: 'Housekeeping Wages', account: 'Wages' },
      { code: 'HOUSEKEEPING_BENEFITS', label: 'Housekeeping Benefits', account: 'Benefits' },
      { code: 'HOUSEKEEPING_OTHER', label: 'Housekeeping Other', account: 'Other' },
    ],
    totalCode: 'TOTAL_HOUSEKEEPING_EXP',
    totalLabel: 'Total Housekeeping Expenses',
  },
  laundryExpenses: {
    label: 'Laundry Expenses',
    isHeader: true,
    department: '841 (Laundry)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'LAUNDRY_WAGES', label: 'Laundry Wages', account: 'Wages' },
      { code: 'LAUNDRY_BENEFITS', label: 'Laundry Benefits', account: 'Benefits' },
      { code: 'LAUNDRY_OTHER', label: 'Laundry Other', account: 'Other' },
    ],
    totalCode: 'TOTAL_LAUNDRY_EXP',
    totalLabel: 'Total Laundry Expenses',
  },
  dietaryExpenses: {
    label: 'Dietary Expenses',
    isHeader: true,
    department: '831 (Dietary)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'DIETARY_WAGES', label: 'Dietary Wages', account: 'Wages' },
      { code: 'DIETARY_BENEFITS', label: 'Dietary Benefits', account: 'Benefits' },
      { code: 'DIETARY_PURCHASED_SERVICES', label: 'Dietary Purchased Services/Consulting', account: 'Purchased Services/Consulting' },
      { code: 'DIETARY_FOOD', label: 'Dietary Food & Supplements', account: 'Food & Supplements' },
      { code: 'DIETARY_OTHER', label: 'Dietary Other', account: 'Dietary Other-CM' },
    ],
    totalCode: 'TOTAL_DIETARY_EXP',
    totalLabel: 'Total Dietary Expenses',
  },
  socialServicesExpenses: {
    label: 'Social Services Expenses',
    isHeader: true,
    department: '865 (Social Services)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'SOCIAL_SERVICES_WAGES', label: 'Social Services Wages', account: 'Wages' },
      { code: 'SOCIAL_SERVICES_BENEFITS', label: 'Social Services Benefits', account: 'Benefits' },
      { code: 'SOCIAL_SERVICES_OTHER', label: 'Social Services Other', account: 'Other' },
    ],
    totalCode: 'TOTAL_SOCIAL_SERVICES_EXP',
    totalLabel: 'Total Social Services Expenses',
  },
  activitiesExpenses: {
    label: 'Activities Expenses',
    isHeader: true,
    department: '871 (Activities)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'ACTIVITIES_WAGES', label: 'Activities Wages', account: 'Wages' },
      { code: 'ACTIVITIES_BENEFITS', label: 'Activities Benefits', account: 'Benefits' },
      { code: 'ACTIVITIES_OTHER', label: 'Activities Other', account: 'Other' },
    ],
    totalCode: 'TOTAL_ACTIVITIES_EXP',
    totalLabel: 'Total Activities Expenses',
  },
  medicalRecordsExpenses: {
    label: 'Medical Records Expenses',
    isHeader: true,
    department: '861 (Medical Records)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'MED_RECORDS_WAGES', label: 'Medical Records Wages', account: 'Wages' },
      { code: 'MED_RECORDS_BENEFITS', label: 'Medical Records Benefits', account: 'Benefits' },
      { code: 'MED_RECORDS_OTHER', label: 'Medical Records Other', account: 'Other' },
    ],
    totalCode: 'TOTAL_MED_RECORDS_EXP',
    totalLabel: 'Total Medical Records Expenses',
  },
  administrationExpenses: {
    label: 'Administration Expenses',
    isHeader: true,
    department: 'Home Office (Home Office)',
    driverCol: 'Total Patient Days',
    items: [
      { code: 'ADMIN_WAGES', label: 'Administration Wages', account: 'Wages' },
      { code: 'ADMIN_BENEFITS', label: 'Administration Benefits', account: 'Benefits' },
      { code: 'ADMIN_PURCHASED_SERVICES', label: 'Administration Purchased Services/Consulting', account: 'Purchased Services/Consulting' },
      { code: 'ADMIN_MINOR_EQUIP', label: 'Administration Minor Equip/R&M', account: 'Minor Equip/R&M' },
      { code: 'ADMIN_IT', label: 'Administration IT', account: 'IT' },
      { code: 'ADMIN_INSURANCE', label: 'Administration Insurance', account: 'Insurance' },
      { code: 'ADMIN_TELECOM', label: 'Administration Telecom', account: 'Telecom' },
      { code: 'ADMIN_TRAVEL', label: 'Administration Travel', account: 'Travel' },
      { code: 'ADMIN_LEGAL', label: 'Administration Legal Fees', account: 'Legal Fees' },
      { code: 'ADMIN_RECRUITMENT', label: 'Administration Recruitment', account: 'Recruitment' },
      { code: 'ADMIN_RESOURCE_FEE', label: 'Administration Resource Fee', account: 'Resource Fee' },
      { code: 'ADMIN_OTHER', label: 'Administration Other', account: 'Administration Other-CM' },
    ],
    totalCode: 'TOTAL_ADMIN_EXP',
    totalLabel: 'Total Administration Expenses',
  },
  otherOperatingExpenses: {
    label: 'Other Operating',
    items: [
      { code: 'BAD_DEBT', label: 'Bad Debt', department: 'All Departments', account: 'Bad Debt', driverCol: 'Total Patient Days' },
      { code: 'BED_TAX', label: 'Bed Tax', department: 'All Departments', account: 'Bed Tax', driverCol: 'Total Patient Days' },
    ],
  },
};

// ============================================================================
// SUMMARY LINE ITEMS
// ============================================================================

export const SUMMARY_LINE_ITEMS = {
  totalOperatingExpenses: { code: 'TOTAL_OPEX', label: 'Total Operating Expenses' },
  managementFee: { code: 'MANAGEMENT_FEE', label: 'Management Fee', department: 'All Departments', percentOfRevenue: 0.05 },
  ebitdar: { code: 'EBITDAR', label: 'EBITDAR', formula: 'TOTAL_REV - TOTAL_OPEX - MANAGEMENT_FEE' },
  ebitdarMargin: { code: 'EBITDAR_MARGIN', label: 'EBITDAR Margin', formula: 'EBITDAR / TOTAL_REV' },
  propertyExpenses: {
    label: 'Property Expenses',
    items: [
      { code: 'RENT_LEASE', label: 'Rent/Lease Expense', department: 'All Departments' },
      { code: 'PROPERTY_TAXES', label: 'Property Taxes', department: 'All Departments' },
    ],
    totalCode: 'TOTAL_PROPERTY_EXP',
    totalLabel: 'Total Property Expenses',
  },
  ebitda: { code: 'EBITDA', label: 'EBITDA', formula: 'EBITDAR - TOTAL_PROPERTY_EXP' },
  ebitdaMargin: { code: 'EBITDA_MARGIN', label: 'EBITDA Margin', formula: 'EBITDA / TOTAL_REV' },
  otherExpenses: {
    label: 'Other Expenses',
    items: [
      { code: 'DEPRECIATION', label: 'Depreciation & Amortization', department: 'All Departments' },
      { code: 'OTHER_MISC', label: 'Other Misc (Income)/Expense', department: 'All Departments' },
      { code: 'GAIN_LOSS_ASSETS', label: '(Gain)/Loss on Assets', department: 'All Departments' },
      { code: 'INTEREST', label: 'Interest', department: 'All Departments' },
    ],
    totalCode: 'TOTAL_OTHER_EXP',
    totalLabel: 'Total Other Expenses',
  },
  netIncome: { code: 'NET_INCOME', label: 'Net Income', formula: 'EBITDA - TOTAL_OTHER_EXP' },
  netIncomeMargin: { code: 'NET_INCOME_MARGIN', label: 'Net Income Margin', formula: 'NET_INCOME / TOTAL_REV' },
};

// ============================================================================
// CENSUS/PATIENT DAYS LINE ITEMS
// ============================================================================

export const CENSUS_LINE_ITEMS = {
  nonSkilledDays: {
    label: 'Non-Skilled Days',
    items: [
      { code: 'MEDICAID_DAYS', label: 'Medicaid Days' },
      { code: 'MANAGED_MEDICAID_DAYS', label: 'Managed Medicaid Days' },
      { code: 'PRIVATE_DAYS', label: 'Private Days' },
      { code: 'VETERANS_DAYS', label: 'Veterans Days' },
      { code: 'HOSPICE_DAYS', label: 'Hospice Days' },
    ],
    totalCode: 'TOTAL_NON_SKILLED_DAYS',
    totalLabel: 'Total Non-Skilled Days',
  },
  skilledDays: {
    label: 'Skilled Days',
    items: [
      { code: 'MEDICARE_DAYS', label: 'Medicare Days' },
      { code: 'MANAGED_MEDICAID_SKILLED_DAYS', label: 'Managed Medicaid Skilled Days' },
      { code: 'MEDICAID_COMPLEX_DAYS', label: 'Medicaid Complex Days' },
      { code: 'MEDICAID_BARIATRIC_DAYS', label: 'Medicaid Bariatric Days' },
      { code: 'VETERANS_SKILLED_DAYS', label: 'Veterans Skilled Days' },
      { code: 'HMO_DAYS', label: 'HMO Days' },
      { code: 'ISNP_DAYS', label: 'ISNP Days' },
    ],
    totalCode: 'TOTAL_SKILLED_DAYS',
    totalLabel: 'Total Skilled Days',
  },
  ventDays: {
    label: 'Vent Days',
    items: [
      { code: 'MEDICAID_VENT_DAYS', label: 'Medicaid Days - Vent' },
      { code: 'MANAGED_MEDICAID_VENT_DAYS', label: 'Managed Medicaid Days - Vent' },
      { code: 'PRIVATE_VENT_DAYS', label: 'Private Days - Vent' },
      { code: 'VETERANS_VENT_DAYS', label: 'Veterans Days - Vent' },
      { code: 'HOSPICE_VENT_DAYS', label: 'Hospice Days - Vent' },
      { code: 'MEDICARE_VENT_DAYS', label: 'Medicare Days - Vent' },
      { code: 'HMO_VENT_DAYS', label: 'HMO Days - Vent' },
    ],
    totalCode: 'TOTAL_VENT_DAYS',
    totalLabel: 'Total Vent Days',
  },
  summary: {
    items: [
      { code: 'SECOND_OCCUPANT_DAYS', label: 'Total Second Occupant Days' },
      { code: 'TOTAL_PATIENT_DAYS', label: 'Total Patient Days' },
      { code: 'TOTAL_UNIT_DAYS', label: 'Total Unit Days' },
    ],
  },
  metrics: {
    items: [
      { code: 'SKILLED_MIX', label: 'Skilled Mix', formula: 'TOTAL_SKILLED_DAYS / TOTAL_PATIENT_DAYS' },
      { code: 'SKILLED_MIX_W_VENT', label: 'Skilled Mix w/ Vent', formula: '(TOTAL_SKILLED_DAYS + TOTAL_VENT_DAYS) / TOTAL_PATIENT_DAYS' },
      { code: 'OPERATIONAL_BEDS', label: 'Operational Beds' },
      { code: 'OPERATIONAL_OCCUPANCY', label: 'Operational Occupancy', formula: 'ADC / OPERATIONAL_BEDS' },
      { code: 'LICENSED_BEDS', label: 'Licensed Beds' },
      { code: 'LICENSED_OCCUPANCY', label: 'Licensed Occupancy', formula: 'ADC / LICENSED_BEDS' },
    ],
  },
};

// ============================================================================
// VALUATION SECTION
// ============================================================================

export const VALUATION_LINE_ITEMS = {
  capRate: { code: 'CAP_RATE', label: 'Cap Rate', note: '12-13% SNF, 6-9% IL/AL/MC' },
  totalValuation: { code: 'TOTAL_VALUATION', label: 'Total Valuation (Cap Rate)', formula: 'EBITDAR / CAP_RATE' },
  valueAllocations: {
    label: 'Value Allocations',
    items: [
      { code: 'RE_VALUE', label: 'Real Estate (RE Cap Rate)' },
      { code: 'FFE_VALUE', label: 'FF&E (Fixed Estimate per Bed)' },
      { code: 'BUSINESS_VALUE', label: 'Business (Residual Value)' },
    ],
  },
  rentTargets: {
    label: 'Rent Targets',
    items: [
      { code: 'RENT_RATE_TARGET', label: 'Rent Rate Target' },
      { code: 'COVERAGE_RATIO_TARGET', label: 'Coverage Ratio Target', defaultValue: 1.40 },
      { code: 'MAX_RENT_AT_COVERAGE', label: 'Max Rent at Target Coverage', formula: 'EBITDAR / COVERAGE_RATIO_TARGET' },
    ],
  },
};

// ============================================================================
// PPD RATES STRUCTURE
// ============================================================================

export const PPD_RATE_STRUCTURE = {
  nonSkilled: [
    { code: 'MEDICAID_PPD', label: 'Medicaid PPD', daysCode: 'MEDICAID_DAYS', revenueCode: 'MEDICAID_REV' },
    { code: 'MANAGED_MEDICAID_PPD', label: 'Managed Medicaid PPD', daysCode: 'MANAGED_MEDICAID_DAYS', revenueCode: 'MANAGED_MEDICAID_REV' },
    { code: 'PRIVATE_PPD', label: 'Private PPD', daysCode: 'PRIVATE_DAYS', revenueCode: 'PRIVATE_REV' },
    { code: 'VETERANS_PPD', label: 'Veterans PPD', daysCode: 'VETERANS_DAYS', revenueCode: 'VETERANS_REV' },
    { code: 'HOSPICE_PPD', label: 'Hospice PPD', daysCode: 'HOSPICE_DAYS', revenueCode: 'HOSPICE_REV' },
  ],
  skilled: [
    { code: 'MEDICARE_PPD', label: 'Medicare PPD', daysCode: 'MEDICARE_DAYS', revenueCode: 'MEDICARE_REV' },
    { code: 'MANAGED_MEDICAID_SKILLED_PPD', label: 'Managed Medicaid Skilled PPD', daysCode: 'MANAGED_MEDICAID_SKILLED_DAYS', revenueCode: 'MANAGED_MEDICAID_SKILLED_REV' },
    { code: 'MEDICAID_COMPLEX_PPD', label: 'Medicaid Complex PPD', daysCode: 'MEDICAID_COMPLEX_DAYS', revenueCode: 'MEDICAID_COMPLEX_REV' },
    { code: 'HMO_PPD', label: 'HMO PPD', daysCode: 'HMO_DAYS', revenueCode: 'HMO_REV' },
    { code: 'ISNP_PPD', label: 'ISNP PPD', daysCode: 'ISNP_DAYS', revenueCode: 'ISNP_REV' },
  ],
  vent: [
    { code: 'MEDICAID_VENT_PPD', label: 'Medicaid Vent PPD', daysCode: 'MEDICAID_VENT_DAYS', revenueCode: 'MEDICAID_VENT_REV' },
    { code: 'MEDICARE_VENT_PPD', label: 'Medicare Vent PPD', daysCode: 'MEDICARE_VENT_DAYS', revenueCode: 'MEDICARE_VENT_REV' },
  ],
};

// ============================================================================
// STATE PRICE PER BED AVERAGES (Fallback valuation)
// ============================================================================

export const STATE_PRICE_PER_BED: Record<string, number> = {
  'AL': 45000, 'AK': 85000, 'AZ': 55000, 'AR': 40000, 'CA': 95000,
  'CO': 65000, 'CT': 80000, 'DE': 70000, 'FL': 60000, 'GA': 50000,
  'HI': 90000, 'ID': 50000, 'IL': 55000, 'IN': 45000, 'IA': 42000,
  'KS': 40000, 'KY': 42000, 'LA': 45000, 'ME': 55000, 'MD': 75000,
  'MA': 85000, 'MI': 50000, 'MN': 55000, 'MS': 38000, 'MO': 42000,
  'MT': 48000, 'NE': 42000, 'NV': 60000, 'NH': 65000, 'NJ': 85000,
  'NM': 45000, 'NY': 90000, 'NC': 50000, 'ND': 45000, 'OH': 48000,
  'OK': 40000, 'OR': 65000, 'PA': 60000, 'RI': 75000, 'SC': 48000,
  'SD': 42000, 'TN': 48000, 'TX': 50000, 'UT': 55000, 'VT': 60000,
  'VA': 58000, 'WA': 70000, 'WV': 40000, 'WI': 52000, 'WY': 50000,
};

// ============================================================================
// DEFAULT ASSUMPTIONS
// ============================================================================

export const DEFAULT_ASSUMPTIONS = {
  capRate: {
    SNF: 0.12,  // 12% for SNF
    ALF: 0.08,  // 8% for ALF
    ILF: 0.07,  // 7% for ILF
    MC: 0.085,  // 8.5% for Memory Care
  },
  yield: {
    SNF: 0.085, // 8.5% for SNF
    ALF: 0.065, // 6.5% for ALF
    ILF: 0.055, // 5.5% for ILF
  },
  coverageRatio: {
    minimum: 1.25,
    target: 1.40,
    healthy: 1.50,
  },
  managementFee: 0.05, // 5% of revenue
  revenueGrowth: {
    medicare: 0.03,
    medicaid: 0.015,
    private: 0.04,
  },
  expenseInflation: {
    wages: 0.035,
    benefits: 0.05,
    general: 0.025,
  },
  ffePerBed: 5000, // $5,000 per bed for FF&E allocation
};

// ============================================================================
// TEMPLATE METADATA
// ============================================================================

export const PROFORMA_TEMPLATE_METADATA = {
  version: '1.0.0',
  name: 'SNF Pro Forma Template',
  basedOn: 'Anacortes Proforma_12.29.2025',
  periods: {
    historical: 12, // 12 months of historical data
    projection: 60, // 5 years of projections
  },
  columnStructure: {
    months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    summaryColumns: ['T12', 'Annualized', 'Budget', 'Variance'],
  },
  rowStructure: {
    order: [
      'REVENUE',
      'NON_SKILLED_REVENUE',
      'SKILLED_REVENUE',
      'VENT_REVENUE',
      'OTHER_REVENUE',
      'TOTAL_REVENUE',
      'OPERATING_EXPENSES',
      'ANCILLARY_EXPENSES',
      'NURSING_EXPENSES',
      'VENT_EXPENSES',
      'PLANT_EXPENSES',
      'HOUSEKEEPING_EXPENSES',
      'LAUNDRY_EXPENSES',
      'DIETARY_EXPENSES',
      'SOCIAL_SERVICES_EXPENSES',
      'ACTIVITIES_EXPENSES',
      'MEDICAL_RECORDS_EXPENSES',
      'ADMINISTRATION_EXPENSES',
      'BAD_DEBT',
      'BED_TAX',
      'TOTAL_OPERATING_EXPENSES',
      'MANAGEMENT_FEE',
      'EBITDAR',
      'PROPERTY_EXPENSES',
      'EBITDA',
      'OTHER_EXPENSES',
      'NET_INCOME',
      'CENSUS',
      'OCCUPANCY_METRICS',
      'VALUATION',
    ],
  },
};

export type ProformaLineItem = {
  code: string;
  label: string;
  department?: string;
  account?: string;
  driverCol?: string;
  formula?: string;
  isHeader?: boolean;
  percentOfRevenue?: number;
};

export type ProformaPeriodData = {
  period: string; // e.g., 'Jan-23'
  periodStart: Date;
  periodEnd: Date;
  daysInPeriod: number;
  values: Record<string, number>;
};

export type ProformaData = {
  facilityId: string;
  facilityName: string;
  periods: ProformaPeriodData[];
  assumptions: Record<string, number>;
  totals: {
    t12: Record<string, number>;
    annualized: Record<string, number>;
  };
};
