'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, Settings, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PLLineItem, formatCurrency, formatPPD, formatPercent } from './types';

interface IncomeStatementProps {
  facilityId: string;
  facilityName: string;
  period: string;
  totalPatientDays: number;
  lineItems: PLLineItem[];
  budgetLineItems?: PLLineItem[];
  onExport?: () => void;
  onMapAccounts?: () => void;
}

type ViewMode = 'actual' | 'budget' | 'variance';

interface PLSection {
  id: string;
  label: string;
  type: 'revenue' | 'expense' | 'metric';
  items: PLLineItem[];
  subtotal?: PLLineItem;
}

const DEFAULT_COA_STRUCTURE: PLSection[] = [
  {
    id: 'revenue',
    label: 'Revenue',
    type: 'revenue',
    items: [
      { coaCode: '4100', label: 'Room & Board', category: 'revenue', actual: 0, ppd: 0 },
      { coaCode: '4200', label: 'Ancillary Revenue', category: 'revenue', actual: 0, ppd: 0 },
      { coaCode: '4300', label: 'Therapy Revenue', category: 'revenue', actual: 0, ppd: 0 },
      { coaCode: '4400', label: 'Other Revenue', category: 'revenue', actual: 0, ppd: 0 },
    ],
    subtotal: { coaCode: '4000', label: 'TOTAL REVENUE', category: 'total', actual: 0, ppd: 0, isHighlighted: true },
  },
  {
    id: 'nursing',
    label: 'Nursing Expenses',
    type: 'expense',
    items: [
      { coaCode: '5110', label: 'Salaries & Wages', category: 'expense', subcategory: 'nursing', actual: 0, ppd: 0 },
      { coaCode: '5120', label: 'Employee Benefits', category: 'expense', subcategory: 'nursing', actual: 0, ppd: 0 },
      { coaCode: '5130', label: 'Contract Labor', category: 'expense', subcategory: 'nursing', actual: 0, ppd: 0 },
      { coaCode: '5140', label: 'Supplies', category: 'expense', subcategory: 'nursing', actual: 0, ppd: 0 },
    ],
    subtotal: { coaCode: '5100', label: 'Total Nursing', category: 'subtotal', actual: 0, ppd: 0 },
  },
  {
    id: 'dietary',
    label: 'Dietary Expenses',
    type: 'expense',
    items: [
      { coaCode: '5210', label: 'Dietary Wages', category: 'expense', subcategory: 'dietary', actual: 0, ppd: 0 },
      { coaCode: '5220', label: 'Food & Supplies', category: 'expense', subcategory: 'dietary', actual: 0, ppd: 0 },
    ],
    subtotal: { coaCode: '5200', label: 'Total Dietary', category: 'subtotal', actual: 0, ppd: 0 },
  },
  {
    id: 'plant',
    label: 'Plant & Utilities',
    type: 'expense',
    items: [
      { coaCode: '5310', label: 'Utilities', category: 'expense', subcategory: 'plant', actual: 0, ppd: 0 },
      { coaCode: '5320', label: 'Maintenance & Repairs', category: 'expense', subcategory: 'plant', actual: 0, ppd: 0 },
      { coaCode: '5330', label: 'Housekeeping', category: 'expense', subcategory: 'plant', actual: 0, ppd: 0 },
    ],
    subtotal: { coaCode: '5300', label: 'Total Plant', category: 'subtotal', actual: 0, ppd: 0 },
  },
  {
    id: 'admin',
    label: 'Administrative',
    type: 'expense',
    items: [
      { coaCode: '5410', label: 'Admin Salaries', category: 'expense', subcategory: 'admin', actual: 0, ppd: 0 },
      { coaCode: '5420', label: 'Insurance', category: 'expense', subcategory: 'admin', actual: 0, ppd: 0 },
      { coaCode: '5430', label: 'Professional Fees', category: 'expense', subcategory: 'admin', actual: 0, ppd: 0 },
      { coaCode: '5440', label: 'Other G&A', category: 'expense', subcategory: 'admin', actual: 0, ppd: 0 },
    ],
    subtotal: { coaCode: '5400', label: 'Total Administrative', category: 'subtotal', actual: 0, ppd: 0 },
  },
  {
    id: 'other_ops',
    label: 'Other Operating',
    type: 'expense',
    items: [
      { coaCode: '5510', label: 'Property Tax', category: 'expense', subcategory: 'other', actual: 0, ppd: 0 },
      { coaCode: '5520', label: 'Management Fee', category: 'expense', subcategory: 'other', actual: 0, ppd: 0 },
      { coaCode: '5530', label: 'Other Operating', category: 'expense', subcategory: 'other', actual: 0, ppd: 0 },
    ],
    subtotal: { coaCode: '5500', label: 'Total Other Operating', category: 'subtotal', actual: 0, ppd: 0 },
  },
];

export function IncomeStatement({
  facilityId,
  facilityName,
  period,
  totalPatientDays,
  lineItems,
  budgetLineItems = [],
  onExport,
  onMapAccounts,
}: IncomeStatementProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('variance');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Merge provided line items with default structure
  const sections = useMemo(() => {
    const itemMap = new Map(lineItems.map((item) => [item.coaCode, item]));
    const budgetMap = new Map(budgetLineItems.map((item) => [item.coaCode, item]));

    return DEFAULT_COA_STRUCTURE.map((section) => {
      const mergedItems = section.items.map((defaultItem) => {
        const actualItem = itemMap.get(defaultItem.coaCode);
        const budgetItem = budgetMap.get(defaultItem.coaCode);

        const actual = actualItem?.actual ?? defaultItem.actual;
        const budget = budgetItem?.actual ?? actualItem?.budget;
        const variance = budget ? actual - budget : undefined;
        const variancePercent = budget && budget !== 0 ? ((actual - budget) / budget) * 100 : undefined;
        const ppd = totalPatientDays > 0 ? actual / totalPatientDays : 0;

        return {
          ...defaultItem,
          ...actualItem,
          actual,
          ppd,
          budget,
          variance,
          variancePercent,
        };
      });

      // Calculate subtotal
      const subtotalActual = mergedItems.reduce((sum, item) => sum + item.actual, 0);
      const subtotalBudget = mergedItems.reduce((sum, item) => sum + (item.budget || 0), 0);
      const subtotal = section.subtotal
        ? {
            ...section.subtotal,
            actual: subtotalActual,
            ppd: totalPatientDays > 0 ? subtotalActual / totalPatientDays : 0,
            budget: subtotalBudget || undefined,
            variance: subtotalBudget ? subtotalActual - subtotalBudget : undefined,
            variancePercent: subtotalBudget ? ((subtotalActual - subtotalBudget) / subtotalBudget) * 100 : undefined,
          }
        : undefined;

      return { ...section, items: mergedItems, subtotal };
    });
  }, [lineItems, budgetLineItems, totalPatientDays]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const totalRevenue = sections.find((s) => s.id === 'revenue')?.subtotal?.actual || 0;
    const totalExpenses = sections
      .filter((s) => s.type === 'expense')
      .reduce((sum, s) => sum + (s.subtotal?.actual || 0), 0);

    const ebitdar = totalRevenue - totalExpenses;
    const rent = lineItems.find((i) => i.coaCode === '6100')?.actual || 0;
    const ebitda = ebitdar - rent;

    return {
      totalRevenue,
      totalExpenses,
      ebitdar,
      ebitdarMargin: totalRevenue > 0 ? ebitdar / totalRevenue : 0,
      rent,
      ebitda,
      ebitdaMargin: totalRevenue > 0 ? ebitda / totalRevenue : 0,
    };
  }, [sections, lineItems]);

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const renderVarianceIndicator = (variancePercent: number | undefined, isExpense: boolean) => {
    if (variancePercent === undefined) return null;

    // For expenses, positive variance is bad (over budget), negative is good
    // For revenue, positive variance is good (over budget), negative is bad
    const isGood = isExpense ? variancePercent < 0 : variancePercent > 0;
    const isBad = isExpense ? variancePercent > 5 : variancePercent < -5;

    return (
      <span className={`flex items-center gap-1 ${isBad ? 'text-red-600' : isGood ? 'text-green-600' : 'text-muted-foreground'}`}>
        {isBad && <AlertTriangle className="h-3 w-3" />}
        {isGood && Math.abs(variancePercent) > 2 && <CheckCircle2 className="h-3 w-3" />}
        <span className="tabular-nums">
          {variancePercent > 0 ? '+' : ''}{variancePercent.toFixed(1)}%
        </span>
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Income Statement</CardTitle>
            <CardDescription>
              {facilityName} · {period} · {formatNumber(totalPatientDays)} patient days
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual">Actual Only</SelectItem>
                <SelectItem value="budget">vs Budget</SelectItem>
                <SelectItem value="variance">Variance</SelectItem>
              </SelectContent>
            </Select>
            {onMapAccounts && (
              <Button variant="outline" size="sm" onClick={onMapAccounts}>
                <Settings className="h-4 w-4 mr-1" />
                Map
              </Button>
            )}
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3 font-medium w-64">Category</th>
                <th className="text-right py-2 px-3 font-medium">Actual</th>
                <th className="text-right py-2 px-3 font-medium">PPD</th>
                {(viewMode === 'budget' || viewMode === 'variance') && (
                  <th className="text-right py-2 px-3 font-medium">Budget</th>
                )}
                {viewMode === 'variance' && (
                  <th className="text-right py-2 px-3 font-medium">Var %</th>
                )}
              </tr>
            </thead>
            <tbody>
              {sections.map((section) => (
                <>
                  {/* Section Header */}
                  <tr
                    key={`header-${section.id}`}
                    className="bg-muted/50 cursor-pointer hover:bg-muted/70"
                    onClick={() => toggleSection(section.id)}
                  >
                    <td colSpan={viewMode === 'variance' ? 5 : viewMode === 'budget' ? 4 : 3} className="py-2 px-3 font-semibold">
                      <span className="flex items-center gap-2">
                        <span className={`transform transition-transform ${collapsedSections.has(section.id) ? '' : 'rotate-90'}`}>
                          ▶
                        </span>
                        {section.label}
                      </span>
                    </td>
                  </tr>

                  {/* Line Items */}
                  {!collapsedSections.has(section.id) &&
                    section.items.map((item) => (
                      <tr key={item.coaCode} className="border-b border-muted/30 hover:bg-muted/20">
                        <td className="py-1.5 px-3 pl-8" style={{ paddingLeft: `${(item.indent || 0) * 16 + 32}px` }}>
                          {item.label}
                        </td>
                        <td className="py-1.5 px-3 text-right tabular-nums">{formatCurrency(item.actual)}</td>
                        <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">{formatPPD(item.ppd)}</td>
                        {(viewMode === 'budget' || viewMode === 'variance') && (
                          <td className="py-1.5 px-3 text-right tabular-nums text-muted-foreground">
                            {item.budget !== undefined ? formatCurrency(item.budget) : '—'}
                          </td>
                        )}
                        {viewMode === 'variance' && (
                          <td className="py-1.5 px-3 text-right">
                            {renderVarianceIndicator(item.variancePercent, section.type === 'expense')}
                          </td>
                        )}
                      </tr>
                    ))}

                  {/* Section Subtotal */}
                  {section.subtotal && (
                    <tr
                      key={`subtotal-${section.id}`}
                      className={`font-medium ${section.subtotal.isHighlighted ? 'bg-primary/5 font-bold' : 'bg-muted/30'}`}
                    >
                      <td className="py-2 px-3 pl-4">{section.subtotal.label}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(section.subtotal.actual)}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatPPD(section.subtotal.ppd)}</td>
                      {(viewMode === 'budget' || viewMode === 'variance') && (
                        <td className="py-2 px-3 text-right tabular-nums">
                          {section.subtotal.budget !== undefined ? formatCurrency(section.subtotal.budget) : '—'}
                        </td>
                      )}
                      {viewMode === 'variance' && (
                        <td className="py-2 px-3 text-right">
                          {renderVarianceIndicator(section.subtotal.variancePercent, section.type === 'expense')}
                        </td>
                      )}
                    </tr>
                  )}
                </>
              ))}

              {/* Total Operating Expenses */}
              <tr className="border-t-2 border-foreground/20 font-semibold bg-muted/30">
                <td className="py-2 px-3">TOTAL OPERATING EXPENSES</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(metrics.totalExpenses)}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {formatPPD(totalPatientDays > 0 ? metrics.totalExpenses / totalPatientDays : 0)}
                </td>
                {(viewMode === 'budget' || viewMode === 'variance') && <td className="py-2 px-3"></td>}
                {viewMode === 'variance' && <td className="py-2 px-3"></td>}
              </tr>

              {/* EBITDAR */}
              <tr className="font-bold bg-primary/10">
                <td className="py-3 px-3">EBITDAR</td>
                <td className="py-3 px-3 text-right tabular-nums text-lg">{formatCurrency(metrics.ebitdar)}</td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {formatPPD(totalPatientDays > 0 ? metrics.ebitdar / totalPatientDays : 0)}
                </td>
                {(viewMode === 'budget' || viewMode === 'variance') && <td className="py-3 px-3"></td>}
                {viewMode === 'variance' && (
                  <td className="py-3 px-3 text-right">
                    <Badge variant="outline" className="font-normal">
                      {formatPercent(metrics.ebitdarMargin)} margin
                    </Badge>
                  </td>
                )}
              </tr>

              {/* Rent */}
              <tr className="border-b border-muted/50">
                <td className="py-2 px-3 pl-6">Rent/Lease</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(metrics.rent)}</td>
                <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                  {formatPPD(totalPatientDays > 0 ? metrics.rent / totalPatientDays : 0)}
                </td>
                {(viewMode === 'budget' || viewMode === 'variance') && <td className="py-2 px-3"></td>}
                {viewMode === 'variance' && <td className="py-2 px-3"></td>}
              </tr>

              {/* EBITDA */}
              <tr className="font-bold bg-green-100 dark:bg-green-950/50">
                <td className="py-3 px-3">EBITDA</td>
                <td className="py-3 px-3 text-right tabular-nums text-lg">{formatCurrency(metrics.ebitda)}</td>
                <td className="py-3 px-3 text-right tabular-nums">
                  {formatPPD(totalPatientDays > 0 ? metrics.ebitda / totalPatientDays : 0)}
                </td>
                {(viewMode === 'budget' || viewMode === 'variance') && <td className="py-3 px-3"></td>}
                {viewMode === 'variance' && (
                  <td className="py-3 px-3 text-right">
                    <Badge variant={metrics.ebitdaMargin >= 0.15 ? 'default' : 'secondary'} className="font-normal">
                      {formatPercent(metrics.ebitdaMargin)} margin
                    </Badge>
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export default IncomeStatement;
