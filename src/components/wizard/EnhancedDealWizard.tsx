'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WizardProgress, WIZARD_STAGES } from './WizardProgress';
import { StageConfirmation } from './StageConfirmation';
import { DocumentUploadAnalysis } from './stages/DocumentUploadAnalysis';
import { FacilityIdentification } from './stages/FacilityIdentification';
import { DocumentExtraction } from './stages/DocumentExtraction';
import { COAMappingReview } from './stages/COAMappingReview';
import { FinancialConsolidation } from './stages/FinancialConsolidation';
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
      status: 'pending' | 'in_progress' | 'review_needed' | 'complete';
      extractedFields?: number;
      clarificationsCount?: number;
      clarificationsResolved?: number;
    }>;
  };
  coaMappingReview?: {
    totalItems?: number;
    mappedItems?: number;
    unmappedItems?: number;
    reviewedItems?: number;
  };
  financialConsolidation?: {
    censusVerified?: boolean;
    ppdCalculated?: boolean;
    facilityPnlGenerated?: boolean;
    portfolioRollupGenerated?: boolean;
    proformaGenerated?: boolean;
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
        financialConsolidation: data.financialConsolidation
          ? { ...prev.financialConsolidation, ...data.financialConsolidation }
          : prev.financialConsolidation,
      };
      // Trigger debounced save with new data
      debouncedSave(newData);
      return newData;
    });
  }, [debouncedSave]);

  // Navigate to next/previous stage
  const navigateStage = async (direction: 'next' | 'back') => {
    if (!session) return;

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
      if (result.success) {
        setSession(result.data);
        setLocalStageData(result.data.stageData || {});
        setShowConfirmation(false);
        setPendingStageChange(null);
      }
    } catch (err) {
      console.error('Failed to navigate stage:', err);
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

  const handleConfirm = () => {
    if (pendingStageChange) {
      navigateStage(pendingStageChange);
    }
  };

  // Get current stage index
  const currentStageIndex = session
    ? WIZARD_STAGES.findIndex(s => s.id === session.currentStage)
    : 0;
  const currentStageConfig = WIZARD_STAGES[currentStageIndex];
  const isLastStage = currentStageIndex === WIZARD_STAGES.length - 1;

  // Get confirmation message for current stage
  const getConfirmationMessage = () => {
    const stageData = localStageData;
    switch (session?.currentStage) {
      case 'document_upload':
        return 'Documents uploaded and analyzed. Proceed to review?';
      case 'review_analysis':
        return `Creating ${stageData.dealStructure?.dealStructure?.replace('_', '-') || 'purchase'} deal "${stageData.dealStructure?.dealName}" with ${stageData.dealStructure?.facilityCount || 0} facilities. Proceed to verification?`;
      case 'facility_verification':
        const facilities = stageData.facilityIdentification?.facilities || [];
        const verified = facilities.filter(f => f.isVerified).length;
        return `${verified} of ${facilities.length} facilities verified. Proceed to extraction?`;
      case 'document_extraction':
        return 'All extractions validated. Proceed to COA mapping?';
      case 'coa_mapping_review':
        const mapped = stageData.coaMappingReview?.mappedItems || 0;
        const total = stageData.coaMappingReview?.totalItems || 0;
        return `${mapped}/${total} items mapped. Generate financials?`;
      case 'financial_consolidation':
        return 'Ready to complete deal setup?';
      default:
        return 'Proceed to next step?';
    }
  };

  // Handle analysis complete - auto advance to next stage
  const handleAnalysisComplete = useCallback(() => {
    // Auto advance when analysis is confirmed
    navigateStage('next');
  }, []);

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
        return (
          <DocumentUploadAnalysis
            {...commonProps}
            sessionId={session.id}
            onAnalysisComplete={handleAnalysisComplete}
          />
        );
      case 'review_analysis':
        // Show summary of AI analysis for final review
        return (
          <ReviewAnalysisSummary
            stageData={localStageData}
            onUpdate={updateStageData}
          />
        );
      case 'facility_verification':
        return <FacilityIdentification {...commonProps} />;
      case 'document_extraction':
        return <DocumentExtraction {...commonProps} />;
      case 'coa_mapping_review':
        return <COAMappingReview {...commonProps} />;
      case 'financial_consolidation':
        return <FinancialConsolidation {...commonProps} />;
      default:
        return <div>Unknown stage</div>;
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
