import { NextRequest, NextResponse } from 'next/server';
import { db, deals, valuations, financialPeriods, assumptions, partnerMatches, riskFactors } from '@/db';
import { eq } from 'drizzle-orm';
import { analyzeDeal } from '@/lib/analysis/engine';

// Vercel Pro: allow up to 5 minutes for AI analysis/extraction
export const maxDuration = 300;

// ── Sanitizers ────────────────────────────────────────────────────────────────

/** Clamp a value that must be stored as a fraction (0–1), e.g. occupancy, cap rates */
function asFraction(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  if (isNaN(n)) return null;
  // If AI returned a percentage (e.g. 87), convert to fraction (0.87)
  if (n > 1) return Math.min(n / 100, 1);
  return Math.max(0, Math.min(1, n));
}

/** Safe decimal — null if not a finite number */
function safeNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isFinite(n) ? n : null;
}

/** Sanitize a financialPeriod record before DB insert */
function sanitizeFinancialPeriod(fp: Record<string, unknown>) {
  return {
    ...fp,
    occupancyRate: asFraction(fp.occupancyRate),
    agencyPercentage: asFraction(fp.agencyPercentage),
    totalRevenue: safeNum(fp.totalRevenue),
    laborCost: safeNum(fp.laborCost),
    agencyLabor: safeNum(fp.agencyLabor),
    noi: safeNum(fp.noi),
    normalizedNoi: safeNum(fp.normalizedNoi),
    hppd: safeNum(fp.hppd),
  };
}

/** Sanitize a valuation record before DB insert */
function sanitizeValuation(val: Record<string, unknown>) {
  return {
    ...val,
    capRateLow: asFraction(val.capRateLow),
    capRateBase: asFraction(val.capRateBase),
    capRateHigh: asFraction(val.capRateHigh),
    valueLow: safeNum(val.valueLow),
    valueBase: safeNum(val.valueBase),
    valueHigh: safeNum(val.valueHigh),
    noiUsed: safeNum(val.noiUsed),
    pricePerBed: safeNum(val.pricePerBed),
    suggestedOffer: safeNum(val.suggestedOffer),
    walkAwayThreshold: safeNum(val.walkAwayThreshold),
    confidenceScore: safeNum(val.confidenceScore),
  };
}

// ── Route handler ─────────────────────────────────────────────────────────────

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

    // Save results — wrap each section individually so one bad record never kills the whole analysis
    if (analysisResult.financials) {
      for (const fp of analysisResult.financials) {
        try {
          await db.insert(financialPeriods).values({
            dealId,
            ...sanitizeFinancialPeriod(fp as Record<string, unknown>),
          });
        } catch (e) {
          console.warn('Skipping bad financialPeriod row:', e);
        }
      }
    }

    if (analysisResult.valuations) {
      for (const val of analysisResult.valuations) {
        try {
          await db.insert(valuations).values({
            dealId,
            ...sanitizeValuation(val as Record<string, unknown>),
          });
        } catch (e) {
          console.warn('Skipping bad valuation row:', e);
        }
      }
    }

    if (analysisResult.assumptions) {
      // assumption_category enum: minor | census | labor | regulatory
      const validCategories = new Set(['minor', 'census', 'labor', 'regulatory']);
      for (const assumption of analysisResult.assumptions) {
        try {
          const category = validCategories.has((assumption as Record<string,unknown>).category as string)
            ? (assumption as Record<string,unknown>).category
            : 'minor';
          await db.insert(assumptions).values({
            dealId,
            ...assumption,
            category,
          });
        } catch (e) {
          console.warn('Skipping bad assumption row:', e);
        }
      }
    }

    if (analysisResult.riskFactors) {
      for (const risk of analysisResult.riskFactors) {
        try {
          await db.insert(riskFactors).values({ dealId, ...risk });
        } catch (e) {
          console.warn('Skipping bad riskFactor row:', e);
        }
      }
    }

    if (analysisResult.partnerMatches) {
      for (const match of analysisResult.partnerMatches) {
        try {
          await db.insert(partnerMatches).values({ dealId, ...match });
        } catch (e) {
          console.warn('Skipping bad partnerMatch row:', e);
        }
      }
    }

    // Update deal with analysis results — this is the critical save
    await db
      .update(deals)
      .set({
        status: 'reviewed',
        confidenceScore: safeNum(analysisResult.confidenceScore),
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
