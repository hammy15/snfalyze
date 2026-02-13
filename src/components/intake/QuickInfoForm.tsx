'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Building2, Plus, X, ArrowRight } from 'lucide-react';

interface QuickFacility {
  name: string;
  state: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  licensedBeds: string;
  ccn: string;
}

interface QuickInfoFormProps {
  onSubmit: (data: {
    dealName: string;
    assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
    facilities: QuickFacility[];
  }) => void;
  onCancel: () => void;
}

const ASSET_TYPES = [
  { value: 'SNF' as const, label: 'Skilled Nursing' },
  { value: 'ALF' as const, label: 'Assisted Living' },
  { value: 'ILF' as const, label: 'Independent Living' },
  { value: 'HOSPICE' as const, label: 'Hospice' },
];

const emptyFacility: QuickFacility = {
  name: '',
  state: '',
  assetType: 'SNF',
  licensedBeds: '',
  ccn: '',
};

export function QuickInfoForm({ onSubmit, onCancel }: QuickInfoFormProps) {
  const [dealName, setDealName] = useState('');
  const [assetType, setAssetType] = useState<'SNF' | 'ALF' | 'ILF' | 'HOSPICE'>('SNF');
  const [facilities, setFacilities] = useState<QuickFacility[]>([{ ...emptyFacility }]);

  const updateFacility = (index: number, field: keyof QuickFacility, value: string) => {
    const next = [...facilities];
    next[index] = { ...next[index], [field]: value };
    setFacilities(next);
  };

  const addFacility = () => {
    setFacilities([...facilities, { ...emptyFacility, assetType }]);
  };

  const removeFacility = (index: number) => {
    if (facilities.length > 1) {
      setFacilities(facilities.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = () => {
    const name = dealName.trim() || facilities[0]?.name || 'New Deal';
    onSubmit({
      dealName: name,
      assetType,
      facilities: facilities.filter((f) => f.name.trim()),
    });
  };

  const isValid = facilities.some((f) => f.name.trim().length > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="neu-card p-6 space-y-6">
        <div className="text-center mb-2">
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">
            Quick Start
          </h2>
          <p className="text-sm text-surface-500 mt-1">
            Add basic info — you can upload documents later
          </p>
        </div>

        {/* Deal Name */}
        <div>
          <label className="text-xs text-surface-500 uppercase tracking-wider mb-1 block">
            Deal Name (optional)
          </label>
          <input
            type="text"
            value={dealName}
            onChange={(e) => setDealName(e.target.value)}
            placeholder="e.g. Pacific Northwest Portfolio"
            className="w-full px-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-50 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Asset Type */}
        <div>
          <label className="text-xs text-surface-500 uppercase tracking-wider mb-2 block">
            Primary Asset Type
          </label>
          <div className="flex gap-2">
            {ASSET_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setAssetType(t.value)}
                className={cn(
                  'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                  assetType === t.value
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:bg-surface-200'
                )}
              >
                {t.value}
              </button>
            ))}
          </div>
        </div>

        {/* Facilities */}
        <div>
          <label className="text-xs text-surface-500 uppercase tracking-wider mb-2 block">
            Facilities
          </label>
          <div className="space-y-3">
            {facilities.map((facility, index) => (
              <div key={index} className="p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-surface-400" />
                  <span className="text-xs font-semibold text-surface-500">Facility {index + 1}</span>
                  {facilities.length > 1 && (
                    <button
                      onClick={() => removeFacility(index)}
                      className="ml-auto text-surface-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={facility.name}
                  onChange={(e) => updateFacility(index, 'name', e.target.value)}
                  placeholder="Facility name"
                  className="w-full px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm"
                />

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={facility.state}
                    onChange={(e) => updateFacility(index, 'state', e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="State"
                    maxLength={2}
                    className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-center"
                  />
                  <input
                    type="text"
                    value={facility.licensedBeds}
                    onChange={(e) => updateFacility(index, 'licensedBeds', e.target.value.replace(/\D/g, ''))}
                    placeholder="Beds"
                    className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-center"
                  />
                  <input
                    type="text"
                    value={facility.ccn}
                    onChange={(e) => updateFacility(index, 'ccn', e.target.value)}
                    placeholder="CCN"
                    className="px-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-800 text-sm text-center font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addFacility}
            className="mt-2 w-full py-2.5 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl text-sm font-medium text-surface-500 hover:text-primary-500 hover:border-primary-400 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Add Facility
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onCancel}>
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid}>
          Create Deal
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
