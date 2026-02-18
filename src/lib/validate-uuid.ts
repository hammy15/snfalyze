import { NextResponse } from 'next/server';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUUID(id: string): boolean {
  return UUID_RE.test(id);
}

export function invalidIdResponse() {
  return NextResponse.json(
    { success: false, error: 'Invalid deal ID' },
    { status: 404 }
  );
}
