'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WizardProgress, WIZARD_STAGES } from './WizardProgress';
import { StageConfirmation } from './StageConfirmation';
import { DocumentUploadAnalysis } from './stages/DocumentUploadAnalysis';
import { VisionExtractionVerification } from './stages/VisionExtractionVerification';
import { FacilityIdentification } from './stages/FacilityIdentification';
import { DocumentExtraction } from './stages/DocumentExtraction';
import { COAMappingReview } from './stages/COAMappingReview';
import { ReconciliationReview } from './stages/ReconciliationReview';
import { AnalysisValuation } from './stages/AnalysisValuation';
import { FinancialConsolidation } from './stages/FinancialConsolidation';
import type { PLFacility } from '@/components/extraction/PLVerificationTable';
import { ChevronLeft, ChevronRight, Save, AlertCircle, CheckCircle2, Building2, FileText, Edit2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Debounce helper with stable reference
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  // Keep the callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay]
  ) as T;
}

export interface WizardStageData {
  dealStructure?: {
    dealName?: string;
    dealStructure?: 'purchase' | 'sale_leaseback' | 'acquisition_financing';
    facilityCount?: number;
    specialCircumstances?: string;
    buyerPartnerId?: string;
    isAllOrNothing?: boolean;
    assetType?: 'SNF' | 'ALF' | 'ILF';
  };
  facilityIdentification?: {
    facilities?: Array<{
      slot: number;
      ccn?: string;
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      licensedBeds?: number;
      certifiedBeds?: number;
      cmsRating?: number;
      healthRating?: number;
      staffingRating?: number;
      qualityRating?: number;
      isSff?: boolean;
      isSffWatch?: boolean;
      isVerified: boolean;
      cmsData?: Record<string, unknown>;
      assetType?: 'SNF' | 'ALF' | 'ILF';
      yearBuilt?: number;
    }>;
  };
  documentOrganization?: {
    folders?: Array<{
      id: string;
      name: string;
      type: string;
      documentIds: string[];
    }>;
    documents?: Array<{
      id: string;
      filename: string;
      type?: string;
      confirmedType?: boolean;
      facilityId?: string;
    }>;
  };
  documentExtraction?: {
    documents?: Array<{
      id: string;
      filename?: string;
      status: 'pending' | 'in_progress' | 'review_needed' | 'complete';
      extractedFields?: number;
      clarificationsCount?: number;
      clarificationsResolved?: number;
      confidence?: number;
    }>;
  };
  coaMappingReview?: {
    totalItems?: number;
    mappedItems?: number;
    unmappedItems?: number;
    reviewedItems?: number;
    mappings?: Array<{
      id: string;
      sourceLabel: string;
      sourceValue: number;
      coaCode?: string;
      coaName?: string;
      category?: string;
      isMapped: boolean;
    }>;
  };
  clarificationReview?: {
    total?: number;
    resolved?: number;
    skipped?: number;
    pending?: number;
  };
  reconciliation?: {
    validated?: boolean;
    conflicts?: Array<{
      id: string;
      field: string;
      facilityName: string;
      sourceA: { document: string; value: number };
      sourceB: { document: string; value: number };
      variance: number;
      resolution?: 'auto' | 'manual' | 'pending';
      resolvedValue?: number;
    }>;
    autoResolved?: number;
    manualResolved?: number;
    pending?: number;
    validationScore?: number;
  };
  analysisResult?: {
    completed?: boolean;
    thesis?: string;
    narrative?: string;
    confidenceScore?: number;
    valuations?: Array<{
      method: string;
      label?: string;
      value: number;
      confidence: number;
      notes?: string;
    }>;
    riskAssessment?: {
      overallScore: number;
      rating: string;
      recommendation: 'pursue' | 'conditional' | 'pass';
      topRisks: string[];
      strengths: string[];
    };
    selfValidation?: {
      weakestAssumption: string;
      sellerManipulationRisk: string;
      recessionStressTest: string;
      coverageUnderStress: string;
    };
    criticalQuestions?: {
      whatMustGoRightFirst: string[];
      whatCannotGoWrong: string[];
      whatBreaksThisDeal: string[];
      whatRiskIsUnderpriced: string[];
    };
    purchaseRecommendation?: {
      recommended: number;
      low: number;
      high: number;
      perBed: number;
      method: string;
    };
    rentRecommendation?: {
      annualRent: number;
      monthlyRent: number;
      rentPerBedMonth: number;
      leaseYield: number;
      rentCoverage: number;
      sustainable: boolean;
      notes: string;
    };
    financialSummary?: {
      totalRevenue: number;
      totalExpenses: number;
      noi: number;
      noiMargin: number;
      totalBeds: number;
      facilityCount: number;
    };
  };
  financialConsolidation?: {
    censusVerified?: boolean;
    ppdCalculated?: boolean;
    facilityPnlGenerated?: boolean;
    portfolioRollupGenerated?: boolean;
    proformaGenerated?: boolean;
  };
  // Vision extraction verified facilities
  visionExtraction?: {
    facilities?: PLFacility[];
    verified?: boolean;
    extractedAt?: string;
  };
  // Extraction data from initial analysis - used for COA mapping
  extraction?: {
    facilities: Array<{
      name: string;
      entityName: string | null;
      metrics: {
        avgDailyCensus: number | null;
        occupancyRate: number | null;
        netOperatingIncome: number | null;
        ebitdaMargin: number | null;
        payorMix: {
          medicare: number | null;
          medicaid: number | null;
          private: number | null;
          other: number | null;
        };
        revenuePPD: number | null;
        expensePPD: number | null;
        laborPPD: number | null;
        ebitda: number | null;
      };
    }>;
    lineItems: Array<{
      category: string;
      subcategory: string;
      label: string;
      originalLabel: string;
      coaCode: string | null;
      coaName: string | null;
      annualized: number | null;
      percentOfRevenue: number | null;
      facility: string;
      confidence: number;
    }>;
    summary: {
      totalRevenue: number;
      totalExpenses: number;
      totalNOI: number;
      avgOccupancy: number;
      totalBeds: number;
      dataQuality: number;
      periodsExtracted: string[];
      warnings: string[];
    };
    metadata: {
      extractedAt: string;
      filesProcessed: string[];
      totalRowsProcessed: number;
      mappedItems: number;
      unmappedItems: number;
    };
  };
}

interface WizardSession {
  id: string;
  dealId: string | null;
  currentStage: string;
  stageData: WizardStageData;
  isComplete: boolean;
}

// Review Analysis Summary Component
function ReviewAnalysisSummary({
  stageData,
  onUpdate,
}: {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const dealStructure = stageData.dealStructure || {};
  const facilities = stageData.facilityIdentification?.facilities || [];
  const documents = stageData.documentOrganization?.documents || [];

  const updateDealStructure = (updates: Partial<NonNullable<WizardStageData['dealStructure']>>) => {
    onUpdate({
      dealStructure: { ...dealStructure, ...updates },
    });
  };

  return (
    <div className="space-y-6">
      {/* Deal Info */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Deal Summary</h3>
        <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
          <Edit2 className="w-4 h-4 mr-1" />
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Deal Name</Label>
              {isEditing ? (
                <Input
                  value={dealStructure.dealName || ''}
                  onChange={(e) => updateDealStructure({ dealName: e.target.value })}
                />
              ) : (
                <p className="text-xl font-semibold">{dealStructure.dealName || 'Unnamed Deal'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Transaction Type</Label>
              {isEditing ? (
                <Select
                  value={dealStructure.dealStructure || 'purchase'}
                  onValueChange={(v) => updateDealStructure({ dealStructure: v as 'purchase' | 'sale_leaseback' | 'acquisition_financing' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="purchase">Direct Purchase</SelectItem>
                    <SelectItem value="sale_leaseback">Sale-Leaseback</SelectItem>
                    <SelectItem value="acquisition_financing">Acquisition Financing</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium capitalize">{(dealStructure.dealStructure || 'purchase').replace('_', '-')}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Asset Type</Label>
              {isEditing ? (
                <Select
                  value={dealStructure.assetType || 'SNF'}
                  onValueChange={(v) => updateDealStructure({ assetType: v as 'SNF' | 'ALF' | 'ILF' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SNF">Skilled Nursing Facility</SelectItem>
                    <SelectItem value="ALF">Assisted Living Facility</SelectItem>
                    <SelectItem value="ILF">Independent Living Facility</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="font-medium">{dealStructure.assetType || 'SNF'}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Number of Facilities</Label>
              <p className="font-medium">{facilities.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Facilities */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-500" />
          Detected Facilities ({facilities.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {facilities.map((facility, index) => (
            <Card key={index} variant="flat">
              <CardContent className="py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-sm font-medium text-primary-600">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{facility.name || `Facility ${index + 1}`}</p>
                    {facility.city && facility.state && (
                      <p className="text-sm text-surface-500">{facility.city}, {facility.state}</p>
                    )}
                  </div>
                  {facility.licensedBeds && (
                    <Badge variant="secondary">{facility.licensedBeds} beds</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="space-y-3">
        <h4 className="font-medium flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-500" />
          Uploaded Documents ({documents.length})
        </h4>
        <div className="space-y-2">
          {documents.map((doc, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 rounded-lg bg-surface-100 dark:bg-surface-800"
            >
              <FileText className="w-4 h-4 text-surface-400" />
              <span className="flex-1 truncate text-sm">{doc.filename}</span>
              <Badge variant="outline" className="text-xs">
                {doc.type || 'other'}
              </Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation */}
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">
              Review complete. Click Continue to verify facilities against CMS data.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Verify P&L Summary Component - shows summary of extracted P&L data
function VerifyPLSummary({
  stageData,
  onUpdate,
}: {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
}) {
  const visionExtraction = stageData.visionExtraction;
  const facilities = visionExtraction?.facilities || [];

  // Calculate totals
  const totalRevenue = facilities.reduce((sum, f) => {
    const revenueItems = f.lineItems.filter(i => i.category === 'revenue');
    const facilityRevenue = revenueItems.reduce((s, item) => {
      const itemTotal = item.values.reduce((t, v) => t + (v.value || 0), 0);
      return s + itemTotal;
    }, 0);
    return sum + facilityRevenue;
  }, 0);

  const totalExpenses = facilities.reduce((sum, f) => {
    const expenseItems = f.lineItems.filter(i => i.category === 'expense');
    const facilityExpenses = expenseItems.reduce((s, item) => {
      const itemTotal = item.values.reduce((t, v) => t + (v.value || 0), 0);
      return s + itemTotal;
    }, 0);
    return sum + facilityExpenses;
  }, 0);

  const totalLineItems = facilities.reduce((sum, f) => sum + f.lineItems.length, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);

  if (facilities.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto text-surface-300 mb-4" />
        <p className="text-surface-500">No P&L data extracted yet.</p>
        <p className="text-sm text-surface-400 mt-2">Go back to upload and extract documents.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="flat">
          <CardContent className="py-4 text-center">
            <Building2 className="w-6 h-6 mx-auto text-primary-500 mb-2" />
            <p className="text-3xl font-bold">{facilities.length}</p>
            <p className="text-sm text-surface-500">Facilities</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-4 text-center">
            <FileText className="w-6 h-6 mx-auto text-primary-500 mb-2" />
            <p className="text-3xl font-bold">{totalLineItems}</p>
            <p className="text-sm text-surface-500">Line Items</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</p>
            <p className="text-sm text-surface-500">Total Revenue</p>
          </CardContent>
        </Card>
        <Card variant="flat">
          <CardContent className="py-4 text-center">
            <p className="text-2xl font-bold text-primary-600">{formatCurrency(totalRevenue - totalExpenses)}</p>
            <p className="text-sm text-surface-500">Est. NOI</p>
          </CardContent>
        </Card>
      </div>

      {/* Facility List */}
      <Card>
        <CardContent className="py-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-500" />
            Extracted Facilities
          </h4>
          <div className="space-y-3">
            {facilities.map((facility, idx) => {
              const revenueItems = facility.lineItems.filter(i => i.category === 'revenue');
              const expenseItems = facility.lineItems.filter(i => i.category === 'expense');
              const facilityRevenue = revenueItems.reduce((s, item) =>
                s + item.values.reduce((t, v) => t + (v.value || 0), 0), 0);
              const facilityExpenses = expenseItems.reduce((s, item) =>
                s + item.values.reduce((t, v) => t + (v.value || 0), 0), 0);

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 rounded-lg bg-surface-50 dark:bg-surface-800"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center font-medium text-primary-600">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium">{facility.name}</p>
                      <p className="text-sm text-surface-500">
                        {facility.city && `${facility.city}, `}{facility.state}
                        {facility.beds && ` • ${facility.beds} beds`}
                        {` • ${facility.lineItems.length} line items`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-emerald-600">{formatCurrency(facilityRevenue)}</p>
                    <p className="text-sm text-surface-500">
                      NOI: {formatCurrency(facilityRevenue - facilityExpenses)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Confidence & Verification */}
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-medium">
              P&L data verified. Click Continue to verify facilities against CMS database.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface EnhancedDealWizardProps {
  sessionId?: string;
  dealId?: string;
  onComplete?: (dealId: string) => void;
}

export function EnhancedDealWizard({ sessionId, dealId, onComplete }: EnhancedDealWizardProps) {
  const router = useRouter();
  const [session, setSession] = useState<WizardSession | null>(null);
  const [localStageData, setLocalStageData] = useState<WizardStageData>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingStageChange, setPendingStageChange] = useState<'next' | 'back' | null>(null);

  // Load or create wizard session
  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        setError(null);

        if (sessionId) {
          // Load existing session
          const response = await fetch(`/api/wizard/session/${sessionId}`);
          const data = await response.json();
          if (data.success) {
            setSession(data.data);
            setLocalStageData(data.data.stageData || {});
          } else {
            setError(data.error || 'Failed to load wizard session');
          }
        } else {
          // Create new session
          const response = await fetch('/api/wizard/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dealId }),
          });
          const data = await response.json();
          if (data.success) {
            setSession(data.data);
            setLocalStageData(data.data.stageData || {});
            // Update URL with session ID
            router.replace(`/app/deals/new/wizard?session=${data.data.id}`);
          } else {
            setError(data.error || 'Failed to create wizard session');
          }
        }
      } catch (err) {
        setError('Failed to initialize wizard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [sessionId, dealId, router]);

  // Track if we're in the middle of a save operation
  const isSavingRef = useRef(false);
  const pendingDataRef = useRef<WizardStageData | null>(null);

  // Save stage data to API (called by debounced function)
  const saveToApi = useCallback(async (data: WizardStageData) => {
    if (!session) return;
    if (isSavingRef.current) {
      // Store pending data to save after current save completes
      pendingDataRef.current = data;
      return;
    }

    isSavingRef.current = true;
    setSaving(true);
    try {
      const response = await fetch(`/api/wizard/session/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageData: data,
          mergeStageData: true,
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSession(result.data);
      }
    } catch (err) {
      console.error('Failed to save stage data:', err);
    } finally {
      isSavingRef.current = false;
      setSaving(false);

      // If there's pending data, save it
      if (pendingDataRef.current) {
        const pendingData = pendingDataRef.current;
        pendingDataRef.current = null;
        saveToApi(pendingData);
      }
    }
  }, [session]);

  // Debounced save (1500ms delay - longer to prevent constant saving)
  const debouncedSave = useDebounce(saveToApi, 1500);

  // Update local state immediately, then debounce API save
  const updateStageData = useCallback((data: Partial<WizardStageData>) => {
    setLocalStageData((prev) => {
      // Deep merge each section
      const newData: WizardStageData = {
        dealStructure: data.dealStructure
          ? { ...prev.dealStructure, ...data.dealStructure }
          : prev.dealStructure,
        facilityIdentification: data.facilityIdentification
          ? { ...prev.facilityIdentification, ...data.facilityIdentification }
          : prev.facilityIdentification,
        documentOrganization: data.documentOrganization
          ? { ...prev.documentOrganization, ...data.documentOrganization }
          : prev.documentOrganization,
        documentExtraction: data.documentExtraction
          ? { ...prev.documentExtraction, ...data.documentExtraction }
          : prev.documentExtraction,
        coaMappingReview: data.coaMappingReview
          ? { ...prev.coaMappingReview, ...data.coaMappingReview }
          : prev.coaMappingReview,
        clarificationReview: data.clarificationReview
          ? { ...prev.clarificationReview, ...data.clarificationReview }
          : prev.clarificationReview,
        reconciliation: data.reconciliation
          ? { ...prev.reconciliation, ...data.reconciliation }
          : prev.reconciliation,
        analysisResult: data.analysisResult
          ? { ...prev.analysisResult, ...data.analysisResult }
          : prev.analysisResult,
        financialConsolidation: data.financialConsolidation
          ? { ...prev.financialConsolidation, ...data.financialConsolidation }
          : prev.financialConsolidation,
        // Preserve extraction data from initial analysis
        extraction: (data as any).extraction
          ? (data as any).extraction
          : prev.extraction,
        // Vision extraction data
        visionExtraction: data.visionExtraction
          ? { ...prev.visionExtraction, ...data.visionExtraction }
          : prev.visionExtraction,
      };
      // Trigger debounced save with new data
      debouncedSave(newData);
      return newData;
    });
  }, [debouncedSave]);

  // Navigate to next/previous stage
  const navigateStage = async (direction: 'next' | 'back') => {
    if (!session) {
      console.error('No session available for navigation');
      return;
    }

    console.log(`[Wizard] Navigating ${direction} from stage: ${session.currentStage}`);
    setSaving(true);

    try {
      // First save the current local state
      const response = await fetch(`/api/wizard/session/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageData: localStageData,
          mergeStageData: true,
          [direction === 'next' ? 'advanceStage' : 'goBack']: true,
        }),
      });

      const result = await response.json();
      console.log('[Wizard] Navigation response:', result.success, result.data?.currentStage);

      if (result.success) {
        setSession(result.data);
        setLocalStageData(result.data.stageData || {});
      } else {
        console.error('[Wizard] Navigation failed:', result.error);
        setError(result.error || 'Failed to navigate');
      }
    } catch (err) {
      console.error('[Wizard] Navigation error:', err);
      setError('Failed to navigate to next stage');
    } finally {
      setSaving(false);
    }
  };

  // Complete wizard
  const completeWizard = async () => {
    if (!session) return;

    setSaving(true);
    try {
      // First save any pending local changes
      await fetch(`/api/wizard/session/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageData: localStageData,
          mergeStageData: true,
        }),
      });

      const response = await fetch(`/api/wizard/session/${session.id}/complete`, {
        method: 'POST',
      });
      const result = await response.json();
      if (result.success) {
        const newDealId = result.data.deal.id;
        if (onComplete) {
          onComplete(newDealId);
        } else {
          router.push(`/app/deals/${newDealId}`);
        }
      } else {
        setError(result.error || 'Failed to complete wizard');
      }
    } catch (err) {
      setError('Failed to complete wizard');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Handle stage completion and confirmation
  const handleStageComplete = (direction: 'next' | 'back') => {
    setPendingStageChange(direction);
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    if (!pendingStageChange) return;

    const direction = pendingStageChange;
    setShowConfirmation(false);
    setPendingStageChange(null);

    // Small delay to ensure dialog closes before navigation
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      await navigateStage(direction);
    } catch (err) {
      console.error('Navigation failed:', err);
      setError('Failed to navigate to next stage');
    }
  };

  // Get current stage index
  const currentStageIndex = session
    ? WIZARD_STAGES.findIndex(s => s.id === session.currentStage)
    : 0;
  const currentStageConfig = WIZARD_STAGES[currentStageIndex];
  const isLastStage = currentStageIndex === WIZARD_STAGES.length - 1;

  // Check if current stage has self-managed navigation (e.g., VisionExtractionVerification)
  // These stages handle their own Continue action via onComplete callback
  const stageHasSelfNavigation = session?.currentStage === 'document_upload';

  // Check if extraction has been completed (for document_upload stage)
  const hasCompletedExtraction = localStageData.visionExtraction?.verified === true;

  // Get confirmation message for current stage
  const getConfirmationMessage = () => {
    const stageData = localStageData;
    switch (session?.currentStage) {
      case 'document_upload':
        const extractedFacilities = stageData.visionExtraction?.facilities?.length || 0;
        const isVerified = stageData.visionExtraction?.verified === true;
        if (isVerified && extractedFacilities > 0) {
          return `${extractedFacilities} facilities extracted and verified. Proceed to verify P&L?`;
        }
        return extractedFacilities > 0
          ? `${extractedFacilities} facilities extracted. Complete verification to proceed.`
          : 'Upload documents and run AI extraction to continue.';
      case 'review_analysis':
        const totalLineItems = stageData.visionExtraction?.facilities?.reduce(
          (sum, f) => sum + f.lineItems.length, 0
        ) || 0;
        return `${totalLineItems} line items verified. Proceed to COA mapping?`;
      case 'coa_mapping_review':
        const mapped = stageData.coaMappingReview?.mappedItems || 0;
        const total = stageData.coaMappingReview?.totalItems || 0;
        return `${mapped}/${total} items mapped to chart of accounts. Proceed to reconciliation?`;
      case 'reconciliation':
        return 'Cross-document validation complete. Proceed to facility verification?';
      case 'facility_verification':
        const facilities = stageData.facilityIdentification?.facilities || [];
        const verified = facilities.filter(f => f.isVerified).length;
        return `${verified} of ${facilities.length} facilities verified. Proceed to analysis?`;
      case 'analysis':
        return 'Deal analysis complete. Proceed to generate proforma?';
      case 'financial_consolidation':
        return 'Ready to complete deal setup?';
      // Legacy stages
      case 'document_extraction':
        return 'All extractions validated. Proceed to next step?';
      default:
        return 'Proceed to next step?';
    }
  };

  // Handle analysis complete - auto advance to next stage
  const handleAnalysisComplete = useCallback(async (_analysis: unknown, newStageData: Partial<WizardStageData>) => {
    // Auto advance when analysis is confirmed
    if (!session) {
      console.error('[Wizard] No session available for handleAnalysisComplete');
      return;
    }

    console.log('[Wizard] Analysis complete, navigating to next stage');
    setSaving(true);

    // Merge the new stage data with existing local state
    const mergedStageData = {
      ...localStageData,
      ...newStageData,
      dealStructure: { ...localStageData.dealStructure, ...newStageData.dealStructure },
      facilityIdentification: { ...localStageData.facilityIdentification, ...newStageData.facilityIdentification },
      documentOrganization: { ...localStageData.documentOrganization, ...newStageData.documentOrganization },
    };

    try {
      const response = await fetch(`/api/wizard/session/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stageData: mergedStageData,
          mergeStageData: true,
          advanceStage: true,
        }),
      });

      const result = await response.json();
      console.log('[Wizard] Navigation response:', result.success, result.data?.currentStage);

      if (result.success) {
        setSession(result.data);
        setLocalStageData(result.data.stageData || {});
      } else {
        console.error('[Wizard] Navigation failed:', result.error);
        setError(result.error || 'Failed to navigate');
      }
    } catch (err) {
      console.error('[Wizard] Navigation error:', err);
      setError('Failed to navigate to next stage');
    } finally {
      setSaving(false);
    }
  }, [session, localStageData]);

  // Handle vision extraction complete
  const handleVisionExtractionComplete = useCallback((data: {
    facilities: PLFacility[];
    verified: boolean;
  }) => {
    // Save the extracted and verified facilities
    updateStageData({
      visionExtraction: {
        facilities: data.facilities,
        verified: data.verified,
        extractedAt: new Date().toISOString(),
      },
      // Also populate facilityIdentification from extracted data
      facilityIdentification: {
        facilities: data.facilities.map((f, idx) => ({
          slot: idx + 1,
          name: f.name,
          ccn: f.ccn,
          state: f.state,
          city: f.city,
          licensedBeds: f.beds,
          isVerified: false,
        })),
      },
    });

    // Auto-advance to next stage
    navigateStage('next');
  }, [updateStageData, navigateStage]);

  // Render current stage component
  const renderStage = () => {
    if (!session) return null;

    const commonProps = {
      stageData: localStageData,
      onUpdate: updateStageData,
      dealId: session.dealId || undefined,
    };

    switch (session.currentStage) {
      case 'document_upload':
        // Use VisionExtractionVerification for upload + extraction + verification
        return (
          <VisionExtractionVerification
            sessionId={session.id}
            dealId={session.dealId || undefined}
            onComplete={handleVisionExtractionComplete}
          />
        );
      case 'review_analysis':
        // Show summary of verified P&L for review before proceeding
        return (
          <VerifyPLSummary
            stageData={localStageData}
            onUpdate={updateStageData}
          />
        );
      case 'coa_mapping_review':
        return <COAMappingReview {...commonProps} />;
      case 'reconciliation':
        return <ReconciliationReview {...commonProps} />;
      case 'facility_verification':
        return <FacilityIdentification {...commonProps} />;
      case 'analysis':
        return (
          <AnalysisValuation
            {...commonProps}
            sessionId={session.id}
          />
        );
      case 'financial_consolidation':
        return <FinancialConsolidation {...commonProps} />;
      // Legacy stages - keep for backwards compatibility
      case 'document_extraction':
        return <DocumentExtraction {...commonProps} />;
      default:
        return <div>Unknown stage: {session.currentStage}</div>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="w-6 h-6" />
            <p>{error}</p>
          </div>
          <Button className="mt-4" onClick={() => router.push('/app/deals')}>
            Back to Deals
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Progress indicator */}
      <WizardProgress
        currentStage={session?.currentStage || 'document_upload'}
        completedStages={WIZARD_STAGES.slice(0, currentStageIndex).map(s => s.id)}
        className="mb-6"
      />

      {/* Stage content */}
      <Card>
        <CardHeader>
          <CardTitle>{currentStageConfig?.label}</CardTitle>
          <CardDescription>{currentStageConfig?.description}</CardDescription>
        </CardHeader>
        <CardContent>{renderStage()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => handleStageComplete('back')}
          disabled={currentStageIndex === 0 || saving}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-sm text-surface-500 flex items-center gap-2">
              <Save className="w-4 h-4 animate-pulse" />
              Saving...
            </span>
          )}
        </div>

        {isLastStage ? (
          <Button onClick={completeWizard} disabled={saving} loading={saving}>
            Complete Setup
          </Button>
        ) : stageHasSelfNavigation && !hasCompletedExtraction ? (
          // Stage handles its own navigation - hide Continue until extraction is verified
          <Button disabled variant="outline" className="opacity-50">
            Complete extraction below to continue
          </Button>
        ) : (
          <Button onClick={() => handleStageComplete('next')} disabled={saving}>
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>

      {/* Confirmation modal */}
      <StageConfirmation
        open={showConfirmation}
        onOpenChange={setShowConfirmation}
        title={pendingStageChange === 'back' ? 'Go Back?' : 'Confirm Progress'}
        message={
          pendingStageChange === 'back'
            ? 'Your progress is saved. You can come back anytime.'
            : getConfirmationMessage()
        }
        onConfirm={handleConfirm}
        confirmLabel={pendingStageChange === 'back' ? 'Go Back' : 'Continue'}
      />
    </div>
  );
}
