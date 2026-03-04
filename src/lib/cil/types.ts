// =============================================================================
// CIL TYPES — Cascadia Intelligence Layer Type System
// =============================================================================

import type { DualBrainResult } from '../analysis/brains/types';
import type { AnalysisInput } from '../analysis/engine';

// ── CIL State ──────────────────────────────────────────────────────

export interface CILState {
  knowledgeFileCount: number;
  dealsAnalyzed: number;
  dealsLearned: number;
  totalDeals: number;
  preferenceCount: number;
  researchMissions: number;
  avgConfidence: number; // 0-100
  ipoProgress: {
    currentOps: number;
    targetOps: number;
    currentRevenue: number;
    targetRevenue: number;
  };
  lastUpdated: string;
}

// ── CIL Activity ───────────────────────────────────────────────────

export interface CILActivity {
  id: string;
  activityType: 'analysis' | 'learning' | 'research' | 'sense_activation' | 'knowledge_import' | 'rerun' | 'insight';
  brainId: 'newo' | 'dev' | null;
  senseId: string | null;
  dealId: string | null;
  summary: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── State Performance ──────────────────────────────────────────────

export interface StatePerformanceModel {
  state: string;
  assetType: string | null;
  dealCount: number;
  avgConfidence: number;
  avgCapRate: number;
  avgPricePerBed: number;
  performanceTier: 'strong' | 'developing' | 'limited' | 'no_data';
  topPatterns: string[];
}

// ── Senses ─────────────────────────────────────────────────────────

export interface SenseContext {
  dealId?: string;
  state?: string;
  assetType?: string;
  ccn?: string;
  facilityName?: string;
  documents?: Array<{ id: string; type: string }>;
  financials?: Record<string, unknown>;
  query?: string;
}

export interface SenseResult {
  senseId: string;
  senseName: string;
  data: Record<string, unknown>;
  confidence: number; // 0-100
  summary: string;
  latencyMs: number;
}

export interface Sense {
  id: string;
  name: string;
  icon: string;
  description: string;
  activate(context: SenseContext): Promise<SenseResult>;
}

// ── CIL Analysis Request/Response ──────────────────────────────────

export interface CILAnalysisRequest {
  deal: AnalysisInput;
  activateSenses?: string[]; // which senses to fire
  includeResearch?: boolean;
}

export interface CILAnalysisResult {
  dualBrain: DualBrainResult;
  senseResults: SenseResult[];
  cilInsights: CILInsightItem[];
  state: CILState;
}

export interface CILInsightItem {
  id: string;
  type: 'info' | 'warning' | 'opportunity' | 'benchmark';
  title: string;
  content: string;
  source: string;
  confidence: 'high' | 'medium' | 'low';
  brainId?: 'newo' | 'dev';
  senseId?: string;
}

// ── Learning ───────────────────────────────────────────────────────

export interface CILLearningRequest {
  mode: 'ingest' | 'rerun';
  historicalDealId?: string;
  documents?: Array<{ filename: string; content: string; role: string }>;
}

export interface CILLearningResult {
  mode: string;
  success: boolean;
  patternsExtracted: number;
  preferencesUpdated: number;
  statesUpdated: string[];
  summary: string;
}

// ── Research ───────────────────────────────────────────────────────

export interface ResearchMission {
  id: string;
  topic: string;
  context: { state?: string; assetType?: string; target?: string } | null;
  status: 'queued' | 'researching' | 'complete' | 'failed';
  findings: string | null;
  sources: Array<{ url: string; title: string; snippet?: string }>;
  importedToKnowledge: boolean;
  knowledgeFilePath: string | null;
  latencyMs: number | null;
  createdAt: string;
  completedAt: string | null;
}

// ── Knowledge Growth ───────────────────────────────────────────────

export interface KnowledgeGrowthPoint {
  date: string;
  knowledgeFiles: number;
  dealsLearned: number;
  avgConfidence: number;
  preferenceCount: number;
}
