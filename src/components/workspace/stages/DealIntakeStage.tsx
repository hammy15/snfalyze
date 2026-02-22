'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  MapPin,
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { IntakeStageData } from '@/types/workspace';

interface DealIntakeStageProps {
  dealId: string;
  stageData: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

const SECTIONS = [
  { id: 'facilityIdentification', label: 'Facility Identification', icon: Building2, description: 'CCN, location, bed count' },
  { id: 'ownershipDealStructure', label: 'Ownership & Deal Structure', icon: Users, description: 'Owner, price, deal type' },
  { id: 'financialSnapshot', label: 'Financial Snapshot', icon: DollarSign, description: 'Revenue, EBITDA, payer mix' },
  { id: 'operationalSnapshot', label: 'Operational Snapshot', icon: Activity, description: 'CMS ratings, staffing, CMI' },
  { id: 'marketContext', label: 'Market Context', icon: MapPin, description: 'Market area, competitors, CON' },
];

export function DealIntakeStage({ dealId, stageData, onUpdate }: DealIntakeStageProps) {
  const [expandedSection, setExpandedSection] = useState<string>('facilityIdentification');
  const [cmsLoading, setCmsLoading] = useState(false);
  const [cmsLoaded, setCmsLoaded] = useState(false);

  const data = stageData as Partial<IntakeStageData>;

  const updateSection = <K extends keyof IntakeStageData>(
    section: K,
    field: keyof IntakeStageData[K],
    value: unknown
  ) => {
    onUpdate({
      [section]: {
        ...(data[section] || {}),
        [field]: value,
      },
    });
  };

  const getSectionCompleteness = (sectionId: string): number => {
    const sectionData = data[sectionId as keyof IntakeStageData];
    if (!sectionData || typeof sectionData !== 'object') return 0;
    const values = Object.values(sectionData as Record<string, unknown>);
    if (values.length === 0) return 0;
    const filled = values.filter(v => v !== null && v !== undefined && v !== '' && v !== 0);
    return Math.round((filled.length / values.length) * 100);
  };

  // CMS CCN Lookup
  const handleCCNLookup = async () => {
    const ccn = data.facilityIdentification?.ccn;
    if (!ccn || ccn.length < 6) return;

    setCmsLoading(true);
    try {
      const res = await fetch(`/api/cms/provider/${encodeURIComponent(ccn)}`);
      if (res.ok) {
        const cmsData = await res.json();
        // Auto-fill from CMS data
        if (cmsData) {
          onUpdate({
            facilityIdentification: {
              ...(data.facilityIdentification || {}),
              facilityName: cmsData.providerName || data.facilityIdentification?.facilityName || '',
              address: cmsData.address || '',
              city: cmsData.city || '',
              state: cmsData.state || '',
              zipCode: cmsData.zipCode || '',
              licensedBeds: cmsData.certifiedBeds || null,
              medicareCertifiedBeds: cmsData.certifiedBeds || null,
            },
            operationalSnapshot: {
              ...(data.operationalSnapshot || {}),
              cmsOverallRating: cmsData.overallRating || null,
              cmsStaffingStar: cmsData.staffingRating || null,
              cmsQualityStar: cmsData.qualityRating || null,
              cmsInspectionStar: cmsData.healthInspectionRating || null,
            },
          });
          setCmsLoaded(true);
        }
      }
    } catch (err) {
      console.error('CMS lookup failed:', err);
    } finally {
      setCmsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {/* Section cards */}
      {SECTIONS.map((section, idx) => {
        const isExpanded = expandedSection === section.id;
        const completeness = getSectionCompleteness(section.id);
        const Icon = section.icon;

        return (
          <div
            key={section.id}
            className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden"
          >
            {/* Section header */}
            <button
              onClick={() => setExpandedSection(isExpanded ? '' : section.id)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center',
                completeness === 100
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : completeness > 0
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400'
              )}>
                {completeness === 100 ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-800 dark:text-surface-200">
                    {section.label}
                  </span>
                  {completeness > 0 && completeness < 100 && (
                    <span className="text-[10px] text-surface-400">{completeness}%</span>
                  )}
                </div>
                <span className="text-xs text-surface-500">{section.description}</span>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-surface-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-surface-400" />
              )}
            </button>

            {/* Section content */}
            {isExpanded && (
              <div className="px-5 pb-5 pt-2 border-t border-surface-100 dark:border-surface-800">
                {section.id === 'facilityIdentification' && (
                  <FacilityIdentificationForm
                    data={data.facilityIdentification || {} as IntakeStageData['facilityIdentification']}
                    onChange={(field, value) => updateSection('facilityIdentification', field, value)}
                    onCCNLookup={handleCCNLookup}
                    cmsLoading={cmsLoading}
                    cmsLoaded={cmsLoaded}
                  />
                )}
                {section.id === 'ownershipDealStructure' && (
                  <OwnershipDealStructureForm
                    data={data.ownershipDealStructure || {} as IntakeStageData['ownershipDealStructure']}
                    onChange={(field, value) => updateSection('ownershipDealStructure', field, value)}
                  />
                )}
                {section.id === 'financialSnapshot' && (
                  <FinancialSnapshotForm
                    data={data.financialSnapshot || {} as IntakeStageData['financialSnapshot']}
                    onChange={(field, value) => updateSection('financialSnapshot', field, value)}
                  />
                )}
                {section.id === 'operationalSnapshot' && (
                  <OperationalSnapshotForm
                    data={data.operationalSnapshot || {} as IntakeStageData['operationalSnapshot']}
                    onChange={(field, value) => updateSection('operationalSnapshot', field, value)}
                  />
                )}
                {section.id === 'marketContext' && (
                  <MarketContextForm
                    data={data.marketContext || {} as IntakeStageData['marketContext']}
                    onChange={(field, value) => updateSection('marketContext', field, value)}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =============================================================================
// Sub-form components
// =============================================================================

function InputField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  suffix,
}: {
  label: string;
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  suffix?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(type === 'number' ? (e.target.value ? Number(e.target.value) : '') : e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">Select...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function BooleanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'w-10 h-5 rounded-full transition-colors relative',
          value ? 'bg-primary-500' : 'bg-surface-300 dark:bg-surface-600'
        )}
      >
        <div
          className={cn(
            'w-4 h-4 rounded-full bg-white shadow-sm absolute top-0.5 transition-transform',
            value ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>
      <label className="text-xs font-medium text-surface-600 dark:text-surface-400">{label}</label>
    </div>
  );
}

function CurrencyField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">$</span>
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="0"
          className="w-full pl-7 pr-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
    </div>
  );
}

function PercentField({
  label,
  value,
  onChange,
  required,
}: {
  label: string;
  value: number | null | undefined;
  onChange: (value: number | null) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          value={value ?? ''}
          onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
          placeholder="0"
          min={0}
          max={100}
          step={0.1}
          className="w-full px-3 pr-7 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">%</span>
      </div>
    </div>
  );
}

// Section 1: Facility Identification
function FacilityIdentificationForm({
  data,
  onChange,
  onCCNLookup,
  cmsLoading,
  cmsLoaded,
}: {
  data: Partial<IntakeStageData['facilityIdentification']>;
  onChange: (field: keyof IntakeStageData['facilityIdentification'], value: unknown) => void;
  onCCNLookup: () => void;
  cmsLoading: boolean;
  cmsLoaded: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* CCN with lookup */}
      <div>
        <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
          CMS Certification Number (CCN)<span className="text-red-400 ml-0.5">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={data.ccn || ''}
            onChange={e => onChange('ccn', e.target.value)}
            placeholder="e.g., 365001"
            className="flex-1 px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            onClick={onCCNLookup}
            disabled={cmsLoading || !data.ccn || data.ccn.length < 6}
            className="px-3 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          >
            {cmsLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : cmsLoaded ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {cmsLoading ? 'Looking up...' : cmsLoaded ? 'Loaded' : 'CMS Lookup'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <InputField label="Facility Name" value={data.facilityName} onChange={v => onChange('facilityName', v)} required />
        </div>
        <InputField label="NPI Number" value={data.npiNumber} onChange={v => onChange('npiNumber', v)} />
        <SelectField
          label="Facility Type"
          value={data.facilityType}
          onChange={v => onChange('facilityType', v)}
          options={[
            { value: 'SNF', label: 'SNF (Skilled Nursing)' },
            { value: 'ALF', label: 'ALF (Assisted Living)' },
            { value: 'CCRC', label: 'CCRC (Continuing Care)' },
            { value: 'SNF_ALF_COMBO', label: 'SNF + ALF Combo' },
          ]}
          required
        />
      </div>

      <div className="col-span-2">
        <InputField label="Address" value={data.address} onChange={v => onChange('address', v)} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <InputField label="City" value={data.city} onChange={v => onChange('city', v)} required />
        <InputField label="State" value={data.state} onChange={v => onChange('state', v)} required placeholder="e.g., OH" />
        <InputField label="ZIP" value={data.zipCode} onChange={v => onChange('zipCode', v)} required />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <InputField label="Licensed Beds" value={data.licensedBeds} onChange={v => onChange('licensedBeds', Number(v))} type="number" required />
        <InputField label="Medicare Certified Beds" value={data.medicareCertifiedBeds} onChange={v => onChange('medicareCertifiedBeds', Number(v))} type="number" required />
        <InputField label="Medicaid Certified Beds" value={data.medicaidCertifiedBeds} onChange={v => onChange('medicaidCertifiedBeds', Number(v))} type="number" required />
      </div>
    </div>
  );
}

// Section 2: Ownership & Deal Structure
function OwnershipDealStructureForm({
  data,
  onChange,
}: {
  data: Partial<IntakeStageData['ownershipDealStructure']>;
  onChange: (field: keyof IntakeStageData['ownershipDealStructure'], value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Current Owner Name" value={data.currentOwnerName} onChange={v => onChange('currentOwnerName', v)} required />
        <SelectField
          label="Owner Type"
          value={data.ownerType}
          onChange={v => onChange('ownerType', v)}
          options={[
            { value: 'individual', label: 'Individual' },
            { value: 'llc', label: 'LLC' },
            { value: 'pe_backed', label: 'PE-Backed' },
            { value: 'reit', label: 'REIT' },
            { value: 'non_profit', label: 'Non-Profit' },
          ]}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Years Under Current Ownership" value={data.yearsUnderCurrentOwnership} onChange={v => onChange('yearsUnderCurrentOwnership', Number(v))} type="number" />
        <CurrencyField label="Asking Price" value={data.askingPrice} onChange={v => onChange('askingPrice', v)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Deal Structure"
          value={data.dealStructure}
          onChange={v => onChange('dealStructure', v)}
          options={[
            { value: 'asset_sale', label: 'Asset Sale' },
            { value: 'stock_sale', label: 'Stock Sale' },
            { value: 'lease', label: 'Lease' },
            { value: 'jv', label: 'Joint Venture' },
          ]}
          required
        />
        <SelectField
          label="Source of Deal"
          value={data.sourceOfDeal}
          onChange={v => onChange('sourceOfDeal', v)}
          options={[
            { value: 'broker', label: 'Broker' },
            { value: 'direct', label: 'Direct' },
            { value: 'auction', label: 'Auction' },
            { value: 'relationship', label: 'Relationship' },
          ]}
          required
        />
      </div>
      <div className="flex gap-6">
        <BooleanField label="Real Estate Included" value={data.realEstateIncluded} onChange={v => onChange('realEstateIncluded', v)} />
        <BooleanField label="Seller Financing Available" value={data.sellerFinancingAvailable} onChange={v => onChange('sellerFinancingAvailable', v)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField
          label="Estimated Closing Timeline"
          value={data.estimatedClosingTimeline}
          onChange={v => onChange('estimatedClosingTimeline', v)}
          options={[
            { value: '<30_days', label: '< 30 days' },
            { value: '30_60', label: '30–60 days' },
            { value: '60_90', label: '60–90 days' },
            { value: '90_plus', label: '90+ days' },
          ]}
        />
        <InputField label="Broker Name" value={data.brokerName} onChange={v => onChange('brokerName', v)} placeholder="If applicable" />
      </div>
    </div>
  );
}

// Section 3: Financial Snapshot
function FinancialSnapshotForm({
  data,
  onChange,
}: {
  data: Partial<IntakeStageData['financialSnapshot']>;
  onChange: (field: keyof IntakeStageData['financialSnapshot'], value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-surface-500 -mt-1 mb-2">Trailing 12-month financials</p>
      <div className="grid grid-cols-3 gap-4">
        <CurrencyField label="TTM Revenue" value={data.ttmRevenue} onChange={v => onChange('ttmRevenue', v)} required />
        <CurrencyField label="TTM EBITDA" value={data.ttmEbitda} onChange={v => onChange('ttmEbitda', v)} required />
        <CurrencyField label="Normalized EBITDA" value={data.normalizedEbitda} onChange={v => onChange('normalizedEbitda', v)} />
      </div>
      <InputField label="Management Fee Structure" value={data.managementFeeStructure} onChange={v => onChange('managementFeeStructure', v)} placeholder="e.g., 5% of revenue" />
      <div className="grid grid-cols-4 gap-4">
        <InputField label="TTM ADC" value={data.ttmTotalCensusAdc} onChange={v => onChange('ttmTotalCensusAdc', Number(v))} type="number" required />
        <PercentField label="Medicare %" value={data.medicareCensusPercent} onChange={v => onChange('medicareCensusPercent', v)} required />
        <PercentField label="Medicaid %" value={data.medicaidCensusPercent} onChange={v => onChange('medicaidCensusPercent', v)} required />
        <PercentField label="Private Pay %" value={data.privatePayCensusPercent} onChange={v => onChange('privatePayCensusPercent', v)} required />
      </div>

      <div className="border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
        <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-3">3-Year Revenue Trend</p>
        <div className="grid grid-cols-3 gap-4">
          <CurrencyField label="Year -3 Revenue" value={data.revenueYear1} onChange={v => onChange('revenueYear1', v)} />
          <CurrencyField label="Year -2 Revenue" value={data.revenueYear2} onChange={v => onChange('revenueYear2', v)} />
          <CurrencyField label="Year -1 Revenue" value={data.revenueYear3} onChange={v => onChange('revenueYear3', v)} />
        </div>
      </div>
      <div>
        <p className="text-xs font-medium text-surface-600 dark:text-surface-400 mb-3">3-Year EBITDA Trend</p>
        <div className="grid grid-cols-3 gap-4">
          <CurrencyField label="Year -3 EBITDA" value={data.ebitdaYear1} onChange={v => onChange('ebitdaYear1', v)} />
          <CurrencyField label="Year -2 EBITDA" value={data.ebitdaYear2} onChange={v => onChange('ebitdaYear2', v)} />
          <CurrencyField label="Year -1 EBITDA" value={data.ebitdaYear3} onChange={v => onChange('ebitdaYear3', v)} />
        </div>
      </div>
    </div>
  );
}

// Section 4: Operational Snapshot
function OperationalSnapshotForm({
  data,
  onChange,
}: {
  data: Partial<IntakeStageData['operationalSnapshot']>;
  onChange: (field: keyof IntakeStageData['operationalSnapshot'], value: unknown) => void;
}) {
  const starOptions = [1, 2, 3, 4, 5].map(n => ({ value: String(n), label: `${n} Star${n > 1 ? 's' : ''}` }));

  return (
    <div className="space-y-4">
      <p className="text-xs text-surface-500 -mt-1 mb-2">Auto-filled via CMS CCN lookup when available</p>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="CMS Overall Rating" value={data.cmsOverallRating ? String(data.cmsOverallRating) : undefined} onChange={v => onChange('cmsOverallRating', Number(v))} options={starOptions} required />
        <SelectField label="CMS Staffing Star" value={data.cmsStaffingStar ? String(data.cmsStaffingStar) : undefined} onChange={v => onChange('cmsStaffingStar', Number(v))} options={starOptions} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SelectField label="CMS Quality Star" value={data.cmsQualityStar ? String(data.cmsQualityStar) : undefined} onChange={v => onChange('cmsQualityStar', Number(v))} options={starOptions} required />
        <SelectField label="CMS Inspection Star" value={data.cmsInspectionStar ? String(data.cmsInspectionStar) : undefined} onChange={v => onChange('cmsInspectionStar', Number(v))} options={starOptions} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Administrator Name" value={data.administratorName} onChange={v => onChange('administratorName', v)} />
        <InputField label="DON Name" value={data.donName} onChange={v => onChange('donName', v)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <InputField label="Total Staffing (FTE)" value={data.totalStaffingFte} onChange={v => onChange('totalStaffingFte', Number(v))} type="number" />
        <PercentField label="Agency Staff %" value={data.agencyStaffPercent} onChange={v => onChange('agencyStaffPercent', v)} />
        <InputField label="CMI (Case Mix Index)" value={data.cmi} onChange={v => onChange('cmi', Number(v))} type="number" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Last Survey Date" value={data.lastSurveyDate} onChange={v => onChange('lastSurveyDate', v)} type="date" />
        <InputField label="IJ Citations (last 3 years)" value={data.ijCitationsLast3Years} onChange={v => onChange('ijCitationsLast3Years', Number(v))} type="number" />
      </div>
    </div>
  );
}

// Section 5: Market Context
function MarketContextForm({
  data,
  onChange,
}: {
  data: Partial<IntakeStageData['marketContext']>;
  onChange: (field: keyof IntakeStageData['marketContext'], value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Primary Market Area" value={data.primaryMarketArea} onChange={v => onChange('primaryMarketArea', v)} required placeholder="e.g., Greater Cleveland MSA" />
        <SelectField
          label="Market Type"
          value={data.marketType}
          onChange={v => onChange('marketType', v)}
          options={[
            { value: 'urban', label: 'Urban' },
            { value: 'suburban', label: 'Suburban' },
            { value: 'rural', label: 'Rural' },
          ]}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <InputField label="Population 65+" value={data.population65Plus} onChange={v => onChange('population65Plus', Number(v))} type="number" />
        <PercentField label="Market Occupancy Rate" value={data.marketOccupancyRate} onChange={v => onChange('marketOccupancyRate', v)} />
      </div>
      <InputField label="Known Competitors (within 15 miles)" value={data.knownCompetitors} onChange={v => onChange('knownCompetitors', v)} placeholder="Comma-separated" />
      <BooleanField label="Certificate of Need (CON) State" value={data.isCONState} onChange={v => onChange('isCONState', v)} />
    </div>
  );
}
