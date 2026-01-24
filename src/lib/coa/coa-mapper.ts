// COA Mapper - Maps extracted document data to Chart of Accounts
// For automatic population of proforma from deal document uploads
// Now includes learning from manual re-mappings

import { COAAccount, COAMapping } from './types';
import { SNF_CHART_OF_ACCOUNTS, findAccountByMappingKey } from './snf-coa';
import { findLearnedMatch, getLearnedSuggestions, learnFromMapping, LearnedSuggestion } from './mapping-learning';

export interface ExtractedFinancialData {
  source: string; // Document name/ID
  extractedAt: Date;
  confidence: number;
  lineItems: ExtractedLineItem[];
  metadata?: {
    facilityName?: string;
    periodStart?: Date;
    periodEnd?: Date;
    reportType?: string;
  };
}

export interface ExtractedLineItem {
  label: string;
  rawLabel: string;
  values: MonthlyValue[];
  category?: string;
  confidence: number;
}

export interface MonthlyValue {
  month: string; // e.g., "Jan '24"
  value: number;
  isEstimate?: boolean;
}

export interface MappingResult {
  coaCode: string;
  coaName: string;
  sourceLabel: string;
  monthlyValues: Record<string, number>;
  confidence: number;
  mappingMethod: 'exact' | 'fuzzy' | 'ml' | 'manual';
  needsReview: boolean;
}

export interface MappingSuggestion {
  sourceLabel: string;
  suggestions: Array<{
    coaCode: string;
    coaName: string;
    confidence: number;
    reason: string;
  }>;
}

// Normalize labels for matching
function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

// Common label variations and their COA mappings
const LABEL_VARIATIONS: Record<string, string> = {
  // Revenue - Primary payor sources
  'medicaid': '4110',
  'medicaid_revenue': '4110',
  'medicaid_income': '4110',
  'mcaid': '4110',
  'mcaid_rev': '4110',
  'medicaid_room_board': '4110',
  'medicaid_daily': '4110',
  'state_medicaid': '4110',
  'traditional_medicaid': '4110',
  'fee_for_service_medicaid': '4110',
  'managed_medicaid': '4120',
  'mco_medicaid': '4120',
  'mco': '4120',
  'medicaid_mco': '4120',
  'medicaid_managed_care': '4120',
  'private_pay': '4130',
  'private': '4130',
  'private_revenue': '4130',
  'private_income': '4130',
  'self_pay': '4130',
  'private_pay_revenue': '4130',
  'va': '4140',
  'va_revenue': '4140',
  'va_income': '4140',
  'veterans': '4140',
  'veterans_administration': '4140',
  'veteran': '4140',
  'hospice': '4150',
  'hospice_revenue': '4150',
  'hospice_income': '4150',
  'hospice_care': '4150',
  'medicare': '4210',
  'medicare_revenue': '4210',
  'medicare_income': '4210',
  'medicare_a': '4210',
  'medicare_part_a': '4210',
  'mcr': '4210',
  'mcr_a': '4210',
  'mcr_revenue': '4210',
  'pdpm': '4210',
  'pdpm_revenue': '4210',
  'skilled_medicare': '4210',
  'snf_medicare': '4210',
  'medicare_skilled': '4210',
  'medicare_snf': '4210',
  'medicare_advantage': '4215',
  'ma': '4215',
  'ma_revenue': '4215',
  'medicare_ma': '4215',
  'hmo': '4250',
  'hmo_revenue': '4250',
  'commercial': '4250',
  'commercial_insurance': '4250',
  'insurance_revenue': '4250',
  'managed_care': '4250',
  'part_b': '4410',
  'medicare_b': '4410',
  'medicare_part_b': '4410',
  'ancillary_revenue': '4400',
  'other_revenue': '4500',
  'upl': '4430',
  'igp': '4430',
  'supplemental_payment': '4430',
  'quality_incentive': '4440',
  'total_revenue': '4999',
  'gross_revenue': '4999',
  'patient_revenue': '4999',
  'net_revenue': '4999',

  // Nursing
  'nursing': '5299',
  'nursing_expense': '5299',
  'nursing_wages': '5210',
  'rn_wages': '5210',
  'lpn_wages': '5211',
  'cna_wages': '5212',
  'nursing_benefits': '5220',
  'agency_nursing': '5230',
  'contract_nursing': '5230',
  'travel_nursing': '5230',
  'nursing_supplies': '5253',

  // Therapy
  'therapy': '5119',
  'therapy_expense': '5119',
  'pt': '5111',
  'physical_therapy': '5111',
  'ot': '5112',
  'occupational_therapy': '5112',
  'slp': '5113',
  'speech_therapy': '5113',

  // Dietary
  'dietary': '5799',
  'food_service': '5799',
  'raw_food': '5740',
  'food_cost': '5740',

  // Plant/Maintenance
  'plant': '5499',
  'maintenance': '5499',
  'utilities': '5430',
  'electric': '5430',
  'gas': '5431',
  'water': '5432',

  // Admin
  'admin': '6199',
  'administration': '6199',
  'administrator': '6110',
  'insurance_expense': '6150',
  'gl_insurance': '6150',
  'workers_comp': '6152',
  'professional_liability': '6151',
  'it': '6140',
  'legal': '6170',
  'accounting': '6171',

  // Other
  'bad_debt': '6200',
  'bed_tax': '6300',
  'provider_tax': '6300',
  'management_fee': '6500',
  'mgmt_fee': '6500',
  'rent': '7010',
  'lease': '7010',
  'property_tax': '7020',
  'depreciation': '8010',
  'amortization': '8020',
  'interest': '8030',
  'interest_expense': '8030',

  // Totals
  'total_expenses': '6499',
  'operating_expenses': '6499',
  'ebitdar': '6600',
  'ebitda': '7100',
  'net_income': '9000',
  'profit': '9000',

  // Days
  'patient_days': '9199',
  'total_days': '9199',
  'medicaid_days': '9111',
  'medicare_days': '9121',
  'skilled_days': '9129',
  'licensed_beds': '9210',
  'beds': '9210',
  'operational_beds': '9211',
  'staffed_beds': '9211',
  'occupancy': '9230',
  'census': '9220',
  'adc': '9220',
};

// Find best COA match for a label (synchronous - uses static rules only)
export function findCOAMatch(
  label: string,
  category?: string
): { coaCode: string; confidence: number; reason: string } | null {
  const normalized = normalizeLabel(label);

  // 1. Try exact mapping key match
  const directAccount = findAccountByMappingKey(normalized);
  if (directAccount) {
    return {
      coaCode: directAccount.code,
      confidence: 0.95,
      reason: 'Direct mapping key match',
    };
  }

  // 2. Try label variations
  if (LABEL_VARIATIONS[normalized]) {
    return {
      coaCode: LABEL_VARIATIONS[normalized],
      confidence: 0.90,
      reason: 'Common variation match',
    };
  }

  // 3. Try partial match
  for (const [variation, code] of Object.entries(LABEL_VARIATIONS)) {
    if (normalized.includes(variation) || variation.includes(normalized)) {
      return {
        coaCode: code,
        confidence: 0.75,
        reason: `Partial match: ${variation}`,
      };
    }
  }

  // 4. Try category-based matching
  if (category) {
    const normalizedCategory = normalizeLabel(category);
    const categoryMatches: Record<string, string> = {
      'revenue': '4999',
      'expense': '6499',
      'nursing': '5299',
      'therapy': '5119',
      'dietary': '5799',
      'admin': '6199',
      'plant': '5499',
    };
    for (const [cat, code] of Object.entries(categoryMatches)) {
      if (normalizedCategory.includes(cat)) {
        return {
          coaCode: code,
          confidence: 0.50,
          reason: `Category match: ${cat}`,
        };
      }
    }
  }

  return null;
}

// Find best COA match with learning (async - checks database for learned patterns)
export async function findCOAMatchWithLearning(
  label: string,
  category?: string,
  dealId?: string
): Promise<{ coaCode: string; confidence: number; reason: string } | null> {
  // 1. First check learned mappings (highest priority)
  const learnedMatch = await findLearnedMatch(label, dealId, 0.75);
  if (learnedMatch) {
    return learnedMatch;
  }

  // 2. Fall back to static rules
  return findCOAMatch(label, category);
}

// Get all suggestions for a label (combines learned + static)
export async function getAllSuggestions(
  label: string,
  category?: string,
  dealId?: string
): Promise<Array<{ coaCode: string; coaName: string; confidence: number; reason: string }>> {
  const suggestions: Array<{ coaCode: string; coaName: string; confidence: number; reason: string }> = [];
  const seen = new Set<string>();

  // 1. Get learned suggestions
  const learned = await getLearnedSuggestions(label, dealId);
  for (const s of learned) {
    if (!seen.has(s.coaCode)) {
      seen.add(s.coaCode);
      suggestions.push({
        coaCode: s.coaCode,
        coaName: s.coaName,
        confidence: s.confidence,
        reason: s.reason,
      });
    }
  }

  // 2. Add static matches
  const staticMatch = findCOAMatch(label, category);
  if (staticMatch && !seen.has(staticMatch.coaCode)) {
    const account = SNF_CHART_OF_ACCOUNTS.find(a => a.code === staticMatch.coaCode);
    seen.add(staticMatch.coaCode);
    suggestions.push({
      coaCode: staticMatch.coaCode,
      coaName: account?.name || 'Unknown',
      confidence: staticMatch.confidence,
      reason: staticMatch.reason,
    });
  }

  // 3. Add possible matches from static rules
  const possibleMatches = findPossibleMatches(label, category);
  for (const match of possibleMatches) {
    if (!seen.has(match.coaCode)) {
      seen.add(match.coaCode);
      suggestions.push(match);
    }
  }

  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

// Save a manual mapping for learning
export async function saveManualMapping(
  dealId: string,
  sourceLabel: string,
  coaCode: string,
  coaName: string,
  options?: {
    facilityId?: string;
    documentId?: string;
    reviewedBy?: string;
  }
): Promise<void> {
  await learnFromMapping({
    dealId,
    facilityId: options?.facilityId,
    documentId: options?.documentId,
    sourceLabel,
    coaCode,
    coaName,
    reviewedBy: options?.reviewedBy,
  });
}

// Map extracted financial data to COA (synchronous - static rules only)
export function mapExtractedDataToCOA(
  extractedData: ExtractedFinancialData
): { mappings: MappingResult[]; suggestions: MappingSuggestion[] } {
  const mappings: MappingResult[] = [];
  const suggestions: MappingSuggestion[] = [];

  for (const lineItem of extractedData.lineItems) {
    const match = findCOAMatch(lineItem.label, lineItem.category);

    if (match && match.confidence >= 0.70) {
      const account = SNF_CHART_OF_ACCOUNTS.find(a => a.code === match.coaCode);
      const monthlyValues: Record<string, number> = {};

      for (const mv of lineItem.values) {
        monthlyValues[mv.month] = mv.value;
      }

      mappings.push({
        coaCode: match.coaCode,
        coaName: account?.name || 'Unknown',
        sourceLabel: lineItem.rawLabel,
        monthlyValues,
        confidence: match.confidence * lineItem.confidence,
        mappingMethod: match.confidence >= 0.90 ? 'exact' : 'fuzzy',
        needsReview: match.confidence < 0.90,
      });
    } else {
      // Add to suggestions for manual review
      const possibleMatches = findPossibleMatches(lineItem.label, lineItem.category);
      suggestions.push({
        sourceLabel: lineItem.rawLabel,
        suggestions: possibleMatches,
      });
    }
  }

  return { mappings, suggestions };
}

// Map extracted financial data to COA with learning (async - uses database)
export async function mapExtractedDataToCOAWithLearning(
  extractedData: ExtractedFinancialData,
  dealId?: string
): Promise<{ mappings: MappingResult[]; suggestions: MappingSuggestion[] }> {
  const mappings: MappingResult[] = [];
  const suggestions: MappingSuggestion[] = [];

  for (const lineItem of extractedData.lineItems) {
    // Use learning-enabled match
    const match = await findCOAMatchWithLearning(lineItem.label, lineItem.category, dealId);

    if (match && match.confidence >= 0.70) {
      const account = SNF_CHART_OF_ACCOUNTS.find(a => a.code === match.coaCode);
      const monthlyValues: Record<string, number> = {};

      for (const mv of lineItem.values) {
        monthlyValues[mv.month] = mv.value;
      }

      const isLearned = match.reason.includes('learned') || match.reason.includes('deal') || match.reason.includes('pattern');

      mappings.push({
        coaCode: match.coaCode,
        coaName: account?.name || 'Unknown',
        sourceLabel: lineItem.rawLabel,
        monthlyValues,
        confidence: match.confidence * lineItem.confidence,
        mappingMethod: isLearned ? 'ml' : (match.confidence >= 0.90 ? 'exact' : 'fuzzy'),
        needsReview: match.confidence < 0.90,
      });
    } else {
      // Get enhanced suggestions including learned patterns
      const allSuggestions = await getAllSuggestions(lineItem.label, lineItem.category, dealId);
      suggestions.push({
        sourceLabel: lineItem.rawLabel,
        suggestions: allSuggestions,
      });
    }
  }

  return { mappings, suggestions };
}

// Find possible COA matches for manual selection
function findPossibleMatches(
  label: string,
  category?: string
): Array<{ coaCode: string; coaName: string; confidence: number; reason: string }> {
  const results: Array<{ coaCode: string; coaName: string; confidence: number; reason: string }> = [];
  const normalized = normalizeLabel(label);
  const words = normalized.split('_');

  // Search through all accounts
  for (const account of SNF_CHART_OF_ACCOUNTS) {
    if (account.isHeader) continue;

    const accountNormalized = normalizeLabel(account.name);
    const accountWords = accountNormalized.split('_');

    // Check word overlap
    const commonWords = words.filter(w => accountWords.includes(w) && w.length > 2);
    if (commonWords.length > 0) {
      const confidence = (commonWords.length / Math.max(words.length, accountWords.length)) * 0.7;
      results.push({
        coaCode: account.code,
        coaName: account.name,
        confidence,
        reason: `Word match: ${commonWords.join(', ')}`,
      });
    }

    // Check mapping keys
    if (account.mappingKeys) {
      for (const key of account.mappingKeys) {
        if (normalized.includes(key) || key.includes(normalized)) {
          results.push({
            coaCode: account.code,
            coaName: account.name,
            confidence: 0.6,
            reason: `Mapping key similarity: ${key}`,
          });
        }
      }
    }
  }

  // Sort by confidence and take top 5
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

// Convert mapping results to proforma-compatible format
export function convertMappingsToProformaData(
  mappings: MappingResult[]
): Record<string, Record<string, number>> {
  const result: Record<string, Record<string, number>> = {};

  for (const mapping of mappings) {
    if (!result[mapping.coaCode]) {
      result[mapping.coaCode] = {};
    }

    for (const [month, value] of Object.entries(mapping.monthlyValues)) {
      // If we have multiple sources mapping to same COA, sum them
      result[mapping.coaCode][month] = (result[mapping.coaCode][month] || 0) + value;
    }
  }

  return result;
}

// Export a summary of unmapped items
export function getUnmappedSummary(
  suggestions: MappingSuggestion[]
): { category: string; count: number; examples: string[] }[] {
  const categoryMap = new Map<string, string[]>();

  for (const suggestion of suggestions) {
    const label = suggestion.sourceLabel.toLowerCase();
    let category = 'Other';

    if (label.includes('revenue') || label.includes('income')) {
      category = 'Revenue';
    } else if (label.includes('nursing') || label.includes('rn') || label.includes('lpn')) {
      category = 'Nursing';
    } else if (label.includes('therapy') || label.includes('pt') || label.includes('ot')) {
      category = 'Therapy';
    } else if (label.includes('dietary') || label.includes('food')) {
      category = 'Dietary';
    } else if (label.includes('admin')) {
      category = 'Administration';
    }

    if (!categoryMap.has(category)) {
      categoryMap.set(category, []);
    }
    categoryMap.get(category)!.push(suggestion.sourceLabel);
  }

  return Array.from(categoryMap.entries()).map(([category, items]) => ({
    category,
    count: items.length,
    examples: items.slice(0, 3),
  }));
}
