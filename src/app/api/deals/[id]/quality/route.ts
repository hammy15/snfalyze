/**
 * Deal Quality Evaluation API
 *
 * GET /api/deals/[id]/quality
 * Returns comprehensive quality report for a deal.
 *
 * POST /api/deals/[id]/quality
 * Recalculates and updates quality scores.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  evaluateDealQuality,
  updateDealQualityScore,
} from '@/lib/quality/quality-evaluator';
import { checkQualityGate, GateAction } from '@/lib/quality/quality-gate';
import { calculateOverallScore, detectQualityIssues } from '@/lib/quality/quality-calculator';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Get action parameter if checking gate
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') as GateAction | null;

    // Evaluate quality
    const report = await evaluateDealQuality(dealId);

    // If action specified, include gate check
    let gateResult = null;
    if (action) {
      const score = {
        overall: report.overallScore,
        breakdown: report.breakdown,
        level: report.level as 'excellent' | 'good' | 'fair' | 'poor',
        canProceedToAnalysis: report.canProceedToAnalysis,
      };
      gateResult = checkQualityGate(score, report.issues, action);
    }

    return NextResponse.json({
      success: true,
      data: {
        ...report,
        ...(gateResult && { gate: gateResult }),
      },
    });
  } catch (error) {
    console.error('Quality evaluation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Quality evaluation failed',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Evaluate quality
    const report = await evaluateDealQuality(dealId);

    // Update stored score
    await updateDealQualityScore(dealId, report.overallScore);

    return NextResponse.json({
      success: true,
      data: report,
      message: `Quality score updated to ${report.overallScore}%`,
    });
  } catch (error) {
    console.error('Quality recalculation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Quality recalculation failed',
      },
      { status: 500 }
    );
  }
}
