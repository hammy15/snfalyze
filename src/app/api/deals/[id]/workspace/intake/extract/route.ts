/**
 * Workspace Intake Document Extraction
 *
 * Accepts file uploads dropped into Deal Intake stage,
 * extracts financial/operational data via vision API,
 * and auto-fills intake fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, dealWorkspaceStages, dealActivities } from '@/db';
import { eq, and } from 'drizzle-orm';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Forward files to the vision extraction endpoint
    const extractionFormData = new FormData();
    for (const file of files) {
      extractionFormData.append('files', file);
    }
    extractionFormData.append('dealId', dealId);

    const baseUrl = request.nextUrl.origin;
    const extractionRes = await fetch(`${baseUrl}/api/extraction/vision`, {
      method: 'POST',
      body: extractionFormData,
    });

    if (!extractionRes.ok) {
      const errBody = await extractionRes.text();
      return NextResponse.json(
        { error: 'Extraction failed', details: errBody },
        { status: 500 }
      );
    }

    const extractionData = await extractionRes.json();

    // Map extracted data to intake fields
    const autoFill: Record<string, Record<string, unknown>> = {};

    if (extractionData.facilities && extractionData.facilities.length > 0) {
      const facility = extractionData.facilities[0];

      // Financial snapshot from extracted line items
      if (facility.lineItems?.length > 0) {
        const financialSnapshot: Record<string, unknown> = {};

        for (const item of facility.lineItems) {
          const label = (item.label || '').toLowerCase();
          const value = item.values?.[0]?.value;
          if (!value) continue;

          if (label.includes('total revenue') || label.includes('net revenue') || label.includes('total patient revenue')) {
            financialSnapshot.ttmRevenue = Number(value);
          } else if (label.includes('ebitda') || label.includes('ebitdar')) {
            financialSnapshot.ttmEbitda = Number(value);
          } else if (label.includes('normalized ebitda')) {
            financialSnapshot.normalizedEbitda = Number(value);
          }
        }

        if (Object.keys(financialSnapshot).length > 0) {
          autoFill.financialSnapshot = financialSnapshot;
        }
      }

      // Census data → payer mix
      if (facility.census) {
        const census = facility.census;
        const financialSnapshot = autoFill.financialSnapshot || {};
        if (census.totalPatientDays) {
          financialSnapshot.ttmTotalCensusAdc = Math.round(census.totalPatientDays / 365);
        }
        if (census.medicarePercentage) financialSnapshot.medicareCensusPercent = census.medicarePercentage;
        if (census.medicaidPercentage) financialSnapshot.medicaidCensusPercent = census.medicaidPercentage;
        if (census.privatePay) financialSnapshot.privatePayCensusPercent = census.privatePay;
        autoFill.financialSnapshot = financialSnapshot;
      }

      // Facility name if present
      if (facility.name) {
        autoFill.facilityIdentification = {
          facilityName: facility.name,
          ...(facility.licensedBeds ? { licensedBeds: facility.licensedBeds } : {}),
        };
      }
    }

    // Merge extracted data into current stage data
    if (Object.keys(autoFill).length > 0) {
      const [currentStage] = await db
        .select()
        .from(dealWorkspaceStages)
        .where(
          and(
            eq(dealWorkspaceStages.dealId, dealId),
            eq(dealWorkspaceStages.stage, 'deal_intake')
          )
        );

      if (currentStage) {
        const currentData = (currentStage.stageData || {}) as Record<string, unknown>;
        const merged = deepMerge(currentData, autoFill);

        await db
          .update(dealWorkspaceStages)
          .set({
            stageData: merged,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(dealWorkspaceStages.dealId, dealId),
              eq(dealWorkspaceStages.stage, 'deal_intake')
            )
          );
      }

      // Log activity
      await db.insert(dealActivities).values({
        dealId,
        type: 'document_upload',
        title: `${files.length} document(s) extracted into Deal Intake`,
        description: `Auto-filled: ${Object.keys(autoFill).join(', ')}`,
        metadata: {
          fileNames: files.map(f => f.name),
          fieldsExtracted: Object.keys(autoFill),
        },
        userName: 'Vision AI',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        filesProcessed: files.length,
        autoFill,
        extractionSummary: {
          facilities: extractionData.facilities?.length || 0,
          lineItems: extractionData.facilities?.[0]?.lineItems?.length || 0,
          sheets: extractionData.sheets?.length || 0,
          confidence: extractionData.confidence || null,
        },
      },
    });
  } catch (error) {
    console.error('Intake extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract document data' },
      { status: 500 }
    );
  }
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
      target[key] && typeof target[key] === 'object' && !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key] as Record<string, unknown>, source[key] as Record<string, unknown>);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
