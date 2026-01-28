/**
 * Census Data Extractor
 *
 * Extracts patient days broken out by payer type:
 * - Medicare Part A (skilled)
 * - Medicare Advantage (managed medicare)
 * - Managed Care (commercial)
 * - Medicaid (traditional)
 * - Managed Medicaid (MCO)
 * - Private Pay
 * - VA Contract
 * - Hospice
 * - Other
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CensusPeriod {
  facilityName: string;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;

  // Skilled Census (higher PPD)
  medicarePartADays: number;
  medicareAdvantageDays: number;
  managedCareDays: number;

  // Non-Skilled Census (lower PPD)
  medicaidDays: number;
  managedMedicaidDays: number;
  privateDays: number;
  vaContractDays: number;
  hospiceDays: number;
  otherDays: number;

  // Totals
  totalPatientDays: number;
  avgDailyCensus: number;
  totalBeds: number;
  occupancyRate: number;

  // Metadata
  source: 'extracted' | 'manual' | 'projected';
  confidence: number;
}

// ============================================================================
// PAYER TYPE PATTERNS
// ============================================================================

interface PayerPattern {
  type: keyof Pick<CensusPeriod,
    'medicarePartADays' | 'medicareAdvantageDays' | 'managedCareDays' |
    'medicaidDays' | 'managedMedicaidDays' | 'privateDays' |
    'vaContractDays' | 'hospiceDays' | 'otherDays' | 'totalPatientDays'
  >;
  patterns: RegExp[];
}

const PAYER_PATTERNS: PayerPattern[] = [
  {
    type: 'medicarePartADays',
    patterns: [
      /medicare\s*(part)?\s*a/i,
      /skilled\s+medicare/i,
      /snf\s+medicare/i,
      /^medicare$/i,
      /trad(itional)?\s+medicare/i,
      // Avamere format: "Resident Care - SNF - Medicare"
      /resident\s+care.*-\s*medicare$/i,
      /snf\s*-\s*medicare$/i,
    ],
  },
  {
    type: 'medicareAdvantageDays',
    patterns: [
      /medicare\s*(advantage|ma)/i,
      /managed\s+medicare/i,
      /ma\s+days?/i,
      /medicare\s+managed/i,
    ],
  },
  {
    type: 'managedCareDays',
    patterns: [
      /managed\s+care(?!\s+medicaid)/i,
      /commercial/i,
      /insurance\s+days/i,
      /private\s+insurance/i,
      // Avamere format: "Resident Care - SNF - HMO"
      /resident\s+care.*-\s*hmo$/i,
      /snf\s*-\s*hmo$/i,
      /resident\s+care.*-\s*ppo$/i,
      /snf\s*-\s*ppo$/i,
    ],
  },
  {
    type: 'medicaidDays',
    patterns: [
      /^medicaid$/i,
      /state\s+medicaid/i,
      /traditional\s+medicaid/i,
      /trad\s+medicaid/i,
      /fee.?for.?service\s+medicaid/i,
      /ffs\s+medicaid/i,
      // Avamere format: "Resident Care - SNF - Medicaid"
      /resident\s+care.*-\s*medicaid$/i,
      /snf\s*-\s*medicaid$/i,
    ],
  },
  {
    type: 'managedMedicaidDays',
    patterns: [
      /managed\s+medicaid/i,
      /medicaid\s+managed/i,
      /medicaid\s+(hmo|mco)/i,
      /mco\s+days?/i,
      /medicaid\s+mco/i,
    ],
  },
  {
    type: 'privateDays',
    patterns: [
      /private\s+pay/i,
      /self.?pay/i,
      /out\s+of\s+pocket/i,
      /cash\s+pay/i,
      // Avamere format: "Resident Care - SNF - Private"
      /resident\s+care.*-\s*private$/i,
      /snf\s*-\s*private$/i,
    ],
  },
  {
    type: 'vaContractDays',
    patterns: [
      /^va$/i,
      /veteran/i,
      /va\s+contract/i,
      /tricare/i,
      /military/i,
      // Avamere format: "Resident Care - SNF - Veterans"
      /resident\s+care.*-\s*veterans?$/i,
      /snf\s*-\s*veterans?$/i,
    ],
  },
  {
    type: 'hospiceDays',
    patterns: [
      /hospice/i,
      /end\s+of\s+life/i,
      /palliative/i,
      // Avamere format: "Resident Care - SNF - Hospice"
      /resident\s+care.*-\s*hospice$/i,
      /snf\s*-\s*hospice$/i,
    ],
  },
  {
    type: 'otherDays',
    patterns: [
      /^other$/i,
      /other\s+(payer|payor)/i,
      /misc(ellaneous)?/i,
      /pending/i,
    ],
  },
  {
    type: 'totalPatientDays',
    patterns: [
      /total\s+(patient\s+)?days?/i,
      /resident\s+days/i,
      /^total$/i,
      /patient\s+days/i,
      /bed\s+days/i,
      /^total\s+census$/i,
    ],
  },
];

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Parse numeric value from cell
 * For census data, we clamp negative values to 0 (patient days can't be negative)
 */
function parseNumericValue(cell: string | number | null, allowNegative = false): number {
  if (cell === null || cell === undefined) return 0;
  if (typeof cell === 'number') {
    // For census data, negative days don't make sense
    return allowNegative ? cell : Math.max(0, cell);
  }

  const str = String(cell).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === '#N/A') return 0;

  // Remove currency symbols, commas, parentheses
  let cleaned = str.replace(/[$,]/g, '');
  const isNegative = cleaned.includes('(') && cleaned.includes(')');
  cleaned = cleaned.replace(/[()]/g, '');
  cleaned = cleaned.replace(/%/g, '');

  const num = parseFloat(cleaned);
  if (isNaN(num)) return 0;

  const result = isNegative ? -num : num;

  // Census days should never be negative - clamp to 0
  return allowNegative ? result : Math.max(0, result);
}

/**
 * Find the header row containing payer types
 */
function findHeaderRow(data: (string | number | null)[][]): number {
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row) continue;

    const rowText = row
      .filter(cell => cell !== null)
      .map(cell => String(cell).toLowerCase())
      .join(' ');

    // Check if this row contains payer type labels
    const payerMatches = PAYER_PATTERNS.filter(pp =>
      pp.patterns.some(pattern => pattern.test(rowText))
    );

    if (payerMatches.length >= 2) {
      return i;
    }
  }

  return -1;
}

/**
 * Map columns to payer types based on header row
 */
function mapColumnsToPayerTypes(
  headerRow: (string | number | null)[]
): Map<number, keyof CensusPeriod> {
  const columnMap = new Map<number, keyof CensusPeriod>();

  for (let colIdx = 0; colIdx < headerRow.length; colIdx++) {
    const cell = headerRow[colIdx];
    if (cell === null || cell === undefined) continue;

    const label = String(cell).trim();

    for (const payerPattern of PAYER_PATTERNS) {
      if (payerPattern.patterns.some(pattern => pattern.test(label))) {
        columnMap.set(colIdx, payerPattern.type);
        break;
      }
    }
  }

  return columnMap;
}

/**
 * Parse period from row label or separate period column
 */
function parsePeriodFromLabel(label: string): { start: Date; end: Date; label: string } | null {
  // Try various date formats

  // Format: "Jan 2024" or "January 2024"
  const monthYearMatch = label.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*['"]?(\d{4})/i);
  if (monthYearMatch) {
    const monthMap: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = monthMap[monthYearMatch[1].toLowerCase().substring(0, 3)];
    const year = parseInt(monthYearMatch[2]);
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    return { start, end, label: `${monthYearMatch[1].substring(0, 3)} ${year}` };
  }

  // Format: "MM/DD/YYYY" - use month-end as period (common in census reports)
  const fullDateMatch = label.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fullDateMatch) {
    const month = parseInt(fullDateMatch[1]) - 1;
    const day = parseInt(fullDateMatch[2]);
    const year = parseInt(fullDateMatch[3]);
    // Use the date as period end, first of month as start
    const start = new Date(year, month, 1);
    const end = new Date(year, month, day);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return { start, end, label: `${monthNames[month]} ${year}` };
  }

  // Format: "01/2024" or "1/2024"
  const slashMatch = label.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const month = parseInt(slashMatch[1]) - 1;
    const year = parseInt(slashMatch[2]);
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

  return null;
}

/**
 * Extract census data from sheet data
 */
export function extractCensusData(
  data: (string | number | null)[][],
  sheetName: string,
  facilitiesDetected: string[]
): CensusPeriod[] {
  const periods: CensusPeriod[] = [];

  // Find header row
  const headerRowIdx = findHeaderRow(data);
  if (headerRowIdx < 0) {
    // Try alternative approach: look for period rows with numeric values
    return extractCensusFromRows(data, sheetName, facilitiesDetected);
  }

  // Map columns to payer types
  const columnMap = mapColumnsToPayerTypes(data[headerRowIdx]);
  if (columnMap.size < 2) {
    return extractCensusFromRows(data, sheetName, facilitiesDetected);
  }

  // Find period column (usually first column with dates)
  let periodColIdx = -1;
  for (let colIdx = 0; colIdx < data[headerRowIdx].length; colIdx++) {
    const cell = data[headerRowIdx][colIdx];
    if (cell === null) continue;
    const label = String(cell).toLowerCase();
    if (label.includes('period') || label.includes('month') || label.includes('date')) {
      periodColIdx = colIdx;
      break;
    }
  }

  // If no explicit period column, first column is often the period
  if (periodColIdx < 0) periodColIdx = 0;

  // Extract data rows
  for (let rowIdx = headerRowIdx + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    // Get period from row
    const periodCell = row[periodColIdx];
    if (periodCell === null) continue;

    const periodLabel = String(periodCell);
    const parsedPeriod = parsePeriodFromLabel(periodLabel);
    if (!parsedPeriod) continue;

    // Initialize census period
    const censusPeriod: CensusPeriod = {
      facilityName: facilitiesDetected[0] || sheetName,
      periodStart: parsedPeriod.start,
      periodEnd: parsedPeriod.end,
      periodLabel: parsedPeriod.label,
      medicarePartADays: 0,
      medicareAdvantageDays: 0,
      managedCareDays: 0,
      medicaidDays: 0,
      managedMedicaidDays: 0,
      privateDays: 0,
      vaContractDays: 0,
      hospiceDays: 0,
      otherDays: 0,
      totalPatientDays: 0,
      avgDailyCensus: 0,
      totalBeds: 0,
      occupancyRate: 0,
      source: 'extracted',
      confidence: 0.8,
    };

    // Extract values from mapped columns
    for (const [colIdx, payerType] of columnMap) {
      const value = parseNumericValue(row[colIdx]);
      // Type-safe assignment using a switch statement
      switch (payerType) {
        case 'medicarePartADays':
          censusPeriod.medicarePartADays = value;
          break;
        case 'medicareAdvantageDays':
          censusPeriod.medicareAdvantageDays = value;
          break;
        case 'managedCareDays':
          censusPeriod.managedCareDays = value;
          break;
        case 'medicaidDays':
          censusPeriod.medicaidDays = value;
          break;
        case 'managedMedicaidDays':
          censusPeriod.managedMedicaidDays = value;
          break;
        case 'privateDays':
          censusPeriod.privateDays = value;
          break;
        case 'vaContractDays':
          censusPeriod.vaContractDays = value;
          break;
        case 'hospiceDays':
          censusPeriod.hospiceDays = value;
          break;
        case 'otherDays':
          censusPeriod.otherDays = value;
          break;
        case 'totalPatientDays':
          censusPeriod.totalPatientDays = value;
          break;
      }
    }

    // Calculate totals if not provided
    if (censusPeriod.totalPatientDays === 0) {
      censusPeriod.totalPatientDays =
        censusPeriod.medicarePartADays +
        censusPeriod.medicareAdvantageDays +
        censusPeriod.managedCareDays +
        censusPeriod.medicaidDays +
        censusPeriod.managedMedicaidDays +
        censusPeriod.privateDays +
        censusPeriod.vaContractDays +
        censusPeriod.hospiceDays +
        censusPeriod.otherDays;
    }

    // Calculate ADC
    const daysInPeriod = Math.ceil((parsedPeriod.end.getTime() - parsedPeriod.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    censusPeriod.avgDailyCensus = censusPeriod.totalPatientDays / daysInPeriod;

    // Only add if we have meaningful data
    if (censusPeriod.totalPatientDays > 0) {
      periods.push(censusPeriod);
    }
  }

  return periods;
}

/**
 * Alternative extraction when standard column mapping doesn't work
 * Looks for labeled rows instead of columns
 */
function extractCensusFromRows(
  data: (string | number | null)[][],
  sheetName: string,
  facilitiesDetected: string[]
): CensusPeriod[] {
  const periods: CensusPeriod[] = [];

  // Find period columns (dates in header row)
  let periodRow = -1;
  const periodColumns: { colIdx: number; period: { start: Date; end: Date; label: string } }[] = [];

  for (let rowIdx = 0; rowIdx < Math.min(15, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    for (let colIdx = 1; colIdx < row.length; colIdx++) {
      const cell = row[colIdx];
      if (cell === null) continue;
      const parsedPeriod = parsePeriodFromLabel(String(cell));
      if (parsedPeriod) {
        periodRow = rowIdx;
        periodColumns.push({ colIdx, period: parsedPeriod });
      }
    }

    if (periodColumns.length >= 3) break;
  }

  if (periodColumns.length === 0) {
    return periods;
  }

  // Initialize periods
  const censusMap = new Map<number, CensusPeriod>();
  for (const { colIdx, period } of periodColumns) {
    censusMap.set(colIdx, {
      facilityName: facilitiesDetected[0] || sheetName,
      periodStart: period.start,
      periodEnd: period.end,
      periodLabel: period.label,
      medicarePartADays: 0,
      medicareAdvantageDays: 0,
      managedCareDays: 0,
      medicaidDays: 0,
      managedMedicaidDays: 0,
      privateDays: 0,
      vaContractDays: 0,
      hospiceDays: 0,
      otherDays: 0,
      totalPatientDays: 0,
      avgDailyCensus: 0,
      totalBeds: 0,
      occupancyRate: 0,
      source: 'extracted',
      confidence: 0.7,
    });
  }

  // Helper function to set payer type value in a type-safe manner
  const setPayerValue = (period: CensusPeriod, payerType: PayerPattern['type'], value: number) => {
    switch (payerType) {
      case 'medicarePartADays':
        period.medicarePartADays = value;
        break;
      case 'medicareAdvantageDays':
        period.medicareAdvantageDays = value;
        break;
      case 'managedCareDays':
        period.managedCareDays = value;
        break;
      case 'medicaidDays':
        period.medicaidDays = value;
        break;
      case 'managedMedicaidDays':
        period.managedMedicaidDays = value;
        break;
      case 'privateDays':
        period.privateDays = value;
        break;
      case 'vaContractDays':
        period.vaContractDays = value;
        break;
      case 'hospiceDays':
        period.hospiceDays = value;
        break;
      case 'otherDays':
        period.otherDays = value;
        break;
      case 'totalPatientDays':
        period.totalPatientDays = value;
        break;
    }
  };

  // Find payer type rows and extract values
  for (let rowIdx = periodRow + 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row || !row[0]) continue;

    const label = String(row[0]).trim();

    // Match label to payer type
    for (const payerPattern of PAYER_PATTERNS) {
      if (payerPattern.patterns.some(pattern => pattern.test(label))) {
        // Extract values for each period column
        for (const { colIdx } of periodColumns) {
          const value = parseNumericValue(row[colIdx]);
          const censusPeriod = censusMap.get(colIdx);
          if (censusPeriod && value > 0) {
            setPayerValue(censusPeriod, payerPattern.type, value);
          }
        }
        break;
      }
    }

    // Check for occupancy row
    if (/occupancy|occ\s*%/i.test(label)) {
      for (const { colIdx } of periodColumns) {
        const value = parseNumericValue(row[colIdx]);
        const censusPeriod = censusMap.get(colIdx);
        if (censusPeriod) {
          censusPeriod.occupancyRate = value > 1 ? value : value * 100;
        }
      }
    }

    // Check for ADC row
    if (/average\s+daily|adc/i.test(label)) {
      for (const { colIdx } of periodColumns) {
        const value = parseNumericValue(row[colIdx]);
        const censusPeriod = censusMap.get(colIdx);
        if (censusPeriod) {
          censusPeriod.avgDailyCensus = value;
        }
      }
    }

    // Check for bed count row
    if (/licensed\s+beds?|total\s+beds?|bed\s+count/i.test(label)) {
      for (const { colIdx } of periodColumns) {
        const value = parseNumericValue(row[colIdx]);
        const censusPeriod = censusMap.get(colIdx);
        if (censusPeriod) {
          censusPeriod.totalBeds = value;
        }
      }
    }
  }

  // Calculate totals and return valid periods
  for (const censusPeriod of censusMap.values()) {
    if (censusPeriod.totalPatientDays === 0) {
      censusPeriod.totalPatientDays =
        censusPeriod.medicarePartADays +
        censusPeriod.medicareAdvantageDays +
        censusPeriod.managedCareDays +
        censusPeriod.medicaidDays +
        censusPeriod.managedMedicaidDays +
        censusPeriod.privateDays +
        censusPeriod.vaContractDays +
        censusPeriod.hospiceDays +
        censusPeriod.otherDays;
    }

    // Calculate ADC if not already set
    if (censusPeriod.avgDailyCensus === 0 && censusPeriod.totalPatientDays > 0) {
      const daysInPeriod = Math.ceil(
        (censusPeriod.periodEnd.getTime() - censusPeriod.periodStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      censusPeriod.avgDailyCensus = censusPeriod.totalPatientDays / daysInPeriod;
    }

    if (censusPeriod.totalPatientDays > 0 || censusPeriod.avgDailyCensus > 0) {
      periods.push(censusPeriod);
    }
  }

  return periods.sort((a, b) => a.periodStart.getTime() - b.periodStart.getTime());
}
