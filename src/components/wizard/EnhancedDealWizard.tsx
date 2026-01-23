'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WizardProgress, WIZARD_STAGES } from './WizardProgress';
import { StageConfirmation } from './StageConfirmation';
import { DealStructureSetup } from './stages/DealStructureSetup';
import { FacilityIdentification } from './stages/FacilityIdentification';
import { DocumentOrganization } from './stages/DocumentOrganization';
import { DocumentExtraction } from './stages/DocumentExtraction';
import { COAMappingReview } from './stages/COAMappingReview';
import { FinancialConsolidation } from './stages/FinancialConsolidation';
import { ChevronLeft, ChevronRight, Save, AlertCircle } from 'lucide-react';

// Debounce helper
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
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

  // Save stage data to API (called by debounced function)
  const saveToApi = useCallback(async (data: WizardStageData) => {
    if (!session) return;

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
      setSaving(false);
    }
  }, [session]);

  // Debounced save (500ms delay)
  const debouncedSave = useDebounce(saveToApi, 500);

  // Update local state immediately, then debounce API save
  const updateStageData = useCallback((data: Partial<WizardStageData>) => {
    setLocalStageData((prev) => {
      const newData = { ...prev };
      // Deep merge the data
      for (const key of Object.keys(data) as Array<keyof WizardStageData>) {
        if (data[key] !== undefined) {
          newData[key] = { ...prev[key], ...data[key] } as typeof newData[typeof key];
        }
      }
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
      case 'deal_structure_setup':
        return `Creating ${stageData.dealStructure?.dealStructure?.replace('_', '-') || 'purchase'} deal "${stageData.dealStructure?.dealName}" with ${stageData.dealStructure?.facilityCount || 0} facilities. Proceed?`;
      case 'facility_identification':
        const facilities = stageData.facilityIdentification?.facilities || [];
        const verified = facilities.filter(f => f.isVerified).length;
        return `All ${verified} facilities verified. Proceed to document organization?`;
      case 'document_organization':
        const docs = stageData.documentOrganization?.documents || [];
        return `${docs.length} documents organized. Start extraction?`;
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

  // Render current stage component
  const renderStage = () => {
    if (!session) return null;

    const commonProps = {
      stageData: localStageData,
      onUpdate: updateStageData,
      dealId: session.dealId || undefined,
    };

    switch (session.currentStage) {
      case 'deal_structure_setup':
        return <DealStructureSetup {...commonProps} />;
      case 'facility_identification':
        return <FacilityIdentification {...commonProps} />;
      case 'document_organization':
        return <DocumentOrganization {...commonProps} />;
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
        currentStage={session?.currentStage || 'deal_structure_setup'}
        completedStages={WIZARD_STAGES.slice(0, currentStageIndex).map(s => s.id)}
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
