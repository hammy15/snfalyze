'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LineItemDiff {
  label: string;
  rawValue: number | null;
  proformaValue: number | null;
  changePercent: number | null;
  changeType: 'increase' | 'decrease' | 'unchanged' | 'added' | 'removed';
}

interface FacilityComparison {
  facilityName: string;
  propertyType?: string;
  beds?: number;
  raw: {
    revenue: number | null;
    expenses: number | null;
    ebitdar: number | null;
    occupancy: number | null;
    lineItems?: LineItemDiff[];
  };
  proforma: {
    revenue: number | null;
    expenses: number | null;
    ebitdar: number | null;
    occupancy: number | null;
  };
  adjustments: LineItemDiff[];
  detectedPreferences: Record<string, number | undefined>;
}

interface DealComparisonTableProps {
  facilities: FacilityComparison[];
  className?: string;
}

function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function DeltaIndicator({ change, changePercent }: { change: string; changePercent: number | null }) {
  if (changePercent == null || Math.abs(changePercent) < 0.001) {
    return <Minus className="w-3 h-3 text-surface-300" />;
  }
  const isPositive = changePercent > 0;
  return (
    <div className={cn(
      'flex items-center gap-0.5 text-xs font-medium',
      isPositive ? 'text-emerald-600' : 'text-red-500'
    )}>
      {isPositive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
      <span>{Math.abs(changePercent * 100).toFixed(1)}%</span>
    </div>
  );
}

function FacilitySection({ facility }: { facility: FacilityComparison }) {
  const [expanded, setExpanded] = useState(false);
  const [showLineItems, setShowLineItems] = useState(false);

  const revDelta = facility.raw.revenue && facility.proforma.revenue
    ? (facility.proforma.revenue - facility.raw.revenue) / Math.abs(facility.raw.revenue)
    : null;
  const expDelta = facility.raw.expenses && facility.proforma.expenses
    ? (facility.proforma.expenses - facility.raw.expenses) / Math.abs(facility.raw.expenses)
    : null;
  const ebitdarDelta = facility.raw.ebitdar && facility.proforma.ebitdar
    ? (facility.proforma.ebitdar - facility.raw.ebitdar) / Math.abs(facility.raw.ebitdar)
    : null;

  return (
    <div className="border border-[#E2DFD8] rounded-lg overflow-hidden">
      {/* Facility Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface-50 hover:bg-surface-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-surface-400" /> : <ChevronRight className="w-4 h-4 text-surface-400" />}
          <div className="text-left">
            <span className="text-sm font-semibold text-surface-800">{facility.facilityName}</span>
            {facility.propertyType && (
              <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-surface-200 text-surface-500">
                {facility.propertyType}
              </span>
            )}
          </div>
        </div>
        {facility.beds && (
          <span className="text-xs text-surface-500">{facility.beds} beds</span>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 py-3 space-y-3">
          {/* Summary Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-surface-400 uppercase tracking-wider">
                <th className="text-left py-1 font-medium">Metric</th>
                <th className="text-right py-1 font-medium">Raw</th>
                <th className="text-right py-1 font-medium">Proforma</th>
                <th className="text-right py-1 font-medium">Delta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              <tr>
                <td className="py-2 text-surface-600">Revenue</td>
                <td className="py-2 text-right tabular-nums text-surface-700">{formatCurrency(facility.raw.revenue)}</td>
                <td className="py-2 text-right tabular-nums font-medium text-surface-800">{formatCurrency(facility.proforma.revenue)}</td>
                <td className="py-2 text-right"><DeltaIndicator change="revenue" changePercent={revDelta} /></td>
              </tr>
              <tr>
                <td className="py-2 text-surface-600">Expenses</td>
                <td className="py-2 text-right tabular-nums text-surface-700">{formatCurrency(facility.raw.expenses)}</td>
                <td className="py-2 text-right tabular-nums font-medium text-surface-800">{formatCurrency(facility.proforma.expenses)}</td>
                <td className="py-2 text-right"><DeltaIndicator change="expenses" changePercent={expDelta} /></td>
              </tr>
              <tr className="font-medium">
                <td className="py-2 text-surface-700">EBITDAR</td>
                <td className="py-2 text-right tabular-nums text-surface-700">{formatCurrency(facility.raw.ebitdar)}</td>
                <td className="py-2 text-right tabular-nums text-primary-600">{formatCurrency(facility.proforma.ebitdar)}</td>
                <td className="py-2 text-right"><DeltaIndicator change="ebitdar" changePercent={ebitdarDelta} /></td>
              </tr>
              <tr>
                <td className="py-2 text-surface-600">Occupancy</td>
                <td className="py-2 text-right tabular-nums text-surface-700">{formatPercent(facility.raw.occupancy)}</td>
                <td className="py-2 text-right tabular-nums font-medium text-surface-800">{formatPercent(facility.proforma.occupancy)}</td>
                <td className="py-2 text-right">
                  {facility.raw.occupancy && facility.proforma.occupancy && (
                    <DeltaIndicator
                      change="occupancy"
                      changePercent={facility.proforma.occupancy - facility.raw.occupancy}
                    />
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Detected Preferences */}
          {Object.keys(facility.detectedPreferences).length > 0 && (
            <div className="bg-primary-50/50 rounded-lg p-3">
              <h5 className="text-xs font-semibold text-primary-700 mb-2 uppercase tracking-wider">
                Detected Normalization
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(facility.detectedPreferences).map(([key, value]) => (
                  value != null && (
                    <div key={key} className="text-xs">
                      <span className="text-surface-500">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                      <span className="font-semibold text-primary-600">{formatPercent(value)}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          )}

          {/* Line Item Details */}
          {facility.adjustments.length > 0 && (
            <div>
              <button
                onClick={() => setShowLineItems(!showLineItems)}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                {showLineItems ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                {facility.adjustments.length} line item adjustments
              </button>
              {showLineItems && (
                <div className="mt-2 space-y-1">
                  {facility.adjustments.map((adj, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-surface-50">
                      <span className="text-surface-600 truncate max-w-[40%]">{adj.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="tabular-nums text-surface-500">{formatCurrency(adj.rawValue)}</span>
                        <span className="text-surface-300">&rarr;</span>
                        <span className="tabular-nums text-surface-700">{formatCurrency(adj.proformaValue)}</span>
                        <span className={cn(
                          'w-16 text-right font-medium',
                          adj.changeType === 'increase' ? 'text-emerald-600' :
                          adj.changeType === 'decrease' ? 'text-red-500' : 'text-surface-400'
                        )}>
                          {adj.changePercent != null ? `${adj.changePercent > 0 ? '+' : ''}${(adj.changePercent * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function DealComparisonTable({ facilities, className }: DealComparisonTableProps) {
  if (facilities.length === 0) {
    return (
      <div className={cn('text-center py-8 text-surface-400 text-sm', className)}>
        No comparison data available yet
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {facilities.map((facility, i) => (
        <FacilitySection key={i} facility={facility} />
      ))}
    </div>
  );
}
