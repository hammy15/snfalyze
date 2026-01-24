/**
 * Cross-Reference Validator
 *
 * Compares extracted data across multiple documents to:
 * - Identify discrepancies between files
 * - Corroborate data from multiple sources
 * - Flag potential data quality issues
 * - Build confidence scores based on cross-validation
 */

import type { FinancialPeriod } from './pl-extractor';
import type { CensusPeriod } from './census-extractor';
import type { PayerRate } from './rate-extractor';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CrossReferenceResult {
  validationId: string;
  timestamp: Date;
  facilitiesValidated: string[];
  periodsCompared: number;
  discrepancies: Discrepancy[];
  corroborations: Corroboration[];
  summaryMetrics: SummaryMetrics;
  overallConfidence: number;
  recommendations: string[];
}

export interface Discrepancy {
  type: 'revenue' | 'expense' | 'census' | 'rate' | 'period';
  severity: 'high' | 'medium' | 'low';
  facility: string;
  period?: string;
  field: string;
  sources: Array<{
    filename: string;
    value: number | string;
    confidence: number;
  }>;
  variance: number; // Percentage difference
  description: string;
  recommendation: string;
}

export interface Corroboration {
  type: 'revenue' | 'expense' | 'census' | 'rate' | 'period';
  facility: string;
  period?: string;
  field: string;
  sources: Array<{
    filename: string;
    value: number | string;
    confidence: number;
  }>;
  matchConfidence: number;
  description: string;
}

export interface SummaryMetrics {
  totalFieldsCompared: number;
  fieldsWithCorroboration: number;
  fieldsWithDiscrepancies: number;
  averageCorroborationStrength: number;
  highSeverityDiscrepancies: number;
  mediumSeverityDiscrepancies: number;
  lowSeverityDiscrepancies: number;
}

export interface ExtractedDataSet {
  documentId: string;
  filename: string;
  financialData: FinancialPeriod[];
  censusData: CensusPeriod[];
  rateData: PayerRate[];
}

// ============================================================================
// CROSS-REFERENCE VALIDATION
// ============================================================================

/**
 * Validate data across multiple extracted documents
 */
export function crossReferenceValidate(
  dataSets: ExtractedDataSet[]
): CrossReferenceResult {
  const discrepancies: Discrepancy[] = [];
  const corroborations: Corroboration[] = [];
  let totalFieldsCompared = 0;

  // Get all unique facilities across all datasets
  const facilities = new Set<string>();
  for (const ds of dataSets) {
    for (const f of ds.financialData) {
      if (f.facilityName) facilities.add(f.facilityName);
    }
    for (const c of ds.censusData) {
      if (c.facilityName) facilities.add(c.facilityName);
    }
  }

  // For each facility, compare data across documents
  for (const facility of facilities) {
    // Compare financial data
    const financialComparison = compareFinancialData(
      dataSets.map(ds => ({
        filename: ds.filename,
        data: ds.financialData.filter(f => f.facilityName === facility),
      }))
    );
    discrepancies.push(...financialComparison.discrepancies);
    corroborations.push(...financialComparison.corroborations);
    totalFieldsCompared += financialComparison.fieldsCompared;

    // Compare census data
    const censusComparison = compareCensusData(
      dataSets.map(ds => ({
        filename: ds.filename,
        data: ds.censusData.filter(c => c.facilityName === facility),
      }))
    );
    discrepancies.push(...censusComparison.discrepancies);
    corroborations.push(...censusComparison.corroborations);
    totalFieldsCompared += censusComparison.fieldsCompared;
  }

  // Compare rate data across sources
  const rateComparison = compareRateData(
    dataSets.map(ds => ({
      filename: ds.filename,
      data: ds.rateData,
    }))
  );
  discrepancies.push(...rateComparison.discrepancies);
  corroborations.push(...rateComparison.corroborations);
  totalFieldsCompared += rateComparison.fieldsCompared;

  // Calculate summary metrics
  const summaryMetrics: SummaryMetrics = {
    totalFieldsCompared,
    fieldsWithCorroboration: corroborations.length,
    fieldsWithDiscrepancies: discrepancies.length,
    averageCorroborationStrength:
      corroborations.length > 0
        ? corroborations.reduce((sum, c) => sum + c.matchConfidence, 0) / corroborations.length
        : 0,
    highSeverityDiscrepancies: discrepancies.filter(d => d.severity === 'high').length,
    mediumSeverityDiscrepancies: discrepancies.filter(d => d.severity === 'medium').length,
    lowSeverityDiscrepancies: discrepancies.filter(d => d.severity === 'low').length,
  };

  // Calculate overall confidence
  const overallConfidence = calculateOverallConfidence(summaryMetrics, totalFieldsCompared);

  // Generate recommendations
  const recommendations = generateRecommendations(discrepancies, corroborations, summaryMetrics);

  return {
    validationId: `val-${Date.now()}`,
    timestamp: new Date(),
    facilitiesValidated: Array.from(facilities),
    periodsCompared: dataSets.reduce((sum, ds) => sum + ds.financialData.length, 0),
    discrepancies,
    corroborations,
    summaryMetrics,
    overallConfidence,
    recommendations,
  };
}

/**
 * Compare financial data across documents
 */
function compareFinancialData(
  sources: Array<{ filename: string; data: FinancialPeriod[] }>
): { discrepancies: Discrepancy[]; corroborations: Corroboration[]; fieldsCompared: number } {
  const discrepancies: Discrepancy[] = [];
  const corroborations: Corroboration[] = [];
  let fieldsCompared = 0;

  // Group data by period
  const byPeriod = new Map<string, Array<{ filename: string; data: FinancialPeriod }>>();
  for (const source of sources) {
    for (const period of source.data) {
      const key = period.periodLabel || `${period.periodStart.toISOString()}-${period.periodEnd.toISOString()}`;
      if (!byPeriod.has(key)) {
        byPeriod.set(key, []);
      }
      byPeriod.get(key)!.push({ filename: source.filename, data: period });
    }
  }

  // Compare fields for periods that appear in multiple sources
  for (const [periodKey, periodData] of byPeriod) {
    if (periodData.length < 2) continue;

    const facility = periodData[0].data.facilityName || 'Unknown';

    // Compare total revenue
    fieldsCompared++;
    const revenueValues = periodData.map(p => ({
      filename: p.filename,
      value: p.data.totalRevenue,
      confidence: p.data.confidence || 0.5,
    }));
    const revenueComparison = compareNumericValues(revenueValues, 'Total Revenue', facility, periodKey, 'revenue');
    if (revenueComparison.discrepancy) discrepancies.push(revenueComparison.discrepancy);
    if (revenueComparison.corroboration) corroborations.push(revenueComparison.corroboration);

    // Compare total expenses
    fieldsCompared++;
    const expenseValues = periodData.map(p => ({
      filename: p.filename,
      value: p.data.totalExpenses,
      confidence: p.data.confidence || 0.5,
    }));
    const expenseComparison = compareNumericValues(expenseValues, 'Total Expenses', facility, periodKey, 'expense');
    if (expenseComparison.discrepancy) discrepancies.push(expenseComparison.discrepancy);
    if (expenseComparison.corroboration) corroborations.push(expenseComparison.corroboration);

    // Compare NOI
    fieldsCompared++;
    const noiValues = periodData.map(p => ({
      filename: p.filename,
      value: p.data.noi,
      confidence: p.data.confidence || 0.5,
    }));
    const noiComparison = compareNumericValues(noiValues, 'NOI', facility, periodKey, 'expense');
    if (noiComparison.discrepancy) discrepancies.push(noiComparison.discrepancy);
    if (noiComparison.corroboration) corroborations.push(noiComparison.corroboration);

    // Compare labor costs
    fieldsCompared++;
    const laborValues = periodData.map(p => ({
      filename: p.filename,
      value: p.data.totalLaborCost,
      confidence: p.data.confidence || 0.5,
    }));
    const laborComparison = compareNumericValues(laborValues, 'Total Labor Cost', facility, periodKey, 'expense');
    if (laborComparison.discrepancy) discrepancies.push(laborComparison.discrepancy);
    if (laborComparison.corroboration) corroborations.push(laborComparison.corroboration);
  }

  return { discrepancies, corroborations, fieldsCompared };
}

/**
 * Compare census data across documents
 */
function compareCensusData(
  sources: Array<{ filename: string; data: CensusPeriod[] }>
): { discrepancies: Discrepancy[]; corroborations: Corroboration[]; fieldsCompared: number } {
  const discrepancies: Discrepancy[] = [];
  const corroborations: Corroboration[] = [];
  let fieldsCompared = 0;

  // Group data by period
  const byPeriod = new Map<string, Array<{ filename: string; data: CensusPeriod }>>();
  for (const source of sources) {
    for (const period of source.data) {
      const key = period.periodLabel || `${period.periodStart.toISOString()}-${period.periodEnd.toISOString()}`;
      if (!byPeriod.has(key)) {
        byPeriod.set(key, []);
      }
      byPeriod.get(key)!.push({ filename: source.filename, data: period });
    }
  }

  // Compare fields for periods that appear in multiple sources
  for (const [periodKey, periodData] of byPeriod) {
    if (periodData.length < 2) continue;

    const facility = periodData[0].data.facilityName || 'Unknown';

    // Compare total patient days
    fieldsCompared++;
    const totalDays = periodData.map(p => ({
      filename: p.filename,
      value: p.data.totalPatientDays,
      confidence: 0.8,
    }));
    const totalDaysComparison = compareNumericValues(totalDays, 'Total Patient Days', facility, periodKey, 'census');
    if (totalDaysComparison.discrepancy) discrepancies.push(totalDaysComparison.discrepancy);
    if (totalDaysComparison.corroboration) corroborations.push(totalDaysComparison.corroboration);

    // Compare occupancy rate
    fieldsCompared++;
    const occupancy = periodData.map(p => ({
      filename: p.filename,
      value: p.data.occupancyRate,
      confidence: 0.8,
    }));
    const occupancyComparison = compareNumericValues(occupancy, 'Occupancy Rate', facility, periodKey, 'census');
    if (occupancyComparison.discrepancy) discrepancies.push(occupancyComparison.discrepancy);
    if (occupancyComparison.corroboration) corroborations.push(occupancyComparison.corroboration);

    // Compare Medicare days
    fieldsCompared++;
    const medicareDays = periodData.map(p => ({
      filename: p.filename,
      value: p.data.medicarePartADays + p.data.medicareAdvantageDays,
      confidence: 0.8,
    }));
    const medicareComparison = compareNumericValues(medicareDays, 'Medicare Days', facility, periodKey, 'census');
    if (medicareComparison.discrepancy) discrepancies.push(medicareComparison.discrepancy);
    if (medicareComparison.corroboration) corroborations.push(medicareComparison.corroboration);

    // Compare Medicaid days
    fieldsCompared++;
    const medicaidDays = periodData.map(p => ({
      filename: p.filename,
      value: p.data.medicaidDays + p.data.managedMedicaidDays,
      confidence: 0.8,
    }));
    const medicaidComparison = compareNumericValues(medicaidDays, 'Medicaid Days', facility, periodKey, 'census');
    if (medicaidComparison.discrepancy) discrepancies.push(medicaidComparison.discrepancy);
    if (medicaidComparison.corroboration) corroborations.push(medicaidComparison.corroboration);
  }

  return { discrepancies, corroborations, fieldsCompared };
}

/**
 * Compare rate data across documents
 */
function compareRateData(
  sources: Array<{ filename: string; data: PayerRate[] }>
): { discrepancies: Discrepancy[]; corroborations: Corroboration[]; fieldsCompared: number } {
  const discrepancies: Discrepancy[] = [];
  const corroborations: Corroboration[] = [];
  let fieldsCompared = 0;

  // Group rates by facility and payer type
  const byFacilityPayer = new Map<string, Array<{ filename: string; data: PayerRate }>>();
  for (const source of sources) {
    for (const rate of source.data) {
      const key = `${rate.facilityName || 'unknown'}-${rate.payerType || 'unknown'}`;
      if (!byFacilityPayer.has(key)) {
        byFacilityPayer.set(key, []);
      }
      byFacilityPayer.get(key)!.push({ filename: source.filename, data: rate });
    }
  }

  // Compare rates that appear in multiple sources
  for (const [key, rateData] of byFacilityPayer) {
    if (rateData.length < 2) continue;

    const [facility, payerType] = key.split('-');

    // Compare Medicare Part A PPD
    fieldsCompared++;
    const medicareRates = rateData
      .filter(r => r.data.medicarePartAPpd != null)
      .map(r => ({
        filename: r.filename,
        value: r.data.medicarePartAPpd!,
        confidence: 0.9,
      }));
    if (medicareRates.length >= 2) {
      const comparison = compareNumericValues(medicareRates, 'Medicare Part A PPD', facility, payerType, 'rate');
      if (comparison.discrepancy) discrepancies.push(comparison.discrepancy);
      if (comparison.corroboration) corroborations.push(comparison.corroboration);
    }

    // Compare Medicaid PPD
    fieldsCompared++;
    const medicaidRates = rateData
      .filter(r => r.data.medicaidPpd != null)
      .map(r => ({
        filename: r.filename,
        value: r.data.medicaidPpd!,
        confidence: 0.9,
      }));
    if (medicaidRates.length >= 2) {
      const comparison = compareNumericValues(medicaidRates, 'Medicaid PPD', facility, payerType, 'rate');
      if (comparison.discrepancy) discrepancies.push(comparison.discrepancy);
      if (comparison.corroboration) corroborations.push(comparison.corroboration);
    }
  }

  return { discrepancies, corroborations, fieldsCompared };
}

/**
 * Compare numeric values across sources
 */
function compareNumericValues(
  values: Array<{ filename: string; value: number; confidence: number }>,
  fieldName: string,
  facility: string,
  period: string,
  type: Discrepancy['type']
): { discrepancy?: Discrepancy; corroboration?: Corroboration } {
  if (values.length < 2) return {};

  // Filter out zero/null values
  const validValues = values.filter(v => v.value != null && v.value !== 0);
  if (validValues.length < 2) return {};

  // Calculate statistics
  const numericValues = validValues.map(v => v.value);
  const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
  const maxDiff = Math.max(...numericValues.map(v => Math.abs(v - avg)));
  const variance = avg !== 0 ? (maxDiff / avg) * 100 : 0;

  // Determine threshold based on field type
  const thresholds = {
    revenue: { low: 5, medium: 10, high: 20 },
    expense: { low: 5, medium: 10, high: 20 },
    census: { low: 3, medium: 8, high: 15 },
    rate: { low: 2, medium: 5, high: 10 },
    period: { low: 5, medium: 10, high: 20 },
  };
  const threshold = thresholds[type] || thresholds.revenue;

  if (variance > threshold.low) {
    // Discrepancy found
    const severity: Discrepancy['severity'] =
      variance > threshold.high ? 'high' :
      variance > threshold.medium ? 'medium' : 'low';

    return {
      discrepancy: {
        type,
        severity,
        facility,
        period,
        field: fieldName,
        sources: validValues.map(v => ({
          filename: v.filename,
          value: v.value,
          confidence: v.confidence,
        })),
        variance,
        description: `${fieldName} differs by ${variance.toFixed(1)}% across sources for ${facility} (${period})`,
        recommendation: severity === 'high'
          ? `Review source documents to reconcile ${fieldName} - significant variance detected`
          : `Minor variance in ${fieldName} - may be due to rounding or different calculation methods`,
      },
    };
  } else {
    // Values corroborate
    const matchConfidence = Math.max(0, 1 - (variance / threshold.low));

    return {
      corroboration: {
        type,
        facility,
        period,
        field: fieldName,
        sources: validValues.map(v => ({
          filename: v.filename,
          value: v.value,
          confidence: v.confidence,
        })),
        matchConfidence,
        description: `${fieldName} corroborated across ${validValues.length} sources for ${facility} (${period})`,
      },
    };
  }
}

/**
 * Calculate overall confidence based on validation results
 */
function calculateOverallConfidence(metrics: SummaryMetrics, totalFields: number): number {
  if (totalFields === 0) return 0.5;

  // Base confidence on corroboration rate
  const corroborationRate = metrics.fieldsWithCorroboration / totalFields;

  // Penalize for discrepancies
  const discrepancyPenalty =
    (metrics.highSeverityDiscrepancies * 0.15) +
    (metrics.mediumSeverityDiscrepancies * 0.08) +
    (metrics.lowSeverityDiscrepancies * 0.03);

  // Boost from strong corroborations
  const corroborationBoost = metrics.averageCorroborationStrength * 0.2;

  // Calculate final confidence
  let confidence = 0.5 + (corroborationRate * 0.3) + corroborationBoost - discrepancyPenalty;

  // Clamp to 0-1
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Generate recommendations based on validation results
 */
function generateRecommendations(
  discrepancies: Discrepancy[],
  corroborations: Corroboration[],
  metrics: SummaryMetrics
): string[] {
  const recommendations: string[] = [];

  // High severity discrepancies
  if (metrics.highSeverityDiscrepancies > 0) {
    recommendations.push(
      `⚠️ ${metrics.highSeverityDiscrepancies} high-severity discrepancies found - manual review required before using this data for investment decisions`
    );
  }

  // Revenue discrepancies
  const revenueDiscrepancies = discrepancies.filter(d => d.type === 'revenue' && d.severity !== 'low');
  if (revenueDiscrepancies.length > 0) {
    recommendations.push(
      `📊 Revenue figures vary across documents - verify with operator which figures are most current`
    );
  }

  // Census discrepancies
  const censusDiscrepancies = discrepancies.filter(d => d.type === 'census' && d.severity !== 'low');
  if (censusDiscrepancies.length > 0) {
    recommendations.push(
      `🏥 Census data inconsistencies detected - request state licensing census reports for verification`
    );
  }

  // Rate discrepancies
  const rateDiscrepancies = discrepancies.filter(d => d.type === 'rate' && d.severity !== 'low');
  if (rateDiscrepancies.length > 0) {
    recommendations.push(
      `💰 PPD rate variations found - request official rate letters from payers`
    );
  }

  // Strong corroborations
  if (metrics.averageCorroborationStrength > 0.8 && corroborations.length > 5) {
    recommendations.push(
      `✅ Strong data corroboration across multiple sources - high confidence in extracted values`
    );
  }

  // No corroboration warning
  if (metrics.fieldsWithCorroboration === 0 && metrics.totalFieldsCompared > 0) {
    recommendations.push(
      `⚠️ No cross-document validation possible - only single-source data available. Consider requesting additional documentation.`
    );
  }

  return recommendations;
}
