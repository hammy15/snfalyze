'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  type Deal,
  type AssetType,
  type DealSource,
  type DealHypothesis,
  DEAL_HYPOTHESES,
  generateDealId,
} from '@/lib/deals/types';
import {
  Building2,
  Calendar,
  DollarSign,
  FileText,
  Users,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
} from 'lucide-react';

interface CreateDealModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateDeal: (deal: Partial<Deal>) => void;
}

type WizardStep = 'basics' | 'asset' | 'source' | 'hypothesis' | 'review';

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: 'basics', label: 'Basics', icon: <FileText className="h-4 w-4" /> },
  { id: 'asset', label: 'Asset Info', icon: <Building2 className="h-4 w-4" /> },
  { id: 'source', label: 'Source', icon: <Users className="h-4 w-4" /> },
  { id: 'hypothesis', label: 'Hypothesis', icon: <AlertCircle className="h-4 w-4" /> },
  { id: 'review', label: 'Review', icon: <Check className="h-4 w-4" /> },
];

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function CreateDealModal({ open, onOpenChange, onCreateDeal }: CreateDealModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('basics');
  const [formData, setFormData] = useState<Partial<Deal>>({
    deal_id: generateDealId(),
    name: '',
    asset_types: [],
    is_portfolio: false,
    facility_count: 1,
    total_beds: undefined,
    states: [],
    source: 'broker',
    source_name: '',
    received_date: new Date(),
    response_deadline: undefined,
    initial_hypothesis: 'stabilized',
    hypothesis_notes: '',
    asking_price: undefined,
    assigned_to: [],
  });

  const updateFormData = (updates: Partial<Deal>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    if (currentStepIndex < STEPS.length - 1) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const goBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleSubmit = () => {
    onCreateDeal({
      ...formData,
      status: 'active',
      current_stage: 'document_understanding',
      created_at: new Date(),
      updated_at: new Date(),
    });
    onOpenChange(false);
    // Reset form
    setFormData({
      deal_id: generateDealId(),
      name: '',
      asset_types: [],
      is_portfolio: false,
      facility_count: 1,
      states: [],
      source: 'broker',
      received_date: new Date(),
      initial_hypothesis: 'stabilized',
    });
    setCurrentStep('basics');
  };

  const toggleAssetType = (type: AssetType) => {
    const current = formData.asset_types || [];
    if (current.includes(type)) {
      updateFormData({ asset_types: current.filter((t) => t !== type) });
    } else {
      updateFormData({ asset_types: [...current, type] });
    }
  };

  const toggleState = (state: string) => {
    const current = formData.states || [];
    if (current.includes(state)) {
      updateFormData({ states: current.filter((s) => s !== state) });
    } else {
      updateFormData({ states: [...current, state] });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basics':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="deal_id">Deal ID</Label>
              <Input
                id="deal_id"
                value={formData.deal_id}
                onChange={(e) => updateFormData({ deal_id: e.target.value })}
                placeholder="CAS-2024-XXXX"
              />
              <p className="text-xs text-muted-foreground">Auto-generated, but can be customized</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Deal Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
                placeholder="e.g., Sunrise SNF Portfolio - Oregon"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asking_price">Asking Price</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="asking_price"
                  type="number"
                  className="pl-9"
                  value={formData.asking_price || ''}
                  onChange={(e) => updateFormData({ asking_price: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        );

      case 'asset':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Types *</Label>
              <div className="flex gap-2">
                {(['snf', 'alf', 'ilf'] as AssetType[]).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={formData.asset_types?.includes(type) ? 'default' : 'outline'}
                    onClick={() => toggleAssetType(type)}
                    className="flex-1"
                  >
                    {type.toUpperCase()}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                SNF = Skilled Nursing, ALF = Assisted Living, ILF = Independent Living
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_portfolio"
                checked={formData.is_portfolio}
                onCheckedChange={(checked) => updateFormData({ is_portfolio: !!checked })}
              />
              <Label htmlFor="is_portfolio">This is a portfolio deal (multiple facilities)</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="facility_count">Number of Facilities</Label>
                <Input
                  id="facility_count"
                  type="number"
                  min="1"
                  value={formData.facility_count}
                  onChange={(e) => updateFormData({ facility_count: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_beds">Total Beds</Label>
                <Input
                  id="total_beds"
                  type="number"
                  min="1"
                  value={formData.total_beds || ''}
                  onChange={(e) => updateFormData({ total_beds: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>States</Label>
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto p-2 border rounded-md">
                {US_STATES.map((state) => (
                  <Badge
                    key={state}
                    variant={formData.states?.includes(state) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleState(state)}
                  >
                    {state}
                  </Badge>
                ))}
              </div>
              {(formData.states?.length || 0) > 0 && (
                <p className="text-xs text-muted-foreground">
                  Selected: {formData.states?.join(', ')}
                </p>
              )}
            </div>
          </div>
        );

      case 'source':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="source">Deal Source *</Label>
              <Select
                value={formData.source}
                onValueChange={(value) => updateFormData({ source: value as DealSource })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="broker">Broker</SelectItem>
                  <SelectItem value="seller_direct">Seller Direct</SelectItem>
                  <SelectItem value="off_market">Off-Market</SelectItem>
                  <SelectItem value="auction">Auction</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="source_name">Source Name</Label>
              <Input
                id="source_name"
                value={formData.source_name || ''}
                onChange={(e) => updateFormData({ source_name: e.target.value })}
                placeholder="e.g., Marcus & Millichap, Direct from Seller"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="received_date">Received Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="received_date"
                    type="date"
                    className="pl-9"
                    value={formData.received_date instanceof Date
                      ? formData.received_date.toISOString().split('T')[0]
                      : ''}
                    onChange={(e) => updateFormData({ received_date: new Date(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="response_deadline">Response Deadline</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="response_deadline"
                    type="date"
                    className="pl-9"
                    value={formData.response_deadline instanceof Date
                      ? formData.response_deadline.toISOString().split('T')[0]
                      : ''}
                    onChange={(e) => updateFormData({
                      response_deadline: e.target.value ? new Date(e.target.value) : undefined
                    })}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'hypothesis':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Initial Working Hypothesis *</Label>
              <p className="text-sm text-muted-foreground">
                What type of deal do you believe this is? This can be updated as analysis progresses.
              </p>
            </div>

            <div className="space-y-2">
              {(Object.keys(DEAL_HYPOTHESES) as DealHypothesis[]).map((key) => {
                const hypothesis = DEAL_HYPOTHESES[key];
                const isSelected = formData.initial_hypothesis === key;
                return (
                  <div
                    key={key}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => updateFormData({ initial_hypothesis: key })}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{hypothesis.label}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {hypothesis.description}
                        </p>
                        {hypothesis.typical_characteristics.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {hypothesis.typical_characteristics.slice(0, 3).map((char, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {char}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {isSelected && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label htmlFor="hypothesis_notes">Initial Notes</Label>
              <Textarea
                id="hypothesis_notes"
                value={formData.hypothesis_notes || ''}
                onChange={(e) => updateFormData({ hypothesis_notes: e.target.value })}
                placeholder="Why do you believe this is the right hypothesis? What made you think this initially?"
                rows={3}
              />
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-3">
              <h4 className="font-medium">Deal Summary</h4>

              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="text-muted-foreground">Deal ID:</div>
                <div className="font-medium">{formData.deal_id}</div>

                <div className="text-muted-foreground">Name:</div>
                <div className="font-medium">{formData.name || '—'}</div>

                <div className="text-muted-foreground">Asset Types:</div>
                <div className="font-medium">
                  {formData.asset_types?.map(t => t.toUpperCase()).join(', ') || '—'}
                </div>

                <div className="text-muted-foreground">Portfolio:</div>
                <div className="font-medium">
                  {formData.is_portfolio
                    ? `Yes (${formData.facility_count} facilities)`
                    : 'No (Single facility)'}
                </div>

                <div className="text-muted-foreground">Total Beds:</div>
                <div className="font-medium">{formData.total_beds || '—'}</div>

                <div className="text-muted-foreground">States:</div>
                <div className="font-medium">{formData.states?.join(', ') || '—'}</div>

                <div className="text-muted-foreground">Source:</div>
                <div className="font-medium">
                  {formData.source_name
                    ? `${formData.source_name} (${formData.source})`
                    : formData.source}
                </div>

                <div className="text-muted-foreground">Asking Price:</div>
                <div className="font-medium">
                  {formData.asking_price
                    ? `$${formData.asking_price.toLocaleString()}`
                    : '—'}
                </div>

                <div className="text-muted-foreground">Hypothesis:</div>
                <div className="font-medium">
                  {formData.initial_hypothesis
                    ? DEAL_HYPOTHESES[formData.initial_hypothesis].label
                    : '—'}
                </div>
              </div>

              {formData.hypothesis_notes && (
                <div className="pt-2 border-t">
                  <div className="text-sm text-muted-foreground mb-1">Initial Notes:</div>
                  <p className="text-sm">{formData.hypothesis_notes}</p>
                </div>
              )}
            </div>

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <h4 className="font-medium text-blue-900">Next Steps</h4>
              <p className="text-sm text-blue-800 mt-1">
                After creating this deal, you'll start at the <strong>Document Understanding</strong> stage.
                Upload deal documents and begin your analysis.
              </p>
            </div>
          </div>
        );
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 'basics':
        return formData.name && formData.name.length > 0;
      case 'asset':
        return formData.asset_types && formData.asset_types.length > 0;
      case 'source':
        return formData.source;
      case 'hypothesis':
        return formData.initial_hypothesis;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Deal</DialogTitle>
          <DialogDescription>
            Set up a new deal container to begin analysis
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  index < currentStepIndex
                    ? 'bg-primary border-primary text-primary-foreground'
                    : index === currentStepIndex
                    ? 'border-primary text-primary'
                    : 'border-muted text-muted-foreground'
                }`}
              >
                {index < currentStepIndex ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.icon
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 h-0.5 mx-1 ${
                    index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="text-center mb-4">
          <h3 className="font-medium">{STEPS[currentStepIndex].label}</h3>
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">{renderStepContent()}</div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          {currentStep === 'review' ? (
            <Button onClick={handleSubmit} disabled={!isStepValid()}>
              Create Deal
              <Check className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={goNext} disabled={!isStepValid()}>
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
