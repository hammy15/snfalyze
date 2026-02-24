/**
 * NEWO Knowledge Bridge — Connects institutional intelligence to the analysis engine
 *
 * NEWO (Mac Mini at 172.24.10.232) syncs 165+ institutional knowledge files
 * from OpenClaw bot into /knowledge/. This bridge dynamically loads the most
 * relevant intelligence for each deal and injects it into the AI analysis prompt,
 * so every underwriting decision is grounded in Cascadia's full institutional memory.
 *
 * Previously, only ~30-40% of NEWO's intelligence was used (hardcoded in benchmarks.ts).
 * This bridge closes that gap by dynamically loading deal-specific intelligence.
 */

import { loadKnowledgeForStage, searchKnowledge, type KnowledgeFile } from '@/lib/workspace/knowledge-loader';
import { CASCADIA_SYSTEM_PROMPT } from './prompts';

// Maximum knowledge context to inject (chars) — keeps prompt within token budget
const MAX_KNOWLEDGE_CHARS = 25_000;

// Maximum files to include
const MAX_KNOWLEDGE_FILES = 12;

/**
 * Load institutional knowledge from NEWO relevant to a specific deal.
 * Combines stage-based topic matching with targeted searches for:
 * - State-specific regulatory/reimbursement intelligence
 * - Asset-type specific market data
 * - Buyer/partner intelligence
 * - Reimbursement optimization strategies
 */
export async function loadDealKnowledge(context: {
  state?: string | null;
  assetType?: string | null;
  dealName?: string | null;
  beds?: number | null;
}): Promise<KnowledgeFile[]> {
  const state = context.state || undefined;
  const assetType = context.assetType || undefined;
  const dealName = context.dealName || undefined;

  // Run multiple knowledge queries in parallel for speed
  const [
    investmentMemoKnowledge,
    stateKnowledge,
    assetKnowledge,
    reimbursementKnowledge,
    buyerKnowledge,
    operationalKnowledge,
  ] = await Promise.all([
    // Stage-based: loads files matching investment_memo topics (transactions, market, financial, operational, regulatory)
    loadKnowledgeForStage('investment_memo', { state, assetType, query: dealName }),
    // State-specific: regulatory, reimbursement, market conditions
    state ? searchKnowledge(state, 4) : Promise.resolve([]),
    // Asset-type specific: SNF/ALF/hospice market data
    assetType ? searchKnowledge(assetType, 3) : Promise.resolve([]),
    // Reimbursement intelligence: PDPM, quality bonus, state programs
    searchKnowledge('reimbursement optimization revenue', 3),
    // Buyer/partner intelligence: PE, REIT, strategic buyer profiles
    searchKnowledge('buyer intelligence acquisition', 3),
    // Operational intelligence: staffing, quality, integration
    searchKnowledge('operational staffing quality', 2),
  ]);

  // Deduplicate by filename, keeping highest relevance score
  const fileMap = new Map<string, KnowledgeFile>();

  for (const file of [
    ...investmentMemoKnowledge,
    ...stateKnowledge,
    ...assetKnowledge,
    ...reimbursementKnowledge,
    ...buyerKnowledge,
    ...operationalKnowledge,
  ]) {
    const existing = fileMap.get(file.filename);
    if (!existing || file.relevanceScore > existing.relevanceScore) {
      fileMap.set(file.filename, file);
    }
  }

  // Sort by relevance, take top N
  const allFiles = [...fileMap.values()];
  allFiles.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return allFiles.slice(0, MAX_KNOWLEDGE_FILES);
}

/**
 * Format knowledge files into a prompt-injectable context section.
 * Each file is labeled with its source and truncated to fit the token budget.
 */
function buildKnowledgeContext(files: KnowledgeFile[]): string {
  if (files.length === 0) return '';

  let totalChars = 0;
  const sections: string[] = [];

  for (const file of files) {
    const label = file.filename
      .replace(/\.md$/, '')
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2');

    const content = file.content.trim();
    if (!content || content === '[Could not load file]') continue;

    // Respect total char budget
    const remaining = MAX_KNOWLEDGE_CHARS - totalChars;
    if (remaining <= 200) break;

    const truncatedContent = content.length > remaining
      ? content.slice(0, remaining) + '\n[...truncated]'
      : content;

    sections.push(`### ${label}\n${truncatedContent}`);
    totalChars += truncatedContent.length + label.length + 10;
  }

  return sections.join('\n\n---\n\n');
}

/**
 * Build an enriched system prompt that includes NEWO's institutional intelligence
 * dynamically loaded for the specific deal being analyzed.
 *
 * This is the core integration point — every deal analysis now leverages
 * Cascadia's full knowledge base instead of just hardcoded benchmarks.
 */
export async function buildEnrichedSystemPrompt(context: {
  state?: string | null;
  assetType?: string | null;
  dealName?: string | null;
  beds?: number | null;
}): Promise<string> {
  try {
    const knowledgeFiles = await loadDealKnowledge(context);

    if (knowledgeFiles.length === 0) {
      console.log('[Knowledge Bridge] No NEWO knowledge files loaded — using base prompt');
      return CASCADIA_SYSTEM_PROMPT;
    }

    const knowledgeContext = buildKnowledgeContext(knowledgeFiles);

    if (!knowledgeContext) {
      return CASCADIA_SYSTEM_PROMPT;
    }

    const fileNames = knowledgeFiles.map(f => f.filename).join(', ');
    console.log(`[Knowledge Bridge] Loaded ${knowledgeFiles.length} NEWO intelligence files: ${fileNames}`);

    return `${CASCADIA_SYSTEM_PROMPT}

## INSTITUTIONAL INTELLIGENCE FROM NEWO — Dynamic Knowledge Base

The following intelligence has been loaded from Cascadia's institutional knowledge base (NEWO) specifically for this deal. This data represents Cascadia's proprietary intelligence gathered across 500+ transactions, 46 facilities, and continuous market monitoring by the OpenClaw bot.

**Use this intelligence to:**
- Ground valuations in the most current market data available
- Cross-reference buyer profiles with deal characteristics
- Apply state-specific regulatory and reimbursement knowledge
- Identify operational improvement opportunities based on Cascadia's portfolio experience
- Detect risk patterns that match Cascadia's institutional memory
- Quantify reimbursement upside using state-specific program data

${knowledgeContext}

---
*End of NEWO institutional intelligence. Cross-reference the above with the deal-specific data provided below.*`;
  } catch (error) {
    // Knowledge loading should never block deal analysis
    console.error('[Knowledge Bridge] Failed to load NEWO knowledge:', error);
    return CASCADIA_SYSTEM_PROMPT;
  }
}
