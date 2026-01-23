// =============================================================================
// DOCUMENT CLASSIFIER - Automatically classify uploaded documents
// =============================================================================

import type { DocumentType } from '../types';

// =============================================================================
// TYPES
// =============================================================================

export interface ClassificationResult {
  documentType: DocumentType;
  confidence: number;
  alternativeTypes: {
    type: DocumentType;
    confidence: number;
  }[];
  indicators: string[];
}

export interface ClassificationFeatures {
  filename: string;
  mimeType?: string;
  pageCount?: number;
  rawText?: string;
  hasFinancialTables?: boolean;
  hasMultiplePages?: boolean;
}

// =============================================================================
// CLASSIFICATION PATTERNS
// =============================================================================

interface DocumentPattern {
  type: DocumentType;
  filenamePatterns: RegExp[];
  textPatterns: {
    pattern: RegExp;
    weight: number;
    indicator: string;
  }[];
  structuralIndicators: {
    condition: (features: ClassificationFeatures) => boolean;
    weight: number;
    indicator: string;
  }[];
}

const DOCUMENT_PATTERNS: DocumentPattern[] = [
  {
    type: 'offering_memorandum',
    filenamePatterns: [
      /offering\s*mem/i,
      /\bom\b/i,
      /investment\s*summary/i,
      /property\s*overview/i,
      /deal\s*summary/i,
    ],
    textPatterns: [
      { pattern: /offering\s+memorandum/i, weight: 0.9, indicator: 'Contains "Offering Memorandum"' },
      { pattern: /investment\s+highlights/i, weight: 0.8, indicator: 'Contains "Investment Highlights"' },
      { pattern: /property\s+overview/i, weight: 0.7, indicator: 'Contains "Property Overview"' },
      { pattern: /asking\s+price/i, weight: 0.8, indicator: 'Contains asking price' },
      { pattern: /cap\s+rate/i, weight: 0.6, indicator: 'Contains cap rate information' },
      { pattern: /executive\s+summary/i, weight: 0.7, indicator: 'Contains executive summary' },
      { pattern: /financial\s+overview/i, weight: 0.6, indicator: 'Contains financial overview' },
      { pattern: /confidential/i, weight: 0.4, indicator: 'Marked as confidential' },
    ],
    structuralIndicators: [
      {
        condition: (f) => (f.pageCount || 0) >= 10,
        weight: 0.3,
        indicator: 'Multi-page document (10+ pages)',
      },
    ],
  },
  {
    type: 'rent_roll',
    filenamePatterns: [
      /rent\s*roll/i,
      /resident\s*roster/i,
      /census\s*list/i,
      /unit\s*list/i,
    ],
    textPatterns: [
      { pattern: /rent\s+roll/i, weight: 0.9, indicator: 'Contains "Rent Roll"' },
      { pattern: /unit\s+(number|#|no)/i, weight: 0.7, indicator: 'Has unit numbers' },
      { pattern: /monthly\s+rent/i, weight: 0.8, indicator: 'Has monthly rent column' },
      { pattern: /move[- ]in\s+date/i, weight: 0.7, indicator: 'Has move-in dates' },
      { pattern: /lease\s+expir/i, weight: 0.6, indicator: 'Has lease expiration' },
      { pattern: /\bbed\s+\d+/i, weight: 0.5, indicator: 'Has bed identifiers' },
    ],
    structuralIndicators: [
      {
        condition: (f) => f.hasFinancialTables === true,
        weight: 0.4,
        indicator: 'Contains tabular data',
      },
    ],
  },
  {
    type: 'trailing_12',
    filenamePatterns: [
      /t-?12/i,
      /trailing/i,
      /ttm/i,
      /12[- ]month/i,
      /annual\s*p[&\s]*l/i,
    ],
    textPatterns: [
      { pattern: /trailing\s+(12|twelve)/i, weight: 0.9, indicator: 'Contains "Trailing 12"' },
      { pattern: /t-?12\s+month/i, weight: 0.9, indicator: 'Contains "T12"' },
      { pattern: /income\s+statement/i, weight: 0.6, indicator: 'Contains "Income Statement"' },
      { pattern: /total\s+revenue/i, weight: 0.5, indicator: 'Has total revenue line' },
      { pattern: /operating\s+expense/i, weight: 0.5, indicator: 'Has operating expenses' },
      { pattern: /ebitda/i, weight: 0.7, indicator: 'Contains EBITDA' },
      { pattern: /net\s+operating\s+income/i, weight: 0.6, indicator: 'Contains NOI' },
    ],
    structuralIndicators: [
      {
        condition: (f) => f.hasFinancialTables === true,
        weight: 0.5,
        indicator: 'Contains financial tables',
      },
    ],
  },
  {
    type: 'historical_pnl',
    filenamePatterns: [
      /historical/i,
      /financials/i,
      /p[&\s]*l/i,
      /profit\s*loss/i,
      /income\s*statement/i,
    ],
    textPatterns: [
      { pattern: /profit\s+(and|&)\s+loss/i, weight: 0.8, indicator: 'Contains "Profit & Loss"' },
      { pattern: /income\s+statement/i, weight: 0.7, indicator: 'Contains "Income Statement"' },
      { pattern: /historical\s+financ/i, weight: 0.9, indicator: 'Contains "Historical Financials"' },
      { pattern: /year\s+over\s+year/i, weight: 0.6, indicator: 'Shows year-over-year data' },
      { pattern: /20\d{2}\s+20\d{2}/i, weight: 0.5, indicator: 'Multiple years shown' },
      { pattern: /fy\s*\d{4}/i, weight: 0.5, indicator: 'Fiscal year references' },
    ],
    structuralIndicators: [
      {
        condition: (f) => f.hasFinancialTables === true,
        weight: 0.4,
        indicator: 'Contains financial tables',
      },
    ],
  },
  {
    type: 'medicare_cost_report',
    filenamePatterns: [
      /cost\s*report/i,
      /mcr/i,
      /2540/i,
      /medicare/i,
    ],
    textPatterns: [
      { pattern: /medicare\s+cost\s+report/i, weight: 0.95, indicator: 'Contains "Medicare Cost Report"' },
      { pattern: /form\s+2540/i, weight: 0.95, indicator: 'Contains Form 2540' },
      { pattern: /worksheet\s+[a-z]/i, weight: 0.8, indicator: 'Has worksheet references' },
      { pattern: /cost\s+center/i, weight: 0.7, indicator: 'Has cost centers' },
      { pattern: /provider\s+number/i, weight: 0.6, indicator: 'Has provider number' },
      { pattern: /cms\s+certification/i, weight: 0.6, indicator: 'Has CMS certification' },
    ],
    structuralIndicators: [],
  },
  {
    type: 'survey_report',
    filenamePatterns: [
      /survey/i,
      /inspection/i,
      /deficien/i,
      /cms\s*report/i,
    ],
    textPatterns: [
      { pattern: /health\s+inspection/i, weight: 0.8, indicator: 'Contains "Health Inspection"' },
      { pattern: /deficienc/i, weight: 0.8, indicator: 'Contains deficiency information' },
      { pattern: /f-?\d{3,4}/i, weight: 0.9, indicator: 'Has F-tag references' },
      { pattern: /scope\s+(and\s+)?severity/i, weight: 0.8, indicator: 'Has scope/severity ratings' },
      { pattern: /plan\s+of\s+correction/i, weight: 0.7, indicator: 'Has plan of correction' },
      { pattern: /complaint\s+investigation/i, weight: 0.6, indicator: 'References complaints' },
    ],
    structuralIndicators: [],
  },
  {
    type: 'lease_abstract',
    filenamePatterns: [
      /lease/i,
      /abstract/i,
      /rental\s*agreement/i,
    ],
    textPatterns: [
      { pattern: /lease\s+abstract/i, weight: 0.95, indicator: 'Contains "Lease Abstract"' },
      { pattern: /lease\s+term/i, weight: 0.7, indicator: 'Has lease term' },
      { pattern: /base\s+rent/i, weight: 0.7, indicator: 'Has base rent' },
      { pattern: /escalation/i, weight: 0.6, indicator: 'Has escalation clause' },
      { pattern: /renewal\s+option/i, weight: 0.7, indicator: 'Has renewal options' },
      { pattern: /landlord|tenant/i, weight: 0.5, indicator: 'Landlord/tenant references' },
    ],
    structuralIndicators: [],
  },
  {
    type: 'environmental_report',
    filenamePatterns: [
      /environmental/i,
      /phase\s*[12i]/i,
      /esa/i,
    ],
    textPatterns: [
      { pattern: /environmental\s+site\s+assessment/i, weight: 0.95, indicator: 'Contains "Environmental Site Assessment"' },
      { pattern: /phase\s+[12i]\s+esa/i, weight: 0.95, indicator: 'Is Phase I/II ESA' },
      { pattern: /recognized\s+environmental\s+condition/i, weight: 0.9, indicator: 'Has REC findings' },
      { pattern: /rec\b/i, weight: 0.6, indicator: 'References RECs' },
      { pattern: /soil\s+(contamination|testing)/i, weight: 0.6, indicator: 'References soil testing' },
      { pattern: /groundwater/i, weight: 0.5, indicator: 'References groundwater' },
    ],
    structuralIndicators: [],
  },
  {
    type: 'appraisal',
    filenamePatterns: [
      /appraisal/i,
      /valuation/i,
      /mai/i,
    ],
    textPatterns: [
      { pattern: /appraisal\s+report/i, weight: 0.9, indicator: 'Contains "Appraisal Report"' },
      { pattern: /market\s+value/i, weight: 0.7, indicator: 'Has market value' },
      { pattern: /income\s+approach/i, weight: 0.8, indicator: 'Uses income approach' },
      { pattern: /sales\s+comparison/i, weight: 0.7, indicator: 'Uses sales comparison' },
      { pattern: /cost\s+approach/i, weight: 0.6, indicator: 'Uses cost approach' },
      { pattern: /highest\s+and\s+best\s+use/i, weight: 0.8, indicator: 'Has highest/best use analysis' },
      { pattern: /mai|sra|ai-grs/i, weight: 0.7, indicator: 'Has appraiser credentials' },
    ],
    structuralIndicators: [
      {
        condition: (f) => (f.pageCount || 0) >= 20,
        weight: 0.3,
        indicator: 'Lengthy document typical of appraisals',
      },
    ],
  },
  {
    type: 'capital_expenditure',
    filenamePatterns: [
      /cap\s*ex/i,
      /capital/i,
      /improvement/i,
      /renovation/i,
    ],
    textPatterns: [
      { pattern: /capital\s+expenditure/i, weight: 0.9, indicator: 'Contains "Capital Expenditure"' },
      { pattern: /capex/i, weight: 0.8, indicator: 'Contains "CapEx"' },
      { pattern: /improvement\s+budget/i, weight: 0.8, indicator: 'Has improvement budget' },
      { pattern: /renovation\s+plan/i, weight: 0.7, indicator: 'Has renovation plan' },
      { pattern: /deferred\s+maintenance/i, weight: 0.7, indicator: 'References deferred maintenance' },
      { pattern: /useful\s+life/i, weight: 0.5, indicator: 'Has useful life estimates' },
    ],
    structuralIndicators: [],
  },
  {
    type: 'census_report',
    filenamePatterns: [
      /census/i,
      /occupancy/i,
      /daily\s*report/i,
    ],
    textPatterns: [
      { pattern: /census\s+report/i, weight: 0.9, indicator: 'Contains "Census Report"' },
      { pattern: /daily\s+census/i, weight: 0.8, indicator: 'Has daily census' },
      { pattern: /admissions?\s+(and\s+)?discharge/i, weight: 0.7, indicator: 'Has admission/discharge data' },
      { pattern: /patient\s+days/i, weight: 0.7, indicator: 'Has patient days' },
      { pattern: /occupancy\s+rate/i, weight: 0.6, indicator: 'Has occupancy rate' },
      { pattern: /bed\s+availability/i, weight: 0.5, indicator: 'Has bed availability' },
    ],
    structuralIndicators: [],
  },
  {
    type: 'staffing_report',
    filenamePatterns: [
      /staffing/i,
      /hppd/i,
      /labor/i,
      /employee/i,
    ],
    textPatterns: [
      { pattern: /staffing\s+report/i, weight: 0.9, indicator: 'Contains "Staffing Report"' },
      { pattern: /hppd|hours\s+per\s+patient\s+day/i, weight: 0.9, indicator: 'Has HPPD metrics' },
      { pattern: /fte\b/i, weight: 0.7, indicator: 'Has FTE counts' },
      { pattern: /agency\s+(usage|staff)/i, weight: 0.7, indicator: 'Has agency usage' },
      { pattern: /turnover\s+rate/i, weight: 0.6, indicator: 'Has turnover metrics' },
      { pattern: /\b(rn|lpn|cna|lvn)\s+staff/i, weight: 0.6, indicator: 'Lists nursing staff types' },
    ],
    structuralIndicators: [],
  },
  {
    type: 'quality_report',
    filenamePatterns: [
      /quality/i,
      /star\s*rating/i,
      /performance/i,
    ],
    textPatterns: [
      { pattern: /quality\s+measure/i, weight: 0.9, indicator: 'Contains "Quality Measures"' },
      { pattern: /star\s+rating/i, weight: 0.9, indicator: 'Has star ratings' },
      { pattern: /five-?star/i, weight: 0.8, indicator: 'References five-star system' },
      { pattern: /cms\s+quality/i, weight: 0.8, indicator: 'References CMS quality' },
      { pattern: /performance\s+indicator/i, weight: 0.6, indicator: 'Has performance indicators' },
      { pattern: /improvement\s+initiative/i, weight: 0.5, indicator: 'References improvement initiatives' },
    ],
    structuralIndicators: [],
  },
];

// =============================================================================
// DOCUMENT CLASSIFIER CLASS
// =============================================================================

export class DocumentClassifier {
  /**
   * Classify a document based on available features
   */
  classify(features: ClassificationFeatures): ClassificationResult {
    const scores: Map<DocumentType, { score: number; indicators: string[] }> = new Map();

    // Initialize scores
    for (const pattern of DOCUMENT_PATTERNS) {
      scores.set(pattern.type, { score: 0, indicators: [] });
    }

    // Score based on filename
    this.scoreByFilename(features.filename, scores);

    // Score based on text content if available
    if (features.rawText) {
      this.scoreByTextContent(features.rawText, scores);
    }

    // Score based on structural indicators
    this.scoreByStructure(features, scores);

    // Find best match
    let bestType: DocumentType = 'other';
    let bestScore = 0;
    let bestIndicators: string[] = [];

    const alternatives: { type: DocumentType; confidence: number }[] = [];

    for (const [type, data] of scores.entries()) {
      if (data.score > bestScore) {
        if (bestScore > 0) {
          alternatives.push({
            type: bestType,
            confidence: this.normalizeScore(bestScore),
          });
        }
        bestScore = data.score;
        bestType = type;
        bestIndicators = data.indicators;
      } else if (data.score > 0) {
        alternatives.push({
          type,
          confidence: this.normalizeScore(data.score),
        });
      }
    }

    // Sort alternatives by confidence
    alternatives.sort((a, b) => b.confidence - a.confidence);

    return {
      documentType: bestType,
      confidence: this.normalizeScore(bestScore),
      alternativeTypes: alternatives.slice(0, 3),
      indicators: bestIndicators,
    };
  }

  /**
   * Classify multiple documents
   */
  classifyBatch(documents: ClassificationFeatures[]): ClassificationResult[] {
    return documents.map((doc) => this.classify(doc));
  }

  /**
   * Score based on filename patterns
   */
  private scoreByFilename(
    filename: string,
    scores: Map<DocumentType, { score: number; indicators: string[] }>
  ): void {
    for (const pattern of DOCUMENT_PATTERNS) {
      for (const regex of pattern.filenamePatterns) {
        if (regex.test(filename)) {
          const data = scores.get(pattern.type)!;
          data.score += 0.5;
          data.indicators.push(`Filename matches "${regex.source}"`);
          break; // Only count one filename match per type
        }
      }
    }
  }

  /**
   * Score based on text content
   */
  private scoreByTextContent(
    text: string,
    scores: Map<DocumentType, { score: number; indicators: string[] }>
  ): void {
    // Normalize text for matching
    const normalizedText = text.toLowerCase();

    for (const pattern of DOCUMENT_PATTERNS) {
      for (const textPattern of pattern.textPatterns) {
        if (textPattern.pattern.test(normalizedText)) {
          const data = scores.get(pattern.type)!;
          data.score += textPattern.weight;
          data.indicators.push(textPattern.indicator);
        }
      }
    }
  }

  /**
   * Score based on structural indicators
   */
  private scoreByStructure(
    features: ClassificationFeatures,
    scores: Map<DocumentType, { score: number; indicators: string[] }>
  ): void {
    for (const pattern of DOCUMENT_PATTERNS) {
      for (const structural of pattern.structuralIndicators) {
        if (structural.condition(features)) {
          const data = scores.get(pattern.type)!;
          data.score += structural.weight;
          data.indicators.push(structural.indicator);
        }
      }
    }
  }

  /**
   * Normalize score to confidence (0-1)
   */
  private normalizeScore(score: number): number {
    // Use sigmoid-like function to map scores to 0-1
    // A score of 2.0 maps to ~75% confidence
    // A score of 4.0 maps to ~90% confidence
    const normalized = 1 - 1 / (1 + score / 2);
    return Math.round(normalized * 100) / 100;
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Suggest document type based on filename only
 */
export function suggestTypeFromFilename(filename: string): DocumentType {
  const classifier = new DocumentClassifier();
  const result = classifier.classify({ filename });
  return result.documentType;
}

/**
 * Validate document type against content
 */
export function validateDocumentType(
  claimedType: DocumentType,
  features: ClassificationFeatures
): {
  valid: boolean;
  suggestedType: DocumentType;
  confidence: number;
} {
  const classifier = new DocumentClassifier();
  const result = classifier.classify(features);

  return {
    valid: result.documentType === claimedType,
    suggestedType: result.documentType,
    confidence: result.confidence,
  };
}

/**
 * Get document type display name
 */
export function getDocumentTypeDisplayName(type: DocumentType): string {
  const displayNames: Record<DocumentType, string> = {
    offering_memorandum: 'Offering Memorandum',
    rent_roll: 'Rent Roll',
    trailing_12: 'Trailing 12 Months P&L',
    historical_pnl: 'Historical Financials',
    medicare_cost_report: 'Medicare Cost Report',
    survey_report: 'Survey Report',
    lease_abstract: 'Lease Abstract',
    environmental_report: 'Environmental Report',
    appraisal: 'Appraisal',
    capital_expenditure: 'Capital Expenditure Plan',
    census_report: 'Census Report',
    staffing_report: 'Staffing Report',
    quality_report: 'Quality Report',
    other: 'Other Document',
  };

  return displayNames[type] || type;
}

/**
 * Get required fields for document type
 */
export function getRequiredFieldsForType(type: DocumentType): string[] {
  const requiredFields: Record<DocumentType, string[]> = {
    offering_memorandum: ['facilityName', 'address', 'beds', 'askingPrice'],
    rent_roll: ['units', 'totalRent', 'occupancy'],
    trailing_12: ['revenue', 'expenses', 'noi'],
    historical_pnl: ['revenue', 'expenses', 'periods'],
    medicare_cost_report: ['ccn', 'fiscalYear', 'totalCosts'],
    survey_report: ['surveyDate', 'deficiencies'],
    lease_abstract: ['tenant', 'landlord', 'term', 'rent'],
    environmental_report: ['assessmentDate', 'findings'],
    appraisal: ['effectiveDate', 'marketValue', 'approaches'],
    capital_expenditure: ['projects', 'totalBudget'],
    census_report: ['census', 'occupancy', 'period'],
    staffing_report: ['hppd', 'staffCounts'],
    quality_report: ['starRating', 'measures'],
    other: [],
  };

  return requiredFields[type] || [];
}

// =============================================================================
// EXPORTS
// =============================================================================

export const documentClassifier = new DocumentClassifier();
