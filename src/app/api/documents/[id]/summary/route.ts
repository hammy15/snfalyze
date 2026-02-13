import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { documents } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [doc] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, id))
      .limit(1);

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Prefer first-class columns, fall back to extractedData JSONB
    const aiAnalysis = (doc.extractedData as any)?.aiAnalysis;
    const summary = doc.aiSummary || aiAnalysis?.summary || null;
    const keyFindings = (doc.aiKeyFindings as string[]) || aiAnalysis?.keyFindings || [];
    const confidence = aiAnalysis?.confidence ?? (doc.extractionConfidence ? doc.extractionConfidence / 100 : null);

    return NextResponse.json({
      id: doc.id,
      filename: doc.filename,
      type: doc.type,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      processedAt: doc.processedAt,
      extractionConfidence: doc.extractionConfidence,
      pendingClarifications: doc.pendingClarifications,
      summary,
      keyFindings,
      confidence,
      extractedFields: (doc.extractedData as any)?.fields || null,
    });
  } catch (error: any) {
    console.error('Document summary error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
