'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Brain, FileSpreadsheet, DollarSign, BarChart3,
  Image, Loader2, CheckCircle2, AlertCircle, Building2, Clock,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { DealComparisonTable } from '@/components/learning/DealComparisonTable';
import { VisualCard } from '@/components/learning/VisualCard';

type TabId = 'overview' | 'comparison' | 'valuation' | 'patterns' | 'visual';

interface DealDetail {
  id: string;
  name: string;
  assetType: string;
  primaryState: string | null;
  status: string;
  beds: number | null;
  facilityCount: number | null;
  askingPrice: string | null;
  finalPrice: string | null;
  dealDate: string | null;
  rawExtraction: Record<string, unknown> | null;
  proformaExtraction: Record<string, unknown> | null;
  valuationExtraction: Record<string, unknown> | null;
  comparisonResult: ComparisonResult | null;
  createdAt: string;
  completedAt: string | null;
  files: DealFile[];
  facilities: DealFacility[];
}

interface ComparisonResult {
  facilities: FacilityComparison[];
  portfolioSummary: Record<string, unknown>;
  warnings: string[];
}

interface FacilityComparison {
  facilityName: string;
  propertyType?: string;
  beds?: number;
  state?: string;
  assetType?: string;
  raw: {
    revenue: number | null;
    expenses: number | null;
    ebitdar: number | null;
    occupancy: number | null;
    lineItems?: Array<{
      label: string;
      rawValue: number | null;
      proformaValue: number | null;
      changePercent: number | null;
      changeType: string;
    }>;
  };
  proforma: {
    revenue: number | null;
    expenses: number | null;
    ebitdar: number | null;
    occupancy: number | null;
  };
  adjustments: Array<{
    label: string;
    rawValue: number | null;
    proformaValue: number | null;
    changePercent: number | null;
    changeType: string;
  }>;
  valuation: {
    userValue: number | null;
    systemValue: number | null;
    userCapRate: number | null;
    impliedCapRate: number | null;
    userMultiplier: number | null;
    delta: number | null;
    deltaPercent: number | null;
  };
  detectedPreferences: Record<string, number | undefined>;
}

interface DealFile {
  id: string;
  filename: string;
  fileRole: string;
  mimeType: string | null;
  fileSizeBytes: number | null;
}

interface DealFacility {
  id: string;
  facilityName: string;
  assetType: string | null;
  state: string | null;
  beds: number | null;
  propertyType: string | null;
  rawEbitdar: string | null;
  proformaEbitdar: string | null;
  userValuation: string | null;
  userCapRate: string | null;
  valuationDelta: string | null;
  valuationDeltaPercent: string | null;
  mgmtFeePercent: string | null;
  agencyPercent: string | null;
  capexReservePercent: string | null;
  revenueGrowthRate: string | null;
  expenseGrowthRate: string | null;
  occupancyAssumption: string | null;
}

function formatCurrency(value: string | number | null | undefined): string {
  if (value == null) return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '—';
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
}

function formatPercent(value: string | number | null | undefined): string {
  if (value == null) return '—';
  const num = typeof value === 'string' ? Number(value) : value;
  if (isNaN(num)) return '—';
  return `${(num * 100).toFixed(1)}%`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ROLE_LABELS: Record<string, string> = {
  raw_source: 'Raw Source',
  completed_proforma: 'Proforma',
  value_assessment: 'Valuation',
};

const ROLE_COLORS: Record<string, string> = {
  raw_source: 'bg-blue-50 text-blue-600 border-blue-200',
  completed_proforma: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  value_assessment: 'bg-amber-50 text-amber-600 border-amber-200',
};

export default function DealDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    async function fetchDeal() {
      try {
        const res = await fetch(`/api/learning/deals/${id}`);
        const data = await res.json();
        if (data.success) setDeal(data.data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    fetchDeal();
  }, [id]);

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      await fetch(`/api/learning/deals/${id}/process`, { method: 'POST' });
      // Refetch
      const res = await fetch(`/api/learning/deals/${id}`);
      const data = await res.json();
      if (data.success) setDeal(data.data);
    } catch {
      // silent
    } finally {
      setReprocessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-surface-800 mb-1">Deal Not Found</h2>
        <Link href="/app/learning" className="text-sm text-primary-500 hover:text-primary-600">
          Back to Learning
        </Link>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: typeof Brain; disabled?: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: FileSpreadsheet },
    { id: 'comparison', label: 'Raw vs Proforma', icon: BarChart3, disabled: !deal.comparisonResult },
    { id: 'valuation', label: 'Valuation', icon: DollarSign, disabled: !deal.comparisonResult },
    { id: 'patterns', label: 'Patterns', icon: Brain, disabled: !deal.comparisonResult },
    { id: 'visual', label: 'Visual', icon: Image },
  ];

  const comparison = deal.comparisonResult;

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/app/learning"
          className="inline-flex items-center gap-1 text-sm text-surface-500 hover:text-primary-500 mb-3 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Learning
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-surface-900 dark:text-white">{deal.name}</h1>
              <span className="text-xs px-2 py-0.5 rounded bg-surface-100 text-surface-500 font-medium">
                {deal.assetType}
              </span>
              {deal.primaryState && (
                <span className="text-xs px-2 py-0.5 rounded bg-surface-100 text-surface-500">
                  {deal.primaryState}
                </span>
              )}
              <span className={cn(
                'text-xs px-2 py-1 rounded-full font-medium',
                deal.status === 'complete' ? 'bg-emerald-50 text-emerald-600' :
                deal.status === 'error' ? 'bg-red-50 text-red-600' :
                'bg-amber-50 text-amber-600'
              )}>
                {deal.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-surface-400 mt-1">
              {deal.beds && <span>{deal.beds} beds</span>}
              {deal.finalPrice && <span>Final: {formatCurrency(deal.finalPrice)}</span>}
              {deal.askingPrice && <span>Ask: {formatCurrency(deal.askingPrice)}</span>}
              {deal.dealDate && <span>{formatDate(deal.dealDate)}</span>}
            </div>
          </div>
          <button
            onClick={handleReprocess}
            disabled={reprocessing}
            className="neu-button text-sm py-1.5 px-3 flex items-center gap-2 disabled:opacity-50"
          >
            {reprocessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            Reprocess
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200 dark:border-surface-700">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-[1px] transition-all',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : tab.disabled
                    ? 'border-transparent text-surface-300 cursor-not-allowed'
                    : 'border-transparent text-surface-500 hover:text-surface-700 hover:border-surface-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Files */}
          <div className="lg:col-span-2 neu-card !p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-3">Uploaded Files</h3>
            <div className="space-y-2">
              {deal.files.map(file => (
                <div key={file.id} className="flex items-center gap-3 py-2 px-3 rounded-lg bg-surface-50">
                  <FileSpreadsheet className="w-4 h-4 text-surface-400 flex-shrink-0" />
                  <span className="text-sm text-surface-700 truncate flex-1">{file.filename}</span>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full border font-medium',
                    ROLE_COLORS[file.fileRole] || 'bg-surface-50 text-surface-500 border-surface-200'
                  )}>
                    {ROLE_LABELS[file.fileRole] || file.fileRole}
                  </span>
                  {file.fileSizeBytes && (
                    <span className="text-[10px] text-surface-400">
                      {(file.fileSizeBytes / 1024).toFixed(0)}KB
                    </span>
                  )}
                </div>
              ))}
              {deal.files.length === 0 && (
                <p className="text-sm text-surface-400 text-center py-4">No files uploaded</p>
              )}
            </div>
          </div>

          {/* Processing Status */}
          <div className="neu-card !p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-3">Processing Pipeline</h3>
            <div className="space-y-3">
              {[
                { phase: 'Extract', done: !!deal.rawExtraction },
                { phase: 'Parse Proforma', done: !!deal.proformaExtraction },
                { phase: 'Parse Valuation', done: !!deal.valuationExtraction },
                { phase: 'Compare', done: !!deal.comparisonResult },
                { phase: 'Learn', done: deal.status === 'complete' },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={cn(
                    'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
                    step.done ? 'bg-emerald-100' : 'bg-surface-100'
                  )}>
                    {step.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Clock className="w-3.5 h-3.5 text-surface-300" />
                    )}
                  </div>
                  <span className={cn(
                    'text-sm',
                    step.done ? 'text-surface-700' : 'text-surface-400'
                  )}>
                    {step.phase}
                  </span>
                </div>
              ))}
            </div>

            {/* Warnings */}
            {comparison?.warnings && comparison.warnings.length > 0 && (
              <div className="mt-4 pt-4 border-t border-surface-100">
                <h4 className="text-xs font-semibold text-amber-600 mb-2">Warnings</h4>
                <ul className="space-y-1">
                  {comparison.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-600 flex items-start gap-1.5">
                      <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Facilities */}
          {deal.facilities.length > 0 && (
            <div className="lg:col-span-3 neu-card !p-5">
              <h3 className="text-sm font-semibold text-surface-700 mb-3">
                Facilities ({deal.facilities.length})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-surface-400 uppercase tracking-wider border-b border-surface-100">
                      <th className="text-left py-2 font-medium">Name</th>
                      <th className="text-left py-2 font-medium">Type</th>
                      <th className="text-left py-2 font-medium">State</th>
                      <th className="text-right py-2 font-medium">Beds</th>
                      <th className="text-right py-2 font-medium">Raw EBITDAR</th>
                      <th className="text-right py-2 font-medium">Pro EBITDAR</th>
                      <th className="text-right py-2 font-medium">Valuation</th>
                      <th className="text-right py-2 font-medium">Cap Rate</th>
                      <th className="text-right py-2 font-medium">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-50">
                    {deal.facilities.map(fac => (
                      <tr key={fac.id} className="hover:bg-surface-50">
                        <td className="py-2 font-medium text-surface-800">{fac.facilityName}</td>
                        <td className="py-2 text-surface-500">{fac.propertyType || fac.assetType || '—'}</td>
                        <td className="py-2 text-surface-500">{fac.state || '—'}</td>
                        <td className="py-2 text-right tabular-nums">{fac.beds || '—'}</td>
                        <td className="py-2 text-right tabular-nums text-surface-600">{formatCurrency(fac.rawEbitdar)}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-surface-800">{formatCurrency(fac.proformaEbitdar)}</td>
                        <td className="py-2 text-right tabular-nums font-medium text-primary-600">{formatCurrency(fac.userValuation)}</td>
                        <td className="py-2 text-right tabular-nums">{formatPercent(fac.userCapRate)}</td>
                        <td className={cn(
                          'py-2 text-right tabular-nums font-medium',
                          fac.valuationDeltaPercent && Number(fac.valuationDeltaPercent) > 0 ? 'text-emerald-600' :
                          fac.valuationDeltaPercent && Number(fac.valuationDeltaPercent) < 0 ? 'text-red-500' : 'text-surface-400'
                        )}>
                          {fac.valuationDeltaPercent ? `${(Number(fac.valuationDeltaPercent) * 100).toFixed(1)}%` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'comparison' && comparison && (
        <DealComparisonTable facilities={comparison.facilities as unknown as Parameters<typeof DealComparisonTable>[0]['facilities']} />
      )}

      {activeTab === 'valuation' && comparison && (
        <div className="space-y-4">
          <div className="neu-card !p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-4">Valuation Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-surface-400 uppercase tracking-wider border-b border-surface-100">
                    <th className="text-left py-2 font-medium">Facility</th>
                    <th className="text-right py-2 font-medium">User Value</th>
                    <th className="text-right py-2 font-medium">System Value</th>
                    <th className="text-right py-2 font-medium">User Cap Rate</th>
                    <th className="text-right py-2 font-medium">Implied Cap Rate</th>
                    <th className="text-right py-2 font-medium">User Multiplier</th>
                    <th className="text-right py-2 font-medium">Delta</th>
                    <th className="text-right py-2 font-medium">Delta %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {comparison.facilities.map((fac, i) => (
                    <tr key={i} className="hover:bg-surface-50">
                      <td className="py-2.5 font-medium text-surface-800">{fac.facilityName}</td>
                      <td className="py-2.5 text-right tabular-nums font-medium text-primary-600">
                        {formatCurrency(fac.valuation.userValue)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-surface-600">
                        {formatCurrency(fac.valuation.systemValue)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {formatPercent(fac.valuation.userCapRate)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-amber-600">
                        {formatPercent(fac.valuation.impliedCapRate)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {fac.valuation.userMultiplier ? `${fac.valuation.userMultiplier.toFixed(2)}x` : '—'}
                      </td>
                      <td className={cn(
                        'py-2.5 text-right tabular-nums',
                        fac.valuation.delta && fac.valuation.delta > 0 ? 'text-emerald-600' :
                        fac.valuation.delta && fac.valuation.delta < 0 ? 'text-red-500' : 'text-surface-400'
                      )}>
                        {formatCurrency(fac.valuation.delta)}
                      </td>
                      <td className={cn(
                        'py-2.5 text-right tabular-nums font-medium',
                        fac.valuation.deltaPercent && fac.valuation.deltaPercent > 0 ? 'text-emerald-600' :
                        fac.valuation.deltaPercent && fac.valuation.deltaPercent < 0 ? 'text-red-500' : 'text-surface-400'
                      )}>
                        {fac.valuation.deltaPercent != null ? `${(fac.valuation.deltaPercent * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'patterns' && comparison && (
        <div className="space-y-4">
          <div className="neu-card !p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary-500" />
              Extracted Patterns
            </h3>
            <p className="text-xs text-surface-400 mb-4">
              These are the normalization preferences detected from your completed proforma and valuation decisions.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparison.facilities.map((fac, i) => (
                <div key={i} className="border border-surface-100 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-4 h-4 text-surface-400" />
                    <h4 className="text-sm font-semibold text-surface-800">{fac.facilityName}</h4>
                    {fac.propertyType && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500">
                        {fac.propertyType}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {Object.entries(fac.detectedPreferences).map(([key, value]) => (
                      value != null && (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-xs text-surface-500">
                            {key.replace(/([A-Z])/g, ' $1').replace(/Percent/, ' %').trim()}
                          </span>
                          <span className="text-xs font-semibold text-primary-600 tabular-nums">
                            {key.includes('ultiplier')
                              ? `${value.toFixed(2)}x`
                              : `${(value * 100).toFixed(1)}%`}
                          </span>
                        </div>
                      )
                    ))}
                  </div>
                  {Object.values(fac.detectedPreferences).every(v => v == null) && (
                    <p className="text-xs text-surface-400 italic">No patterns detected for this facility</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'visual' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VisualCard
            type="deal_summary"
            data={{
              name: deal.name,
              assetType: deal.assetType,
              beds: deal.beds,
              facilityCount: deal.facilities.length,
              askingPrice: deal.askingPrice,
              finalPrice: deal.finalPrice,
              facilities: deal.facilities.map(f => ({
                name: f.facilityName,
                beds: f.beds,
                type: f.propertyType,
              })),
            }}
          />
          {comparison && (
            <>
              <VisualCard
                type="valuation_breakdown"
                data={{
                  facilities: comparison.facilities.map(f => ({
                    name: f.facilityName,
                    value: f.valuation.userValue,
                    capRate: f.valuation.userCapRate,
                    type: f.propertyType,
                  })),
                  portfolioSummary: comparison.portfolioSummary,
                }}
              />
              <VisualCard
                type="comparison_diff"
                data={{
                  facilities: comparison.facilities.map(f => ({
                    name: f.facilityName,
                    rawRevenue: f.raw.revenue,
                    proformaRevenue: f.proforma.revenue,
                    rawEbitdar: f.raw.ebitdar,
                    proformaEbitdar: f.proforma.ebitdar,
                  })),
                }}
              />
              <VisualCard
                type="learned_preferences"
                data={{
                  assetType: deal.assetType,
                  state: deal.primaryState,
                  facilities: comparison.facilities.map(f => ({
                    name: f.facilityName,
                    preferences: f.detectedPreferences,
                  })),
                }}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}
