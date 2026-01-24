'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Edit2, Save, X, Upload, TrendingUp, TrendingDown } from 'lucide-react';
import {
  CensusPeriod,
  CensusByPayer,
  PayerType,
  PAYER_LABELS,
  SKILLED_PAYERS,
  NON_SKILLED_PAYERS,
  getTotalDays,
  formatNumber,
  formatPercent,
} from './types';

interface CensusByPayerProps {
  facilityId: string;
  facilityName: string;
  totalBeds: number;
  censusPeriods: CensusPeriod[];
  onSave?: (periods: CensusPeriod[]) => Promise<void>;
  onImport?: () => void;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PAYER_KEYS: Array<{ key: keyof CensusByPayer; payer: PayerType; isSkilled: boolean }> = [
  { key: 'medicarePartADays', payer: 'medicare_part_a', isSkilled: true },
  { key: 'medicareAdvantageDays', payer: 'medicare_advantage', isSkilled: true },
  { key: 'managedCareDays', payer: 'managed_care', isSkilled: true },
  { key: 'medicaidDays', payer: 'medicaid', isSkilled: false },
  { key: 'managedMedicaidDays', payer: 'managed_medicaid', isSkilled: false },
  { key: 'privateDays', payer: 'private', isSkilled: false },
  { key: 'vaContractDays', payer: 'va_contract', isSkilled: false },
  { key: 'hospiceDays', payer: 'hospice', isSkilled: false },
  { key: 'otherDays', payer: 'other', isSkilled: false },
];

export function CensusByPayerTable({
  facilityId,
  facilityName,
  totalBeds,
  censusPeriods,
  onSave,
  onImport,
}: CensusByPayerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedPeriods, setEditedPeriods] = useState<CensusPeriod[]>(censusPeriods);
  const [saving, setSaving] = useState(false);

  // Generate 12 months of data (or use provided)
  const months = useMemo(() => {
    if (editedPeriods.length >= 12) {
      return editedPeriods.slice(0, 12);
    }
    // Generate placeholder months
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
      const existing = editedPeriods.find(
        (p) => new Date(p.periodStart).getMonth() === date.getMonth()
      );
      if (existing) return existing;
      return {
        id: `temp-${i}`,
        facilityId,
        periodStart: date.toISOString().split('T')[0],
        periodEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0],
        medicarePartADays: 0,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
        totalBeds,
        occupancyRate: 0,
        source: 'manual' as const,
      };
    });
  }, [editedPeriods, facilityId, totalBeds]);

  // Calculate totals and metrics
  const calculations = useMemo(() => {
    const quarterly: number[][] = [[], [], [], []];
    const annual: Record<keyof CensusByPayer, number> = {
      medicarePartADays: 0,
      medicareAdvantageDays: 0,
      managedCareDays: 0,
      medicaidDays: 0,
      managedMedicaidDays: 0,
      privateDays: 0,
      vaContractDays: 0,
      hospiceDays: 0,
      otherDays: 0,
    };

    months.forEach((month, idx) => {
      const qtr = Math.floor(idx / 3);
      PAYER_KEYS.forEach(({ key }) => {
        annual[key] += month[key];
      });
    });

    const totalAnnualDays = getTotalDays(annual);
    const avgDailyCensus = totalAnnualDays / 365;
    const avgOccupancy = totalBeds > 0 ? avgDailyCensus / totalBeds : 0;

    const payerMix = PAYER_KEYS.map(({ key, payer }) => ({
      payer,
      days: annual[key],
      percent: totalAnnualDays > 0 ? annual[key] / totalAnnualDays : 0,
    }));

    return { annual, totalAnnualDays, avgDailyCensus, avgOccupancy, payerMix };
  }, [months, totalBeds]);

  const handleCellChange = (monthIdx: number, key: keyof CensusByPayer, value: string) => {
    const numValue = parseInt(value) || 0;
    setEditedPeriods((prev) => {
      const updated = [...prev];
      const monthData = months[monthIdx];
      const existingIdx = updated.findIndex((p) => p.id === monthData.id);
      if (existingIdx >= 0) {
        updated[existingIdx] = { ...updated[existingIdx], [key]: numValue };
      } else {
        updated.push({ ...monthData, [key]: numValue });
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(editedPeriods);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedPeriods(censusPeriods);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Census by Payer Type</CardTitle>
            <CardDescription>
              {facilityName} · {totalBeds} beds · TTM patient days by payer
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-1" />
                  {saving ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <>
                {onImport && (
                  <Button variant="outline" size="sm" onClick={onImport}>
                    <Upload className="h-4 w-4 mr-1" />
                    Import
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium w-40">Payer Type</th>
                {months.map((_, idx) => (
                  <th key={idx} className="text-right py-2 px-2 font-medium w-16">
                    {MONTHS[new Date(months[idx].periodStart).getMonth()]}
                  </th>
                ))}
                <th className="text-right py-2 px-2 font-medium w-20 bg-muted/50">Annual</th>
                <th className="text-right py-2 px-2 font-medium w-16 bg-muted/50">% Mix</th>
              </tr>
            </thead>
            <tbody>
              {/* Skilled Header */}
              <tr className="bg-blue-50 dark:bg-blue-950/30">
                <td colSpan={15} className="py-1 px-2 font-semibold text-blue-700 dark:text-blue-300">
                  SKILLED
                </td>
              </tr>

              {PAYER_KEYS.filter((p) => p.isSkilled).map(({ key, payer }) => {
                const mixData = calculations.payerMix.find((m) => m.payer === payer);
                return (
                  <tr key={key} className="border-b border-muted/50 hover:bg-muted/30">
                    <td className="py-1.5 px-2 pl-4">{PAYER_LABELS[payer]}</td>
                    {months.map((month, idx) => (
                      <td key={idx} className="py-1.5 px-1 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-7 w-16 text-right text-xs"
                            value={month[key]}
                            onChange={(e) => handleCellChange(idx, key, e.target.value)}
                          />
                        ) : (
                          <span className="tabular-nums">{formatNumber(month[key])}</span>
                        )}
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-right font-medium bg-muted/50 tabular-nums">
                      {formatNumber(calculations.annual[key])}
                    </td>
                    <td className="py-1.5 px-2 text-right bg-muted/50 tabular-nums">
                      {formatPercent(mixData?.percent || 0)}
                    </td>
                  </tr>
                );
              })}

              {/* Non-Skilled Header */}
              <tr className="bg-green-50 dark:bg-green-950/30">
                <td colSpan={15} className="py-1 px-2 font-semibold text-green-700 dark:text-green-300">
                  NON-SKILLED
                </td>
              </tr>

              {PAYER_KEYS.filter((p) => !p.isSkilled).map(({ key, payer }) => {
                const mixData = calculations.payerMix.find((m) => m.payer === payer);
                return (
                  <tr key={key} className="border-b border-muted/50 hover:bg-muted/30">
                    <td className="py-1.5 px-2 pl-4">{PAYER_LABELS[payer]}</td>
                    {months.map((month, idx) => (
                      <td key={idx} className="py-1.5 px-1 text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            className="h-7 w-16 text-right text-xs"
                            value={month[key]}
                            onChange={(e) => handleCellChange(idx, key, e.target.value)}
                          />
                        ) : (
                          <span className="tabular-nums">{formatNumber(month[key])}</span>
                        )}
                      </td>
                    ))}
                    <td className="py-1.5 px-2 text-right font-medium bg-muted/50 tabular-nums">
                      {formatNumber(calculations.annual[key])}
                    </td>
                    <td className="py-1.5 px-2 text-right bg-muted/50 tabular-nums">
                      {formatPercent(mixData?.percent || 0)}
                    </td>
                  </tr>
                );
              })}

              {/* Totals */}
              <tr className="border-t-2 border-foreground/20 font-semibold bg-muted/30">
                <td className="py-2 px-2">TOTAL DAYS</td>
                {months.map((month, idx) => (
                  <td key={idx} className="py-2 px-2 text-right tabular-nums">
                    {formatNumber(getTotalDays(month))}
                  </td>
                ))}
                <td className="py-2 px-2 text-right bg-muted/50 tabular-nums">
                  {formatNumber(calculations.totalAnnualDays)}
                </td>
                <td className="py-2 px-2 text-right bg-muted/50">100%</td>
              </tr>

              <tr className="font-medium">
                <td className="py-2 px-2 text-muted-foreground">Avg Daily Census</td>
                {months.map((month, idx) => {
                  const daysInMonth = new Date(
                    new Date(month.periodStart).getFullYear(),
                    new Date(month.periodStart).getMonth() + 1,
                    0
                  ).getDate();
                  const adc = getTotalDays(month) / daysInMonth;
                  return (
                    <td key={idx} className="py-2 px-2 text-right text-muted-foreground tabular-nums">
                      {formatNumber(Math.round(adc))}
                    </td>
                  );
                })}
                <td className="py-2 px-2 text-right bg-muted/50 tabular-nums">
                  {formatNumber(Math.round(calculations.avgDailyCensus))}
                </td>
                <td className="py-2 px-2 text-right bg-muted/50"></td>
              </tr>

              <tr className="font-medium">
                <td className="py-2 px-2 text-muted-foreground">Occupancy %</td>
                {months.map((month, idx) => {
                  const daysInMonth = new Date(
                    new Date(month.periodStart).getFullYear(),
                    new Date(month.periodStart).getMonth() + 1,
                    0
                  ).getDate();
                  const adc = getTotalDays(month) / daysInMonth;
                  const occ = totalBeds > 0 ? adc / totalBeds : 0;
                  return (
                    <td
                      key={idx}
                      className={`py-2 px-2 text-right tabular-nums ${
                        occ >= 0.9 ? 'text-green-600' : occ >= 0.8 ? 'text-amber-600' : 'text-red-600'
                      }`}
                    >
                      {formatPercent(occ)}
                    </td>
                  );
                })}
                <td
                  className={`py-2 px-2 text-right bg-muted/50 tabular-nums ${
                    calculations.avgOccupancy >= 0.9
                      ? 'text-green-600'
                      : calculations.avgOccupancy >= 0.8
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatPercent(calculations.avgOccupancy)}
                </td>
                <td className="py-2 px-2 text-right bg-muted/50"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Badges */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Skilled Mix:</span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              {formatPercent(
                calculations.payerMix
                  .filter((m) => SKILLED_PAYERS.includes(m.payer))
                  .reduce((sum, m) => sum + m.percent, 0)
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Medicaid Mix:</span>
            <Badge variant="secondary">
              {formatPercent(
                calculations.payerMix.find((m) => m.payer === 'medicaid')?.percent || 0
              )}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Private Pay Mix:</span>
            <Badge variant="secondary">
              {formatPercent(
                calculations.payerMix.find((m) => m.payer === 'private')?.percent || 0
              )}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CensusByPayerTable;
