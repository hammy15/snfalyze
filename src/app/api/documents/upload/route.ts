import { NextRequest, NextResponse } from 'next/server';
import { db, documents, deals } from '@/db';
import { eq } from 'drizzle-orm';
import { classifyDocument, extractFinancialValues } from '@/lib/documents/processor';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const dealId = formData.get('dealId') as string;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!dealId) {
      return NextResponse.json(
        { success: false, error: 'No deal ID provided' },
        { status: 400 }
      );
    }

    // Verify deal exists
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
    });

    if (!deal) {
      return NextResponse.json(
        { success: false, error: 'Deal not found' },
        { status: 404 }
      );
    }

    // Create document record
    const [document] = await db
      .insert(documents)
      .values({
        dealId,
        filename: file.name,
        status: 'uploaded',
      })
      .returning();

    // Process in background (in production, use a job queue)
    processDocument(document.id, file).catch(console.error);

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error('Error uploading document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload document' },
      { status: 500 }
    );
  }
}

async function processDocument(documentId: string, file: File) {
  try {
    // Update status to parsing
    await db
      .update(documents)
      .set({ status: 'parsing' })
      .where(eq(documents.id, documentId));

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let rawText = '';
    let extractedData: Record<string, any> = {};

    // Process based on file type
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      // For PDF files, in production you would use pdf-parse or similar
      // For now, we'll create a placeholder
      rawText = `[PDF Content from ${file.name}]`;
    } else if (
      fileType.includes('spreadsheet') ||
      fileType.includes('excel') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls') ||
      fileName.endsWith('.csv')
    ) {
      // For Excel/CSV files, in production you would use xlsx
      rawText = `[Spreadsheet Content from ${file.name}]`;
    } else if (fileType.includes('image')) {
      // For images, in production you would use Tesseract.js for OCR
      rawText = `[Image OCR Content from ${file.name}]`;
    } else {
      // Try to read as text
      rawText = buffer.toString('utf-8');
    }

    // Classify document
    const documentType = classifyDocument(rawText, file.name);

    // Update status to normalizing
    await db
      .update(documents)
      .set({ status: 'normalizing', type: documentType as any })
      .where(eq(documents.id, documentId));

    // Extract financial values
    const extractedValues = extractFinancialValues(rawText);
    extractedData = {
      values: extractedValues,
      documentType,
    };

    // Update status to analyzing
    await db
      .update(documents)
      .set({ status: 'analyzing' })
      .where(eq(documents.id, documentId));

    // Simulate analysis delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mark as complete
    await db
      .update(documents)
      .set({
        status: 'complete',
        rawText,
        extractedData,
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentId));
  } catch (error) {
    console.error('Error processing document:', error);

    await db
      .update(documents)
      .set({
        status: 'error',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      })
      .where(eq(documents.id, documentId));
  }
}
