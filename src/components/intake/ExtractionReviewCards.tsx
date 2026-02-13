'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Building2,
  MapPin,
  BedDouble,
  Star,
  Shield,
  Pencil,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface ExtractedFacility {
  name: string;
  ccn?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  assetType: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE';
  licensedBeds?: number;
  certifiedBeds?: number;
  yearBuilt?: number;
  confidence: number;
  cmsRating?: number;
  isSff?: boolean;
}

interface FileResult {
  filename: string;
  documentType: string;
  summary: string;
  keyFindings: string[];
  confidence: number;
}

interface ExtractionReviewCardsProps {
  facilities: ExtractedFacility[];
  files: FileResult[];
  onFacilitiesChange: (facilities: ExtractedFacility[]) => void;
  dealName: string;
  onDealNameChange: (name: string) => void;
  assetType: string;
  onAssetTypeChange: (type: 'SNF' | 'ALF' | 'ILF' | 'HOSPICE') => void;
}

const ASSET_TYPES = [
  { value: 'SNF', label: 'Skilled Nursing', color: 'bg-primary-500' },
  { value: 'ALF', label: 'Assisted Living', color: 'bg-accent-500' },
  { value: 'ILF', label: 'Independent Living', color: 'bg-blue-500' },
  { value: 'HOSPICE', label: 'Hospice', color: 'bg-purple-500' },
] as const;

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : confidence >= 50
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', color)}>
      {confidence}% confident
    </span>
  );
}

function FacilityCard({
  facility,
  index,
  onUpdate,
  onRemove,
}: {
  facility: ExtractedFacility;
  index: number;
  onUpdate: (updated: ExtractedFacility) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(facility);

  const assetConfig = ASSET_TYPES.find((t) => t.value === facility.assetType);

  const saveEdit = () => {
    onUpdate({ ...draft, confidence: Math.max(draft.confidence, 80) });
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(facility);
    setEditing(false);
  };

  return (
    <Card className="neu-card overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardContent className="p-0">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-surface-100 dark:border-surface-800">
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', assetConfig?.color || 'bg-surface-400')}>
            <Building2 className="w-5 h-5 text-white" />
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full text-sm font-semibold bg-transparent border-b border-primary-500 outline-none text-surface-900 dark:text-surface-50"
              />
            ) : (
              <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-50 truncate">
                {facility.name}
              </h3>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium', assetConfig?.color, 'text-white')}>
                {facility.assetType}
              </span>
              {facility.state && (
                <span className="text-xs text-surface-500 flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" />
                  {facility.state}
                </span>
              )}
              <ConfidenceBadge confidence={facility.confidence} />
            </div>
          </div>

          <div className="flex items-center gap-1">
            {editing ? (
              <>
                <Button variant="ghost" size="sm" onClick={saveEdit}>
                  <Check className="w-4 h-4 text-emerald-500" />
                </Button>
                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                  <X className="w-4 h-4 text-red-500" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onRemove}>
                  <X className="w-3.5 h-3.5 text-red-500" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 p-4">
          <div className="text-center">
            <BedDouble className="w-4 h-4 mx-auto text-surface-400 mb-1" />
            {editing ? (
              <input
                type="number"
                value={draft.licensedBeds || ''}
                onChange={(e) => setDraft({ ...draft, licensedBeds: parseInt(e.target.value) || undefined })}
                className="w-full text-center text-sm font-semibold bg-transparent border-b border-primary-500 outline-none"
                placeholder="—"
              />
            ) : (
              <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
                {facility.licensedBeds || '—'}
              </p>
            )}
            <p className="text-[10px] text-surface-500">Beds</p>
          </div>
          <div className="text-center">
            <Star className="w-4 h-4 mx-auto text-amber-400 mb-1" />
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              {facility.cmsRating ? `${facility.cmsRating}/5` : '—'}
            </p>
            <p className="text-[10px] text-surface-500">CMS Rating</p>
          </div>
          <div className="text-center">
            <Shield className="w-4 h-4 mx-auto text-surface-400 mb-1" />
            <p className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              {facility.ccn || '—'}
            </p>
            <p className="text-[10px] text-surface-500">CCN</p>
          </div>
        </div>

        {/* SFF Warning */}
        {facility.isSff && (
          <div className="mx-4 mb-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-700 dark:text-red-400 font-medium">
              Special Focus Facility — enhanced scrutiny
            </span>
          </div>
        )}

        {/* Expand for editing details */}
        {editing && (
          <div className="px-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider">CCN</label>
                <input
                  type="text"
                  value={draft.ccn || ''}
                  onChange={(e) => setDraft({ ...draft, ccn: e.target.value })}
                  className="w-full text-sm bg-surface-50 dark:bg-surface-800 rounded px-2 py-1 border border-surface-200 dark:border-surface-700"
                  placeholder="XX-XXXX"
                />
              </div>
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider">Asset Type</label>
                <select
                  value={draft.assetType}
                  onChange={(e) => setDraft({ ...draft, assetType: e.target.value as any })}
                  className="w-full text-sm bg-surface-50 dark:bg-surface-800 rounded px-2 py-1 border border-surface-200 dark:border-surface-700"
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={draft.city || ''}
                  onChange={(e) => setDraft({ ...draft, city: e.target.value })}
                  className="w-full text-sm bg-surface-50 dark:bg-surface-800 rounded px-2 py-1 border border-surface-200 dark:border-surface-700"
                />
              </div>
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider">State</label>
                <input
                  type="text"
                  value={draft.state || ''}
                  onChange={(e) => setDraft({ ...draft, state: e.target.value.toUpperCase().slice(0, 2) })}
                  className="w-full text-sm bg-surface-50 dark:bg-surface-800 rounded px-2 py-1 border border-surface-200 dark:border-surface-700"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-[10px] text-surface-500 uppercase tracking-wider">ZIP</label>
                <input
                  type="text"
                  value={draft.zipCode || ''}
                  onChange={(e) => setDraft({ ...draft, zipCode: e.target.value })}
                  className="w-full text-sm bg-surface-50 dark:bg-surface-800 rounded px-2 py-1 border border-surface-200 dark:border-surface-700"
                />
              </div>
            </div>
          </div>
        )}

        {/* Low confidence warning */}
        {facility.confidence < 50 && !editing && (
          <div className="px-4 pb-3">
            <button
              onClick={() => setEditing(true)}
              className="w-full py-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors font-medium"
            >
              Low confidence — click to review and correct
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ExtractionReviewCards({
  facilities,
  files,
  onFacilitiesChange,
  dealName,
  onDealNameChange,
  assetType,
  onAssetTypeChange,
}: ExtractionReviewCardsProps) {
  const [showFiles, setShowFiles] = useState(false);
  const [editingName, setEditingName] = useState(false);

  const updateFacility = (index: number, updated: ExtractedFacility) => {
    const next = [...facilities];
    next[index] = updated;
    onFacilitiesChange(next);
  };

  const removeFacility = (index: number) => {
    onFacilitiesChange(facilities.filter((_, i) => i !== index));
  };

  const addBlankFacility = () => {
    onFacilitiesChange([
      ...facilities,
      {
        name: 'New Facility',
        assetType: assetType as any,
        confidence: 100,
      },
    ]);
  };

  // Group facilities by state
  const byState = facilities.reduce(
    (acc, f) => {
      const key = f.state || 'Unknown';
      if (!acc[key]) acc[key] = [];
      acc[key].push(f);
      return acc;
    },
    {} as Record<string, ExtractedFacility[]>
  );

  return (
    <div className="space-y-6">
      {/* Deal Header */}
      <div className="neu-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <label className="text-xs text-surface-500 uppercase tracking-wider mb-1 block">Deal Name</label>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={dealName}
                  onChange={(e) => onDealNameChange(e.target.value)}
                  className="text-xl font-bold bg-transparent border-b-2 border-primary-500 outline-none text-surface-900 dark:text-surface-50 w-full"
                  autoFocus
                  onBlur={() => setEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                />
              </div>
            ) : (
              <h1
                className="text-xl font-bold text-surface-900 dark:text-surface-50 cursor-pointer hover:text-primary-500 transition-colors"
                onClick={() => setEditingName(true)}
              >
                {dealName}
                <Pencil className="w-3.5 h-3.5 inline ml-2 opacity-30" />
              </h1>
            )}
          </div>

          <div>
            <label className="text-xs text-surface-500 uppercase tracking-wider mb-1 block">Primary Type</label>
            <div className="flex gap-1">
              {ASSET_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => onAssetTypeChange(t.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                    assetType === t.value
                      ? cn(t.color, 'text-white shadow-md')
                      : 'bg-surface-100 dark:bg-surface-800 text-surface-500 hover:text-surface-700'
                  )}
                >
                  {t.value}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">{facilities.length}</span>
            <span className="text-xs text-surface-500">Facilities</span>
          </div>
          <div className="flex items-center gap-2">
            <BedDouble className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              {facilities.reduce((sum, f) => sum + (f.licensedBeds || 0), 0)}
            </span>
            <span className="text-xs text-surface-500">Total Beds</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-500" />
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
              {Object.keys(byState).length}
            </span>
            <span className="text-xs text-surface-500">States</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">{files.length}</span>
            <span className="text-xs text-surface-500">Documents</span>
          </div>
        </div>
      </div>

      {/* Facilities by State */}
      {Object.entries(byState).map(([state, stateFacilities]) => (
        <div key={state}>
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-surface-400" />
            <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">
              {state === 'Unknown' ? 'State Unknown' : state}
            </h3>
            <span className="text-xs text-surface-400">({stateFacilities.length})</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stateFacilities.map((facility) => {
              const globalIndex = facilities.indexOf(facility);
              return (
                <FacilityCard
                  key={globalIndex}
                  facility={facility}
                  index={globalIndex}
                  onUpdate={(updated) => updateFacility(globalIndex, updated)}
                  onRemove={() => removeFacility(globalIndex)}
                />
              );
            })}
          </div>
        </div>
      ))}

      {/* Add facility button */}
      <button
        onClick={addBlankFacility}
        className="w-full py-4 border-2 border-dashed border-surface-300 dark:border-surface-600 rounded-xl text-sm font-medium text-surface-500 hover:text-primary-500 hover:border-primary-400 transition-all"
      >
        + Add Another Facility
      </button>

      {/* Uploaded Files Section */}
      <div>
        <button
          onClick={() => setShowFiles(!showFiles)}
          className="flex items-center gap-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Uploaded Documents ({files.length})
          {showFiles ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showFiles && (
          <div className="mt-3 space-y-2">
            {files.map((file, i) => (
              <div key={i} className="neu-card p-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-surface-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-surface-50 truncate">
                      {file.filename}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5">
                      {file.documentType.replace(/_/g, ' ')} · {file.confidence}% confidence
                    </p>
                    {file.summary && (
                      <p className="text-xs text-surface-600 dark:text-surface-400 mt-2 line-clamp-2">
                        {file.summary}
                      </p>
                    )}
                    {file.keyFindings.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {file.keyFindings.slice(0, 3).map((finding, j) => (
                          <span
                            key={j}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                          >
                            {finding.length > 50 ? finding.slice(0, 50) + '...' : finding}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
