/**
 * Agent Tools Index
 *
 * Exports all agent tools for use by the AI agent.
 */

export { adjustAlgorithmSettingsTool, getEffectiveSettings, getDealOverrides, removeOverride } from './algorithm-adjuster';
export { queryCmsDataTool, getCmsBenchmarks } from './cms-query';
export { runDealAnalysisTool } from './deal-analyzer';
export { requestClarificationTool, getPendingClarifications, getDocumentClarifications, resolveClarification, bulkResolveClarifications } from './clarification-requester';
export { findComparableDealsTool, findSimilarByEmbedding } from './comparable-deals';
export { generateReportTool } from './report-generator';
export { queryMarketDataTool } from './market-data';

import { adjustAlgorithmSettingsTool } from './algorithm-adjuster';
import { queryCmsDataTool } from './cms-query';
import { runDealAnalysisTool } from './deal-analyzer';
import { requestClarificationTool } from './clarification-requester';
import { findComparableDealsTool } from './comparable-deals';
import { generateReportTool } from './report-generator';
import { queryMarketDataTool } from './market-data';
import type { AgentTool } from '../types';

/**
 * All available agent tools
 */
export const agentTools: AgentTool[] = [
  adjustAlgorithmSettingsTool,
  queryCmsDataTool,
  runDealAnalysisTool,
  requestClarificationTool,
  findComparableDealsTool,
  generateReportTool,
  queryMarketDataTool,
];

/**
 * Get a tool by name
 */
export function getToolByName(name: string): AgentTool | undefined {
  return agentTools.find((tool) => tool.name === name);
}

/**
 * Get all tools that require confirmation
 */
export function getConfirmationRequiredTools(): AgentTool[] {
  return agentTools.filter((tool) => tool.requiresConfirmation);
}

/**
 * Tool categories for organization
 */
export const toolCategories = {
  analysis: [runDealAnalysisTool, generateReportTool],
  data: [queryCmsDataTool, queryMarketDataTool, findComparableDealsTool],
  clarification: [requestClarificationTool],
  configuration: [adjustAlgorithmSettingsTool],
};

export default agentTools;
