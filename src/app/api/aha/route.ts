import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { ahaMoments } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    const moments = await db
      .select()
      .from(ahaMoments)
      .orderBy(desc(ahaMoments.createdAt))
      .limit(50);

    return NextResponse.json(moments);
  } catch (error) {
    console.error('[AHA] List error:', error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dealId, dealName, title, insight, newoPosition, devPosition, resolution, category, significance, confidence, tags } = body;

    if (!title || !insight) {
      return NextResponse.json({ error: 'title and insight are required' }, { status: 400 });
    }

    const [row] = await db.insert(ahaMoments).values({
      dealId: dealId || null,
      dealName: dealName || null,
      title,
      insight,
      newoPosition: newoPosition || null,
      devPosition: devPosition || null,
      resolution: resolution || null,
      category: category || 'general',
      significance: significance || 'medium',
      confidence: confidence || null,
      tags: tags || [],
    }).returning();

    return NextResponse.json(row);
  } catch (error) {
    console.error('[AHA] Create error:', error);
    return NextResponse.json({ error: 'Failed to create AHA moment' }, { status: 500 });
  }
}
