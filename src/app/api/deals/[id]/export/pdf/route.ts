import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities, saleLeaseback, financialPeriods, capitalPartners } from '@/db';
import { eq, desc } from 'drizzle-orm';
import {
  portfolioAnalyzer,
  DEFAULT_CAP_RATES,
  DEFAULT_MIN_COVERAGE_RATIOS,
  type PortfolioFacility,
  type PortfolioAnalysisInput,
  type AssetType,
} from '@/lib/sale-leaseback';
import { PDFReportGenerator } from '@/lib/export/pdf/pdf-generator';
import type { FacilityExportData, ExportInput } from '@/lib/export/excel/workbook-builder';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: dealId } = await params;

    // Fetch deal with all related data
    const deal = await db.query.deals.findFirst({
      where: eq(deals.id, dealId),
      with: {
        facilities: true,
        buyerPartner: true,
      },
    });

    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Fetch sale-leaseback records
    const slbRecords = await db
      .select()
      .from(saleLeaseback)
      .where(eq(saleLeaseback.dealId, dealId));

    // Fetch financial data for each facility
    const facilityData: FacilityExportData[] = await Promise.all(
      deal.facilities.map(async (facility) => {
        const periods = await db
          .select()
          .from(financialPeriods)
          .where(eq(financialPeriods.facilityId, facility.id))
          .orderBy(desc(financialPeriods.periodEnd))
          .limit(1);

        const financials = periods[0];
        const slbRecord = slbRecords.find((r) => r.facilityId === facility.id);

        // Get default values if not calculated
        const capRate =
          slbRecord?.appliedCapRate !== null
            ? Number(slbRecord?.appliedCapRate)
            : DEFAULT_CAP_RATES[facility.assetType as AssetType];
        const yieldReq =
          slbRecord?.buyerYieldRequirement !== null
            ? Number(slbRecord?.buyerYieldRequirement)
            : capRate;

        const propertyNoi = financials?.noi ? Number(financials.noi) : 0;
        const ebitdar = financials?.ebitdar ? Number(financials.ebitdar) : 0;
        const totalRevenue = financials?.totalRevenue ? Number(financials.totalRevenue) : 0;

        // Calculate SLB values if not already stored
        const purchasePrice = slbRecord?.purchasePrice
          ? Number(slbRecord.purchasePrice)
          : propertyNoi / capRate;
        const annualRent = slbRecord?.annualRent
          ? Number(slbRecord.annualRent)
          : purchasePrice * yieldReq;
        const coverageRatio = slbRecord?.coverageRatio
          ? Number(slbRecord.coverageRatio)
          : annualRent > 0
            ? ebitdar / annualRent
            : 0;

        return {
          id: facility.id,
          name: facility.name,
          assetType: facility.assetType as 'SNF' | 'ALF' | 'ILF',
          beds: facility.licensedBeds || 0,
          state: facility.state || undefined,
          city: facility.city || undefined,
          financials: {
            totalRevenue,
            medicareRevenue: financials?.medicareRevenue
              ? Number(financials.medicareRevenue)
              : undefined,
            medicaidRevenue: financials?.medicaidRevenue
              ? Number(financials.medicaidRevenue)
              : undefined,
            managedCareRevenue: financials?.managedCareRevenue
              ? Number(financials.managedCareRevenue)
              : undefined,
            privatePayRevenue: financials?.privatePayRevenue
              ? Number(financials.privatePayRevenue)
              : undefined,
            totalExpenses: financials?.totalExpenses ? Number(financials.totalExpenses) : 0,
            laborCost: financials?.laborCost ? Number(financials.laborCost) : undefined,
            foodCost: financials?.foodCost ? Number(financials.foodCost) : undefined,
            suppliesCost: financials?.suppliesCost
              ? Number(financials.suppliesCost)
              : undefined,
            utilitiesCost: financials?.utilitiesCost
              ? Number(financials.utilitiesCost)
              : undefined,
            insuranceCost: financials?.insuranceCost
              ? Number(financials.insuranceCost)
              : undefined,
            managementFee: financials?.managementFee
              ? Number(financials.managementFee)
              : undefined,
            otherExpenses: financials?.otherExpenses
              ? Number(financials.otherExpenses)
              : undefined,
            noi: propertyNoi,
            ebitdar,
            occupancyRate: financials?.occupancyRate
              ? Number(financials.occupancyRate)
              : undefined,
            periodStart: financials?.periodStart || undefined,
            periodEnd: financials?.periodEnd || undefined,
          },
          saleLeasebackResult: {
            facilityId: facility.id,
            facilityName: facility.name,
            beds: facility.licensedBeds || 0,
            purchasePrice,
            annualRent,
            monthlyRent: annualRent / 12,
            coverageRatio,
            coveragePassFail:
              coverageRatio >=
              DEFAULT_MIN_COVERAGE_RATIOS[facility.assetType as AssetType],
            operatorCashFlowAfterRent: ebitdar - annualRent,
            effectiveRentPerBed:
              facility.licensedBeds && facility.licensedBeds > 0
                ? annualRent / facility.licensedBeds
                : 0,
            rentAsPercentOfRevenue: totalRevenue > 0 ? annualRent / totalRevenue : 0,
            impliedYieldOnCost: purchasePrice > 0 ? annualRent / purchasePrice : 0,
            spreadOverCapRate: yieldReq - capRate,
          },
        };
      })
    );

    // Get assumptions from first SLB record or defaults
    const firstSlb = slbRecords[0];
    const assetType = deal.assetType as AssetType;
    const capRate = firstSlb?.appliedCapRate
      ? Number(firstSlb.appliedCapRate)
      : DEFAULT_CAP_RATES[assetType];
    const buyerYieldRequirement = firstSlb?.buyerYieldRequirement
      ? Number(firstSlb.buyerYieldRequirement)
      : capRate;
    const minimumCoverageRatio = deal.buyerPartner?.minimumCoverageRatio
      ? Number(deal.buyerPartner.minimumCoverageRatio)
      : DEFAULT_MIN_COVERAGE_RATIOS[assetType];
    const leaseTermYears = firstSlb?.leaseTermYears || 15;
    const rentEscalation = firstSlb?.rentEscalation
      ? Number(firstSlb.rentEscalation)
      : 0.025;

    // Run portfolio analysis
    const portfolioFacilities: PortfolioFacility[] = facilityData.map((f) => ({
      id: f.id,
      name: f.name,
      assetType: f.assetType,
      beds: f.beds,
      propertyNOI: f.financials.noi,
      facilityEbitdar: f.financials.ebitdar,
      totalRevenue: f.financials.totalRevenue,
      capRate,
      state: f.state,
      city: f.city,
    }));

    const portfolioInput: PortfolioAnalysisInput = {
      facilities: portfolioFacilities,
      buyerYieldRequirement,
      minimumCoverageRatio,
      leaseTermYears,
      rentEscalation,
    };

    const portfolioResult = portfolioAnalyzer.analyzePortfolio(portfolioInput);

    // Build export input
    const exportInput: ExportInput = {
      dealName: deal.name,
      dealId: deal.id,
      assetType,
      facilities: facilityData,
      portfolioResult,
      assumptions: {
        capRate,
        buyerYieldRequirement,
        minimumCoverageRatio,
        leaseTermYears,
        rentEscalation,
        discountRate: 0.08,
      },
      buyerPartner: deal.buyerPartner
        ? {
            name: deal.buyerPartner.name,
            minimumCoverageRatio: deal.buyerPartner.minimumCoverageRatio
              ? Number(deal.buyerPartner.minimumCoverageRatio)
              : undefined,
            targetYield: deal.buyerPartner.targetYield
              ? Number(deal.buyerPartner.targetYield)
              : undefined,
          }
        : undefined,
    };

    // Build PDF report
    const generator = new PDFReportGenerator();
    generator.buildSaleLeasebackReport(exportInput);
    const buffer = generator.exportToBuffer();

    // Generate filename
    const sanitizedName = deal.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${sanitizedName}_sale_leaseback_report_${timestamp}.pdf`;

    // Return file response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export to PDF' },
      { status: 500 }
    );
  }
}
