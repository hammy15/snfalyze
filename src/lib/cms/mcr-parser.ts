/**
 * Medicare Cost Report (MCR) Parser
 *
 * Parses CMS HCRIS Public Use Files (CSV) to extract
 * financial data for skilled nursing facilities.
 *
 * Data source: https://www.cms.gov/Research-Statistics-Data-and-Systems/Downloadable-Public-Use-Files/Cost-Reports
 */

import Papa from 'papaparse';

export interface MCRRawRecord {
  rpt_rec_num: string;
  prvdr_ctrl_type_cd: string;
  prvdr_num: string; // CCN
  npi: string;
  rpt_stus_cd: string;
  fy_bgn_dt: string;
  fy_end_dt: string;
  proc_dt: string;
  initl_rpt_sw: string;
  last_rpt_sw: string;
  trnsmtl_num: string;
  fi_num: string;
  adr_vndr_cd: string;
  fi_creat_dt: string;
  util_cd: string;
  npr_dt: string;
  spec_ind: string;
  fi_rcpt_dt: string;
}

export interface MCRNumericRecord {
  rpt_rec_num: string;
  wksht_cd: string;
  line_num: string;
  clmn_num: string;
  itm_val_num: string;
}

export interface ParsedMCRData {
  ccn: string;
  providerName?: string;
  fiscalYearBegin: string;
  fiscalYearEnd: string;
  reportStatus: string;
  totalBeds?: number;
  totalPatientDays?: number;
  medicareDays?: number;
  medicaidDays?: number;
  totalCosts?: number;
  netPatientRevenue?: number;
  medicareRevenue?: number;
  medicaidRevenue?: number;
  totalSalaries?: number;
  contractLaborCost?: number;
  rentCost?: number;
  depreciationCost?: number;
  costPerDay?: number;
  rawData: Record<string, unknown>;
}

// Worksheet codes for extracting specific data
// Note: These are reference mappings; actual extraction uses direct lookups
const WORKSHEET_MAPPINGS = {
  // Worksheet S-3, Part I - Statistical Data (Beds, Days)
  'S300001_BEDS': { line: '001', col: '001', field: 'totalBeds', description: 'Total Beds Available' },
  'S300001_DAYS': { line: '001', col: '002', field: 'totalPatientDays', description: 'Total Inpatient Days' },

  // Medicare/Medicaid Days
  'S300001_MCR': { line: '001', col: '003', field: 'medicareDays', description: 'Medicare Days' },
  'S300001_MCD': { line: '001', col: '005', field: 'medicaidDays', description: 'Medicaid Days' },

  // Worksheet G-2 - Revenue Data
  'G200001': { field: 'netPatientRevenue', description: 'Net Patient Revenue' },
  'G200001_MCR': { field: 'medicareRevenue', description: 'Medicare Revenue' },
  'G200001_MCD': { field: 'medicaidRevenue', description: 'Medicaid Revenue' },

  // Worksheet A - Cost Data
  'A000001': { field: 'totalCosts', description: 'Total Costs' },
  'A000001_SAL': { field: 'totalSalaries', description: 'Total Salaries' },
  'A000001_CON': { field: 'contractLaborCost', description: 'Contract Labor' },
  'A000001_RNT': { field: 'rentCost', description: 'Rent Expense' },
  'A000001_DEP': { field: 'depreciationCost', description: 'Depreciation' },
};

/**
 * Parse MCR Report records (RPT file)
 */
export function parseMCRReportFile(csvContent: string): MCRRawRecord[] {
  const result = Papa.parse<MCRRawRecord>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  });

  if (result.errors.length > 0) {
    console.warn('MCR Report parse warnings:', result.errors);
  }

  return result.data;
}

/**
 * Parse MCR Numeric records (NMRC file)
 */
export function parseMCRNumericFile(csvContent: string): MCRNumericRecord[] {
  const result = Papa.parse<MCRNumericRecord>(csvContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.toLowerCase().trim(),
  });

  if (result.errors.length > 0) {
    console.warn('MCR Numeric parse warnings:', result.errors);
  }

  return result.data;
}

/**
 * Extract specific value from numeric records
 */
function extractValue(
  numericRecords: MCRNumericRecord[],
  reportNum: string,
  worksheetCode: string,
  lineNum: string,
  colNum: string
): number | undefined {
  const record = numericRecords.find(
    (r) =>
      r.rpt_rec_num === reportNum &&
      r.wksht_cd === worksheetCode &&
      r.line_num === lineNum &&
      r.clmn_num === colNum
  );

  if (!record || !record.itm_val_num) return undefined;

  const value = parseFloat(record.itm_val_num);
  return isNaN(value) ? undefined : value;
}

/**
 * Build numeric record lookup map for efficient access
 */
function buildNumericLookup(
  numericRecords: MCRNumericRecord[]
): Map<string, number> {
  const lookup = new Map<string, number>();

  for (const record of numericRecords) {
    if (record.itm_val_num) {
      const key = `${record.rpt_rec_num}:${record.wksht_cd}:${record.line_num}:${record.clmn_num}`;
      const value = parseFloat(record.itm_val_num);
      if (!isNaN(value)) {
        lookup.set(key, value);
      }
    }
  }

  return lookup;
}

/**
 * Extract financial data for a specific provider from MCR files
 */
export function extractProviderMCRData(
  reportRecords: MCRRawRecord[],
  numericRecords: MCRNumericRecord[],
  ccn: string
): ParsedMCRData[] {
  const normalizedCCN = ccn.replace(/\D/g, '').padStart(6, '0');

  // Find all reports for this provider
  const providerReports = reportRecords.filter(
    (r) => r.prvdr_num?.replace(/\D/g, '') === normalizedCCN
  );

  if (providerReports.length === 0) return [];

  // Build lookup for efficient value extraction
  const numericLookup = buildNumericLookup(numericRecords);

  return providerReports.map((report) => {
    const reportNum = report.rpt_rec_num;

    // Helper to get value from lookup
    const getValue = (worksheet: string, line: string, col: string): number | undefined => {
      return numericLookup.get(`${reportNum}:${worksheet}:${line}:${col}`);
    };

    // Extract key financial metrics
    // Note: Exact worksheet/line/column codes vary by cost report version
    // These are common patterns for SNF cost reports

    const totalBeds = getValue('S300001', '00100', '00100');
    const totalPatientDays = getValue('S300001', '00100', '00200');
    const medicareDays = getValue('S300001', '00100', '00300');
    const medicaidDays = getValue('S300001', '00100', '00500');

    const totalCosts = getValue('A000001', '00117', '00700');
    const netPatientRevenue = getValue('G200001', '00100', '00100');
    const totalSalaries = getValue('A000001', '00117', '00100');

    // Calculate cost per day if we have the data
    const costPerDay = totalCosts && totalPatientDays && totalPatientDays > 0
      ? totalCosts / totalPatientDays
      : undefined;

    return {
      ccn: normalizedCCN,
      fiscalYearBegin: report.fy_bgn_dt,
      fiscalYearEnd: report.fy_end_dt,
      reportStatus: report.rpt_stus_cd,
      totalBeds,
      totalPatientDays,
      medicareDays,
      medicaidDays,
      totalCosts,
      netPatientRevenue,
      totalSalaries,
      costPerDay,
      rawData: {
        reportNum,
        controlType: report.prvdr_ctrl_type_cd,
        processDate: report.proc_dt,
        utilCode: report.util_cd,
      },
    };
  });
}

/**
 * Parse a combined MCR CSV file (simpler format often used for analysis)
 */
export function parseCombinedMCRFile(csvContent: string): ParsedMCRData[] {
  const result = Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    transformHeader: (header) => header.toLowerCase().trim().replace(/\s+/g, '_'),
  });

  if (result.errors.length > 0) {
    console.warn('Combined MCR parse warnings:', result.errors);
  }

  return (result.data as Record<string, unknown>[]).map((row) => ({
    ccn: String(row.provider_ccn || row.prvdr_num || '').padStart(6, '0'),
    providerName: String(row.provider_name || row.facility_name || ''),
    fiscalYearBegin: String(row.fy_begin_dt || row.fiscal_year_begin || ''),
    fiscalYearEnd: String(row.fy_end_dt || row.fiscal_year_end || ''),
    reportStatus: String(row.rpt_stus_cd || row.report_status || ''),
    totalBeds: typeof row.total_beds === 'number' ? row.total_beds : undefined,
    totalPatientDays: typeof row.total_patient_days === 'number' ? row.total_patient_days : undefined,
    medicareDays: typeof row.medicare_days === 'number' ? row.medicare_days : undefined,
    medicaidDays: typeof row.medicaid_days === 'number' ? row.medicaid_days : undefined,
    totalCosts: typeof row.total_costs === 'number' ? row.total_costs : undefined,
    netPatientRevenue: typeof row.net_patient_revenue === 'number' ? row.net_patient_revenue : undefined,
    medicareRevenue: typeof row.medicare_revenue === 'number' ? row.medicare_revenue : undefined,
    medicaidRevenue: typeof row.medicaid_revenue === 'number' ? row.medicaid_revenue : undefined,
    totalSalaries: typeof row.total_salaries === 'number' ? row.total_salaries : undefined,
    contractLaborCost: typeof row.contract_labor_cost === 'number' ? row.contract_labor_cost : undefined,
    rentCost: typeof row.rent_cost === 'number' ? row.rent_cost : undefined,
    depreciationCost: typeof row.depreciation_cost === 'number' ? row.depreciation_cost : undefined,
    costPerDay: typeof row.cost_per_day === 'number' ? row.cost_per_day : undefined,
    rawData: row,
  }));
}

/**
 * Get the most recent MCR data for a provider
 */
export function getMostRecentMCR(data: ParsedMCRData[]): ParsedMCRData | undefined {
  if (data.length === 0) return undefined;

  return data.sort((a, b) => {
    const dateA = new Date(a.fiscalYearEnd).getTime();
    const dateB = new Date(b.fiscalYearEnd).getTime();
    return dateB - dateA; // Most recent first
  })[0];
}
