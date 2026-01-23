// Proforma Types based on Cascadia Proforma Structure

export type FacilityType = 'snf' | 'alf' | 'ilf';
export type ScenarioType = 'prior_actuals' | 'budget' | 'forecast' | 'acquisition';

export interface ProformaMonth {
  date: Date;
  scenario: ScenarioType;
  values: Record<string, number>;
}

export interface ProformaLineItem {
  id: string;
  label: string;
  category: string;
  subcategory?: string;
  type: 'input' | 'calculated' | 'subtotal' | 'total' | 'header';
  format: 'currency' | 'percent' | 'number' | 'days';
  formula?: string;
  indent?: number;
  highlight?: boolean;
  editable?: boolean;
}

export interface ProformaSection {
  id: string;
  label: string;
  lineItems: ProformaLineItem[];
  collapsed?: boolean;
}

export interface FacilityProforma {
  id: string;
  facilityId: string;
  facilityName: string;
  facilityType: FacilityType;
  months: ProformaMonth[];
  assumptions: ProformaAssumptions;
}

export interface ProformaAssumptions {
  // Census & Occupancy
  licensedBeds: number;
  targetOccupancy: number;

  // Revenue PPD (Per Patient Day) rates
  medicaidPPD: number;
  managedMedicaidPPD: number;
  privatePPD: number;
  veteransPPD: number;
  hospicePPD: number;
  medicarePPD: number;
  hmoPPD: number;
  isnpPPD: number;

  // Payer Mix (percentages)
  medicaidMix: number;
  managedMedicaidMix: number;
  privateMix: number;
  veteransMix: number;
  hospiceMix: number;
  medicareMix: number;
  hmoMix: number;
  isnpMix: number;

  // Expense assumptions
  therapyWageRate: number;
  nursingWageRate: number;
  benefitsPercent: number;
  managementFeePercent: number;
  badDebtPercent: number;

  // Growth rates
  revenueGrowthRate: number;
  expenseGrowthRate: number;

  // Property
  rentRate: number;
  propertyTaxes: number;

  // ALF/ILF specific
  monthlyRate?: number; // For ALF/ILF
  careLevel1Rate?: number;
  careLevel2Rate?: number;
  careLevel3Rate?: number;
}

// Default assumptions by facility type
export const defaultAssumptions: Record<FacilityType, ProformaAssumptions> = {
  snf: {
    licensedBeds: 100,
    targetOccupancy: 0.85,
    medicaidPPD: 280,
    managedMedicaidPPD: 295,
    privatePPD: 380,
    veteransPPD: 310,
    hospicePPD: 195,
    medicarePPD: 650,
    hmoPPD: 520,
    isnpPPD: 480,
    medicaidMix: 0.45,
    managedMedicaidMix: 0.08,
    privateMix: 0.12,
    veteransMix: 0.03,
    hospiceMix: 0.02,
    medicareMix: 0.22,
    hmoMix: 0.05,
    isnpMix: 0.03,
    therapyWageRate: 45,
    nursingWageRate: 35,
    benefitsPercent: 0.22,
    managementFeePercent: 0.05,
    badDebtPercent: 0.015,
    revenueGrowthRate: 0.03,
    expenseGrowthRate: 0.025,
    rentRate: 1200,
    propertyTaxes: 85000,
  },
  alf: {
    licensedBeds: 80,
    targetOccupancy: 0.88,
    medicaidPPD: 0,
    managedMedicaidPPD: 0,
    privatePPD: 0,
    veteransPPD: 0,
    hospicePPD: 0,
    medicarePPD: 0,
    hmoPPD: 0,
    isnpPPD: 0,
    medicaidMix: 0,
    managedMedicaidMix: 0,
    privateMix: 1.0,
    veteransMix: 0,
    hospiceMix: 0,
    medicareMix: 0,
    hmoMix: 0,
    isnpMix: 0,
    therapyWageRate: 0,
    nursingWageRate: 28,
    benefitsPercent: 0.20,
    managementFeePercent: 0.05,
    badDebtPercent: 0.01,
    revenueGrowthRate: 0.035,
    expenseGrowthRate: 0.025,
    rentRate: 800,
    propertyTaxes: 65000,
    monthlyRate: 5500,
    careLevel1Rate: 750,
    careLevel2Rate: 1250,
    careLevel3Rate: 1850,
  },
  ilf: {
    licensedBeds: 120,
    targetOccupancy: 0.92,
    medicaidPPD: 0,
    managedMedicaidPPD: 0,
    privatePPD: 0,
    veteransPPD: 0,
    hospicePPD: 0,
    medicarePPD: 0,
    hmoPPD: 0,
    isnpPPD: 0,
    medicaidMix: 0,
    managedMedicaidMix: 0,
    privateMix: 1.0,
    veteransMix: 0,
    hospiceMix: 0,
    medicareMix: 0,
    hmoMix: 0,
    isnpMix: 0,
    therapyWageRate: 0,
    nursingWageRate: 22,
    benefitsPercent: 0.18,
    managementFeePercent: 0.04,
    badDebtPercent: 0.005,
    revenueGrowthRate: 0.03,
    expenseGrowthRate: 0.02,
    rentRate: 600,
    propertyTaxes: 55000,
    monthlyRate: 3800,
  },
};

// Proforma line item structure (matching Cascadia format)
export const snfProformaStructure: ProformaSection[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    lineItems: [
      { id: 'revenue_header', label: 'Revenue', category: 'revenue', type: 'header', format: 'currency', indent: 0, highlight: true },

      // Non-Skilled Revenue
      { id: 'non_skilled_header', label: 'Non-Skilled Revenue', category: 'revenue', subcategory: 'non_skilled', type: 'header', format: 'currency', indent: 1 },
      { id: 'medicaid_revenue', label: 'Medicaid Revenue', category: 'revenue', subcategory: 'non_skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'managed_medicaid_revenue', label: 'Managed Medicaid Revenue', category: 'revenue', subcategory: 'non_skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'private_revenue', label: 'Private Revenue', category: 'revenue', subcategory: 'non_skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'veterans_revenue', label: 'Veterans Revenue', category: 'revenue', subcategory: 'non_skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'hospice_revenue', label: 'Hospice Revenue', category: 'revenue', subcategory: 'non_skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'total_non_skilled_revenue', label: 'Total Non-Skilled Revenue', category: 'revenue', subcategory: 'non_skilled', type: 'subtotal', format: 'currency', indent: 1 },

      // Skilled Revenue
      { id: 'skilled_header', label: 'Skilled Revenue', category: 'revenue', subcategory: 'skilled', type: 'header', format: 'currency', indent: 1 },
      { id: 'medicare_revenue', label: 'Medicare Revenue', category: 'revenue', subcategory: 'skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'managed_medicaid_skilled_revenue', label: 'Managed Medicaid Revenue - Skilled', category: 'revenue', subcategory: 'skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'hmo_revenue', label: 'HMO Revenue', category: 'revenue', subcategory: 'skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'isnp_revenue', label: 'ISNP Revenue', category: 'revenue', subcategory: 'skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'veterans_skilled_revenue', label: 'Veterans Revenue - Skilled', category: 'revenue', subcategory: 'skilled', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'total_skilled_revenue', label: 'Total Skilled Revenue', category: 'revenue', subcategory: 'skilled', type: 'subtotal', format: 'currency', indent: 1 },

      // Other Revenue
      { id: 'other_revenue_header', label: 'Other Revenue', category: 'revenue', subcategory: 'other', type: 'header', format: 'currency', indent: 1 },
      { id: 'med_b_revenue', label: 'Med B', category: 'revenue', subcategory: 'other', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'upl_revenue', label: 'UPL', category: 'revenue', subcategory: 'other', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'other_revenue', label: 'Revenue - Other', category: 'revenue', subcategory: 'other', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'total_other_revenue', label: 'Total Other Revenue', category: 'revenue', subcategory: 'other', type: 'subtotal', format: 'currency', indent: 1 },

      { id: 'total_revenue', label: 'Total Revenue', category: 'revenue', type: 'total', format: 'currency', indent: 0, highlight: true },
    ],
  },
  {
    id: 'operating_expenses',
    label: 'Operating Expenses',
    lineItems: [
      { id: 'opex_header', label: 'Operating Expenses', category: 'expenses', type: 'header', format: 'currency', indent: 0, highlight: true },

      // Nursing Expenses
      { id: 'nursing_header', label: 'Nursing Expenses', category: 'expenses', subcategory: 'nursing', type: 'header', format: 'currency', indent: 1 },
      { id: 'nursing_wages', label: 'Nursing Wages', category: 'expenses', subcategory: 'nursing', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'nursing_benefits', label: 'Nursing Benefits', category: 'expenses', subcategory: 'nursing', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'nursing_agency', label: 'Nursing Agency/Contract', category: 'expenses', subcategory: 'nursing', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'nursing_supplies', label: 'Nursing Patient Supplies', category: 'expenses', subcategory: 'nursing', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'nursing_other', label: 'Nursing Other', category: 'expenses', subcategory: 'nursing', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'total_nursing_expenses', label: 'Total Nursing Expenses', category: 'expenses', subcategory: 'nursing', type: 'subtotal', format: 'currency', indent: 1 },

      // Therapy Expenses
      { id: 'therapy_header', label: 'Therapy Expenses', category: 'expenses', subcategory: 'therapy', type: 'header', format: 'currency', indent: 1 },
      { id: 'therapy_wages', label: 'Therapy Wages', category: 'expenses', subcategory: 'therapy', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'therapy_benefits', label: 'Therapy Benefits', category: 'expenses', subcategory: 'therapy', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'therapy_other', label: 'Therapy Other', category: 'expenses', subcategory: 'therapy', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'total_therapy_expenses', label: 'Total Therapy Expenses', category: 'expenses', subcategory: 'therapy', type: 'subtotal', format: 'currency', indent: 1 },

      // Dietary Expenses
      { id: 'dietary_header', label: 'Dietary Expenses', category: 'expenses', subcategory: 'dietary', type: 'header', format: 'currency', indent: 1 },
      { id: 'dietary_wages', label: 'Dietary Wages', category: 'expenses', subcategory: 'dietary', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'dietary_benefits', label: 'Dietary Benefits', category: 'expenses', subcategory: 'dietary', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'dietary_food', label: 'Food & Supplements', category: 'expenses', subcategory: 'dietary', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'dietary_other', label: 'Dietary Other', category: 'expenses', subcategory: 'dietary', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'total_dietary_expenses', label: 'Total Dietary Expenses', category: 'expenses', subcategory: 'dietary', type: 'subtotal', format: 'currency', indent: 1 },

      // Plant Expenses
      { id: 'plant_header', label: 'Plant Expenses', category: 'expenses', subcategory: 'plant', type: 'header', format: 'currency', indent: 1 },
      { id: 'plant_wages', label: 'Plant Wages', category: 'expenses', subcategory: 'plant', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'plant_benefits', label: 'Plant Benefits', category: 'expenses', subcategory: 'plant', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'plant_utilities', label: 'Utilities', category: 'expenses', subcategory: 'plant', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'plant_maintenance', label: 'Minor Equip/R&M', category: 'expenses', subcategory: 'plant', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'plant_other', label: 'Plant Other', category: 'expenses', subcategory: 'plant', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'total_plant_expenses', label: 'Total Plant Expenses', category: 'expenses', subcategory: 'plant', type: 'subtotal', format: 'currency', indent: 1 },

      // Admin Expenses
      { id: 'admin_header', label: 'Administration Expenses', category: 'expenses', subcategory: 'admin', type: 'header', format: 'currency', indent: 1 },
      { id: 'admin_wages', label: 'Administration Wages', category: 'expenses', subcategory: 'admin', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'admin_benefits', label: 'Administration Benefits', category: 'expenses', subcategory: 'admin', type: 'calculated', format: 'currency', indent: 2 },
      { id: 'admin_insurance', label: 'Insurance', category: 'expenses', subcategory: 'admin', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'admin_it', label: 'IT', category: 'expenses', subcategory: 'admin', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'admin_legal', label: 'Legal Fees', category: 'expenses', subcategory: 'admin', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'admin_other', label: 'Administration Other', category: 'expenses', subcategory: 'admin', type: 'input', format: 'currency', indent: 2, editable: true },
      { id: 'total_admin_expenses', label: 'Total Administration Expenses', category: 'expenses', subcategory: 'admin', type: 'subtotal', format: 'currency', indent: 1 },

      // Other Operating
      { id: 'bad_debt', label: 'Bad Debt', category: 'expenses', type: 'calculated', format: 'currency', indent: 1 },
      { id: 'bed_tax', label: 'Bed Tax', category: 'expenses', type: 'input', format: 'currency', indent: 1, editable: true },

      { id: 'total_operating_expenses', label: 'Total Operating Expenses', category: 'expenses', type: 'total', format: 'currency', indent: 0, highlight: true },
    ],
  },
  {
    id: 'ebitdar',
    label: 'EBITDAR',
    lineItems: [
      { id: 'management_fee', label: 'Management Fee', category: 'below_line', type: 'calculated', format: 'currency', indent: 0 },
      { id: 'ebitdar', label: 'EBITDAR', category: 'metrics', type: 'calculated', format: 'currency', indent: 0, highlight: true },
      { id: 'ebitdar_margin', label: 'EBITDAR Margin', category: 'metrics', type: 'calculated', format: 'percent', indent: 0 },
    ],
  },
  {
    id: 'property',
    label: 'Property Expenses',
    lineItems: [
      { id: 'property_header', label: 'Property Expenses', category: 'property', type: 'header', format: 'currency', indent: 0 },
      { id: 'rent_expense', label: 'Rent/Lease Expense', category: 'property', type: 'calculated', format: 'currency', indent: 1 },
      { id: 'property_taxes', label: 'Property Taxes', category: 'property', type: 'input', format: 'currency', indent: 1, editable: true },
      { id: 'total_property_expenses', label: 'Total Property Expenses', category: 'property', type: 'subtotal', format: 'currency', indent: 0 },
    ],
  },
  {
    id: 'ebitda',
    label: 'EBITDA',
    lineItems: [
      { id: 'ebitda', label: 'EBITDA', category: 'metrics', type: 'calculated', format: 'currency', indent: 0, highlight: true },
      { id: 'ebitda_margin', label: 'EBITDA Margin', category: 'metrics', type: 'calculated', format: 'percent', indent: 0 },
    ],
  },
  {
    id: 'other_expenses',
    label: 'Other Expenses',
    lineItems: [
      { id: 'other_expenses_header', label: 'Other Expenses', category: 'other', type: 'header', format: 'currency', indent: 0 },
      { id: 'depreciation', label: 'Depreciation & Amortization', category: 'other', type: 'input', format: 'currency', indent: 1, editable: true },
      { id: 'interest', label: 'Interest', category: 'other', type: 'input', format: 'currency', indent: 1, editable: true },
      { id: 'other_misc', label: 'Other Misc (Income)/Expense', category: 'other', type: 'input', format: 'currency', indent: 1, editable: true },
      { id: 'total_other_expenses', label: 'Total Other Expenses', category: 'other', type: 'subtotal', format: 'currency', indent: 0 },
    ],
  },
  {
    id: 'net_income',
    label: 'Net Income',
    lineItems: [
      { id: 'net_income', label: 'Net Income', category: 'metrics', type: 'calculated', format: 'currency', indent: 0, highlight: true },
      { id: 'net_income_margin', label: 'Net Income Margin', category: 'metrics', type: 'calculated', format: 'percent', indent: 0 },
    ],
  },
];

// Census/Days section
export const censusSection: ProformaSection = {
  id: 'census',
  label: 'Census & Patient Days',
  lineItems: [
    { id: 'licensed_beds', label: 'Licensed Beds', category: 'census', type: 'input', format: 'number', indent: 0, editable: true },
    { id: 'occupied_beds', label: 'Occupied Beds', category: 'census', type: 'calculated', format: 'number', indent: 0 },
    { id: 'occupancy_rate', label: 'Occupancy Rate', category: 'census', type: 'calculated', format: 'percent', indent: 0 },
    { id: 'total_patient_days', label: 'Total Patient Days', category: 'census', type: 'calculated', format: 'days', indent: 0, highlight: true },

    { id: 'medicaid_days', label: 'Medicaid Days', category: 'census', type: 'calculated', format: 'days', indent: 1 },
    { id: 'managed_medicaid_days', label: 'Managed Medicaid Days', category: 'census', type: 'calculated', format: 'days', indent: 1 },
    { id: 'private_days', label: 'Private Days', category: 'census', type: 'calculated', format: 'days', indent: 1 },
    { id: 'medicare_days', label: 'Medicare Days', category: 'census', type: 'calculated', format: 'days', indent: 1 },
    { id: 'hmo_days', label: 'HMO Days', category: 'census', type: 'calculated', format: 'days', indent: 1 },
    { id: 'other_days', label: 'Other Days', category: 'census', type: 'calculated', format: 'days', indent: 1 },
  ],
};
