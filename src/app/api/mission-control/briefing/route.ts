import { NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, facilities } from '@/db/schema';
import { desc, eq, sql, count } from 'drizzle-orm';

export async function GET() {
  try {
    // Get all deals with basic info
    const allDeals = await db.select().from(deals).orderBy(desc(deals.updatedAt));

    // Get facility count
    const facilityCount = await db.select({ count: count() }).from(facilities);

    // Compute attention items
    const attentionItems: Array<{ type: string; title: string; detail: string; severity: 'high' | 'medium' | 'low'; dealId?: string }> = [];

    for (const deal of allDeals) {
      // Check for stale deals (not updated in 3+ days)
      const daysSinceUpdate = deal.updatedAt ? Math.floor((Date.now() - new Date(deal.updatedAt).getTime()) / (1000 * 60 * 60 * 24)) : 0;
      if (daysSinceUpdate >= 3 && deal.status !== 'closed' && deal.status !== 'passed') {
        attentionItems.push({
          type: 'stale',
          title: `"${deal.name}" needs attention`,
          detail: `No updates in ${daysSinceUpdate} days`,
          severity: daysSinceUpdate >= 7 ? 'high' : 'medium',
          dealId: deal.id,
        });
      }

      // Check for deals without valuation
      if (deal.status === 'due_diligence' && !deal.askingPrice) {
        attentionItems.push({
          type: 'missing_data',
          title: `"${deal.name}" missing valuation data`,
          detail: 'In due diligence but no asking price set',
          severity: 'high',
          dealId: deal.id,
        });
      }
    }

    // Sort by severity
    const severityOrder = { high: 0, medium: 1, low: 2 };
    attentionItems.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Get most recently updated active deal
    const activeDeal = allDeals.find(d => d.status !== 'closed' && d.status !== 'passed') ?? allDeals[0] ?? null;

    // Pipeline stages
    const stageMap: Record<string, { label: string; count: number; value: number; color: string }> = {
      new: { label: 'New', count: 0, value: 0, color: '#14b8a6' },
      analyzing: { label: 'Analyzing', count: 0, value: 0, color: '#f97316' },
      reviewed: { label: 'Reviewed', count: 0, value: 0, color: '#0ea5e9' },
      under_loi: { label: 'LOI', count: 0, value: 0, color: '#8b5cf6' },
      due_diligence: { label: 'DD', count: 0, value: 0, color: '#f59e0b' },
      closed: { label: 'Closed', count: 0, value: 0, color: '#10b981' },
    };

    let totalPipelineValue = 0;
    for (const deal of allDeals) {
      const stage = deal.status || 'new';
      if (stageMap[stage]) {
        stageMap[stage].count++;
        stageMap[stage].value += Number(deal.askingPrice || 0);
      }
      if (stage !== 'closed' && stage !== 'passed') {
        totalPipelineValue += Number(deal.askingPrice || 0);
      }
    }

    // Suggested actions
    const suggestions: Array<{ title: string; detail: string; action: string; href: string; icon: string }> = [];

    const newDeals = allDeals.filter(d => d.status === 'new');
    if (newDeals.length > 0) {
      suggestions.push({
        title: `Start analysis on "${newDeals[0].name}"`,
        detail: 'New deal awaiting review',
        action: 'Begin Analysis',
        href: `/app/deals/${newDeals[0].id}`,
        icon: 'sparkles',
      });
    }

    if (allDeals.length > 1) {
      suggestions.push({
        title: 'Run portfolio comparison',
        detail: `Compare ${allDeals.length} active deals side-by-side`,
        action: 'Compare Deals',
        href: '/app/tools/deal-comparison',
        icon: 'bar-chart',
      });
    }

    suggestions.push({
      title: 'Upload new broker package',
      detail: 'AI will extract facilities and financials',
      action: 'Upload Files',
      href: '/app/deals/new',
      icon: 'upload',
    });

    // Greeting based on time
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17) greeting = 'Good evening';

    return NextResponse.json({
      success: true,
      data: {
        greeting,
        attentionItems: attentionItems.slice(0, 3),
        activeDeal: activeDeal ? {
          id: activeDeal.id,
          name: activeDeal.name,
          status: activeDeal.status || 'new',
          stage: 'document_understanding',
          askingPrice: Number(activeDeal.askingPrice || 0),
          totalBeds: activeDeal.beds || 0,
          assetType: activeDeal.assetType || 'SNF',
          updatedAt: activeDeal.updatedAt?.toISOString() || new Date().toISOString(),
        } : null,
        pipeline: Object.entries(stageMap).map(([key, val]) => ({
          stage: key,
          ...val,
        })),
        totalDeals: allDeals.length,
        totalPipelineValue,
        totalFacilities: facilityCount[0]?.count || 0,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Mission Control briefing error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load briefing' }, { status: 500 });
  }
}
