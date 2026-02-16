/**
 * Conversation Manager
 *
 * Handles multi-turn conversation flow, including message history,
 * context building, and conversation summarization.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { MessageParam, ContentBlock, ToolUseBlock, ToolResultBlockParam } from '@anthropic-ai/sdk/resources/messages';
import {
  getSessionMessages,
  addMessage,
  updateSessionContext,
  updateSessionTokens,
  createToolExecution,
  updateToolExecution,
} from '../agent-state';
import { buildContextPrompt } from './context-builder';
import type {
  AgentSession,
  AgentMessage,
  AgentResponse,
  AgentTool,
  ToolCall,
  ToolResult,
  ToolExecutionContext,
  AgentContext,
} from '../types';

const anthropic = new Anthropic();

// ============================================================================
// Conversation Manager
// ============================================================================

export class ConversationManager {
  private session: AgentSession;
  private tools: AgentTool[];
  private maxContextMessages: number;

  constructor(session: AgentSession, tools: AgentTool[], maxContextMessages = 50) {
    this.session = session;
    this.tools = tools;
    this.maxContextMessages = maxContextMessages;
  }

  /**
   * Process a user message and generate an agent response
   */
  async processMessage(userMessage: string): Promise<AgentResponse> {
    const startTime = Date.now();

    // Store user message
    await addMessage({
      sessionId: this.session.id,
      role: 'user',
      content: userMessage,
    });

    // Build conversation history
    const messages = await this.buildMessageHistory();

    // Build system prompt with context
    const systemPrompt = await this.buildSystemPrompt();

    // Call Claude with tools
    const response = await this.callClaude(systemPrompt, messages);

    const latencyMs = Date.now() - startTime;

    // Process response and handle tool calls
    const agentResponse = await this.processResponse(response, latencyMs);

    return agentResponse;
  }

  /**
   * Build message history for context
   */
  private async buildMessageHistory(): Promise<MessageParam[]> {
    const dbMessages = await getSessionMessages(this.session.id, this.maxContextMessages);

    const messages: MessageParam[] = [];

    for (const msg of dbMessages) {
      if (msg.role === 'user') {
        messages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        const content: ContentBlock[] = [{ type: 'text', text: msg.content, citations: null }];

        // Add tool calls if present
        if (msg.toolCalls && Array.isArray(msg.toolCalls)) {
          for (const tc of msg.toolCalls as ToolCall[]) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.input,
            });
          }
        }

        messages.push({
          role: 'assistant',
          content,
        });

        // Add tool results if present
        if (msg.toolResults && Array.isArray(msg.toolResults)) {
          const toolResults: ToolResultBlockParam[] = (msg.toolResults as ToolResult[]).map((tr) => ({
            type: 'tool_result' as const,
            tool_use_id: tr.toolCallId,
            content: typeof tr.output === 'string' ? tr.output : JSON.stringify(tr.output),
            is_error: !!tr.error,
          }));

          messages.push({
            role: 'user',
            content: toolResults,
          });
        }
      }
    }

    return messages;
  }

  /**
   * Build system prompt with current context
   */
  private async buildSystemPrompt(): Promise<string> {
    const contextPrompt = buildContextPrompt(this.session.context);

    const basePrompt = this.session.systemPrompt || DEFAULT_SYSTEM_PROMPT;

    return `${basePrompt}\n\n${contextPrompt}`;
  }

  /**
   * Call Claude API with tools
   */
  private async callClaude(
    systemPrompt: string,
    messages: MessageParam[]
  ): Promise<Anthropic.Message> {
    // Build tool definitions
    const toolDefinitions = this.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Anthropic.Tool.InputSchema,
    }));

    const response = await anthropic.messages.create({
      model: this.session.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages,
      tools: toolDefinitions,
    });

    return response;
  }

  /**
   * Process Claude's response and handle tool calls
   */
  private async processResponse(
    response: Anthropic.Message,
    latencyMs: number
  ): Promise<AgentResponse> {
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];
    let textContent = '';

    // Extract content from response
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    // Store assistant message
    const assistantMessage = await addMessage({
      sessionId: this.session.id,
      role: 'assistant',
      content: textContent || 'Processing...',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      tokensUsed: response.usage?.output_tokens,
      latencyMs,
    });

    // Update session tokens
    const totalTokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    await updateSessionTokens(this.session.id, totalTokens);

    // Execute tools if present
    if (toolCalls.length > 0) {
      const executionContext: ToolExecutionContext = {
        sessionId: this.session.id,
        dealId: this.session.dealId,
        userId: this.session.userId,
        agentContext: this.session.context,
      };

      for (const toolCall of toolCalls) {
        const tool = this.tools.find((t) => t.name === toolCall.name);
        if (!tool) {
          toolResults.push({
            toolCallId: toolCall.id,
            output: null,
            error: `Unknown tool: ${toolCall.name}`,
          });
          continue;
        }

        // Create tool execution record
        const execution = await createToolExecution({
          sessionId: this.session.id,
          messageId: assistantMessage.id,
          toolName: toolCall.name,
          toolInput: toolCall.input,
          requiresConfirmation: tool.requiresConfirmation,
        });

        if (tool.requiresConfirmation) {
          // Tool requires user confirmation - don't execute yet
          toolResults.push({
            toolCallId: toolCall.id,
            output: {
              pending: true,
              executionId: execution.id,
              message: `This action requires your confirmation. Please approve or reject.`,
            },
          });
        } else {
          // Execute tool directly
          const startTime = Date.now();
          try {
            const output = await tool.execute(toolCall.input, executionContext);
            const executionTimeMs = Date.now() - startTime;

            await updateToolExecution(execution.id, {
              status: 'completed',
              toolOutput: output,
              executionTimeMs,
            });

            toolResults.push({
              toolCallId: toolCall.id,
              output: output.data,
              executionTimeMs,
            });
          } catch (error) {
            const executionTimeMs = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            await updateToolExecution(execution.id, {
              status: 'failed',
              errorMessage,
              executionTimeMs,
            });

            toolResults.push({
              toolCallId: toolCall.id,
              output: null,
              error: errorMessage,
              executionTimeMs,
            });
          }
        }
      }

      // Store tool results
      if (toolResults.length > 0) {
        await addMessage({
          sessionId: this.session.id,
          role: 'tool',
          content: JSON.stringify(toolResults),
          toolResults,
        });
      }

      // If all tools completed (no pending confirmations), continue conversation
      const hasPendingConfirmations = toolResults.some(
        (tr) => (tr.output as Record<string, unknown>)?.pending === true
      );

      if (!hasPendingConfirmations && response.stop_reason === 'tool_use') {
        // Continue the conversation with tool results
        return this.continueAfterToolResults(toolResults);
      }
    }

    return {
      sessionId: this.session.id,
      message: assistantMessage,
      toolExecutions: [], // TODO: map tool executions
    };
  }

  /**
   * Continue conversation after tool results are available
   */
  private async continueAfterToolResults(toolResults: ToolResult[]): Promise<AgentResponse> {
    const startTime = Date.now();

    // Build updated message history
    const messages = await this.buildMessageHistory();

    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt();

    // Call Claude again
    const response = await this.callClaude(systemPrompt, messages);

    const latencyMs = Date.now() - startTime;

    // Process the new response
    return this.processResponse(response, latencyMs);
  }

  /**
   * Resume after tool confirmation
   */
  async resumeAfterConfirmation(
    executionId: string,
    approved: boolean,
    userId: string
  ): Promise<AgentResponse> {
    const { getToolExecution, approveToolExecution, rejectToolExecution } = await import(
      '../agent-state'
    );

    const execution = await getToolExecution(executionId);
    if (!execution) {
      throw new Error(`Tool execution ${executionId} not found`);
    }

    if (approved) {
      await approveToolExecution(executionId, userId);

      // Execute the tool now
      const tool = this.tools.find((t) => t.name === execution.toolName);
      if (!tool) {
        throw new Error(`Unknown tool: ${execution.toolName}`);
      }

      const executionContext: ToolExecutionContext = {
        sessionId: this.session.id,
        dealId: this.session.dealId,
        userId: this.session.userId,
        agentContext: this.session.context,
      };

      const startTime = Date.now();
      try {
        const output = await tool.execute(execution.toolInput, executionContext);
        const executionTimeMs = Date.now() - startTime;

        await updateToolExecution(executionId, {
          status: 'completed',
          toolOutput: output,
          executionTimeMs,
        });

        // Add tool result to conversation
        const toolResult: ToolResult = {
          toolCallId: execution.id,
          output: output.data,
          executionTimeMs,
        };

        await addMessage({
          sessionId: this.session.id,
          role: 'tool',
          content: JSON.stringify([toolResult]),
          toolResults: [toolResult],
        });

        // Continue conversation
        return this.continueAfterToolResults([toolResult]);
      } catch (error) {
        const executionTimeMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        await updateToolExecution(executionId, {
          status: 'failed',
          errorMessage,
          executionTimeMs,
        });

        // Add error result
        const toolResult: ToolResult = {
          toolCallId: execution.id,
          output: null,
          error: errorMessage,
          executionTimeMs,
        };

        await addMessage({
          sessionId: this.session.id,
          role: 'tool',
          content: JSON.stringify([toolResult]),
          toolResults: [toolResult],
        });

        return this.continueAfterToolResults([toolResult]);
      }
    } else {
      await rejectToolExecution(executionId, userId);

      // Add rejection result
      const toolResult: ToolResult = {
        toolCallId: execution.id,
        output: null,
        error: 'Tool execution rejected by user',
      };

      await addMessage({
        sessionId: this.session.id,
        role: 'tool',
        content: JSON.stringify([toolResult]),
        toolResults: [toolResult],
      });

      return this.continueAfterToolResults([toolResult]);
    }
  }

  /**
   * Summarize conversation for context compression
   */
  async summarizeConversation(): Promise<string> {
    const messages = await getSessionMessages(this.session.id);

    if (messages.length < 10) {
      return ''; // Not enough messages to warrant summarization
    }

    const conversationText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: 'Summarize the following conversation concisely, capturing key decisions, insights, and action items.',
      messages: [
        {
          role: 'user',
          content: conversationText,
        },
      ],
    });

    const summary =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Update session context with summary
    await updateSessionContext(this.session.id, {
      conversationSummary: summary,
    });

    return summary;
  }
}

// ============================================================================
// Default System Prompt
// ============================================================================

const DEFAULT_SYSTEM_PROMPT = `You are an intelligent AI assistant for SNFalyze, a healthcare real estate analysis platform. You help analysts evaluate skilled nursing facility (SNF), assisted living facility (ALF), and independent living facility (ILF) acquisition deals.

Your capabilities:
1. **Deal Analysis**: Analyze financial statements, valuations, and risk factors
2. **Data Clarification**: Identify and help resolve ambiguous or conflicting data
3. **Algorithm Adjustment**: Suggest and apply parameter changes to valuation models
4. **Market Intelligence**: Provide context from CMS data and comparable deals
5. **Learning**: Apply patterns learned from past deals and corrections

Core Principles (from Cascadia methodology):
- Analyze first, never auto-reject: Every deal deserves thorough analysis
- Dual truths: External market view AND internal opportunity view
- Judgment over formulas: Data informs, doesn't dictate
- Confidence decay: Assumptions reduce confidence based on impact

When using tools:
- Use adjust_algorithm_settings for parameter changes (requires confirmation)
- Use query_cms_data for Medicare/CMS data lookup
- Use find_comparable_deals to find similar historical deals
- Use request_clarification when data is ambiguous
- Use run_deal_analysis to execute the full analysis pipeline
- Use generate_report for formatted outputs

Always explain your reasoning and highlight key assumptions or uncertainties.`;

export default ConversationManager;
