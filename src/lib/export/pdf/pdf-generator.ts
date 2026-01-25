/**
 * PDF Report Generator for Sale-Leaseback Analysis
 *
 * Creates professional PDF reports with:
 * - Executive Summary
 * - Portfolio Overview
 * - Per-facility analysis
 * - Coverage analysis
 * - Valuation calculations
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportInput, FacilityExportData } from '../excel/workbook-builder';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

// Color palette
const COLORS = {
  primary: [0, 102, 153] as [number, number, number],      // Teal
  secondary: [51, 51, 51] as [number, number, number],     // Dark gray
  success: [40, 167, 69] as [number, number, number],      // Green
  warning: [255, 193, 7] as [number, number, number],      // Yellow
  danger: [220, 53, 69] as [number, number, number],       // Red
  light: [248, 249, 250] as [number, number, number],      // Light gray
  muted: [108, 117, 125] as [number, number, number],      // Muted gray
};

export class PDFReportGenerator {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 20;
  private currentY: number = 20;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
  }

  /**
   * Build complete sale-leaseback PDF report
   */
  buildSaleLeasebackReport(input: ExportInput): jsPDF {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    this.currentY = 20;

    // 1. Cover Page
    this.addCoverPage(input);

    // 2. Executive Summary
    this.addNewPage();
    this.addExecutiveSummary(input);

    // 3. Portfolio Overview
    this.addNewPage();
    this.addPortfolioOverview(input);

    // 4. Facility Details
    input.facilities.forEach((facility, index) => {
      this.addNewPage();
      this.addFacilityDetail(facility, index + 1, input.assumptions);
    });

    // 5. Coverage Analysis
    this.addNewPage();
    this.addCoverageAnalysis(input);

    // 6. Valuation Summary
    this.addNewPage();
    this.addValuationSummary(input);

    // Add page numbers
    this.addPageNumbers();

    return this.doc;
  }

  /**
   * Export to buffer
   */
  exportToBuffer(): ArrayBuffer {
    return this.doc.output('arraybuffer');
  }

  private addCoverPage(input: ExportInput): void {
    const { dealName, assetType, facilities, portfolioResult, buyerPartner } = input;

    // Title
    this.doc.setFontSize(28);
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text('Sale-Leaseback Analysis', this.pageWidth / 2, 60, { align: 'center' });

    // Deal name
    this.doc.setFontSize(20);
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text(dealName, this.pageWidth / 2, 80, { align: 'center' });

    // Asset type badge
    this.doc.setFontSize(12);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text(`${assetType} Portfolio`, this.pageWidth / 2, 95, { align: 'center' });

    // Key metrics boxes
    const boxY = 120;
    const boxWidth = 50;
    const boxHeight = 35;
    const gap = 10;
    const startX = (this.pageWidth - (3 * boxWidth + 2 * gap)) / 2;

    // Box 1: Facilities
    this.drawMetricBox(startX, boxY, boxWidth, boxHeight, 'Facilities', facilities.length.toString());

    // Box 2: Total Beds
    this.drawMetricBox(startX + boxWidth + gap, boxY, boxWidth, boxHeight, 'Total Beds', portfolioResult.totalBeds.toLocaleString());

    // Box 3: Purchase Price
    this.drawMetricBox(startX + 2 * (boxWidth + gap), boxY, boxWidth, boxHeight, 'Purchase Price', this.formatCurrency(portfolioResult.totalPurchasePrice));

    // Coverage status
    const coverageY = boxY + boxHeight + 30;
    this.doc.setFontSize(14);
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text('Portfolio Coverage Ratio', this.pageWidth / 2, coverageY, { align: 'center' });

    this.doc.setFontSize(24);
    const coverageColor = portfolioResult.portfolioCoveragePassFail ? COLORS.success : COLORS.danger;
    this.doc.setTextColor(...coverageColor);
    this.doc.text(`${portfolioResult.portfolioCoverageRatio.toFixed(2)}x`, this.pageWidth / 2, coverageY + 15, { align: 'center' });

    const statusText = portfolioResult.portfolioCoveragePassFail ? 'PASS' : 'FAIL';
    this.doc.setFontSize(12);
    this.doc.text(statusText, this.pageWidth / 2, coverageY + 28, { align: 'center' });

    // Buyer partner
    if (buyerPartner) {
      this.doc.setFontSize(11);
      this.doc.setTextColor(...COLORS.muted);
      this.doc.text(`Buyer Partner: ${buyerPartner.name}`, this.pageWidth / 2, coverageY + 50, { align: 'center' });
    }

    // Date
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, this.pageWidth / 2, this.pageHeight - 30, { align: 'center' });

    // Footer
    this.doc.setFontSize(9);
    this.doc.text('Confidential - For Internal Use Only', this.pageWidth / 2, this.pageHeight - 20, { align: 'center' });
  }

  private addExecutiveSummary(input: ExportInput): void {
    const { portfolioResult, assumptions, facilities } = input;

    this.addSectionHeader('Executive Summary');
    this.currentY += 10;

    // Key highlights
    this.doc.setFontSize(11);
    this.doc.setTextColor(...COLORS.secondary);

    const highlights = [
      `Portfolio of ${facilities.length} ${input.assetType} facilities with ${portfolioResult.totalBeds.toLocaleString()} beds`,
      `Total Purchase Price: ${this.formatCurrency(portfolioResult.totalPurchasePrice)}`,
      `Annual Rent: ${this.formatCurrency(portfolioResult.totalAnnualRent)} (${this.formatCurrency(portfolioResult.totalMonthlyRent)}/month)`,
      `Portfolio Coverage Ratio: ${portfolioResult.portfolioCoverageRatio.toFixed(2)}x (Minimum: ${assumptions.minimumCoverageRatio.toFixed(2)}x)`,
      `Operator Cash Flow After Rent: ${this.formatCurrency(portfolioResult.totalOperatorCashFlowAfterRent)}`,
    ];

    highlights.forEach((text) => {
      this.doc.text(`• ${text}`, this.margin, this.currentY);
      this.currentY += 8;
    });

    this.currentY += 10;

    // Summary table
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: [
        ['Total Purchase Price', this.formatCurrency(portfolioResult.totalPurchasePrice)],
        ['Total Annual Rent', this.formatCurrency(portfolioResult.totalAnnualRent)],
        ['Total Monthly Rent', this.formatCurrency(portfolioResult.totalMonthlyRent)],
        ['Portfolio EBITDAR', this.formatCurrency(portfolioResult.totalEbitdar)],
        ['Total Revenue', this.formatCurrency(portfolioResult.totalRevenue)],
        ['Coverage Ratio', `${portfolioResult.portfolioCoverageRatio.toFixed(2)}x`],
        ['Coverage Status', portfolioResult.portfolioCoveragePassFail ? 'PASS' : 'FAIL'],
        ['Blended Cap Rate', this.formatPercent(portfolioResult.blendedCapRate)],
        ['Implied Portfolio Yield', this.formatPercent(portfolioResult.impliedPortfolioYield)],
        ['Avg Rent per Bed', this.formatCurrency(portfolioResult.weightedAvgRentPerBed)],
        ['Rent as % of Revenue', this.formatPercent(portfolioResult.weightedAvgRentAsPercentOfRevenue)],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: COLORS.primary },
      alternateRowStyles: { fillColor: COLORS.light },
      margin: { left: this.margin, right: this.margin },
    });

    this.currentY = this.doc.lastAutoTable.finalY + 15;

    // Assumptions
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Key Assumptions', this.margin, this.currentY);
    this.currentY += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    const assumptionsList = [
      `Cap Rate: ${this.formatPercent(assumptions.capRate)}`,
      `Buyer Yield Requirement: ${this.formatPercent(assumptions.buyerYieldRequirement)}`,
      `Minimum Coverage Ratio: ${assumptions.minimumCoverageRatio.toFixed(2)}x`,
      `Lease Term: ${assumptions.leaseTermYears} years`,
      `Annual Rent Escalation: ${this.formatPercent(assumptions.rentEscalation)}`,
    ];

    assumptionsList.forEach((text) => {
      this.doc.text(`• ${text}`, this.margin, this.currentY);
      this.currentY += 6;
    });
  }

  private addPortfolioOverview(input: ExportInput): void {
    const { facilities, portfolioResult } = input;

    this.addSectionHeader('Portfolio Overview');
    this.currentY += 10;

    // Facility comparison table
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Facility', 'Beds', 'Purchase Price', 'Annual Rent', 'EBITDAR', 'Coverage', 'Status']],
      body: [
        ...facilities.map((f) => [
          f.name.length > 25 ? f.name.substring(0, 25) + '...' : f.name,
          f.beds.toString(),
          this.formatCurrency(f.saleLeasebackResult.purchasePrice),
          this.formatCurrency(f.saleLeasebackResult.annualRent),
          this.formatCurrency(f.financials.ebitdar),
          `${f.saleLeasebackResult.coverageRatio.toFixed(2)}x`,
          f.saleLeasebackResult.coveragePassFail ? 'PASS' : 'FAIL',
        ]),
        [
          'Portfolio Total',
          portfolioResult.totalBeds.toString(),
          this.formatCurrency(portfolioResult.totalPurchasePrice),
          this.formatCurrency(portfolioResult.totalAnnualRent),
          this.formatCurrency(portfolioResult.totalEbitdar),
          `${portfolioResult.portfolioCoverageRatio.toFixed(2)}x`,
          portfolioResult.portfolioCoveragePassFail ? 'PASS' : 'FAIL',
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: COLORS.primary },
      alternateRowStyles: { fillColor: COLORS.light },
      margin: { left: this.margin, right: this.margin },
      didParseCell: (data) => {
        // Style the total row
        if (data.row.index === facilities.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
        }
        // Color code status column
        if (data.column.index === 6 && data.section === 'body') {
          const value = data.cell.raw as string;
          if (value === 'PASS') {
            data.cell.styles.textColor = COLORS.success;
          } else if (value === 'FAIL') {
            data.cell.styles.textColor = COLORS.danger;
          }
        }
      },
    });

    this.currentY = this.doc.lastAutoTable.finalY + 15;

    // Contribution analysis
    this.doc.setFontSize(12);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Contribution Analysis', this.margin, this.currentY);
    this.currentY += 8;

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Facility', '% of Purchase Price', '% of EBITDAR', '% of Beds']],
      body: portfolioResult.facilityContributions.map((c) => {
        const facility = facilities.find((f) => f.id === c.facilityId);
        return [
          facility?.name.substring(0, 25) || 'Unknown',
          this.formatPercent(c.percentOfTotalPurchasePrice),
          this.formatPercent(c.percentOfTotalEbitdar),
          this.formatPercent(c.percentOfTotalBeds),
        ];
      }),
      styles: { fontSize: 9 },
      headStyles: { fillColor: COLORS.primary },
      alternateRowStyles: { fillColor: COLORS.light },
      margin: { left: this.margin, right: this.margin },
    });
  }

  private addFacilityDetail(
    facility: FacilityExportData,
    facilityNum: number,
    assumptions: ExportInput['assumptions']
  ): void {
    const { financials, saleLeasebackResult } = facility;

    this.addSectionHeader(`Facility ${facilityNum}: ${facility.name}`);
    this.currentY += 10;

    // Property info
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Property Information', this.margin, this.currentY);
    this.currentY += 6;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.text(`Type: ${facility.assetType}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Location: ${facility.city || ''}, ${facility.state || ''}`, this.margin, this.currentY);
    this.currentY += 5;
    this.doc.text(`Licensed Beds: ${facility.beds}`, this.margin, this.currentY);
    this.currentY += 10;

    // Operating statement
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Operating Statement (T12)', this.margin, this.currentY);
    this.currentY += 6;

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Category', 'Amount', 'PPD']],
      body: [
        ['Revenue', '', ''],
        ['  Medicare Revenue', this.formatCurrency(financials.medicareRevenue || 0), ''],
        ['  Medicaid Revenue', this.formatCurrency(financials.medicaidRevenue || 0), ''],
        ['  Managed Care Revenue', this.formatCurrency(financials.managedCareRevenue || 0), ''],
        ['  Private Pay Revenue', this.formatCurrency(financials.privatePayRevenue || 0), ''],
        ['Total Revenue', this.formatCurrency(financials.totalRevenue), ''],
        ['', '', ''],
        ['Expenses', '', ''],
        ['  Labor Cost', this.formatCurrency(financials.laborCost || 0), ''],
        ['  Food Cost', this.formatCurrency(financials.foodCost || 0), ''],
        ['  Other Expenses', this.formatCurrency(financials.totalExpenses - (financials.laborCost || 0) - (financials.foodCost || 0)), ''],
        ['Total Expenses', this.formatCurrency(financials.totalExpenses), ''],
        ['', '', ''],
        ['EBITDAR', this.formatCurrency(financials.ebitdar), ''],
        ['Property NOI', this.formatCurrency(financials.noi), ''],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: COLORS.primary },
      margin: { left: this.margin, right: this.margin },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' },
        2: { cellWidth: 30, halign: 'right' },
      },
      didParseCell: (data) => {
        if (data.section === 'body') {
          const text = data.cell.raw as string;
          if (text === 'Revenue' || text === 'Expenses' || text === 'EBITDAR' || text === 'Property NOI' || text.startsWith('Total')) {
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    this.currentY = this.doc.lastAutoTable.finalY + 15;

    // Sale-leaseback analysis
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Sale-Leaseback Analysis', this.margin, this.currentY);
    this.currentY += 6;

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: [
        ['Applied Cap Rate', this.formatPercent(assumptions.capRate)],
        ['Purchase Price', this.formatCurrency(saleLeasebackResult.purchasePrice)],
        ['', ''],
        ['Buyer Yield Requirement', this.formatPercent(assumptions.buyerYieldRequirement)],
        ['Annual Rent', this.formatCurrency(saleLeasebackResult.annualRent)],
        ['Monthly Rent', this.formatCurrency(saleLeasebackResult.monthlyRent)],
        ['', ''],
        ['Coverage Ratio', `${saleLeasebackResult.coverageRatio.toFixed(2)}x`],
        ['Minimum Required', `${assumptions.minimumCoverageRatio.toFixed(2)}x`],
        ['Coverage Status', saleLeasebackResult.coveragePassFail ? 'PASS' : 'FAIL'],
        ['', ''],
        ['Cash Flow After Rent', this.formatCurrency(saleLeasebackResult.operatorCashFlowAfterRent)],
        ['Rent per Bed', this.formatCurrency(saleLeasebackResult.effectiveRentPerBed)],
        ['Rent as % of Revenue', this.formatPercent(saleLeasebackResult.rentAsPercentOfRevenue)],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: COLORS.primary },
      margin: { left: this.margin, right: this.margin },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 1) {
          const raw = String(data.cell.raw);
          if (raw === 'PASS') {
            data.cell.styles.textColor = COLORS.success;
            data.cell.styles.fontStyle = 'bold';
          } else if (raw === 'FAIL') {
            data.cell.styles.textColor = COLORS.danger;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });
  }

  private addCoverageAnalysis(input: ExportInput): void {
    const { facilities, portfolioResult, assumptions } = input;

    this.addSectionHeader('Coverage Analysis');
    this.currentY += 10;

    // Coverage explanation
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text(
      'Coverage Ratio = EBITDAR / Annual Rent. A ratio above the minimum threshold indicates',
      this.margin,
      this.currentY
    );
    this.currentY += 5;
    this.doc.text(
      'sufficient cash flow to cover rent obligations with a safety margin.',
      this.margin,
      this.currentY
    );
    this.currentY += 10;

    this.doc.setTextColor(...COLORS.secondary);

    // Coverage table
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Facility', 'EBITDAR', 'Annual Rent', 'Coverage Ratio', 'Min Required', 'Cushion', 'Status']],
      body: [
        ...facilities.map((f) => {
          const cushion = f.saleLeasebackResult.coverageRatio - assumptions.minimumCoverageRatio;
          return [
            f.name.substring(0, 20),
            this.formatCurrency(f.financials.ebitdar),
            this.formatCurrency(f.saleLeasebackResult.annualRent),
            `${f.saleLeasebackResult.coverageRatio.toFixed(2)}x`,
            `${assumptions.minimumCoverageRatio.toFixed(2)}x`,
            `${cushion >= 0 ? '+' : ''}${cushion.toFixed(2)}x`,
            f.saleLeasebackResult.coveragePassFail ? 'PASS' : 'FAIL',
          ];
        }),
        [
          'Portfolio',
          this.formatCurrency(portfolioResult.totalEbitdar),
          this.formatCurrency(portfolioResult.totalAnnualRent),
          `${portfolioResult.portfolioCoverageRatio.toFixed(2)}x`,
          `${assumptions.minimumCoverageRatio.toFixed(2)}x`,
          `${(portfolioResult.portfolioCoverageRatio - assumptions.minimumCoverageRatio) >= 0 ? '+' : ''}${(portfolioResult.portfolioCoverageRatio - assumptions.minimumCoverageRatio).toFixed(2)}x`,
          portfolioResult.portfolioCoveragePassFail ? 'PASS' : 'FAIL',
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: COLORS.primary },
      alternateRowStyles: { fillColor: COLORS.light },
      margin: { left: this.margin, right: this.margin },
      didParseCell: (data) => {
        if (data.row.index === facilities.length && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
        }
        if (data.column.index === 6 && data.section === 'body') {
          const value = data.cell.raw as string;
          if (value === 'PASS') {
            data.cell.styles.textColor = COLORS.success;
            data.cell.styles.fontStyle = 'bold';
          } else if (value === 'FAIL') {
            data.cell.styles.textColor = COLORS.danger;
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    this.currentY = this.doc.lastAutoTable.finalY + 15;

    // Summary
    const passingCount = facilities.filter((f) => f.saleLeasebackResult.coveragePassFail).length;
    const failingCount = facilities.length - passingCount;

    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Summary', this.margin, this.currentY);
    this.currentY += 8;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COLORS.success);
    this.doc.text(`• ${passingCount} facilities meet minimum coverage requirement`, this.margin, this.currentY);
    this.currentY += 6;

    if (failingCount > 0) {
      this.doc.setTextColor(...COLORS.danger);
      this.doc.text(`• ${failingCount} facilities below minimum coverage requirement`, this.margin, this.currentY);
      this.currentY += 6;
    }

    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text(
      `• Portfolio-level coverage ${portfolioResult.portfolioCoveragePassFail ? 'meets' : 'does not meet'} requirements`,
      this.margin,
      this.currentY
    );
  }

  private addValuationSummary(input: ExportInput): void {
    const { facilities, portfolioResult, assumptions } = input;

    this.addSectionHeader('Valuation Summary');
    this.currentY += 10;

    // Purchase price calculation
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Purchase Price Calculation', this.margin, this.currentY);
    this.currentY += 5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text('Formula: Purchase Price = Property NOI / Cap Rate', this.margin, this.currentY);
    this.currentY += 8;

    this.doc.setTextColor(...COLORS.secondary);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Facility', 'Property NOI', 'Cap Rate', 'Purchase Price', 'Price per Bed']],
      body: [
        ...facilities.map((f) => [
          f.name.substring(0, 20),
          this.formatCurrency(f.financials.noi),
          this.formatPercent(assumptions.capRate),
          this.formatCurrency(f.saleLeasebackResult.purchasePrice),
          this.formatCurrency(f.beds > 0 ? f.saleLeasebackResult.purchasePrice / f.beds : 0),
        ]),
        [
          'Portfolio Total',
          this.formatCurrency(facilities.reduce((sum, f) => sum + f.financials.noi, 0)),
          this.formatPercent(assumptions.capRate),
          this.formatCurrency(portfolioResult.totalPurchasePrice),
          this.formatCurrency(portfolioResult.totalBeds > 0 ? portfolioResult.totalPurchasePrice / portfolioResult.totalBeds : 0),
        ],
      ],
      styles: { fontSize: 9 },
      headStyles: { fillColor: COLORS.primary },
      alternateRowStyles: { fillColor: COLORS.light },
      margin: { left: this.margin, right: this.margin },
      didParseCell: (data) => {
        if (data.row.index === facilities.length && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
        }
      },
    });

    this.currentY = this.doc.lastAutoTable.finalY + 15;

    // Rent calculation
    this.doc.setFontSize(11);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Rent Calculation', this.margin, this.currentY);
    this.currentY += 5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text('Formula: Annual Rent = Purchase Price x Buyer Yield Requirement', this.margin, this.currentY);
    this.currentY += 8;

    this.doc.setTextColor(...COLORS.secondary);

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Facility', 'Purchase Price', 'Yield', 'Annual Rent', 'Monthly Rent', 'Rent per Bed']],
      body: [
        ...facilities.map((f) => [
          f.name.substring(0, 18),
          this.formatCurrency(f.saleLeasebackResult.purchasePrice),
          this.formatPercent(assumptions.buyerYieldRequirement),
          this.formatCurrency(f.saleLeasebackResult.annualRent),
          this.formatCurrency(f.saleLeasebackResult.monthlyRent),
          this.formatCurrency(f.saleLeasebackResult.effectiveRentPerBed),
        ]),
        [
          'Portfolio Total',
          this.formatCurrency(portfolioResult.totalPurchasePrice),
          this.formatPercent(assumptions.buyerYieldRequirement),
          this.formatCurrency(portfolioResult.totalAnnualRent),
          this.formatCurrency(portfolioResult.totalMonthlyRent),
          this.formatCurrency(portfolioResult.weightedAvgRentPerBed),
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: COLORS.primary },
      alternateRowStyles: { fillColor: COLORS.light },
      margin: { left: this.margin, right: this.margin },
      didParseCell: (data) => {
        if (data.row.index === facilities.length && data.section === 'body') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [220, 220, 220];
        }
      },
    });
  }

  // Helper methods

  private addSectionHeader(title: string): void {
    this.doc.setFontSize(16);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.primary);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 3;

    // Underline
    this.doc.setDrawColor(...COLORS.primary);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
  }

  private addNewPage(): void {
    this.doc.addPage();
    this.currentY = 20;
  }

  private addPageNumbers(): void {
    const pageCount = this.doc.getNumberOfPages();

    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(9);
      this.doc.setTextColor(...COLORS.muted);
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      );
    }
  }

  private drawMetricBox(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string
  ): void {
    // Box background
    this.doc.setFillColor(...COLORS.light);
    this.doc.roundedRect(x, y, width, height, 3, 3, 'F');

    // Border
    this.doc.setDrawColor(...COLORS.primary);
    this.doc.setLineWidth(0.5);
    this.doc.roundedRect(x, y, width, height, 3, 3, 'S');

    // Label
    this.doc.setFontSize(9);
    this.doc.setTextColor(...COLORS.muted);
    this.doc.text(label, x + width / 2, y + 12, { align: 'center' });

    // Value
    this.doc.setFontSize(14);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(...COLORS.secondary);
    this.doc.text(value, x + width / 2, y + 25, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
  }

  private formatCurrency(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  }

  private formatPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }
}

// Singleton instance
export const pdfReportGenerator = new PDFReportGenerator();
