/**
 * Deal Activities & Comments API
 *
 * GET: Fetch activity feed + comments for a deal
 * POST: Add a comment or activity entry
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, dealActivities, dealComments } from '@/db';
import { eq, desc, and } from 'drizzle-orm';
import type { WorkspaceStageType } from '@/types/workspace';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'activities' | 'comments' | null (both)
    const stage = searchParams.get('stage') as WorkspaceStageType | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    const result: { activities?: unknown[]; comments?: unknown[] } = {};

    if (!type || type === 'activities') {
      const activities = await db
        .select()
        .from(dealActivities)
        .where(eq(dealActivities.dealId, dealId))
        .orderBy(desc(dealActivities.createdAt))
        .limit(limit);

      result.activities = activities;
    }

    if (!type || type === 'comments') {
      const whereConditions = [eq(dealComments.dealId, dealId)];
      if (stage) {
        whereConditions.push(eq(dealComments.stage, stage));
      }

      const comments = await db
        .select()
        .from(dealComments)
        .where(and(...whereConditions))
        .orderBy(desc(dealComments.createdAt))
        .limit(limit);

      result.comments = comments;
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activities' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const body = await request.json();
    const { action } = body; // 'comment' | 'activity'

    if (action === 'comment') {
      const { content, stage, userName, parentId } = body;
      if (!content?.trim()) {
        return NextResponse.json({ error: 'Content is required' }, { status: 400 });
      }

      const [comment] = await db
        .insert(dealComments)
        .values({
          dealId,
          content: content.trim(),
          stage: stage || null,
          userName: userName || 'Analyst',
          parentId: parentId || null,
        })
        .returning();

      // Also log as activity
      await db.insert(dealActivities).values({
        dealId,
        type: 'comment',
        title: `${userName || 'Analyst'} commented${stage ? ` on ${stage.replace('_', ' ')}` : ''}`,
        description: content.trim().substring(0, 200),
        metadata: { commentId: comment.id, stage },
        userName: userName || 'Analyst',
      });

      return NextResponse.json({ success: true, data: comment });
    }

    if (action === 'resolve') {
      const { commentId } = body;
      if (!commentId) {
        return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
      }

      const [updated] = await db
        .update(dealComments)
        .set({ isResolved: true, updatedAt: new Date() })
        .where(eq(dealComments.id, commentId))
        .returning();

      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error creating activity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create activity' },
      { status: 500 }
    );
  }
}
