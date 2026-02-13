import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities } from '@/db';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch deal
    const [deal] = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
    if (!deal) {
      return NextResponse.json({ success: false, error: 'Deal not found' }, { status: 404 });
    }

    // Fetch facilities
    const dealFacilities = await db.select().from(facilities).where(eq(facilities.dealId, id));

    // Fetch score
    let score = 0, confidence = 0, recommendation = 'reprice', riskFactors: string[] = [], upsideFactors: string[] = [];
    try {
      const scoreUrl = new URL(`/api/deals/${id}/score`, request.url);
      const scoreRes = await fetch(scoreUrl.toString());
      if (scoreRes.ok) {
        const scoreData = await scoreRes.json();
        if (scoreData.success && scoreData.data) {
          score = scoreData.data.portfolioScore || 0;
          confidence = scoreData.data.confidenceScore || 0;
          recommendation = scoreData.data.recommendation || 'reprice';
          riskFactors = scoreData.data.riskFactors || [];
          upsideFactors = scoreData.data.upsideFactors || [];
        }
      }
    } catch {}

    // Fetch rent suggestions for valuation data
    let valuationLow = 0, valuationMid = 0, valuationHigh = 0;
    let pricePerBed = 0, coverage = 0, annualRent = 0, capRate = 0;
    try {
      const rentUrl = new URL(`/api/deals/${id}/rent-suggestions`, request.url);
      const rentRes = await fetch(rentUrl.toString());
      if (rentRes.ok) {
        const rentData = await rentRes.json();
        if (rentData.success && rentData.data?.portfolio) {
          const p = rentData.data.portfolio;
          valuationLow = p.purchasePriceRange?.low || 0;
          valuationMid = p.purchasePriceRange?.mid || 0;
          valuationHigh = p.purchasePriceRange?.high || 0;
          pricePerBed = p.blendedPricePerBed || 0;
          coverage = p.weightedCoverage || 0;
          annualRent = p.totalAnnualRent || 0;
          capRate = p.weightedCapRate || 0;
        }
      }
    } catch {}

    // Build PDF data
    const pdfData = {
      dealName: deal.name,
      dealId: `CAS-${new Date().getFullYear()}-${id.slice(0, 4).toUpperCase()}`,
      assetTypes: [deal.assetType || 'SNF'],
      facilityCount: dealFacilities.length || 1,
      totalBeds: deal.beds || 0,
      states: deal.primaryState ? [deal.primaryState] : [],
      askingPrice: Number(deal.askingPrice) || 0,
      score,
      confidence,
      recommendation,
      riskFactors,
      upsideFactors,
      valuationLow,
      valuationMid,
      valuationHigh,
      pricePerBed,
      coverage,
      annualRent,
      capRate,
      facilities: dealFacilities.map((f) => ({
        name: f.name,
        state: f.state || '',
        beds: f.licensedBeds || f.certifiedBeds || 0,
        occupancy: 0,
        ebitdar: 0,
        cmsRating: f.cmsRating || 0,
      })),
      generatedAt: new Date().toLocaleDateString(),
    };

    // Dynamically import the generator (jsPDF doesn't work well with static imports in server)
    const { generateOnePagerPDF } = await import('@/lib/export/pdf/one-pager-generator');
    const doc = generateOnePagerPDF(pdfData);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${deal.name.replace(/[^a-zA-Z0-9]/g, '_')}_One_Pager.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('One-pager generation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
