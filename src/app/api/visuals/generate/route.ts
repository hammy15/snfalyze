import { NextRequest, NextResponse } from 'next/server';
import { generateVisual } from '@/lib/visuals/nano-banana';
import type { VisualType } from '@/lib/learning/types';

/**
 * POST /api/visuals/generate — Generate a Nano Banana Pro infographic
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, style } = body;

    if (!type || !data) {
      return NextResponse.json(
        { success: false, error: 'type and data are required' },
        { status: 400 }
      );
    }

    const validTypes: VisualType[] = [
      'deal_summary', 'valuation_breakdown', 'portfolio_map',
      'proforma_chart', 'comparison_diff', 'learned_preferences',
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const visual = await generateVisual({ type, data, style: style || 'professional' });

    return NextResponse.json({ success: true, data: visual });
  } catch (error) {
    console.error('Error generating visual:', error);
    return NextResponse.json(
      { success: false, error: `Failed to generate visual: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
