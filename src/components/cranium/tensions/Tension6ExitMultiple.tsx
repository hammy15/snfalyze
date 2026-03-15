'use client'

import { cn } from '@/lib/utils'
import { ACTIVE_DEALS } from '../mock-data'
import { Calendar, AlertTriangle, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

const STABILIZATION_ALERT_MONTHS = 18

const deals = ACTIVE_DEALS.map(d => {
  const gap = d.projectedTimeline - d.targetTimeline
  const compressedMultiple = d.targetExitMultiple - (gap > 0 ? gap * 0.04 : 0)
  const flagged = gap > STABILIZATION_ALERT_MONTHS
  const light: 'green' | 'yellow' | 'red' = gap <= 0 ? 'green' : gap <= 6 ? 'yellow' : 'red'
  return { ...d, gap, compressedMultiple, flagged, light }
})

// Simulated exit multiple decay curves for each deal
function buildCurve(deal: typeof deals[0]) {
  const points = []
  for (let m = 0; m <= 60; m += 6) {
    const decay = m > deal.targetTimeline ? (m - deal.targetTimeline) * 0.04 : 0
    points.push({
      month: m,
      targetMultiple: deal.targetExitMultiple,
      projectedMultiple: m <= deal.projectedTimeline
        ? deal.targetExitMultiple - (m > deal.targetTimeline ? decay : 0)
        : null,
    })
  }
  return points
}

const LIGHT_COLORS: Record<string, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-400',
  red: 'bg-rose-500',
}
const LIGHT_TEXT: Record<string, string> = {
  green: 'text-emerald-400',
  yellow: 'text-amber-400',
  red: 'text-rose-400',
}

const RECS: Record<string, { rec: string; reasoning: string }> = {
  d1: {
    rec: 'Proceed-with-conditions',
    reasoning: 'Pacific NW projected 2 months past target timeline. Exit multiple compresses marginally to 11.4×. Include performance triggers in operating agreement: if 28-month occupancy < 85%, seller required to contribute $500K to stabilization fund.',
  },
  d2: {
    rec: 'Revisit',
    reasoning: 'Nevada ALF projects 7 months beyond target. Exit multiple compresses from 10.0× to 9.7×. At current pricing, this pushes IRR below 18% threshold. Require operator performance bond or add pricing contingency tied to 30-month stabilization milestone.',
  },
  d3: {
    rec: 'Proceed',
    reasoning: 'Colorado SNF on track — projected 4 months ahead of target. Exit at 12.0× highly achievable. No timeline concerns. Execute LOI with standard exit covenants.',
  },
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs">
      <p className="text-gray-400 mb-0.5">Month {label}</p>
      {payload.map((p: any) => p.value !== null && (
        <div key={p.name} className="flex justify-between gap-3">
          <span className="text-gray-500">{p.name}</span>
          <span style={{ color: p.stroke }}>{p.value?.toFixed(1)}×</span>
        </div>
      ))}
    </div>
  )
}

export function Tension6ExitMultiple() {
  const flaggedDeals = deals.filter(d => d.gap > 6)

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800">
          <span className="text-xs font-bold text-cyan-400">T6</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Exit Multiple vs. Stabilization Timeline</h3>
          <p className="text-[10px] text-gray-500">Exit multiple at target date vs. actual stabilization projection</p>
        </div>
        {flaggedDeals.length > 0 && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950 border border-amber-800">
            <Clock className="w-3 h-3 text-amber-400" />
            <span className="text-[10px] font-bold text-amber-400">{flaggedDeals.length} TIMELINE RISK</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {deals.map(d => {
          const rec = RECS[d.id]
          const curve = buildCurve(d)

          return (
            <div key={d.id} className="rounded-xl border border-gray-800 bg-gray-900/40 overflow-hidden">
              {/* Deal row */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800/60">
                <div className={cn('w-2.5 h-2.5 rounded-full', LIGHT_COLORS[d.light])} />
                <span className="text-sm font-semibold text-white">{d.shortName}</span>

                {/* Split metrics */}
                <div className="ml-auto flex items-center gap-4 text-xs">
                  {/* Side A: Target */}
                  <div className="text-right">
                    <div className="text-[9px] text-gray-600 uppercase">Target</div>
                    <div className="text-white font-bold">{d.targetExitMultiple}× <span className="text-gray-500 font-normal">/ {d.targetTimeline}mo</span></div>
                  </div>
                  <div className="w-px h-8 bg-gray-800" />
                  {/* Side B: Projected */}
                  <div className="text-right">
                    <div className="text-[9px] text-gray-600 uppercase">Projected</div>
                    <div className={cn('font-bold', LIGHT_TEXT[d.light])}>
                      {d.compressedMultiple.toFixed(1)}× <span className="text-gray-500 font-normal">/ {d.projectedTimeline}mo</span>
                    </div>
                  </div>
                  {/* Gap */}
                  {d.gap > 0 && (
                    <span className="text-[9px] text-amber-400 border border-amber-900 rounded px-1.5 py-0.5">
                      +{d.gap}mo
                    </span>
                  )}
                  {d.gap <= 0 && (
                    <span className="text-[9px] text-emerald-400 border border-emerald-900 rounded px-1.5 py-0.5">
                      {d.gap}mo
                    </span>
                  )}
                </div>
              </div>

              {/* Mini chart */}
              <div className="px-4 pt-2 pb-1">
                <ResponsiveContainer width="100%" height={70}>
                  <LineChart data={curve} margin={{ top: 5, right: 10, bottom: 0, left: -25 }}>
                    <XAxis dataKey="month" tick={{ fill: '#4b5563', fontSize: 8 }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => v === 0 ? '' : `${v}mo`} interval={1} />
                    <YAxis tick={{ fill: '#4b5563', fontSize: 8 }} axisLine={false} tickLine={false}
                      domain={[Math.floor(d.targetExitMultiple - 1), Math.ceil(d.targetExitMultiple + 0.5)]} />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#374151' }} />
                    <ReferenceLine x={d.targetTimeline} stroke="#374151" strokeDasharray="3 3" />
                    <Line dataKey="targetMultiple" name="Target" stroke="#374151" strokeWidth={1} strokeDasharray="4 4" dot={false} />
                    <Line dataKey="projectedMultiple" name="Projected" stroke={d.light === 'green' ? '#10b981' : d.light === 'yellow' ? '#f59e0b' : '#ef4444'}
                      strokeWidth={2} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* CIL Rec */}
              <div className={cn(
                'mx-3 mb-3 px-3 py-2.5 rounded-lg border',
                d.light === 'green' ? 'border-emerald-900 bg-emerald-950/20' :
                  d.light === 'yellow' ? 'border-amber-900 bg-amber-950/20' :
                    'border-rose-900 bg-rose-950/20'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={cn('w-2 h-2 rounded-full', LIGHT_COLORS[d.light])} />
                  <span className={cn('text-xs font-bold', LIGHT_TEXT[d.light])}>CIL: {rec.rec}</span>
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
