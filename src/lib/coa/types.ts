// Chart of Accounts Types for Healthcare Facilities
// Based on standardized healthcare financial reporting structures

export type AccountCategory =
  | 'revenue'
  | 'ancillary_expense'
  | 'nursing_expense'
  | 'vent_expense'
  | 'plant_expense'
  | 'housekeeping_expense'
  | 'laundry_expense'
  | 'dietary_expense'
  | 'social_services_expense'
  | 'activities_expense'
  | 'medical_records_expense'
  | 'administration_expense'
  | 'bad_debt'
  | 'bed_tax'
  | 'management_fee'
  | 'property_expense'
  | 'other_expense'
  | 'patient_days'
  | 'census';

export type AccountSubcategory =
  | 'non_skilled'
  | 'skilled'
  | 'vent'
  | 'other_revenue'
  | 'therapy'
  | 'non_therapy'
  | 'wages'
  | 'benefits'
  | 'agency'
  | 'purchased_services'
  | 'supplies'
  | 'other'
  | 'utilities'
  | 'maintenance'
  | 'food'
  | 'it'
  | 'insurance'
  | 'legal'
  | 'rent'
  | 'taxes'
  | 'depreciation'
  | 'interest';

export interface COAAccount {
  code: string; // e.g., "4000.100" for Medicaid Revenue
  name: string;
  shortName?: string; // For display in narrow columns
  category: AccountCategory;
  subcategory?: AccountSubcategory;
  isHeader: boolean;
  isTotal: boolean;
  parentCode?: string; // For hierarchy
  ppdEligible: boolean; // Whether PPD makes sense for this line
  ppdDenominator?: 'total_days' | 'skilled_days' | 'non_skilled_days' | 'vent_days'; // What to divide by
  formatType: 'currency' | 'percent' | 'number' | 'days';
  mappingKeys?: string[]; // Keys for automatic mapping from documents
  description?: string;
}

export interface COAMapping {
  coaCode: string;
  sourceField: string; // Field name from extracted document
  confidence: number;
  transformFunction?: string; // Optional transformation (e.g., "annualize", "monthly")
}

// PPD Benchmarks for SNF facilities
export interface PPDBenchmark {
  coaCode: string;
  low: number;
  median: number;
  high: number;
  unit: 'dollars' | 'hours' | 'percent';
  source?: string;
}
