'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Bed,
  Calendar,
  Star,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProviderCard } from '@/components/cms/provider-card';
import { ValuationPanel } from '@/components/valuation/valuation-panel';
import { ScenarioTabs, type ProformaScenario, type ScenarioType } from '@/components/proforma/scenario-tabs';
import type { FacilityData } from '@/components/deals/facility-list';
import type { ComparableSale } from '@/lib/valuation/types';

// Mock facility data
const mockFacility: FacilityData & {
  financials?: { noi: number; revenue: number; expenses: number; ebitdar?: number };
  marketData?: { marketCapRate: number; marketPricePerBed: number };
} = {
  id: '1',
  name: 'Sunrise Care Center',
  ccn: '385001',
  address: '123 Healthcare Drive',
  city: 'Portland',
  state: 'OR',
  zipCode: '97201',
  assetType: 'SNF',
  licensedBeds: 120,
  certifiedBeds: 115,
  yearBuilt: 1985,
  cmsRating: 4,
  healthRating: 3,
  staffingRating: 4,
  qualityRating: 4,
  isSff: false,
  isSffWatch: false,
  hasImmediateJeopardy: false,
  financials: {
    noi: 1800000,
    revenue: 8500000,
    expenses: 6700000,
    ebitdar: 2100000,
  },
  marketData: {
    marketCapRate: 0.095,
    marketPricePerBed: 145000,
  },
};

// Mock CMS provider data
const mockCmsProvider: import('@/lib/cms').NormalizedProviderData = {
  ccn: '385001',
  providerName: 'Sunrise Care Center',
  address: '123 Healthcare Drive',
  city: 'Portland',
  state: 'OR',
  zipCode: '97201',
  phoneNumber: '(503) 555-0100',
  ownershipType: 'For profit - Corporation',
  numberOfBeds: 115,
  averageResidentsPerDay: 105,
  overallRating: 4,
  healthInspectionRating: 3,
  staffingRating: 4,
  qualityMeasureRating: 4,
  reportedRnHppd: 0.85,
  reportedLpnHppd: 0.75,
  reportedCnaHppd: 2.5,
  totalNursingHppd: 4.1,
  totalDeficiencies: 8,
  healthDeficiencies: 5,
  isSff: false,
  isSffCandidate: false,
  abuseIcon: false,
  finesTotal: 0,
  dataDate: new Date().toISOString(),
  rawData: {} as import('@/lib/cms/cms-client').CMSProviderInfo,
};

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
    propertyName: 'Willamette Valley Healthcare',
    city: 'Eugene',
    state: 'OR',
    assetType: 'SNF',
    beds: 95,
    saleDate: new Date('2023-11-05'),
    salePrice: 13300000,
    pricePerBed: 140000,
    capRate: 0.09,
    noiAtSale: 1197000,
  },
];

// Mock proforma scenarios
const mockScenarios: ProformaScenario[] = [
  {
    id: 'scenario-1',
    name: 'Current Operations',
    scenarioType: 'baseline',
    isBaseCase: true,
    projectionYears: 5,
  },
  {
    id: 'scenario-2',
    name: 'Turnaround',
    scenarioType: 'upside',
    projectionYears: 5,
  },
  {
    id: 'scenario-3',
    name: 'Conservative',
    scenarioType: 'downside',
    projectionYears: 5,
  },
];

export default function FacilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;
  const facilityId = params.facilityId as string;

  const [activeTab, setActiveTab] = useState('overview');
  const [scenarios, setScenarios] = useState<ProformaScenario[]>(mockScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState(mockScenarios[0].id);

  const facility = mockFacility; // In production, fetch by facilityId

  const handleCreateScenario = (type: ScenarioType) => {
    const newScenario: ProformaScenario = {
      id: `scenario-${Date.now()}`,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} Scenario`,
      scenarioType: type,
      projectionYears: 5,
    };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(newScenario.id);
  };

  const handleDuplicateScenario = (id: string) => {
    const original = scenarios.find((s) => s.id === id);
    if (!original) return;

    const newScenario: ProformaScenario = {
      ...original,
      id: `scenario-${Date.now()}`,
      name: `${original.name} (Copy)`,
      isBaseCase: false,
    };
    setScenarios((prev) => [...prev, newScenario]);
    setActiveScenarioId(newScenario.id);
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
    if (activeScenarioId === id) {
      setActiveScenarioId(scenarios[0]?.id);
    }
  };

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
              Deal Details
            </Link>
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <Link
              href={`/app/deals/${dealId}/facilities`}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              Facilities
            </Link>
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <span className="text-[var(--color-text-primary)] font-medium">{facility.name}</span>
          </div>

          {/* Page header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={`/app/deals/${dealId}/facilities`}
                className="p-2 hover:bg-[var(--gray-100)] rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--color-text-tertiary)]" />
              </Link>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                    {facility.name}
                  </h1>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                    {facility.assetType}
                  </span>
                  {facility.cmsRating && (
                    <span className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      {facility.cmsRating}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)]">
                  {facility.city && facility.state && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {facility.city}, {facility.state}
                    </span>
                  )}
                  {facility.licensedBeds && (
                    <span className="flex items-center gap-1">
                      <Bed className="w-4 h-4" />
                      {facility.licensedBeds} beds
                    </span>
                  )}
                  {facility.ccn && (
                    <span>CCN: {facility.ccn}</span>
                  )}
                </div>
              </div>
            </div>

            {facility.ccn && (
              <a
                href={`https://www.medicare.gov/care-compare/details/nursing-home/${facility.ccn}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg hover:bg-[var(--gray-50)] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Medicare.gov
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cms">CMS Data</TabsTrigger>
            <TabsTrigger value="valuation">Valuation</TabsTrigger>
            <TabsTrigger value="proforma">Proforma</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon={Bed}
                label="Licensed Beds"
                value={facility.licensedBeds?.toString() || 'N/A'}
              />
              <MetricCard
                icon={Calendar}
                label="Year Built"
                value={facility.yearBuilt?.toString() || 'N/A'}
              />
              {facility.financials?.noi && (
                <MetricCard
                  icon={DollarSign}
                  label="NOI"
                  value={`$${(facility.financials.noi / 1000000).toFixed(2)}M`}
                />
              )}
              {facility.financials?.revenue && (
                <MetricCard
                  icon={TrendingUp}
                  label="Revenue"
                  value={`$${(facility.financials.revenue / 1000000).toFixed(2)}M`}
                />
              )}
            </div>

            {/* Warnings */}
            {(facility.isSff || facility.isSffWatch || facility.hasImmediateJeopardy) && (
              <div className="card p-4 border-l-4 border-l-red-500">
                <h3 className="font-medium text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Regulatory Alerts
                </h3>
                <div className="flex flex-wrap gap-2">
                  {facility.isSff && (
                    <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-sm">
                      Special Focus Facility
                    </span>
                  )}
                  {facility.isSffWatch && (
                    <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-sm">
                      SFF Watch List
                    </span>
                  )}
                  {facility.hasImmediateJeopardy && (
                    <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-sm">
                      Immediate Jeopardy
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Facility Details */}
            <div className="card p-6">
              <h3 className="font-medium text-[var(--color-text-primary)] mb-4">
                Facility Details
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <DetailItem label="Address" value={facility.address || 'N/A'} />
                <DetailItem
                  label="Location"
                  value={
                    facility.city && facility.state
                      ? `${facility.city}, ${facility.state} ${facility.zipCode || ''}`
                      : 'N/A'
                  }
                />
                <DetailItem label="CCN" value={facility.ccn || 'N/A'} />
                <DetailItem
                  label="Licensed Beds"
                  value={facility.licensedBeds?.toString() || 'N/A'}
                />
                <DetailItem
                  label="Certified Beds"
                  value={facility.certifiedBeds?.toString() || 'N/A'}
                />
                <DetailItem label="Year Built" value={facility.yearBuilt?.toString() || 'N/A'} />
              </div>
            </div>
          </TabsContent>

          {/* CMS Data Tab */}
          <TabsContent value="cms" className="space-y-6">
            {facility.ccn ? (
              <ProviderCard provider={mockCmsProvider} />
            ) : (
              <div className="card p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto text-[var(--color-text-tertiary)] mb-3" />
                <p className="text-[var(--color-text-secondary)]">
                  No CMS data available. Add a CCN to import CMS provider data.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Valuation Tab */}
          <TabsContent value="valuation" className="space-y-6">
            <ValuationPanel
              facility={{
                id: facility.id,
                name: facility.name,
                beds: facility.licensedBeds || 0,
                state: facility.state || '',
                assetType: facility.assetType,
                yearBuilt: facility.yearBuilt || undefined,
                cmsRating: facility.cmsRating || undefined,
              }}
              financials={facility.financials}
              marketData={facility.marketData}
              comparables={mockComparables}
            />
          </TabsContent>

          {/* Proforma Tab */}
          <TabsContent value="proforma" className="space-y-6">
            <ScenarioTabs
              scenarios={scenarios}
              activeScenarioId={activeScenarioId}
              onSelectScenario={setActiveScenarioId}
              onCreateScenario={handleCreateScenario}
              onDuplicateScenario={handleDuplicateScenario}
              onDeleteScenario={handleDeleteScenario}
            />

            <div className="card p-6">
              <p className="text-[var(--color-text-tertiary)]">
                Proforma spreadsheet for scenario:{' '}
                <span className="font-medium text-[var(--color-text-primary)]">
                  {scenarios.find((s) => s.id === activeScenarioId)?.name || 'None selected'}
                </span>
              </p>
              {/* The proforma-spreadsheet component would be integrated here */}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-[var(--color-text-tertiary)] mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-xl font-semibold text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-sm text-[var(--color-text-tertiary)]">{label}</div>
      <div className="font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}
