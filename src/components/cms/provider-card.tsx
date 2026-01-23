'use client';

import { cn } from '@/lib/utils';
import { StarRatingDisplay, RatingBadge } from './star-rating-display';
import {
  Building2,
  MapPin,
  Phone,
  Bed,
  AlertTriangle,
  Shield,
  Users,
  Activity,
  DollarSign,
  ExternalLink,
} from 'lucide-react';
import type { NormalizedProviderData } from '@/lib/cms';

interface ProviderCardProps {
  provider: NormalizedProviderData;
  variant?: 'compact' | 'full';
  onSelect?: () => void;
  isSelected?: boolean;
  className?: string;
}

export function ProviderCard({
  provider,
  variant = 'full',
  onSelect,
  isSelected,
  className,
}: ProviderCardProps) {
  const hasWarnings = provider.isSff || provider.isSffCandidate || provider.abuseIcon;

  if (variant === 'compact') {
    return (
      <div
        onClick={onSelect}
        className={cn(
          'card p-4 cursor-pointer transition-all hover:shadow-md',
          isSelected && 'ring-2 ring-[var(--accent-solid)]',
          className
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-[var(--color-text-primary)] truncate">
                {provider.providerName}
              </h3>
              {hasWarnings && (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              CCN: {provider.ccn} · {provider.city}, {provider.state}
            </p>
          </div>
          <RatingBadge rating={provider.overallRating} variant="compact" />
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--color-text-secondary)]">
          <div className="flex items-center gap-1">
            <Bed className="w-3 h-3" />
            {provider.numberOfBeds ?? 'N/A'} beds
          </div>
          {provider.ownershipType && (
            <div className="truncate">{provider.ownershipType}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={cn(
        'card p-5 transition-all',
        onSelect && 'cursor-pointer hover:shadow-md',
        isSelected && 'ring-2 ring-[var(--accent-solid)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-[var(--color-text-tertiary)]" />
            <h3 className="font-semibold text-lg text-[var(--color-text-primary)] truncate">
              {provider.providerName}
            </h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
            <MapPin className="w-4 h-4" />
            {provider.address}, {provider.city}, {provider.state} {provider.zipCode}
          </div>
          {provider.phoneNumber && (
            <div className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)] mt-1">
              <Phone className="w-4 h-4" />
              {provider.phoneNumber}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">CCN</div>
          <div className="font-mono font-semibold text-[var(--color-text-primary)]">
            {provider.ccn}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {hasWarnings && (
        <div className="flex flex-wrap gap-2 mb-4">
          {provider.isSff && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              <Shield className="w-3.5 h-3.5" />
              Special Focus Facility
            </div>
          )}
          {provider.isSffCandidate && !provider.isSff && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-medium border border-orange-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              SFF Candidate
            </div>
          )}
          {provider.abuseIcon && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              Abuse Noted
            </div>
          )}
        </div>
      )}

      {/* Ratings */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-[var(--gray-50)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Overall</div>
          <StarRatingDisplay rating={provider.overallRating} size="sm" />
        </div>
        <div className="bg-[var(--gray-50)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Health Inspection</div>
          <StarRatingDisplay rating={provider.healthInspectionRating} size="sm" />
        </div>
        <div className="bg-[var(--gray-50)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Staffing</div>
          <StarRatingDisplay rating={provider.staffingRating} size="sm" />
        </div>
        <div className="bg-[var(--gray-50)] rounded-lg p-3">
          <div className="text-xs text-[var(--color-text-tertiary)] mb-1">Quality Measures</div>
          <StarRatingDisplay rating={provider.qualityMeasureRating} size="sm" />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--color-border-default)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Bed className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Beds</div>
            <div className="font-semibold text-[var(--color-text-primary)]">
              {provider.numberOfBeds ?? 'N/A'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
            <Users className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Avg Census</div>
            <div className="font-semibold text-[var(--color-text-primary)]">
              {provider.averageResidentsPerDay?.toFixed(1) ?? 'N/A'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Total HPPD</div>
            <div className="font-semibold text-[var(--color-text-primary)]">
              {provider.totalNursingHppd?.toFixed(2) ?? 'N/A'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <div className="text-xs text-[var(--color-text-tertiary)]">Total Fines</div>
            <div className="font-semibold text-[var(--color-text-primary)]">
              {provider.finesTotal
                ? `$${(provider.finesTotal / 1000).toFixed(0)}K`
                : '$0'}
            </div>
          </div>
        </div>
      </div>

      {/* Staffing Details */}
      {(provider.reportedRnHppd || provider.reportedLpnHppd || provider.reportedCnaHppd) && (
        <div className="mt-4 pt-4 border-t border-[var(--color-border-default)]">
          <div className="text-xs font-medium text-[var(--color-text-secondary)] mb-2">
            Staffing Hours Per Resident Day
          </div>
          <div className="flex gap-4 text-sm">
            <div>
              <span className="text-[var(--color-text-tertiary)]">RN:</span>{' '}
              <span className="font-medium">{provider.reportedRnHppd?.toFixed(2) ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">LPN:</span>{' '}
              <span className="font-medium">{provider.reportedLpnHppd?.toFixed(2) ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-[var(--color-text-tertiary)]">CNA:</span>{' '}
              <span className="font-medium">{provider.reportedCnaHppd?.toFixed(2) ?? 'N/A'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-[var(--color-border-default)] flex items-center justify-between text-xs text-[var(--color-text-tertiary)]">
        <div>{provider.ownershipType}</div>
        {provider.dataDate && (
          <div>Data as of {new Date(provider.dataDate).toLocaleDateString()}</div>
        )}
      </div>
    </div>
  );
}

interface ProviderSearchResultProps {
  ccn: string;
  name: string;
  city: string;
  state: string;
  beds: number | null;
  overallRating: number | null;
  isSff: boolean;
  onSelect: () => void;
  isSelected?: boolean;
}

export function ProviderSearchResult({
  ccn,
  name,
  city,
  state,
  beds,
  overallRating,
  isSff,
  onSelect,
  isSelected,
}: ProviderSearchResultProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left px-4 py-3 hover:bg-[var(--gray-50)] transition-colors',
        'border-b border-[var(--color-border-default)] last:border-0',
        isSelected && 'bg-[var(--accent-bg)]'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--color-text-primary)] truncate">
              {name}
            </span>
            {isSff && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                SFF
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
            {city}, {state} · CCN: {ccn}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {beds && (
            <span className="text-sm text-[var(--color-text-secondary)]">{beds} beds</span>
          )}
          <RatingBadge rating={overallRating} variant="compact" />
        </div>
      </div>
    </button>
  );
}
