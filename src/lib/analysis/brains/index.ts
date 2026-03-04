// =============================================================================
// DUAL-BRAIN ANALYSIS — Main Entry Point
//
// Orchestrates Newo (operations) and Dev (strategy) in parallel, then
// synthesizes their outputs into a unified DualBrainResult.
// =============================================================================

export type {
  BrainId,
  BrainConfig,
  NewoResult,
  DevResult,
  ValuationScenario,
  TensionCategory,
  TensionPoint,
  SynthesisResult,
  DualBrainResult,
  BrainInput,
} from './types';

export { BRAIN_CONFIGS } from './types';
export { NEWO_SYSTEM_PROMPT, runNewoBrain } from './newo-brain';
export { DEV_SYSTEM_PROMPT, runDevBrain } from './dev-brain';
export { synthesizeBrains, findTensionPoints, reconcileRecommendations } from './synthesis';
export { saveLearning } from './learning';

import { runNewoBrain } from './newo-brain';
import { runDevBrain } from './dev-brain';
import { synthesizeBrains } from './synthesis';
import { saveLearning } from './learning';
import type { DualBrainResult } from './types';
import type { AnalysisInput } from '../engine';

/**
 * Run dual-brain analysis on a deal.
 *
 * Both brains execute in parallel via Promise.all() — same wall-clock time
 * as a single brain (~20-25s) despite 2x API calls.
 *
 * After synthesis, a learning file is saved asynchronously (non-blocking).
 */
export async function runDualBrainAnalysis(
  deal: AnalysisInput,
  knowledgeContext?: { newo?: string; dev?: string }
): Promise<DualBrainResult> {
  console.log(`[Dual-Brain] Starting parallel analysis for "${deal.name}"`);

  // Run both brains in parallel
  const [newoOutput, devOutput] = await Promise.all([
    runNewoBrain(deal, knowledgeContext?.newo),
    runDevBrain(deal, knowledgeContext?.dev),
  ]);

  console.log(`[Dual-Brain] Newo complete (${(newoOutput.latencyMs / 1000).toFixed(1)}s), Dev complete (${(devOutput.latencyMs / 1000).toFixed(1)}s)`);

  // Synthesize — deterministic, no AI call
  const result = synthesizeBrains(
    newoOutput.result,
    devOutput.result,
    deal,
    {
      newoLatencyMs: newoOutput.latencyMs,
      devLatencyMs: devOutput.latencyMs,
    }
  );

  console.log(`[Dual-Brain] Synthesis complete. Recommendation: ${result.synthesis.recommendation} (${result.synthesis.confidence}% confidence)`);

  // Save learning async — never blocks the response
  saveLearning(deal, result).catch(err =>
    console.error('[Dual-Brain] Learning save failed (non-blocking):', err)
  );

  return result;
}
