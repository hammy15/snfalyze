/**
 * Clarification Requester Tool
 *
 * Allows the AI agent to request clarification from users when data is ambiguous.
 */

import { db } from '@/db';
import { extractionClarifications, documents, deals } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { AgentTool, ToolOutput, ToolExecutionContext, ClarificationType } from '../types';

export const requestClarificationTool: AgentTool = {
  name: 'request_clarification',
  description: `Request clarification from the user when data is ambiguous, conflicting, or uncertain. This tool creates a clarification request that will be presented to the user for resolution.

Use this tool when:
- A value has low confidence (< 70%)
- A value is outside expected benchmark ranges
- There's a conflict between two documents
- Critical data is missing
- Validation rules indicate potential issues

The clarification will be queued and presented to the user through the UI.`,

  inputSchema: {
    type: 'object',
    properties: {
      documentId: {
        type: 'string',
        description: 'The document ID where the ambiguous data was found',
      },
      fieldName: {
        type: 'string',
        description: 'The name of the field requiring clarification',
      },
      fieldPath: {
        type: 'string',
        description: 'JSON path to the field in the extracted data',
      },
      clarificationType: {
        type: 'string',
        description: 'Type of clarification needed',
        enum: ['low_confidence', 'out_of_range', 'conflict', 'missing', 'validation_error'],
      },
      extractedValue: {
        type: 'string',
        description: 'The value that was extracted (if any)',
      },
      suggestedValues: {
        type: 'array',
        description: 'Possible alternative values for the user to choose from',
        items: { type: 'string', description: 'Suggested value' },
      },
      benchmarkValue: {
        type: 'string',
        description: 'Expected benchmark value for comparison',
      },
      benchmarkRange: {
        type: 'object',
        description: 'Expected range for the value',
        properties: {
          min: { type: 'number', description: 'Minimum expected value' },
          max: { type: 'number', description: 'Maximum expected value' },
          median: { type: 'number', description: 'Median expected value' },
        },
      },
      reason: {
        type: 'string',
        description: 'Explanation of why clarification is needed',
      },
      confidenceScore: {
        type: 'number',
        description: 'Current confidence score (0-100)',
      },
      priority: {
        type: 'number',
        description: 'Priority level (1-10, 10 being highest)',
      },
    },
    required: ['fieldName', 'clarificationType', 'reason'],
  },

  requiresConfirmation: false,

  async execute(input: Record<string, unknown>, context: ToolExecutionContext): Promise<ToolOutput> {
    const startTime = Date.now();

    const {
      documentId,
      fieldName,
      fieldPath,
      clarificationType,
      extractedValue,
      suggestedValues,
      benchmarkValue,
      benchmarkRange,
      reason,
      confidenceScore,
      priority = 5,
    } = input as {
      documentId?: string;
      fieldName: string;
      fieldPath?: string;
      clarificationType: ClarificationType;
      extractedValue?: string;
      suggestedValues?: string[];
      benchmarkValue?: string;
      benchmarkRange?: { min: number; max: number; median: number };
      reason: string;
      confidenceScore?: number;
      priority?: number;
    };

    try {
      // Validate document exists if provided
      if (documentId) {
        const [doc] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1);

        if (!doc) {
          return {
            success: false,
            error: `Document ${documentId} not found`,
            metadata: { executionTimeMs: Date.now() - startTime },
          };
        }
      }

      // Use deal ID from context or get from document
      let dealId = context.dealId;
      if (!dealId && documentId) {
        const [doc] = await db
          .select({ dealId: documents.dealId })
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1);
        dealId = doc?.dealId || undefined;
      }

      // Create the clarification request
      const [clarification] = await db
        .insert(extractionClarifications)
        .values({
          documentId: documentId || '',
          dealId,
          fieldName,
          fieldPath,
          clarificationType,
          extractedValue,
          suggestedValues,
          benchmarkValue,
          benchmarkRange,
          reason,
          confidenceScore,
          priority,
          status: 'pending',
        })
        .returning();

      // Update document clarification count if document provided
      if (documentId) {
        const [doc] = await db
          .select()
          .from(documents)
          .where(eq(documents.id, documentId))
          .limit(1);

        if (doc) {
          await db
            .update(documents)
            .set({
              pendingClarifications: (doc.pendingClarifications || 0) + 1,
              clarificationStatus: 'pending',
            })
            .where(eq(documents.id, documentId));
        }
      }

      // Update deal conflict flag if needed
      if (dealId && clarificationType === 'conflict') {
        await db
          .update(deals)
          .set({ hasUnresolvedConflicts: true })
          .where(eq(deals.id, dealId));
      }

      const executionTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: {
          clarificationId: clarification.id,
          fieldName,
          clarificationType,
          status: 'pending',
          message: `Clarification requested for "${fieldName}". The user will be prompted to resolve this.`,
          priority,
        },
        metadata: {
          executionTimeMs,
          affectedRecords: 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create clarification request',
        metadata: { executionTimeMs: Date.now() - startTime },
      };
    }
  },
};

/**
 * Get pending clarifications for a deal
 */
export async function getPendingClarifications(dealId: string) {
  return db
    .select()
    .from(extractionClarifications)
    .where(
      and(
        eq(extractionClarifications.dealId, dealId),
        eq(extractionClarifications.status, 'pending')
      )
    )
    .orderBy(desc(extractionClarifications.priority), extractionClarifications.createdAt);
}

/**
 * Get pending clarifications for a document
 */
export async function getDocumentClarifications(documentId: string) {
  return db
    .select()
    .from(extractionClarifications)
    .where(eq(extractionClarifications.documentId, documentId))
    .orderBy(desc(extractionClarifications.priority), extractionClarifications.createdAt);
}

/**
 * Resolve a clarification
 */
export async function resolveClarification(
  clarificationId: string,
  resolution: {
    resolvedValue: string;
    resolvedBy: string;
    resolutionNotes?: string;
  }
) {
  const [clarification] = await db
    .update(extractionClarifications)
    .set({
      status: 'resolved',
      resolvedValue: resolution.resolvedValue,
      resolvedBy: resolution.resolvedBy,
      resolvedAt: new Date(),
      resolutionNotes: resolution.resolutionNotes,
    })
    .where(eq(extractionClarifications.id, clarificationId))
    .returning();

  // Update document clarification count
  if (clarification?.documentId) {
    const remaining = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.documentId, clarification.documentId),
          eq(extractionClarifications.status, 'pending')
        )
      );

    await db
      .update(documents)
      .set({
        pendingClarifications: remaining.length,
        clarificationStatus: remaining.length === 0 ? 'resolved' : 'pending',
      })
      .where(eq(documents.id, clarification.documentId));
  }

  // Check if deal still has unresolved conflicts
  if (clarification?.dealId) {
    const conflicts = await db
      .select()
      .from(extractionClarifications)
      .where(
        and(
          eq(extractionClarifications.dealId, clarification.dealId),
          eq(extractionClarifications.status, 'pending'),
          eq(extractionClarifications.clarificationType, 'conflict')
        )
      );

    if (conflicts.length === 0) {
      await db
        .update(deals)
        .set({ hasUnresolvedConflicts: false })
        .where(eq(deals.id, clarification.dealId));
    }
  }

  return clarification;
}

/**
 * Bulk resolve clarifications
 */
export async function bulkResolveClarifications(
  clarificationIds: string[],
  resolution: {
    resolvedBy: string;
    resolutionNotes?: string;
  }
) {
  const results = await Promise.all(
    clarificationIds.map(async (id) => {
      const [clarification] = await db
        .select()
        .from(extractionClarifications)
        .where(eq(extractionClarifications.id, id))
        .limit(1);

      if (clarification) {
        // Use extracted value as resolved value for bulk resolution
        return resolveClarification(id, {
          resolvedValue: clarification.extractedValue || '',
          resolvedBy: resolution.resolvedBy,
          resolutionNotes: resolution.resolutionNotes || 'Bulk resolved - accepted extracted value',
        });
      }
      return null;
    })
  );

  return results.filter(Boolean);
}

export default requestClarificationTool;
