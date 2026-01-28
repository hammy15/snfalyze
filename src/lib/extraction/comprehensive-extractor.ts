/**
 * Comprehensive Data Extraction Engine
 *
 * Extracts, categorizes, and maps all financial and operational data
 * from Excel/CSV files for SNF/ALF deal analysis.
 */

import * as XLSX from 'xlsx';
import { readFile } from 'fs/promises';

// ============================================================================
// ENCRYPTED FILE DETECTION
// ============================================================================

export class EncryptedFileError extends Error {
  constructor(filename: string) {
    super(
      `The file "${filename}" is encrypted with Microsoft's Rights Management Service (RMS). ` +
      `Please open the file in Microsoft Excel and save a copy without encryption/protection, ` +
      `then try uploading again.`
    );
    this.name = 'EncryptedFileError';
  }
}

/**
 * Detect if an Excel file is encrypted with Microsoft RMS (MSMAMARPCRYPT)
 */
function isEncryptedExcel(buffer: Buffer): boolean {
  // Check for MSMAMARPCRYPT encryption marker
  const header = buffer.slice(0, 20).toString('utf8');
  if (header.includes('MSMAMARPCRYPT')) {
    return true;
  }

  // Also check for Office Document Cryptography (OLE-based encryption)
  // OLE files start with D0 CF 11 E0 (little-endian DWORD)
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
    // Check for encryption indicators in the OLE structure
    const headerStr = buffer.slice(0, 2000).toString('binary');
    if (headerStr.includes('EncryptedPackage') || headerStr.includes('StrongEncryption')) {
      return true;
    }
  }

  return false;
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ExtractedLineItem {
  category: 'revenue' | 'expense' | 'census' | 'statistic' | 'balance' | 'other';
  subcategory: string;
  label: string;
  originalLabel: string;
  coaCode: string | null;
  coaName: string | null;
  values: MonthlyValue[];
  annualized: number | null;
  perBedDay: number | null;
  percentOfRevenue: number | null;
  facility: string;
  sourceSheet: string;
  sourceFile: string;
  rowIndex: number;
  confidence: number;
}

export interface MonthlyValue {
  period: string; // "2024-01", "2024-02", etc.
  value: number | null;
  isActual: boolean;
}

export interface FacilityProfile {
  name: string;
  entityName: string | null;
  ccn: string | null;
  city: string | null;
  state: string | null;
  facilityType: 'SNF' | 'ALF' | 'ILF';
  licensedBeds: number | null;
  certifiedBeds: number | null;
  metrics: {
    avgDailyCensus: number | null;
    occupancyRate: number | null;
    payorMix: {
      medicare: number | null;
      medicaid: number | null;
      private: number | null;
      other: number | null;
    };
    revenuePPD: number | null;
    expensePPD: number | null;
    laborPPD: number | null;
    netOperatingIncome: number | null;
    ebitda: number | null;
    ebitdaMargin: number | null;
  };
  sourceFiles: string[];
}

export interface ProformaData {
  facility: string;
  revenue: {
    medicare: MonthlyValue[];
    medicaid: MonthlyValue[];
    private: MonthlyValue[];
    other: MonthlyValue[];
    ancillary: MonthlyValue[];
    total: MonthlyValue[];
  };
  expenses: {
    nursing: MonthlyValue[];
    dietary: MonthlyValue[];
    housekeeping: MonthlyValue[];
    laundry: MonthlyValue[];
    activities: MonthlyValue[];
    socialServices: MonthlyValue[];
    administration: MonthlyValue[];
    plantOperations: MonthlyValue[];
    propertyTax: MonthlyValue[];
    insurance: MonthlyValue[];
    managementFee: MonthlyValue[];
    other: MonthlyValue[];
    total: MonthlyValue[];
  };
  census: {
    medicareDays: MonthlyValue[];
    medicaidDays: MonthlyValue[];
    privateDays: MonthlyValue[];
    totalDays: MonthlyValue[];
    avgDailyCensus: MonthlyValue[];
    occupancy: MonthlyValue[];
  };
  calculated: {
    grossProfit: MonthlyValue[];
    netOperatingIncome: MonthlyValue[];
    ebitda: MonthlyValue[];
  };
}

export interface ExtractionResult {
  facilities: FacilityProfile[];
  lineItems: ExtractedLineItem[];
  proformaData: ProformaData[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalNOI: number;
    avgOccupancy: number;
    totalBeds: number;
    dataQuality: number;
    periodsExtracted: string[];
    warnings: string[];
  };
  metadata: {
    extractedAt: string;
    filesProcessed: string[];
    totalRowsProcessed: number;
    mappedItems: number;
    unmappedItems: number;
  };
}

// ============================================================================
// COA MAPPING DICTIONARY
// ============================================================================

const COA_PATTERNS: Array<{
  pattern: RegExp;
  code: string;
  name: string;
  category: 'revenue' | 'expense' | 'census' | 'statistic' | 'balance';
  subcategory: string;
  proformaKey: string;
}> = [
  // REVENUE - Account code patterns (40xxx)
  { pattern: /^4[0-4]\d{3}\s*-|room.*board|patient.*service.*revenue/i, code: '4000', name: 'Room & Board Revenue', category: 'revenue', subcategory: 'patient_revenue', proformaKey: 'revenue.medicare' },
  { pattern: /medicare.*revenue|revenue.*medicare|skilled.*medicare/i, code: '4100', name: 'Medicare Revenue', category: 'revenue', subcategory: 'patient_revenue', proformaKey: 'revenue.medicare' },
  { pattern: /medicaid.*revenue|revenue.*medicaid|skilled.*medicaid/i, code: '4200', name: 'Medicaid Revenue', category: 'revenue', subcategory: 'patient_revenue', proformaKey: 'revenue.medicaid' },
  { pattern: /private.*pay.*revenue|revenue.*private|self.?pay/i, code: '4300', name: 'Private Pay Revenue', category: 'revenue', subcategory: 'patient_revenue', proformaKey: 'revenue.private' },
  { pattern: /hmo|managed.*care|insurance.*revenue/i, code: '4400', name: 'Managed Care Revenue', category: 'revenue', subcategory: 'patient_revenue', proformaKey: 'revenue.other' },
  { pattern: /hospice.*revenue/i, code: '4500', name: 'Hospice Revenue', category: 'revenue', subcategory: 'patient_revenue', proformaKey: 'revenue.other' },
  { pattern: /ancillary|therapy.*revenue|rehab.*revenue|^4[5-9]\d{3}\s*-/i, code: '4600', name: 'Ancillary Revenue', category: 'revenue', subcategory: 'ancillary', proformaKey: 'revenue.ancillary' },
  { pattern: /total.*revenue|gross.*revenue|net.*patient.*revenue|total.*income/i, code: '4999', name: 'Total Revenue', category: 'revenue', subcategory: 'total', proformaKey: 'revenue.total' },

  // LABOR EXPENSES - General patterns
  { pattern: /total.*nursing|nursing.*total|nursing\s*-\s*snf/i, code: '5100', name: 'Total Nursing', category: 'expense', subcategory: 'labor_nursing', proformaKey: 'expenses.nursing' },
  { pattern: /nursing.*salar|rn.*wage|lpn.*wage|nurse.*wage/i, code: '5100', name: 'Nursing Salaries', category: 'expense', subcategory: 'labor_nursing', proformaKey: 'expenses.nursing' },
  { pattern: /cna.*wage|aide.*wage|nursing.*assist/i, code: '5110', name: 'CNA Wages', category: 'expense', subcategory: 'labor_nursing', proformaKey: 'expenses.nursing' },
  { pattern: /salaries?\s*-\s*regular|regular.*salaries|^5[0-1]\d{3}\s*-.*salar/i, code: '5000', name: 'Regular Salaries', category: 'expense', subcategory: 'labor_general', proformaKey: 'expenses.nursing' },
  { pattern: /total.*salar|salary.*expense|payroll.*expense/i, code: '5000', name: 'Total Salaries', category: 'expense', subcategory: 'labor_general', proformaKey: 'expenses.nursing' },
  { pattern: /dietary.*salar|food.*service.*labor|kitchen/i, code: '5200', name: 'Dietary Labor', category: 'expense', subcategory: 'labor_dietary', proformaKey: 'expenses.dietary' },
  { pattern: /total.*dietary|dietary.*total|dietary.*department/i, code: '5200', name: 'Total Dietary', category: 'expense', subcategory: 'labor_dietary', proformaKey: 'expenses.dietary' },
  { pattern: /housekeep.*salar|environmental.*service/i, code: '5300', name: 'Housekeeping Labor', category: 'expense', subcategory: 'labor_housekeeping', proformaKey: 'expenses.housekeeping' },
  { pattern: /total.*housekeep|housekeep.*total/i, code: '5300', name: 'Total Housekeeping', category: 'expense', subcategory: 'labor_housekeeping', proformaKey: 'expenses.housekeeping' },
  { pattern: /laundry.*salar|linen.*service/i, code: '5400', name: 'Laundry Labor', category: 'expense', subcategory: 'labor_laundry', proformaKey: 'expenses.laundry' },
  { pattern: /total.*laundry|laundry.*total/i, code: '5400', name: 'Total Laundry', category: 'expense', subcategory: 'labor_laundry', proformaKey: 'expenses.laundry' },
  { pattern: /activit.*salar|recreation/i, code: '5500', name: 'Activities Labor', category: 'expense', subcategory: 'labor_activities', proformaKey: 'expenses.activities' },
  { pattern: /social.*service.*salar|social.*work/i, code: '5600', name: 'Social Services Labor', category: 'expense', subcategory: 'labor_social', proformaKey: 'expenses.socialServices' },
  { pattern: /admin.*salar|management.*salar|executive|^5[7-8]\d{3}\s*-/i, code: '5700', name: 'Administrative Labor', category: 'expense', subcategory: 'labor_admin', proformaKey: 'expenses.administration' },
  { pattern: /total.*admin|admin.*total|g&a|general.*admin/i, code: '5700', name: 'Total Admin', category: 'expense', subcategory: 'labor_admin', proformaKey: 'expenses.administration' },
  { pattern: /mainten.*salar|plant.*oper.*labor|facilities/i, code: '5800', name: 'Maintenance Labor', category: 'expense', subcategory: 'labor_maintenance', proformaKey: 'expenses.plantOperations' },
  { pattern: /total.*plant|plant.*total|building.*maint/i, code: '5800', name: 'Total Plant Operations', category: 'expense', subcategory: 'labor_maintenance', proformaKey: 'expenses.plantOperations' },
  { pattern: /contract.*labor|agency.*staff|temp.*staff/i, code: '5900', name: 'Contract Labor', category: 'expense', subcategory: 'labor_contract', proformaKey: 'expenses.nursing' },
  { pattern: /employee.*benefit|health.*insurance.*expense|payroll.*tax|fica|^6[0-3]\d{3}\s*-/i, code: '5950', name: 'Employee Benefits', category: 'expense', subcategory: 'labor_benefits', proformaKey: 'expenses.nursing' },
  { pattern: /total.*benefit|benefit.*expense/i, code: '5950', name: 'Total Benefits', category: 'expense', subcategory: 'labor_benefits', proformaKey: 'expenses.nursing' },

  // NON-LABOR EXPENSES
  { pattern: /food.*cost|raw.*food|dietary.*supplies/i, code: '6100', name: 'Food Costs', category: 'expense', subcategory: 'supplies_dietary', proformaKey: 'expenses.dietary' },
  { pattern: /medical.*supplies|nursing.*supplies/i, code: '6200', name: 'Medical Supplies', category: 'expense', subcategory: 'supplies_medical', proformaKey: 'expenses.nursing' },
  { pattern: /housekeep.*supplies|cleaning.*supplies/i, code: '6300', name: 'Housekeeping Supplies', category: 'expense', subcategory: 'supplies_housekeeping', proformaKey: 'expenses.housekeeping' },
  { pattern: /utilit|electric|gas|water|sewer|^7[0-2]\d{3}\s*-/i, code: '6400', name: 'Utilities', category: 'expense', subcategory: 'occupancy', proformaKey: 'expenses.plantOperations' },
  { pattern: /property.*tax|real.*estate.*tax/i, code: '6500', name: 'Property Taxes', category: 'expense', subcategory: 'occupancy', proformaKey: 'expenses.propertyTax' },
  { pattern: /insurance(?!.*health)|liability.*ins|property.*ins|^5[2]\d{3}\s*-.*ins/i, code: '6600', name: 'Insurance', category: 'expense', subcategory: 'occupancy', proformaKey: 'expenses.insurance' },
  { pattern: /management.*fee|mgmt.*fee/i, code: '6700', name: 'Management Fee', category: 'expense', subcategory: 'fees', proformaKey: 'expenses.managementFee' },
  { pattern: /repair|maintenance(?!.*salar)|^7[3-9]\d{3}\s*-/i, code: '6800', name: 'Repairs & Maintenance', category: 'expense', subcategory: 'occupancy', proformaKey: 'expenses.plantOperations' },
  { pattern: /pharmacy|drug.*cost|medication/i, code: '6850', name: 'Pharmacy Expense', category: 'expense', subcategory: 'supplies_medical', proformaKey: 'expenses.nursing' },
  { pattern: /total.*pharmacy|pharmacy.*total/i, code: '6850', name: 'Total Pharmacy', category: 'expense', subcategory: 'supplies_medical', proformaKey: 'expenses.nursing' },
  { pattern: /therapy.*expense|pt\/ot|physical.*therapy|occupational.*therapy|speech.*therapy/i, code: '6860', name: 'Therapy Expense', category: 'expense', subcategory: 'ancillary', proformaKey: 'expenses.other' },
  { pattern: /total.*therapy|therapy.*total/i, code: '6860', name: 'Total Therapy', category: 'expense', subcategory: 'ancillary', proformaKey: 'expenses.other' },
  { pattern: /total.*expense|operating.*expense|total.*cost/i, code: '6999', name: 'Total Expenses', category: 'expense', subcategory: 'total', proformaKey: 'expenses.total' },

  // CENSUS DATA
  { pattern: /medicare.*day|day.*medicare|snf.*medicare/i, code: 'C100', name: 'Medicare Days', category: 'census', subcategory: 'patient_days', proformaKey: 'census.medicareDays' },
  { pattern: /medicaid.*day|day.*medicaid|snf.*medicaid/i, code: 'C200', name: 'Medicaid Days', category: 'census', subcategory: 'patient_days', proformaKey: 'census.medicaidDays' },
  { pattern: /private.*day|day.*private|self.?pay.*day/i, code: 'C300', name: 'Private Days', category: 'census', subcategory: 'patient_days', proformaKey: 'census.privateDays' },
  { pattern: /hmo.*day|managed.*care.*day/i, code: 'C400', name: 'Managed Care Days', category: 'census', subcategory: 'patient_days', proformaKey: 'census.privateDays' },
  { pattern: /total.*day|patient.*day|resident.*day/i, code: 'C500', name: 'Total Patient Days', category: 'census', subcategory: 'patient_days', proformaKey: 'census.totalDays' },
  { pattern: /avg.*daily.*census|adc|average.*census/i, code: 'C600', name: 'Average Daily Census', category: 'census', subcategory: 'census', proformaKey: 'census.avgDailyCensus' },
  { pattern: /occupancy|occ.*rate/i, code: 'C700', name: 'Occupancy Rate', category: 'census', subcategory: 'rate', proformaKey: 'census.occupancy' },
  { pattern: /licensed.*bed|bed.*count|total.*bed/i, code: 'C800', name: 'Licensed Beds', category: 'statistic', subcategory: 'beds', proformaKey: '' },

  // CALCULATED METRICS
  { pattern: /gross.*profit|gross.*margin/i, code: 'M100', name: 'Gross Profit', category: 'statistic', subcategory: 'margin', proformaKey: 'calculated.grossProfit' },
  { pattern: /net.*operating.*income|noi/i, code: 'M200', name: 'Net Operating Income', category: 'statistic', subcategory: 'margin', proformaKey: 'calculated.netOperatingIncome' },
  { pattern: /ebitda|earnings.*before/i, code: 'M300', name: 'EBITDA', category: 'statistic', subcategory: 'margin', proformaKey: 'calculated.ebitda' },

  // ADDITIONAL REVENUE PATTERNS
  { pattern: /other.*income|misc.*revenue|sundry.*income/i, code: '4700', name: 'Other Income', category: 'revenue', subcategory: 'other_revenue', proformaKey: 'revenue.other' },
  { pattern: /interest.*income|investment.*income/i, code: '4710', name: 'Interest Income', category: 'revenue', subcategory: 'other_revenue', proformaKey: 'revenue.other' },
  { pattern: /rental.*income|lease.*income/i, code: '4720', name: 'Rental Income', category: 'revenue', subcategory: 'other_revenue', proformaKey: 'revenue.other' },
  { pattern: /grant|donation|contribution/i, code: '4730', name: 'Grants & Donations', category: 'revenue', subcategory: 'other_revenue', proformaKey: 'revenue.other' },
  { pattern: /contractual.*adjust|allowance|bad.*debt.*provision/i, code: '4800', name: 'Contractual Adjustments', category: 'revenue', subcategory: 'adjustment', proformaKey: 'revenue.other' },
  { pattern: /net.*revenue|net.*patient/i, code: '4998', name: 'Net Revenue', category: 'revenue', subcategory: 'total', proformaKey: 'revenue.total' },

  // ADDITIONAL EXPENSE PATTERNS - Catch common terms
  { pattern: /professional.*fee|consulting.*fee|legal.*fee|accounting.*fee/i, code: '6850', name: 'Professional Fees', category: 'expense', subcategory: 'fees', proformaKey: 'expenses.administration' },
  { pattern: /medical.*director|physician.*fee|dr\./i, code: '6855', name: 'Medical Director Fee', category: 'expense', subcategory: 'fees', proformaKey: 'expenses.administration' },
  { pattern: /depreciat|amortiz/i, code: '7000', name: 'Depreciation', category: 'expense', subcategory: 'non_cash', proformaKey: 'expenses.other' },
  { pattern: /interest.*expense|loan.*interest/i, code: '7100', name: 'Interest Expense', category: 'expense', subcategory: 'financing', proformaKey: 'expenses.other' },
  { pattern: /rent.*expense|lease.*expense|building.*rent/i, code: '7200', name: 'Rent Expense', category: 'expense', subcategory: 'occupancy', proformaKey: 'expenses.plantOperations' },
  { pattern: /marketing|advertising|promot/i, code: '6900', name: 'Marketing', category: 'expense', subcategory: 'admin', proformaKey: 'expenses.administration' },
  { pattern: /travel.*expense|mileage|transportation/i, code: '6910', name: 'Travel Expense', category: 'expense', subcategory: 'admin', proformaKey: 'expenses.administration' },
  { pattern: /training|education|seminar|conference/i, code: '6920', name: 'Training', category: 'expense', subcategory: 'admin', proformaKey: 'expenses.administration' },
  { pattern: /license|permit|certification|regulatory/i, code: '6930', name: 'Licenses & Permits', category: 'expense', subcategory: 'admin', proformaKey: 'expenses.administration' },
  { pattern: /telephone|phone|communication|internet|cable/i, code: '6940', name: 'Communications', category: 'expense', subcategory: 'admin', proformaKey: 'expenses.administration' },
  { pattern: /office.*supplies|office.*expense|postage/i, code: '6950', name: 'Office Expenses', category: 'expense', subcategory: 'admin', proformaKey: 'expenses.administration' },
  { pattern: /dues.*subscription|membership/i, code: '6960', name: 'Dues & Subscriptions', category: 'expense', subcategory: 'admin', proformaKey: 'expenses.administration' },
  { pattern: /outside.*service|contracted.*service|service.*contract/i, code: '6970', name: 'Contracted Services', category: 'expense', subcategory: 'other_expense', proformaKey: 'expenses.other' },
  { pattern: /otc|over.?the.?counter/i, code: '6980', name: 'OTC Supplies', category: 'expense', subcategory: 'supplies_medical', proformaKey: 'expenses.nursing' },
  { pattern: /supply|supplies/i, code: '6985', name: 'General Supplies', category: 'expense', subcategory: 'supplies_general', proformaKey: 'expenses.other' },
  { pattern: /other.*expense|misc.*expense|sundry|miscellaneous/i, code: '6990', name: 'Other Expenses', category: 'expense', subcategory: 'other_expense', proformaKey: 'expenses.other' },

  // CATCH-ALL FOR ACCOUNT CODES IN LABELS (e.g., "5123 - Some Expense")
  { pattern: /^4\d{3,4}\s*-/i, code: 'AUTO_REV', name: 'Other Revenue', category: 'revenue', subcategory: 'auto_mapped', proformaKey: 'revenue.other' },
  { pattern: /^5\d{3,4}\s*-/i, code: 'AUTO_LAB', name: 'Labor Expense', category: 'expense', subcategory: 'labor_auto', proformaKey: 'expenses.nursing' },
  { pattern: /^6\d{3,4}\s*-/i, code: 'AUTO_OPS', name: 'Operating Expense', category: 'expense', subcategory: 'operations_auto', proformaKey: 'expenses.other' },
  { pattern: /^7\d{3,4}\s*-/i, code: 'AUTO_OCC', name: 'Occupancy Expense', category: 'expense', subcategory: 'occupancy_auto', proformaKey: 'expenses.plantOperations' },
  { pattern: /^8\d{3,4}\s*-/i, code: 'AUTO_OTH', name: 'Other Expense', category: 'expense', subcategory: 'other_auto', proformaKey: 'expenses.other' },
  { pattern: /^9\d{3,4}\s*-/i, code: 'AUTO_ADJ', name: 'Adjustments', category: 'expense', subcategory: 'adjustments', proformaKey: 'expenses.other' },
];

// ============================================================================
// CCN EXTRACTION PATTERNS
// ============================================================================

const CCN_PATTERNS = [
  /CCN[:\s]*(\d{6})/i,
  /CMS\s*(?:Certification|Provider)\s*(?:Number|#|No\.?)[:\s]*(\d{6})/i,
  /Federal\s*Provider\s*(?:Number|#|No\.?)[:\s]*(\d{6})/i,
  /Medicare\s*Provider\s*(?:Number|#|No\.?|ID)[:\s]*(\d{6})/i,
  /Provider\s*(?:Number|#|No\.?|ID)[:\s]*(\d{6})/i,
  /Facility\s*(?:ID|Number|#)[:\s]*(\d{6})/i,
  /NPI[:\s]*(\d{6})/i, // Sometimes CCN is mislabeled as NPI in documents
];

/**
 * Extract CCN from text using pattern matching
 */
function extractCCNFromText(text: string): string | null {
  for (const pattern of CCN_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Validate it looks like a CCN (6 digits, reasonable range)
      const ccn = match[1];
      // CCNs typically start with digits 0-9 for state codes
      if (/^\d{6}$/.test(ccn)) {
        return ccn;
      }
    }
  }
  return null;
}

/**
 * Extract CCN from filename patterns
 * e.g., "105001_Sunrise_SNF.xlsx" or "CCN-105001_Financial.xlsx"
 */
function extractCCNFromFilename(filename: string): string | null {
  // Pattern: 6 consecutive digits that look like a CCN
  const patterns = [
    /CCN[_-]?(\d{6})/i,
    /^(\d{6})[_-]/,
    /[_-](\d{6})[_-]/,
    /[_-](\d{6})\./,
  ];

  for (const pattern of patterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Parse date headers from Excel row
 */
function parseDateHeaders(row: (string | number | null)[]): string[] {
  const periods: string[] = [];

  for (const cell of row) {
    if (cell === null || cell === undefined) continue;
    const str = String(cell).trim();

    // Try to parse various date formats
    // Format: "01/31/2024", "1/31/24", "Jan 2024", "January 2024", "2024-01"
    let match = str.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (match) {
      const year = match[3].length === 2 ? `20${match[3]}` : match[3];
      const month = match[1].padStart(2, '0');
      periods.push(`${year}-${month}`);
      continue;
    }

    match = str.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})/i);
    if (match) {
      const monthMap: Record<string, string> = {
        jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
        jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
      };
      const month = monthMap[match[1].toLowerCase().substring(0, 3)];
      periods.push(`${match[2]}-${month}`);
      continue;
    }

    match = str.match(/(\d{4})-(\d{2})/);
    if (match) {
      periods.push(str);
    }
  }

  return periods;
}

/**
 * Map a line item label to COA code
 */
function mapToCOA(label: string): { code: string | null; name: string | null; category: string; subcategory: string; proformaKey: string } {
  for (const mapping of COA_PATTERNS) {
    if (mapping.pattern.test(label)) {
      return {
        code: mapping.code,
        name: mapping.name,
        category: mapping.category,
        subcategory: mapping.subcategory,
        proformaKey: mapping.proformaKey,
      };
    }
  }

  // Enhanced fallback logic - infer category from label keywords
  const lowerLabel = label.toLowerCase();
  const trimmedLabel = label.trim();
  let category: 'revenue' | 'expense' | 'census' | 'statistic' | 'other' = 'other';
  let subcategory = 'unmapped';
  let code: string | null = null;
  let name: string | null = null;
  let proformaKey = '';

  // REVENUE indicators
  const revenueKeywords = ['revenue', 'income', 'receipt', 'reimburs', 'payment', 'billing', 'collection', 'charge'];
  if (revenueKeywords.some(kw => lowerLabel.includes(kw))) {
    category = 'revenue';
    subcategory = 'other_revenue';
    code = 'REV_OTHER';
    name = 'Other Revenue';
    proformaKey = 'revenue.other';
  }

  // EXPENSE indicators (check after revenue since some items could have both keywords)
  const expenseKeywords = [
    'expense', 'cost', 'salary', 'salaries', 'wage', 'wages', 'pay', 'payroll',
    'benefit', 'benefits', 'insurance', 'tax', 'taxes', 'fee', 'fees',
    'supplies', 'supply', 'equipment', 'repair', 'maintenance', 'maint',
    'service', 'services', 'contract', 'vendor', 'purchased',
    'utility', 'utilities', 'rent', 'lease', 'depreciation',
    'travel', 'training', 'marketing', 'advertising', 'communication',
    'professional', 'legal', 'accounting', 'consulting',
    'food', 'dietary', 'nursing', 'housekeeping', 'laundry',
    'admin', 'administrative', 'office', 'general', 'overhead'
  ];
  if (category === 'other' && expenseKeywords.some(kw => lowerLabel.includes(kw))) {
    category = 'expense';
    subcategory = 'other_expense';
    code = 'EXP_OTHER';
    name = 'Other Expense';
    proformaKey = 'expenses.other';

    // Further categorize expenses
    if (lowerLabel.includes('salary') || lowerLabel.includes('wage') || lowerLabel.includes('payroll') || lowerLabel.includes('labor')) {
      code = 'EXP_LABOR';
      name = 'Labor Expense';
      subcategory = 'labor_other';
      proformaKey = 'expenses.nursing';
    } else if (lowerLabel.includes('benefit') || lowerLabel.includes('fica') || lowerLabel.includes('401k') || lowerLabel.includes('health ins')) {
      code = 'EXP_BENEFITS';
      name = 'Benefits';
      subcategory = 'labor_benefits';
      proformaKey = 'expenses.nursing';
    } else if (lowerLabel.includes('supply') || lowerLabel.includes('supplies')) {
      code = 'EXP_SUPPLIES';
      name = 'Supplies';
      subcategory = 'supplies_general';
      proformaKey = 'expenses.other';
    } else if (lowerLabel.includes('utility') || lowerLabel.includes('utilities') || lowerLabel.includes('electric') || lowerLabel.includes('gas') || lowerLabel.includes('water')) {
      code = 'EXP_UTIL';
      name = 'Utilities';
      subcategory = 'occupancy';
      proformaKey = 'expenses.plantOperations';
    } else if (lowerLabel.includes('rent') || lowerLabel.includes('lease')) {
      code = 'EXP_RENT';
      name = 'Rent/Lease';
      subcategory = 'occupancy';
      proformaKey = 'expenses.plantOperations';
    } else if (lowerLabel.includes('insurance') && !lowerLabel.includes('health')) {
      code = 'EXP_INS';
      name = 'Insurance';
      subcategory = 'occupancy';
      proformaKey = 'expenses.insurance';
    } else if (lowerLabel.includes('admin') || lowerLabel.includes('office') || lowerLabel.includes('g&a') || lowerLabel.includes('general')) {
      code = 'EXP_ADMIN';
      name = 'Administrative';
      subcategory = 'admin';
      proformaKey = 'expenses.administration';
    }
  }

  // CENSUS indicators
  const censusKeywords = ['census', 'day', 'days', 'occupancy', 'admission', 'discharge', 'patient', 'resident', 'bed'];
  if (category === 'other' && censusKeywords.some(kw => lowerLabel.includes(kw))) {
    category = 'census';
    subcategory = 'other_census';
    code = 'CENSUS_OTHER';
    name = 'Census Data';
    proformaKey = 'census.totalDays';
  }

  // STATISTIC/METRIC indicators
  const statisticKeywords = ['rate', 'ratio', 'percentage', 'percent', 'per day', 'ppd', 'hppd', 'margin', 'fte', 'headcount'];
  if (category === 'other' && statisticKeywords.some(kw => lowerLabel.includes(kw))) {
    category = 'statistic';
    subcategory = 'metric';
    code = 'STAT_OTHER';
    name = 'Statistic';
  }

  // Check for numeric prefix that looks like an account code (e.g., "5123 - Description")
  const accountCodeMatch = trimmedLabel.match(/^(\d{4,5})\s*[-–]\s*(.+)/);
  if (accountCodeMatch && category === 'other') {
    const numCode = accountCodeMatch[1];
    const firstDigit = numCode[0];

    if (firstDigit === '4') {
      category = 'revenue';
      code = numCode;
      name = accountCodeMatch[2].trim();
      subcategory = 'mapped_by_code';
      proformaKey = 'revenue.other';
    } else if (firstDigit === '5' || firstDigit === '6' || firstDigit === '7' || firstDigit === '8') {
      category = 'expense';
      code = numCode;
      name = accountCodeMatch[2].trim();
      subcategory = 'mapped_by_code';
      proformaKey = 'expenses.other';
    }
  }

  // If still "other" but has a value in a financial context, default to expense
  // (most unmapped line items in P&L statements are expenses)
  // This is a last resort to ensure high mapping coverage
  if (category === 'other' && trimmedLabel.length > 0 && !lowerLabel.includes('total') && !lowerLabel.includes('blank')) {
    // Check if it looks like a label (has letters and isn't just numbers)
    const hasLetters = /[a-zA-Z]/.test(trimmedLabel);
    if (hasLetters) {
      category = 'expense';
      subcategory = 'unmapped_expense';
      code = 'EXP_UNMAPPED';
      name = 'Uncategorized Expense';
      proformaKey = 'expenses.other';
    }
  }

  return { code, name, category, subcategory, proformaKey };
}

/**
 * Parse numeric value from cell
 */
function parseNumericValue(cell: string | number | null): number | null {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'number') return cell;

  const str = String(cell).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === '#N/A') return null;

  // Remove currency symbols, commas, parentheses (for negatives)
  let cleaned = str.replace(/[$,]/g, '');
  const isNegative = cleaned.includes('(') && cleaned.includes(')');
  cleaned = cleaned.replace(/[()]/g, '');

  // Handle percentages
  const isPercent = cleaned.includes('%');
  cleaned = cleaned.replace(/%/g, '');

  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;

  let result = isNegative ? -num : num;
  if (isPercent) result = result / 100;

  return result;
}

/**
 * Extract all data from an Excel file
 */
export async function extractFromExcel(
  filePath: string,
  filename: string
): Promise<{
  facilities: Map<string, Partial<FacilityProfile>>;
  lineItems: ExtractedLineItem[];
  periods: string[];
}> {
  const buffer = await readFile(filePath);

  // Check for encrypted files before attempting to parse
  if (isEncryptedExcel(buffer)) {
    throw new EncryptedFileError(filename);
  }

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  const facilities = new Map<string, Partial<FacilityProfile>>();
  const lineItems: ExtractedLineItem[] = [];
  let periods: string[] = [];

  const rollupNames = ['rollup', 'summary', 'consolidated', 'total', 'combined', 'portfolio', 'all'];

  for (const sheetName of workbook.SheetNames) {
    const sheetLower = sheetName.toLowerCase();
    const isRollup = rollupNames.some(r => sheetLower.includes(r));

    if (isRollup) continue; // Skip rollup sheets for per-facility extraction

    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<(string | number | null)[]>(worksheet, {
      header: 1,
      defval: null,
      raw: true,
    });

    if (rawData.length === 0) continue;

    // Try to extract CCN from filename
    const filenameCCN = extractCCNFromFilename(filename);

    // Initialize facility profile
    const facility: Partial<FacilityProfile> = {
      name: sheetName,
      facilityType: 'SNF',
      sourceFiles: [filename],
      ccn: filenameCCN || undefined,
      metrics: {
        avgDailyCensus: null,
        occupancyRate: null,
        payorMix: { medicare: null, medicaid: null, private: null, other: null },
        revenuePPD: null,
        expensePPD: null,
        laborPPD: null,
        netOperatingIncome: null,
        ebitda: null,
        ebitdaMargin: null,
      },
    };

    // Find metadata in header rows
    for (let i = 0; i < Math.min(10, rawData.length); i++) {
      const row = rawData[i];
      if (!row) continue;

      const rowText = row.filter(c => c !== null).map(c => String(c)).join(' ');

      // Look for CCN in header rows
      if (!facility.ccn) {
        const rowCCN = extractCCNFromText(rowText);
        if (rowCCN) {
          facility.ccn = rowCCN;
        }
      }

      // Look for entity name
      if (rowText.toLowerCase().includes('opco') || rowText.toLowerCase().includes('propco')) {
        facility.entityName = rowText.trim();
      }

      // Look for state
      const stateMatch = rowText.match(/\b(OR|WA|CA|TX|FL|AZ|CO|ID|NV|UT|Oregon|Washington|California|Texas|Florida)\b/i);
      if (stateMatch) {
        const stateMap: Record<string, string> = {
          'oregon': 'OR', 'washington': 'WA', 'california': 'CA', 'texas': 'TX', 'florida': 'FL',
          'arizona': 'AZ', 'colorado': 'CO', 'idaho': 'ID', 'nevada': 'NV', 'utah': 'UT'
        };
        facility.state = stateMap[stateMatch[1].toLowerCase()] || stateMatch[1].toUpperCase().substring(0, 2);
      }
    }

    // City is often the sheet name for SNF files
    facility.city = sheetName;

    // Find date header row and extract periods
    let dateHeaderRow = -1;
    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const row = rawData[i];
      if (!row) continue;

      const detectedPeriods = parseDateHeaders(row);
      if (detectedPeriods.length >= 3) {
        dateHeaderRow = i;
        if (detectedPeriods.length > periods.length) {
          periods = detectedPeriods;
        }
        break;
      }
    }

    // Extract line items
    for (let rowIdx = dateHeaderRow + 1; rowIdx < rawData.length; rowIdx++) {
      const row = rawData[rowIdx];
      if (!row || !row[0]) continue;

      const label = String(row[0]).trim();
      if (!label || label.startsWith(' ') && label.trim() === '') continue;

      // Skip header/section labels without values
      const hasNumericValues = row.slice(1).some(cell => {
        const num = parseNumericValue(cell);
        return num !== null && num !== 0;
      });

      if (!hasNumericValues) continue;

      const coaMapping = mapToCOA(label);

      // Extract monthly values
      const values: MonthlyValue[] = [];
      for (let colIdx = 1; colIdx < row.length && colIdx <= periods.length + 1; colIdx++) {
        const periodIdx = colIdx - 1;
        if (periodIdx < periods.length) {
          values.push({
            period: periods[periodIdx],
            value: parseNumericValue(row[colIdx]),
            isActual: true,
          });
        }
      }

      // Calculate annualized value
      const validValues = values.filter(v => v.value !== null).map(v => v.value as number);
      const annualized = validValues.length > 0
        ? (validValues.reduce((a, b) => a + b, 0) / validValues.length) * 12
        : null;

      lineItems.push({
        category: coaMapping.category as ExtractedLineItem['category'],
        subcategory: coaMapping.subcategory,
        label: coaMapping.name || label,
        originalLabel: label,
        coaCode: coaMapping.code,
        coaName: coaMapping.name,
        values,
        annualized,
        perBedDay: null, // Calculate later with bed count
        percentOfRevenue: null, // Calculate later with revenue
        facility: sheetName,
        sourceSheet: sheetName,
        sourceFile: filename,
        rowIndex: rowIdx,
        confidence: coaMapping.code ? 0.9 : 0.5,
      });
    }

    facilities.set(sheetName, facility);
  }

  return { facilities, lineItems, periods };
}

/**
 * Calculate derived metrics for facilities
 */
function calculateMetrics(
  lineItems: ExtractedLineItem[],
  facilities: Map<string, Partial<FacilityProfile>>
): void {
  for (const [facilityName, facility] of facilities) {
    const facilityItems = lineItems.filter(item => item.facility === facilityName);

    // Calculate total revenue - look for largest "total" revenue item
    const revenueItems = facilityItems.filter(item => item.category === 'revenue' && item.subcategory === 'total' && item.annualized !== null);
    const totalRevItem = revenueItems.sort((a, b) => (b.annualized || 0) - (a.annualized || 0))[0];
    const totalRevenue = totalRevItem?.annualized ||
      facilityItems.filter(item => item.category === 'revenue' && item.subcategory !== 'total')
        .reduce((sum, item) => sum + (item.annualized || 0), 0);

    // Calculate total expenses - look for "Total Operating Expense" or largest expense total
    const expenseItems = facilityItems.filter(item => item.category === 'expense' && item.subcategory === 'total' && item.annualized !== null);
    const exactExpMatch = expenseItems.find(i => /^total\s+operating\s+expense$/i.test(i.originalLabel.trim()));
    const largestExpItem = exactExpMatch || expenseItems.sort((a, b) => (b.annualized || 0) - (a.annualized || 0))[0];
    const totalExpenses = largestExpItem?.annualized ||
      facilityItems.filter(item => item.category === 'expense' && item.subcategory !== 'total')
        .reduce((sum, item) => sum + (item.annualized || 0), 0);

    // Calculate NOI
    if (facility.metrics) {
      facility.metrics.netOperatingIncome = totalRevenue - totalExpenses;

      // Calculate EBITDA margin
      if (totalRevenue > 0) {
        facility.metrics.ebitdaMargin = (facility.metrics.netOperatingIncome / totalRevenue) * 100;
      }

      // Extract census metrics
      const censusItems = facilityItems.filter(item => item.category === 'census');
      for (const item of censusItems) {
        const latestValue = item.values.find(v => v.value !== null)?.value ?? null;

        if (item.coaCode === 'C600' && latestValue !== null) {
          facility.metrics.avgDailyCensus = latestValue;
        }
        if (item.coaCode === 'C700' && latestValue !== null) {
          facility.metrics.occupancyRate = latestValue * 100;
        }
      }
    }

    // Calculate percent of revenue for each line item
    if (totalRevenue > 0) {
      for (const item of facilityItems) {
        if (item.annualized !== null) {
          item.percentOfRevenue = (item.annualized / totalRevenue) * 100;
        }
      }
    }
  }
}

/**
 * Build proforma structure from extracted data
 */
function buildProformaData(
  lineItems: ExtractedLineItem[],
  facilities: Map<string, Partial<FacilityProfile>>,
  periods: string[]
): ProformaData[] {
  const proformas: ProformaData[] = [];

  for (const [facilityName] of facilities) {
    const facilityItems = lineItems.filter(item => item.facility === facilityName);

    const proforma: ProformaData = {
      facility: facilityName,
      revenue: {
        medicare: [],
        medicaid: [],
        private: [],
        other: [],
        ancillary: [],
        total: [],
      },
      expenses: {
        nursing: [],
        dietary: [],
        housekeeping: [],
        laundry: [],
        activities: [],
        socialServices: [],
        administration: [],
        plantOperations: [],
        propertyTax: [],
        insurance: [],
        managementFee: [],
        other: [],
        total: [],
      },
      census: {
        medicareDays: [],
        medicaidDays: [],
        privateDays: [],
        totalDays: [],
        avgDailyCensus: [],
        occupancy: [],
      },
      calculated: {
        grossProfit: [],
        netOperatingIncome: [],
        ebitda: [],
      },
    };

    // Map line items to proforma structure
    for (const item of facilityItems) {
      const proformaKey = COA_PATTERNS.find(p => p.code === item.coaCode)?.proformaKey;
      if (!proformaKey) continue;

      const [section, field] = proformaKey.split('.') as [keyof ProformaData, string];
      if (section && field && proforma[section] && Array.isArray((proforma[section] as Record<string, MonthlyValue[]>)[field])) {
        // Aggregate values if multiple items map to same key
        const targetArray = (proforma[section] as Record<string, MonthlyValue[]>)[field];
        for (const value of item.values) {
          const existing = targetArray.find(v => v.period === value.period);
          if (existing && existing.value !== null && value.value !== null) {
            existing.value += value.value;
          } else if (!existing) {
            targetArray.push({ ...value });
          }
        }
      }
    }

    proformas.push(proforma);
  }

  return proformas;
}

/**
 * Main extraction function
 */
export async function comprehensiveExtract(
  files: Array<{ id: string; filename: string; path: string }>
): Promise<ExtractionResult> {
  const allFacilities = new Map<string, Partial<FacilityProfile>>();
  const allLineItems: ExtractedLineItem[] = [];
  let allPeriods: string[] = [];
  let totalRowsProcessed = 0;
  const warnings: string[] = [];

  for (const file of files) {
    const ext = file.filename.split('.').pop()?.toLowerCase();

    if (ext === 'xlsx' || ext === 'xls') {
      try {
        const { facilities, lineItems, periods } = await extractFromExcel(file.path, file.filename);

        for (const [name, profile] of facilities) {
          if (allFacilities.has(name)) {
            // Merge facility data
            const existing = allFacilities.get(name)!;
            existing.sourceFiles = [...(existing.sourceFiles || []), ...(profile.sourceFiles || [])];
          } else {
            allFacilities.set(name, profile);
          }
        }

        allLineItems.push(...lineItems);
        totalRowsProcessed += lineItems.length;

        if (periods.length > allPeriods.length) {
          allPeriods = periods;
        }
      } catch (error) {
        warnings.push(`Failed to extract from ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  // Calculate derived metrics
  calculateMetrics(allLineItems, allFacilities);

  // Build proforma data
  const proformaData = buildProformaData(allLineItems, allFacilities, allPeriods);

  // Convert facilities map to array
  const facilitiesArray: FacilityProfile[] = Array.from(allFacilities.entries()).map(([name, profile]) => ({
    name,
    entityName: profile.entityName || null,
    ccn: profile.ccn || null,
    city: profile.city || null,
    state: profile.state || null,
    facilityType: profile.facilityType || 'SNF',
    licensedBeds: profile.licensedBeds || null,
    certifiedBeds: profile.certifiedBeds || null,
    metrics: profile.metrics || {
      avgDailyCensus: null,
      occupancyRate: null,
      payorMix: { medicare: null, medicaid: null, private: null, other: null },
      revenuePPD: null,
      expensePPD: null,
      laborPPD: null,
      netOperatingIncome: null,
      ebitda: null,
      ebitdaMargin: null,
    },
    sourceFiles: profile.sourceFiles || [],
  }));

  // Calculate summary
  const mappedItems = allLineItems.filter(item => item.coaCode !== null).length;

  // Find total revenue - look for largest 4999 item (Total Revenue) per facility
  const totalRevenue = facilitiesArray.reduce((sum, f) => {
    const revItems = allLineItems.filter(i => i.facility === f.name && i.coaCode === '4999' && i.annualized !== null);
    const largestRev = revItems.sort((a, b) => (b.annualized || 0) - (a.annualized || 0))[0];
    return sum + (largestRev?.annualized || 0);
  }, 0);

  // Find total expenses - look for "Total Operating Expense" (exact) or largest 6999 item per facility
  const totalExpenses = facilitiesArray.reduce((sum, f) => {
    const expItems = allLineItems.filter(i => i.facility === f.name && i.coaCode === '6999' && i.annualized !== null);
    // Prefer exact "Total Operating Expense" match, then check for largest
    const exactMatch = expItems.find(i => /^total\s+operating\s+expense$/i.test(i.originalLabel.trim()));
    const largestExp = exactMatch || expItems.sort((a, b) => (b.annualized || 0) - (a.annualized || 0))[0];
    return sum + (largestExp?.annualized || 0);
  }, 0);

  return {
    facilities: facilitiesArray,
    lineItems: allLineItems,
    proformaData,
    summary: {
      totalRevenue,
      totalExpenses,
      totalNOI: totalRevenue - totalExpenses,
      avgOccupancy: facilitiesArray.reduce((sum, f) => sum + (f.metrics.occupancyRate || 0), 0) / facilitiesArray.length || 0,
      totalBeds: facilitiesArray.reduce((sum, f) => sum + (f.licensedBeds || 0), 0),
      dataQuality: mappedItems / allLineItems.length || 0,
      periodsExtracted: allPeriods,
      warnings,
    },
    metadata: {
      extractedAt: new Date().toISOString(),
      filesProcessed: files.map(f => f.filename),
      totalRowsProcessed,
      mappedItems,
      unmappedItems: allLineItems.length - mappedItems,
    },
  };
}
