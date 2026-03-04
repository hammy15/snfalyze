// =============================================================================
// DUAL-BRAIN ANALYSIS — Main Entry Point
//
// Orchestrates Newo (operations) and Dev (strategy) in parallel, then
// synthesizes their outputs into a unified DualBrainResult.
//
// FAILOVER: If one brain goes down, the other compensates.
// HEALTH: Tracks brain health for dashboard visibility.
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

import { runNewoBrain, buildFallbackNewoResult } from './newo-brain';
import { runDevBrain, buildFallbackDevResult } from './dev-brain';
import { synthesizeBrains } from './synthesis';
import { saveLearning } from './learning';
import type { DualBrainResult, BrainId, NewoResult, DevResult } from './types';
import type { AnalysisInput } from '../engine';

// =============================================================================
// BRAIN HEALTH TRACKING
// =============================================================================

export interface BrainHealth {
  id: BrainId;
  status: 'online' | 'degraded' | 'offline';
  lastSuccess: string | null;
  lastFailure: string | null;
  consecutiveFailures: number;
  totalCalls: number;
  totalFailures: number;
  avgLatencyMs: number;
  lastLatencyMs: number;
}

const _brainHealth: Record<BrainId, BrainHealth> = {
  newo: {
    id: 'newo',
    status: 'online',
    lastSuccess: null,
    lastFailure: null,
    consecutiveFailures: 0,
    totalCalls: 0,
    totalFailures: 0,
    avgLatencyMs: 0,
    lastLatencyMs: 0,
  },
  dev: {
    id: 'dev',
    status: 'online',
    lastSuccess: null,
    lastFailure: null,
    consecutiveFailures: 0,
    totalCalls: 0,
    totalFailures: 0,
    avgLatencyMs: 0,
    lastLatencyMs: 0,
  },
};

const DEGRADED_THRESHOLD = 2; // consecutive failures before degraded
const OFFLINE_THRESHOLD = 5;  // consecutive failures before offline

function recordSuccess(brain: BrainId, latencyMs: number): void {
  const h = _brainHealth[brain];
  h.consecutiveFailures = 0;
  h.lastSuccess = new Date().toISOString();
  h.totalCalls++;
  h.lastLatencyMs = latencyMs;
  h.avgLatencyMs = h.totalCalls === 1 ? latencyMs : h.avgLatencyMs * 0.8 + latencyMs * 0.2;
  h.status = 'online';
}

function recordFailure(brain: BrainId): void {
  const h = _brainHealth[brain];
  h.consecutiveFailures++;
  h.totalCalls++;
  h.totalFailures++;
  h.lastFailure = new Date().toISOString();
  if (h.consecutiveFailures >= OFFLINE_THRESHOLD) h.status = 'offline';
  else if (h.consecutiveFailures >= DEGRADED_THRESHOLD) h.status = 'degraded';
}

export function getBrainHealth(): Record<BrainId, BrainHealth> {
  return { newo: { ..._brainHealth.newo }, dev: { ..._brainHealth.dev } };
}

export function resetBrainHealth(brain: BrainId): void {
  _brainHealth[brain].consecutiveFailures = 0;
  _brainHealth[brain].status = 'online';
}

// =============================================================================
// DUAL-BRAIN ANALYSIS WITH FAILOVER
// =============================================================================

/**
 * Run dual-brain analysis on a deal.
 *
 * Both brains execute in parallel via Promise.allSettled() — if one fails,
 * the other's result is still used. The CIL compensates with a fallback
 * for the downed brain, and the synthesis notes the degraded state.
 *
 * After synthesis, a learning file is saved asynchronously (non-blocking).
 */
export async function runDualBrainAnalysis(
  deal: AnalysisInput,
  knowledgeContext?: { newo?: string; dev?: string }
): Promise<DualBrainResult> {
  console.log(`[Dual-Brain] Starting parallel analysis for "${deal.name}"`);
  console.log(`[Dual-Brain] Health — Newo: ${_brainHealth.newo.status}, Dev: ${_brainHealth.dev.status}`);

  // Run both brains in parallel with failover
  const [newoSettled, devSettled] = await Promise.allSettled([
    runNewoBrain(deal, knowledgeContext?.newo),
    runDevBrain(deal, knowledgeContext?.dev),
  ]);

  let newoResult: NewoResult;
  let newoLatencyMs: number;
  let newoFailed = false;

  let devResult: DevResult;
  let devLatencyMs: number;
  let devFailed = false;

  // Process Newo result
  if (newoSettled.status === 'fulfilled') {
    newoResult = newoSettled.value.result;
    newoLatencyMs = newoSettled.value.latencyMs;
    recordSuccess('newo', newoLatencyMs);
    console.log(`[Dual-Brain] Newo ✓ (${(newoLatencyMs / 1000).toFixed(1)}s)`);
  } else {
    newoFailed = true;
    recordFailure('newo');
    console.error(`[Dual-Brain] Newo ✗ FAILED — activating fallback`, newoSettled.reason);
    newoResult = buildFallbackNewoResult(deal);
    newoLatencyMs = 0;
  }

  // Process Dev result
  if (devSettled.status === 'fulfilled') {
    devResult = devSettled.value.result;
    devLatencyMs = devSettled.value.latencyMs;
    recordSuccess('dev', devLatencyMs);
    console.log(`[Dual-Brain] Dev ✓ (${(devLatencyMs / 1000).toFixed(1)}s)`);
  } else {
    devFailed = true;
    recordFailure('dev');
    console.error(`[Dual-Brain] Dev ✗ FAILED — activating fallback`, devSettled.reason);
    devResult = buildFallbackDevResult(deal);
    devLatencyMs = 0;
  }

  // If BOTH brains fail, we still synthesize from fallback data
  if (newoFailed && devFailed) {
    console.error(`[Dual-Brain] ⚠ BOTH BRAINS DOWN — running on fallback data only`);
  }

  // Synthesize — deterministic, no AI call
  const result = synthesizeBrains(newoResult, devResult, deal, {
    newoLatencyMs,
    devLatencyMs,
  });

  // Inject failover metadata
  if (newoFailed || devFailed) {
    (result.metadata as Record<string, unknown>).failover = {
      newoDown: newoFailed,
      devDown: devFailed,
      message: newoFailed && devFailed
        ? 'Both brains offline — running on fallback intelligence'
        : newoFailed
          ? 'Newo (operations) offline — Dev carrying analysis, operational data is estimated'
          : 'Dev (strategy) offline — Newo carrying analysis, deal structuring is estimated',
    };
  }

  console.log(`[Dual-Brain] Synthesis complete. Recommendation: ${result.synthesis.recommendation} (${result.synthesis.confidence}% confidence)${newoFailed || devFailed ? ' [FAILOVER ACTIVE]' : ''}`);

  // Save learning async — never blocks the response
  saveLearning(deal, result).catch(err =>
    console.error('[Dual-Brain] Learning save failed (non-blocking):', err)
  );

  return result;
}
