'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  X,
  ExternalLink,
  ChevronRight,
  MapPin,
  Building2,
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  Star,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import { RiskBadge, QualityRating } from './status-badge';

interface PreviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  detailUrl?: string;
  className?: string;
}

export function PreviewPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  actions,
  detailUrl,
  className,
}: PreviewPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 bg-black/20 z-40 transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          'fixed right-0 top-0 h-full bg-white shadow-xl z-50 transition-transform duration-200 ease-out',
          'w-full sm:w-[480px] lg:w-[540px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          className
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[var(--color-border-muted)] px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {title && (
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 truncate">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {detailUrl && (
                <a
                  href={detailUrl}
                  className="btn btn-secondary btn-sm"
                >
                  View Full Details
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
              <button
                onClick={onClose}
                className="btn btn-ghost btn-sm p-1.5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 mt-4">
              {actions}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-80px)] p-6">
          {children}
        </div>
      </div>
    </>
  );
}

// Section component for organizing panel content
interface PreviewSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function PreviewSection({
  title,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
}: PreviewSectionProps) {
  return (
    <div className={cn('mb-6', className)}>
      <h3 className="text-xs font-semibold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

// Info row component for key-value pairs
interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export function InfoRow({ label, value, icon }: InfoRowProps) {
  return (
    <div className="flex items-start py-2 border-b border-[var(--color-border-muted)] last:border-b-0">
      <div className="flex items-center gap-2 w-36 flex-shrink-0">
        {icon && <span className="text-[var(--color-text-disabled)]">{icon}</span>}
        <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      </div>
      <div className="flex-1 text-sm font-medium text-[var(--color-text-primary)]">
        {value}
      </div>
    </div>
  );
}

// Facility Preview Panel Content
interface FacilityPreviewProps {
  facility: {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    type: 'snf' | 'alf' | 'ilf' | 'ccrc';
    beds: number;
    occupancy: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskScore: number;
    qualityRating: 1 | 2 | 3 | 4 | 5;
    owner: string;
    operator: string;
    phone?: string;
    website?: string;
    lastSurvey?: Date;
    deficiencies?: number;
  };
}

export function FacilityPreviewContent({ facility }: FacilityPreviewProps) {
  const typeLabels = {
    snf: 'Skilled Nursing Facility',
    alf: 'Assisted Living Facility',
    ilf: 'Independent Living Facility',
    ccrc: 'Continuing Care Retirement Community',
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-[var(--gray-50)] rounded-lg">
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
            {facility.beds}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">Beds</div>
        </div>
        <div className="text-center p-3 bg-[var(--gray-50)] rounded-lg">
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
            {facility.occupancy}%
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">Occupancy</div>
        </div>
        <div className="text-center p-3 bg-[var(--gray-50)] rounded-lg">
          <RiskBadge level={facility.riskLevel} score={facility.riskScore} showScore />
        </div>
      </div>

      {/* Overview */}
      <PreviewSection title="Overview">
        <InfoRow
          label="Type"
          value={typeLabels[facility.type]}
          icon={<Building2 className="w-4 h-4" />}
        />
        <InfoRow
          label="Location"
          value={`${facility.city}, ${facility.state} ${facility.zip}`}
          icon={<MapPin className="w-4 h-4" />}
        />
        <InfoRow
          label="Quality Rating"
          value={<QualityRating rating={facility.qualityRating} showLabel />}
          icon={<Star className="w-4 h-4" />}
        />
      </PreviewSection>

      {/* Ownership */}
      <PreviewSection title="Ownership & Operations">
        <InfoRow
          label="Owner"
          value={facility.owner}
          icon={<DollarSign className="w-4 h-4" />}
        />
        <InfoRow
          label="Operator"
          value={facility.operator}
          icon={<Users className="w-4 h-4" />}
        />
      </PreviewSection>

      {/* Survey Info */}
      {facility.lastSurvey && (
        <PreviewSection title="Survey History">
          <InfoRow
            label="Last Survey"
            value={facility.lastSurvey.toLocaleDateString()}
            icon={<Calendar className="w-4 h-4" />}
          />
          {facility.deficiencies !== undefined && (
            <InfoRow
              label="Deficiencies"
              value={
                <span className={facility.deficiencies > 5 ? 'text-[var(--status-error-text)]' : ''}>
                  {facility.deficiencies} cited
                </span>
              }
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          )}
        </PreviewSection>
      )}

      {/* Contact */}
      <PreviewSection title="Contact">
        {facility.phone && (
          <InfoRow
            label="Phone"
            value={
              <a href={`tel:${facility.phone}`} className="text-[var(--accent-solid)] hover:underline">
                {facility.phone}
              </a>
            }
            icon={<Phone className="w-4 h-4" />}
          />
        )}
        {facility.website && (
          <InfoRow
            label="Website"
            value={
              <a
                href={facility.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent-solid)] hover:underline truncate block"
              >
                {facility.website.replace(/^https?:\/\//, '')}
              </a>
            }
            icon={<Globe className="w-4 h-4" />}
          />
        )}
      </PreviewSection>
    </div>
  );
}

// Deal Preview Panel Content
interface DealPreviewProps {
  deal: {
    id: string;
    name: string;
    stage: string;
    value: number;
    beds: number;
    assignee: string;
    createdAt: Date;
    lastActivity: Date;
    notes?: string;
    facilities?: { id: string; name: string }[];
  };
}

export function DealPreviewContent({ deal }: DealPreviewProps) {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-[var(--gray-50)] rounded-lg">
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
            ${(deal.value / 1000000).toFixed(1)}M
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">Deal Value</div>
        </div>
        <div className="p-4 bg-[var(--gray-50)] rounded-lg">
          <div className="text-2xl font-semibold text-[var(--color-text-primary)] tabular-nums">
            {deal.beds}
          </div>
          <div className="text-xs text-[var(--color-text-tertiary)]">Total Beds</div>
        </div>
      </div>

      {/* Deal Info */}
      <PreviewSection title="Deal Information">
        <InfoRow
          label="Assignee"
          value={deal.assignee}
          icon={<Users className="w-4 h-4" />}
        />
        <InfoRow
          label="Created"
          value={deal.createdAt.toLocaleDateString()}
          icon={<Calendar className="w-4 h-4" />}
        />
        <InfoRow
          label="Last Activity"
          value={deal.lastActivity.toLocaleDateString()}
          icon={<TrendingUp className="w-4 h-4" />}
        />
      </PreviewSection>

      {/* Facilities */}
      {deal.facilities && deal.facilities.length > 0 && (
        <PreviewSection title={`Facilities (${deal.facilities.length})`}>
          <div className="space-y-2">
            {deal.facilities.map((facility) => (
              <a
                key={facility.id}
                href={`/app/facilities/${facility.id}`}
                className="flex items-center justify-between p-3 bg-[var(--gray-50)] rounded-lg hover:bg-[var(--gray-100)] transition-colors"
              >
                <span className="text-sm font-medium text-[var(--color-text-primary)]">
                  {facility.name}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)]" />
              </a>
            ))}
          </div>
        </PreviewSection>
      )}

      {/* Notes */}
      {deal.notes && (
        <PreviewSection title="Notes">
          <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">
            {deal.notes}
          </p>
        </PreviewSection>
      )}
    </div>
  );
}
