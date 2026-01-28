import { NextRequest, NextResponse } from 'next/server';
import { db, documents, deals, extractionClarifications, facilities, financialPeriods, facilityCensusPeriods, facilityPayerRates } from '@/db';
import { eq } from 'drizzle-orm';
import { classifyDocument, extractFinancialValues } from '@/lib/documents/processor';
import { analyzeDocument, type DocumentAnalysisResult } from '@/lib/documents/ai-analyzer';
import { extractPLData } from '@/lib/extraction/pl-extractor';
import { extractCensusData } from '@/lib/extraction/census-extractor';
import { extractRatesFromText, extractRatesFromTable } from '@/lib/extraction/rate-extractor';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Detect if an Excel file is encrypted with Microsoft RMS (MSMAMARPCRYPT)
 */
function isEncryptedExcel(buffer: Buffer): boolean {
  const header = buffer.slice(0, 20).toString('utf8');
  if (header.includes('MSMAMARPCRYPT')) {
    return true;
  }
  // OLE-based encryption check
  if (buffer[0] === 0xD0 && buffer[1] === 0xCF && buffer[2] === 0x11 && buffer[3] === 0xE0) {
    const headerStr = buffer.slice(0, 2000).toString('binary');
    if (headerStr.includes('EncryptedPackage') || headerStr.includes('StrongEncryption')) {
      return true;
    }
  }
  return false;
}

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
      fileName.endsWith('.xls') ||
      fileName.endsWith('.numbers')
    ) {
      // Check for encrypted files first (only for Excel formats, not Numbers)
      if (!fileName.endsWith('.numbers') && isEncryptedExcel(buffer)) {
        return NextResponse.json(
          {
            success: false,
            error: `The file "${file.name}" is encrypted with Microsoft's Rights Management Service (RMS). Please open the file in Microsoft Excel and save a copy without encryption/protection, then try uploading again.`,
          },
          { status: 400 }
        );
      }

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

        const csvData = parseResult.data as (string | number | null)[][];

        const textParts: string[] = [];
        for (const row of csvData) {
          textParts.push(row.map(c => c ?? '').join('\t'));
        }

        rawText = textParts.join('\n');

        // Convert CSV data to sheets format for deep extraction
        const sheetName = file.name.replace(/\.csv$/i, '');
        extractedData.sheets = { [sheetName]: csvData };
        extractedData.sheetNames = [sheetName];
        extractedData.csvData = csvData;
        extractedData.rowCount = csvData.length;
        console.log(`Extracted ${csvData.length} rows from CSV, converted to sheet: ${sheetName}`);
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
      ...extractedData,  // Preserve sheets data from Excel parsing
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

    // Mark as complete (basic processing done)
    await db
      .update(documents)
      .set({
        status: 'extracting',
        rawText,
        extractedData,
        processedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    // Run deep extraction to populate financial_periods, census, and rates tables
    const deepExtractionResult = await runDeepExtraction(
      documentId,
      extractedData.sheets,
      rawText
    );

    // Update with deep extraction results
    await db
      .update(documents)
      .set({
        status: 'complete',
        extractedData: {
          ...extractedData,
          deepExtraction: deepExtractionResult,
        },
      })
      .where(eq(documents.id, documentId));

    console.log(`Deep extraction complete for ${documentId}:`, deepExtractionResult);
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

/**
 * Classify sheet type based on content
 */
function classifySheetType(data: any[][]): 'pl' | 'census' | 'rates' | 'unknown' {
  if (!data || data.length < 2) return 'unknown';

  const sampleText = data
    .slice(0, 30)
    .flat()
    .filter(c => c != null)
    .map(c => String(c).toLowerCase())
    .join(' ');

  // P&L indicators
  if (
    (sampleText.includes('revenue') && sampleText.includes('expense')) ||
    sampleText.includes('ebitda') ||
    sampleText.includes('income statement') ||
    sampleText.includes('p&l')
  ) {
    return 'pl';
  }

  // Census indicators
  if (
    sampleText.includes('patient days') ||
    sampleText.includes('census') ||
    (sampleText.includes('medicare') && sampleText.includes('days'))
  ) {
    return 'census';
  }

  // Rate indicators
  if (
    sampleText.includes('ppd') ||
    sampleText.includes('per diem') ||
    (sampleText.includes('rate') && sampleText.includes('payer'))
  ) {
    return 'rates';
  }

  return 'unknown';
}

/**
 * Run deep extraction on document sheets to populate database tables
 */
async function runDeepExtraction(
  documentId: string,
  sheets: Record<string, any[][]> | undefined,
  rawText: string
): Promise<{
  financialPeriodsCreated: number;
  censusPeriodsCreated: number;
  payerRatesCreated: number;
  sheetsProcessed: number;
  warnings: string[];
}> {
  const result = {
    financialPeriodsCreated: 0,
    censusPeriodsCreated: 0,
    payerRatesCreated: 0,
    sheetsProcessed: 0,
    warnings: [] as string[],
  };

  // Get document to find dealId
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, documentId))
    .limit(1);

  if (!document?.dealId) {
    result.warnings.push('No deal associated with document');
    return result;
  }

  // Get facility for this deal (use first facility if multiple)
  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, document.dealId))
    .limit(1);

  if (!facility) {
    result.warnings.push('No facility found for deal');
    return result;
  }

  // Process Excel sheets
  if (sheets && Object.keys(sheets).length > 0) {
    for (const [sheetName, sheetData] of Object.entries(sheets)) {
      if (!Array.isArray(sheetData) || sheetData.length < 2) continue;

      const sheetType = classifySheetType(sheetData);
      result.sheetsProcessed++;

      try {
        switch (sheetType) {
          case 'pl': {
            const plData = extractPLData(sheetData, sheetName, []);
            for (const period of plData) {
              try {
                await db.insert(financialPeriods).values({
                  dealId: document.dealId,
                  facilityId: facility.id,
                  periodStart: period.periodStart.toISOString().split('T')[0],
                  periodEnd: period.periodEnd.toISOString().split('T')[0],
                  isAnnualized: period.isAnnualized,
                  totalRevenue: period.totalRevenue.toFixed(2),
                  medicareRevenue: period.medicareRevenue?.toFixed(2),
                  medicaidRevenue: period.medicaidRevenue?.toFixed(2),
                  managedCareRevenue: period.managedCareRevenue?.toFixed(2),
                  privatePayRevenue: period.privatePayRevenue?.toFixed(2),
                  otherRevenue: period.otherRevenue?.toFixed(2),
                  totalExpenses: period.totalExpenses.toFixed(2),
                  laborCost: period.totalLaborCost?.toFixed(2),
                  agencyLabor: period.agencyLabor?.toFixed(2),
                  foodCost: period.foodCost?.toFixed(2),
                  suppliesCost: period.suppliesCost?.toFixed(2),
                  utilitiesCost: period.utilitiesCost?.toFixed(2),
                  insuranceCost: period.insuranceCost?.toFixed(2),
                  managementFee: period.managementFee?.toFixed(2),
                  otherExpenses: period.otherExpenses?.toFixed(2),
                  noi: period.noi?.toFixed(2),
                  ebitdar: period.ebitdar?.toFixed(2),
                  source: 'extracted',
                  sourceDocumentId: documentId,
                });
                result.financialPeriodsCreated++;
              } catch (err: any) {
                if (err.code !== '23505') {
                  result.warnings.push(`Error inserting financial period: ${err.message}`);
                }
              }
            }
            break;
          }

          case 'census': {
            const censusData = extractCensusData(sheetData, sheetName, []);
            for (const census of censusData) {
              try {
                await db.insert(facilityCensusPeriods).values({
                  facilityId: facility.id,
                  periodStart: census.periodStart.toISOString().split('T')[0],
                  periodEnd: census.periodEnd.toISOString().split('T')[0],
                  medicarePartADays: census.medicarePartADays,
                  medicareAdvantageDays: census.medicareAdvantageDays,
                  managedCareDays: census.managedCareDays,
                  medicaidDays: census.medicaidDays,
                  managedMedicaidDays: census.managedMedicaidDays,
                  privateDays: census.privateDays,
                  vaContractDays: census.vaContractDays,
                  hospiceDays: census.hospiceDays,
                  otherDays: census.otherDays,
                  totalBeds: census.totalBeds || facility.licensedBeds || facility.certifiedBeds,
                  occupancyRate: census.occupancyRate?.toString(),
                  source: 'extracted',
                });
                result.censusPeriodsCreated++;
              } catch (err: any) {
                if (err.code !== '23505') {
                  result.warnings.push(`Error inserting census period: ${err.message}`);
                }
              }
            }
            break;
          }

          case 'rates': {
            const rateData = extractRatesFromTable(sheetData, documentId, []);
            for (const rate of rateData) {
              try {
                await db.insert(facilityPayerRates).values({
                  facilityId: facility.id,
                  effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
                  medicarePartAPpd: rate.medicarePartAPpd?.toFixed(2),
                  medicareAdvantagePpd: rate.medicareAdvantagePpd?.toFixed(2),
                  managedCarePpd: rate.managedCarePpd?.toFixed(2),
                  medicaidPpd: rate.medicaidPpd?.toFixed(2),
                  managedMedicaidPpd: rate.managedMedicaidPpd?.toFixed(2),
                  privatePpd: rate.privatePpd?.toFixed(2),
                  vaContractPpd: rate.vaContractPpd?.toFixed(2),
                  hospicePpd: rate.hospicePpd?.toFixed(2),
                  ancillaryRevenuePpd: rate.ancillaryRevenuePpd?.toFixed(2),
                  therapyRevenuePpd: rate.therapyRevenuePpd?.toFixed(2),
                  source: 'extracted',
                });
                result.payerRatesCreated++;
              } catch (err: any) {
                if (err.code !== '23505') {
                  result.warnings.push(`Error inserting payer rate: ${err.message}`);
                }
              }
            }
            break;
          }

          default: {
            // Try to extract any recognizable data from unknown sheets
            const plData = extractPLData(sheetData, sheetName, []);
            const censusData = extractCensusData(sheetData, sheetName, []);

            for (const period of plData) {
              try {
                await db.insert(financialPeriods).values({
                  dealId: document.dealId,
                  facilityId: facility.id,
                  periodStart: period.periodStart.toISOString().split('T')[0],
                  periodEnd: period.periodEnd.toISOString().split('T')[0],
                  isAnnualized: period.isAnnualized,
                  totalRevenue: period.totalRevenue.toFixed(2),
                  totalExpenses: period.totalExpenses.toFixed(2),
                  ebitdar: period.ebitdar?.toFixed(2),
                  source: 'extracted',
                  sourceDocumentId: documentId,
                });
                result.financialPeriodsCreated++;
              } catch (err: any) {
                if (err.code !== '23505') {
                  // Ignore duplicate errors
                }
              }
            }

            for (const census of censusData) {
              try {
                await db.insert(facilityCensusPeriods).values({
                  facilityId: facility.id,
                  periodStart: census.periodStart.toISOString().split('T')[0],
                  periodEnd: census.periodEnd.toISOString().split('T')[0],
                  medicarePartADays: census.medicarePartADays,
                  medicaidDays: census.medicaidDays,
                  privateDays: census.privateDays,
                  totalBeds: facility.licensedBeds || facility.certifiedBeds,
                  source: 'extracted',
                });
                result.censusPeriodsCreated++;
              } catch (err: any) {
                if (err.code !== '23505') {
                  // Ignore duplicate errors
                }
              }
            }
            break;
          }
        }
      } catch (err) {
        result.warnings.push(`Error processing sheet "${sheetName}": ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }
  }

  // Also extract rates from PDF text if available
  if (rawText && rawText.length > 100 && !rawText.startsWith('[Error')) {
    const pdfRates = extractRatesFromText(rawText, documentId, []);
    for (const rate of pdfRates) {
      try {
        await db.insert(facilityPayerRates).values({
          facilityId: facility.id,
          effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
          medicarePartAPpd: rate.medicarePartAPpd?.toFixed(2),
          medicareAdvantagePpd: rate.medicareAdvantagePpd?.toFixed(2),
          managedCarePpd: rate.managedCarePpd?.toFixed(2),
          medicaidPpd: rate.medicaidPpd?.toFixed(2),
          managedMedicaidPpd: rate.managedMedicaidPpd?.toFixed(2),
          privatePpd: rate.privatePpd?.toFixed(2),
          vaContractPpd: rate.vaContractPpd?.toFixed(2),
          hospicePpd: rate.hospicePpd?.toFixed(2),
          ancillaryRevenuePpd: rate.ancillaryRevenuePpd?.toFixed(2),
          therapyRevenuePpd: rate.therapyRevenuePpd?.toFixed(2),
          source: 'rate_letter',
        });
        result.payerRatesCreated++;
      } catch (err: any) {
        if (err.code !== '23505') {
          result.warnings.push(`Error inserting PDF rate: ${err.message}`);
        }
      }
    }
  }

  return result;
}
