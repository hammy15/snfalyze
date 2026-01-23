'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calculator, Building2, DollarSign, TrendingUp, Percent } from 'lucide-react';
import { ValuationPanel } from '@/components/valuation/valuation-panel';
import { FacilityTypeBreakdown } from '@/components/deals/facility-type-breakdown';
import type { FacilityData } from '@/components/deals/facility-list';
import type { ComparableSale, ValuationSummary } from '@/lib/valuation/types';

// Mock deal data
const mockDealName = 'Sunrise SNF Portfolio - Oregon';

// Mock facilities with financials
const mockFacilities: (FacilityData & {
  financials: { noi: number; revenue: number; expenses: number };
  marketData: { marketCapRate: number; marketPricePerBed: number };
})[] = [
  {
    id: '1',
    name: 'Sunrise Care Center',
    state: 'OR',
    assetType: 'SNF',
    licensedBeds: 120,
    cmsRating: 4,
    financials: { noi: 1800000, revenue: 8500000, expenses: 6700000 },
    marketData: { marketCapRate: 0.095, marketPricePerBed: 145000 },
  },
  {
    id: '2',
    name: 'Valley View Healthcare',
    state: 'OR',
    assetType: 'SNF',
    licensedBeds: 100,
    cmsRating: 3,
    financials: { noi: 1200000, revenue: 6000000, expenses: 4800000 },
    marketData: { marketCapRate: 0.10, marketPricePerBed: 135000 },
  },
  {
    id: '3',
    name: 'Mountain Meadows ALF',
    state: 'OR',
    assetType: 'ALF',
    licensedBeds: 80,
    cmsRating: null,
    financials: { noi: 900000, revenue: 4200000, expenses: 3300000 },
    marketData: { marketCapRate: 0.085, marketPricePerBed: 160000 },
  },
];

// Mock comparable sales
const mockComparables: ComparableSale[] = [
  {
    id: 'comp-1',
    propertyName: 'Pacific Gardens SNF',
    city: 'Portland',
    state: 'OR',
    assetType: 'SNF',
    beds: 100,
    saleDate: new Date('2023-10-15'),
    salePrice: 14000000,
    pricePerBed: 140000,
    capRate: 0.092,
    noiAtSale: 1288000,
  },
  {
    id: 'comp-2',
    propertyName: 'Columbia Care Center',
    city: 'Salem',
    state: 'OR',
    assetType: 'SNF',
    beds: 130,
    saleDate: new Date('2023-08-22'),
    salePrice: 19500000,
    pricePerBed: 150000,
    capRate: 0.098,
    noiAtSale: 1911000,
  },
  {
    id: 'comp-3',
    propertyName: 'Cascade Senior Living',
    city: 'Eugene',
    state: 'OR',
    assetType: 'ALF',
    beds: 75,
    saleDate: new Date('2023-09-10'),
    salePrice: 12000000,
    pricePerBed: 160000,
    capRate: 0.082,
    noiAtSale: 984000,
  },
];

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export default function DealValuationPage() {
  const params = useParams();
  const dealId = params.id as string;

  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);
  const [facilityValuations, setFacilityValuations] = useState<Map<string, ValuationSummary>>(
    new Map()
  );

  // Calculate portfolio totals
  const portfolioTotals = useMemo(() => {
    const totalBeds = mockFacilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0);
    const totalNOI = mockFacilities.reduce((sum, f) => sum + f.financials.noi, 0);
    const totalRevenue = mockFacilities.reduce((sum, f) => sum + f.financials.revenue, 0);

    // Calculate blended cap rate (weighted by NOI)
    let weightedCapRateSum = 0;
    mockFacilities.forEach((f) => {
      weightedCapRateSum += f.marketData.marketCapRate * f.financials.noi;
    });
    const blendedCapRate = totalNOI > 0 ? weightedCapRateSum / totalNOI : 0;

    // Calculate implied value from cap rate
    const impliedValue = totalNOI / blendedCapRate;

    // Calculate total from facility valuations if available
    let totalFromValuations = 0;
    facilityValuations.forEach((v) => {
      totalFromValuations += v.recommendedValue;
    });

    return {
      totalBeds,
      totalNOI,
      totalRevenue,
      blendedCapRate,
      impliedValue,
      totalFromValuations,
      facilityCount: mockFacilities.length,
    };
  }, [facilityValuations]);

  const handleValuationComplete = (facilityId: string, summary: ValuationSummary) => {
    setFacilityValuations((prev) => {
      const next = new Map(prev);
      next.set(facilityId, summary);
      return next;
    });
  };

  const selectedFacility = selectedFacilityId
    ? mockFacilities.find((f) => f.id === selectedFacilityId)
    : null;

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border-default)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link
              href="/app/deals"
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              Deals
            </Link>
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <Link
              href={`/app/deals/${dealId}`}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              {mockDealName}
            </Link>
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <span className="text-[var(--color-text-primary)] font-medium">Valuation</span>
          </div>

          {/* Page header */}
          <div className="flex items-center gap-4">
            <Link
              href={`/app/deals/${dealId}`}
              className="p-2 hover:bg-[var(--gray-100)] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center">
                <Calculator className="w-5 h-5 text-[var(--accent-solid)]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Portfolio Valuation
                </h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  {mockDealName}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Portfolio Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            icon={Building2}
            label="Total Facilities"
            value={portfolioTotals.facilityCount.toString()}
            subValue={`${portfolioTotals.totalBeds.toLocaleString()} beds`}
          />
          <SummaryCard
            icon={DollarSign}
            label="Total NOI"
            value={formatCurrency(portfolioTotals.totalNOI)}
            subValue={`${formatCurrency(portfolioTotals.totalNOI / portfolioTotals.totalBeds)}/bed`}
          />
          <SummaryCard
            icon={Percent}
            label="Blended Cap Rate"
            value={`${(portfolioTotals.blendedCapRate * 100).toFixed(2)}%`}
            subValue="Weighted by NOI"
          />
          <SummaryCard
            icon={TrendingUp}
            label="Implied Value"
            value={formatCurrency(portfolioTotals.impliedValue)}
            subValue={`${formatCurrency(portfolioTotals.impliedValue / portfolioTotals.totalBeds)}/bed`}
          />
        </div>

        {/* Asset Mix */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">
            Portfolio Asset Mix
          </h3>
          <FacilityTypeBreakdown facilities={mockFacilities} metric="beds" size="md" />
        </div>

        {/* Facility Selection */}
        <div className="card p-6">
          <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">
            Per-Facility Valuation
          </h3>
          <p className="text-sm text-[var(--color-text-tertiary)] mb-4">
            Select a facility to run detailed valuation analysis
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {mockFacilities.map((facility) => {
              const valuation = facilityValuations.get(facility.id);
              const isSelected = selectedFacilityId === facility.id;

              return (
                <button
                  key={facility.id}
                  type="button"
                  onClick={() => setSelectedFacilityId(facility.id)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    isSelected
                      ? 'border-[var(--accent-solid)] bg-[var(--accent-bg)]'
                      : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        facility.assetType === 'SNF'
                          ? 'bg-blue-100 text-blue-700'
                          : facility.assetType === 'ALF'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {facility.assetType}
                    </span>
                    {valuation && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Valued
                      </span>
                    )}
                  </div>
                  <div className="font-medium text-[var(--color-text-primary)]">{facility.name}</div>
                  <div className="text-sm text-[var(--color-text-tertiary)]">
                    {facility.licensedBeds} beds · NOI {formatCurrency(facility.financials.noi)}
                  </div>
                  {valuation && (
                    <div className="mt-2 pt-2 border-t border-[var(--color-border-default)]">
                      <div className="text-sm font-medium text-[var(--accent-solid)]">
                        {formatCurrency(valuation.recommendedValue)}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Facility Valuation */}
        {selectedFacility && (
          <div className="card p-6">
            <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-4">
              {selectedFacility.name} Valuation
            </h3>
            <ValuationPanel
              facility={{
                id: selectedFacility.id,
                name: selectedFacility.name,
                beds: selectedFacility.licensedBeds || 0,
                state: selectedFacility.state || '',
                assetType: selectedFacility.assetType,
                cmsRating: selectedFacility.cmsRating || undefined,
              }}
              financials={selectedFacility.financials}
              marketData={selectedFacility.marketData}
              comparables={mockComparables.filter(
                (c) => c.assetType === selectedFacility.assetType
              )}
              onValuationComplete={(summary) =>
                handleValuationComplete(selectedFacility.id, summary)
              }
            />
          </div>
        )}

        {/* Valuation Summary Table */}
        {facilityValuations.size > 0 && (
          <div className="card overflow-hidden">
            <div className="p-4 bg-[var(--gray-50)] border-b border-[var(--color-border-default)]">
              <h3 className="font-medium text-[var(--color-text-primary)]">Valuation Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border-default)]">
                    <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-secondary)]">
                      Facility
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                      Beds
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                      NOI
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                      Recommended Value
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                      $/Bed
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-[var(--color-text-secondary)]">
                      Implied Cap
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mockFacilities.map((facility) => {
                    const valuation = facilityValuations.get(facility.id);
                    if (!valuation) return null;

                    const beds = facility.licensedBeds || 0;
                    const pricePerBed = beds > 0 ? valuation.recommendedValue / beds : 0;
                    const impliedCap = facility.financials.noi / valuation.recommendedValue;

                    return (
                      <tr
                        key={facility.id}
                        className="border-b border-[var(--color-border-default)]"
                      >
                        <td className="px-4 py-3">
                          <div className="font-medium text-[var(--color-text-primary)]">
                            {facility.name}
                          </div>
                          <div className="text-xs text-[var(--color-text-tertiary)]">
                            {facility.assetType}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{beds}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(facility.financials.noi)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium text-[var(--accent-solid)]">
                          {formatCurrency(valuation.recommendedValue)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatCurrency(pricePerBed)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {(impliedCap * 100).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}

                  {/* Totals row */}
                  <tr className="bg-[var(--gray-50)] font-semibold">
                    <td className="px-4 py-3 text-[var(--color-text-primary)]">Portfolio Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {portfolioTotals.totalBeds}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatCurrency(portfolioTotals.totalNOI)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--accent-solid)]">
                      {formatCurrency(portfolioTotals.totalFromValuations)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {portfolioTotals.totalFromValuations > 0
                        ? formatCurrency(
                            portfolioTotals.totalFromValuations / portfolioTotals.totalBeds
                          )
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {portfolioTotals.totalFromValuations > 0
                        ? `${(
                            (portfolioTotals.totalNOI / portfolioTotals.totalFromValuations) *
                            100
                          ).toFixed(2)}%`
                        : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  subValue,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)]">{value}</div>
      <div className="text-sm text-[var(--color-text-tertiary)]">{subValue}</div>
    </div>
  );
}
