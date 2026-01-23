/**
 * Comparable Sales Valuation Method
 *
 * Value based on analysis of similar property transactions.
 */

import {
  ValuationInput,
  ValuationResult,
  ValuationAssumption,
  ValuationCalculation,
  ComparableSale,
} from './types';

export interface ComparableSalesOptions {
  comparables: ComparableSale[];
  weightByRecency?: boolean;
  weightBySimilarity?: boolean;
  maxAgeDays?: number;
  minComparables?: number;
}

/**
 * Calculate similarity score between subject property and comparable
 */
export function calculateSimilarityScore(
  subject: ValuationInput,
  comp: ComparableSale
): number {
  let score = 100;
  const deductions: { reason: string; amount: number }[] = [];

  // Asset type (most important)
  if (comp.assetType !== subject.assetType) {
    deductions.push({ reason: 'Different asset type', amount: 30 });
  }

  // State
  if (comp.state !== subject.state) {
    deductions.push({ reason: 'Different state', amount: 15 });
  }

  // Bed count (size similarity)
  const bedDiff = Math.abs(comp.beds - subject.beds) / subject.beds;
  if (bedDiff > 0.5) {
    deductions.push({ reason: 'Size >50% different', amount: 20 });
  } else if (bedDiff > 0.25) {
    deductions.push({ reason: 'Size 25-50% different', amount: 10 });
  } else if (bedDiff > 0.1) {
    deductions.push({ reason: 'Size 10-25% different', amount: 5 });
  }

  // Age of sale
  const saleAgeDays = (Date.now() - comp.saleDate.getTime()) / (1000 * 60 * 60 * 24);
  if (saleAgeDays > 730) { // > 2 years
    deductions.push({ reason: 'Sale >2 years old', amount: 15 });
  } else if (saleAgeDays > 365) { // > 1 year
    deductions.push({ reason: 'Sale 1-2 years old', amount: 8 });
  } else if (saleAgeDays > 180) { // > 6 months
    deductions.push({ reason: 'Sale 6-12 months old', amount: 4 });
  }

  // Occupancy (if available)
  if (subject.occupancy && comp.occupancyAtSale) {
    const occupancyDiff = Math.abs(comp.occupancyAtSale - subject.occupancy);
    if (occupancyDiff > 0.15) {
      deductions.push({ reason: 'Occupancy >15% different', amount: 10 });
    } else if (occupancyDiff > 0.08) {
      deductions.push({ reason: 'Occupancy 8-15% different', amount: 5 });
    }
  }

  // Apply deductions
  const totalDeduction = deductions.reduce((sum, d) => sum + d.amount, 0);
  score = Math.max(0, score - totalDeduction);

  return score;
}

/**
 * Calculate recency weight
 */
function calculateRecencyWeight(saleDate: Date, maxAgeDays: number): number {
  const ageInDays = (Date.now() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > maxAgeDays) return 0;
  // Linear decay from 1.0 to 0.5 over the time period
  return 0.5 + 0.5 * (1 - ageInDays / maxAgeDays);
}

/**
 * Calculate value using comparable sales
 */
export function calculateComparableSalesValue(
  input: ValuationInput,
  options: ComparableSalesOptions
): ValuationResult {
  const assumptions: ValuationAssumption[] = [];
  const calculations: ValuationCalculation[] = [];

  const {
    comparables,
    weightByRecency = true,
    weightBySimilarity = true,
    maxAgeDays = 730, // 2 years
    minComparables = 3,
  } = options;

  // Filter comparables by age
  const validComps = comparables.filter((comp) => {
    const ageInDays = (Date.now() - comp.saleDate.getTime()) / (1000 * 60 * 60 * 24);
    return ageInDays <= maxAgeDays;
  });

  if (validComps.length < minComparables) {
    throw new Error(`Insufficient comparables: found ${validComps.length}, need ${minComparables}`);
  }

  assumptions.push({
    field: 'comparables',
    value: validComps.length,
    source: 'provided',
    description: `${validComps.length} comparable sales analyzed`,
  });

  // Calculate similarity scores and weights
  const scoredComps = validComps.map((comp) => {
    const similarity = calculateSimilarityScore(input, comp);
    const recency = weightByRecency ? calculateRecencyWeight(comp.saleDate, maxAgeDays) : 1;

    // Combined weight
    let weight = 1;
    if (weightBySimilarity) weight *= similarity / 100;
    if (weightByRecency) weight *= recency;

    return {
      ...comp,
      similarity,
      weight,
    };
  });

  // Sort by weight (best first)
  scoredComps.sort((a, b) => b.weight - a.weight);

  // Use top comparables (at least minComparables, up to 10)
  const topComps = scoredComps.slice(0, Math.min(10, Math.max(minComparables, scoredComps.length)));

  // Calculate weighted average price per bed
  let totalWeight = 0;
  let weightedPPBSum = 0;
  let weightedCapRateSum = 0;
  let capRateCount = 0;

  topComps.forEach((comp, idx) => {
    totalWeight += comp.weight;
    weightedPPBSum += comp.pricePerBed * comp.weight;

    if (comp.capRate) {
      weightedCapRateSum += comp.capRate * comp.weight;
      capRateCount++;
    }

    calculations.push({
      label: `Comp ${idx + 1}: ${comp.propertyName}`,
      formula: `${comp.beds} beds @ $${comp.pricePerBed.toLocaleString()}/bed`,
      value: comp.salePrice,
      details: `${comp.city}, ${comp.state} | Similarity: ${comp.similarity}% | Weight: ${(comp.weight * 100).toFixed(0)}%`,
    });
  });

  const avgPPB = totalWeight > 0 ? weightedPPBSum / totalWeight : 0;

  calculations.push({
    label: 'Weighted Avg PPB',
    value: avgPPB,
    details: `Based on ${topComps.length} comparables`,
  });

  // Calculate subject value
  const valueBase = input.beds * avgPPB;

  // Calculate range based on comparable variation
  const ppbValues = topComps.map((c) => c.pricePerBed);
  const ppbMin = Math.min(...ppbValues);
  const ppbMax = Math.max(...ppbValues);

  const valueLow = input.beds * ppbMin;
  const valueHigh = input.beds * ppbMax;

  calculations.push({
    label: 'Subject Value',
    formula: `${input.beds} beds × $${Math.round(avgPPB).toLocaleString()}/bed`,
    value: valueBase,
  });

  // Calculate implied metrics
  if (input.noi && input.noi > 0) {
    const impliedCapRate = input.noi / valueBase;
    calculations.push({
      label: 'Implied Cap Rate',
      value: impliedCapRate,
      details: `${(impliedCapRate * 100).toFixed(2)}%`,
    });
  }

  // Average comparable cap rate
  if (capRateCount > 0) {
    const avgCapRate = weightedCapRateSum / totalWeight;
    calculations.push({
      label: 'Avg Comparable Cap Rate',
      value: avgCapRate,
      details: `${(avgCapRate * 100).toFixed(2)}% based on ${capRateCount} comps`,
    });
  }

  // Confidence based on data quality
  let confidence = 70;

  if (topComps.length >= 5) confidence += 10;
  if (topComps.length >= 8) confidence += 5;

  // Average similarity score
  const avgSimilarity = topComps.reduce((sum, c) => sum + c.similarity, 0) / topComps.length;
  if (avgSimilarity >= 80) confidence += 10;
  else if (avgSimilarity >= 60) confidence += 5;
  else if (avgSimilarity < 40) confidence -= 10;

  // Variation in comps
  const ppbRange = (ppbMax - ppbMin) / avgPPB;
  if (ppbRange < 0.2) confidence += 5;
  else if (ppbRange > 0.5) confidence -= 10;

  confidence = Math.max(40, Math.min(100, confidence));

  return {
    method: 'comparable_sales',
    value: Math.round(valueBase),
    valueLow: Math.round(valueLow),
    valueHigh: Math.round(valueHigh),
    confidence,
    assumptions,
    calculations,
    notes: `Analysis of ${topComps.length} comparable sales with weighted average similarity of ${avgSimilarity.toFixed(0)}%`,
    inputsUsed: {
      beds: input.beds,
      assetType: input.assetType,
      state: input.state,
      occupancy: input.occupancy,
    },
  };
}
