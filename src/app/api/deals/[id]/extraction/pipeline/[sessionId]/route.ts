/**
 * Pipeline Session API Routes
 *
 * GET - Get session status and data
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSession,
  getSessionContext,
} from '@/lib/extraction/pipeline';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = getSession(sessionId);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Get additional context data
    const contextManager = getSessionContext(sessionId);
    const facilityProfiles = contextManager?.getFacilityProfiles() || [];
    const conflicts = contextManager?.getDetectedConflicts() || [];
    const clarifications = contextManager?.getPendingClarifications() || [];

    return NextResponse.json({
      session: {
        id: session.id,
        dealId: session.dealId,
        status: session.status,
        documentIds: session.documentIds,
        currentDocumentIndex: session.currentDocumentIndex,
        currentPass: session.currentPass,
        progress: session.progress,
        error: session.error,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        completedAt: session.completedAt,
      },
      facilities: facilityProfiles.map((f) => ({
        id: f.id,
        name: f.name,
        aliases: f.aliases,
        ccn: f.ccn,
        licensedBeds: f.licensedBeds,
        ttmRevenue: f.ttmRevenue,
        ttmNoi: f.ttmNoi,
        avgOccupancy: f.avgOccupancy,
        dataCompleteness: f.dataCompleteness,
        dataConfidence: f.dataConfidence,
        periodsCount: f.financialPeriods.length,
      })),
      conflicts: conflicts.map((c) => ({
        id: c.id,
        type: c.type,
        severity: c.severity,
        fieldPath: c.fieldPath,
        facilityId: c.facilityId,
        periodKey: c.periodKey,
        variancePercent: c.variancePercent,
        status: c.status,
        resolvedValue: c.resolvedValue,
        resolutionMethod: c.resolutionMethod,
      })),
      clarifications: clarifications.map((c) => ({
        id: c.id,
        fieldPath: c.fieldPath,
        fieldLabel: c.fieldLabel,
        clarificationType: c.clarificationType,
        priority: c.priority,
        extractedValue: c.extractedValue,
        extractedConfidence: c.extractedConfidence,
        suggestedValues: c.suggestedValues,
        benchmarkRange: c.benchmarkRange,
        context: c.context,
        status: c.status,
      })),
      stats: contextManager?.getStats() || null,
    });
  } catch (error) {
    console.error('Error getting pipeline session:', error);
    return NextResponse.json(
      { error: 'Failed to get session' },
      { status: 500 }
    );
  }
}
