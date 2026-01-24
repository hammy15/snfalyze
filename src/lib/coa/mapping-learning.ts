/**
 * Mapping Learning System
 *
 * Learns from manual COA mappings to improve future extraction accuracy.
 * Stores successful mappings at two levels:
 * 1. Deal-level (dealCoaMappings) - specific to a deal
 * 2. Global-level (coaMappings) - cross-deal patterns for reuse
 */

import { db, coaMappings, dealCoaMappings } from '@/db';
import { eq, and, sql, desc, ilike } from 'drizzle-orm';

// ============================================================================
// TYPES
// ============================================================================

export interface LearnedMapping {
  sourceLabel: string;
  normalizedLabel: string;
  coaCode: string;
  coaName: string;
  confidence: number;
  usageCount: number;
  source: 'global' | 'deal';
}

export interface MappingLearnInput {
  dealId: string;
  facilityId?: string;
  documentId?: string;
  sourceLabel: string;
  coaCode: string;
  coaName: string;
  reviewedBy?: string;
}

export interface LearnedSuggestion {
  coaCode: string;
  coaName: string;
  confidence: number;
  reason: string;
  usageCount: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Normalize a label for consistent matching
 */
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .trim();
}

/**
 * Generate variations of a label for fuzzy matching
 */
function generateLabelVariations(label: string): string[] {
  const normalized = normalizeLabel(label);
  const variations = [normalized];

  // Remove common prefixes/suffixes
  const withoutTotal = normalized.replace(/^total_/, '').replace(/_total$/, '');
  if (withoutTotal !== normalized) variations.push(withoutTotal);

  const withoutExpense = normalized.replace(/_expense$/, '').replace(/_expenses$/, '');
  if (withoutExpense !== normalized) variations.push(withoutExpense);

  const withoutRevenue = normalized.replace(/_revenue$/, '').replace(/_income$/, '');
  if (withoutRevenue !== normalized) variations.push(withoutRevenue);

  // Handle plural/singular
  if (normalized.endsWith('s') && normalized.length > 3) {
    variations.push(normalized.slice(0, -1));
  }

  return [...new Set(variations)];
}

// ============================================================================
// LEARNING FUNCTIONS
// ============================================================================

/**
 * Learn from a manual mapping - stores for future use
 */
export async function learnFromMapping(input: MappingLearnInput): Promise<void> {
  const { dealId, facilityId, documentId, sourceLabel, coaCode, coaName, reviewedBy } = input;
  const normalizedLabel = normalizeLabel(sourceLabel);

  // 1. Update or insert deal-specific mapping
  const existingDealMapping = await db.query.dealCoaMappings.findFirst({
    where: and(
      eq(dealCoaMappings.dealId, dealId),
      eq(dealCoaMappings.sourceLabel, sourceLabel)
    ),
  });

  if (existingDealMapping) {
    // Update existing mapping
    await db
      .update(dealCoaMappings)
      .set({
        coaCode,
        coaName,
        mappingMethod: 'manual',
        mappingConfidence: '1.0000',
        isMapped: true,
        reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(dealCoaMappings.id, existingDealMapping.id));
  } else {
    // Insert new mapping
    await db.insert(dealCoaMappings).values({
      dealId,
      facilityId,
      documentId,
      sourceLabel,
      coaCode,
      coaName,
      mappingMethod: 'manual',
      mappingConfidence: '1.0000',
      isMapped: true,
      reviewedBy,
      reviewedAt: new Date(),
    });
  }

  // 2. Update global mappings for cross-deal learning
  const existingGlobalMapping = await db.query.coaMappings.findFirst({
    where: and(
      eq(coaMappings.externalTerm, normalizedLabel),
      eq(coaMappings.cascadiaTerm, coaCode)
    ),
  });

  if (!existingGlobalMapping) {
    // Add to global mappings for future use
    await db.insert(coaMappings).values({
      externalTerm: normalizedLabel,
      cascadiaTerm: coaCode,
      category: getCategoryFromCode(coaCode),
      subcategory: coaName,
    }).onConflictDoNothing();
  }
}

/**
 * Learn from multiple mappings at once (batch operation)
 */
export async function learnFromMappings(inputs: MappingLearnInput[]): Promise<void> {
  for (const input of inputs) {
    await learnFromMapping(input);
  }
}

/**
 * Get category from COA code
 */
function getCategoryFromCode(code: string): string {
  const firstDigit = code.charAt(0);
  switch (firstDigit) {
    case '4': return 'revenue';
    case '5': return 'expense';
    case '6': return 'expense';
    case '7': return 'rent_occupancy';
    case '8': return 'depreciation_interest';
    case '9': return 'statistics';
    default: return 'other';
  }
}

// ============================================================================
// SUGGESTION FUNCTIONS
// ============================================================================

/**
 * Get learned mapping suggestions for a label
 * Checks both deal-specific and global mappings
 */
export async function getLearnedSuggestions(
  sourceLabel: string,
  dealId?: string
): Promise<LearnedSuggestion[]> {
  const normalizedLabel = normalizeLabel(sourceLabel);
  const variations = generateLabelVariations(sourceLabel);
  const suggestions: LearnedSuggestion[] = [];

  // 1. Check deal-specific mappings first (higher priority)
  if (dealId) {
    for (const variation of variations) {
      const dealMatches = await db.query.dealCoaMappings.findMany({
        where: and(
          eq(dealCoaMappings.dealId, dealId),
          eq(dealCoaMappings.isMapped, true),
          sql`lower(${dealCoaMappings.sourceLabel}) LIKE ${`%${variation}%`}`
        ),
        orderBy: [desc(dealCoaMappings.reviewedAt)],
        limit: 3,
      });

      for (const match of dealMatches) {
        if (match.coaCode && match.coaName) {
          const isExact = normalizeLabel(match.sourceLabel) === normalizedLabel;
          suggestions.push({
            coaCode: match.coaCode,
            coaName: match.coaName,
            confidence: isExact ? 0.95 : 0.80,
            reason: isExact ? 'Exact match from this deal' : 'Similar label from this deal',
            usageCount: 1,
          });
        }
      }
    }
  }

  // 2. Check global mappings
  for (const variation of variations) {
    const globalMatches = await db.query.coaMappings.findMany({
      where: sql`${coaMappings.externalTerm} LIKE ${`%${variation}%`}`,
      limit: 5,
    });

    for (const match of globalMatches) {
      const isExact = match.externalTerm === normalizedLabel;

      // Check if we already have this suggestion
      const existing = suggestions.find(s => s.coaCode === match.cascadiaTerm);
      if (existing) {
        existing.usageCount++;
        existing.confidence = Math.min(existing.confidence + 0.05, 0.98);
        continue;
      }

      suggestions.push({
        coaCode: match.cascadiaTerm,
        coaName: match.subcategory || match.cascadiaTerm,
        confidence: isExact ? 0.90 : 0.70,
        reason: isExact ? 'Exact match from learned patterns' : 'Similar pattern from other deals',
        usageCount: 1,
      });
    }
  }

  // 3. Sort by confidence and deduplicate
  const seen = new Set<string>();
  return suggestions
    .filter(s => {
      if (seen.has(s.coaCode)) return false;
      seen.add(s.coaCode);
      return true;
    })
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 5);
}

/**
 * Find the best learned match for a label
 * Returns null if no confident match found
 */
export async function findLearnedMatch(
  sourceLabel: string,
  dealId?: string,
  minConfidence: number = 0.75
): Promise<{ coaCode: string; coaName: string; confidence: number; reason: string } | null> {
  const suggestions = await getLearnedSuggestions(sourceLabel, dealId);

  if (suggestions.length > 0 && suggestions[0].confidence >= minConfidence) {
    return {
      coaCode: suggestions[0].coaCode,
      coaName: suggestions[0].coaName,
      confidence: suggestions[0].confidence,
      reason: suggestions[0].reason,
    };
  }

  return null;
}

// ============================================================================
// STATS AND MANAGEMENT
// ============================================================================

/**
 * Get mapping statistics for a deal
 */
export async function getDealMappingStats(dealId: string): Promise<{
  total: number;
  mapped: number;
  manual: number;
  auto: number;
  unmapped: number;
}> {
  const all = await db.query.dealCoaMappings.findMany({
    where: eq(dealCoaMappings.dealId, dealId),
  });

  return {
    total: all.length,
    mapped: all.filter(m => m.isMapped).length,
    manual: all.filter(m => m.mappingMethod === 'manual').length,
    auto: all.filter(m => m.mappingMethod === 'auto').length,
    unmapped: all.filter(m => !m.isMapped).length,
  };
}

/**
 * Get commonly unmapped labels across deals
 * Useful for identifying patterns that need to be added to static mappings
 */
export async function getCommonUnmappedLabels(limit: number = 20): Promise<{
  sourceLabel: string;
  count: number;
}[]> {
  const result = await db.execute(sql`
    SELECT source_label, COUNT(*) as count
    FROM deal_coa_mappings
    WHERE is_mapped = false
    GROUP BY source_label
    ORDER BY count DESC
    LIMIT ${limit}
  `);

  return (result.rows as Array<{ source_label: string; count: string }>).map(row => ({
    sourceLabel: row.source_label,
    count: parseInt(row.count, 10),
  }));
}

/**
 * Export learned mappings for backup/review
 */
export async function exportLearnedMappings(): Promise<{
  global: Array<{ externalTerm: string; cascadiaTerm: string; category: string | null }>;
  perDeal: Record<string, Array<{ sourceLabel: string; coaCode: string | null; coaName: string | null }>>;
}> {
  const globalMappings = await db.query.coaMappings.findMany();
  const dealMappings = await db.query.dealCoaMappings.findMany({
    where: eq(dealCoaMappings.isMapped, true),
  });

  // Group deal mappings by dealId
  const perDeal: Record<string, Array<{ sourceLabel: string; coaCode: string | null; coaName: string | null }>> = {};
  for (const mapping of dealMappings) {
    if (!perDeal[mapping.dealId]) {
      perDeal[mapping.dealId] = [];
    }
    perDeal[mapping.dealId].push({
      sourceLabel: mapping.sourceLabel,
      coaCode: mapping.coaCode,
      coaName: mapping.coaName,
    });
  }

  return {
    global: globalMappings.map(m => ({
      externalTerm: m.externalTerm,
      cascadiaTerm: m.cascadiaTerm,
      category: m.category,
    })),
    perDeal,
  };
}
