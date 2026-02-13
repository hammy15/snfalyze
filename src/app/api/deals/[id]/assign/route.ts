import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { dealAssignments, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assignments = await db
      .select({
        id: dealAssignments.id,
        userId: dealAssignments.userId,
        role: dealAssignments.role,
        assignedAt: dealAssignments.assignedAt,
        userName: users.name,
        userEmail: users.email,
        userRole: users.role,
        userAvatar: users.avatarUrl,
      })
      .from(dealAssignments)
      .leftJoin(users, eq(dealAssignments.userId, users.id))
      .where(eq(dealAssignments.dealId, params.id));

    return NextResponse.json({ assignments });
  } catch (error: any) {
    console.error('Get assignments error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId, role, assignedBy } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Check if already assigned
    const existing = await db
      .select({ id: dealAssignments.id })
      .from(dealAssignments)
      .where(
        and(
          eq(dealAssignments.dealId, params.id),
          eq(dealAssignments.userId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already assigned to this deal' }, { status: 409 });
    }

    const [assignment] = await db
      .insert(dealAssignments)
      .values({
        dealId: params.id,
        userId,
        role: role || 'analyst',
        assignedBy: assignedBy || null,
      })
      .returning();

    return NextResponse.json({ assignment });
  } catch (error: any) {
    console.error('Assign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    await db
      .delete(dealAssignments)
      .where(
        and(
          eq(dealAssignments.dealId, params.id),
          eq(dealAssignments.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Unassign error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
