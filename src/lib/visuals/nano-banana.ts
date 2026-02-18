/**
 * Nano Banana Pro Visual Generator
 *
 * Uses Google Gemini 3 Pro (Nano Banana) API to generate polished
 * infographic-style visuals for deal analysis.
 */

import type { VisualRequest, GeneratedVisual, VisualType } from '../learning/types';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

// ============================================================================
// Prompt Templates
// ============================================================================

const PROMPT_TEMPLATES: Record<VisualType, (data: Record<string, unknown>) => string> = {
  deal_summary: (data) => `Create a professional healthcare real estate deal summary infographic with a clean, modern design on a white background.

Title: "${data.dealName || 'Deal Summary'}"
Layout: Single page poster format

Key Metrics (display as large styled cards):
- Facilities: ${data.facilityCount || 'N/A'}
- Total Beds: ${data.totalBeds || 'N/A'}
- Portfolio Revenue: $${formatNumber(data.totalRevenue as number)}
- EBITDAR: $${formatNumber(data.ebitdar as number)}
- Portfolio Value: $${formatNumber(data.portfolioValue as number)}
- Value Per Bed: $${formatNumber(data.valuePerBed as number)}
- Blended Cap Rate: ${data.capRate || 'N/A'}%

Property Mix (show as donut chart):
${data.propertyMix ? JSON.stringify(data.propertyMix) : 'SNF, ALF, Leased mix'}

Style: Professional, clean, healthcare blue/teal color scheme, sans-serif fonts. Make it look like a Morgan Stanley or JLL investment summary page.`,

  valuation_breakdown: (data) => `Create a professional valuation breakdown infographic showing a stacked waterfall chart.

Title: "Portfolio Valuation Breakdown"

Categories (each as a colored bar segment):
${(data.categories as Array<{ name: string; value: number; color: string }>)?.map((c) =>
  `- ${c.name}: $${formatNumber(c.value)} (${c.color})`
).join('\n') || 'SNF-Owned, Leased, ALF/SNC-Owned categories'}

Total: $${formatNumber(data.totalValue as number)}

Include: per-category bed count, cap rate/multiplier used, and value per bed.
Style: Horizontal stacked bar or waterfall chart, healthcare blue/green palette, clean typography.`,

  portfolio_map: (data) => `Create a geographic portfolio map infographic.

Title: "Portfolio Geographic Distribution"

Facilities:
${(data.facilities as Array<{ name: string; state: string; value: number }>)?.map((f) =>
  `- ${f.name} (${f.state}): $${formatNumber(f.value)}`
).join('\n') || 'Various facilities across OR and WA'}

Show facilities on a stylized US map (focus on relevant states) with bubble sizes proportional to value.
Include a legend showing property types by color.
Style: Clean cartographic style, muted map colors, bright facility markers.`,

  proforma_chart: (data) => `Create a 5-year proforma projection chart infographic.

Title: "5-Year Financial Projection"

Data:
${(data.years as Array<{ year: number; revenue: number; expenses: number; noi: number }>)?.map((y) =>
  `Year ${y.year}: Revenue $${formatNumber(y.revenue)}, Expenses $${formatNumber(y.expenses)}, NOI $${formatNumber(y.noi)}`
).join('\n') || 'Year 1-5 projections'}

Revenue CAGR: ${data.revenueCagr || '2.5'}%
Expense CAGR: ${data.expenseCagr || '3.0'}%

Show as area/line chart with revenue in green, expenses in red, NOI as a highlighted line.
Include growth rate annotations and year-over-year changes.
Style: Financial chart style, gridlines, clean axes, professional.`,

  comparison_diff: (data) => `Create a deal comparison infographic showing raw data vs proforma adjustments.

Title: "Raw Data → Proforma Normalization"

Metrics:
- Revenue: $${formatNumber(data.rawRevenue as number)} → $${formatNumber(data.proformaRevenue as number)} (${data.revenueDelta || '0'}%)
- Expenses: $${formatNumber(data.rawExpenses as number)} → $${formatNumber(data.proformaExpenses as number)} (${data.expenseDelta || '0'}%)
- EBITDAR: $${formatNumber(data.rawEbitdar as number)} → $${formatNumber(data.proformaEbitdar as number)}
- Cap Rate: ${data.rawCapRate || 'N/A'}% → ${data.appliedCapRate || 'N/A'}%
- Valuation: $${formatNumber(data.rawValuation as number)} → $${formatNumber(data.finalValuation as number)}

Key Adjustments:
${(data.adjustments as string[])?.join('\n') || '- Management fee normalized to 5%\n- Agency reduced to 3%'}

Show as a flow diagram with arrows indicating adjustments. Green for favorable, red for unfavorable.
Style: Process flow infographic, arrows connecting raw → adjusted values.`,

  learned_preferences: (data) => `Create a learned preferences dashboard infographic.

Title: "Cascadia Deal Preferences — Learned from ${data.dealCount || 0} Historical Deals"

Preferences:
- Cap Rate (SNF): ${data.snfCapRate || '12.5'}% avg (Cascadia baseline: 12.5%)
- Cap Rate (ALF): ${data.alfCapRate || '7.0'}% avg (Industry: varies by state)
- Mgmt Fee: ${data.mgmtFee || '5.0'}% avg
- Agency Target: ${data.agencyPct || '3.0'}% avg
- Revenue Growth: ${data.revenueGrowth || '2.5'}%/yr avg
- Expense Growth: ${data.expenseGrowth || '3.0'}%/yr avg
- Occupancy Target: ${data.occupancyTarget || '85'}% avg

Show as a dashboard with gauges/meters for each preference.
Include confidence indicators (sample size) next to each metric.
Style: Dashboard layout, clean metrics, color-coded confidence bars.`,
};

// ============================================================================
// API Client
// ============================================================================

/**
 * Generate a visual using Nano Banana Pro (Gemini API)
 */
export async function generateVisual(request: VisualRequest): Promise<GeneratedVisual> {
  const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY or GEMINI_API_KEY environment variable is required');
  }

  const promptTemplate = PROMPT_TEMPLATES[request.type];
  if (!promptTemplate) {
    throw new Error(`Unknown visual type: ${request.type}`);
  }

  const prompt = promptTemplate(request.data);
  const styleNote = request.style === 'executive'
    ? 'Make it executive presentation quality, suitable for a board meeting.'
    : request.style === 'detailed'
      ? 'Include detailed data labels and annotations.'
      : 'Clean, professional style.';

  const fullPrompt = `${prompt}\n\n${styleNote}\n\nGenerate this as a single high-resolution infographic image.`;

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: fullPrompt }],
      }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const result = await response.json();

  // Extract image from response
  const parts = result.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData?.mimeType?.startsWith('image/'));

  if (!imagePart?.inlineData) {
    // Return text response as fallback
    const textPart = parts.find((p: { text?: string }) => p.text);
    return {
      imageUrl: '',
      prompt: fullPrompt,
      type: request.type,
      generatedAt: new Date().toISOString(),
    };
  }

  // Convert base64 to data URL
  const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;

  return {
    imageUrl,
    prompt: fullPrompt,
    type: request.type,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate multiple visuals for a deal
 */
export async function generateDealVisuals(
  dealData: Record<string, unknown>,
  types: VisualType[] = ['deal_summary', 'valuation_breakdown']
): Promise<GeneratedVisual[]> {
  const results: GeneratedVisual[] = [];

  for (const type of types) {
    try {
      const visual = await generateVisual({ type, data: dealData, style: 'professional' });
      results.push(visual);
    } catch (error) {
      console.error(`Failed to generate ${type} visual:`, error);
    }
  }

  return results;
}

// ============================================================================
// Helpers
// ============================================================================

function formatNumber(n: number | undefined | null): string {
  if (n === null || n === undefined || isNaN(n)) return 'N/A';
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
}
