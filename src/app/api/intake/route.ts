import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, analysisStages, documents } from '@/db';
import { eq } from 'drizzle-orm';
import { classifyDocument } from '@/lib/documents/processor';
import { analyzeDocument } from '@/lib/documents/ai-analyzer';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

// =============================================================================
// TYPES
// =============================================================================

interface ExtractedFacility {
  name: string;
  ccn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  licensedBeds?: number;
  certifiedBeds?: number;
  yearBuilt?: number;
  confidence: number;
}

interface FileExtractionResult {
  filename: string;
  documentType: string;
  rawText: string;
  extractedFacilities: ExtractedFacility[];
  summary: string;
  keyFindings: string[];
  confidence: number;
  spreadsheetData?: Record<string, any[][]>;
}

interface IntakeResponse {
  sessionId: string;
  files: FileExtractionResult[];
  extractedFacilities: ExtractedFacility[];
  suggestedDealName: string;
  suggestedAssetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  suggestedState: string | null;
}

// =============================================================================
// POST — Process uploaded files and extract deal intelligence
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    const sessionId = crypto.randomUUID();
    const fileResults: FileExtractionResult[] = [];
    const allFacilities: ExtractedFacility[] = [];

    // Process each file
    for (const file of files) {
      try {
        const result = await processIntakeFile(file);
        fileResults.push(result);
        allFacilities.push(...result.extractedFacilities);
      } catch (err) {
        console.error(`Error processing ${file.name}:`, err);
        fileResults.push({
          filename: file.name,
          documentType: 'unknown',
          rawText: '',
          extractedFacilities: [],
          summary: `Failed to process: ${err instanceof Error ? err.message : 'Unknown error'}`,
          keyFindings: [],
          confidence: 0,
        });
      }
    }

    // Deduplicate facilities by name similarity
    const dedupedFacilities = deduplicateFacilities(allFacilities);

    // Infer deal-level info
    const suggestedDealName = inferDealName(dedupedFacilities, fileResults);
    const suggestedAssetType = inferAssetType(dedupedFacilities);
    const suggestedState = inferState(dedupedFacilities);

    const response: IntakeResponse = {
      sessionId,
      files: fileResults,
      extractedFacilities: dedupedFacilities,
      suggestedDealName,
      suggestedAssetType,
      suggestedState,
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Intake processing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process intake files' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PUT — Create deal from reviewed intake data
// =============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      dealName,
      dealStructure = 'purchase',
      assetType,
      facilities: facilityInputs,
      fileData,
    } = body;

    if (!dealName || !assetType || !facilityInputs?.length) {
      return NextResponse.json(
        { success: false, error: 'Deal name, asset type, and at least one facility required' },
        { status: 400 }
      );
    }

    const totalBeds = facilityInputs.reduce(
      (sum: number, f: any) => sum + (f.licensedBeds || 0),
      0
    );
    const primaryState = facilityInputs[0]?.state || null;

    // Create deal
    const [newDeal] = await db
      .insert(deals)
      .values({
        name: dealName,
        assetType,
        dealStructure,
        isAllOrNothing: true,
        status: 'new',
        beds: totalBeds,
        primaryState,
      })
      .returning();

    // Create facilities
    const createdFacilities = await Promise.all(
      facilityInputs.map(async (f: any) => {
        const [facility] = await db
          .insert(facilities)
          .values({
            dealId: newDeal.id,
            name: f.name,
            ccn: f.ccn || null,
            address: f.address || null,
            city: f.city || null,
            state: f.state || null,
            zipCode: f.zipCode || null,
            assetType: f.assetType || assetType,
            licensedBeds: f.licensedBeds || null,
            certifiedBeds: f.certifiedBeds || null,
            yearBuilt: f.yearBuilt || null,
          })
          .returning();
        return facility;
      })
    );

    // Create analysis stages
    const stageTypes = [
      'document_upload',
      'census_validation',
      'revenue_analysis',
      'expense_analysis',
      'cms_integration',
      'valuation_coverage',
    ] as const;

    await Promise.all(
      stageTypes.map((stage, index) =>
        db.insert(analysisStages).values({
          dealId: newDeal.id,
          stage,
          status: 'in_progress',
          order: index + 1,
        })
      )
    );

    // If file data was passed, create document records linked to the new deal
    if (fileData && Array.isArray(fileData)) {
      await Promise.all(
        fileData.map(async (fd: any) => {
          await db.insert(documents).values({
            dealId: newDeal.id,
            filename: fd.filename,
            type: fd.documentType || 'other',
            status: 'complete',
            rawText: fd.rawText || null,
            extractedData: {
              aiAnalysis: {
                summary: fd.summary,
                keyFindings: fd.keyFindings,
                confidence: fd.confidence,
              },
            },
          });
        })
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        deal: newDeal,
        facilities: createdFacilities,
        redirectUrl: `/app/deals/${newDeal.id}`,
      },
    });
  } catch (error) {
    console.error('Error creating deal from intake:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create deal' },
      { status: 500 }
    );
  }
}

// =============================================================================
// FILE PROCESSING
// =============================================================================

async function processIntakeFile(file: File): Promise<FileExtractionResult> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const filename = file.name;
  const ext = filename.split('.').pop()?.toLowerCase();

  let rawText = '';
  let spreadsheetData: Record<string, any[][]> | undefined;

  // Parse based on file type
  if (ext === 'pdf') {
    const pdfData = await pdfParse(buffer);
    rawText = pdfData.text;
  } else if (ext === 'xlsx' || ext === 'xls') {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    spreadsheetData = {};
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      spreadsheetData[sheetName] = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      rawText += `\n--- Sheet: ${sheetName} ---\n`;
      rawText += XLSX.utils.sheet_to_csv(sheet);
    }
  } else if (ext === 'csv') {
    rawText = buffer.toString('utf-8');
  } else if (['jpg', 'jpeg', 'png'].includes(ext || '')) {
    rawText = '[Image file — OCR processing would be applied in production]';
  } else {
    rawText = buffer.toString('utf-8').slice(0, 50000);
  }

  // Classify document
  const documentType = classifyDocument(rawText, filename);

  // Extract facility info from text
  const extractedFacilities = extractFacilitiesFromText(rawText, filename);

  // AI analysis for summary and key findings
  let summary = '';
  let keyFindings: string[] = [];
  let confidence = 0;

  try {
    const aiResult = await analyzeDocument({
      documentId: 'intake-temp',
      filename,
      documentType,
      rawText: rawText.slice(0, 30000),
      spreadsheetData,
    });
    summary = aiResult.summary;
    keyFindings = aiResult.keyFindings;
    confidence = aiResult.confidence;
  } catch {
    summary = `${documentType.replace(/_/g, ' ')} document — AI analysis unavailable`;
    confidence = 30;
  }

  return {
    filename,
    documentType,
    rawText,
    extractedFacilities,
    summary,
    keyFindings,
    confidence,
    spreadsheetData,
  };
}

// =============================================================================
// FACILITY EXTRACTION FROM TEXT
// =============================================================================

function extractFacilitiesFromText(text: string, filename: string): ExtractedFacility[] {
  const facilities: ExtractedFacility[] = [];
  const lowerText = text.toLowerCase();

  // Extract CCN patterns (6-digit format)
  const ccnMatches = text.match(/\b(\d{2}-?\d{4}[A-Z]?)\b/g) || [];
  const stateMatches = text.match(/\b([A-Z]{2})\b/g) || [];
  const bedMatches = text.match(/(\d+)\s*(?:licensed\s*)?beds?/gi) || [];

  // Try to extract facility names from common patterns
  const namePatterns = [
    /(?:facility|center|home|healthcare|nursing|rehabilitation|care)[\s:]+([A-Z][A-Za-z\s&'-]+)/g,
    /([A-Z][A-Za-z\s&'-]+(?:Healthcare|Nursing|Rehabilitation|Care|Center|Home|Living|Lodge|Manor|Village|Estates|Gardens))/g,
  ];

  const foundNames = new Set<string>();
  for (const pattern of namePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      if (name && name.length > 3 && name.length < 100) {
        foundNames.add(name);
      }
    }
  }

  // Determine asset type from text
  let assetType: ExtractedFacility['assetType'] = 'SNF';
  if (lowerText.includes('assisted living') || lowerText.includes(' alf ')) assetType = 'ALF';
  if (lowerText.includes('independent living') || lowerText.includes(' ilf ')) assetType = 'ILF';
  if (lowerText.includes('hospice')) assetType = 'HOSPICE';

  // US state codes
  const US_STATES = new Set([
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
    'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
    'VA','WA','WV','WI','WY','DC',
  ]);

  const validStates = stateMatches.filter((s) => US_STATES.has(s));
  const firstState = validStates[0] || null;
  const firstBeds = bedMatches[0] ? parseInt(bedMatches[0].replace(/\D/g, '')) : undefined;

  if (foundNames.size > 0) {
    let idx = 0;
    for (const name of foundNames) {
      facilities.push({
        name,
        ccn: ccnMatches[idx] || undefined,
        state: validStates[idx] || firstState || undefined,
        assetType,
        licensedBeds: firstBeds,
        confidence: 60,
      });
      idx++;
      if (idx >= 10) break; // Cap at 10
    }
  } else if (ccnMatches.length > 0) {
    // If we have CCNs but no names, create placeholder facilities
    ccnMatches.forEach((ccn, i) => {
      facilities.push({
        name: `Facility ${i + 1} (${ccn})`,
        ccn,
        state: firstState || undefined,
        assetType,
        confidence: 40,
      });
    });
  }

  // If no facilities extracted, create one from filename
  if (facilities.length === 0) {
    const cleanName = filename
      .replace(/\.(pdf|xlsx?|csv|jpe?g|png)$/i, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b(financials?|p&?l|income|statement|report|census|om|offering)\b/gi, '')
      .trim();

    if (cleanName.length > 2) {
      facilities.push({
        name: cleanName,
        state: firstState || undefined,
        assetType,
        licensedBeds: firstBeds,
        confidence: 20,
      });
    }
  }

  return facilities;
}

// =============================================================================
// HELPERS
// =============================================================================

function deduplicateFacilities(facilities: ExtractedFacility[]): ExtractedFacility[] {
  const seen = new Map<string, ExtractedFacility>();

  for (const f of facilities) {
    const key = f.ccn || f.name.toLowerCase().replace(/\s+/g, ' ').trim();
    const existing = seen.get(key);

    if (!existing || f.confidence > existing.confidence) {
      // Merge info from both if existing
      if (existing) {
        seen.set(key, {
          ...existing,
          ...f,
          licensedBeds: f.licensedBeds || existing.licensedBeds,
          certifiedBeds: f.certifiedBeds || existing.certifiedBeds,
          address: f.address || existing.address,
          city: f.city || existing.city,
          state: f.state || existing.state,
          zipCode: f.zipCode || existing.zipCode,
          yearBuilt: f.yearBuilt || existing.yearBuilt,
          confidence: Math.max(f.confidence, existing.confidence),
        });
      } else {
        seen.set(key, f);
      }
    }
  }

  return Array.from(seen.values());
}

function inferDealName(
  facilities: ExtractedFacility[],
  files: FileExtractionResult[]
): string {
  if (facilities.length === 1) {
    return facilities[0].name;
  }
  if (facilities.length > 1) {
    // Find common words in facility names
    const words = facilities.map((f) => f.name.split(/\s+/));
    const common = words[0]?.filter((w) =>
      words.every((ws) => ws.some((ww) => ww.toLowerCase() === w.toLowerCase()))
    );
    if (common && common.length > 0) {
      return `${common.join(' ')} Portfolio`;
    }
    return `${facilities.length}-Facility Portfolio`;
  }
  // Fall back to first filename
  if (files.length > 0) {
    return files[0].filename.replace(/\.(pdf|xlsx?|csv)$/i, '').replace(/[_-]/g, ' ');
  }
  return 'New Deal';
}

function inferAssetType(facilities: ExtractedFacility[]): 'SNF' | 'ALF' | 'ILF' | 'HOSPICE' {
  const types = facilities.map((f) => f.assetType);
  const counts: Record<string, number> = {};
  types.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[0] as any) || 'SNF';
}

function inferState(facilities: ExtractedFacility[]): string | null {
  const states = facilities.map((f) => f.state).filter(Boolean);
  if (states.length === 0) return null;
  const counts: Record<string, number> = {};
  states.forEach((s) => (counts[s!] = (counts[s!] || 0) + 1));
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] || null;
}
