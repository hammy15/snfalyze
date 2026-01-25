'use client';

import * as React from 'react';
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  Check,
  X,
  Edit2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';

// ============================================================================
// TYPES
// ============================================================================

export interface PLLineItem {
  id: string;
  category: 'revenue' | 'expense' | 'metric';
  subcategory: string;
  label: string;
  values: { period: string; value: number }[];
  annual?: number;
  ppd?: number;
  percentRevenue?: number;
  confidence: number;
  isEdited?: boolean;
  originalValues?: { period: string; value: number }[];
}

export interface PLFacility {
  id: string;
  name: string;
  ccn?: string;
  state?: string;
  city?: string;
  beds?: number;
  periods: string[];
  lineItems: PLLineItem[];
  census?: {
    periods: string[];
    totalDays: number[];
    avgDailyCensus: number[];
    occupancy: number[];
  };
  confidence: number;
}

interface PLVerificationTableProps {
  facilities: PLFacility[];
  onUpdate: (facilityId: string, lineItemId: string, updates: Partial<PLLineItem>) => void;
  onApprove: (facilityId: string, lineItemId: string) => void;
  onReject: (facilityId: string, lineItemId: string) => void;
  onApproveAll: (facilityId: string) => void;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(value: number | undefined, decimals: number = 0): string {
  if (value === undefined || value === null) return '-';
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(decimals)}K`;
  }
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function formatPercent(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(1)}%`;
}

function formatPPD(value: number | undefined): string {
  if (value === undefined || value === null) return '-';
  return `$${value.toFixed(2)}`;
}

function getCategoryColor(category: string): string {
  switch (category) {
    case 'revenue':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'expense':
      return 'text-rose-600 dark:text-rose-400';
    case 'metric':
      return 'text-blue-600 dark:text-blue-400';
    default:
      return 'text-gray-600 dark:text-gray-400';
  }
}

function getSubcategoryLabel(subcategory: string): string {
  const labels: Record<string, string> = {
    patient_revenue: 'Patient Revenue',
    medicare_revenue: 'Medicare',
    medicaid_revenue: 'Medicaid',
    private_revenue: 'Private Pay',
    ancillary_revenue: 'Ancillary',
    therapy_revenue: 'Therapy',
    other_revenue: 'Other Revenue',
    labor_total: 'Total Labor',
    labor_nursing: 'Nursing Labor',
    labor_agency: 'Agency/Contract',
    labor_benefits: 'Benefits',
    dietary: 'Dietary',
    housekeeping: 'Housekeeping',
    utilities: 'Utilities',
    maintenance: 'Maintenance',
    insurance: 'Insurance',
    property_tax: 'Property Tax',
    management_fee: 'Management Fee',
    rent: 'Rent',
    other_expense: 'Other Expense',
    ebitdar: 'EBITDAR',
    ebitda: 'EBITDA',
    noi: 'NOI',
    gross_margin: 'Gross Margin',
  };
  return labels[subcategory] || subcategory.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// ============================================================================
// EDITABLE CELL COMPONENT
// ============================================================================

interface EditableCellProps {
  value: number;
  onChange: (value: number) => void;
  format?: 'currency' | 'percent' | 'ppd' | 'number';
  className?: string;
}

function EditableCell({ value, onChange, format = 'currency', className }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value || 0));

  const handleSave = () => {
    const numValue = parseFloat(editValue.replace(/[$,]/g, ''));
    if (!isNaN(numValue)) {
      onChange(numValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value || 0));
      setIsEditing(false);
    }
  };

  const displayValue = useMemo(() => {
    switch (format) {
      case 'percent':
        return formatPercent(value);
      case 'ppd':
        return formatPPD(value);
      case 'number':
        return value?.toLocaleString() || '-';
      default:
        return formatNumber(value);
    }
  }, [value, format]);

  if (isEditing) {
    return (
      <Input
        type="text"
        value={editValue}
        onChange={e => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={cn('h-7 w-24 text-right text-sm', className)}
        autoFocus
      />
    );
  }

  return (
    <button
      onClick={() => {
        setEditValue(String(value || 0));
        setIsEditing(true);
      }}
      className={cn(
        'cursor-text px-2 py-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors text-right w-full',
        className
      )}
    >
      {displayValue}
    </button>
  );
}

// ============================================================================
// LINE ITEM ROW COMPONENT
// ============================================================================

interface LineItemRowProps {
  item: PLLineItem;
  periods: string[];
  totalRevenue?: number;
  totalDays?: number;
  onValueChange: (periodIndex: number, value: number) => void;
  onApprove: () => void;
  onReject: () => void;
}

function LineItemRow({ item, periods, totalRevenue, totalDays, onValueChange, onApprove, onReject }: LineItemRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate totals and metrics
  const total = item.values.reduce((sum, v) => sum + (v.value || 0), 0);
  const annual = item.annual || total * (12 / Math.max(periods.length, 1));
  const ppd = totalDays && totalDays > 0 ? annual / totalDays : item.ppd;
  const percentRev = totalRevenue && totalRevenue > 0 && item.category !== 'revenue'
    ? (annual / totalRevenue) * 100
    : item.percentRevenue;

  // Determine if values changed from original
  const hasChanges = item.isEdited || false;

  // Confidence indicator
  const ConfidenceIndicator = () => {
    if (item.confidence >= 0.9) {
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    } else if (item.confidence >= 0.7) {
      return <AlertCircle className="w-4 h-4 text-amber-500" />;
    }
    return <AlertCircle className="w-4 h-4 text-rose-500" />;
  };

  return (
    <tr className={cn(
      'group hover:bg-surface-50 dark:hover:bg-surface-900/50 transition-colors',
      hasChanges && 'bg-amber-50 dark:bg-amber-900/20',
      item.category === 'metric' && 'font-semibold border-t-2 border-surface-200 dark:border-surface-700'
    )}>
      {/* Expand / Category indicator */}
      <td className="px-2 py-2 w-8">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-800"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-surface-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-surface-400" />
          )}
        </button>
      </td>

      {/* Label */}
      <td className="px-3 py-2 min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className={cn('text-sm', getCategoryColor(item.category))}>
            {item.label}
          </span>
          {hasChanges && (
            <Badge variant="outline" className="text-xs">edited</Badge>
          )}
        </div>
        <span className="text-xs text-surface-500">
          {getSubcategoryLabel(item.subcategory)}
        </span>
      </td>

      {/* Monthly values */}
      {periods.map((period, idx) => {
        const valueObj = item.values.find(v => v.period === period);
        const value = valueObj?.value || 0;

        return (
          <td key={period} className="px-2 py-2 text-right">
            <EditableCell
              value={value}
              onChange={(newValue) => onValueChange(idx, newValue)}
              className={cn(
                'text-sm',
                item.category === 'revenue' && 'text-emerald-600 dark:text-emerald-400',
                item.category === 'expense' && value < 0 && 'text-rose-600 dark:text-rose-400'
              )}
            />
          </td>
        );
      })}

      {/* Annual */}
      <td className="px-3 py-2 text-right bg-surface-50 dark:bg-surface-900/50">
        <span className={cn(
          'text-sm font-medium',
          item.category === 'revenue' && 'text-emerald-600 dark:text-emerald-400',
          item.category === 'metric' && item.label.toLowerCase().includes('ebitda') && annual > 0 && 'text-emerald-600'
        )}>
          {formatNumber(annual)}
        </span>
      </td>

      {/* PPD */}
      <td className="px-3 py-2 text-right">
        <span className="text-sm text-surface-600 dark:text-surface-300">
          {formatPPD(ppd)}
        </span>
      </td>

      {/* % Rev */}
      <td className="px-3 py-2 text-right">
        <span className="text-sm text-surface-600 dark:text-surface-300">
          {item.category === 'revenue' ? '-' : formatPercent(percentRev)}
        </span>
      </td>

      {/* Confidence */}
      <td className="px-2 py-2">
        <Tooltip content={`AI Confidence: ${(item.confidence * 100).toFixed(0)}%`}>
          <ConfidenceIndicator />
        </Tooltip>
      </td>

      {/* Actions */}
      <td className="px-2 py-2">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onApprove}
            className="p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600"
            title="Approve"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={onReject}
            className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600"
            title="Reject"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PLVerificationTable({
  facilities,
  onUpdate,
  onApprove,
  onReject,
  onApproveAll,
  className,
}: PLVerificationTableProps) {
  const [activeFacilityId, setActiveFacilityId] = useState(facilities[0]?.id || '');
  const [filterCategory, setFilterCategory] = useState<'all' | 'revenue' | 'expense' | 'metric'>('all');
  const [showOnlyLowConfidence, setShowOnlyLowConfidence] = useState(false);

  const activeFacility = facilities.find(f => f.id === activeFacilityId);

  // Calculate totals for the active facility
  const totals = useMemo(() => {
    if (!activeFacility) return { revenue: 0, expenses: 0, days: 0 };

    const revenueItems = activeFacility.lineItems.filter(i => i.category === 'revenue');
    const expenseItems = activeFacility.lineItems.filter(i => i.category === 'expense');

    const totalRevenue = revenueItems.reduce((sum, item) => {
      const itemTotal = item.values.reduce((s, v) => s + (v.value || 0), 0);
      return sum + itemTotal;
    }, 0);

    const totalExpenses = expenseItems.reduce((sum, item) => {
      const itemTotal = item.values.reduce((s, v) => s + (v.value || 0), 0);
      return sum + itemTotal;
    }, 0);

    const totalDays = activeFacility.census?.totalDays.reduce((s, d) => s + d, 0) || 0;

    return {
      revenue: totalRevenue * (12 / Math.max(activeFacility.periods.length, 1)),
      expenses: totalExpenses * (12 / Math.max(activeFacility.periods.length, 1)),
      days: totalDays * (12 / Math.max(activeFacility.periods.length, 1)),
    };
  }, [activeFacility]);

  // Filter line items
  const filteredItems = useMemo(() => {
    if (!activeFacility) return [];

    let items = activeFacility.lineItems;

    if (filterCategory !== 'all') {
      items = items.filter(i => i.category === filterCategory);
    }

    if (showOnlyLowConfidence) {
      items = items.filter(i => i.confidence < 0.8);
    }

    // Sort: revenue first, then expenses, then metrics
    return items.sort((a, b) => {
      const categoryOrder = { revenue: 0, expense: 1, metric: 2 };
      return (categoryOrder[a.category] || 3) - (categoryOrder[b.category] || 3);
    });
  }, [activeFacility, filterCategory, showOnlyLowConfidence]);

  // Handle value changes
  const handleValueChange = useCallback((lineItemId: string, periodIndex: number, newValue: number) => {
    if (!activeFacility) return;

    const item = activeFacility.lineItems.find(i => i.id === lineItemId);
    if (!item) return;

    const period = activeFacility.periods[periodIndex];
    const updatedValues = [...item.values];
    const valueIdx = updatedValues.findIndex(v => v.period === period);

    if (valueIdx >= 0) {
      updatedValues[valueIdx] = { ...updatedValues[valueIdx], value: newValue };
    } else {
      updatedValues.push({ period, value: newValue });
    }

    onUpdate(activeFacilityId, lineItemId, {
      values: updatedValues,
      isEdited: true,
      originalValues: item.originalValues || item.values,
    });
  }, [activeFacility, activeFacilityId, onUpdate]);

  if (facilities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-surface-500">
        <AlertCircle className="w-12 h-12 mb-4" />
        <p className="text-lg">No facilities to verify</p>
        <p className="text-sm">Upload documents to extract financial data</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Facility Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-200 dark:border-surface-700">
        {facilities.map(facility => (
          <button
            key={facility.id}
            onClick={() => setActiveFacilityId(facility.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
              activeFacilityId === facility.id
                ? 'border-accent text-accent'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            )}
          >
            <Building2 className="w-4 h-4" />
            <span>{facility.name}</span>
            {facility.confidence < 0.8 && (
              <AlertCircle className="w-4 h-4 text-amber-500" />
            )}
          </button>
        ))}
      </div>

      {/* Facility Header */}
      {activeFacility && (
        <div className="flex items-center justify-between bg-surface-50 dark:bg-surface-900 rounded-lg p-4">
          <div className="flex items-center gap-6">
            <div>
              <h3 className="font-semibold text-lg">{activeFacility.name}</h3>
              <p className="text-sm text-surface-500">
                {activeFacility.city && `${activeFacility.city}, `}
                {activeFacility.state}
                {activeFacility.ccn && ` | CCN: ${activeFacility.ccn}`}
                {activeFacility.beds && ` | ${activeFacility.beds} beds`}
              </p>
            </div>

            {/* Summary metrics */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-emerald-600">
                <span className="font-medium">Revenue:</span> {formatNumber(totals.revenue)}
              </div>
              <div className="text-rose-600">
                <span className="font-medium">Expenses:</span> {formatNumber(totals.expenses)}
              </div>
              <div className={cn(
                totals.revenue - totals.expenses > 0 ? 'text-emerald-600' : 'text-rose-600'
              )}>
                <span className="font-medium">NOI:</span> {formatNumber(totals.revenue - totals.expenses)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOnlyLowConfidence(!showOnlyLowConfidence)}
              className={cn(showOnlyLowConfidence && 'bg-amber-100 border-amber-300')}
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              Review Uncertain
            </Button>
            <Button
              size="sm"
              onClick={() => onApproveAll(activeFacilityId)}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              Approve All
            </Button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-surface-500">Show:</span>
        {(['all', 'revenue', 'expense', 'metric'] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              'px-3 py-1 text-sm rounded-full transition-colors',
              filterCategory === cat
                ? 'bg-accent text-white'
                : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700'
            )}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>

      {/* Main Table */}
      <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-surface-100 dark:bg-surface-800">
              <tr>
                <th className="w-8"></th>
                <th className="px-3 py-3 text-left text-sm font-medium text-surface-700 dark:text-surface-200">
                  Line Item
                </th>
                {activeFacility?.periods.map(period => (
                  <th key={period} className="px-2 py-3 text-right text-sm font-medium text-surface-700 dark:text-surface-200 min-w-[100px]">
                    {period}
                  </th>
                ))}
                <th className="px-3 py-3 text-right text-sm font-medium text-surface-700 dark:text-surface-200 bg-surface-150 dark:bg-surface-750 min-w-[100px]">
                  Annual
                </th>
                <th className="px-3 py-3 text-right text-sm font-medium text-surface-700 dark:text-surface-200 min-w-[80px]">
                  PPD
                </th>
                <th className="px-3 py-3 text-right text-sm font-medium text-surface-700 dark:text-surface-200 min-w-[80px]">
                  % Rev
                </th>
                <th className="w-8"></th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
              {filteredItems.map(item => (
                <LineItemRow
                  key={item.id}
                  item={item}
                  periods={activeFacility?.periods || []}
                  totalRevenue={totals.revenue}
                  totalDays={totals.days}
                  onValueChange={(periodIdx, value) => handleValueChange(item.id, periodIdx, value)}
                  onApprove={() => onApprove(activeFacilityId, item.id)}
                  onReject={() => onReject(activeFacilityId, item.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Footer */}
      {activeFacility && (
        <div className="flex items-center justify-between text-sm text-surface-500">
          <div>
            Showing {filteredItems.length} of {activeFacility.lineItems.length} line items
            {showOnlyLowConfidence && ` | Filtering low confidence items`}
          </div>
          <div className="flex items-center gap-4">
            <span>
              <CheckCircle className="w-4 h-4 inline text-emerald-500 mr-1" />
              High confidence (90%+)
            </span>
            <span>
              <AlertCircle className="w-4 h-4 inline text-amber-500 mr-1" />
              Medium confidence (70-90%)
            </span>
            <span>
              <AlertCircle className="w-4 h-4 inline text-rose-500 mr-1" />
              Low confidence (&lt;70%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PLVerificationTable;
