/**
 * Agent State Management
 *
 * Handles session state persistence and retrieval using the database.
 */

import { db } from '@/db';
import { agentSessions, agentMessages, agentToolExecutions } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type {
  AgentSession,
  AgentContext,
  AgentMessage,
  ToolExecution,
  AgentSessionStatus,
  ToolStatus,
  ToolCall,
  ToolResult,
} from './types';

// ============================================================================
// Session Management
// ============================================================================

export async function createSession(params: {
  dealId?: string;
  userId?: string;
  systemPrompt?: string;
  model?: string;
  initialContext?: Partial<AgentContext>;
}): Promise<AgentSession> {
  const [session] = await db
    .insert(agentSessions)
    .values({
      dealId: params.dealId,
      userId: params.userId,
      systemPrompt: params.systemPrompt,
      model: params.model || 'claude-sonnet-4-20250514',
      context: params.initialContext || {},
      status: 'active',
    })
    .returning();

  return mapDbSessionToSession(session);
}

export async function getSession(sessionId: string): Promise<AgentSession | null> {
  const [session] = await db
    .select()
    .from(agentSessions)
    .where(eq(agentSessions.id, sessionId))
    .limit(1);

  if (!session) return null;
  return mapDbSessionToSession(session);
}

export async function getActiveSessionForDeal(dealId: string): Promise<AgentSession | null> {
  const [session] = await db
    .select()
    .from(agentSessions)
    .where(and(eq(agentSessions.dealId, dealId), eq(agentSessions.status, 'active')))
    .orderBy(desc(agentSessions.startedAt))
    .limit(1);

  if (!session) return null;
  return mapDbSessionToSession(session);
}

export async function updateSessionStatus(
  sessionId: string,
  status: AgentSessionStatus
): Promise<void> {
  await db
    .update(agentSessions)
    .set({
      status,
      lastActiveAt: new Date(),
      ...(status === 'completed' || status === 'error' ? { endedAt: new Date() } : {}),
    })
    .where(eq(agentSessions.id, sessionId));
}

export async function updateSessionContext(
  sessionId: string,
  contextUpdates: Partial<AgentContext>
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const updatedContext = {
    ...session.context,
    ...contextUpdates,
  };

  await db
    .update(agentSessions)
    .set({
      context: updatedContext,
      lastActiveAt: new Date(),
    })
    .where(eq(agentSessions.id, sessionId));
}

export async function updateSessionTokens(
  sessionId: string,
  tokensUsed: number
): Promise<void> {
  const session = await getSession(sessionId);
  if (!session) throw new Error(`Session ${sessionId} not found`);

  await db
    .update(agentSessions)
    .set({
      totalTokensUsed: session.totalTokensUsed + tokensUsed,
      messageCount: session.messageCount + 1,
      lastActiveAt: new Date(),
    })
    .where(eq(agentSessions.id, sessionId));
}

export async function endSession(sessionId: string): Promise<void> {
  await updateSessionStatus(sessionId, 'completed');
}

// ============================================================================
// Message Management
// ============================================================================

export async function addMessage(params: {
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: unknown[];
  toolResults?: unknown[];
  tokensUsed?: number;
  latencyMs?: number;
}): Promise<AgentMessage> {
  const [message] = await db
    .insert(agentMessages)
    .values({
      sessionId: params.sessionId,
      role: params.role,
      content: params.content,
      toolCalls: params.toolCalls,
      toolResults: params.toolResults,
      tokensUsed: params.tokensUsed,
      latencyMs: params.latencyMs,
    })
    .returning();

  return mapDbMessageToMessage(message);
}

export async function getSessionMessages(
  sessionId: string,
  limit?: number
): Promise<AgentMessage[]> {
  const query = db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.sessionId, sessionId))
    .orderBy(agentMessages.createdAt);

  const messages = limit ? await query.limit(limit) : await query;
  return messages.map(mapDbMessageToMessage);
}

export async function getRecentMessages(
  sessionId: string,
  count: number
): Promise<AgentMessage[]> {
  const messages = await db
    .select()
    .from(agentMessages)
    .where(eq(agentMessages.sessionId, sessionId))
    .orderBy(desc(agentMessages.createdAt))
    .limit(count);

  return messages.reverse().map(mapDbMessageToMessage);
}

// ============================================================================
// Tool Execution Management
// ============================================================================

export async function createToolExecution(params: {
  sessionId: string;
  messageId?: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  requiresConfirmation?: boolean;
}): Promise<ToolExecution> {
  const [execution] = await db
    .insert(agentToolExecutions)
    .values({
      sessionId: params.sessionId,
      messageId: params.messageId,
      toolName: params.toolName,
      toolInput: params.toolInput,
      requiresConfirmation: params.requiresConfirmation || false,
      status: params.requiresConfirmation ? 'pending' : 'executing',
    })
    .returning();

  return mapDbExecutionToExecution(execution);
}

export async function getToolExecution(executionId: string): Promise<ToolExecution | null> {
  const [execution] = await db
    .select()
    .from(agentToolExecutions)
    .where(eq(agentToolExecutions.id, executionId))
    .limit(1);

  if (!execution) return null;
  return mapDbExecutionToExecution(execution);
}

export async function getPendingToolExecutions(sessionId: string): Promise<ToolExecution[]> {
  const executions = await db
    .select()
    .from(agentToolExecutions)
    .where(
      and(
        eq(agentToolExecutions.sessionId, sessionId),
        eq(agentToolExecutions.status, 'pending')
      )
    )
    .orderBy(agentToolExecutions.createdAt);

  return executions.map(mapDbExecutionToExecution);
}

export async function updateToolExecution(
  executionId: string,
  updates: {
    status?: ToolStatus;
    toolOutput?: unknown;
    errorMessage?: string;
    confirmedBy?: string;
    executionTimeMs?: number;
  }
): Promise<void> {
  const updateData: Record<string, unknown> = { ...updates };

  if (updates.status === 'approved' || updates.confirmedBy) {
    updateData.confirmedAt = new Date();
  }

  if (updates.status === 'completed' || updates.status === 'failed') {
    updateData.completedAt = new Date();
  }

  await db
    .update(agentToolExecutions)
    .set(updateData)
    .where(eq(agentToolExecutions.id, executionId));
}

export async function approveToolExecution(
  executionId: string,
  userId: string
): Promise<void> {
  await updateToolExecution(executionId, {
    status: 'approved',
    confirmedBy: userId,
  });
}

export async function rejectToolExecution(
  executionId: string,
  userId: string,
  reason?: string
): Promise<void> {
  await updateToolExecution(executionId, {
    status: 'rejected',
    confirmedBy: userId,
    errorMessage: reason || 'Rejected by user',
  });
}

// ============================================================================
// Session History
// ============================================================================

export async function getSessionHistory(params: {
  dealId?: string;
  userId?: string;
  status?: AgentSessionStatus;
  limit?: number;
}): Promise<AgentSession[]> {
  let query = db.select().from(agentSessions);

  const conditions = [];
  if (params.dealId) {
    conditions.push(eq(agentSessions.dealId, params.dealId));
  }
  if (params.userId) {
    conditions.push(eq(agentSessions.userId, params.userId));
  }
  if (params.status) {
    conditions.push(eq(agentSessions.status, params.status));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  query = query.orderBy(desc(agentSessions.startedAt)) as typeof query;

  if (params.limit) {
    query = query.limit(params.limit) as typeof query;
  }

  const sessions = await query;
  return sessions.map(mapDbSessionToSession);
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapDbSessionToSession(dbSession: typeof agentSessions.$inferSelect): AgentSession {
  return {
    id: dbSession.id,
    dealId: dbSession.dealId || undefined,
    userId: dbSession.userId || undefined,
    status: dbSession.status as AgentSessionStatus,
    context: (dbSession.context as AgentContext) || {},
    systemPrompt: dbSession.systemPrompt || undefined,
    model: dbSession.model || 'claude-sonnet-4-20250514',
    totalTokensUsed: dbSession.totalTokensUsed || 0,
    messageCount: dbSession.messageCount || 0,
    startedAt: dbSession.startedAt || new Date(),
    lastActiveAt: dbSession.lastActiveAt || new Date(),
    endedAt: dbSession.endedAt || undefined,
    metadata: (dbSession.metadata as Record<string, unknown>) || undefined,
  };
}

function mapDbMessageToMessage(dbMessage: typeof agentMessages.$inferSelect): AgentMessage {
  return {
    id: dbMessage.id,
    sessionId: dbMessage.sessionId,
    role: dbMessage.role as 'user' | 'assistant' | 'system' | 'tool',
    content: dbMessage.content,
    toolCalls: (dbMessage.toolCalls as ToolCall[] | null) || undefined,
    toolResults: (dbMessage.toolResults as ToolResult[] | null) || undefined,
    tokensUsed: dbMessage.tokensUsed || undefined,
    latencyMs: dbMessage.latencyMs || undefined,
    createdAt: dbMessage.createdAt || new Date(),
  };
}

function mapDbExecutionToExecution(
  dbExecution: typeof agentToolExecutions.$inferSelect
): ToolExecution {
  return {
    id: dbExecution.id,
    sessionId: dbExecution.sessionId,
    messageId: dbExecution.messageId || undefined,
    toolName: dbExecution.toolName,
    toolInput: dbExecution.toolInput as Record<string, unknown>,
    toolOutput: dbExecution.toolOutput || undefined,
    status: dbExecution.status as ToolStatus,
    requiresConfirmation: dbExecution.requiresConfirmation || false,
    confirmedBy: dbExecution.confirmedBy || undefined,
    confirmedAt: dbExecution.confirmedAt || undefined,
    errorMessage: dbExecution.errorMessage || undefined,
    executionTimeMs: dbExecution.executionTimeMs || undefined,
    createdAt: dbExecution.createdAt || new Date(),
    completedAt: dbExecution.completedAt || undefined,
  };
}
