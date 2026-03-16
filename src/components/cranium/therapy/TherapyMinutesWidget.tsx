'use client'

import { cn } from '@/lib/utils'
import { THERAPY_MINUTES } from '../mock-data'
import { Activity, CheckCircle2, AlertTriangle } from 'lucide-react'
const DISCIPLINE_COLORS = {
  PT: { bar: '#14b8a6', bg: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', light: 'bg-teal-50 dark:bg-teal-950/20' },
  OT: { bar: '#6366f1', bg: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', light: 'bg-indigo-50 dark:bg-indigo-950/20' },
  SLP: { bar: '#f97316', bg: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', light: 'bg-orange-50 dark:bg-orange-950/20' },
}

function inRange(val: number, min: number, max: number) {
  return val >= min && val <= max
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-surface-800 dark:text-surface-200 mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-surface-500">{p.name}</span>
          <span style={{ color: p.fill }}>{p.value} min/episode</span>
        </div>
      ))}
    </div>
  )
}

export function TherapyMinutesWidget() {
  return (
    <div className="neu-card">
      <div className="flex items-center justify-between pb-4 border-b border-surface-100 dark:border-surface-700 mb-5">
        <div>
          <h3 className="text-base font-bold text-surface-900 dark:text-surface-50">Therapy Minutes Per Episode</h3>
          <p className="text-xs text-surface-500 mt-0.5">Average by discipline, optimal range, outcome correlation</p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-surface-500">
          <Activity className="w-3.5 h-3.5 text-teal-500" />
          <span>PT · OT · SLP</span>
        </div>
      </div>

      {/* Segment breakdown */}
      <div className="space-y-5">
        {THERAPY_MINUTES.map(seg => {
          const ptOk = inRange(seg.pt, seg.optimalPt[0], seg.optimalPt[1])
          const otOk = inRange(seg.ot, seg.optimalOt[0], seg.optimalOt[1])
          const slpOk = inRange(seg.slp, seg.optimalSlp[0], seg.optimalSlp[1])

          return (
            <div key={seg.segment}>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300">{seg.segment}</h4>
                <div className="flex gap-1">
                  {[ptOk, otOk, slpOk].map((ok, i) => (
                    ok
                      ? <CheckCircle2 key={i} className="w-3.5 h-3.5 text-emerald-500" />
                      : <AlertTriangle key={i} className="w-3.5 h-3.5 text-amber-500" />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { disc: 'PT', val: seg.pt, range: seg.optimalPt, ok: ptOk },
                  { disc: 'OT', val: seg.ot, range: seg.optimalOt, ok: otOk },
                  { disc: 'SLP', val: seg.slp, range: seg.optimalSlp, ok: slpOk },
                ].map(({ disc, val, range, ok }) => {
                  const colors = DISCIPLINE_COLORS[disc as keyof typeof DISCIPLINE_COLORS]
                  const pct = Math.min((val / range[1]) * 100, 110)
                  const lowPct = (range[0] / range[1]) * 100

                  return (
                    <div key={disc} className={cn('rounded-xl p-3 border', ok
                      ? 'bg-surface-50 dark:bg-surface-800/50 border-surface-100 dark:border-surface-700'
                      : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900')}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn('text-[10px] font-bold uppercase', colors.text)}>{disc}</span>
                        {ok ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-amber-500" />}
                      </div>
                      <div className="text-lg font-bold text-surface-800 dark:text-surface-200">{val}</div>
                      <div className="text-[9px] text-surface-500 mb-2">min/episode</div>
                      {/* Range bar */}
                      <div className="relative h-2 bg-surface-200 dark:bg-surface-700 rounded-full overflow-hidden">
                        {/* Optimal range highlight */}
                        <div
                          className={cn('absolute h-full opacity-30', colors.bg)}
                          style={{ left: `${lowPct}%`, width: `${100 - lowPct}%` }}
                        />
                        {/* Value marker */}
                        <div
                          className={cn('absolute top-0 w-1 h-full rounded-full', colors.bg)}
                          style={{ left: `${Math.min(pct, 95)}%`, transform: 'translateX(-50%)' }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-surface-400 mt-1">
                        <span>{range[0]}</span>
                        <span className="text-surface-300">optimal</span>
                        <span>{range[1]}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Outcome correlation note */}
      <div className="mt-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900">
        <Activity className="w-4 h-4 text-teal-500 flex-shrink-0 mt-0.5" />
        <p className="text-[10px] text-teal-700 dark:text-teal-400 leading-relaxed">
          Facilities in the optimal therapy minutes range show <strong>12–18% higher</strong> discharge-to-home rates and <strong>3pp lower</strong> 30-day readmissions vs. facilities below optimal range.
        </p>
      </div>
    </div>
  )
}
