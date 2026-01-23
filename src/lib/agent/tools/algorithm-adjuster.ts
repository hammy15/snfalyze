/**
 * Algorithm Adjuster Tool
 *
 * Allows the AI agent to adjust algorithm parameters for deal analysis.
 * This tool REQUIRES user confirmation before execution.
 */

import { db } from '@/db';
import { dealAlgorithmOverrides, algorithmSettings, settingsAuditLog } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import type { AgentTool, ToolOutput, ToolExecutionContext, SettingsCategory } from '../types';

export const adjustAlgorithmSettingsTool: AgentTool = {
  name: 'adjust_algorithm_settings',
  description: `Adjust algorithm parameters for the current deal analysis. This can modify valuation parameters (cap rates, discount rates), financial assumptions (growth rates, expense ratios), or risk weights.

Use this tool when:
- The user requests specific parameter changes
- Market conditions suggest different assumptions are warranted
- Similar deals used different parameters successfully
- The AI identifies that current parameters may not fit this deal's characteristics

Examples:
- Adjust cap rate from 8% to 8.5% for a higher-risk facility
- Modify discount rate for DCF analysis
- Change growth rate assumptions based on market trends`,

  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: 'The category of setting to adjust',
        enum: ['valuation', 'financial', 'risk', 'market', 'proforma'],
      },
      key: {
        type: 'string',
        description: 'The specific parameter key to adjust (e.g., "cap_rate_snf", "discount_rate", "expense_growth_rate")',
      },
      newValue: {
        type: 'object',
        description: 'The new value for the parameter. Can be a number, string, or object depending on the parameter.',
      },
      reason: {
        type: 'string',
        description: 'Clear explanation of why this adjustment is recommended',
      },
      basedOnDeals: {
        type: 'array',
        description: 'Optional list of similar deal IDs that informed this recommendation',
        items: { type: 'string', description: 'Deal ID' },
      },
    },
    required: ['category', 'key', 'newValue', 'reason'],
  },

  requiresConfirmation: true,

  async execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolOutput> {
    const startTime = Date.now();

    const { category, key, newValue, reason, basedOnDeals } = input as {
      category: SettingsCategory;
      key: string;
      newValue: unknown;
      reason: string;
      basedOnDeals?: string[];
    };

    if (!context.dealId) {
      return {
        success: false,
        error: 'No deal context available. Please specify a deal first.',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }

    try {
      // Get the current global setting value
      const [currentSetting] = await db
        .select()
        .from(algorithmSettings)
        .where(
          and(
            eq(algorithmSettings.category, category),
            eq(algorithmSettings.key, key),
            eq(algorithmSettings.isActive, true)
          )
        )
        .limit(1);

      const originalValue = currentSetting?.value;

      // Check if there's already an override for this deal/key
      const [existingOverride] = await db
        .select()
        .from(dealAlgorithmOverrides)
        .where(
          and(
            eq(dealAlgorithmOverrides.dealId, context.dealId),
            eq(dealAlgorithmOverrides.category, category),
            eq(dealAlgorithmOverrides.key, key),
            eq(dealAlgorithmOverrides.isActive, true)
          )
        )
        .limit(1);

      if (existingOverride) {
        // Update existing override
        await db
          .update(dealAlgorithmOverrides)
          .set({
            overrideValue: newValue,
            originalValue: existingOverride.originalValue || originalValue,
            reason,
            source: 'ai_suggestion',
            suggestedBy: 'AI Agent',
            appliedBy: context.userId,
            appliedAt: new Date(),
          })
          .where(eq(dealAlgorithmOverrides.id, existingOverride.id));
      } else {
        // Create new override
        await db.insert(dealAlgorithmOverrides).values({
          dealId: context.dealId,
          category,
          key,
          overrideValue: newValue,
          originalValue,
          reason,
          source: 'ai_suggestion',
          suggestedBy: 'AI Agent',
          appliedBy: context.userId,
        });
      }

      // Log the change in audit
      await db.insert(settingsAuditLog).values({
        settingId: currentSetting?.id,
        category,
        key,
        previousValue: originalValue,
        newValue,
        changeReason: `[Deal Override] ${reason}`,
        changedBy: context.userId || 'AI Agent',
      });

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          message: `Successfully adjusted ${key} in ${category} settings`,
          category,
          key,
          previousValue: originalValue,
          newValue,
          reason,
          basedOnDeals,
          dealId: context.dealId,
        },
        metadata: {
          executionTimeMs,
          affectedRecords: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to adjust algorithm settings',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  },
};

/**
 * Get current algorithm settings with any deal-specific overrides applied
 */
export async function getEffectiveSettings(
  dealId: string,
  category?: SettingsCategory
): Promise<Record<string, unknown>> {
  // Get global settings
  const globalConditions = category
    ? and(eq(algorithmSettings.isActive, true), eq(algorithmSettings.category, category))
    : eq(algorithmSettings.isActive, true);

  const globalSettings = await db
    .select()
    .from(algorithmSettings)
    .where(globalConditions);

  // Get deal-specific overrides
  const overrideConditions = category
    ? and(
        eq(dealAlgorithmOverrides.dealId, dealId),
        eq(dealAlgorithmOverrides.isActive, true),
        eq(dealAlgorithmOverrides.category, category)
      )
    : and(eq(dealAlgorithmOverrides.dealId, dealId), eq(dealAlgorithmOverrides.isActive, true));

  const overrides = await db
    .select()
    .from(dealAlgorithmOverrides)
    .where(overrideConditions);

  // Merge global settings with overrides
  const effectiveSettings: Record<string, unknown> = {};

  for (const setting of globalSettings) {
    effectiveSettings[`${setting.category}.${setting.key}`] = setting.value;
  }

  for (const override of overrides) {
    effectiveSettings[`${override.category}.${override.key}`] = override.overrideValue;
  }

  return effectiveSettings;
}

/**
 * List all overrides for a deal
 */
export async function getDealOverrides(dealId: string) {
  return db
    .select()
    .from(dealAlgorithmOverrides)
    .where(
      and(eq(dealAlgorithmOverrides.dealId, dealId), eq(dealAlgorithmOverrides.isActive, true))
    );
}

/**
 * Remove an override for a deal
 */
export async function removeOverride(dealId: string, category: SettingsCategory, key: string) {
  await db
    .update(dealAlgorithmOverrides)
    .set({ isActive: false })
    .where(
      and(
        eq(dealAlgorithmOverrides.dealId, dealId),
        eq(dealAlgorithmOverrides.category, category),
        eq(dealAlgorithmOverrides.key, key)
      )
    );
}

export default adjustAlgorithmSettingsTool;
