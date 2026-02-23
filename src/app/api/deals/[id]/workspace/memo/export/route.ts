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
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  const maxY = pageHeight - 22;

  // Design tokens
  const teal = [15, 118, 110] as const;         // professional deep teal
  const tealLight = [20, 184, 166] as const;     // accent teal
  const navy = [22, 33, 62] as const;            // dark headings
  const dark = [38, 38, 38] as const;            // body text
  const mid = [90, 100, 110] as const;           // secondary text
  const light = [160, 170, 180] as const;        // subtle
  const ruleGray = [220, 225, 230] as const;     // dividers
  const bgLight = [248, 250, 252] as const;      // box backgrounds
  const white = [255, 255, 255] as const;

  // Risk-level colors
  function riskColor(score: number): readonly [number, number, number] {
    if (score <= 30) return [16, 185, 129] as const;   // emerald
    if (score <= 50) return [245, 158, 11] as const;   // amber
    if (score <= 70) return [249, 115, 22] as const;   // orange
    if (score <= 85) return [239, 68, 68] as const;    // red
    return [190, 18, 60] as const;                     // rose
  }

  const isDraft = (memo.status || 'draft') === 'draft';
  let currentPage = 0;

  // ── Helpers ──────────────────────────────────────────────────────

  function addFooter() {
    doc.setFontSize(7);
    doc.setTextColor(light[0], light[1], light[2]);
    doc.text('CONFIDENTIAL', margin, pageHeight - 8);
    doc.setTextColor(mid[0], mid[1], mid[2]);
    doc.text('SNFalyze  |  Cascadia Healthcare', pageWidth / 2, pageHeight - 8, { align: 'center' });
    doc.text(`Page ${currentPage}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
    // thin rule above footer
    doc.setDrawColor(ruleGray[0], ruleGray[1], ruleGray[2]);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
  }

  function addDraftWatermark() {
    if (!isDraft) return;
    doc.setTextColor(240, 240, 240);
    doc.setFontSize(60);
    doc.setFont('helvetica', 'bold');
    // Center diagonally
    doc.text('DRAFT', pageWidth / 2, pageHeight / 2, {
      align: 'center',
      angle: 45,
    });
    doc.setFont('helvetica', 'normal');
  }

  function newPage() {
    if (currentPage > 0) doc.addPage();
    currentPage++;
    addDraftWatermark();
    return 24; // starting y
  }

  // Render rich text with **bold**, *italic*, bullet points, sub-headers
  function renderRichContent(content: string, startY: number, sectionTitle: string): number {
    let y = startY;
    const lineHeight = 4.2;
    const paragraphGap = 2.5;
    const bulletIndent = 5;

    // Split into paragraphs
    const paragraphs = content.split(/\n\n+/);

    for (const para of paragraphs) {
      const lines = para.split('\n');
      for (const rawLine of lines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        // Check for page break
        if (y > maxY) {
          addFooter();
          const ny = newPage();
          // Continuation mini-header
          doc.setFillColor(teal[0], teal[1], teal[2]);
          doc.rect(0, 0, pageWidth, 8, 'F');
          doc.setTextColor(white[0], white[1], white[2]);
          doc.setFontSize(7);
          doc.setFont('helvetica', 'italic');
          doc.text(`${sectionTitle} (continued)`, margin, 5.5);
          y = ny - 8;
        }

        // Sub-headers (### or ##)
        const headerMatch = trimmed.match(/^#{1,3}\s+(.+)/);
        if (headerMatch) {
          y += 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(navy[0], navy[1], navy[2]);
          doc.text(headerMatch[1], margin, y);
          y += lineHeight + 1.5;
          // Accent underline
          doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
          doc.setLineWidth(0.4);
          doc.line(margin, y - 2.5, margin + doc.getTextWidth(headerMatch[1]) + 4, y - 2.5);
          continue;
        }

        // Bullet points
        const bulletMatch = trimmed.match(/^[-•*]\s+(.+)/);
        if (bulletMatch) {
          doc.setFontSize(9);
          doc.setTextColor(dark[0], dark[1], dark[2]);
          // Bullet dot
          doc.setFillColor(tealLight[0], tealLight[1], tealLight[2]);
          doc.circle(margin + 1.5, y - 1, 0.7, 'F');
          // Render text with inline formatting
          const wrapped = doc.splitTextToSize(stripFormatting(bulletMatch[1]), contentWidth - bulletIndent - 2);
          for (let i = 0; i < wrapped.length; i++) {
            if (y > maxY) {
              addFooter();
              y = newPage();
            }
            renderFormattedLine(wrapped[i], margin + bulletIndent, y);
            y += lineHeight;
          }
          continue;
        }

        // Numbered list items
        const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
        if (numberedMatch) {
          doc.setFontSize(9);
          doc.setTextColor(teal[0], teal[1], teal[2]);
          doc.setFont('helvetica', 'bold');
          doc.text(`${numberedMatch[1]}.`, margin, y);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(dark[0], dark[1], dark[2]);
          const wrapped = doc.splitTextToSize(stripFormatting(numberedMatch[2]), contentWidth - bulletIndent - 2);
          for (let i = 0; i < wrapped.length; i++) {
            if (y > maxY) {
              addFooter();
              y = newPage();
            }
            renderFormattedLine(wrapped[i], margin + bulletIndent, y);
            y += lineHeight;
          }
          continue;
        }

        // Regular paragraph text — wrap and render with inline formatting
        doc.setFontSize(9);
        doc.setTextColor(dark[0], dark[1], dark[2]);
        doc.setFont('helvetica', 'normal');
        const wrapped = doc.splitTextToSize(stripFormatting(trimmed), contentWidth);
        for (let i = 0; i < wrapped.length; i++) {
          if (y > maxY) {
            addFooter();
            y = newPage();
          }
          renderFormattedLine(wrapped[i], margin, y);
          y += lineHeight;
        }
      }
      y += paragraphGap;
    }
    return y;
  }

  function stripFormatting(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1');
  }

  function renderFormattedLine(text: string, x: number, y: number) {
    // Simple rendering — bold segments already stripped for line wrapping
    // Render full line in current font
    doc.text(text, x, y);
  }

  // ── COVER PAGE ──────────────────────────────────────────────────

  currentPage = 1;
  addDraftWatermark();

  // Full-bleed header band with subtle two-tone
  doc.setFillColor(teal[0], teal[1], teal[2]);
  doc.rect(0, 0, pageWidth, 68, 'F');
  // Darker accent strip at bottom of header
  doc.setFillColor(12, 95, 88);
  doc.rect(0, 62, pageWidth, 6, 'F');

  doc.setTextColor(white[0], white[1], white[2]);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('CASCADIA HEALTHCARE', margin, 16);

  // Date on right
  doc.text(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin, 16, { align: 'right' });

  // Thin divider
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.15);
  doc.line(margin, 21, pageWidth - margin, 21);

  // Title
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  const titleLines = doc.splitTextToSize(deal.name || 'Deal Analysis', pageWidth - margin * 2);
  doc.text(titleLines, margin, 36);
  const titleEndY = 36 + (titleLines.length - 1) * 10;

  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const subtitle = [
    deal.assetType?.toUpperCase() || 'SNF',
    deal.primaryState || '',
    deal.beds ? `${deal.beds} Beds` : '',
  ].filter(Boolean).join('  |  ');
  doc.text(subtitle, margin, titleEndY + 12);

  // Document type label
  doc.setFontSize(8);
  doc.text('INVESTMENT MEMORANDUM', margin, titleEndY + 20);

  // ── Key Metrics Row ─────────────────────────────────────────────
  let y = 80;
  const boxW = (contentWidth - 9) / 4;
  const boxH = 26;

  const askingPrice = deal.askingPrice ? `$${(parseFloat(deal.askingPrice) / 1e6).toFixed(1)}M` : 'N/A';
  const pricePerBed = deal.askingPrice && deal.beds
    ? `$${Math.round(parseFloat(deal.askingPrice) / deal.beds / 1000)}K`
    : 'N/A';
  const compositeScore = riskData?.compositeScore != null ? Math.round(riskData.compositeScore as number) : null;
  const riskRating = (riskData?.rating as string) || '';

  const metrics = [
    { label: 'ASKING PRICE', value: askingPrice },
    { label: 'PRICE / BED', value: pricePerBed },
    { label: 'TOTAL BEDS', value: deal.beds ? String(deal.beds) : 'N/A' },
    { label: 'RISK SCORE', value: compositeScore != null ? `${compositeScore}` : 'N/A', isRisk: true },
  ];

  metrics.forEach((m, i) => {
    const x = margin + i * (boxW + 3);
    // Box fill
    doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
    doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, 'F');
    // Subtle border
    doc.setDrawColor(ruleGray[0], ruleGray[1], ruleGray[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, boxW, boxH, 1.5, 1.5, 'S');

    // Risk score box gets color-coded left accent
    if (m.isRisk && compositeScore != null) {
      const rc = riskColor(compositeScore);
      doc.setFillColor(rc[0], rc[1], rc[2]);
      doc.rect(x, y, 2.5, boxH, 'F');
      // Re-round the corners
      doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
      doc.rect(x, y, 1.5, 1.5, 'F');
      doc.rect(x, y + boxH - 1.5, 1.5, 1.5, 'F');
    }

    // Label
    doc.setTextColor(mid[0], mid[1], mid[2]);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label, x + boxW / 2, y + 9, { align: 'center' });

    // Value
    if (m.isRisk && compositeScore != null) {
      const rc = riskColor(compositeScore);
      doc.setTextColor(rc[0], rc[1], rc[2]);
    } else {
      doc.setTextColor(navy[0], navy[1], navy[2]);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + boxW / 2, y + 20, { align: 'center' });

    // Risk rating label below score
    if (m.isRisk && riskRating) {
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      doc.text(riskRating.toUpperCase(), x + boxW / 2, y + 24.5, { align: 'center' });
    }
  });

  y += boxH + 10;

  // ── Facility Portfolio Table ─────────────────────────────────────
  if (dealFacilities.length > 0) {
    doc.setTextColor(navy[0], navy[1], navy[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(dealFacilities.length > 1 ? 'Portfolio Summary' : 'Facility Overview', margin, y);
    y += 6;

    // Table header
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');

    const cols = [
      { label: 'FACILITY', x: margin + 2, w: 55 },
      { label: 'LOCATION', x: margin + 57, w: 35 },
      { label: 'TYPE', x: margin + 92, w: 15 },
      { label: 'BEDS', x: margin + 107, w: 15 },
      { label: 'CMS', x: margin + 122, w: 12 },
      { label: 'SFF', x: margin + 134, w: 12 },
      { label: 'VERIFIED', x: margin + 146, w: 18 },
    ];

    cols.forEach(c => doc.text(c.label, c.x, y + 5));
    y += 7;

    // Table rows
    doc.setFont('helvetica', 'normal');
    dealFacilities.forEach((f, idx) => {
      const rowColor = idx % 2 === 0 ? white : bgLight;
      doc.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
      doc.rect(margin, y, contentWidth, 6, 'F');

      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.setFontSize(7);

      doc.text((f.name || 'Unknown').slice(0, 30), cols[0].x, y + 4.5);
      doc.text(`${f.city || ''}, ${f.state || ''}`.slice(0, 18), cols[1].x, y + 4.5);
      doc.text(f.assetType || 'SNF', cols[2].x, y + 4.5);
      doc.text(String(f.licensedBeds || '-'), cols[3].x, y + 4.5);
      doc.text(f.cmsRating ? `${f.cmsRating}/5` : '-', cols[4].x, y + 4.5);

      // SFF coloring
      if (f.isSff) {
        doc.setTextColor(239, 68, 68);
        doc.setFont('helvetica', 'bold');
        doc.text('YES', cols[5].x, y + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(dark[0], dark[1], dark[2]);
      } else {
        doc.text('No', cols[5].x, y + 4.5);
      }
      doc.text(f.isVerified ? 'Yes' : 'No', cols[6].x, y + 4.5);
      y += 6;
    });

    // Table bottom border
    doc.setDrawColor(ruleGray[0], ruleGray[1], ruleGray[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
  }

  y += 10;

  // ── Deal Overview Info Grid ─────────────────────────────────────
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Deal Overview', margin, y);
  y += 2;
  // Accent line
  doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 30, y);
  y += 5;

  doc.setFontSize(8.5);

  const infoItems = [
    ['Asset Type', deal.assetType?.toUpperCase() || 'N/A'],
    ['State', deal.primaryState || 'N/A'],
    ['Beds', String(deal.beds || 'N/A')],
    ['Asking Price', askingPrice],
    ['Memo Status', (memo.status || 'Draft').charAt(0).toUpperCase() + (memo.status || 'draft').slice(1)],
    ['Generated', memo.generatedAt ? new Date(memo.generatedAt).toLocaleDateString() : 'N/A'],
  ];

  // Render as two-column grid for compactness
  for (let i = 0; i < infoItems.length; i += 2) {
    const left = infoItems[i];
    const right = infoItems[i + 1];
    // Left column
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(mid[0], mid[1], mid[2]);
    doc.text(`${left[0]}:`, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(left[1], margin + 28, y);
    // Right column
    if (right) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(mid[0], mid[1], mid[2]);
      doc.text(`${right[0]}:`, margin + contentWidth / 2, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(dark[0], dark[1], dark[2]);
      doc.text(right[1], margin + contentWidth / 2 + 28, y);
    }
    y += 5;
  }

  // ── Table of Contents ───────────────────────────────────────────
  y += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('Table of Contents', margin, y);
  y += 2;
  doc.setDrawColor(tealLight[0], tealLight[1], tealLight[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, margin + 34, y);
  y += 6;

  const sections = [
    { title: '1.  Executive Summary', content: memo.executiveSummary },
    { title: '2.  Facility Overview', content: memo.facilityOverview },
    { title: '3.  Market Analysis', content: memo.marketAnalysis },
    { title: '4.  Financial Analysis', content: memo.financialAnalysis },
    { title: '5.  Operational Assessment', content: memo.operationalAssessment },
    { title: '6.  Risk Assessment', content: memo.riskAssessment },
    { title: '7.  Investment Thesis', content: memo.investmentThesis },
    { title: '8.  Recommendation', content: memo.recommendation },
  ];

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  let tocPage = 2;
  for (const section of sections) {
    if (!section.content) continue;
    doc.setTextColor(teal[0], teal[1], teal[2]);
    doc.setFont('helvetica', 'normal');
    doc.text(section.title, margin + 2, y);

    // Dotted leader
    doc.setTextColor(ruleGray[0], ruleGray[1], ruleGray[2]);
    const tw = doc.getTextWidth(section.title);
    const pStr = String(tocPage);
    const pw = doc.getTextWidth(pStr);
    let dx = margin + 2 + tw + 3;
    const dEnd = pageWidth - margin - pw - 3;
    while (dx < dEnd) {
      doc.text('.', dx, y);
      dx += 1.8;
    }

    doc.setTextColor(mid[0], mid[1], mid[2]);
    doc.text(pStr, pageWidth - margin, y, { align: 'right' });
    y += 5.5;
    tocPage++;
  }

  // Due diligence entry
  if (memo.dueDiligenceChecklist) {
    doc.setTextColor(teal[0], teal[1], teal[2]);
    doc.text('9.  Due Diligence Checklist', margin + 2, y);
    doc.setTextColor(ruleGray[0], ruleGray[1], ruleGray[2]);
    const tw2 = doc.getTextWidth('9.  Due Diligence Checklist');
    const pStr2 = String(tocPage);
    const pw2 = doc.getTextWidth(pStr2);
    let dx2 = margin + 2 + tw2 + 3;
    while (dx2 < pageWidth - margin - pw2 - 3) {
      doc.text('.', dx2, y);
      dx2 += 1.8;
    }
    doc.setTextColor(mid[0], mid[1], mid[2]);
    doc.text(pStr2, pageWidth - margin, y, { align: 'right' });
  }

  // Confidentiality strip at page bottom
  doc.setFillColor(bgLight[0], bgLight[1], bgLight[2]);
  doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
  doc.setFontSize(6.5);
  doc.setTextColor(light[0], light[1], light[2]);
  doc.text('CONFIDENTIAL  —  For internal use only. Not for distribution.', margin, pageHeight - 14);
  doc.text(`Generated by SNFalyze AI Platform  —  ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, pageHeight - 9.5);

  addFooter();

  // ── Content Section Pages ─────────────────────────────────────

  for (const section of sections) {
    if (!section.content) continue;

    y = newPage();

    // Section header bar
    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, margin, 10);

    y = 22;

    // Render content with formatting
    y = renderRichContent(section.content, y, section.title);

    addFooter();
  }

  // ── Due Diligence Checklist ─────────────────────────────────────
  if (memo.dueDiligenceChecklist) {
    y = newPage();

    doc.setFillColor(teal[0], teal[1], teal[2]);
    doc.rect(0, 0, pageWidth, 14, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('9.  Due Diligence Checklist', margin, 10);

    y = 22;

    const rawChecklist = typeof memo.dueDiligenceChecklist === 'object'
      ? (memo.dueDiligenceChecklist as Record<string, string>).content || JSON.stringify(memo.dueDiligenceChecklist, null, 2)
      : String(memo.dueDiligenceChecklist);

    // Render checklist items with checkbox symbols
    const checklistFormatted = rawChecklist
      .replace(/^[-•]\s*/gm, '\u2610  ')     // ☐ checkbox
      .replace(/^\[x\]\s*/gim, '\u2611  ')    // ☑ checked
      .replace(/^\[ \]\s*/gm, '\u2610  ');    // ☐ unchecked

    y = renderRichContent(checklistFormatted, y, 'Due Diligence Checklist');

    addFooter();
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
