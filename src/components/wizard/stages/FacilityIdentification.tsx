'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Search,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Star,
  Users,
  Loader2,
  RefreshCw,
  Edit2,
  X,
  Bed,
  Heart,
  UserCheck,
  Award,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WizardStageData } from '../EnhancedDealWizard';

interface FacilitySlot {
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
  cmsLookupStatus?: 'pending' | 'loading' | 'found' | 'not_found';
}

interface CMSProviderData {
  ccn: string;
  providerName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  numberOfBeds: number;
  overallRating: number;
  healthInspectionRating: number;
  staffingRating: number;
  qualityMeasureRating: number;
  isSff: boolean;
  isSffCandidate: boolean;
}

interface FacilityIdentificationProps {
  stageData: WizardStageData;
  onUpdate: (data: Partial<WizardStageData>) => void;
  dealId?: string;
}

export function FacilityIdentification({ stageData, onUpdate }: FacilityIdentificationProps) {
  const facilityCount = stageData.dealStructure?.facilityCount || 1;
  const assetType = stageData.dealStructure?.assetType || 'SNF';

  // Initialize facility slots
  const [facilities, setFacilities] = useState<FacilitySlot[]>(() => {
    const existing = stageData.facilityIdentification?.facilities || [];
    const slots: FacilitySlot[] = [];
    for (let i = 1; i <= facilityCount; i++) {
      const existingSlot = existing.find((f) => f.slot === i);
      slots.push(
        existingSlot || {
          slot: i,
          isVerified: false,
          assetType,
        }
      );
    }
    return slots;
  });

  const [searchingSlot, setSearchingSlot] = useState<number | null>(null);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CMSProviderData[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [autoLookupRunning, setAutoLookupRunning] = useState(false);
  const autoLookupRef = useRef(false);

  // Auto-lookup facilities from CMS on initial load
  useEffect(() => {
    if (autoLookupRef.current) return;

    const facilitiesWithNames = facilities.filter(f => f.name && !f.ccn && f.cmsLookupStatus !== 'found' && f.cmsLookupStatus !== 'not_found');
    if (facilitiesWithNames.length === 0) return;

    autoLookupRef.current = true;
    setAutoLookupRunning(true);

    const lookupFacilities = async () => {
      for (const facility of facilitiesWithNames) {
        // Mark as loading
        setFacilities(prev => prev.map(f =>
          f.slot === facility.slot ? { ...f, cmsLookupStatus: 'loading' } : f
        ));

        try {
          // Search by name and state
          const searchTerm = facility.name || '';
          const state = facility.state || '';
          const endpoint = state
            ? `/api/cms/providers?name=${encodeURIComponent(searchTerm)}&state=${state}`
            : `/api/cms/providers?name=${encodeURIComponent(searchTerm)}`;

          const response = await fetch(endpoint);
          const data = await response.json();

          if (data.success && data.data && data.data.length > 0) {
            // Find best match - prefer exact name match or same city
            let bestMatch = data.data[0];
            for (const provider of data.data) {
              const nameMatch = provider.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                               searchTerm.toLowerCase().includes(provider.providerName?.toLowerCase());
              const cityMatch = facility.city && provider.city?.toLowerCase() === facility.city.toLowerCase();

              if (nameMatch && cityMatch) {
                bestMatch = provider;
                break;
              } else if (nameMatch) {
                bestMatch = provider;
              }
            }

            // If best match has a CCN, do a full lookup to get complete data
            if (bestMatch.ccn) {
              const fullResponse = await fetch(`/api/cms/providers?ccn=${bestMatch.ccn}`);
              const fullData = await fullResponse.json();
              if (fullData.success && fullData.data && fullData.data.length > 0) {
                bestMatch = fullData.data[0];
              }
            }

            // Update facility with CMS data
            setFacilities(prev => prev.map(f =>
              f.slot === facility.slot ? {
                ...f,
                ccn: bestMatch.ccn,
                name: bestMatch.providerName || f.name,
                address: bestMatch.address || f.address,
                city: bestMatch.city || f.city,
                state: bestMatch.state || f.state,
                zipCode: bestMatch.zipCode || f.zipCode,
                licensedBeds: bestMatch.numberOfBeds || f.licensedBeds,
                certifiedBeds: bestMatch.numberOfBeds || f.certifiedBeds,
                cmsRating: bestMatch.overallRating,
                healthRating: bestMatch.healthInspectionRating,
                staffingRating: bestMatch.staffingRating,
                qualityRating: bestMatch.qualityMeasureRating,
                isSff: bestMatch.isSff,
                isSffWatch: bestMatch.isSffCandidate,
                cmsData: bestMatch,
                cmsLookupStatus: 'found',
              } : f
            ));
          } else {
            // Not found in CMS
            setFacilities(prev => prev.map(f =>
              f.slot === facility.slot ? { ...f, cmsLookupStatus: 'not_found' } : f
            ));
          }
        } catch (err) {
          console.error('CMS lookup failed for', facility.name, err);
          setFacilities(prev => prev.map(f =>
            f.slot === facility.slot ? { ...f, cmsLookupStatus: 'not_found' } : f
          ));
        }

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setAutoLookupRunning(false);
    };

    lookupFacilities();
  }, []);

  // Sync facilities to parent when changed (with debounce)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    updateTimeoutRef.current = setTimeout(() => {
      onUpdate({
        facilityIdentification: {
          facilities,
        },
      });
    }, 500);

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [facilities]);

  // CMS lookup function
  const searchCMS = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchError(null);
    setSearchLoading(true);
    try {
      // Check if it's a CCN (6 digits) or name search
      const isCCN = /^\d{6}$/.test(query.trim());
      const endpoint = `/api/cms/providers${isCCN ? `?ccn=${query}` : `?name=${encodeURIComponent(query)}`}`;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data || []);
      } else {
        setSearchError(data.error || 'Search failed');
        setSearchResults([]);
      }
    } catch (err) {
      setSearchError('Failed to search CMS database');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchingSlot === null) return;

    const timer = setTimeout(() => {
      searchCMS(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchingSlot, searchCMS]);

  // Select a facility from search results
  const selectFacility = async (slot: number, provider: CMSProviderData) => {
    // If we have a CCN, do a full lookup to get complete data
    let fullProvider = provider;
    if (provider.ccn && !provider.healthInspectionRating) {
      try {
        const response = await fetch(`/api/cms/providers?ccn=${provider.ccn}`);
        const data = await response.json();
        if (data.success && data.data && data.data.length > 0) {
          fullProvider = data.data[0];
        }
      } catch (err) {
        console.error('Failed to fetch full provider data:', err);
      }
    }

    setFacilities((prev) =>
      prev.map((f) =>
        f.slot === slot
          ? {
              ...f,
              ccn: fullProvider.ccn,
              name: fullProvider.providerName,
              address: fullProvider.address,
              city: fullProvider.city,
              state: fullProvider.state,
              zipCode: fullProvider.zipCode,
              licensedBeds: fullProvider.numberOfBeds,
              certifiedBeds: fullProvider.numberOfBeds,
              cmsRating: fullProvider.overallRating,
              healthRating: fullProvider.healthInspectionRating,
              staffingRating: fullProvider.staffingRating,
              qualityRating: fullProvider.qualityMeasureRating,
              isSff: fullProvider.isSff,
              isSffWatch: fullProvider.isSffCandidate,
              isVerified: false,
              cmsData: fullProvider as unknown as Record<string, unknown>,
              cmsLookupStatus: 'found',
            }
          : f
      )
    );
    setSearchingSlot(null);
    setSearchQuery('');
    setSearchResults([]);
  };

  // Verify a facility
  const verifyFacility = (slot: number) => {
    setFacilities((prev) =>
      prev.map((f) =>
        f.slot === slot
          ? {
              ...f,
              isVerified: true,
            }
          : f
      )
    );
  };

  // Clear a facility slot
  const clearSlot = (slot: number) => {
    setFacilities((prev) =>
      prev.map((f) =>
        f.slot === slot
          ? {
              slot: f.slot,
              isVerified: false,
              assetType,
            }
          : f
      )
    );
    setEditingSlot(null);
  };

  // Update facility field
  const updateFacilityField = (slot: number, field: keyof FacilitySlot, value: string | number) => {
    setFacilities((prev) =>
      prev.map((f) =>
        f.slot === slot
          ? {
              ...f,
              [field]: value,
              isVerified: false, // Unverify when edited
            }
          : f
      )
    );
  };

  // Manual CMS refresh for a facility
  const refreshFromCMS = async (slot: number) => {
    const facility = facilities.find(f => f.slot === slot);
    if (!facility?.ccn) return;

    setFacilities(prev => prev.map(f =>
      f.slot === slot ? { ...f, cmsLookupStatus: 'loading' } : f
    ));

    try {
      const response = await fetch(`/api/cms/providers?ccn=${facility.ccn}`);
      const data = await response.json();

      if (data.success && data.data && data.data.length > 0) {
        const provider = data.data[0];
        setFacilities(prev => prev.map(f =>
          f.slot === slot ? {
            ...f,
            name: provider.providerName || f.name,
            address: provider.address || f.address,
            city: provider.city || f.city,
            state: provider.state || f.state,
            zipCode: provider.zipCode || f.zipCode,
            licensedBeds: provider.numberOfBeds || f.licensedBeds,
            certifiedBeds: provider.numberOfBeds || f.certifiedBeds,
            cmsRating: provider.overallRating,
            healthRating: provider.healthInspectionRating,
            staffingRating: provider.staffingRating,
            qualityRating: provider.qualityMeasureRating,
            isSff: provider.isSff,
            isSffWatch: provider.isSffCandidate,
            cmsData: provider,
            cmsLookupStatus: 'found',
          } : f
        ));
      }
    } catch (err) {
      console.error('CMS refresh failed:', err);
    }
  };

  // Render star rating
  const renderStars = (rating: number | undefined, label?: string) => {
    if (!rating) return <span className="text-surface-400 text-xs">N/A</span>;
    return (
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={cn(
                'w-3 h-3',
                star <= rating
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-surface-200 text-surface-200 dark:fill-surface-700 dark:text-surface-700'
              )}
            />
          ))}
        </div>
        {label && <span className="text-xs text-surface-500 ml-1">({rating})</span>}
      </div>
    );
  };

  const verifiedCount = facilities.filter((f) => f.isVerified).length;
  const filledCount = facilities.filter((f) => f.name).length;

  return (
    <div className="space-y-6">
      {/* Progress summary */}
      <div className="flex items-center justify-between p-4 bg-surface-100 dark:bg-surface-800 rounded-xl">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary-500" />
          <span className="font-medium">
            {filledCount} of {facilityCount} facilities identified
          </span>
          {autoLookupRunning && (
            <span className="flex items-center gap-2 text-sm text-surface-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Looking up CMS data...
            </span>
          )}
        </div>
        <Badge variant={verifiedCount === facilityCount ? 'default' : 'secondary'}>
          {verifiedCount} verified
        </Badge>
      </div>

      {/* Facility slots */}
      <div className="space-y-4">
        {facilities.map((facility) => (
          <Card
            key={facility.slot}
            className={cn(
              'transition-all',
              facility.isVerified && 'border-primary-500 dark:border-primary-500',
              facility.isSff && 'border-l-4 border-l-rose-500'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-sm">
                    {facility.slot}
                  </span>
                  {facility.name || `Facility ${facility.slot}`}
                  {facility.cmsLookupStatus === 'loading' && (
                    <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                  )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {facility.isSff && (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <AlertCircle className="w-3 h-3" />
                      SFF
                    </Badge>
                  )}
                  {facility.isSffWatch && (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                      SFF Watch
                    </Badge>
                  )}
                  {facility.isVerified ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </Badge>
                  ) : facility.name ? (
                    <Badge variant="outline" className="text-amber-600 border-amber-500">
                      Pending Verification
                    </Badge>
                  ) : null}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {!facility.name && !searchingSlot ? (
                // Empty slot - show search button
                <Button
                  variant="outline"
                  onClick={() => setSearchingSlot(facility.slot)}
                  className="w-full justify-start gap-2"
                >
                  <Search className="w-4 h-4" />
                  Search CMS for facility
                </Button>
              ) : searchingSlot === facility.slot ? (
                // Search mode
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <Input
                      placeholder="Enter CCN (e.g., 105001) or facility name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                    {searchLoading && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary-500" />
                    )}
                  </div>

                  {searchError && (
                    <p className="text-sm text-rose-600 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {searchError}
                    </p>
                  )}

                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((result) => (
                        <button
                          key={result.ccn}
                          onClick={() => selectFacility(facility.slot, result)}
                          className="w-full p-3 rounded-lg border border-surface-200 dark:border-surface-700 hover:border-primary-500 dark:hover:border-primary-500 text-left transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-surface-900 dark:text-surface-100">
                                {result.providerName}
                              </p>
                              <p className="text-sm text-surface-500 dark:text-surface-400 flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3" />
                                {result.city}, {result.state}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-surface-500">CCN: {result.ccn}</p>
                              {renderStars(result.overallRating)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-xs text-surface-500">
                            <span className="flex items-center gap-1">
                              <Bed className="w-3 h-3" />
                              {result.numberOfBeds || 'N/A'} beds
                            </span>
                            {result.isSff && (
                              <Badge variant="destructive" className="text-xs py-0">
                                SFF
                              </Badge>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchingSlot(null);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : editingSlot === facility.slot ? (
                // Edit mode
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Facility Name</Label>
                      <Input
                        value={facility.name || ''}
                        onChange={(e) => updateFacilityField(facility.slot, 'name', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CCN</Label>
                      <Input
                        value={facility.ccn || ''}
                        onChange={(e) => updateFacilityField(facility.slot, 'ccn', e.target.value)}
                        placeholder="6-digit CCN"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Address</Label>
                      <Input
                        value={facility.address || ''}
                        onChange={(e) => updateFacilityField(facility.slot, 'address', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">City</Label>
                      <Input
                        value={facility.city || ''}
                        onChange={(e) => updateFacilityField(facility.slot, 'city', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">State</Label>
                      <Input
                        value={facility.state || ''}
                        onChange={(e) => updateFacilityField(facility.slot, 'state', e.target.value)}
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ZIP Code</Label>
                      <Input
                        value={facility.zipCode || ''}
                        onChange={(e) => updateFacilityField(facility.slot, 'zipCode', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Licensed Beds</Label>
                      <Input
                        type="number"
                        value={facility.licensedBeds || ''}
                        onChange={(e) => updateFacilityField(facility.slot, 'licensedBeds', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setEditingSlot(null)}>
                      Done Editing
                    </Button>
                    <Button variant="outline" onClick={() => clearSlot(facility.slot)}>
                      Clear Facility
                    </Button>
                  </div>
                </div>
              ) : (
                // Display mode - show detailed CMS data
                <div className="space-y-4">
                  {/* Quick Stats Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        <Bed className="w-3 h-3" />
                        Beds
                      </div>
                      <p className="font-semibold text-lg">{facility.licensedBeds || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        <Star className="w-3 h-3" />
                        Overall
                      </div>
                      {renderStars(facility.cmsRating)}
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        <Heart className="w-3 h-3" />
                        Health
                      </div>
                      {renderStars(facility.healthRating)}
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        <UserCheck className="w-3 h-3" />
                        Staffing
                      </div>
                      {renderStars(facility.staffingRating)}
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        <Award className="w-3 h-3" />
                        Quality
                      </div>
                      {renderStars(facility.qualityRating)}
                    </div>
                    <div className="p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
                      <div className="flex items-center gap-2 text-xs text-surface-500 mb-1">
                        CCN
                      </div>
                      <p className="font-mono text-sm">{facility.ccn || 'N/A'}</p>
                    </div>
                  </div>

                  {/* Address */}
                  {facility.address && (
                    <div className="flex items-start gap-2 text-sm text-surface-600 dark:text-surface-400">
                      <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>
                        {facility.address}, {facility.city}, {facility.state} {facility.zipCode}
                      </span>
                    </div>
                  )}

                  {/* CMS lookup status message */}
                  {facility.cmsLookupStatus === 'not_found' && (
                    <div className="p-3 bg-surface-100 dark:bg-surface-800 rounded-lg text-sm">
                      <div className="flex items-center gap-2 text-surface-600 dark:text-surface-400">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          <strong>Not found in CMS database.</strong> This is normal for non-Medicare SNFs, ALFs, ILFs, or facilities with different names.
                          You can manually enter data or search by CCN.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-surface-200 dark:border-surface-700">
                    {!facility.isVerified && (
                      <Button onClick={() => verifyFacility(facility.slot)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Verify This Facility
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setEditingSlot(facility.slot)}>
                      <Edit2 className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => setSearchingSlot(facility.slot)}>
                      <Search className="w-4 h-4 mr-2" />
                      Search Different
                    </Button>
                    {facility.ccn && (
                      <Button variant="ghost" size="sm" onClick={() => refreshFromCMS(facility.slot)}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh CMS Data
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {verifiedCount === facilityCount && (
        <Card variant="glass">
          <CardContent className="py-4">
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <CheckCircle2 className="w-5 h-5" />
              <p className="font-medium">
                All {facilityCount} facilities verified. Ready to proceed to document extraction.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
