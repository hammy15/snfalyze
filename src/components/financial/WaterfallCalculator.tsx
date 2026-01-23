'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Layers, Plus, Trash2, DollarSign, Percent, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { WaterfallDistributionChart, type WaterfallBar } from '@/components/charts';

// ============================================================================
// Types
// ============================================================================

interface Partner {
  id: string;
  name: string;
  capitalContributed: number;
  isGP: boolean;
  ownershipPercent: number;
}

interface WaterfallTier {
  id: string;
  name: string;
  threshold: number | null; // null = infinity
  lpSplit: number;
  gpSplit: number;
}

interface PartnerDistribution {
  partnerId: string;
  partnerName: string;
  capitalReturned: number;
  preferredReturn: number;
  profitShare: number;
  totalDistribution: number;
  multiple: number;
  irr: number;
}

interface WaterfallResult {
  distributableCash: number;
  partnerDistributions: PartnerDistribution[];
  tierBreakdown: Array<{
    tierName: string;
    amount: number;
    lpShare: number;
    gpShare: number;
  }>;
  gpPromote: number;
  lpTotalReturn: number;
  gpTotalReturn: number;
}

export interface WaterfallCalculatorProps {
  initialPartners?: Partner[];
  initialTiers?: WaterfallTier[];
  onCalculate?: (result: WaterfallResult) => void;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(0)}%`;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Standard waterfall structures
const STANDARD_STRUCTURES = {
  simple: {
    name: 'Simple 80/20',
    tiers: [
      { id: '1', name: 'Return of Capital', threshold: 0, lpSplit: 1.0, gpSplit: 0 },
      { id: '2', name: 'Preferred Return (8%)', threshold: 0.08, lpSplit: 1.0, gpSplit: 0 },
      { id: '3', name: 'Profit Split', threshold: null, lpSplit: 0.8, gpSplit: 0.2 },
    ],
  },
  institutional: {
    name: 'Institutional w/ Catch-up',
    tiers: [
      { id: '1', name: 'Return of Capital', threshold: 0, lpSplit: 1.0, gpSplit: 0 },
      { id: '2', name: 'Preferred Return (8%)', threshold: 0.08, lpSplit: 1.0, gpSplit: 0 },
      { id: '3', name: 'GP Catch-up', threshold: 0.10, lpSplit: 0, gpSplit: 1.0 },
      { id: '4', name: 'First Tier (12% IRR)', threshold: 0.12, lpSplit: 0.8, gpSplit: 0.2 },
      { id: '5', name: 'Second Tier (18% IRR)', threshold: 0.18, lpSplit: 0.7, gpSplit: 0.3 },
      { id: '6', name: 'Above 18%', threshold: null, lpSplit: 0.6, gpSplit: 0.4 },
    ],
  },
};

// ============================================================================
// Component
// ============================================================================

export function WaterfallCalculator({
  initialPartners,
  initialTiers,
  onCalculate,
  className,
}: WaterfallCalculatorProps) {
  const [partners, setPartners] = React.useState<Partner[]>(
    initialPartners ?? [
      { id: generateId(), name: 'LP Investor', capitalContributed: 8_000_000, isGP: false, ownershipPercent: 0.9 },
      { id: generateId(), name: 'GP Sponsor', capitalContributed: 1_000_000, isGP: true, ownershipPercent: 0.1 },
    ]
  );

  const [tiers, setTiers] = React.useState<WaterfallTier[]>(
    initialTiers ?? STANDARD_STRUCTURES.simple.tiers
  );

  const [distributableCash, setDistributableCash] = React.useState(15_000_000);
  const [preferredReturnRate, setPreferredReturnRate] = React.useState(0.08);
  const [holdYears, setHoldYears] = React.useState(5);

  const [result, setResult] = React.useState<WaterfallResult | null>(null);

  // Helpers
  const totalCapital = partners.reduce((sum, p) => sum + p.capitalContributed, 0);
  const lpCapital = partners.filter((p) => !p.isGP).reduce((sum, p) => sum + p.capitalContributed, 0);
  const gpCapital = partners.filter((p) => p.isGP).reduce((sum, p) => sum + p.capitalContributed, 0);

  const addPartner = () => {
    setPartners((prev) => [
      ...prev,
      {
        id: generateId(),
        name: `Partner ${prev.length + 1}`,
        capitalContributed: 1_000_000,
        isGP: false,
        ownershipPercent: 0,
      },
    ]);
  };

  const removePartner = (id: string) => {
    setPartners((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePartner = (id: string, field: keyof Partner, value: string | number | boolean) => {
    setPartners((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const addTier = () => {
    setTiers((prev) => [
      ...prev,
      {
        id: generateId(),
        name: `Tier ${prev.length + 1}`,
        threshold: null,
        lpSplit: 0.8,
        gpSplit: 0.2,
      },
    ]);
  };

  const removeTier = (id: string) => {
    setTiers((prev) => prev.filter((t) => t.id !== id));
  };

  const updateTier = (id: string, field: keyof WaterfallTier, value: string | number | null) => {
    setTiers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const applyStructure = (structureKey: keyof typeof STANDARD_STRUCTURES) => {
    setTiers(STANDARD_STRUCTURES[structureKey].tiers);
  };

  const handleCalculate = () => {
    let remainingCash = distributableCash;
    const tierBreakdown: WaterfallResult['tierBreakdown'] = [];
    let lpTotal = 0;
    let gpTotal = 0;

    // Step 1: Return of Capital
    const rocAmount = Math.min(remainingCash, totalCapital);
    const lpRoc = (lpCapital / totalCapital) * rocAmount;
    const gpRoc = (gpCapital / totalCapital) * rocAmount;
    remainingCash -= rocAmount;
    lpTotal += lpRoc;
    gpTotal += gpRoc;

    tierBreakdown.push({
      tierName: 'Return of Capital',
      amount: rocAmount,
      lpShare: lpRoc,
      gpShare: gpRoc,
    });

    // Step 2: Preferred Return
    const totalPreferred = lpCapital * preferredReturnRate * holdYears;
    const prefAmount = Math.min(remainingCash, totalPreferred);
    remainingCash -= prefAmount;
    lpTotal += prefAmount;

    tierBreakdown.push({
      tierName: `Preferred Return (${formatPercent(preferredReturnRate)})`,
      amount: prefAmount,
      lpShare: prefAmount,
      gpShare: 0,
    });

    // Step 3: Profit splits per tier (simplified)
    if (remainingCash > 0) {
      // Apply last tier's split to remaining
      const lastTier = tiers[tiers.length - 1];
      if (lastTier) {
        const lpProfit = remainingCash * lastTier.lpSplit;
        const gpProfit = remainingCash * lastTier.gpSplit;

        tierBreakdown.push({
          tierName: lastTier.name || 'Profit Split',
          amount: remainingCash,
          lpShare: lpProfit,
          gpShare: gpProfit,
        });

        lpTotal += lpProfit;
        gpTotal += gpProfit;
      }
    }

    // Calculate per-partner distributions
    const partnerDistributions: PartnerDistribution[] = partners.map((partner) => {
      const capitalPercent = partner.capitalContributed / totalCapital;
      const isGp = partner.isGP;

      let totalDist = 0;

      // ROC allocation
      totalDist += capitalPercent * rocAmount;

      // Preferred (only to LPs)
      if (!isGp) {
        const lpShareOfPreferred = partner.capitalContributed / lpCapital;
        totalDist += lpShareOfPreferred * prefAmount;
      }

      // Profit share
      const profitPool = tierBreakdown.slice(2).reduce((sum, t) => sum + t.amount, 0);
      if (isGp) {
        const gpShareOfProfit = gpCapital > 0 ? partner.capitalContributed / gpCapital : 0;
        const gpProfitShare = tierBreakdown.slice(2).reduce((sum, t) => sum + t.gpShare, 0);
        totalDist += gpShareOfProfit * gpProfitShare;
      } else {
        const lpShareOfProfit = partner.capitalContributed / lpCapital;
        const lpProfitShare = tierBreakdown.slice(2).reduce((sum, t) => sum + t.lpShare, 0);
        totalDist += lpShareOfProfit * lpProfitShare;
      }

      const multiple = partner.capitalContributed > 0 ? totalDist / partner.capitalContributed : 0;
      const irr = multiple > 0 ? Math.pow(multiple, 1 / holdYears) - 1 : 0;

      return {
        partnerId: partner.id,
        partnerName: partner.name,
        capitalReturned: capitalPercent * rocAmount,
        preferredReturn: isGp ? 0 : (partner.capitalContributed / lpCapital) * prefAmount,
        profitShare: totalDist - (capitalPercent * rocAmount) - (isGp ? 0 : (partner.capitalContributed / lpCapital) * prefAmount),
        totalDistribution: totalDist,
        multiple,
        irr,
      };
    });

    const gpPromote = gpTotal - gpCapital;

    const newResult: WaterfallResult = {
      distributableCash,
      partnerDistributions,
      tierBreakdown,
      gpPromote: Math.max(0, gpPromote),
      lpTotalReturn: lpTotal,
      gpTotalReturn: gpTotal,
    };

    setResult(newResult);
    onCalculate?.(newResult);
  };

  // Auto-calculate
  React.useEffect(() => {
    handleCalculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners, tiers, distributableCash, preferredReturnRate, holdYears]);

  // Prepare chart data
  const chartData: WaterfallBar[] = result?.tierBreakdown.map((tier) => ({
    label: tier.tierName,
    value: tier.amount,
    type: tier.tierName.includes('Return of Capital') ? 'total' : 'positive',
  })) ?? [];

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Waterfall Distribution Calculator
          </CardTitle>
          <CardDescription>
            Model JV/partnership profit distributions with tiered promotes
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Quick Templates */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => applyStructure('simple')}>
          Simple 80/20
        </Button>
        <Button variant="outline" size="sm" onClick={() => applyStructure('institutional')}>
          Institutional w/ Catch-up
        </Button>
      </div>

      {/* Partnership Setup */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Partners
          </CardTitle>
          <Button variant="outline" size="sm" onClick={addPartner}>
            <Plus className="h-4 w-4 mr-1" />
            Add Partner
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {partners.map((partner) => (
            <div key={partner.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <Input
                value={partner.name}
                onChange={(e) => updatePartner(partner.id, 'name', e.target.value)}
                className="w-32"
              />
              <div className="relative flex-1">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  value={partner.capitalContributed}
                  onChange={(e) => updatePartner(partner.id, 'capitalContributed', parseFloat(e.target.value) || 0)}
                  className="pl-7"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={partner.isGP}
                  onChange={(e) => updatePartner(partner.id, 'isGP', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">GP</span>
              </label>
              {partners.length > 2 && (
                <Button variant="ghost" size="sm" onClick={() => removePartner(partner.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex justify-between text-sm pt-2 border-t">
            <span className="text-muted-foreground">Total Capital:</span>
            <span className="font-medium">{formatCurrency(totalCapital)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Distribution Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribution Parameters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Distributable Cash</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  value={distributableCash}
                  onChange={(e) => setDistributableCash(parseFloat(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Preferred Return Rate</Label>
              <Input
                type="number"
                step="0.01"
                value={preferredReturnRate}
                onChange={(e) => setPreferredReturnRate(parseFloat(e.target.value) || 0.08)}
              />
            </div>

            <div className="space-y-2">
              <Label>Hold Period (years)</Label>
              <Input
                type="number"
                value={holdYears}
                onChange={(e) => setHoldYears(parseInt(e.target.value) || 5)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">LP Total Return</div>
                <div className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(result.lpTotalReturn)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((result.lpTotalReturn / lpCapital) * 100).toFixed(1)}% of capital
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">GP Total Return</div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(result.gpTotalReturn)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {gpCapital > 0 ? ((result.gpTotalReturn / gpCapital) * 100).toFixed(1) : 0}% of capital
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">GP Promote</div>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(result.gpPromote)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Above pari passu
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">Total Distributed</div>
                <div className="text-2xl font-bold">
                  {formatCurrency(result.distributableCash)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {((result.distributableCash / totalCapital)).toFixed(2)}x capital
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Waterfall Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribution Waterfall</CardTitle>
            </CardHeader>
            <CardContent>
              <WaterfallDistributionChart
                data={chartData}
                height={250}
              />
            </CardContent>
          </Card>

          {/* Partner Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Partner Distributions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 px-2">Partner</th>
                      <th className="text-right py-2 px-2">Capital</th>
                      <th className="text-right py-2 px-2">ROC</th>
                      <th className="text-right py-2 px-2">Preferred</th>
                      <th className="text-right py-2 px-2">Profit Share</th>
                      <th className="text-right py-2 px-2">Total</th>
                      <th className="text-right py-2 px-2">Multiple</th>
                      <th className="text-right py-2 px-2">IRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.partnerDistributions.map((dist) => (
                      <tr key={dist.partnerId} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 px-2 font-medium">{dist.partnerName}</td>
                        <td className="text-right py-2 px-2">
                          {formatCurrency(partners.find((p) => p.id === dist.partnerId)?.capitalContributed ?? 0)}
                        </td>
                        <td className="text-right py-2 px-2">{formatCurrency(dist.capitalReturned)}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(dist.preferredReturn)}</td>
                        <td className="text-right py-2 px-2">{formatCurrency(dist.profitShare)}</td>
                        <td className="text-right py-2 px-2 font-semibold text-emerald-600">
                          {formatCurrency(dist.totalDistribution)}
                        </td>
                        <td className="text-right py-2 px-2">{dist.multiple.toFixed(2)}x</td>
                        <td className="text-right py-2 px-2">{formatPercent(dist.irr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Tier Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tier-by-Tier Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.tierBreakdown.map((tier, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{tier.tierName}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(tier.amount)} distributed
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">
                        <span className="text-emerald-600">LP: {formatCurrency(tier.lpShare)}</span>
                        {' / '}
                        <span className="text-blue-600">GP: {formatCurrency(tier.gpShare)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tier.amount > 0 ? formatPercent(tier.lpShare / tier.amount) : '0%'} / {tier.amount > 0 ? formatPercent(tier.gpShare / tier.amount) : '0%'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

export default WaterfallCalculator;
