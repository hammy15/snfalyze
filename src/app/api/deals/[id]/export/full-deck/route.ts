import { NextRequest, NextResponse } from 'next/server';
import { db, deals, facilities } from '@/db';
import { eq } from 'drizzle-orm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =============================================================================
// HELPERS
// =============================================================================

function fmt(value: number): string {
  if (!value) return '—';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function pct(value: number): string {
  if (!value) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

// =============================================================================
// FULL DECK GENERATOR
// =============================================================================

function generateFullDeck(data: any): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;
  let pageNum = 0;

  const primary = [20, 184, 166];
  const dark = [30, 30, 30];
  const gray = [100, 100, 100];

  function addHeader(title: string) {
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, 12);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(data.dealName, pageWidth - margin, 12, { align: 'right' });
    y = 26;
  }

  function addFooter() {
    pageNum++;
    doc.setFillColor(245, 245, 245);
    doc.rect(0, pageHeight - 8, pageWidth, 8, 'F');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(6);
    doc.text('SNFalyze · Cascadia Healthcare · Confidential', margin, pageHeight - 3);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 3, { align: 'right' });
  }

  // ===== PAGE 1: COVER =====
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, pageHeight * 0.4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dealName, margin, 50);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Deal Analysis Report', margin, 62);

  doc.setFontSize(10);
  doc.text(`${data.assetTypes.join(', ').toUpperCase()} · ${data.facilityCount} Facilities · ${data.totalBeds} Beds`, margin, 74);
  doc.text(`${data.states.join(', ')}`, margin, 82);

  // Cover metrics boxes
  const boxY = pageHeight * 0.45;
  const boxWidth = contentWidth / 3 - 4;
  const boxes = [
    { label: 'Asking Price', value: fmt(data.askingPrice) },
    { label: 'Market Value', value: fmt(data.valuationMid) },
    { label: 'Deal Score', value: data.score ? `${data.score.toFixed(1)}/10` : '—' },
  ];

  boxes.forEach((box, i) => {
    const x = margin + i * (boxWidth + 6);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(x, boxY, boxWidth, 24, 3, 3, 'F');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(7);
    doc.text(box.label.toUpperCase(), x + boxWidth / 2, boxY + 8, { align: 'center' });
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(box.value, x + boxWidth / 2, boxY + 18, { align: 'center' });
  });

  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, pageHeight - 20);
  doc.text(`Deal ID: ${data.dealId}`, margin, pageHeight - 14);
  addFooter();

  // ===== PAGE 2: EXECUTIVE SUMMARY =====
  doc.addPage();
  addHeader('Executive Summary');

  // Recommendation
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(dark[0], dark[1], dark[2]);
  const recText = data.recommendation === 'proceed' ? 'PROCEED' : data.recommendation === 'reprice' ? 'RE-PRICE / FIX' : 'PASS';
  doc.text(`Recommendation: ${recText}`, margin, y);
  y += 8;

  // Key bullet points
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const bullets = [
    `Portfolio of ${data.facilityCount} ${data.assetTypes.join('/')} ${data.facilityCount === 1 ? 'facility' : 'facilities'} totaling ${data.totalBeds} beds in ${data.states.join(', ')}`,
    `Asking price of ${fmt(data.askingPrice)} (${fmt(data.pricePerBed)}/bed)`,
    `Market valuation range: ${fmt(data.valuationLow)} - ${fmt(data.valuationHigh)} (mid: ${fmt(data.valuationMid)})`,
    `Deal score: ${data.score?.toFixed(1) || '—'}/10 at ${data.confidence || 0}% confidence`,
    data.coverage ? `Coverage ratio: ${data.coverage.toFixed(2)}x` : null,
  ].filter(Boolean);

  bullets.forEach((bullet) => {
    doc.text(`•  ${bullet}`, margin + 2, y);
    y += 6;
  });
  y += 4;

  // Summary metrics table
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['Metric', 'Value']],
    body: [
      ['Total Beds', data.totalBeds.toString()],
      ['Asking Price', fmt(data.askingPrice)],
      ['Market Value (Mid)', fmt(data.valuationMid)],
      ['Price Per Bed', fmt(data.pricePerBed)],
      ['Deal Score', data.score?.toFixed(1) || '—'],
      ['Coverage Ratio', data.coverage ? `${data.coverage.toFixed(2)}x` : '—'],
      ['Cap Rate', data.capRate ? pct(data.capRate) : '—'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 8 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Risks and upside
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('Risk Factors', margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  (data.riskFactors || ['No risks identified']).forEach((risk: string) => {
    doc.text(`•  ${risk}`, margin + 2, y);
    y += 5;
  });
  y += 5;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Upside Factors', margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  (data.upsideFactors || ['No upside factors identified']).forEach((factor: string) => {
    doc.text(`•  ${factor}`, margin + 2, y);
    y += 5;
  });

  addFooter();

  // ===== PAGE 3: FACILITIES =====
  if (data.facilities.length > 0) {
    doc.addPage();
    addHeader('Facility Details');

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Facility', 'State', 'Beds', 'Occupancy', 'EBITDAR', 'CMS Rating', 'Status']],
      body: data.facilities.map((f: any) => [
        f.name,
        f.state,
        f.beds.toString(),
        f.occupancy ? `${(f.occupancy * 100).toFixed(0)}%` : '—',
        f.ebitdar ? fmt(f.ebitdar) : '—',
        f.cmsRating ? `${f.cmsRating}★` : '—',
        f.isSff ? 'SFF ⚠' : 'Active',
      ]),
      theme: 'striped',
      headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: 255, fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 50 },
      },
    });

    addFooter();
  }

  // ===== PAGE 4: VALUATION =====
  doc.addPage();
  addHeader('Valuation Summary');

  // Valuation range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('Valuation Range', margin, y);
  y += 8;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['', 'Low', 'Market', 'High']],
    body: [
      ['Total Value', fmt(data.valuationLow), fmt(data.valuationMid), fmt(data.valuationHigh)],
      ['Per Bed', data.totalBeds ? fmt(data.valuationLow / data.totalBeds) : '—', data.totalBeds ? fmt(data.valuationMid / data.totalBeds) : '—', data.totalBeds ? fmt(data.valuationHigh / data.totalBeds) : '—'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 9, fontStyle: 'bold' },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Rent analysis
  if (data.annualRent) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Rent Analysis', margin, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Metric', 'Value']],
      body: [
        ['Annual Rent', fmt(data.annualRent)],
        ['Monthly Rent', fmt(data.annualRent / 12)],
        ['Coverage Ratio', data.coverage ? `${data.coverage.toFixed(2)}x` : '—'],
        ['Cap Rate', data.capRate ? pct(data.capRate) : '—'],
      ],
      theme: 'striped',
      headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });
  }

  addFooter();

  return doc;
}

// =============================================================================
// API ROUTE
// =============================================================================

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

    // Fetch rent suggestions
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
        isSff: f.isSff || false,
      })),
    };

    const doc = generateFullDeck(pdfData);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${deal.name.replace(/[^a-zA-Z0-9]/g, '_')}_Full_Deck.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('Full deck generation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
