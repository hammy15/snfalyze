/**
 * Deep Document Extraction API
 *
 * Uses the per-file extraction pipeline to extract:
 * - Financial periods (P&L data)
 * - Census periods (patient days by payer)
 * - Payer rates (PPD rates)
 *
 * Populates the appropriate database tables and triggers SLB recalculation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import {
  documents,
  facilities,
  financialPeriods,
  facilityCensusPeriods,
  facilityPayerRates,
} from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { extractPLData, type FinancialPeriod } from '@/lib/extraction/pl-extractor';
import { extractCensusData, type CensusPeriod } from '@/lib/extraction/census-extractor';
import { extractRatesFromText, extractRatesFromTable, type PayerRate } from '@/lib/extraction/rate-extractor';

// Sheet type classification
function classifySheetType(data: any[][], sheetName: string): 'pl' | 'census' | 'rates' | 'unknown' {
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: documentId } = await params;
    const body = await request.json().catch(() => ({}));
    const { facilityId, dealId } = body as { facilityId?: string; dealId?: string };

    // Get document with extracted data
    const [document] = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'Document not found' },
        { status: 404 }
      );
    }

    const extractedData = document.extractedData as Record<string, any> | null;
    const sheets = extractedData?.sheets as Record<string, any[][]> | undefined;

    if (!sheets || Object.keys(sheets).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No sheet data available for extraction' },
        { status: 400 }
      );
    }

    // Get facility for this document (if facilityId provided or can be inferred)
    let facility = null;
    if (facilityId) {
      [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.id, facilityId))
        .limit(1);
    } else if (document.dealId) {
      // Get first facility for the deal
      [facility] = await db
        .select()
        .from(facilities)
        .where(eq(facilities.dealId, document.dealId))
        .limit(1);
    }

    const results = {
      financialPeriodsCreated: 0,
      censusPeriodsCreated: 0,
      payerRatesCreated: 0,
      sheetsProcessed: 0,
      warnings: [] as string[],
      details: {
        financial: [] as any[],
        census: [] as any[],
        rates: [] as any[],
      },
    };

    // Process each sheet
    for (const [sheetName, sheetData] of Object.entries(sheets)) {
      if (!Array.isArray(sheetData) || sheetData.length < 2) continue;

      const sheetType = classifySheetType(sheetData, sheetName);
      results.sheetsProcessed++;

      try {
        switch (sheetType) {
          case 'pl': {
            const plData = extractPLData(sheetData, sheetName, []);
            for (const period of plData) {
              if (!facility) {
                results.warnings.push(`No facility found for P&L data from ${sheetName}`);
                continue;
              }

              try {
                await db.insert(financialPeriods).values({
                  dealId: dealId || document.dealId || facility.dealId,
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
                results.financialPeriodsCreated++;
                results.details.financial.push({
                  period: period.periodLabel,
                  revenue: period.totalRevenue,
                  ebitdar: period.ebitdar,
                });
              } catch (err: any) {
                if (err.code !== '23505') { // Skip duplicate key errors
                  results.warnings.push(`Error inserting financial period: ${err.message}`);
                }
              }
            }
            break;
          }

          case 'census': {
            const censusData = extractCensusData(sheetData, sheetName, []);
            for (const census of censusData) {
              if (!facility) {
                results.warnings.push(`No facility found for census data from ${sheetName}`);
                continue;
              }

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
                results.censusPeriodsCreated++;
                results.details.census.push({
                  period: census.periodLabel,
                  totalDays: census.totalPatientDays,
                  adc: census.avgDailyCensus,
                });
              } catch (err: any) {
                if (err.code !== '23505') {
                  results.warnings.push(`Error inserting census period: ${err.message}`);
                }
              }
            }
            break;
          }

          case 'rates': {
            const rateData = extractRatesFromTable(sheetData, documentId, []);
            for (const rate of rateData) {
              if (!facility) {
                results.warnings.push(`No facility found for rate data from ${sheetName}`);
                continue;
              }

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
                results.payerRatesCreated++;
                results.details.rates.push({
                  effectiveDate: rate.effectiveDate.toISOString().split('T')[0],
                  medicareRate: rate.medicarePartAPpd,
                  medicaidRate: rate.medicaidPpd,
                });
              } catch (err: any) {
                if (err.code !== '23505') {
                  results.warnings.push(`Error inserting payer rate: ${err.message}`);
                }
              }
            }
            break;
          }

          default: {
            // Try to extract any data from unknown sheets
            const plData = extractPLData(sheetData, sheetName, []);
            const censusData = extractCensusData(sheetData, sheetName, []);

            if (plData.length > 0) {
              results.warnings.push(`Sheet "${sheetName}" had extractable P&L data`);
            }
            if (censusData.length > 0) {
              results.warnings.push(`Sheet "${sheetName}" had extractable census data`);
            }
            break;
          }
        }
      } catch (err) {
        results.warnings.push(`Error processing sheet "${sheetName}": ${err instanceof Error ? err.message : 'Unknown'}`);
      }
    }

    // Also try to extract rates from PDF text if available
    if (document.rawText && document.rawText.length > 100) {
      const pdfRates = extractRatesFromText(document.rawText, documentId, []);
      if (pdfRates.length > 0 && facility) {
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
            results.payerRatesCreated++;
          } catch (err: any) {
            if (err.code !== '23505') {
              results.warnings.push(`Error inserting PDF rate: ${err.message}`);
            }
          }
        }
      }
    }

    // Update document with extraction results
    await db
      .update(documents)
      .set({
        extractedData: {
          ...extractedData,
          deepExtraction: {
            completedAt: new Date().toISOString(),
            financialPeriodsCreated: results.financialPeriodsCreated,
            censusPeriodsCreated: results.censusPeriodsCreated,
            payerRatesCreated: results.payerRatesCreated,
          },
        },
      })
      .where(eq(documents.id, documentId));

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        facilityId: facility?.id,
        ...results,
      },
    });
  } catch (error) {
    console.error('Error in deep extraction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to perform deep extraction' },
      { status: 500 }
    );
  }
}
