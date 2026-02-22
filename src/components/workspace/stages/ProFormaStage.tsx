'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Loader2, RefreshCw, BarChart3, Users, Building2 } from 'lucide-react';
import type { ProFormaStageData, ScenarioResult } from '@/types/workspace';

interface ProFormaStageProps {
  dealId: string;
  stageData: Record<string, unknown>;
  onUpdate: (data: Record<string, unknown>) => void;
}

export function ProFormaStage({ dealId, stageData, onUpdate }: ProFormaStageProps) {
  const [activeTab, setActiveTab] = useState<'revenue' | 'expense' | 'scenarios' | 'valuation'>('scenarios');
  const [isGenerating, setIsGenerating] = useState(false);

  const data = stageData as Partial<ProFormaStageData>;
  const scenarios = data.scenarios;
  const valuation = data.valuationOutput;

  const generateProForma = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/workspace/proforma`, { method: 'POST' });
      if (res.ok) {
        const result = await res.json();
        onUpdate(result);
      }
    } catch (err) {
      console.error('Failed to generate pro forma:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Empty state
  if (!scenarios) {
    return (
      <div className="text-center py-16 bg-surface-50 dark:bg-surface-800/50 rounded-xl max-w-3xl mx-auto">
        <Calculator className="w-12 h-12 text-surface-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-surface-700 dark:text-surface-300 mb-2">Generate Pro Forma</h3>
        <p className="text-sm text-surface-500 mb-6 max-w-md mx-auto">
          Build a 5-year financial model with base, bull, and bear scenarios using your intake data and market benchmarks.
        </p>
        <button
          onClick={generateProForma}
          disabled={isGenerating}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium transition-colors flex items-center gap-2 mx-auto"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calculator className="w-4 h-4" />}
          {isGenerating ? 'Generating...' : 'Generate 5-Year Pro Forma'}
        </button>
      </div>
    );
  }

  // Key metrics summary bar
  const baseScenario = scenarios.base;
  const raw = stageData as Record<string, unknown>;
  const revenueModel = raw.revenueModel as Record<string, unknown> | undefined;
  const currentRevenue = (revenueModel?.currentRevenue as number) || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Key Metrics Summary */}
      <div className="grid grid-cols-4 gap-3">
        <MetricChip
          label="Current Revenue"
          value={currentRevenue ? `$${formatCompact(currentRevenue)}` : '—'}
          icon={<DollarSign className="w-3.5 h-3.5" />}
        />
        <MetricChip
          label="Base Y3 EBITDA"
          value={`$${formatCompact(baseScenario?.year3Ebitda)}`}
          icon={<BarChart3 className="w-3.5 h-3.5" />}
        />
        <MetricChip
          label="Base Implied Value"
          value={`$${formatCompact(baseScenario?.impliedValue)}`}
          icon={<Building2 className="w-3.5 h-3.5" />}
        />
        <MetricChip
          label="Base IRR"
          value={baseScenario?.irr ? `${baseScenario.irr.toFixed(1)}%` : '—'}
          icon={<TrendingUp className="w-3.5 h-3.5" />}
          highlight={baseScenario?.irr && baseScenario.irr > 15}
        />
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-surface-100 dark:bg-surface-800 rounded-lg p-1">
        {(['revenue', 'expense', 'scenarios', 'valuation'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors capitalize',
              activeTab === tab
                ? 'bg-white dark:bg-surface-700 text-surface-900 dark:text-surface-100 shadow-sm'
                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
            )}
          >
            {tab === 'revenue' ? 'Revenue Model' : tab === 'expense' ? 'Expense Model' : tab === 'scenarios' ? 'Scenarios' : 'Valuation'}
          </button>
        ))}
      </div>

      {/* Revenue Model */}
      {activeTab === 'revenue' && (
        <div className="space-y-4">
          {/* Census Projections */}
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Census Projections (5-Year)</h3>
            {data.revenueModel?.censusProjections && data.revenueModel.censusProjections.length > 0 ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200 dark:border-surface-700">
                    <th className="text-left px-3 py-2 text-xs text-surface-500">Year</th>
                    <th className="text-right px-3 py-2 text-xs text-surface-500">Occupancy</th>
                    <th className="text-right px-3 py-2 text-xs text-surface-500">ADC</th>
                    <th className="text-right px-3 py-2 text-xs text-surface-500">Medicare</th>
                    <th className="text-right px-3 py-2 text-xs text-surface-500">Medicaid</th>
                    <th className="text-right px-3 py-2 text-xs text-surface-500">Private</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                  {data.revenueModel.censusProjections.map(yr => (
                    <tr key={yr.year}>
                      <td className="px-3 py-2 font-medium">Year {yr.year}</td>
                      <td className="text-right px-3 py-2">{(yr.occupancy * 100).toFixed(1)}%</td>
                      <td className="text-right px-3 py-2">{yr.adc}</td>
                      <td className="text-right px-3 py-2 text-blue-600">{yr.medicareAdc}</td>
                      <td className="text-right px-3 py-2 text-amber-600">{yr.medicaidAdc}</td>
                      <td className="text-right px-3 py-2 text-emerald-600">{yr.privatPayAdc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-surface-500">Census projections will populate after generation.</p>
            )}
          </div>

          {/* Payer Mix Revenue Breakdown */}
          {revenueModel?.payerMixRevenue && (
            <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Payer Mix Revenue (Current Year)</h3>
              <div className="grid grid-cols-3 gap-4">
                {(['medicare', 'medicaid', 'privatePay'] as const).map(payer => {
                  const pmr = revenueModel.payerMixRevenue as Record<string, { adc: number; ratePerDay: number; annualRevenue: number }>;
                  const p = pmr[payer];
                  if (!p) return null;
                  const colors = { medicare: 'blue', medicaid: 'amber', privatePay: 'emerald' };
                  const labels = { medicare: 'Medicare', medicaid: 'Medicaid', privatePay: 'Private Pay' };
                  const color = colors[payer];
                  return (
                    <div key={payer} className={`bg-${color}-50 dark:bg-${color}-900/10 rounded-lg p-4 border border-${color}-100 dark:border-${color}-800/30`}>
                      <p className={`text-xs font-medium text-${color}-600 dark:text-${color}-400 mb-2`}>{labels[payer]}</p>
                      <p className="text-lg font-semibold text-surface-800 dark:text-surface-200">${formatCompact(p.annualRevenue)}</p>
                      <div className="mt-2 space-y-1 text-xs text-surface-500">
                        <div className="flex justify-between"><span>ADC</span><span>{p.adc.toFixed(1)}</span></div>
                        <div className="flex justify-between"><span>Rate/Day</span><span>${p.ratePerDay}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Revenue Enhancements */}
          {data.revenueModel?.enhancementOpportunities && data.revenueModel.enhancementOpportunities.length > 0 && (
            <div className="border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">Revenue Enhancement Opportunities</h3>
              <ul className="space-y-1.5">
                {data.revenueModel.enhancementOpportunities.map((opp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                    <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    {opp}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Expense Model */}
      {activeTab === 'expense' && (
        <div className="space-y-4">
          {/* Labor Summary */}
          {(raw.expenseModel as Record<string, unknown>) && (
            <div className="grid grid-cols-3 gap-3">
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4">
                <p className="text-xs text-surface-500 mb-1">Total Labor</p>
                <p className="text-lg font-semibold text-surface-800 dark:text-surface-200">
                  ${formatCompact((raw.expenseModel as Record<string, unknown>).laborCost as number)}
                </p>
                <p className="text-xs text-surface-400 mt-1">
                  {((raw.expenseModel as Record<string, unknown>).laborPercent as number)?.toFixed(0)}% of expenses
                </p>
              </div>
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4">
                <p className="text-xs text-surface-500 mb-1">Agency Spend</p>
                <p className="text-lg font-semibold text-red-600">
                  ${formatCompact((raw.expenseModel as Record<string, unknown>).agencySpend as number)}
                </p>
                <p className="text-xs text-surface-400 mt-1">Agency labor premium</p>
              </div>
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4">
                <p className="text-xs text-surface-500 mb-1">Total OpEx</p>
                <p className="text-lg font-semibold text-surface-800 dark:text-surface-200">
                  ${formatCompact((raw.expenseModel as Record<string, unknown>).totalExpenses as number)}
                </p>
                <p className="text-xs text-surface-400 mt-1">All operating expenses</p>
              </div>
            </div>
          )}

          {/* Expense Categories */}
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-3">Expense Breakdown</h3>
            {data.expenseModel?.otherOpex && data.expenseModel.otherOpex.length > 0 ? (
              <div className="space-y-2.5">
                {data.expenseModel.otherOpex.map(cat => {
                  const pctOfMax = cat.projectedAmount / Math.max(...data.expenseModel!.otherOpex.map(c => c.projectedAmount)) * 100;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-surface-700 dark:text-surface-300">{cat.category}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-surface-400">
                            Bench: {cat.benchmarkPercent.low.toFixed(0)}–{cat.benchmarkPercent.high.toFixed(0)}%
                          </span>
                          <span className="text-sm font-medium text-surface-800 dark:text-surface-200 w-20 text-right">
                            ${formatCompact(cat.projectedAmount)}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-100 dark:bg-surface-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-400 dark:bg-primary-500 rounded-full transition-all"
                          style={{ width: `${Math.min(pctOfMax, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-surface-500">Expense projections will populate after generation.</p>
            )}
          </div>
        </div>
      )}

      {/* Scenario Comparison */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Scenario Analysis</h3>
            <button
              onClick={generateProForma}
              disabled={isGenerating}
              className="px-3 py-1.5 text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <RefreshCw className={cn("w-3 h-3", isGenerating && "animate-spin")} /> Regenerate
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(['bear', 'base', 'bull'] as const).map(scenario => {
              const s = scenarios[scenario];
              if (!s) return null;
              return <ScenarioCard key={scenario} scenario={s} type={scenario} />;
            })}
          </div>

          {/* Sensitivity table */}
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
            <div className="bg-surface-50 dark:bg-surface-800 px-4 py-2.5">
              <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300">Sensitivity Matrix</h4>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 dark:border-surface-700">
                  <th className="text-left px-4 py-2 text-xs text-surface-500">Metric</th>
                  <th className="text-right px-4 py-2 text-xs text-red-500">Bear</th>
                  <th className="text-right px-4 py-2 text-xs text-surface-500">Base</th>
                  <th className="text-right px-4 py-2 text-xs text-emerald-500">Bull</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                <SensitivityRow label="Occupancy Δ" bear={scenarios.bear?.assumptions.occupancyChange} base={scenarios.base?.assumptions.occupancyChange} bull={scenarios.bull?.assumptions.occupancyChange} isPercent />
                <SensitivityRow label="CMI Δ" bear={scenarios.bear?.assumptions.cmiChange} base={scenarios.base?.assumptions.cmiChange} bull={scenarios.bull?.assumptions.cmiChange} />
                <SensitivityRow label="Medicaid Rate Δ" bear={scenarios.bear?.assumptions.medicaidRateChange} base={scenarios.base?.assumptions.medicaidRateChange} bull={scenarios.bull?.assumptions.medicaidRateChange} isPercent />
                <SensitivityRow label="Labor Cost Δ" bear={scenarios.bear?.assumptions.laborCostChange} base={scenarios.base?.assumptions.laborCostChange} bull={scenarios.bull?.assumptions.laborCostChange} isPercent />
                <tr className="font-semibold bg-surface-50 dark:bg-surface-800">
                  <td className="px-4 py-2">Year 3 EBITDA</td>
                  <td className="text-right px-4 py-2 text-red-600">${formatCompact(scenarios.bear?.year3Ebitda)}</td>
                  <td className="text-right px-4 py-2">${formatCompact(scenarios.base?.year3Ebitda)}</td>
                  <td className="text-right px-4 py-2 text-emerald-600">${formatCompact(scenarios.bull?.year3Ebitda)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="px-4 py-2">Implied Value</td>
                  <td className="text-right px-4 py-2 text-red-600">${formatCompact(scenarios.bear?.impliedValue)}</td>
                  <td className="text-right px-4 py-2">${formatCompact(scenarios.base?.impliedValue)}</td>
                  <td className="text-right px-4 py-2 text-emerald-600">${formatCompact(scenarios.bull?.impliedValue)}</td>
                </tr>
                <tr className="font-semibold">
                  <td className="px-4 py-2">IRR (5-yr)</td>
                  <td className="text-right px-4 py-2 text-red-600">{scenarios.bear?.irr?.toFixed(1) ?? '—'}%</td>
                  <td className="text-right px-4 py-2">{scenarios.base?.irr?.toFixed(1) ?? '—'}%</td>
                  <td className="text-right px-4 py-2 text-emerald-600">{scenarios.bull?.irr?.toFixed(1) ?? '—'}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Valuation Output */}
      {activeTab === 'valuation' && (
        <div className="space-y-4">
          {valuation ? (
            <>
              <div className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200 mb-4">Valuation Summary</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <ValuationMetric label="Cap Rate Indicated" value={valuation.capRateValuation} />
                  <ValuationMetric label="EBITDA Multiple" value={valuation.ebitdaMultipleValuation} />
                  <ValuationMetric label="DCF Value" value={valuation.dcfValuation} />
                  <ValuationMetric
                    label="Price Per Bed"
                    value={null}
                    displayText={valuation.pricePerBed ? `$${valuation.pricePerBed.toLocaleString()}` : '—'}
                  />
                </div>
                <div className="border-t border-surface-200 dark:border-surface-700 pt-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-surface-500">CIL Assessment</span>
                    <p className={cn(
                      'text-sm font-semibold',
                      valuation.cilAssessment === 'PRICED_BELOW' ? 'text-emerald-600' :
                      valuation.cilAssessment === 'AT' ? 'text-surface-600' :
                      'text-red-600'
                    )}>
                      {valuation.cilAssessment?.replace('_', ' ') || 'AT'} Market
                    </p>
                  </div>
                  {valuation.negotiationRange && (
                    <div className="text-right">
                      <span className="text-xs text-surface-500">Negotiation Range</span>
                      <p className="text-sm font-semibold text-surface-800 dark:text-surface-200">
                        ${formatCompact(valuation.negotiationRange.low)} – ${formatCompact(valuation.negotiationRange.high)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Yearly Projections Table */}
              {(raw.yearlyProjections as Array<{ year: number; revenue: number; expenses: number; ebitda: number; noi: number; occupancy: number }>) && (
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden">
                  <div className="bg-surface-50 dark:bg-surface-800 px-4 py-2.5">
                    <h4 className="text-xs font-semibold text-surface-600 dark:text-surface-300">Base Case Yearly Projections</h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200 dark:border-surface-700">
                        <th className="text-left px-4 py-2 text-xs text-surface-500">Year</th>
                        <th className="text-right px-4 py-2 text-xs text-surface-500">Revenue</th>
                        <th className="text-right px-4 py-2 text-xs text-surface-500">Expenses</th>
                        <th className="text-right px-4 py-2 text-xs text-surface-500">EBITDA</th>
                        <th className="text-right px-4 py-2 text-xs text-surface-500">NOI</th>
                        <th className="text-right px-4 py-2 text-xs text-surface-500">Occ %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                      {(raw.yearlyProjections as Array<{ year: number; revenue: number; expenses: number; ebitda: number; noi: number; occupancy: number }>).map(yr => (
                        <tr key={yr.year}>
                          <td className="px-4 py-2 font-medium">Y{yr.year}</td>
                          <td className="text-right px-4 py-2">${formatCompact(yr.revenue)}</td>
                          <td className="text-right px-4 py-2 text-surface-500">${formatCompact(yr.expenses)}</td>
                          <td className="text-right px-4 py-2 font-medium">${formatCompact(yr.ebitda)}</td>
                          <td className="text-right px-4 py-2">${formatCompact(yr.noi)}</td>
                          <td className="text-right px-4 py-2">{yr.occupancy.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
              <DollarSign className="w-10 h-10 text-surface-300 mx-auto mb-3" />
              <p className="text-sm text-surface-500">Valuation output will appear after pro forma generation</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────

function MetricChip({ label, value, icon, highlight }: { label: string; value: string; icon: React.ReactNode; highlight?: boolean | null }) {
  return (
    <div className={cn(
      'border rounded-xl p-3 transition-colors',
      highlight ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10' : 'border-surface-200 dark:border-surface-700'
    )}>
      <div className="flex items-center gap-1.5 text-surface-400 mb-1">{icon}<span className="text-[11px]">{label}</span></div>
      <p className={cn('text-base font-semibold', highlight ? 'text-emerald-600' : 'text-surface-800 dark:text-surface-200')}>{value}</p>
    </div>
  );
}

function ScenarioCard({ scenario, type }: { scenario: ScenarioResult; type: 'bear' | 'base' | 'bull' }) {
  const colors = {
    bear: 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/5',
    base: 'border-surface-200 dark:border-surface-700',
    bull: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-900/5',
  };

  return (
    <div className={cn('border rounded-xl p-4 space-y-3', colors[type])}>
      <div className="flex items-center gap-2">
        {type === 'bear' && <TrendingDown className="w-4 h-4 text-red-500" />}
        {type === 'base' && <DollarSign className="w-4 h-4 text-surface-500" />}
        {type === 'bull' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
        <span className="text-sm font-semibold capitalize text-surface-800 dark:text-surface-200">{scenario.label || `${type} Case`}</span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-surface-500">Year 3 EBITDA</span>
          <span className="font-medium">${formatCompact(scenario.year3Ebitda)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-surface-500">Year 5 EBITDA</span>
          <span className="font-medium">${formatCompact(scenario.year5Ebitda)}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-surface-200 dark:border-surface-700 pt-2 mt-1">
          <span className="text-surface-500">Implied Value</span>
          <span className="font-semibold">${formatCompact(scenario.impliedValue)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-surface-500">5-Year IRR</span>
          <span className={cn(
            'font-semibold',
            scenario.irr && scenario.irr > 20 ? 'text-emerald-600' : scenario.irr && scenario.irr < 10 ? 'text-red-600' : ''
          )}>
            {scenario.irr?.toFixed(1) ?? '—'}%
          </span>
        </div>
      </div>
    </div>
  );
}

function SensitivityRow({ label, bear, base, bull, isPercent }: {
  label: string; bear?: number; base?: number; bull?: number; isPercent?: boolean;
}) {
  const fmt = (v?: number) => {
    if (v === undefined || v === null) return '—';
    if (isPercent) return `${v > 0 ? '+' : ''}${(v * 100).toFixed(1)}%`;
    return `${v > 0 ? '+' : ''}${v.toFixed(2)}`;
  };
  return (
    <tr>
      <td className="px-4 py-2 text-surface-700 dark:text-surface-300">{label}</td>
      <td className="text-right px-4 py-2 text-red-600">{fmt(bear)}</td>
      <td className="text-right px-4 py-2 text-surface-600">{fmt(base)}</td>
      <td className="text-right px-4 py-2 text-emerald-600">{fmt(bull)}</td>
    </tr>
  );
}

function ValuationMetric({ label, value, displayText, subtext }: { label: string; value: number | null | undefined; displayText?: string; subtext?: string }) {
  return (
    <div className="bg-white dark:bg-surface-900 rounded-lg p-4 border border-surface-200 dark:border-surface-700">
      <p className="text-xs text-surface-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-surface-800 dark:text-surface-200">
        {displayText || (value ? `$${formatCompact(value)}` : '—')}
      </p>
      {subtext && <p className="text-xs text-surface-400 mt-0.5">{subtext}</p>}
    </div>
  );
}

function formatCompact(value?: number | null): string {
  if (!value) return '—';
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString();
}
