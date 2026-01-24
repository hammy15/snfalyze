'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Save, Download, Settings2, ChevronDown, RotateCcw } from 'lucide-react';
import {
  ProformaAssumption,
  ProformaOverride,
  YearlyProforma,
  formatCurrency,
  formatPercent,
  formatNumber,
} from './types';

interface ProformaEditorProps {
  facilityId: string;
  facilityName: string;
  scenarioId: string;
  scenarioName: string;
  baseYear: number;
  projectionYears?: number;
  initialAssumptions: ProformaAssumption[];
  initialOverrides?: ProformaOverride[];
  baselineData: YearlyProforma;
  onSave?: (assumptions: ProformaAssumption[], overrides: ProformaOverride[]) => Promise<void>;
  onExport?: () => void;
}

interface ProformaRow {
  id: string;
  label: string;
  category: 'census' | 'revenue' | 'expense' | 'metric';
  format: 'number' | 'currency' | 'percent';
  isEditable?: boolean;
  isHighlighted?: boolean;
  values: number[];
  cagr?: number;
}

const DEFAULT_ASSUMPTIONS: ProformaAssumption[] = [
  { key: 'medicare_rate_increase', label: 'Medicare Rate Increase', value: 0.03, category: 'revenue' },
  { key: 'medicaid_rate_increase', label: 'Medicaid Rate Increase', value: 0.015, category: 'revenue' },
  { key: 'private_rate_increase', label: 'Private Pay Rate Increase', value: 0.04, category: 'revenue' },
  { key: 'wage_increase', label: 'Wage Increase', value: 0.035, category: 'expense' },
  { key: 'benefits_inflation', label: 'Benefits Inflation', value: 0.05, category: 'expense' },
  { key: 'general_inflation', label: 'General Inflation', value: 0.025, category: 'expense' },
  { key: 'occupancy_target_y1', label: 'Occupancy Target Y1', value: 0.86, category: 'census' },
  { key: 'occupancy_target_y3', label: 'Occupancy Target Y3', value: 0.90, category: 'census' },
  { key: 'occupancy_target_y5', label: 'Occupancy Target Y5', value: 0.92, category: 'census' },
  { key: 'rent_escalation', label: 'Rent Escalation', value: 0.02, category: 'growth' },
];

export function ProformaEditor({
  facilityId,
  facilityName,
  scenarioId,
  scenarioName,
  baseYear,
  projectionYears = 5,
  initialAssumptions,
  initialOverrides = [],
  baselineData,
  onSave,
  onExport,
}: ProformaEditorProps) {
  const [assumptions, setAssumptions] = useState<ProformaAssumption[]>(
    initialAssumptions.length > 0 ? initialAssumptions : DEFAULT_ASSUMPTIONS
  );
  const [overrides, setOverrides] = useState<ProformaOverride[]>(initialOverrides);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Get assumption value by key
  const getAssumption = useCallback(
    (key: string): number => {
      return assumptions.find((a) => a.key === key)?.value ?? 0;
    },
    [assumptions]
  );

  // Calculate interpolated occupancy for a given year
  const getOccupancyForYear = useCallback(
    (yearIndex: number): number => {
      const y1 = getAssumption('occupancy_target_y1');
      const y3 = getAssumption('occupancy_target_y3');
      const y5 = getAssumption('occupancy_target_y5');

      if (yearIndex <= 0) return y1;
      if (yearIndex <= 2) return y1 + ((y3 - y1) / 2) * yearIndex;
      if (yearIndex <= 4) return y3 + ((y5 - y3) / 2) * (yearIndex - 2);
      return y5;
    },
    [getAssumption]
  );

  // Generate pro forma projections
  const projectedData = useMemo(() => {
    const years: YearlyProforma[] = [];

    for (let i = 0; i < projectionYears; i++) {
      const year = baseYear + i;

      // Census & Days
      const occupancy = getOccupancyForYear(i);
      const totalDays = Math.round(baselineData.totalDays * (occupancy / baselineData.occupancy));

      // Revenue growth (weighted average of rate increases)
      const revenueGrowth = i === 0 ? 1 : 1 + (
        getAssumption('medicare_rate_increase') * 0.3 +
        getAssumption('medicaid_rate_increase') * 0.5 +
        getAssumption('private_rate_increase') * 0.2
      );

      // Revenue calculation
      const revenue = i === 0
        ? baselineData.revenue
        : years[i - 1].revenue * revenueGrowth * (totalDays / years[i - 1].totalDays);

      // Expense growth (weighted)
      const expenseGrowth = i === 0 ? 1 : 1 + (
        getAssumption('wage_increase') * 0.6 +
        getAssumption('benefits_inflation') * 0.15 +
        getAssumption('general_inflation') * 0.25
      );

      const expenses = i === 0
        ? baselineData.expenses
        : years[i - 1].expenses * expenseGrowth * (totalDays / years[i - 1].totalDays) * 0.95; // Slight efficiency gain

      // EBITDAR
      const ebitdar = revenue - expenses;

      // Rent with escalation
      const rent = i === 0
        ? baselineData.rent
        : years[i - 1].rent * (1 + getAssumption('rent_escalation'));

      // EBITDA
      const ebitda = ebitdar - rent;
      const ebitdaMargin = revenue > 0 ? ebitda / revenue : 0;

      years.push({
        year,
        totalDays,
        occupancy,
        revenue,
        expenses,
        ebitdar,
        rent,
        ebitda,
        ebitdaMargin,
      });
    }

    return years;
  }, [baseYear, projectionYears, baselineData, getOccupancyForYear, getAssumption]);

  // Build rows for the pro forma table
  const rows: ProformaRow[] = useMemo(() => {
    const calculateCAGR = (values: number[]): number | undefined => {
      if (values.length < 2 || values[0] <= 0 || values[values.length - 1] <= 0) return undefined;
      return Math.pow(values[values.length - 1] / values[0], 1 / (values.length - 1)) - 1;
    };

    return [
      {
        id: 'total_days',
        label: 'Total Patient Days',
        category: 'census',
        format: 'number',
        values: projectedData.map((d) => d.totalDays),
        cagr: calculateCAGR(projectedData.map((d) => d.totalDays)),
      },
      {
        id: 'occupancy',
        label: 'Occupancy %',
        category: 'census',
        format: 'percent',
        values: projectedData.map((d) => d.occupancy),
      },
      {
        id: 'revenue',
        label: 'Total Revenue',
        category: 'revenue',
        format: 'currency',
        isEditable: true,
        values: projectedData.map((d) => d.revenue),
        cagr: calculateCAGR(projectedData.map((d) => d.revenue)),
      },
      {
        id: 'expenses',
        label: 'Operating Expenses',
        category: 'expense',
        format: 'currency',
        isEditable: true,
        values: projectedData.map((d) => d.expenses),
        cagr: calculateCAGR(projectedData.map((d) => d.expenses)),
      },
      {
        id: 'ebitdar',
        label: 'EBITDAR',
        category: 'metric',
        format: 'currency',
        isHighlighted: true,
        values: projectedData.map((d) => d.ebitdar),
        cagr: calculateCAGR(projectedData.map((d) => d.ebitdar)),
      },
      {
        id: 'rent',
        label: 'Rent/Lease',
        category: 'expense',
        format: 'currency',
        isEditable: true,
        values: projectedData.map((d) => d.rent),
        cagr: calculateCAGR(projectedData.map((d) => d.rent)),
      },
      {
        id: 'ebitda',
        label: 'EBITDA',
        category: 'metric',
        format: 'currency',
        isHighlighted: true,
        values: projectedData.map((d) => d.ebitda),
        cagr: calculateCAGR(projectedData.map((d) => d.ebitda)),
      },
      {
        id: 'ebitda_margin',
        label: 'EBITDA Margin',
        category: 'metric',
        format: 'percent',
        values: projectedData.map((d) => d.ebitdaMargin),
      },
    ];
  }, [projectedData]);

  const handleAssumptionChange = (key: string, value: number) => {
    setAssumptions((prev) =>
      prev.map((a) => (a.key === key ? { ...a, value } : a))
    );
  };

  const handleCellOverride = (rowId: string, colIndex: number, value: number) => {
    // Add or update override
    setOverrides((prev) => {
      const existing = prev.findIndex(
        (o) => o.coaCode === rowId && o.monthIndex === colIndex
      );
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { ...updated[existing], overrideValue: value };
        return updated;
      }
      return [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          scenarioId,
          facilityId,
          coaCode: rowId,
          monthIndex: colIndex,
          overrideType: 'fixed',
          overrideValue: value,
        },
      ];
    });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(assumptions, overrides);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAssumptions(initialAssumptions.length > 0 ? initialAssumptions : DEFAULT_ASSUMPTIONS);
    setOverrides(initialOverrides);
  };

  const formatValue = (value: number, format: 'number' | 'currency' | 'percent'): string => {
    switch (format) {
      case 'currency':
        // Format in millions for readability
        if (Math.abs(value) >= 1000000) {
          return `$${(value / 1000000).toFixed(2)}M`;
        }
        return formatCurrency(value);
      case 'percent':
        return formatPercent(value);
      default:
        return formatNumber(value);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Pro Forma Editor</CardTitle>
            <CardDescription>
              {facilityName} · Scenario: {scenarioName} · {projectionYears}-Year Projection
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport}>
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Assumptions Drawer */}
        <Collapsible open={showAssumptions} onOpenChange={setShowAssumptions}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between mb-4">
              <span className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                Assumptions
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showAssumptions ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mb-4">
            <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
              {/* Revenue Growth */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Revenue Growth</h4>
                {assumptions
                  .filter((a) => a.category === 'revenue')
                  .map((a) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <Label className="text-xs flex-1">{a.label}</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="h-7 w-20 text-right text-xs"
                        value={(a.value * 100).toFixed(1)}
                        onChange={(e) => handleAssumptionChange(a.key, parseFloat(e.target.value) / 100 || 0)}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ))}
              </div>

              {/* Expense Inflation */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Expense Inflation</h4>
                {assumptions
                  .filter((a) => a.category === 'expense')
                  .map((a) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <Label className="text-xs flex-1">{a.label}</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="h-7 w-20 text-right text-xs"
                        value={(a.value * 100).toFixed(1)}
                        onChange={(e) => handleAssumptionChange(a.key, parseFloat(e.target.value) / 100 || 0)}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ))}
              </div>

              {/* Census/Occupancy */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Occupancy Targets</h4>
                {assumptions
                  .filter((a) => a.category === 'census')
                  .map((a) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <Label className="text-xs flex-1">{a.label}</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-7 w-20 text-right text-xs"
                        value={(a.value * 100).toFixed(0)}
                        onChange={(e) => handleAssumptionChange(a.key, parseFloat(e.target.value) / 100 || 0)}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ))}
                {assumptions
                  .filter((a) => a.category === 'growth')
                  .map((a) => (
                    <div key={a.key} className="flex items-center gap-2">
                      <Label className="text-xs flex-1">{a.label}</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="h-7 w-20 text-right text-xs"
                        value={(a.value * 100).toFixed(1)}
                        onChange={(e) => handleAssumptionChange(a.key, parseFloat(e.target.value) / 100 || 0)}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </div>
                  ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Pro Forma Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-3 font-medium w-48"></th>
                {projectedData.map((d) => (
                  <th key={d.year} className="text-right py-3 px-3 font-medium w-28">
                    Year {d.year - baseYear + 1}
                    <div className="text-xs font-normal text-muted-foreground">{d.year}</div>
                  </th>
                ))}
                <th className="text-right py-3 px-3 font-medium w-20 bg-muted/50">CAGR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={`
                    border-b border-muted/30
                    ${row.isHighlighted ? 'bg-primary/5 font-semibold' : 'hover:bg-muted/30'}
                  `}
                >
                  <td className="py-2 px-3">{row.label}</td>
                  {row.values.map((value, colIndex) => {
                    const hasOverride = overrides.some(
                      (o) => o.coaCode === row.id && o.monthIndex === colIndex
                    );
                    const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;

                    return (
                      <td
                        key={colIndex}
                        className={`
                          py-2 px-3 text-right tabular-nums cursor-pointer
                          ${row.isHighlighted ? '' : ''}
                          ${hasOverride ? 'bg-amber-50 dark:bg-amber-950/30' : ''}
                          ${isSelected ? 'ring-2 ring-primary' : ''}
                        `}
                        onClick={() => row.isEditable && setSelectedCell({ row: rowIndex, col: colIndex })}
                      >
                        {formatValue(value, row.format)}
                        {hasOverride && <span className="text-amber-600 ml-1">●</span>}
                      </td>
                    );
                  })}
                  <td className="py-2 px-3 text-right tabular-nums bg-muted/50">
                    {row.cagr !== undefined ? (
                      <span className={row.cagr >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {row.cagr > 0 ? '+' : ''}{(row.cagr * 100).toFixed(1)}%
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="text-amber-600">●</span> Manual cell override (double-click to edit)
          </span>
          <span>CAGR = Compound Annual Growth Rate</span>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold tabular-nums">
              {formatValue(projectedData[0].ebitda, 'currency')}
            </div>
            <div className="text-xs text-muted-foreground">Year 1 EBITDA</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold tabular-nums">
              {formatValue(projectedData[projectedData.length - 1].ebitda, 'currency')}
            </div>
            <div className="text-xs text-muted-foreground">Year {projectionYears} EBITDA</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold tabular-nums text-green-600">
              {formatPercent(projectedData[projectedData.length - 1].ebitdaMargin)}
            </div>
            <div className="text-xs text-muted-foreground">Exit EBITDA Margin</div>
          </div>
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className="text-2xl font-bold tabular-nums">
              {rows.find((r) => r.id === 'ebitda')?.cagr !== undefined
                ? `${((rows.find((r) => r.id === 'ebitda')?.cagr || 0) * 100).toFixed(1)}%`
                : '—'}
            </div>
            <div className="text-xs text-muted-foreground">EBITDA CAGR</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProformaEditor;
