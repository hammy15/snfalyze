'use client'

import { cn } from '@/lib/utils'
import { ACTIVE_DEALS } from '../mock-data'
import { Zap, AlertTriangle, CheckCircle2 } from 'lucide-react'

const INTEGRATION_RATIO_FLAG = 0.50 // flag when integration cost > 50% of synergy

const deals = ACTIVE_DEALS.map(d => {
  const ratio = d.integrationCost / d.projectedSynergy
  const netSynergy = d.projectedSynergy - d.integrationCost
  const flagged = ratio > INTEGRATION_RATIO_FLAG
  return { ...d, ratio, netSynergy, flagged }
})

const RECS: Record<string, { rec: string; reasoning: string; light: 'green' | 'yellow' | 'red' }> = {
  d1: {
    light: 'yellow',
    rec: 'Revisit',
    reasoning: 'Integration cost ($1.8M) equals 64% of projected synergies. Net synergy of $1.0M is below the $1.5M minimum for a 320-bed portfolio. Negotiate cost-sharing with operator or reduce synergy assumptions to conservative case.',
  },
  d2: {
    light: 'green',
    rec: 'Proceed',
    reasoning: 'Integration ratio of 37% is within acceptable range. Net synergy of $1.2M at current assumptions. Monitor execution — synergy realization typically lags 6–9 months post-close.',
  },
  d3: {
    light: 'green',
    rec: 'Proceed',
    reasoning: 'Strong net synergy of $2.6M with 38% integration ratio. Largest portfolio in active pipeline — assign dedicated integration PM to ensure synergy capture does not slip below 80%.',
  },
}

const LIGHT_COLORS: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-rose-500',
}

function fmt(n: number) {
  return n >= 1000000
    ? `$${(n / 1000000).toFixed(1)}M`
    : `$${(n / 1000).toFixed(0)}K`
}

export function Tension5Synergy() {
  const flaggedCount = deals.filter(d => d.flagged).length

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-800">
          <span className="text-xs font-bold text-indigo-400">T5</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Synergy vs. Integration Cost</h3>
          <p className="text-[10px] text-gray-500">Projected synergies% vs. integration cost K/building</p>
        </div>
        {flaggedCount > 0 && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950 border border-amber-800">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400">{flaggedCount} &gt;50% ratio</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {deals.map(d => {
          const rec = RECS[d.id]
          const synergyBarPct = Math.min((d.projectedSynergy / 5000000) * 100, 100)
          const integrationBarPct = Math.min((d.integrationCost / 5000000) * 100, 100)
          const netBarPct = Math.max(Math.min((d.netSynergy / 5000000) * 100, 100), 0)

          return (
            <div key={d.id} className={cn(
              'rounded-xl border overflow-hidden',
              d.flagged ? 'border-amber-900/60 bg-amber-950/10' : 'border-gray-800 bg-gray-900/40'
            )}>
              {/* Deal header */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/60">
                <div className={cn('w-2.5 h-2.5 rounded-full', LIGHT_COLORS[rec.light])} />
                <span className="text-sm font-semibold text-white">{d.shortName}</span>
                <span className="text-xs text-gray-500">{d.beds} beds</span>
                {d.flagged && (
                  <span className="ml-auto text-[9px] font-bold text-amber-400 border border-amber-800 rounded px-1.5 py-0.5">
                    ⚠ RATIO {(d.ratio * 100).toFixed(0)}% &gt; 50%
                  </span>
                )}
                {!d.flagged && (
                  <span className="ml-auto text-[9px] font-bold text-emerald-400 border border-emerald-900 rounded px-1.5 py-0.5">
                    ✓ RATIO {(d.ratio * 100).toFixed(0)}%
                  </span>
                )}
              </div>

              {/* Split panel */}
              <div className="grid grid-cols-2 divide-x divide-gray-800/60">
                {/* Left: Synergies */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1 mb-2">
                    <Zap className="w-3 h-3 text-teal-400" />
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Synergies</p>
                  </div>
                  <p className="text-xl font-bold text-teal-400 mb-2">{fmt(d.projectedSynergy)}</p>
                  <div className="h-1.5 bg-gray-800 rounded-full">
                    <div className="h-full bg-teal-500 rounded-full" style={{ width: `${synergyBarPct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">{fmt(d.projectedSynergy / d.beds)}/bed</p>
                </div>

                {/* Right: Integration cost */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-1 mb-2">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <p className="text-[10px] text-gray-500 uppercase font-medium">Integration Cost</p>
                  </div>
                  <p className={cn('text-xl font-bold mb-2', d.flagged ? 'text-amber-400' : 'text-white')}>
                    {fmt(d.integrationCost)}
                  </p>
                  <div className="h-1.5 bg-gray-800 rounded-full">
                    <div className={cn('h-full rounded-full', d.flagged ? 'bg-amber-500' : 'bg-gray-500')}
                      style={{ width: `${integrationBarPct}%` }} />
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">{fmt(d.integrationCost / d.beds)}/bed</p>
                </div>
              </div>

              {/* Net synergy */}
              <div className="mx-4 mb-3 flex items-center gap-3">
                <span className="text-[10px] text-gray-500 uppercase font-medium">Net Synergy</span>
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${netBarPct}%` }} />
                </div>
                <span className={cn('text-sm font-bold', d.netSynergy > 1500000 ? 'text-emerald-400' : 'text-amber-400')}>
                  {fmt(d.netSynergy)}
                </span>
              </div>

              {/* CIL Rec */}
              <div className={cn(
                'mx-3 mb-3 px-3 py-2.5 rounded-lg border',
                rec.light === 'green' ? 'border-emerald-900 bg-emerald-950/20' : 'border-amber-900 bg-amber-950/20'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', LIGHT_COLORS[rec.light])} />
                  <span className="text-xs font-bold">{rec.light === 'green' ? <span className="text-emerald-400">CIL: {rec.rec}</span> : <span className="text-amber-400">CIL: {rec.rec}</span>}</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{rec.reasoning}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
