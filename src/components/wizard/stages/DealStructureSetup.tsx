'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Building2, ShoppingCart, Landmark, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

const DEAL_TYPES = [
  {
    value: 'purchase',
    label: 'Direct Purchase',
    description: 'Acquire real estate and operations outright',
    icon: ShoppingCart,
  },
  {
    value: 'sale_leaseback',
    label: 'Sale-Leaseback',
    description: 'Sell real estate to investor, lease back to operate',
    icon: Landmark,
  },
  {
    value: 'acquisition_financing',
    label: 'Acquisition Financing',
    description: 'Purchase with debt/equity financing structure',
    icon: Wallet,
  },
];

const ASSET_TYPES = [
  { value: 'SNF', label: 'Skilled Nursing Facility' },
  { value: 'ALF', label: 'Assisted Living Facility' },
  { value: 'ILF', label: 'Independent Living Facility' },
];

interface DealStructureSetupProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

export function DealStructureSetup({ stageData, onUpdate }: DealStructureSetupProps) {
  const [partners, setPartners] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);

  const data = stageData.dealStructure || {};

  // Load partners for sale-leaseback deals
  useEffect(() => {
    const loadPartners = async () => {
      setLoadingPartners(true);
      try {
        const response = await fetch('/api/deals/wizard');
        const result = await response.json();
        if (result.success) {
          setPartners(result.data.saleLeasebackPartners || []);
        }
      } catch (err) {
        console.error('Failed to load partners:', err);
      } finally {
        setLoadingPartners(false);
      }
    };

    if (data.dealStructure === 'sale_leaseback') {
      loadPartners();
    }
  }, [data.dealStructure]);

  const updateField = <K extends keyof NonNullable<WizardStageData['dealStructure']>>(
    field: K,
    value: NonNullable<WizardStageData['dealStructure']>[K]
  ) => {
    onUpdate({
      dealStructure: {
        ...data,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Deal Name */}
      <div className="space-y-2">
        <Label htmlFor="dealName" className="text-base font-medium">
          Deal Name
        </Label>
        <Input
          id="dealName"
          placeholder="e.g., Sunrise SNF Portfolio Acquisition"
          value={data.dealName || ''}
          onChange={(e) => updateField('dealName', e.target.value)}
          className="max-w-xl"
        />
      </div>

      {/* Deal Type Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Transaction Type</Label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DEAL_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = data.dealStructure === type.value;
            return (
              <button
                key={type.value}
                onClick={() => updateField('dealStructure', type.value as 'purchase' | 'sale_leaseback' | 'acquisition_financing')}
                className={cn(
                  'p-4 rounded-xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-surface-200 dark:border-surface-700 hover:border-surface-300 dark:hover:border-surface-600'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center',
                      isSelected
                        ? 'bg-primary-500 text-white'
                        : 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p
                      className={cn(
                        'font-medium',
                        isSelected
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-surface-900 dark:text-surface-100'
                      )}
                    >
                      {type.label}
                    </p>
                    <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
                      {type.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Asset Type */}
      <div className="space-y-2">
        <Label className="text-base font-medium">Primary Asset Type</Label>
        <Select
          value={data.assetType || ''}
          onValueChange={(value) => updateField('assetType', value as 'SNF' | 'ALF' | 'ILF')}
        >
          <SelectTrigger className="max-w-xs">
            <SelectValue placeholder="Select asset type" />
          </SelectTrigger>
          <SelectContent>
            {ASSET_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Number of Facilities */}
      <div className="space-y-2">
        <Label htmlFor="facilityCount" className="text-base font-medium">
          Number of Facilities
        </Label>
        <div className="flex items-center gap-4">
          <Input
            id="facilityCount"
            type="number"
            min={1}
            max={50}
            value={data.facilityCount || ''}
            onChange={(e) => updateField('facilityCount', parseInt(e.target.value) || undefined)}
            className="max-w-[120px]"
          />
          <span className="text-sm text-surface-500 dark:text-surface-400">
            {data.facilityCount === 1 ? 'facility' : 'facilities'} in this deal
          </span>
        </div>
      </div>

      {/* Sale-Leaseback Partner Selection */}
      {data.dealStructure === 'sale_leaseback' && (
        <div className="space-y-2">
          <Label className="text-base font-medium">Buyer/Partner</Label>
          <Select
            value={data.buyerPartnerId || ''}
            onValueChange={(value) => updateField('buyerPartnerId', value)}
            disabled={loadingPartners}
          >
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder={loadingPartners ? 'Loading partners...' : 'Select a buyer partner'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No specific partner yet</SelectItem>
              {partners.map((partner) => (
                <SelectItem key={partner.id} value={partner.id}>
                  {partner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-surface-500 dark:text-surface-400">
            Select the REIT or investor who will purchase the real estate
          </p>
        </div>
      )}

      {/* All-or-Nothing Toggle */}
      <div className="flex items-start space-x-3">
        <Checkbox
          id="allOrNothing"
          checked={data.isAllOrNothing ?? true}
          onCheckedChange={(checked) => updateField('isAllOrNothing', !!checked)}
        />
        <div>
          <Label htmlFor="allOrNothing" className="text-base font-medium cursor-pointer">
            All-or-Nothing Deal
          </Label>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-0.5">
            All facilities must be included; cannot cherry-pick individual buildings
          </p>
        </div>
      </div>

      {/* Special Circumstances */}
      <div className="space-y-2">
        <Label htmlFor="specialCircumstances" className="text-base font-medium">
          Special Circumstances (Optional)
        </Label>
        <Textarea
          id="specialCircumstances"
          placeholder="Any unique aspects of this deal (e.g., seller motivations, existing relationships, timing requirements)..."
          value={data.specialCircumstances || ''}
          onChange={(e) => updateField('specialCircumstances', e.target.value)}
          className="max-w-xl"
          rows={3}
        />
      </div>

      {/* Summary Card */}
      {data.dealName && data.dealStructure && data.facilityCount && (
        <Card variant="glass" className="mt-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-primary-500" />
              <div>
                <p className="font-medium text-surface-900 dark:text-surface-100">
                  {data.dealName}
                </p>
                <p className="text-sm text-surface-500 dark:text-surface-400">
                  {DEAL_TYPES.find((t) => t.value === data.dealStructure)?.label} •{' '}
                  {data.facilityCount} {data.assetType || 'SNF'}{' '}
                  {data.facilityCount === 1 ? 'facility' : 'facilities'}
                  {data.isAllOrNothing && ' • All-or-Nothing'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
