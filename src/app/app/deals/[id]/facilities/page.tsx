'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2 } from 'lucide-react';
import { FacilityManager } from '@/components/deals/facility-manager';
import type { FacilityData } from '@/components/deals/facility-list';

// Mock facilities data - in production, this would come from API/database
const mockFacilities: FacilityData[] = [
  {
    id: '1',
    name: 'Sunrise Care Center',
    ccn: '385001',
    address: '123 Healthcare Drive',
    city: 'Portland',
    state: 'OR',
    zipCode: '97201',
    assetType: 'SNF',
    licensedBeds: 120,
    certifiedBeds: 115,
    yearBuilt: 1985,
    cmsRating: 4,
    healthRating: 3,
    staffingRating: 4,
    qualityRating: 4,
    isSff: false,
    isSffWatch: false,
    hasImmediateJeopardy: false,
  },
  {
    id: '2',
    name: 'Valley View Healthcare',
    ccn: '385002',
    address: '456 Senior Lane',
    city: 'Salem',
    state: 'OR',
    zipCode: '97301',
    assetType: 'SNF',
    licensedBeds: 100,
    certifiedBeds: 98,
    yearBuilt: 1992,
    cmsRating: 3,
    healthRating: 2,
    staffingRating: 3,
    qualityRating: 4,
    isSff: false,
    isSffWatch: true,
    hasImmediateJeopardy: false,
  },
  {
    id: '3',
    name: 'Mountain Meadows ALF',
    address: '789 Assisted Living Way',
    city: 'Eugene',
    state: 'OR',
    zipCode: '97401',
    assetType: 'ALF',
    licensedBeds: 80,
    yearBuilt: 2005,
    cmsRating: null,
    isSff: false,
    isSffWatch: false,
    hasImmediateJeopardy: false,
  },
];

export default function DealFacilitiesPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params.id as string;

  const [facilities, setFacilities] = useState<FacilityData[]>(mockFacilities);
  const [isLoading, setIsLoading] = useState(false);

  // In production, these would call your API
  const handleAddFacility = useCallback(async (data: Omit<FacilityData, 'id'>) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newFacility: FacilityData = {
        ...data,
        id: `facility-${Date.now()}`,
      };

      setFacilities((prev) => [...prev, newFacility]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleUpdateFacility = useCallback(async (id: string, data: Partial<FacilityData>) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setFacilities((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...data } : f))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleDeleteFacility = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setFacilities((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleImportFromCMS = useCallback(async (ccn: string) => {
    // This would fetch from CMS API
    const mockImportedFacility: FacilityData = {
      id: `facility-${Date.now()}`,
      name: 'Imported Facility',
      ccn,
      assetType: 'SNF',
      licensedBeds: 100,
      state: 'OR',
    };
    return mockImportedFacility;
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border-default)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <Link
              href="/app/deals"
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              Deals
            </Link>
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <Link
              href={`/app/deals/${dealId}`}
              className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            >
              Deal Details
            </Link>
            <span className="text-[var(--color-text-tertiary)]">/</span>
            <span className="text-[var(--color-text-primary)] font-medium">Facilities</span>
          </div>

          {/* Page header */}
          <div className="flex items-center gap-4">
            <Link
              href={`/app/deals/${dealId}`}
              className="p-2 hover:bg-[var(--gray-100)] rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-bg)] flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[var(--accent-solid)]" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">
                  Facilities
                </h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Manage facilities in this deal
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <FacilityManager
          dealId={dealId}
          facilities={facilities}
          onAddFacility={handleAddFacility}
          onUpdateFacility={handleUpdateFacility}
          onDeleteFacility={handleDeleteFacility}
          onImportFromCMS={handleImportFromCMS}
        />
      </div>
    </div>
  );
}
