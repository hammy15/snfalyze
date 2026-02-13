import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createSession, SESSION_COOKIE } from '@/lib/auth/session';

// Simple hash comparison — uses the shared password as fallback for migration
const SHARED_PASSWORD = (process.env.NEXT_PUBLIC_APP_PASSWORD || '').trim();

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    // Try database user lookup first
    if (email) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (user && user.isActive) {
        // Compare password hash (simple comparison for now)
        if (user.passwordHash === password) {
          const token = await createSession(user.id);

          const response = NextResponse.json({
            success: true,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              avatarUrl: user.avatarUrl,
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
        }
      }
    }

    // Fallback: shared password mode (backward compatible)
    if (password === SHARED_PASSWORD && SHARED_PASSWORD) {
      const displayName = name || email?.split('@')[0] || 'User';

      const response = NextResponse.json({
        success: true,
        user: {
          id: 'shared',
          name: displayName,
          email: email || '',
          role: 'analyst',
          avatarUrl: null,
        },
        legacy: true,
      });

      // Set a legacy session cookie
      const legacyToken = Buffer.from(`shared:${Date.now()}`).toString('base64');
      response.cookies.set(SESSION_COOKIE, legacyToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      return response;
    }

    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}
