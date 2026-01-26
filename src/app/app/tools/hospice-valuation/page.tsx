'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Heart,
  DollarSign,
  Users,
  Calendar,
  Calculator,
  TrendingUp,
  Building2,
  FileText,
  Download,
  Info,
  AlertTriangle,
} from 'lucide-react';

interface HospiceInputs {
  // Census & Capacity
  averageDailyCensus: number;
  admissionsPerMonth: number;
  averageLengthOfStay: number; // days
  liveDischargeRate: number; // percentage

  // Revenue by Care Level (per patient day)
  routineHomeCareRate: number;
  continuousHomeCareRate: number;
  generalInpatientRate: number;
  respiteCareRate: number;

  // Payer Mix (percentage of census)
  medicarePercent: number;
  medicaidPercent: number;
  privatePay: number;

  // Care Level Mix (percentage of patient days)
  routineHomeCarePercent: number;
  continuousHomeCarePercent: number;
  generalInpatientPercent: number;
  respiteCarePercent: number;

  // Operating Expenses
  directCareExpensePercent: number; // of revenue
  adminExpensePercent: number;
  otherExpensePercent: number;

  // Valuation Inputs
  capRateLow: number;
  capRateMid: number;
  capRateHigh: number;

  // Cap Consideration
  medicareCap: number; // per beneficiary cap
}

const defaultInputs: HospiceInputs = {
  averageDailyCensus: 150,
  admissionsPerMonth: 45,
  averageLengthOfStay: 85,
  liveDischargeRate: 12,

  routineHomeCareRate: 211,
  continuousHomeCareRate: 1116,
  generalInpatientRate: 1110,
  respiteCareRate: 487,

  medicarePercent: 92,
  medicaidPercent: 5,
  privatePay: 3,

  routineHomeCarePercent: 96,
  continuousHomeCarePercent: 1.5,
  generalInpatientPercent: 2,
  respiteCarePercent: 0.5,

  directCareExpensePercent: 55,
  adminExpensePercent: 20,
  otherExpensePercent: 8,

  capRateLow: 10,
  capRateMid: 12,
  capRateHigh: 14,

  medicareCap: 33494,
};

export default function HospiceValuationPage() {
  const [inputs, setInputs] = useState<HospiceInputs>(defaultInputs);

  const updateInput = (field: keyof HospiceInputs, value: number) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const calculations = useMemo(() => {
    // Annual Patient Days
    const annualPatientDays = inputs.averageDailyCensus * 365;

    // Patient Days by Care Level
    const routineHomeDays = annualPatientDays * (inputs.routineHomeCarePercent / 100);
    const continuousDays = annualPatientDays * (inputs.continuousHomeCarePercent / 100);
    const generalInpatientDays = annualPatientDays * (inputs.generalInpatientPercent / 100);
    const respiteDays = annualPatientDays * (inputs.respiteCarePercent / 100);

    // Revenue by Care Level
    const routineRevenue = routineHomeDays * inputs.routineHomeCareRate;
    const continuousRevenue = continuousDays * inputs.continuousHomeCareRate;
    const generalInpatientRevenue = generalInpatientDays * inputs.generalInpatientRate;
    const respiteRevenue = respiteDays * inputs.respiteCareRate;

    const grossRevenue = routineRevenue + continuousRevenue + generalInpatientRevenue + respiteRevenue;

    // Blended Rate per Patient Day
    const blendedRatePPD = grossRevenue / annualPatientDays;

    // Annual Admissions
    const annualAdmissions = inputs.admissionsPerMonth * 12;

    // Medicare Cap Analysis
    const medicarePatients = annualAdmissions * (inputs.medicarePercent / 100);
    const totalMedicareCap = medicarePatients * inputs.medicareCap;
    const medicareRevenue = grossRevenue * (inputs.medicarePercent / 100);
    const capUtilization = (medicareRevenue / totalMedicareCap) * 100;
    const isOverCap = capUtilization > 100;

    // Operating Expenses
    const directCareExpense = grossRevenue * (inputs.directCareExpensePercent / 100);
    const adminExpense = grossRevenue * (inputs.adminExpensePercent / 100);
    const otherExpense = grossRevenue * (inputs.otherExpensePercent / 100);
    const totalExpenses = directCareExpense + adminExpense + otherExpense;

    // NOI / EBITDA
    const noi = grossRevenue - totalExpenses;
    const noiMargin = (noi / grossRevenue) * 100;

    // Valuations
    const valueLow = noi / (inputs.capRateHigh / 100);
    const valueMid = noi / (inputs.capRateMid / 100);
    const valueHigh = noi / (inputs.capRateLow / 100);

    // Per Census Metrics
    const valuePerCensus = valueMid / inputs.averageDailyCensus;
    const revenuePerCensus = grossRevenue / inputs.averageDailyCensus;

    return {
      annualPatientDays,
      routineHomeDays,
      continuousDays,
      generalInpatientDays,
      respiteDays,
      routineRevenue,
      continuousRevenue,
      generalInpatientRevenue,
      respiteRevenue,
      grossRevenue,
      blendedRatePPD,
      annualAdmissions,
      medicarePatients,
      totalMedicareCap,
      medicareRevenue,
      capUtilization,
      isOverCap,
      directCareExpense,
      adminExpense,
      otherExpense,
      totalExpenses,
      noi,
      noiMargin,
      valueLow,
      valueMid,
      valueHigh,
      valuePerCensus,
      revenuePerCensus,
    };
  }, [inputs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/app/tools"
          className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-surface-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-surface-900 dark:text-white flex items-center gap-2">
            <Heart className="w-5 h-5 text-pink-500" />
            Hospice Valuation Calculator
          </h1>
          <p className="text-sm text-surface-500">
            Census-based hospice facility valuation with Medicare cap analysis
          </p>
        </div>
        <button className="btn btn-secondary btn-sm">
          <Download className="w-4 h-4 mr-1" />
          Export
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Input Panel */}
        <div className="xl:col-span-1 space-y-4">
          {/* Census & Capacity */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-500" />
              Census & Capacity
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-500 block mb-1">Average Daily Census (ADC)</label>
                <input
                  type="number"
                  value={inputs.averageDailyCensus}
                  onChange={(e) => updateInput('averageDailyCensus', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Admissions per Month</label>
                <input
                  type="number"
                  value={inputs.admissionsPerMonth}
                  onChange={(e) => updateInput('admissionsPerMonth', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Avg Length of Stay (days)</label>
                <input
                  type="number"
                  value={inputs.averageLengthOfStay}
                  onChange={(e) => updateInput('averageLengthOfStay', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Live Discharge Rate (%)</label>
                <input
                  type="number"
                  value={inputs.liveDischargeRate}
                  onChange={(e) => updateInput('liveDischargeRate', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Revenue Rates */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Revenue Rates (per day)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-500 block mb-1">Routine Home Care</label>
                <input
                  type="number"
                  value={inputs.routineHomeCareRate}
                  onChange={(e) => updateInput('routineHomeCareRate', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Continuous Home Care</label>
                <input
                  type="number"
                  value={inputs.continuousHomeCareRate}
                  onChange={(e) => updateInput('continuousHomeCareRate', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">General Inpatient</label>
                <input
                  type="number"
                  value={inputs.generalInpatientRate}
                  onChange={(e) => updateInput('generalInpatientRate', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Respite Care</label>
                <input
                  type="number"
                  value={inputs.respiteCareRate}
                  onChange={(e) => updateInput('respiteCareRate', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Care Level Mix */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              Care Level Mix (%)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-500 block mb-1">Routine Home Care</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.routineHomeCarePercent}
                  onChange={(e) => updateInput('routineHomeCarePercent', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Continuous Home Care</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.continuousHomeCarePercent}
                  onChange={(e) => updateInput('continuousHomeCarePercent', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">General Inpatient</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.generalInpatientPercent}
                  onChange={(e) => updateInput('generalInpatientPercent', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Respite Care</label>
                <input
                  type="number"
                  step="0.5"
                  value={inputs.respiteCarePercent}
                  onChange={(e) => updateInput('respiteCarePercent', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              Expense Ratios (% of Revenue)
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-surface-500 block mb-1">Direct Care</label>
                <input
                  type="number"
                  value={inputs.directCareExpensePercent}
                  onChange={(e) => updateInput('directCareExpensePercent', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Admin & G&A</label>
                <input
                  type="number"
                  value={inputs.adminExpensePercent}
                  onChange={(e) => updateInput('adminExpensePercent', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Other Operating</label>
                <input
                  type="number"
                  value={inputs.otherExpensePercent}
                  onChange={(e) => updateInput('otherExpensePercent', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>

          {/* Valuation Inputs */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-500" />
              Valuation Parameters
            </h3>
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Low Cap</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.capRateLow}
                    onChange={(e) => updateInput('capRateLow', Number(e.target.value))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">Mid Cap</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.capRateMid}
                    onChange={(e) => updateInput('capRateMid', Number(e.target.value))}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-surface-500 block mb-1">High Cap</label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.capRateHigh}
                    onChange={(e) => updateInput('capRateHigh', Number(e.target.value))}
                    className="input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-surface-500 block mb-1">Medicare Cap (per beneficiary)</label>
                <input
                  type="number"
                  value={inputs.medicareCap}
                  onChange={(e) => updateInput('medicareCap', Number(e.target.value))}
                  className="input w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:col-span-2 space-y-4">
          {/* Valuation Summary */}
          <div className="neu-card p-4 bg-gradient-to-br from-pink-50 to-white dark:from-pink-900/20 dark:to-surface-800">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-pink-500" />
              Valuation Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white/50 dark:bg-surface-900/50 rounded-lg">
                <div className="text-xs text-surface-500 mb-1">Conservative</div>
                <div className="text-2xl font-bold text-surface-900 dark:text-white">
                  {formatCurrency(calculations.valueLow)}
                </div>
                <div className="text-xs text-surface-400">{inputs.capRateHigh}% Cap</div>
              </div>
              <div className="text-center p-4 bg-pink-100/50 dark:bg-pink-900/30 rounded-lg ring-2 ring-pink-500/30">
                <div className="text-xs text-pink-600 dark:text-pink-400 mb-1">Mid-Point</div>
                <div className="text-3xl font-bold text-pink-600 dark:text-pink-400">
                  {formatCurrency(calculations.valueMid)}
                </div>
                <div className="text-xs text-pink-500">{inputs.capRateMid}% Cap</div>
              </div>
              <div className="text-center p-4 bg-white/50 dark:bg-surface-900/50 rounded-lg">
                <div className="text-xs text-surface-500 mb-1">Aggressive</div>
                <div className="text-2xl font-bold text-surface-900 dark:text-white">
                  {formatCurrency(calculations.valueHigh)}
                </div>
                <div className="text-xs text-surface-400">{inputs.capRateLow}% Cap</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
              <div className="text-center">
                <div className="text-xs text-surface-500 mb-1">Value per Census</div>
                <div className="text-xl font-bold text-surface-900 dark:text-white">
                  {formatCurrency(calculations.valuePerCensus)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-surface-500 mb-1">Revenue per Census</div>
                <div className="text-xl font-bold text-surface-900 dark:text-white">
                  {formatCurrency(calculations.revenuePerCensus)}
                </div>
              </div>
            </div>
          </div>

          {/* Medicare Cap Warning */}
          {calculations.isOverCap && (
            <div className="neu-card p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-700 dark:text-red-400">Medicare Cap Warning</h4>
                  <p className="text-sm text-red-600 dark:text-red-300 mt-1">
                    Projected Medicare revenue exceeds the aggregate cap. Cap utilization at{' '}
                    <span className="font-bold">{formatPercent(calculations.capUtilization)}</span>.
                    This may require payback to CMS.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="neu-card p-4">
              <div className="text-xs text-surface-500 mb-1">Annual Revenue</div>
              <div className="text-xl font-bold text-surface-900 dark:text-white">
                {formatCurrency(calculations.grossRevenue)}
              </div>
            </div>
            <div className="neu-card p-4">
              <div className="text-xs text-surface-500 mb-1">Net Operating Income</div>
              <div className="text-xl font-bold text-emerald-600">
                {formatCurrency(calculations.noi)}
              </div>
            </div>
            <div className="neu-card p-4">
              <div className="text-xs text-surface-500 mb-1">NOI Margin</div>
              <div className="text-xl font-bold text-surface-900 dark:text-white">
                {formatPercent(calculations.noiMargin)}
              </div>
            </div>
            <div className="neu-card p-4">
              <div className="text-xs text-surface-500 mb-1">Blended PPD</div>
              <div className="text-xl font-bold text-surface-900 dark:text-white">
                {formatCurrency(calculations.blendedRatePPD)}
              </div>
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Revenue by Care Level
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Routine Home Care', value: calculations.routineRevenue, days: calculations.routineHomeDays, color: 'bg-blue-500' },
                { label: 'Continuous Home Care', value: calculations.continuousRevenue, days: calculations.continuousDays, color: 'bg-purple-500' },
                { label: 'General Inpatient', value: calculations.generalInpatientRevenue, days: calculations.generalInpatientDays, color: 'bg-pink-500' },
                { label: 'Respite Care', value: calculations.respiteRevenue, days: calculations.respiteDays, color: 'bg-amber-500' },
              ].map((item) => {
                const percent = (item.value / calculations.grossRevenue) * 100;
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-surface-700 dark:text-surface-300">{item.label}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-surface-400">{Math.round(item.days).toLocaleString()} days</span>
                        <span className="font-semibold text-surface-900 dark:text-white">
                          {formatCurrency(item.value)}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', item.color)}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Medicare Cap Analysis */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Medicare Cap Analysis
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-surface-500 mb-1">Medicare Patients (Est.)</div>
                <div className="text-lg font-bold text-surface-900 dark:text-white">
                  {Math.round(calculations.medicarePatients).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-surface-500 mb-1">Aggregate Cap</div>
                <div className="text-lg font-bold text-surface-900 dark:text-white">
                  {formatCurrency(calculations.totalMedicareCap)}
                </div>
              </div>
              <div>
                <div className="text-xs text-surface-500 mb-1">Medicare Revenue</div>
                <div className="text-lg font-bold text-surface-900 dark:text-white">
                  {formatCurrency(calculations.medicareRevenue)}
                </div>
              </div>
              <div>
                <div className="text-xs text-surface-500 mb-1">Cap Utilization</div>
                <div className={cn(
                  'text-lg font-bold',
                  calculations.capUtilization > 100 ? 'text-red-500' : 'text-emerald-600'
                )}>
                  {formatPercent(calculations.capUtilization)}
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-surface-600">Cap Utilization</span>
                <span className={cn(
                  'font-semibold',
                  calculations.capUtilization > 100 ? 'text-red-500' : 'text-emerald-600'
                )}>
                  {formatPercent(calculations.capUtilization)}
                </span>
              </div>
              <div className="h-4 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    calculations.capUtilization > 100 ? 'bg-red-500' : 'bg-emerald-500'
                  )}
                  style={{ width: `${Math.min(calculations.capUtilization, 100)}%` }}
                />
              </div>
              {calculations.capUtilization > 80 && calculations.capUtilization <= 100 && (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Approaching Medicare cap limit. Monitor closely.
                </p>
              )}
            </div>
          </div>

          {/* Operating Summary */}
          <div className="neu-card p-4">
            <h3 className="font-semibold text-surface-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-500" />
              Operating Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between py-2 border-b border-surface-200 dark:border-surface-700">
                <span className="text-surface-600 dark:text-surface-400">Gross Revenue</span>
                <span className="font-semibold text-surface-900 dark:text-white">
                  {formatCurrency(calculations.grossRevenue)}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-surface-600 dark:text-surface-400 pl-4">Direct Care Expense</span>
                <span className="text-red-500">({formatCurrency(calculations.directCareExpense)})</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-surface-600 dark:text-surface-400 pl-4">Admin & G&A</span>
                <span className="text-red-500">({formatCurrency(calculations.adminExpense)})</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-surface-600 dark:text-surface-400 pl-4">Other Operating</span>
                <span className="text-red-500">({formatCurrency(calculations.otherExpense)})</span>
              </div>
              <div className="flex justify-between py-2 border-t border-surface-200 dark:border-surface-700">
                <span className="text-surface-600 dark:text-surface-400">Total Expenses</span>
                <span className="font-semibold text-red-500">
                  ({formatCurrency(calculations.totalExpenses)})
                </span>
              </div>
              <div className="flex justify-between py-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg px-3 mt-2">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Net Operating Income</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(calculations.noi)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
