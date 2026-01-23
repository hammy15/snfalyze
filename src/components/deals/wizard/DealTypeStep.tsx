'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  ShoppingCart,
  Key,
  ArrowLeftRight,
  Landmark,
  Building2,
  Home,
  Users,
} from 'lucide-react';
import type { WizardData, DealStructure, AssetType } from './DealSetupWizard';

interface DealTypeStepProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}

const DEAL_STRUCTURES: {
  value: DealStructure;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'purchase',
    label: 'Direct Purchase',
    description: 'Acquire real estate and operations outright',
    icon: ShoppingCart,
  },
  {
    value: 'lease',
    label: 'Lease',
    description: 'Lease real estate from existing owner',
    icon: Key,
  },
  {
    value: 'sale_leaseback',
    label: 'Sale-Leaseback',
    description: 'Sell real estate to investor, lease back to operate',
    icon: ArrowLeftRight,
  },
  {
    value: 'acquisition_financing',
    label: 'Acquisition Financing',
    description: 'Purchase with debt/equity financing structure',
    icon: Landmark,
  },
];

const ASSET_TYPES: {
  value: AssetType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'SNF',
    label: 'Skilled Nursing',
    description: '24/7 skilled nursing care',
    icon: Building2,
  },
  {
    value: 'ALF',
    label: 'Assisted Living',
    description: 'Personal care assistance',
    icon: Home,
  },
  {
    value: 'ILF',
    label: 'Independent Living',
    description: 'Active senior living',
    icon: Users,
  },
];

export function DealTypeStep({ data, onUpdate }: DealTypeStepProps) {
  return (
    <div className="space-y-6">
      {/* Deal Name */}
      <div className="space-y-2">
        <Label htmlFor="dealName" className="text-base font-medium">
          Deal Name
        </Label>
        <Input
          id="dealName"
          value={data.dealName}
          onChange={(e) => onUpdate({ dealName: e.target.value })}
          placeholder="e.g., Avamere 3-Building Portfolio"
          className="text-lg"
        />
      </div>

      {/* Deal Structure Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Transaction Type</Label>
        <div className="grid grid-cols-2 gap-3">
          {DEAL_STRUCTURES.map((structure) => {
            const Icon = structure.icon;
            const isSelected = data.dealStructure === structure.value;

            return (
              <Card
                key={structure.value}
                hover
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'hover:border-emerald-300'
                }`}
                onClick={() => onUpdate({ dealStructure: structure.value })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-surface-900 dark:text-surface-100">
                        {structure.label}
                      </h4>
                      <p className="text-sm text-surface-500 mt-1">
                        {structure.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Asset Type Selection */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Primary Asset Type</Label>
        <div className="grid grid-cols-3 gap-3">
          {ASSET_TYPES.map((assetType) => {
            const Icon = assetType.icon;
            const isSelected = data.assetType === assetType.value;

            return (
              <Card
                key={assetType.value}
                hover
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'hover:border-emerald-300'
                }`}
                onClick={() => onUpdate({ assetType: assetType.value })}
              >
                <CardContent className="p-4 text-center">
                  <div
                    className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-surface-100 text-surface-600'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h4 className="font-semibold text-surface-900 dark:text-surface-100">
                    {assetType.label}
                  </h4>
                  <p className="text-xs text-surface-500 mt-1">{assetType.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Sale-Leaseback Specific Options */}
      {data.dealStructure === 'sale_leaseback' && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800 space-y-4">
          <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">
            Sale-Leaseback Options
          </h4>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="allOrNothing"
              checked={data.isAllOrNothing}
              onCheckedChange={(checked) =>
                onUpdate({ isAllOrNothing: checked === true })
              }
            />
            <Label
              htmlFor="allOrNothing"
              className="text-sm font-medium cursor-pointer"
            >
              All-or-nothing deal (all facilities must be included)
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="circumstances" className="text-sm font-medium">
              Special Circumstances (optional)
            </Label>
            <Textarea
              id="circumstances"
              value={data.specialCircumstances || ''}
              onChange={(e) => onUpdate({ specialCircumstances: e.target.value })}
              placeholder="Any special circumstances, conditions, or notes about this transaction..."
              rows={3}
            />
          </div>
        </div>
      )}
    </div>
  );
}
