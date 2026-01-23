'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Plus, Trash2, MapPin, Hash, Calendar, Bed } from 'lucide-react';
import type { WizardData, FacilityInput, AssetType } from './DealSetupWizard';

interface FacilityInputStepProps {
  data: WizardData;
  onUpdate: (updates: Partial<WizardData>) => void;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const emptyFacility = (assetType: AssetType): FacilityInput => ({
  name: '',
  assetType,
  licensedBeds: undefined,
});

export function FacilityInputStep({ data, onUpdate }: FacilityInputStepProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    data.facilities.length > 0 ? 0 : null
  );

  const addFacility = () => {
    const newFacilities = [...data.facilities, emptyFacility(data.assetType)];
    onUpdate({ facilities: newFacilities });
    setExpandedIndex(newFacilities.length - 1);
  };

  const removeFacility = (index: number) => {
    const newFacilities = data.facilities.filter((_, i) => i !== index);
    onUpdate({ facilities: newFacilities });
    if (expandedIndex === index) {
      setExpandedIndex(newFacilities.length > 0 ? 0 : null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updateFacility = (index: number, updates: Partial<FacilityInput>) => {
    const newFacilities = data.facilities.map((f, i) =>
      i === index ? { ...f, ...updates } : f
    );
    onUpdate({ facilities: newFacilities });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Add Facilities</h3>
          <p className="text-sm text-surface-500">
            Add the facilities included in this {data.dealStructure.replace('_', '-')} transaction
          </p>
        </div>
        <Button onClick={addFacility} className="bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="h-4 w-4 mr-2" />
          Add Facility
        </Button>
      </div>

      {data.facilities.length === 0 ? (
        <Card variant="flat" className="text-center py-12">
          <Building2 className="h-12 w-12 mx-auto text-surface-400 mb-4" />
          <p className="text-surface-500">No facilities added yet</p>
          <p className="text-sm text-surface-400 mt-1">
            Click &quot;Add Facility&quot; to get started
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.facilities.map((facility, index) => (
            <Card
              key={index}
              className={`transition-all ${
                expandedIndex === index ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              <CardContent className="p-4">
                {/* Header Row */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {facility.name || `Facility ${index + 1}`}
                      </h4>
                      <p className="text-sm text-surface-500">
                        {facility.assetType} {facility.licensedBeds ? `• ${facility.licensedBeds} beds` : ''}
                        {facility.city && facility.state ? ` • ${facility.city}, ${facility.state}` : ''}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFacility(index);
                    }}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Expanded Content */}
                {expandedIndex === index && (
                  <div className="mt-4 pt-4 border-t border-surface-200 grid grid-cols-2 gap-4">
                    {/* Facility Name */}
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`name-${index}`}>
                        <Building2 className="h-4 w-4 inline mr-1" />
                        Facility Name *
                      </Label>
                      <Input
                        id={`name-${index}`}
                        value={facility.name}
                        onChange={(e) => updateFacility(index, { name: e.target.value })}
                        placeholder="e.g., Sunrise Care Center"
                      />
                    </div>

                    {/* Asset Type */}
                    <div className="space-y-2">
                      <Label>Asset Type</Label>
                      <Select
                        value={facility.assetType}
                        onValueChange={(value) =>
                          updateFacility(index, { assetType: value as AssetType })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SNF">Skilled Nursing (SNF)</SelectItem>
                          <SelectItem value="ALF">Assisted Living (ALF)</SelectItem>
                          <SelectItem value="ILF">Independent Living (ILF)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* CCN */}
                    <div className="space-y-2">
                      <Label htmlFor={`ccn-${index}`}>
                        <Hash className="h-4 w-4 inline mr-1" />
                        CMS CCN (optional)
                      </Label>
                      <Input
                        id={`ccn-${index}`}
                        value={facility.ccn || ''}
                        onChange={(e) => updateFacility(index, { ccn: e.target.value })}
                        placeholder="e.g., 555001"
                      />
                    </div>

                    {/* Licensed Beds */}
                    <div className="space-y-2">
                      <Label htmlFor={`beds-${index}`}>
                        <Bed className="h-4 w-4 inline mr-1" />
                        Licensed Beds
                      </Label>
                      <Input
                        id={`beds-${index}`}
                        type="number"
                        value={facility.licensedBeds || ''}
                        onChange={(e) =>
                          updateFacility(index, {
                            licensedBeds: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 120"
                      />
                    </div>

                    {/* Certified Beds */}
                    <div className="space-y-2">
                      <Label htmlFor={`certBeds-${index}`}>Certified Beds</Label>
                      <Input
                        id={`certBeds-${index}`}
                        type="number"
                        value={facility.certifiedBeds || ''}
                        onChange={(e) =>
                          updateFacility(index, {
                            certifiedBeds: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 100"
                      />
                    </div>

                    {/* Address */}
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor={`address-${index}`}>
                        <MapPin className="h-4 w-4 inline mr-1" />
                        Street Address
                      </Label>
                      <Input
                        id={`address-${index}`}
                        value={facility.address || ''}
                        onChange={(e) => updateFacility(index, { address: e.target.value })}
                        placeholder="e.g., 123 Main Street"
                      />
                    </div>

                    {/* City */}
                    <div className="space-y-2">
                      <Label htmlFor={`city-${index}`}>City</Label>
                      <Input
                        id={`city-${index}`}
                        value={facility.city || ''}
                        onChange={(e) => updateFacility(index, { city: e.target.value })}
                        placeholder="e.g., Portland"
                      />
                    </div>

                    {/* State */}
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Select
                        value={facility.state || ''}
                        onValueChange={(value) => updateFacility(index, { state: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {US_STATES.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ZIP Code */}
                    <div className="space-y-2">
                      <Label htmlFor={`zip-${index}`}>ZIP Code</Label>
                      <Input
                        id={`zip-${index}`}
                        value={facility.zipCode || ''}
                        onChange={(e) => updateFacility(index, { zipCode: e.target.value })}
                        placeholder="e.g., 97201"
                      />
                    </div>

                    {/* Year Built */}
                    <div className="space-y-2">
                      <Label htmlFor={`yearBuilt-${index}`}>
                        <Calendar className="h-4 w-4 inline mr-1" />
                        Year Built
                      </Label>
                      <Input
                        id={`yearBuilt-${index}`}
                        type="number"
                        value={facility.yearBuilt || ''}
                        onChange={(e) =>
                          updateFacility(index, {
                            yearBuilt: e.target.value ? parseInt(e.target.value) : undefined,
                          })
                        }
                        placeholder="e.g., 1985"
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      {data.facilities.length > 0 && (
        <div className="p-4 bg-surface-50 dark:bg-surface-800 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-surface-600 dark:text-surface-400">Total Facilities</span>
            <span className="font-semibold">{data.facilities.length}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-surface-600 dark:text-surface-400">Total Beds</span>
            <span className="font-semibold">
              {data.facilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
