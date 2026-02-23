'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  ArrowLeftRight,
  Plus,
  X,
  Star,
  Building2,
  DollarSign,
  Activity,
  Shield,
  TrendingUp,
  Loader2,
  ChevronDown,
} from 'lucide-react';

// =============================================================================
// Types
// =============================================================================

interface DealComparison {
  id: string;
  name: string;
  assetType: string;
  status: string;
  primaryState: string;
  askingPrice: string | null;
  facilityCount: number;
  totalBeds: number;
  avgCmsRating: number | null;
  hasSffFacility: boolean;
  ttmRevenue: number | null;
  ttmEbitda: number | null;
  normalizedEbitda: number | null;
  pricePerBed: number | null;
  ebitdaMultiple: number | null;
  medicarePct: number | null;
  medicaidPct: number | null;
  privatePayPct: number | null;
  cmsOverallRating: number | null;
  staffingFte: number | null;
  agencyPct: number | null;
  cmi: number | null;
  riskScore: number | null;
  riskRating: string | null;
  proformaYear1Revenue: number | null;
  proformaYear1Ebitda: number | null;
  workspaceCompletion: number;
  stagesCompleted: number;
  totalStages: number;
  currentStage: string | null;
}

interface DealPickerItem {
  id: string;
  name: string;
  assetType: string;
  primaryState: string;
  beds: number;
}

// =============================================================================
// Helpers
// =============================================================================

function fmt(value: number | null | undefined, type: 'currency' | 'percent' | 'number' | 'multiple' = 'number'): string {
  if (value === null || value === undefined) return '\u2014';
  switch (type) {
    case 'currency':
      if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
      if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
      return `$${value.toLocaleString()}`;
    case 'percent':
      return `${value.toFixed(1)}%`;
    case 'multiple':
      return `${value.toFixed(1)}x`;
    default:
      return value.toLocaleString();
  }
}

function riskColor(rating: string | null): string {
  switch (rating) {
    case 'LOW': return 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20';
    case 'MODERATE': return 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20';
    case 'ELEVATED': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/20';
    case 'HIGH': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
    case 'CRITICAL': return 'text-red-800 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
    default: return 'text-surface-500 bg-surface-100 dark:bg-surface-800';
  }
}

// =============================================================================
// Component
// =============================================================================

export default function DealComparisonPage() {
  const searchParams = useSearchParams();
  const initialIds = searchParams.get('deals')?.split(',').filter(Boolean) || [];

  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [comparisonData, setComparisonData] = useState<DealComparison[]>([]);
  const [allDeals, setAllDeals] = useState<DealPickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['overview', 'financial', 'operational', 'risk', 'workspace'])
  );

  // Fetch all deals for picker
  useEffect(() => {
    async function fetchDeals() {
      try {
        const res = await fetch('/api/deals');
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setAllDeals(
              data.data.map((d: Record<string, unknown>) => ({
                id: d.id,
                name: d.name,
                assetType: d.assetType || 'SNF',
                primaryState: d.primaryState || '',
                beds: d.beds || 0,
              }))
            );
          }
        }
      } catch {
        // Silently fail
      }
    }
    fetchDeals();
  }, []);

  // Fetch comparison data when selected deals change
  useEffect(() => {
    if (selectedIds.length < 2) {
      setComparisonData([]);
      return;
    }

    async function fetchComparison() {
      setLoading(true);
      try {
        const res = await fetch(`/api/deals/compare?ids=${selectedIds.join(',')}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setComparisonData(data.data);
          }
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchComparison();
  }, [selectedIds]);

  const addDeal = (id: string) => {
    if (selectedIds.length < 4 && !selectedIds.includes(id)) {
      setSelectedIds(prev => [...prev, id]);
    }
    setShowPicker(false);
  };

  const removeDeal = (id: string) => {
    setSelectedIds(prev => prev.filter(d => d !== id));
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  // Define comparison metric sections
  const sections = [
    {
      id: 'overview',
      label: 'Overview',
      icon: Building2,
      metrics: [
        { key: 'assetType', label: 'Asset Type', format: (v: unknown) => String(v || '\u2014') },
        { key: 'primaryState', label: 'State', format: (v: unknown) => String(v || '\u2014') },
        { key: 'facilityCount', label: 'Facilities', format: (v: unknown) => fmt(v as number) },
        { key: 'totalBeds', label: 'Total Beds', format: (v: unknown) => fmt(v as number), higherBetter: true },
        { key: 'avgCmsRating', label: 'Avg CMS Rating', format: (v: unknown) => v ? `${(v as number).toFixed(1)} / 5` : '\u2014', higherBetter: true },
        { key: 'hasSffFacility', label: 'SFF Facility?', format: (v: unknown) => v ? 'Yes' : 'No' },
      ],
    },
    {
      id: 'financial',
      label: 'Financial',
      icon: DollarSign,
      metrics: [
        { key: 'askingPrice', label: 'Asking Price', format: (v: unknown) => fmt(Number(v), 'currency'), higherBetter: false },
        { key: 'pricePerBed', label: 'Price / Bed', format: (v: unknown) => fmt(v as number, 'currency'), higherBetter: false },
        { key: 'ttmRevenue', label: 'TTM Revenue', format: (v: unknown) => fmt(v as number, 'currency'), higherBetter: true },
        { key: 'ttmEbitda', label: 'TTM EBITDA', format: (v: unknown) => fmt(v as number, 'currency'), higherBetter: true },
        { key: 'normalizedEbitda', label: 'Normalized EBITDA', format: (v: unknown) => fmt(v as number, 'currency'), higherBetter: true },
        { key: 'ebitdaMultiple', label: 'EBITDA Multiple', format: (v: unknown) => fmt(v as number, 'multiple'), higherBetter: false },
        { key: 'medicarePct', label: 'Medicare Mix', format: (v: unknown) => fmt(v as number, 'percent') },
        { key: 'medicaidPct', label: 'Medicaid Mix', format: (v: unknown) => fmt(v as number, 'percent') },
        { key: 'privatePayPct', label: 'Private Pay Mix', format: (v: unknown) => fmt(v as number, 'percent'), higherBetter: true },
      ],
    },
    {
      id: 'operational',
      label: 'Operational',
      icon: Activity,
      metrics: [
        { key: 'cmsOverallRating', label: 'CMS Rating', format: (v: unknown) => v ? `${v} / 5` : '\u2014', higherBetter: true },
        { key: 'staffingFte', label: 'Staffing (FTE)', format: (v: unknown) => fmt(v as number), higherBetter: true },
        { key: 'agencyPct', label: 'Agency Staff %', format: (v: unknown) => fmt(v as number, 'percent'), higherBetter: false },
        { key: 'cmi', label: 'Case Mix Index', format: (v: unknown) => v ? (v as number).toFixed(2) : '\u2014', higherBetter: true },
      ],
    },
    {
      id: 'risk',
      label: 'Risk Assessment',
      icon: Shield,
      metrics: [
        { key: 'riskScore', label: 'Risk Score', format: (v: unknown) => v ? `${v}/100` : '\u2014', higherBetter: false },
        { key: 'riskRating', label: 'Risk Rating', format: (v: unknown) => String(v || '\u2014') },
      ],
    },
    {
      id: 'proforma',
      label: 'Pro Forma',
      icon: TrendingUp,
      metrics: [
        { key: 'proformaYear1Revenue', label: 'Y1 Projected Revenue', format: (v: unknown) => fmt(v as number, 'currency'), higherBetter: true },
        { key: 'proformaYear1Ebitda', label: 'Y1 Projected EBITDA', format: (v: unknown) => fmt(v as number, 'currency'), higherBetter: true },
      ],
    },
    {
      id: 'workspace',
      label: 'Workspace Progress',
      icon: Activity,
      metrics: [
        { key: 'workspaceCompletion', label: 'Completion', format: (v: unknown) => `${v || 0}%`, higherBetter: true },
        { key: 'stagesCompleted', label: 'Stages Done', format: (v: unknown) => `${v || 0} / 5` },
        { key: 'currentStage', label: 'Current Stage', format: (v: unknown) => String(v || '\u2014').replace(/_/g, ' ') },
      ],
    },
  ];

  return (
    <div className="py-6 px-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">
            Deal Comparison
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            Compare up to 4 deals across all workspace dimensions
          </p>
        </div>
        {selectedIds.length < 4 && (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Deal
          </button>
        )}
      </div>

      {/* Deal picker */}
      {showPicker && (
        <div className="mb-6 border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Select a Deal</h3>
            <button onClick={() => setShowPicker(false)}>
              <X className="w-4 h-4 text-surface-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {allDeals
              .filter(d => !selectedIds.includes(d.id))
              .map(deal => (
                <button
                  key={deal.id}
                  onClick={() => addDeal(deal.id)}
                  className="text-left px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-300 hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors"
                >
                  <p className="text-sm font-medium text-surface-800 dark:text-surface-200 truncate">{deal.name}</p>
                  <p className="text-[10px] text-surface-500">
                    {deal.assetType} · {deal.beds} beds · {deal.primaryState}
                  </p>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {selectedIds.length < 2 && (
        <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl p-16 text-center">
          <ArrowLeftRight className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-200 mb-2">
            Select at least 2 deals
          </h3>
          <p className="text-sm text-surface-500 mb-4">
            Compare workspace data, financials, risk, and pro forma side-by-side
          </p>
          <button
            onClick={() => setShowPicker(true)}
            className="px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600"
          >
            <Plus className="w-4 h-4 inline mr-1" />
            Add Deals to Compare
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
        </div>
      )}

      {/* Comparison table */}
      {!loading && comparisonData.length >= 2 && (
        <div className="space-y-4">
          {/* Deal headers */}
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-white dark:bg-surface-900">
            <div className="grid" style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}>
              <div className="px-4 py-4 bg-surface-50 dark:bg-surface-800/50 border-b border-r border-surface-200 dark:border-surface-700" />
              {comparisonData.map(deal => (
                <div key={deal.id} className="px-4 py-4 border-b border-r last:border-r-0 border-surface-200 dark:border-surface-700 text-center relative">
                  <button
                    onClick={() => removeDeal(deal.id)}
                    className="absolute top-2 right-2 p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded transition-colors"
                  >
                    <X className="w-3 h-3 text-surface-400" />
                  </button>
                  <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">{deal.name}</p>
                  <p className="text-[10px] text-surface-500 mt-0.5">{deal.assetType} · {deal.primaryState}</p>
                  {/* Workspace progress bar */}
                  <div className="mt-2 h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${deal.workspaceCompletion}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-surface-400 mt-1">{deal.workspaceCompletion}% complete</p>
                  {deal.riskRating && (
                    <span className={cn('inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold', riskColor(deal.riskRating))}>
                      {deal.riskRating}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Metric sections */}
            {sections.map(section => {
              const isExpanded = expandedSections.has(section.id);
              const Icon = section.icon;

              return (
                <div key={section.id}>
                  {/* Section header */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full grid border-b border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800/30 transition-colors"
                    style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}
                  >
                    <div className="px-4 py-2.5 flex items-center gap-2 border-r border-surface-200 dark:border-surface-700">
                      <Icon className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-xs font-semibold text-surface-700 dark:text-surface-300">{section.label}</span>
                      <ChevronDown className={cn('w-3 h-3 text-surface-400 transition-transform ml-auto', isExpanded ? '' : '-rotate-90')} />
                    </div>
                    {comparisonData.map(deal => (
                      <div key={deal.id} className="px-4 py-2.5 border-r last:border-r-0 border-surface-200 dark:border-surface-700" />
                    ))}
                  </button>

                  {/* Metrics */}
                  {isExpanded && section.metrics.map(metric => {
                    const values = comparisonData.map(d => (d as unknown as Record<string, unknown>)[metric.key]);
                    const numericValues = values.map(v => typeof v === 'number' ? v : null).filter(v => v !== null) as number[];

                    let bestIdx = -1;
                    if ('higherBetter' in metric && numericValues.length > 1) {
                      const best = metric.higherBetter
                        ? Math.max(...numericValues)
                        : Math.min(...numericValues);
                      bestIdx = values.findIndex(v => v === best);
                    }

                    return (
                      <div
                        key={metric.key}
                        className="grid border-b border-surface-100 dark:border-surface-800"
                        style={{ gridTemplateColumns: `200px repeat(${comparisonData.length}, 1fr)` }}
                      >
                        <div className="px-4 py-2 text-xs text-surface-500 border-r border-surface-200 dark:border-surface-700 flex items-center">
                          {metric.label}
                        </div>
                        {comparisonData.map((deal, i) => {
                          const value = (deal as unknown as Record<string, unknown>)[metric.key];
                          const isBest = i === bestIdx;

                          // Special rendering for risk rating
                          if (metric.key === 'riskRating' && value) {
                            return (
                              <div key={deal.id} className="px-4 py-2 text-center border-r last:border-r-0 border-surface-100 dark:border-surface-800">
                                <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold', riskColor(value as string))}>
                                  {value as string}
                                </span>
                              </div>
                            );
                          }

                          return (
                            <div
                              key={deal.id}
                              className={cn(
                                'px-4 py-2 text-center text-sm font-medium border-r last:border-r-0 border-surface-100 dark:border-surface-800',
                                isBest
                                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/10'
                                  : 'text-surface-800 dark:text-surface-200'
                              )}
                            >
                              {metric.format(value)}
                              {isBest && <Star className="w-3 h-3 inline-block ml-1 text-emerald-500" />}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
