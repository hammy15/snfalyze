/**
 * Deep Extraction Pipeline Types
 *
 * Types for per-file extraction of census, rates, and financial data
 * from uploaded Excel and PDF documents.
 */

// ============================================================================
// FILE EXTRACTION TYPES
// ============================================================================

export type FileType = 'excel' | 'pdf' | 'csv' | 'image' | 'unknown';
export type SheetType = 'pl' | 'census' | 'rates' | 'summary' | 'rent_roll' | 'unknown';

export interface PerFileExtractionResult {
  documentId: string;
  filename: string;
  fileType: FileType;
  sheets: SheetExtraction[];
  financialData: ExtractedFinancialPeriod[];
  censusData: ExtractedCensusPeriod[];
  rateData: ExtractedPayerRate[];
  rawText?: string;
  confidence: number;
  warnings: string[];
  errors: string[];
  processingTimeMs: number;
}

export interface SheetExtraction {
  sheetName: string;
  sheetIndex: number;
  sheetType: SheetType;
  rowCount: number;
  columnCount: number;
  headers: string[];
  data: Record<string, any>[];
  facilitiesDetected: string[];
  periodsDetected: string[];
  confidence: number;
}

// ============================================================================
// EXTRACTED DATA TYPES
// ============================================================================

export interface ExtractedFinancialPeriod {
  facilityName?: string;
  facilityId?: string;
  periodStart: string;
  periodEnd: string;
  periodType: 'monthly' | 'quarterly' | 'annual' | 'ttm';

  // Revenue
  totalRevenue: number;
  medicareRevenue?: number;
  medicaidRevenue?: number;
  managedCareRevenue?: number;
  privatePayRevenue?: number;
  ancillaryRevenue?: number;
  therapyRevenue?: number;
  otherRevenue?: number;

  // Expenses
  totalExpenses: number;
  laborCost?: number;
  coreLabor?: number;
  agencyLabor?: number;
  nursingCost?: number;
  dietaryCost?: number;
  housekeepingCost?: number;
  utilitiesCost?: number;
  insuranceCost?: number;
  managementFee?: number;
  propertyTax?: number;
  otherExpenses?: number;

  // Metrics
  ebitdar?: number;
  ebitda?: number;
  noi?: number;
  netIncome?: number;

  // Census info if available
  totalPatientDays?: number;
  avgDailyCensus?: number;
  occupancyRate?: number;

  // Source tracking
  sourceSheet?: string;
  sourceRow?: number;
  confidence: number;
  rawLineItems?: ExtractedLineItem[];
}

export interface ExtractedLineItem {
  label: string;
  coaCode?: string;
  category: 'revenue' | 'expense' | 'metric' | 'unknown';
  subcategory?: string;
  value: number;
  sourceRow: number;
  confidence: number;
}

export interface ExtractedCensusPeriod {
  facilityName?: string;
  facilityId?: string;
  periodStart: string;
  periodEnd: string;
  periodType: 'monthly' | 'quarterly' | 'annual';

  // Days by payer
  medicarePartADays: number;
  medicareAdvantageDays: number;
  managedCareDays: number;
  medicaidDays: number;
  managedMedicaidDays: number;
  privateDays: number;
  vaContractDays: number;
  hospiceDays: number;
  otherDays: number;

  // Totals
  totalPatientDays: number;
  avgDailyCensus: number;
  totalBeds?: number;
  occupancyRate?: number;

  // Source tracking
  sourceSheet?: string;
  sourceRow?: number;
  confidence: number;
}

export interface ExtractedPayerRate {
  facilityName?: string;
  facilityId?: string;
  effectiveDate: string;
  expirationDate?: string;

  // PPD rates by payer
  medicarePartAPpd?: number;
  medicareAdvantagePpd?: number;
  managedCarePpd?: number;
  medicaidPpd?: number;
  managedMedicaidPpd?: number;
  privatePpd?: number;
  vaContractPpd?: number;
  hospicePpd?: number;

  // Additional revenue PPD
  ancillaryRevenuePpd?: number;
  therapyRevenuePpd?: number;

  // Source tracking
  sourceSheet?: string;
  sourceDocument?: string;
  confidence: number;
}

// ============================================================================
// PATTERN MATCHING TYPES
// ============================================================================

export interface ColumnMapping {
  columnIndex: number;
  columnHeader: string;
  mappedField: string;
  confidence: number;
}

export interface PatternMatch {
  pattern: RegExp;
  field: string;
  priority: number;
}

// ============================================================================
// PAYER TYPE PATTERNS
// ============================================================================

export const PAYER_PATTERNS: Record<string, RegExp> = {
  medicarePartA: /medicare\s*(part)?\s*a|skilled\s*medicare|mcare\s*a/i,
  medicareAdvantage: /medicare\s*(advantage|ma|hmo)|managed\s*medicare|mcare\s*(adv|ma)/i,
  managedCare: /managed\s*care|commercial\s*ins|hmo|ppo|commercial/i,
  medicaid: /^medicaid$|state\s*medicaid|traditional\s*medicaid/i,
  managedMedicaid: /managed\s*medicaid|medicaid\s*(managed|mco|hmo)|mco/i,
  private: /private\s*pay|self\s*pay|private|cash/i,
  va: /\bva\b|veteran|veterans\s*(admin|affairs)/i,
  hospice: /hospice/i,
  other: /other|misc|miscellaneous/i,
};

// ============================================================================
// FINANCIAL LINE ITEM PATTERNS
// ============================================================================

export const REVENUE_PATTERNS: PatternMatch[] = [
  { pattern: /room\s*(and|&)?\s*board|patient\s*service\s*revenue|nursing\s*revenue/i, field: 'roomAndBoard', priority: 1 },
  { pattern: /ancillary|other\s*patient\s*revenue/i, field: 'ancillary', priority: 2 },
  { pattern: /therapy|rehab\s*revenue|pt\/ot\/slp/i, field: 'therapy', priority: 2 },
  { pattern: /pharmacy\s*revenue/i, field: 'pharmacyRevenue', priority: 3 },
  { pattern: /total\s*revenue|gross\s*revenue|net\s*revenue/i, field: 'totalRevenue', priority: 0 },
];

export const EXPENSE_PATTERNS: PatternMatch[] = [
  // Labor
  { pattern: /salaries?\s*(and|&)?\s*wages?|total\s*payroll/i, field: 'laborCost', priority: 1 },
  { pattern: /nursing\s*(salaries?|wages?|labor|payroll)/i, field: 'nursingLabor', priority: 2 },
  { pattern: /agency\s*(labor|nursing|staff)|contract\s*(labor|nursing|staff)|temp\s*labor/i, field: 'agencyLabor', priority: 2 },
  { pattern: /employee\s*benefits?|payroll\s*taxes?|fica|health\s*insurance/i, field: 'benefits', priority: 2 },

  // Operating
  { pattern: /dietary|food\s*(cost|service)/i, field: 'dietary', priority: 2 },
  { pattern: /housekeeping|laundry|environmental/i, field: 'housekeeping', priority: 2 },
  { pattern: /utilities?|electric|gas|water/i, field: 'utilities', priority: 2 },
  { pattern: /maintenance|repairs?|plant\s*ops/i, field: 'maintenance', priority: 2 },
  { pattern: /supplies?|medical\s*supplies?/i, field: 'supplies', priority: 3 },

  // Fixed
  { pattern: /insurance|liability\s*insurance|property\s*insurance/i, field: 'insurance', priority: 2 },
  { pattern: /property\s*tax|real\s*estate\s*tax/i, field: 'propertyTax', priority: 2 },
  { pattern: /management\s*fee|admin\s*fee/i, field: 'managementFee', priority: 2 },
  { pattern: /rent|lease\s*expense|facility\s*rent/i, field: 'rent', priority: 1 },

  // Totals
  { pattern: /total\s*expense|total\s*operating|operating\s*expense/i, field: 'totalExpenses', priority: 0 },
];

export const METRIC_PATTERNS: PatternMatch[] = [
  { pattern: /ebitdar|earnings\s*before.*rent/i, field: 'ebitdar', priority: 0 },
  { pattern: /ebitda(?!r)/i, field: 'ebitda', priority: 0 },
  { pattern: /\bnoi\b|net\s*operating\s*income/i, field: 'noi', priority: 0 },
  { pattern: /net\s*income|bottom\s*line/i, field: 'netIncome', priority: 1 },
  { pattern: /gross\s*margin|gross\s*profit/i, field: 'grossMargin', priority: 2 },
];

// ============================================================================
// PERIOD DETECTION PATTERNS
// ============================================================================

export const PERIOD_PATTERNS = {
  month: /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*['"]?\d{2,4}/i,
  quarter: /\b(q[1-4]|[1-4]q)\s*['"]?\d{2,4}/i,
  year: /\b(fy|fiscal\s*year|year)?\s*['"]?20\d{2}/i,
  dateRange: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s*(to|-|through)\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
  ttm: /\b(ttm|t12|trailing\s*12|trailing\s*twelve|ltm)/i,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function parseNumber(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;

  const str = String(value)
    .replace(/[$,\s]/g, '')  // Remove currency symbols, commas, spaces
    .replace(/\(([^)]+)\)/, '-$1');  // Convert (123) to -123

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function normalizeHeader(header: string): string {
  return String(header || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function detectFacilityName(text: string): string | null {
  // Common patterns for facility names
  const patterns = [
    /facility[:\s]+([^\n,]+)/i,
    /provider[:\s]+([^\n,]+)/i,
    /building[:\s]+([^\n,]+)/i,
    /location[:\s]+([^\n,]+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].trim();
  }

  return null;
}

export function parsePeriodFromText(text: string): { start: string; end: string } | null {
  // Try date range first
  const rangeMatch = text.match(PERIOD_PATTERNS.dateRange);
  if (rangeMatch) {
    return {
      start: rangeMatch[1],
      end: rangeMatch[3],
    };
  }

  // Try month pattern
  const monthMatch = text.match(PERIOD_PATTERNS.month);
  if (monthMatch) {
    const monthStr = monthMatch[0];
    // Parse and return first/last day of month
    // This is simplified - would need more robust date parsing
    return {
      start: monthStr,
      end: monthStr,
    };
  }

  return null;
}
