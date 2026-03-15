'use client'

import { cn } from '@/lib/utils'
import { ACTIVE_DEALS } from '../mock-data'
import { DollarSign, TrendingDown, AlertCircle } from 'lucide-react'

type TrafficLight = 'green' | 'yellow' | 'red'

interface DealRec {
  light: TrafficLight
  rec: 'Proceed' | 'Proceed-with-conditions' | 'Revisit' | 'Pass'
  reasoning: string
}

const RECS: Record<string, DealRec> = {
  d1: {
    light: 'yellow',
    rec: 'Proceed-with-conditions',
    reasoning: 'All-in cost is within range but 8.8% return is thin margin. Require seller holdback of 3–4% to protect against stabilization delay. Consider phased acquisition structure.',
  },
  d2: {
    light: 'red',
    rec: 'Revisit',
    reasoning: '7.2% adjusted return falls below CIL\'s 8% SNF floor and 8.5% ALF floor. Negotiate price to ~$220K/bed or require seller carry-back financing to bridge the return gap.',
  },
  d3: {
    light: 'green',
    rec: 'Proceed',
    reasoning: '9.4% adjusted return satisfies CIL methodology at current NOI. Building condition and market score both favorable. Proceed to formal LOI with standard covenants.',
  },
}

const LIGHT_COLORS: Record<TrafficLight, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-rose-500',
}

const LIGHT_TEXT: Record<TrafficLight, string> = {
  green: 'text-emerald-400',
  yellow: 'text-amber-400',
  red: 'text-rose-400',
}

const REC_COLORS: Record<string, string> = {
  Proceed: 'text-emerald-400 border-emerald-800 bg-emerald-950/50',
  'Proceed-with-conditions': 'text-amber-400 border-amber-800 bg-amber-950/50',
  Revisit: 'text-orange-400 border-orange-800 bg-orange-950/50',
  Pass: 'text-rose-400 border-rose-800 bg-rose-950/50',
}

const HURDLE = 9.0 // CIL hurdle rate
const FLOOR = 8.0 // minimum

export function Tension1Valuation() {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-950 border border-rose-800">
          <span className="text-xs font-bold text-rose-400">T1</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Valuation vs. Ops Cost</h3>
          <p className="text-[10px] text-gray-500">Purchase price + ops investment → adjusted return</p>
        </div>
        <AlertCircle className="w-4 h-4 text-rose-500 ml-auto" />
      </div>

      {/* Body */}
      <div className="p-5 space-y-4">
        {ACTIVE_DEALS.map(deal => {
          const rec = RECS[deal.id]
          const returnGap = deal.adjReturn - HURDLE
          const returnBarPct = Math.min((deal.adjReturn / 12) * 100, 100)

          return (
            <div key={deal.id} className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              {/* Deal header */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/60">
                <div className={cn('w-2.5 h-2.5 rounded-full', LIGHT_COLORS[rec.light])} />
                <span className="text-sm font-semibold text-white">{deal.shortName}</span>
                <span className="text-xs text-gray-500 ml-1">{deal.beds} beds · {deal.state}</span>
                <span className={cn('ml-auto text-xs font-bold', LIGHT_TEXT[rec.light])}>
                  {rec.light === 'green' ? '↑' : rec.light === 'yellow' ? '→' : '↓'} {deal.adjReturn}% return
                </span>
              </div>

              {/* Split panel */}
              <div className="grid grid-cols-2 divide-x divide-gray-800/60">
                {/* Left: Cost breakdown */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-gray-500 uppercase font-medium mb-2 flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> Cost Stack
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Purchase</span>
                      <span className="text-white font-medium">${(deal.priceBed / 1000).toFixed(0)}K/bed</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Ops invest.</span>
                      <span className="text-white font-medium">${(deal.opsCostBed / 1000).toFixed(0)}K/bed</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-gray-800/60 pt-1.5">
                      <span className="text-gray-300 font-semibold">All-in</span>
                      <span className="text-white font-bold">${(deal.allInCostBed / 1000).toFixed(0)}K/bed</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Total</span>
                      <span className="text-gray-300">${((deal.allInCostBed * deal.beds) / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                </div>

                {/* Right: Return gauge */}
                <div className="px-4 py-3">
                  <p className="text-[10px] text-gray-500 uppercase font-medium mb-2 flex items-center gap-1">
                    <TrendingDown className="w-3 h-3" /> Adjusted Return
                  </p>
                  {/* Bar gauge */}
                  <div className="relative mb-2">
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', LIGHT_COLORS[rec.light])}
                        style={{ width: `${returnBarPct}%` }}
                      />
                    </div>
                    {/* Floor marker */}
                    <div
                      className="absolute top-0 w-px h-2 bg-gray-500"
                      style={{ left: `${(FLOOR / 12) * 100}%` }}
                    />
                    {/* Hurdle marker */}
                    <div
                      className="absolute top-0 w-px h-2 bg-amber-500"
                      style={{ left: `${(HURDLE / 12) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-gray-600 mb-2">
                    <span>0%</span>
                    <span className="text-gray-500">↑floor {FLOOR}%</span>
                    <span className="text-amber-600">↑target {HURDLE}%</span>
                    <span>12%</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn('text-2xl font-bold', LIGHT_TEXT[rec.light])}>{deal.adjReturn}%</span>
                    <span className={cn('text-xs font-semibold', returnGap >= 0 ? 'text-emerald-500' : 'text-rose-500')}>
                      {returnGap >= 0 ? `+${returnGap.toFixed(1)}pp` : `${returnGap.toFixed(1)}pp`} vs target
                    </span>
                  </div>
                </div>
              </div>

              {/* CIL Recommendation */}
              <div className={cn('mx-3 mb-3 px-3 py-2.5 rounded-lg border', REC_COLORS[rec.rec])}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', LIGHT_COLORS[rec.light])} />
                  <span className="text-xs font-bold">CIL: {rec.rec}</span>
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
