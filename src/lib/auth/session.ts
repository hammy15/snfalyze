import { cookies } from 'next/headers';
import type { UserRole } from './roles';

const SESSION_COOKIE = 'snfalyze_session';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl: string | null;
}

function parseToken(token: string): { name: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length < 2) return null;
    // Name may contain colons, so rejoin everything except last part (timestamp)
    const timestamp = parseInt(parts[parts.length - 1], 10);
    const name = parts.slice(0, -1).join(':');
    if (!name || isNaN(timestamp)) return null;
    return { name, timestamp };
  } catch {
    return null;
  }
}

export async function createSession(name: string): Promise<string> {
  return Buffer.from(`${name}:${Date.now()}`).toString('base64');
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) return null;

  const parsed = parseToken(token);
  if (!parsed) return null;

  // Check token age (7 days max)
  const maxAge = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - parsed.timestamp > maxAge) return null;

  return {
    id: 'user',
    name: parsed.name,
    email: '',
    role: 'admin' as UserRole,
    avatarUrl: null,
  };
}

export { SESSION_COOKIE };
