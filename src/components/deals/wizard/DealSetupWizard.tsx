'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DealTypeStep } from './DealTypeStep';
import { FacilityInputStep } from './FacilityInputStep';
import { PartnerSelectionStep } from './PartnerSelectionStep';
import {
  ChevronLeft,
  ChevronRight,
  Building2,
  FileText,
  Users,
  CheckCircle,
  Loader2,
} from 'lucide-react';

export type DealStructure = 'purchase' | 'lease' | 'sale_leaseback' | 'acquisition_financing';
export type AssetType = 'SNF' | 'ALF' | 'ILF';

export interface FacilityInput {
  name: string;
  ccn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assetType: AssetType;
  licensedBeds?: number;
  certifiedBeds?: number;
  yearBuilt?: number;
}

export interface WizardData {
  dealName: string;
  dealStructure: DealStructure;
  assetType: AssetType;
  isAllOrNothing: boolean;
  buyerPartnerId?: string;
  specialCircumstances?: string;
  facilities: FacilityInput[];
}

interface Partner {
  id: string;
  name: string;
  type: string;
  minimumCoverageRatio?: number;
  targetYield?: number;
  leaseTermPreference?: string;
  rentEscalation?: number;
  minDealSize?: number;
  maxDealSize?: number;
}

const STEPS = [
  { id: 'deal-type', title: 'Deal Type', icon: FileText },
  { id: 'facilities', title: 'Facilities', icon: Building2 },
  { id: 'partner', title: 'Partner', icon: Users },
];

export function DealSetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [wizardData, setWizardData] = useState<WizardData>({
    dealName: '',
    dealStructure: 'sale_leaseback',
    assetType: 'SNF',
    isAllOrNothing: true,
    facilities: [],
  });

  const [partners, setPartners] = useState<Partner[]>([]);

  const updateWizardData = useCallback((updates: Partial<WizardData>) => {
    setWizardData((prev) => ({ ...prev, ...updates }));
  }, []);

  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0:
        return wizardData.dealName.length > 0 && wizardData.dealStructure !== undefined;
      case 1:
        return wizardData.facilities.length > 0;
      case 2:
        // Partner is optional for non-sale-leaseback deals
        return true;
      default:
        return true;
    }
  }, [currentStep, wizardData]);

  const handleNext = useCallback(async () => {
    if (currentStep < STEPS.length - 1) {
      // If moving to partner step and it's sale-leaseback, fetch partners
      if (currentStep === 1 && wizardData.dealStructure === 'sale_leaseback') {
        try {
          const response = await fetch('/api/deals/wizard');
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data.saleLeasebackPartners) {
              setPartners(data.data.saleLeasebackPartners);
            }
          }
        } catch (err) {
          console.error('Failed to fetch partners:', err);
        }
      }
      setCurrentStep((prev) => prev + 1);
    } else {
      // Submit the wizard
      await handleSubmit();
    }
  }, [currentStep, wizardData.dealStructure]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/deals/wizard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wizardData),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create deal');
      }

      // Navigate to the new deal
      router.push(`/app/deals/${data.data.deal.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <DealTypeStep data={wizardData} onUpdate={updateWizardData} />;
      case 1:
        return <FacilityInputStep data={wizardData} onUpdate={updateWizardData} />;
      case 2:
        return (
          <PartnerSelectionStep
            data={wizardData}
            partners={partners}
            onUpdate={updateWizardData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-emerald-600" />
            Create New Deal
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Step Indicator */}
          <div className="flex items-center justify-between mb-8">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-600 text-white'
                        : isCompleted
                          ? 'border-emerald-600 bg-emerald-100 text-emerald-600'
                          : 'border-surface-300 bg-surface-50 text-surface-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      isActive ? 'text-emerald-600' : 'text-surface-500'
                    }`}
                  >
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-4 ${
                        isCompleted ? 'bg-emerald-600' : 'bg-surface-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">{renderStepContent()}</div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-surface-200">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || isSubmitting}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : currentStep === STEPS.length - 1 ? (
                <>
                  Create Deal
                  <CheckCircle className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
