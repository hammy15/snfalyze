// =============================================================================
// REGULATORY SENSE — Nose: CON status, licensing, survey risk
// =============================================================================

import type { Sense, SenseContext, SenseResult } from '../types';

export const regulatorySense: Sense = {
  id: 'regulatory',
  name: 'Regulatory Risk',
  icon: '👃',
  description: 'CON status, licensing requirements, survey body behavior',

  async activate(context: SenseContext): Promise<SenseResult> {
    const start = Date.now();

    try {
      const { searchKnowledge } = await import('../../workspace/knowledge-loader');

      // Search knowledge base for regulatory intelligence
      const queries = [
        context.state ? `${context.state} regulatory` : null,
        context.state ? `${context.state} certificate of need` : null,
        context.state ? `${context.state} licensing` : null,
        'regulatory risk survey',
      ].filter(Boolean) as string[];

      const allFiles = await Promise.all(queries.map((q) => searchKnowledge(q, 3)));
      const uniqueFiles = new Map<string, { filename: string; content: string }>();
      for (const files of allFiles) {
        for (const f of files) {
          if (!uniqueFiles.has(f.filename)) {
            uniqueFiles.set(f.filename, f);
          }
        }
      }

      const knowledgeFiles = Array.from(uniqueFiles.values()).slice(0, 5);

      if (knowledgeFiles.length === 0) {
        return {
          senseId: 'regulatory',
          senseName: 'Regulatory Risk',
          data: {},
          confidence: 20,
          summary: `No regulatory intelligence found for ${context.state ?? 'this state'}`,
          latencyMs: Date.now() - start,
        };
      }

      // Extract key regulatory data from knowledge files
      const data: Record<string, unknown> = {
        knowledgeFiles: knowledgeFiles.map((f) => f.filename),
        snippets: knowledgeFiles.map((f) => ({
          file: f.filename,
          preview: f.content.slice(0, 500),
        })),
      };

      // Check for CON state
      const hasCON = knowledgeFiles.some(
        (f) =>
          f.content.toLowerCase().includes('certificate of need') ||
          f.content.toLowerCase().includes('con state') ||
          f.content.toLowerCase().includes('con requirement')
      );
      data.hasCON = hasCON;

      return {
        senseId: 'regulatory',
        senseName: 'Regulatory Risk',
        data,
        confidence: Math.min(90, 40 + knowledgeFiles.length * 10),
        summary: `${knowledgeFiles.length} regulatory files found for ${context.state ?? 'context'}${hasCON ? ' (CON state)' : ''}`,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        senseId: 'regulatory',
        senseName: 'Regulatory Risk',
        data: { error: err instanceof Error ? err.message : String(err) },
        confidence: 0,
        summary: 'Regulatory sense activation failed',
        latencyMs: Date.now() - start,
      };
    }
  },
};
