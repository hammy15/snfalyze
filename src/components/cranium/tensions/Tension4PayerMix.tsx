'use client'

import { cn } from '@/lib/utils'
import { ACTIVE_DEALS } from '../mock-data'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'

const THRESHOLD = 5 // pp flag threshold

const chartData = ACTIVE_DEALS.map(d => ({
  name: d.shortName,
  uw: d.uwMedicarePct,
  regression: d.regressionMedicarePct,
  delta: d.uwMedicarePct - d.regressionMedicarePct,
  flagged: (d.uwMedicarePct - d.regressionMedicarePct) > THRESHOLD,
}))

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-white mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-gray-400">{p.name}</span>
          <span style={{ color: p.fill }}>{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export function Tension4PayerMix() {
  const flaggedCount = chartData.filter(d => d.flagged).length

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/60">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-950 border border-purple-800">
          <span className="text-xs font-bold text-purple-400">T4</span>
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Payer Mix Optimism vs. Regression</h3>
          <p className="text-[10px] text-gray-500">UW Medicare projection vs. CIL historical regression</p>
        </div>
        {flaggedCount > 0 && (
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950 border border-rose-800">
            <AlertTriangle className="w-3 h-3 text-rose-400" />
            <span className="text-[10px] font-bold text-rose-400">{flaggedCount} &gt;5pp</span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {/* Split panel: top row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left: What UW says */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase font-medium mb-3 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-sky-400" /> UW Projection
            </p>
            <div className="space-y-2">
              {chartData.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 truncate max-w-[80px]">{d.name.split(' ')[0]}</span>
                    <span className="text-sky-400 font-semibold">{d.uw}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full">
                    <div className="h-full bg-sky-500 rounded-full" style={{ width: `${d.uw}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: CIL regression */}
          <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase font-medium mb-3 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" /> CIL Regression
            </p>
            <div className="space-y-2">
              {chartData.map(d => (
                <div key={d.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-400 truncate max-w-[80px]">{d.name.split(' ')[0]}</span>
                    <span className="text-amber-400 font-semibold">{d.regression}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-800 rounded-full">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${d.regression}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Grouped bar chart comparison */}
        <div>
          <p className="text-[10px] text-gray-500 uppercase font-medium mb-2">Medicare % Comparison</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={chartData} barGap={2} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => v.split(' ')[0]} />
              <YAxis tick={{ fill: '#4b5563', fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 70]} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="uw" name="UW Projection" radius={[2, 2, 0, 0]}>
                {chartData.map(d => (
                  <Cell key={d.name} fill={d.flagged ? '#0ea5e9' : '#0ea5e9'} opacity={0.9} />
                ))}
              </Bar>
              <Bar dataKey="regression" name="CIL Regression" radius={[2, 2, 0, 0]}>
                {chartData.map(d => (
                  <Cell key={d.name} fill="#f59e0b" opacity={0.9} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Delta table */}
        <div className="rounded-xl border border-gray-800 overflow-hidden">
          <div className="grid grid-cols-4 px-3 py-2 bg-gray-900/60 text-[10px] text-gray-500 uppercase font-medium">
            <span>Deal</span>
            <span className="text-center">UW</span>
            <span className="text-center">Regression</span>
            <span className="text-right">Delta</span>
          </div>
          {chartData.map(d => (
            <div key={d.name} className={cn(
              'grid grid-cols-4 px-3 py-2.5 border-t border-gray-800/60 text-xs',
              d.flagged ? 'bg-rose-950/20' : ''
            )}>
              <span className="text-gray-300 truncate">{d.name.split(' ')[0]}</span>
              <span className="text-center text-sky-400">{d.uw}%</span>
              <span className="text-center text-amber-400">{d.regression}%</span>
              <span className={cn('text-right font-bold', d.flagged ? 'text-rose-400' : 'text-emerald-400')}>
                {d.flagged && '⚠ '}+{d.delta}pp
              </span>
            </div>
          ))}
        </div>

        {/* CIL Recommendation */}
        <div className="px-3 py-2.5 rounded-lg border border-rose-900 bg-rose-950/30">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-bold text-rose-400">CIL: Revisit Pacific NW + Colorado SNF</span>
          </div>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Both deals exceed the 5pp optimism threshold. Adjust Pacific NW pro forma to 46% Medicare (returns compress to ~7.9% — re-examine pricing). Colorado SNF at 42% still clears 8.7% — viable but rerun sensitivity. Nevada ALF delta of +3pp within tolerance.
          </p>
        </div>
      </div>
    </div>
  )
}
