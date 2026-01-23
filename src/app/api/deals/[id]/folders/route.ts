import { NextRequest, NextResponse } from 'next/server';
import { db, documentFolders, documents, deals } from '@/db';
import { eq, asc } from 'drizzle-orm';

// GET - Get all document folders for a deal
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Get folders
    const folders = await db
      .select()
      .from(documentFolders)
      .where(eq(documentFolders.dealId, dealId))
      .orderBy(asc(documentFolders.displayOrder));

    // Get documents and group by folder
    const allDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.dealId, dealId));

    // Build folder tree with document counts
    const foldersWithDocuments = folders.map(folder => {
      const folderDocs = allDocuments.filter(doc => doc.folderId === folder.id);
      return {
        ...folder,
        documentCount: folderDocs.length,
        documents: folderDocs,
      };
    });

    // Get unorganized documents (no folder)
    const unorganizedDocs = allDocuments.filter(doc => !doc.folderId);

    return NextResponse.json({
      success: true,
      data: {
        folders: foldersWithDocuments,
        unorganizedDocuments: unorganizedDocs,
        totalDocuments: allDocuments.length,
        organizedDocuments: allDocuments.length - unorganizedDocs.length,
      },
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

// POST - Create a new folder
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const body = await request.json();
    const { name, folderType, displayOrder } = body;

    // Verify deal exists
    const dealRecords = await db.select().from(deals).where(eq(deals.id, dealId));
    if (dealRecords.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    if (!name || !folderType) {
      return NextResponse.json(
        { success: false, error: 'Name and folder type are required' },
        { status: 400 }
      );
    }

    // Get max display order if not provided
    let order = displayOrder;
    if (order === undefined) {
      const existingFolders = await db
        .select()
        .from(documentFolders)
        .where(eq(documentFolders.dealId, dealId));
      order = existingFolders.length + 1;
    }

    const [newFolder] = await db
      .insert(documentFolders)
      .values({
        dealId,
        name,
        folderType,
        displayOrder: order,
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: newFolder,
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
