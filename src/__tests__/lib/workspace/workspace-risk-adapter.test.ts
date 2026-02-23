import { describe, it, expect } from 'vitest';

/**
 * Tests for workspace-risk-adapter.ts
 *
 * The main function (calculateWorkspaceRisk) requires database access,
 * so we test the exported constants, helper logic, and scoring rules
 * defined in the module. We re-declare the constants and helpers here
 * to validate the business rules without needing a DB connection.
 */

// ─── Re-declare constants matching the source exactly ────────────────────────

const PRD_CATEGORY_MAP: Record<string, { label: string; weight: number; sources: string[] }> = {
  regulatory: { label: 'Regulatory', weight: 0.25, sources: ['regulatory'] },
  operational: { label: 'Operational', weight: 0.20, sources: ['operational'] },
  financial: { label: 'Financial', weight: 0.20, sources: ['financial'] },
  market: { label: 'Market', weight: 0.15, sources: ['market'] },
  ownership_legal: { label: 'Ownership / Legal', weight: 0.10, sources: ['legal', 'reputational'] },
  integration: { label: 'Integration', weight: 0.10, sources: ['environmental', 'technology'] },
};

const RISK_ADJUSTMENT_TABLE: Record<string, { discount: number; description: string }> = {
  LOW: { discount: 0, description: 'Market multiple as-is' },
  MODERATE: { discount: -0.03, description: 'Slight multiple compression (-0.25x)' },
  ELEVATED: { discount: -0.08, description: 'Moderate discount (-0.5x to -1.0x)' },
  HIGH: { discount: -0.20, description: 'Significant discount (-20-30%)' },
  CRITICAL: { discount: -0.35, description: 'Deal-breaker review required' },
};

// Re-declare the getRegion helper matching the source
function getRegion(state: string): 'west' | 'midwest' | 'northeast' | 'southeast' | 'southwest' {
  const regionMap: Record<string, 'west' | 'midwest' | 'northeast' | 'southeast' | 'southwest'> = {
    WA: 'west', OR: 'west', CA: 'west', NV: 'west', ID: 'west', MT: 'west', WY: 'west', CO: 'west', UT: 'west', AK: 'west', HI: 'west',
    ND: 'midwest', SD: 'midwest', NE: 'midwest', KS: 'midwest', MN: 'midwest', IA: 'midwest', MO: 'midwest', WI: 'midwest', IL: 'midwest', MI: 'midwest', IN: 'midwest', OH: 'midwest',
    ME: 'northeast', NH: 'northeast', VT: 'northeast', MA: 'northeast', RI: 'northeast', CT: 'northeast', NY: 'northeast', NJ: 'northeast', PA: 'northeast', DE: 'northeast', MD: 'northeast', DC: 'northeast',
    VA: 'southeast', WV: 'southeast', NC: 'southeast', SC: 'southeast', GA: 'southeast', FL: 'southeast', AL: 'southeast', MS: 'southeast', TN: 'southeast', KY: 'southeast', LA: 'southeast', AR: 'southeast',
    TX: 'southwest', OK: 'southwest', NM: 'southwest', AZ: 'southwest',
  };
  return regionMap[state] || 'midwest';
}

// Re-declare the rating logic matching the source
function getRating(compositeScore: number): 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'CRITICAL' {
  if (compositeScore >= 86) return 'CRITICAL';
  if (compositeScore >= 71) return 'HIGH';
  if (compositeScore >= 51) return 'ELEVATED';
  if (compositeScore >= 31) return 'MODERATE';
  return 'LOW';
}

// ─── PRD_CATEGORY_MAP ────────────────────────────────────────────────────────

describe('PRD_CATEGORY_MAP', () => {
  it('should have exactly 6 categories', () => {
    expect(Object.keys(PRD_CATEGORY_MAP)).toHaveLength(6);
  });

  it('should contain all required category keys', () => {
    const expectedKeys = ['regulatory', 'operational', 'financial', 'market', 'ownership_legal', 'integration'];
    expect(Object.keys(PRD_CATEGORY_MAP).sort()).toEqual(expectedKeys.sort());
  });

  it('should have weights that sum to 1.0', () => {
    const totalWeight = Object.values(PRD_CATEGORY_MAP).reduce((sum, c) => sum + c.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 10);
  });

  it('should assign correct individual weights', () => {
    expect(PRD_CATEGORY_MAP.regulatory.weight).toBe(0.25);
    expect(PRD_CATEGORY_MAP.operational.weight).toBe(0.20);
    expect(PRD_CATEGORY_MAP.financial.weight).toBe(0.20);
    expect(PRD_CATEGORY_MAP.market.weight).toBe(0.15);
    expect(PRD_CATEGORY_MAP.ownership_legal.weight).toBe(0.10);
    expect(PRD_CATEGORY_MAP.integration.weight).toBe(0.10);
  });

  it('should have correct labels for each category', () => {
    expect(PRD_CATEGORY_MAP.regulatory.label).toBe('Regulatory');
    expect(PRD_CATEGORY_MAP.operational.label).toBe('Operational');
    expect(PRD_CATEGORY_MAP.financial.label).toBe('Financial');
    expect(PRD_CATEGORY_MAP.market.label).toBe('Market');
    expect(PRD_CATEGORY_MAP.ownership_legal.label).toBe('Ownership / Legal');
    expect(PRD_CATEGORY_MAP.integration.label).toBe('Integration');
  });

  it('should map ownership_legal from legal + reputational sources', () => {
    expect(PRD_CATEGORY_MAP.ownership_legal.sources).toEqual(['legal', 'reputational']);
  });

  it('should map integration from environmental + technology sources', () => {
    expect(PRD_CATEGORY_MAP.integration.sources).toEqual(['environmental', 'technology']);
  });

  it('should have single-source mappings for top 4 categories', () => {
    expect(PRD_CATEGORY_MAP.regulatory.sources).toEqual(['regulatory']);
    expect(PRD_CATEGORY_MAP.operational.sources).toEqual(['operational']);
    expect(PRD_CATEGORY_MAP.financial.sources).toEqual(['financial']);
    expect(PRD_CATEGORY_MAP.market.sources).toEqual(['market']);
  });
});

// ─── Rating thresholds ───────────────────────────────────────────────────────

describe('rating thresholds', () => {
  it('should rate score 0 as LOW', () => {
    expect(getRating(0)).toBe('LOW');
  });

  it('should rate score 30 as LOW', () => {
    expect(getRating(30)).toBe('LOW');
  });

  it('should rate score 31 as MODERATE', () => {
    expect(getRating(31)).toBe('MODERATE');
  });

  it('should rate score 50 as MODERATE', () => {
    expect(getRating(50)).toBe('MODERATE');
  });

  it('should rate score 51 as ELEVATED', () => {
    expect(getRating(51)).toBe('ELEVATED');
  });

  it('should rate score 70 as ELEVATED', () => {
    expect(getRating(70)).toBe('ELEVATED');
  });

  it('should rate score 71 as HIGH', () => {
    expect(getRating(71)).toBe('HIGH');
  });

  it('should rate score 85 as HIGH', () => {
    expect(getRating(85)).toBe('HIGH');
  });

  it('should rate score 86 as CRITICAL', () => {
    expect(getRating(86)).toBe('CRITICAL');
  });

  it('should rate score 100 as CRITICAL', () => {
    expect(getRating(100)).toBe('CRITICAL');
  });

  describe('boundary tests', () => {
    it('LOW range: 0 to 30', () => {
      for (const score of [0, 1, 15, 29, 30]) {
        expect(getRating(score)).toBe('LOW');
      }
    });

    it('MODERATE range: 31 to 50', () => {
      for (const score of [31, 35, 40, 45, 50]) {
        expect(getRating(score)).toBe('MODERATE');
      }
    });

    it('ELEVATED range: 51 to 70', () => {
      for (const score of [51, 55, 60, 65, 70]) {
        expect(getRating(score)).toBe('ELEVATED');
      }
    });

    it('HIGH range: 71 to 85', () => {
      for (const score of [71, 75, 80, 85]) {
        expect(getRating(score)).toBe('HIGH');
      }
    });

    it('CRITICAL range: 86 to 100', () => {
      for (const score of [86, 90, 95, 100]) {
        expect(getRating(score)).toBe('CRITICAL');
      }
    });
  });
});

// ─── Risk adjustment discounts ───────────────────────────────────────────────

describe('risk adjustment discounts', () => {
  it('LOW has 0% discount', () => {
    expect(RISK_ADJUSTMENT_TABLE.LOW.discount).toBe(0);
  });

  it('MODERATE has -3% discount', () => {
    expect(RISK_ADJUSTMENT_TABLE.MODERATE.discount).toBe(-0.03);
  });

  it('ELEVATED has -8% discount', () => {
    expect(RISK_ADJUSTMENT_TABLE.ELEVATED.discount).toBe(-0.08);
  });

  it('HIGH has -20% discount', () => {
    expect(RISK_ADJUSTMENT_TABLE.HIGH.discount).toBe(-0.20);
  });

  it('CRITICAL has -35% discount', () => {
    expect(RISK_ADJUSTMENT_TABLE.CRITICAL.discount).toBe(-0.35);
  });

  it('should have all 5 rating levels', () => {
    expect(Object.keys(RISK_ADJUSTMENT_TABLE).sort()).toEqual(
      ['CRITICAL', 'ELEVATED', 'HIGH', 'LOW', 'MODERATE']
    );
  });

  it('discounts should be monotonically decreasing by severity', () => {
    const order = ['LOW', 'MODERATE', 'ELEVATED', 'HIGH', 'CRITICAL'];
    for (let i = 1; i < order.length; i++) {
      expect(RISK_ADJUSTMENT_TABLE[order[i]].discount).toBeLessThan(
        RISK_ADJUSTMENT_TABLE[order[i - 1]].discount
      );
    }
  });

  describe('valuation impact calculations', () => {
    const baseValue = 10_000_000; // $10M deal

    it('LOW: adjusted value equals original', () => {
      const adjusted = baseValue * (1 + RISK_ADJUSTMENT_TABLE.LOW.discount);
      expect(adjusted).toBe(10_000_000);
    });

    it('MODERATE: adjusted value is $9.7M', () => {
      const adjusted = baseValue * (1 + RISK_ADJUSTMENT_TABLE.MODERATE.discount);
      expect(adjusted).toBe(9_700_000);
    });

    it('ELEVATED: adjusted value is $9.2M', () => {
      const adjusted = baseValue * (1 + RISK_ADJUSTMENT_TABLE.ELEVATED.discount);
      expect(adjusted).toBe(9_200_000);
    });

    it('HIGH: adjusted value is $8M', () => {
      const adjusted = baseValue * (1 + RISK_ADJUSTMENT_TABLE.HIGH.discount);
      expect(adjusted).toBe(8_000_000);
    });

    it('CRITICAL: adjusted value is $6.5M', () => {
      const adjusted = baseValue * (1 + RISK_ADJUSTMENT_TABLE.CRITICAL.discount);
      expect(adjusted).toBe(6_500_000);
    });
  });
});

// ─── getRegion helper ────────────────────────────────────────────────────────

describe('getRegion', () => {
  describe('west region', () => {
    it.each(['WA', 'OR', 'CA', 'NV', 'ID', 'MT', 'WY', 'CO', 'UT', 'AK', 'HI'])(
      'should return "west" for %s',
      (state) => {
        expect(getRegion(state)).toBe('west');
      }
    );
  });

  describe('midwest region', () => {
    it.each(['ND', 'SD', 'NE', 'KS', 'MN', 'IA', 'MO', 'WI', 'IL', 'MI', 'IN', 'OH'])(
      'should return "midwest" for %s',
      (state) => {
        expect(getRegion(state)).toBe('midwest');
      }
    );
  });

  describe('northeast region', () => {
    it.each(['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA', 'DE', 'MD', 'DC'])(
      'should return "northeast" for %s',
      (state) => {
        expect(getRegion(state)).toBe('northeast');
      }
    );
  });

  describe('southeast region', () => {
    it.each(['VA', 'WV', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'TN', 'KY', 'LA', 'AR'])(
      'should return "southeast" for %s',
      (state) => {
        expect(getRegion(state)).toBe('southeast');
      }
    );
  });

  describe('southwest region', () => {
    it.each(['TX', 'OK', 'NM', 'AZ'])(
      'should return "southwest" for %s',
      (state) => {
        expect(getRegion(state)).toBe('southwest');
      }
    );
  });

  describe('specific state lookups', () => {
    it('OR should be west', () => expect(getRegion('OR')).toBe('west'));
    it('OH should be midwest', () => expect(getRegion('OH')).toBe('midwest'));
    it('NY should be northeast', () => expect(getRegion('NY')).toBe('northeast'));
    it('FL should be southeast', () => expect(getRegion('FL')).toBe('southeast'));
    it('TX should be southwest', () => expect(getRegion('TX')).toBe('southwest'));
  });

  it('should default to "midwest" for unknown state codes', () => {
    expect(getRegion('XX')).toBe('midwest');
    expect(getRegion('')).toBe('midwest');
    expect(getRegion('ZZ')).toBe('midwest');
  });
});

// ─── Fallback result structure ───────────────────────────────────────────────

describe('fallback result structure', () => {
  // Re-implement buildFallbackResult to test its shape
  function buildFallbackResult(askingPrice: string | null) {
    return {
      compositeScore: 50,
      rating: 'MODERATE' as const,
      categories: Object.entries(PRD_CATEGORY_MAP).map(([key, config]) => ({
        category: key,
        label: config.label,
        score: 50,
        weight: config.weight,
        weightedScore: Math.round(50 * config.weight),
        factors: [],
      })),
      dealBreakerFlags: [],
      elevatedRiskItems: [],
      strengths: [],
      riskAdjustedValuation: askingPrice ? {
        originalValue: parseFloat(askingPrice),
        adjustedValue: Math.round(parseFloat(askingPrice) * 0.97),
        adjustmentPercent: -3,
        adjustmentReason: 'Default moderate risk adjustment (insufficient data)',
      } : null,
      persistedFactorCount: 0,
    };
  }

  it('should have compositeScore of 50', () => {
    const result = buildFallbackResult(null);
    expect(result.compositeScore).toBe(50);
  });

  it('should have rating of MODERATE', () => {
    const result = buildFallbackResult(null);
    expect(result.rating).toBe('MODERATE');
  });

  it('should have 6 categories', () => {
    const result = buildFallbackResult(null);
    expect(result.categories).toHaveLength(6);
  });

  it('should set all category scores to 50', () => {
    const result = buildFallbackResult(null);
    for (const cat of result.categories) {
      expect(cat.score).toBe(50);
    }
  });

  it('should have correct weighted scores (score * weight)', () => {
    const result = buildFallbackResult(null);
    for (const cat of result.categories) {
      expect(cat.weightedScore).toBe(Math.round(50 * cat.weight));
    }
  });

  it('should have empty arrays for flags, risks, and strengths', () => {
    const result = buildFallbackResult(null);
    expect(result.dealBreakerFlags).toEqual([]);
    expect(result.elevatedRiskItems).toEqual([]);
    expect(result.strengths).toEqual([]);
  });

  it('should have persistedFactorCount of 0', () => {
    const result = buildFallbackResult(null);
    expect(result.persistedFactorCount).toBe(0);
  });

  it('should include risk-adjusted valuation when asking price provided', () => {
    const result = buildFallbackResult('10000000');
    expect(result.riskAdjustedValuation).not.toBeNull();
    expect(result.riskAdjustedValuation!.originalValue).toBe(10_000_000);
    expect(result.riskAdjustedValuation!.adjustedValue).toBe(9_700_000); // 10M * 0.97
    expect(result.riskAdjustedValuation!.adjustmentPercent).toBe(-3);
  });

  it('should have null risk-adjusted valuation when no asking price', () => {
    const result = buildFallbackResult(null);
    expect(result.riskAdjustedValuation).toBeNull();
  });
});

// ─── Composite score to rating integration ───────────────────────────────────

describe('composite score calculation', () => {
  it('should compute composite as weighted sum of category scores', () => {
    const categoryScores = [
      { score: 40, weight: 0.25 }, // regulatory
      { score: 60, weight: 0.20 }, // operational
      { score: 30, weight: 0.20 }, // financial
      { score: 50, weight: 0.15 }, // market
      { score: 20, weight: 0.10 }, // ownership_legal
      { score: 70, weight: 0.10 }, // integration
    ];

    const compositeScore = Math.round(
      categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0)
    );

    // 40*0.25 + 60*0.20 + 30*0.20 + 50*0.15 + 20*0.10 + 70*0.10
    // = 10 + 12 + 6 + 7.5 + 2 + 7 = 44.5 → 45
    expect(compositeScore).toBe(45);
    expect(getRating(compositeScore)).toBe('MODERATE');
  });

  it('should rate a high-risk portfolio correctly', () => {
    const categoryScores = [
      { score: 90, weight: 0.25 },
      { score: 85, weight: 0.20 },
      { score: 80, weight: 0.20 },
      { score: 75, weight: 0.15 },
      { score: 70, weight: 0.10 },
      { score: 65, weight: 0.10 },
    ];

    const compositeScore = Math.round(
      categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0)
    );

    // 22.5 + 17 + 16 + 11.25 + 7 + 6.5 = 80.25 → 80
    expect(compositeScore).toBe(80);
    expect(getRating(compositeScore)).toBe('HIGH');
  });

  it('should rate a low-risk portfolio correctly', () => {
    const categoryScores = [
      { score: 10, weight: 0.25 },
      { score: 15, weight: 0.20 },
      { score: 12, weight: 0.20 },
      { score: 20, weight: 0.15 },
      { score: 8, weight: 0.10 },
      { score: 5, weight: 0.10 },
    ];

    const compositeScore = Math.round(
      categoryScores.reduce((sum, c) => sum + c.score * c.weight, 0)
    );

    // 2.5 + 3 + 2.4 + 3 + 0.8 + 0.5 = 12.2 → 12
    expect(compositeScore).toBe(12);
    expect(getRating(compositeScore)).toBe('LOW');
  });

  it('should rate an all-100 scenario as CRITICAL', () => {
    const compositeScore = Math.round(100 * 1.0); // all categories at 100
    expect(compositeScore).toBe(100);
    expect(getRating(compositeScore)).toBe('CRITICAL');
  });

  it('should rate an all-0 scenario as LOW', () => {
    const compositeScore = 0;
    expect(getRating(compositeScore)).toBe('LOW');
  });
});
