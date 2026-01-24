/**
 * AI Summary Generator
 *
 * Generates comprehensive summaries of extracted deal data using Claude.
 * Takes into account:
 * - Per-file extraction results
 * - Cross-reference validation
 * - CMS data matching
 * - Financial metrics
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PerFileExtractionResult } from './per-file-extractor';
import type { CrossReferenceResult } from './cross-reference-validator';
import type { NormalizedProviderData } from '../cms';

const anthropic = new Anthropic();

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface FacilitySummary {
  name: string;
  ccn?: string;
  cmsData?: NormalizedProviderData;
  metrics?: {
    avgDailyCensus: number | null;
    occupancyRate: number | null;
    netOperatingIncome: number | null;
    ebitdaMargin: number | null;
  };
}

export interface AISummaryInput {
  facilities: FacilitySummary[];
  perFileResults: PerFileExtractionResult[];
  crossReferenceResults: CrossReferenceResult | null;
  extractionSummary: {
    totalRevenue: number;
    totalExpenses: number;
    totalNOI: number;
    periodsExtracted: string[];
    dataQuality: number;
  } | null;
}

export interface AISummaryOutput {
  executiveSummary: string;
  keyFindings: string[];
  riskFactors: string[];
  dataQualityAssessment: string;
  investmentHighlights: string[];
  operationalInsights: string[];
  recommendations: string[];
  confidence: number;
}

// ============================================================================
// AI SUMMARY GENERATION
// ============================================================================

/**
 * Generate a comprehensive AI summary of the extracted deal data
 */
export async function generateAISummary(
  input: AISummaryInput
): Promise<AISummaryOutput> {
  const prompt = buildSummaryPrompt(input);

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return {
        executiveSummary: result.executiveSummary || 'Summary not available',
        keyFindings: result.keyFindings || [],
        riskFactors: result.riskFactors || [],
        dataQualityAssessment: result.dataQualityAssessment || 'Unable to assess data quality',
        investmentHighlights: result.investmentHighlights || [],
        operationalInsights: result.operationalInsights || [],
        recommendations: result.recommendations || [],
        confidence: result.confidence || 0.5,
      };
    }

    // Fallback if parsing fails
    return generateFallbackSummary(input);
  } catch (error) {
    console.error('AI summary generation error:', error);
    return generateFallbackSummary(input);
  }
}

/**
 * Build the prompt for AI summary generation
 */
function buildSummaryPrompt(input: AISummaryInput): string {
  const { facilities, perFileResults, crossReferenceResults, extractionSummary } = input;

  // Calculate totals from per-file results
  const totalFinancialPeriods = perFileResults.reduce((sum, r) => sum + r.financialData.length, 0);
  const totalCensusPeriods = perFileResults.reduce((sum, r) => sum + r.censusData.length, 0);
  const totalRates = perFileResults.reduce((sum, r) => sum + r.rateData.length, 0);
  const totalSheets = perFileResults.reduce((sum, r) => sum + r.sheets.length, 0);

  // Build facility details
  const facilityDetails = facilities.map(f => {
    const cmsInfo = f.cmsData
      ? `CMS Rating: ${f.cmsData.overallRating || 'N/A'}/5, Beds: ${f.cmsData.numberOfBeds || 'N/A'}, SFF: ${f.cmsData.isSff ? 'YES - Special Focus Facility' : 'No'}`
      : 'Not matched to CMS database (may be ALF/ILF or non-certified)';

    const metricsInfo = f.metrics
      ? `ADC: ${f.metrics.avgDailyCensus?.toFixed(1) || 'N/A'}, Occupancy: ${f.metrics.occupancyRate?.toFixed(1) || 'N/A'}%, NOI: $${f.metrics.netOperatingIncome ? (f.metrics.netOperatingIncome / 1000).toFixed(0) + 'K' : 'N/A'}`
      : 'Metrics not available';

    return `
FACILITY: ${f.name}
- CCN: ${f.ccn || 'Not identified'}
- CMS Data: ${cmsInfo}
- Metrics: ${metricsInfo}`;
  }).join('\n');

  // Build cross-reference summary
  const crossRefSummary = crossReferenceResults
    ? `
CROSS-REFERENCE VALIDATION:
- Discrepancies Found: ${crossReferenceResults.discrepancies.length}
  - High Severity: ${crossReferenceResults.summaryMetrics.highSeverityDiscrepancies}
  - Medium Severity: ${crossReferenceResults.summaryMetrics.mediumSeverityDiscrepancies}
  - Low Severity: ${crossReferenceResults.summaryMetrics.lowSeverityDiscrepancies}
- Corroborations: ${crossReferenceResults.corroborations.length}
- Data Confidence: ${(crossReferenceResults.overallConfidence * 100).toFixed(0)}%
- Key Issues: ${crossReferenceResults.discrepancies.filter(d => d.severity === 'high').map(d => d.description).slice(0, 3).join('; ') || 'None'}`
    : 'Cross-reference validation not performed (single file)';

  // Build extraction summary
  const extractionInfo = extractionSummary
    ? `
FINANCIAL SUMMARY:
- Total Revenue (Annualized): $${(extractionSummary.totalRevenue / 1000000).toFixed(2)}M
- Total Expenses (Annualized): $${(extractionSummary.totalExpenses / 1000000).toFixed(2)}M
- Total NOI: $${(extractionSummary.totalNOI / 1000000).toFixed(2)}M
- NOI Margin: ${((extractionSummary.totalNOI / extractionSummary.totalRevenue) * 100).toFixed(1)}%
- Date Range: ${extractionSummary.periodsExtracted[0]} to ${extractionSummary.periodsExtracted[extractionSummary.periodsExtracted.length - 1]}
- Data Quality: ${(extractionSummary.dataQuality * 100).toFixed(0)}% of line items mapped to COA`
    : 'Financial summary not available';

  return `You are a healthcare real estate investment analyst. Analyze this deal extraction data and provide a comprehensive summary.

EXTRACTION OVERVIEW:
- Files Processed: ${perFileResults.length}
- Total Sheets Analyzed: ${totalSheets}
- Financial Periods Extracted: ${totalFinancialPeriods}
- Census Periods Extracted: ${totalCensusPeriods}
- Rate Data Points: ${totalRates}
- Facilities Identified: ${facilities.length}

${facilityDetails}

${extractionInfo}

${crossRefSummary}

Based on this data, provide a JSON response with:
{
  "executiveSummary": "2-3 sentence executive summary of the deal",
  "keyFindings": ["Finding 1", "Finding 2", "Finding 3"],
  "riskFactors": ["Risk 1", "Risk 2"],
  "dataQualityAssessment": "Assessment of data quality and completeness",
  "investmentHighlights": ["Highlight 1", "Highlight 2"],
  "operationalInsights": ["Insight 1", "Insight 2"],
  "recommendations": ["Recommendation 1", "Recommendation 2"],
  "confidence": 0.85
}

Guidelines:
- Executive summary should mention facility count, approximate value/revenue, and key characteristic
- Key findings should be specific, data-driven observations
- Risk factors should flag any CMS concerns (SFF status, low ratings), data discrepancies, or operational issues
- Data quality assessment should note any missing data or validation concerns
- Investment highlights should focus on positive metrics (occupancy, margins, payer mix)
- Operational insights should note staffing, census trends, or efficiency observations
- Recommendations should suggest next steps for due diligence
- Confidence should reflect data completeness and quality (0.0-1.0)

Return ONLY valid JSON.`;
}

/**
 * Generate a fallback summary when AI fails
 */
function generateFallbackSummary(input: AISummaryInput): AISummaryOutput {
  const { facilities, perFileResults, crossReferenceResults, extractionSummary } = input;

  const totalPeriods = perFileResults.reduce((sum, r) => sum + r.financialData.length, 0);
  const facilityNames = facilities.map(f => f.name).join(', ');

  return {
    executiveSummary: `Deal includes ${facilities.length} healthcare facilities (${facilityNames}). ${totalPeriods} financial periods extracted with ${extractionSummary ? (extractionSummary.dataQuality * 100).toFixed(0) : 'N/A'}% data quality.`,
    keyFindings: [
      `${facilities.length} facilities identified`,
      `${totalPeriods} months of financial data extracted`,
      extractionSummary
        ? `Total annual revenue approximately $${(extractionSummary.totalRevenue / 1000000).toFixed(1)}M`
        : 'Financial totals require manual verification',
    ],
    riskFactors: [
      ...(facilities.some(f => f.cmsData?.isSff) ? ['One or more facilities are Special Focus Facilities (SFF)'] : []),
      ...(crossReferenceResults && crossReferenceResults.summaryMetrics.highSeverityDiscrepancies > 0
        ? [`${crossReferenceResults.summaryMetrics.highSeverityDiscrepancies} high-severity data discrepancies require review`]
        : []),
      ...(facilities.some(f => !f.cmsData) ? ['Some facilities not matched to CMS database - may be ALF/ILF or require manual verification'] : []),
    ],
    dataQualityAssessment: crossReferenceResults
      ? `Cross-reference validation completed with ${(crossReferenceResults.overallConfidence * 100).toFixed(0)}% confidence. ${crossReferenceResults.corroborations.length} data points corroborated across multiple sources.`
      : 'Single source data - cross-reference validation not possible. Additional documentation recommended.',
    investmentHighlights: [
      ...(extractionSummary && extractionSummary.totalNOI > 0
        ? [`Positive NOI of $${(extractionSummary.totalNOI / 1000000).toFixed(2)}M annually`]
        : []),
      ...(facilities.filter(f => f.cmsData && f.cmsData.overallRating && f.cmsData.overallRating >= 4).length > 0
        ? [`${facilities.filter(f => f.cmsData && f.cmsData.overallRating && f.cmsData.overallRating >= 4).length} facilities with 4+ star CMS rating`]
        : []),
    ],
    operationalInsights: [
      `Average extraction confidence: ${(perFileResults.reduce((sum, r) => sum + r.confidence, 0) / perFileResults.length * 100).toFixed(0)}%`,
    ],
    recommendations: [
      'Review any high-severity discrepancies with operator',
      'Request rate letters for PPD verification',
      'Verify census data against state licensing reports',
    ],
    confidence: crossReferenceResults ? crossReferenceResults.overallConfidence : 0.6,
  };
}

/**
 * Generate a quick summary without AI (for speed)
 */
export function generateQuickSummary(input: AISummaryInput): string {
  const { facilities, perFileResults, extractionSummary } = input;

  const totalPeriods = perFileResults.reduce((sum, r) => sum + r.financialData.length, 0);
  const facilityNames = facilities.slice(0, 3).map(f => f.name).join(', ');
  const moreCount = facilities.length > 3 ? ` +${facilities.length - 3} more` : '';

  let summary = `${facilities.length} facility portfolio (${facilityNames}${moreCount}). `;

  if (extractionSummary) {
    summary += `$${(extractionSummary.totalRevenue / 1000000).toFixed(1)}M annual revenue, `;
    summary += `$${(extractionSummary.totalNOI / 1000000).toFixed(2)}M NOI. `;
  }

  summary += `${totalPeriods} periods extracted from ${perFileResults.length} files.`;

  return summary;
}
