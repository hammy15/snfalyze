'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Building2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FacilityTab {
  id: string;
  name: string;
  beds: number;
  occupancy?: number;
  ebitda?: number;
  isPortfolio?: boolean;
  // CMS Data
  cmsRating?: number | null;
  healthRating?: number | null;
  staffingRating?: number | null;
  qualityRating?: number | null;
  isSff?: boolean | null;
}

interface BuildingTabsProps {
  facilities: FacilityTab[];
  selectedFacilityId: string | null; // null = portfolio view
  onSelectFacility: (facilityId: string | null) => void;
  onAddFacility?: () => void;
}

export function BuildingTabs({
  facilities,
  selectedFacilityId,
  onSelectFacility,
  onAddFacility,
}: BuildingTabsProps) {
  const isPortfolioSelected = selectedFacilityId === null;

  const formatCurrency = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(0)}%`;
  };

  return (
    <div className="border-b bg-muted/30">
      <div className="flex items-center overflow-x-auto">
        {/* Portfolio Tab */}
        <button
          onClick={() => onSelectFacility(null)}
          className={cn(
            'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap',
            isPortfolioSelected
              ? 'border-primary bg-background text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium">Portfolio</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {facilities.length}
          </Badge>
        </button>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Individual Facility Tabs */}
        {facilities.map((facility) => {
          const isSelected = selectedFacilityId === facility.id;

          return (
            <button
              key={facility.id}
              onClick={() => onSelectFacility(facility.id)}
              className={cn(
                'flex flex-col items-start px-4 py-2 border-b-2 transition-colors whitespace-nowrap min-w-[160px]',
                isSelected
                  ? 'border-primary bg-background text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium text-sm truncate max-w-[120px]">{facility.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs">
                <span>{facility.beds} beds</span>
                {facility.occupancy !== undefined && facility.occupancy > 0 && (
                  <>
                    <span>·</span>
                    <span
                      className={
                        facility.occupancy >= 0.9
                          ? 'text-green-600'
                          : facility.occupancy >= 0.8
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }
                    >
                      {formatPercent(facility.occupancy)}
                    </span>
                  </>
                )}
                {facility.cmsRating !== undefined && facility.cmsRating !== null && (
                  <>
                    <span>·</span>
                    <span
                      className={
                        facility.cmsRating >= 4
                          ? 'text-green-600'
                          : facility.cmsRating >= 3
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }
                    >
                      ★{facility.cmsRating}
                    </span>
                  </>
                )}
                {facility.isSff && (
                  <>
                    <span>·</span>
                    <span className="text-red-600 font-medium">SFF</span>
                  </>
                )}
                {facility.ebitda !== undefined && facility.ebitda !== 0 && (
                  <>
                    <span>·</span>
                    <span className={facility.ebitda >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(facility.ebitda)}
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}

        {/* Add Facility Button */}
        {onAddFacility && (
          <>
            <div className="h-6 w-px bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={onAddFacility}
              className="h-auto py-3 px-3 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default BuildingTabs;
