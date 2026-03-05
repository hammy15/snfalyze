import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { loginLogs } from '@/db/schema';
import { SESSION_COOKIE } from '@/lib/auth/session';

// Server-side only password
const SITE_PASSWORD = (process.env.APP_PASSWORD || process.env.NEXT_PUBLIC_APP_PASSWORD || '').trim();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name || '').trim();
    const password = (body.password || '').trim();

    // Get client info for logging
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const userAgent = request.headers.get('user-agent') || '';
    const country = request.headers.get('x-vercel-ip-country') || null;

    if (!name) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }

    // Verify password
    if (!SITE_PASSWORD || password !== SITE_PASSWORD) {
      // Log failed attempt
      await db.insert(loginLogs).values({
        name,
        ip,
        userAgent,
        country,
        success: false,
      }).catch(() => {});

      return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    }

    // Log successful login
    await db.insert(loginLogs).values({
      name,
      ip,
      userAgent,
      country,
      success: true,
    }).catch(() => {});

    // Create session token: base64(name:timestamp)
    const token = Buffer.from(`${name}:${Date.now()}`).toString('base64');

    const response = NextResponse.json({
      success: true,
      user: {
        id: 'user',
        name,
        email: '',
        role: 'analyst',
        avatarUrl: null,
      },
    });

    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error: unknown) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
