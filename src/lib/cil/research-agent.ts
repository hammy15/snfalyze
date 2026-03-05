// =============================================================================
// CIL RESEARCH AGENT — Dispatches research missions via Perplexity
// =============================================================================

import { db } from '@/db';
import { researchMissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { desc } from 'drizzle-orm';
import { getRouter } from '../ai/singleton';
import { logActivity } from './state-manager';
import type { ResearchMission } from './types';
import { extractAhaMoments } from './aha-extractor';
import { notifyResearchComplete } from '@/lib/notifications/telegram';

export async function createResearchMission(
  topic: string,
  context?: { state?: string; assetType?: string; target?: string }
): Promise<ResearchMission> {
  const [row] = await db
    .insert(researchMissions)
    .values({
      topic,
      context: context ?? null,
    })
    .returning();

  await logActivity('research', `Research mission created: "${topic}"`, {
    metadata: { missionId: row.id, context },
  });

  // Execute synchronously — Vercel serverless kills background work after response
  try {
    await executeResearchMission(row.id, topic, context);
  } catch (err) {
    console.error('[CIL Research] Mission execution failed:', err);
  }

  // Re-fetch to get updated status
  const [updated] = await db
    .select()
    .from(researchMissions)
    .where(eq(researchMissions.id, row.id));

  return mapMissionRow(updated || row);
}

export async function executeResearchMission(
  missionId: string,
  topic: string,
  context?: { state?: string; assetType?: string; target?: string }
): Promise<void> {
  const start = Date.now();

  // Mark as researching
  await db
    .update(researchMissions)
    .set({ status: 'researching' })
    .where(eq(researchMissions.id, missionId));

  try {
    const router = getRouter();

    // Build research prompt
    const contextStr = context
      ? `Context: ${context.state ? `State: ${context.state}` : ''}${context.assetType ? ` Asset Type: ${context.assetType}` : ''}${context.target ? ` Target: ${context.target}` : ''}`
      : '';

    const response = await router.route({
      taskType: 'deep_research',
      systemPrompt: 'You are a healthcare real estate research analyst. Provide thorough, data-driven research with source citations.',
      userPrompt: `Research the following topic thoroughly for a skilled nursing facility / healthcare real estate acquisition context:\n\nTOPIC: ${topic}\n${contextStr}\n\nProvide:\n1. Key findings with data points\n2. Market trends and implications\n3. Regulatory considerations\n4. Actionable intelligence for Cascadia Healthcare\n5. Source citations where available`,
      maxTokens: 4000,
      temperature: 0.3,
    });

    const findings = response.content;
    const latencyMs = Date.now() - start;

    // Extract any URLs from the response as sources
    const urlRegex = /https?:\/\/[^\s)]+/g;
    const urls = findings.match(urlRegex) || [];
    const sources = urls.map((url) => ({ url, title: url.split('/').pop() || url, snippet: '' }));

    await db
      .update(researchMissions)
      .set({
        status: 'complete',
        findings,
        sources: sources as unknown as Record<string, unknown>,
        latencyMs,
        completedAt: new Date(),
      })
      .where(eq(researchMissions.id, missionId));

    await logActivity('research', `Research complete: "${topic}" (${(latencyMs / 1000).toFixed(1)}s)`, {
      metadata: { missionId, sourceCount: sources.length },
    });

    // Telegram notification (non-blocking)
    notifyResearchComplete(topic, latencyMs).catch(() => {});

    // Auto-extract AHA moments from research findings (non-blocking)
    extractAhaMoments({
      dealName: topic,
      narrative: findings,
      state: context?.state,
      assetType: context?.assetType,
      source: 'research',
    }).catch(err => console.error('[AHA] Research extract failed:', err));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await db
      .update(researchMissions)
      .set({
        status: 'failed',
        error: errorMsg,
        latencyMs: Date.now() - start,
      })
      .where(eq(researchMissions.id, missionId));

    await logActivity('research', `Research failed: "${topic}" — ${errorMsg}`, {
      metadata: { missionId },
    });
  }
}

export async function importMissionToKnowledge(missionId: string): Promise<string> {
  const [mission] = await db
    .select()
    .from(researchMissions)
    .where(eq(researchMissions.id, missionId));

  if (!mission || !mission.findings) {
    throw new Error('Mission not found or has no findings');
  }

  const fs = await import('fs');
  const path = await import('path');

  // Generate filename
  const slug = mission.topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 60);
  const date = new Date().toISOString().split('T')[0];
  const filename = `research-${date}-${slug}.md`;
  const filePath = path.join(process.cwd(), 'knowledge', 'research', filename);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Build markdown
  const context = mission.context as { state?: string; assetType?: string; target?: string } | null;
  const md = [
    `# Research: ${mission.topic}`,
    ``,
    `**Date:** ${date}`,
    context?.state ? `**State:** ${context.state}` : null,
    context?.assetType ? `**Asset Type:** ${context.assetType}` : null,
    `**Source:** CIL Research Agent (Perplexity)`,
    ``,
    `---`,
    ``,
    mission.findings,
  ]
    .filter(Boolean)
    .join('\n');

  fs.writeFileSync(filePath, md, 'utf-8');

  // Update mission record
  await db
    .update(researchMissions)
    .set({
      importedToKnowledge: true,
      knowledgeFilePath: `knowledge/research/${filename}`,
    })
    .where(eq(researchMissions.id, missionId));

  await logActivity('knowledge_import', `Research imported to knowledge: ${filename}`, {
    metadata: { missionId, filePath: `knowledge/research/${filename}` },
  });

  return filePath;
}

export async function listResearchMissions(limit = 20): Promise<ResearchMission[]> {
  const rows = await db
    .select()
    .from(researchMissions)
    .orderBy(desc(researchMissions.createdAt))
    .limit(limit);

  return rows.map(mapMissionRow);
}

export async function getResearchMission(id: string): Promise<ResearchMission | null> {
  const [row] = await db.select().from(researchMissions).where(eq(researchMissions.id, id));
  return row ? mapMissionRow(row) : null;
}

function mapMissionRow(row: typeof researchMissions.$inferSelect): ResearchMission {
  return {
    id: row.id,
    topic: row.topic,
    context: row.context as ResearchMission['context'],
    status: row.status ?? 'queued',
    findings: row.findings,
    sources: (row.sources as ResearchMission['sources']) ?? [],
    importedToKnowledge: row.importedToKnowledge ?? false,
    knowledgeFilePath: row.knowledgeFilePath,
    latencyMs: row.latencyMs,
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  };
}
