'use client';

import { useState, useEffect } from 'react';
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
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProviderCard } from '@/components/cms/provider-card';
import { ValuationPanel } from '@/components/valuation/valuation-panel';
import { ScenarioTabs, type ProformaScenario, type ScenarioType } from '@/components/proforma/scenario-tabs';
import { ProformaEditor } from '@/components/financials/proforma-editor';
import { FacilityFinancialDashboard } from '@/components/financials/facility-financial-dashboard';
import { FacilityPageSkeleton } from '@/components/facility/facility-page-skeleton';
import { FacilityRentSuggestion } from '@/components/slb/rent-suggestion-card';
import type { ProformaAssumption, ProformaOverride, YearlyProforma, CensusPeriod, PayerRates, PLLineItem } from '@/components/financials/types';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facility, setFacility] = useState<typeof mockFacility | null>(null);

  // Financial data state
  const [censusPeriods, setCensusPeriods] = useState<CensusPeriod[]>([]);
  const [payerRates, setPayerRates] = useState<PayerRates | null>(null);
  const [plLineItems, setPlLineItems] = useState<PLLineItem[]>([]);

  // Fetch facility data from API
  useEffect(() => {
    const fetchFacility = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/facilities/${facilityId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || 'Failed to fetch facility');
        }

        // Transform API data to match component expectations
        const facilityData = {
          ...result.data,
          assetType: result.data.assetType || 'SNF',
          financials: result.data.financials || mockFacility.financials,
          marketData: result.data.marketData || mockFacility.marketData,
        };

        setFacility(facilityData);
      } catch (err) {
        console.error('Error fetching facility:', err);
        // Fall back to mock data if API fails
        console.warn('Falling back to mock facility data');
        setFacility(mockFacility);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFacility();
  }, [facilityId]);

  // Fetch financial data (census and payer rates)
  useEffect(() => {
    const fetchFinancialData = async () => {
      if (!facilityId) return;

      try {
        // Fetch census data
        const censusResponse = await fetch(`/api/facilities/${facilityId}/census`);
        if (censusResponse.ok) {
          const censusResult = await censusResponse.json();
          if (censusResult.success && censusResult.data) {
            setCensusPeriods(censusResult.data.periods || []);
          }
        }

        // Fetch payer rates
        const ratesResponse = await fetch(`/api/facilities/${facilityId}/payer-rates`);
        if (ratesResponse.ok) {
          const ratesResult = await ratesResponse.json();
          if (ratesResult.success && ratesResult.data?.rates?.length > 0) {
            const latestRate = ratesResult.data.rates[0];
            setPayerRates({
              id: latestRate.id || `rate-${facilityId}`,
              facilityId: facilityId,
              effectiveDate: latestRate.effectiveDate,
              medicarePartAPpd: Number(latestRate.medicarePartAPpd) || 0,
              medicareAdvantagePpd: Number(latestRate.medicareAdvantagePpd) || 0,
              managedCarePpd: Number(latestRate.managedCarePpd) || 0,
              medicaidPpd: Number(latestRate.medicaidPpd) || 0,
              managedMedicaidPpd: Number(latestRate.managedMedicaidPpd) || 0,
              privatePpd: Number(latestRate.privatePpd) || 0,
              vaContractPpd: Number(latestRate.vaContractPpd) || 0,
              hospicePpd: Number(latestRate.hospicePpd) || 0,
              ancillaryRevenuePpd: Number(latestRate.ancillaryRevenuePpd) || 0,
              therapyRevenuePpd: Number(latestRate.therapyRevenuePpd) || 0,
            });
          }
        }
      } catch (err) {
        console.error('Error fetching financial data:', err);
      }
    };

    fetchFinancialData();
  }, [facilityId]);

  // Show loading state
  if (isLoading) {
    return <FacilityPageSkeleton />;
  }

  // Show error state
  if (error || !facility) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-subtle)] dark:bg-surface-900 flex items-center justify-center">
        <div className="neu-card p-8 text-center max-w-md">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
            {error || 'Facility not found'}
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-4">
            We couldn't load the facility data. Please try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="neu-button-primary inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

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

  // Convert scenario data to ProformaAssumption format
  const getAssumptionsForScenario = (scenario?: ProformaScenario): ProformaAssumption[] => {
    const defaults: ProformaAssumption[] = [
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

    if (!scenario) return defaults;

    // Adjust based on scenario type
    const typeMultipliers: Record<string, number> = {
      upside: 1.5,
      downside: 0.5,
      baseline: 1.0,
    };
    const multiplier = typeMultipliers[scenario.scenarioType] || 1.0;

    return defaults.map((a) => {
      if (a.category === 'revenue') {
        return { ...a, value: a.value * multiplier };
      }
      if (a.category === 'expense' && scenario.scenarioType === 'downside') {
        return { ...a, value: a.value * 1.4 }; // Higher expense growth in downside
      }
      if (a.key === 'occupancy_target_y5') {
        const occupancyAdjust = scenario.scenarioType === 'upside' ? 0.95 :
                                scenario.scenarioType === 'downside' ? 0.82 : 0.90;
        return { ...a, value: occupancyAdjust };
      }
      return a;
    });
  };

  // Handle saving census data
  const handleSaveCensus = async (periods: CensusPeriod[]): Promise<void> => {
    try {
      for (const period of periods) {
        const response = await fetch(`/api/facilities/${facilityId}/census`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(period),
        });
        if (!response.ok) {
          throw new Error('Failed to save census data');
        }
      }
      setCensusPeriods(periods);
    } catch (error) {
      console.error('Error saving census:', error);
      throw error;
    }
  };

  // Handle saving payer rates
  const handleSaveRates = async (rates: PayerRates): Promise<void> => {
    try {
      const response = await fetch(`/api/facilities/${facilityId}/payer-rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates),
      });
      if (!response.ok) {
        throw new Error('Failed to save payer rates');
      }
      setPayerRates(rates);
    } catch (error) {
      console.error('Error saving rates:', error);
      throw error;
    }
  };

  // Handle saving proforma assumptions and overrides
  const handleSaveProforma = async (
    assumptions: ProformaAssumption[],
    overrides: ProformaOverride[]
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/deals/${dealId}/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scenarios.find((s) => s.id === activeScenarioId)?.name || 'Updated Scenario',
          type: scenarios.find((s) => s.id === activeScenarioId)?.scenarioType || 'custom',
          facilityId,
          assumptions: assumptions.reduce((acc, a) => {
            acc[a.key] = a.value;
            return acc;
          }, {} as Record<string, number>),
          overrides,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save proforma');
      }

      console.log('Proforma saved successfully');
    } catch (error) {
      console.error('Error saving proforma:', error);
      throw error;
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
            <TabsTrigger value="financials">Financials</TabsTrigger>
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

            {/* Rent Suggestion - Show when financial data is available */}
            {facility.financials && (facility.financials.ebitdar || facility.financials.noi) && (
              <FacilityRentSuggestion
                facilityName={facility.name}
                beds={facility.licensedBeds || facility.certifiedBeds || 100}
                ttmEbitdar={facility.financials.ebitdar || facility.financials.noi || 0}
                ttmNoi={facility.financials.noi || 0}
              />
            )}

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

          {/* Financials Tab - Census, PPD, P&L, Proforma */}
          <TabsContent value="financials" className="space-y-6">
            <FacilityFinancialDashboard
              facilityId={facilityId}
              facilityName={facility.name}
              totalBeds={facility.licensedBeds || facility.certifiedBeds || 100}
              scenarioId={activeScenarioId}
              scenarioName={scenarios.find((s) => s.id === activeScenarioId)?.name}
              censusPeriods={censusPeriods}
              onSaveCensus={handleSaveCensus}
              currentRates={payerRates || {
                id: `default-rate-${facilityId}`,
                facilityId: facilityId,
                effectiveDate: new Date().toISOString().split('T')[0],
                medicarePartAPpd: 625,
                medicareAdvantagePpd: 480,
                managedCarePpd: 420,
                medicaidPpd: 185,
                managedMedicaidPpd: 195,
                privatePpd: 285,
                vaContractPpd: 350,
                hospicePpd: 200,
                ancillaryRevenuePpd: 20,
                therapyRevenuePpd: 15,
              }}
              onSaveRates={handleSaveRates}
              plLineItems={plLineItems.length > 0 ? plLineItems : [
                { coaCode: '4100', label: 'Room & Board Revenue', category: 'revenue' as const, actual: facility.financials?.revenue || 6800000, ppd: 188.89 },
                { coaCode: '4200', label: 'Ancillary Revenue', category: 'revenue' as const, actual: 720000, ppd: 20.00 },
                { coaCode: '4300', label: 'Therapy Revenue', category: 'revenue' as const, actual: 180000, ppd: 5.00 },
                { coaCode: '5100', label: 'Salaries & Wages', category: 'expense' as const, actual: 3500000, ppd: 97.22 },
                { coaCode: '5200', label: 'Employee Benefits', category: 'expense' as const, actual: 700000, ppd: 19.44 },
                { coaCode: '5300', label: 'Contract Labor', category: 'expense' as const, actual: 150000, ppd: 4.17 },
                { coaCode: '5400', label: 'Dietary', category: 'expense' as const, actual: 380000, ppd: 10.56 },
                { coaCode: '5500', label: 'Pharmacy', category: 'expense' as const, actual: 220000, ppd: 6.11 },
                { coaCode: '5600', label: 'Supplies', category: 'expense' as const, actual: 180000, ppd: 5.00 },
                { coaCode: '5700', label: 'Utilities', category: 'expense' as const, actual: 120000, ppd: 3.33 },
                { coaCode: '5800', label: 'Insurance', category: 'expense' as const, actual: 150000, ppd: 4.17 },
                { coaCode: '5900', label: 'Property Tax', category: 'expense' as const, actual: 180000, ppd: 5.00 },
                { coaCode: '6000', label: 'Management Fee', category: 'expense' as const, actual: 385000, ppd: 10.69 },
                { coaCode: '6100', label: 'Rent', category: 'expense' as const, actual: 600000, ppd: 16.67 },
              ]}
              proformaAssumptions={getAssumptionsForScenario(
                scenarios.find((s) => s.id === activeScenarioId)
              )}
            />
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

            <ProformaEditor
              facilityId={facilityId}
              facilityName={facility.name}
              scenarioId={activeScenarioId}
              scenarioName={scenarios.find((s) => s.id === activeScenarioId)?.name || 'Base Case'}
              baseYear={new Date().getFullYear()}
              projectionYears={5}
              initialAssumptions={getAssumptionsForScenario(
                scenarios.find((s) => s.id === activeScenarioId)
              )}
              initialOverrides={[]}
              baselineData={{
                year: new Date().getFullYear(),
                totalDays: facility.licensedBeds ? facility.licensedBeds * 365 * 0.85 : 30000,
                occupancy: 0.85,
                revenue: facility.financials?.revenue || 8500000,
                expenses: facility.financials?.expenses || 6700000,
                ebitdar: facility.financials?.ebitdar || 1800000,
                rent: (facility.financials?.revenue || 8500000) * 0.08,
                ebitda: (facility.financials?.ebitdar || 1800000) - (facility.financials?.revenue || 8500000) * 0.08,
                ebitdaMargin: 0.12,
              }}
              onSave={handleSaveProforma}
              onExport={() => {
                // Export functionality
                console.log('Export proforma');
              }}
            />
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
