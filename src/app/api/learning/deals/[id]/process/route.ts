import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { historicalDeals, historicalDealFiles, historicalDealFacilities, aggregatedPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { extractSmartExcel } from '@/lib/extraction/smart-excel';
import { extractExcelFile } from '@/lib/extraction/excel-extractor';
import { parseCompletedProforma } from '@/lib/learning/proforma-parser';
import { reverseEngineer } from '@/lib/learning/reverse-engineer';
import { extractPreferenceDataPoints, aggregatePreferences as aggPrefs } from '@/lib/learning/pattern-aggregator';
import type { SmartExtractionResult } from '@/lib/extraction/smart-excel/types';
import type { ComparisonResult, FacilityComparison, DetectedPreferences } from '@/lib/learning/types';
import { readFile } from 'fs/promises';

/**
 * POST /api/learning/deals/[id]/process — Trigger the extraction → comparison → learning pipeline
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get deal and files
    const [deal] = await db.select().from(historicalDeals).where(eq(historicalDeals.id, id));
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    const files = await db.select().from(historicalDealFiles).where(eq(historicalDealFiles.historicalDealId, id));
    if (files.length === 0) {
      return NextResponse.json({ success: false, error: 'No files uploaded' }, { status: 400 });
    }

    // Phase 1: Extract raw source files
    await db.update(historicalDeals).set({ status: 'extracting' }).where(eq(historicalDeals.id, id));

    const rawFiles = files.filter(f => f.fileRole === 'raw_source');
    let rawExtraction: SmartExtractionResult | null = null;

    if (rawFiles.length > 0) {
      const extractedFiles = [];
      for (const rf of rawFiles) {
        if (rf.storagePath) {
          const extracted = await extractExcelFile(rf.storagePath, rf.id, rf.filename);
          extractedFiles.push(extracted);
        }
      }

      if (extractedFiles.length > 0) {
        rawExtraction = await extractSmartExcel({ files: extractedFiles });
        await db.update(historicalDeals).set({ rawExtraction: rawExtraction as unknown as Record<string, unknown> }).where(eq(historicalDeals.id, id));
      }
    }

    // Phase 2: Parse completed proforma
    const proformaFiles = files.filter(f => f.fileRole === 'completed_proforma');
    let proformaData = null;

    if (proformaFiles.length > 0 && proformaFiles[0].storagePath) {
      const buffer = await readFile(proformaFiles[0].storagePath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheets = workbook.SheetNames.map(name => ({
        name,
        data: XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }) as (string | number | null)[][],
      }));
      proformaData = parseCompletedProforma(sheets);
      await db.update(historicalDeals).set({ proformaExtraction: proformaData as unknown as Record<string, unknown> }).where(eq(historicalDeals.id, id));
    }

    // Phase 3: Parse value assessment
    const valFiles = files.filter(f => f.fileRole === 'value_assessment');
    let valuationData = null;

    if (valFiles.length > 0 && rawExtraction?.assetValuation) {
      // Use existing asset valuation parser result if available
      valuationData = {
        facilities: rawExtraction.assetValuation.entries?.map(e => ({
          facilityName: e.facilityName,
          beds: e.beds,
          propertyType: e.propertyType as string,
          sncPercent: e.sncPercent,
          ebitdar: e.ebitdar2025 || e.ebitdar2026,
          ebitda: e.ebitda2025 || e.ebitda2026,
          netIncome: e.netIncome2025 || e.netIncome2026,
          capRate: e.capRate,
          multiplier: e.multiplier,
          valuation: e.value2025 || e.value2026 || 0,
          pricePerBed: e.valuePerBed2025 || e.valuePerBed2026,
          state: e.state,
        })) || [],
        portfolioTotal: rawExtraction.assetValuation.portfolioTotal.totalValue,
        confidence: 0.8,
        warnings: [],
      };
      await db.update(historicalDeals).set({ valuationExtraction: valuationData as unknown as Record<string, unknown> }).where(eq(historicalDeals.id, id));
    }

    // Phase 3.5: Parse raw source files with proforma parser as fallback
    // SmartExcel is designed for T13/asset valuation extraction, not per-facility P&L.
    // When raw files have the same multi-sheet P&L format, parse them the same way.
    let rawParsedData = null;
    if (rawFiles.length > 0 && rawFiles[0].storagePath) {
      const rawBuffer = await readFile(rawFiles[0].storagePath);
      const rawWorkbook = XLSX.read(rawBuffer, { type: 'buffer' });
      const rawSheets = rawWorkbook.SheetNames.map(name => ({
        name,
        data: XLSX.utils.sheet_to_json(rawWorkbook.Sheets[name], { header: 1 }) as (string | number | null)[][],
      }));
      rawParsedData = parseCompletedProforma(rawSheets);
    }

    // Phase 4: Compare (Reverse Engineer) — direct facility-level comparison
    await db.update(historicalDeals).set({ status: 'comparing' }).where(eq(historicalDeals.id, id));

    let comparisonResult: ComparisonResult | null = null;

    // Prefer direct proforma-parser comparison (raw parsed vs proforma parsed)
    if (rawParsedData && proformaData && rawParsedData.facilities.length > 0 && proformaData.facilities.length > 0) {
      // Direct facility matching using proforma-parsed data from both sides
      const facilities = [];
      const warnings: string[] = [];

      for (const pfFacility of proformaData.facilities) {
        // Find matching raw facility by name (fuzzy)
        const pfNameLower = pfFacility.facilityName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const rawMatch = rawParsedData.facilities.find(rf => {
          const rawNameLower = rf.facilityName.toLowerCase().replace(/[^a-z0-9]/g, '');
          return rawNameLower === pfNameLower ||
            rawNameLower.includes(pfNameLower) ||
            pfNameLower.includes(rawNameLower);
        });

        if (!rawMatch) {
          warnings.push(`No raw data match found for proforma facility: ${pfFacility.facilityName}`);
        }

        const rawRev = rawMatch?.revenue || 0;
        const rawExp = rawMatch?.expenses || 0;
        const rawEbitdar = rawMatch?.ebitdar || 0;
        const pfRev = pfFacility.revenue;
        const pfExp = pfFacility.expenses;
        const pfEbitdar = pfFacility.ebitdar;

        // Detect normalization preferences
        const detectedPreferences: DetectedPreferences = {};

        if (rawRev > 0 && pfRev > 0) {
          const revGrowth = (pfRev - rawRev) / rawRev;
          if (Math.abs(revGrowth) > 0.001) detectedPreferences.revenueGrowthRate = revGrowth;
        }
        if (rawExp > 0 && pfExp > 0) {
          const expGrowth = (pfExp - rawExp) / rawExp;
          if (Math.abs(expGrowth) > 0.001) detectedPreferences.expenseGrowthRate = expGrowth;
        }
        if (rawMatch?.occupancy && pfFacility.occupancy && pfFacility.occupancy !== rawMatch.occupancy) {
          detectedPreferences.occupancyAssumption = pfFacility.occupancy;
        }

        // Detect mgmt fee % from proforma line items
        const mgmtItem = pfFacility.lineItems.find(li => li.label.toLowerCase().includes('management fee'));
        if (mgmtItem && pfRev > 0) {
          detectedPreferences.managementFeePercent = Math.abs(mgmtItem.annualValue) / pfRev;
        }

        const rawEbitda = rawMatch?.ebitda || rawEbitdar;
        const rawNI = rawMatch?.netIncome || rawEbitda;
        const pfEbitda = pfFacility.ebitda || pfEbitdar;
        const pfNI = pfFacility.netIncome || pfEbitda;

        const facility: FacilityComparison = {
          facilityName: pfFacility.facilityName,
          assetType: deal.assetType,
          state: deal.primaryState ?? undefined,
          beds: pfFacility.beds || rawMatch?.beds,
          propertyType: 'SNF-Owned',
          raw: {
            revenue: rawRev,
            expenses: rawExp,
            ebitdar: rawEbitdar,
            ebitda: rawEbitda,
            netIncome: rawNI,
            occupancy: rawMatch?.occupancy,
            lineItems: [],
          },
          proforma: {
            revenue: pfRev,
            expenses: pfExp,
            ebitdar: pfEbitdar,
            ebitda: pfEbitda,
            netIncome: pfNI,
            occupancy: pfFacility.occupancy,
            lineItems: [],
          },
          adjustments: [],
          valuation: {
            userValue: 0,
            systemValue: 0,
            userCapRate: undefined,
            impliedCapRate: pfEbitdar > 0 ? 0.125 : undefined,
            userMultiplier: undefined,
            delta: 0,
            deltaPercent: 0,
          },
          detectedPreferences,
        };
        facilities.push(facility);
      }

      comparisonResult = {
        historicalDealId: id,
        facilities,
        portfolioSummary: {
          totalRawRevenue: facilities.reduce((s, f) => s + f.raw.revenue, 0),
          totalProformaRevenue: facilities.reduce((s, f) => s + f.proforma.revenue, 0),
          totalRawEbitdar: facilities.reduce((s, f) => s + f.raw.ebitdar, 0),
          totalProformaEbitdar: facilities.reduce((s, f) => s + f.proforma.ebitdar, 0),
          totalUserValuation: 0,
          totalSystemValuation: 0,
          totalBeds: facilities.reduce((s, f) => s + (f.beds || 0), 0),
          facilityCount: facilities.length,
        },
        confidence: Math.min(0.9, 0.5 + facilities.length * 0.05),
        warnings,
      } satisfies ComparisonResult;
      await db.update(historicalDeals).set({ comparisonResult: comparisonResult as unknown as Record<string, unknown> }).where(eq(historicalDeals.id, id));

      // Store per-facility data
      for (const fc of comparisonResult.facilities) {
        await db.insert(historicalDealFacilities).values({
          historicalDealId: id,
          facilityName: fc.facilityName,
          assetType: fc.assetType || deal.assetType,
          state: fc.state || deal.primaryState,
          beds: fc.beds,
          propertyType: fc.propertyType,
          rawFinancials: fc.raw as unknown as Record<string, unknown>,
          rawEbitdar: fc.raw.ebitdar?.toString(),
          rawOccupancy: fc.raw.occupancy?.toString(),
          proformaFinancials: fc.proforma as unknown as Record<string, unknown>,
          proformaEbitdar: fc.proforma.ebitdar?.toString(),
          proformaOccupancy: fc.proforma.occupancy?.toString(),
          userValuation: fc.valuation.userValue?.toString(),
          userCapRate: fc.valuation.userCapRate?.toString(),
          userMultiplier: fc.valuation.userMultiplier?.toString(),
          systemValuation: fc.valuation.systemValue?.toString(),
          systemCapRate: fc.valuation.impliedCapRate?.toString(),
          valuationDelta: fc.valuation.delta?.toString(),
          valuationDeltaPercent: fc.valuation.deltaPercent?.toString(),
          mgmtFeePercent: fc.detectedPreferences.managementFeePercent?.toString(),
          agencyPercent: fc.detectedPreferences.agencyTargetPercent?.toString(),
          capexReservePercent: fc.detectedPreferences.capexReservePercent?.toString(),
          revenueGrowthRate: fc.detectedPreferences.revenueGrowthRate?.toString(),
          expenseGrowthRate: fc.detectedPreferences.expenseGrowthRate?.toString(),
          occupancyAssumption: fc.detectedPreferences.occupancyAssumption?.toString(),
        });
      }
    } else if (rawExtraction && proformaData) {
      // Fallback: use SmartExcel extraction for raw side (original approach)
      comparisonResult = reverseEngineer(rawExtraction, proformaData, valuationData, id);
      await db.update(historicalDeals).set({ comparisonResult: comparisonResult as unknown as Record<string, unknown> }).where(eq(historicalDeals.id, id));

      for (const fc of comparisonResult.facilities) {
        await db.insert(historicalDealFacilities).values({
          historicalDealId: id,
          facilityName: fc.facilityName,
          assetType: fc.assetType || deal.assetType,
          state: fc.state || deal.primaryState,
          beds: fc.beds,
          propertyType: fc.propertyType,
          rawFinancials: fc.raw as unknown as Record<string, unknown>,
          rawEbitdar: fc.raw.ebitdar?.toString(),
          rawOccupancy: fc.raw.occupancy?.toString(),
          proformaFinancials: fc.proforma as unknown as Record<string, unknown>,
          proformaEbitdar: fc.proforma.ebitdar?.toString(),
          proformaOccupancy: fc.proforma.occupancy?.toString(),
          userValuation: fc.valuation.userValue?.toString(),
          userCapRate: fc.valuation.userCapRate?.toString(),
          userMultiplier: fc.valuation.userMultiplier?.toString(),
          systemValuation: fc.valuation.systemValue?.toString(),
          systemCapRate: fc.valuation.impliedCapRate?.toString(),
          valuationDelta: fc.valuation.delta?.toString(),
          valuationDeltaPercent: fc.valuation.deltaPercent?.toString(),
          mgmtFeePercent: fc.detectedPreferences.managementFeePercent?.toString(),
          agencyPercent: fc.detectedPreferences.agencyTargetPercent?.toString(),
          capexReservePercent: fc.detectedPreferences.capexReservePercent?.toString(),
          revenueGrowthRate: fc.detectedPreferences.revenueGrowthRate?.toString(),
          expenseGrowthRate: fc.detectedPreferences.expenseGrowthRate?.toString(),
          occupancyAssumption: fc.detectedPreferences.occupancyAssumption?.toString(),
        });
      }
    }

    // Phase 5: Learn (Aggregate)
    await db.update(historicalDeals).set({ status: 'learning' }).where(eq(historicalDeals.id, id));

    if (comparisonResult) {
      const dataPoints = extractPreferenceDataPoints(comparisonResult);
      const aggregated = aggPrefs(dataPoints);

      // Upsert aggregated preferences
      for (const pref of aggregated) {
        // Simple insert (in production, use upsert based on dimension key)
        await db.insert(aggregatedPreferences).values({
          assetType: pref.assetType as 'SNF' | 'ALF' | 'ILF' | 'HOSPICE',
          state: pref.state,
          region: pref.region,
          preferenceKey: pref.preferenceKey,
          avgValue: pref.avgValue.toString(),
          medianValue: pref.medianValue.toString(),
          minValue: pref.minValue.toString(),
          maxValue: pref.maxValue.toString(),
          stdDev: pref.stdDev.toString(),
          sampleCount: pref.sampleCount,
          confidence: pref.confidence.toString(),
          sourceDealIds: pref.sourceDealIds,
        });
      }
    }

    // Phase 6: Complete
    await db.update(historicalDeals).set({
      status: 'complete',
      completedAt: new Date(),
    }).where(eq(historicalDeals.id, id));

    return NextResponse.json({
      success: true,
      data: {
        dealId: id,
        status: 'complete',
        facilitiesProcessed: comparisonResult?.facilities.length || 0,
        warnings: comparisonResult?.warnings || [],
      },
    });
  } catch (error) {
    console.error('Error processing historical deal:', error);

    // Mark as error
    const { id } = await params;
    await db.update(historicalDeals).set({ status: 'error' }).where(eq(historicalDeals.id, id));

    return NextResponse.json(
      { success: false, error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
