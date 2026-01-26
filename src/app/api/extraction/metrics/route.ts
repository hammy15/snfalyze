/**
 * Extraction Metrics API
 *
 * Get extraction accuracy metrics by document type and field.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/db';
import { extractionMetrics, fieldCorrections } from '@/db/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentType = searchParams.get('documentType');
    const fieldName = searchParams.get('fieldName');
    const months = parseInt(searchParams.get('months') || '6');

    // Calculate date cutoff
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Build query conditions
    const conditions = [gte(extractionMetrics.periodStart, cutoffStr)];

    if (documentType) {
      conditions.push(
        eq(
          extractionMetrics.documentType,
          documentType as typeof extractionMetrics.documentType.enumValues[number]
        )
      );
    }

    if (fieldName) {
      conditions.push(eq(extractionMetrics.fieldName, fieldName));
    }

    // Get metrics
    const metrics = await db
      .select()
      .from(extractionMetrics)
      .where(and(...conditions))
      .orderBy(extractionMetrics.documentType, extractionMetrics.fieldName, desc(extractionMetrics.periodStart));

    // Aggregate by document type
    const byDocumentType: Record<
      string,
      {
        total: number;
        correct: number;
        corrections: number;
        accuracy: number;
        fields: Record<
          string,
          { total: number; correct: number; corrections: number; accuracy: number }
        >;
      }
    > = {};

    for (const m of metrics) {
      const docType = m.documentType || 'unknown';
      if (!byDocumentType[docType]) {
        byDocumentType[docType] = {
          total: 0,
          correct: 0,
          corrections: 0,
          accuracy: 0,
          fields: {},
        };
      }

      byDocumentType[docType].total += m.totalExtractions || 0;
      byDocumentType[docType].correct += m.correctExtractions || 0;
      byDocumentType[docType].corrections += m.correctionsApplied || 0;

      const field = m.fieldName;
      if (!byDocumentType[docType].fields[field]) {
        byDocumentType[docType].fields[field] = {
          total: 0,
          correct: 0,
          corrections: 0,
          accuracy: 0,
        };
      }

      byDocumentType[docType].fields[field].total += m.totalExtractions || 0;
      byDocumentType[docType].fields[field].correct += m.correctExtractions || 0;
      byDocumentType[docType].fields[field].corrections += m.correctionsApplied || 0;
    }

    // Calculate accuracies
    for (const docType of Object.keys(byDocumentType)) {
      const data = byDocumentType[docType];
      data.accuracy = data.total > 0 ? data.correct / data.total : 0;

      for (const field of Object.keys(data.fields)) {
        const fieldData = data.fields[field];
        fieldData.accuracy = fieldData.total > 0 ? fieldData.correct / fieldData.total : 0;
      }
    }

    // Get trend data
    const trends = metrics.reduce(
      (acc, m) => {
        const period = m.periodStart || '';
        if (!acc[period]) {
          acc[period] = { total: 0, correct: 0, accuracy: 0 };
        }
        acc[period].total += m.totalExtractions || 0;
        acc[period].correct += m.correctExtractions || 0;
        return acc;
      },
      {} as Record<string, { total: number; correct: number; accuracy: number }>
    );

    for (const period of Object.keys(trends)) {
      trends[period].accuracy =
        trends[period].total > 0 ? trends[period].correct / trends[period].total : 0;
    }

    // Overall statistics
    const totalExtractions = Object.values(byDocumentType).reduce((sum, d) => sum + d.total, 0);
    const totalCorrect = Object.values(byDocumentType).reduce((sum, d) => sum + d.correct, 0);
    const totalCorrections = Object.values(byDocumentType).reduce(
      (sum, d) => sum + d.corrections,
      0
    );

    return NextResponse.json({
      period: {
        start: cutoffStr,
        end: new Date().toISOString().split('T')[0],
        months,
      },
      overall: {
        totalExtractions,
        correctExtractions: totalCorrect,
        correctionsApplied: totalCorrections,
        accuracy: totalExtractions > 0 ? totalCorrect / totalExtractions : 0,
      },
      byDocumentType,
      trends: Object.entries(trends)
        .map(([period, data]) => ({ period, ...data }))
        .sort((a, b) => a.period.localeCompare(b.period)),
    });
  } catch (error) {
    console.error('Error getting extraction metrics:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get metrics' },
      { status: 500 }
    );
  }
}
