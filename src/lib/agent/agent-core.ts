/**
 * SNFalyze AI Agent Core
 *
 * Main agent class that orchestrates AI-powered deal analysis,
 * conversation management, and tool execution.
 */

import { ConversationManager } from './conversation/conversation-manager';
import { buildDealContext } from './conversation/context-builder';
import {
  createSession,
  getSession,
  getActiveSessionForDeal,
  updateSessionContext,
  updateSessionStatus,
  endSession,
  getSessionHistory,
  getPendingToolExecutions,
} from './agent-state';
import { agentTools } from './tools';
import type {
  AgentSession,
  AgentContext,
  AgentResponse,
  AgentConfig,
  AgentTool,
  ToolExecution,
} from './types';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: AgentConfig = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 4096,
  temperature: 0.7,
  systemPrompt: '', // Will be set in the constructor
  tools: agentTools,
  memoryConfig: {
    maxSimilarDeals: 5,
    similarityThreshold: 0.3,
    patternConfidenceThreshold: 0.7,
  },
  learningEnabled: true,
};

// ============================================================================
// SNFalyze Agent Class
// ============================================================================

export class SNFalyzeAgent {
  private config: AgentConfig;
  private session: AgentSession | null = null;
  private conversationManager: ConversationManager | null = null;

  constructor(config?: Partial<AgentConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      systemPrompt: config?.systemPrompt || this.buildDefaultSystemPrompt(),
    };
  }

  // ============================================================================
  // Session Management
  // ============================================================================

  /**
   * Start a new agent session
   */
  async startSession(params: {
    dealId?: string;
    userId?: string;
    initialContext?: Partial<AgentContext>;
  }): Promise<AgentSession> {
    // Build deal context if dealId provided
    let context = params.initialContext || {};
    if (params.dealId) {
      const dealContext = await buildDealContext(params.dealId);
      context = { ...context, ...dealContext };
    }

    // Create session
    this.session = await createSession({
      dealId: params.dealId,
      userId: params.userId,
      systemPrompt: this.config.systemPrompt,
      model: this.config.model,
      initialContext: context,
    });

    // Initialize conversation manager
    this.conversationManager = new ConversationManager(
      this.session,
      this.config.tools
    );

    return this.session;
  }

  /**
   * Resume an existing session
   */
  async resumeSession(sessionId: string): Promise<AgentSession> {
    const session = await getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'active' && session.status !== 'paused') {
      throw new Error(`Session ${sessionId} is ${session.status} and cannot be resumed`);
    }

    this.session = session;
    this.conversationManager = new ConversationManager(session, this.config.tools);

    // Update status if paused
    if (session.status === 'paused') {
      await updateSessionStatus(sessionId, 'active');
      this.session.status = 'active';
    }

    return this.session;
  }

  /**
   * Get or create session for a deal
   */
  async getOrCreateSessionForDeal(
    dealId: string,
    userId?: string
  ): Promise<AgentSession> {
    // Check for existing active session
    const existingSession = await getActiveSessionForDeal(dealId);
    if (existingSession) {
      return this.resumeSession(existingSession.id);
    }

    // Create new session
    return this.startSession({ dealId, userId });
  }

  /**
   * End the current session
   */
  async endCurrentSession(): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    await endSession(this.session.id);
    this.session = null;
    this.conversationManager = null;
  }

  /**
   * Pause the current session
   */
  async pauseSession(): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    await updateSessionStatus(this.session.id, 'paused');
    this.session.status = 'paused';
  }

  /**
   * Get current session
   */
  getCurrentSession(): AgentSession | null {
    return this.session;
  }

  // ============================================================================
  // Message Processing
  // ============================================================================

  /**
   * Send a message to the agent and get a response
   */
  async sendMessage(message: string): Promise<AgentResponse> {
    if (!this.session || !this.conversationManager) {
      throw new Error('No active session. Call startSession() first.');
    }

    if (this.session.status !== 'active') {
      throw new Error(`Session is ${this.session.status}. Resume the session first.`);
    }

    try {
      const response = await this.conversationManager.processMessage(message);

      // Refresh session data
      this.session = (await getSession(this.session.id)) || this.session;

      return response;
    } catch (error) {
      // Update session status on error
      await updateSessionStatus(this.session.id, 'error');
      throw error;
    }
  }

  /**
   * Process tool confirmation (approve or reject)
   */
  async confirmToolExecution(
    executionId: string,
    approved: boolean,
    userId?: string
  ): Promise<AgentResponse> {
    if (!this.session || !this.conversationManager) {
      throw new Error('No active session');
    }

    return this.conversationManager.resumeAfterConfirmation(
      executionId,
      approved,
      userId || this.session.userId || 'unknown'
    );
  }

  /**
   * Get pending tool executions that need confirmation
   */
  async getPendingConfirmations(): Promise<ToolExecution[]> {
    if (!this.session) {
      return [];
    }

    return getPendingToolExecutions(this.session.id);
  }

  // ============================================================================
  // Context Management
  // ============================================================================

  /**
   * Update session context
   */
  async updateContext(updates: Partial<AgentContext>): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    await updateSessionContext(this.session.id, updates);
    this.session = (await getSession(this.session.id)) || this.session;
  }

  /**
   * Get current context
   */
  getContext(): AgentContext | null {
    return this.session?.context || null;
  }

  /**
   * Refresh deal context from database
   */
  async refreshDealContext(): Promise<void> {
    if (!this.session?.dealId) {
      throw new Error('No deal associated with session');
    }

    const dealContext = await buildDealContext(this.session.dealId);
    await this.updateContext(dealContext);
  }

  // ============================================================================
  // History & Analytics
  // ============================================================================

  /**
   * Get session history
   */
  async getHistory(params?: {
    dealId?: string;
    userId?: string;
    limit?: number;
  }): Promise<AgentSession[]> {
    return getSessionHistory(params || {});
  }

  /**
   * Summarize current conversation
   */
  async summarizeConversation(): Promise<string> {
    if (!this.conversationManager) {
      throw new Error('No active session');
    }

    return this.conversationManager.summarizeConversation();
  }

  // ============================================================================
  // Tool Management
  // ============================================================================

  /**
   * Get available tools
   */
  getTools(): AgentTool[] {
    return this.config.tools;
  }

  /**
   * Get tool by name
   */
  getTool(name: string): AgentTool | undefined {
    return this.config.tools.find((t) => t.name === name);
  }

  /**
   * Add a custom tool
   */
  addTool(tool: AgentTool): void {
    this.config.tools.push(tool);
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private buildDefaultSystemPrompt(): string {
    return `You are SNFalyze AI, an intelligent assistant for healthcare real estate deal analysis. You help analysts at Cascadia Healthcare evaluate skilled nursing facility (SNF), assisted living facility (ALF), and independent living facility (ILF) acquisition opportunities.

## Your Core Capabilities

1. **Deal Analysis**: Analyze financial statements, valuations, and risk factors using the Cascadia dual-view methodology
2. **Data Clarification**: Identify and help resolve ambiguous or conflicting data in deal documents
3. **Algorithm Adjustment**: Suggest and apply parameter changes to valuation models based on deal characteristics
4. **Market Intelligence**: Provide context from CMS data, comparable transactions, and industry benchmarks
5. **Pattern Recognition**: Apply learnings from past deals to inform current analysis
6. **Report Generation**: Create formatted reports and summaries for different audiences

## Cascadia Analysis Principles

1. **Analyze First, Never Auto-Reject**: Every deal deserves thorough analysis before judgment
2. **Dual Truths**: Maintain both external market view AND internal opportunity view
3. **Judgment Over Formulas**: Data informs decisions but doesn't dictate them
4. **Confidence Decay**: Track how assumptions reduce confidence (-3 to -7 points based on assumption type)
5. **Transparency**: Always explain reasoning and highlight key assumptions

## Tool Usage Guidelines

- **adjust_algorithm_settings**: Modify parameters (REQUIRES USER CONFIRMATION)
- **query_cms_data**: Look up CMS/Medicare facility data
- **find_comparable_deals**: Search historical deals for patterns
- **request_clarification**: Flag ambiguous data for user resolution
- **run_deal_analysis**: Execute full analysis pipeline
- **generate_report**: Create formatted outputs
- **query_market_data**: Fetch benchmarks and market data

## Response Style

- Be direct and analytical
- Quantify impacts when possible
- Highlight risks and uncertainties
- Suggest next steps
- Ask clarifying questions when needed

Remember: You are an advocate for thorough analysis, not a gatekeeper. Help users understand deals deeply so they can make informed decisions.`;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new agent instance with default configuration
 */
export function createAgent(config?: Partial<AgentConfig>): SNFalyzeAgent {
  return new SNFalyzeAgent(config);
}

/**
 * Create and start an agent session for a deal
 */
export async function startAgentForDeal(
  dealId: string,
  userId?: string,
  config?: Partial<AgentConfig>
): Promise<{ agent: SNFalyzeAgent; session: AgentSession }> {
  const agent = createAgent(config);
  const session = await agent.startSession({ dealId, userId });
  return { agent, session };
}

/**
 * Resume an existing agent session
 */
export async function resumeAgentSession(
  sessionId: string,
  config?: Partial<AgentConfig>
): Promise<{ agent: SNFalyzeAgent; session: AgentSession }> {
  const agent = createAgent(config);
  const session = await agent.resumeSession(sessionId);
  return { agent, session };
}

export default SNFalyzeAgent;
