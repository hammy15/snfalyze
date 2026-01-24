/**
 * P&L / Income Statement Extractor
 *
 * Extracts financial period data including:
 * - Revenue by payer type
 * - Operating expenses by category
 * - EBITDAR/EBITDA calculations
 * - Per-patient-day (PPD) metrics
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FinancialPeriod {
  facilityName: string;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  isAnnualized: boolean;

  // Revenue
  totalRevenue: number;
  medicareRevenue: number;
  medicaidRevenue: number;
  managedCareRevenue: number;
  privatePayRevenue: number;
  ancillaryRevenue: number;
  otherRevenue: number;

  // Labor Expenses
  totalLaborCost: number;
  nursingLabor: number;
  dietaryLabor: number;
  housekeepingLabor: number;
  administrationLabor: number;
  therapyLabor: number;
  agencyLabor: number;
  employeeBenefits: number;

  // Non-Labor Operating Expenses
  foodCost: number;
  suppliesCost: number;
  utilitiesCost: number;
  insuranceCost: number;
  propertyTax: number;
  managementFee: number;
  otherExpenses: number;

  // Totals
  totalExpenses: number;

  // Calculated Metrics
  ebitdar: number;
  rent: number;
  ebitda: number;
  noi: number;

  // Per-Day Metrics
  totalPatientDays?: number;
  revenuePpd?: number;
  expensePpd?: number;
  laborPpd?: number;
  ebitdarPpd?: number;

  // Margins
  ebitdarMargin?: number;
  ebitdaMargin?: number;
  laborPercentOfRevenue?: number;
  agencyPercentOfLabor?: number;

  // Metadata
  source: 'extracted' | 'manual' | 'projected';
  confidence: number;
}

// Type for numeric fields in FinancialPeriod
type NumericFinancialField =
  | 'totalRevenue' | 'medicareRevenue' | 'medicaidRevenue' | 'managedCareRevenue'
  | 'privatePayRevenue' | 'ancillaryRevenue' | 'otherRevenue'
  | 'totalLaborCost' | 'nursingLabor' | 'dietaryLabor' | 'housekeepingLabor'
  | 'administrationLabor' | 'therapyLabor' | 'agencyLabor' | 'employeeBenefits'
  | 'foodCost' | 'suppliesCost' | 'utilitiesCost' | 'insuranceCost'
  | 'propertyTax' | 'managementFee' | 'otherExpenses'
  | 'totalExpenses' | 'ebitdar' | 'rent' | 'ebitda' | 'noi';

/**
 * Type-safe setter for numeric financial period fields
 */
function setFinancialFieldValue(period: FinancialPeriod, field: keyof FinancialPeriod, value: number): void {
  switch (field) {
    case 'totalRevenue': period.totalRevenue = value; break;
    case 'medicareRevenue': period.medicareRevenue = value; break;
    case 'medicaidRevenue': period.medicaidRevenue = value; break;
    case 'managedCareRevenue': period.managedCareRevenue = value; break;
    case 'privatePayRevenue': period.privatePayRevenue = value; break;
    case 'ancillaryRevenue': period.ancillaryRevenue = value; break;
    case 'otherRevenue': period.otherRevenue = value; break;
    case 'totalLaborCost': period.totalLaborCost = value; break;
    case 'nursingLabor': period.nursingLabor = value; break;
    case 'dietaryLabor': period.dietaryLabor = value; break;
    case 'housekeepingLabor': period.housekeepingLabor = value; break;
    case 'administrationLabor': period.administrationLabor = value; break;
    case 'therapyLabor': period.therapyLabor = value; break;
    case 'agencyLabor': period.agencyLabor = value; break;
    case 'employeeBenefits': period.employeeBenefits = value; break;
    case 'foodCost': period.foodCost = value; break;
    case 'suppliesCost': period.suppliesCost = value; break;
    case 'utilitiesCost': period.utilitiesCost = value; break;
    case 'insuranceCost': period.insuranceCost = value; break;
    case 'propertyTax': period.propertyTax = value; break;
    case 'managementFee': period.managementFee = value; break;
    case 'otherExpenses': period.otherExpenses = value; break;
    case 'totalExpenses': period.totalExpenses = value; break;
    case 'ebitdar': period.ebitdar = value; break;
    case 'rent': period.rent = value; break;
    case 'ebitda': period.ebitda = value; break;
    case 'noi': period.noi = value; break;
    // Non-numeric fields - ignore
    default: break;
  }
}

/**
 * Get numeric field value from financial period
 */
function getFinancialFieldValue(period: FinancialPeriod, field: keyof FinancialPeriod): number {
  switch (field) {
    case 'totalRevenue': return period.totalRevenue;
    case 'medicareRevenue': return period.medicareRevenue;
    case 'medicaidRevenue': return period.medicaidRevenue;
    case 'managedCareRevenue': return period.managedCareRevenue;
    case 'privatePayRevenue': return period.privatePayRevenue;
    case 'ancillaryRevenue': return period.ancillaryRevenue;
    case 'otherRevenue': return period.otherRevenue;
    case 'totalLaborCost': return period.totalLaborCost;
    case 'nursingLabor': return period.nursingLabor;
    case 'dietaryLabor': return period.dietaryLabor;
    case 'housekeepingLabor': return period.housekeepingLabor;
    case 'administrationLabor': return period.administrationLabor;
    case 'therapyLabor': return period.therapyLabor;
    case 'agencyLabor': return period.agencyLabor;
    case 'employeeBenefits': return period.employeeBenefits;
    case 'foodCost': return period.foodCost;
    case 'suppliesCost': return period.suppliesCost;
    case 'utilitiesCost': return period.utilitiesCost;
    case 'insuranceCost': return period.insuranceCost;
    case 'propertyTax': return period.propertyTax;
    case 'managementFee': return period.managementFee;
    case 'otherExpenses': return period.otherExpenses;
    case 'totalExpenses': return period.totalExpenses;
    case 'ebitdar': return period.ebitdar;
    case 'rent': return period.rent;
    case 'ebitda': return period.ebitda;
    case 'noi': return period.noi;
    default: return 0;
  }
}

/**
 * Add value to a numeric field (for component fields)
 */
function addToFinancialField(period: FinancialPeriod, field: keyof FinancialPeriod, value: number): void {
  const currentValue = getFinancialFieldValue(period, field);
  setFinancialFieldValue(period, field, currentValue + value);
}

// ============================================================================
// LINE ITEM PATTERNS
// ============================================================================

interface LineItemPattern {
  category: 'revenue' | 'labor' | 'nonlabor' | 'calculated';
  field: keyof FinancialPeriod;
  patterns: RegExp[];
}

const LINE_ITEM_PATTERNS: LineItemPattern[] = [
  // Revenue patterns
  {
    category: 'revenue',
    field: 'totalRevenue',
    patterns: [
      /total\s+(patient\s+)?revenue/i,
      /gross\s+revenue/i,
      /net\s+patient\s+revenue/i,
      /total\s+income/i,
      /^revenue$/i,
    ],
  },
  {
    category: 'revenue',
    field: 'medicareRevenue',
    patterns: [
      /medicare\s+revenue/i,
      /revenue[:\s-]+medicare/i,
      /medicare\s+part\s+a\s+revenue/i,
      /skilled\s+medicare\s+revenue/i,
    ],
  },
  {
    category: 'revenue',
    field: 'medicaidRevenue',
    patterns: [
      /medicaid\s+revenue/i,
      /revenue[:\s-]+medicaid/i,
      /title\s+xix\s+revenue/i,
    ],
  },
  {
    category: 'revenue',
    field: 'managedCareRevenue',
    patterns: [
      /managed\s+care\s+revenue/i,
      /commercial\s+revenue/i,
      /insurance\s+revenue/i,
      /hmo\/ppo\s+revenue/i,
    ],
  },
  {
    category: 'revenue',
    field: 'privatePayRevenue',
    patterns: [
      /private\s+(pay\s+)?revenue/i,
      /self[\s-]?pay\s+revenue/i,
    ],
  },
  {
    category: 'revenue',
    field: 'ancillaryRevenue',
    patterns: [
      /ancillary\s+revenue/i,
      /therapy\s+revenue/i,
      /rehab\s+revenue/i,
      /other\s+patient\s+revenue/i,
    ],
  },

  // Labor expense patterns
  {
    category: 'labor',
    field: 'totalLaborCost',
    patterns: [
      /total\s+(labor|salaries|wages|payroll)/i,
      /labor\s+expense/i,
      /payroll\s+expense/i,
      /personnel\s+expense/i,
    ],
  },
  {
    category: 'labor',
    field: 'nursingLabor',
    patterns: [
      /nursing\s+(salaries|wages|labor|expense)/i,
      /nursing\s+department/i,
      /rn\/lpn\/cna\s+wages/i,
      /direct\s+care\s+labor/i,
    ],
  },
  {
    category: 'labor',
    field: 'dietaryLabor',
    patterns: [
      /dietary\s+(salaries|wages|labor)/i,
      /food\s+service\s+labor/i,
      /kitchen\s+staff/i,
    ],
  },
  {
    category: 'labor',
    field: 'housekeepingLabor',
    patterns: [
      /housekeeping\s+(salaries|wages|labor)/i,
      /environmental\s+services?\s+(salaries|labor)/i,
      /janitorial\s+(salaries|labor)/i,
    ],
  },
  {
    category: 'labor',
    field: 'administrationLabor',
    patterns: [
      /admin(istrative)?\s+(salaries|wages|labor)/i,
      /management\s+salaries/i,
      /g&a\s+salaries/i,
      /office\s+staff\s+wages/i,
    ],
  },
  {
    category: 'labor',
    field: 'therapyLabor',
    patterns: [
      /therapy\s+(salaries|wages|labor)/i,
      /pt\/ot\s+(salaries|wages)/i,
      /rehab\s+(salaries|labor)/i,
    ],
  },
  {
    category: 'labor',
    field: 'agencyLabor',
    patterns: [
      /agency\s+(staff|labor|expense)/i,
      /contract\s+labor/i,
      /temp\s+staff/i,
      /registry\s+expense/i,
      /staffing\s+agency/i,
    ],
  },
  {
    category: 'labor',
    field: 'employeeBenefits',
    patterns: [
      /employee\s+benefits?/i,
      /benefits?\s+expense/i,
      /payroll\s+taxes?/i,
      /fica/i,
      /health\s+insurance\s+expense/i,
    ],
  },

  // Non-labor expense patterns
  {
    category: 'nonlabor',
    field: 'foodCost',
    patterns: [
      /food\s+cost/i,
      /raw\s+food/i,
      /dietary\s+supplies/i,
      /food\s+expense/i,
    ],
  },
  {
    category: 'nonlabor',
    field: 'suppliesCost',
    patterns: [
      /medical\s+supplies/i,
      /nursing\s+supplies/i,
      /supplies?\s+expense/i,
      /general\s+supplies/i,
    ],
  },
  {
    category: 'nonlabor',
    field: 'utilitiesCost',
    patterns: [
      /utilities?/i,
      /electric(ity)?/i,
      /gas\s+expense/i,
      /water\s+(and\s+)?sewer/i,
    ],
  },
  {
    category: 'nonlabor',
    field: 'insuranceCost',
    patterns: [
      /insurance\s+expense/i,
      /liability\s+insurance/i,
      /property\s+insurance/i,
      /professional\s+liability/i,
    ],
  },
  {
    category: 'nonlabor',
    field: 'propertyTax',
    patterns: [
      /property\s+tax(es)?/i,
      /real\s+estate\s+tax(es)?/i,
    ],
  },
  {
    category: 'nonlabor',
    field: 'managementFee',
    patterns: [
      /management\s+fee/i,
      /mgmt\s+fee/i,
      /administrative\s+fee/i,
      /operator\s+fee/i,
    ],
  },
  {
    category: 'nonlabor',
    field: 'otherExpenses',
    patterns: [
      /other\s+(operating\s+)?expense/i,
      /misc(ellaneous)?\s+expense/i,
    ],
  },
  {
    category: 'nonlabor',
    field: 'totalExpenses',
    patterns: [
      /total\s+(operating\s+)?expense/i,
      /total\s+costs?/i,
      /operating\s+expense/i,
    ],
  },

  // Calculated patterns
  {
    category: 'calculated',
    field: 'ebitdar',
    patterns: [
      /ebitdar/i,
      /earnings\s+before\s+.*rent/i,
      /operating\s+income\s+before\s+rent/i,
    ],
  },
  {
    category: 'calculated',
    field: 'rent',
    patterns: [
      /^rent$/i,
      /rent\s+expense/i,
      /lease\s+expense/i,
      /building\s+rent/i,
    ],
  },
  {
    category: 'calculated',
    field: 'ebitda',
    patterns: [
      /^ebitda$/i,
      /earnings\s+before\s+interest.*depreciation/i,
    ],
  },
  {
    category: 'calculated',
    field: 'noi',
    patterns: [
      /^noi$/i,
      /net\s+operating\s+income/i,
      /operating\s+income/i,
    ],
  },
  {
    category: 'calculated',
    field: 'totalPatientDays',
    patterns: [
      /total\s+patient\s+days/i,
      /resident\s+days/i,
      /bed\s+days/i,
    ],
  },
];

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Parse numeric value from cell
 */
function parseNumericValue(cell: string | number | null): number {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === 'number') return cell;

  const str = String(cell).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === '#N/A') return 0;

  let cleaned = str.replace(/[$,]/g, '');
  const isNegative = cleaned.includes('(') && cleaned.includes(')');
  cleaned = cleaned.replace(/[()]/g, '');
  cleaned = cleaned.replace(/%/g, '');

  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;

  return isNegative ? -num : num;
}

/**
 * Parse period from label
 */
function parsePeriodFromLabel(label: string): { start: Date; end: Date; label: string } | null {
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // Format: "Jan 2024" or "January 2024"
  const monthYearMatch = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{2,4})/i);
  if (monthYearMatch) {
    const month = monthMap[monthYearMatch[1].toLowerCase().substring(0, 3)];
    const year = monthYearMatch[2].length === 2 ? 2000 + parseInt(monthYearMatch[2]) : parseInt(monthYearMatch[2]);
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end, label: `${monthYearMatch[1].substring(0, 3)} ${year}` };
  }

  // Format: "01/2024" or "1/24"
  const slashMatch = label.match(/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]) - 1;
    const year = slashMatch[2].length === 2 ? 2000 + parseInt(slashMatch[2]) : parseInt(slashMatch[2]);
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end, label: `${start.toLocaleDateString('en-US', { month: 'short' })} ${year}` };
  }

  // Format: "2024-01"
  const isoMatch = label.match(/(\d{4})-(\d{2})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1]);
    const month = parseInt(isoMatch[2]) - 1;
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end, label: `${start.toLocaleDateString('en-US', { month: 'short' })} ${year}` };
  }

  // Format: "Q1 2024"
  const quarterMatch = label.match(/Q([1-4])\s*['"]?(\d{4})/i);
  if (quarterMatch) {
    const quarter = parseInt(quarterMatch[1]);
    const year = parseInt(quarterMatch[2]);
    const startMonth = (quarter - 1) * 3;
    const start = new Date(year, startMonth, 1);
    const end = new Date(year, startMonth + 3, 0);
    return { start, end, label: `Q${quarter} ${year}` };
  }

  // Format: "YTD 2024" or "TTM"
  const ytdMatch = label.match(/(YTD|TTM|Annual)\s*['"]?(\d{4})?/i);
  if (ytdMatch) {
    const year = ytdMatch[2] ? parseInt(ytdMatch[2]) : new Date().getFullYear();
    return {
      start: new Date(year, 0, 1),
      end: new Date(year, 11, 31),
      label: ytdMatch[0],
    };
  }

  return null;
}

/**
 * Find period columns in header row
 */
function findPeriodColumns(
  headerRow: (string | number | null)[]
): { colIdx: number; period: { start: Date; end: Date; label: string } }[] {
  const columns: { colIdx: number; period: { start: Date; end: Date; label: string } }[] = [];

  for (let colIdx = 1; colIdx < headerRow.length; colIdx++) {
    const cell = headerRow[colIdx];
    if (cell === null) continue;

    const parsed = parsePeriodFromLabel(String(cell));
    if (parsed) {
      columns.push({ colIdx, period: parsed });
    }
  }

  return columns.sort((a, b) => a.period.start.getTime() - b.period.start.getTime());
}

/**
 * Match row label to financial field
 */
function matchLabelToField(label: string): LineItemPattern | null {
  for (const pattern of LINE_ITEM_PATTERNS) {
    if (pattern.patterns.some(p => p.test(label))) {
      return pattern;
    }
  }
  return null;
}

/**
 * Extract P&L data from sheet data
 */
export function extractPLData(
  data: (string | number | null)[][],
  sheetName: string,
  facilitiesDetected: string[]
): FinancialPeriod[] {
  const periods: FinancialPeriod[] = [];

  // Find header row with periods
  let headerRowIdx = -1;
  let periodColumns: { colIdx: number; period: { start: Date; end: Date; label: string } }[] = [];

  for (let rowIdx = 0; rowIdx < Math.min(20, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    const columns = findPeriodColumns(row);
    if (columns.length >= 2) {
      headerRowIdx = rowIdx;
      periodColumns = columns;
      break;
    }
  }

  if (periodColumns.length === 0) {
    // Fallback: Look for a single annual period
    return extractAnnualPL(data, sheetName, facilitiesDetected);
  }

  // Initialize financial periods
  const periodMap = new Map<number, FinancialPeriod>();
  for (const { colIdx, period } of periodColumns) {
    periodMap.set(colIdx, createEmptyFinancialPeriod(
      facilitiesDetected[0] || sheetName,
      period
    ));
  }

  // Extract line items
  for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[0]) continue;

    const label = String(row[0]).trim();
    const matchedPattern = matchLabelToField(label);

    if (matchedPattern) {
      for (const { colIdx } of periodColumns) {
        const value = parseNumericValue(row[colIdx]);
        const fp = periodMap.get(colIdx);
        if (fp && value !== 0) {
          const field = matchedPattern.field;
          // Handle additive fields vs replacement fields
          if (field === 'totalRevenue' || field === 'totalExpenses' ||
              field === 'totalLaborCost' || field === 'ebitdar' ||
              field === 'ebitda' || field === 'noi') {
            // These are total fields, replace only if current is 0
            if (getFinancialFieldValue(fp, field) === 0) {
              setFinancialFieldValue(fp, field, value);
            }
          } else {
            // Component fields, add to existing
            addToFinancialField(fp, field, value);
          }
        }
      }
    }
  }

  // Calculate derived metrics for each period
  for (const fp of periodMap.values()) {
    calculateDerivedMetrics(fp);

    // Only include periods with meaningful data
    if (fp.totalRevenue > 0 || fp.totalExpenses > 0) {
      periods.push(fp);
    }
  }

  return periods.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
}

/**
 * Extract annual P&L when monthly data isn't available
 */
function extractAnnualPL(
  data: (string | number | null)[][],
  sheetName: string,
  facilitiesDetected: string[]
): FinancialPeriod[] {
  // Look for annual/total column
  let valueColIdx = -1;

  for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    for (let colIdx = 1; colIdx < row.length; colIdx++) {
      const cell = row[colIdx];
      if (cell === null) continue;
      const label = String(cell).toLowerCase();

      if (label.includes('annual') || label.includes('total') || label.includes('ytd') || label.includes('ttm')) {
        valueColIdx = colIdx;
        break;
      }
    }

    if (valueColIdx >= 0) break;
  }

  // Default to second column if no header found
  if (valueColIdx < 0) valueColIdx = 1;

  const currentYear = new Date().getFullYear();
  const fp = createEmptyFinancialPeriod(
    facilitiesDetected[0] || sheetName,
    {
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
      label: 'Annual',
    }
  );
  fp.isAnnualized = true;

  // Extract values
  for (let rowIdx = 0; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[0]) continue;

    const label = String(row[0]).trim();
    const matchedPattern = matchLabelToField(label);

    if (matchedPattern) {
      const value = parseNumericValue(row[valueColIdx]);
      if (value !== 0) {
        setFinancialFieldValue(fp, matchedPattern.field, value);
      }
    }
  }

  calculateDerivedMetrics(fp);

  if (fp.totalRevenue > 0 || fp.totalExpenses > 0) {
    return [fp];
  }

  return [];
}

/**
 * Create empty financial period
 */
function createEmptyFinancialPeriod(
  facilityName: string,
  period: { start: Date; end: Date; label: string }
): FinancialPeriod {
  return {
    facilityName,
    periodStart: period.start,
    periodEnd: period.end,
    periodLabel: period.label,
    isAnnualized: false,
    totalRevenue: 0,
    medicareRevenue: 0,
    medicaidRevenue: 0,
    managedCareRevenue: 0,
    privatePayRevenue: 0,
    ancillaryRevenue: 0,
    otherRevenue: 0,
    totalLaborCost: 0,
    nursingLabor: 0,
    dietaryLabor: 0,
    housekeepingLabor: 0,
    administrationLabor: 0,
    therapyLabor: 0,
    agencyLabor: 0,
    employeeBenefits: 0,
    foodCost: 0,
    suppliesCost: 0,
    utilitiesCost: 0,
    insuranceCost: 0,
    propertyTax: 0,
    managementFee: 0,
    otherExpenses: 0,
    totalExpenses: 0,
    ebitdar: 0,
    rent: 0,
    ebitda: 0,
    noi: 0,
    source: 'extracted',
    confidence: 0.7,
  };
}

/**
 * Calculate derived metrics
 */
function calculateDerivedMetrics(fp: FinancialPeriod): void {
  // Calculate total labor if not provided
  if (fp.totalLaborCost === 0) {
    fp.totalLaborCost =
      fp.nursingLabor +
      fp.dietaryLabor +
      fp.housekeepingLabor +
      fp.administrationLabor +
      fp.therapyLabor +
      fp.agencyLabor +
      fp.employeeBenefits;
  }

  // Calculate total expenses if not provided
  if (fp.totalExpenses === 0) {
    fp.totalExpenses =
      fp.totalLaborCost +
      fp.foodCost +
      fp.suppliesCost +
      fp.utilitiesCost +
      fp.insuranceCost +
      fp.propertyTax +
      fp.managementFee +
      fp.otherExpenses;
  }

  // Calculate total revenue from components if not provided
  if (fp.totalRevenue === 0) {
    fp.totalRevenue =
      fp.medicareRevenue +
      fp.medicaidRevenue +
      fp.managedCareRevenue +
      fp.privatePayRevenue +
      fp.ancillaryRevenue +
      fp.otherRevenue;
  }

  // Calculate EBITDAR
  if (fp.ebitdar === 0 && fp.totalRevenue > 0) {
    fp.ebitdar = fp.totalRevenue - fp.totalExpenses;
  }

  // Calculate EBITDA
  if (fp.ebitda === 0) {
    fp.ebitda = fp.ebitdar - fp.rent;
  }

  // Calculate NOI (typically same as EBITDA for SNFs)
  if (fp.noi === 0) {
    fp.noi = fp.ebitda;
  }

  // Calculate margins
  if (fp.totalRevenue > 0) {
    fp.ebitdarMargin = (fp.ebitdar / fp.totalRevenue) * 100;
    fp.ebitdaMargin = (fp.ebitda / fp.totalRevenue) * 100;
    fp.laborPercentOfRevenue = (fp.totalLaborCost / fp.totalRevenue) * 100;
  }

  // Calculate agency percentage
  if (fp.totalLaborCost > 0) {
    fp.agencyPercentOfLabor = (fp.agencyLabor / fp.totalLaborCost) * 100;
  }

  // Calculate PPD metrics if patient days available
  if (fp.totalPatientDays && fp.totalPatientDays > 0) {
    fp.revenuePpd = fp.totalRevenue / fp.totalPatientDays;
    fp.expensePpd = fp.totalExpenses / fp.totalPatientDays;
    fp.laborPpd = fp.totalLaborCost / fp.totalPatientDays;
    fp.ebitdarPpd = fp.ebitdar / fp.totalPatientDays;
  }

  // Adjust confidence based on data completeness
  const filledFields = [
    fp.totalRevenue,
    fp.totalExpenses,
    fp.totalLaborCost,
  ].filter(v => v > 0).length;

  fp.confidence = 0.5 + (filledFields / 3) * 0.3;
}
