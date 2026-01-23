/**
 * Analysis Recalculation API
 *
 * Real-time recalculation with parameter overrides.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, financialPeriods } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createRecalculationEngine, type OverrideInput } from '@/lib/analysis/realtime';
import type { ValuationInput, FacilityProfile } from '@/lib/analysis/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, overrides = [], saveOverrides = false, userId } = body as {
      dealId: string;
      overrides?: OverrideInput[];
      saveOverrides?: boolean;
      userId?: string;
    };

    if (!dealId) {
      return NextResponse.json({ error: 'dealId is required' }, { status: 400 });
    }

    // Get deal data
    const [deal] = await db
      .select()
      .from(deals)
      .where(eq(deals.id, dealId))
      .limit(1);

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get latest financial period
    const [latestFinancials] = await db
      .select()
      .from(financialPeriods)
      .where(eq(financialPeriods.dealId, dealId))
      .orderBy(desc(financialPeriods.periodEnd))
      .limit(1);

    // Note: CMS data would be linked via facility CCN in actual implementation

    // Build valuation input (simplified - actual implementation would be more comprehensive)
    const facility: FacilityProfile = {
      id: dealId,
      name: deal.name || 'Unknown',
      address: {
        street: '',
        city: '',
        state: deal.primaryState || '',
        zip: '',
      },
      assetType: (deal.assetType as FacilityProfile['assetType']) || 'SNF',
      beds: {
        licensed: deal.beds || 100,
        certified: deal.beds || 100,
        operational: deal.beds || 100,
      },
      yearBuilt: 1990,
      stories: 1,
      buildingCount: 1,
      roomConfiguration: {
        private: 50,
        semiPrivate: 50,
      },
      ownershipType: 'for_profit',
      locationType: 'suburban',
      region: 'west',
    };

    // Note: Full NormalizedFinancials would be built from financial periods in actual implementation
    const _ = latestFinancials; // Acknowledge unused variable

    const valuationInput: ValuationInput = {
      facility,
      // financials would be built from financial periods in actual implementation
      operatingMetrics: {
        currentCensus: 85,
        occupancyRate: 0.85,
        occupancyTrend: 'stable',
        payerMix: {
          medicareA: 0.10,
          medicareB: 0.05,
          medicareAdvantage: 0.05,
          medicaid: 0.55,
          privatePay: 0.10,
          managedCare: 0.10,
          vaContract: 0.02,
          hospice: 0.02,
          other: 0.01,
        },
        acuityLevel: 'moderate',
        staffing: {
          rnHPPD: 0.8,
          lpnHPPD: 1.2,
          cnaHPPD: 2.0,
          totalHPPD: 4.0,
          agencyUsagePercent: 0.08,
          turnoverRate: 0.35,
        },
        averageLOS: {
          medicare: 22,
          medicaid: 180,
          privatePay: 30,
          overall: 60,
        },
      },
    };

    // Run recalculation
    const engine = createRecalculationEngine();
    const result = await engine.recalculate(dealId, valuationInput, overrides);

    // Save overrides if requested
    if (saveOverrides && overrides.length > 0) {
      await engine.saveOverrides(dealId, overrides, userId);
    }

    return NextResponse.json({
      dealId,
      valuation: {
        reconciledValue: result.valuation.result.reconciledValue,
        valuePerBed: result.valuation.result.valuePerBed,
        impliedCapRate: result.valuation.result.impliedCapRate,
        valueLow: result.valuation.result.valueLow,
        valueMid: result.valuation.result.valueMid,
        valueHigh: result.valuation.result.valueHigh,
        overallConfidence: result.valuation.result.overallConfidence,
        methods: result.valuation.methods,
      },
      sensitivity: result.valuation.sensitivity,
      parameters: {
        activeOverrides: result.resolvedParameters.activeOverrides,
        presetName: result.resolvedParameters.presetName,
        sources: result.resolvedParameters.sources,
      },
      calculation: {
        time: result.calculationTime,
        fromCache: result.fromCache,
        calculatedAt: result.calculatedAt,
      },
    });
  } catch (error) {
    console.error('Error in recalculation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to recalculate' },
      { status: 500 }
    );
  }
}
