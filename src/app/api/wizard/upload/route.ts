import { NextRequest, NextResponse } from 'next/server';
import { db, documents, wizardSessions } from '@/db';
import { eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const sessionId = formData.get('sessionId') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Get session if provided
    let dealId: string | null = null;
    if (sessionId) {
      const [session] = await db
        .select()
        .from(wizardSessions)
        .where(eq(wizardSessions.id, sessionId))
        .limit(1);

      if (session) {
        dealId = session.dealId;
      }
    }

    // Generate unique filename
    const fileId = randomUUID();
    const ext = file.name.split('.').pop() || 'pdf';
    const filename = `${fileId}.${ext}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'uploads', 'wizard');
    await mkdir(uploadsDir, { recursive: true });

    // Save file
    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = join(uploadsDir, filename);
    await writeFile(filePath, buffer);

    // Determine file type based on extension
    type DocumentType = 'financial_statement' | 'rent_roll' | 'census_report' | 'staffing_report' | 'survey_report' | 'cost_report' | 'om_package' | 'lease_agreement' | 'appraisal' | 'environmental' | 'other';
    let fileType: DocumentType = 'other';
    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('financial') || lowerName.includes('income') || lowerName.includes('p&l') || lowerName.includes('pnl')) {
      fileType = 'financial_statement';
    } else if (lowerName.includes('census') || lowerName.includes('occupancy')) {
      fileType = 'census_report';
    } else if (lowerName.includes('rent') && lowerName.includes('roll')) {
      fileType = 'rent_roll';
    } else if (lowerName.includes('survey') || lowerName.includes('inspection')) {
      fileType = 'survey_report';
    } else if (lowerName.includes('cost') && lowerName.includes('report')) {
      fileType = 'cost_report';
    } else if (lowerName.includes('lease')) {
      fileType = 'lease_agreement';
    } else if (lowerName.includes('om') || lowerName.includes('offering')) {
      fileType = 'om_package';
    }

    // Create document record
    const [doc] = await db
      .insert(documents)
      .values({
        id: fileId,
        dealId,
        filename: file.name,
        type: fileType,
        status: 'uploaded',
        uploadedAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        filename: file.name,
        type: fileType,
        size: file.size,
      },
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
