import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const KNOWLEDGE_DIR = join(process.cwd(), 'knowledge');

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

  let files: string[];
  try {
    files = await readdir(KNOWLEDGE_DIR);
  } catch {
    return [];
  }

  // Filter to markdown and JSON files only
  const relevantFiles = files.filter(
    f => (f.endsWith('.md') || f.endsWith('.json')) && !f.startsWith('.')
  );

  // Score each file by topic relevance
  const scored: KnowledgeFile[] = [];

  for (const filename of relevantFiles) {
    const fileTopics: string[] = [];
    let relevanceScore = 0;
    const lowerName = filename.toLowerCase();

    // Match file against topic keywords
    for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
      for (const kw of keywords) {
        if (lowerName.includes(kw.toLowerCase())) {
          fileTopics.push(topic);
          if (topics.includes(topic)) {
            relevanceScore += 10;
          }
          break;
        }
      }
    }

    // Boost for state-specific content
    if (context?.state && lowerName.includes(context.state.toLowerCase())) {
      relevanceScore += 15;
    }

    // Boost for asset type
    if (context?.assetType) {
      const at = context.assetType.toLowerCase();
      if (lowerName.includes(at)) relevanceScore += 10;
    }

    // Boost for query match
    if (context?.query) {
      const queryWords = context.query.toLowerCase().split(/\s+/);
      for (const word of queryWords) {
        if (word.length > 3 && lowerName.includes(word)) {
          relevanceScore += 5;
        }
      }
    }

    if (relevanceScore > 0) {
      scored.push({ filename, content: '', topics: fileTopics, relevanceScore });
    }
  }

  // Sort by relevance and take top 8
  scored.sort((a, b) => b.relevanceScore - a.relevanceScore);
  const topFiles = scored.slice(0, 8);

  // Load content for top files (truncated to 3000 chars each)
  for (const file of topFiles) {
    try {
      const fullPath = join(KNOWLEDGE_DIR, file.filename);
      const raw = await readFile(fullPath, 'utf-8');
      file.content = raw.slice(0, 3000);
    } catch {
      file.content = '[Could not load file]';
    }
  }

  return topFiles;
}

// ── Search knowledge files by query ─────────────────────────────────

export async function searchKnowledge(query: string, limit = 5): Promise<KnowledgeFile[]> {
  let files: string[];
  try {
    files = await readdir(KNOWLEDGE_DIR);
  } catch {
    return [];
  }

  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const results: KnowledgeFile[] = [];

  for (const filename of files) {
    if (!filename.endsWith('.md') && !filename.endsWith('.json')) continue;

    const lowerName = filename.toLowerCase();
    let score = 0;

    for (const word of queryWords) {
      if (lowerName.includes(word)) score += 10;
    }

    if (score > 0) {
      try {
        const fullPath = join(KNOWLEDGE_DIR, filename);
        const raw = await readFile(fullPath, 'utf-8');
        const lowerContent = raw.toLowerCase();

        for (const word of queryWords) {
          const matches = lowerContent.split(word).length - 1;
          score += Math.min(matches * 2, 20);
        }

        const topics: string[] = [];
        for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
          if (keywords.some(kw => lowerName.includes(kw.toLowerCase()))) {
            topics.push(topic);
          }
        }

        results.push({
          filename,
          content: raw.slice(0, 3000),
          topics,
          relevanceScore: score,
        });
      } catch {
        // Skip unreadable files
      }
    }
  }

  results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  return results.slice(0, limit);
}
