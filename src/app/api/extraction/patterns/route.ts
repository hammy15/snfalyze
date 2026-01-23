/**
 * Learned Patterns API
 *
 * Get learned extraction patterns and their success rates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { learnedPatterns } from '@/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType');
    const fieldName = searchParams.get('fieldName');
    const isActive = searchParams.get('isActive') !== 'false'; // Default to active only
    const minConfidence = parseFloat(searchParams.get('minConfidence') || '0.5');

    // Build query conditions
    const conditions = [
      eq(learnedPatterns.isActive, isActive),
      gte(learnedPatterns.confidence, String(minConfidence)),
    ];

    if (documentType) {
      conditions.push(
        eq(
          learnedPatterns.documentType,
          documentType as typeof learnedPatterns.documentType.enumValues[number]
        )
      );
    }

    if (fieldName) {
      conditions.push(eq(learnedPatterns.fieldName, fieldName));
    }

    // Get patterns
    const patterns = await db
      .select()
      .from(learnedPatterns)
      .where(and(...conditions))
      .orderBy(desc(learnedPatterns.confidence), desc(learnedPatterns.occurrenceCount));

    // Group by document type and field
    const grouped: Record<
      string,
      Record<
        string,
        Array<{
          id: string;
          pattern: string;
          confidence: number;
          occurrenceCount: number;
          successCount: number;
          failureCount: number;
          successRate: number;
          examples: { inputs: unknown[]; outputs: unknown[] };
          lastUsedAt: Date | null;
        }>
      >
    > = {};

    for (const p of patterns) {
      const docType = p.documentType || 'all';
      const field = p.fieldName || 'all';

      if (!grouped[docType]) grouped[docType] = {};
      if (!grouped[docType][field]) grouped[docType][field] = [];

      const totalUsage = (p.successCount || 0) + (p.failureCount || 0);

      grouped[docType][field].push({
        id: p.id,
        pattern: p.pattern,
        confidence: Number(p.confidence),
        occurrenceCount: p.occurrenceCount || 0,
        successCount: p.successCount || 0,
        failureCount: p.failureCount || 0,
        successRate: totalUsage > 0 ? (p.successCount || 0) / totalUsage : 0,
        examples: {
          inputs: (p.exampleInputs as unknown[]) || [],
          outputs: (p.exampleOutputs as unknown[]) || [],
        },
        lastUsedAt: p.lastUsedAt,
      });
    }

    // Summary statistics
    const totalPatterns = patterns.length;
    const activePatterns = patterns.filter((p) => p.isActive).length;
    const avgConfidence =
      patterns.length > 0
        ? patterns.reduce((sum, p) => sum + Number(p.confidence), 0) / patterns.length
        : 0;
    const totalOccurrences = patterns.reduce((sum, p) => sum + (p.occurrenceCount || 0), 0);

    return NextResponse.json({
      filters: {
        documentType,
        fieldName,
        isActive,
        minConfidence,
      },
      summary: {
        totalPatterns,
        activePatterns,
        avgConfidence,
        totalOccurrences,
      },
      patterns: grouped,
      flat: patterns.map((p) => ({
        id: p.id,
        patternType: p.patternType,
        documentType: p.documentType,
        fieldName: p.fieldName,
        pattern: p.pattern,
        confidence: Number(p.confidence),
        occurrenceCount: p.occurrenceCount,
        successCount: p.successCount,
        failureCount: p.failureCount,
        isActive: p.isActive,
        createdAt: p.createdAt,
        lastUsedAt: p.lastUsedAt,
      })),
    });
  } catch (error) {
    console.error('Error getting patterns:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get patterns' },
      { status: 500 }
    );
  }
}

// POST - Provide feedback on a pattern
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patternId, wasSuccessful } = body as {
      patternId: string;
      wasSuccessful: boolean;
    };

    if (!patternId) {
      return NextResponse.json({ error: 'patternId is required' }, { status: 400 });
    }

    // Get current pattern
    const [pattern] = await db
      .select()
      .from(learnedPatterns)
      .where(eq(learnedPatterns.id, patternId))
      .limit(1);

    if (!pattern) {
      return NextResponse.json({ error: 'Pattern not found' }, { status: 404 });
    }

    // Update pattern stats
    const newSuccessCount = (pattern.successCount || 0) + (wasSuccessful ? 1 : 0);
    const newFailureCount = (pattern.failureCount || 0) + (wasSuccessful ? 0 : 1);
    const totalUsage = newSuccessCount + newFailureCount;
    const newConfidence = totalUsage > 0 ? newSuccessCount / totalUsage : 0.5;

    await db
      .update(learnedPatterns)
      .set({
        successCount: newSuccessCount,
        failureCount: newFailureCount,
        confidence: String(newConfidence),
        lastUsedAt: new Date(),
        // Deactivate patterns with low success rate after enough usage
        isActive: newConfidence >= 0.5 || totalUsage < 5,
        updatedAt: new Date(),
      })
      .where(eq(learnedPatterns.id, patternId));

    return NextResponse.json({
      success: true,
      patternId,
      newConfidence,
      successCount: newSuccessCount,
      failureCount: newFailureCount,
      isActive: newConfidence >= 0.5 || totalUsage < 5,
    });
  } catch (error) {
    console.error('Error updating pattern:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update pattern' },
      { status: 500 }
    );
  }
}
