// =============================================================================
// CHART OF ACCOUNTS - Standard COA for healthcare facility financials
// =============================================================================

import type { RevenueCategory, ExpenseCategory } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface COAAccount {
  code: string;
  name: string;
  category: RevenueCategory | ExpenseCategory | 'asset' | 'liability' | 'equity';
  type: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity';
  subCategory?: string;
  description: string;
  aliases: string[];
  normalBalance: 'debit' | 'credit';
  isOperating: boolean;
  benchmarkCategory?: string;
}

export interface COAMapping {
  sourceLabel: string;
  matchedAccount: COAAccount | null;
  confidence: number;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'manual' | 'none';
}

// =============================================================================
// STANDARD CHART OF ACCOUNTS
// =============================================================================

export const REVENUE_ACCOUNTS: COAAccount[] = [
  // Medicare Revenue
  {
    code: '4010',
    name: 'Medicare Part A Revenue',
    category: 'medicare_part_a',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Skilled nursing facility revenue from Medicare Part A',
    aliases: ['Medicare A', 'Medicare Part A', 'Skilled Nursing Revenue', 'SNF Revenue', 'Part A Revenue'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'medicare',
  },
  {
    code: '4020',
    name: 'Medicare Part B Revenue',
    category: 'medicare_part_b',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Therapy and ancillary revenue from Medicare Part B',
    aliases: ['Medicare B', 'Medicare Part B', 'Therapy Revenue', 'Part B Revenue', 'Outpatient Therapy'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'medicare',
  },
  {
    code: '4030',
    name: 'Medicare Advantage Revenue',
    category: 'medicare_advantage',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Revenue from Medicare Advantage (managed Medicare) plans',
    aliases: ['Medicare Advantage', 'MA Revenue', 'Managed Medicare', 'Medicare HMO', 'Medicare PPO'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'managed_medicare',
  },

  // Medicaid Revenue
  {
    code: '4110',
    name: 'Medicaid Revenue',
    category: 'medicaid',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Revenue from state Medicaid programs',
    aliases: ['Medicaid', 'Medicaid Nursing', 'State Medicaid', 'Title XIX'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'medicaid',
  },
  {
    code: '4120',
    name: 'Medicaid Quality Add-on',
    category: 'medicaid_quality_addon',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Medicaid quality incentive payments',
    aliases: ['Quality Add-on', 'Medicaid Quality', 'Quality Incentive', 'QIPP'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'medicaid',
  },

  // Private Pay Revenue
  {
    code: '4210',
    name: 'Private Pay Revenue',
    category: 'private_pay',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Revenue from private pay/self-pay residents',
    aliases: ['Private Pay', 'Self Pay', 'Private', 'Cash Pay', 'Out of Pocket'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'private_pay',
  },

  // Managed Care Revenue
  {
    code: '4310',
    name: 'Managed Care Revenue',
    category: 'managed_care',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Revenue from commercial insurance and managed care plans',
    aliases: ['Managed Care', 'Insurance', 'Commercial Insurance', 'HMO', 'PPO'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'managed_care',
  },

  // VA Revenue
  {
    code: '4410',
    name: 'VA Contract Revenue',
    category: 'va_contract',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Revenue from Veterans Affairs contracts',
    aliases: ['VA', 'Veterans', 'VA Contract', 'Veterans Affairs'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'government',
  },

  // Hospice Revenue
  {
    code: '4510',
    name: 'Hospice Revenue',
    category: 'hospice',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Room and board revenue for hospice patients',
    aliases: ['Hospice', 'Hospice R&B', 'Hospice Room and Board'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'hospice',
  },

  // Respite Revenue
  {
    code: '4520',
    name: 'Respite Care Revenue',
    category: 'respite',
    type: 'revenue',
    subCategory: 'patient_revenue',
    description: 'Short-term respite care revenue',
    aliases: ['Respite', 'Respite Care', 'Short Stay'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'private_pay',
  },

  // Ancillary Revenue
  {
    code: '4610',
    name: 'Therapy Ancillary Revenue',
    category: 'therapy_ancillary',
    type: 'revenue',
    subCategory: 'ancillary_revenue',
    description: 'Revenue from therapy services beyond Part A coverage',
    aliases: ['Therapy Ancillary', 'PT/OT/ST Revenue', 'Rehab Revenue'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'ancillary',
  },
  {
    code: '4620',
    name: 'Pharmacy Ancillary Revenue',
    category: 'pharmacy_ancillary',
    type: 'revenue',
    subCategory: 'ancillary_revenue',
    description: 'Revenue from pharmacy services',
    aliases: ['Pharmacy', 'Pharmacy Revenue', 'Drug Revenue'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'ancillary',
  },
  {
    code: '4690',
    name: 'Other Ancillary Revenue',
    category: 'other_ancillary',
    type: 'revenue',
    subCategory: 'ancillary_revenue',
    description: 'Other ancillary service revenue',
    aliases: ['Other Ancillary', 'Lab', 'X-Ray', 'Supplies'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'ancillary',
  },

  // Other Revenue
  {
    code: '4910',
    name: 'Other Operating Revenue',
    category: 'other_revenue',
    type: 'revenue',
    subCategory: 'other_revenue',
    description: 'Other operating revenue not classified elsewhere',
    aliases: ['Other Revenue', 'Miscellaneous Revenue', 'Other Operating'],
    normalBalance: 'credit',
    isOperating: true,
    benchmarkCategory: 'other',
  },
];

export const EXPENSE_ACCOUNTS: COAAccount[] = [
  // Nursing Labor
  {
    code: '5010',
    name: 'Nursing Salaries',
    category: 'nursing_salaries',
    type: 'expense',
    subCategory: 'labor',
    description: 'Salaries for nursing management and salaried nursing staff',
    aliases: ['Nursing Salaries', 'RN Salaries', 'DON Salary', 'Nursing Management'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'nursing_labor',
  },
  {
    code: '5020',
    name: 'Nursing Wages',
    category: 'nursing_wages',
    type: 'expense',
    subCategory: 'labor',
    description: 'Hourly wages for nursing staff (RN, LPN, CNA)',
    aliases: ['Nursing Wages', 'RN Wages', 'LPN Wages', 'CNA Wages', 'Aide Wages'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'nursing_labor',
  },
  {
    code: '5030',
    name: 'Agency Nursing',
    category: 'agency_nursing',
    type: 'expense',
    subCategory: 'labor',
    description: 'Contract/agency nursing staff costs',
    aliases: ['Agency', 'Contract Labor', 'Agency Nursing', 'Temp Staff', 'Registry'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'agency',
  },

  // Other Labor
  {
    code: '5110',
    name: 'Other Salaries & Wages',
    category: 'other_salaries',
    type: 'expense',
    subCategory: 'labor',
    description: 'Non-nursing salaries and wages',
    aliases: ['Other Salaries', 'Admin Salaries', 'G&A Salaries', 'Other Wages'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'other_labor',
  },
  {
    code: '5120',
    name: 'Employee Benefits',
    category: 'employee_benefits',
    type: 'expense',
    subCategory: 'labor',
    description: 'Employee health insurance, 401k, and other benefits',
    aliases: ['Benefits', 'Employee Benefits', 'Health Insurance', 'Fringe Benefits'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'benefits',
  },
  {
    code: '5130',
    name: 'Payroll Taxes',
    category: 'payroll_taxes',
    type: 'expense',
    subCategory: 'labor',
    description: 'Employer payroll taxes (FICA, FUTA, SUTA)',
    aliases: ['Payroll Taxes', 'Employer Taxes', 'FICA', 'Payroll Tax Expense'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'payroll_taxes',
  },

  // Departmental Expenses
  {
    code: '5210',
    name: 'Dietary',
    category: 'dietary',
    type: 'expense',
    subCategory: 'departmental',
    description: 'Food and dietary department costs',
    aliases: ['Dietary', 'Food', 'Food Service', 'Raw Food', 'Kitchen'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'dietary',
  },
  {
    code: '5220',
    name: 'Housekeeping',
    category: 'housekeeping',
    type: 'expense',
    subCategory: 'departmental',
    description: 'Housekeeping and environmental services',
    aliases: ['Housekeeping', 'Environmental Services', 'Cleaning', 'Janitorial'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'housekeeping',
  },
  {
    code: '5230',
    name: 'Laundry & Linen',
    category: 'laundry',
    type: 'expense',
    subCategory: 'departmental',
    description: 'Laundry and linen services',
    aliases: ['Laundry', 'Linen', 'Laundry & Linen'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'laundry',
  },
  {
    code: '5240',
    name: 'Activities',
    category: 'activities',
    type: 'expense',
    subCategory: 'departmental',
    description: 'Recreation and activities department',
    aliases: ['Activities', 'Recreation', 'Activity Department'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'activities',
  },
  {
    code: '5250',
    name: 'Social Services',
    category: 'social_services',
    type: 'expense',
    subCategory: 'departmental',
    description: 'Social work and discharge planning',
    aliases: ['Social Services', 'Social Work', 'Discharge Planning'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'social_services',
  },

  // Supplies
  {
    code: '5310',
    name: 'Medical Supplies',
    category: 'medical_supplies',
    type: 'expense',
    subCategory: 'supplies',
    description: 'Nursing and medical supplies',
    aliases: ['Medical Supplies', 'Nursing Supplies', 'Clinical Supplies'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'medical_supplies',
  },
  {
    code: '5320',
    name: 'General Supplies',
    category: 'general_supplies',
    type: 'expense',
    subCategory: 'supplies',
    description: 'General operating supplies',
    aliases: ['General Supplies', 'Supplies', 'Office Supplies', 'Operating Supplies'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'general_supplies',
  },

  // Utilities & Occupancy
  {
    code: '5410',
    name: 'Utilities',
    category: 'utilities',
    type: 'expense',
    subCategory: 'occupancy',
    description: 'Electric, gas, water, and sewer',
    aliases: ['Utilities', 'Electric', 'Gas', 'Water', 'Sewer', 'Utility Expense'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'utilities',
  },
  {
    code: '5420',
    name: 'Telephone & Communications',
    category: 'telephone',
    type: 'expense',
    subCategory: 'occupancy',
    description: 'Telephone and communication services',
    aliases: ['Telephone', 'Phone', 'Communications', 'Internet'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'telephone',
  },

  // Insurance
  {
    code: '5510',
    name: 'Liability Insurance',
    category: 'insurance_liability',
    type: 'expense',
    subCategory: 'insurance',
    description: 'General and professional liability insurance',
    aliases: ['Liability Insurance', 'Professional Liability', 'GL Insurance', 'Malpractice'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'insurance',
  },
  {
    code: '5520',
    name: 'Property Insurance',
    category: 'insurance_property',
    type: 'expense',
    subCategory: 'insurance',
    description: 'Property and casualty insurance',
    aliases: ['Property Insurance', 'P&C Insurance', 'Fire Insurance'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'insurance',
  },
  {
    code: '5530',
    name: 'Workers Compensation',
    category: 'insurance_workers_comp',
    type: 'expense',
    subCategory: 'insurance',
    description: 'Workers compensation insurance',
    aliases: ['Workers Comp', 'Workers Compensation', 'Work Comp'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'insurance',
  },

  // Taxes
  {
    code: '5610',
    name: 'Property Tax',
    category: 'property_tax',
    type: 'expense',
    subCategory: 'taxes',
    description: 'Real estate and personal property taxes',
    aliases: ['Property Tax', 'Real Estate Tax', 'Property Taxes', 'RE Tax'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'property_tax',
  },

  // Administrative
  {
    code: '5710',
    name: 'Management Fee',
    category: 'management_fee',
    type: 'expense',
    subCategory: 'administrative',
    description: 'Management company fees',
    aliases: ['Management Fee', 'Mgmt Fee', 'Management Company Fee'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'management_fee',
  },
  {
    code: '5720',
    name: 'Marketing & Advertising',
    category: 'marketing',
    type: 'expense',
    subCategory: 'administrative',
    description: 'Marketing and advertising costs',
    aliases: ['Marketing', 'Advertising', 'Marketing & Advertising', 'Promotion'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'marketing',
  },
  {
    code: '5730',
    name: 'Maintenance & Repairs',
    category: 'maintenance_repairs',
    type: 'expense',
    subCategory: 'administrative',
    description: 'Building maintenance and repairs',
    aliases: ['Maintenance', 'Repairs', 'R&M', 'Maintenance & Repairs'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'maintenance',
  },
  {
    code: '5740',
    name: 'Administration',
    category: 'administration',
    type: 'expense',
    subCategory: 'administrative',
    description: 'General administrative expenses',
    aliases: ['Administration', 'Admin', 'G&A', 'General & Administrative'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'administration',
  },
  {
    code: '5750',
    name: 'Professional Fees',
    category: 'professional_fees',
    type: 'expense',
    subCategory: 'administrative',
    description: 'Legal, accounting, and consulting fees',
    aliases: ['Professional Fees', 'Legal', 'Accounting', 'Consulting', 'Legal & Accounting'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'professional_fees',
  },
  {
    code: '5760',
    name: 'Technology',
    category: 'technology',
    type: 'expense',
    subCategory: 'administrative',
    description: 'IT and technology costs',
    aliases: ['Technology', 'IT', 'Software', 'Computer', 'EHR'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'technology',
  },
  {
    code: '5770',
    name: 'Bad Debt',
    category: 'bad_debt',
    type: 'expense',
    subCategory: 'administrative',
    description: 'Provision for bad debts',
    aliases: ['Bad Debt', 'Provision for Bad Debt', 'Doubtful Accounts'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'bad_debt',
  },

  // Non-Operating
  {
    code: '5810',
    name: 'Rent',
    category: 'rent',
    type: 'expense',
    subCategory: 'non_operating',
    description: 'Facility rent/lease payments',
    aliases: ['Rent', 'Lease', 'Rent Expense', 'Lease Expense', 'Building Rent'],
    normalBalance: 'debit',
    isOperating: false,
    benchmarkCategory: 'rent',
  },
  {
    code: '5820',
    name: 'Depreciation',
    category: 'depreciation',
    type: 'expense',
    subCategory: 'non_operating',
    description: 'Depreciation of fixed assets',
    aliases: ['Depreciation', 'Depreciation Expense', 'D&A'],
    normalBalance: 'debit',
    isOperating: false,
    benchmarkCategory: 'depreciation',
  },
  {
    code: '5830',
    name: 'Amortization',
    category: 'amortization',
    type: 'expense',
    subCategory: 'non_operating',
    description: 'Amortization of intangible assets',
    aliases: ['Amortization', 'Amortization Expense'],
    normalBalance: 'debit',
    isOperating: false,
    benchmarkCategory: 'amortization',
  },
  {
    code: '5840',
    name: 'Interest Expense',
    category: 'interest',
    type: 'expense',
    subCategory: 'non_operating',
    description: 'Interest on debt',
    aliases: ['Interest', 'Interest Expense', 'Debt Service Interest'],
    normalBalance: 'debit',
    isOperating: false,
    benchmarkCategory: 'interest',
  },
  {
    code: '5990',
    name: 'Other Expense',
    category: 'other_expense',
    type: 'expense',
    subCategory: 'other',
    description: 'Other expenses not classified elsewhere',
    aliases: ['Other Expense', 'Other', 'Miscellaneous', 'Other Operating Expense'],
    normalBalance: 'debit',
    isOperating: true,
    benchmarkCategory: 'other',
  },
];

// =============================================================================
// COMBINED COA
// =============================================================================

export const CHART_OF_ACCOUNTS: COAAccount[] = [...REVENUE_ACCOUNTS, ...EXPENSE_ACCOUNTS];

// =============================================================================
// COA MAPPING FUNCTIONS
// =============================================================================

/**
 * Find matching COA account for a given label
 */
export function matchToAccount(label: string): COAMapping {
  const normalizedLabel = normalizeLabel(label);

  // Try exact match on name
  for (const account of CHART_OF_ACCOUNTS) {
    if (normalizeLabel(account.name) === normalizedLabel) {
      return {
        sourceLabel: label,
        matchedAccount: account,
        confidence: 1.0,
        matchType: 'exact',
      };
    }
  }

  // Try exact match on aliases
  for (const account of CHART_OF_ACCOUNTS) {
    for (const alias of account.aliases) {
      if (normalizeLabel(alias) === normalizedLabel) {
        return {
          sourceLabel: label,
          matchedAccount: account,
          confidence: 0.95,
          matchType: 'alias',
        };
      }
    }
  }

  // Try partial/fuzzy match
  let bestMatch: { account: COAAccount; score: number } | null = null;

  for (const account of CHART_OF_ACCOUNTS) {
    // Check account name
    const nameScore = fuzzyMatchScore(normalizedLabel, normalizeLabel(account.name));
    if (nameScore > (bestMatch?.score || 0.6)) {
      bestMatch = { account, score: nameScore };
    }

    // Check aliases
    for (const alias of account.aliases) {
      const aliasScore = fuzzyMatchScore(normalizedLabel, normalizeLabel(alias));
      if (aliasScore > (bestMatch?.score || 0.6)) {
        bestMatch = { account, score: aliasScore };
      }
    }
  }

  if (bestMatch && bestMatch.score >= 0.6) {
    return {
      sourceLabel: label,
      matchedAccount: bestMatch.account,
      confidence: bestMatch.score,
      matchType: 'fuzzy',
    };
  }

  return {
    sourceLabel: label,
    matchedAccount: null,
    confidence: 0,
    matchType: 'none',
  };
}

/**
 * Match multiple labels to COA accounts
 */
export function matchLabelsToAccounts(labels: string[]): COAMapping[] {
  return labels.map((label) => matchToAccount(label));
}

/**
 * Get account by code
 */
export function getAccountByCode(code: string): COAAccount | null {
  return CHART_OF_ACCOUNTS.find((a) => a.code === code) || null;
}

/**
 * Get account by category
 */
export function getAccountByCategory(
  category: RevenueCategory | ExpenseCategory
): COAAccount | null {
  return CHART_OF_ACCOUNTS.find((a) => a.category === category) || null;
}

/**
 * Get all accounts of a type
 */
export function getAccountsByType(type: 'revenue' | 'expense'): COAAccount[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.type === type);
}

/**
 * Get all accounts in a sub-category
 */
export function getAccountsBySubCategory(subCategory: string): COAAccount[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.subCategory === subCategory);
}

/**
 * Get operating accounts only
 */
export function getOperatingAccounts(): COAAccount[] {
  return CHART_OF_ACCOUNTS.filter((a) => a.isOperating);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Normalize a label for matching
 */
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate fuzzy match score between two strings
 */
function fuzzyMatchScore(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) {
    const shorter = a.length < b.length ? a : b;
    const longer = a.length < b.length ? b : a;
    return shorter.length / longer.length;
  }

  // Simple word overlap scoring
  const wordsA = new Set(a.split(' '));
  const wordsB = new Set(b.split(' '));

  let overlap = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) {
      overlap++;
    }
  }

  const totalUniqueWords = new Set([...wordsA, ...wordsB]).size;
  return overlap / totalUniqueWords;
}

/**
 * Get labor expense accounts
 */
export function getLaborAccounts(): COAAccount[] {
  return EXPENSE_ACCOUNTS.filter((a) => a.subCategory === 'labor');
}

/**
 * Get non-labor operating expense accounts
 */
export function getNonLaborOperatingAccounts(): COAAccount[] {
  return EXPENSE_ACCOUNTS.filter((a) => a.isOperating && a.subCategory !== 'labor');
}

/**
 * Calculate labor percentage benchmark category weights
 */
export function getLaborCategoryWeights(): Record<string, number> {
  return {
    nursing_labor: 0.55, // 55% of labor is typically nursing
    agency: 0.05, // Agency typically 5% or less
    other_labor: 0.25, // Other labor
    benefits: 0.10, // Benefits
    payroll_taxes: 0.05, // Payroll taxes
  };
}
