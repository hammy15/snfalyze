'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Building2,
  BarChart3,
} from 'lucide-react';

// Cascadia's exact business rules from prompts.ts
const CASCADIA_RULES = {
  snfOwned: { capRate: 0.125, label: 'SNF-Owned', method: 'EBITDAR / 12.5% Cap' },
  leased: { multiplier: 2.5, range: [2.0, 3.0], label: 'Leased', method: 'EBIT × 2.5x' },
  alfOwned0: { capRate: 0.08, label: 'ALF (0% SNC)', method: 'EBITDAR / 8% Cap' },
  alfOwned33: { capRate: 0.09, label: 'ALF (≤33% SNC)', method: 'EBITDAR / 9% Cap' },
  alfOwnedHigh: { capRate: 0.12, label: 'ALF (>33% SNC)', method: 'EBITDAR / 12% Cap' },
};

const LENDER_RULES = {
  snfOwned: { capRate: 0.14, label: 'SNF-Owned (Lender)', method: 'EBITDAR / 14% Cap' },
  leased: { multiplier: 2.0, label: 'Leased (Lender)', method: 'EBIT × 2.0x' },
};

const MARKET_BENCHMARKS = {
  premium: { revenueMultiple: [1.2, 1.8], ebitdaMultiple: [8, 12], pricePerBed: [25000, 40000], label: 'Premium' },
  growth: { revenueMultiple: [0.8, 1.4], ebitdaMultiple: [6, 9], pricePerBed: [15000, 30000], label: 'Growth' },
  value: { revenueMultiple: [0.6, 1.2], ebitdaMultiple: [4, 7], pricePerBed: [10000, 20000], label: 'Value' },
};

interface ScreenResult {
  cascadiaValue: number;
  lenderValue: number;
  pricePerBed: number;
  impliedCapRate: number;
  ebitdaMultiple: number;
  coverageRatio: number;
  marketTier: 'premium' | 'growth' | 'value';
  signal: 'go' | 'conditional' | 'pass';
  reasons: string[];
  adjustments: string[];
}

export default function QuickScreenPage() {
  const [askingPrice, setAskingPrice] = useState<number | ''>('');
  const [beds, setBeds] = useState<number | ''>('');
  const [ebitda, setEbitda] = useState<number | ''>('');
  const [revenue, setRevenue] = useState<number | ''>('');
  const [dealType, setDealType] = useState<'snf_owned' | 'leased' | 'alf'>('snf_owned');
  const [cmsRating, setCmsRating] = useState<number>(3);
  const [agencyPct, setAgencyPct] = useState<number | ''>('');
  const [isPortfolio, setIsPortfolio] = useState(false);
  const [isCON, setIsCON] = useState(false);

  const result: ScreenResult | null = (() => {
    if (!askingPrice || !beds || !ebitda) return null;

    const price = Number(askingPrice);
    const bedCount = Number(beds);
    const ebitdaVal = Number(ebitda);
    const revenueVal = Number(revenue) || 0;
    const agency = Number(agencyPct) || 0;

    // Cascadia valuation
    let cascadiaValue: number;
    let lenderValue: number;

    if (dealType === 'snf_owned') {
      cascadiaValue = ebitdaVal / CASCADIA_RULES.snfOwned.capRate;
      lenderValue = ebitdaVal / LENDER_RULES.snfOwned.capRate;
    } else if (dealType === 'leased') {
      cascadiaValue = ebitdaVal * CASCADIA_RULES.leased.multiplier;
      lenderValue = ebitdaVal * LENDER_RULES.leased.multiplier;
    } else {
      cascadiaValue = ebitdaVal / CASCADIA_RULES.alfOwned33.capRate; // Default mid
      lenderValue = ebitdaVal / (CASCADIA_RULES.alfOwned33.capRate + 0.02);
    }

    // Apply adjustments
    let adjustedCascadiaValue = cascadiaValue;
    const adjustments: string[] = [];

    if (cmsRating >= 4) {
      adjustedCascadiaValue *= 1.005; // -50 bps avg
      adjustments.push(`CMS ${cmsRating}-star: -50 bps cap rate adjustment (+)`);
    } else if (cmsRating <= 2) {
      adjustedCascadiaValue *= 0.99; // +100 bps avg
      adjustments.push(`CMS ${cmsRating}-star: +100 bps cap rate adjustment (-)`);
    }

    if (agency > 15) {
      adjustedCascadiaValue *= 0.993; // +75 bps avg
      adjustments.push(`High agency (${agency}%): +75 bps adjustment (-)`);
    }

    if (isPortfolio) {
      adjustedCascadiaValue *= 1.004; // -37 bps avg
      adjustments.push('Portfolio transaction: -37 bps adjustment (+)');
    }

    if (isCON) {
      adjustedCascadiaValue *= 1.003; // -27 bps avg
      adjustments.push('CON state: -27 bps adjustment (+)');
    }

    const pricePerBed = bedCount > 0 ? price / bedCount : 0;
    const impliedCapRate = price > 0 ? ebitdaVal / price : 0;
    const ebitdaMultiple = ebitdaVal > 0 ? price / ebitdaVal : 0;
    const coverageRatio = ebitdaVal > 0 ? ebitdaVal / (price * 0.065) : 0; // Assume ~6.5% debt service

    // Market tier
    let marketTier: 'premium' | 'growth' | 'value' = 'growth';
    if (pricePerBed >= 25000) marketTier = 'premium';
    else if (pricePerBed < 15000) marketTier = 'value';

    // Signal
    const reasons: string[] = [];
    let signal: 'go' | 'conditional' | 'pass' = 'go';

    // Price vs Cascadia value
    const priceToCascadia = price / adjustedCascadiaValue;
    if (priceToCascadia <= 0.9) {
      reasons.push(`Asking price ${((1 - priceToCascadia) * 100).toFixed(0)}% below Cascadia value — strong opportunity`);
    } else if (priceToCascadia <= 1.05) {
      reasons.push('Asking price within 5% of Cascadia value — fair pricing');
    } else if (priceToCascadia <= 1.15) {
      reasons.push(`Asking price ${((priceToCascadia - 1) * 100).toFixed(0)}% above Cascadia value — negotiate down`);
      signal = 'conditional';
    } else {
      reasons.push(`Asking price ${((priceToCascadia - 1) * 100).toFixed(0)}% above Cascadia value — likely overpriced`);
      signal = 'pass';
    }

    // Coverage ratio
    if (coverageRatio >= 1.5) {
      reasons.push(`Strong coverage ratio (${coverageRatio.toFixed(2)}x) — comfortable debt service`);
    } else if (coverageRatio >= 1.25) {
      reasons.push(`Adequate coverage (${coverageRatio.toFixed(2)}x) — tight but financeable`);
    } else {
      reasons.push(`Weak coverage (${coverageRatio.toFixed(2)}x) — financing risk`);
      if (signal === 'go') signal = 'conditional';
    }

    // Price per bed
    const benchmarks = MARKET_BENCHMARKS[marketTier];
    if (pricePerBed > benchmarks.pricePerBed[1]) {
      reasons.push(`Price/bed ($${Math.round(pricePerBed).toLocaleString()}) above ${marketTier} market range`);
      if (signal === 'go') signal = 'conditional';
    } else if (pricePerBed < benchmarks.pricePerBed[0]) {
      reasons.push(`Price/bed ($${Math.round(pricePerBed).toLocaleString()}) below ${marketTier} market — value play`);
    }

    // EBITDA margin
    if (revenueVal > 0) {
      const margin = ebitdaVal / revenueVal;
      if (margin < 0.10) {
        reasons.push(`Low EBITDA margin (${(margin * 100).toFixed(1)}%) — operational risk or upside`);
        if (signal === 'go') signal = 'conditional';
      } else if (margin > 0.20) {
        reasons.push(`Strong EBITDA margin (${(margin * 100).toFixed(1)}%) — well-operated`);
      }
    }

    return {
      cascadiaValue: adjustedCascadiaValue,
      lenderValue,
      pricePerBed,
      impliedCapRate,
      ebitdaMultiple,
      coverageRatio,
      marketTier,
      signal,
      reasons,
      adjustments,
    };
  })();

  const fmtCurrency = (v: number) => {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v.toLocaleString()}`;
  };

  const signalConfig = {
    go: { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/20', label: 'GO', border: 'border-emerald-200 dark:border-emerald-800' },
    conditional: { icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20', label: 'CONDITIONAL', border: 'border-amber-200 dark:border-amber-800' },
    pass: { icon: XCircle, color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20', label: 'PASS', border: 'border-red-200 dark:border-red-800' },
  };

  return (
    <div className="py-6 px-4 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary-500" />
          Quick Screen
        </h1>
        <p className="text-sm text-surface-500 mt-0.5">
          30-second go/no-go screening using Cascadia underwriting rules
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="space-y-4">
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5 space-y-4 bg-white dark:bg-surface-900">
            <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary-500" />
              Deal Parameters
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  Asking Price<span className="text-red-400 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">$</span>
                  <input
                    type="number"
                    value={askingPrice}
                    onChange={e => setAskingPrice(e.target.value ? Number(e.target.value) : '')}
                    placeholder="15,000,000"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  Total Beds<span className="text-red-400 ml-0.5">*</span>
                </label>
                <input
                  type="number"
                  value={beds}
                  onChange={e => setBeds(e.target.value ? Number(e.target.value) : '')}
                  placeholder="120"
                  className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  TTM EBITDAR<span className="text-red-400 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">$</span>
                  <input
                    type="number"
                    value={ebitda}
                    onChange={e => setEbitda(e.target.value ? Number(e.target.value) : '')}
                    placeholder="2,000,000"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                  TTM Revenue
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-surface-400">$</span>
                  <input
                    type="number"
                    value={revenue}
                    onChange={e => setRevenue(e.target.value ? Number(e.target.value) : '')}
                    placeholder="12,000,000"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">
                Deal Structure
              </label>
              <div className="flex gap-2">
                {[
                  { value: 'snf_owned', label: 'SNF-Owned' },
                  { value: 'leased', label: 'Leased' },
                  { value: 'alf', label: 'ALF/SNC' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDealType(opt.value as typeof dealType)}
                    className={cn(
                      'flex-1 px-3 py-2 text-xs font-medium rounded-lg border transition-colors',
                      dealType === opt.value
                        ? 'bg-primary-500 text-white border-primary-500'
                        : 'bg-white dark:bg-surface-900 text-surface-600 dark:text-surface-400 border-surface-200 dark:border-surface-700 hover:border-primary-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Adjustments */}
          <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-5 space-y-3 bg-white dark:bg-surface-900">
            <h2 className="text-sm font-semibold text-surface-800 dark:text-surface-200 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary-500" />
              Adjustments
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">CMS Rating</label>
                <select
                  value={cmsRating}
                  onChange={e => setCmsRating(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200"
                >
                  {[1, 2, 3, 4, 5].map(n => (
                    <option key={n} value={n}>{n} Star{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 dark:text-surface-400 mb-1">Agency Staff %</label>
                <input
                  type="number"
                  value={agencyPct}
                  onChange={e => setAgencyPct(e.target.value ? Number(e.target.value) : '')}
                  placeholder="5"
                  className="w-full px-3 py-2 text-sm border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
                <input type="checkbox" checked={isPortfolio} onChange={e => setIsPortfolio(e.target.checked)} className="rounded" />
                Portfolio (3+ facilities)
              </label>
              <label className="flex items-center gap-2 text-xs text-surface-600 dark:text-surface-400">
                <input type="checkbox" checked={isCON} onChange={e => setIsCON(e.target.checked)} className="rounded" />
                CON State
              </label>
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div className="space-y-4">
          {!result ? (
            <div className="border-2 border-dashed border-surface-200 dark:border-surface-700 rounded-xl p-12 text-center">
              <Calculator className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
              <p className="text-sm text-surface-500">Enter asking price, beds, and EBITDAR to screen</p>
            </div>
          ) : (
            <>
              {/* Signal */}
              {(() => {
                const cfg = signalConfig[result.signal];
                const SignalIcon = cfg.icon;
                return (
                  <div className={cn('border rounded-xl p-5', cfg.border, cfg.color)}>
                    <div className="flex items-center gap-3">
                      <SignalIcon className="w-8 h-8" />
                      <div>
                        <p className="text-xl font-bold">{cfg.label}</p>
                        <p className="text-xs opacity-80 mt-0.5">
                          {dealType === 'snf_owned' ? CASCADIA_RULES.snfOwned.method : dealType === 'leased' ? CASCADIA_RULES.leased.method : CASCADIA_RULES.alfOwned33.method}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider">Cascadia Value</p>
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-1">{fmtCurrency(result.cascadiaValue)}</p>
                  <p className={cn('text-xs mt-1', Number(askingPrice) <= result.cascadiaValue ? 'text-emerald-600' : 'text-red-500')}>
                    {Number(askingPrice) <= result.cascadiaValue ? (
                      <><TrendingDown className="w-3 h-3 inline mr-0.5" />{((1 - Number(askingPrice) / result.cascadiaValue) * 100).toFixed(0)}% below</>
                    ) : (
                      <><TrendingUp className="w-3 h-3 inline mr-0.5" />{((Number(askingPrice) / result.cascadiaValue - 1) * 100).toFixed(0)}% above</>
                    )}
                  </p>
                </div>
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider">Lender Value</p>
                  <p className="text-lg font-bold text-surface-800 dark:text-surface-200 mt-1">{fmtCurrency(result.lenderValue)}</p>
                  <p className="text-xs text-surface-500 mt-1">External / conservative</p>
                </div>
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider">Price / Bed</p>
                  <p className="text-lg font-bold text-surface-800 dark:text-surface-200 mt-1">{fmtCurrency(result.pricePerBed)}</p>
                  <p className="text-xs text-surface-500 mt-1 capitalize">{result.marketTier} market tier</p>
                </div>
                <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900">
                  <p className="text-[10px] text-surface-500 uppercase tracking-wider">Implied Cap Rate</p>
                  <p className="text-lg font-bold text-surface-800 dark:text-surface-200 mt-1">{(result.impliedCapRate * 100).toFixed(1)}%</p>
                  <p className="text-xs text-surface-500 mt-1">{result.ebitdaMultiple.toFixed(1)}x EBITDA multiple</p>
                </div>
              </div>

              {/* Reasons */}
              <div className="border border-surface-200 dark:border-surface-700 rounded-xl p-4 bg-white dark:bg-surface-900 space-y-2">
                <h3 className="text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider">Analysis</h3>
                {result.reasons.map((reason, i) => (
                  <p key={i} className="text-xs text-surface-600 dark:text-surface-400 leading-relaxed">
                    {reason}
                  </p>
                ))}
                {result.adjustments.length > 0 && (
                  <>
                    <h3 className="text-xs font-semibold text-surface-700 dark:text-surface-300 uppercase tracking-wider pt-2">Cap Rate Adjustments</h3>
                    {result.adjustments.map((adj, i) => (
                      <p key={i} className="text-[11px] text-surface-500 leading-relaxed">{adj}</p>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
