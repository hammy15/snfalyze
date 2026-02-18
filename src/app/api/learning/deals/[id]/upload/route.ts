import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { historicalDealFiles, historicalDeals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = join(process.cwd(), 'uploads', 'learning');

/**
 * POST /api/learning/deals/[id]/upload — Upload files with role tag
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify deal exists
    const [deal] = await db
      .select()
      .from(historicalDeals)
      .where(eq(historicalDeals.id, id));

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Historical deal not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const fileRole = formData.get('fileRole') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!fileRole || !['raw_source', 'completed_proforma', 'value_assessment'].includes(fileRole)) {
      return NextResponse.json(
        { success: false, error: 'fileRole must be raw_source, completed_proforma, or value_assessment' },
        { status: 400 }
      );
    }

    // Save file to disk
    const dealDir = join(UPLOAD_DIR, id);
    await mkdir(dealDir, { recursive: true });

    const fileId = randomUUID();
    const ext = file.name.split('.').pop() || 'xlsx';
    const storagePath = join(dealDir, `${fileId}.${ext}`);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(storagePath, buffer);

    // Create database record
    const [fileRecord] = await db
      .insert(historicalDealFiles)
      .values({
        historicalDealId: id,
        filename: file.name,
        fileRole: fileRole as 'raw_source' | 'completed_proforma' | 'value_assessment',
        fileSize: buffer.length,
        mimeType: file.type || 'application/octet-stream',
        storagePath,
        extractionStatus: 'pending',
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: fileRecord,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
