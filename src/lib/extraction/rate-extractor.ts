/**
 * Rate Letter / PPD Extractor
 *
 * Extracts per-patient-day (PPD) rates from:
 * - Rate letters (PDFs)
 * - Rate schedules (Excel sheets)
 * - Contract documents
 *
 * Captures rates for each payer type with effective dates.
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface PayerRate {
  facilityName: string;
  effectiveDate: Date;
  expirationDate?: Date;

  // Skilled PPD Rates
  medicarePartAPpd?: number;
  medicareAdvantagePpd?: number;
  managedCarePpd?: number;

  // Non-Skilled PPD Rates
  medicaidPpd?: number;
  managedMedicaidPpd?: number;
  privatePpd?: number;
  vaContractPpd?: number;
  hospicePpd?: number;

  // Ancillary
  ancillaryRevenuePpd?: number;
  therapyRevenuePpd?: number;

  // Metadata
  payerType?: string;
  source: 'rate_letter' | 'contract' | 'schedule' | 'extracted';
  documentId: string;
  confidence: number;
}

// ============================================================================
// RATE EXTRACTION PATTERNS
// ============================================================================

interface RatePattern {
  type: keyof Pick<PayerRate,
    'medicarePartAPpd' | 'medicareAdvantagePpd' | 'managedCarePpd' |
    'medicaidPpd' | 'managedMedicaidPpd' | 'privatePpd' |
    'vaContractPpd' | 'hospicePpd' | 'ancillaryRevenuePpd' | 'therapyRevenuePpd'
  >;
  patterns: RegExp[];
}

const RATE_PATTERNS: RatePattern[] = [
  {
    type: 'medicarePartAPpd',
    patterns: [
      /medicare\s*(part)?\s*a\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /skilled\s+(?:nursing\s+)?(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
      /snf\s+(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'medicareAdvantagePpd',
    patterns: [
      /medicare\s*(?:advantage|ma)\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /managed\s+medicare\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'managedCarePpd',
    patterns: [
      /managed\s+care\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /commercial\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
      /insurance\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'medicaidPpd',
    patterns: [
      /medicaid\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /state\s+medicaid\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
      /title\s*xix\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'managedMedicaidPpd',
    patterns: [
      /managed\s+medicaid\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /medicaid\s+(?:mco|hmo)\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'privatePpd',
    patterns: [
      /private\s*(?:pay)?\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /self[\s-]?pay\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
      /daily\s+private\s+rate[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'vaContractPpd',
    patterns: [
      /va\s*(?:contract)?\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /veteran(?:s)?\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'hospicePpd',
    patterns: [
      /hospice\s*(?:rate|ppd|per\s*diem)[:\s]*\$?([\d,]+\.?\d*)/i,
      /palliative\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'ancillaryRevenuePpd',
    patterns: [
      /ancillary\s*(?:rate|ppd|revenue)[:\s]*\$?([\d,]+\.?\d*)/i,
      /other\s+services?\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
  {
    type: 'therapyRevenuePpd',
    patterns: [
      /therapy\s*(?:rate|ppd|revenue)[:\s]*\$?([\d,]+\.?\d*)/i,
      /rehab(?:ilitation)?\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
      /pt\/ot\s*(?:rate|ppd)[:\s]*\$?([\d,]+\.?\d*)/i,
    ],
  },
];

// Date extraction patterns
const DATE_PATTERNS = [
  /effective[:\s]*(\w+\s+\d{1,2},?\s+\d{4})/i,
  /effective\s+date[:\s]*(\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  /as\s+of[:\s]*(\w+\s+\d{1,2},?\s+\d{4})/i,
  /beginning[:\s]*(\w+\s+\d{1,2},?\s+\d{4})/i,
  /(\w+\s+\d{1,2},?\s+\d{4})\s*(?:effective|rate|ppd)/i,
];

const FACILITY_PATTERNS = [
  /facility[:\s]+([A-Za-z][A-Za-z\s]+?)(?:\n|$|,)/i,
  /provider[:\s]+([A-Za-z][A-Za-z\s]+?)(?:\n|$|,)/i,
  /nursing\s+(?:home|facility|center)[:\s]+([A-Za-z][A-Za-z\s]+?)(?:\n|$|,)/i,
  /snf[:\s]+([A-Za-z][A-Za-z\s]+?)(?:\n|$|,)/i,
];

// ============================================================================
// EXTRACTION FUNCTIONS
// ============================================================================

/**
 * Parse date from various formats
 */
function parseDate(dateStr: string): Date {
  // Try common formats
  const trimmed = dateStr.trim();

  // Format: "January 1, 2024" or "Jan 1, 2024"
  const monthDayYearMatch = trimmed.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (monthDayYearMatch) {
    const monthMap: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      jan: 0, feb: 1, mar: 2, apr: 3, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = monthMap[monthDayYearMatch[1].toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(monthDayYearMatch[3]), month, parseInt(monthDayYearMatch[2]));
    }
  }

  // Format: "1/1/2024" or "01/01/24"
  const slashMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (slashMatch) {
    const year = slashMatch[3].length === 2 ? 2000 + parseInt(slashMatch[3]) : parseInt(slashMatch[3]);
    return new Date(year, parseInt(slashMatch[1]) - 1, parseInt(slashMatch[2]));
  }

  // Format: "2024-01-01"
  const isoMatch = trimmed.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
  }

  // Default to today
  return new Date();
}

/**
 * Extract PPD rate value from pattern match
 */
function extractRateValue(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;

  // Find the captured rate value (usually in group 2 or the numeric part)
  for (let i = match.length - 1; i >= 1; i--) {
    const val = match[i];
    if (val && /^[\d,]+\.?\d*$/.test(val.replace(/,/g, ''))) {
      const cleaned = val.replace(/,/g, '');
      const num = parseFloat(cleaned);
      if (num > 0 && num < 2000) {  // Reasonable PPD range
        return num;
      }
    }
  }

  return undefined;
}

/**
 * Extract effective date from text
 */
function extractEffectiveDate(text: string): Date {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseDate(match[1]);
    }
  }
  return new Date();
}

/**
 * Extract facility name from text
 */
function extractFacilityName(text: string, fallbackFacilities: string[]): string {
  for (const pattern of FACILITY_PATTERNS) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 100) {
        return name;
      }
    }
  }

  return fallbackFacilities[0] || 'Unknown Facility';
}

/**
 * Extract rates from text (PDF or plain text)
 */
export function extractRatesFromText(
  text: string,
  documentId: string,
  fallbackFacilities: string[]
): PayerRate[] {
  const rates: PayerRate[] = [];

  // Extract effective date
  const effectiveDate = extractEffectiveDate(text);

  // Extract facility name
  const facilityName = extractFacilityName(text, fallbackFacilities);

  // Create consolidated rate object
  const consolidatedRate: PayerRate = {
    facilityName,
    effectiveDate,
    source: 'rate_letter',
    documentId,
    confidence: 0.7,
  };

  let foundAny = false;

  // Try to extract each rate type
  for (const ratePattern of RATE_PATTERNS) {
    for (const pattern of ratePattern.patterns) {
      const value = extractRateValue(text, pattern);
      if (value !== undefined) {
        consolidatedRate[ratePattern.type] = value;
        foundAny = true;
        break;  // Found this type, move to next
      }
    }
  }

  // Also try generic "per diem" or "daily rate" patterns
  const genericPatterns = [
    /(?:per\s*diem|daily\s*rate)[:\s]*\$?([\d,]+\.?\d*)/gi,
    /\$\s*([\d,]+\.?\d*)\s*(?:per\s*day|\/day|daily)/gi,
  ];

  for (const pattern of genericPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      if (value > 50 && value < 1500) {
        // Try to determine rate type from context
        const contextStart = Math.max(0, match.index - 100);
        const contextEnd = Math.min(text.length, match.index + 100);
        const context = text.substring(contextStart, contextEnd).toLowerCase();

        if (context.includes('medicare') && !consolidatedRate.medicarePartAPpd) {
          consolidatedRate.medicarePartAPpd = value;
          foundAny = true;
        } else if (context.includes('medicaid') && !consolidatedRate.medicaidPpd) {
          consolidatedRate.medicaidPpd = value;
          foundAny = true;
        } else if (context.includes('private') && !consolidatedRate.privatePpd) {
          consolidatedRate.privatePpd = value;
          foundAny = true;
        }
      }
    }
  }

  if (foundAny) {
    // Increase confidence based on how many rates we found
    const rateCount = [
      consolidatedRate.medicarePartAPpd,
      consolidatedRate.medicareAdvantagePpd,
      consolidatedRate.managedCarePpd,
      consolidatedRate.medicaidPpd,
      consolidatedRate.managedMedicaidPpd,
      consolidatedRate.privatePpd,
      consolidatedRate.vaContractPpd,
      consolidatedRate.hospicePpd,
    ].filter(r => r !== undefined).length;

    consolidatedRate.confidence = Math.min(0.95, 0.6 + (rateCount * 0.05));
    rates.push(consolidatedRate);
  }

  return rates;
}

/**
 * Extract rates from tabular data (Excel sheet)
 */
export function extractRatesFromTable(
  data: (string | number | null)[][],
  documentId: string,
  facilitiesDetected: string[]
): PayerRate[] {
  const rates: PayerRate[] = [];

  // Look for rate table structure
  // Common formats:
  // 1. Payer type in first column, rate in second
  // 2. Rate type as row headers, dates as column headers

  // First, try to find rate columns
  let rateColIdx = -1;
  let payerColIdx = -1;
  let dateColIdx = -1;

  // Check first few rows for headers
  for (let rowIdx = 0; rowIdx < Math.min(10, data.length); rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cell = row[colIdx];
      if (cell === null) continue;
      const label = String(cell).toLowerCase();

      if (label.includes('rate') || label.includes('ppd') || label.includes('per diem')) {
        rateColIdx = colIdx;
      }
      if (label.includes('payer') || label.includes('payor') || label.includes('type')) {
        payerColIdx = colIdx;
      }
      if (label.includes('effective') || label.includes('date')) {
        dateColIdx = colIdx;
      }
    }

    if (rateColIdx >= 0) break;
  }

  if (rateColIdx < 0) {
    // No explicit rate column found, try extracting from text content
    const textContent = data.map(row => row.join(' ')).join('\n');
    return extractRatesFromText(textContent, documentId, facilitiesDetected);
  }

  // Extract rates from table
  const facilityName = facilitiesDetected[0] || 'Unknown';

  for (let rowIdx = 1; rowIdx < data.length; rowIdx++) {
    const row = data[rowIdx];
    if (!row) continue;

    const payerLabel = payerColIdx >= 0 ? String(row[payerColIdx] || '') : '';
    const rateValue = row[rateColIdx];
    const dateValue = dateColIdx >= 0 ? row[dateColIdx] : null;

    if (rateValue === null) continue;

    const rate = typeof rateValue === 'number' ? rateValue : parseFloat(String(rateValue).replace(/[$,]/g, ''));
    if (isNaN(rate) || rate <= 0 || rate > 2000) continue;

    const effectiveDate = dateValue ? parseDate(String(dateValue)) : new Date();

    const payerRate: PayerRate = {
      facilityName,
      effectiveDate,
      source: 'schedule',
      documentId,
      confidence: 0.8,
    };

    // Determine payer type from label
    const payerLower = payerLabel.toLowerCase();
    if (/medicare\s*(part)?\s*a|skilled\s+medicare/i.test(payerLower)) {
      payerRate.medicarePartAPpd = rate;
    } else if (/medicare\s*(advantage|ma)/i.test(payerLower)) {
      payerRate.medicareAdvantagePpd = rate;
    } else if (/managed\s+care|commercial/i.test(payerLower)) {
      payerRate.managedCarePpd = rate;
    } else if (/medicaid/i.test(payerLower) && !/managed/i.test(payerLower)) {
      payerRate.medicaidPpd = rate;
    } else if (/managed\s+medicaid/i.test(payerLower)) {
      payerRate.managedMedicaidPpd = rate;
    } else if (/private|self.?pay/i.test(payerLower)) {
      payerRate.privatePpd = rate;
    } else if (/va|veteran/i.test(payerLower)) {
      payerRate.vaContractPpd = rate;
    } else if (/hospice/i.test(payerLower)) {
      payerRate.hospicePpd = rate;
    } else {
      payerRate.payerType = payerLabel;
    }

    rates.push(payerRate);
  }

  return rates;
}
