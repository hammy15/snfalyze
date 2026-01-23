'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  Settings,
  RotateCcw,
  Save,
  Download,
  Upload,
  Check,
  ChevronDown,
  ChevronRight,
  History,
  Lightbulb,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

// ============================================================================
// Types
// ============================================================================

export interface ParameterGroup {
  id: string;
  name: string;
  description?: string;
  parameters: Parameter[];
}

export interface Parameter {
  id: string;
  path: string;
  name: string;
  description?: string;
  type: 'number' | 'percent' | 'currency' | 'boolean' | 'select';
  value: unknown;
  defaultValue: unknown;
  options?: { label: string; value: unknown }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

export interface Preset {
  id: string;
  name: string;
  description?: string;
  assetType?: string;
  isDefault?: boolean;
}

export interface AISuggestion {
  id: string;
  parameter: string;
  currentValue: unknown;
  suggestedValue: unknown;
  reason: string;
  confidence: number;
  impact?: string;
}

export interface ParameterAdjusterProps {
  groups: ParameterGroup[];
  presets?: Preset[];
  suggestions?: AISuggestion[];
  onParameterChange: (path: string, value: unknown) => void;
  onSave?: () => Promise<void>;
  onReset?: () => void;
  onPresetApply?: (presetId: string) => void;
  onPresetSave?: (name: string, description?: string) => Promise<void>;
  onSuggestionApply?: (suggestion: AISuggestion) => void;
  onSuggestionDismiss?: (suggestionId: string) => void;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatValue(value: unknown, type: string, unit?: string): string {
  if (value === null || value === undefined) return '—';

  switch (type) {
    case 'percent':
      return `${((value as number) * 100).toFixed(1)}%`;
    case 'currency':
      const num = value as number;
      if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
      if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
      return `$${num.toFixed(0)}`;
    case 'boolean':
      return value ? 'Yes' : 'No';
    case 'number':
      return `${(value as number).toLocaleString()}${unit ? ` ${unit}` : ''}`;
    default:
      return String(value);
  }
}

// ============================================================================
// Parameter Input Component
// ============================================================================

interface ParameterInputProps {
  parameter: Parameter;
  onChange: (value: unknown) => void;
}

function ParameterInput({ parameter, onChange }: ParameterInputProps) {
  const { type, value, defaultValue, options, min, max, step, unit } = parameter;

  const isModified = JSON.stringify(value) !== JSON.stringify(defaultValue);

  switch (type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm">{value ? 'Enabled' : 'Disabled'}</span>
          {isModified && <Badge variant="warning" className="text-xs">Modified</Badge>}
        </label>
      );

    case 'select':
      return (
        <div className="flex items-center gap-2">
          <select
            value={String(value)}
            onChange={(e) => {
              const opt = options?.find((o) => String(o.value) === e.target.value);
              onChange(opt?.value);
            }}
            className="flex-1 px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-900"
          >
            {options?.map((opt) => (
              <option key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </option>
            ))}
          </select>
          {isModified && <Badge variant="warning" className="text-xs">Modified</Badge>}
        </div>
      );

    case 'percent':
      return (
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={(min ?? 0) * 100}
            max={(max ?? 1) * 100}
            step={(step ?? 0.01) * 100}
            value={(value as number) * 100}
            onChange={(e) => onChange(parseFloat(e.target.value) / 100)}
            className="flex-1"
          />
          <span className="w-16 text-right text-sm font-medium tabular-nums">
            {((value as number) * 100).toFixed(1)}%
          </span>
          {isModified && <Badge variant="warning" className="text-xs">Modified</Badge>}
        </div>
      );

    case 'currency':
    case 'number':
    default:
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={value as number}
            onChange={(e) => onChange(parseFloat(e.target.value))}
            min={min}
            max={max}
            step={step}
            className="flex-1 px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-900 tabular-nums"
          />
          {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          {isModified && <Badge variant="warning" className="text-xs">Modified</Badge>}
        </div>
      );
  }
}

// ============================================================================
// Parameter Group Component
// ============================================================================

interface ParameterGroupComponentProps {
  group: ParameterGroup;
  onParameterChange: (path: string, value: unknown) => void;
}

function ParameterGroupComponent({ group, onParameterChange }: ParameterGroupComponentProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);

  const modifiedCount = group.parameters.filter(
    (p) => JSON.stringify(p.value) !== JSON.stringify(p.defaultValue)
  ).length;

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-medium">{group.name}</span>
          {modifiedCount > 0 && (
            <Badge variant="warning">{modifiedCount} modified</Badge>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {group.parameters.length} parameters
        </span>
      </button>

      {isExpanded && (
        <div className="p-3 pt-0 space-y-4">
          {group.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}

          {group.parameters.map((param) => (
            <div key={param.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{param.name}</label>
                <button
                  onClick={() => onParameterChange(param.path, param.defaultValue)}
                  className="text-xs text-primary hover:underline"
                  disabled={JSON.stringify(param.value) === JSON.stringify(param.defaultValue)}
                >
                  Reset
                </button>
              </div>
              {param.description && (
                <p className="text-xs text-muted-foreground">{param.description}</p>
              )}
              <ParameterInput
                parameter={param}
                onChange={(value) => onParameterChange(param.path, value)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AI Suggestions Panel
// ============================================================================

interface AISuggestionsPanelProps {
  suggestions: AISuggestion[];
  onApply: (suggestion: AISuggestion) => void;
  onDismiss: (id: string) => void;
}

function AISuggestionsPanel({ suggestions, onApply, onDismiss }: AISuggestionsPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <Card className="bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle className="text-base">AI Suggestions</CardTitle>
          <Badge variant="info">{suggestions.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="p-3 bg-white dark:bg-slate-900 rounded-lg border space-y-2"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-medium text-sm">{suggestion.parameter}</span>
                <Badge variant="secondary" className="ml-2">
                  {suggestion.confidence}% confident
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApply(suggestion)}
                >
                  <Check className="h-3 w-3 mr-1" />
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDismiss(suggestion.id)}
                >
                  Dismiss
                </Button>
              </div>
            </div>

            <div className="text-sm">
              <span className="text-muted-foreground">Current: </span>
              <span className="font-mono">{String(suggestion.currentValue)}</span>
              <span className="mx-2">→</span>
              <span className="text-primary font-mono">{String(suggestion.suggestedValue)}</span>
            </div>

            <p className="text-xs text-muted-foreground">{suggestion.reason}</p>

            {suggestion.impact && (
              <p className="text-xs text-emerald-600">Impact: {suggestion.impact}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ParameterAdjuster({
  groups,
  presets = [],
  suggestions = [],
  onParameterChange,
  onSave,
  onReset,
  onPresetApply,
  onPresetSave,
  onSuggestionApply,
  onSuggestionDismiss,
  className,
}: ParameterAdjusterProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [showPresetDialog, setShowPresetDialog] = React.useState(false);
  const [presetName, setPresetName] = React.useState('');
  const [presetDescription, setPresetDescription] = React.useState('');

  const totalModified = groups.reduce(
    (sum, g) =>
      sum +
      g.parameters.filter((p) => JSON.stringify(p.value) !== JSON.stringify(p.defaultValue)).length,
    0
  );

  const handleSave = async () => {
    if (!onSave) return;
    setIsSaving(true);
    try {
      await onSave();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreset = async () => {
    if (!onPresetSave || !presetName.trim()) return;
    setIsSaving(true);
    try {
      await onPresetSave(presetName.trim(), presetDescription.trim() || undefined);
      setShowPresetDialog(false);
      setPresetName('');
      setPresetDescription('');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Algorithm Parameters</h3>
          {totalModified > 0 && (
            <Badge variant="warning">{totalModified} modified</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Preset selector */}
          {presets.length > 0 && onPresetApply && (
            <select
              onChange={(e) => e.target.value && onPresetApply(e.target.value)}
              className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-slate-900"
              defaultValue=""
            >
              <option value="">Load Preset...</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} {preset.isDefault && '(Default)'}
                </option>
              ))}
            </select>
          )}

          {/* Action buttons */}
          {onReset && totalModified > 0 && (
            <Button variant="outline" size="sm" onClick={onReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          )}

          {onPresetSave && totalModified > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowPresetDialog(true)}>
              <Download className="h-4 w-4 mr-2" />
              Save as Preset
            </Button>
          )}

          {onSave && totalModified > 0 && (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* AI Suggestions */}
      {onSuggestionApply && onSuggestionDismiss && (
        <AISuggestionsPanel
          suggestions={suggestions}
          onApply={onSuggestionApply}
          onDismiss={onSuggestionDismiss}
        />
      )}

      {/* Parameter groups */}
      <div className="space-y-4">
        {groups.map((group) => (
          <ParameterGroupComponent
            key={group.id}
            group={group}
            onParameterChange={onParameterChange}
          />
        ))}
      </div>

      {/* Save Preset Dialog */}
      <Dialog open={showPresetDialog} onOpenChange={setShowPresetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Preset</DialogTitle>
            <DialogDescription>
              Save your current parameter configuration as a reusable preset.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Preset Name</label>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g., Conservative Valuation"
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                placeholder="Describe when to use this preset..."
                rows={3}
                className="w-full mt-1 px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPresetDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={!presetName.trim() || isSaving}>
              {isSaving ? 'Saving...' : 'Save Preset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ParameterAdjuster;
