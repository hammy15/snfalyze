'use client';

import { cn } from '@/lib/utils';
import {
  Building2,
  Bed,
  MapPin,
  Star,
  AlertTriangle,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useState } from 'react';

export interface FacilityData {
  id: string;
  name: string;
  ccn?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  assetType: 'SNF' | 'ALF' | 'ILF';
  licensedBeds?: number | null;
  certifiedBeds?: number | null;
  yearBuilt?: number | null;
  cmsRating?: number | null;
  healthRating?: number | null;
  staffingRating?: number | null;
  qualityRating?: number | null;
  isSff?: boolean | null;
  isSffWatch?: boolean | null;
  hasImmediateJeopardy?: boolean | null;
}

interface FacilityListProps {
  facilities: FacilityData[];
  onFacilityClick?: (facility: FacilityData) => void;
  onEditFacility?: (facility: FacilityData) => void;
  onDeleteFacility?: (facility: FacilityData) => void;
  selectedId?: string;
  className?: string;
}

const ASSET_TYPE_CONFIG: Record<
  'SNF' | 'ALF' | 'ILF',
  { label: string; color: string; bgColor: string }
> = {
  SNF: {
    label: 'SNF',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
  },
  ALF: {
    label: 'ALF',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
  },
  ILF: {
    label: 'ILF',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
  },
};

function AssetTypeBadge({ type }: { type: 'SNF' | 'ALF' | 'ILF' }) {
  const config = ASSET_TYPE_CONFIG[type];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
        config.bgColor,
        config.color
      )}
    >
      {config.label}
    </span>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            'w-3 h-3',
            star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

function FacilityCard({
  facility,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: {
  facility: FacilityData;
  isSelected: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const hasWarnings =
    facility.isSff || facility.isSffWatch || facility.hasImmediateJeopardy;

  return (
    <div
      className={cn(
        'card p-4 cursor-pointer transition-all hover:shadow-md relative',
        isSelected && 'ring-2 ring-[var(--accent-solid)]'
      )}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <AssetTypeBadge type={facility.assetType} />
          <h3 className="font-medium text-[var(--color-text-primary)] truncate">
            {facility.name}
          </h3>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-[var(--gray-100)] text-[var(--color-text-tertiary)]"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-[var(--color-border-default)] py-1 min-w-[120px]">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--gray-50)]"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit
                  </button>
                )}
                {facility.ccn && (
                  <a
                    href={`https://www.medicare.gov/care-compare/details/nursing-home/${facility.ccn}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--gray-50)]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    CMS Profile
                  </a>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Location */}
      {(facility.city || facility.state) && (
        <div className="flex items-center gap-1 text-sm text-[var(--color-text-tertiary)] mb-2">
          <MapPin className="w-3 h-3" />
          {[facility.city, facility.state].filter(Boolean).join(', ')}
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {facility.licensedBeds && (
          <div className="flex items-center gap-1 text-[var(--color-text-secondary)]">
            <Bed className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <span className="font-medium">{facility.licensedBeds}</span>
            <span className="text-[var(--color-text-tertiary)]">beds</span>
          </div>
        )}

        {facility.cmsRating && (
          <div className="flex items-center gap-1">
            <StarRating rating={facility.cmsRating} />
            <span className="text-xs text-[var(--color-text-tertiary)]">CMS</span>
          </div>
        )}

        {facility.ccn && (
          <span className="text-xs font-mono text-[var(--color-text-tertiary)]">
            CCN: {facility.ccn}
          </span>
        )}
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="mt-3 pt-3 border-t border-[var(--color-border-default)]">
          <div className="flex flex-wrap gap-2">
            {facility.isSff && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3" />
                SFF
              </span>
            )}
            {facility.isSffWatch && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                <AlertTriangle className="w-3 h-3" />
                SFF Watch
              </span>
            )}
            {facility.hasImmediateJeopardy && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
                <AlertTriangle className="w-3 h-3" />
                Immediate Jeopardy
              </span>
            )}
          </div>
        </div>
      )}

      {/* Click indicator */}
      {onClick && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]">
          <ChevronRight className="w-5 h-5" />
        </div>
      )}
    </div>
  );
}

export function FacilityList({
  facilities,
  onFacilityClick,
  onEditFacility,
  onDeleteFacility,
  selectedId,
  className,
}: FacilityListProps) {
  if (facilities.length === 0) {
    return (
      <div className={cn('text-center py-12', className)}>
        <Building2 className="w-12 h-12 mx-auto text-[var(--color-text-tertiary)] mb-3" />
        <p className="text-[var(--color-text-secondary)] font-medium">No facilities yet</p>
        <p className="text-sm text-[var(--color-text-tertiary)]">
          Add facilities to this deal to get started
        </p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {facilities.map((facility) => (
        <FacilityCard
          key={facility.id}
          facility={facility}
          isSelected={selectedId === facility.id}
          onClick={onFacilityClick ? () => onFacilityClick(facility) : undefined}
          onEdit={onEditFacility ? () => onEditFacility(facility) : undefined}
          onDelete={onDeleteFacility ? () => onDeleteFacility(facility) : undefined}
        />
      ))}
    </div>
  );
}

// Compact list view
interface FacilityListCompactProps {
  facilities: FacilityData[];
  onFacilityClick?: (facility: FacilityData) => void;
  className?: string;
}

export function FacilityListCompact({
  facilities,
  onFacilityClick,
  className,
}: FacilityListCompactProps) {
  return (
    <div className={cn('divide-y divide-[var(--color-border-default)]', className)}>
      {facilities.map((facility) => (
        <button
          key={facility.id}
          type="button"
          onClick={() => onFacilityClick?.(facility)}
          className="flex items-center justify-between w-full py-3 px-2 hover:bg-[var(--gray-50)] text-left transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <AssetTypeBadge type={facility.assetType} />
            <div className="min-w-0">
              <div className="font-medium text-[var(--color-text-primary)] truncate">
                {facility.name}
              </div>
              <div className="text-xs text-[var(--color-text-tertiary)]">
                {facility.licensedBeds} beds
                {facility.state && ` · ${facility.state}`}
              </div>
            </div>
          </div>
          {facility.cmsRating && <StarRating rating={facility.cmsRating} />}
        </button>
      ))}
    </div>
  );
}
