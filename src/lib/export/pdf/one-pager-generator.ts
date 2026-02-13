import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// =============================================================================
// TYPES
// =============================================================================

interface OnePagerData {
  dealName: string;
  dealId: string;
  assetTypes: string[];
  facilityCount: number;
  totalBeds: number;
  states: string[];
  askingPrice: number;
  score: number;
  confidence: number;
  recommendation: string;
  riskFactors: string[];
  upsideFactors: string[];
  valuationLow: number;
  valuationMid: number;
  valuationHigh: number;
  pricePerBed: number;
  coverage: number;
  annualRent: number;
  capRate: number;
  facilities: Array<{
    name: string;
    state: string;
    beds: number;
    occupancy: number;
    ebitdar: number;
    cmsRating: number;
  }>;
  generatedAt: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(value: number): string {
  if (!value) return '—';
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

// =============================================================================
// GENERATOR
// =============================================================================

export function generateOnePagerPDF(data: OnePagerData): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let y = margin;

  // Colors
  const primary = [20, 184, 166]; // Teal (#14B8A6)
  const dark = [30, 30, 30];
  const gray = [100, 100, 100];
  const lightGray = [240, 240, 240];

  // ===== HEADER =====
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.dealName, margin, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${data.dealId} · ${data.assetTypes.map(t => t.toUpperCase()).join(', ')} · ${data.facilityCount} ${data.facilityCount === 1 ? 'facility' : 'facilities'} · ${data.totalBeds} beds · ${data.states.join(', ')}`,
    margin, 22
  );

  doc.setFontSize(8);
  doc.text(`Generated ${data.generatedAt}`, margin, 28);

  y = 40;

  // ===== SCORE + RECOMMENDATION BOX =====
  doc.setTextColor(dark[0], dark[1], dark[2]);

  // Score circle
  const scoreColor = data.score >= 8 ? [16, 185, 129] : data.score >= 6 ? [245, 158, 11] : [239, 68, 68];
  doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.circle(margin + 10, y + 8, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.score.toFixed(1), margin + 10, y + 10, { align: 'center' });

  // Recommendation
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const recText = data.recommendation === 'proceed' ? 'Proceed' : data.recommendation === 'reprice' ? 'Re-price / Fix' : 'Pass';
  doc.text(recText, margin + 24, y + 5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(gray[0], gray[1], gray[2]);
  doc.text(`Score: ${data.score.toFixed(1)}/10 · Confidence: ${data.confidence}%`, margin + 24, y + 11);

  y += 24;

  // ===== KEY METRICS ROW =====
  doc.setDrawColor(230, 230, 230);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  const metricBoxWidth = contentWidth / 5;
  const metricLabels = ['Asking Price', 'Market Value', 'Price/Bed', 'Coverage', 'Cap Rate'];
  const metricValues = [
    formatCurrency(data.askingPrice),
    formatCurrency(data.valuationMid),
    formatCurrency(data.pricePerBed),
    data.coverage ? `${data.coverage.toFixed(2)}x` : '—',
    data.capRate ? `${(data.capRate * 100).toFixed(1)}%` : '—',
  ];

  metricLabels.forEach((label, i) => {
    const x = margin + i * metricBoxWidth;
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(gray[0], gray[1], gray[2]);
    doc.text(label.toUpperCase(), x + metricBoxWidth / 2, y + 2, { align: 'center' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text(metricValues[i], x + metricBoxWidth / 2, y + 9, { align: 'center' });
  });

  y += 16;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // ===== VALUATION RANGE =====
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text('Valuation Range', margin, y);
  y += 5;

  // Range bar
  const barY = y;
  const barHeight = 6;
  // Red to yellow to green gradient (simplified)
  doc.setFillColor(254, 202, 202); // light red
  doc.rect(margin, barY, contentWidth * 0.33, barHeight, 'F');
  doc.setFillColor(254, 240, 138); // light yellow
  doc.rect(margin + contentWidth * 0.33, barY, contentWidth * 0.34, barHeight, 'F');
  doc.setFillColor(167, 243, 208); // light green
  doc.rect(margin + contentWidth * 0.67, barY, contentWidth * 0.33, barHeight, 'F');

  // Labels under bar
  y = barY + barHeight + 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(239, 68, 68); // red
  doc.text(formatCurrency(data.valuationLow), margin, y);
  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.text(formatCurrency(data.valuationMid), margin + contentWidth / 2, y, { align: 'center' });
  doc.setTextColor(16, 185, 129); // green
  doc.text(formatCurrency(data.valuationHigh), pageWidth - margin, y, { align: 'right' });

  y += 8;

  // ===== TWO COLUMN LAYOUT: RISKS + UPSIDE =====
  const colWidth = (contentWidth - 6) / 2;

  // Risks
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin, y, colWidth, 36, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(185, 28, 28);
  doc.text('KEY RISKS', margin + 4, y + 6);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 10, 10);
  (data.riskFactors || []).slice(0, 4).forEach((risk, i) => {
    const truncated = risk.length > 55 ? risk.slice(0, 52) + '...' : risk;
    doc.text(`• ${truncated}`, margin + 4, y + 13 + i * 6);
  });

  // Upside
  doc.setFillColor(236, 253, 245);
  doc.roundedRect(margin + colWidth + 6, y, colWidth, 36, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(6, 95, 70);
  doc.text('UPSIDE FACTORS', margin + colWidth + 10, y + 6);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(6, 78, 59);
  (data.upsideFactors || []).slice(0, 4).forEach((factor, i) => {
    const truncated = factor.length > 55 ? factor.slice(0, 52) + '...' : factor;
    doc.text(`• ${truncated}`, margin + colWidth + 10, y + 13 + i * 6);
  });

  y += 42;

  // ===== FACILITIES TABLE =====
  if (data.facilities.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(dark[0], dark[1], dark[2]);
    doc.text('Facilities', margin, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['Facility', 'State', 'Beds', 'Occupancy', 'EBITDAR', 'CMS']],
      body: data.facilities.map((f) => [
        f.name,
        f.state,
        f.beds.toString(),
        f.occupancy ? `${(f.occupancy * 100).toFixed(0)}%` : '—',
        f.ebitdar ? formatCurrency(f.ebitdar) : '—',
        f.cmsRating ? `${f.cmsRating}★` : '—',
      ]),
      theme: 'plain',
      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [100, 100, 100],
        fontSize: 7,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 30, 30],
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
    });
  }

  // ===== FOOTER =====
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFillColor(primary[0], primary[1], primary[2]);
  doc.rect(0, pageHeight - 10, pageWidth, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('SNFalyze · Cascadia Healthcare · Confidential', margin, pageHeight - 4);
  doc.text('Page 1 of 1', pageWidth - margin, pageHeight - 4, { align: 'right' });

  return doc;
}
