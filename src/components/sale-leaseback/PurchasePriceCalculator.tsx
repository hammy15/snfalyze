'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Building2, DollarSign, Percent, Calculator } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  assetType: string;
  beds: number | null;
  financials: {
    noi: string | null;
    ebitdar: string | null;
    totalRevenue: string | null;
  } | null;
}

interface Parameters {
  capRate: number;
  buyerYieldRequirement: number;
  minimumCoverageRatio: number;
  leaseTermYears: number;
  rentEscalation: number;
}

interface Results {
  facilityResults: Array<{
    facilityId: string;
    facilityName: string;
    purchasePrice: number;
    annualRent: number;
    coverageRatio: number;
    coveragePassFail: boolean;
  }>;
}

interface PurchasePriceCalculatorProps {
  facilities: Facility[];
  parameters: Parameters;
  onParametersChange: (params: Parameters) => void;
  results: Results | null;
}

export function PurchasePriceCalculator({
  facilities,
  parameters,
  onParametersChange,
  results,
}: PurchasePriceCalculatorProps) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    return `$${value.toLocaleString()}`;
  };

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Parameters Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600" />
            Calculation Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Cap Rate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Cap Rate</Label>
              <span className="text-lg font-semibold text-emerald-600">
                {formatPercent(parameters.capRate)}
              </span>
            </div>
            <Slider
              value={[parameters.capRate * 100]}
              onValueChange={([value]: number[]) =>
                onParametersChange({ ...parameters, capRate: value / 100 })
              }
              min={6}
              max={18}
              step={0.25}
              className="w-full"
            />
            <p className="text-xs text-surface-500">
              Purchase Price = NOI / Cap Rate
            </p>
          </div>

          {/* Buyer Yield Requirement */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Buyer Yield Requirement</Label>
              <span className="text-lg font-semibold text-emerald-600">
                {formatPercent(parameters.buyerYieldRequirement)}
              </span>
            </div>
            <Slider
              value={[parameters.buyerYieldRequirement * 100]}
              onValueChange={([value]: number[]) =>
                onParametersChange({ ...parameters, buyerYieldRequirement: value / 100 })
              }
              min={6}
              max={18}
              step={0.25}
              className="w-full"
            />
            <p className="text-xs text-surface-500">
              Annual Rent = Purchase Price x Yield
            </p>
          </div>

          {/* Spread Indicator */}
          <div className="p-3 bg-surface-50 dark:bg-surface-800 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="text-surface-600">Spread Over Cap Rate</span>
              <span
                className={`font-semibold ${
                  parameters.buyerYieldRequirement > parameters.capRate
                    ? 'text-amber-600'
                    : 'text-emerald-600'
                }`}
              >
                {((parameters.buyerYieldRequirement - parameters.capRate) * 100).toFixed(0)} bps
              </span>
            </div>
          </div>

          {/* Minimum Coverage */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Minimum Coverage Ratio</Label>
              <span className="text-lg font-semibold text-emerald-600">
                {parameters.minimumCoverageRatio.toFixed(2)}x
              </span>
            </div>
            <Slider
              value={[parameters.minimumCoverageRatio * 100]}
              onValueChange={([value]: number[]) =>
                onParametersChange({ ...parameters, minimumCoverageRatio: value / 100 })
              }
              min={100}
              max={200}
              step={5}
              className="w-full"
            />
          </div>

          {/* Lease Term */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Lease Term (Years)</Label>
              <Input
                type="number"
                value={parameters.leaseTermYears}
                onChange={(e) =>
                  onParametersChange({
                    ...parameters,
                    leaseTermYears: parseInt(e.target.value) || 15,
                  })
                }
                min={5}
                max={30}
              />
            </div>
            <div className="space-y-2">
              <Label>Annual Escalation</Label>
              <Input
                type="number"
                value={(parameters.rentEscalation * 100).toFixed(1)}
                onChange={(e) =>
                  onParametersChange({
                    ...parameters,
                    rentEscalation: parseFloat(e.target.value) / 100 || 0.025,
                  })
                }
                step={0.5}
                min={0}
                max={5}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-emerald-600" />
            Facility Calculations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {facilities.map((facility) => {
              const noi = facility.financials?.noi
                ? parseFloat(facility.financials.noi)
                : 0;
              const ebitdar = facility.financials?.ebitdar
                ? parseFloat(facility.financials.ebitdar)
                : 0;

              const result = results?.facilityResults.find(
                (r) => r.facilityId === facility.id
              );

              // Calculate locally if no results yet
              const purchasePrice = result?.purchasePrice ?? noi / parameters.capRate;
              const annualRent =
                result?.annualRent ?? purchasePrice * parameters.buyerYieldRequirement;
              const coverage = result?.coverageRatio ?? (annualRent > 0 ? ebitdar / annualRent : 0);
              const passFail =
                result?.coveragePassFail ?? coverage >= parameters.minimumCoverageRatio;

              return (
                <div
                  key={facility.id}
                  className="p-4 border border-surface-200 dark:border-surface-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold">{facility.name}</h4>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${
                        passFail
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {coverage.toFixed(2)}x {passFail ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-surface-500 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        NOI
                      </div>
                      <div className="font-semibold">{formatCurrency(noi)}</div>
                    </div>
                    <div>
                      <div className="text-surface-500 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        Purchase
                      </div>
                      <div className="font-semibold">{formatCurrency(purchasePrice)}</div>
                    </div>
                    <div>
                      <div className="text-surface-500 flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        Rent
                      </div>
                      <div className="font-semibold">{formatCurrency(annualRent)}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-surface-100 dark:border-surface-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-500">EBITDAR</span>
                      <span className="font-medium">{formatCurrency(ebitdar)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-surface-500">Operator Cash Flow</span>
                      <span
                        className={`font-medium ${
                          ebitdar - annualRent > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(ebitdar - annualRent)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {facilities.length === 0 && (
              <div className="text-center py-8 text-surface-500">
                No facilities to display
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
