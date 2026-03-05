import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { pageViews } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { notifyNewVisitor } from '@/lib/notifications/telegram';

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

    // Check if this is a first-time visitor
    const existing = await db.select({ count: count() }).from(pageViews).where(eq(pageViews.visitorId, visitorId));
    const isNewVisitor = (existing[0]?.count ?? 0) === 0;

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

    // Notify on first-time visitors only
    if (isNewVisitor) {
      notifyNewVisitor(ip, country, path).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Analytics] Track error:', error);
    return NextResponse.json({ ok: true }); // Don't fail the client
  }
}
