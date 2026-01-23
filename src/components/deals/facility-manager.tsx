'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FacilityList, type FacilityData } from './facility-list';
import { PortfolioSummary } from './portfolio-summary';
import { FacilityTypeBreakdown } from './facility-type-breakdown';
import { CMSImportModal } from '@/components/cms/cms-import-modal';
import type { NormalizedProviderData } from '@/lib/cms';
import {
  Plus,
  Upload,
  X,
  Building2,
  Search,
  AlertCircle,
} from 'lucide-react';

interface FacilityManagerProps {
  dealId: string;
  facilities: FacilityData[];
  onAddFacility: (facility: Omit<FacilityData, 'id'>) => Promise<void>;
  onUpdateFacility: (id: string, facility: Partial<FacilityData>) => Promise<void>;
  onDeleteFacility: (id: string) => Promise<void>;
  onImportFromCMS?: (ccn: string) => Promise<FacilityData>;
  className?: string;
}

type ModalMode = 'closed' | 'add' | 'edit' | 'import';

export function FacilityManager({
  dealId,
  facilities,
  onAddFacility,
  onUpdateFacility,
  onDeleteFacility,
  onImportFromCMS,
  className,
}: FacilityManagerProps) {
  const [modalMode, setModalMode] = useState<ModalMode>('closed');
  const [editingFacility, setEditingFacility] = useState<FacilityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddClick = () => {
    setEditingFacility(null);
    setModalMode('add');
    setError(null);
  };

  const handleEditClick = (facility: FacilityData) => {
    setEditingFacility(facility);
    setModalMode('edit');
    setError(null);
  };

  const handleImportClick = () => {
    setModalMode('import');
    setError(null);
  };

  const handleCloseModal = () => {
    setModalMode('closed');
    setEditingFacility(null);
    setError(null);
  };

  const handleDeleteFacility = async (facility: FacilityData) => {
    if (!confirm(`Are you sure you want to remove ${facility.name} from this deal?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await onDeleteFacility(facility.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete facility');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFacility = async (data: Omit<FacilityData, 'id'>) => {
    setIsLoading(true);
    setError(null);

    try {
      if (modalMode === 'edit' && editingFacility) {
        await onUpdateFacility(editingFacility.id, data);
      } else {
        await onAddFacility(data);
      }
      handleCloseModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save facility');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            Facilities
          </h2>
          <p className="text-sm text-[var(--color-text-tertiary)]">
            {facilities.length} {facilities.length === 1 ? 'facility' : 'facilities'} in this deal
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onImportFromCMS && (
            <button
              type="button"
              onClick={handleImportClick}
              className="flex items-center gap-2 px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg hover:bg-[var(--gray-50)] transition-colors"
            >
              <Upload className="w-4 h-4" />
              Import from CMS
            </button>
          )}
          <button
            type="button"
            onClick={handleAddClick}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--accent-solid)] text-white rounded-lg hover:bg-[var(--accent-solid-hover)] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Facility
          </button>
        </div>
      </div>

      {/* Portfolio Summary */}
      {facilities.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PortfolioSummary facilities={facilities} />
          </div>
          <div className="card p-6">
            <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-4">
              Asset Mix
            </h3>
            <FacilityTypeBreakdown facilities={facilities} metric="beds" />
          </div>
        </div>
      )}

      {/* Facility List */}
      <div className="card p-6">
        <FacilityList
          facilities={facilities}
          onEditFacility={handleEditClick}
          onDeleteFacility={handleDeleteFacility}
        />
      </div>

      {/* Add/Edit Modal */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <FacilityFormModal
          facility={editingFacility}
          isLoading={isLoading}
          error={error}
          onSave={handleSaveFacility}
          onClose={handleCloseModal}
        />
      )}

      {/* CMS Import Modal */}
      <CMSImportModal
        open={modalMode === 'import'}
        onOpenChange={(open) => {
          if (!open) handleCloseModal();
        }}
        onImport={(provider) => {
          const facilityData: Omit<FacilityData, 'id'> = {
            name: provider.providerName,
            ccn: provider.ccn,
            address: provider.address || null,
            city: provider.city || null,
            state: provider.state || null,
            zipCode: provider.zipCode || null,
            assetType: 'SNF',
            licensedBeds: provider.numberOfBeds || null,
            certifiedBeds: provider.numberOfBeds || null,
            cmsRating: provider.overallRating || null,
            healthRating: provider.healthInspectionRating || null,
            staffingRating: provider.staffingRating || null,
            qualityRating: provider.qualityMeasureRating || null,
            isSff: provider.isSff || false,
          };
          onAddFacility(facilityData);
          handleCloseModal();
        }}
      />
    </div>
  );
}

// Facility Form Modal
interface FacilityFormModalProps {
  facility: FacilityData | null;
  isLoading: boolean;
  error: string | null;
  onSave: (data: Omit<FacilityData, 'id'>) => Promise<void>;
  onClose: () => void;
}

function FacilityFormModal({
  facility,
  isLoading,
  error,
  onSave,
  onClose,
}: FacilityFormModalProps) {
  const [formData, setFormData] = useState<Omit<FacilityData, 'id'>>({
    name: facility?.name || '',
    ccn: facility?.ccn || null,
    address: facility?.address || null,
    city: facility?.city || null,
    state: facility?.state || null,
    zipCode: facility?.zipCode || null,
    assetType: facility?.assetType || 'SNF',
    licensedBeds: facility?.licensedBeds || null,
    certifiedBeds: facility?.certifiedBeds || null,
    yearBuilt: facility?.yearBuilt || null,
    cmsRating: facility?.cmsRating || null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border-default)]">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
            {facility ? 'Edit Facility' : 'Add Facility'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--gray-100)] text-[var(--color-text-tertiary)]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Error display */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              placeholder="Enter facility name"
            />
          </div>

          {/* Asset Type */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Asset Type *
            </label>
            <select
              required
              value={formData.assetType}
              onChange={(e) => updateField('assetType', e.target.value as 'SNF' | 'ALF' | 'ILF')}
              className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
            >
              <option value="SNF">SNF - Skilled Nursing Facility</option>
              <option value="ALF">ALF - Assisted Living Facility</option>
              <option value="ILF">ILF - Independent Living Facility</option>
            </select>
          </div>

          {/* CCN */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              CMS Certification Number (CCN)
            </label>
            <input
              type="text"
              value={formData.ccn || ''}
              onChange={(e) => updateField('ccn', e.target.value || null)}
              className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              placeholder="e.g., 055001"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Address
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => updateField('address', e.target.value || null)}
              className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              placeholder="Street address"
            />
          </div>

          {/* City, State, Zip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-1">
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                City
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => updateField('city', e.target.value || null)}
                className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                State
              </label>
              <input
                type="text"
                maxLength={2}
                value={formData.state || ''}
                onChange={(e) => updateField('state', e.target.value.toUpperCase() || null)}
                className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                placeholder="CA"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Zip Code
              </label>
              <input
                type="text"
                value={formData.zipCode || ''}
                onChange={(e) => updateField('zipCode', e.target.value || null)}
                className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              />
            </div>
          </div>

          {/* Beds */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Licensed Beds
              </label>
              <input
                type="number"
                min={0}
                value={formData.licensedBeds ?? ''}
                onChange={(e) =>
                  updateField('licensedBeds', e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
                Certified Beds
              </label>
              <input
                type="number"
                min={0}
                value={formData.certifiedBeds ?? ''}
                onChange={(e) =>
                  updateField('certifiedBeds', e.target.value ? parseInt(e.target.value) : null)
                }
                className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              />
            </div>
          </div>

          {/* Year Built */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Year Built
            </label>
            <input
              type="number"
              min={1900}
              max={new Date().getFullYear()}
              value={formData.yearBuilt ?? ''}
              onChange={(e) =>
                updateField('yearBuilt', e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full px-3 py-2 border border-[var(--color-border-default)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
              placeholder="e.g., 1995"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--color-border-default)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--gray-50)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.name}
              className={cn(
                'px-4 py-2 text-sm bg-[var(--accent-solid)] text-white rounded-lg transition-colors',
                'hover:bg-[var(--accent-solid-hover)]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isLoading ? 'Saving...' : facility ? 'Save Changes' : 'Add Facility'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
