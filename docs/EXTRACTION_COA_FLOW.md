# SNFalyze Data Extraction & COA Mapping Flow

## Overview

This document details the complete flow from document upload through financial data extraction, COA mapping, and database population for deal analysis.

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           DOCUMENT INGESTION                                  │
│  ┌─────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐  │
│  │ Upload  │ -> │ Classify    │ -> │ Store in DB  │ -> │ Queue for       │  │
│  │ Files   │    │ Doc Type    │    │ (documents)  │    │ Extraction      │  │
│  └─────────┘    └─────────────┘    └──────────────┘    └─────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                        AI EXTRACTION PIPELINE                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Structure   │->│ Extraction  │->│ Validation  │->│ Clarification      │ │
│  │ Pass        │  │ Pass        │  │ Pass        │  │ Queue              │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           COA MAPPING ENGINE                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Auto-Match  │->│ Learned     │->│ Fuzzy       │->│ Manual Review      │ │
│  │ (95%)       │  │ Patterns    │  │ Match       │  │ & Learning         │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                          DATABASE POPULATION                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Financial   │  │ Census      │  │ Payer       │  │ Deal COA           │ │
│  │ Periods     │  │ Periods     │  │ Rates       │  │ Mappings           │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PRO FORMA GENERATION                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │ Mapped line items → Revenue/Expense categories → Scenario modeling     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Document Upload & Classification

### 1.1 Supported Document Types

| Document Type | File Formats | Key Data Extracted |
|--------------|--------------|-------------------|
| **Financial Statement (P&L)** | Excel, PDF, CSV | Revenue by payer, expenses by category, NOI, EBITDAR |
| **Census Report** | Excel, CSV | Patient days by payer, ADC, occupancy rates |
| **Rate Schedule** | Excel, PDF | PPD rates by payer type |
| **Rent Roll** | Excel | Unit mix, rates, vacancy |
| **AR Aging** | Excel | Receivables by age bucket, write-offs |
| **Survey Reports** | PDF | Quality ratings, deficiencies |

### 1.2 Upload Flow

```typescript
// API: POST /api/deals/[dealId]/documents
{
  files: File[],           // Uploaded files
  folderId?: string,       // Optional folder organization
  userConfirmedType?: string  // User-specified type override
}

// Response
{
  documents: [
    {
      id: "uuid",
      filename: "2024_PL.xlsx",
      type: "financial_statement",  // Auto-detected or user-specified
      status: "uploaded",
      uploadedAt: "2024-01-15T..."
    }
  ]
}
```

### 1.3 Auto-Classification Logic

```
Filename patterns → Document type inference:
- Contains "P&L", "Income", "Financial" → financial_statement
- Contains "Census", "Days", "ADC" → census_report
- Contains "Rate", "PPD", "Payer" → rate_schedule
- Contains "Rent Roll" → rent_roll
- Contains "AR", "Aging", "Receivable" → ar_aging

Sheet name patterns (Excel):
- "P&L", "Income Statement" → financial_statement sheet
- "Census", "Patient Days" → census_report sheet
- "Rates", "Payer Mix" → rate_schedule sheet
```

---

## Phase 2: Structure Analysis Pass

### 2.1 Purpose
Analyze document structure before extraction to understand:
- Sheet types and layouts
- Facility names mentioned
- Time periods covered
- Field/column structure

### 2.2 Detection Logic

```typescript
// Sheet Type Detection
interface SheetStructure {
  name: string;
  sheetType: 'pl_statement' | 'census_report' | 'rate_schedule' |
             'summary_dashboard' | 'rent_roll' | 'ar_aging' |
             'chart_of_accounts' | 'unknown';
  detectedFacilities: string[];
  detectedPeriods: DetectedPeriod[];
  detectedFields: DetectedField[];
  dataRange: { startRow, endRow, startCol, endCol };
}

// Period Detection (columns or rows)
interface DetectedPeriod {
  label: string;           // "Jan 2024", "Q1 2024", "TTM"
  type: 'monthly' | 'quarterly' | 'annual' | 'ttm' | 'ytd';
  startDate?: Date;
  endDate?: Date;
  columnIndex?: number;    // If periods are columns
  rowIndex?: number;       // If periods are rows
  confidence: number;
}

// Field Detection (row labels)
interface DetectedField {
  name: string;            // "Medicare Part A Revenue"
  normalizedName: string;  // "medicare_part_a_revenue"
  category: 'revenue' | 'expense' | 'metric' | 'census' | 'rate';
  rowIndex: number;
  confidence: number;
  suggestedCOACode?: string;  // Pre-mapped if high confidence
}
```

### 2.3 Facility Name Detection

```typescript
// Sources for facility name detection:
// 1. Sheet names containing facility names
// 2. Header rows with facility identifiers
// 3. CCN/NPI numbers that map to known facilities
// 4. Address information

// Match against existing facilities in deal
const facilityMatcher = {
  exactMatch: (name) => facilities.find(f => f.name === name),
  aliasMatch: (name) => facilities.find(f => f.aliases?.includes(name)),
  ccnMatch: (ccn) => facilities.find(f => f.ccn === ccn),
  fuzzyMatch: (name) => findBestMatch(name, facilities.map(f => f.name))
};
```

---

## Phase 3: AI Extraction Pass

### 3.1 Claude AI Integration

```typescript
// Prompt structure for extraction
const extractionPrompt = {
  systemPrompt: `You are a skilled nursing facility financial analyst...`,

  context: {
    knownFacilities: ["Sunrise SNF", "Valley Care Center"],
    priorPeriods: ["Jan 2024", "Feb 2024"],  // From structure pass
    documentType: "financial_statement",
    benchmarks: {
      medicare_ppd: { min: 450, max: 650, median: 550 },
      medicaid_ppd: { min: 180, max: 280, median: 220 },
      labor_percent: { min: 0.55, max: 0.70, median: 0.62 }
    }
  },

  instructions: `
    Extract all financial line items with:
    - Field name (as shown in document)
    - Values for each period column
    - Confidence score (0-1)
    - Any observations or anomalies

    Flag items that:
    - Fall outside benchmark ranges
    - Have unclear categorization
    - Show unusual period-over-period changes
  `
};
```

### 3.2 Extracted Data Structure

```typescript
// Per-sheet extraction output
interface SheetExtractionResult {
  sheetName: string;
  facilityId: string;

  // Financial line items
  lineItems: ExtractedLineItem[];

  // Observations and flags
  observations: AIObservation[];
  raisedQuestions: AIRaisedQuestion[];

  // Metadata
  extractionConfidence: number;
  processingTimeMs: number;
}

interface ExtractedLineItem {
  sourceLabel: string;         // Original label from document
  normalizedLabel: string;     // Cleaned/normalized version
  category: 'revenue' | 'expense' | 'census' | 'rate' | 'metric';

  // Values by period
  periodValues: {
    period: string;           // "Jan 2024"
    value: number;
    confidence: number;
  }[];

  // Mapping hints
  suggestedCOACode?: string;
  suggestedCOAName?: string;
  mappingConfidence?: number;

  // Position in document
  sourceRow: number;
  sourceColumn?: number;
}
```

### 3.3 Data Categories Extracted

#### Revenue Items
```typescript
// Payer-based revenue
- Medicare Part A Revenue
- Medicare Advantage Revenue
- Medicaid Revenue
- Managed Medicaid Revenue
- Managed Care Revenue
- Private Pay Revenue
- VA Contract Revenue
- Hospice Revenue
- Other Revenue

// Revenue subtypes
- Room & Board Revenue
- Ancillary Revenue
- Therapy Revenue (PT/OT/ST)
- Pharmacy Revenue
- Lab/X-Ray Revenue
```

#### Expense Items
```typescript
// Labor expenses
- Nursing Wages (RN, LPN, CNA)
- Agency/Contract Labor
- Employee Benefits
- Payroll Taxes
- Workers Comp
- Therapy Wages (if in-house)

// Operating expenses
- Dietary/Food
- Housekeeping
- Laundry
- Medical Supplies
- Pharmacy (if not pass-through)
- Activities
- Social Services
- Plant Operations/Maintenance
- Utilities

// Administrative expenses
- Administrative Salaries
- Professional Fees
- Marketing
- IT/Technology
- Office Supplies

// Fixed expenses
- Rent/Lease
- Property Tax
- Insurance (Property, Liability, Professional)
- Management Fee
- License Fees
```

#### Census Data
```typescript
// Patient days by payer
- Medicare Part A Days
- Medicare Advantage Days
- Managed Care Days
- Medicaid Days
- Managed Medicaid Days
- Private Pay Days
- VA Contract Days
- Hospice Days

// Calculated metrics
- Total Patient Days
- Average Daily Census (ADC)
- Occupancy Rate
- Skilled Mix %
- Medicare Mix %
```

#### Rate Data
```typescript
// Per Patient Day (PPD) rates
- Medicare Part A PPD
- Medicare Advantage PPD
- Managed Care PPD (by contract)
- Medicaid PPD
- Managed Medicaid PPD
- Private Pay PPD
- VA Contract PPD

// Ancillary rates
- Therapy PPD (if bundled)
- Ancillary PPD
```

---

## Phase 4: Validation Pass

### 4.1 Cross-Reference Validation

```typescript
// Revenue Reconciliation Formula
// Expected Revenue = Patient Days × PPD Rate

const revenueReconciliation = {
  medicare: {
    extracted: extractedRevenue.medicare,
    calculated: censusDays.medicare * payerRates.medicare,
    variance: calculateVariance(extracted, calculated),
    status: variance < 0.05 ? 'valid' : 'flag_for_review'
  },
  // ... repeat for each payer
};

// Validation thresholds
const THRESHOLDS = {
  autoResolve: 0.03,        // <3% variance: auto-accept
  clarification: 0.05,      // 3-5%: flag for clarification
  critical: 0.15,           // >15%: critical error

  // Period-over-period limits
  revenueChange: 0.20,      // 20% max revenue swing
  expenseChange: 0.25,      // 25% max expense swing
  occupancyChange: 0.15,    // 15% max occupancy swing
  rateChange: 0.10          // 10% max rate swing
};
```

### 4.2 Conflict Detection

```typescript
interface DataConflict {
  id: string;
  type: 'cross_document' | 'cross_period' | 'revenue_reconciliation' |
        'internal_consistency' | 'benchmark_deviation';

  severity: 'low' | 'medium' | 'high' | 'critical';

  fieldPath: string;           // "revenue.medicare"
  facilityId: string;
  periodKey: string;           // "2024-01"

  // Conflicting values
  values: {
    value: number;
    source: { documentId, filename, sheetName };
    confidence: number;
  }[];

  variancePercent: number;
  varianceAbsolute: number;

  // Resolution
  status: 'detected' | 'auto_resolved' | 'pending_clarification' | 'user_resolved';
  resolvedValue?: number;
  resolutionMethod?: 'auto_average' | 'auto_highest_confidence' | 'user_selected';
}
```

### 4.3 Auto-Resolution Rules

```typescript
const autoResolutionRules = {
  // Use highest confidence when variance is low
  lowVarianceHighConfidence: {
    condition: (conflict) =>
      conflict.variancePercent < 0.03 &&
      conflict.values.some(v => v.confidence > 0.90),
    action: 'use_highest_confidence'
  },

  // Average when values are close and confidence similar
  closeValuesAverage: {
    condition: (conflict) =>
      conflict.variancePercent < 0.05 &&
      Math.max(...conflict.values.map(v => v.confidence)) -
      Math.min(...conflict.values.map(v => v.confidence)) < 0.10,
    action: 'weighted_average'
  },

  // Use benchmark-aligned value
  benchmarkAligned: {
    condition: (conflict) =>
      conflict.type === 'benchmark_deviation' &&
      conflict.values.some(v => isWithinBenchmark(v.value, conflict.benchmark)),
    action: 'use_benchmark_aligned'
  }
};
```

---

## Phase 5: COA Mapping Engine

### 5.1 SNF Chart of Accounts Structure

```typescript
// Account code series
const COA_SERIES = {
  // Revenue (4000 series)
  4100: 'Non-Skilled Revenue',
  4200: 'Skilled Revenue',
  4300: 'Vent Revenue',
  4400: 'Ancillary Revenue',

  // Nursing/Therapy Expenses (5000 series)
  5100: 'Nursing Administration',
  5200: 'Nursing Services',
  5300: 'Contract/Agency',
  5400: 'Therapy Services',

  // Administrative Expenses (6000 series)
  6100: 'Administrative',
  6200: 'Dietary',
  6300: 'Housekeeping/Laundry',
  6400: 'Plant Operations',
  6500: 'Professional Fees',

  // Fixed Expenses (7000-8000 series)
  7100: 'Rent',
  7200: 'Property Tax',
  7300: 'Insurance',
  8100: 'Depreciation',
  8200: 'Interest',

  // Census Statistics (9000 series)
  9100: 'Patient Days',
  9200: 'Occupancy Metrics'
};
```

### 5.2 Three-Tier Matching Algorithm

```typescript
// Tier 1: Exact Match (95% confidence)
const exactMatches = {
  'medicare_part_a_revenue': '4210',
  'medicaid_revenue': '4110',
  'nursing_wages': '5210',
  'dietary_expense': '6210',
  // ... 200+ predefined mappings
};

// Tier 2: Variation Match (90% confidence)
const variationMatches = {
  // Revenue variations
  'mcare', 'medicare', 'mcar_a' → '4210',
  'mcaid', 'medicaid', 'title_19' → '4110',

  // Expense variations
  'rn_wages', 'nursing_salaries', 'nurse_wages' → '5210',
  'food_cost', 'dietary', 'food_service' → '6210'
};

// Tier 3: Fuzzy Match (75% confidence)
const fuzzyMatch = (label: string) => {
  return COA_ACCOUNTS.map(account => ({
    code: account.code,
    similarity: calculateSimilarity(label, account.mappingKeys),
    confidence: 0.75 * similarity
  }))
  .filter(m => m.confidence >= 0.50)
  .sort((a, b) => b.confidence - a.confidence);
};
```

### 5.3 Learning from Manual Mappings

```typescript
// When user manually maps an item
async function learnFromMapping(params: {
  dealId: string;
  sourceLabel: string;
  coaCode: string;
  coaName: string;
}) {
  // 1. Store deal-specific mapping
  await db.insert(dealCoaMappings).values({
    dealId: params.dealId,
    sourceLabel: params.sourceLabel,
    coaCode: params.coaCode,
    mappingMethod: 'manual',
    isMapped: true
  });

  // 2. Store global mapping for reuse
  await db.insert(coaMappings).values({
    externalTerm: normalizeLabel(params.sourceLabel),
    cascadiaTerm: params.coaCode,
    category: getCOACategory(params.coaCode)
  }).onConflictDoNothing();

  // 3. Generate variations for future matching
  const variations = generateLabelVariations(params.sourceLabel);
  // Store variations for fuzzy matching
}
```

### 5.4 Mapping Confidence Levels

| Confidence | Source | Action |
|------------|--------|--------|
| 95-100% | Exact match from predefined rules | Auto-map, no review needed |
| 90-95% | Variation match or learned pattern | Auto-map, flagged for optional review |
| 75-90% | Fuzzy match | Suggested mapping, requires confirmation |
| 50-75% | Category match only | Multiple suggestions shown |
| <50% | No confident match | Manual mapping required |

---

## Phase 6: Database Population

### 6.1 Target Tables

```sql
-- Financial periods (aggregated P&L data)
financial_periods (
  id, deal_id, facility_id,
  period_start, period_end, is_annualized,

  -- Revenue breakdown
  total_revenue, medicare_revenue, medicaid_revenue,
  managed_care_revenue, private_pay_revenue, other_revenue,

  -- Expense breakdown
  total_expenses, labor_cost, core_labor, agency_labor,
  food_cost, supplies_cost, utilities_cost,
  insurance_cost, management_fee, other_expenses,

  -- Metrics
  noi, ebitdar, normalized_noi,
  average_daily_census, occupancy_rate,

  -- Tracking
  confidence_score, source, source_document_id
)

-- Census periods (payer mix detail)
facility_census_periods (
  id, facility_id, period_start, period_end,

  -- Days by payer
  medicare_part_a_days, medicare_advantage_days,
  managed_care_days, medicaid_days, managed_medicaid_days,
  private_days, va_contract_days, hospice_days, other_days,

  -- Beds and metrics
  total_beds, occupancy_rate, source
)

-- Payer rates
facility_payer_rates (
  id, facility_id, effective_date,

  -- PPD rates by payer
  medicare_part_a_ppd, medicare_advantage_ppd,
  managed_care_ppd, medicaid_ppd, managed_medicaid_ppd,
  private_ppd, va_contract_ppd, hospice_ppd,

  -- Ancillary rates
  ancillary_revenue_ppd, therapy_revenue_ppd,
  source
)

-- COA mappings (line item detail)
deal_coa_mappings (
  id, deal_id, facility_id, document_id,

  -- Source data
  source_label, source_value, source_month,

  -- COA mapping
  coa_code, coa_name,
  mapping_confidence, mapping_method,
  is_mapped,

  -- Proforma destination
  proforma_destination,

  -- Review tracking
  reviewed_by, reviewed_at
)
```

### 6.2 Upsert Logic

```typescript
// Financial periods: upsert by facility + period
const upsertFinancialPeriod = async (data: NormalizedFinancialPeriod) => {
  const existing = await db.select()
    .from(financialPeriods)
    .where(and(
      eq(financialPeriods.facilityId, data.facilityId),
      eq(financialPeriods.periodStart, data.periodStart),
      eq(financialPeriods.periodEnd, data.periodEnd)
    ));

  if (existing.length > 0) {
    // Only update if new confidence is higher
    if (data.confidence >= existing[0].confidenceScore) {
      await db.update(financialPeriods)
        .set(data)
        .where(eq(financialPeriods.id, existing[0].id));
    }
  } else {
    await db.insert(financialPeriods).values(data);
  }
};
```

---

## Phase 7: Clarification Workflow

### 7.1 Clarification Types

| Type | Trigger | User Action Required |
|------|---------|---------------------|
| `low_confidence` | Extraction confidence <70% | Verify extracted value |
| `out_of_range` | Value outside benchmark range | Confirm or correct value |
| `conflict` | Multiple documents disagree | Select correct value |
| `missing` | Required field not found | Manually enter value |
| `validation_error` | Failed reconciliation check | Resolve discrepancy |

### 7.2 Clarification UI Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Clarification Queue                                              │
├─────────────────────────────────────────────────────────────────┤
│ [HIGH] Medicare Revenue - Jan 2024                               │
│   Extracted: $2,450,000 (65% confidence)                        │
│   Benchmark: $2,100,000 - $2,600,000                            │
│                                                                  │
│   Suggestions:                                                   │
│   ○ $2,450,000 (from P&L Sheet) - 65% confidence                │
│   ○ $2,380,000 (from Summary) - 78% confidence                  │
│   ○ $2,412,000 (Calculated: 4,200 days × $574.29 PPD)          │
│                                                                  │
│   [Use Selected] [Enter Custom Value] [Skip]                     │
├─────────────────────────────────────────────────────────────────┤
│ [MEDIUM] Nursing Wages COA Mapping                               │
│   Label: "RN/LPN Salaries & Wages"                              │
│                                                                  │
│   Suggested COA:                                                 │
│   ○ 5210 - Nursing Wages (88% match)                            │
│   ○ 5211 - RN Wages (75% match)                                 │
│   ○ 5100 - Nursing Administration (45% match)                   │
│                                                                  │
│   [Confirm 5210] [Select Different] [Create New]                │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Resolution API

```typescript
// POST /api/deals/[id]/clarifications/[clarificationId]/resolve
{
  resolvedValue: 2380000,           // Selected or custom value
  resolutionSource: 'user_selected', // or 'user_entered'
  note: "Confirmed with operator",   // Optional note

  // For COA mapping clarifications
  coaCode?: '5210',
  learnMapping?: true               // Store for future use
}
```

---

## Phase 8: Pro Forma Generation

### 8.1 From Mapped Items to Pro Forma

```typescript
// Query mapped items for pro forma
const getMappedItemsForProforma = async (dealId: string) => {
  return db.select()
    .from(dealCoaMappings)
    .where(and(
      eq(dealCoaMappings.dealId, dealId),
      eq(dealCoaMappings.isMapped, true)
    ))
    .orderBy(dealCoaMappings.coaCode);
};

// Group by proforma category
const groupForProforma = (mappings: COAMapping[]) => {
  return {
    revenue: {
      medicare: sum(mappings.filter(m => m.coaCode.startsWith('421'))),
      medicaid: sum(mappings.filter(m => m.coaCode.startsWith('411'))),
      managedCare: sum(mappings.filter(m => m.coaCode.startsWith('412'))),
      privatePay: sum(mappings.filter(m => m.coaCode.startsWith('413'))),
      ancillary: sum(mappings.filter(m => m.coaCode.startsWith('44'))),
    },
    expenses: {
      nursing: sum(mappings.filter(m => m.coaCode.startsWith('52'))),
      dietary: sum(mappings.filter(m => m.coaCode.startsWith('62'))),
      housekeeping: sum(mappings.filter(m => m.coaCode.startsWith('63'))),
      // ... etc
    }
  };
};
```

### 8.2 Scenario Modeling

```typescript
// Pro forma scenarios
interface ProformaScenario {
  name: string;              // "Base Case", "Upside", "Downside"
  assumptions: {
    occupancyChange: number;  // +5% occupancy improvement
    rateGrowth: number;       // 2% annual rate increases
    laborReduction: number;   // -3% agency labor reduction
    // ... other adjustments
  };
  projectedMetrics: {
    revenue: number;
    expenses: number;
    noi: number;
    noiMargin: number;
    capRate: number;
    valuation: number;
  };
}
```

---

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/deals/[id]/documents` | POST | Upload documents |
| `/api/deals/[id]/extraction/pipeline` | POST | Start extraction |
| `/api/deals/[id]/extraction/pipeline/[session]/stream` | GET | SSE progress |
| `/api/deals/[id]/coa-mappings` | GET | List COA mappings |
| `/api/deals/[id]/coa-mappings/[id]` | PUT | Update mapping |
| `/api/deals/[id]/clarifications` | GET | List clarifications |
| `/api/deals/[id]/clarifications/[id]/resolve` | POST | Resolve item |
| `/api/deals/[id]/financial/proforma` | GET/POST | Pro forma |

---

## Key Files Reference

| Component | Location |
|-----------|----------|
| Extraction Pipeline | `/src/lib/extraction/pipeline/` |
| COA Definitions | `/src/lib/coa/snf-coa.ts` |
| COA Mapper | `/src/lib/coa/coa-mapper.ts` |
| Learning System | `/src/lib/coa/mapping-learning.ts` |
| Database Schema | `/src/db/schema.ts` |
| Pipeline API | `/src/app/api/deals/[id]/extraction/pipeline/` |
| Clarifications API | `/src/app/api/documents/[id]/clarifications/` |
| Pro Forma API | `/src/app/api/deals/[id]/financial/proforma/` |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Auto-mapping rate | >80% of line items |
| Extraction accuracy | >95% for structured Excel |
| Clarification resolution | <10% of items need manual review |
| Processing time | <30 seconds per document |
| Learning improvement | 5% better mapping each quarter |
