import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pageViews } from '@/db/schema';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path, visitorId, sessionId, referrer, duration } = body;

    if (!path || !visitorId || !sessionId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               request.headers.get('x-real-ip') ||
               'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const country = request.headers.get('x-vercel-ip-country') || null;

    await db.insert(pageViews).values({
      path,
      visitorId,
      sessionId,
      userAgent,
      referrer: referrer || null,
      ip,
      country,
      duration: duration || null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Analytics] Track error:', error);
    return NextResponse.json({ ok: true }); // Don't fail the client
  }
}
