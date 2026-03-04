import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, dealWorkspaceStages, cilActivityLog } from '@/db/schema';
import { eq, sql, isNull } from 'drizzle-orm';
import { pullCompsForDeal } from '@/lib/workspace/comp-engine';
import { generateProForma } from '@/lib/workspace/proforma-generator';
import { calculateWorkspaceRisk } from '@/lib/workspace/workspace-risk-adapter';

const WORKSPACE_STAGES = [
  { stage: 'deal_intake' as const, order: 1 },
  { stage: 'comp_pull' as const, order: 2 },
  { stage: 'pro_forma' as const, order: 3 },
  { stage: 'risk_score' as const, order: 4 },
  { stage: 'investment_memo' as const, order: 5 },
];

interface BatchResult {
  dealId: string;
  dealName: string;
  status: 'success' | 'partial' | 'failed';
  stagesCompleted: string[];
  errors: string[];
}

/**
 * POST /api/cil/batch-analyze
 * Runs workspace analysis pipeline on all deals that don't have workspace stages.
 * Stages: intake (auto-populated) → comps → pro_forma → risk_score
 * Skips investment_memo (expensive Claude API call).
 */
export async function POST() {
  try {
    // Find deals without workspace stages
    const allDeals = await db.select().from(deals);
    const dealsWithStages = await db
      .select({ dealId: dealWorkspaceStages.dealId })
      .from(dealWorkspaceStages)
      .groupBy(dealWorkspaceStages.dealId);

    const stagesDealIds = new Set(dealsWithStages.map((d) => d.dealId));
    const unanalyzedDeals = allDeals.filter((d) => !stagesDealIds.has(d.id));

    if (unanalyzedDeals.length === 0) {
      return NextResponse.json({
        message: 'All deals already have workspace stages',
        processed: 0,
        results: [],
      });
    }

    const results: BatchResult[] = [];

    for (const deal of unanalyzedDeals) {
      const result: BatchResult = {
        dealId: deal.id,
        dealName: deal.name,
        status: 'success',
        stagesCompleted: [],
        errors: [],
      };

      try {
        // 1. Initialize workspace stages
        for (const config of WORKSPACE_STAGES) {
          await db.insert(dealWorkspaceStages).values({
            dealId: deal.id,
            stage: config.stage,
            order: config.order,
            status: 'pending',
            stageData: {},
            completionScore: 0,
            validationErrors: [],
          });
        }

        // 2. Auto-populate intake from deal data
        const askingPrice = deal.askingPrice ? parseFloat(deal.askingPrice) : null;
        const beds = deal.beds || 100;
        const estimatedRevenue = askingPrice
          ? askingPrice * 0.4  // Revenue ~ 40% of asking price for SNFs
          : beds * 55000;     // $55K per bed fallback
        const estimatedEbitda = estimatedRevenue * 0.15;

        const intakeData = {
          facilityIdentification: {
            facilityName: deal.name,
            state: deal.primaryState || '',
            licensedBeds: beds,
            assetType: deal.assetType || 'SNF',
          },
          ownershipDealStructure: {
            askingPrice: askingPrice,
            dealStructure: deal.dealStructure || 'purchase',
            brokerName: deal.brokerName || '',
            brokerFirm: deal.brokerFirm || '',
            sellerName: deal.sellerName || '',
          },
          financialSnapshot: {
            ttmRevenue: estimatedRevenue,
            ttmEbitda: estimatedEbitda,
            medicareCensusPercent: 22,
            medicaidCensusPercent: 58,
            privatePayCensusPercent: 20,
            ttmTotalCensusAdc: Math.round(beds * 0.82),
          },
          operationalSnapshot: {
            cmsOverallRating: 3,
            cmsStaffingRating: 3,
            cmsQualityRating: 3,
            agencyStaffPercent: 8,
            cmi: 1.0,
          },
          marketContext: {
            marketType: 'suburban',
            isCONState: false,
          },
        };

        await db
          .update(dealWorkspaceStages)
          .set({
            stageData: intakeData,
            status: 'completed',
            completionScore: 65,
            startedAt: new Date(),
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(
            sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'deal_intake'`
          );

        result.stagesCompleted.push('deal_intake');

        // Update deal's workspace current stage
        await db
          .update(deals)
          .set({
            workspaceCurrentStage: 'comp_pull',
            status: deal.status === 'new' ? 'analyzing' : deal.status,
            updatedAt: new Date(),
          })
          .where(eq(deals.id, deal.id));

        // 3. Run comp pull
        try {
          const compResult = await pullCompsForDeal(deal.id);
          await db
            .update(dealWorkspaceStages)
            .set({
              stageData: compResult as unknown as Record<string, unknown>,
              status: 'completed',
              completionScore: compResult.transactionComps.length > 0 ? 100 : 50,
              startedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'comp_pull'`
            );
          result.stagesCompleted.push('comp_pull');
        } catch (e) {
          result.errors.push(`comp_pull: ${e instanceof Error ? e.message : 'Unknown error'}`);
          // Mark as completed with empty data so downstream stages can still run
          await db
            .update(dealWorkspaceStages)
            .set({
              status: 'completed',
              completionScore: 0,
              startedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'comp_pull'`
            );
        }

        // 4. Run pro forma
        try {
          const pfResult = await generateProForma({ dealId: deal.id });

          // Store key financials in a format the deals API can read
          const stageData = {
            revenueModel: pfResult.revenueModel,
            expenseModel: pfResult.expenseModel,
            scenarios: pfResult.scenarios,
            valuationOutput: pfResult.valuationOutput,
            // Flattened for easy access by deals API
            t12m: {
              revenue: pfResult.revenueModel.currentRevenue,
              ebitdar: pfResult.scenarios.base.yearlyProjections[0]?.ebitdar || estimatedEbitda,
              expenses: pfResult.expenseModel.totalExpenses,
            },
            valuation: {
              lowValue: pfResult.valuationOutput.negotiationRange?.low || null,
              highValue: pfResult.valuationOutput.negotiationRange?.high || null,
              reconciledValue: pfResult.valuationOutput.reconciledValue,
              method: 'Cap Rate + EBITDA Multiple + DCF',
            },
            proforma: {
              year1: {
                ebitdar: pfResult.scenarios.base.yearlyProjections[1]?.ebitdar || null,
                revenue: pfResult.scenarios.base.yearlyProjections[1]?.revenue || null,
              },
            },
          };

          await db
            .update(dealWorkspaceStages)
            .set({
              stageData: stageData as unknown as Record<string, unknown>,
              status: 'completed',
              completionScore: 100,
              startedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'pro_forma'`
            );
          result.stagesCompleted.push('pro_forma');
        } catch (e) {
          result.errors.push(`pro_forma: ${e instanceof Error ? e.message : 'Unknown error'}`);
          await db
            .update(dealWorkspaceStages)
            .set({
              status: 'completed',
              completionScore: 0,
              startedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'pro_forma'`
            );
        }

        // 5. Run risk score
        try {
          const riskResult = await calculateWorkspaceRisk(deal.id);
          await db
            .update(dealWorkspaceStages)
            .set({
              stageData: riskResult as unknown as Record<string, unknown>,
              status: 'completed',
              completionScore: 100,
              startedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'risk_score'`
            );
          result.stagesCompleted.push('risk_score');

          // Update deal confidence score from risk composite
          if (riskResult.compositeScore) {
            // Confidence is inverse of risk (low risk = high confidence)
            const confidence = Math.max(0, Math.min(100, 100 - riskResult.compositeScore));
            await db
              .update(deals)
              .set({
                confidenceScore: deal.confidenceScore || confidence,
                updatedAt: new Date(),
              })
              .where(eq(deals.id, deal.id));
          }
        } catch (e) {
          result.errors.push(`risk_score: ${e instanceof Error ? e.message : 'Unknown error'}`);
          await db
            .update(dealWorkspaceStages)
            .set({
              status: 'completed',
              completionScore: 0,
              startedAt: new Date(),
              completedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(
              sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'risk_score'`
            );
        }

        // 6. Leave investment_memo as pending (expensive Claude call — run manually)
        await db
          .update(dealWorkspaceStages)
          .set({
            status: 'pending',
            updatedAt: new Date(),
          })
          .where(
            sql`${dealWorkspaceStages.dealId} = ${deal.id} AND ${dealWorkspaceStages.stage} = 'investment_memo'`
          );

        // Update deal workspace stage
        await db
          .update(deals)
          .set({
            workspaceCurrentStage: 'risk_score',
            updatedAt: new Date(),
          })
          .where(eq(deals.id, deal.id));

        // Log CIL activity
        try {
          await db.insert(cilActivityLog).values({
            activityType: 'analysis',
            dealId: deal.id,
            summary: `Batch analysis: ${result.stagesCompleted.length}/4 stages completed for ${deal.name}`,
            metadata: {
              stagesCompleted: result.stagesCompleted,
              errors: result.errors,
            },
          });
        } catch {
          // Activity logging is non-critical
        }

        result.status = result.errors.length > 0 ? 'partial' : 'success';
      } catch (e) {
        result.status = 'failed';
        result.errors.push(`Fatal: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }

      results.push(result);
    }

    const successful = results.filter((r) => r.status === 'success').length;
    const partial = results.filter((r) => r.status === 'partial').length;
    const failed = results.filter((r) => r.status === 'failed').length;

    return NextResponse.json({
      message: `Batch analysis complete: ${successful} success, ${partial} partial, ${failed} failed`,
      processed: results.length,
      summary: { successful, partial, failed },
      results,
    });
  } catch (error) {
    console.error('Batch analyze error:', error);
    return NextResponse.json(
      { error: 'Batch analysis failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
