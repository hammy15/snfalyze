/**
 * AI Prompt Templates for Document Extraction
 *
 * Structured prompts for Claude to analyze SNF financial documents
 * with context from prior extractions.
 */

import type { ContextSummary, SheetStructure, SheetType } from '../types';

// ============================================================================
// SYSTEM PROMPTS
// ============================================================================

export const SYSTEM_PROMPT_STRUCTURE_ANALYSIS = `You are a skilled nursing facility (SNF) financial analyst expert. Your task is to analyze the structure of uploaded financial documents and identify:

1. **Document Type**: P&L statements, census reports, rate schedules, rent rolls, etc.
2. **Facilities**: Names/identifiers of SNF facilities in the data
3. **Time Periods**: Monthly, quarterly, annual, or TTM (trailing twelve months) periods
4. **Data Layout**: Where headers are, where data starts, column/row organization
5. **Data Quality**: Note any issues like merged cells, missing headers, formatting problems

You must output your analysis in a structured JSON format. Be precise about row and column indices (0-based).

Focus on accuracy over speed. SNF financial data is complex with many payer types and expense categories.`;

export const SYSTEM_PROMPT_DATA_EXTRACTION = `You are extracting financial data from skilled nursing facility (SNF) documents. You have expertise in:

- SNF revenue categories (Medicare Part A, Medicare Advantage, Managed Care, Medicaid, Managed Medicaid, Private Pay, VA, Hospice)
- SNF expense categories (labor, agency, dietary, housekeeping, utilities, insurance, management fees, property taxes)
- SNF metrics (EBITDAR, EBITDA, NOI, occupancy, ADC, payer mix)
- Census data (patient days by payer type, average daily census, occupancy rates)
- PPD (per patient day) rate structures by payer

Extract data precisely as shown in the document. For numbers:
- Remove currency symbols and commas
- Convert parentheses to negative (e.g., "(500)" = -500)
- Percentages should be decimals (e.g., 85% = 0.85)
- Note when values seem implausible

Assign a confidence score (0-100) based on:
- Clarity of the source cell/value
- Presence of labels/headers
- Consistency with other data points
- Your certainty about the mapping

Output in structured JSON format with all extracted values, their sources (sheet name, row, column), and confidence scores.`;

// ============================================================================
// STRUCTURE ANALYSIS PROMPTS
// ============================================================================

export function buildStructureAnalysisPrompt(params: {
  filename: string;
  fileType: 'excel' | 'pdf' | 'csv';
  sheetNames?: string[];
  sampleData: string;
  priorContext?: ContextSummary;
}): string {
  const { filename, fileType, sheetNames, sampleData, priorContext } = params;

  let contextSection = '';
  if (priorContext && priorContext.knownFacilities.length > 0) {
    contextSection = `
## Prior Context (from previous documents in this deal)

**Known Facilities:**
${priorContext.knownFacilities.map(f => `- ${f.name}${f.aliases.length > 0 ? ` (also known as: ${f.aliases.join(', ')})` : ''}`).join('\n')}

**Known Time Periods:**
${priorContext.knownPeriods.slice(0, 6).map(p => `- ${p.start.toISOString().split('T')[0]} to ${p.end.toISOString().split('T')[0]} (${p.type})`).join('\n')}

Use this context to match facility names (they may appear slightly differently in this document).
`;
  }

  return `Analyze the structure of this ${fileType.toUpperCase()} file: **${filename}**

${sheetNames ? `**Sheets:** ${sheetNames.join(', ')}` : ''}
${contextSection}
## Sample Data

\`\`\`
${sampleData}
\`\`\`

## Required Analysis

For each sheet/section, determine:

1. **Sheet Type** (one of: pl_statement, census_report, rate_schedule, summary_dashboard, rent_roll, ar_aging, chart_of_accounts, unknown)
2. **Header Row** (0-based index)
3. **Data Start Row** (0-based index)
4. **Detected Facilities** (list of facility names/identifiers found)
5. **Detected Periods** (list with type: monthly/quarterly/annual/ttm, column indices if applicable)
6. **Data Quality Assessment** (high/medium/low with notes)

Output your analysis as JSON:

\`\`\`json
{
  "sheets": [
    {
      "sheetIndex": 0,
      "sheetName": "Sheet1",
      "sheetType": "pl_statement",
      "confidence": 85,
      "headerRow": 3,
      "dataStartRow": 4,
      "dataEndRow": 50,
      "facilityColumn": 0,
      "periodColumns": [1, 2, 3],
      "detectedFacilities": ["Sunrise SNF", "Valley Care Center"],
      "detectedPeriods": [
        {"label": "Jan 2024", "type": "monthly", "columnIndex": 1, "confidence": 90},
        {"label": "Feb 2024", "type": "monthly", "columnIndex": 2, "confidence": 90}
      ],
      "detectedFields": [
        {"name": "Total Revenue", "normalizedName": "totalRevenue", "category": "revenue", "rowIndex": 5, "confidence": 95}
      ],
      "hasFormulas": true,
      "hasMergedCells": false,
      "dataQuality": "high",
      "qualityNotes": []
    }
  ],
  "detectedFacilities": ["Sunrise SNF", "Valley Care Center"],
  "suggestedProcessingOrder": [0, 1, 2],
  "overallQuality": "high",
  "analysisNotes": ["Document appears to be a monthly P&L with 3 facilities"]
}
\`\`\``;
}

// ============================================================================
// DATA EXTRACTION PROMPTS BY SHEET TYPE
// ============================================================================

export function buildExtractionPrompt(params: {
  sheetStructure: SheetStructure;
  sheetData: string;
  priorContext: ContextSummary;
  extractionFocus: ('financial' | 'census' | 'rates')[];
}): string {
  const { sheetStructure, sheetData, priorContext, extractionFocus } = params;

  const sheetTypePrompt = getSheetTypePrompt(sheetStructure.sheetType);
  const focusInstructions = getFocusInstructions(extractionFocus);

  return `Extract ${extractionFocus.join(' and ')} data from this ${sheetStructure.sheetType} sheet: **${sheetStructure.sheetName}**

## Sheet Structure (pre-analyzed)
- Header Row: ${sheetStructure.headerRow}
- Data Rows: ${sheetStructure.dataStartRow} to ${sheetStructure.dataEndRow}
- Detected Facilities: ${sheetStructure.detectedFacilities.join(', ') || 'Unknown'}
- Detected Periods: ${sheetStructure.detectedPeriods.map(p => p.label).join(', ') || 'Unknown'}

## Prior Context
${priorContext.knownFacilities.length > 0
  ? `Known Facilities: ${priorContext.knownFacilities.map(f => f.name).join(', ')}`
  : 'No facilities known yet - this may be the first document.'}

## Sheet Data

\`\`\`
${sheetData}
\`\`\`

${sheetTypePrompt}

${focusInstructions}

## Output Format

\`\`\`json
{
  "financialPeriods": [
    {
      "facilityName": "Sunrise SNF",
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "periodType": "monthly",
      "revenue": {
        "total": 1500000,
        "byPayer": {
          "medicarePartA": 450000,
          "medicareAdvantage": 200000,
          "managedCare": 150000,
          "medicaid": 500000,
          "managedMedicaid": 50000,
          "private": 100000,
          "va": 25000,
          "hospice": 15000,
          "other": 10000
        },
        "byType": {
          "roomAndBoard": 1200000,
          "ancillary": 150000,
          "therapy": 100000,
          "pharmacy": 30000,
          "other": 20000
        }
      },
      "expenses": {
        "total": 1200000,
        "labor": {
          "total": 700000,
          "core": 600000,
          "agency": 100000,
          "benefits": 120000
        },
        "operating": {
          "dietary": 80000,
          "housekeeping": 30000,
          "utilities": 25000,
          "maintenance": 20000,
          "supplies": 50000,
          "other": 15000
        },
        "fixed": {
          "insurance": 30000,
          "propertyTax": 20000,
          "managementFee": 60000,
          "rent": 0,
          "other": 10000
        }
      },
      "metrics": {
        "ebitdar": 300000,
        "ebitda": 300000,
        "noi": 300000,
        "netIncome": 200000,
        "ebitdarMargin": 0.20,
        "noiMargin": 0.20,
        "laborPercentage": 0.467,
        "agencyPercentage": 0.143
      },
      "confidence": 85,
      "sourceSheet": "P&L",
      "sourceRows": [5, 6, 7, 8, 9, 10]
    }
  ],
  "censusPeriods": [],
  "payerRates": [],
  "facilityInfo": [],
  "observations": [
    {"type": "info", "message": "Revenue breakdown by payer was derived from separate census × rate calculation"},
    {"type": "warning", "message": "Agency labor percentage (14.3%) is above industry benchmark of 10%"}
  ],
  "suggestedClarifications": [
    {"question": "Is the management fee of $60,000/month a related party transaction?", "field": "expenses.fixed.managementFee", "priority": 6}
  ]
}
\`\`\`

Extract ALL available data. Use null for fields not present. Estimate where reasonable but note lower confidence.`;
}

function getSheetTypePrompt(sheetType: SheetType): string {
  const prompts: Record<SheetType, string> = {
    pl_statement: `## P&L Statement Extraction Guidelines

This is a Profit & Loss statement. Focus on:

**Revenue Line Items to Extract:**
- Total Revenue / Net Revenue / Patient Service Revenue
- Medicare Revenue (Part A, Part B, Advantage/MA)
- Medicaid Revenue (Traditional, Managed)
- Private Pay / Self-Pay Revenue
- Other Revenue (VA, Hospice, Ancillary, Therapy)

**Expense Line Items to Extract:**
- Total Operating Expenses
- Labor: Salaries & Wages, Contract Labor/Agency, Benefits
- Operating: Dietary, Housekeeping, Utilities, Maintenance, Supplies
- Fixed: Insurance, Property Tax, Management Fee, Rent

**Metrics to Calculate or Extract:**
- EBITDAR = Revenue - Operating Expenses (before rent)
- EBITDA = EBITDAR - Rent
- NOI = EBITDA (for SNF, typically same as EBITDA)
- Margins: EBITDAR %, NOI %, Labor %`,

    census_report: `## Census Report Extraction Guidelines

This is a Census/Patient Days report. Focus on:

**Patient Days by Payer Type:**
- Medicare Part A Days (skilled)
- Medicare Advantage Days (MA, managed Medicare)
- Managed Care Days (commercial insurance)
- Medicaid Days (traditional state Medicaid)
- Managed Medicaid Days (MCO Medicaid)
- Private Pay Days (self-pay, private insurance)
- VA Contract Days
- Hospice Days
- Other Days

**Census Metrics:**
- Total Patient Days
- Average Daily Census (ADC) = Total Days / Days in Period
- Total Beds / Licensed Beds
- Occupancy Rate = ADC / Total Beds

**Payer Mix Calculations:**
- % by payer = Payer Days / Total Days
- Skilled Mix = (Medicare A + MA + Managed Care) / Total`,

    rate_schedule: `## Rate Schedule Extraction Guidelines

This is a Payer Rate schedule. Focus on:

**PPD (Per Patient Day) Rates by Payer:**
- Medicare Part A PPD (typically $550-750)
- Medicare Advantage PPD (typically $400-550)
- Managed Care PPD (typically $350-500)
- Medicaid PPD (typically $200-280, varies by state)
- Managed Medicaid PPD
- Private Pay PPD (typically $280-400)
- VA Contract PPD
- Hospice PPD

**Additional Revenue PPD:**
- Ancillary Revenue PPD
- Therapy Revenue PPD (PT/OT/SLP)

**Rate Metadata:**
- Effective Date
- Expiration Date (if stated)
- Contract Name/Payer Name`,

    summary_dashboard: `## Summary Dashboard Extraction Guidelines

This appears to be a summary or dashboard view. Extract:

- Key performance metrics (revenue, expenses, NOI, occupancy)
- Facility-level summaries
- Trend data if available
- Any KPIs or benchmarks

Watch for:
- Consolidated vs. facility-level data
- YTD vs. monthly figures
- Annualized projections`,

    rent_roll: `## Rent Roll Extraction Guidelines

This is a rent roll. Extract:
- Facility names and identifiers
- Annual rent amounts
- Rent escalation terms
- Lease expiration dates
- Triple-net (NNN) vs gross lease terms

Note: Rent data is used to calculate EBITDA from EBITDAR.`,

    ar_aging: `## AR Aging Extraction Guidelines

This is an Accounts Receivable aging report. Extract:
- Total AR by payer
- AR aging buckets (0-30, 31-60, 61-90, 90+ days)
- Any specific notes on collections

AR data helps validate census and revenue figures.`,

    chart_of_accounts: `## Chart of Accounts Extraction Guidelines

This is a Chart of Accounts. Extract:
- Account codes and descriptions
- Account categories (revenue, expense, asset, liability)
- Mapping to standard SNF categories

This helps with future document processing.`,

    unknown: `## Unknown Document Type

Unable to determine document type. Attempt to extract:
- Any financial metrics (revenue, expenses)
- Any census/occupancy data
- Any rate information
- Facility names and time periods

Flag this document for manual review.`,
  };

  return prompts[sheetType] || prompts.unknown;
}

function getFocusInstructions(focus: ('financial' | 'census' | 'rates')[]): string {
  const instructions: string[] = [];

  if (focus.includes('financial')) {
    instructions.push(`**Financial Focus:** Prioritize revenue line items, expense categories, and calculated metrics (EBITDAR, NOI). Map line items to standard categories.`);
  }

  if (focus.includes('census')) {
    instructions.push(`**Census Focus:** Extract patient days by payer type precisely. Calculate ADC and occupancy if not provided. Determine payer mix percentages.`);
  }

  if (focus.includes('rates')) {
    instructions.push(`**Rates Focus:** Extract PPD rates by payer type. Note effective dates. Calculate weighted average rate if possible.`);
  }

  return instructions.join('\n\n');
}

// ============================================================================
// VALIDATION PROMPTS
// ============================================================================

export function buildValidationPrompt(params: {
  extractedData: {
    revenue: number;
    calculatedRevenue: number;
    variance: number;
    censusDays: Record<string, number>;
    rates: Record<string, number>;
  };
  facilityName: string;
  periodLabel: string;
}): string {
  const { extractedData, facilityName, periodLabel } = params;

  return `Review this revenue reconciliation for **${facilityName}** (${periodLabel}):

## Reported vs Calculated Revenue

| Metric | Value |
|--------|-------|
| Reported Total Revenue | $${extractedData.revenue.toLocaleString()} |
| Calculated Revenue (Census × Rates) | $${extractedData.calculatedRevenue.toLocaleString()} |
| Variance | $${Math.abs(extractedData.variance).toLocaleString()} (${(Math.abs(extractedData.variance / extractedData.revenue) * 100).toFixed(1)}%) |

## Census Days by Payer
${Object.entries(extractedData.censusDays).map(([payer, days]) => `- ${payer}: ${days.toLocaleString()} days`).join('\n')}

## PPD Rates by Payer
${Object.entries(extractedData.rates).map(([payer, rate]) => `- ${payer}: $${rate.toFixed(2)}/day`).join('\n')}

## Analysis Required

1. Is this variance within acceptable range (typically <5%)?
2. What might explain the variance? (ancillary revenue, bad debt, rate changes mid-period)
3. Which value (reported or calculated) is likely more accurate?
4. Should we flag this for user clarification?

Output JSON:
\`\`\`json
{
  "varianceExplanation": "...",
  "recommendedAction": "accept_reported" | "accept_calculated" | "request_clarification",
  "confidence": 0-100,
  "suggestedValue": number | null,
  "notes": "..."
}
\`\`\``;
}

// ============================================================================
// CONFLICT RESOLUTION PROMPT
// ============================================================================

export function buildConflictResolutionPrompt(params: {
  field: string;
  values: { value: number; source: string; confidence: number }[];
  benchmarkRange?: { min: number; max: number; median: number };
  facilityContext?: string;
}): string {
  const { field, values, benchmarkRange, facilityContext } = params;

  return `Resolve this data conflict for field: **${field}**

## Conflicting Values

${values.map((v, i) => `${i + 1}. **${v.source}**: $${v.value.toLocaleString()} (confidence: ${v.confidence}%)`).join('\n')}

${benchmarkRange ? `
## Industry Benchmark Range
- Minimum: $${benchmarkRange.min.toLocaleString()}
- Median: $${benchmarkRange.median.toLocaleString()}
- Maximum: $${benchmarkRange.max.toLocaleString()}
` : ''}

${facilityContext ? `## Facility Context\n${facilityContext}` : ''}

## Resolution Options

1. **Use highest confidence value**: Pick the value with highest extraction confidence
2. **Use average**: Average of all values
3. **Use benchmark-aligned**: Pick value closest to industry median
4. **Request clarification**: Flag for user review

Output JSON:
\`\`\`json
{
  "recommendedValue": number,
  "resolutionMethod": "highest_confidence" | "average" | "benchmark_aligned" | "request_clarification",
  "reasoning": "...",
  "confidence": 0-100
}
\`\`\``;
}

export default {
  SYSTEM_PROMPT_STRUCTURE_ANALYSIS,
  SYSTEM_PROMPT_DATA_EXTRACTION,
  buildStructureAnalysisPrompt,
  buildExtractionPrompt,
  buildValidationPrompt,
  buildConflictResolutionPrompt,
};
