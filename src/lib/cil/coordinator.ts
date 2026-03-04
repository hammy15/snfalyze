// =============================================================================
// CIL COORDINATOR — The Cranium: Orchestrates brains + senses
// =============================================================================

import { runDualBrainAnalysis } from '../analysis/brains';
import { loadNewoKnowledge, loadDevKnowledge } from '../analysis/knowledge-bridge';
import { ALL_SENSES, getSense } from './senses';
import { getCILState, logActivity, getRecentActivity } from './state-manager';
import { getPerformanceMap, getKnowledgeGrowth } from './performance-tracker';
import { rerunHistoricalDeal, ingestLearningData } from './learning-engine';
import { createResearchMission, listResearchMissions, getResearchMission, importMissionToKnowledge } from './research-agent';
import type {
  CILAnalysisRequest,
  CILAnalysisResult,
  CILLearningRequest,
  CILLearningResult,
  CILState,
  CILActivity,
  StatePerformanceModel,
  SenseResult,
  ResearchMission,
  KnowledgeGrowthPoint,
  CILInsightItem,
} from './types';
import type { AnalysisInput } from '../analysis/engine';

// ── Main Coordinator ───────────────────────────────────────────────

class CILCoordinator {
  // ── Analyze ────────────────────────────────────────────────────

  async analyze(request: CILAnalysisRequest): Promise<CILAnalysisResult> {
    const { deal, activateSenses, includeResearch } = request;

    await logActivity('analysis', `CIL analysis started for "${deal.name}"`, {
      metadata: { senses: activateSenses, includeResearch },
    });

    // 1. Load brain-specific knowledge
    const dealState = deal.primaryState ?? undefined;
    const [newoKnowledge, devKnowledge] = await Promise.all([
      loadNewoKnowledge({ state: dealState, assetType: deal.assetType }),
      loadDevKnowledge({ state: dealState, assetType: deal.assetType }),
    ]);

    // 2. Run dual-brain analysis
    const dualBrain = await runDualBrainAnalysis(deal, {
      newo: newoKnowledge,
      dev: devKnowledge,
    });

    // 3. Activate requested senses in parallel
    const sensesToActivate = activateSenses?.length
      ? activateSenses.map((id) => getSense(id)).filter(Boolean)
      : ALL_SENSES;

    const senseContext = {
      dealId: deal.name,
      state: deal.primaryState ?? undefined,
      assetType: deal.assetType,
    };

    const senseResults: SenseResult[] = await Promise.all(
      sensesToActivate.map((sense) => {
        logActivity('sense_activation', `${sense!.name} sense activated`, {
          senseId: sense!.id,
        }).catch(() => {});
        return sense!.activate(senseContext);
      })
    );

    // 4. Build CIL insights from brain + sense outputs
    const cilInsights = buildCILInsights(dualBrain, senseResults);

    // 5. Get current CIL state
    const cilState = await getCILState();

    await logActivity('analysis', `CIL analysis complete for "${deal.name}" — ${dualBrain.synthesis.recommendation} (${dualBrain.synthesis.confidence}%)`, {
      metadata: {
        recommendation: dualBrain.synthesis.recommendation,
        confidence: dualBrain.synthesis.confidence,
        sensesActivated: senseResults.length,
        insightsGenerated: cilInsights.length,
      },
    });

    return { dualBrain, senseResults, cilInsights, state: cilState };
  }

  // ── Learn ──────────────────────────────────────────────────────

  async learn(request: CILLearningRequest): Promise<CILLearningResult> {
    if (request.mode === 'rerun' && request.historicalDealId) {
      return rerunHistoricalDeal(request.historicalDealId);
    }
    if (request.mode === 'ingest' && request.historicalDealId) {
      return ingestLearningData(request.historicalDealId);
    }
    throw new Error(`Invalid learning request: mode=${request.mode}`);
  }

  // ── Research ───────────────────────────────────────────────────

  async research(
    topic: string,
    context?: { state?: string; assetType?: string; target?: string }
  ): Promise<ResearchMission> {
    return createResearchMission(topic, context);
  }

  async getResearchMissions(limit?: number): Promise<ResearchMission[]> {
    return listResearchMissions(limit);
  }

  async getResearchMission(id: string): Promise<ResearchMission | null> {
    return getResearchMission(id);
  }

  async importResearchToKnowledge(missionId: string): Promise<string> {
    return importMissionToKnowledge(missionId);
  }

  // ── State & Activity ───────────────────────────────────────────

  async getState(): Promise<CILState> {
    return getCILState();
  }

  async getActivity(limit?: number): Promise<CILActivity[]> {
    return getRecentActivity(limit);
  }

  async getPerformance(): Promise<Record<string, StatePerformanceModel>> {
    return getPerformanceMap();
  }

  async getGrowth(): Promise<KnowledgeGrowthPoint[]> {
    return getKnowledgeGrowth();
  }
}

// ── Singleton ──────────────────────────────────────────────────────

let _coordinator: CILCoordinator | null = null;

export function getCIL(): CILCoordinator {
  if (!_coordinator) {
    _coordinator = new CILCoordinator();
  }
  return _coordinator;
}

// ── Insight Builder ────────────────────────────────────────────────

function buildCILInsights(
  dualBrain: CILAnalysisResult['dualBrain'],
  senseResults: SenseResult[]
): CILInsightItem[] {
  const insights: CILInsightItem[] = [];
  let idx = 0;

  // From tension points
  for (const tension of dualBrain.synthesis.tensionPoints) {
    insights.push({
      id: `cil_tension_${idx++}`,
      type: tension.significance === 'high' ? 'warning' : 'info',
      title: tension.title,
      content: `Newo: ${tension.newoPosition}\nDev: ${tension.devPosition}\n→ ${tension.resolutionHint}`,
      source: 'Dual-Brain Synthesis',
      confidence: tension.significance === 'high' ? 'high' : 'medium',
    });
  }

  // From key insight
  if (dualBrain.synthesis.keyInsight) {
    insights.push({
      id: `cil_key_${idx++}`,
      type: 'opportunity',
      title: 'Key Intelligence',
      content: dualBrain.synthesis.keyInsight,
      source: 'CIL Synthesis',
      confidence: 'high',
    });
  }

  // From senses with high confidence
  for (const sense of senseResults) {
    if (sense.confidence >= 60) {
      insights.push({
        id: `cil_sense_${sense.senseId}_${idx++}`,
        type: 'benchmark',
        title: `${sense.senseName} Intelligence`,
        content: sense.summary,
        source: sense.senseName,
        confidence: sense.confidence >= 80 ? 'high' : 'medium',
        senseId: sense.senseId,
      });
    }
  }

  return insights;
}

export { CILCoordinator };
