import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { loginLogs } from '@/db/schema';
import { desc, sql, eq } from 'drizzle-orm';

const ADMIN_PASSWORD = (process.env.APP_PASSWORD || process.env.ADMIN_PASSWORD || '').trim();

function validateAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('x-admin-password');
  return authHeader === ADMIN_PASSWORD && ADMIN_PASSWORD !== '';
}

export async function GET(request: NextRequest) {
  if (!validateAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get recent login logs
    const logs = await db
      .select()
      .from(loginLogs)
      .orderBy(desc(loginLogs.createdAt))
      .limit(100);

    // Get stats
    const stats = await db
      .select({
        totalLogins: sql<number>`count(*) filter (where ${loginLogs.success} = true)`,
        failedAttempts: sql<number>`count(*) filter (where ${loginLogs.success} = false)`,
        uniqueUsers: sql<number>`count(distinct ${loginLogs.name}) filter (where ${loginLogs.success} = true)`,
        todayLogins: sql<number>`count(*) filter (where ${loginLogs.success} = true and ${loginLogs.createdAt} > now() - interval '24 hours')`,
      })
      .from(loginLogs);

    // Get unique users with their last login
    const activeUsers = await db
      .select({
        name: loginLogs.name,
        lastLogin: sql<string>`max(${loginLogs.createdAt})`,
        loginCount: sql<number>`count(*)`,
        lastIp: sql<string>`(array_agg(${loginLogs.ip} order by ${loginLogs.createdAt} desc))[1]`,
      })
      .from(loginLogs)
      .where(eq(loginLogs.success, true))
      .groupBy(loginLogs.name)
      .orderBy(sql`max(${loginLogs.createdAt}) desc`);

    return NextResponse.json({
      success: true,
      logs,
      stats: stats[0] || { totalLogins: 0, failedAttempts: 0, uniqueUsers: 0, todayLogins: 0 },
      activeUsers,
    });
  } catch (error: unknown) {
    console.error('Login logs error:', error);
    return NextResponse.json({ error: 'Failed to fetch login logs' }, { status: 500 });
  }
}
