import { NextRequest, NextResponse } from 'next/server';
import { db, documents, documentFolders, deals } from '@/db';
import { eq, and } from 'drizzle-orm';

// POST - Move a document to a folder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { id: dealId, docId } = await params;
    const body = await request.json();
    const { folderId, facilityId, confirmType } = body;

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Verify document exists and belongs to deal
    const docRecords = await db
      .select()
      .from(documents)
      .where(and(eq(documents.id, docId), eq(documents.dealId, dealId)));

    if (docRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    // If folderId is provided, verify it exists
    if (folderId) {
      const folderRecords = await db
        .select()
        .from(documentFolders)
        .where(and(eq(documentFolders.id, folderId), eq(documentFolders.dealId, dealId)));

      if (folderRecords.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Folder not found' },
          { status: 404 }
        );
      }
    }

    // Build update object
    const updateData: {
      folderId?: string | null;
      facilityId?: string | null;
      userConfirmedType?: boolean;
    } = {};

    if (folderId !== undefined) {
      updateData.folderId = folderId || null;
    }

    if (facilityId !== undefined) {
      updateData.facilityId = facilityId || null;
    }

    if (confirmType === true) {
      updateData.userConfirmedType = true;
    }

    const [updated] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, docId))
      .returning();

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error('Error moving document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to move document' },
      { status: 500 }
    );
  }
}
