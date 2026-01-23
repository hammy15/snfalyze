'use client';

import { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { StatCard } from '@/components/ui/stat-card';
import { cn } from '@/lib/utils';
import {
  FacilityType,
  ProformaAssumptions,
  defaultAssumptions,
} from '@/lib/proforma/types';
import {
  MonthlyData,
  generateYearlyProforma,
  sumYearlyTotals,
  formatCurrency,
  formatPercent,
} from '@/lib/proforma/calculations';
import {
  Building2,
  DollarSign,
  TrendingUp,
  Users,
  Calculator,
  Download,
  Upload,
  Save,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  Table,
  Calendar,
  ClipboardList,
  Sparkles,
  FileUp,
} from 'lucide-react';

// Import ScenarioType from the spreadsheet component
import type { ScenarioType } from '@/components/proforma/proforma-spreadsheet';

// Dynamically import the spreadsheet component to avoid SSR issues with Handsontable
const ProformaSpreadsheet = dynamic(
  () => import('@/components/proforma/proforma-spreadsheet').then(mod => mod.ProformaSpreadsheet),
  {
    ssr: false,
    loading: () => (
      <div className="card p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[var(--color-text-tertiary)]">Loading spreadsheet...</div>
      </div>
    ),
  }
);

// Dynamically import the Document Analyzer
const DocumentAnalyzer = dynamic(
  () => import('@/components/proforma/document-analyzer').then(mod => mod.DocumentAnalyzer),
  { ssr: false }
);

// Mock facilities for selection - based on Cascadia portfolio
const mockFacilities = [
  { id: '1', name: 'Soundview SNF', type: 'snf' as FacilityType, beds: 95, location: 'Anacortes, WA' },
  { id: '2', name: 'Harbor Health SNF', type: 'snf' as FacilityType, beds: 150, location: 'Seattle, WA' },
  { id: '3', name: 'Valley View SNF', type: 'snf' as FacilityType, beds: 85, location: 'Tacoma, WA' },
  { id: '4', name: 'Sunrise Care SNF', type: 'snf' as FacilityType, beds: 120, location: 'Spokane, WA' },
  { id: '5', name: 'Rosario ALF', type: 'alf' as FacilityType, beds: 72, location: 'Bellingham, WA' },
  { id: '6', name: 'Cypress Gardens ALF', type: 'alf' as FacilityType, beds: 80, location: 'Olympia, WA' },
  { id: '7', name: 'Mountain View ALF', type: 'alf' as FacilityType, beds: 65, location: 'Vancouver, WA' },
  { id: '8', name: 'Lakeside ILF', type: 'ilf' as FacilityType, beds: 110, location: 'Kirkland, WA' },
];

// T12 Period presets
const t12Presets = [
  { label: 'Jan 2024 - Dec 2024', startDate: new Date(2024, 0, 1) },
  { label: 'Jul 2023 - Jun 2024', startDate: new Date(2023, 6, 1) },
  { label: 'Jan 2023 - Dec 2023', startDate: new Date(2023, 0, 1) },
  { label: 'Oct 2023 - Sep 2024', startDate: new Date(2023, 9, 1) },
  { label: 'Jan 2025 - Dec 2025', startDate: new Date(2025, 0, 1) },
];

// Scenario options
const scenarioOptions: { value: ScenarioType; label: string; description: string }[] = [
  { value: 'prior_actuals', label: 'Prior Owner Actuals', description: 'Historical financials from prior operator' },
  { value: 'budget', label: 'Budget', description: 'Approved annual budget projections' },
  { value: 'forecast', label: 'Forecast', description: 'Updated projections based on current performance' },
  { value: 'acquisition', label: 'Acquisition Pro Forma', description: 'Post-acquisition stabilized projections' },
];

export default function SandboxPage() {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>('1');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('prior_actuals');
  const [selectedT12Index, setSelectedT12Index] = useState(0);
  const [viewMode, setViewMode] = useState<'spreadsheet' | 'summary'>('spreadsheet');
  const [spreadsheetData, setSpreadsheetData] = useState<any[][] | null>(null);
  const [showAnalyzer, setShowAnalyzer] = useState(false);
  const [extractedSource, setExtractedSource] = useState<string | null>(null);

  const selectedFacility = mockFacilities.find((f) => f.id === selectedFacilityId);
  const facilityType = selectedFacility?.type || 'snf';
  const facilityName = selectedFacility?.name || 'New Facility';
  const assumptions = {
    ...defaultAssumptions[facilityType],
    licensedBeds: selectedFacility?.beds || 100,
  };

  const startDate = t12Presets[selectedT12Index].startDate;
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 11, 1);

  // Handle data changes from spreadsheet
  const handleDataChange = useCallback((data: any[][]) => {
    setSpreadsheetData(data);
  }, []);

  // Export to CSV
  const handleExport = useCallback(() => {
    if (!spreadsheetData) return;

    const csvContent = spreadsheetData
      .map(row => row.map(cell => {
        const value = String(cell ?? '');
        // Escape quotes and wrap in quotes if contains comma
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${facilityName}_proforma_T12_${startDate.getFullYear()}.csv`;
    link.click();
  }, [spreadsheetData, facilityName, startDate]);

  // Reset handler
  const handleReset = useCallback(() => {
    setSpreadsheetData(null);
    setExtractedSource(null);
  }, []);

  // Handle extracted data from Document Analyzer
  const handleExtractComplete = useCallback((data: any) => {
    setExtractedSource(data.facilityName || 'Document');
    setShowAnalyzer(false);
    // The extracted data would be used to populate the proforma
    // For now, we'll just show a notification that data was extracted
  }, []);

  // Calculate summary stats from spreadsheet data
  const summaryStats = useMemo(() => {
    const monthly = generateYearlyProforma(assumptions, startDate.getFullYear());
    const total = sumYearlyTotals(monthly);
    return {
      beds: assumptions.licensedBeds,
      revenue: total.totalRevenue,
      ebitdar: total.ebitdar,
      ebitdarMargin: total.ebitdarMargin,
      netIncome: total.netIncome,
      netIncomeMargin: total.netIncomeMargin,
    };
  }, [assumptions, startDate]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Proforma Sandbox</h1>
            <p className="page-header-subtitle">
              Model financial projections using Cascadia's standard proforma format. Edit cells, use formulas, copy/paste from Excel.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAnalyzer(true)}
              className="btn btn-secondary btn-sm bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Documents
            </button>
            <button onClick={handleExport} className="btn btn-secondary btn-sm">
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button className="btn btn-primary btn-sm">
              <Save className="w-4 h-4" />
              Save Scenario
            </button>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="card p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Facility Selector */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Facility:</label>
            <select
              value={selectedFacilityId}
              onChange={(e) => {
                setSelectedFacilityId(e.target.value);
                setSpreadsheetData(null);
              }}
              className="input input-sm w-56"
            >
              <optgroup label="SNF Facilities">
                {mockFacilities
                  .filter((f) => f.type === 'snf')
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.beds} beds)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="ALF Facilities">
                {mockFacilities
                  .filter((f) => f.type === 'alf')
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.beds} beds)
                    </option>
                  ))}
              </optgroup>
              <optgroup label="ILF Facilities">
                {mockFacilities
                  .filter((f) => f.type === 'ilf')
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.beds} beds)
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-[var(--color-border-muted)]" />

          {/* Scenario Selector */}
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Scenario:</label>
            <select
              value={selectedScenario}
              onChange={(e) => {
                setSelectedScenario(e.target.value as ScenarioType);
                setSpreadsheetData(null);
              }}
              className="input input-sm w-48"
            >
              {scenarioOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-[var(--color-border-muted)]" />

          {/* T12 Period Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--color-text-tertiary)]" />
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">T12 Period:</label>
            <select
              value={selectedT12Index}
              onChange={(e) => {
                setSelectedT12Index(parseInt(e.target.value));
                setSpreadsheetData(null);
              }}
              className="input input-sm w-48"
            >
              {t12Presets.map((preset, index) => (
                <option key={index} value={index}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Facility Type Badge */}
          <span className={cn(
            'px-3 py-1 text-xs font-semibold rounded-full uppercase',
            facilityType === 'snf' && 'bg-blue-100 text-blue-700',
            facilityType === 'alf' && 'bg-green-100 text-green-700',
            facilityType === 'ilf' && 'bg-purple-100 text-purple-700',
          )}>
            {facilityType}
          </span>

          <div className="flex-1" />

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-[var(--gray-100)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors',
                viewMode === 'spreadsheet'
                  ? 'bg-white shadow-sm text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Table className="w-4 h-4" />
              Spreadsheet
            </button>
            <button
              onClick={() => setViewMode('summary')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors',
                viewMode === 'summary'
                  ? 'bg-white shadow-sm text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}
            >
              <Layers className="w-4 h-4" />
              Summary
            </button>
          </div>

          <button onClick={handleReset} className="btn btn-ghost btn-sm">
            <RefreshCw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Extracted Data Notice */}
      {extractedSource && (
        <div className="card p-3 bg-purple-50 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-purple-900">
                Data extracted from: {extractedSource}
              </div>
              <div className="text-xs text-purple-700 mt-0.5">
                Review the populated values below and adjust as needed
              </div>
            </div>
            <button
              onClick={() => setExtractedSource(null)}
              className="text-xs text-purple-600 hover:text-purple-800 font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* T12 Info Banner */}
      <div className="card p-3 bg-blue-50 border-blue-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-900">
              T12 Period: {startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div className="text-xs text-blue-700 mt-0.5">
              {scenarioOptions.find(s => s.value === selectedScenario)?.description} for {facilityName}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-600 font-medium">
              {selectedFacility?.location}
            </div>
            <div className="text-xs text-blue-500">
              {assumptions.licensedBeds} Licensed Beds
            </div>
          </div>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Licensed Beds"
          value={summaryStats.beds}
          icon={<Users className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="T12 Revenue"
          value={summaryStats.revenue}
          format="currency"
          icon={<DollarSign className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="EBITDAR"
          value={summaryStats.ebitdar}
          format="currency"
          delta={{
            value: summaryStats.ebitdarMargin * 100,
            direction: summaryStats.ebitdarMargin > 0.15 ? 'up' : 'neutral',
            label: 'margin',
          }}
          icon={<TrendingUp className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Net Income"
          value={summaryStats.netIncome}
          format="currency"
          delta={{
            value: summaryStats.netIncomeMargin * 100,
            direction: summaryStats.netIncomeMargin > 0.05 ? 'up' : 'neutral',
            label: 'margin',
          }}
          icon={<Calculator className="w-5 h-5" />}
          size="sm"
        />
        <StatCard
          label="Rev/Bed"
          value={summaryStats.beds > 0 ? summaryStats.revenue / summaryStats.beds : 0}
          format="currency"
          icon={<Building2 className="w-5 h-5" />}
          size="sm"
        />
      </div>

      {/* Main Content */}
      {viewMode === 'spreadsheet' ? (
        <ProformaSpreadsheet
          key={`${selectedFacilityId}-${selectedScenario}-${selectedT12Index}`}
          facilityType={facilityType}
          facilityName={facilityName}
          initialAssumptions={assumptions}
          scenario={selectedScenario}
          startDate={startDate}
          onDataChange={handleDataChange}
        />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-[var(--color-text-primary)]">Revenue Breakdown</h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {[
                  { label: 'Medicaid', pct: assumptions.medicaidMix, ppd: assumptions.medicaidPPD },
                  { label: 'Medicare', pct: assumptions.medicareMix, ppd: assumptions.medicarePPD },
                  { label: 'Private', pct: assumptions.privateMix, ppd: assumptions.privatePPD },
                  { label: 'HMO', pct: assumptions.hmoMix, ppd: assumptions.hmoPPD },
                  { label: 'Managed Medicaid', pct: assumptions.managedMedicaidMix, ppd: assumptions.managedMedicaidPPD },
                ].map((payer) => (
                  <div key={payer.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--color-text-secondary)]">{payer.label}</span>
                      <span className="text-sm font-medium tabular-nums">
                        {formatPercent(payer.pct)} @ ${payer.ppd}/day
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[var(--gray-200)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-solid)] rounded-full"
                        style={{ width: `${payer.pct * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="card">
            <div className="card-header">
              <h3 className="font-semibold text-[var(--color-text-primary)]">Expense Categories</h3>
            </div>
            <div className="card-body">
              <div className="space-y-3">
                {[
                  { label: 'Nursing', pct: 0.42, color: 'bg-blue-500' },
                  { label: 'Therapy', pct: 0.12, color: 'bg-green-500' },
                  { label: 'Dietary', pct: 0.08, color: 'bg-yellow-500' },
                  { label: 'Plant/Maintenance', pct: 0.06, color: 'bg-orange-500' },
                  { label: 'Administration', pct: 0.12, color: 'bg-purple-500' },
                  { label: 'Other Operating', pct: 0.05, color: 'bg-gray-500' },
                ].map((expense) => (
                  <div key={expense.label} className="flex items-center gap-3">
                    <div className={cn('w-3 h-3 rounded-full', expense.color)} />
                    <span className="text-sm text-[var(--color-text-secondary)] flex-1">{expense.label}</span>
                    <span className="text-sm font-medium tabular-nums">{formatPercent(expense.pct)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="font-semibold text-[var(--color-text-primary)]">Key Performance Metrics</h3>
            </div>
            <div className="card-body">
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                  <div className="text-3xl font-bold text-[var(--color-text-primary)] tabular-nums">
                    {formatPercent(assumptions.targetOccupancy)}
                  </div>
                  <div className="text-sm text-[var(--color-text-tertiary)] mt-1">Target Occupancy</div>
                </div>
                <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                  <div className="text-3xl font-bold text-[var(--color-text-primary)] tabular-nums">
                    ${Math.round(summaryStats.revenue / 365 / summaryStats.beds / assumptions.targetOccupancy)}
                  </div>
                  <div className="text-sm text-[var(--color-text-tertiary)] mt-1">Avg PPD (Blended)</div>
                </div>
                <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                  <div className="text-3xl font-bold text-[var(--color-text-primary)] tabular-nums">
                    {formatPercent(summaryStats.ebitdarMargin)}
                  </div>
                  <div className="text-sm text-[var(--color-text-tertiary)] mt-1">EBITDAR Margin</div>
                </div>
                <div className="text-center p-4 bg-[var(--gray-50)] rounded-lg">
                  <div className="text-3xl font-bold text-[var(--color-text-primary)] tabular-nums">
                    {formatCurrency(summaryStats.revenue / summaryStats.beds)}
                  </div>
                  <div className="text-sm text-[var(--color-text-tertiary)] mt-1">Revenue/Bed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="card p-4 bg-[var(--gray-50)]">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="w-5 h-5 text-[var(--color-text-tertiary)] mt-0.5" />
          <div className="text-sm text-[var(--color-text-secondary)]">
            <strong>Cascadia Proforma Format:</strong> This spreadsheet uses Cascadia Healthcare's standard proforma structure.
            Edit input cells (white background) - formulas auto-calculate.
            Use <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Ctrl+C</kbd> / <kbd className="px-1.5 py-0.5 bg-white rounded border text-xs">Ctrl+V</kbd> to copy/paste.
            Green T12 Total column sums all monthly values. Right-click for context menu options.
          </div>
        </div>
      </div>

      {/* Document Analyzer Modal */}
      {showAnalyzer && (
        <DocumentAnalyzer
          onExtractComplete={handleExtractComplete}
          onClose={() => setShowAnalyzer(false)}
        />
      )}
    </div>
  );
}
