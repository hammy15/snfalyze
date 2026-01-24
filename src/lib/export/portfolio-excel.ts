'use client';

import * as XLSX from 'xlsx';
import type { FacilityFinancials, PortfolioMetrics, PayerType } from '@/components/financials/types';

const PAYER_LABELS: Record<PayerType, string> = {
  medicare_part_a: 'Medicare Part A',
  medicare_advantage: 'Medicare Advantage',
  managed_care: 'Managed Care',
  medicaid: 'Medicaid',
  managed_medicaid: 'Managed Medicaid',
  private: 'Private Pay',
  va_contract: 'VA Contract',
  hospice: 'Hospice',
  other: 'Other',
};

interface ExportOptions {
  dealName: string;
  facilities: FacilityFinancials[];
  portfolioMetrics: PortfolioMetrics;
  includeProforma?: boolean;
}

export function exportPortfolioToExcel(options: ExportOptions): void {
  const { dealName, facilities, portfolioMetrics, includeProforma = true } = options;

  const workbook = XLSX.utils.book_new();

  // 1. Portfolio Summary Sheet
  const summaryData = [
    ['PORTFOLIO SUMMARY'],
    [''],
    ['Deal Name', dealName],
    ['Export Date', new Date().toLocaleDateString()],
    [''],
    ['KEY METRICS'],
    ['Total Facilities', portfolioMetrics.totalFacilities],
    ['Total Beds', portfolioMetrics.totalBeds],
    ['Total Patient Days', portfolioMetrics.totalDays],
    ['Weighted Occupancy', `${(portfolioMetrics.weightedOccupancy * 100).toFixed(1)}%`],
    [''],
    ['FINANCIAL SUMMARY'],
    ['Total Revenue', portfolioMetrics.totalRevenue],
    ['Total Expenses', portfolioMetrics.totalExpenses],
    ['EBITDAR', portfolioMetrics.totalEbitdar],
    ['EBITDA', portfolioMetrics.totalEbitda],
    ['Blended PPD', portfolioMetrics.weightedPPD],
    ['EBITDA Margin', `${(portfolioMetrics.weightedMargin * 100).toFixed(1)}%`],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 20 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // 2. Payer Mix Sheet
  const payerMixData = [
    ['COMBINED PAYER MIX'],
    [''],
    ['Payer Type', 'Total Days', '% Mix', 'Weighted PPD', 'Total Revenue'],
    ...portfolioMetrics.combinedPayerMix.map((p) => [
      PAYER_LABELS[p.payerType as PayerType] || p.payerType,
      p.totalDays,
      `${(p.percentMix * 100).toFixed(1)}%`,
      p.weightedPPD,
      p.totalRevenue,
    ]),
    [''],
    ['TOTAL', portfolioMetrics.totalDays, '100%', portfolioMetrics.weightedPPD, portfolioMetrics.totalRevenue],
  ];

  const payerMixSheet = XLSX.utils.aoa_to_sheet(payerMixData);
  payerMixSheet['!cols'] = [{ wch: 20 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, payerMixSheet, 'Payer Mix');

  // 3. Facility Comparison Sheet
  const facilityComparisonData = [
    ['FACILITY COMPARISON'],
    [''],
    ['Rank', 'Facility', 'Beds', 'Occupancy', 'Revenue', 'Expenses', 'EBITDAR', 'EBITDA', 'Margin'],
    ...portfolioMetrics.facilitiesRanked.map((f, index) => {
      const margin = f.totalRevenue > 0 ? f.ebitda / f.totalRevenue : 0;
      return [
        index + 1,
        f.facilityName,
        f.beds,
        `${(f.occupancy * 100).toFixed(1)}%`,
        f.totalRevenue,
        f.totalExpenses,
        f.ebitdar,
        f.ebitda,
        `${(margin * 100).toFixed(1)}%`,
      ];
    }),
    [''],
    [
      '',
      'PORTFOLIO TOTAL',
      portfolioMetrics.totalBeds,
      `${(portfolioMetrics.weightedOccupancy * 100).toFixed(1)}%`,
      portfolioMetrics.totalRevenue,
      portfolioMetrics.totalExpenses,
      portfolioMetrics.totalEbitdar,
      portfolioMetrics.totalEbitda,
      `${(portfolioMetrics.weightedMargin * 100).toFixed(1)}%`,
    ],
  ];

  const facilitySheet = XLSX.utils.aoa_to_sheet(facilityComparisonData);
  facilitySheet['!cols'] = [
    { wch: 6 },
    { wch: 35 },
    { wch: 8 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(workbook, facilitySheet, 'Facility Comparison');

  // 4. Individual Facility Sheets
  facilities.forEach((facility) => {
    const facilityData = [
      [facility.facilityName.toUpperCase()],
      [''],
      ['FACILITY DETAILS'],
      ['Beds', facility.beds],
      ['Total Patient Days', facility.totalDays],
      ['Occupancy', `${(facility.occupancy * 100).toFixed(1)}%`],
      ['Blended PPD', facility.blendedPPD],
      [''],
      ['FINANCIAL PERFORMANCE'],
      ['Total Revenue', facility.totalRevenue],
      ['Total Expenses', facility.totalExpenses],
      ['EBITDAR', facility.ebitdar],
      ['EBITDA', facility.ebitda],
      ['EBITDA Margin', `${((facility.ebitda / facility.totalRevenue) * 100).toFixed(1)}%`],
      [''],
      ['CENSUS BY PAYER'],
      ['Payer', 'Days', '% Mix'],
      ['Medicare Part A', facility.censusByPayer.medicarePartADays, formatMix(facility.censusByPayer.medicarePartADays, facility.totalDays)],
      ['Medicare Advantage', facility.censusByPayer.medicareAdvantageDays, formatMix(facility.censusByPayer.medicareAdvantageDays, facility.totalDays)],
      ['Managed Care', facility.censusByPayer.managedCareDays, formatMix(facility.censusByPayer.managedCareDays, facility.totalDays)],
      ['Medicaid', facility.censusByPayer.medicaidDays, formatMix(facility.censusByPayer.medicaidDays, facility.totalDays)],
      ['Managed Medicaid', facility.censusByPayer.managedMedicaidDays, formatMix(facility.censusByPayer.managedMedicaidDays, facility.totalDays)],
      ['Private Pay', facility.censusByPayer.privateDays, formatMix(facility.censusByPayer.privateDays, facility.totalDays)],
      ['VA Contract', facility.censusByPayer.vaContractDays, formatMix(facility.censusByPayer.vaContractDays, facility.totalDays)],
      ['Hospice', facility.censusByPayer.hospiceDays, formatMix(facility.censusByPayer.hospiceDays, facility.totalDays)],
      ['Other', facility.censusByPayer.otherDays, formatMix(facility.censusByPayer.otherDays, facility.totalDays)],
      ['TOTAL', facility.totalDays, '100%'],
      [''],
      ['REVENUE BY PAYER'],
      ['Payer', 'Revenue', 'PPD'],
      ['Medicare Part A', facility.revenueByPayer.medicarePartA, ppd(facility.revenueByPayer.medicarePartA, facility.censusByPayer.medicarePartADays)],
      ['Medicare Advantage', facility.revenueByPayer.medicareAdvantage, ppd(facility.revenueByPayer.medicareAdvantage, facility.censusByPayer.medicareAdvantageDays)],
      ['Managed Care', facility.revenueByPayer.managedCare, ppd(facility.revenueByPayer.managedCare, facility.censusByPayer.managedCareDays)],
      ['Medicaid', facility.revenueByPayer.medicaid, ppd(facility.revenueByPayer.medicaid, facility.censusByPayer.medicaidDays)],
      ['Managed Medicaid', facility.revenueByPayer.managedMedicaid, ppd(facility.revenueByPayer.managedMedicaid, facility.censusByPayer.managedMedicaidDays)],
      ['Private Pay', facility.revenueByPayer.private, ppd(facility.revenueByPayer.private, facility.censusByPayer.privateDays)],
      ['VA Contract', facility.revenueByPayer.vaContract, ppd(facility.revenueByPayer.vaContract, facility.censusByPayer.vaContractDays)],
      ['Hospice', facility.revenueByPayer.hospice, ppd(facility.revenueByPayer.hospice, facility.censusByPayer.hospiceDays)],
      ['Other', facility.revenueByPayer.other, ppd(facility.revenueByPayer.other, facility.censusByPayer.otherDays)],
      ['TOTAL', facility.totalRevenue, facility.blendedPPD],
    ];

    // Truncate sheet name to 31 chars (Excel limit)
    const sheetName = facility.facilityName.substring(0, 31).replace(/[*?:/\\[\]]/g, '');
    const facilitySheet = XLSX.utils.aoa_to_sheet(facilityData);
    facilitySheet['!cols'] = [{ wch: 20 }, { wch: 15 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, facilitySheet, sheetName);
  });

  // 5. Pro Forma Sheet (Combined)
  if (includeProforma) {
    const proformaData = [
      ['5-YEAR PRO FORMA PROJECTION'],
      [''],
      ['', 'Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'CAGR'],
      [''],
      ['PORTFOLIO TOTALS'],
      [
        'Patient Days',
        portfolioMetrics.totalDays,
        Math.round(portfolioMetrics.totalDays * 1.03),
        Math.round(portfolioMetrics.totalDays * 1.06),
        Math.round(portfolioMetrics.totalDays * 1.09),
        Math.round(portfolioMetrics.totalDays * 1.12),
        '3.0%',
      ],
      [
        'Revenue',
        portfolioMetrics.totalRevenue,
        Math.round(portfolioMetrics.totalRevenue * 1.05),
        Math.round(portfolioMetrics.totalRevenue * 1.10),
        Math.round(portfolioMetrics.totalRevenue * 1.16),
        Math.round(portfolioMetrics.totalRevenue * 1.22),
        '5.0%',
      ],
      [
        'Expenses',
        portfolioMetrics.totalExpenses,
        Math.round(portfolioMetrics.totalExpenses * 1.03),
        Math.round(portfolioMetrics.totalExpenses * 1.06),
        Math.round(portfolioMetrics.totalExpenses * 1.09),
        Math.round(portfolioMetrics.totalExpenses * 1.13),
        '3.0%',
      ],
      [
        'EBITDA',
        portfolioMetrics.totalEbitda,
        Math.round(portfolioMetrics.totalRevenue * 1.05 - portfolioMetrics.totalExpenses * 1.03),
        Math.round(portfolioMetrics.totalRevenue * 1.10 - portfolioMetrics.totalExpenses * 1.06),
        Math.round(portfolioMetrics.totalRevenue * 1.16 - portfolioMetrics.totalExpenses * 1.09),
        Math.round(portfolioMetrics.totalRevenue * 1.22 - portfolioMetrics.totalExpenses * 1.13),
        '',
      ],
    ];

    const proformaSheet = XLSX.utils.aoa_to_sheet(proformaData);
    proformaSheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, proformaSheet, 'Pro Forma');
  }

  // Generate filename and download
  const filename = `${dealName.replace(/[^a-zA-Z0-9]/g, '_')}_Portfolio_Financials_${
    new Date().toISOString().split('T')[0]
  }.xlsx`;

  XLSX.writeFile(workbook, filename);
}

function formatMix(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(1)}%`;
}

function ppd(revenue: number, days: number): number {
  if (days === 0) return 0;
  return Math.round((revenue / days) * 100) / 100;
}
