import { NextRequest, NextResponse } from 'next/server';
import { db, capitalPartners, deals, saleLeaseback, facilities } from '@/db';
import { eq } from 'drizzle-orm';
import { DEFAULT_CAP_RATES, DEFAULT_MIN_COVERAGE_RATIOS, AssetType } from '@/lib/sale-leaseback';

interface RouteParams {
  params: Promise<{ id: string; dealId: string }>;
}

interface FitCriteria {
  name: string;
  partnerRequirement: string | number | null;
  dealValue: string | number | null;
  passes: boolean;
  importance: 'critical' | 'important' | 'nice_to_have';
  notes?: string;
}

// GET - Check if a deal fits partner criteria
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: partnerId, dealId } = await params;

    // Fetch partner
    const partner = await db.query.capitalPartners.findFirst({
      where: eq(capitalPartners.id, partnerId),
    });

    if (!partner) {
      return NextResponse.json({ success: false, error: 'Partner not found' }, { status: 404 });
    }

    // Fetch deal with facilities and sale-leaseback data
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: {
        facilities: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Fetch sale-leaseback records if applicable
    const slbRecords = await db
      .select()
      .from(saleLeaseback)
      .where(eq(saleLeaseback.dealId, dealId));

    // Calculate portfolio metrics
    const totalPurchasePrice = slbRecords.reduce(
      (sum, r) => sum + (Number(r.purchasePrice) || 0),
      0
    );
    const totalEbitdar = slbRecords.reduce(
      (sum, r) => sum + (Number(r.facilityEbitdar) || 0),
      0
    );
    const totalAnnualRent = slbRecords.reduce(
      (sum, r) => sum + (Number(r.annualRent) || 0),
      0
    );
    const portfolioCoverageRatio =
      totalAnnualRent > 0 ? totalEbitdar / totalAnnualRent : 0;

    // Build fit criteria evaluation
    const fitCriteria: FitCriteria[] = [];

    // 1. Deal Size Fit
    const minDealSize = partner.minDealSize ? Number(partner.minDealSize) : null;
    const maxDealSize = partner.maxDealSize ? Number(partner.maxDealSize) : null;
    const dealSizePasses =
      (!minDealSize || totalPurchasePrice >= minDealSize) &&
      (!maxDealSize || totalPurchasePrice <= maxDealSize);

    fitCriteria.push({
      name: 'Deal Size',
      partnerRequirement: minDealSize && maxDealSize
        ? `$${(minDealSize / 1000000).toFixed(1)}M - $${(maxDealSize / 1000000).toFixed(1)}M`
        : minDealSize
          ? `Min $${(minDealSize / 1000000).toFixed(1)}M`
          : maxDealSize
            ? `Max $${(maxDealSize / 1000000).toFixed(1)}M`
            : 'No limit',
      dealValue: `$${(totalPurchasePrice / 1000000).toFixed(1)}M`,
      passes: dealSizePasses,
      importance: 'critical',
    });

    // 2. Coverage Ratio
    const minCoverage = partner.minimumCoverageRatio
      ? Number(partner.minimumCoverageRatio)
      : DEFAULT_MIN_COVERAGE_RATIOS[deal.assetType as AssetType];
    const coveragePasses = portfolioCoverageRatio >= minCoverage;

    fitCriteria.push({
      name: 'EBITDAR Coverage',
      partnerRequirement: `${minCoverage.toFixed(2)}x minimum`,
      dealValue: `${portfolioCoverageRatio.toFixed(2)}x`,
      passes: coveragePasses,
      importance: 'critical',
      notes: coveragePasses
        ? undefined
        : `Coverage shortfall of ${(minCoverage - portfolioCoverageRatio).toFixed(2)}x`,
    });

    // 3. Asset Type Fit
    const partnerAssetTypes = partner.assetTypes || [];
    const assetTypePasses =
      partnerAssetTypes.length === 0 ||
      partnerAssetTypes.includes(deal.assetType as 'SNF' | 'ALF' | 'ILF');

    fitCriteria.push({
      name: 'Asset Type',
      partnerRequirement:
        partnerAssetTypes.length > 0 ? partnerAssetTypes.join(', ') : 'All types',
      dealValue: deal.assetType,
      passes: assetTypePasses,
      importance: 'critical',
    });

    // 4. Geography Fit
    const partnerGeographies = partner.geographies || [];
    const dealStates = [...new Set(deal.facilities.map((f) => f.state).filter(Boolean))];
    const geographyPasses =
      partnerGeographies.length === 0 ||
      dealStates.every((state) =>
        partnerGeographies.some(
          (g) => g.toLowerCase() === state?.toLowerCase() || g.toLowerCase() === 'national'
        )
      );

    fitCriteria.push({
      name: 'Geography',
      partnerRequirement:
        partnerGeographies.length > 0 ? partnerGeographies.join(', ') : 'Nationwide',
      dealValue: dealStates.join(', ') || 'Unknown',
      passes: geographyPasses,
      importance: 'important',
    });

    // 5. Deal Structure Fit
    const partnerStructures = partner.preferredDealStructures || [];
    const preferredStructure = partner.preferredStructure?.toLowerCase() || '';
    const dealStructure = deal.dealStructure || 'purchase';
    const structurePasses =
      partnerStructures.length === 0 ||
      partnerStructures.some((s) => s.toLowerCase().includes(dealStructure)) ||
      preferredStructure.includes(dealStructure.replace('_', ''));

    fitCriteria.push({
      name: 'Deal Structure',
      partnerRequirement:
        partnerStructures.length > 0
          ? partnerStructures.join(', ')
          : partner.preferredStructure || 'Any',
      dealValue: dealStructure.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      passes: structurePasses,
      importance: 'important',
    });

    // 6. Yield Fit (for sale-leaseback)
    if (deal.dealStructure === 'sale_leaseback' && partner.targetYield) {
      const targetYield = Number(partner.targetYield);
      const actualYield =
        totalPurchasePrice > 0 ? totalAnnualRent / totalPurchasePrice : 0;
      const yieldPasses = actualYield >= targetYield * 0.95; // Allow 5% tolerance

      fitCriteria.push({
        name: 'Yield',
        partnerRequirement: `${(targetYield * 100).toFixed(2)}% target`,
        dealValue: `${(actualYield * 100).toFixed(2)}%`,
        passes: yieldPasses,
        importance: 'important',
        notes: yieldPasses
          ? undefined
          : `${((targetYield - actualYield) * 100).toFixed(2)}% below target`,
      });
    }

    // 7. Risk Tolerance
    if (partner.riskTolerance) {
      // Simple check: if facilities have regulatory issues, check risk tolerance
      const hasRegulatoryIssues = deal.facilities.some(
        (f) => f.isSff || f.isSffWatch || f.hasImmediateJeopardy
      );

      const riskPasses =
        !hasRegulatoryIssues ||
        partner.riskTolerance === 'aggressive' ||
        (partner.riskTolerance === 'moderate' &&
          !deal.facilities.some((f) => f.isSff || f.hasImmediateJeopardy));

      fitCriteria.push({
        name: 'Risk Profile',
        partnerRequirement: partner.riskTolerance,
        dealValue: hasRegulatoryIssues ? 'Has regulatory concerns' : 'Clean',
        passes: riskPasses,
        importance: 'important',
        notes: hasRegulatoryIssues
          ? deal.facilities
              .filter((f) => f.isSff || f.isSffWatch || f.hasImmediateJeopardy)
              .map((f) => f.name)
              .join(', ') + ' have issues'
          : undefined,
      });
    }

    // Calculate overall fit score
    const criticalCriteria = fitCriteria.filter((c) => c.importance === 'critical');
    const importantCriteria = fitCriteria.filter((c) => c.importance === 'important');

    const criticalPasses = criticalCriteria.filter((c) => c.passes).length;
    const importantPasses = importantCriteria.filter((c) => c.passes).length;

    const allCriticalPass = criticalPasses === criticalCriteria.length;
    const fitScore =
      (criticalPasses / Math.max(criticalCriteria.length, 1)) * 60 +
      (importantPasses / Math.max(importantCriteria.length, 1)) * 40;

    // Determine overall verdict
    let verdict: 'strong_fit' | 'potential_fit' | 'weak_fit' | 'no_fit';
    let verdictMessage: string;

    if (allCriticalPass && fitScore >= 80) {
      verdict = 'strong_fit';
      verdictMessage = `Strong fit: Deal meets all critical requirements and scores ${fitScore.toFixed(0)}%`;
    } else if (allCriticalPass && fitScore >= 60) {
      verdict = 'potential_fit';
      verdictMessage = `Potential fit: Deal meets critical requirements but has some gaps. Score: ${fitScore.toFixed(0)}%`;
    } else if (criticalPasses >= criticalCriteria.length - 1) {
      verdict = 'weak_fit';
      verdictMessage = `Weak fit: Deal fails ${criticalCriteria.length - criticalPasses} critical requirement(s). May need restructuring.`;
    } else {
      verdict = 'no_fit';
      verdictMessage = `No fit: Deal fails ${criticalCriteria.length - criticalPasses} critical requirement(s). Not recommended.`;
    }

    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: partner.id,
          name: partner.name,
          type: partner.type,
        },
        deal: {
          id: deal.id,
          name: deal.name,
          dealStructure: deal.dealStructure,
          totalPurchasePrice,
          portfolioCoverageRatio,
        },
        fitAnalysis: {
          verdict,
          verdictMessage,
          fitScore: Math.round(fitScore),
          criteria: fitCriteria,
          summary: {
            criticalPassing: criticalPasses,
            criticalTotal: criticalCriteria.length,
            importantPassing: importantPasses,
            importantTotal: importantCriteria.length,
          },
        },
      },
    });
  } catch (error) {
    console.error('Error checking partner fit:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check partner fit' },
      { status: 500 }
    );
  }
}
