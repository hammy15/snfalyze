import { NextRequest, NextResponse } from 'next/server';
import { db, deals, valuations, financialPeriods, assumptions, partnerMatches, riskFactors } from '@/db';
import { eq } from 'drizzle-orm';
import { analyzeDeal } from '@/lib/analysis/engine';

// Vercel Pro: allow up to 5 minutes for AI analysis/extraction
export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;

    // Update deal status to analyzing
    await db
      .update(deals)
      .set({ status: 'analyzing', updatedAt: new Date() })
      .where(eq(deals.id, dealId));

    // Fetch deal with all related data
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: {
        facilities: true,
        documents: true,
        financialPeriods: true,
      },
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Run AI analysis
    const analysisResult = await analyzeDeal(deal);

    // Save analysis results
    if (analysisResult.financials) {
      for (const fp of analysisResult.financials) {
        await db.insert(financialPeriods).values({
          dealId,
          ...fp,
        });
      }
    }

    if (analysisResult.valuations) {
      for (const val of analysisResult.valuations) {
        await db.insert(valuations).values({
          dealId,
          ...val,
        });
      }
    }

    if (analysisResult.assumptions) {
      // Sanitize assumption categories — DB enum only allows: minor | census | labor | regulatory
      const validCategories = new Set(['minor', 'census', 'labor', 'regulatory']);
      for (const assumption of analysisResult.assumptions) {
        const category = validCategories.has(assumption.category) ? assumption.category : 'minor';
        await db.insert(assumptions).values({
          dealId,
          ...assumption,
          category,
        });
      }
    }

    if (analysisResult.riskFactors) {
      for (const risk of analysisResult.riskFactors) {
        await db.insert(riskFactors).values({
          dealId,
          ...risk,
        });
      }
    }

    if (analysisResult.partnerMatches) {
      for (const match of analysisResult.partnerMatches) {
        await db.insert(partnerMatches).values({
          dealId,
          ...match,
        });
      }
    }

    // Update deal with analysis results
    await db
      .update(deals)
      .set({
        status: 'reviewed',
        confidenceScore: analysisResult.confidenceScore,
        analysisNarrative: analysisResult.narrative,
        thesis: analysisResult.thesis,
        analyzedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(deals.id, dealId));

    return NextResponse.json({
      success: true,
      data: analysisResult,
    });
  } catch (error) {
    console.error('Error analyzing deal:', error);

    // Reset status on error
    await db
      .update(deals)
      .set({ status: 'new', updatedAt: new Date() })
      .where(eq(deals.id, params.id));

    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? (error.stack || '').slice(0, 500) : '';
    return NextResponse.json(
      { success: false, error: 'Failed to analyze deal', debug: errMsg, stack: errStack },
      { status: 500 }
    );
  }
}
