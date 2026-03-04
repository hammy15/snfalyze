// =============================================================================
// SYNTHESIS LAYER — Merges Newo + Dev into unified analysis
//
// This is deterministic (no AI call). It identifies tension points where the
// two brains disagree, reconciles recommendations, and builds a unified narrative.
// The tension points are often the most valuable insights — they surface the
// exact questions that need answering before making a decision.
// =============================================================================

import type {
  NewoResult,
  DevResult,
  DualBrainResult,
  SynthesisResult,
  TensionPoint,
  TensionCategory,
} from './types';
import type { AnalysisInput } from '../engine';

// =============================================================================
// MAIN SYNTHESIS FUNCTION
// =============================================================================

export function synthesizeBrains(
  newo: NewoResult,
  dev: DevResult,
  deal: AnalysisInput,
  metadata: { newoLatencyMs: number; devLatencyMs: number }
): DualBrainResult {
  const synthesisStart = Date.now();

  const tensionPoints = findTensionPoints(newo, dev);
  const { recommendation, confidence } = reconcileRecommendations(newo, dev);
  const unifiedNarrative = buildUnifiedNarrative(newo, dev, tensionPoints);
  const keyInsight = extractKeyInsight(newo, dev, tensionPoints);
  const criticalQuestions = mergeCriticalQuestions(newo, dev);

  const synthesisLatencyMs = Date.now() - synthesisStart;

  return {
    newo,
    dev,
    synthesis: {
      unifiedNarrative,
      recommendation,
      confidence,
      tensionPoints,
      keyInsight,
      criticalQuestions,
    },
    metadata: {
      dealId: deal.id,
      dealName: deal.name,
      analyzedAt: new Date().toISOString(),
      newoLatencyMs: metadata.newoLatencyMs,
      devLatencyMs: metadata.devLatencyMs,
      synthesisLatencyMs,
      totalLatencyMs: Math.max(metadata.newoLatencyMs, metadata.devLatencyMs) + synthesisLatencyMs,
    },
  };
}

// =============================================================================
// TENSION POINT DETECTION
// =============================================================================

export function findTensionPoints(newo: NewoResult, dev: DevResult): TensionPoint[] {
  const tensions: TensionPoint[] = [];

  // 1. Recommendation divergence
  if (newo.recommendation !== dev.recommendation) {
    tensions.push({
      category: 'recommendation',
      title: 'Recommendation Divergence',
      newoPosition: `Newo says "${newo.recommendation}" — ${getRecommendationSummary('newo', newo)}`,
      devPosition: `Dev says "${dev.recommendation}" — ${getRecommendationSummary('dev', dev)}`,
      significance: getRecommendationDivergenceSignificance(newo.recommendation, dev.recommendation),
      resolutionHint: newo.recommendation === 'pass' || dev.recommendation === 'pass'
        ? 'A "pass" from either brain requires addressing the specific concerns before proceeding.'
        : 'Review both perspectives to determine which concerns are addressable in the deal structure.',
    });
  }

  // 2. Confidence gap (>20 points)
  const confidenceGap = Math.abs(newo.confidenceScore - dev.confidenceScore);
  if (confidenceGap > 20) {
    const higherBrain = newo.confidenceScore > dev.confidenceScore ? 'Newo' : 'Dev';
    const lowerBrain = higherBrain === 'Newo' ? 'Dev' : 'Newo';
    tensions.push({
      category: 'confidence',
      title: `${confidenceGap}-Point Confidence Gap`,
      newoPosition: `Newo confidence: ${newo.confidenceScore}/100`,
      devPosition: `Dev confidence: ${dev.confidenceScore}/100`,
      significance: confidenceGap > 35 ? 'high' : 'medium',
      resolutionHint: `${lowerBrain} has lower confidence. Review ${lowerBrain}'s specific concerns to determine if additional data could close the gap.`,
    });
  }

  // 3. Valuation vs operational cost tension
  if (dev.valuationScenarios?.base && newo.qualityRemediation) {
    const baseValue = dev.valuationScenarios.base.value;
    const remediationCost = newo.qualityRemediation.annualCostEstimate * (newo.qualityRemediation.timelineMonths / 12);
    const remediationAsPercentOfValue = baseValue > 0 ? (remediationCost / baseValue) * 100 : 0;

    if (remediationAsPercentOfValue > 15) {
      tensions.push({
        category: 'valuation',
        title: 'Remediation Cost vs Deal Value',
        newoPosition: `Quality remediation will cost ~$${formatMoney(remediationCost)} over ${newo.qualityRemediation.timelineMonths} months (${remediationAsPercentOfValue.toFixed(0)}% of deal value).`,
        devPosition: `Base case deal value: $${formatMoney(baseValue)}. The remediation cost must be priced into the offer.`,
        significance: remediationAsPercentOfValue > 25 ? 'high' : 'medium',
        resolutionHint: 'Reduce the target price by the NPV of remediation costs, or structure an escrow/holdback.',
      });
    }
  }

  // 4. Platform upside vs deal price tension
  if (newo.platformUpside?.totalAnnualSynergies > 0 && dev.dealStructure?.targetPrice > 0) {
    const synergiesCapitalized = newo.platformUpside.totalAnnualSynergies / 0.125; // 12.5% cap rate
    const synergiesAsPercentOfPrice = (synergiesCapitalized / dev.dealStructure.targetPrice) * 100;

    if (synergiesAsPercentOfPrice > 20) {
      tensions.push({
        category: 'valuation',
        title: 'Significant Platform Upside Identified',
        newoPosition: `Platform synergies of $${formatMoney(newo.platformUpside.totalAnnualSynergies)}/yr (capitalized: $${formatMoney(synergiesCapitalized)}) = ${synergiesAsPercentOfPrice.toFixed(0)}% value creation above purchase price.`,
        devPosition: `Target price: $${formatMoney(dev.dealStructure.targetPrice)}. Platform upside is real but should not inflate the offer — capture it post-close.`,
        significance: 'medium',
        resolutionHint: 'Platform upside is Cascadia\'s edge. Don\'t pay for it — realize it after acquisition.',
      });
    }
  }

  // 5. Operational risk vs strategic opportunity tension
  const criticalOpRisks = newo.operationalRisks?.filter(r => r.severity === 'critical') || [];
  const strategicScore = dev.strategicFit?.overallScore || 0;

  if (criticalOpRisks.length > 0 && strategicScore > 70) {
    tensions.push({
      category: 'risk_assessment',
      title: 'High Strategic Fit Despite Critical Operational Risks',
      newoPosition: `${criticalOpRisks.length} critical operational risk(s): ${criticalOpRisks.map(r => r.risk).join('; ')}`,
      devPosition: `Strategic fit score: ${strategicScore}/100. ${dev.strategicFit?.geographicOverlap || ''}`,
      significance: 'high',
      resolutionHint: 'Strong strategic fit doesn\'t overcome operational reality. Price the operational risks explicitly or structure the deal to mitigate them (escrow, earnout, carve-out).',
    });
  }

  // 6. Timeline mismatch — operational stabilization vs deal execution
  if (newo.qualityRemediation?.timelineMonths > 18 && dev.pipelineRanking?.timelineToClose) {
    const closeTimeline = dev.pipelineRanking.timelineToClose;
    tensions.push({
      category: 'timeline',
      title: 'Stabilization Timeline vs IPO Clock',
      newoPosition: `Quality remediation requires ${newo.qualityRemediation.timelineMonths} months. Staffing normalization timeline: ${newo.operationalViability?.agencyEliminationTimeline || 'unknown'}.`,
      devPosition: `Deal timeline: ${closeTimeline}. IPO path requires clean operations within 12-18 months post-close.`,
      significance: newo.qualityRemediation.timelineMonths > 24 ? 'high' : 'medium',
      resolutionHint: 'Long remediation timelines can delay IPO readiness. Consider phased acquisition or pre-close remediation requirements.',
    });
  }

  return tensions;
}

// =============================================================================
// RECOMMENDATION RECONCILIATION
// =============================================================================

export function reconcileRecommendations(
  newo: NewoResult,
  dev: DevResult
): { recommendation: 'pursue' | 'conditional' | 'pass'; confidence: number } {
  const recs = [newo.recommendation, dev.recommendation];

  // If either says pass, overall is conditional at best
  if (recs.includes('pass')) {
    return {
      recommendation: recs.every(r => r === 'pass') ? 'pass' : 'conditional',
      confidence: Math.min(newo.confidenceScore, dev.confidenceScore),
    };
  }

  // If both pursue, overall is pursue
  if (recs.every(r => r === 'pursue')) {
    return {
      recommendation: 'pursue',
      confidence: Math.round((newo.confidenceScore * 0.45 + dev.confidenceScore * 0.55)),
    };
  }

  // Mixed pursue/conditional = conditional
  return {
    recommendation: 'conditional',
    confidence: Math.round((newo.confidenceScore * 0.45 + dev.confidenceScore * 0.55)),
  };
}

// =============================================================================
// UNIFIED NARRATIVE BUILDER
// =============================================================================

export function buildUnifiedNarrative(
  newo: NewoResult,
  dev: DevResult,
  tensions: TensionPoint[]
): string {
  const parts: string[] = [];

  // Opening — combined thesis
  parts.push(`**Combined Assessment**: ${dev.narrative?.split('.')[0] || 'Strategic analysis complete.'} From an operational standpoint, ${newo.narrative?.split('.')[0]?.toLowerCase() || 'operational assessment complete.'}`);

  // Recommendation line
  const { recommendation } = reconcileRecommendations(newo, dev);
  const recLabel = recommendation === 'pursue' ? 'PURSUE' : recommendation === 'conditional' ? 'CONDITIONAL PURSUE' : 'PASS';
  parts.push(`\n**Unified Recommendation: ${recLabel}** (Newo: ${newo.recommendation} at ${newo.confidenceScore}% confidence | Dev: ${dev.recommendation} at ${dev.confidenceScore}% confidence)`);

  // Key financials from Dev
  if (dev.dealStructure) {
    parts.push(`\n**Deal Intelligence**: Opening bid $${formatMoney(dev.dealStructure.openingBid)} → Target $${formatMoney(dev.dealStructure.targetPrice)} → Walk-away $${formatMoney(dev.dealStructure.walkAwayCeiling)}.`);
  }

  // Platform upside from Newo
  if (newo.platformUpside?.totalAnnualSynergies > 0) {
    parts.push(`**Platform Upside**: $${formatMoney(newo.platformUpside.totalAnnualSynergies)}/year in Cascadia synergies (${newo.platformUpside.timelineToRealize} to realize).`);
  }

  // Tension points summary
  if (tensions.length > 0) {
    const highTensions = tensions.filter(t => t.significance === 'high');
    if (highTensions.length > 0) {
      parts.push(`\n**Key Tension${highTensions.length > 1 ? 's' : ''}**: ${highTensions.map(t => t.title).join('; ')}. These disagreements between the operational and strategic views represent the critical questions that must be resolved.`);
    }
  } else {
    parts.push('\n**Brain Alignment**: Newo and Dev are aligned on this analysis — no significant disagreements.');
  }

  // IPO context
  if (dev.ipoImpact) {
    parts.push(`\n**IPO Impact**: ${dev.ipoImpact.currentCascadiaOps} → ${dev.ipoImpact.postAcquisitionOps} operations. ${dev.ipoImpact.ipoReadiness === 'ready' ? 'IPO-ready scale.' : dev.ipoImpact.ipoReadiness === 'close' ? 'Approaching IPO threshold.' : 'Additional acquisitions needed for IPO scale.'}`);
  }

  return parts.join('\n');
}

// =============================================================================
// HELPERS
// =============================================================================

function extractKeyInsight(newo: NewoResult, dev: DevResult, tensions: TensionPoint[]): string {
  // The key insight is the single most important finding from combining both views
  const highTensions = tensions.filter(t => t.significance === 'high');

  if (highTensions.length > 0) {
    return `Critical divergence: ${highTensions[0].title}. ${highTensions[0].resolutionHint}`;
  }

  if (newo.recommendation === 'pursue' && dev.recommendation === 'pursue') {
    const synergies = newo.platformUpside?.totalAnnualSynergies || 0;
    return synergies > 0
      ? `Both brains aligned on pursue. Cascadia's platform creates $${formatMoney(synergies)}/yr in synergies — the operational upside is real.`
      : 'Both brains aligned on pursue. Operational and strategic analysis support this acquisition.';
  }

  if (newo.operationalViability?.score > 70 && dev.strategicFit?.overallScore > 70) {
    return 'Strong operational viability AND strong strategic fit — this is a high-quality target.';
  }

  return 'Analysis complete. Review both brain perspectives for the full picture.';
}

function mergeCriticalQuestions(newo: NewoResult, dev: DevResult): SynthesisResult['criticalQuestions'] {
  // Build critical questions from both brain outputs
  const questions: SynthesisResult['criticalQuestions'] = {
    whatMustGoRightFirst: [],
    whatCannotGoWrong: [],
    whatBreaksThisDeal: [],
    whatRiskIsUnderpriced: [],
  };

  // From Newo — operational questions
  if (newo.operationalRisks?.length) {
    const critical = newo.operationalRisks.filter(r => r.severity === 'critical');
    questions.whatCannotGoWrong.push(...critical.map(r => `[Newo] ${r.risk}`));

    const nonFixable = newo.operationalRisks.filter(r => !r.cascadiaCanFix);
    questions.whatBreaksThisDeal.push(...nonFixable.map(r => `[Newo] ${r.risk} — Cascadia cannot fix this.`));
  }

  if (newo.qualityRemediation?.annualCostEstimate > 0) {
    questions.whatMustGoRightFirst.push(`[Newo] Quality remediation must succeed — $${formatMoney(newo.qualityRemediation.annualCostEstimate)}/yr investment required.`);
  }

  if (newo.staffingAnalysis?.annualStaffingCostDelta > 0) {
    questions.whatRiskIsUnderpriced.push(`[Newo] Staffing normalization cost: $${formatMoney(newo.staffingAnalysis.annualStaffingCostDelta)}/yr additional labor cost.`);
  }

  // From Dev — strategic questions
  if (dev.strategicRisks?.length) {
    const critical = dev.strategicRisks.filter(r => r.severity === 'critical');
    questions.whatBreaksThisDeal.push(...critical.map(r => `[Dev] ${r.risk}`));

    const regulatory = dev.strategicRisks.filter(r => r.category === 'regulatory');
    questions.whatCannotGoWrong.push(...regulatory.map(r => `[Dev] ${r.risk}`));
  }

  if (dev.companyIntelligence?.sellerMotivation === 'low') {
    questions.whatMustGoRightFirst.push('[Dev] Seller motivation is low — may need creative deal structure to engage.');
  }

  if (dev.dueDiligence?.length) {
    const critical = dev.dueDiligence.filter(dd => dd.priority === 'critical');
    questions.whatMustGoRightFirst.push(...critical.slice(0, 3).map(dd => `[Dev] Verify: ${dd.item}`));
  }

  return questions;
}

function getRecommendationSummary(brain: 'newo' | 'dev', result: NewoResult | DevResult): string {
  if (brain === 'newo') {
    const n = result as NewoResult;
    return n.operationalViability?.assessment?.split('.')[0] || 'Operational assessment provided.';
  }
  const d = result as DevResult;
  return d.pipelineRanking?.actionRequired || 'Strategic assessment provided.';
}

function getRecommendationDivergenceSignificance(
  newo: 'pursue' | 'conditional' | 'pass',
  dev: 'pursue' | 'conditional' | 'pass'
): 'high' | 'medium' | 'low' {
  if ((newo === 'pursue' && dev === 'pass') || (newo === 'pass' && dev === 'pursue')) return 'high';
  if (newo === 'pass' || dev === 'pass') return 'high';
  return 'medium'; // pursue vs conditional
}

function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}
