import { NextRequest, NextResponse } from 'next/server';
import { db, documents } from '@/db';
import { inArray } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { join } from 'path';
import { comprehensiveExtract, type ExtractionResult } from '@/lib/extraction/comprehensive-extractor';

const anthropic = new Anthropic();

interface FacilityInfo {
  name: string;
  fullEntityName?: string;
  address?: string;
  city?: string;
  state?: string;
  beds?: number;
  type?: 'SNF' | 'ALF' | 'ILF';
  confidence: number;
  sourceSheet: string;
  sourceFile: string;
  metrics?: {
    avgDailyCensus: number | null;
    occupancyRate: number | null;
    netOperatingIncome: number | null;
    ebitdaMargin: number | null;
  };
}

interface AnalysisResult {
  suggestedDealName: string;
  suggestedDealType: 'purchase' | 'sale_leaseback' | 'acquisition_financing';
  suggestedAssetType: 'SNF' | 'ALF' | 'ILF';
  facilities: FacilityInfo[];
  documentTypes: Array<{
    filename: string;
    suggestedType: string;
    confidence: number;
    sheetsFound: string[];
  }>;
  confidence: number;
  analysisDetails: {
    totalSheetsParsed: number;
    totalRowsAnalyzed: number;
    facilityIndicatorsFound: string[];
    companyName: string | null;
    dateRange: string | null;
  };
  extraction: ExtractionResult | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, fileIds } = body as {
      sessionId?: string;
      fileIds: string[];
    };

    if (!fileIds || fileIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files to analyze' },
        { status: 400 }
      );
    }

    // Get documents from database
    const docs = await db
      .select()
      .from(documents)
      .where(inArray(documents.id, fileIds));

    if (docs.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No documents found' },
        { status: 404 }
      );
    }

    // Build file list for extraction
    const files: Array<{ id: string; filename: string; path: string }> = [];
    for (const doc of docs) {
      const ext = doc.filename?.split('.').pop()?.toLowerCase() || 'pdf';
      const filePath = join(process.cwd(), 'uploads', 'wizard', `${doc.id}.${ext}`);
      files.push({
        id: doc.id,
        filename: doc.filename || 'unknown',
        path: filePath,
      });
    }

    // Run comprehensive extraction
    let extraction: ExtractionResult | null = null;
    try {
      extraction = await comprehensiveExtract(files);
    } catch (error) {
      console.error('Extraction error:', error);
    }

    // Build facilities from extraction
    const facilities: FacilityInfo[] = extraction?.facilities.map(f => ({
      name: f.name,
      fullEntityName: f.entityName || undefined,
      city: f.city || undefined,
      state: f.state || undefined,
      beds: f.licensedBeds || undefined,
      type: f.facilityType,
      confidence: 0.95,
      sourceSheet: f.name,
      sourceFile: f.sourceFiles[0] || 'Unknown',
      metrics: {
        avgDailyCensus: f.metrics.avgDailyCensus,
        occupancyRate: f.metrics.occupancyRate,
        netOperatingIncome: f.metrics.netOperatingIncome,
        ebitdaMargin: f.metrics.ebitdaMargin,
      },
    })) || [];

    // If no facilities from extraction, use AI analysis
    if (facilities.length === 0 && extraction && extraction.lineItems.length > 0) {
      // Get unique facility names from line items
      const uniqueFacilities = [...new Set(extraction.lineItems.map(item => item.facility))];
      for (const name of uniqueFacilities) {
        facilities.push({
          name,
          type: 'SNF',
          confidence: 0.8,
          sourceSheet: name,
          sourceFile: extraction.metadata.filesProcessed[0] || 'Unknown',
        });
      }
    }

    // Build document types
    const documentTypes = docs.map(doc => {
      const ext = doc.filename?.split('.').pop()?.toLowerCase();
      const isFinancial = doc.filename?.toLowerCase().includes('p&l') ||
                         doc.filename?.toLowerCase().includes('financial') ||
                         doc.filename?.toLowerCase().includes('income');
      const isCensus = doc.filename?.toLowerCase().includes('census') ||
                      doc.filename?.toLowerCase().includes('occupancy');

      return {
        filename: doc.filename || 'unknown',
        suggestedType: isFinancial ? 'financial_statement' :
                      isCensus ? 'census_report' :
                      doc.type || 'other',
        confidence: 0.9,
        sheetsFound: extraction?.facilities.map(f => f.name) || [],
      };
    });

    // Use AI to enhance the analysis
    let suggestedDealName = 'Healthcare Portfolio';
    let suggestedDealType: 'purchase' | 'sale_leaseback' | 'acquisition_financing' = 'purchase';
    let suggestedAssetType: 'SNF' | 'ALF' | 'ILF' = 'SNF';
    let companyName: string | null = null;

    if (extraction && extraction.lineItems.length > 0) {
      // Build a summary for AI analysis
      const summaryPrompt = `Analyze this healthcare real estate deal data and provide recommendations:

EXTRACTION SUMMARY:
- Facilities Found: ${facilities.map(f => f.name).join(', ')}
- Total Periods: ${extraction.summary.periodsExtracted.length} months
- Date Range: ${extraction.summary.periodsExtracted[0]} to ${extraction.summary.periodsExtracted[extraction.summary.periodsExtracted.length - 1]}
- Total Revenue (Annualized): $${(extraction.summary.totalRevenue / 1000000).toFixed(2)}M
- Total Expenses (Annualized): $${(extraction.summary.totalExpenses / 1000000).toFixed(2)}M
- Total NOI: $${(extraction.summary.totalNOI / 1000000).toFixed(2)}M
- Data Quality: ${(extraction.summary.dataQuality * 100).toFixed(0)}% mapped to COA

FACILITY METRICS:
${facilities.map(f => `
${f.name}:
- Entity: ${f.fullEntityName || 'Not specified'}
- Location: ${f.city || 'Unknown'}, ${f.state || 'Unknown'}
- Avg Daily Census: ${f.metrics?.avgDailyCensus?.toFixed(1) || 'N/A'}
- Occupancy: ${f.metrics?.occupancyRate?.toFixed(1) || 'N/A'}%
- NOI: $${f.metrics?.netOperatingIncome ? (f.metrics.netOperatingIncome / 1000).toFixed(0) + 'K' : 'N/A'}
`).join('\n')}

FILES ANALYZED:
${extraction.metadata.filesProcessed.join('\n')}

Based on this data, provide JSON with:
{
  "suggestedDealName": "Professional deal name",
  "suggestedDealType": "purchase" | "sale_leaseback" | "acquisition_financing",
  "suggestedAssetType": "SNF" | "ALF" | "ILF",
  "companyName": "Company name if identified",
  "stateLocation": "State code (e.g., OR, WA)",
  "reasoning": "Brief explanation of recommendations"
}

Consider:
- If files mention "Owned Assets" or "Opco/Propco", likely sale_leaseback
- SNF if data shows Medicare/Medicaid census
- Use facility names and locations for deal name

Return ONLY valid JSON.`;

      try {
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: summaryPrompt }],
        });

        const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          const aiResult = JSON.parse(jsonMatch[0]);
          suggestedDealName = aiResult.suggestedDealName || suggestedDealName;
          suggestedDealType = aiResult.suggestedDealType || suggestedDealType;
          suggestedAssetType = aiResult.suggestedAssetType || suggestedAssetType;
          companyName = aiResult.companyName || null;

          // Update facility states if provided
          if (aiResult.stateLocation && facilities.length > 0) {
            for (const f of facilities) {
              if (!f.state) f.state = aiResult.stateLocation;
            }
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
        // Use fallback based on extraction data
        if (facilities.length > 0) {
          const facilityNames = facilities.map(f => f.name).join('/');
          suggestedDealName = `${facilityNames} SNF Portfolio`;
        }
      }
    }

    const result: AnalysisResult = {
      suggestedDealName,
      suggestedDealType,
      suggestedAssetType,
      facilities,
      documentTypes,
      confidence: extraction ? Math.min(0.95, extraction.summary.dataQuality + 0.5) : 0.5,
      analysisDetails: {
        totalSheetsParsed: extraction?.facilities.length || 0,
        totalRowsAnalyzed: extraction?.metadata.totalRowsProcessed || 0,
        facilityIndicatorsFound: facilities.map(f => f.name),
        companyName,
        dateRange: extraction?.summary.periodsExtracted.length
          ? `${extraction.summary.periodsExtracted[0]} to ${extraction.summary.periodsExtracted[extraction.summary.periodsExtracted.length - 1]}`
          : null,
      },
      extraction,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error analyzing documents:', error);
    return NextResponse.json(
      { success: false, error: `Failed to analyze documents: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
