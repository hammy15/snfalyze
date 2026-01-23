// =============================================================================
// TABLE EXTRACTOR - Extract and normalize financial tables from documents
// =============================================================================

import type { TableExtraction, RevenueCategory, ExpenseCategory } from '../types';
import type { RawTable } from './pdf-parser';

// =============================================================================
// TYPES
// =============================================================================

export interface TableExtractionOptions {
  minRows?: number;
  minColumns?: number;
  requireNumericData?: boolean;
  tableTypes?: TableType[];
}

export type TableType =
  | 'income_statement'
  | 'balance_sheet'
  | 'census_report'
  | 'rent_roll'
  | 'staffing_report'
  | 'payer_mix'
  | 'quality_metrics'
  | 'capital_expenditure'
  | 'unknown';

export interface NormalizedTable {
  type: TableType;
  headers: NormalizedHeader[];
  rows: NormalizedRow[];
  totals?: Record<string, number>;
  period?: {
    start?: string;
    end?: string;
    type?: 'month' | 'quarter' | 'year' | 'trailing_12';
  };
  confidence: number;
}

export interface NormalizedHeader {
  original: string;
  normalized: string;
  columnType: 'label' | 'amount' | 'count' | 'rate' | 'percentage' | 'date' | 'text';
  periodLabel?: string;
}

export interface NormalizedRow {
  original: string[];
  label: string;
  normalizedLabel?: string;
  categoryMapping?: {
    revenueCategory?: RevenueCategory;
    expenseCategory?: ExpenseCategory;
  };
  values: {
    column: string;
    rawValue: string;
    parsedValue: number | string | null;
    type: 'currency' | 'number' | 'percentage' | 'text';
  }[];
  isTotal?: boolean;
  isSubtotal?: boolean;
  indentLevel?: number;
}

// =============================================================================
// TABLE EXTRACTOR CLASS
// =============================================================================

export class TableExtractor {
  private options: Required<TableExtractionOptions>;

  constructor(options: TableExtractionOptions = {}) {
    this.options = {
      minRows: options.minRows ?? 3,
      minColumns: options.minColumns ?? 2,
      requireNumericData: options.requireNumericData ?? true,
      tableTypes: options.tableTypes ?? [
        'income_statement',
        'balance_sheet',
        'census_report',
        'rent_roll',
        'staffing_report',
        'payer_mix',
      ],
    };
  }

  /**
   * Extract and normalize tables from raw table data
   */
  extractAll(rawTables: RawTable[]): TableExtraction[] {
    const extractions: TableExtraction[] = [];

    for (const rawTable of rawTables) {
      if (this.isValidTable(rawTable)) {
        const extraction = this.extractTable(rawTable);
        if (extraction) {
          extractions.push(extraction);
        }
      }
    }

    return extractions;
  }

  /**
   * Extract and normalize a single table
   */
  extractTable(rawTable: RawTable): TableExtraction | null {
    const { rows } = rawTable;

    if (rows.length < this.options.minRows) {
      return null;
    }

    // Identify headers (usually first row, sometimes first two rows)
    const { headers, dataStartRow } = this.identifyHeaders(rows);

    if (headers.length < this.options.minColumns) {
      return null;
    }

    // Determine table type
    const tableType = this.classifyTable(headers, rows.slice(dataStartRow));

    // Create extraction
    const extraction: TableExtraction = {
      tableId: `table-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      page: rawTable.pageNumber,
      headers: headers.map((h) => h.original),
      rows: rows.slice(dataStartRow),
      confidence: rawTable.confidence,
      mappedTo: this.getMappingTarget(tableType),
    };

    return extraction;
  }

  /**
   * Normalize a table for financial analysis
   */
  normalizeTable(rawTable: RawTable): NormalizedTable | null {
    const { rows } = rawTable;

    if (rows.length < this.options.minRows) {
      return null;
    }

    const { headers: headerInfo, dataStartRow } = this.identifyHeaders(rows);
    const tableType = this.classifyTable(
      headerInfo,
      rows.slice(dataStartRow)
    );

    const normalizedHeaders = headerInfo;
    const normalizedRows: NormalizedRow[] = [];

    for (const row of rows.slice(dataStartRow)) {
      const normalizedRow = this.normalizeRow(row, normalizedHeaders, tableType);
      if (normalizedRow) {
        normalizedRows.push(normalizedRow);
      }
    }

    // Extract totals
    const totals = this.extractTotals(normalizedRows);

    // Detect period from headers or content
    const period = this.detectPeriod(normalizedHeaders, rows);

    return {
      type: tableType,
      headers: normalizedHeaders,
      rows: normalizedRows,
      totals,
      period,
      confidence: this.calculateConfidence(normalizedRows, tableType),
    };
  }

  /**
   * Check if raw table meets minimum requirements
   */
  private isValidTable(rawTable: RawTable): boolean {
    const { rows } = rawTable;

    if (rows.length < this.options.minRows) {
      return false;
    }

    const maxColumns = Math.max(...rows.map((r) => r.length));
    if (maxColumns < this.options.minColumns) {
      return false;
    }

    if (this.options.requireNumericData) {
      // Check if table has numeric data (skip first row which might be headers)
      let hasNumeric = false;
      for (let i = 1; i < rows.length && !hasNumeric; i++) {
        for (const cell of rows[i]) {
          if (/[\d$]/.test(cell)) {
            hasNumeric = true;
            break;
          }
        }
      }
      if (!hasNumeric) {
        return false;
      }
    }

    return true;
  }

  /**
   * Identify header rows and normalize them
   */
  private identifyHeaders(rows: string[][]): {
    headers: NormalizedHeader[];
    dataStartRow: number;
  } {
    if (rows.length === 0) {
      return { headers: [], dataStartRow: 0 };
    }

    const firstRow = rows[0];
    const secondRow = rows[1];

    // Check if first row looks like headers (mostly text, no heavy numeric content)
    const firstRowNumericRatio = this.getNumericRatio(firstRow);

    // If second row exists and has more text than first, might be multi-row header
    const isMultiRowHeader =
      secondRow && firstRowNumericRatio < 0.3 && this.getNumericRatio(secondRow) < 0.3;

    let headerRow: string[];
    let dataStartRow: number;

    if (isMultiRowHeader) {
      // Combine first two rows for headers
      headerRow = firstRow.map((cell, i) => {
        const secondCell = secondRow[i] || '';
        return cell && secondCell ? `${cell} ${secondCell}` : cell || secondCell;
      });
      dataStartRow = 2;
    } else {
      headerRow = firstRow;
      dataStartRow = 1;
    }

    // Normalize headers
    const headers: NormalizedHeader[] = headerRow.map((original) => ({
      original,
      normalized: this.normalizeHeaderText(original),
      columnType: this.detectColumnType(original),
      periodLabel: this.extractPeriodFromHeader(original),
    }));

    return { headers, dataStartRow };
  }

  /**
   * Get ratio of cells with numeric content
   */
  private getNumericRatio(row: string[]): number {
    if (row.length === 0) return 0;
    const numericCount = row.filter((cell) => /^\s*[\d$,.\-()%]+\s*$/.test(cell)).length;
    return numericCount / row.length;
  }

  /**
   * Normalize header text for matching
   */
  private normalizeHeaderText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }

  /**
   * Detect the type of data in a column
   */
  private detectColumnType(header: string): NormalizedHeader['columnType'] {
    const lower = header.toLowerCase();

    if (/amount|total|revenue|expense|cost|income|fee|price|\$/i.test(lower)) {
      return 'amount';
    }
    if (/count|number|beds|units|days|residents/i.test(lower)) {
      return 'count';
    }
    if (/%|percent|rate|ratio/i.test(lower)) {
      return 'percentage';
    }
    if (/hppd|per\s*(day|bed|unit)/i.test(lower)) {
      return 'rate';
    }
    if (/date|period|month|year|quarter/i.test(lower)) {
      return 'date';
    }
    if (/description|name|category|item|account/i.test(lower)) {
      return 'label';
    }

    return 'text';
  }

  /**
   * Extract period information from header
   */
  private extractPeriodFromHeader(header: string): string | undefined {
    // Match patterns like "Jan 2024", "Q1 2024", "FY 2024", "2024", "12/31/2024"
    const patterns = [
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*\d{4}/i,
      /\bq[1-4]\s*\d{4}/i,
      /\bfy\s*\d{4}/i,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      /\b20\d{2}\b/,
    ];

    for (const pattern of patterns) {
      const match = header.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Classify the type of financial table
   */
  private classifyTable(headers: NormalizedHeader[], dataRows: string[][]): TableType {
    const headerText = headers.map((h) => h.normalized).join(' ');
    const allText = [
      headerText,
      ...dataRows.slice(0, 5).map((row) => row.join(' ')),
    ]
      .join(' ')
      .toLowerCase();

    // Income Statement indicators
    const incomeStatementKeywords = [
      'revenue',
      'income',
      'expense',
      'operating',
      'net income',
      'gross profit',
      'ebitda',
      'ebitdar',
      'cost of',
      'total expenses',
    ];
    if (incomeStatementKeywords.some((kw) => allText.includes(kw))) {
      return 'income_statement';
    }

    // Balance Sheet indicators
    const balanceSheetKeywords = [
      'assets',
      'liabilities',
      'equity',
      'current assets',
      'fixed assets',
      'accounts receivable',
      'accounts payable',
    ];
    if (balanceSheetKeywords.some((kw) => allText.includes(kw))) {
      return 'balance_sheet';
    }

    // Census Report indicators
    const censusKeywords = [
      'census',
      'occupancy',
      'beds',
      'patient days',
      'resident',
      'admissions',
      'discharges',
    ];
    if (censusKeywords.some((kw) => allText.includes(kw))) {
      return 'census_report';
    }

    // Rent Roll indicators
    const rentRollKeywords = [
      'rent roll',
      'tenant',
      'unit',
      'lease',
      'monthly rent',
      'move in',
      'expiration',
    ];
    if (rentRollKeywords.some((kw) => allText.includes(kw))) {
      return 'rent_roll';
    }

    // Staffing Report indicators
    const staffingKeywords = [
      'staffing',
      'hppd',
      'fte',
      'hours',
      'rn',
      'lpn',
      'cna',
      'nurse',
      'employee',
    ];
    if (staffingKeywords.some((kw) => allText.includes(kw))) {
      return 'staffing_report';
    }

    // Payer Mix indicators
    const payerMixKeywords = [
      'payer',
      'medicare',
      'medicaid',
      'private pay',
      'insurance',
      'managed care',
      'mix',
    ];
    if (payerMixKeywords.some((kw) => allText.includes(kw))) {
      return 'payer_mix';
    }

    // Quality Metrics indicators
    const qualityKeywords = [
      'quality',
      'deficiency',
      'star rating',
      'cms',
      'survey',
      'complaint',
      'measure',
    ];
    if (qualityKeywords.some((kw) => allText.includes(kw))) {
      return 'quality_metrics';
    }

    // Capital Expenditure indicators
    const capexKeywords = [
      'capital',
      'capex',
      'improvement',
      'renovation',
      'equipment',
      'project',
      'budget',
    ];
    if (capexKeywords.some((kw) => allText.includes(kw))) {
      return 'capital_expenditure';
    }

    return 'unknown';
  }

  /**
   * Get the target data structure for table type
   */
  private getMappingTarget(tableType: TableType): string | undefined {
    const mappings: Record<TableType, string | undefined> = {
      income_statement: 'FinancialStatement',
      balance_sheet: 'BalanceSheet',
      census_report: 'OperatingMetrics',
      rent_roll: 'RentRoll',
      staffing_report: 'OperatingMetrics.staffing',
      payer_mix: 'OperatingMetrics.payerMix',
      quality_metrics: 'CMSData.qualityMeasures',
      capital_expenditure: 'CapitalExpenditures',
      unknown: undefined,
    };

    return mappings[tableType];
  }

  /**
   * Normalize a single row
   */
  private normalizeRow(
    row: string[],
    headers: NormalizedHeader[],
    tableType: TableType
  ): NormalizedRow | null {
    if (row.length === 0 || row.every((cell) => !cell.trim())) {
      return null;
    }

    const label = row[0]?.trim() || '';
    const isTotal = /^total|^subtotal|^grand total/i.test(label);
    const isSubtotal = /subtotal/i.test(label);
    const indentLevel = this.detectIndentLevel(row[0] || '');

    const values = row.slice(1).map((cell, index) => {
      const header = headers[index + 1];
      const parsed = this.parseCell(cell, header?.columnType || 'text');
      return {
        column: header?.normalized || `column_${index + 1}`,
        rawValue: cell,
        parsedValue: parsed.value,
        type: parsed.type,
      };
    });

    const categoryMapping = tableType === 'income_statement'
      ? this.mapToCategory(label)
      : undefined;

    return {
      original: row,
      label,
      normalizedLabel: this.normalizeLabel(label),
      categoryMapping,
      values,
      isTotal,
      isSubtotal,
      indentLevel,
    };
  }

  /**
   * Detect indent level from whitespace
   */
  private detectIndentLevel(text: string): number {
    const match = text.match(/^(\s*)/);
    if (match) {
      return Math.floor(match[1].length / 2);
    }
    return 0;
  }

  /**
   * Parse a cell value
   */
  private parseCell(
    cell: string,
    expectedType: NormalizedHeader['columnType']
  ): { value: number | string | null; type: NormalizedRow['values'][0]['type'] } {
    const trimmed = cell.trim();

    if (!trimmed || trimmed === '-' || trimmed === 'N/A') {
      return { value: null, type: 'text' };
    }

    // Check for percentage
    if (trimmed.includes('%')) {
      const num = parseFloat(trimmed.replace(/[^0-9.\-]/g, ''));
      if (!isNaN(num)) {
        return { value: num / 100, type: 'percentage' };
      }
    }

    // Check for currency/number
    if (/[\d$,.\-()]/.test(trimmed)) {
      // Handle parentheses as negative
      const isNegative = trimmed.includes('(') && trimmed.includes(')');
      let numStr = trimmed.replace(/[$,()]/g, '');
      const num = parseFloat(numStr);
      if (!isNaN(num)) {
        const finalValue = isNegative ? -Math.abs(num) : num;
        const isCurrency = trimmed.includes('$') || expectedType === 'amount';
        return {
          value: finalValue,
          type: isCurrency ? 'currency' : 'number',
        };
      }
    }

    return { value: trimmed, type: 'text' };
  }

  /**
   * Normalize a label for matching
   */
  private normalizeLabel(label: string): string {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .trim();
  }

  /**
   * Map a line item label to revenue or expense category
   */
  private mapToCategory(label: string): NormalizedRow['categoryMapping'] {
    const normalized = this.normalizeLabel(label);

    // Revenue mappings
    const revenueMappings: Record<string, RevenueCategory> = {
      medicare_part_a: 'medicare_part_a',
      medicare_a: 'medicare_part_a',
      skilled_nursing: 'medicare_part_a',
      medicare_part_b: 'medicare_part_b',
      medicare_b: 'medicare_part_b',
      therapy: 'medicare_part_b',
      medicare_advantage: 'medicare_advantage',
      managed_medicare: 'medicare_advantage',
      medicaid: 'medicaid',
      medicaid_nursing: 'medicaid',
      private_pay: 'private_pay',
      private: 'private_pay',
      self_pay: 'private_pay',
      managed_care: 'managed_care',
      insurance: 'managed_care',
      va: 'va_contract',
      veteran: 'va_contract',
      hospice: 'hospice',
      respite: 'respite',
      ancillary: 'other_ancillary',
      pharmacy: 'pharmacy_ancillary',
      other_revenue: 'other_revenue',
    };

    for (const [key, category] of Object.entries(revenueMappings)) {
      if (normalized.includes(key)) {
        return { revenueCategory: category };
      }
    }

    // Expense mappings
    const expenseMappings: Record<string, ExpenseCategory> = {
      nursing_salary: 'nursing_salaries',
      nurse_salary: 'nursing_salaries',
      rn_salary: 'nursing_salaries',
      nursing_wage: 'nursing_wages',
      agency: 'agency_nursing',
      contract_labor: 'agency_nursing',
      benefits: 'employee_benefits',
      health_insurance: 'employee_benefits',
      payroll_tax: 'payroll_taxes',
      dietary: 'dietary',
      food_service: 'dietary',
      housekeeping: 'housekeeping',
      laundry: 'laundry',
      activities: 'activities',
      social_service: 'social_services',
      medical_supplies: 'medical_supplies',
      supplies: 'general_supplies',
      utilities: 'utilities',
      electric: 'utilities',
      gas: 'utilities',
      water: 'utilities',
      telephone: 'telephone',
      liability_insurance: 'insurance_liability',
      property_insurance: 'insurance_property',
      workers_comp: 'insurance_workers_comp',
      property_tax: 'property_tax',
      real_estate_tax: 'property_tax',
      management_fee: 'management_fee',
      marketing: 'marketing',
      advertising: 'marketing',
      maintenance: 'maintenance_repairs',
      repairs: 'maintenance_repairs',
      admin: 'administration',
      general_admin: 'administration',
      professional_fee: 'professional_fees',
      legal: 'professional_fees',
      accounting: 'professional_fees',
      technology: 'technology',
      it: 'technology',
      software: 'technology',
      bad_debt: 'bad_debt',
      rent: 'rent',
      lease: 'rent',
      depreciation: 'depreciation',
      amortization: 'amortization',
      interest: 'interest',
    };

    for (const [key, category] of Object.entries(expenseMappings)) {
      if (normalized.includes(key)) {
        return { expenseCategory: category };
      }
    }

    return undefined;
  }

  /**
   * Extract totals from normalized rows
   */
  private extractTotals(rows: NormalizedRow[]): Record<string, number> {
    const totals: Record<string, number> = {};

    for (const row of rows) {
      if (row.isTotal && !row.isSubtotal) {
        for (const value of row.values) {
          if (typeof value.parsedValue === 'number') {
            totals[value.column] = value.parsedValue;
          }
        }
      }
    }

    return totals;
  }

  /**
   * Detect period from headers or content
   */
  private detectPeriod(
    headers: NormalizedHeader[],
    rows: string[][]
  ): NormalizedTable['period'] {
    // Check headers for period information
    for (const header of headers) {
      if (header.periodLabel) {
        return {
          end: header.periodLabel,
          type: this.detectPeriodType(header.periodLabel),
        };
      }
    }

    // Check first few rows for period mentions
    const allText = rows.slice(0, 3).flat().join(' ');
    const yearMatch = allText.match(/(?:fy|fiscal year|year ended?)\s*(\d{4})/i);
    if (yearMatch) {
      return {
        end: yearMatch[1],
        type: 'year',
      };
    }

    const quarterMatch = allText.match(/q([1-4])\s*(\d{4})/i);
    if (quarterMatch) {
      return {
        end: `Q${quarterMatch[1]} ${quarterMatch[2]}`,
        type: 'quarter',
      };
    }

    return undefined;
  }

  /**
   * Detect the type of period from a string
   */
  private detectPeriodType(periodLabel: string): 'month' | 'quarter' | 'year' | 'trailing_12' {
    const lower = periodLabel.toLowerCase();

    if (/q[1-4]/i.test(lower)) return 'quarter';
    if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(lower)) return 'month';
    if (/trailing|ttm|t12/i.test(lower)) return 'trailing_12';

    return 'year';
  }

  /**
   * Calculate confidence score for normalized table
   */
  private calculateConfidence(rows: NormalizedRow[], tableType: TableType): number {
    if (rows.length === 0) return 0;

    let score = 0;

    // Base score for having rows
    score += Math.min(rows.length / 20, 0.3); // Up to 30% for row count

    // Score for mapped categories
    const mappedRows = rows.filter((r) => r.categoryMapping);
    score += (mappedRows.length / rows.length) * 0.3; // Up to 30% for category mapping

    // Score for parsed numeric values
    let totalValues = 0;
    let parsedValues = 0;
    for (const row of rows) {
      for (const value of row.values) {
        totalValues++;
        if (value.parsedValue !== null) {
          parsedValues++;
        }
      }
    }
    if (totalValues > 0) {
      score += (parsedValues / totalValues) * 0.2; // Up to 20% for parsing success
    }

    // Score for table type identification
    if (tableType !== 'unknown') {
      score += 0.2; // 20% for successful type identification
    }

    return Math.min(score, 1);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const tableExtractor = new TableExtractor();
