'use client';

import { useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  DEFAULT_ALGORITHM_SETTINGS,
  validateSettings,
  type AlgorithmSettings,
  type AssetType,
  ASSET_TYPES,
  type CapRateBaseSettings,
  type PricePerBedBaseSettings,
  type DCFBaseSettings,
  type NOIMultipleBaseSettings,
} from '@/lib/admin/algorithm-settings';
import {
  Save,
  RotateCcw,
  Download,
  Upload,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Settings,
  Calculator,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  MapPin,
  FileSpreadsheet,
  Palette,
  Building2,
  Percent,
  Activity,
  Target,
  Info,
  Home,
  Users,
  Heart,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Shield,
  Crown,
  Loader2,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/card';

// =============================================================================
// SETTING INPUT COMPONENTS
// =============================================================================

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: 'number' | 'percent' | 'currency' | 'multiplier';
  description?: string;
  className?: string;
  compact?: boolean;
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  format = 'number',
  description,
  className,
  compact = false,
}: NumberInputProps) {
  const displayValue = format === 'percent' ? value * 100 : value;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value);
    if (!isNaN(rawValue)) {
      const actualValue = format === 'percent' ? rawValue / 100 : rawValue;
      onChange(actualValue);
    }
  };

  const formatDisplay = (val: number) => {
    switch (format) {
      case 'percent':
        return `${(val * 100).toFixed(2)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      case 'multiplier':
        return `${val.toFixed(2)}x`;
      default:
        return val.toLocaleString();
    }
  };

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[var(--color-text-secondary)]">{label}</label>
        </div>
        <input
          type="number"
          value={displayValue.toFixed(format === 'percent' ? 2 : step < 1 ? 2 : 0)}
          onChange={handleChange}
          min={format === 'percent' && min !== undefined ? min * 100 : min}
          max={format === 'percent' && max !== undefined ? max * 100 : max}
          step={format === 'percent' ? step * 100 : step}
          className="w-full px-2 py-1.5 text-xs border border-[var(--color-border-default)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)] focus:border-transparent"
        />
      </div>
    );
  }

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>
        <span className="text-xs text-[var(--color-text-tertiary)]">{formatDisplay(value)}</span>
      </div>
      <input
        type="number"
        value={displayValue}
        onChange={handleChange}
        min={format === 'percent' && min !== undefined ? min * 100 : min}
        max={format === 'percent' && max !== undefined ? max * 100 : max}
        step={format === 'percent' ? step * 100 : step}
        className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)] focus:border-transparent"
      />
      {description && <p className="text-xs text-[var(--color-text-tertiary)]">{description}</p>}
    </div>
  );
}

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  format?: 'number' | 'percent' | 'currency';
  description?: string;
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.01,
  format = 'number',
  description,
}: SliderInputProps) {
  const displayValue = format === 'percent' ? value * 100 : value;
  const displayMin = format === 'percent' ? min * 100 : min;
  const displayMax = format === 'percent' ? max * 100 : max;
  const displayStep = format === 'percent' ? step * 100 : step;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = parseFloat(e.target.value);
    const actualValue = format === 'percent' ? rawValue / 100 : rawValue;
    onChange(actualValue);
  };

  const formatDisplay = (val: number) => {
    switch (format) {
      case 'percent':
        return `${(val * 100).toFixed(1)}%`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>
        <span className="text-sm font-mono text-[var(--color-text-secondary)]">
          {formatDisplay(value)}
        </span>
      </div>
      <input
        type="range"
        value={displayValue}
        onChange={handleChange}
        min={displayMin}
        max={displayMax}
        step={displayStep}
        className="w-full h-2 bg-[var(--gray-200)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-solid)]"
      />
      <div className="flex justify-between text-xs text-[var(--color-text-tertiary)]">
        <span>{formatDisplay(min)}</span>
        <span>{formatDisplay(max)}</span>
      </div>
      {description && <p className="text-xs text-[var(--color-text-tertiary)]">{description}</p>}
    </div>
  );
}

interface ToggleInputProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  description?: string;
}

function ToggleInput({ label, value, onChange, description }: ToggleInputProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <label className="text-sm font-medium text-[var(--color-text-primary)]">{label}</label>
        {description && <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
          value ? 'bg-[var(--accent-solid)]' : 'bg-[var(--gray-300)]'
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
            value ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}

// =============================================================================
// ASSET TYPE SELECTOR
// =============================================================================

interface AssetTypeTabsProps {
  activeType: AssetType;
  onChange: (type: AssetType) => void;
  enabledTypes: { SNF: boolean; ALF: boolean; ILF: boolean };
}

function AssetTypeTabs({ activeType, onChange, enabledTypes }: AssetTypeTabsProps) {
  const typeIcons: Record<AssetType, React.ReactNode> = {
    SNF: <Heart className="w-3.5 h-3.5" />,
    ALF: <Users className="w-3.5 h-3.5" />,
    ILF: <Home className="w-3.5 h-3.5" />,
  };

  const typeLabels: Record<AssetType, string> = {
    SNF: 'Skilled Nursing',
    ALF: 'Assisted Living',
    ILF: 'Independent Living',
  };

  return (
    <div className="flex gap-1 p-1 bg-[var(--gray-100)] rounded-lg w-fit">
      {ASSET_TYPES.map((type) => (
        <button
          key={type}
          type="button"
          onClick={() => onChange(type)}
          disabled={!enabledTypes[type]}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all',
            activeType === type
              ? 'bg-white text-[var(--color-text-primary)] shadow-sm'
              : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            !enabledTypes[type] && 'opacity-40 cursor-not-allowed'
          )}
        >
          {typeIcons[type]}
          {type}
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// SECTION COMPONENTS
// =============================================================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, description, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-[var(--gray-50)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-bg)] text-[var(--accent-solid)]">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[var(--color-text-primary)]">{title}</h3>
            {description && (
              <p className="text-sm text-[var(--color-text-tertiary)]">{description}</p>
            )}
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-[var(--color-text-tertiary)]" />
        ) : (
          <ChevronRight className="w-5 h-5 text-[var(--color-text-tertiary)]" />
        )}
      </button>
      {isOpen && <div className="border-t border-[var(--color-border-default)] p-6">{children}</div>}
    </div>
  );
}

interface SubSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  info?: string;
}

function SubSection({ title, children, className, info }: SubSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
        <h4 className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
          {title}
        </h4>
        {info && (
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-[var(--color-text-tertiary)] cursor-help" />
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block z-10">
              <div className="bg-[var(--gray-900)] text-white text-xs rounded px-2 py-1 max-w-xs whitespace-normal">
                {info}
              </div>
            </div>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// CAP RATE ADJUSTMENTS GRID
// =============================================================================

interface AdjustmentsGridProps<T extends Record<string, number>> {
  title: string;
  adjustments: T;
  labels: Record<keyof T, string>;
  onChange: (key: keyof T, value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: 'percent' | 'currency' | 'multiplier';
  info?: string;
}

function AdjustmentsGrid<T extends Record<string, number>>({
  title,
  adjustments,
  labels,
  onChange,
  min = -0.05,
  max = 0.05,
  step = 0.0025,
  format = 'percent',
  info,
}: AdjustmentsGridProps<T>) {
  const keys = Object.keys(labels) as Array<keyof T>;
  const cols = Math.min(keys.length, 6);

  return (
    <SubSection title={title} info={info}>
      <div className={cn('grid gap-3', `grid-cols-${Math.min(cols, 3)} sm:grid-cols-${Math.min(cols, 4)} md:grid-cols-${cols}`)}>
        {keys.map((key) => (
          <NumberInput
            key={String(key)}
            label={labels[key]}
            value={adjustments[key]}
            onChange={(v) => onChange(key, v)}
            min={min}
            max={max}
            step={step}
            format={format}
            compact
          />
        ))}
      </div>
    </SubSection>
  );
}

// =============================================================================
// MAIN ADMIN PAGE
// =============================================================================

// God Mode Password (from environment variable)
const GOD_MODE_PASSWORD = process.env.NEXT_PUBLIC_APP_PASSWORD || '';

export default function AdminPage() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Settings state
  const [settings, setSettings] = useState<AlgorithmSettings>(DEFAULT_ALGORITHM_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState<AlgorithmSettings>(DEFAULT_ALGORITHM_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<string>('valuation');
  const [activeAssetType, setActiveAssetType] = useState<AssetType>('SNF');

  // Handle login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError('');

    // Verify password
    if (password === GOD_MODE_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      setLoginError('Invalid password. Access denied.');
    }
    setIsLoggingIn(false);
  };

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900">
        <Card variant="default" className="w-full max-w-md p-8">
          <div className="text-center mb-8">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20 mb-4">
              <Shield className="w-12 h-12 text-primary-500" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white flex items-center justify-center gap-2">
              Super Admin Access
              <Crown className="w-6 h-6 text-amber-500" />
            </h1>
            <p className="text-surface-500 mt-2">Enter your credentials to access God Mode</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="Enter super admin password"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-800 text-surface-900 dark:text-white placeholder-surface-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {loginError && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <X className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isLoggingIn || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Unlock className="w-5 h-5" />
                  Access God Mode
                </>
              )}
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-surface-200 dark:border-surface-700">
            <p className="text-xs text-center text-surface-400">
              This area is restricted to super administrators only.
              <br />
              All actions are logged for security purposes.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Track changes
  useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    setHasChanges(changed);

    // Validate
    const { errors } = validateSettings(settings);
    setValidationErrors(errors);
  }, [settings, originalSettings]);

  // Load settings on mount (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          headers: {
            'x-admin-password': GOD_MODE_PASSWORD,
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setSettings(data.data);
            setOriginalSettings(data.data);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, [isAuthenticated]);

  // Helper to update cap rate settings for current asset type
  const updateCapRateForAssetType = useCallback(
    (updates: Partial<CapRateBaseSettings>) => {
      setSettings((prev) => ({
        ...prev,
        valuation: {
          ...prev.valuation,
          capRate: {
            ...prev.valuation.capRate,
            byAssetType: {
              ...prev.valuation.capRate.byAssetType,
              [activeAssetType]: {
                ...prev.valuation.capRate.byAssetType[activeAssetType],
                ...updates,
              },
            },
          },
        },
      }));
    },
    [activeAssetType]
  );

  // Helper to update price per bed settings for current asset type
  const updatePricePerBedForAssetType = useCallback(
    (updates: Partial<PricePerBedBaseSettings>) => {
      setSettings((prev) => ({
        ...prev,
        valuation: {
          ...prev.valuation,
          pricePerBed: {
            ...prev.valuation.pricePerBed,
            byAssetType: {
              ...prev.valuation.pricePerBed.byAssetType,
              [activeAssetType]: {
                ...prev.valuation.pricePerBed.byAssetType[activeAssetType],
                ...updates,
              },
            },
          },
        },
      }));
    },
    [activeAssetType]
  );

  // Helper to update DCF settings for current asset type
  const updateDCFForAssetType = useCallback(
    (updates: Partial<DCFBaseSettings>) => {
      setSettings((prev) => ({
        ...prev,
        valuation: {
          ...prev.valuation,
          dcf: {
            ...prev.valuation.dcf,
            byAssetType: {
              ...prev.valuation.dcf.byAssetType,
              [activeAssetType]: {
                ...prev.valuation.dcf.byAssetType[activeAssetType],
                ...updates,
              },
            },
          },
        },
      }));
    },
    [activeAssetType]
  );

  // Helper to update NOI Multiple settings for current asset type
  const updateNOIMultipleForAssetType = useCallback(
    (updates: Partial<NOIMultipleBaseSettings>) => {
      setSettings((prev) => ({
        ...prev,
        valuation: {
          ...prev.valuation,
          noiMultiple: {
            ...prev.valuation.noiMultiple,
            byAssetType: {
              ...prev.valuation.noiMultiple.byAssetType,
              [activeAssetType]: {
                ...prev.valuation.noiMultiple.byAssetType[activeAssetType],
                ...updates,
              },
            },
          },
        },
      }));
    },
    [activeAssetType]
  );

  // Update global cap rate settings
  const updateCapRateGlobal = useCallback(
    (updates: Partial<typeof settings.valuation.capRate>) => {
      setSettings((prev) => ({
        ...prev,
        valuation: {
          ...prev.valuation,
          capRate: { ...prev.valuation.capRate, ...updates },
        },
      }));
    },
    []
  );

  // Update active asset types
  const updateActiveAssetTypes = useCallback((type: AssetType, enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      activeAssetTypes: {
        ...prev.activeAssetTypes,
        [type]: enabled,
      },
    }));
  }, []);

  // Actions
  const handleSave = useCallback(async () => {
    if (validationErrors.length > 0) return;

    setSaveStatus('saving');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': GOD_MODE_PASSWORD,
        },
        body: JSON.stringify({ settings, changedBy: 'super_admin' }),
      });

      if (res.ok) {
        setOriginalSettings(settings);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Save failed');
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [settings, validationErrors]);

  const handleReset = useCallback(() => {
    setSettings(originalSettings);
  }, [originalSettings]);

  const handleResetToDefaults = useCallback(() => {
    if (confirm('Reset all settings to factory defaults? This cannot be undone.')) {
      setSettings(DEFAULT_ALGORITHM_SETTINGS);
      setOriginalSettings(DEFAULT_ALGORITHM_SETTINGS);
    }
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `algorithm-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [settings]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const imported = JSON.parse(text) as AlgorithmSettings;
        const { valid, errors } = validateSettings(imported);
        if (valid) {
          setSettings(imported);
        } else {
          alert(`Invalid settings file:\n${errors.join('\n')}`);
        }
      } catch (error) {
        alert('Failed to parse settings file');
      }
    };
    input.click();
  }, []);

  const tabs = [
    { id: 'valuation', label: 'Valuation', icon: <Calculator className="w-4 h-4" /> },
    { id: 'financial', label: 'Financial', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'risk', label: 'Risk', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'market', label: 'Market', icon: <MapPin className="w-4 h-4" /> },
    { id: 'proforma', label: 'Proforma', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'display', label: 'Display', icon: <Palette className="w-4 h-4" /> },
  ];

  // Get current asset type settings
  const currentCapRate = settings.valuation.capRate.byAssetType[activeAssetType];
  const currentPricePerBed = settings.valuation.pricePerBed.byAssetType[activeAssetType];
  const currentDCF = settings.valuation.dcf.byAssetType[activeAssetType];
  const currentNOIMultiple = settings.valuation.noiMultiple.byAssetType[activeAssetType];

  return (
    <div className="min-h-screen bg-[var(--color-bg-subtle)]">
      {/* Header */}
      <div className="bg-white border-b border-[var(--color-border-default)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                  Super Admin Settings
                  <span className="px-2 py-0.5 text-xs font-medium bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full">
                    GOD MODE
                  </span>
                </h1>
                <p className="text-sm text-[var(--color-text-tertiary)]">
                  Full control over all algorithms, AI, and system configurations
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Validation Status */}
              {validationErrors.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-700 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}
                </div>
              )}

              {/* Change indicator */}
              {hasChanges && (
                <span className="text-sm text-[var(--color-text-tertiary)]">Unsaved changes</span>
              )}

              {/* Import/Export */}
              <button
                type="button"
                onClick={handleImport}
                className="p-2 hover:bg-[var(--gray-100)] rounded-lg transition-colors"
                title="Import settings"
              >
                <Upload className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
              <button
                type="button"
                onClick={handleExport}
                className="p-2 hover:bg-[var(--gray-100)] rounded-lg transition-colors"
                title="Export settings"
              >
                <Download className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>

              {/* Reset */}
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--gray-100)] rounded-lg transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>

              {/* Save */}
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || validationErrors.length > 0 || saveStatus === 'saving'}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
                  saveStatus === 'saved'
                    ? 'bg-green-500 text-white'
                    : saveStatus === 'error'
                      ? 'bg-red-500 text-white'
                      : 'bg-[var(--accent-solid)] text-white hover:bg-[var(--accent-solid-hover)] disabled:opacity-50'
                )}
              >
                {saveStatus === 'saving' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : saveStatus === 'saved' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Saved!
                  </>
                ) : saveStatus === 'error' ? (
                  <>
                    <AlertCircle className="w-4 h-4" />
                    Error
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Asset Type Toggles */}
          <div className="mt-4 flex items-center gap-6 p-4 bg-[var(--gray-50)] rounded-xl">
            <span className="text-sm font-medium text-[var(--color-text-secondary)]">Active Asset Types:</span>
            {ASSET_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.activeAssetTypes[type]}
                  onChange={(e) => updateActiveAssetTypes(type, e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-border-default)] text-[var(--accent-solid)] focus:ring-[var(--accent-solid)]"
                />
                <span className={cn(
                  'text-sm font-medium',
                  settings.activeAssetTypes[type] ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'
                )}>
                  {type === 'SNF' ? 'Skilled Nursing (SNF)' : type === 'ALF' ? 'Assisted Living (ALF)' : 'Independent Living (ILF)'}
                </span>
              </label>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg border-b-2 transition-colors',
                  activeTab === tab.id
                    ? 'bg-white border-[var(--accent-solid)] text-[var(--accent-solid)]'
                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--gray-50)]'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-800">Validation Errors</h3>
                <ul className="mt-2 text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Valuation Tab */}
        {activeTab === 'valuation' && (
          <div className="space-y-6">
            {/* Cap Rate Settings */}
            <Section
              title="Cap Rate Valuation"
              icon={<Percent className="w-5 h-5" />}
              description="Configure cap rate calculation parameters and adjustments by asset type"
              defaultOpen
            >
              <div className="space-y-8">
                {/* Asset Type Selector */}
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                  <div className="text-sm text-[var(--color-text-tertiary)]">
                    Currently editing: <span className="font-semibold text-[var(--color-text-primary)]">{activeAssetType}</span>
                  </div>
                </div>

                {/* Base Cap Rate */}
                <SubSection title="Base Cap Rate" info="Starting cap rate before any adjustments are applied">
                  <div className="max-w-xs">
                    <SliderInput
                      label={`${activeAssetType} Base Cap Rate`}
                      value={currentCapRate.baseRate}
                      onChange={(v) => updateCapRateForAssetType({ baseRate: v })}
                      min={0.04}
                      max={0.18}
                      step={0.0025}
                      format="percent"
                    />
                  </div>
                </SubSection>

                {/* Quality Adjustments */}
                <AdjustmentsGrid
                  title="Quality Rating Adjustments (CMS Stars)"
                  adjustments={currentCapRate.qualityAdjustments}
                  labels={{
                    fiveStar: '5 Star',
                    fourStar: '4 Star',
                    threeStar: '3 Star',
                    twoStar: '2 Star',
                    oneStar: '1 Star',
                    unrated: 'Unrated',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      qualityAdjustments: { ...currentCapRate.qualityAdjustments, [key]: value },
                    })
                  }
                  info="Negative values = lower cap rate = higher value"
                />

                {/* Size Adjustments */}
                <AdjustmentsGrid
                  title="Size Adjustments (Bed Count)"
                  adjustments={currentCapRate.sizeAdjustments}
                  labels={{
                    under30Beds: '<30 Beds',
                    beds30to50: '30-50',
                    beds50to75: '50-75',
                    beds75to100: '75-100',
                    beds100to125: '100-125',
                    beds125to150: '125-150',
                    beds150to200: '150-200',
                    beds200to300: '200-300',
                    over300Beds: '>300 Beds',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      sizeAdjustments: { ...currentCapRate.sizeAdjustments, [key]: value },
                    })
                  }
                  info="Larger facilities typically command lower cap rates"
                />

                {/* Age Adjustments */}
                <AdjustmentsGrid
                  title="Age Adjustments (Building Age)"
                  adjustments={currentCapRate.ageAdjustments}
                  labels={{
                    under3Years: '<3 Years',
                    years3to5: '3-5 Years',
                    years5to10: '5-10 Years',
                    years10to15: '10-15 Years',
                    years15to20: '15-20 Years',
                    years20to25: '20-25 Years',
                    years25to30: '25-30 Years',
                    years30to40: '30-40 Years',
                    over40Years: '>40 Years',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      ageAdjustments: { ...currentCapRate.ageAdjustments, [key]: value },
                    })
                  }
                  info="Newer buildings typically have lower cap rates"
                />

                {/* Occupancy Adjustments */}
                <AdjustmentsGrid
                  title="Occupancy Adjustments"
                  adjustments={currentCapRate.occupancyAdjustments}
                  labels={{
                    above98: '>98%',
                    percent95to98: '95-98%',
                    percent92to95: '92-95%',
                    percent90to92: '90-92%',
                    percent87to90: '87-90%',
                    percent85to87: '85-87%',
                    percent82to85: '82-85%',
                    percent80to82: '80-82%',
                    percent75to80: '75-80%',
                    percent70to75: '70-75%',
                    below70: '<70%',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      occupancyAdjustments: { ...currentCapRate.occupancyAdjustments, [key]: value },
                    })
                  }
                  info="Higher occupancy = lower risk = lower cap rate"
                />

                {/* Payer Mix Adjustments */}
                <AdjustmentsGrid
                  title="Payer Mix Adjustments"
                  adjustments={currentCapRate.payerMixAdjustments}
                  labels={{
                    highMedicare: 'High Medicare (>30%)',
                    moderateMedicare: 'Mod Medicare (20-30%)',
                    lowMedicare: 'Low Medicare (<20%)',
                    highMedicaid: 'High Medicaid (>70%)',
                    moderateMedicaid: 'Mod Medicaid (50-70%)',
                    lowMedicaid: 'Low Medicaid (<50%)',
                    highPrivatePay: 'High Private (>30%)',
                    moderatePrivatePay: 'Mod Private (15-30%)',
                    lowPrivatePay: 'Low Private (<15%)',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      payerMixAdjustments: { ...currentCapRate.payerMixAdjustments, [key]: value },
                    })
                  }
                  info="Higher Medicare/Private Pay typically reduces cap rate"
                />

                {/* Acuity Adjustments */}
                <AdjustmentsGrid
                  title="Acuity Adjustments (Case Mix Index)"
                  adjustments={currentCapRate.acuityAdjustments}
                  labels={{
                    highAcuity: 'High (CMI >1.2)',
                    moderateAcuity: 'Moderate (1.0-1.2)',
                    lowAcuity: 'Low (CMI <1.0)',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      acuityAdjustments: { ...currentCapRate.acuityAdjustments, [key]: value },
                    })
                  }
                  info="Higher acuity often means higher reimbursement"
                />

                {/* Location Adjustments */}
                <AdjustmentsGrid
                  title="Location Type Adjustments"
                  adjustments={currentCapRate.locationAdjustments}
                  labels={{
                    urban: 'Urban',
                    suburban: 'Suburban',
                    rural: 'Rural',
                    frontier: 'Frontier',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      locationAdjustments: { ...currentCapRate.locationAdjustments, [key]: value },
                    })
                  }
                  info="Urban/suburban locations typically have lower cap rates"
                />

                {/* Ownership Adjustments */}
                <AdjustmentsGrid
                  title="Ownership Type Adjustments"
                  adjustments={currentCapRate.ownershipAdjustments}
                  labels={{
                    forProfit: 'For-Profit',
                    nonprofit: 'Non-Profit',
                    government: 'Government',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      ownershipAdjustments: { ...currentCapRate.ownershipAdjustments, [key]: value },
                    })
                  }
                />

                {/* Chain Adjustments */}
                <AdjustmentsGrid
                  title="Chain Affiliation Adjustments"
                  adjustments={currentCapRate.chainAdjustments}
                  labels={{
                    majorChain: 'Major Chain (>50)',
                    regionalChain: 'Regional (10-50)',
                    smallChain: 'Small Chain (2-10)',
                    independent: 'Independent',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      chainAdjustments: { ...currentCapRate.chainAdjustments, [key]: value },
                    })
                  }
                  info="Larger chains may have operational advantages"
                />

                {/* Market Conditions */}
                <AdjustmentsGrid
                  title="Market Condition Adjustments"
                  adjustments={currentCapRate.marketConditions}
                  labels={{
                    veryHot: 'Very Hot',
                    hot: 'Hot',
                    balanced: 'Balanced',
                    cool: 'Cool',
                    veryCool: 'Very Cool',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      marketConditions: { ...currentCapRate.marketConditions, [key]: value },
                    })
                  }
                  info="Hot markets drive cap rates down"
                />

                {/* Competition Adjustments */}
                <AdjustmentsGrid
                  title="Competition Density Adjustments"
                  adjustments={currentCapRate.competitionAdjustments}
                  labels={{
                    lowCompetition: 'Low (<85% Mkt Occ)',
                    moderateCompetition: 'Moderate (85-92%)',
                    highCompetition: 'High (92-97%)',
                    veryHighCompetition: 'Very High (>97%)',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      competitionAdjustments: { ...currentCapRate.competitionAdjustments, [key]: value },
                    })
                  }
                />

                {/* Renovation Adjustments */}
                <AdjustmentsGrid
                  title="Renovation Status Adjustments"
                  adjustments={currentCapRate.renovationAdjustments}
                  labels={{
                    recentlyRenovated: 'Recent (<3 yrs)',
                    modernized: 'Modernized (3-10)',
                    needsUpdates: 'Needs Updates (10-20)',
                    significantDeferred: 'Deferred (>20 yrs)',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      renovationAdjustments: { ...currentCapRate.renovationAdjustments, [key]: value },
                    })
                  }
                />

                {/* Regulatory Adjustments */}
                <AdjustmentsGrid
                  title="Regulatory Compliance Adjustments"
                  adjustments={currentCapRate.regulatoryAdjustments}
                  labels={{
                    excellentCompliance: 'Excellent (0 def)',
                    goodCompliance: 'Good (<5 def)',
                    moderateCompliance: 'Moderate (5-10)',
                    poorCompliance: 'Poor (10-20)',
                    severeIssues: 'Severe (>20 or SFF)',
                  }}
                  onChange={(key, value) =>
                    updateCapRateForAssetType({
                      regulatoryAdjustments: { ...currentCapRate.regulatoryAdjustments, [key]: value },
                    })
                  }
                  info="More deficiencies = higher risk = higher cap rate"
                />

                {/* Regional Adjustments (Global) */}
                <SubSection title="Regional Adjustments (All Asset Types)" info="Applied universally across asset types">
                  <div className="grid grid-cols-5 gap-3">
                    {(['west', 'midwest', 'northeast', 'southeast', 'southwest'] as const).map((region) => (
                      <NumberInput
                        key={region}
                        label={region.charAt(0).toUpperCase() + region.slice(1)}
                        value={settings.valuation.capRate.regionalAdjustments[region]}
                        onChange={(v) =>
                          updateCapRateGlobal({
                            regionalAdjustments: {
                              ...settings.valuation.capRate.regionalAdjustments,
                              [region]: v,
                            },
                          })
                        }
                        min={-0.03}
                        max={0.03}
                        step={0.0025}
                        format="percent"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>

                {/* Cap Rate Limits */}
                <SubSection title="Cap Rate Limits">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NumberInput
                      label="Global Minimum"
                      value={settings.valuation.capRate.globalMinCapRate}
                      onChange={(v) => updateCapRateGlobal({ globalMinCapRate: v })}
                      min={0.02}
                      max={0.08}
                      step={0.005}
                      format="percent"
                    />
                    <NumberInput
                      label="Global Maximum"
                      value={settings.valuation.capRate.globalMaxCapRate}
                      onChange={(v) => updateCapRateGlobal({ globalMaxCapRate: v })}
                      min={0.12}
                      max={0.30}
                      step={0.01}
                      format="percent"
                    />
                    <NumberInput
                      label={`${activeAssetType} Min`}
                      value={settings.valuation.capRate.limits[activeAssetType].min}
                      onChange={(v) =>
                        updateCapRateGlobal({
                          limits: {
                            ...settings.valuation.capRate.limits,
                            [activeAssetType]: { ...settings.valuation.capRate.limits[activeAssetType], min: v },
                          },
                        })
                      }
                      min={0.03}
                      max={0.10}
                      step={0.005}
                      format="percent"
                    />
                    <NumberInput
                      label={`${activeAssetType} Max`}
                      value={settings.valuation.capRate.limits[activeAssetType].max}
                      onChange={(v) =>
                        updateCapRateGlobal({
                          limits: {
                            ...settings.valuation.capRate.limits,
                            [activeAssetType]: { ...settings.valuation.capRate.limits[activeAssetType], max: v },
                          },
                        })
                      }
                      min={0.10}
                      max={0.25}
                      step={0.01}
                      format="percent"
                    />
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Price Per Bed Settings */}
            <Section
              title="Price Per Bed Valuation"
              icon={<Building2 className="w-5 h-5" />}
              description="Configure price per bed calculation parameters by asset type"
            >
              <div className="space-y-8">
                {/* Asset Type Selector */}
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                {/* Base Price Per Bed */}
                <SubSection title="Base Price Per Bed">
                  <div className="max-w-xs">
                    <NumberInput
                      label={`${activeAssetType} Base Price`}
                      value={currentPricePerBed.basePrice}
                      onChange={(v) => updatePricePerBedForAssetType({ basePrice: v })}
                      min={20000}
                      max={300000}
                      step={5000}
                      format="currency"
                    />
                  </div>
                </SubSection>

                {/* Quality Multipliers */}
                <AdjustmentsGrid
                  title="Quality Rating Multipliers"
                  adjustments={currentPricePerBed.qualityMultipliers}
                  labels={{
                    fiveStar: '5 Star',
                    fourStar: '4 Star',
                    threeStar: '3 Star',
                    twoStar: '2 Star',
                    oneStar: '1 Star',
                    unrated: 'Unrated',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      qualityMultipliers: { ...currentPricePerBed.qualityMultipliers, [key]: value },
                    })
                  }
                  min={0.5}
                  max={1.5}
                  step={0.05}
                  format="multiplier"
                  info=">1.0 increases price, <1.0 decreases price"
                />

                {/* Size Adjustments */}
                <AdjustmentsGrid
                  title="Size Adjustments (Per-Bed Adjustment)"
                  adjustments={currentPricePerBed.sizeAdjustments}
                  labels={{
                    under30Beds: '<30 Beds',
                    beds30to50: '30-50',
                    beds50to75: '50-75',
                    beds75to100: '75-100',
                    beds100to125: '100-125',
                    beds125to150: '125-150',
                    beds150to200: '150-200',
                    beds200to300: '200-300',
                    over300Beds: '>300 Beds',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      sizeAdjustments: { ...currentPricePerBed.sizeAdjustments, [key]: value },
                    })
                  }
                  min={-30000}
                  max={30000}
                  step={1000}
                  format="currency"
                  info="Dollar adjustment added to base price per bed"
                />

                {/* Age Adjustments */}
                <AdjustmentsGrid
                  title="Age Adjustments (Per-Bed Adjustment)"
                  adjustments={currentPricePerBed.ageAdjustments}
                  labels={{
                    under3Years: '<3 Years',
                    years3to5: '3-5 Years',
                    years5to10: '5-10 Years',
                    years10to15: '10-15 Years',
                    years15to20: '15-20 Years',
                    years20to25: '20-25 Years',
                    years25to30: '25-30 Years',
                    years30to40: '30-40 Years',
                    over40Years: '>40 Years',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      ageAdjustments: { ...currentPricePerBed.ageAdjustments, [key]: value },
                    })
                  }
                  min={-50000}
                  max={50000}
                  step={1000}
                  format="currency"
                />

                {/* Condition Multipliers */}
                <AdjustmentsGrid
                  title="Condition Multipliers"
                  adjustments={currentPricePerBed.conditionMultipliers}
                  labels={{
                    excellent: 'Excellent',
                    good: 'Good',
                    fair: 'Fair',
                    poor: 'Poor',
                    critical: 'Critical',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      conditionMultipliers: { ...currentPricePerBed.conditionMultipliers, [key]: value },
                    })
                  }
                  min={0.3}
                  max={1.5}
                  step={0.05}
                  format="multiplier"
                />

                {/* Construction Adjustments */}
                <AdjustmentsGrid
                  title="Construction Type Multipliers"
                  adjustments={currentPricePerBed.constructionAdjustments}
                  labels={{
                    newConstruction: 'New Build',
                    majorRenovation: 'Major Reno',
                    minorRenovation: 'Minor Reno',
                    originalCondition: 'Original',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      constructionAdjustments: { ...currentPricePerBed.constructionAdjustments, [key]: value },
                    })
                  }
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  format="multiplier"
                />

                {/* Configuration Adjustments */}
                <AdjustmentsGrid
                  title="Building Configuration Multipliers"
                  adjustments={currentPricePerBed.configurationAdjustments}
                  labels={{
                    singleStory: 'Single Story',
                    multiStory: 'Multi-Story',
                    campus: 'Campus',
                    mixed: 'Mixed',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      configurationAdjustments: { ...currentPricePerBed.configurationAdjustments, [key]: value },
                    })
                  }
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  format="multiplier"
                />

                {/* Room Type Adjustments */}
                <AdjustmentsGrid
                  title="Room Type Multipliers"
                  adjustments={currentPricePerBed.roomTypeAdjustments}
                  labels={{
                    allPrivate: 'All Private',
                    mostlyPrivate: 'Mostly Private',
                    mixed: 'Mixed',
                    mostlySemiPrivate: 'Mostly Semi',
                    allSemiPrivate: 'All Semi',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      roomTypeAdjustments: { ...currentPricePerBed.roomTypeAdjustments, [key]: value },
                    })
                  }
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  format="multiplier"
                />

                {/* Amenity Adjustments */}
                <AdjustmentsGrid
                  title="Amenity Level Multipliers"
                  adjustments={currentPricePerBed.amenityAdjustments}
                  labels={{
                    premium: 'Premium',
                    standard: 'Standard',
                    basic: 'Basic',
                    minimal: 'Minimal',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      amenityAdjustments: { ...currentPricePerBed.amenityAdjustments, [key]: value },
                    })
                  }
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  format="multiplier"
                />

                {/* Location Adjustments */}
                <AdjustmentsGrid
                  title="Location Quality Multipliers"
                  adjustments={currentPricePerBed.locationAdjustments}
                  labels={{
                    primeLocation: 'Prime',
                    goodLocation: 'Good',
                    averageLocation: 'Average',
                    challengingLocation: 'Challenging',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      locationAdjustments: { ...currentPricePerBed.locationAdjustments, [key]: value },
                    })
                  }
                  min={0.7}
                  max={1.4}
                  step={0.05}
                  format="multiplier"
                />

                {/* Licensure Adjustments */}
                <AdjustmentsGrid
                  title="Licensure Status Multipliers"
                  adjustments={currentPricePerBed.licensureAdjustments}
                  labels={{
                    fullyLicensed: 'Fully Licensed',
                    provisionalLicense: 'Provisional',
                    limitedLicense: 'Limited',
                  }}
                  onChange={(key, value) =>
                    updatePricePerBedForAssetType({
                      licensureAdjustments: { ...currentPricePerBed.licensureAdjustments, [key]: value },
                    })
                  }
                  min={0.6}
                  max={1.1}
                  step={0.05}
                  format="multiplier"
                />
              </div>
            </Section>

            {/* DCF Settings */}
            <Section
              title="Discounted Cash Flow (DCF)"
              icon={<TrendingUp className="w-5 h-5" />}
              description="Configure DCF projection and discount rate parameters by asset type"
            >
              <div className="space-y-8">
                {/* Asset Type Selector */}
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                {/* Projection Settings */}
                <SubSection title="Projection Settings">
                  <div className="grid grid-cols-3 gap-4">
                    <NumberInput
                      label="Projection Years"
                      value={settings.valuation.dcf.projectionYears}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          valuation: { ...prev.valuation, dcf: { ...prev.valuation.dcf, projectionYears: v } },
                        }))
                      }
                      min={3}
                      max={15}
                      step={1}
                    />
                    <NumberInput
                      label="Max Projection Years"
                      value={settings.valuation.dcf.maxProjectionYears}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          valuation: { ...prev.valuation, dcf: { ...prev.valuation.dcf, maxProjectionYears: v } },
                        }))
                      }
                      min={5}
                      max={30}
                      step={1}
                    />
                    <ToggleInput
                      label="Monthly Granularity"
                      value={settings.valuation.dcf.monthlyGranularity}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          valuation: { ...prev.valuation, dcf: { ...prev.valuation.dcf, monthlyGranularity: v } },
                        }))
                      }
                      description="Use monthly vs annual projections"
                    />
                  </div>
                </SubSection>

                {/* Discount Rates */}
                <SubSection title={`Discount Rates (${activeAssetType})`}>
                  <div className="grid grid-cols-3 gap-4">
                    <NumberInput
                      label="Base WACC"
                      value={currentDCF.discountRates.baseWACC}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          discountRates: { ...currentDCF.discountRates, baseWACC: v },
                        })
                      }
                      min={0.05}
                      max={0.20}
                      step={0.005}
                      format="percent"
                    />
                    <NumberInput
                      label="Risk-Free Rate"
                      value={currentDCF.discountRates.riskFreeRate}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          discountRates: { ...currentDCF.discountRates, riskFreeRate: v },
                        })
                      }
                      min={0.01}
                      max={0.10}
                      step={0.0025}
                      format="percent"
                    />
                    <NumberInput
                      label="Equity Risk Premium"
                      value={currentDCF.discountRates.equityRiskPremium}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          discountRates: { ...currentDCF.discountRates, equityRiskPremium: v },
                        })
                      }
                      min={0.02}
                      max={0.12}
                      step={0.005}
                      format="percent"
                    />
                    <NumberInput
                      label="Size Risk Premium"
                      value={currentDCF.discountRates.sizeRiskPremium}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          discountRates: { ...currentDCF.discountRates, sizeRiskPremium: v },
                        })
                      }
                      min={0}
                      max={0.05}
                      step={0.0025}
                      format="percent"
                    />
                    <NumberInput
                      label="Industry Risk Premium"
                      value={currentDCF.discountRates.industryRiskPremium}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          discountRates: { ...currentDCF.discountRates, industryRiskPremium: v },
                        })
                      }
                      min={0}
                      max={0.05}
                      step={0.0025}
                      format="percent"
                    />
                    <NumberInput
                      label="Company-Specific Risk"
                      value={currentDCF.discountRates.companySpecificRisk}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          discountRates: { ...currentDCF.discountRates, companySpecificRisk: v },
                        })
                      }
                      min={0}
                      max={0.10}
                      step={0.005}
                      format="percent"
                    />
                  </div>
                </SubSection>

                {/* Terminal Value */}
                <SubSection title={`Terminal Value Assumptions (${activeAssetType})`}>
                  <div className="grid grid-cols-3 gap-4">
                    <NumberInput
                      label="Exit Cap Rate"
                      value={currentDCF.terminalValue.exitCapRate}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          terminalValue: { ...currentDCF.terminalValue, exitCapRate: v },
                        })
                      }
                      min={0.05}
                      max={0.18}
                      step={0.0025}
                      format="percent"
                    />
                    <NumberInput
                      label="Perpetual Growth Rate"
                      value={currentDCF.terminalValue.perpetualGrowthRate}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          terminalValue: { ...currentDCF.terminalValue, perpetualGrowthRate: v },
                        })
                      }
                      min={0}
                      max={0.05}
                      step={0.0025}
                      format="percent"
                    />
                    <ToggleInput
                      label="Use Exit Cap Rate"
                      value={currentDCF.terminalValue.useExitCapRate}
                      onChange={(v) =>
                        updateDCFForAssetType({
                          terminalValue: { ...currentDCF.terminalValue, useExitCapRate: v },
                        })
                      }
                      description="vs. perpetual growth method"
                    />
                  </div>
                </SubSection>

                {/* Revenue Growth */}
                <SubSection title={`Revenue Growth by Payer (${activeAssetType})`}>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {Object.entries(currentDCF.revenueGrowth).map(([key, value]) => (
                      <NumberInput
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          updateDCFForAssetType({
                            revenueGrowth: { ...currentDCF.revenueGrowth, [key]: v },
                          })
                        }
                        min={-0.05}
                        max={0.15}
                        step={0.005}
                        format="percent"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>

                {/* Expense Growth */}
                <SubSection title={`Expense Growth Rates (${activeAssetType})`}>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                    {Object.entries(currentDCF.expenseGrowth).map(([key, value]) => (
                      <NumberInput
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          updateDCFForAssetType({
                            expenseGrowth: { ...currentDCF.expenseGrowth, [key]: v },
                          })
                        }
                        min={0}
                        max={0.15}
                        step={0.005}
                        format="percent"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* NOI Multiple Settings */}
            <Section
              title="NOI Multiple Valuation"
              icon={<Activity className="w-5 h-5" />}
              description="Configure NOI multiple calculation parameters by asset type"
            >
              <div className="space-y-8">
                {/* Asset Type Selector */}
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                {/* Base Multiple */}
                <SubSection title="Base NOI Multiple">
                  <div className="max-w-xs">
                    <NumberInput
                      label={`${activeAssetType} Base Multiple`}
                      value={currentNOIMultiple.baseMultiple}
                      onChange={(v) => updateNOIMultipleForAssetType({ baseMultiple: v })}
                      min={5}
                      max={20}
                      step={0.5}
                      format="multiplier"
                    />
                  </div>
                </SubSection>

                {/* Quality Adjustments */}
                <AdjustmentsGrid
                  title="Quality Rating Adjustments"
                  adjustments={currentNOIMultiple.qualityAdjustments}
                  labels={{
                    fiveStar: '5 Star',
                    fourStar: '4 Star',
                    threeStar: '3 Star',
                    twoStar: '2 Star',
                    oneStar: '1 Star',
                    unrated: 'Unrated',
                  }}
                  onChange={(key, value) =>
                    updateNOIMultipleForAssetType({
                      qualityAdjustments: { ...currentNOIMultiple.qualityAdjustments, [key]: value },
                    })
                  }
                  min={-3}
                  max={3}
                  step={0.25}
                  format="multiplier"
                  info="Added to/subtracted from base multiple"
                />

                {/* Growth Adjustments */}
                <AdjustmentsGrid
                  title="NOI Growth Profile Adjustments"
                  adjustments={currentNOIMultiple.growthAdjustments}
                  labels={{
                    rapidGrowth: 'Rapid (>7%)',
                    strongGrowth: 'Strong (5-7%)',
                    moderateGrowth: 'Moderate (3-5%)',
                    slowGrowth: 'Slow (1-3%)',
                    stable: 'Stable (0-1%)',
                    declining: 'Declining (<0%)',
                  }}
                  onChange={(key, value) =>
                    updateNOIMultipleForAssetType({
                      growthAdjustments: { ...currentNOIMultiple.growthAdjustments, [key]: value },
                    })
                  }
                  min={-3}
                  max={3}
                  step={0.25}
                  format="multiplier"
                />

                {/* Stability Adjustments */}
                <AdjustmentsGrid
                  title="NOI Stability Adjustments"
                  adjustments={currentNOIMultiple.stabilityAdjustments}
                  labels={{
                    veryStable: 'Very Stable (<5%)',
                    stable: 'Stable (5-10%)',
                    moderate: 'Moderate (10-15%)',
                    volatile: 'Volatile (15-25%)',
                    veryVolatile: 'Very Volatile (>25%)',
                  }}
                  onChange={(key, value) =>
                    updateNOIMultipleForAssetType({
                      stabilityAdjustments: { ...currentNOIMultiple.stabilityAdjustments, [key]: value },
                    })
                  }
                  min={-3}
                  max={3}
                  step={0.25}
                  format="multiplier"
                  info="Based on historical NOI variance"
                />

                {/* Market Position Adjustments */}
                <AdjustmentsGrid
                  title="Market Position Adjustments"
                  adjustments={currentNOIMultiple.marketPositionAdjustments}
                  labels={{
                    marketLeader: 'Market Leader',
                    strongPosition: 'Strong Position',
                    averagePosition: 'Average',
                    weakPosition: 'Weak Position',
                    struggling: 'Struggling',
                  }}
                  onChange={(key, value) =>
                    updateNOIMultipleForAssetType({
                      marketPositionAdjustments: { ...currentNOIMultiple.marketPositionAdjustments, [key]: value },
                    })
                  }
                  min={-3}
                  max={3}
                  step={0.25}
                  format="multiplier"
                />

                {/* Multiple Limits */}
                <SubSection title="NOI Multiple Limits">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <NumberInput
                      label="Global Minimum"
                      value={settings.valuation.noiMultiple.minMultiple}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          valuation: {
                            ...prev.valuation,
                            noiMultiple: { ...prev.valuation.noiMultiple, minMultiple: v },
                          },
                        }))
                      }
                      min={3}
                      max={8}
                      step={0.5}
                      format="multiplier"
                    />
                    <NumberInput
                      label="Global Maximum"
                      value={settings.valuation.noiMultiple.maxMultiple}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          valuation: {
                            ...prev.valuation,
                            noiMultiple: { ...prev.valuation.noiMultiple, maxMultiple: v },
                          },
                        }))
                      }
                      min={12}
                      max={25}
                      step={0.5}
                      format="multiplier"
                    />
                    <NumberInput
                      label={`${activeAssetType} Min`}
                      value={settings.valuation.noiMultiple.limits[activeAssetType].min}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          valuation: {
                            ...prev.valuation,
                            noiMultiple: {
                              ...prev.valuation.noiMultiple,
                              limits: {
                                ...prev.valuation.noiMultiple.limits,
                                [activeAssetType]: { ...prev.valuation.noiMultiple.limits[activeAssetType], min: v },
                              },
                            },
                          },
                        }))
                      }
                      min={4}
                      max={10}
                      step={0.5}
                      format="multiplier"
                    />
                    <NumberInput
                      label={`${activeAssetType} Max`}
                      value={settings.valuation.noiMultiple.limits[activeAssetType].max}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          valuation: {
                            ...prev.valuation,
                            noiMultiple: {
                              ...prev.valuation.noiMultiple,
                              limits: {
                                ...prev.valuation.noiMultiple.limits,
                                [activeAssetType]: { ...prev.valuation.noiMultiple.limits[activeAssetType], max: v },
                              },
                            },
                          },
                        }))
                      }
                      min={12}
                      max={22}
                      step={0.5}
                      format="multiplier"
                    />
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Method Weights */}
            <Section
              title="Valuation Method Weights"
              icon={<Target className="w-5 h-5" />}
              description="Configure how different valuation methods are weighted for final value reconciliation"
            >
              <div className="space-y-8">
                {/* Asset Type Selector */}
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                <SubSection title={`Method Weights for ${activeAssetType}`} info="Weights should sum to 1.0 (100%)">
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {Object.entries(settings.valuation.methodWeights[activeAssetType]).map(([method, weight]) => (
                      <NumberInput
                        key={method}
                        label={method.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={weight}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            valuation: {
                              ...prev.valuation,
                              methodWeights: {
                                ...prev.valuation.methodWeights,
                                [activeAssetType]: {
                                  ...prev.valuation.methodWeights[activeAssetType],
                                  [method]: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0}
                        max={1}
                        step={0.05}
                        format="percent"
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && (
          <div className="space-y-6">
            {/* Revenue Settings */}
            <Section
              title="Revenue Settings"
              icon={<DollarSign className="w-5 h-5" />}
              description="Configure daily rates, payer mix benchmarks, and revenue parameters by asset type"
              defaultOpen
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                {/* Daily Rates */}
                <SubSection title={`Daily Rates (${activeAssetType})`} info="Per diem rates by payer type">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(settings.financial.revenue[activeAssetType].dailyRates).map(([payer, rates]) => (
                      <div key={payer} className="space-y-2">
                        <label className="text-xs font-medium text-[var(--color-text-secondary)] capitalize">
                          {payer.replace(/([A-Z])/g, ' $1')}
                        </label>
                        <div className="grid grid-cols-3 gap-1">
                          <NumberInput
                            label="Low"
                            value={rates.low}
                            onChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                financial: {
                                  ...prev.financial,
                                  revenue: {
                                    ...prev.financial.revenue,
                                    [activeAssetType]: {
                                      ...prev.financial.revenue[activeAssetType],
                                      dailyRates: {
                                        ...prev.financial.revenue[activeAssetType].dailyRates,
                                        [payer]: { ...rates, low: v },
                                      },
                                    },
                                  },
                                },
                              }))
                            }
                            min={0}
                            max={1000}
                            step={5}
                            format="currency"
                            compact
                          />
                          <NumberInput
                            label="Mid"
                            value={rates.mid}
                            onChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                financial: {
                                  ...prev.financial,
                                  revenue: {
                                    ...prev.financial.revenue,
                                    [activeAssetType]: {
                                      ...prev.financial.revenue[activeAssetType],
                                      dailyRates: {
                                        ...prev.financial.revenue[activeAssetType].dailyRates,
                                        [payer]: { ...rates, mid: v },
                                      },
                                    },
                                  },
                                },
                              }))
                            }
                            min={0}
                            max={1000}
                            step={5}
                            format="currency"
                            compact
                          />
                          <NumberInput
                            label="High"
                            value={rates.high}
                            onChange={(v) =>
                              setSettings((prev) => ({
                                ...prev,
                                financial: {
                                  ...prev.financial,
                                  revenue: {
                                    ...prev.financial.revenue,
                                    [activeAssetType]: {
                                      ...prev.financial.revenue[activeAssetType],
                                      dailyRates: {
                                        ...prev.financial.revenue[activeAssetType].dailyRates,
                                        [payer]: { ...rates, high: v },
                                      },
                                    },
                                  },
                                },
                              }))
                            }
                            min={0}
                            max={1000}
                            step={5}
                            format="currency"
                            compact
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </SubSection>

                {/* Revenue Per Patient Day Benchmarks */}
                <SubSection title={`Revenue Per Patient Day Benchmarks (${activeAssetType})`}>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(settings.financial.revenue[activeAssetType].revenuePerPatientDay).map(([tier, value]) => (
                      <NumberInput
                        key={tier}
                        label={tier.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            financial: {
                              ...prev.financial,
                              revenue: {
                                ...prev.financial.revenue,
                                [activeAssetType]: {
                                  ...prev.financial.revenue[activeAssetType],
                                  revenuePerPatientDay: {
                                    ...prev.financial.revenue[activeAssetType].revenuePerPatientDay,
                                    [tier]: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={50}
                        max={700}
                        step={5}
                        format="currency"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Expense Settings */}
            <Section
              title="Expense Settings"
              icon={<TrendingUp className="w-5 h-5" />}
              description="Configure expense ratios and cost benchmarks by asset type"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                {/* Per Bed Expense Benchmarks */}
                <SubSection title={`Per Bed Expense Benchmarks (${activeAssetType})`}>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(settings.financial.expenses[activeAssetType].perBedExpenses).map(([tier, value]) => (
                      <NumberInput
                        key={tier}
                        label={tier.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            financial: {
                              ...prev.financial,
                              expenses: {
                                ...prev.financial.expenses,
                                [activeAssetType]: {
                                  ...prev.financial.expenses[activeAssetType],
                                  perBedExpenses: {
                                    ...prev.financial.expenses[activeAssetType].perBedExpenses,
                                    [tier]: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={20000}
                        max={150000}
                        step={1000}
                        format="currency"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>

                {/* Cost Per Patient Day Benchmarks */}
                <SubSection title={`Cost Per Patient Day Benchmarks (${activeAssetType})`}>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(settings.financial.expenses[activeAssetType].costPerPatientDay).map(([tier, value]) => (
                      <NumberInput
                        key={tier}
                        label={tier.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            financial: {
                              ...prev.financial,
                              expenses: {
                                ...prev.financial.expenses,
                                [activeAssetType]: {
                                  ...prev.financial.expenses[activeAssetType],
                                  costPerPatientDay: {
                                    ...prev.financial.expenses[activeAssetType].costPerPatientDay,
                                    [tier]: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={50}
                        max={500}
                        step={5}
                        format="currency"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Margin Benchmarks */}
            <Section
              title="Margin Benchmarks"
              icon={<Percent className="w-5 h-5" />}
              description="Configure margin thresholds for performance grading by asset type"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                {/* Operating Margin */}
                <SubSection title={`Operating Margin Thresholds (${activeAssetType})`}>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(settings.financial.margins[activeAssetType].operatingMargin).map(([tier, value]) => (
                      <NumberInput
                        key={tier}
                        label={tier.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            financial: {
                              ...prev.financial,
                              margins: {
                                ...prev.financial.margins,
                                [activeAssetType]: {
                                  ...prev.financial.margins[activeAssetType],
                                  operatingMargin: {
                                    ...prev.financial.margins[activeAssetType].operatingMargin,
                                    [tier]: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={-0.1}
                        max={0.5}
                        step={0.01}
                        format="percent"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>

                {/* EBITDAR Margin */}
                <SubSection title={`EBITDAR Margin Thresholds (${activeAssetType})`}>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(settings.financial.margins[activeAssetType].ebitdarMargin).map(([tier, value]) => (
                      <NumberInput
                        key={tier}
                        label={tier.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            financial: {
                              ...prev.financial,
                              margins: {
                                ...prev.financial.margins,
                                [activeAssetType]: {
                                  ...prev.financial.margins[activeAssetType],
                                  ebitdarMargin: {
                                    ...prev.financial.margins[activeAssetType].ebitdarMargin,
                                    [tier]: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={-0.1}
                        max={0.6}
                        step={0.01}
                        format="percent"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>

                {/* Net Margin */}
                <SubSection title={`Net Margin Thresholds (${activeAssetType})`}>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(settings.financial.margins[activeAssetType].netMargin).map(([tier, value]) => (
                      <NumberInput
                        key={tier}
                        label={tier.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={value}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            financial: {
                              ...prev.financial,
                              margins: {
                                ...prev.financial.margins,
                                [activeAssetType]: {
                                  ...prev.financial.margins[activeAssetType],
                                  netMargin: {
                                    ...prev.financial.margins[activeAssetType].netMargin,
                                    [tier]: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={-0.1}
                        max={0.35}
                        step={0.01}
                        format="percent"
                        compact
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Inflation Rates */}
            <Section
              title="Inflation & Growth Rates"
              icon={<TrendingUp className="w-5 h-5" />}
              description="Configure default inflation rates for various expense categories"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                  {Object.entries(settings.financial.inflationRates).map(([category, rate]) => (
                    <NumberInput
                      key={category}
                      label={category.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                      value={rate}
                      onChange={(v) =>
                        setSettings((prev) => ({
                          ...prev,
                          financial: {
                            ...prev.financial,
                            inflationRates: {
                              ...prev.financial.inflationRates,
                              [category]: v,
                            },
                          },
                        }))
                      }
                      min={0}
                      max={0.15}
                      step={0.005}
                      format="percent"
                    />
                  ))}
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Risk Tab */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* CMS Scoring Settings */}
            <Section
              title="CMS Quality Scoring"
              icon={<AlertTriangle className="w-5 h-5" />}
              description="Configure weights for CMS five-star rating calculations"
              defaultOpen
            >
              <div className="space-y-8">
                {/* Overall Rating Weights */}
                <SubSection title="Overall Rating Component Weights" info="Must sum to 100%">
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(settings.risk.cmsScoring.overallRatingWeights).map(([component, weight]) => (
                      <NumberInput
                        key={component}
                        label={component.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={weight}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            risk: {
                              ...prev.risk,
                              cmsScoring: {
                                ...prev.risk.cmsScoring,
                                overallRatingWeights: {
                                  ...prev.risk.cmsScoring.overallRatingWeights,
                                  [component]: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0}
                        max={1}
                        step={0.05}
                        format="percent"
                      />
                    ))}
                  </div>
                </SubSection>

                {/* SFF Handling */}
                <SubSection title="Special Focus Facility (SFF) Penalties" info="Points deducted for SFF status">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(settings.risk.cmsScoring.sffHandling).map(([type, penalty]) => (
                      <NumberInput
                        key={type}
                        label={type.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={penalty}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            risk: {
                              ...prev.risk,
                              cmsScoring: {
                                ...prev.risk.cmsScoring,
                                sffHandling: {
                                  ...prev.risk.cmsScoring.sffHandling,
                                  [type]: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0}
                        max={100}
                        step={5}
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Risk Category Weights */}
            <Section
              title="Risk Category Weights"
              icon={<Target className="w-5 h-5" />}
              description="Configure how different risk categories contribute to overall risk score"
            >
              <div className="space-y-4">
                <SubSection title="Category Weights" info="Must sum to 100%">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(settings.risk.riskScoring.categoryWeights).map(([category, weight]) => (
                      <NumberInput
                        key={category}
                        label={category.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={weight}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            risk: {
                              ...prev.risk,
                              riskScoring: {
                                ...prev.risk.riskScoring,
                                categoryWeights: {
                                  ...prev.risk.riskScoring.categoryWeights,
                                  [category]: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0}
                        max={0.5}
                        step={0.01}
                        format="percent"
                      />
                    ))}
                  </div>
                </SubSection>

                {/* Risk Score Thresholds */}
                <SubSection title="Risk Score Thresholds">
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-3">
                    {Object.entries(settings.risk.riskScoring.riskScoreThresholds).map(([level, threshold]) => (
                      <NumberInput
                        key={level}
                        label={level.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={threshold}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            risk: {
                              ...prev.risk,
                              riskScoring: {
                                ...prev.risk.riskScoring,
                                riskScoreThresholds: {
                                  ...prev.risk.riskScoring.riskScoreThresholds,
                                  [level]: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0}
                        max={100}
                        step={1}
                        compact
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Deal Breakers */}
            <Section
              title="Deal Breaker Thresholds"
              icon={<AlertCircle className="w-5 h-5" />}
              description="Configure automatic rejection criteria by asset type"
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <NumberInput
                    label="Min CMS Rating"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].minCMSRating}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                minCMSRating: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={0}
                    max={5}
                    step={1}
                  />
                  <NumberInput
                    label="Max Deficiencies"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].maxDeficiencies}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                maxDeficiencies: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={0}
                    max={50}
                    step={1}
                  />
                  <NumberInput
                    label="Min Occupancy"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].minOccupancy}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                minOccupancy: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={0.5}
                    max={0.95}
                    step={0.05}
                    format="percent"
                  />
                  <NumberInput
                    label="Max Agency Usage"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].maxAgencyUsage}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                maxAgencyUsage: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={0}
                    max={0.5}
                    step={0.05}
                    format="percent"
                  />
                  <NumberInput
                    label="Min Margin"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].minMargin}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                minMargin: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={-0.1}
                    max={0.2}
                    step={0.01}
                    format="percent"
                  />
                  <NumberInput
                    label="Min DSCR"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].minDSCR}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                minDSCR: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={0.8}
                    max={2}
                    step={0.05}
                    format="multiplier"
                  />
                  <NumberInput
                    label="Max Building Age"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].maxBuildingAge}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                maxBuildingAge: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={20}
                    max={75}
                    step={5}
                  />
                  <NumberInput
                    label="Min Beds"
                    value={settings.risk.dealBreakers.byAssetType[activeAssetType].minBeds}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        risk: {
                          ...prev.risk,
                          dealBreakers: {
                            ...prev.risk.dealBreakers,
                            byAssetType: {
                              ...prev.risk.dealBreakers.byAssetType,
                              [activeAssetType]: {
                                ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                                minBeds: v,
                              },
                            },
                          },
                        },
                      }))
                    }
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                <ToggleInput
                  label="Exclude SFF Facilities"
                  value={settings.risk.dealBreakers.byAssetType[activeAssetType].sffExclusion}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      risk: {
                        ...prev.risk,
                        dealBreakers: {
                          ...prev.risk.dealBreakers,
                          byAssetType: {
                            ...prev.risk.dealBreakers.byAssetType,
                            [activeAssetType]: {
                              ...prev.risk.dealBreakers.byAssetType[activeAssetType],
                              sffExclusion: v,
                            },
                          },
                        },
                      },
                    }))
                  }
                  description="Automatically reject Special Focus Facilities"
                />
              </div>
            </Section>
          </div>
        )}

        {/* Market Tab */}
        {activeTab === 'market' && (
          <div className="space-y-6">
            {/* Market Cap Rates by Region */}
            <Section
              title="Market Cap Rates by Region"
              icon={<MapPin className="w-5 h-5" />}
              description="Configure market cap rate ranges by geographic region and asset type"
              defaultOpen
            >
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <AssetTypeTabs
                    activeType={activeAssetType}
                    onChange={setActiveAssetType}
                    enabledTypes={settings.activeAssetTypes}
                  />
                </div>

                {(['west', 'midwest', 'northeast', 'southeast', 'southwest'] as const).map((region) => (
                  <SubSection key={region} title={region.charAt(0).toUpperCase() + region.slice(1)}>
                    <div className="grid grid-cols-3 gap-4">
                      <NumberInput
                        label="Minimum"
                        value={settings.market.marketCapRates[region][activeAssetType].min}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketCapRates: {
                                ...prev.market.marketCapRates,
                                [region]: {
                                  ...prev.market.marketCapRates[region],
                                  [activeAssetType]: {
                                    ...prev.market.marketCapRates[region][activeAssetType],
                                    min: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={0.04}
                        max={0.15}
                        step={0.005}
                        format="percent"
                      />
                      <NumberInput
                        label="Mid-Point"
                        value={settings.market.marketCapRates[region][activeAssetType].mid}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketCapRates: {
                                ...prev.market.marketCapRates,
                                [region]: {
                                  ...prev.market.marketCapRates[region],
                                  [activeAssetType]: {
                                    ...prev.market.marketCapRates[region][activeAssetType],
                                    mid: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={0.05}
                        max={0.18}
                        step={0.005}
                        format="percent"
                      />
                      <NumberInput
                        label="Maximum"
                        value={settings.market.marketCapRates[region][activeAssetType].max}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketCapRates: {
                                ...prev.market.marketCapRates,
                                [region]: {
                                  ...prev.market.marketCapRates[region],
                                  [activeAssetType]: {
                                    ...prev.market.marketCapRates[region][activeAssetType],
                                    max: v,
                                  },
                                },
                              },
                            },
                          }))
                        }
                        min={0.08}
                        max={0.25}
                        step={0.005}
                        format="percent"
                      />
                    </div>
                  </SubSection>
                ))}
              </div>
            </Section>

            {/* Market Growth Metrics */}
            <Section
              title="Market Growth Metrics by Region"
              icon={<TrendingUp className="w-5 h-5" />}
              description="Configure demographic and supply/demand growth rates"
            >
              <div className="space-y-8">
                {(['west', 'midwest', 'northeast', 'southeast', 'southwest'] as const).map((region) => (
                  <SubSection key={region} title={region.charAt(0).toUpperCase() + region.slice(1)}>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                      <NumberInput
                        label="65+ Pop Growth"
                        value={settings.market.marketGrowth[region].populationGrowth65Plus}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketGrowth: {
                                ...prev.market.marketGrowth,
                                [region]: {
                                  ...prev.market.marketGrowth[region],
                                  populationGrowth65Plus: v,
                                },
                              },
                            },
                          }))
                        }
                        min={-0.02}
                        max={0.08}
                        step={0.002}
                        format="percent"
                        compact
                      />
                      <NumberInput
                        label="85+ Pop Growth"
                        value={settings.market.marketGrowth[region].populationGrowth85Plus}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketGrowth: {
                                ...prev.market.marketGrowth,
                                [region]: {
                                  ...prev.market.marketGrowth[region],
                                  populationGrowth85Plus: v,
                                },
                              },
                            },
                          }))
                        }
                        min={-0.02}
                        max={0.10}
                        step={0.002}
                        format="percent"
                        compact
                      />
                      <NumberInput
                        label="Supply Growth"
                        value={settings.market.marketGrowth[region].supplyGrowthRate}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketGrowth: {
                                ...prev.market.marketGrowth,
                                [region]: {
                                  ...prev.market.marketGrowth[region],
                                  supplyGrowthRate: v,
                                },
                              },
                            },
                          }))
                        }
                        min={-0.05}
                        max={0.08}
                        step={0.002}
                        format="percent"
                        compact
                      />
                      <NumberInput
                        label="Demand Growth"
                        value={settings.market.marketGrowth[region].demandGrowthRate}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketGrowth: {
                                ...prev.market.marketGrowth,
                                [region]: {
                                  ...prev.market.marketGrowth[region],
                                  demandGrowthRate: v,
                                },
                              },
                            },
                          }))
                        }
                        min={-0.02}
                        max={0.08}
                        step={0.002}
                        format="percent"
                        compact
                      />
                      <NumberInput
                        label="Absorption Rate"
                        value={settings.market.marketGrowth[region].absorptionRate}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketGrowth: {
                                ...prev.market.marketGrowth,
                                [region]: {
                                  ...prev.market.marketGrowth[region],
                                  absorptionRate: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0.70}
                        max={1.0}
                        step={0.01}
                        format="percent"
                        compact
                      />
                      <NumberInput
                        label="Market Occ"
                        value={settings.market.marketGrowth[region].marketOccupancy}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            market: {
                              ...prev.market,
                              marketGrowth: {
                                ...prev.market.marketGrowth,
                                [region]: {
                                  ...prev.market.marketGrowth[region],
                                  marketOccupancy: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0.70}
                        max={0.98}
                        step={0.01}
                        format="percent"
                        compact
                      />
                    </div>
                  </SubSection>
                ))}
              </div>
            </Section>

            {/* Competition Settings */}
            <Section
              title="Competition Analysis Settings"
              icon={<Building2 className="w-5 h-5" />}
              description="Configure market radius and competition density thresholds"
            >
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <NumberInput
                    label="Primary Market Radius (mi)"
                    value={settings.market.competitionSettings.primaryMarketRadius}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        market: {
                          ...prev.market,
                          competitionSettings: {
                            ...prev.market.competitionSettings,
                            primaryMarketRadius: v,
                          },
                        },
                      }))
                    }
                    min={3}
                    max={25}
                    step={1}
                  />
                  <NumberInput
                    label="Secondary Radius (mi)"
                    value={settings.market.competitionSettings.secondaryMarketRadius}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        market: {
                          ...prev.market,
                          competitionSettings: {
                            ...prev.market.competitionSettings,
                            secondaryMarketRadius: v,
                          },
                        },
                      }))
                    }
                    min={10}
                    max={50}
                    step={5}
                  />
                  <NumberInput
                    label="Tertiary Radius (mi)"
                    value={settings.market.competitionSettings.tertiaryMarketRadius}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        market: {
                          ...prev.market,
                          competitionSettings: {
                            ...prev.market.competitionSettings,
                            tertiaryMarketRadius: v,
                          },
                        },
                      }))
                    }
                    min={20}
                    max={75}
                    step={5}
                  />
                  <NumberInput
                    label="Quality Competition Weight"
                    value={settings.market.competitionSettings.qualityCompetitionWeight}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        market: {
                          ...prev.market,
                          competitionSettings: {
                            ...prev.market.competitionSettings,
                            qualityCompetitionWeight: v,
                          },
                        },
                      }))
                    }
                    min={0}
                    max={0.5}
                    step={0.05}
                    format="percent"
                  />
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Proforma Tab */}
        {activeTab === 'proforma' && (
          <div className="space-y-6">
            {/* Scenario Defaults */}
            <Section
              title="Scenario Defaults"
              icon={<FileSpreadsheet className="w-5 h-5" />}
              description="Configure default assumptions for different proforma scenarios"
              defaultOpen
            >
              <div className="space-y-8">
                {(['baseline', 'upside', 'downside', 'turnaround'] as const).map((scenario) => (
                  <SubSection
                    key={scenario}
                    title={scenario.charAt(0).toUpperCase() + scenario.slice(1) + ' Scenario'}
                  >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <NumberInput
                        label="Occupancy Growth"
                        value={settings.proforma.scenarioDefaults[scenario].occupancyGrowth}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            proforma: {
                              ...prev.proforma,
                              scenarioDefaults: {
                                ...prev.proforma.scenarioDefaults,
                                [scenario]: {
                                  ...prev.proforma.scenarioDefaults[scenario],
                                  occupancyGrowth: v,
                                },
                              },
                            },
                          }))
                        }
                        min={-0.05}
                        max={0.10}
                        step={0.005}
                        format="percent"
                      />
                      <NumberInput
                        label="Revenue Growth"
                        value={settings.proforma.scenarioDefaults[scenario].revenueGrowth}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            proforma: {
                              ...prev.proforma,
                              scenarioDefaults: {
                                ...prev.proforma.scenarioDefaults,
                                [scenario]: {
                                  ...prev.proforma.scenarioDefaults[scenario],
                                  revenueGrowth: v,
                                },
                              },
                            },
                          }))
                        }
                        min={-0.03}
                        max={0.10}
                        step={0.005}
                        format="percent"
                      />
                      <NumberInput
                        label="Expense Growth"
                        value={settings.proforma.scenarioDefaults[scenario].expenseGrowth}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            proforma: {
                              ...prev.proforma,
                              scenarioDefaults: {
                                ...prev.proforma.scenarioDefaults,
                                [scenario]: {
                                  ...prev.proforma.scenarioDefaults[scenario],
                                  expenseGrowth: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0}
                        max={0.08}
                        step={0.005}
                        format="percent"
                      />
                      <NumberInput
                        label="CapEx % of Revenue"
                        value={settings.proforma.scenarioDefaults[scenario].capexPercent}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            proforma: {
                              ...prev.proforma,
                              scenarioDefaults: {
                                ...prev.proforma.scenarioDefaults,
                                [scenario]: {
                                  ...prev.proforma.scenarioDefaults[scenario],
                                  capexPercent: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0.01}
                        max={0.10}
                        step={0.005}
                        format="percent"
                      />
                    </div>
                  </SubSection>
                ))}
              </div>
            </Section>

            {/* Projection Settings */}
            <Section
              title="Projection Settings"
              icon={<Calculator className="w-5 h-5" />}
              description="Configure default projection horizons and granularity"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Default Years"
                  value={settings.proforma.projectionSettings.defaultYears}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        projectionSettings: {
                          ...prev.proforma.projectionSettings,
                          defaultYears: v,
                        },
                      },
                    }))
                  }
                  min={3}
                  max={15}
                  step={1}
                />
                <NumberInput
                  label="Max Years"
                  value={settings.proforma.projectionSettings.maxYears}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        projectionSettings: {
                          ...prev.proforma.projectionSettings,
                          maxYears: v,
                        },
                      },
                    }))
                  }
                  min={5}
                  max={30}
                  step={1}
                />
                <NumberInput
                  label="Monthly Granularity Years"
                  value={settings.proforma.projectionSettings.monthlyGranularityYears}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        projectionSettings: {
                          ...prev.proforma.projectionSettings,
                          monthlyGranularityYears: v,
                        },
                      },
                    }))
                  }
                  min={1}
                  max={5}
                  step={1}
                />
                <NumberInput
                  label="Construction Months"
                  value={settings.proforma.projectionSettings.constructionMonths}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        projectionSettings: {
                          ...prev.proforma.projectionSettings,
                          constructionMonths: v,
                        },
                      },
                    }))
                  }
                  min={6}
                  max={36}
                  step={3}
                />
              </div>
            </Section>

            {/* Financing Assumptions */}
            <Section
              title="Default Financing Assumptions"
              icon={<DollarSign className="w-5 h-5" />}
              description="Configure default debt and equity parameters"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Senior Debt LTV"
                  value={settings.proforma.financingAssumptions.seniorDebtLTV}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          seniorDebtLTV: v,
                        },
                      },
                    }))
                  }
                  min={0.5}
                  max={0.85}
                  step={0.05}
                  format="percent"
                />
                <NumberInput
                  label="Senior Debt Rate"
                  value={settings.proforma.financingAssumptions.seniorDebtRate}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          seniorDebtRate: v,
                        },
                      },
                    }))
                  }
                  min={0.03}
                  max={0.12}
                  step={0.0025}
                  format="percent"
                />
                <NumberInput
                  label="Senior Debt Term (yrs)"
                  value={settings.proforma.financingAssumptions.seniorDebtTerm}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          seniorDebtTerm: v,
                        },
                      },
                    }))
                  }
                  min={3}
                  max={15}
                  step={1}
                />
                <NumberInput
                  label="Amortization (yrs)"
                  value={settings.proforma.financingAssumptions.seniorDebtAmortization}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          seniorDebtAmortization: v,
                        },
                      },
                    }))
                  }
                  min={15}
                  max={35}
                  step={5}
                />
                <NumberInput
                  label="Mezz Debt LTV"
                  value={settings.proforma.financingAssumptions.mezzDebtLTV}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          mezzDebtLTV: v,
                        },
                      },
                    }))
                  }
                  min={0}
                  max={0.20}
                  step={0.025}
                  format="percent"
                />
                <NumberInput
                  label="Mezz Debt Rate"
                  value={settings.proforma.financingAssumptions.mezzDebtRate}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          mezzDebtRate: v,
                        },
                      },
                    }))
                  }
                  min={0.08}
                  max={0.20}
                  step={0.005}
                  format="percent"
                />
                <NumberInput
                  label="Closing Costs %"
                  value={settings.proforma.financingAssumptions.closingCostsPercent}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          closingCostsPercent: v,
                        },
                      },
                    }))
                  }
                  min={0.01}
                  max={0.05}
                  step={0.005}
                  format="percent"
                />
                <NumberInput
                  label="Loan Origination Fee"
                  value={settings.proforma.financingAssumptions.loanOriginationFee}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        financingAssumptions: {
                          ...prev.proforma.financingAssumptions,
                          loanOriginationFee: v,
                        },
                      },
                    }))
                  }
                  min={0.005}
                  max={0.03}
                  step={0.0025}
                  format="percent"
                />
              </div>
            </Section>

            {/* Exit Assumptions */}
            <Section
              title="Exit Assumptions"
              icon={<Target className="w-5 h-5" />}
              description="Configure default disposition assumptions"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <NumberInput
                  label="Default Hold Period (yrs)"
                  value={settings.proforma.exitAssumptions.defaultHoldPeriod}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        exitAssumptions: {
                          ...prev.proforma.exitAssumptions,
                          defaultHoldPeriod: v,
                        },
                      },
                    }))
                  }
                  min={3}
                  max={10}
                  step={1}
                />
                <NumberInput
                  label="Exit Cap Rate Spread"
                  value={settings.proforma.exitAssumptions.exitCapRateSpread}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        exitAssumptions: {
                          ...prev.proforma.exitAssumptions,
                          exitCapRateSpread: v,
                        },
                      },
                    }))
                  }
                  min={-0.01}
                  max={0.02}
                  step={0.0025}
                  format="percent"
                  description="Added to entry cap rate"
                />
                <NumberInput
                  label="Selling Costs %"
                  value={settings.proforma.exitAssumptions.sellingCostsPercent}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        exitAssumptions: {
                          ...prev.proforma.exitAssumptions,
                          sellingCostsPercent: v,
                        },
                      },
                    }))
                  }
                  min={0.01}
                  max={0.05}
                  step={0.005}
                  format="percent"
                />
                <NumberInput
                  label="Prepayment Penalty %"
                  value={settings.proforma.exitAssumptions.prepaymentPenaltyPercent}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      proforma: {
                        ...prev.proforma,
                        exitAssumptions: {
                          ...prev.proforma.exitAssumptions,
                          prepaymentPenaltyPercent: v,
                        },
                      },
                    }))
                  }
                  min={0}
                  max={0.05}
                  step={0.005}
                  format="percent"
                />
              </div>
            </Section>
          </div>
        )}

        {/* Display Tab */}
        {activeTab === 'display' && (
          <div className="space-y-6">
            {/* Number Formatting */}
            <Section
              title="Number Formatting"
              icon={<Palette className="w-5 h-5" />}
              description="Configure how numbers are displayed throughout the application"
              defaultOpen
            >
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-primary)]">Currency</label>
                    <select
                      value={settings.display.numberFormat.currency}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          display: {
                            ...prev.display,
                            numberFormat: {
                              ...prev.display.numberFormat,
                              currency: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (&euro;)</option>
                      <option value="GBP">GBP (&pound;)</option>
                      <option value="CAD">CAD ($)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-primary)]">Locale</label>
                    <select
                      value={settings.display.numberFormat.locale}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          display: {
                            ...prev.display,
                            numberFormat: {
                              ...prev.display.numberFormat,
                              locale: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="en-CA">English (CA)</option>
                      <option value="de-DE">German</option>
                      <option value="fr-FR">French</option>
                    </select>
                  </div>
                  <ToggleInput
                    label="Abbreviate Millions"
                    value={settings.display.numberFormat.abbreviateMillions}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: {
                          ...prev.display,
                          numberFormat: {
                            ...prev.display.numberFormat,
                            abbreviateMillions: v,
                          },
                        },
                      }))
                    }
                    description="Show $1.5M instead of $1,500,000"
                  />
                  <ToggleInput
                    label="Abbreviate Thousands"
                    value={settings.display.numberFormat.abbreviateThousands}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: {
                          ...prev.display,
                          numberFormat: {
                            ...prev.display.numberFormat,
                            abbreviateThousands: v,
                          },
                        },
                      }))
                    }
                    description="Show $150K instead of $150,000"
                  />
                </div>

                <SubSection title="Decimal Places">
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(settings.display.numberFormat.decimals).map(([type, decimals]) => (
                      <NumberInput
                        key={type}
                        label={type.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                        value={decimals}
                        onChange={(v) =>
                          setSettings((prev) => ({
                            ...prev,
                            display: {
                              ...prev.display,
                              numberFormat: {
                                ...prev.display.numberFormat,
                                decimals: {
                                  ...prev.display.numberFormat.decimals,
                                  [type]: v,
                                },
                              },
                            },
                          }))
                        }
                        min={0}
                        max={4}
                        step={1}
                        compact
                      />
                    ))}
                  </div>
                </SubSection>
              </div>
            </Section>

            {/* Dashboard Settings */}
            <Section
              title="Dashboard Preferences"
              icon={<Settings className="w-5 h-5" />}
              description="Configure default dashboard behavior and display options"
            >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">Default View</label>
                  <select
                    value={settings.display.dashboardSettings.defaultView}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: {
                          ...prev.display,
                          dashboardSettings: {
                            ...prev.display.dashboardSettings,
                            defaultView: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                  >
                    <option value="pipeline">Pipeline</option>
                    <option value="list">List</option>
                    <option value="map">Map</option>
                    <option value="analytics">Analytics</option>
                  </select>
                </div>
                <NumberInput
                  label="Items Per Page"
                  value={settings.display.dashboardSettings.itemsPerPage}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      display: {
                        ...prev.display,
                        dashboardSettings: {
                          ...prev.display.dashboardSettings,
                          itemsPerPage: v,
                        },
                      },
                    }))
                  }
                  min={10}
                  max={100}
                  step={5}
                />
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">Default Sort</label>
                  <select
                    value={settings.display.dashboardSettings.defaultSort}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: {
                          ...prev.display,
                          dashboardSettings: {
                            ...prev.display.dashboardSettings,
                            defaultSort: e.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                  >
                    <option value="updatedAt">Last Updated</option>
                    <option value="createdAt">Created Date</option>
                    <option value="name">Name</option>
                    <option value="status">Status</option>
                    <option value="value">Value</option>
                  </select>
                </div>
                <ToggleInput
                  label="Show Confidence Scores"
                  value={settings.display.dashboardSettings.showConfidenceScores}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      display: {
                        ...prev.display,
                        dashboardSettings: {
                          ...prev.display.dashboardSettings,
                          showConfidenceScores: v,
                        },
                      },
                    }))
                  }
                  description="Display confidence indicators on valuations"
                />
                <ToggleInput
                  label="Show Risk Indicators"
                  value={settings.display.dashboardSettings.showRiskIndicators}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      display: {
                        ...prev.display,
                        dashboardSettings: {
                          ...prev.display.dashboardSettings,
                          showRiskIndicators: v,
                        },
                      },
                    }))
                  }
                  description="Display risk badges on deal cards"
                />
                <ToggleInput
                  label="Compact Mode"
                  value={settings.display.dashboardSettings.compactMode}
                  onChange={(v) =>
                    setSettings((prev) => ({
                      ...prev,
                      display: {
                        ...prev.display,
                        dashboardSettings: {
                          ...prev.display.dashboardSettings,
                          compactMode: v,
                        },
                      },
                    }))
                  }
                  description="Use condensed layout for more data density"
                />
              </div>
            </Section>

            {/* Export Settings */}
            <Section
              title="Export Settings"
              icon={<Download className="w-5 h-5" />}
              description="Configure default export options and branding"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-primary)]">Default Format</label>
                    <select
                      value={settings.display.exportSettings.defaultFormat}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          display: {
                            ...prev.display,
                            exportSettings: {
                              ...prev.display.exportSettings,
                              defaultFormat: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                    >
                      <option value="pdf">PDF</option>
                      <option value="excel">Excel</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                    </select>
                  </div>
                  <ToggleInput
                    label="Include Logo"
                    value={settings.display.exportSettings.includeLogo}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: {
                          ...prev.display,
                          exportSettings: {
                            ...prev.display.exportSettings,
                            includeLogo: v,
                          },
                        },
                      }))
                    }
                    description="Add company logo to exports"
                  />
                  <ToggleInput
                    label="Include Disclaimer"
                    value={settings.display.exportSettings.includeDisclaimer}
                    onChange={(v) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: {
                          ...prev.display,
                          exportSettings: {
                            ...prev.display.exportSettings,
                            includeDisclaimer: v,
                          },
                        },
                      }))
                    }
                    description="Add legal disclaimer to exports"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">Disclaimer Text</label>
                  <textarea
                    value={settings.display.exportSettings.disclaimerText}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        display: {
                          ...prev.display,
                          exportSettings: {
                            ...prev.display.exportSettings,
                            disclaimerText: e.target.value,
                          },
                        },
                      }))
                    }
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-[var(--color-border-default)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-solid)]"
                  />
                </div>
              </div>
            </Section>
          </div>
        )}

        {/* Reset to Defaults Button */}
        <div className="pt-6 border-t border-[var(--color-border-default)]">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Reset All Settings to Factory Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
