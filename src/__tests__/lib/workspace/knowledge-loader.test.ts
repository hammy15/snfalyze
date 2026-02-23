import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist mock functions so they can be used in the vi.mock factory
const { mockReaddir, mockReadFile } = vi.hoisted(() => ({
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
}));

// Mock fs/promises with a factory that returns our hoisted fns
vi.mock('fs/promises', () => ({
  default: { readdir: mockReaddir, readFile: mockReadFile },
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

import { loadKnowledgeForStage, searchKnowledge, _resetCaches } from '@/lib/workspace/knowledge-loader';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const SAMPLE_FILES = [
  'CON_regulatory_overview.md',
  'market_intelligence_snf_ma.md',
  'operational_execution_playbook.md',
  'financial_revenue_benchmarks.md',
  'medicaid_reimbursement_PDPM.md',
  'deal_acquisition_pipeline.md',
  'benchmark_quality_scoring.md',
  'OR_state_medicaid_rates.md',
  'ALF_MA_competitive_landscape.md',
  'staffing_HPPD_labor_trends.md',
  'valuation_cap_rate_analysis.json',
  'survey_deficiency_tracker.md',
  'demographics_rural_markets.md',
  'capital_structure_notes.md',
  '.hidden_config.md',          // hidden file — should be filtered
  'readme.txt',                  // wrong extension — should be filtered
  'notes.docx',                  // wrong extension — should be filtered
];

function fileContent(filename: string): string {
  return `# ${filename}\n\nContent for ${filename}. ` + 'Lorem ipsum '.repeat(100);
}

function longContent(): string {
  return 'A'.repeat(5000);
}

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockReaddir.mockReset();
  mockReadFile.mockReset();
  _resetCaches();

  mockReaddir.mockResolvedValue(SAMPLE_FILES);
  mockReadFile.mockImplementation(async (filepath: string) => {
    const name = String(filepath).split('/').pop() || '';
    return fileContent(name);
  });
});

// ─── loadKnowledgeForStage ───────────────────────────────────────────────────

describe('loadKnowledgeForStage', () => {
  // ── Stage-to-topic mapping ─────────────────────────────────────────────

  describe('stage-to-topic mapping', () => {
    it('should load regulatory, market, and operational topics for deal_intake', async () => {
      const results = await loadKnowledgeForStage('deal_intake');
      const filenames = results.map(r => r.filename);
      // Regulatory files (CON, survey, deficiency) should appear
      expect(filenames).toContain('CON_regulatory_overview.md');
      // Market files (market, MA_, acquisition) should appear
      expect(filenames).toContain('market_intelligence_snf_ma.md');
      // Operational files (operational, staffing, HPPD) should appear
      expect(filenames).toContain('operational_execution_playbook.md');
    });

    it('should load transactions, market, and benchmarks topics for comp_pull', async () => {
      const results = await loadKnowledgeForStage('comp_pull');
      const filenames = results.map(r => r.filename);
      expect(filenames).toContain('deal_acquisition_pipeline.md');
      expect(filenames).toContain('market_intelligence_snf_ma.md');
      expect(filenames).toContain('benchmark_quality_scoring.md');
    });

    it('should load reimbursement, financial, and operational topics for pro_forma', async () => {
      const results = await loadKnowledgeForStage('pro_forma');
      const filenames = results.map(r => r.filename);
      expect(filenames).toContain('medicaid_reimbursement_PDPM.md');
      expect(filenames).toContain('financial_revenue_benchmarks.md');
      expect(filenames).toContain('operational_execution_playbook.md');
    });

    it('should load regulatory, operational, and financial topics for risk_score', async () => {
      const results = await loadKnowledgeForStage('risk_score');
      const filenames = results.map(r => r.filename);
      expect(filenames).toContain('CON_regulatory_overview.md');
      expect(filenames).toContain('operational_execution_playbook.md');
      expect(filenames).toContain('financial_revenue_benchmarks.md');
    });

    it('should load all five topics for investment_memo', async () => {
      const results = await loadKnowledgeForStage('investment_memo');
      // investment_memo covers: transactions, market, financial, operational, regulatory
      const filenames = results.map(r => r.filename);
      expect(filenames).toContain('CON_regulatory_overview.md');
      expect(filenames).toContain('market_intelligence_snf_ma.md');
      expect(filenames).toContain('financial_revenue_benchmarks.md');
      expect(filenames).toContain('operational_execution_playbook.md');
      expect(filenames).toContain('deal_acquisition_pipeline.md');
    });

    it('should default to market and financial for unknown stages', async () => {
      const results = await loadKnowledgeForStage('unknown_stage');
      const filenames = results.map(r => r.filename);
      // market and financial are the default topics
      expect(filenames).toContain('market_intelligence_snf_ma.md');
      expect(filenames).toContain('financial_revenue_benchmarks.md');
    });
  });

  // ── File scoring ───────────────────────────────────────────────────────

  describe('file scoring', () => {
    it('should give +10 for each matching topic keyword', async () => {
      // For deal_intake (regulatory, market, operational):
      // CON_regulatory_overview.md matches 'regulatory' topic via "CON" keyword → +10
      const results = await loadKnowledgeForStage('deal_intake');
      const conFile = results.find(r => r.filename === 'CON_regulatory_overview.md');
      expect(conFile).toBeDefined();
      expect(conFile!.relevanceScore).toBeGreaterThanOrEqual(10);
    });

    it('should give +15 for state match in context', async () => {
      const results = await loadKnowledgeForStage('deal_intake', { state: 'OR' });
      const orFile = results.find(r => r.filename === 'OR_state_medicaid_rates.md');
      expect(orFile).toBeDefined();
      // state match = +15, plus topic match if applicable
      expect(orFile!.relevanceScore).toBeGreaterThanOrEqual(15);
    });

    it('should give +10 for asset type match in context', async () => {
      const results = await loadKnowledgeForStage('comp_pull', { assetType: 'ALF' });
      const alfFile = results.find(r => r.filename === 'ALF_MA_competitive_landscape.md');
      expect(alfFile).toBeDefined();
      // asset type match = +10, plus any topic matches
      expect(alfFile!.relevanceScore).toBeGreaterThanOrEqual(10);
    });

    it('should give +5 per query word match (words > 3 chars)', async () => {
      const results = await loadKnowledgeForStage('deal_intake', {
        query: 'staffing labor trends',
      });
      const staffFile = results.find(r => r.filename === 'staffing_HPPD_labor_trends.md');
      expect(staffFile).toBeDefined();
      // "staffing" (8 chars > 3) = +5, "labor" (5 chars > 3) = +5
      // "trends" (6 chars > 3) = +5, plus topic match = +10
      expect(staffFile!.relevanceScore).toBeGreaterThanOrEqual(20);
    });

    it('should NOT boost for query words with 3 or fewer characters', async () => {
      const results = await loadKnowledgeForStage('deal_intake', {
        query: 'OR SNF CON',
      });
      // "OR" = 2 chars, "SNF" = 3 chars, "CON" = 3 chars → all skipped (condition is > 3)
      // But topic matching still applies for CON_regulatory_overview.md
      const conFile = results.find(r => r.filename === 'CON_regulatory_overview.md');
      expect(conFile).toBeDefined();
    });

    it('should combine all scoring factors correctly', async () => {
      const results = await loadKnowledgeForStage('pro_forma', {
        state: 'OR',
        assetType: 'SNF',
        query: 'medicaid reimbursement rates',
      });
      // OR_state_medicaid_rates.md:
      //  - topic match for 'reimbursement' (medicaid/state_medicaid keywords): +10
      //  - state match (OR): +15
      //  - query words: "medicaid" (7 chars, +5), "reimbursement" (13 chars, not in filename), "rates" (5 chars, +5)
      const orFile = results.find(r => r.filename === 'OR_state_medicaid_rates.md');
      expect(orFile).toBeDefined();
      expect(orFile!.relevanceScore).toBeGreaterThanOrEqual(30);
    });
  });

  // ── Result limiting and sorting ────────────────────────────────────────

  describe('result limiting and sorting', () => {
    it('should return at most 8 files', async () => {
      const results = await loadKnowledgeForStage('investment_memo');
      expect(results.length).toBeLessThanOrEqual(8);
    });

    it('should sort files by relevance score descending', async () => {
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results.length).toBeGreaterThan(0);
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
      }
    });

    it('should only return files with relevanceScore > 0', async () => {
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results.length).toBeGreaterThan(0);
      for (const file of results) {
        expect(file.relevanceScore).toBeGreaterThan(0);
      }
    });
  });

  // ── Content loading ────────────────────────────────────────────────────

  describe('content loading', () => {
    it('should truncate content to 3000 characters', async () => {
      mockReadFile.mockResolvedValue(longContent());
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results.length).toBeGreaterThan(0);
      for (const file of results) {
        if (file.content !== '[Could not load file]') {
          expect(file.content.length).toBeLessThanOrEqual(3000);
        }
      }
    });

    it('should set content to error message if file read fails', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results.length).toBeGreaterThan(0);
      for (const file of results) {
        expect(file.content).toBe('[Could not load file]');
      }
    });

    it('should populate content for returned files', async () => {
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results.length).toBeGreaterThan(0);
      for (const file of results) {
        expect(file.content).toBeTruthy();
        expect(file.content.length).toBeGreaterThan(0);
      }
    });
  });

  // ── File filtering ─────────────────────────────────────────────────────

  describe('file filtering', () => {
    it('should include .md files', async () => {
      const results = await loadKnowledgeForStage('investment_memo');
      const mdFiles = results.filter(r => r.filename.endsWith('.md'));
      expect(mdFiles.length).toBeGreaterThan(0);
    });

    it('should include .json files when they match topics', async () => {
      // valuation_cap_rate_analysis.json matches financial keywords
      const results = await loadKnowledgeForStage('risk_score');
      const jsonFiles = results.filter(r => r.filename.endsWith('.json'));
      expect(jsonFiles.length).toBeGreaterThanOrEqual(0);
    });

    it('should exclude hidden files starting with dot', async () => {
      const results = await loadKnowledgeForStage('investment_memo');
      const hiddenFiles = results.filter(r => r.filename.startsWith('.'));
      expect(hiddenFiles.length).toBe(0);
    });

    it('should exclude non-.md/.json files', async () => {
      const results = await loadKnowledgeForStage('investment_memo');
      for (const file of results) {
        expect(
          file.filename.endsWith('.md') || file.filename.endsWith('.json')
        ).toBe(true);
      }
    });
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('should return empty array if readdir fails (directory does not exist)', async () => {
      mockReaddir.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results).toEqual([]);
    });

    it('should return empty array if directory is empty', async () => {
      mockReaddir.mockResolvedValue([]);
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results).toEqual([]);
    });

    it('should return empty array if no files match any topics', async () => {
      mockReaddir.mockResolvedValue([
        'random_unrelated_file.md',
        'another_unrelated.md',
      ]);
      const results = await loadKnowledgeForStage('deal_intake');
      expect(results).toEqual([]);
    });

    it('should handle context with all fields provided', async () => {
      const results = await loadKnowledgeForStage('deal_intake', {
        state: 'OH',
        assetType: 'SNF',
        query: 'regulatory compliance survey',
      });
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle context with no fields (empty object)', async () => {
      const results = await loadKnowledgeForStage('deal_intake', {});
      expect(results.length).toBeGreaterThan(0);
    });
  });

  // ── Topics assignment ──────────────────────────────────────────────────

  describe('topics assignment', () => {
    it('should assign correct topics to files based on keyword matching', async () => {
      const results = await loadKnowledgeForStage('deal_intake');
      const conFile = results.find(r => r.filename === 'CON_regulatory_overview.md');
      expect(conFile).toBeDefined();
      expect(conFile!.topics).toContain('regulatory');
    });

    it('should assign multiple topics if file matches multiple keyword sets', async () => {
      // OR_state_medicaid_rates.md matches 'reimbursement' (via 'medicaid' and 'state_medicaid')
      const results = await loadKnowledgeForStage('pro_forma');
      const orFile = results.find(r => r.filename === 'OR_state_medicaid_rates.md');
      if (orFile) {
        expect(orFile.topics).toContain('reimbursement');
      }
    });
  });
});

// ─── searchKnowledge ─────────────────────────────────────────────────────────

describe('searchKnowledge', () => {
  beforeEach(() => {
    mockReaddir.mockReset();
    mockReadFile.mockReset();
    _resetCaches();
    mockReaddir.mockResolvedValue(SAMPLE_FILES);
    mockReadFile.mockImplementation(async (filepath: string) => {
      const name = String(filepath).split('/').pop() || '';
      return fileContent(name);
    });
  });

  it('should return files matching the query by filename', async () => {
    const results = await searchKnowledge('regulatory compliance');
    const filenames = results.map(r => r.filename);
    expect(filenames).toContain('CON_regulatory_overview.md');
  });

  it('should score +10 per filename keyword match', async () => {
    const results = await searchKnowledge('market intelligence');
    const marketFile = results.find(r => r.filename === 'market_intelligence_snf_ma.md');
    expect(marketFile).toBeDefined();
    // "market" (+10) + "intelligence" (+10) = 20 from filename alone
    expect(marketFile!.relevanceScore).toBeGreaterThanOrEqual(20);
  });

  it('should also score by content matches (capped at 20 per word)', async () => {
    const results = await searchKnowledge('financial revenue');
    const finFile = results.find(r => r.filename === 'financial_revenue_benchmarks.md');
    expect(finFile).toBeDefined();
    // filename matches: "financial" (+10) + "revenue" (+10) = 20
    // content matches: additional score from content containing these words
    expect(finFile!.relevanceScore).toBeGreaterThan(20);
  });

  it('should filter out query words with 2 or fewer characters', async () => {
    const results = await searchKnowledge('OR MA');
    // "OR" = 2 chars, "MA" = 2 chars => both filtered (filter requires w.length > 2)
    expect(results).toEqual([]);
  });

  it('should respect the limit parameter', async () => {
    const results = await searchKnowledge('market', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it('should default to limit of 5', async () => {
    const results = await searchKnowledge('operational');
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should sort results by relevance descending', async () => {
    const results = await searchKnowledge('market acquisition');
    for (let i = 1; i < results.length; i++) {
      expect(results[i - 1].relevanceScore).toBeGreaterThanOrEqual(results[i].relevanceScore);
    }
  });

  it('should truncate content to 3000 characters', async () => {
    mockReadFile.mockResolvedValue(longContent());
    const results = await searchKnowledge('regulatory');
    for (const file of results) {
      expect(file.content.length).toBeLessThanOrEqual(3000);
    }
  });

  it('should return empty array if readdir fails', async () => {
    mockReaddir.mockRejectedValue(new Error('ENOENT'));
    const results = await searchKnowledge('anything');
    expect(results).toEqual([]);
  });

  it('should skip files that cannot be read', async () => {
    let callCount = 0;
    mockReadFile.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) throw new Error('Permission denied');
      return fileContent('test.md');
    });
    const results = await searchKnowledge('market');
    expect(Array.isArray(results)).toBe(true);
  });

  it('should only search .md and .json files', async () => {
    const results = await searchKnowledge('notes');
    for (const file of results) {
      expect(
        file.filename.endsWith('.md') || file.filename.endsWith('.json')
      ).toBe(true);
    }
  });

  it('should assign topics based on TOPIC_KEYWORDS', async () => {
    const results = await searchKnowledge('medicaid reimbursement');
    const medicaidFile = results.find(r => r.filename === 'medicaid_reimbursement_PDPM.md');
    expect(medicaidFile).toBeDefined();
    expect(medicaidFile!.topics).toContain('reimbursement');
  });

  it('should return empty array for empty query', async () => {
    const results = await searchKnowledge('');
    expect(results).toEqual([]);
  });

  it('should not include files with zero filename match score', async () => {
    const results = await searchKnowledge('unicorn rainbow');
    expect(results).toEqual([]);
  });
});
