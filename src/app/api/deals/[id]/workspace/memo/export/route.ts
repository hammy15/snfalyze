import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { deals, investmentMemos, facilities, dealWorkspaceStages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import jsPDF from 'jspdf';

type RouteContext = { params: Promise<{ id: string }> };

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// ── GET: Export memo as PDF or DOCX ─────────────────────────────────
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: dealId } = await context.params;
    if (!isValidUUID(dealId)) {
      return NextResponse.json({ error: 'Invalid deal ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    // Load deal, memo, facilities, and risk data
    const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    const [memo] = await db
      .select()
      .from(investmentMemos)
      .where(eq(investmentMemos.dealId, dealId))
      .limit(1);

    if (!memo) {
      return NextResponse.json({ error: 'Memo not generated yet' }, { status: 404 });
    }

    // Load facilities for portfolio summary
    const dealFacilities = await db
      .select()
      .from(facilities)
      .where(eq(facilities.dealId, dealId));

    // Load risk score from workspace stage
    const [riskStage] = await db
      .select()
      .from(dealWorkspaceStages)
      .where(and(eq(dealWorkspaceStages.dealId, dealId), eq(dealWorkspaceStages.stage, 'risk_score')));

    const riskData = riskStage?.stageData as Record<string, unknown> | undefined;

    if (format === 'pdf') {
      const pdfBuffer = generateMemoPDF(deal, memo, dealFacilities, riskData);

      // Update export metadata
      await db
        .update(investmentMemos)
        .set({
          lastExportedAt: new Date(),
          exportFormat: 'pdf',
        })
        .where(eq(investmentMemos.id, memo.id));

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="investment-memo-${deal.name || 'deal'}.pdf"`,
        },
      });
    }

    // DOCX fallback — return formatted text
    if (format === 'docx') {
      const textContent = generateMemoText(deal, memo);

      await db
        .update(investmentMemos)
        .set({
          lastExportedAt: new Date(),
          exportFormat: 'docx',
        })
        .where(eq(investmentMemos.id, memo.id));

      return new NextResponse(textContent, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="investment-memo-${deal.name || 'deal'}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Failed to export memo' }, { status: 500 });
  }
}

// ── PDF Generator ───────────────────────────────────────────────────

function generateMemoPDF(
  deal: typeof deals.$inferSelect,
  memo: typeof investmentMemos.$inferSelect,
  dealFacilities: (typeof facilities.$inferSelect)[],
  riskData?: Record<string, unknown>,
): Buffer {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const primary = [20, 184, 166] as const;     // teal
  const primaryDark = [13, 148, 136] as const;
  const dark = [30, 30, 30] as const;
  const gray = [100, 100, 100] as const;
  const lightGray = [200, 200, 200] as const;
  const white = [255, 255, 255] as const;

  // ── Page Footer Helper ──────────────────────────────────────────
  function addFooter(pageNum: number) {
    doc.setFontSize(7);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.text('CONFIDENTIAL', margin, pageHeight - 8);
    doc.text(`SNFalyze | Cascadia Healthcare`, pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  // ── Cover Page ────────────────────────────────────────────────────

  // Full-width header band
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 70, 'F');

  // Subtle gradient overlay at bottom of header
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 60, pageWidth, 10, 'F');

  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('CASCADIA HEALTHCARE', margin, 18);
  doc.text('INVESTMENT MEMORANDUM', pageWidth - margin, 18, { align: 'right' });

  // Horizontal rule
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(margin, 24, pageWidth - margin, 24);

  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(deal.name || 'Deal Analysis', margin, 42);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  const subtitle = [
    deal.assetType?.toUpperCase() || 'SNF',
    deal.primaryState || '',
    deal.beds ? `${deal.beds} Beds` : '',
  ].filter(Boolean).join(' | ');
  doc.text(subtitle, margin, 55);

  // ── Key Metrics Boxes ───────────────────────────────────────────
  let y = 85;
  const boxWidth = (contentWidth - 12) / 4;
  const boxHeight = 28;

  const askingPrice = deal.askingPrice ? `$${(parseFloat(deal.askingPrice) / 1e6).toFixed(1)}M` : 'N/A';
  const pricePerBed = deal.askingPrice && deal.beds
    ? `$${Math.round(parseFloat(deal.askingPrice) / deal.beds / 1000)}K`
    : 'N/A';
  const riskScore = riskData?.compositeScore != null ? `${Math.round(riskData.compositeScore as number)}/100` : 'N/A';
  const riskRating = (riskData?.rating as string) || 'N/A';

  const metrics = [
    { label: 'Asking Price', value: askingPrice },
    { label: 'Price / Bed', value: pricePerBed },
    { label: 'Total Beds', value: deal.beds ? String(deal.beds) : 'N/A' },
    { label: 'Risk Score', value: `${riskScore} ${riskRating}` },
  ];

  metrics.forEach((m, i) => {
    const x = margin + i * (boxWidth + 4);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'F');
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.roundedRect(x, y, boxWidth, boxHeight, 2, 2, 'S');

    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(m.label.toUpperCase(), x + boxWidth / 2, y + 9, { align: 'center' });

    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + boxWidth / 2, y + 21, { align: 'center' });
  });

  y += boxHeight + 12;

  // ── Facility Portfolio Table ─────────────────────────────────────
  if (dealFacilities.length > 0) {
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(dealFacilities.length > 1 ? 'Portfolio Summary' : 'Facility Overview', margin, y);
    y += 6;

    // Table header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    const cols = [
      { label: 'Facility', x: margin + 2, w: 55 },
      { label: 'Location', x: margin + 57, w: 35 },
      { label: 'Type', x: margin + 92, w: 15 },
      { label: 'Beds', x: margin + 107, w: 15 },
      { label: 'CMS', x: margin + 122, w: 12 },
      { label: 'SFF', x: margin + 134, w: 12 },
      { label: 'Verified', x: margin + 146, w: 18 },
    ];

    cols.forEach(c => doc.text(c.label, c.x, y + 5));
    y += 7;

    // Table rows
    doc.setFont('helvetica', 'normal');
    dealFacilities.forEach((f, idx) => {
      const rowColor = idx % 2 === 0 ? [255, 255, 255] : [248, 250, 252];
      doc.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
      doc.rect(margin, y, contentWidth, 6, 'F');

      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.setFontSize(7);

      doc.text((f.name || 'Unknown').slice(0, 30), cols[0].x, y + 4.5);
      doc.text(`${f.city || ''}, ${f.state || ''}`.slice(0, 18), cols[1].x, y + 4.5);
      doc.text(f.assetType || 'SNF', cols[2].x, y + 4.5);
      doc.text(String(f.licensedBeds || '-'), cols[3].x, y + 4.5);
      doc.text(f.cmsRating ? `${f.cmsRating}/5` : '-', cols[4].x, y + 4.5);
      doc.text(f.isSff ? 'YES' : 'No', cols[5].x, y + 4.5);
      doc.text(f.isVerified ? 'Yes' : 'No', cols[6].x, y + 4.5);

      y += 6;
    });

    // Table border
    doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(margin, y - 6 * dealFacilities.length - 7, contentWidth, 7 + 6 * dealFacilities.length, 'S');
  }

  y += 10;

  // ── Deal Info ─────────────────────────────────────────────────────
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Deal Overview', margin, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray[0], gray[1], gray[2]);

  const infoItems = [
    ['Asset Type', deal.assetType?.toUpperCase() || 'N/A'],
    ['State', deal.primaryState || 'N/A'],
    ['Beds', String(deal.beds || 'N/A')],
    ['Asking Price', askingPrice],
    ['Status', (memo.status || 'Draft').charAt(0).toUpperCase() + (memo.status || 'draft').slice(1)],
    ['Generated', memo.generatedAt ? new Date(memo.generatedAt).toLocaleDateString() : 'N/A'],
  ];

  for (const [label, value] of infoItems) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(`${label}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(value, margin + 35, y);
    y += 5.5;
  }

  // ── Table of Contents ─────────────────────────────────────────────
  y += 8;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('Table of Contents', margin, y);
  y += 7;

  const sections = [
    { title: '1. Executive Summary', content: memo.executiveSummary },
    { title: '2. Facility Overview', content: memo.facilityOverview },
    { title: '3. Market Analysis', content: memo.marketAnalysis },
    { title: '4. Financial Analysis', content: memo.financialAnalysis },
    { title: '5. Operational Assessment', content: memo.operationalAssessment },
    { title: '6. Risk Assessment', content: memo.riskAssessment },
    { title: '7. Investment Thesis', content: memo.investmentThesis },
    { title: '8. Recommendation', content: memo.recommendation },
  ];

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let pageCounter = 2;
  for (const section of sections) {
    if (!section.content) continue;
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(section.title, margin + 4, y);
    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    // Dots
    const titleWidth = doc.getTextWidth(section.title);
    const pageStr = String(pageCounter);
    const pageWidth2 = doc.getTextWidth(pageStr);
    const dotsStart = margin + 4 + titleWidth + 2;
    const dotsEnd = pageWidth - margin - pageWidth2 - 2;
    let dx = dotsStart;
    while (dx < dotsEnd) {
      doc.text('.', dx, y);
      dx += 1.5;
    }
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(pageStr, pageWidth - margin, y, { align: 'right' });
    y += 5;
    pageCounter++;
  }

  // Confidentiality notice
  doc.setFontSize(7);
  doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
  doc.text('CONFIDENTIAL — For internal use only. Not for distribution.', margin, pageHeight - 15);
  doc.text(`Generated by SNFalyze AI Platform — ${new Date().toLocaleDateString()}`, margin, pageHeight - 10);

  addFooter(1);

  // ── Content Pages ─────────────────────────────────────────────────
  let currentPage = 1;

  for (const section of sections) {
    if (!section.content) continue;

    doc.addPage();
    currentPage++;
    y = 20;

    // Section header with accent bar
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, 11);

    y = 26;

    // Section content
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    // Strip markdown formatting
    const cleanContent = section.content
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/^[-•]\s*/gm, '  - ');

    const lines = doc.splitTextToSize(cleanContent, contentWidth);
    for (const line of lines) {
      if (y > pageHeight - 20) {
        addFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = 20;
        // Mini header on continuation pages
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(0, 0, pageWidth, 8, 'F');
        doc.setTextColor(white[0], white[1], white[2]);
        doc.setFontSize(7);
        doc.text(`${section.title} (continued)`, margin, 5.5);
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFontSize(9);
        y = 16;
      }
      doc.text(line, margin, y);
      y += 4.5;
    }

    addFooter(currentPage);
  }

  // ── Due Diligence Checklist ─────────────────────────────────────
  if (memo.dueDiligenceChecklist) {
    doc.addPage();
    currentPage++;
    y = 20;
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, pageWidth, 16, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('9. Due Diligence Checklist', margin, 11);

    y = 26;
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const rawChecklist = typeof memo.dueDiligenceChecklist === 'object'
      ? (memo.dueDiligenceChecklist as Record<string, string>).content || JSON.stringify(memo.dueDiligenceChecklist, null, 2)
      : String(memo.dueDiligenceChecklist);
    const checklistContent = rawChecklist
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/^#{1,3}\s+/gm, '')
      .replace(/^[-•]\s*/gm, '  - ');

    const checklistLines = doc.splitTextToSize(checklistContent, contentWidth);
    for (const line of checklistLines) {
      if (y > pageHeight - 20) {
        addFooter(currentPage);
        doc.addPage();
        currentPage++;
        y = 20;
      }
      doc.text(line, margin, y);
      y += 4.5;
    }

    addFooter(currentPage);
  }

  return Buffer.from(doc.output('arraybuffer'));
}

// ── Text export (DOCX placeholder) ──────────────────────────────────

function generateMemoText(
  deal: typeof deals.$inferSelect,
  memo: typeof investmentMemos.$inferSelect
): string {
  const sections = [
    { title: 'EXECUTIVE SUMMARY', content: memo.executiveSummary },
    { title: 'FACILITY OVERVIEW', content: memo.facilityOverview },
    { title: 'MARKET ANALYSIS', content: memo.marketAnalysis },
    { title: 'FINANCIAL ANALYSIS', content: memo.financialAnalysis },
    { title: 'OPERATIONAL ASSESSMENT', content: memo.operationalAssessment },
    { title: 'RISK ASSESSMENT', content: memo.riskAssessment },
    { title: 'INVESTMENT THESIS', content: memo.investmentThesis },
    { title: 'RECOMMENDATION', content: memo.recommendation },
  ];

  let text = `INVESTMENT MEMORANDUM\n${deal.name || 'Deal Analysis'}\n${'='.repeat(60)}\n\n`;

  for (const section of sections) {
    if (!section.content) continue;
    text += `\n${section.title}\n${'-'.repeat(section.title.length)}\n\n${section.content}\n\n`;
  }

  if (memo.dueDiligenceChecklist) {
    text += `\nDUE DILIGENCE CHECKLIST\n${'='.repeat(25)}\n\n`;
    const content = typeof memo.dueDiligenceChecklist === 'object'
      ? (memo.dueDiligenceChecklist as Record<string, string>).content || JSON.stringify(memo.dueDiligenceChecklist, null, 2)
      : String(memo.dueDiligenceChecklist);
    text += content;
  }

  text += `\n\n${'='.repeat(60)}\nGenerated by SNFalyze AI Platform — ${new Date().toLocaleDateString()}\nCONFIDENTIAL — For internal use only.`;

  return text;
}
