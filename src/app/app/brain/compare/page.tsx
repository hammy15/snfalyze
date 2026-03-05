'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  GitCompareArrows,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  Shield,
  Brain,
  Lightbulb,
  Download,
} from 'lucide-react';

interface ComparisonDeal {
  id: string;
  name: string;
  assetType: string;
  status: string;
  primaryState: string;
  askingPrice: number | null;
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
}

interface DealBasic {
  id: string;
  name: string;
  assetType: string;
  primaryState: string;
  confidenceScore: number | null;
  beds: number;
  status: string;
  analysisNarrative: string | null;
  thesis: string | null;
}

function formatM(n: number | null | undefined) {
  if (!n) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function formatPct(n: number | null | undefined) {
  if (n == null) return '—';
  return `${n.toFixed(1)}%`;
}

function getConfidenceColor(conf: number | null) {
  if (!conf) return 'text-surface-400';
  if (conf >= 75) return 'text-emerald-600';
  if (conf >= 55) return 'text-amber-600';
  return 'text-red-500';
}

function getConfidenceLabel(conf: number | null) {
  if (!conf) return '—';
  if (conf >= 75) return 'Pursue';
  if (conf >= 55) return 'Conditional';
  return 'Pass';
}

export default function ComparePage() {
  const [allDeals, setAllDeals] = useState<DealBasic[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<ComparisonDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  // Load all deals
  useEffect(() => {
    fetch('/api/deals?limit=50')
      .then((r) => r.json())
      .then((data) => {
        const deals = data.data || [];
        setAllDeals(deals);
        // Auto-select all deals if 2-4
        if (deals.length >= 2 && deals.length <= 4) {
          setSelectedIds(deals.map((d: DealBasic) => d.id));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-compare when 2+ selected
  useEffect(() => {
    if (selectedIds.length < 2) {
      setComparison([]);
      return;
    }
    setComparing(true);
    fetch(`/api/deals/compare?ids=${selectedIds.join(',')}`)
      .then((r) => r.json())
      .then((data) => {
        setComparison(data.data || []);
        setComparing(false);
      })
      .catch(() => setComparing(false));
  }, [selectedIds]);

  const toggleDeal = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 4)
    );
  };

  const selectedDeals = allDeals.filter((d) => selectedIds.includes(d.id));

  // Build comparison rows
  type MetricRow = {
    label: string;
    icon?: React.ReactNode;
    render: (d: ComparisonDeal) => React.ReactNode;
    highlightBest?: 'highest' | 'lowest';
  };

  const sections: { title: string; icon: React.ReactNode; color: string; rows: MetricRow[] }[] = [
    {
      title: 'Deal Overview',
      icon: <Building2 className="w-4 h-4" />,
      color: 'text-blue-600',
      rows: [
        { label: 'Status', render: (d) => <span className="capitalize">{d.status.replace(/_/g, ' ')}</span> },
        { label: 'State', render: (d) => d.primaryState || '—' },
        { label: 'Asset Type', render: (d) => d.assetType },
        { label: 'Facilities', render: (d) => d.facilityCount, highlightBest: 'highest' },
        { label: 'Total Beds', render: (d) => d.totalBeds?.toLocaleString() || '—', highlightBest: 'highest' },
        { label: 'Asking Price', render: (d) => formatM(d.askingPrice) },
        { label: 'Price / Bed', render: (d) => d.pricePerBed ? `$${d.pricePerBed.toLocaleString()}` : '—', highlightBest: 'lowest' },
      ],
    },
    {
      title: 'Financial Performance',
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'text-emerald-600',
      rows: [
        { label: 'TTM Revenue', render: (d) => formatM(d.ttmRevenue), highlightBest: 'highest' },
        { label: 'TTM EBITDA', render: (d) => formatM(d.ttmEbitda), highlightBest: 'highest' },
        { label: 'Normalized EBITDA', render: (d) => formatM(d.normalizedEbitda), highlightBest: 'highest' },
        { label: 'EBITDA Multiple', render: (d) => d.ebitdaMultiple ? `${d.ebitdaMultiple}x` : '—', highlightBest: 'lowest' },
        { label: 'Medicare Mix', render: (d) => formatPct(d.medicarePct) },
        { label: 'Medicaid Mix', render: (d) => formatPct(d.medicaidPct) },
        { label: 'Private Pay Mix', render: (d) => formatPct(d.privatePayPct), highlightBest: 'highest' },
      ],
    },
    {
      title: 'Quality & Operations',
      icon: <Shield className="w-4 h-4" />,
      color: 'text-purple-600',
      rows: [
        {
          label: 'CMS Rating',
          render: (d) => {
            if (!d.avgCmsRating) return '—';
            return (
              <span className="flex items-center gap-1">
                {'★'.repeat(Math.round(d.avgCmsRating))}
                <span className="text-surface-400 ml-1">({d.avgCmsRating})</span>
              </span>
            );
          },
          highlightBest: 'highest',
        },
        {
          label: 'SFF Status',
          render: (d) =>
            d.hasSffFacility ? (
              <span className="text-red-500 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> SFF
              </span>
            ) : (
              <span className="text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Clear
              </span>
            ),
        },
        { label: 'Staffing (FTE)', render: (d) => d.staffingFte?.toFixed(1) || '—', highlightBest: 'highest' },
        { label: 'Agency Staff %', render: (d) => formatPct(d.agencyPct), highlightBest: 'lowest' },
        { label: 'Case Mix Index', render: (d) => d.cmi?.toFixed(2) || '—', highlightBest: 'highest' },
      ],
    },
    {
      title: 'Risk & Pro Forma',
      icon: <Brain className="w-4 h-4" />,
      color: 'text-orange-600',
      rows: [
        {
          label: 'Risk Score',
          render: (d) => {
            if (!d.riskScore) return '—';
            const color = d.riskScore <= 30 ? 'text-emerald-600' : d.riskScore <= 60 ? 'text-amber-600' : 'text-red-500';
            return <span className={cn('font-bold', color)}>{d.riskScore}/100</span>;
          },
          highlightBest: 'lowest',
        },
        { label: 'Risk Rating', render: (d) => d.riskRating || '—' },
        { label: 'Y1 Pro Forma Revenue', render: (d) => formatM(d.proformaYear1Revenue), highlightBest: 'highest' },
        { label: 'Y1 Pro Forma EBITDA', render: (d) => formatM(d.proformaYear1Ebitda), highlightBest: 'highest' },
        {
          label: 'Workspace Progress',
          render: (d) => (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${d.workspaceCompletion}%` }}
                />
              </div>
              <span className="text-[10px] text-surface-400">{d.workspaceCompletion}%</span>
            </div>
          ),
          highlightBest: 'highest',
        },
      ],
    },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/app/brain/pipeline" className="flex items-center gap-1 text-xs text-surface-400 hover:text-primary-500 mb-2">
            <ArrowLeft className="w-3 h-3" /> Pipeline
          </Link>
          <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100 flex items-center gap-2">
            <GitCompareArrows className="w-6 h-6 text-primary-500" />
            Deal Comparison
          </h1>
          <p className="text-sm text-surface-400 mt-1">
            Side-by-side analysis — select 2-4 deals to compare
          </p>
        </div>
      </div>

      {/* Deal Selector */}
      <div className="flex flex-wrap gap-2">
        {allDeals.map((d) => {
          const selected = selectedIds.includes(d.id);
          const conf = d.confidenceScore;
          return (
            <button
              key={d.id}
              onClick={() => toggleDeal(d.id)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border',
                selected
                  ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 text-primary-700 dark:text-primary-300'
                  : 'bg-white dark:bg-surface-800 border-[#E2DFD8] dark:border-surface-700 text-surface-600 hover:border-primary-300'
              )}
            >
              <span className={cn('w-2 h-2 rounded-full', selected ? 'bg-primary-500' : 'bg-surface-300')} />
              {d.name}
              {conf != null && (
                <span className={cn('text-[10px] font-bold', getConfidenceColor(conf))}>
                  {conf}%
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Comparison Table */}
      {comparing ? (
        <div className="text-center py-12 text-surface-400 text-sm">Loading comparison...</div>
      ) : comparison.length >= 2 ? (
        <div className="space-y-6">
          {/* Brain Confidence Hero */}
          <div className={cn('grid gap-4', comparison.length === 2 ? 'grid-cols-2' : comparison.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4')}>
            {comparison.map((deal) => {
              const basic = allDeals.find((d) => d.id === deal.id);
              const conf = basic?.confidenceScore ?? null;
              const rec = getConfidenceLabel(conf);
              return (
                <div key={deal.id} className="neu-card-warm p-4 text-center">
                  <Link href={`/app/deals/${deal.id}`} className="hover:text-primary-600">
                    <div className="text-sm font-bold text-surface-800 dark:text-surface-100">{deal.name}</div>
                  </Link>
                  <div className="text-[10px] text-surface-400 mt-0.5">{deal.assetType} · {deal.primaryState}</div>
                  <button
                    onClick={() => window.open(`/api/deals/${deal.id}/export/one-pager`, '_blank')}
                    className="text-[10px] text-primary-500 hover:text-primary-600 mt-1 flex items-center gap-1 mx-auto"
                  >
                    <Download className="w-3 h-3" /> Export
                  </button>

                  {/* Brain orbs */}
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="w-5 h-5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.4)]" />
                    <div className="w-5 h-5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                  </div>

                  <div className={cn('text-2xl font-black mt-2', getConfidenceColor(conf))}>
                    {conf != null ? `${conf}%` : '—'}
                  </div>
                  <div className={cn('text-xs font-bold', getConfidenceColor(conf))}>{rec}</div>

                  {basic?.thesis && (
                    <div className="mt-3 text-[10px] text-surface-500 leading-relaxed line-clamp-3 text-left px-1">
                      <Lightbulb className="w-3 h-3 inline text-amber-500 mr-1" />
                      {basic.thesis}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Metric Sections */}
          {sections.map((section) => (
            <div key={section.title} className="neu-card-warm overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E2DFD8] dark:border-surface-700 flex items-center gap-2">
                <span className={section.color}>{section.icon}</span>
                <span className="text-sm font-bold text-surface-700 dark:text-surface-200">{section.title}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.label} className="border-b border-[#E2DFD8]/40 dark:border-surface-800/40 last:border-0">
                        <td className="py-2.5 px-4 text-surface-400 font-medium w-40">{row.label}</td>
                        {comparison.map((deal) => (
                          <td
                            key={deal.id}
                            className="py-2.5 px-4 text-surface-700 dark:text-surface-200"
                          >
                            {row.render(deal)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : selectedIds.length < 2 ? (
        <div className="text-center py-16 text-surface-400">
          <GitCompareArrows className="w-12 h-12 mx-auto mb-3 text-surface-300" />
          <p className="text-sm">Select at least 2 deals to compare</p>
        </div>
      ) : null}
    </div>
  );
}
