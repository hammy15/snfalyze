// Document processing module
// Handles OCR, table extraction, and data normalization

import { COA_SYNONYMS } from '@/lib/analysis/prompts';

export interface ProcessingResult {
  success: boolean;
  documentType: string;
  extractedData: Record<string, any>;
  rawText: string;
  tables: any[];
  errors: string[];
  confidence: number;
}

export interface ExtractedFinancial {
  field: string;
  value: number | string;
  confidence: number;
  source: string;
  normalized?: string;
}

// Document type classification based on content patterns
export function classifyDocument(text: string, filename: string): string {
  const lowerText = text.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  // Check filename first
  if (lowerFilename.includes('rent roll') || lowerFilename.includes('rentroll')) {
    return 'rent_roll';
  }
  if (lowerFilename.includes('census')) {
    return 'census_report';
  }
  if (lowerFilename.includes('staffing') || lowerFilename.includes('schedule')) {
    return 'staffing_report';
  }
  if (lowerFilename.includes('survey') || lowerFilename.includes('deficiency')) {
    return 'survey_report';
  }
  if (lowerFilename.includes('cost report') || lowerFilename.includes('costreport')) {
    return 'cost_report';
  }
  if (lowerFilename.includes('om') || lowerFilename.includes('offering')) {
    return 'om_package';
  }
  if (lowerFilename.includes('appraisal')) {
    return 'appraisal';
  }
  if (lowerFilename.includes('environmental') || lowerFilename.includes('phase')) {
    return 'environmental';
  }

  // Check content patterns
  if (lowerText.includes('income statement') || lowerText.includes('profit and loss') ||
      lowerText.includes('p&l') || lowerText.includes('revenue') && lowerText.includes('expense')) {
    return 'financial_statement';
  }
  if (lowerText.includes('rent roll') || lowerText.includes('resident list') ||
      lowerText.includes('unit number')) {
    return 'rent_roll';
  }
  if (lowerText.includes('average daily census') || lowerText.includes('adc') ||
      lowerText.includes('patient days')) {
    return 'census_report';
  }
  if (lowerText.includes('staffing') || lowerText.includes('hppd') ||
      lowerText.includes('hours per patient day')) {
    return 'staffing_report';
  }
  if (lowerText.includes('survey') || lowerText.includes('deficiency') ||
      lowerText.includes('cms form')) {
    return 'survey_report';
  }
  if (lowerText.includes('medicaid cost report') || lowerText.includes('medicare cost report')) {
    return 'cost_report';
  }

  return 'other';
}

// Normalize term to Cascadia COA
export function normalizeTerm(term: string): string | null {
  const lowerTerm = term.toLowerCase().trim();

  // Direct match
  if (COA_SYNONYMS[lowerTerm]) {
    return COA_SYNONYMS[lowerTerm];
  }

  // Partial match
  for (const [synonym, normalized] of Object.entries(COA_SYNONYMS)) {
    if (lowerTerm.includes(synonym) || synonym.includes(lowerTerm)) {
      return normalized;
    }
  }

  return null;
}

// Extract financial values from text
export function extractFinancialValues(text: string): ExtractedFinancial[] {
  const results: ExtractedFinancial[] = [];

  // Common financial patterns
  const patterns = [
    // Currency values with labels
    /(?<label>[\w\s]+):\s*\$?\s*(?<value>[\d,]+(?:\.\d{2})?)/gi,
    // Table row patterns
    /(?<label>[\w\s]+)\s+\$?\s*(?<value>[\d,]+(?:\.\d{2})?)\s*$/gm,
    // Percentage patterns
    /(?<label>[\w\s]+):\s*(?<value>\d+(?:\.\d+)?)\s*%/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.groups) {
        const label = match.groups.label.trim();
        const value = match.groups.value.replace(/,/g, '');
        const normalized = normalizeTerm(label);

        results.push({
          field: label,
          value: parseFloat(value),
          confidence: normalized ? 0.9 : 0.6,
          source: 'text_extraction',
          normalized: normalized || undefined,
        });
      }
    }
  }

  return results;
}

// Parse Excel data (placeholder - actual implementation would use xlsx)
export function parseExcelData(data: any[][]): Record<string, any> {
  const result: Record<string, any> = {};

  // Find header row (typically first row with multiple non-empty cells)
  let headerRow = 0;
  for (let i = 0; i < Math.min(10, data.length); i++) {
    const nonEmptyCells = data[i].filter((cell) => cell !== null && cell !== '').length;
    if (nonEmptyCells >= 3) {
      headerRow = i;
      break;
    }
  }

  const headers = data[headerRow].map((h) => String(h || '').trim().toLowerCase());

  // Process data rows
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.every((cell) => cell === null || cell === '')) continue;

    for (let j = 0; j < headers.length; j++) {
      const header = headers[j];
      const value = row[j];

      if (header && value !== null && value !== '') {
        const normalized = normalizeTerm(header);
        if (normalized) {
          result[normalized] = value;
        }
      }
    }
  }

  return result;
}

// Build T12 (Trailing 12 months) from monthly data
export function buildT12(monthlyData: any[]): any {
  if (monthlyData.length < 12) {
    // Annualize partial data
    const months = monthlyData.length;
    const annualizationFactor = 12 / months;

    const totals: Record<string, number> = {};

    for (const month of monthlyData) {
      for (const [key, value] of Object.entries(month)) {
        if (typeof value === 'number') {
          totals[key] = (totals[key] || 0) + value;
        }
      }
    }

    // Apply annualization
    for (const key of Object.keys(totals)) {
      totals[key] *= annualizationFactor;
    }

    return {
      ...totals,
      isAnnualized: true,
      monthsIncluded: months,
      annualizationFactor,
    };
  }

  // True T12 - sum last 12 months
  const last12 = monthlyData.slice(-12);
  const totals: Record<string, number> = {};

  for (const month of last12) {
    for (const [key, value] of Object.entries(month)) {
      if (typeof value === 'number') {
        totals[key] = (totals[key] || 0) + value;
      }
    }
  }

  return {
    ...totals,
    isAnnualized: false,
    monthsIncluded: 12,
  };
}

// Calculate derived metrics
export function calculateDerivedMetrics(financials: Record<string, number>): Record<string, number> {
  const metrics: Record<string, number> = {};

  // NOI calculation
  if (financials.total_revenue && financials.total_expenses) {
    metrics.noi = financials.total_revenue - financials.total_expenses;
  }

  // EBITDAR (assuming rent is included in expenses for normalization)
  if (metrics.noi !== undefined) {
    metrics.ebitdar = metrics.noi + (financials.management_fee || 0);
  }

  // Labor percentage
  if (financials.labor_cost && financials.total_revenue) {
    metrics.labor_percentage = financials.labor_cost / financials.total_revenue;
  }

  // Agency percentage of nursing
  if (financials.agency_labor && financials.labor_cost) {
    metrics.agency_percentage = financials.agency_labor / financials.labor_cost;
  }

  // Occupancy rate
  if (financials.average_daily_census && financials.licensed_beds) {
    metrics.occupancy_rate = financials.average_daily_census / financials.licensed_beds;
  }

  // Revenue per patient day
  if (financials.total_revenue && financials.average_daily_census) {
    metrics.revenue_per_patient_day = financials.total_revenue / (financials.average_daily_census * 365);
  }

  // HPPD (if staffing data available)
  if (financials.nursing_hours && financials.average_daily_census) {
    metrics.hppd = financials.nursing_hours / financials.average_daily_census;
  }

  return metrics;
}

// Normalize NOI (adjust for market rent, owner comp, etc.)
export function normalizeNoi(
  noi: number,
  adjustments: {
    rentAdjustment?: number;
    ownerCompAdjustment?: number;
    managementFeeAdjustment?: number;
    oneTimeItems?: number;
  }
): number {
  let normalized = noi;

  if (adjustments.rentAdjustment) {
    normalized += adjustments.rentAdjustment;
  }

  if (adjustments.ownerCompAdjustment) {
    normalized += adjustments.ownerCompAdjustment;
  }

  if (adjustments.managementFeeAdjustment) {
    normalized += adjustments.managementFeeAdjustment;
  }

  if (adjustments.oneTimeItems) {
    normalized -= adjustments.oneTimeItems;
  }

  return normalized;
}

// Detect data conflicts
export function detectConflicts(
  sources: Array<{ source: string; data: Record<string, any> }>
): Array<{ field: string; values: Array<{ source: string; value: any }> }> {
  const conflicts: Array<{ field: string; values: Array<{ source: string; value: any }> }> = [];

  // Collect all fields across sources
  const allFields = new Set<string>();
  for (const source of sources) {
    for (const field of Object.keys(source.data)) {
      allFields.add(field);
    }
  }

  // Check for conflicting values
  for (const field of allFields) {
    const values: Array<{ source: string; value: any }> = [];

    for (const source of sources) {
      if (source.data[field] !== undefined) {
        values.push({ source: source.source, value: source.data[field] });
      }
    }

    // Check if values conflict (more than 10% difference for numbers)
    if (values.length > 1) {
      const numericValues = values.filter((v) => typeof v.value === 'number');

      if (numericValues.length > 1) {
        const avg = numericValues.reduce((sum, v) => sum + v.value, 0) / numericValues.length;
        const hasConflict = numericValues.some((v) => Math.abs(v.value - avg) / avg > 0.1);

        if (hasConflict) {
          conflicts.push({ field, values });
        }
      }
    }
  }

  return conflicts;
}
