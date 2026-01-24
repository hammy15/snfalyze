import { NextRequest, NextResponse } from 'next/server';
import { db, documents, facilities as facilitiesTable } from '@/db';
import { eq, inArray } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';
import { join } from 'path';
import { comprehensiveExtract, type ExtractionResult } from '@/lib/extraction/comprehensive-extractor';
import { extractSingleFile, type PerFileExtractionResult } from '@/lib/extraction/per-file-extractor';
import { populateFromExtraction } from '@/lib/extraction/db-populator';
import { crossReferenceValidate, type CrossReferenceResult } from '@/lib/extraction/cross-reference-validator';
import { generateAISummary, generateQuickSummary, type AISummaryOutput } from '@/lib/extraction/ai-summary-generator';
import { matchExtractedFacilityToCMS, type NormalizedProviderData } from '@/lib/cms';

const anthropic = new Anthropic();

// Use /tmp on Vercel (serverless), local uploads folder in development
const getUploadsDir = () => {
  if (process.env.VERCEL) {
    return '/tmp/wizard-uploads';
  }
  return join(process.cwd(), 'uploads', 'wizard');
};

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
  // CMS auto-match data
  ccn?: string;
  cmsData?: NormalizedProviderData;
  cmsMatchConfidence?: number;
  autoVerified?: boolean;
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
  databasePopulation?: {
    populated: boolean;
    facilities: Array<{
      facilityName: string;
      facilityId: string;
      financialPeriods: number;
      censusPeriods: number;
      payerRates: number;
      errors: string[];
    }>;
    totalFinancialPeriods: number;
    totalCensusPeriods: number;
    totalPayerRates: number;
  };
  crossReferenceValidation?: {
    validated: boolean;
    overallConfidence: number;
    discrepancyCount: number;
    corroborationCount: number;
    highSeverityIssues: number;
    recommendations: string[];
    details?: CrossReferenceResult;
  };
  aiSummary?: AISummaryOutput;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, fileIds, dealId, autoPopulate = true } = body as {
      sessionId?: string;
      fileIds: string[];
      dealId?: string;
      autoPopulate?: boolean;
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
    const uploadsDir = getUploadsDir();
    const files: Array<{ id: string; filename: string; path: string }> = [];
    for (const doc of docs) {
      const ext = doc.filename?.split('.').pop()?.toLowerCase() || 'pdf';
      const filePath = join(uploadsDir, `${doc.id}.${ext}`);
      files.push({
        id: doc.id,
        filename: doc.filename || 'unknown',
        path: filePath,
      });
    }

    // Process files ONE AT A TIME with detailed logging
    console.log('='.repeat(60));
    console.log('STARTING PER-FILE EXTRACTION');
    console.log(`Total files to process: ${files.length}`);
    console.log('='.repeat(60));

    const perFileResults: PerFileExtractionResult[] = [];
    const extractionErrors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log('');
      console.log('-'.repeat(60));
      console.log(`[FILE ${i + 1}/${files.length}] Starting: ${file.filename}`);
      console.log(`  Document ID: ${file.id}`);
      console.log(`  Path: ${file.path}`);
      console.log('-'.repeat(60));

      try {
        const result = await extractSingleFile(
          file.path,
          file.id,
          file.filename,
          (progress) => {
            console.log(`  [${progress.stage.toUpperCase()}] ${progress.progress}% - ${progress.message}`);
          }
        );

        perFileResults.push(result);

        console.log('');
        console.log(`  ✓ EXTRACTION COMPLETE for ${file.filename}`);
        console.log(`    - Sheets found: ${result.sheets.length}`);
        result.sheets.forEach((sheet, idx) => {
          console.log(`      ${idx + 1}. "${sheet.sheetName}" (${sheet.sheetType}) - ${sheet.rowCount} rows, ${sheet.columnCount} cols`);
          if (sheet.facilitiesDetected.length > 0) {
            console.log(`         Facilities detected: ${sheet.facilitiesDetected.join(', ')}`);
          }
          if (sheet.periodsDetected.length > 0) {
            console.log(`         Periods detected: ${sheet.periodsDetected.join(', ')}`);
          }
        });
        console.log(`    - Financial periods: ${result.financialData.length}`);
        console.log(`    - Census periods: ${result.censusData.length}`);
        console.log(`    - Rate data: ${result.rateData.length}`);
        console.log(`    - Confidence: ${(result.confidence * 100).toFixed(1)}%`);
        console.log(`    - Processing time: ${result.processingTimeMs}ms`);
        if (result.warnings.length > 0) {
          console.log(`    - Warnings: ${result.warnings.join('; ')}`);
        }

        // Update document status
        await db
          .update(documents)
          .set({
            status: 'complete',
            processedAt: new Date(),
            extractedData: {
              sheetsCount: result.sheets.length,
              financialPeriods: result.financialData.length,
              censusPeriods: result.censusData.length,
              rates: result.rateData.length,
              confidence: result.confidence,
            },
          })
          .where(eq(documents.id, file.id));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`  ✗ ERROR processing ${file.filename}: ${errorMsg}`);
        extractionErrors.push(`${file.filename}: ${errorMsg}`);

        // Update document with error
        await db
          .update(documents)
          .set({
            status: 'error',
            processedAt: new Date(),
            extractedData: { error: errorMsg },
          })
          .where(eq(documents.id, file.id));
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('PER-FILE EXTRACTION COMPLETE');
    console.log(`  Files processed: ${perFileResults.length}/${files.length}`);
    console.log(`  Total sheets: ${perFileResults.reduce((sum, r) => sum + r.sheets.length, 0)}`);
    console.log(`  Total financial periods: ${perFileResults.reduce((sum, r) => sum + r.financialData.length, 0)}`);
    console.log(`  Total census periods: ${perFileResults.reduce((sum, r) => sum + r.censusData.length, 0)}`);
    console.log(`  Total rates: ${perFileResults.reduce((sum, r) => sum + r.rateData.length, 0)}`);
    if (extractionErrors.length > 0) {
      console.log(`  Errors: ${extractionErrors.length}`);
      extractionErrors.forEach(e => console.log(`    - ${e}`));
    }
    console.log('='.repeat(60));

    // ========================================================================
    // CROSS-REFERENCE VALIDATION
    // ========================================================================
    // Compare data across all extracted files to identify discrepancies
    let crossReferenceResults: CrossReferenceResult | null = null;
    if (perFileResults.length > 1) {
      console.log('');
      console.log('='.repeat(60));
      console.log('CROSS-REFERENCE VALIDATION');
      console.log('='.repeat(60));

      try {
        crossReferenceResults = crossReferenceValidate(
          perFileResults.map(r => ({
            documentId: r.documentId,
            filename: r.filename,
            financialData: r.financialData,
            censusData: r.censusData,
            rateData: r.rateData,
          }))
        );

        console.log(`  Facilities validated: ${crossReferenceResults.facilitiesValidated.length}`);
        console.log(`  Periods compared: ${crossReferenceResults.periodsCompared}`);
        console.log(`  Discrepancies found: ${crossReferenceResults.discrepancies.length}`);
        console.log(`    - High severity: ${crossReferenceResults.summaryMetrics.highSeverityDiscrepancies}`);
        console.log(`    - Medium severity: ${crossReferenceResults.summaryMetrics.mediumSeverityDiscrepancies}`);
        console.log(`    - Low severity: ${crossReferenceResults.summaryMetrics.lowSeverityDiscrepancies}`);
        console.log(`  Corroborations found: ${crossReferenceResults.corroborations.length}`);
        console.log(`  Overall confidence: ${(crossReferenceResults.overallConfidence * 100).toFixed(1)}%`);

        if (crossReferenceResults.recommendations.length > 0) {
          console.log('  Recommendations:');
          crossReferenceResults.recommendations.forEach(r => console.log(`    ${r}`));
        }
      } catch (error) {
        console.error('Cross-reference validation error:', error);
      }

      console.log('='.repeat(60));
    } else {
      console.log('');
      console.log('Skipping cross-reference validation (single file)');
    }

    // Also run comprehensive extraction for the summary data
    let extraction: ExtractionResult | null = null;
    try {
      extraction = await comprehensiveExtract(files);
    } catch (error) {
      console.error('Comprehensive extraction error:', error);
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

    // Auto-match facilities to CMS data
    if (facilities.length > 0) {
      for (const facility of facilities) {
        try {
          // First check if we already have a CCN from extraction
          const extractedFacility = extraction?.facilities.find(f => f.name === facility.name);
          if (extractedFacility?.ccn) {
            facility.ccn = extractedFacility.ccn;
          }

          // Try to match to CMS by name/city/state
          const cmsMatch = await matchExtractedFacilityToCMS({
            name: facility.name,
            city: facility.city,
            state: facility.state,
            licensedBeds: facility.beds,
          });

          if (cmsMatch.provider) {
            facility.cmsData = cmsMatch.provider;
            facility.cmsMatchConfidence = cmsMatch.matchConfidence;
            facility.ccn = facility.ccn || cmsMatch.provider.ccn;
            facility.autoVerified = cmsMatch.matchConfidence > 0.90;

            // Update facility info with CMS data if not already set
            if (!facility.address && cmsMatch.provider.address) {
              facility.address = cmsMatch.provider.address;
            }
            if (!facility.city && cmsMatch.provider.city) {
              facility.city = cmsMatch.provider.city;
            }
            if (!facility.state && cmsMatch.provider.state) {
              facility.state = cmsMatch.provider.state;
            }
            if (!facility.beds && cmsMatch.provider.numberOfBeds) {
              facility.beds = cmsMatch.provider.numberOfBeds;
            }
          }
        } catch (cmsError) {
          console.warn('CMS auto-match failed for', facility.name, cmsError);
          // Continue without CMS data - not a critical error
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // ========================================================================
    // AUTO-POPULATE DATABASE
    // ========================================================================
    // If dealId is provided and autoPopulate is true, create facilities and
    // populate the database with extracted data
    const populationResults: Array<{
      facilityName: string;
      facilityId: string;
      financialPeriods: number;
      censusPeriods: number;
      payerRates: number;
      errors: string[];
    }> = [];

    if (dealId && autoPopulate && facilities.length > 0) {
      console.log('');
      console.log('='.repeat(60));
      console.log('AUTO-POPULATING DATABASE');
      console.log(`Deal ID: ${dealId}`);
      console.log(`Facilities to process: ${facilities.length}`);
      console.log('='.repeat(60));

      for (const facility of facilities) {
        try {
          // Check if facility already exists
          let [existingFacility] = await db
            .select()
            .from(facilitiesTable)
            .where(eq(facilitiesTable.name, facility.name))
            .limit(1);

          // Create facility if it doesn't exist
          if (!existingFacility) {
            console.log(`  Creating facility: ${facility.name}`);
            const [newFacility] = await db
              .insert(facilitiesTable)
              .values({
                dealId,
                name: facility.name,
                ccn: facility.ccn || undefined,
                address: facility.address || undefined,
                city: facility.city || undefined,
                state: facility.state || undefined,
                assetType: (facility.type?.toUpperCase() || 'SNF') as 'SNF' | 'ALF' | 'ILF',
                licensedBeds: facility.beds || undefined,
                cmsRating: facility.cmsData?.overallRating || undefined,
                healthRating: facility.cmsData?.healthInspectionRating || undefined,
                staffingRating: facility.cmsData?.staffingRating || undefined,
                qualityRating: facility.cmsData?.qualityMeasureRating || undefined,
                isSff: facility.cmsData?.isSff || false,
                isSffWatch: facility.cmsData?.isSffCandidate || false,
                isVerified: facility.autoVerified || false,
                verifiedAt: facility.autoVerified ? new Date() : undefined,
                cmsDataSnapshot: facility.cmsData || undefined,
              })
              .returning();
            existingFacility = newFacility;
          } else {
            console.log(`  Facility exists: ${facility.name} (${existingFacility.id})`);
            // Update facility with latest CMS data if available
            if (facility.cmsData) {
              await db
                .update(facilitiesTable)
                .set({
                  ccn: facility.ccn || existingFacility.ccn,
                  cmsRating: facility.cmsData.overallRating,
                  healthRating: facility.cmsData.healthInspectionRating,
                  staffingRating: facility.cmsData.staffingRating,
                  qualityRating: facility.cmsData.qualityMeasureRating,
                  isSff: facility.cmsData.isSff,
                  isSffWatch: facility.cmsData.isSffCandidate,
                  cmsDataSnapshot: facility.cmsData,
                })
                .where(eq(facilitiesTable.id, existingFacility.id));
            }
          }

          // Collect per-file extraction data for this facility
          // Look for matching data in perFileResults
          const facilityFinancialData = perFileResults.flatMap(r =>
            r.financialData.filter(f =>
              f.facilityName?.toLowerCase() === facility.name.toLowerCase() ||
              f.facilityName?.toLowerCase().includes(facility.name.split(' ')[0].toLowerCase())
            )
          );
          const facilityCensusData = perFileResults.flatMap(r =>
            r.censusData.filter(c =>
              c.facilityName?.toLowerCase() === facility.name.toLowerCase() ||
              c.facilityName?.toLowerCase().includes(facility.name.split(' ')[0].toLowerCase())
            )
          );
          const facilityRateData = perFileResults.flatMap(r =>
            r.rateData.filter(rt =>
              rt.facilityName?.toLowerCase() === facility.name.toLowerCase() ||
              rt.facilityName?.toLowerCase().includes(facility.name.split(' ')[0].toLowerCase())
            )
          );

          // If no facility-specific data found, use all data (single-facility scenario)
          const financialDataToUse = facilityFinancialData.length > 0
            ? facilityFinancialData
            : (facilities.length === 1 ? perFileResults.flatMap(r => r.financialData) : []);
          const censusDataToUse = facilityCensusData.length > 0
            ? facilityCensusData
            : (facilities.length === 1 ? perFileResults.flatMap(r => r.censusData) : []);
          const rateDataToUse = facilityRateData.length > 0
            ? facilityRateData
            : (facilities.length === 1 ? perFileResults.flatMap(r => r.rateData) : []);

          // Populate database
          const popResult = await populateFromExtraction(
            existingFacility.id,
            financialDataToUse,
            censusDataToUse,
            rateDataToUse,
            docs[0]?.id || 'unknown'
          );

          populationResults.push({
            facilityName: facility.name,
            facilityId: existingFacility.id,
            financialPeriods: popResult.financialPeriodsInserted,
            censusPeriods: popResult.censusPeriodsInserted,
            payerRates: popResult.payerRatesInserted,
            errors: popResult.errors,
          });

          console.log(`  ✓ Populated ${facility.name}:`);
          console.log(`    - Financial periods: ${popResult.financialPeriodsInserted}`);
          console.log(`    - Census periods: ${popResult.censusPeriodsInserted}`);
          console.log(`    - Payer rates: ${popResult.payerRatesInserted}`);
          if (popResult.errors.length > 0) {
            console.log(`    - Errors: ${popResult.errors.join(', ')}`);
          }

        } catch (popError) {
          console.error(`  ✗ Error populating ${facility.name}:`, popError);
          populationResults.push({
            facilityName: facility.name,
            facilityId: 'error',
            financialPeriods: 0,
            censusPeriods: 0,
            payerRates: 0,
            errors: [popError instanceof Error ? popError.message : 'Unknown error'],
          });
        }
      }

      console.log('');
      console.log('='.repeat(60));
      console.log('AUTO-POPULATION COMPLETE');
      console.log(`  Total facilities: ${populationResults.length}`);
      console.log(`  Financial periods: ${populationResults.reduce((sum, r) => sum + r.financialPeriods, 0)}`);
      console.log(`  Census periods: ${populationResults.reduce((sum, r) => sum + r.censusPeriods, 0)}`);
      console.log(`  Payer rates: ${populationResults.reduce((sum, r) => sum + r.payerRates, 0)}`);
      console.log('='.repeat(60));
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

    // ========================================================================
    // AI SUMMARY GENERATION
    // ========================================================================
    // Generate comprehensive AI summary of all extracted data
    let aiSummary: AISummaryOutput | null = null;
    console.log('');
    console.log('='.repeat(60));
    console.log('GENERATING AI SUMMARY');
    console.log('='.repeat(60));

    try {
      aiSummary = await generateAISummary({
        facilities: facilities.map(f => ({
          name: f.name,
          ccn: f.ccn,
          cmsData: f.cmsData,
          metrics: f.metrics,
        })),
        perFileResults,
        crossReferenceResults,
        extractionSummary: extraction ? {
          totalRevenue: extraction.summary.totalRevenue,
          totalExpenses: extraction.summary.totalExpenses,
          totalNOI: extraction.summary.totalNOI,
          periodsExtracted: extraction.summary.periodsExtracted,
          dataQuality: extraction.summary.dataQuality,
        } : null,
      });

      console.log('  Executive Summary:', aiSummary.executiveSummary.substring(0, 100) + '...');
      console.log('  Key Findings:', aiSummary.keyFindings.length);
      console.log('  Risk Factors:', aiSummary.riskFactors.length);
      console.log('  Confidence:', (aiSummary.confidence * 100).toFixed(0) + '%');
    } catch (summaryError) {
      console.error('AI summary generation error:', summaryError);
      // Generate quick summary as fallback
      const quickSummary = generateQuickSummary({
        facilities: facilities.map(f => ({
          name: f.name,
          ccn: f.ccn,
          cmsData: f.cmsData,
          metrics: f.metrics,
        })),
        perFileResults,
        crossReferenceResults,
        extractionSummary: extraction ? {
          totalRevenue: extraction.summary.totalRevenue,
          totalExpenses: extraction.summary.totalExpenses,
          totalNOI: extraction.summary.totalNOI,
          periodsExtracted: extraction.summary.periodsExtracted,
          dataQuality: extraction.summary.dataQuality,
        } : null,
      });
      aiSummary = {
        executiveSummary: quickSummary,
        keyFindings: [],
        riskFactors: [],
        dataQualityAssessment: 'Unable to generate full AI assessment',
        investmentHighlights: [],
        operationalInsights: [],
        recommendations: ['Manual review recommended'],
        confidence: 0.5,
      };
    }
    console.log('='.repeat(60));

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
      databasePopulation: populationResults.length > 0 ? {
        populated: true,
        facilities: populationResults,
        totalFinancialPeriods: populationResults.reduce((sum, r) => sum + r.financialPeriods, 0),
        totalCensusPeriods: populationResults.reduce((sum, r) => sum + r.censusPeriods, 0),
        totalPayerRates: populationResults.reduce((sum, r) => sum + r.payerRates, 0),
      } : undefined,
      crossReferenceValidation: crossReferenceResults ? {
        validated: true,
        overallConfidence: crossReferenceResults.overallConfidence,
        discrepancyCount: crossReferenceResults.discrepancies.length,
        corroborationCount: crossReferenceResults.corroborations.length,
        highSeverityIssues: crossReferenceResults.summaryMetrics.highSeverityDiscrepancies,
        recommendations: crossReferenceResults.recommendations,
        details: crossReferenceResults,
      } : undefined,
      aiSummary: aiSummary || undefined,
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
