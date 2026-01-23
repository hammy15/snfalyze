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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CMSProviderData[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
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
  const selectFacility = (slot: number, provider: CMSProviderData) => {
    setFacilities((prev) =>
      prev.map((f) =>
        f.slot === slot
          ? {
              ...f,
              ccn: provider.ccn,
              name: provider.providerName,
              address: provider.address,
              city: provider.city,
              state: provider.state,
              zipCode: provider.zipCode,
              licensedBeds: provider.numberOfBeds,
              certifiedBeds: provider.numberOfBeds,
              cmsRating: provider.overallRating,
              healthRating: provider.healthInspectionRating,
              staffingRating: provider.staffingRating,
              qualityRating: provider.qualityMeasureRating,
              isSff: provider.isSff,
              isSffWatch: provider.isSffCandidate,
              isVerified: false,
              cmsData: provider as unknown as Record<string, unknown>,
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
  };

  // Render star rating
  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              'w-3.5 h-3.5',
              star <= rating
                ? 'fill-amber-400 text-amber-400'
                : 'fill-surface-200 text-surface-200 dark:fill-surface-700 dark:text-surface-700'
            )}
          />
        ))}
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
              facility.isVerified && 'border-primary-500 dark:border-primary-500'
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-surface-200 dark:bg-surface-700 flex items-center justify-center text-sm">
                    {facility.slot}
                  </span>
                  {facility.name || `Facility ${facility.slot}`}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {facility.isSff && (
                    <Badge variant="destructive" className="text-xs">
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
              {!facility.name ? (
                // Empty slot - show search
                searchingSlot === facility.slot ? (
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
                                <Users className="w-3 h-3" />
                                {result.numberOfBeds} beds
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
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setSearchingSlot(facility.slot)}
                    className="w-full justify-start gap-2"
                  >
                    <Search className="w-4 h-4" />
                    Search CMS for facility
                  </Button>
                )
              ) : (
                // Filled slot - show details
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-xs text-surface-500">CCN</Label>
                      <p className="font-mono text-sm">{facility.ccn}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-surface-500">Location</Label>
                      <p className="text-sm">
                        {facility.city}, {facility.state}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-surface-500">Beds</Label>
                      <p className="text-sm">{facility.licensedBeds}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-surface-500">CMS Rating</Label>
                      {renderStars(facility.cmsRating)}
                    </div>
                  </div>

                  {facility.address && (
                    <div>
                      <Label className="text-xs text-surface-500">Address</Label>
                      <p className="text-sm">
                        {facility.address}, {facility.city}, {facility.state} {facility.zipCode}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    {!facility.isVerified && (
                      <Button onClick={() => verifyFacility(facility.slot)}>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Verify This Facility
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => clearSlot(facility.slot)}>
                      {facility.isVerified ? 'Change Facility' : 'Clear'}
                    </Button>
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
                All {facilityCount} facilities verified. Ready to proceed to document organization.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
