'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  ArrowRight,
  FileText,
  Building2,
  Sparkles,
  DollarSign,
  TrendingUp,
  Users,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface COAMapping {
  id: string;
  sourceLabel: string;
  sourceValue: number;
  sourceMonth?: string;
  documentName?: string;
  facilityName?: string;
  coaCode?: string;
  coaName?: string;
  category?: 'revenue' | 'expense' | 'census' | 'statistic' | 'other' | 'skipped';
  mappingConfidence?: number;
  isMapped: boolean;
  proformaDestination?: string;
}

// Standard COA categories for SNF
const COA_CATEGORIES = [
  { code: '4100', name: 'Medicare Revenue', category: 'Revenue', proforma: 'revenue.medicare' },
  { code: '4200', name: 'Medicaid Revenue', category: 'Revenue', proforma: 'revenue.medicaid' },
  { code: '4300', name: 'Managed Care Revenue', category: 'Revenue', proforma: 'revenue.managed_care' },
  { code: '4400', name: 'Private Pay Revenue', category: 'Revenue', proforma: 'revenue.private_pay' },
  { code: '4500', name: 'Other Revenue', category: 'Revenue', proforma: 'revenue.other' },
  { code: '4999', name: 'Total Revenue', category: 'Revenue', proforma: 'revenue.total' },
  { code: '5100', name: 'Nursing Salaries', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5110', name: 'RN Salaries', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5120', name: 'LPN Salaries', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5130', name: 'CNA Wages', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5200', name: 'Dietary Staff', category: 'Labor', proforma: 'expenses.labor.dietary' },
  { code: '5300', name: 'Housekeeping Staff', category: 'Labor', proforma: 'expenses.labor.housekeeping' },
  { code: '5400', name: 'Administrative Staff', category: 'Labor', proforma: 'expenses.labor.admin' },
  { code: '5500', name: 'Contract/Agency Labor', category: 'Labor', proforma: 'expenses.labor.agency' },
  { code: '5950', name: 'Employee Benefits', category: 'Labor', proforma: 'expenses.labor.benefits' },
  { code: '6100', name: 'Food Costs', category: 'Operations', proforma: 'expenses.operations.food' },
  { code: '6200', name: 'Medical Supplies', category: 'Operations', proforma: 'expenses.operations.supplies' },
  { code: '6300', name: 'Utilities', category: 'Operations', proforma: 'expenses.operations.utilities' },
  { code: '6400', name: 'Insurance', category: 'Operations', proforma: 'expenses.operations.insurance' },
  { code: '6500', name: 'Management Fee', category: 'Operations', proforma: 'expenses.operations.management' },
  { code: '6600', name: 'Professional Fees', category: 'Operations', proforma: 'expenses.operations.professional' },
  { code: '6700', name: 'Repairs & Maintenance', category: 'Operations', proforma: 'expenses.operations.maintenance' },
  { code: '6800', name: 'Other Operating', category: 'Operations', proforma: 'expenses.operations.other' },
  { code: '6999', name: 'Total Expenses', category: 'Operations', proforma: 'expenses.total' },
  { code: 'C100', name: 'Medicare Days', category: 'Census', proforma: 'census.medicareDays' },
  { code: 'C200', name: 'Medicaid Days', category: 'Census', proforma: 'census.medicaidDays' },
  { code: 'C300', name: 'Private Days', category: 'Census', proforma: 'census.privateDays' },
  { code: 'C500', name: 'Total Patient Days', category: 'Census', proforma: 'census.totalDays' },
  { code: 'C600', name: 'Average Daily Census', category: 'Census', proforma: 'census.avgDailyCensus' },
];

// Quick category buttons for unmapped items
const QUICK_CATEGORIES = [
  { id: 'revenue', label: 'Revenue', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200' },
  { id: 'expense', label: 'Expense', icon: DollarSign, color: 'text-rose-600 bg-rose-50 dark:bg-rose-900/30 border-rose-200' },
  { id: 'census', label: 'Census', icon: Users, color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 border-blue-200' },
  { id: 'skipped', label: 'Skip', icon: SkipForward, color: 'text-surface-500 bg-surface-50 dark:bg-surface-800 border-surface-200' },
];

interface COAMappingReviewProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

export function COAMappingReview({ stageData, onUpdate, dealId }: COAMappingReviewProps) {
  const [mappings, setMappings] = useState<COAMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [showGuidedFlow, setShowGuidedFlow] = useState(false);
  const initRef = useRef(false);

  // Initialize mappings from extraction data in stageData
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const loadMappings = async () => {
      // First try to get from vision extraction data (new pipeline)
      const visionData = stageData.visionExtraction;
      if (visionData?.facilities && visionData.facilities.length > 0) {
        const allLineItems = visionData.facilities.flatMap((facility: any) =>
          (facility.lineItems || []).map((item: any) => ({ ...item, facilityName: facility.name }))
        );
        if (allLineItems.length > 0) {
          console.log('[COAMappingReview] Found vision extraction with', allLineItems.length, 'line items');
          const items: COAMapping[] = allLineItems.map((item: any, idx: number) => {
            const label = (item.label || '').toLowerCase();
            const totalValue = item.values?.reduce((sum: number, v: any) => sum + (v.value || 0), 0) || 0;

            // Auto-map using fuzzy matching against COA_CATEGORIES
            let bestMatch: typeof COA_CATEGORIES[number] | null = null;
            let bestScore = 0;
            for (const coa of COA_CATEGORIES) {
              const coaName = coa.name.toLowerCase();
              const words = coaName.split(/\s+/);
              let score = 0;
              for (const w of words) {
                if (w.length > 2 && label.includes(w)) score += 1;
              }
              if (label.includes(coaName)) score += 5;
              if (score > bestScore) { bestScore = score; bestMatch = coa; }
            }

            let category: COAMapping['category'] = item.category === 'revenue' ? 'revenue'
              : item.category === 'expense' ? 'expense'
              : item.category === 'census' ? 'census'
              : item.category === 'metric' ? 'statistic'
              : 'other';

            const isMapped = bestScore >= 2 && bestMatch !== null;
            return {
              id: `v-${idx}`,
              sourceLabel: item.label || 'Unknown',
              sourceValue: totalValue,
              facilityName: item.facilityName,
              coaCode: isMapped ? bestMatch!.code : undefined,
              coaName: isMapped ? bestMatch!.name : undefined,
              category,
              mappingConfidence: isMapped ? Math.min(0.95, 0.6 + bestScore * 0.1) : 0.3,
              isMapped,
              proformaDestination: isMapped ? bestMatch!.proforma : undefined,
            };
          });
          console.log('[COAMappingReview] Created', items.length, 'mappings,', items.filter(i => i.isMapped).length, 'auto-mapped');
          setMappings(items);
          setLoading(false);
          return;
        }
      }

      // Fallback: try to get from old extraction data format
      const extraction = (stageData as any).extraction;

      if (extraction && extraction.lineItems && extraction.lineItems.length > 0) {
        console.log('[COAMappingReview] Found extraction data with', extraction.lineItems.length, 'line items');

        // Convert line items to COA mappings
        const items: COAMapping[] = extraction.lineItems.map((item: any, idx: number) => {
          const hasValidCoaCode = item.coaCode &&
            item.coaCode !== 'EXP_UNMAPPED' &&
            item.coaCode !== 'REV_OTHER' &&
            item.coaCode !== 'STAT_OTHER';

          // Determine category based on coaCode prefix or item category
          let category: COAMapping['category'] = item.category || 'other';
          if (item.coaCode) {
            if (item.coaCode.startsWith('4') || item.coaCode.startsWith('REV')) category = 'revenue';
            else if (item.coaCode.startsWith('5') || item.coaCode.startsWith('6') || item.coaCode.startsWith('EXP')) category = 'expense';
            else if (item.coaCode.startsWith('C') || item.coaCode.startsWith('STAT')) category = 'census';
          }

          return {
            id: `item-${idx}`,
            sourceLabel: item.originalLabel || item.label || 'Unknown',
            sourceValue: item.annualized || 0,
            sourceMonth: extraction.summary?.periodsExtracted?.[extraction.summary.periodsExtracted.length - 1],
            facilityName: item.facility,
            coaCode: item.coaCode,
            coaName: item.coaName || (hasValidCoaCode ? COA_CATEGORIES.find(c => c.code === item.coaCode)?.name : undefined),
            category,
            mappingConfidence: item.confidence || 0.8,
            isMapped: hasValidCoaCode,
            proformaDestination: item.proformaKey || COA_CATEGORIES.find(c => c.code === item.coaCode)?.proforma,
          };
        });

        console.log('[COAMappingReview] Created', items.length, 'mappings,', items.filter(i => i.isMapped).length, 'already mapped');
        setMappings(items);
        setLoading(false);
        return;
      }

      // Fallback: try to load from coaMappingReview if previously saved
      if (stageData.coaMappingReview?.mappings && stageData.coaMappingReview.mappings.length > 0) {
        console.log('[COAMappingReview] Loading from saved mappings');
        setMappings(stageData.coaMappingReview.mappings as COAMapping[]);
        setLoading(false);
        return;
      }

      // Fallback: try to load from API if dealId exists
      if (dealId) {
        try {
          console.log('[COAMappingReview] Trying to load from API');
          const response = await fetch(`/api/deals/${dealId}/coa-mappings`);
          const data = await response.json();

          if (data.success && data.data.mappings?.length > 0) {
            setMappings(data.data.mappings);
          }
        } catch (err) {
          console.error('Failed to load mappings:', err);
        }
      }

      setLoading(false);
    };

    loadMappings();
  }, []);

  // Sync summary to parent (debounced)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      const totalItems = mappings.length;
      const mappedCount = mappings.filter((m) => m.isMapped).length;
      const reviewedItems = mappings.filter((m) => m.coaCode).length;

      onUpdate({
        coaMappingReview: {
          totalItems,
          mappedItems: mappedCount,
          unmappedItems: totalItems - mappedCount,
          reviewedItems,
          mappings: mappings, // Store the full mapping data
        },
      });
    }, 500);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [mappings]);

  // Apply mapping to an item
  const applyMapping = async (mappingId: string, coaCode: string) => {
    const coaItem = COA_CATEGORIES.find((c) => c.code === coaCode);
    if (!coaItem) return;

    // Optimistic update
    setMappings((prev) =>
      prev.map((m) =>
        m.id === mappingId
          ? {
              ...m,
              coaCode,
              coaName: coaItem.name,
              proformaDestination: coaItem.proforma,
              isMapped: true,
              mappingConfidence: 1.0,
            }
          : m
      )
    );

    // Save to API if dealId exists
    if (dealId) {
      try {
        await fetch(`/api/deals/${dealId}/coa-mappings/${mappingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coaCode,
            coaName: coaItem.name,
            proformaDestination: coaItem.proforma,
          }),
        });
      } catch (err) {
        console.error('Failed to save mapping:', err);
      }
    }
  };

  // Quick categorize an item
  const quickCategorize = (mappingId: string, category: 'revenue' | 'expense' | 'census' | 'skipped') => {
    let coaCode = '';
    let coaName = '';
    let proforma = '';

    switch (category) {
      case 'revenue':
        coaCode = '4500';
        coaName = 'Other Revenue';
        proforma = 'revenue.other';
        break;
      case 'expense':
        coaCode = '6800';
        coaName = 'Other Operating';
        proforma = 'expenses.operations.other';
        break;
      case 'census':
        coaCode = 'C600';
        coaName = 'Census Data';
        proforma = 'census.other';
        break;
      case 'skipped':
        coaCode = 'SKIP';
        coaName = 'Skipped';
        proforma = '';
        break;
    }

    setMappings((prev) => {
      const newMappings = prev.map((m) =>
        m.id === mappingId
          ? {
              ...m,
              coaCode,
              coaName,
              proformaDestination: proforma,
              category,
              isMapped: true,
              mappingConfidence: 1.0,
            }
          : m
      );

      // Check if this was the last unmapped item
      const remainingUnmapped = newMappings.filter(m => !m.isMapped).length;
      if (remainingUnmapped === 0) {
        // Use setTimeout to exit guided flow after state update
        setTimeout(() => setShowGuidedFlow(false), 0);
      }

      return newMappings;
    });

    // Don't call skipItem() - the mapped item will drop out of unmappedItems
    // and currentItemIndex will naturally point to the next item
  };

  // Auto-map all unmapped items to their best category
  const autoMapAll = () => {
    setMappings((prev) =>
      prev.map((m) => {
        if (m.isMapped) return m;

        // Determine category based on source label
        const label = m.sourceLabel.toLowerCase();
        let coaCode = '6800';
        let coaName = 'Other Operating';
        let proforma = 'expenses.operations.other';
        let category: COAMapping['category'] = 'expense';

        if (label.includes('revenue') || label.includes('income') || label.includes('reimburse')) {
          coaCode = '4500';
          coaName = 'Other Revenue';
          proforma = 'revenue.other';
          category = 'revenue';
        } else if (label.includes('census') || label.includes('day') || label.includes('occupancy') || label.includes('bed')) {
          coaCode = 'C600';
          coaName = 'Census Data';
          proforma = 'census.other';
          category = 'census';
        }

        return {
          ...m,
          coaCode,
          coaName,
          proformaDestination: proforma,
          category,
          isMapped: true,
          mappingConfidence: 0.7,
        };
      })
    );
  };

  // Skip an item (move to next in guided flow)
  const skipItem = () => {
    const currentUnmappedList = mappings.filter((m) => !m.isMapped);
    if (currentItemIndex < currentUnmappedList.length - 1) {
      setCurrentItemIndex(prev => prev + 1);
    } else {
      setShowGuidedFlow(false);
    }
  };

  // Apply and move to next (item drops out of unmappedItems automatically)
  const applyAndNext = async (mappingId: string, coaCode: string) => {
    const coaItem = COA_CATEGORIES.find((c) => c.code === coaCode);
    if (!coaItem) return;

    setMappings((prev) => {
      const newMappings = prev.map((m) =>
        m.id === mappingId
          ? {
              ...m,
              coaCode,
              coaName: coaItem.name,
              proformaDestination: coaItem.proforma,
              isMapped: true,
              mappingConfidence: 1.0,
            }
          : m
      );

      // Check if this was the last unmapped item
      const remainingUnmapped = newMappings.filter(m => !m.isMapped).length;
      if (remainingUnmapped === 0) {
        setTimeout(() => setShowGuidedFlow(false), 0);
      }

      return newMappings;
    });

    // Save to API if dealId exists
    if (dealId) {
      try {
        await fetch(`/api/deals/${dealId}/coa-mappings/${mappingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            coaCode,
            coaName: coaItem.name,
            proformaDestination: coaItem.proforma,
          }),
        });
      } catch (err) {
        console.error('Failed to save mapping:', err);
      }
    }
  };

  // Filter COA options based on search
  const filteredCOA = searchTerm
    ? COA_CATEGORIES.filter(
        (c) =>
          c.code.includes(searchTerm) ||
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : COA_CATEGORIES;

  // Get unmapped items
  const unmappedItems = mappings.filter((m) => !m.isMapped);
  const mappedItems = mappings.filter((m) => m.isMapped);

  // Ensure currentItemIndex is valid
  const validIndex = Math.min(currentItemIndex, Math.max(0, unmappedItems.length - 1));
  const currentUnmapped = unmappedItems[validIndex];

  // Reset index if it's out of bounds
  useEffect(() => {
    if (currentItemIndex >= unmappedItems.length && unmappedItems.length > 0) {
      setCurrentItemIndex(unmappedItems.length - 1);
    } else if (unmappedItems.length === 0 && showGuidedFlow) {
      setShowGuidedFlow(false);
    }
  }, [unmappedItems.length, currentItemIndex, showGuidedFlow]);

  // Calculate progress
  const progress = mappings.length > 0 ? (mappedItems.length / mappings.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (mappings.length === 0) {
    const extraction = (stageData as any).extraction;
    const hasExtraction = extraction && extraction.lineItems;

    return (
      <Card variant="flat" className="text-center py-12">
        <CardContent>
          <FileText className="w-12 h-12 mx-auto text-surface-300 mb-4" />
          <p className="text-surface-500 mb-2">
            {hasExtraction
              ? `Extraction found but no line items available (${extraction.lineItems?.length || 0} items).`
              : 'No line items to map. Complete document extraction first.'}
          </p>
          {!hasExtraction && (
            <p className="text-xs text-surface-400">
              Upload and analyze documents in the first step to extract financial data.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-surface-900 dark:text-surface-100">
              {mappings.length}
            </p>
            <p className="text-xs text-surface-500">Total Items</p>
          </CardContent>
        </Card>
        <Card variant="flat" className="border-l-4 border-l-primary-500">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-primary-600">{mappedItems.length}</p>
            <p className="text-xs text-surface-500">Mapped</p>
          </CardContent>
        </Card>
        <Card variant="flat" className="border-l-4 border-l-rose-500">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold text-rose-600">{unmappedItems.length}</p>
            <p className="text-xs text-surface-500">Unmapped</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-3 text-center">
            <p className="text-2xl font-bold">{Math.round(progress)}%</p>
            <p className="text-xs text-surface-500">Complete</p>
          </CardContent>
        </Card>
      </div>

      {/* Guided flow or list view */}
      {unmappedItems.length > 0 && !showGuidedFlow && (
        <div className="flex gap-3">
          <Button onClick={() => setShowGuidedFlow(true)} className="flex-1">
            <Sparkles className="w-4 h-4 mr-2" />
            Start Guided Mapping ({unmappedItems.length} items)
          </Button>
          <Button variant="outline" onClick={autoMapAll}>
            Auto-Map All
          </Button>
        </div>
      )}

      {showGuidedFlow && currentUnmapped && (
        <Card className="border-2 border-rose-200 dark:border-rose-900">
          <CardHeader className="bg-rose-50 dark:bg-rose-900/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Unmapped Line Item
              </CardTitle>
              <Badge variant="outline">
                {validIndex + 1} of {unmappedItems.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Source info */}
            <div className="p-4 bg-surface-100 dark:bg-surface-800 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-surface-500">Source Label</Label>
                <span className="font-mono font-medium">{currentUnmapped.sourceLabel}</span>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-surface-500">Value</Label>
                <span className="font-mono">
                  ${currentUnmapped.sourceValue?.toLocaleString() || 'N/A'}
                </span>
              </div>
              {currentUnmapped.sourceMonth && (
                <div className="flex items-center justify-between">
                  <Label className="text-xs text-surface-500">Period</Label>
                  <span className="text-sm">{currentUnmapped.sourceMonth}</span>
                </div>
              )}
              <div className="flex items-center gap-4 text-xs text-surface-500 pt-2">
                {currentUnmapped.documentName && (
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {currentUnmapped.documentName}
                  </span>
                )}
                {currentUnmapped.facilityName && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {currentUnmapped.facilityName}
                  </span>
                )}
              </div>
            </div>

            {/* AI Suggestion */}
            {currentUnmapped.mappingConfidence && currentUnmapped.mappingConfidence > 0.5 && (
              <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <p className="text-sm text-primary-700 dark:text-primary-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Suggestion: <strong>{currentUnmapped.coaName}</strong>{' '}
                  ({Math.round((currentUnmapped.mappingConfidence || 0) * 100)}% confidence)
                </p>
              </div>
            )}

            {/* Quick categorize buttons */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Quick Categorize</Label>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => quickCategorize(currentUnmapped.id, cat.id as any)}
                      className={cn(
                        'p-3 rounded-lg border flex flex-col items-center gap-1 transition-all hover:scale-105',
                        cat.color
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COA selector */}
            <div className="space-y-2">
              <Label>Or select specific COA Account</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <Input
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {filteredCOA.map((coa) => (
                  <button
                    key={coa.code}
                    onClick={() => applyAndNext(currentUnmapped.id, coa.code)}
                    className="w-full px-3 py-2 text-left hover:bg-surface-100 dark:hover:bg-surface-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-sm text-primary-600">{coa.code}</span>
                      <span className="mx-2">-</span>
                      <span>{coa.name}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {coa.category}
                    </Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Proforma destination preview */}
            {searchTerm && filteredCOA.length > 0 && (
              <div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm">
                <p className="text-surface-500">This will appear in Proforma under:</p>
                <p className="font-medium mt-1 flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-primary-500" />
                  {filteredCOA[0]?.proforma?.split('.').join(' > ')}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={skipItem} className="flex-1">
                Skip
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowGuidedFlow(false)}
                className="flex-1"
              >
                Exit Guided Mode
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unmapped items */}
        {unmappedItems.length > 0 && !showGuidedFlow && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-4 h-4" />
                Unmapped Items ({unmappedItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {unmappedItems.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-rose-50 dark:bg-rose-900/20 rounded-lg text-sm flex items-center justify-between"
                  >
                    <span className="truncate">{item.sourceLabel}</span>
                    <span className="font-mono text-xs">
                      ${item.sourceValue?.toLocaleString()}
                    </span>
                  </div>
                ))}
                {unmappedItems.length > 10 && (
                  <p className="text-xs text-surface-500 text-center py-2">
                    +{unmappedItems.length - 10} more items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Mapped items */}
        {mappedItems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-primary-600">
                <CheckCircle2 className="w-4 h-4" />
                Mapped Items ({mappedItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {mappedItems.slice(0, 10).map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-sm flex items-center justify-between"
                  >
                    <div className="truncate">
                      <span>{item.sourceLabel}</span>
                      <ChevronRight className="w-3 h-3 inline mx-1 text-surface-400" />
                      <span className="font-mono text-primary-600">{item.coaCode}</span>
                    </div>
                    <span className="font-mono text-xs">
                      ${item.sourceValue?.toLocaleString()}
                    </span>
                  </div>
                ))}
                {mappedItems.length > 10 && (
                  <p className="text-xs text-surface-500 text-center py-2">
                    +{mappedItems.length - 10} more items
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* All mapped message */}
      {unmappedItems.length === 0 && mappings.length > 0 && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                All {mappings.length} items mapped! Ready for financial consolidation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
