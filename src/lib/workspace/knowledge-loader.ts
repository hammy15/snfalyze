import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge');

// ── Cached file index ────────────────────────────────────────────────
// Pre-loads directory listing + topic assignments to avoid repeated readdir calls

interface CachedFileEntry {
  filename: string;
  topics: string[];
  lowerName: string;
}

let _fileIndexCache: CachedFileEntry[] | null = null;
let _fileIndexTimestamp = 0;
const FILE_INDEX_TTL = 5 * 60 * 1000; // 5 minutes

async function getFileIndex(): Promise<CachedFileEntry[]> {
  const now = Date.now();
  if (_fileIndexCache && (now - _fileIndexTimestamp) < FILE_INDEX_TTL) {
    return _fileIndexCache;
  }

  let files: string[];
  try {
    files = await readdir(KNOWLEDGE_DIR);
  } catch {
    return [];
  }

  const entries: CachedFileEntry[] = [];
  for (const filename of files) {
    if ((!filename.endsWith('.md') && !filename.endsWith('.json')) || filename.startsWith('.')) continue;

    const lowerName = filename.toLowerCase();
    const topics: string[] = [];
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      for (const kw of keywords) {
        if (lowerName.includes(kw.toLowerCase())) {
          topics.push(topic);
          break;
        }
      }
    }

    entries.push({ filename, topics, lowerName });
  }

  _fileIndexCache = entries;
  _fileIndexTimestamp = now;
  return entries;
}

// ── Content cache ────────────────────────────────────────────────────
// Caches file content (truncated) to avoid repeated file reads

const _contentCache = new Map<string, { content: string; ts: number }>();
const CONTENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function getCachedContent(filename: string): Promise<string> {
  const now = Date.now();
  const cached = _contentCache.get(filename);
  if (cached && (now - cached.ts) < CONTENT_CACHE_TTL) {
    return cached.content;
  }

  try {
    const fullPath = join(KNOWLEDGE_DIR, filename);
    const raw = await readFile(fullPath, 'utf-8');
    const content = raw.slice(0, 3000);
    _contentCache.set(filename, { content, ts: now });
    return content;
  } catch {
    return '[Could not load file]';
  }
}

// ── Topic tags for knowledge files ──────────────────────────────────
const TOPIC_KEYWORDS: Record<string, string[]> = {
  regulatory: ['CON', 'regulatory', 'survey', 'deficiency', 'SFF', 'cms', 'compliance', 'medicaid_supplemental', 'state_medicaid'],
  market: ['market', 'buyer', 'intelligence', 'MA_', 'acquisition', 'competitive', 'demographics', 'ALF_MA', 'snf_ma'],
  operational: ['operational', 'execution', 'staffing', 'labor', 'daily', 'operations', 'HPPD', 'agency', 'quality'],
  financial: ['financial', 'revenue', 'EBITDA', 'valuation', 'cap_rate', 'pricing', 'capital', 'financials'],
  reimbursement: ['medicaid', 'medicare', 'reimbursement', 'PDPM', 'payment', 'supplemental'],
  transactions: ['deal', 'acquisition', 'target', 'pipeline', 'scoring', 'prioritization', 'ownership'],
  benchmarks: ['benchmark', 'comparison', 'scoring', 'awards', 'quality'],
};

// ── Stage-to-topic mapping ──────────────────────────────────────────
const STAGE_TOPICS: Record<string, string[]> = {
  deal_intake: ['regulatory', 'market', 'operational'],
  comp_pull: ['transactions', 'market', 'benchmarks'],
  pro_forma: ['reimbursement', 'financial', 'operational'],
  risk_score: ['regulatory', 'operational', 'financial'],
  investment_memo: ['transactions', 'market', 'financial', 'operational', 'regulatory'],
};

export interface KnowledgeFile {
  filename: string;
  content: string;
  topics: string[];
  relevanceScore: number;
}

// ── Load and index knowledge files by stage ─────────────────────────

export async function loadKnowledgeForStage(
  stage: string,
  context?: { state?: string; assetType?: string; query?: string }
): Promise<KnowledgeFile[]> {
  const topics = STAGE_TOPICS[stage] || ['market', 'financial'];
  const fileIndex = await getFileIndex();
  if (fileIndex.length === 0) return [];

  // Score each file by topic relevance using cached index
  const scored: KnowledgeFile[] = [];

  for (const entry of fileIndex) {
    let relevanceScore = 0;

    // Score by topic overlap
    for (const topic of entry.topics) {
      if (topics.includes(topic)) {
        relevanceScore += 10;
      }
    }

    // Boost for state-specific content
    if (context?.state && entry.lowerName.includes(context.state.toLowerCase())) {
      relevanceScore += 15;
    }

    // Boost for asset type
    if (context?.assetType) {
      const at = context.assetType.toLowerCase();
      if (entry.lowerName.includes(at)) relevanceScore += 10;
    }

    // Boost for query match
    if (context?.query) {
      const queryWords = context.query.toLowerCase().split(/\s+/);
      for (const word of queryWords) {
        if (word.length > 3 && entry.lowerName.includes(word)) {
          relevanceScore += 5;
        }
      }
    }

    if (relevanceScore > 0) {
      scored.push({ filename: entry.filename, content: '', topics: entry.topics, relevanceScore });
    }
  }

  // Sort by relevance and take top 8
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topFiles = scored.slice(0, 8);

  // Load content for top files using cached reads
  await Promise.all(
    topFiles.map(async (file) => {
      file.content = await getCachedContent(file.filename);
    })
  );

  return topFiles;
}

// ── Search knowledge files by query ─────────────────────────────────

/** Reset all internal caches — used by tests to prevent cross-test leakage */
export function _resetCaches(): void {
  _fileIndexCache = null;
  _fileIndexTimestamp = 0;
  _contentCache.clear();
}

export async function searchKnowledge(query: string, limit = 5): Promise<KnowledgeFile[]> {
  const fileIndex = await getFileIndex();
  if (fileIndex.length === 0) return [];

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const results: KnowledgeFile[] = [];

  for (const entry of fileIndex) {
    let score = 0;

    for (const word of queryWords) {
      if (entry.lowerName.includes(word)) score += 10;
    }

    if (score > 0) {
      const content = await getCachedContent(entry.filename);
      const lowerContent = content.toLowerCase();

      for (const word of queryWords) {
        const matches = lowerContent.split(word).length - 1;
        score += Math.min(matches * 2, 20);
      }

      results.push({
        filename: entry.filename,
        content,
        topics: entry.topics,
        relevanceScore: score,
      });
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results.slice(0, limit);
}
