// =============================================================================
// LEARNING LAYER — Post-analysis knowledge capture
//
// After every dual-brain analysis, captures key insights as structured markdown
// in /knowledge/learnings/. These files are auto-indexed by the knowledge-loader
// (5-min cache TTL), so future analyses automatically learn from past ones.
// =============================================================================

import type { DualBrainResult } from './types';
import type { AnalysisInput } from '../engine';
import * as fs from 'fs/promises';
import * as path from 'path';

const LEARNINGS_DIR = path.join(process.cwd(), 'knowledge', 'learnings');

/**
 * Save a learning file from a completed dual-brain analysis.
 * Non-blocking — errors are logged but never thrown.
 */
export async function saveLearning(deal: AnalysisInput, result: DualBrainResult): Promise<void> {
  try {
    await fs.mkdir(LEARNINGS_DIR, { recursive: true });

    const slug = deal.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50);

    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}_${slug}.md`;
    const filepath = path.join(LEARNINGS_DIR, filename);

    const content = buildLearningMarkdown(deal, result);
    await fs.writeFile(filepath, content, 'utf-8');

    console.log(`[Learning] Saved analysis learning: ${filename}`);
  } catch (error) {
    console.error('[Learning] Failed to save learning:', error);
  }
}

function buildLearningMarkdown(deal: AnalysisInput, result: DualBrainResult): string {
  const { newo, dev, synthesis, metadata } = result;
  const sections: string[] = [];

  // Header
  sections.push(`# Analysis Learning: ${deal.name}`);
  sections.push(`> Generated ${metadata.analyzedAt} | Deal ID: ${metadata.dealId}`);
  sections.push('');

  // Deal context
  sections.push('## Deal Context');
  sections.push(`- **Asset Type**: ${deal.assetType}`);
  sections.push(`- **State**: ${deal.primaryState || 'Unknown'}`);
  sections.push(`- **Beds**: ${deal.beds || 'Unknown'}`);
  sections.push(`- **Asking Price**: ${deal.askingPrice || 'Not disclosed'}`);
  sections.push(`- **Facilities**: ${deal.facilities?.length || 0}`);
  sections.push('');

  // Unified recommendation
  sections.push('## Unified Recommendation');
  sections.push(`- **Recommendation**: ${synthesis.recommendation.toUpperCase()}`);
  sections.push(`- **Confidence**: ${synthesis.confidence}%`);
  sections.push(`- **Newo**: ${newo.recommendation} (${newo.confidenceScore}%)`);
  sections.push(`- **Dev**: ${dev.recommendation} (${dev.confidenceScore}%)`);
  sections.push('');

  // Key insight
  sections.push('## Key Insight');
  sections.push(synthesis.keyInsight);
  sections.push('');

  // Operational benchmarks (from Newo)
  sections.push('## Operational Benchmarks (Newo)');
  sections.push(`- **Operational Viability**: ${newo.operationalViability.score}/100`);
  if (newo.staffingAnalysis.currentHPPD) {
    sections.push(`- **HPPD**: ${newo.staffingAnalysis.currentHPPD} (target: ${newo.staffingAnalysis.targetHPPD})`);
  }
  if (newo.staffingAnalysis.currentAgencyPercent != null) {
    sections.push(`- **Agency %**: ${newo.staffingAnalysis.currentAgencyPercent}%`);
  }
  if (newo.qualityRemediation.annualCostEstimate > 0) {
    sections.push(`- **Quality Remediation**: $${(newo.qualityRemediation.annualCostEstimate / 1000).toFixed(0)}K/yr over ${newo.qualityRemediation.timelineMonths} months`);
  }
  if (newo.platformUpside.totalAnnualSynergies > 0) {
    sections.push(`- **Platform Synergies**: $${(newo.platformUpside.totalAnnualSynergies / 1000).toFixed(0)}K/yr`);
  }
  sections.push('');

  // Deal intelligence (from Dev)
  sections.push('## Deal Intelligence (Dev)');
  if (dev.dealStructure) {
    sections.push(`- **Opening Bid**: $${formatForLearning(dev.dealStructure.openingBid)}`);
    sections.push(`- **Target Price**: $${formatForLearning(dev.dealStructure.targetPrice)}`);
    sections.push(`- **Walk-Away**: $${formatForLearning(dev.dealStructure.walkAwayCeiling)}`);
  }
  if (dev.valuationScenarios?.base) {
    sections.push(`- **Base Case Value**: $${formatForLearning(dev.valuationScenarios.base.value)}`);
    sections.push(`- **Base EBITDAR Multiple**: ${dev.valuationScenarios.base.ebitdarMultiple}x`);
  }
  if (dev.strategicFit) {
    sections.push(`- **Strategic Fit**: ${dev.strategicFit.overallScore}/100`);
  }
  if (dev.pipelineRanking) {
    sections.push(`- **Pipeline Tier**: ${dev.pipelineRanking.tier}`);
  }
  sections.push('');

  // Tension points
  if (synthesis.tensionPoints.length > 0) {
    sections.push('## Tension Points');
    for (const tp of synthesis.tensionPoints) {
      sections.push(`### ${tp.title} (${tp.significance})`);
      sections.push(`- **Newo**: ${tp.newoPosition}`);
      sections.push(`- **Dev**: ${tp.devPosition}`);
      sections.push(`- **Resolution**: ${tp.resolutionHint}`);
      sections.push('');
    }
  }

  // Performance
  sections.push('## Analysis Performance');
  sections.push(`- **Newo Latency**: ${(metadata.newoLatencyMs / 1000).toFixed(1)}s`);
  sections.push(`- **Dev Latency**: ${(metadata.devLatencyMs / 1000).toFixed(1)}s`);
  sections.push(`- **Synthesis**: ${metadata.synthesisLatencyMs}ms`);
  sections.push(`- **Total**: ${(metadata.totalLatencyMs / 1000).toFixed(1)}s`);
  sections.push('');

  // Tags for knowledge-loader search
  sections.push('---');
  sections.push(`tags: learning, ${deal.assetType?.toLowerCase() || 'snf'}, ${deal.primaryState?.toLowerCase() || 'unknown'}, ${synthesis.recommendation}, dual-brain`);

  return sections.join('\n');
}

function formatForLearning(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}
