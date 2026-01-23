import { NextRequest, NextResponse } from 'next/server';
import { db, documents, deals, extractionClarifications } from '@/db';
import { eq } from 'drizzle-orm';
import { classifyDocument, extractFinancialValues } from '@/lib/documents/processor';
import { analyzeDocument, type DocumentAnalysisResult } from '@/lib/documents/ai-analyzer';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

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
      // Extract text from PDF using pdf-parse
      try {
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text;
        extractedData.pageCount = pdfData.numpages;
        extractedData.pdfInfo = pdfData.info;
        console.log(`Extracted ${rawText.length} characters from PDF (${pdfData.numpages} pages)`);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        rawText = `[Error extracting PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}]`;
      }
    } else if (
      fileType.includes('spreadsheet') ||
      fileType.includes('excel') ||
      fileName.endsWith('.xlsx') ||
      fileName.endsWith('.xls')
    ) {
      // Parse Excel files using xlsx
      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheets: Record<string, any[][]> = {};
        const textParts: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          sheets[sheetName] = data;

          // Convert sheet to text for analysis
          textParts.push(`=== Sheet: ${sheetName} ===`);
          for (const row of data) {
            if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
              textParts.push(row.map(cell => cell ?? '').join('\t'));
            }
          }
        }

        rawText = textParts.join('\n');
        extractedData.sheets = sheets;
        extractedData.sheetNames = workbook.SheetNames;
        console.log(`Extracted ${workbook.SheetNames.length} sheets from Excel`);
      } catch (xlsxError) {
        console.error('Excel parsing error:', xlsxError);
        rawText = `[Error extracting Excel: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown error'}]`;
      }
    } else if (fileName.endsWith('.csv')) {
      // Parse CSV files using papaparse
      try {
        const csvText = buffer.toString('utf-8');
        const parseResult = Papa.parse(csvText, {
          header: false,
          skipEmptyLines: true,
        });

        const textParts: string[] = [];
        for (const row of parseResult.data as string[][]) {
          textParts.push(row.join('\t'));
        }

        rawText = textParts.join('\n');
        extractedData.csvData = parseResult.data;
        extractedData.rowCount = parseResult.data.length;
        console.log(`Extracted ${parseResult.data.length} rows from CSV`);
      } catch (csvError) {
        console.error('CSV parsing error:', csvError);
        rawText = `[Error extracting CSV: ${csvError instanceof Error ? csvError.message : 'Unknown error'}]`;
      }
    } else if (fileType.includes('image')) {
      // For images, we'll skip OCR for now and note it needs manual review
      rawText = `[Image file: ${file.name} - OCR processing available but requires additional setup]`;
      extractedData.requiresOcr = true;
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

    // Extract financial values using regex patterns
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

    // Run AI analysis if we have actual text content
    let aiAnalysis: DocumentAnalysisResult | null = null;
    if (rawText.length > 100 && !rawText.startsWith('[Error') && !rawText.startsWith('[Image')) {
      try {
        console.log(`Starting AI analysis for document ${documentId}...`);
        aiAnalysis = await analyzeDocument({
          documentId,
          filename: file.name,
          documentType,
          rawText,
          spreadsheetData: extractedData.sheets,
        });
        console.log(`AI analysis complete for ${documentId}. Confidence: ${aiAnalysis.confidence}`);

        // Merge AI extracted fields into extractedData
        extractedData = {
          ...extractedData,
          aiAnalysis: {
            summary: aiAnalysis.summary,
            keyFindings: aiAnalysis.keyFindings,
            confidence: aiAnalysis.confidence,
            documentType: aiAnalysis.documentType,
          },
          fields: aiAnalysis.extractedFields,
        };

        // Create clarifications in database if needed
        if (aiAnalysis.clarificationsNeeded.length > 0) {
          const priorityMap: Record<string, number> = { high: 9, medium: 5, low: 2 };
          for (const clarification of aiAnalysis.clarificationsNeeded) {
            await db.insert(extractionClarifications).values({
              documentId,
              fieldName: clarification.field,
              extractedValue: clarification.extractedValue != null ? String(clarification.extractedValue) : null,
              suggestedValues: clarification.possibleValues || [],
              clarificationType: 'low_confidence',
              priority: priorityMap[clarification.priority] || 5,
              reason: clarification.reason,
              status: 'pending',
            });
          }
          console.log(`Created ${aiAnalysis.clarificationsNeeded.length} clarifications for document ${documentId}`);
        }
      } catch (aiError) {
        console.error('AI analysis failed (continuing with basic extraction):', aiError);
        // Continue without AI analysis - basic extraction is still available
      }
    }

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
