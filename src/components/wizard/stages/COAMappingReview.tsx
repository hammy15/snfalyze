'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CheckCircle2,
  AlertCircle,
  Search,
  ChevronRight,
  ArrowRight,
  FileText,
  Building2,
  Sparkles,
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
  { code: '5100', name: 'Nursing Salaries', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5110', name: 'RN Salaries', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5120', name: 'LPN Salaries', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5130', name: 'CNA Wages', category: 'Labor', proforma: 'expenses.labor.nursing' },
  { code: '5200', name: 'Dietary Staff', category: 'Labor', proforma: 'expenses.labor.dietary' },
  { code: '5300', name: 'Housekeeping Staff', category: 'Labor', proforma: 'expenses.labor.housekeeping' },
  { code: '5400', name: 'Administrative Staff', category: 'Labor', proforma: 'expenses.labor.admin' },
  { code: '5500', name: 'Contract/Agency Labor', category: 'Labor', proforma: 'expenses.labor.agency' },
  { code: '6100', name: 'Food Costs', category: 'Operations', proforma: 'expenses.operations.food' },
  { code: '6200', name: 'Medical Supplies', category: 'Operations', proforma: 'expenses.operations.supplies' },
  { code: '6300', name: 'Utilities', category: 'Operations', proforma: 'expenses.operations.utilities' },
  { code: '6400', name: 'Insurance', category: 'Operations', proforma: 'expenses.operations.insurance' },
  { code: '6500', name: 'Management Fee', category: 'Operations', proforma: 'expenses.operations.management' },
  { code: '6600', name: 'Other Operating', category: 'Operations', proforma: 'expenses.operations.other' },
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

  // Load mappings from API
  useEffect(() => {
    const loadMappings = async () => {
      if (!dealId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/deals/${dealId}/coa-mappings`);
        const data = await response.json();

        if (data.success) {
          setMappings(data.data.mappings || []);
        }
      } catch (err) {
        console.error('Failed to load mappings:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMappings();
  }, [dealId]);

  // Sync summary to parent
  useEffect(() => {
    const totalItems = mappings.length;
    const mappedItems = mappings.filter((m) => m.isMapped).length;
    const reviewedItems = mappings.filter((m) => m.coaCode).length;

    onUpdate({
      coaMappingReview: {
        totalItems,
        mappedItems,
        unmappedItems: totalItems - mappedItems,
        reviewedItems,
      },
    });
  }, [mappings, onUpdate]);

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

    // Save to API
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

  // Skip an item (move to next in guided flow)
  const skipItem = () => {
    const unmappedItems = mappings.filter((m) => !m.isMapped);
    if (currentItemIndex < unmappedItems.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      setShowGuidedFlow(false);
    }
  };

  // Apply and move to next
  const applyAndNext = async (mappingId: string, coaCode: string) => {
    await applyMapping(mappingId, coaCode);
    skipItem();
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
  const currentUnmapped = unmappedItems[currentItemIndex];

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
    return (
      <Card variant="flat" className="text-center py-12">
        <CardContent>
          <FileText className="w-12 h-12 mx-auto text-surface-300 mb-4" />
          <p className="text-surface-500">
            No line items to map. Complete document extraction first.
          </p>
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
        <Button onClick={() => setShowGuidedFlow(true)} className="w-full">
          <Sparkles className="w-4 h-4 mr-2" />
          Start Guided Mapping ({unmappedItems.length} items)
        </Button>
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
                {currentItemIndex + 1} of {unmappedItems.length}
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

            {/* COA selector */}
            <div className="space-y-2">
              <Label>Select COA Account</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <Input
                  placeholder="Search by code or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg divide-y">
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
