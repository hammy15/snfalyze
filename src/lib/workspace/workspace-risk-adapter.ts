import { db } from '@/db';
import { deals, facilities, financialPeriods, dealWorkspaceStages, riskFactors } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { RiskEngine } from '@/lib/analysis/risk/risk-engine';
import type { RiskScoreStageData, RiskCategoryScore, DealBreakerFlag, RiskItem } from '@/types/workspace';

// ── PRD 6-Category mapping from existing 8-category engine ──────────
// Regulatory (25%) ← regulatory
// Operational (20%) ← operational
// Financial (20%) ← financial
// Market (15%) ← market
// Ownership/Legal (10%) ← legal + reputational (merged)
// Integration (10%) ← environmental + technology + new factors

const WORKSPACE_CATEGORY_WEIGHTS = {
  regulatory: 0.25,
  operational: 0.20,
  financial: 0.20,
  market: 0.15,
  reputational: 0.05, // Merged into ownership_legal
  legal: 0.05,        // Merged into ownership_legal
  environmental: 0.05, // Merged into integration
  technology: 0.05,    // Merged into integration
};

const PRD_CATEGORY_MAP: Record<string, { label: string; weight: number; sources: string[] }> = {
  regulatory: { label: 'Regulatory', weight: 0.25, sources: ['regulatory'] },
  operational: { label: 'Operational', weight: 0.20, sources: ['operational'] },
  financial: { label: 'Financial', weight: 0.20, sources: ['financial'] },
  market: { label: 'Market', weight: 0.15, sources: ['market'] },
  ownership_legal: { label: 'Ownership / Legal', weight: 0.10, sources: ['legal', 'reputational'] },
  integration: { label: 'Integration', weight: 0.10, sources: ['environmental', 'technology'] },
};

// ── Risk-adjusted valuation multipliers ─────────────────────────────
const RISK_ADJUSTMENT_TABLE: Record<string, { discount: number; description: string }> = {
  LOW: { discount: 0, description: 'Market multiple as-is' },
  MODERATE: { discount: -0.03, description: 'Slight multiple compression (-0.25x)' },
  ELEVATED: { discount: -0.08, description: 'Moderate discount (-0.5x to -1.0x)' },
  HIGH: { discount: -0.20, description: 'Significant discount (-20-30%)' },
  CRITICAL: { discount: -0.35, description: 'Deal-breaker review required' },
};

export interface WorkspaceRiskResult extends RiskScoreStageData {
  persistedFactorCount: number;
}

export async function calculateWorkspaceRisk(dealId: string): Promise<WorkspaceRiskResult> {
  // Load deal + facility + financials + intake data
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error('Deal not found');

  const facilityList = await db.select().from(facilities).where(eq(facilities.dealId, dealId)).limit(1);
  const facility = facilityList[0] || null;

  const periods = await db.select().from(financialPeriods).where(eq(financialPeriods.dealId, dealId)).limit(1);
  const latestPeriod = periods[0] || null;

  const [intakeStage] = await db
    .select()
    .from(dealWorkspaceStages)
    .where(and(eq(dealWorkspaceStages.dealId, dealId), eq(dealWorkspaceStages.stage, 'deal_intake')));

  const intakeData = (intakeStage?.stageData || {}) as Record<string, Record<string, unknown>>;
  const fi = intakeData.facilityIdentification || {};
  const fs = intakeData.financialSnapshot || {};
  const ops = intakeData.operationalSnapshot || {};
  const mc = intakeData.marketContext || {};

  // Build RiskEngine input from workspace data
  const beds = (fi.licensedBeds as number) || deal.beds || 120;
  const state = (fi.state as string) || deal.primaryState || 'OH';

  const riskInput = {
    facility: {
      id: deal.id,
      name: deal.name || 'Unknown',
      address: {
        street: (fi.address as string) || '',
        city: (fi.city as string) || '',
        state,
        zip: (fi.zipCode as string) || '',
      },
      assetType: deal.assetType === 'ALF' ? 'ALF' as const : 'SNF' as const,
      beds: {
        licensed: beds,
        certified: (fi.medicareCertifiedBeds as number) || beds,
        operational: Math.round(beds * ((ops.cmsOverallRating as number) ? 0.85 : 0.80)),
      },
      yearBuilt: 2000,
      stories: 1,
      buildingCount: 1,
      roomConfiguration: { private: Math.round(beds * 0.3), semiPrivate: Math.round(beds * 0.7) },
      ownershipType: 'for_profit' as const,
      locationType: (mc.marketType as 'urban' | 'suburban' | 'rural') || 'suburban',
      region: getRegion(state),
    },
    cmsData: {
      overallRating: (ops.cmsOverallRating as number) || null,
      healthInspectionRating: (ops.cmsInspectionStar as number) || null,
      staffingRating: (ops.cmsStaffingStar as number) || null,
      qualityMeasureRating: (ops.cmsQualityStar as number) || null,
      isSFF: facility?.isSff || false,
      isSffCandidate: facility?.isSffWatch || false,
      hasAbuseIcon: false,
      totalDeficiencies: (ops.ijCitationsLast3Years as number) || 0,
    },
    operations: {
      currentCensus: Math.round(beds * 0.82),
      occupancyRate: latestPeriod?.occupancyRate ? parseFloat(latestPeriod.occupancyRate) * 100 : 82,
      occupancyTrend: 'stable' as const,
      payerMix: {
        medicareA: (fs.medicareCensusPercent as number) || 15,
        medicareB: 3,
        medicareAdvantage: 4,
        medicaid: (fs.medicaidCensusPercent as number) || 58,
        privatePay: (fs.privatePayCensusPercent as number) || 18,
        managedCare: 2,
        vaContract: 0,
        hospice: 0,
        other: 0,
      },
      acuityLevel: ((ops.cmi as number) || 1.0) > 1.2 ? 'high' as const : 'moderate' as const,
      staffing: {
        rnHPPD: 0.8,
        lpnHPPD: 0.8,
        cnaHPPD: 2.5,
        totalHPPD: 4.1,
        agencyUsagePercent: (ops.agencyStaffPercent as number) || 8,
        turnoverRate: 45,
      },
      averageLOS: { medicare: 25, medicaid: 365, privatePay: 45, overall: 120 },
    },
    financials: latestPeriod ? {
      normalized: {
        metrics: {
          noi: latestPeriod.noi ? parseFloat(latestPeriod.noi) : 0,
          ebitdarMargin: latestPeriod.ebitdar && latestPeriod.totalRevenue
            ? parseFloat(latestPeriod.ebitdar) / parseFloat(latestPeriod.totalRevenue)
            : 0.15,
          laborCostPercent: latestPeriod.laborCost && latestPeriod.totalRevenue
            ? parseFloat(latestPeriod.laborCost) / parseFloat(latestPeriod.totalRevenue)
            : 0.62,
          revenuePerPatientDay: latestPeriod.totalRevenue && latestPeriod.averageDailyCensus
            ? parseFloat(latestPeriod.totalRevenue) / (parseFloat(latestPeriod.averageDailyCensus) * 365)
            : 180,
        },
      },
    } : undefined,
    market: {
      marketOccupancy: (mc.marketOccupancyRate as number) ? (mc.marketOccupancyRate as number) / 100 : 0.82,
      demandGrowthRate: 0.01,
    },
  };

  // Run the existing risk engine with workspace weights
  const engine = new RiskEngine({ categoryWeights: WORKSPACE_CATEGORY_WEIGHTS });

  let engineOutput;
  try {
    engineOutput = engine.assess(riskInput as unknown as Parameters<typeof engine.assess>[0]);
  } catch {
    // Fallback if engine fails (missing data, etc.)
    return buildFallbackResult(dealId, deal);
  }

  const assessment = engineOutput.assessment;

  // ── Map 8 categories → 6 PRD categories ───────────────────────────

  const categories: RiskCategoryScore[] = [];

  for (const [prdKey, config] of Object.entries(PRD_CATEGORY_MAP)) {
    const sourceScores = config.sources
      .map(src => assessment.categoryScores[src as keyof typeof assessment.categoryScores])
      .filter(Boolean);

    let combinedScore = 50;
    let factors: { name: string; score: number }[] = [];

    if (sourceScores.length > 0) {
      const totalWeight = sourceScores.reduce((sum, cs) => sum + (cs?.weight || 0), 0);
      combinedScore = totalWeight > 0
        ? sourceScores.reduce((sum, cs) => sum + (cs?.score || 0) * (cs?.weight || 0), 0) / totalWeight
        : 50;

      factors = sourceScores.flatMap(cs =>
        (cs?.factors || []).map(f => ({ name: f.name, score: f.score }))
      );
    }

    categories.push({
      category: prdKey as RiskCategoryScore['category'],
      label: config.label,
      score: Math.round(combinedScore),
      weight: config.weight,
      weightedScore: Math.round(combinedScore * config.weight),
      factors: factors.slice(0, 5).map(f => ({ ...f, description: f.name })),
    });
  }

  // Composite score from PRD categories
  const compositeScore = Math.round(
    categories.reduce((sum, c) => sum + c.score * c.weight, 0)
  );

  // Rating
  const rating = compositeScore >= 86 ? 'CRITICAL'
    : compositeScore >= 71 ? 'HIGH'
    : compositeScore >= 51 ? 'ELEVATED'
    : compositeScore >= 31 ? 'MODERATE'
    : 'LOW';

  // Deal breaker flags
  const dealBreakerFlags: DealBreakerFlag[] = [];
  if (engineOutput.dealBreakers?.anyTriggered) {
    for (const result of engineOutput.dealBreakers.results.filter((r: { result: { triggered: boolean } }) => r.result.triggered)) {
      dealBreakerFlags.push({
        id: result.rule,
        category: result.category || 'regulatory',
        description: result.name,
        severity: 'critical',
        recommendation: result.result.reason || 'Review required before proceeding',
      });
    }
  }

  // Elevated risk items (score >= 60)
  const elevatedRiskItems: RiskItem[] = assessment.keyRisks
    .filter(r => r.score >= 60)
    .map(r => ({
      id: r.name.toLowerCase().replace(/\s+/g, '_'),
      category: r.category || 'operational',
      description: r.name,
      detail: r.details,
    }));

  // Strengths (score <= 25)
  const strengths: RiskItem[] = [];
  for (const cat of Object.values(assessment.categoryScores)) {
    for (const factor of cat.factors) {
      if (factor.score <= 25) {
        strengths.push({
          id: factor.name.toLowerCase().replace(/\s+/g, '_'),
          category: factor.category || 'operational',
          description: factor.name,
          detail: factor.details,
        });
      }
    }
  }

  // Risk-adjusted valuation — fallback chain: asking price → intake asking → pro forma value
  let baseValue: number | null = deal.askingPrice ? parseFloat(deal.askingPrice) : null;
  let valueSource = 'asking price';

  // Try intake asking price
  if (!baseValue) {
    const intakeAsking = intakeData.ownershipDealStructure?.askingPrice as number | null;
    if (intakeAsking && intakeAsking > 0) {
      baseValue = intakeAsking;
      valueSource = 'intake asking price';
    }
  }

  // Try pro forma reconciled value
  if (!baseValue) {
    const [proFormaStage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(and(eq(dealWorkspaceStages.dealId, dealId), eq(dealWorkspaceStages.stage, 'pro_forma')));
    const pfData = (proFormaStage?.stageData || {}) as Record<string, unknown>;
    const valOutput = pfData.valuationOutput as Record<string, unknown> | undefined;
    const scenarios = pfData.scenarios as Record<string, Record<string, unknown>> | undefined;

    if (valOutput?.capRateValuation && (valOutput.capRateValuation as number) > 0) {
      baseValue = valOutput.capRateValuation as number;
      valueSource = 'cap rate valuation';
    } else if (valOutput?.ebitdaMultipleValuation && (valOutput.ebitdaMultipleValuation as number) > 0) {
      baseValue = valOutput.ebitdaMultipleValuation as number;
      valueSource = 'EBITDA multiple valuation';
    } else if (scenarios?.base?.impliedValue && (scenarios.base.impliedValue as number) > 0) {
      baseValue = scenarios.base.impliedValue as number;
      valueSource = 'pro forma base case';
    }
  }

  const adjustment = RISK_ADJUSTMENT_TABLE[rating];
  const riskAdjustedValuation = baseValue ? {
    originalValue: Math.round(baseValue),
    adjustedValue: Math.round(baseValue * (1 + adjustment.discount)),
    adjustmentPercent: +(adjustment.discount * 100).toFixed(1),
    adjustmentReason: `${adjustment.description} (based on ${valueSource})`,
  } : null;

  // ── Persist risk factors to DB ────────────────────────────────────

  // Clear existing workspace-generated factors
  await db.delete(riskFactors).where(eq(riskFactors.dealId, dealId));

  let persistedCount = 0;
  for (const risk of assessment.keyRisks.slice(0, 10)) {
    await db.insert(riskFactors).values({
      dealId,
      category: risk.category,
      description: risk.details || risk.name,
      severity: risk.severity,
      mitigationStrategy: risk.recommendation || null,
      isUnderpriced: risk.score >= 70,
    });
    persistedCount++;
  }

  return {
    compositeScore,
    rating,
    categories,
    dealBreakerFlags,
    elevatedRiskItems: elevatedRiskItems.slice(0, 8),
    strengths: strengths.slice(0, 6),
    riskAdjustedValuation,
    persistedFactorCount: persistedCount,
  };
}

// ── Fallback result for when engine fails ───────────────────────────

function buildFallbackResult(dealId: string, deal: typeof deals.$inferSelect): WorkspaceRiskResult {
  return {
    compositeScore: 50,
    rating: 'MODERATE',
    categories: Object.entries(PRD_CATEGORY_MAP).map(([key, config]) => ({
      category: key as RiskCategoryScore['category'],
      label: config.label,
      score: 50,
      weight: config.weight,
      weightedScore: Math.round(50 * config.weight),
      factors: [],
    })),
    dealBreakerFlags: [],
    elevatedRiskItems: [],
    strengths: [],
    riskAdjustedValuation: deal.askingPrice ? {
      originalValue: parseFloat(deal.askingPrice),
      adjustedValue: Math.round(parseFloat(deal.askingPrice) * 0.97),
      adjustmentPercent: -3,
      adjustmentReason: 'Default moderate risk adjustment (insufficient data)',
    } : null,
    persistedFactorCount: 0,
  };
}

// ── Helper ──────────────────────────────────────────────────────────

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
