import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documentActivity, documents, deals } from '@/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('dealId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // If the document_activity table doesn't have data yet,
    // synthesize activity from documents table
    let activities: any[] = [];

    try {
      const conditions = dealId ? and(eq(documentActivity.dealId, dealId)) : undefined;
      activities = await db
        .select()
        .from(documentActivity)
        .where(conditions)
        .orderBy(desc(documentActivity.createdAt))
        .limit(limit);
    } catch {
      // Table might not exist yet, fall through to synthetic
    }

    // If no real activities, synthesize from documents
    if (activities.length === 0) {
      const conditions = dealId ? eq(documents.dealId, dealId) : undefined;
      const docs = await db
        .select({
          id: documents.id,
          filename: documents.filename,
          status: documents.status,
          dealId: documents.dealId,
          uploadedAt: documents.uploadedAt,
          processedAt: documents.processedAt,
          type: documents.type,
        })
        .from(documents)
        .where(conditions)
        .orderBy(desc(documents.uploadedAt))
        .limit(limit);

      activities = docs.flatMap(doc => {
        const items: any[] = [];

        // Upload event
        if (doc.uploadedAt) {
          items.push({
            id: `${doc.id}-upload`,
            dealId: doc.dealId,
            documentId: doc.id,
            userName: null,
            action: 'upload',
            description: `Uploaded ${doc.filename}`,
            metadata: { type: doc.type },
            createdAt: doc.uploadedAt,
          });
        }

        // Analysis complete event
        if (doc.status === 'complete' && doc.processedAt) {
          items.push({
            id: `${doc.id}-complete`,
            dealId: doc.dealId,
            documentId: doc.id,
            userName: 'AI',
            action: 'complete',
            description: `AI analysis completed for ${doc.filename}`,
            metadata: { type: doc.type },
            createdAt: doc.processedAt,
          });
        }

        // Error event
        if (doc.status === 'error') {
          items.push({
            id: `${doc.id}-error`,
            dealId: doc.dealId,
            documentId: doc.id,
            userName: 'System',
            action: 'error',
            description: `Analysis failed for ${doc.filename}`,
            metadata: { type: doc.type },
            createdAt: doc.processedAt || doc.uploadedAt,
          });
        }

        return items;
      });

      // Sort by date descending
      activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      activities = activities.slice(0, limit);
    }

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Activity feed error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
