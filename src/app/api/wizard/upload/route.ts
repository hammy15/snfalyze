import { NextRequest, NextResponse } from 'next/server';
import { db, documents, wizardSessions, facilities, financialPeriods, facilityCensusPeriods, facilityPayerRates, dealCoaMappings, extractionClarifications } from '@/db';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { classifyDocument, extractFinancialValues } from '@/lib/documents/processor';
import { analyzeDocument, type DocumentAnalysisResult } from '@/lib/documents/ai-analyzer';
import { extractPLData } from '@/lib/extraction/pl-extractor';
import { extractCensusData } from '@/lib/extraction/census-extractor';
import { extractRatesFromText, extractRatesFromTable } from '@/lib/extraction/rate-extractor';
import { mapExtractedDataToCOAWithLearning } from '@/lib/coa/coa-mapper';
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

    // Generate unique ID
    const fileId = randomUUID();

    // Check for encrypted Excel files BEFORE processing
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls')) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (isEncryptedExcel(buffer)) {
        return NextResponse.json(
          {
            success: false,
            error: `The file "${file.name}" is encrypted with Microsoft's Rights Management Service (RMS). Please open the file in Microsoft Excel and save a copy without encryption/protection, then try uploading again.`,
          },
          { status: 400 }
        );
      }
    }

    // Determine file type based on extension
    type DocumentType = 'financial_statement' | 'rent_roll' | 'census_report' | 'staffing_report' | 'survey_report' | 'cost_report' | 'om_package' | 'lease_agreement' | 'appraisal' | 'environmental' | 'other';
    let fileType: DocumentType = 'other';
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

    // Read file buffer upfront (must happen before response is sent on Vercel)
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Parse file content inline — NO background processing (blocks Vercel warm instances)
    let rawText = '';
    let extractedData: Record<string, any> = {};
    // Detect images by MIME type OR extension (file.type can be empty/wrong on Vercel)
    const isImage = file.type.includes('image') || /\.(png|jpg|jpeg|gif|webp|bmp|tiff)$/i.test(lowerName);

    if (isImage) {
      rawText = `[Image: ${file.name}]`;
      // Derive MIME type from extension if file.type is missing/wrong
      const ext = lowerName.split('.').pop() || 'png';
      const mimeType = file.type.includes('image') ? file.type : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      extractedData = {
        imageBase64: fileBuffer.toString('base64'),
        imageMimeType: mimeType,
        requiresVision: true,
      };
    } else if (lowerName.endsWith('.pdf')) {
      try {
        const pdfData = await pdfParse(fileBuffer);
        rawText = pdfData.text;
        extractedData = { pageCount: pdfData.numpages, pdfInfo: pdfData.info };
      } catch (e) {
        rawText = `[Error extracting PDF: ${e instanceof Error ? e.message : 'Unknown'}]`;
      }
    } else if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.numbers')) {
      try {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const sheets: Record<string, any[][]> = {};
        const textParts: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          sheets[sheetName] = data;
          textParts.push(`=== Sheet: ${sheetName} ===`);
          for (const row of data) {
            if (row && row.some(cell => cell !== null && cell !== undefined && cell !== '')) {
              textParts.push(row.map(cell => cell ?? '').join('\t'));
            }
          }
        }
        rawText = textParts.join('\n');
        extractedData = { sheets, sheetNames: workbook.SheetNames };
      } catch (e) {
        rawText = `[Error extracting Excel: ${e instanceof Error ? e.message : 'Unknown'}]`;
      }
    } else if (lowerName.endsWith('.csv')) {
      try {
        const csvText = fileBuffer.toString('utf-8');
        const parseResult = Papa.parse(csvText, { header: false, skipEmptyLines: true });
        const csvData = parseResult.data as (string | number | null)[][];
        const sheetName = file.name.replace(/\.csv$/i, '');
        rawText = csvData.map(row => row.map(c => c ?? '').join('\t')).join('\n');
        extractedData = { sheets: { [sheetName]: csvData }, sheetNames: [sheetName], csvData, rowCount: csvData.length };
      } catch (e) {
        rawText = `[Error extracting CSV: ${e instanceof Error ? e.message : 'Unknown'}]`;
      }
    } else {
      rawText = fileBuffer.toString('utf-8');
    }

    // Classify document from parsed text
    const documentType = rawText.length > 10 && !rawText.startsWith('[Error') && !rawText.startsWith('[Image:')
      ? classifyDocument(rawText, file.name)
      : fileType;

    // Create document record with parsed content — ready for extraction
    const [doc] = await db
      .insert(documents)
      .values({
        id: fileId,
        dealId,
        filename: file.name,
        type: documentType as any,
        status: 'uploaded',
        uploadedAt: new Date(),
        rawText,
        extractedData,
      })
      .returning();

    console.log(`[Wizard] Uploaded ${file.name} (${(fileBuffer.length / 1024).toFixed(0)}KB) — parsed inline, no background processing`);

    return NextResponse.json({
      success: true,
      data: {
        id: doc.id,
        filename: file.name,
        type: documentType,
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

/**
 * Process uploaded document - parse, analyze, extract data
 */
async function processDocument(documentId: string, fileName: string, fileType: string, buffer: Buffer, dealId: string | null) {
  try {
    // Update status to parsing
    await db
      .update(documents)
      .set({ status: 'parsing' })
      .where(eq(documents.id, documentId));

    let rawText = '';
    let extractedData: Record<string, any> = {};

    // Process based on file type
    const lowerFileName = fileName.toLowerCase();

    if (fileType === 'application/pdf' || lowerFileName.endsWith('.pdf')) {
      try {
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text;
        extractedData.pageCount = pdfData.numpages;
        extractedData.pdfInfo = pdfData.info;
        console.log(`[Wizard] Extracted ${rawText.length} chars from PDF (${pdfData.numpages} pages)`);
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        rawText = `[Error extracting PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}]`;
      }
    } else if (
      fileType.includes('spreadsheet') ||
      fileType.includes('excel') ||
      lowerFileName.endsWith('.xlsx') ||
      lowerFileName.endsWith('.xls') ||
      lowerFileName.endsWith('.numbers')
    ) {
      // Check for encrypted files first (only for Excel formats, not Numbers)
      if (!lowerFileName.endsWith('.numbers') && isEncryptedExcel(buffer)) {
        await db
          .update(documents)
          .set({
            status: 'error',
            errors: [`The file "${lowerFileName}" is encrypted with Microsoft RMS. Please save a copy without encryption and re-upload.`],
          })
          .where(eq(documents.id, documentId));
        return;
      }

      try {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheets: Record<string, any[][]> = {};
        const textParts: string[] = [];

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          sheets[sheetName] = data;

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
        console.log(`[Wizard] Extracted ${workbook.SheetNames.length} sheets from Excel`);
      } catch (xlsxError) {
        console.error('Excel parsing error:', xlsxError);
        rawText = `[Error extracting Excel: ${xlsxError instanceof Error ? xlsxError.message : 'Unknown error'}]`;
      }
    } else if (lowerFileName.endsWith('.csv')) {
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
        // Use filename (without extension) as sheet name
        const sheetName = fileName.replace(/\.csv$/i, '');
        extractedData.sheets = { [sheetName]: csvData };
        extractedData.sheetNames = [sheetName];
        extractedData.csvData = csvData;
        extractedData.rowCount = csvData.length;
        console.log(`[Wizard] Extracted ${csvData.length} rows from CSV, converted to sheet: ${sheetName}`);
      } catch (csvError) {
        console.error('CSV parsing error:', csvError);
        rawText = `[Error extracting CSV: ${csvError instanceof Error ? csvError.message : 'Unknown error'}]`;
      }
    } else if (fileType.includes('image')) {
      // Store base64 for later vision extraction (done in /api/extraction/vision)
      // Don't run AI vision here — it causes Vercel serverless timeout (504)
      const base64Data = buffer.toString('base64');
      rawText = `[Image: ${fileName}]`;
      extractedData.imageBase64 = base64Data;
      extractedData.imageMimeType = fileType;
      extractedData.requiresVision = true;
      console.log(`[Wizard] Image stored for vision extraction: ${fileName} (${(base64Data.length / 1024).toFixed(0)}KB base64)`);
    } else {
      rawText = buffer.toString('utf-8');
    }

    // Classify document
    const documentType = classifyDocument(rawText, fileName);

    // Update status to normalizing
    await db
      .update(documents)
      .set({ status: 'normalizing', type: documentType as any })
      .where(eq(documents.id, documentId));

    // Extract financial values using regex patterns
    const extractedValues = extractFinancialValues(rawText);
    extractedData = {
      ...extractedData,
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
    if (rawText.length > 100 && !rawText.startsWith('[Error') && !rawText.startsWith('[Image:') && !rawText.startsWith('[Image file:')) {
      try {
        console.log(`[Wizard] Starting AI analysis for document ${documentId}...`);
        aiAnalysis = await analyzeDocument({
          documentId,
          filename: fileName,
          documentType,
          rawText,
          spreadsheetData: extractedData.sheets,
        });
        console.log(`[Wizard] AI analysis complete. Confidence: ${aiAnalysis.confidence}`);

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
              dealId,
              fieldName: clarification.field,
              extractedValue: clarification.extractedValue != null ? String(clarification.extractedValue) : null,
              suggestedValues: clarification.possibleValues || [],
              clarificationType: 'low_confidence',
              priority: priorityMap[clarification.priority] || 5,
              reason: clarification.reason,
              status: 'pending',
            });
          }
          console.log(`[Wizard] Created ${aiAnalysis.clarificationsNeeded.length} clarifications`);
        }
      } catch (aiError) {
        console.error('[Wizard] AI analysis failed (continuing with basic extraction):', aiError);
      }
    }

    // Mark as extracting
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
      rawText,
      dealId
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

    console.log(`[Wizard] Deep extraction complete for ${documentId}:`, deepExtractionResult);
  } catch (error) {
    console.error('[Wizard] Error processing document:', error);

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

  if (
    (sampleText.includes('revenue') && sampleText.includes('expense')) ||
    sampleText.includes('ebitda') ||
    sampleText.includes('income statement') ||
    sampleText.includes('p&l')
  ) {
    return 'pl';
  }

  if (
    sampleText.includes('patient days') ||
    sampleText.includes('census') ||
    (sampleText.includes('medicare') && sampleText.includes('days'))
  ) {
    return 'census';
  }

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
  rawText: string,
  dealId: string | null
): Promise<{
  financialPeriodsCreated: number;
  censusPeriodsCreated: number;
  payerRatesCreated: number;
  coaMappingsCreated: number;
  sheetsProcessed: number;
  warnings: string[];
}> {
  const result = {
    financialPeriodsCreated: 0,
    censusPeriodsCreated: 0,
    payerRatesCreated: 0,
    coaMappingsCreated: 0,
    sheetsProcessed: 0,
    warnings: [] as string[],
  };

  if (!dealId) {
    result.warnings.push('No deal associated with document');
    return result;
  }

  // Get facility for this deal (use first facility if multiple)
  const [facility] = await db
    .select()
    .from(facilities)
    .where(eq(facilities.dealId, dealId))
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
                  dealId,
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

            // Create COA mappings for P&L line items
            const coaMappingsCreated = await createCOAMappingsFromPL(
              sheetData,
              documentId,
              dealId,
              facility.id
            );
            result.coaMappingsCreated += coaMappingsCreated;
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
                  dealId,
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

/**
 * Create COA mappings from P&L sheet data
 */
async function createCOAMappingsFromPL(
  sheetData: any[][],
  documentId: string,
  dealId: string,
  facilityId: string
): Promise<number> {
  let mappingsCreated = 0;

  // Extract line items with labels and values
  const lineItems: Array<{
    label: string;
    rawLabel: string;
    values: Array<{ month: string; value: number }>;
    confidence: number;
  }> = [];

  // Find header row (months or periods)
  let headerRowIndex = -1;
  let monthColumns: string[] = [];

  for (let i = 0; i < Math.min(10, sheetData.length); i++) {
    const row = sheetData[i];
    if (!row) continue;

    const monthPattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|q[1-4]|[0-9]{4})/i;
    const monthMatches = row.filter(cell => cell && monthPattern.test(String(cell)));

    if (monthMatches.length >= 3) {
      headerRowIndex = i;
      monthColumns = row.map((cell: any) => String(cell || ''));
      break;
    }
  }

  // Extract data rows
  for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
    const row = sheetData[i];
    if (!row || !row[0]) continue;

    const label = String(row[0]).trim();
    if (!label || label.length < 2) continue;

    // Skip total/subtotal rows
    if (/^(total|subtotal|grand total)/i.test(label)) continue;

    const values: Array<{ month: string; value: number }> = [];
    for (let j = 1; j < row.length && j < monthColumns.length; j++) {
      const cellValue = row[j];
      if (cellValue !== null && cellValue !== undefined && !isNaN(Number(cellValue))) {
        values.push({
          month: monthColumns[j] || `Col${j}`,
          value: Number(cellValue),
        });
      }
    }

    if (values.length > 0) {
      lineItems.push({
        label: label.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').trim(),
        rawLabel: label,
        values,
        confidence: 0.8,
      });
    }
  }

  // Map to COA using the mapper with learning
  const { mappings, suggestions } = await mapExtractedDataToCOAWithLearning(
    {
      source: documentId,
      extractedAt: new Date(),
      confidence: 0.8,
      lineItems: lineItems.map(item => ({
        ...item,
        category: undefined,
      })),
    },
    dealId
  );

  // Insert mapped items
  for (const mapping of mappings) {
    try {
      // Insert one record per month-value pair for granular tracking
      for (const [month, value] of Object.entries(mapping.monthlyValues)) {
        await db.insert(dealCoaMappings).values({
          dealId,
          facilityId,
          documentId,
          sourceLabel: mapping.sourceLabel,
          sourceValue: value.toFixed(2),
          sourceMonth: month,
          coaCode: mapping.coaCode,
          coaName: mapping.coaName,
          mappingConfidence: mapping.confidence.toFixed(4),
          mappingMethod: mapping.mappingMethod === 'exact' ? 'auto' : mapping.mappingMethod === 'ml' ? 'auto' : 'suggested',
          isMapped: true,
          proformaDestination: mapping.coaCode,
        });
        mappingsCreated++;
      }
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn(`[Wizard] Error creating COA mapping: ${err.message}`);
      }
    }
  }

  // Insert suggestions (unmapped items) for manual review
  for (const suggestion of suggestions) {
    try {
      const topSuggestion = suggestion.suggestions[0];
      await db.insert(dealCoaMappings).values({
        dealId,
        facilityId,
        documentId,
        sourceLabel: suggestion.sourceLabel,
        coaCode: topSuggestion?.coaCode || null,
        coaName: topSuggestion?.coaName || null,
        mappingConfidence: (topSuggestion?.confidence || 0).toFixed(4),
        mappingMethod: 'suggested',
        isMapped: false,
      });
      mappingsCreated++;
    } catch (err: any) {
      if (err.code !== '23505') {
        console.warn(`[Wizard] Error creating COA suggestion: ${err.message}`);
      }
    }
  }

  return mappingsCreated;
}
