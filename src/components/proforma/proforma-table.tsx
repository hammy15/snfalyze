'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { MonthlyData, formatCurrency, formatPercent, formatNumber } from '@/lib/proforma/calculations';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ProformaRow {
  id: string;
  label: string;
  field: keyof MonthlyData;
  indent?: number;
  isHeader?: boolean;
  isSubtotal?: boolean;
  isTotal?: boolean;
  format?: 'currency' | 'percent' | 'number';
  children?: ProformaRow[];
}

const proformaRows: ProformaRow[] = [
  // Census Section
  {
    id: 'census_section',
    label: 'Census & Patient Days',
    field: 'licensedBeds',
    isHeader: true,
    children: [
      { id: 'licensed_beds', label: 'Licensed Beds', field: 'licensedBeds', indent: 1, format: 'number' },
      { id: 'occupied_beds', label: 'Occupied Beds (Avg)', field: 'occupiedBeds', indent: 1, format: 'number' },
      { id: 'occupancy_rate', label: 'Occupancy Rate', field: 'occupancyRate', indent: 1, format: 'percent' },
      { id: 'total_patient_days', label: 'Total Patient Days', field: 'totalPatientDays', indent: 1, format: 'number', isSubtotal: true },
    ],
  },

  // Revenue Section
  {
    id: 'revenue_section',
    label: 'Revenue',
    field: 'totalRevenue',
    isHeader: true,
    children: [
      { id: 'non_skilled_header', label: 'Non-Skilled Revenue', field: 'totalNonSkilledRevenue', indent: 1, isHeader: true },
      { id: 'medicaid_revenue', label: 'Medicaid Revenue', field: 'medicaidRevenue', indent: 2 },
      { id: 'managed_medicaid_revenue', label: 'Managed Medicaid Revenue', field: 'managedMedicaidRevenue', indent: 2 },
      { id: 'private_revenue', label: 'Private Revenue', field: 'privateRevenue', indent: 2 },
      { id: 'veterans_revenue', label: 'Veterans Revenue', field: 'veteransRevenue', indent: 2 },
      { id: 'hospice_revenue', label: 'Hospice Revenue', field: 'hospiceRevenue', indent: 2 },
      { id: 'total_non_skilled', label: 'Total Non-Skilled Revenue', field: 'totalNonSkilledRevenue', indent: 1, isSubtotal: true },

      { id: 'skilled_header', label: 'Skilled Revenue', field: 'totalSkilledRevenue', indent: 1, isHeader: true },
      { id: 'medicare_revenue', label: 'Medicare Revenue', field: 'medicareRevenue', indent: 2 },
      { id: 'hmo_revenue', label: 'HMO Revenue', field: 'hmoRevenue', indent: 2 },
      { id: 'isnp_revenue', label: 'ISNP Revenue', field: 'isnpRevenue', indent: 2 },
      { id: 'total_skilled', label: 'Total Skilled Revenue', field: 'totalSkilledRevenue', indent: 1, isSubtotal: true },

      { id: 'other_rev_header', label: 'Other Revenue', field: 'totalOtherRevenue', indent: 1, isHeader: true },
      { id: 'med_b_revenue', label: 'Med B', field: 'medBRevenue', indent: 2 },
      { id: 'upl_revenue', label: 'UPL', field: 'uplRevenue', indent: 2 },
      { id: 'other_revenue', label: 'Other', field: 'otherRevenue', indent: 2 },
      { id: 'total_other_rev', label: 'Total Other Revenue', field: 'totalOtherRevenue', indent: 1, isSubtotal: true },

      { id: 'total_revenue', label: 'Total Revenue', field: 'totalRevenue', indent: 0, isTotal: true },
    ],
  },

  // Operating Expenses Section
  {
    id: 'opex_section',
    label: 'Operating Expenses',
    field: 'totalOperatingExpenses',
    isHeader: true,
    children: [
      { id: 'nursing_header', label: 'Nursing Expenses', field: 'totalNursingExpenses', indent: 1, isHeader: true },
      { id: 'nursing_wages', label: 'Wages', field: 'nursingWages', indent: 2 },
      { id: 'nursing_benefits', label: 'Benefits', field: 'nursingBenefits', indent: 2 },
      { id: 'nursing_agency', label: 'Agency/Contract', field: 'nursingAgency', indent: 2 },
      { id: 'nursing_supplies', label: 'Patient Supplies', field: 'nursingSupplies', indent: 2 },
      { id: 'nursing_other', label: 'Other', field: 'nursingOther', indent: 2 },
      { id: 'total_nursing', label: 'Total Nursing', field: 'totalNursingExpenses', indent: 1, isSubtotal: true },

      { id: 'therapy_header', label: 'Therapy Expenses', field: 'totalTherapyExpenses', indent: 1, isHeader: true },
      { id: 'therapy_wages', label: 'Wages', field: 'therapyWages', indent: 2 },
      { id: 'therapy_benefits', label: 'Benefits', field: 'therapyBenefits', indent: 2 },
      { id: 'therapy_other', label: 'Other', field: 'therapyOther', indent: 2 },
      { id: 'total_therapy', label: 'Total Therapy', field: 'totalTherapyExpenses', indent: 1, isSubtotal: true },

      { id: 'dietary_header', label: 'Dietary Expenses', field: 'totalDietaryExpenses', indent: 1, isHeader: true },
      { id: 'dietary_wages', label: 'Wages', field: 'dietaryWages', indent: 2 },
      { id: 'dietary_benefits', label: 'Benefits', field: 'dietaryBenefits', indent: 2 },
      { id: 'dietary_food', label: 'Food & Supplements', field: 'dietaryFood', indent: 2 },
      { id: 'dietary_other', label: 'Other', field: 'dietaryOther', indent: 2 },
      { id: 'total_dietary', label: 'Total Dietary', field: 'totalDietaryExpenses', indent: 1, isSubtotal: true },

      { id: 'plant_header', label: 'Plant Expenses', field: 'totalPlantExpenses', indent: 1, isHeader: true },
      { id: 'plant_wages', label: 'Wages', field: 'plantWages', indent: 2 },
      { id: 'plant_benefits', label: 'Benefits', field: 'plantBenefits', indent: 2 },
      { id: 'plant_utilities', label: 'Utilities', field: 'plantUtilities', indent: 2 },
      { id: 'plant_maintenance', label: 'Minor Equip/R&M', field: 'plantMaintenance', indent: 2 },
      { id: 'plant_other', label: 'Other', field: 'plantOther', indent: 2 },
      { id: 'total_plant', label: 'Total Plant', field: 'totalPlantExpenses', indent: 1, isSubtotal: true },

      { id: 'admin_header', label: 'Administration Expenses', field: 'totalAdminExpenses', indent: 1, isHeader: true },
      { id: 'admin_wages', label: 'Wages', field: 'adminWages', indent: 2 },
      { id: 'admin_benefits', label: 'Benefits', field: 'adminBenefits', indent: 2 },
      { id: 'admin_insurance', label: 'Insurance', field: 'adminInsurance', indent: 2 },
      { id: 'admin_it', label: 'IT', field: 'adminIT', indent: 2 },
      { id: 'admin_legal', label: 'Legal Fees', field: 'adminLegal', indent: 2 },
      { id: 'admin_other', label: 'Other', field: 'adminOther', indent: 2 },
      { id: 'total_admin', label: 'Total Administration', field: 'totalAdminExpenses', indent: 1, isSubtotal: true },

      { id: 'bad_debt', label: 'Bad Debt', field: 'badDebt', indent: 1 },
      { id: 'bed_tax', label: 'Bed Tax', field: 'bedTax', indent: 1 },

      { id: 'total_opex', label: 'Total Operating Expenses', field: 'totalOperatingExpenses', indent: 0, isTotal: true },
    ],
  },

  // EBITDAR Section
  {
    id: 'ebitdar_section',
    label: 'EBITDAR',
    field: 'ebitdar',
    isHeader: true,
    children: [
      { id: 'management_fee', label: 'Management Fee', field: 'managementFee', indent: 1 },
      { id: 'ebitdar', label: 'EBITDAR', field: 'ebitdar', indent: 0, isTotal: true },
      { id: 'ebitdar_margin', label: 'EBITDAR Margin', field: 'ebitdarMargin', indent: 0, format: 'percent' },
    ],
  },

  // Property Section
  {
    id: 'property_section',
    label: 'Property Expenses',
    field: 'totalPropertyExpenses',
    isHeader: true,
    children: [
      { id: 'rent_expense', label: 'Rent/Lease Expense', field: 'rentExpense', indent: 1 },
      { id: 'property_taxes', label: 'Property Taxes', field: 'propertyTaxes', indent: 1 },
      { id: 'total_property', label: 'Total Property Expenses', field: 'totalPropertyExpenses', indent: 0, isSubtotal: true },
    ],
  },

  // EBITDA Section
  {
    id: 'ebitda_section',
    label: 'EBITDA',
    field: 'ebitda',
    isHeader: true,
    children: [
      { id: 'ebitda', label: 'EBITDA', field: 'ebitda', indent: 0, isTotal: true },
      { id: 'ebitda_margin', label: 'EBITDA Margin', field: 'ebitdaMargin', indent: 0, format: 'percent' },
    ],
  },

  // Other Expenses Section
  {
    id: 'other_section',
    label: 'Other Expenses',
    field: 'totalOtherExpenses',
    isHeader: true,
    children: [
      { id: 'depreciation', label: 'Depreciation & Amortization', field: 'depreciation', indent: 1 },
      { id: 'interest', label: 'Interest', field: 'interest', indent: 1 },
      { id: 'other_misc', label: 'Other Misc', field: 'otherMisc', indent: 1 },
      { id: 'total_other', label: 'Total Other Expenses', field: 'totalOtherExpenses', indent: 0, isSubtotal: true },
    ],
  },

  // Net Income Section
  {
    id: 'net_income_section',
    label: 'Net Income',
    field: 'netIncome',
    isHeader: true,
    children: [
      { id: 'net_income', label: 'Net Income', field: 'netIncome', indent: 0, isTotal: true },
      { id: 'net_income_margin', label: 'Net Income Margin', field: 'netIncomeMargin', indent: 0, format: 'percent' },
    ],
  },
];

interface ProformaTableProps {
  monthlyData: MonthlyData[];
  yearlyTotal: MonthlyData;
  months: Date[];
  className?: string;
}

export function ProformaTable({
  monthlyData,
  yearlyTotal,
  months,
  className,
}: ProformaTableProps) {
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const formatValue = (value: number, format?: 'currency' | 'percent' | 'number'): string => {
    switch (format) {
      case 'percent':
        return formatPercent(value);
      case 'number':
        return formatNumber(value);
      default:
        return formatCurrency(value);
    }
  };

  const monthHeaders = months.map((date) =>
    date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  );

  const renderRows = (rows: ProformaRow[], parentCollapsed: boolean = false): React.ReactNode[] => {
    const result: React.ReactNode[] = [];

    rows.forEach((row) => {
      const isSection = row.isHeader && row.children;
      const isCollapsed = collapsedSections.has(row.id);
      const isHidden = parentCollapsed;

      if (!isHidden) {
        result.push(
          <tr
            key={row.id}
            className={cn(
              row.isHeader && !row.indent && 'bg-[var(--gray-100)]',
              row.isTotal && 'bg-[var(--accent-light)] font-semibold',
              row.isSubtotal && 'font-medium'
            )}
          >
            <td
              className={cn(
                'sticky left-0 bg-inherit px-3 py-2 text-sm whitespace-nowrap border-r border-[var(--color-border-muted)]',
                row.isHeader && !row.indent && 'font-semibold',
              )}
              style={{ paddingLeft: `${(row.indent || 0) * 16 + 12}px` }}
            >
              <div className="flex items-center gap-1">
                {isSection && (
                  <button
                    onClick={() => toggleSection(row.id)}
                    className="p-0.5 hover:bg-[var(--gray-200)] rounded"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}
                {row.label}
              </div>
            </td>
            {monthlyData.map((month, idx) => (
              <td
                key={idx}
                className={cn(
                  'px-3 py-2 text-sm text-right tabular-nums whitespace-nowrap',
                  row.isTotal && 'font-semibold'
                )}
              >
                {formatValue(month[row.field] as number, row.format)}
              </td>
            ))}
            <td
              className={cn(
                'px-3 py-2 text-sm text-right tabular-nums whitespace-nowrap font-semibold bg-[var(--gray-50)] border-l border-[var(--color-border-muted)]',
              )}
            >
              {formatValue(yearlyTotal[row.field] as number, row.format)}
            </td>
          </tr>
        );
      }

      if (row.children && !isCollapsed && !isHidden) {
        result.push(...renderRows(row.children, false));
      }
    });

    return result;
  };

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[var(--gray-50)] border-b border-[var(--color-border-muted)]">
              <th className="sticky left-0 bg-[var(--gray-50)] px-3 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-r border-[var(--color-border-muted)] min-w-[220px]">
                Line Item
              </th>
              {monthHeaders.map((header, idx) => (
                <th
                  key={idx}
                  className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider min-w-[100px]"
                >
                  {header}
                </th>
              ))}
              <th className="px-3 py-3 text-right text-xs font-semibold text-[var(--color-text-primary)] uppercase tracking-wider bg-[var(--gray-100)] border-l border-[var(--color-border-muted)] min-w-[110px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-muted)]">
            {renderRows(proformaRows)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
