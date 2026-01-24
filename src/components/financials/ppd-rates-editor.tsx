'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Edit2, Save, X, History, TrendingUp, TrendingDown } from 'lucide-react';
import {
  PayerRates,
  CensusByPayer,
  PayerType,
  PAYER_LABELS,
  SKILLED_PAYERS,
  DEFAULT_PPD_RATES,
  formatCurrency,
  formatPPD,
  formatPercent,
  formatNumber,
  getTotalDays,
} from './types';

interface PPDRatesEditorProps {
  facilityId: string;
  facilityName: string;
  currentRates: PayerRates;
  historicalRates?: PayerRates[];
  annualCensus: CensusByPayer;
  onSave?: (rates: PayerRates) => Promise<void>;
  onViewHistory?: () => void;
}

interface RateRow {
  payer: PayerType;
  label: string;
  rateKey: keyof PayerRates;
  censusKey: keyof CensusByPayer;
  isSkilled: boolean;
}

const RATE_ROWS: RateRow[] = [
  { payer: 'medicare_part_a', label: 'Medicare Part A', rateKey: 'medicarePartAPpd', censusKey: 'medicarePartADays', isSkilled: true },
  { payer: 'medicare_advantage', label: 'Medicare Advantage', rateKey: 'medicareAdvantagePpd', censusKey: 'medicareAdvantageDays', isSkilled: true },
  { payer: 'managed_care', label: 'Managed Care', rateKey: 'managedCarePpd', censusKey: 'managedCareDays', isSkilled: true },
  { payer: 'medicaid', label: 'Medicaid', rateKey: 'medicaidPpd', censusKey: 'medicaidDays', isSkilled: false },
  { payer: 'managed_medicaid', label: 'Managed Medicaid', rateKey: 'managedMedicaidPpd', censusKey: 'managedMedicaidDays', isSkilled: false },
  { payer: 'private', label: 'Private Pay', rateKey: 'privatePpd', censusKey: 'privateDays', isSkilled: false },
  { payer: 'va_contract', label: 'VA Contract', rateKey: 'vaContractPpd', censusKey: 'vaContractDays', isSkilled: false },
  { payer: 'hospice', label: 'Hospice', rateKey: 'hospicePpd', censusKey: 'hospiceDays', isSkilled: false },
];

export function PPDRatesEditor({
  facilityId,
  facilityName,
  currentRates,
  historicalRates = [],
  annualCensus,
  onSave,
  onViewHistory,
}: PPDRatesEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedRates, setEditedRates] = useState<PayerRates>(currentRates);
  const [saving, setSaving] = useState(false);

  // Calculate YoY change for each rate
  const priorYearRates = useMemo(() => {
    if (historicalRates.length === 0) return null;
    // Get rates from ~12 months ago
    const targetDate = new Date(currentRates.effectiveDate);
    targetDate.setFullYear(targetDate.getFullYear() - 1);

    return historicalRates.reduce((closest, rate) => {
      const rateDate = new Date(rate.effectiveDate);
      const closestDate = closest ? new Date(closest.effectiveDate) : null;
      const targetTime = targetDate.getTime();

      if (!closestDate) return rate;
      if (Math.abs(rateDate.getTime() - targetTime) < Math.abs(closestDate.getTime() - targetTime)) {
        return rate;
      }
      return closest;
    }, null as PayerRates | null);
  }, [historicalRates, currentRates]);

  // Calculate revenue by payer and totals
  const calculations = useMemo(() => {
    const totalDays = getTotalDays(annualCensus);
    const rates = isEditing ? editedRates : currentRates;

    const revenueByPayer = RATE_ROWS.map((row) => {
      const days = annualCensus[row.censusKey];
      const ppd = Number(rates[row.rateKey]) || 0;
      const revenue = days * ppd;
      const percentMix = totalDays > 0 ? days / totalDays : 0;
      const yoyChange = priorYearRates
        ? ((ppd - Number(priorYearRates[row.rateKey])) / Number(priorYearRates[row.rateKey])) * 100
        : 0;

      return {
        ...row,
        days,
        ppd,
        revenue,
        percentMix,
        yoyChange,
      };
    });

    const totalRevenue = revenueByPayer.reduce((sum, r) => sum + r.revenue, 0);
    const ancillaryRevenue = totalDays * (Number(rates.ancillaryRevenuePpd) || 0);
    const therapyRevenue = totalDays * (Number(rates.therapyRevenuePpd) || 0);
    const grandTotalRevenue = totalRevenue + ancillaryRevenue + therapyRevenue;

    // Blended PPD calculation
    const blendedPPD = totalDays > 0 ? totalRevenue / totalDays : 0;
    const totalPPD = totalDays > 0 ? grandTotalRevenue / totalDays : 0;

    return {
      revenueByPayer,
      totalRevenue,
      ancillaryRevenue,
      therapyRevenue,
      grandTotalRevenue,
      blendedPPD,
      totalPPD,
      totalDays,
    };
  }, [annualCensus, currentRates, editedRates, isEditing, priorYearRates]);

  const handleRateChange = (rateKey: keyof PayerRates, value: string) => {
    const numValue = parseFloat(value) || 0;
    setEditedRates((prev) => ({ ...prev, [rateKey]: numValue }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(editedRates);
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedRates(currentRates);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Revenue Per Patient Day (PPD)</CardTitle>
            <CardDescription>
              {facilityName} · Effective {new Date(currentRates.effectiveDate).toLocaleDateString()}
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
                {onViewHistory && (
                  <Button variant="outline" size="sm" onClick={onViewHistory}>
                    <History className="h-4 w-4 mr-1" />
                    History
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
                <th className="text-left py-2 px-3 font-medium">Payer Type</th>
                <th className="text-right py-2 px-3 font-medium">Current PPD</th>
                <th className="text-right py-2 px-3 font-medium">YoY</th>
                <th className="text-right py-2 px-3 font-medium">Days</th>
                <th className="text-right py-2 px-3 font-medium">Revenue</th>
                <th className="text-right py-2 px-3 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {calculations.revenueByPayer.map((row) => (
                <tr key={row.payer} className="border-b border-muted/50 hover:bg-muted/30">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {row.label}
                      {row.isSkilled && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          Skilled
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 w-24 text-right"
                        value={editedRates[row.rateKey] as number}
                        onChange={(e) => handleRateChange(row.rateKey, e.target.value)}
                      />
                    ) : (
                      <span className="font-medium tabular-nums">{formatPPD(row.ppd)}</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    {priorYearRates ? (
                      <div className={`flex items-center justify-end gap-1 ${
                        row.yoyChange > 0 ? 'text-green-600' : row.yoyChange < 0 ? 'text-red-600' : 'text-muted-foreground'
                      }`}>
                        {row.yoyChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : row.yoyChange < 0 ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : null}
                        <span className="tabular-nums">{row.yoyChange > 0 ? '+' : ''}{row.yoyChange.toFixed(1)}%</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                    {formatNumber(row.days)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums font-medium">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted-foreground">
                    {calculations.grandTotalRevenue > 0
                      ? formatPercent(row.revenue / calculations.grandTotalRevenue)
                      : '—'}
                  </td>
                </tr>
              ))}

              {/* Blended PPD Row */}
              <tr className="border-t-2 border-foreground/20 font-semibold bg-muted/30">
                <td className="py-2 px-3">BLENDED PPD</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatPPD(calculations.blendedPPD)}</td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 text-right tabular-nums">{formatNumber(calculations.totalDays)}</td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(calculations.totalRevenue)}</td>
                <td className="py-2 px-3"></td>
              </tr>

              {/* Ancillary Revenue */}
              <tr className="border-b border-muted/50 hover:bg-muted/30">
                <td className="py-2 px-3 pl-6 text-muted-foreground">+ Ancillary Revenue</td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 w-24 text-right"
                      value={editedRates.ancillaryRevenuePpd as number}
                      onChange={(e) => handleRateChange('ancillaryRevenuePpd', e.target.value)}
                    />
                  ) : (
                    <span className="tabular-nums">{formatPPD(Number(currentRates.ancillaryRevenuePpd) || 0)}</span>
                  )}
                </td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(calculations.ancillaryRevenue)}</td>
                <td className="py-2 px-3"></td>
              </tr>

              {/* Therapy Revenue */}
              <tr className="border-b border-muted/50 hover:bg-muted/30">
                <td className="py-2 px-3 pl-6 text-muted-foreground">+ Therapy Revenue</td>
                <td className="py-2 px-3 text-right">
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      className="h-8 w-24 text-right"
                      value={editedRates.therapyRevenuePpd as number}
                      onChange={(e) => handleRateChange('therapyRevenuePpd', e.target.value)}
                    />
                  ) : (
                    <span className="tabular-nums">{formatPPD(Number(currentRates.therapyRevenuePpd) || 0)}</span>
                  )}
                </td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3"></td>
                <td className="py-2 px-3 text-right tabular-nums">{formatCurrency(calculations.therapyRevenue)}</td>
                <td className="py-2 px-3"></td>
              </tr>

              {/* Total Revenue */}
              <tr className="border-t-2 border-foreground/20 font-bold bg-primary/5">
                <td className="py-3 px-3">TOTAL REVENUE</td>
                <td className="py-3 px-3 text-right tabular-nums">{formatPPD(calculations.totalPPD)}</td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3 text-right tabular-nums text-lg">{formatCurrency(calculations.grandTotalRevenue)}</td>
                <td className="py-3 px-3 text-right">100%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{formatPPD(calculations.blendedPPD)}</div>
            <div className="text-xs text-muted-foreground">Blended PPD</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{formatPPD(calculations.totalPPD)}</div>
            <div className="text-xs text-muted-foreground">Total PPD (w/ Ancillary)</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{formatCurrency(calculations.grandTotalRevenue)}</div>
            <div className="text-xs text-muted-foreground">Annual Revenue</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold tabular-nums">{formatNumber(calculations.totalDays)}</div>
            <div className="text-xs text-muted-foreground">Total Patient Days</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default PPDRatesEditor;
